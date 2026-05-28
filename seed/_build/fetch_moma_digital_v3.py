#!/usr/bin/env python3
"""
MoMA digital-arts pass v3 — successor to fetch_moma_v2.py.

Difference from v2: strictly filters MoMA's Artworks.csv to digital-arts-
relevant classifications and departments BEFORE matching against existing
practitioners. v2 had no such filter and pulled in works like "Lounge Chair"
under Design simply because the artist was in our seed. This pass keeps the
match logic but prunes the source set.

Filter:
  Classification ∈ {Video, Audio, Installation, Media, Film, Performance, Software}
  OR Department ∈ {Media and Performance, Film, Fluxus Collection}

Match strategy (same as v2):
  1. Wikidata QID join (Artists.csv Wiki QID ↔ practitioner metadata.wikidata_qid)
  2. Name fallback (NFKD-normalised lowercase)

Outputs:
  seed/_build/moma_digital_2026-04-28.json
    — new artwork nodes + CREATED_BY + USES_TECHNIQUE edges
  seed/_build/moma_missing_canonical_figures.json
    — practitioners NOT in seed who have ≥30 MoMA works in the relevant
      categories. Editorial review candidates. NOT auto-added.

Both written dry-run by default. The pipeline maintainer applies them via
build_seed.py merge step.
"""
from __future__ import annotations
import csv, json, re, sys, unicodedata, urllib.request
from collections import Counter, defaultdict
from pathlib import Path

from _slug import artwork_slug

HERE = Path(__file__).parent
SEED = HERE.parent
ARTWORKS_OUT = HERE / "moma_digital_2026-04-28.json"
MISSING_OUT = HERE / "moma_missing_canonical_figures.json"
ARTWORKS_CSV_LOCAL = Path("/Users/aiio/Documents/ADAI/adai-vault/raw/signals/moma-2026-04-28/Artworks.csv")
ARTISTS_CSV_LOCAL = Path("/Users/aiio/Documents/ADAI/adai-vault/raw/signals/moma-2026-04-28/Artists.csv")

MOMA_ARTWORKS_URL = "https://media.githubusercontent.com/media/MuseumofModernArt/collection/main/Artworks.csv"
MOMA_ARTISTS_URL  = "https://media.githubusercontent.com/media/MuseumofModernArt/collection/main/Artists.csv"
UA = "A(DAI)-seed-consolidation/3.0"
SIGNAL_ID = "moma-digital-ingest-2026-04-28"
DATE = "2026-04-28T00:00:00Z"

RELEVANT_CLASSIFICATIONS = {"Video", "Audio", "Installation", "Media", "Film", "Performance", "Software"}
RELEVANT_DEPARTMENTS    = {"Media and Performance", "Film", "Fluxus Collection"}
MISSING_FIGURE_THRESHOLD = 30

# USES_TECHNIQUE concept mapping from Classification + Medium
TECHNIQUE_FROM_CLASSIFICATION = {
    "Video":        ["concept:video"],
    "Audio":        ["concept:sound", "concept:audio"],
    "Installation": ["concept:installation"],
    "Media":        ["concept:computer-based"],
    "Film":         ["concept:16mm film"],
    "Performance":  ["concept:performance"],
    "Software":     ["concept:software"],
}

def download(url: str, dest: Path) -> str:
    if dest.exists() and dest.stat().st_size > 1_000_000:
        return dest.read_text(encoding="utf-8-sig", errors="replace")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=180) as resp:
        data = resp.read().decode("utf-8-sig", errors="replace")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(data, encoding="utf-8")
    return data

def name_key(s: str) -> str:
    s = unicodedata.normalize("NFKD", (s or "").lower()).encode("ascii", "ignore").decode()
    return " ".join(s.split())

def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", (s or "").lower()).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9&+\- ]", "", s)
    return re.sub(r"\s+", " ", s).strip()

