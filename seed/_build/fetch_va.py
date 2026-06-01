#!/usr/bin/env python3
"""fetch_va.py — Gather historical computer art from the Victoria & Albert Museum.

Source: ``https://api.vam.ac.uk/v2/objects/search`` (public, no auth).

Why this gatherer exists — DE-BIAS. The shipped canon is two on-chain
generative-art platforms (Art Blocks + fxhash), so it skews hard to
2021-onward crypto-native work. The V&A holds the **Computer Arts Society**
collection and a deep seam of 1960s-70s plotter drawings / computer-generated
prints by the movement's pioneers — Frieder Nake, Harold Cohen, Manfred Mohr,
Vera Molnár, Georg Nees, A. Michael Noll, Herbert W. Franke, Roman Verostko,
Paul Brown, Herbert Brün, Frederick Hammersley. That historical spine is
exactly what the platform canon is missing.

Crucially this is a *real* image source, not Wikimedia Commons: the V&A serves
IIIF (``framemark.vam.ac.uk``) with no bot-throttle, so every record we pull
has an image we can mirror to R2 — it survives the ``--require-cdn`` invariant
that killed the Wikidata re-attempt. (Note: V&A images are NOT CC0 — provenance
is the V&A; we mirror for graph-renderability, attribution preserved.)

Cross-source identity is free here: ``_slug.slugify`` is NFKD, so
``"Molnar, Vera"`` → ``practitioner:vera molnar`` merges with any existing
"Vera Molnár" node, and ``"Mohr, Manfred"`` merges with Manfred Mohr's Art
Blocks node. The merger dedupes by node id; pioneers active on both worlds
become one node spanning 1968 and 2021.

What it emits, source-attested only:
  - ``artwork`` nodes — one per object (always disambiguated by systemNumber).
  - ``practitioner`` nodes — one per distinct individual maker (name-normalised).
  - ``institution:victoria and albert museum`` — the holding institution (one).
  - ``CREATED_BY`` edges — artwork → practitioner.
  - ``EXHIBITED_AT`` edges — artwork → institution (held in the collection).
  - Aliases:
      ``(va, systemNumber)``        → artwork
      ``(va_maker, normalised)``    → practitioner (weak; V&A has no stable
                                      person id in the search payload)
      ``(wikidata, Q213322)``       → institution

Editorial filter (PRODUCER_CONTRACT §1.5 — CREATED_BY must target a human):
  Only records whose ``_primaryMaker`` is an **individual author** are kept.
  Publisher / curator / org-name makers (e.g. "Computer Arts Society" the
  publisher of the PAGE bulletins) and ``Unknown`` makers are dropped — an
  org-published magazine isn't an artwork, and an artwork with no creator is
  an attribution gap the embedding derive can later propose, not a gatherer's
  job to invent. No object-type denylist: the maker filter + ``images_exist=1``
  already yield a clean artist-authored set.

Run:
    python3 seed/_build/fetch_va.py [--query "computer art"] [--limit N] [--page-size 100]
"""
from __future__ import annotations

import argparse
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any
from urllib.parse import quote

sys.path.insert(0, str(Path(__file__).parent))
from _http import HttpError, get_json  # noqa: E402
from _node_schema import Alias, Edge, Node, validate_batch  # noqa: E402
from _provenance import GathererSignal, now_iso, write_batch  # noqa: E402
from _slug import node_id, node_slug, slugify  # noqa: E402

PRODUCER = "va"
SEARCH_API = "https://api.vam.ac.uk/v2/objects/search"
ITEM_BASE = "https://collections.vam.ac.uk/item"

# IIIF: <base>full/!{w},{h}/0/default.jpg. 400px max edge is plenty for the
# multimodal embedder (CLIP-class models work at 224-336) and for /graph
# thumbnails, and is verified HEAD-200 on framemark.vam.ac.uk.
IIIF_SIZE = "full/!400,400/0/default.jpg"

INSTITUTION_ID = "institution:victoria and albert museum"
INSTITUTION_NAME = "Victoria and Albert Museum"
INSTITUTION_QID = "Q213322"

# Maker associations that are NOT authorship — drop the record (the work's
# only attribution is non-creative, so CREATED_BY can't resolve to a human).
NON_AUTHORSHIP_ASSOC = frozenset({
    "publisher", "curator", "manufacturer", "retailer", "editor", "printer",
    "after", "subject", "sitter", "patron", "dedicatee",
})

