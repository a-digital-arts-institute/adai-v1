#!/usr/bin/env python3
"""fetch_superrare.py — Gather curated 1/1 art from SuperRare (Ethereum).

Source: ``https://api.superrare.com/graphql`` (public ``rare-api``, no auth).

Why this gatherer exists — AUGMENT / DE-BIAS. The canon is generative-heavy
(Art Blocks + fxhash) + the V&A historical spine. SuperRare adds the seam none
of those cover: **curated 1/1 fine-art NFTs** (digital painting, photography,
collage, AI) on Ethereum, from 2018 on. SuperRare's flagship contracts were
historically application-only (artists vetted before they could mint), so the
1/1s there are a genuinely curated slice — not permissionless. This widens the
canon beyond the generative monoculture and brings an earlier-Ethereum-era seam.

Like fxhash, the raw platform is far larger than we want (the V2 contract alone
indexes ~44k works), so we **select**, we don't dump: sort by ``LAST_SALE_TIME``
(works with recent collector activity float up — a demand signal) and take a
bounded N. Tunable via flags; ``--sort NFT_CREATED_AT --order asc`` instead pulls
the deterministic 2018-genesis 1/1 canon (oldest-first).

Images — the make-or-break (cf. the Wikidata-Commons-429 failure): SuperRare
serves an **imgix** CDN (``superrare-artworks.imgix.net``) with no bot-throttle;
the ``proxy.image.medium`` variant (550px, often ``fm=avif``) fetches at scale
and is decodable by the embed venv's Pillow (AVIF support verified). We record
that as ``image_url`` (mirror + embed target) and keep the IPFS ``original`` as
durable provenance. So SuperRare clears the ``--require-cdn`` every-artwork-
imaged invariant. NB: imgix URLs are signature-locked — mirror them verbatim;
do not append transform params (returns 403).

Licensing: SuperRare art is creator-copyright (NOT CC0; collectors own the
token, not repro rights). Same posture as the V&A — we mirror 550px thumbnails
for graph-renderability + multimodal embedding, artist attribution preserved
(`image_url` + `source_url` + creator). A conscious owner decision, documented.

What it emits, source-attested only:
  - ``artwork`` nodes — one per NFT (id from name + source=superrare, external_id=universalTokenId).
  - ``practitioner`` nodes — one per distinct creator (username/fullName).
  - ``platform:superrare`` — the platform node.
  - ``CREATED_BY`` edges — artwork → practitioner.
  - ``EXHIBITED_AT`` edges — artwork → platform:superrare.
  - Aliases: ``(superrare, universalTokenId)`` → artwork; ``(superrare_artist, wallet)`` → practitioner.

Open item (the "/curation" intent): SuperRare "Spaces" (DAO-curated galleries)
each launch their own contract, but the API has no root query to enumerate which
contracts ARE Spaces — you can only pull by a known contract address. So this
gatherer targets the flagship curated contracts; Space-specific targeting needs
an external contract list (RareDAO records / on-chain Space-factory) — a follow-up.

Run:
    python3 seed/_build/fetch_superrare.py [--limit N] [--sort LAST_SALE_TIME|NFT_CREATED_AT] [--order desc|asc] [--contract 0x...]
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

PRODUCER = "superrare"
SUPERRARE_GQL = "https://api.superrare.com/graphql"

PLATFORM_ID = "platform:superrare"
PLATFORM_NAME = "SuperRare"

# Flagship curated contracts. V1 (0x41A3...) = the 2018-2020 genesis 1/1 contract
# (~4k works, the historical Ethereum 1/1-art canon); V2 (0xb932...) = the main
# SuperRare contract (~44k). Both were application-only/curated.
SR_V1 = "0x41a322b28d0ff354040e2cbc676f0320d8c8850d"
SR_V2 = "0xb932a70a57673d89f4acffbe830e8ed7f75fb9e0"
# Shipped default = the V1 genesis 1/1 canon (oldest-first → the 2018-2019
# founding of crypto art: XCOPY, Robbie Barrat, …; deterministic, never drifts).
# Override --contract / --sort / --order for other slices (e.g. V2 + LAST_SALE_TIME
# for recent collector-active work).
DEFAULT_CONTRACTS = [SR_V1]

# getNfts returns {nfts{...}, pagination{total}}. mediaDetails.proxy.image.medium
# is the imgix 550px variant (mirror+embed target); original.image.uri is the
# durable IPFS provenance.
#
# NB: the SuperRare server mis-coerces a GraphQL variable literally named
# ``$take`` (duplicates the ``take`` input field → "only one input field named
# take" error). So we inline pagination as literals instead of using variables —
# all values are trusted (validated enums / ints / lowercased hex contract), no
# injection surface.
_NFT_FIELDS = """nfts {
      universalTokenId
      tokenId
      contractAddress
      createdAt
      creator { defaultAddress profile { username fullName } }
      metadata {
        name
        description
        tags
        mediaDetails { proxy { image { medium } } original { image { uri } } }
      }
    }"""

_ALLOWED_SORT = {"LAST_SALE_TIME", "NFT_CREATED_AT", "PRICE"}
_ALLOWED_ORDER = {"asc", "desc"}


def _build_query(contract: str, skip: int, take: int, sort_by: str, order: str) -> str:
    if sort_by not in _ALLOWED_SORT or order not in _ALLOWED_ORDER:
        raise ValueError(f"bad sort/order: {sort_by}/{order}")
    if not contract.startswith("0x") or not all(c in "0123456789abcdef" for c in contract[2:]):
        raise ValueError(f"bad contract address: {contract!r}")
    return (
        "query { getNfts("
        f'filter: {{ contractAddress: {{ equals: "{contract}" }} }}, '
        f"nftPagination: {{ skip: {int(skip)}, take: {int(take)}, sortBy: {sort_by}, order: {order} }}"
        f") {{ {_NFT_FIELDS} }} }}"
    )


def _gql(query: str) -> dict[str, Any]:
    body = post_json(SUPERRARE_GQL, {"query": query}, timeout=60)
    if body.get("errors"):
        raise RuntimeError(f"SuperRare GraphQL: {body['errors']}")
    return body.get("data") or {}


def _clean_tags(raw: Any) -> list[str]:
    if not isinstance(raw, list):
        return []
    seen: set[str] = set()
    out: list[str] = []
    for t in raw:
        if isinstance(t, str) and t.strip():
            tag = t.strip().lower()
            if tag not in seen:
                seen.add(tag)
                out.append(tag)
    return out


def _creator_name(creator: dict[str, Any]) -> str:
    prof = creator.get("profile") or {}
    return (prof.get("fullName") or prof.get("username") or "").strip()


def _platform_node() -> Node:
    return Node(
        id=PLATFORM_ID, type="platform", name=PLATFORM_NAME,
        slug=node_slug("platform", PLATFORM_NAME),
        metadata={
            "kind": "curated 1/1 digital art marketplace",
            "blockchain": "ethereum",
            "source_url": "https://superrare.com/",
        },
    )


def _emit_nft(nft: dict[str, Any], nodes: list[Node], edges: list[Edge],
              aliases: list[Alias], stats: Counter, artist_pid: dict[str, str]) -> bool:
    md = nft.get("metadata") or {}
    name = (md.get("name") or "").strip()
    utid = str(nft.get("universalTokenId") or "")
    if not name or not utid:
        stats["skipped_no_name_or_id"] += 1
        return False
    if not slugify(name):
        stats["skipped_unslugifiable_title"] += 1
        return False

    creator = nft.get("creator") or {}
    wallet = (creator.get("defaultAddress") or "").strip().lower()
    artist = _creator_name(creator)
    if not artist or not slugify(artist):
        # No human-readable creator name → attribution gap (contract §1.5). Skip.
        stats["skipped_no_creator_name"] += 1
        return False

    media = md.get("mediaDetails") or {}
    img = (((media.get("proxy") or {}).get("image") or {}).get("medium"))
    original = ((media.get("original") or {}).get("image") or {}).get("uri")
    if not img:
        stats["skipped_no_image"] += 1
        return False

    # Practitioner — dedupe by wallet (stable), fall back to slug.
    key = wallet or slugify(artist)
    pid = artist_pid.get(key)
    if not pid:
        pid = node_id("practitioner", artist)
        artist_pid[key] = pid
        if not any(n.id == pid and n.type == "practitioner" for n in nodes):
            pmeta: dict[str, Any] = {"source_url": f"https://superrare.com/{wallet}" if wallet else "https://superrare.com/"}
            if wallet:
                pmeta["superrare_wallet"] = wallet
            nodes.append(Node(
                id=pid, type="practitioner", name=artist,
                slug=node_slug("practitioner", artist), metadata=pmeta,
            ))
        if wallet:
            aliases.append(Alias(source="superrare_artist", external_id=wallet, node_id=pid))

    contract = (nft.get("contractAddress") or "").strip().lower()
    token_id = str(nft.get("tokenId") or "")
    source_url = f"https://superrare.com/{contract}/{token_id}" if contract and token_id else "https://superrare.com/"
    artwork_id = node_id("artwork", name, source="superrare", external_id=utid)
    created = nft.get("createdAt")

    metadata: dict[str, Any] = {
        "superrare_universal_token_id": utid,
        "superrare_contract": contract,
        "superrare_token_id": token_id,
        "image_url": img,
        "source_url": source_url,
    }
    if original:
        metadata["image_original_uri"] = original  # durable IPFS provenance
    if created:
        metadata["created_at"] = created
    desc = (md.get("description") or "").strip()
    if desc:
        # Allowed: artist-written, with a sibling source_url (anti-enrichment §1.2).
        metadata["description"] = desc
    tags = _clean_tags(md.get("tags"))
    if tags:
        metadata["tags"] = tags

    nodes.append(Node(
        id=artwork_id, type="artwork", name=name,
        slug=node_slug("artwork", name, source="superrare", external_id=utid),
        metadata=metadata,
    ))
    aliases.append(Alias(source="superrare", external_id=utid, node_id=artwork_id))
    edges.append(Edge(source_id=artwork_id, target_id=pid, edge_type="CREATED_BY",
                      valid_from=now_iso(), confidence=1.0, event_time=created))
    edges.append(Edge(source_id=artwork_id, target_id=PLATFORM_ID, edge_type="EXHIBITED_AT",
                      valid_from=now_iso(), confidence=1.0, event_time=created))
    stats["nfts_emitted"] += 1
    return True


def gather(*, contracts: list[str], sort_by: str, order: str, limit: int,
           page_size: int) -> tuple[list[Node], list[Edge], list[Alias], dict[str, int]]:
    stats: Counter = Counter()
    nodes: list[Node] = [_platform_node()]
    edges: list[Edge] = []
    aliases: list[Alias] = []
    artist_pid: dict[str, str] = {}
    seen_utids: set[str] = set()

    for contract in contracts:
        if stats["nfts_emitted"] >= limit:
            break
        skip = 0
        while stats["nfts_emitted"] < limit:
            try:
                data = _gql(_build_query(contract, skip, page_size, sort_by, order))
            except (HttpError, RuntimeError, ValueError) as e:
                print(f"WARN: {contract[:10]} skip={skip} failed: {e}", file=sys.stderr)
                stats["pages_failed"] += 1
                break
            nfts = ((data.get("getNfts") or {}).get("nfts")) or []
            if not nfts:
                break
            stats["nfts_seen"] += len(nfts)
            for nft in nfts:
                if stats["nfts_emitted"] >= limit:
                    break
                utid = str(nft.get("universalTokenId") or "")
                if utid and utid in seen_utids:
                    stats["skipped_dup"] += 1
                    continue
                if _emit_nft(nft, nodes, edges, aliases, stats, artist_pid):
                    seen_utids.add(utid)
            skip += page_size
            time.sleep(0.4)  # polite

    return nodes, edges, aliases, dict(stats)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=800, help="cap NFTs emitted")
    ap.add_argument("--page-size", type=int, default=50)
    ap.add_argument("--sort", dest="sort_by", default="NFT_CREATED_AT",
                    choices=["LAST_SALE_TIME", "NFT_CREATED_AT", "PRICE"],
                    help="selection signal (default NFT_CREATED_AT+asc = genesis canon; "
                         "LAST_SALE_TIME+desc = recent collector activity)")
    ap.add_argument("--order", default="asc", choices=["desc", "asc"])
    ap.add_argument("--contract", action="append", default=None,
                    help="contract address (repeatable); default = flagship V1+V2")
    ap.add_argument("--preview", action="store_true",
                    help="fetch + report counts only; write no batch")
    args = ap.parse_args()

    contracts = [c.strip().lower() for c in (args.contract or DEFAULT_CONTRACTS)]
    sig = GathererSignal(
        producer=PRODUCER, source=SUPERRARE_GQL,
        config={"contracts": contracts, "sort_by": args.sort_by, "order": args.order, "limit": args.limit},
    )
    try:
        nodes, edges, aliases, stats = gather(
            contracts=contracts, sort_by=args.sort_by, order=args.order,
            limit=args.limit, page_size=args.page_size)
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

    print(f"  practitioners: {sum(1 for n in nodes if n.type == 'practitioner')}")
    print(f"  artworks:      {sum(1 for n in nodes if n.type == 'artwork')}")
    print(f"  edges:         {len(edges)}")
    for k, v in sorted(stats.items()):
        print(f"  stat[{k}]: {v}")
    if args.preview:
        print("  (preview) no batch written.")
        return 0

    path = write_batch(sig, nodes=node_rows, edges=edge_rows, aliases=alias_rows)
    print(f"wrote → {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
