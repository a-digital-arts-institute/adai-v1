#!/usr/bin/env python3
"""fetch_moma.py — Gather practitioners + artworks from MoMA's open CSVs.

Source: MoMA's public ``Artworks.csv`` + ``Artists.csv`` (CC0).

What it emits, source-attested only:
  - ``practitioner`` nodes — one per ConstituentID who appears on a filtered
    artwork (DisplayName + nationality + birth/death year + QID where present).
  - ``artwork`` nodes — one per ObjectID matching the digital-arts filter.
  - ``institution:moma`` — one node.
  - ``CREATED_BY`` edges — artwork → practitioner, per ConstituentID.
  - ``EXHIBITED_AT`` edges — artwork → institution:moma (collection holding).
  - Aliases — ``(moma, ConstituentID)`` and ``(moma, ObjectID)`` plus
    ``(wikidata, QID)`` for practitioners where Artists.csv has one.

NOT emitted in Phase 2:
  - ``USES_TECHNIQUE`` / ``EMBODIES`` / ``CLASSIFIED_BY`` → concept edges.
    Those need the concept vocabulary (Phase 3). MoMA's Classification /
    Medium fields are preserved on each artwork's metadata so the Phase 3
    rule-based derivation has them.
  - Narrative bios / descriptions — anti-enrichment rule. We carry the raw
    ``ArtistBio`` string when present (it's a single line from MoMA, not LLM
    prose), gated on a source URL pointing back at the artist's MoMA page.

Run:
    python3 seed/_build/fetch_moma.py [--limit N] [--no-cache]
"""
from __future__ import annotations

import argparse
import csv
import io
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

# Stdlib-only shared infra
sys.path.insert(0, str(Path(__file__).parent))
from _http import HttpError, get_text  # noqa: E402
from _node_schema import Alias, Edge, Node, validate_batch  # noqa: E402
from _provenance import GathererSignal, now_iso, write_batch  # noqa: E402
from _slug import node_id, node_slug  # noqa: E402

PRODUCER = "moma"
ARTWORKS_URL = "https://media.githubusercontent.com/media/MuseumofModernArt/collection/main/Artworks.csv"
ARTISTS_URL = "https://media.githubusercontent.com/media/MuseumofModernArt/collection/main/Artists.csv"

CACHE_DIR = Path(__file__).parent / ".cache" / "moma"

# Digital-arts filter — kept from v3, the result of editorial calls about
# what "digital art" means inside MoMA's classification scheme.
RELEVANT_CLASSIFICATIONS = {
    "Video",
    "Audio",
    "Installation",
    "Media",
    "Film",
    "Performance",
    "Software",
}
RELEVANT_DEPARTMENTS = {
    "Media and Performance",
    "Film",
    "Fluxus Collection",
}

# Canonical institution node id — gatherer emits the row (idempotent at merge).
INSTITUTION_ID = "institution:moma"
INSTITUTION_NAME = "The Museum of Modern Art"


def _download(url: str, cache_name: str, *, use_cache: bool) -> str:
    cache_path = CACHE_DIR / cache_name
    if use_cache and cache_path.exists() and cache_path.stat().st_size > 1_000_000:
        return cache_path.read_text(encoding="utf-8-sig", errors="replace")
    text = get_text(url, timeout=180, encoding="utf-8-sig")
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(text, encoding="utf-8")
    return text


def _split_constituents(raw: str) -> list[str]:
    # Artworks.csv puts multiple ConstituentIDs in one cell, sometimes space-sep,
    # sometimes comma-sep. Normalise both.
    return [c.strip() for c in raw.replace(",", " ").split() if c.strip()]


def _clean(s: str) -> str | None:
    return s.strip() if (s and s.strip()) else None


