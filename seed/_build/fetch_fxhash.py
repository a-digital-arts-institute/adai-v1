#!/usr/bin/env python3
"""fetch_fxhash.py — Gather generative tokens + creators from fxhash.

Source: ``https://api.fxhash.xyz/graphql``.

What it emits, source-attested only:
  - ``artwork`` nodes — one per generative token, carrying artist-applied
    ``tags`` (lowercased/deduped) in metadata when present. Tags are the
    attested vocabulary that ``derive_curation.py`` turns into concept nodes.
  - ``practitioner`` nodes — one per distinct author.
  - ``platform:fxhash`` — the platform node.
  - ``CREATED_BY`` edges — artwork → practitioner.
  - ``EXHIBITED_AT`` edges — artwork → platform:fxhash.
  - Aliases:
      ``(fxhash, token_id)`` → artwork
      ``(fxhash, user:<user_id>)`` → practitioner

Image URLs: fxhash returns IPFS URIs (``ipfs://<CID>``). We rewrite to
``https://gateway.fxhash2.xyz/ipfs/<CID>`` so they're directly fetchable.

Run:
    python3 seed/_build/fetch_fxhash.py [--limit N] [--page-size N]
"""
from __future__ import annotations

import argparse
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent))
from _http import HttpError, post_json  # noqa: E402
from _node_schema import Alias, Edge, Node, validate_batch  # noqa: E402
from _provenance import GathererSignal, now_iso, write_batch  # noqa: E402
from _slug import node_id, node_slug, slugify  # noqa: E402

PRODUCER = "fxhash"
FXHASH_GQL = "https://api.fxhash.xyz/graphql"

PLATFORM_ID = "platform:fxhash"
PLATFORM_NAME = "fxhash"

# Paged scan of generative tokens. ``skip`` paginates; ``take`` is page size.
# ``sort:{mintOpensAt:"ASC"}`` makes the scan DETERMINISTIC and chronological:
# a re-run returns the same first N tokens (token #0 onward), so node ids are
# stable across rebuilds and the embedding/image cache reuse holds. ``tags``
# are artist-applied, source-attested — the vocabulary for tag-derived concepts.
TOKENS_QUERY = """query Tokens($skip: Int!, $take: Int!) {
  generativeTokens(skip: $skip, take: $take, sort: {mintOpensAt: "ASC"}) {
    id
    name
    slug
    tags
    displayUri
    thumbnailUri
    supply
    mintOpensAt
    flag
    author {
      id
      name
    }
  }
}"""


def _clean_tags(raw: Any) -> list[str]:
    """Normalise fxhash tags: lowercase, strip, drop empties, dedupe, keep order."""
    if not isinstance(raw, list):
        return []
    seen: set[str] = set()
    out: list[str] = []
    for t in raw:
        if not isinstance(t, str):
            continue
        tag = t.strip().lower()
        if tag and tag not in seen:
            seen.add(tag)
            out.append(tag)
    return out


def _ipfs_to_https(uri: str | None) -> str | None:
    if not uri:
        return None
    if uri.startswith("ipfs://"):
        return f"https://gateway.fxhash2.xyz/ipfs/{uri[len('ipfs://'):]}"
    if uri.startswith("https://") or uri.startswith("http://"):
        return uri
    return None


def _gql(query: str, variables: dict[str, Any]) -> dict[str, Any]:
    body = post_json(
        FXHASH_GQL,
        {"query": query, "variables": variables},
        timeout=60,
    )
    if body.get("errors"):
        raise RuntimeError(f"fxhash GraphQL: {body['errors']}")
    return body.get("data") or {}


# Fetch specific tokens by id (filters:{id_in:[...]}) — used by the refresh
# mode to re-pull the EXACT current canon token set, now carrying tags, without
# changing which artworks are in the canon (so embeddings stay aligned).
# NB: id_in still honours the default page size (~20) unless `take` is given,
# and fxhash caps take at 50 — so callers batch ids in chunks of <=50 with take=50.
TOKENS_BY_IDS_QUERY = """query ByIds($ids: [Int!], $take: Int!) {
  generativeTokens(filters: {id_in: $ids}, take: $take) {
    id
    name
    slug
    tags
    displayUri
    thumbnailUri
    supply
    mintOpensAt
    flag
    author { id name }
  }
}"""


