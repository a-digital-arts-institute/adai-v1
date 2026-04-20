#!/usr/bin/env python3
"""
Join MoMA's public Artworks.csv (CC0) against seed/nodes.json to fill image URLs.

MoMA publishes its full collection metadata on GitHub:
  https://github.com/MuseumofModernArt/collection

The Artworks.csv columns we need: Title, Artist, ThumbnailURL, URL, ConstituentID,
OnView, Classification, Medium.

Matching strategy:
  1. Match by (artist name, title). Accent- and case-insensitive.
  2. When multiple MoMA rows have the same title by the same artist, pick the
     first with a non-empty ThumbnailURL.
  3. MoMA's ThumbnailURL is a low-res JPEG (CC0-compatible reuse for collection
     metadata; individual images have varied rights — recorded as "moma.org/curatorial").

Best coverage: institutional-facing practitioners (Arcangel, Reas, Maeda,
Forensic Architecture, Paglen, Steyerl, Hershman Leeson). Weak for: anyone
who hasn't shown at MoMA.

Output: seed/_build/image_patches/moma.json
Shape:
  [{"node_id": "artwork:...", "image_url": "...", "image_license": "moma.org — see collection URL for rights",
    "image_source": "moma", "moma_object_id": "...", "moma_artwork_url": "...",
    "matched_artist": "...", "matched_title": "..."}]

Dry-run by default: prints summary, writes only with --write.
"""
import csv
import io
import json
import sys
import urllib.request
import unicodedata
from pathlib import Path

HERE = Path(__file__).parent
SEED = HERE.parent
OUT = HERE / "image_patches" / "moma.json"
OUT.parent.mkdir(exist_ok=True)

MOMA_CSV_URL = "https://media.githubusercontent.com/media/MuseumofModernArt/collection/main/Artworks.csv"
UA = "A(DAI)-seed-consolidation/1.0"


def name_key(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode()
    return " ".join(s.split())


def download_csv():
    print(f"Downloading MoMA Artworks.csv … (~40 MB, may take a minute)")
    req = urllib.request.Request(MOMA_CSV_URL, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = resp.read().decode("utf-8", errors="replace")
    print(f"  downloaded {len(data):,} bytes")
    return data


def main():
    write_mode = "--write" in sys.argv

    nodes = json.load(open(SEED / "nodes.json"))
    edges = json.load(open(SEED / "edges.json"))

    # Build practitioner name -> node_id
    pract_name_to_id = {}
    for n in nodes:
        if n["type"] in ("practitioner", "collective", "project", "platform"):
            pract_name_to_id[name_key(n["name"])] = n["id"]

    # Build artwork (practitioner_id, title_key) -> artwork_node
    creator_of = {e["source_id"]: e["target_id"] for e in edges if e["edge_type"] == "CREATED_BY"}
    artwork_index = {}
    for n in nodes:
        if n["type"] == "artwork":
            creator = creator_of.get(n["id"])
            if creator:
                artwork_index[(creator, name_key(n["name"]))] = n

    # Download
    csv_data = download_csv()

    # Parse
    reader = csv.DictReader(io.StringIO(csv_data))
    patches = []
    seen_ids = set()  # dedup: one patch per artwork node
    rows_scanned = 0

    for row in reader:
        rows_scanned += 1
        title = (row.get("Title") or "").strip()
        artist = (row.get("Artist") or "").strip()
        thumb = (row.get("ThumbnailURL") or "").strip()
        if not title or not artist or not thumb:
            continue
        # MoMA's Artist field can contain multiple artists separated by commas
        # and parentheticals. Try the whole string first, then each comma-split piece.
        candidates = [artist] + [a.strip() for a in artist.split(",")]
        matched_node = None
        matched_artist = None
        for cand in candidates:
            cand_clean = cand.split("(")[0].strip()
            pid = pract_name_to_id.get(name_key(cand_clean))
            if not pid:
                continue
            art = artwork_index.get((pid, name_key(title)))
            if art:
                matched_node = art
                matched_artist = cand_clean
                break
        if not matched_node or matched_node["id"] in seen_ids:
            continue
        seen_ids.add(matched_node["id"])
        patches.append({
            "node_id": matched_node["id"],
            "image_url": thumb,
            "image_license": "moma.org — see collection URL for rights",
            "image_source": "moma",
            "moma_object_id": row.get("ObjectID"),
            "moma_artwork_url": row.get("URL"),
            "matched_artist": matched_artist,
            "matched_title": title,
        })

    print(f"Rows scanned: {rows_scanned}")
    print(f"Artwork image patches: {len(patches)}")

    if write_mode:
        OUT.write_text(json.dumps(patches, indent=2, ensure_ascii=False))
        print(f"\nWrote: {OUT}")
    else:
        print(f"\n(dry-run) Would write {len(patches)} patches to {OUT}")
        print("Run with --write to persist.")
        if patches:
            print("\nFirst 3 patches:")
            for p in patches[:3]:
                print(json.dumps(p, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