# Name substrings that mark an organisation rather than a person. The CAS
# "PAGE" bulletins are made by "Computer Arts Society" (publisher) — caught
# here AND by the association filter; belt and braces.
ORG_MARKERS = (
    "society", "ltd", "limited", " company", " co.", "press", "museum",
    "gallery", "corporation", "university", "institute", "laborator",
    " inc", "studios", "foundation", "associates", "publications",
)

UNKNOWN_NAMES = frozenset({"unknown", "anonymous", "unidentified", "various", ""})

# Name markers that indicate a *collective* rather than an individual. These
# are real computer-art entities we want to keep (e.g. "Computer Technique
# Group", the 1966 Japanese collective shown at Cybernetic Serendipity), so
# we type them ``collective`` — CREATED_BY validly targets a collective
# (PRODUCER_CONTRACT §1.5) — rather than dropping them or mistyping as a
# practitioner. ORG_MARKERS (above) still removes commercial orgs; this is a
# narrower set of artistic-group words.
COLLECTIVE_MARKERS = ("group", "collective", "collaborative")


def _maker_type(name: str) -> str:
    """``collective`` for named groups / multi-person makers, else ``practitioner``.

    Deterministic, rule-based (contract §3 — no LLM). A trailing '&' / ' and '
    means more than one person credited as the primary maker (e.g. "Bangert,
    Colette & Charles") — also a collective for our purposes.
    """
    n = name.lower()
    if any(m in n for m in COLLECTIVE_MARKERS):
        return "collective"
    if "&" in name or " and " in n:
        return "collective"
    return "practitioner"


def _normalise_maker(name: str) -> str:
    """Deterministic name normalisation — rule-based, no LLM (contract §3).

    "Surname, Forename" → "Forename Surname" so the V&A's catalogue form
    ("Cohen, Harold") collapses onto the natural-order form ("Harold Cohen")
    other sources use, giving one practitioner node. Only flips a SINGLE
    comma and never when '&'/' and ' is present (multi-person makers like
    "Bangert, Colette & Charles" stay verbatim).
    """
    name = (name or "").strip()
    if name.count(",") == 1 and "&" not in name and " and " not in name.lower():
        last, first = (p.strip() for p in name.split(","))
        if last and first:
            return f"{first} {last}"
    return name


def _is_individual_author(name: str, assoc: str | None) -> bool:
    n = (name or "").strip().lower()
    if n in UNKNOWN_NAMES:
        return False
    if any(m in n for m in ORG_MARKERS):
        return False
    if (assoc or "").strip().lower() in NON_AUTHORSHIP_ASSOC:
        return False
    return True


def _image_url(base: str | None) -> str | None:
    if not base:
        return None
    if not base.endswith("/"):
        base += "/"
    return base + IIIF_SIZE


def _institution_node() -> Node:
    return Node(
        id=INSTITUTION_ID,
        type="institution",
        name=INSTITUTION_NAME,
        slug=node_slug("institution", INSTITUTION_NAME),
        metadata={
            "kind": "national museum of art and design",
            "location": "London",
            "source_url": "https://www.vam.ac.uk/",
            "wikidata_qid": INSTITUTION_QID,
        },
    )