# --- Curation (quality-gated selection) -------------------------------------
# fxhash is permissionless, so a chronological/arbitrary slice is mostly noise.
# The platform exposes real demand signals; we pull by `relevance` (fxhash's own
# ranking — the canonical work floats to the top) AND carry the raw stats so the
# gate is transparent and the canon is auditable. The killer signal is
# `marketStats.secVolumeNb` — the count of SECONDARY sales (collectors trading it
# on, near-impossible to fake) — backstopped by mint count + sell-through.
CURATE_QUERY = """query Curate($skip: Int!, $take: Int!) {
  generativeTokens(skip: $skip, take: $take, sort: {relevance: "DESC"}) {
    id
    name
    slug
    tags
    displayUri
    thumbnailUri
    supply
    balance
    objktsCount
    mintOpensAt
    flag
    author { id name }
    marketStats { secVolumeNb secVolumeTz primVolumeNb floor median }
  }
}"""


def _token_quality(tk: dict[str, Any]) -> dict[str, Any]:
    """Extract the source-attested demand stats from a token (curate query only)."""
    supply = tk.get("supply") or 0
    balance = tk.get("balance")
    objkts = tk.get("objktsCount")
    minted = objkts if isinstance(objkts, int) else (
        (supply - balance) if (supply and isinstance(balance, int)) else 0)
    ms = tk.get("marketStats") or {}
    return {
        "supply": supply,
        "minted": minted,
        "sellthrough": round(minted / supply, 3) if supply else 0.0,
        "secondary_sales": ms.get("secVolumeNb") or 0,
        "floor": ms.get("floor"),
    }


def _passes_quality_gate(q: dict[str, Any], *, min_secondary: int,
                         min_minted: int, min_sellthrough: float) -> bool:
    """Transparent gate: real collector demand. Pass on EITHER a meaningful
    secondary market (people traded it on) OR a solid primary (enough collectors
    minted it AND it largely sold through). Tunable via CLI flags."""
    if q["secondary_sales"] >= min_secondary:
        return True
    if q["minted"] >= min_minted and q["sellthrough"] >= min_sellthrough:
        return True
    return False


def _emit_token(tk: dict[str, Any], nodes: list[Node], edges: list[Edge],
                aliases: list[Alias], stats: Counter, user_pid: dict[str, str]) -> bool:
    """Turn one fxhash token into practitioner+artwork nodes, CREATED_BY +
    EXHIBITED_AT edges, and aliases. Shared by gather() and gather_by_ids().
    Returns True if an artwork was emitted."""
    name = (tk.get("name") or "").strip()
    token_id = str(tk.get("id") or "")
    if not name or not token_id:
        stats["skipped_no_name_or_id"] += 1
        return False
    if not slugify(name):
        stats["skipped_title_unslugifiable"] += 1
        return False
    if tk.get("flag") in ("MALICIOUS", "HIDDEN"):
        stats["skipped_flag"] += 1
        return False
    author = tk.get("author") or {}
    author_id = str(author.get("id") or "")
    author_name = (author.get("name") or "").strip()
    if not author_id or not author_name:
        stats["skipped_no_author"] += 1
        return False
    if not slugify(author_name):
        stats["skipped_author_unslugifiable"] += 1
        return False

    pid = user_pid.get(author_id)
    if not pid:
        pid = node_id("practitioner", author_name)
        user_pid[author_id] = pid
        if not any(n.id == pid and n.type == "practitioner" for n in nodes):
            nodes.append(Node(
                id=pid, type="practitioner", name=author_name,
                slug=node_slug("practitioner", author_name),
                metadata={
                    "fxhash_user_id": author_id,
                    "source_url": f"https://www.fxhash.xyz/u/{author_id}",
                },
            ))
        aliases.append(Alias(source="fxhash", external_id=f"user:{author_id}", node_id=pid))

    artwork_id = node_id("artwork", name, source="fxhash", external_id=token_id)
    metadata: dict[str, Any] = {
        "fxhash_token_id": token_id,
        "source_url": f"https://www.fxhash.xyz/generative/{token_id}",
    }
    image = _ipfs_to_https(tk.get("displayUri") or tk.get("thumbnailUri"))
    if image:
        metadata["image_url"] = image
    supply = tk.get("supply")
    if supply is not None:
        metadata["supply"] = supply
    mint_opens = tk.get("mintOpensAt")
    if mint_opens:
        metadata["mint_opens_at"] = mint_opens
    slug = tk.get("slug")
    if slug:
        metadata["fxhash_slug"] = slug
    tags = _clean_tags(tk.get("tags"))
    if tags:
        metadata["tags"] = tags
    # Quality stats — only present when the curate query selected them; numeric,
    # so anti-enrichment-safe. Carries the demand signal into the canon for audit.
    if tk.get("objktsCount") is not None or tk.get("marketStats"):
        q = _token_quality(tk)
        metadata["fxhash_minted"] = q["minted"]
        metadata["fxhash_sellthrough"] = q["sellthrough"]
        metadata["fxhash_secondary_sales"] = q["secondary_sales"]

    nodes.append(Node(
        id=artwork_id, type="artwork", name=name,
        slug=node_slug("artwork", name, source="fxhash", external_id=token_id),
        metadata=metadata,
    ))
    aliases.append(Alias(source="fxhash", external_id=token_id, node_id=artwork_id))
    edges.append(Edge(source_id=artwork_id, target_id=pid, edge_type="CREATED_BY",
                      valid_from=now_iso(), confidence=1.0, event_time=mint_opens))
    edges.append(Edge(source_id=artwork_id, target_id=PLATFORM_ID, edge_type="EXHIBITED_AT",
                      valid_from=now_iso(), confidence=1.0, event_time=mint_opens))
    stats["tokens_emitted"] += 1
    return True


