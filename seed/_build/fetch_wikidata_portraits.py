#!/usr/bin/env python3
"""
Fetch Wikidata P18 portraits for each practitioner in seed/nodes.json that has
a wikidata_qid. P18 on a PERSON entity is typically a Wikimedia Commons filename
of a portrait photo (e.g. "Casey Reas portrait.jpg").

Strategy:
  For each QID, SELECT ?image WHERE { wd:QID wdt:P18 ?image }
  Convert Commons file URL to a resolvable thumbnail URL via Special:FilePath.

Output: seed/_build/image_patches/wikidata_portraits.json
Shape:
  [{"node_id": "practitioner:...",
    "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/<file>",
    "image_license": "see Commons page (wikidata:P18)",
    "image_source": "wikidata_portrait",
    "wikidata_qid": "Q...",
    "commons_filename": "..."}]

These are PRACTITIONER portraits, not artwork images.

Dry-run by default. Pass --write to persist.
"""
from __future__ import annotations
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
SEED = HERE.parent
OUT = HERE / "image_patches" / "wikidata_portraits.json"
OUT.parent.mkdir(exist_ok=True)

SPARQL = "https://query.wikidata.org/sparql"
UA = "A(DAI)-seed-consolidation/1.0 (https://github.com/a-digital-arts-institute/adai-v1)"


def sparql_json(query: str) -> dict:
    url = SPARQL + "?query=" + urllib.parse.quote(query) + "&format=json"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}", "body": e.read().decode(errors="replace")[:400]}
    except Exception as e:
        return {"error": str(e)}


def commons_url_for(filename: str) -> str:
    # Special:FilePath redirects to the actual file URL; accepts bare filenames
    return "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(filename)


def main() -> int:
    write = "--write" in sys.argv

    nodes = json.load(open(SEED / "nodes.json"))
    practs = []
    for n in nodes:
        if n.get("type") not in ("practitioner", "collective"):
            continue
        md = n.get("metadata")
        if isinstance(md, str):
            try: md = json.loads(md)
            except: md = {}
        qid = (md or {}).get("wikidata_qid")
        if qid:
            practs.append((n["id"], n["name"], qid))
        else:
            # try aliases.json for QID fallback
            pass

    # Also use aliases.json for QID coverage
    aliases_path = SEED / "aliases.json"
    if aliases_path.exists():
        aliases = json.load(open(aliases_path))
        have = {p[0] for p in practs}
        for a in aliases:
            if a.get("source") == "wikidata":
                nid = a.get("node_id")
                if nid in have: continue
                qid = a.get("external_id")
                node = next((n for n in nodes if n.get("id") == nid), None)
                if node and qid and node.get("type") in ("practitioner", "collective"):
                    practs.append((nid, node.get("name"), qid))

    print(f"Practitioners with QIDs: {len(practs)}")

    patches: list[dict] = []
    queried = 0
    with_image = 0
    errors = []
    for nid, name, qid in practs:
        queried += 1
        query = f"SELECT ?image WHERE {{ wd:{qid} wdt:P18 ?image }} LIMIT 1"
        r = sparql_json(query)
        if "error" in r:
            errors.append((nid, qid, r["error"]))
            time.sleep(1.2)
            continue
        bindings = r.get("results", {}).get("bindings", [])
        if not bindings:
            time.sleep(1.2)
            continue
        img_url = bindings[0].get("image", {}).get("value", "")
        if not img_url:
            time.sleep(1.2)
            continue
        # img_url is typically http://commons.wikimedia.org/wiki/Special:FilePath/<file>
        # Extract filename (last path segment, URL-decoded)
        filename = urllib.parse.unquote(img_url.rsplit("/", 1)[-1])
        patches.append({
            "node_id": nid,
            "image_url": commons_url_for(filename),
            "image_license": "see Commons page (wikidata:P18)",
            "image_source": "wikidata_portrait",
            "wikidata_qid": qid,
            "commons_filename": filename,
            "target_kind": "practitioner",
        })
        with_image += 1
        time.sleep(1.2)  # respect Wikidata rate limit

    print(f"Queried:           {queried}")
    print(f"With P18 portrait: {with_image}")
    print(f"Errors:            {len(errors)}")
    for nid, qid, why in errors[:5]:
        print(f"  ! {nid} ({qid}): {why}")

    if write:
        OUT.write_text(json.dumps(patches, indent=2, ensure_ascii=False))
        print(f"\nWrote: {OUT}")
    else:
        print(f"\n(dry-run) Would write {len(patches)} patches. Pass --write to persist.")
        for p in patches[:5]:
            print(f"  {p['node_id']}: {p['commons_filename']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