def gather(*, limit: int | None, use_cache: bool) -> tuple[list[Node], list[Edge], list[Alias], dict[str, int]]:
    artworks_csv = _download(ARTWORKS_URL, "Artworks.csv", use_cache=use_cache)
    artists_csv = _download(ARTISTS_URL, "Artists.csv", use_cache=use_cache)

    # Build constituent index up front.
    artist_by_cid: dict[str, dict[str, str]] = {}
    for row in csv.DictReader(io.StringIO(artists_csv)):
        cid = row.get("ConstituentID") or row.get("ConstituentId") or ""
        cid = cid.strip()
        if cid:
            artist_by_cid[cid] = row

    nodes: list[Node] = []
    edges: list[Edge] = []
    aliases: list[Alias] = []

    # Institution node (one row).
    nodes.append(Node(
        id=INSTITUTION_ID,
        type="institution",
        name=INSTITUTION_NAME,
        slug=node_slug("institution", INSTITUTION_NAME),
        metadata={
            "city": "New York",
            "country": "United States",
            "source_url": "https://www.moma.org/about/",
            "wikidata_qid": "Q188740",
        },
    ))
    aliases.append(Alias(source="wikidata", external_id="Q188740", node_id=INSTITUTION_ID))

    # Two-pass over Artworks.csv:
    #   pass 1 collects filtered artworks + the set of involved ConstituentIDs.
    #   pass 2 (over Artists.csv via index) emits practitioner rows for them.
    filtered_artworks: list[dict[str, str]] = []
    involved_cids: set[str] = set()
    stats = Counter()

    for row in csv.DictReader(io.StringIO(artworks_csv)):
        stats["scanned"] += 1
        classif = (row.get("Classification") or "").strip()
        dept = (row.get("Department") or "").strip()
        if classif not in RELEVANT_CLASSIFICATIONS and dept not in RELEVANT_DEPARTMENTS:
            continue
        if not row.get("Title", "").strip():
            continue
        if not row.get("ObjectID", "").strip():
            continue
        cids = _split_constituents(row.get("ConstituentID", ""))
        if not cids:
            stats["skipped_no_constituent"] += 1
            continue
        involved_cids.update(cids)
        filtered_artworks.append(row)
        stats["filtered_in"] += 1
        if limit and stats["filtered_in"] >= limit:
            break

    # Practitioner nodes — one per involved ConstituentID with a row in Artists.csv.
    cid_to_pid: dict[str, str] = {}
    seen_pids: set[str] = set()
    for cid in sorted(involved_cids):
        arow = artist_by_cid.get(cid)
        if not arow:
            stats["constituent_missing_from_artists_csv"] += 1
            continue
        display = (arow.get("DisplayName") or "").strip()
        if not display:
            stats["practitioner_no_displayname"] += 1
            continue
        pid = node_id("practitioner", display)
        cid_to_pid[cid] = pid

        # Skip duplicate name — still link the alias so CREATED_BY resolves.
        if pid in seen_pids:
            stats["practitioner_duplicate_name"] += 1
            aliases.append(Alias(source="moma", external_id=cid, node_id=pid))
            continue
        seen_pids.add(pid)

        metadata: dict[str, Any] = {
            "moma_constituent_id": cid,
            "source_url": f"https://www.moma.org/artists/{cid}",
        }
        bio = _clean(arow.get("ArtistBio", ""))
        if bio:
            metadata["artist_bio_line"] = bio  # single-line MoMA blurb, source-attested
        nat = _clean(arow.get("Nationality", ""))
        if nat:
            metadata["nationality"] = nat
        gender = _clean(arow.get("Gender", ""))
        if gender:
            metadata["gender"] = gender
        birth = _clean(arow.get("BeginDate", ""))
        if birth and birth != "0":
            metadata["birth_year"] = birth
        death = _clean(arow.get("EndDate", ""))
        if death and death != "0":
            metadata["death_year"] = death
        qid = _clean(arow.get("Wiki QID", ""))
        if qid:
            metadata["wikidata_qid"] = qid
        ulan = _clean(arow.get("ULAN", ""))
        if ulan:
            metadata["ulan"] = ulan

        nodes.append(Node(
            id=pid,
            type="practitioner",
            name=display,
            slug=node_slug("practitioner", display),
            metadata=metadata,
        ))
        aliases.append(Alias(source="moma", external_id=cid, node_id=pid))
        if qid:
            aliases.append(Alias(source="wikidata", external_id=qid, node_id=pid))

    # Artwork nodes + edges (CREATED_BY + EXHIBITED_AT).
    seen_artwork_ids: set[str] = set()
    for row in filtered_artworks:
        title = row["Title"].strip()
        object_id = row["ObjectID"].strip()
        artwork_id = node_id("artwork", title, source="moma", external_id=object_id)
        if artwork_id in seen_artwork_ids:
            stats["artwork_duplicate_slug"] += 1
            continue
        seen_artwork_ids.add(artwork_id)

        metadata: dict[str, Any] = {
            "moma_object_id": object_id,
            "moma_classification": (row.get("Classification") or "").strip(),
            "moma_department": (row.get("Department") or "").strip(),
            "source_url": f"https://www.moma.org/collection/works/{object_id}",
        }
        medium = _clean(row.get("Medium", ""))
        if medium:
            metadata["medium"] = medium
        date_str = _clean(row.get("Date", ""))
        if date_str:
            metadata["date"] = date_str
        dim = _clean(row.get("Dimensions", ""))
        if dim:
            metadata["dimensions"] = dim
        cred = _clean(row.get("CreditLine", ""))
        if cred:
            metadata["credit_line"] = cred
        acq = _clean(row.get("DateAcquired", ""))
        if acq:
            metadata["acquisition_date"] = acq
        on_view = _clean(row.get("OnView", ""))
        if on_view:
            metadata["on_view"] = on_view
        image_url = _clean(row.get("ImageURL", ""))
        if image_url:
            metadata["image_url"] = image_url
        duration = _clean(row.get("Duration (sec.)", ""))
        if duration:
            metadata["duration_sec"] = duration

        nodes.append(Node(
            id=artwork_id,
            type="artwork",
            name=title,
            slug=node_slug("artwork", title, source="moma", external_id=object_id),
            metadata=metadata,
        ))
        aliases.append(Alias(source="moma", external_id=object_id, node_id=artwork_id))

        # CREATED_BY per linked practitioner (skip if Artists.csv lookup failed).
        cids = _split_constituents(row.get("ConstituentID", ""))
        for cid in cids:
            pid = cid_to_pid.get(cid)
            if not pid:
                stats["created_by_skipped_no_practitioner"] += 1
                continue
            edges.append(Edge(
                source_id=artwork_id,
                target_id=pid,
                edge_type="CREATED_BY",
                valid_from=now_iso(),
                confidence=1.0,
                event_time=acq,  # closest source-attested temporal marker
            ))

        # EXHIBITED_AT institution:moma (MoMA holds the work).
        edges.append(Edge(
            source_id=artwork_id,
            target_id=INSTITUTION_ID,
            edge_type="EXHIBITED_AT",
            valid_from=now_iso(),
            confidence=1.0,
            event_time=acq,
        ))

    return nodes, edges, aliases, dict(stats)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None, help="cap filtered artworks for testing")
    ap.add_argument("--no-cache", action="store_true", help="force re-download of MoMA CSVs")
    args = ap.parse_args()

    sig = GathererSignal(
        producer=PRODUCER,
        source=ARTWORKS_URL,
        config={
            "limit": args.limit,
            "classifications": sorted(RELEVANT_CLASSIFICATIONS),
            "departments": sorted(RELEVANT_DEPARTMENTS),
        },
    )

    try:
        nodes, edges, aliases, stats = gather(limit=args.limit, use_cache=not args.no_cache)
    except HttpError as e:
        print(f"FAIL: HTTP error from MoMA: {e}", file=sys.stderr)
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
    n_pract = sum(1 for n in nodes if n.type == "practitioner")
    n_artwork = sum(1 for n in nodes if n.type == "artwork")
    print(f"wrote → {path}")
    print(f"  practitioners: {n_pract}")
    print(f"  artworks:      {n_artwork}")
    print(f"  edges:         {len(edges)}")
    print(f"  aliases:       {len(aliases)}")
    for k, v in stats.items():
        print(f"  stat[{k}]: {v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
