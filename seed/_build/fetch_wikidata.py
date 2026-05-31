#!/usr/bin/env python3
"""fetch_wikidata.py — Gather practitioners + artworks from Wikidata SPARQL.

Source: ``https://query.wikidata.org/sparql``.

Replaces five legacy fetchers (fetch_wikidata_v3, _v3b, _named_anchors,
_artworks, _portraits — see archive/). Single unified pipeline, two SPARQL
queries:

  1. Digital-art practitioners — anyone tagged with a P106 occupation in
     OCCUPATION_QIDS (or a P135 movement in MOVEMENT_QIDS, if set). Returns:
     QID, label, image (P18), birth (P569), death (P570), country (P27),
     occupations, movements.
  2. Digital-art artworks — anyone classified as an instance of art genre
     in DIGITAL_ART_GENRE_QIDS. Returns: QID, label, image (P18), creator
     (P170) QID, inception (P571), depicts (P180).

What it emits, source-attested only:
  - ``practitioner`` nodes — from query 1.
  - ``artwork`` nodes — from query 2.
  - Aliases — ``(wikidata, QID)`` for each.
  - ``CREATED_BY`` edges — artwork → practitioner where Wikidata states P170.

NOT emitted in Phase 2:
  - Movement / occupation → concept edges. Those go in Phase 3 as part of
    the source-derived curation pass against the concept vocabulary. The
    raw movement / occupation QIDs are preserved on metadata for that pass.
  - Free-text bios. Wikidata's ``schema:description`` is a single line per
    language — we copy the English description verbatim (source-attested,
    sibling source_url) into ``metadata.wikidata_description``.

Run:
    python3 seed/_build/fetch_wikidata.py [--limit-practitioners N] [--limit-artworks N]
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent))
from urllib.parse import urlencode  # noqa: E402

from _http import HttpError, get_json  # noqa: E402
from _node_schema import Alias, Edge, Node, validate_batch  # noqa: E402
from _provenance import GathererSignal, now_iso, write_batch  # noqa: E402
from _slug import node_id, node_slug  # noqa: E402

PRODUCER = "wikidata"
SPARQL_URL = "https://query.wikidata.org/sparql"
COMMONS_FILEPATH = "https://commons.wikimedia.org/wiki/Special:FilePath/"

# Wikidata QIDs that mark a practitioner as digital-art relevant. Conservative
# — occupations that are unambiguously about digital / electronic / new-media
# practice. Wider categories (Q1028181 "painter") would over-include.
# ═══════════════════════════════════════════════════════════════════════════
# ✅ VERIFIED + ENABLED 2026-05 (was QUARANTINED). Every QID below was checked
# against LIVE Wikidata (labels + descriptions + instance counts + sample
# names) before enabling — not trusted from a comment.
#
# The ORIGINAL lists (in git history) were CORRUPT: every QID resolved to an
# insect / a 404 / an unrelated item while the comments *claimed* digital-art
# genres. Q649652 ("digital art") = a bee (Lasioglossum baudini); Q4671777/
# Q4671798 ("algorithmic/generative art") = moths; Q650711 ("net.art") =
# "combat"; Q1925963 ("sound art") = "graphic artist" — a far-too-broad
# OCCUPATION that single-handedly dragged 3,652 painters/sculptors (Duchamp,
# Miró) into the canon via wdt:P106. THE LESSON: a P106 occupation must be a
# *digital-art* occupation, never a generic art occupation.
#
# OCCUPATION_QIDS — matched against wdt:P106. Yields ~1,015 distinct humans
# (new media artist 775 · computer artist 217 · internet artist 47 · algorithm
# artist 4), e.g. Carolee Schneemann, Dara Birnbaum, Shu Lea Cheang — the
# video/net/media-art spine the NFT platforms structurally miss. A little
# mis-tag noise (e.g. a fashion designer tagged "new media artist") is curated
# downstream, NOT by widening the filter.
OCCUPATION_QIDS: list[str] = [
    "Q7016454",   # new media artist
    "Q106208189", # computer artist
    "Q21764863",  # algorithm artist
    "Q106208042", # internet artist
]

# MOVEMENT_QIDS — matched against wdt:P135 (art movement), SEPARATE from
# occupation. Intentionally empty: Wikidata's digital-art "movements" are fuzzy
# and over-include. Curate real digital-art movement QIDs here if/when needed;
# an empty list drops the P135 branch entirely (no broad re-import).
MOVEMENT_QIDS: list[str] = []

# Artwork-side genre / instance-of filter (wdt:P136). All 8 verified correct
# against live Wikidata 2026-05; yields ~400 artworks (new media 188 · internet
# 70 · digital 68 · interactive 61 · generative 20 · computer 12 · software 4 ·
# algorithmic 2). Thin but real, with images + creators.
DIGITAL_ART_GENRE_QIDS = [
    "Q860372",   # digital art
    "Q1376265",  # computer art
    "Q2835759",  # algorithmic art
    "Q1502032",  # generative art
    "Q1569950",  # internet art (was mislabelled "net.art" → "combat")
    "Q378604",   # new media art
    "Q2394336",  # interactive art
    "Q2864686",  # software art
]


def _values_clause(qids: list[str]) -> str:
    return " ".join(f"wd:{q}" for q in qids)


def _practitioners_query(limit: int) -> str:
    # Simpler query: no GROUP_CONCAT (the SPARQL planner was timing it out at
    # query.wikidata.org). Multiple rows per practitioner are deduped in Python.
    # Occupation (P106) and movement (P135) are matched against SEPARATE lists;
    # an empty list drops its UNION branch (so an empty MOVEMENT_QIDS can never
    # emit an invalid empty VALUES clause or re-introduce broad matches).
    branches: list[str] = []
    if OCCUPATION_QIDS:
        branches.append(
            f"  {{\n    ?person wdt:P106 ?occupation .\n"
            f"    VALUES ?occupation {{ {_values_clause(OCCUPATION_QIDS)} }}\n  }}"
        )
    if MOVEMENT_QIDS:
        branches.append(
            f"  {{\n    ?person wdt:P135 ?movement .\n"
            f"    VALUES ?movement {{ {_values_clause(MOVEMENT_QIDS)} }}\n  }}"
        )
    if not branches:
        raise ValueError("fetch_wikidata: both OCCUPATION_QIDS and MOVEMENT_QIDS are empty — nothing to query.")
    union = "\n  UNION\n".join(branches)
    return f"""