def _platform_node() -> tuple[Node, Alias]:
    return (
        Node(id=PLATFORM_ID, type="platform", name=PLATFORM_NAME,
             slug=node_slug("platform", PLATFORM_NAME),
             metadata={"kind": "generative art platform", "blockchain": "tezos",
                       "source_url": "https://www.fxhash.xyz/", "wikidata_qid": "Q113366543"}),
        Alias(source="wikidata", external_id="Q113366543", node_id=PLATFORM_ID),
    )


def gather_by_ids(token_ids: list[int], *, batch: int = 50) -> tuple[list[Node], list[Edge], list[Alias], dict[str, int]]:
    """Refresh an EXACT set of fxhash tokens (by id) — re-pulls the current
    canon's artworks now carrying tags, without changing the set. Node ids are
    deterministic from (name, token_id), so the committed embeddings stay valid."""
    stats: Counter = Counter()
    pn, pa = _platform_node()
    nodes: list[Node] = [pn]
    edges: list[Edge] = []
    aliases: list[Alias] = [pa]
    user_pid: dict[str, str] = {}
    for i in range(0, len(token_ids), batch):
        chunk = token_ids[i:i + batch]
        try:
            data = _gql(TOKENS_BY_IDS_QUERY, {"ids": chunk, "take": len(chunk)})
        except (HttpError, RuntimeError) as e:
            print(f"WARN: id batch {i} failed: {e}", file=sys.stderr)
            stats["batches_failed"] += 1
            continue
        toks = data.get("generativeTokens") or []
        stats["tokens_seen"] += len(toks)
        for tk in toks:
            _emit_token(tk, nodes, edges, aliases, stats, user_pid)
        time.sleep(0.3)
    return nodes, edges, aliases, dict(stats)


def gather_curated(
    *, top: int, min_secondary: int, min_minted: int, min_sellthrough: float,
    page_size: int, scan_cap: int, preview: bool,
) -> tuple[list[Node], list[Edge], list[Alias], dict[str, Any]]:
    """Curate fxhash by relevance + demand stats.

    Pages `sort:{relevance:"DESC"}` (fxhash's own quality ranking), scores each
    token on source-attested demand, keeps those passing the gate up to `top`,
    and stops scanning at `scan_cap`. In `preview` mode no batch is built — it
    returns the kept/dropped distribution so thresholds can be calibrated by eye.
    """
    stats: Counter = Counter()
    nodes: list[Node] = []
    edges: list[Edge] = []
    aliases: list[Alias] = []
    user_pid: dict[str, str] = {}
    kept_ids: list[int] = []
    dropped_sample: list[tuple[str, dict]] = []

    if not preview:
        pn, pa = _platform_node()
        nodes.append(pn)
        aliases.append(pa)

    skip = 0
    while stats["scanned"] < scan_cap and len(kept_ids) < top:
        try:
            data = _gql(CURATE_QUERY, {"skip": skip, "take": page_size})
        except (HttpError, RuntimeError) as e:
            print(f"WARN: curate page skip={skip} failed: {e}", file=sys.stderr)
            stats["pages_failed"] += 1
            break
        tokens = data.get("generativeTokens") or []
        if not tokens:
            break
        for tk in tokens:
            if len(kept_ids) >= top or stats["scanned"] >= scan_cap:
                break
            stats["scanned"] += 1
            if tk.get("flag") in ("MALICIOUS", "HIDDEN"):
                stats["dropped_flag"] += 1
                continue
            q = _token_quality(tk)
            if _passes_quality_gate(q, min_secondary=min_secondary,
                                    min_minted=min_minted, min_sellthrough=min_sellthrough):
                kept_ids.append(tk.get("id"))
                stats["kept"] += 1
                if not preview:
                    _emit_token(tk, nodes, edges, aliases, stats, user_pid)
            else:
                stats["dropped_low_signal"] += 1
                if len(dropped_sample) < 12:
                    dropped_sample.append(((tk.get("name") or "")[:30], q))
        skip += page_size
        time.sleep(0.4)

    report: dict[str, Any] = dict(stats)
    report["kept_token_ids"] = kept_ids
    report["dropped_sample"] = dropped_sample
    return nodes, edges, aliases, report


