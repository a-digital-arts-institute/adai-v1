#!/usr/bin/env python3
"""
MoMA Collection CSV pass (v2): image patches for existing artworks AND new
artwork nodes for MoMA works by our practitioners that aren't in the graph yet.

MoMA publishes:
  Artworks.csv — Title, Artist, ConstituentID, Date, Medium, Classification,
                 Department, ThumbnailURL, URL, ObjectID, ...
  Artists.csv  — ConstituentID, DisplayName, Nationality, BeginDate, EndDate,
                 Wiki QID (column name: "Wiki QID"), ULAN

Match strategy (layered, for robustness):
  1. Match practitioner by Wikidata QID (most reliable) — join Artists.csv Wiki QID
     against our practitioner metadata.wikidata_qid.
  2. Fallback: accent-/case-normalised name match.

Once a practitioner is matched:
  a. For each of their MoMA artworks, fuzzy-match title against our artwork nodes.
     - Match -> image patch (goes into image_patches/moma.json).
  b. For MoMA artworks with no matching node but with a ThumbnailURL, emit a
     NEW artwork node (source_origin: human_secondary, signal_id: moma-ingest-2026-04-22)
     + CREATED_BY edge. Limit to N-per-practitioner to avoid flooding (default: 3).

Outputs:
  seed/_build/image_patches/moma.json           — image patches only
  seed/_build/moma_new_artworks.json            — new artwork nodes + CREATED_BY edges

Dry-run by default. Pass --write to persist.
"""
from __future__ import annotations
import csv
import io
import json
import re
import sys
import unicodedata
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
SEED = HERE.parent
PATCHES_DIR = HERE / "image_patches"
PATCHES_DIR.mkdir(exist_ok=True)
PATCHES_OUT = PATCHES_DIR / "moma.json"
NEW_OUT = HERE / "moma_new_artworks.json"

MOMA_ARTWORKS = "https://media.githubusercontent.com/media/MuseumofModernArt/collection/main/Artworks.csv"
MOMA_ARTISTS = "https://media.githubusercontent.com/media/MuseumofModernArt/collection/main/Artists.csv"
UA = "A(DAI)-seed-consolidation/1.0"
SIGNAL_ID = "moma-ingest-2026-04-22"
MAX_NEW_ARTWORKS_PER_PRACTITIONER = 3


def download(url: str, label: str) -> str:
    print(f"Downloading {label} ...")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=180) as resp:
        # utf-8-sig strips the \ufeff BOM that MoMA's CSVs ship with
        data = resp.read().decode("utf-8-sig", errors="replace")
    print(f"  downloaded {len(data):,} bytes")
    return data


def name_key(s: str) -> str:
    s = unicodedata.normalize("NFKD", (s or "").lower()).encode("ascii", "ignore").decode()
    return " ".join(s.split())


def slug(s: str) -> str:
    s = (s or "").lower()
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9&+\- ]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def _meta(n):
    m = n.get("metadata")
    if isinstance(m, str):
        try: return json.loads(m)
        except: return {}
    return m or {}


