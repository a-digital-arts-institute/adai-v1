#!/usr/bin/env python3
"""
Fetch Wikidata artwork images for practitioners already aliased in seed/aliases.json.

Strategy
--------
For each practitioner QID (from aliases.json source=wikidata), query for works
where that QID is the creator (P170). Filter by art-class P31 values and
require an image (P18). Match titles fuzzily against existing artwork nodes
in seed/nodes.json; emit an image patch only for artworks that already exist.

Good coverage for: early computer-art pioneers, institutional artists, film/video.
Weak for: generative/crypto works (not in Wikidata).

Output: seed/_build/image_patches/wikidata_artworks.json
Shape:
  [{"node_id": "artwork:...", "image_url": "...", "image_license": "see Commons page (wikidata:P18)",
    "image_source": "wikidata", "wikidata_qid": "Q...", "match_method": "exact|fuzzy",
    "matched_title_wd": "..."}]

Dry-run by default: prints what it would write, only writes when run with --write.
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
OUT = HERE / "image_patches" / "wikidata_artworks.json"
OUT.parent.mkdir(exist_ok=True)

SPARQL = "https://query.wikidata.org/sparql"
UA = "A(DAI)-seed-consolidation/1.0 (https://github.com/a-digital-arts-institute/adai-v1)"

# P31 classes that count as artworks for our purposes
ART_CLASSES = [
    "Q838948",     # work of art
    "Q3305213",    # painting
    "Q93184",      # drawing
    "Q860861",     # sculpture
    "Q11060274",   # print
    "Q20742776",   # installation
    "Q2085379",    # video art
    "Q28640",      # photograph
    "Q4502142",    # visual artwork
    "Q18593264",   # digital art
    "Q18219090",   # media artwork
    "Q17537576",   # creative work
    "Q17320256",   # physical process (performances)
]


def name_key(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode()
    return " ".join(s.split())


def query_sparql(sparql: str):
    url = SPARQL + "?format=json&query=" + urllib.parse.quote(sparql)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def build_query(qid: str):
    classes = " ".join(f"wd:{c}" for c in ART_CLASSES)
    return f"""SELECT ?work ?workLabel ?image ?year WHERE {{
  ?work wdt:P170 wd:{qid}.
  ?work wdt:P18 ?image.
  VALUES ?artClass {{ {classes} }}
  ?work wdt:P31 ?artClass.
  OPTIONAL {{ ?work wdt:P571 ?created. BIND(YEAR(?created) AS ?year) }}
  SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
}} LIMIT 50"""


def main():
    write_mode = "--write" in sys.argv

    nodes = json.load(open(SEED / "nodes.json"))
    aliases = json.load(open(SEED / "aliases.json"))

    # practitioner name -> QID
    qid_by_node = {a["node_id"]: a["external_id"] for a in aliases if a["source"] == "wikidata"}

    # artwork nodes keyed by name_key
    artworks_by_key = {}
    node_by_id = {n["id"]: n for n in nodes}
    for n in nodes:
        if n["type"] == "artwork":
            artworks_by_key.setdefault(name_key(n["name"]), []).append(n)

    # Map artwork -> creator practitioner (from CREATED_BY edges)
    edges = json.load(open(SEED / "edges.json"))
    creator_of = {}  # artwork_id -> creator_node_id
    for e in edges:
        if e["edge_type"] == "CREATED_BY":
            creator_of[e["source_id"]] = e["target_id"]

    patches = []
    skipped = []
    queried = 0
    hits = 0

    for pract_id, qid in qid_by_node.items():
        queried += 1
        try:
            result = query_sparql(build_query(qid))
        except Exception as ex:
            skipped.append((pract_id, qid, f"query error: {ex}"))
            time.sleep(5)  # back off on error
            continue

        bindings = result.get("results", {}).get("bindings", [])
        for b in bindings:
            wd_title = b.get("workLabel", {}).get("value", "")
            wd_img = b.get("image", {}).get("value", "")
            wd_work_uri = b.get("work", {}).get("value", "")
            wd_qid = wd_work_uri.rsplit("/", 1)[-1] if wd_work_uri else ""
            if not wd_title or not wd_img:
                continue
            key = name_key(wd_title)
            if key not in artworks_by_key:
                continue
            # Require that at least one matching artwork has CREATED_BY pointing to this practitioner
            for art in artworks_by_key[key]:
                if creator_of.get(art["id"]) != pract_id:
                    continue
                hits += 1
                patches.append({
                    "node_id": art["id"],
                    "image_url": wd_img.replace("http://", "https://"),
                    "image_license": "see Commons page (wikidata:P18)",
                    "image_source": "wikidata",
                    "wikidata_qid": wd_qid,
                    "match_method": "exact" if art["name"] == wd_title else "fuzzy",
                    "matched_title_wd": wd_title,
                })
        # Wikidata asks for ≤5 req/sec to SPARQL — pause briefly
        time.sleep(1.2)

    print(f"Queried: {queried} practitioners")
    print(f"Artwork image patches: {len(patches)}")
    print(f"Skipped (errors): {len(skipped)}")
    for pid, qid, why in skipped[:10]:
        print(f"  ! {pid} ({qid}): {why}")

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