SELECT DISTINCT ?person ?personLabel ?birth ?death ?image ?country ?occupation ?movement
WHERE {{
{union}
  ?person wdt:P31 wd:Q5 .
  OPTIONAL {{ ?person wdt:P569 ?birth . }}
  OPTIONAL {{ ?person wdt:P570 ?death . }}
  OPTIONAL {{ ?person wdt:P18  ?image . }}
  OPTIONAL {{ ?person wdt:P27  ?country . }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
}}
LIMIT {limit}
""".strip()


def _artworks_query(limit: int) -> str:
    # Same simplification — no GROUP_CONCAT, dedupe in Python.
    return f"""
SELECT DISTINCT ?artwork ?artworkLabel ?creator ?inception ?image ?genre
WHERE {{
  ?artwork wdt:P136 ?genre .
  VALUES ?genre {{ {_values_clause(DIGITAL_ART_GENRE_QIDS)} }}
  OPTIONAL {{ ?artwork wdt:P170 ?creator . }}
  OPTIONAL {{ ?artwork wdt:P571 ?inception . }}
  OPTIONAL {{ ?artwork wdt:P18  ?image . }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
}}
LIMIT {limit}
""".strip()


def _sparql(query: str) -> list[dict[str, Any]]:
    """Fire a SPARQL query against Wikidata. Per-host limit (1 concurrent) is
    enforced by _http.py — query.wikidata.org is in the throttle list."""
    params = urlencode({"format": "json", "query": query})
    body = get_json(
        f"{SPARQL_URL}?{params}",
        timeout=180,
        headers={"Accept": "application/sparql-results+json"},
    )
    return body.get("results", {}).get("bindings", [])


def _qid_from_uri(uri: str) -> str:
    # http://www.wikidata.org/entity/Q123 → Q123
    return uri.rsplit("/", 1)[-1]


def _commons_image(image_uri: str) -> str:
    # http://commons.wikimedia.org/wiki/Special:FilePath/Foo.jpg → same (already canonical)
    # Some image bindings come back with file:Foo.jpg → wrap.
    if image_uri.startswith(COMMONS_FILEPATH):
        return image_uri
    if image_uri.startswith("http"):
        return image_uri
    return f"{COMMONS_FILEPATH}{image_uri}"


def _year_of(iso_date: str) -> str | None:
    if not iso_date or len(iso_date) < 4:
        return None
    # Wikidata returns "1949-01-01T00:00:00Z" or sometimes "-0500-01-01T..."
    sign = "-" if iso_date.startswith("-") else ""
    digits = iso_date.lstrip("-")[:4]
    return f"{sign}{digits}" if digits.isdigit() else None


def _ws(b: dict[str, Any], key: str) -> str:
    v = b.get(key)
    if not v:
        return ""
    return v.get("value", "")


def _split(s: str) -> list[str]:
    return [x for x in (s or "").split("|") if x]


def gather_practitioners(*, limit: int) -> tuple[list[Node], list[Alias], dict[str, int]]:
    query = _practitioners_query(limit)
    bindings = _sparql(query)
    stats = Counter({"bindings": len(bindings)})

    # Multiple rows per QID (one per country/occupation/movement). Dedupe.
    by_qid: dict[str, dict[str, Any]] = {}
    for b in bindings:
        qid = _qid_from_uri(_ws(b, "person"))
        if not qid:
            continue
        entry = by_qid.setdefault(qid, {
            "label": _ws(b, "personLabel"),
            "birth": _ws(b, "birth"),
            "death": _ws(b, "death"),
            "image": _ws(b, "image"),
            "countries": set(),
            "occupations": set(),
            "movements": set(),
        })
        if c := _ws(b, "country"):
            entry["countries"].add(_qid_from_uri(c))
        if o := _ws(b, "occupation"):
            entry["occupations"].add(_qid_from_uri(o))
        if m := _ws(b, "movement"):
            entry["movements"].add(_qid_from_uri(m))

    nodes: list[Node] = []
    aliases: list[Alias] = []
    seen_pids: set[str] = set()

    for qid, entry in by_qid.items():
        label = entry["label"]
        if not label or label == qid:
            stats["skipped_no_label"] += 1
            continue
        pid = node_id("practitioner", label)
        if pid in seen_pids:
            stats["duplicate_pid_label"] += 1
            aliases.append(Alias(source="wikidata", external_id=qid, node_id=pid))
            continue
        seen_pids.add(pid)

        metadata: dict[str, Any] = {
            "wikidata_qid": qid,
            "source_url": f"https://www.wikidata.org/wiki/{qid}",
        }
        if (birth := _year_of(entry["birth"])):
            metadata["birth_year"] = birth
        if (death := _year_of(entry["death"])):
            metadata["death_year"] = death
        if entry["image"]:
            metadata["image_url"] = _commons_image(entry["image"])
        if entry["countries"]:
            metadata["nationality_qids"] = sorted(entry["countries"])
        if entry["occupations"]:
            metadata["occupation_qids"] = sorted(entry["occupations"])
        if entry["movements"]:
            metadata["movement_qids"] = sorted(entry["movements"])

        nodes.append(Node(
            id=pid,
            type="practitioner",
            name=label,
            slug=node_slug("practitioner", label),
            metadata=metadata,
        ))
        aliases.append(Alias(source="wikidata", external_id=qid, node_id=pid))

    stats["practitioners_emitted"] = len(nodes)
    return nodes, aliases, dict(stats)


def gather_artworks(*, limit: int) -> tuple[list[Node], list[Edge], list[Alias], dict[str, int]]:
    query = _artworks_query(limit)
    bindings = _sparql(query)
    stats = Counter({"bindings": len(bindings)})

    # Dedupe across multiple rows per artwork (one per genre).
    by_qid: dict[str, dict[str, Any]] = {}
    for b in bindings:
        qid = _qid_from_uri(_ws(b, "artwork"))
        if not qid:
            continue
        entry = by_qid.setdefault(qid, {
            "label": _ws(b, "artworkLabel"),
            "creator": _ws(b, "creator"),
            "inception": _ws(b, "inception"),
            "image": _ws(b, "image"),
            "genres": set(),
        })
        if g := _ws(b, "genre"):
            entry["genres"].add(_qid_from_uri(g))

    nodes: list[Node] = []
    edges: list[Edge] = []
    aliases: list[Alias] = []
    seen_artwork_ids: set[str] = set()

    for artwork_qid, entry in by_qid.items():
        label = entry["label"]
        if not label or label == artwork_qid:
            stats["skipped_no_label"] += 1
            continue
        artwork_id = node_id("artwork", label, source="wikidata", external_id=artwork_qid)
        if artwork_id in seen_artwork_ids:
            stats["duplicate_artwork_id"] += 1
            continue
        seen_artwork_ids.add(artwork_id)

        metadata: dict[str, Any] = {
            "wikidata_qid": artwork_qid,
            "source_url": f"https://www.wikidata.org/wiki/{artwork_qid}",
        }
        if (inception := _year_of(entry["inception"])):
            metadata["inception_year"] = inception
        if entry["image"]:
            metadata["image_url"] = _commons_image(entry["image"])
        if entry["genres"]:
            metadata["genre_qids"] = sorted(entry["genres"])

        nodes.append(Node(
            id=artwork_id,
            type="artwork",
            name=label,
            slug=node_slug("artwork", label, source="wikidata", external_id=artwork_qid),
            metadata=metadata,
        ))
        aliases.append(Alias(source="wikidata", external_id=artwork_qid, node_id=artwork_id))

        # CREATED_BY: placeholder target — merger resolves (source=wikidata, qid=…)
        # via the alias table to whatever node_id the practitioner ended up at.
        # The merger drops edges whose placeholder doesn't resolve.
        if entry["creator"]:
            creator_qid = _qid_from_uri(entry["creator"])
            edges.append(Edge(
                source_id=artwork_id,
                target_id=f"_alias:wikidata:{creator_qid}",
                edge_type="CREATED_BY",
                valid_from=now_iso(),
                confidence=1.0,
                event_time=_year_of(entry["inception"]),
            ))
        else:
            stats["created_by_skipped_no_creator"] += 1

    stats["artworks_emitted"] = len(nodes)
    return nodes, edges, aliases, dict(stats)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit-practitioners", type=int, default=2000)
    ap.add_argument("--limit-artworks", type=int, default=2000)
    args = ap.parse_args()

    sig = GathererSignal(
        producer=PRODUCER,
        source=SPARQL_URL,
        config={
            "occupation_qids": OCCUPATION_QIDS,
            "movement_qids": MOVEMENT_QIDS,
            "digital_art_genre_qids": DIGITAL_ART_GENRE_QIDS,
            "limit_practitioners": args.limit_practitioners,
            "limit_artworks": args.limit_artworks,
        },
        query=_practitioners_query(args.limit_practitioners),
    )

    try:
        p_nodes, p_aliases, p_stats = gather_practitioners(limit=args.limit_practitioners)
    except HttpError as e:
        print(f"FAIL: SPARQL practitioners query: {e}", file=sys.stderr)
        return 1

    # Artworks query is rate-limit prone at query.wikidata.org. Try it but
    # don't fail the gatherer if it errors — Wikidata's digital-art artwork
    # coverage is thin compared to MoMA / artblocks / fxhash / objkt, so we
    # can ship the practitioner anchors + images on their own.
    import time as _time
    _time.sleep(10)  # give query.wikidata.org a breather between queries
    a_nodes: list[Node] = []
    a_edges: list[Edge] = []
    a_aliases: list[Alias] = []
    a_stats: dict[str, int] = {}
    try:
        a_nodes, a_edges, a_aliases, a_stats = gather_artworks(limit=args.limit_artworks)
    except HttpError as e:
        print(f"WARN: artworks query failed ({e}); practitioner data still shipped.", file=sys.stderr)
        a_stats = {"artworks_failed_to_fetch": 1}

    nodes = p_nodes + a_nodes
    edges = a_edges
    aliases = p_aliases + a_aliases

    node_rows = [sig.stamp(n.as_row()) for n in nodes]
    edge_rows = [sig.stamp(e.as_row()) for e in edges]
    alias_rows = [a.as_row() for a in aliases]

    # The merger resolves _alias placeholders later — skip those in batch
    # validation (otherwise validate_batch flags them as orphan source/target).
    edge_rows_for_validate = [
        e for e in edge_rows
        if not (str(e.get("source_id", "")).startswith("_alias:") or
                str(e.get("target_id", "")).startswith("_alias:"))
    ]
    errors = validate_batch(nodes=node_rows, edges=edge_rows_for_validate)
    if errors:
        print(f"VALIDATION FAILED ({len(errors)} errors):", file=sys.stderr)
        for err in errors[:10]:
            print(f"  {err}", file=sys.stderr)
        return 1

    path = write_batch(sig, nodes=node_rows, edges=edge_rows, aliases=alias_rows)
    print(f"wrote → {path}")
    print(f"  practitioners: {len(p_nodes)}")
    print(f"  artworks:      {len(a_nodes)}")
    print(f"  edges:         {len(edges)}  (creator placeholders, merger will resolve)")
    print(f"  aliases:       {len(aliases)}")
    for k, v in {**p_stats, **a_stats}.items():
        print(f"  stat[{k}]: {v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
