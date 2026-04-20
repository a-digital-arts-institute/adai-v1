#!/usr/bin/env python3
"""
Query the Met Museum Open Access API for public-domain artwork images
matching practitioners in seed/nodes.json.

API: https://metmuseum.github.io/
  /public/collection/v1/search?artistOrCulture=true&q=<name>  → list of ObjectIDs
  /public/collection/v1/objects/<id>                          → full object
  filter: isPublicDomain == true

Low hit rate expected for contemporary digital-art figures (the Met's holdings
are historical-heavy). May catch: Nam June Paik–era video art, some photo-based
pieces, historical figures tangentially in our canon.

Output: seed/_build/image_patches/met.json
Shape:
  [{"node_id": "artwork:...", "image_url": "...",
    "image_license": "Met Open Access (CC0)", "image_source": "met",
    "met_object_id": 123, "met_object_url": "...",
    "matched_artist": "...", "matched_title": "..."}]

Dry-run by default.
"""
import json
import sys
import time
import urllib.parse
import urllib.request
import unicodedata
from pathlib import Path

HERE = Path(__file__).parent
SEED = HERE.parent
OUT = HERE / "image_patches" / "met.json"
OUT.parent.mkdir(exist_ok=True)

MET_BASE = "https://collectionapi.metmuseum.org/public/collection/v1"
UA = "A(DAI)-seed-consolidation/1.0"


def name_key(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode()
    return " ".join(s.split())


def fetch_json(url: str, retries: int = 2):
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.load(resp)
        except Exception as ex:
            if attempt == retries:
                raise
            time.sleep(2 ** attempt)


def main():
    write_mode = "--write" in sys.argv
    max_per_artist = int(next((a.split("=")[1] for a in sys.argv if a.startswith("--max=")), "10"))

    nodes = json.load(open(SEED / "nodes.json"))
    edges = json.load(open(SEED / "edges.json"))

    pract_nodes = [n for n in nodes if n["type"] in ("practitioner", "collective", "project")
                   and not json.loads(n["metadata"]).get("auto_generated")]
    creator_of = {e["source_id"]: e["target_id"] for e in edges if e["edge_type"] == "CREATED_BY"}
    artwork_index = {}
    for n in nodes:
        if n["type"] == "artwork":
            creator = creator_of.get(n["id"])
            if creator:
                artwork_index[(creator, name_key(n["name"]))] = n

    patches = []
    seen_ids = set()
    searches = 0
    fetches = 0

    for pract in pract_nodes:
        name = pract["name"]
        searches += 1
        try:
            q = urllib.parse.quote(name)
            r = fetch_json(f"{MET_BASE}/search?artistOrCulture=true&hasImages=true&q={q}")
        except Exception as ex:
            print(f"  ! search failed for {name}: {ex}")
            time.sleep(2)
            continue
        ids = (r.get("objectIDs") or [])[:max_per_artist]
        time.sleep(0.6)

        for oid in ids:
            fetches += 1
            try:
                obj = fetch_json(f"{MET_BASE}/objects/{oid}")
            except Exception:
                time.sleep(1)
                continue
            time.sleep(0.4)
            if not obj.get("isPublicDomain"):
                continue
            img = obj.get("primaryImage") or obj.get("primaryImageSmall")
            if not img:
                continue
            title = (obj.get("title") or "").strip()
            if not title:
                continue
            key = name_key(title)
            art = artwork_index.get((pract["id"], key))
            if not art or art["id"] in seen_ids:
                continue
            seen_ids.add(art["id"])
            patches.append({
                "node_id": art["id"],
                "image_url": img,
                "image_license": "Met Open Access (CC0)",
                "image_source": "met",
                "met_object_id": oid,
                "met_object_url": obj.get("objectURL"),
                "matched_artist": obj.get("artistDisplayName"),
                "matched_title": title,
            })

    print(f"Searches: {searches}")
    print(f"Object fetches: {fetches}")
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