def gather(*, limit: int | None, page_size: int) -> tuple[list[Node], list[Edge], list[Alias], dict[str, int]]:
    stats = Counter()
    nodes: list[Node] = []
    edges: list[Edge] = []
    aliases: list[Alias] = []

    # Platform node
    pn, pa = _platform_node()
    nodes.append(pn)
    aliases.append(pa)

    # Practitioners deduped by fxhash user id (stable).
    user_pid: dict[str, str] = {}

    skip = 0
    while True:
        if limit and stats["tokens_emitted"] >= limit:
            break
        try:
            data = _gql(TOKENS_QUERY, {"skip": skip, "take": page_size})
        except (HttpError, RuntimeError) as e:
            print(f"WARN: page skip={skip} failed: {e}", file=sys.stderr)
            stats["pages_failed"] += 1
            break
        tokens = data.get("generativeTokens") or []
        if not tokens:
            break
        stats["pages"] += 1
        stats["tokens_seen"] += len(tokens)

        for tk in tokens:
            if limit and stats["tokens_emitted"] >= limit:
                break
            _emit_token(tk, nodes, edges, aliases, stats, user_pid)

        skip += page_size
        time.sleep(0.5)  # be polite

    return nodes, edges, aliases, dict(stats)


def _canon_fxhash_token_ids() -> list[int]:
    """Read the current canon's fxhash artwork token ids from seed/nodes.json.
    These define the pinned set the --refresh-from-canon mode re-pulls (with tags)."""
    import json
    from pathlib import Path
    seed = Path(__file__).resolve().parents[2] / "seed" / "nodes.json"
    txt = seed.read_text().strip()
    rows = json.loads(txt) if txt.startswith("[") else [json.loads(l) for l in txt.splitlines() if l.strip()]
    ids: list[int] = []
    for n in rows:
        if n.get("type") != "artwork" or "fxhash" not in n.get("id", ""):
            continue
        md = n.get("metadata")
        if isinstance(md, str):
            md = json.loads(md)
        tid = (md or {}).get("fxhash_token_id")
        if tid is not None and str(tid).isdigit():
            ids.append(int(tid))
    return sorted(set(ids))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=2000, help="cap tokens emitted")
    ap.add_argument("--page-size", type=int, default=50)
    ap.add_argument("--refresh-from-canon", action="store_true",
                    help="re-pull the EXACT current canon fxhash tokens (with tags), "
                         "preserving the set + node ids (so embeddings stay aligned)")
    # Curation mode (quality-gated selection by relevance + demand stats)
    ap.add_argument("--curate", action="store_true",
                    help="select a quality subset by relevance + collector-demand stats")
    ap.add_argument("--top", type=int, default=1000, help="[curate] keep at most N passing tokens")
    ap.add_argument("--min-secondary-sales", type=int, default=5,
                    help="[curate] pass if >= N secondary-market sales (the strong signal)")
    ap.add_argument("--min-minted", type=int, default=25,
                    help="[curate] OR pass if >= N collectors minted it")
    ap.add_argument("--min-sellthrough", type=float, default=0.6,
                    help="[curate] ...AND it sold through at least this fraction of supply")
    ap.add_argument("--scan-cap", type=int, default=4000,
                    help="[curate] stop scanning after N tokens (relevance-ordered)")
    ap.add_argument("--preview", action="store_true",
                    help="[curate] score + report distribution only; write no batch")
    args = ap.parse_args()

    if args.curate:
        print(f"curate: relevance-ranked, gate = secondary>={args.min_secondary_sales} "
              f"OR (minted>={args.min_minted} AND sellthrough>={args.min_sellthrough}); "
              f"top={args.top}, scan_cap={args.scan_cap}{' [PREVIEW]' if args.preview else ''}")
        nodes, edges, aliases, report = gather_curated(
            top=args.top, min_secondary=args.min_secondary_sales,
            min_minted=args.min_minted, min_sellthrough=args.min_sellthrough,
            page_size=args.page_size, scan_cap=args.scan_cap, preview=args.preview)
        scanned = report.get("scanned", 0); kept = report.get("kept", 0)
        print(f"  scanned {scanned}  kept {kept}  "
              f"dropped_low_signal {report.get('dropped_low_signal',0)}  "
              f"dropped_flag {report.get('dropped_flag',0)}")
        if report.get("dropped_sample"):
            print("  sample DROPPED (name | minted/supply sellthrough sec-sales):")
            for nm, q in report["dropped_sample"]:
                print(f"    {nm:<30} {q['minted']}/{q['supply']} st={q['sellthrough']} sec={q['secondary_sales']}")
        if args.preview:
            print(f"  → at these thresholds a curated pull keeps ~{kept} of {scanned} scanned. "
                  f"No batch written (preview).")
            return 0
        sig = GathererSignal(producer=PRODUCER, source=FXHASH_GQL,
                             config={"mode": "curate", "top": args.top,
                                     "min_secondary_sales": args.min_secondary_sales,
                                     "min_minted": args.min_minted,
                                     "min_sellthrough": args.min_sellthrough})
        node_rows = [sig.stamp(n.as_row()) for n in nodes]
        edge_rows = [sig.stamp(e.as_row()) for e in edges]
        alias_rows = [a.as_row() for a in aliases]
        errs = validate_batch(nodes=node_rows, edges=edge_rows)
        if errs:
            print(f"VALIDATION FAILED ({len(errs)}):", file=sys.stderr)
            for e in errs[:10]:
                print(f"  {e}", file=sys.stderr)
            return 1
        path = write_batch(sig, nodes=node_rows, edges=edge_rows, aliases=alias_rows)
        print(f"wrote → {path}  ({sum(1 for n in nodes if n.type=='artwork')} artworks, "
              f"{sum(1 for n in nodes if n.type=='practitioner')} practitioners)")
        return 0

    if args.refresh_from_canon:
        ids = _canon_fxhash_token_ids()
        print(f"refresh-from-canon: {len(ids)} fxhash token ids pinned from seed/nodes.json")
        sig = GathererSignal(producer=PRODUCER, source=FXHASH_GQL,
                             config={"mode": "refresh-from-canon", "token_count": len(ids)})
        try:
            nodes, edges, aliases, stats = gather_by_ids(ids)
        except (HttpError, RuntimeError) as e:
            print(f"FAIL: {e}", file=sys.stderr)
            return 1
    else:
        sig = GathererSignal(
            producer=PRODUCER,
            source=FXHASH_GQL,
            config={"limit": args.limit, "page_size": args.page_size},
        )
        try:
            nodes, edges, aliases, stats = gather(limit=args.limit, page_size=args.page_size)
        except (HttpError, RuntimeError) as e:
            print(f"FAIL: {e}", file=sys.stderr)
            return 1

    node_rows = [sig.stamp(n.as_row()) for n in nodes]
    edge_rows = [sig.stamp(e.as_row()) for e in edges]
    alias_rows = [a.as_row() for a in aliases]

    errors = validate_batch(nodes=node_rows, edges=edge_rows)
    if errors:
        print(f"VALIDATION FAILED ({len(errors)} errors):", file=sys.stderr)
        for err in errors[:10]:
            print(f"  {err}", file=sys.stderr)
        return 1

    path = write_batch(sig, nodes=node_rows, edges=edge_rows, aliases=alias_rows)
    print(f"wrote → {path}")
    print(f"  practitioners: {sum(1 for n in nodes if n.type == 'practitioner')}")
    print(f"  artworks:      {sum(1 for n in nodes if n.type == 'artwork')}")
    print(f"  edges:         {len(edges)}")
    print(f"  aliases:       {len(aliases)}")
    for k, v in stats.items():
        print(f"  stat[{k}]: {v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