def parse_meta(n):
    m = n.get("metadata")
    if isinstance(m, str):
        try: return json.loads(m)
        except: return {}
    return m or {}

def main():
    nodes_path = SEED / "nodes.json"
    if not nodes_path.exists():
        nodes_path = SEED / "nodes.json.bak"
    nodes = json.loads(nodes_path.read_text())
    practitioners = [n for n in nodes if n["type"] == "practitioner"]
    existing_artworks = [n for n in nodes if n["type"] == "artwork"]

    qid_to_prac = {}
    name_to_prac = {}
    for p in practitioners:
        m = parse_meta(p)
        qid = m.get("wikidata_qid") or m.get("qid")
        if qid:
            qid_to_prac[qid] = p["id"]
        name_to_prac[name_key(p["name"])] = p["id"]
    existing_titles_per_prac = defaultdict(set)
    for a in existing_artworks:
        m = parse_meta(a)
        cid = m.get("creator_id") or m.get("creator")
        if cid:
            existing_titles_per_prac[cid].add(name_key(a["name"]))

    # Load MoMA Artists for QID lookup
    artists_csv = download(MOMA_ARTISTS_URL, ARTISTS_CSV_LOCAL)
    artist_by_cid = {}
    for row in csv.DictReader(io_str(artists_csv)):
        artist_by_cid[row["ConstituentID"]] = row

    # Load MoMA Artworks
    artworks_csv = download(MOMA_ARTWORKS_URL, ARTWORKS_CSV_LOCAL)
    new_nodes, new_edges = [], []
    matched_count, skipped_dup, missing_figs = 0, 0, Counter()
    seen_artwork_ids = set()

    for row in csv.DictReader(io_str(artworks_csv)):
        classif = row.get("Classification", "")
        dept = row.get("Department", "")
        if classif not in RELEVANT_CLASSIFICATIONS and dept not in RELEVANT_DEPARTMENTS:
            continue

        artist_str = row["Artist"].strip()
        if not artist_str:
            continue

        # Try QID match first via the first ConstituentID in the row
        cids = [c.strip() for c in (row.get("ConstituentID") or "").split() if c.strip()]
        prac_id = None
        for cid in cids:
            artist_row = artist_by_cid.get(cid)
            if artist_row:
                qid = (artist_row.get("Wiki QID") or "").strip()
                if qid and qid in qid_to_prac:
                    prac_id = qid_to_prac[qid]
                    break
        # Fallback: name
        if not prac_id:
            prac_id = name_to_prac.get(name_key(artist_str))

        if not prac_id:
            missing_figs[artist_str] += 1
            continue

        title = row["Title"].strip()
        if not title:
            continue
        if name_key(title) in existing_titles_per_prac.get(prac_id, set()):
            skipped_dup += 1
            continue

        artwork_id = artwork_slug(title, source="moma", external_id=row.get("ObjectID", "").strip())
        if artwork_id in seen_artwork_ids:
            continue
        seen_artwork_ids.add(artwork_id)

        # Build artwork node
        new_nodes.append({
            "id": artwork_id,
            "name": title,
            "type": "artwork",
            "slug": slugify(title),
            "metadata": {
                "status": "confirmed",
                "source_origin": "human_secondary",
                "year": row.get("Date", "").strip() or None,
                "creator_id": prac_id,
                "medium": row.get("Medium", "").strip() or None,
                "image_url": row.get("ImageURL", "").strip() or None,
                "image_license": "moma.org — see collection URL for rights",
                "image_source": "moma",
                "moma_object_id": row.get("ObjectID", "").strip(),
                "moma_artwork_url": row.get("URL", "").strip() or None,
                "moma_classification": classif,
                "moma_department": dept,
                "moma_duration_sec": row.get("Duration (sec.)", "").strip() or None,
                "signal_id": SIGNAL_ID,
                "generated_by": SIGNAL_ID,
                "auto_generated": True,
            },
        })

        # CREATED_BY edge — source-attested from MoMA constituent record
        new_edges.append({
            "id": f"{artwork_id}--created_by--{prac_id}",
            "source_id": artwork_id,
            "target_id": prac_id,
            "edge_type": "CREATED_BY",
            "confidence": "high",
            "signal_id": SIGNAL_ID,
            "created_by": "gatherer-moma-digital-v3",
            "source_evidence": f"MoMA Artworks.csv row ObjectID {row.get('ObjectID','').strip()} Constituent {','.join(cids)}",
            "charge": None,
            "created_at": DATE,
            "valid_from": DATE,
            "valid_until": None,
            "invalidated_by": None,
            "event_time": None,
        })

        # USES_TECHNIQUE edges — source-attested from Classification field
        for tech_id in TECHNIQUE_FROM_CLASSIFICATION.get(classif, []):
            new_edges.append({
                "id": f"{artwork_id}--uses_technique--{tech_id}",
                "source_id": artwork_id,
                "target_id": tech_id,
                "edge_type": "USES_TECHNIQUE",
                "confidence": "high",
                "signal_id": SIGNAL_ID,
                "created_by": "gatherer-moma-digital-v3",
                "source_evidence": f"MoMA Classification field = '{classif}' for ObjectID {row.get('ObjectID','').strip()}",
                "charge": None,
                "created_at": DATE,
                "valid_from": DATE,
                "valid_until": None,
                "invalidated_by": None,
                "event_time": None,
            })

        matched_count += 1

    output = {
        "signal_id": SIGNAL_ID,
        "generated_at": DATE,
        "method_note": (
            "MoMA Artworks.csv pulled 2026-04-28. Filtered to digital-arts-relevant "
            "classifications (Video/Audio/Installation/Media/Film/Performance/Software) "
            "and departments (Media and Performance/Film/Fluxus Collection). Matched "
            "to existing practitioners by Wikidata QID first, name fallback. New "
            "artwork nodes emitted with CREATED_BY (high confidence, source-attested) "
            "and USES_TECHNIQUE (derived from MoMA Classification, source-attested)."
        ),
        "filter": {
            "classifications": sorted(RELEVANT_CLASSIFICATIONS),
            "departments": sorted(RELEVANT_DEPARTMENTS),
        },
        "stats": {
            "new_artworks": matched_count,
            "skipped_duplicates": skipped_dup,
            "new_edges": len(new_edges),
            "distinct_practitioners_enriched": len({n["metadata"]["creator_id"] for n in new_nodes}),
        },
        "nodes": new_nodes,
        "edges": new_edges,
    }
    ARTWORKS_OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False))
    print(f"Wrote {ARTWORKS_OUT.name}: {matched_count} artworks, {len(new_edges)} edges")
    print(f"  Practitioners enriched: {output['stats']['distinct_practitioners_enriched']}")

    # Missing canonical figures: artists with >= threshold MoMA works in relevant
    # categories who are NOT in our seed
    missing_report = {
        "signal_id": f"{SIGNAL_ID}-missing-figures",
        "generated_at": DATE,
        "threshold_works": MISSING_FIGURE_THRESHOLD,
        "method_note": (
            "Artists with ≥{0} works in MoMA digital-arts-relevant categories who "
            "are NOT in the current seed. Editorial review candidates — these "
            "are 1960s–1990s media-art lineage figures the seed under-represents."
        ).format(MISSING_FIGURE_THRESHOLD),
        "candidates": [
            {"artist_name": n, "moma_works_in_relevant_categories": c}
            for n, c in missing_figs.most_common() if c >= MISSING_FIGURE_THRESHOLD
        ],
    }
    MISSING_OUT.write_text(json.dumps(missing_report, indent=2, ensure_ascii=False))
    print(f"Wrote {MISSING_OUT.name}: {len(missing_report['candidates'])} candidates for editorial review")

def io_str(s):
    import io
    return io.StringIO(s)

if __name__ == "__main__":
    main()