def main() -> int:
    write = "--write" in sys.argv

    nodes = json.load(open(SEED / "nodes.json"))
    edges = json.load(open(SEED / "edges.json"))

    # Practitioner indexes
    pract_by_qid: dict[str, dict] = {}
    pract_by_name: dict[str, dict] = {}
    for n in nodes:
        if n.get("type") not in ("practitioner", "collective"):
            continue
        md = _meta(n)
        qid = md.get("wikidata_qid")
        if qid:
            pract_by_qid[qid] = n
        pract_by_name[name_key(n.get("name") or "")] = n

    # Existing artwork index: creator_id -> {title_key: node}
    creator_artworks: dict[str, dict] = {}
    for e in edges:
        if e.get("edge_type") != "CREATED_BY":
            continue
        src = next((n for n in nodes if n["id"] == e["source_id"]), None)
        if src and src.get("type") == "artwork":
            creator_artworks.setdefault(e["target_id"], {})[name_key(src["name"])] = src

    existing_artwork_ids = {n["id"] for n in nodes if n.get("type") == "artwork"}

    # Download MoMA data
    artists_raw = download(MOMA_ARTISTS, "Artists.csv (~10 MB)")
    artworks_raw = download(MOMA_ARTWORKS, "Artworks.csv (~40 MB)")

    # Parse Artists.csv -> ConstituentID -> {name, qid}
    artists_reader = csv.DictReader(io.StringIO(artists_raw))
    moma_artists: dict[str, dict] = {}
    for row in artists_reader:
        cid = (row.get("ConstituentID") or "").strip()
        if not cid:
            continue
        moma_artists[cid] = {
            "name": row.get("DisplayName", "").strip(),
            "qid": (row.get("Wiki QID") or "").strip() or None,
        }
    print(f"MoMA artists parsed: {len(moma_artists):,}")

    # Build MoMA-constituent -> our-practitioner-node map
    ours_by_moma_cid: dict[str, dict] = {}
    for cid, info in moma_artists.items():
        hit = None
        if info["qid"] and info["qid"] in pract_by_qid:
            hit = pract_by_qid[info["qid"]]
        if not hit and info["name"]:
            hit = pract_by_name.get(name_key(info["name"]))
        if hit:
            ours_by_moma_cid[cid] = hit
    print(f"MoMA artists matching our practitioners: {len(ours_by_moma_cid)}")

    # Parse Artworks.csv, scan for artworks by matched artists
    artworks_reader = csv.DictReader(io.StringIO(artworks_raw))
    patches: list[dict] = []
    new_nodes: list[dict] = []
    new_edges: list[dict] = []
    rows_scanned = 0
    new_per_pract: dict[str, int] = {}
    patch_seen: set[str] = set()

    for row in artworks_reader:
        rows_scanned += 1
        cid_field = (row.get("ConstituentID") or "").strip()  # can be comma-separated list like "(6457)"
        # MoMA's column is ImageURL (not ThumbnailURL — which is used on Artists.csv).
        thumb = (row.get("ImageURL") or "").strip()
        title = (row.get("Title") or "").strip()
        if not thumb or not title or not cid_field:
            continue

        # Parse constituent IDs (e.g. "(6457, 7031)")
        cids = [c.strip() for c in re.findall(r"\d+", cid_field)]
        matched_pract = None
        for cid in cids:
            if cid in ours_by_moma_cid:
                matched_pract = ours_by_moma_cid[cid]
                break
        if not matched_pract:
            continue

        pid = matched_pract["id"]
        t_key = name_key(title)

        # Tier 1: existing artwork match -> image patch
        existing = creator_artworks.get(pid, {})
        matched_artwork = existing.get(t_key)
        if not matched_artwork:
            # relaxed contains match (both directions)
            for ek, enode in existing.items():
                if t_key and (t_key in ek or ek in t_key) and abs(len(t_key) - len(ek)) < 20:
                    matched_artwork = enode
                    break

        if matched_artwork:
            if matched_artwork["id"] in patch_seen:
                continue
            patch_seen.add(matched_artwork["id"])
            patches.append({
                "node_id": matched_artwork["id"],
                "image_url": thumb,
                "image_license": "moma.org — see collection URL for rights",
                "image_source": "moma",
                "moma_object_id": row.get("ObjectID"),
                "moma_artwork_url": row.get("URL"),
                "matched_artist": matched_pract["name"],
                "matched_title": title,
            })
            continue

        # Tier 2: new artwork — cap per practitioner
        if new_per_pract.get(pid, 0) >= MAX_NEW_ARTWORKS_PER_PRACTITIONER:
            continue
        art_slug = slug(title)
        if not art_slug:
            continue
        art_id = f"artwork:{art_slug}"
        if art_id in existing_artwork_ids:
            continue
        existing_artwork_ids.add(art_id)
        new_per_pract[pid] = new_per_pract.get(pid, 0) + 1

        medium = (row.get("Medium") or "").strip()
        classification = (row.get("Classification") or "").strip()
        date = (row.get("Date") or "").strip()
        description = title  # MoMA CSV doesn't include curator description
        if medium or classification:
            description = f"{title}. {classification or ''} {medium or ''}".strip()

        new_nodes.append({
            "id": art_id,
            "name": title,
            "type": "artwork",
            "slug": art_slug,
            "metadata": {
                "status": "confirmed",
                "source_origin": "human_secondary",
                "year": date,
                "description": description,
                "creator_id": pid,
                "image_url": thumb,
                "image_license": "moma.org — see collection URL for rights",
                "image_source": "moma",
                "moma_object_id": row.get("ObjectID"),
                "moma_artwork_url": row.get("URL"),
                "moma_classification": classification,
                "moma_medium": medium,
                "signal_id": SIGNAL_ID,
                "generated_by": SIGNAL_ID,
                "auto_generated": True,
            },
        })
        new_edges.append({
            "id": f"{art_id}--created_by--{pid}",
            "source_id": art_id,
            "target_id": pid,
            "edge_type": "CREATED_BY",
            "confidence": "high",
            "signal_id": SIGNAL_ID,
            "created_by": "gatherer-enrichment",
            "source_evidence": f"MoMA Collection CSV: {row.get('URL') or 'Artworks.csv'}",
            "charge": None,
        })

    print(f"Rows scanned:        {rows_scanned:,}")
    print(f"Image patches:       {len(patches)}")
    print(f"New artwork entries: {len(new_nodes)}  (across {len(new_per_pract)} practitioners)")
    print(f"New CREATED_BY:      {len(new_edges)}")

    if write:
        PATCHES_OUT.write_text(json.dumps(patches, indent=2, ensure_ascii=False))
        NEW_OUT.write_text(json.dumps({"nodes": new_nodes, "edges": new_edges},
                                       indent=2, ensure_ascii=False))
        print(f"\nWrote: {PATCHES_OUT}")
        print(f"Wrote: {NEW_OUT}")
    else:
        print("\n(dry-run) Pass --write to persist.")
        print("\nFirst 3 image patches:")
        for p in patches[:3]:
            print(f"  {p['node_id']} <- {p['matched_title']}")
        print("\nFirst 3 new artworks:")
        for n in new_nodes[:3]:
            print(f"  {n['id']} ({n['name']}) by {n['metadata']['creator_id']}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