def gather(
    *, limit: int | None, query: str, page_size: int
) -> tuple[list[Node], list[Edge], list[Alias], dict[str, int]]:
    stats: Counter[str] = Counter()
    nodes: list[Node] = []
    edges: list[Edge] = []
    aliases: list[Alias] = []

    # Institution node (one) + its Wikidata alias for later image gap-fill.
    nodes.append(_institution_node())
    aliases.append(Alias(source="wikidata", external_id=INSTITUTION_QID, node_id=INSTITUTION_ID))

    maker_id_by_norm: dict[str, str] = {}
    seen_system_numbers: set[str] = set()

    page = 1
    total_pages: int | None = None
    while True:
        if limit and stats["artworks_emitted"] >= limit:
            break
        url = (
            f"{SEARCH_API}?q={quote(query)}&images_exist=1"
            f"&page_size={page_size}&page={page}"
        )
        body = get_json(url, timeout=60)
        info = body.get("info", {})
        if total_pages is None:
            total_pages = info.get("pages")
            stats["record_count"] = info.get("record_count", 0)
        records = body.get("records", []) or []
        if not records:
            break

        for r in records:
            if limit and stats["artworks_emitted"] >= limit:
                break
            sysnum = r.get("systemNumber")
            title = (r.get("_primaryTitle") or "").strip()
            if not sysnum or sysnum in seen_system_numbers:
                stats["skipped_dup_or_no_sysnum"] += 1
                continue
            if not title:
                # Untitled is fine (the slug helper disambiguates), but a
                # genuinely empty title with no slug can't mint an id.
                title = "Untitled"
            if not slugify(title):
                stats["skipped_unslugifiable_title"] += 1
                continue

            maker = r.get("_primaryMaker") or {}
            raw_name = maker.get("name") or ""
            assoc = maker.get("association")
            if not _is_individual_author(raw_name, assoc):
                stats["skipped_non_individual_maker"] += 1
                continue
            artist = _normalise_maker(raw_name)
            if not slugify(artist):
                stats["skipped_unslugifiable_maker"] += 1
                continue

            seen_system_numbers.add(sysnum)

            # Maker — practitioner or collective. Dedupe by normalised slug
            # across the run (a name maps to one node + one type consistently).
            norm = slugify(artist)
            mid = maker_id_by_norm.get(norm)
            if not mid:
                mtype = _maker_type(artist)
                mid = node_id(mtype, artist)
                maker_id_by_norm[norm] = mid
                nodes.append(Node(
                    id=mid,
                    type=mtype,
                    name=artist,
                    slug=node_slug(mtype, artist),
                    metadata={
                        # No narrative prose → anti-enrichment clean (no
                        # source_url required). Structural facts only.
                        "va_maker_name": raw_name,
                        "va_maker_association": (assoc or "").strip() or None,
                    },
                ))
                aliases.append(Alias(source="va_maker", external_id=norm, node_id=mid))
                stats[f"{mtype}s_emitted"] += 1

            # Artwork — always disambiguated by (source, systemNumber).
            artwork_id = node_id("artwork", title, source="va", external_id=sysnum)
            img = _image_url((r.get("_images") or {}).get("_iiif_image_base_url"))
            metadata: dict[str, Any] = {
                "va_system_number": sysnum,
                "source_url": f"{ITEM_BASE}/{sysnum}",
            }
            otype = (r.get("objectType") or "").strip()
            if otype:
                metadata["object_type"] = otype
            date = (r.get("_primaryDate") or "").strip()
            if date:
                metadata["date_text"] = date
            place = (r.get("_primaryPlace") or "").strip()
            if place:
                metadata["place"] = place
            if img:
                metadata["image_url"] = img

            nodes.append(Node(
                id=artwork_id,
                type="artwork",
                name=title,
                slug=node_slug("artwork", title, source="va", external_id=sysnum),
                metadata=metadata,
            ))
            aliases.append(Alias(source="va", external_id=sysnum, node_id=artwork_id))

            edges.append(Edge(
                source_id=artwork_id,
                target_id=mid,
                edge_type="CREATED_BY",
                valid_from=now_iso(),
                confidence=1.0,
            ))
            edges.append(Edge(
                source_id=artwork_id,
                target_id=INSTITUTION_ID,
                edge_type="EXHIBITED_AT",
                valid_from=now_iso(),
                confidence=1.0,
            ))
            stats["artworks_emitted"] += 1

        if total_pages and page >= total_pages:
            break
        page += 1
        time.sleep(0.3)  # be polite to the V&A API

    return nodes, edges, aliases, dict(stats)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--query", type=str, default="computer art",
                    help="V&A full-text search term (default: 'computer art')")
    ap.add_argument("--limit", type=int, default=None,
                    help="cap on artworks emitted (for testing)")
    ap.add_argument("--page-size", type=int, default=100)
    args = ap.parse_args()

    sig = GathererSignal(
        producer=PRODUCER,
        source=SEARCH_API,
        config={"query": args.query, "limit": args.limit, "images_exist": 1},
        query=args.query,
    )

    try:
        nodes, edges, aliases, stats = gather(
            limit=args.limit, query=args.query, page_size=args.page_size
        )
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
    print(f"  collectives:   {sum(1 for n in nodes if n.type == 'collective')}")
    print(f"  artworks:      {sum(1 for n in nodes if n.type == 'artwork')}")
    print(f"  institutions:  {sum(1 for n in nodes if n.type == 'institution')}")
    print(f"  edges:         {len(edges)}")
    print(f"  aliases:       {len(aliases)}")
    for k, v in sorted(stats.items()):
        print(f"  stat[{k}]: {v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
