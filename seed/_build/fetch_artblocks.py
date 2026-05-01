#!/usr/bin/env python3
"""
Fetch Art Blocks thumbnail images for artworks already in seed/nodes.json.

Strategy
--------
For each practitioner that has at least one artwork (via CREATED_BY edges),
query the public Art Blocks Hasura GraphQL endpoint for projects where that
artist matches. Restrict to the three core Art Blocks contracts (V0/V1/V3).
Fuzzy-match returned project names against the practitioner's artwork nodes
and emit an image patch only for artworks that already exist AND whose
CREATED_BY edge confirms the right creator.

Thumbnail URL
-------------
Art Blocks' per-token media bucket serves a PNG at
  https://media.artblocks.io/thumb/{TOKEN_ID}.png
TOKEN_ID for the first mint of a project is project_id * 1_000_000.
Example: project 78 (Fidenza, V1) → 78_000_000 → thumb/78000000.png.
Project 0 (Chromie Squiggle) → 0 → thumb/0.png (no zero-padding).

Output: seed/_build/image_patches/artblocks.json
Shape:
  [{"node_id": "artwork:...", "image_url": "...",
    "image_license": "Art Blocks (verify per project license)",
    "image_source": "artblocks",
    "artblocks_contract": "0x...", "artblocks_project_id": "78",
    "artblocks_token_id": "78000000", "match_method": "exact|fuzzy",
    "matched_title_ab": "...", "artist_name_ab": "..."}]

Dry-run by default: prints what it would write, only writes when run with --write.
"""
import json
import re
import sys
import time
import unicodedata
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
SEED = HERE.parent
OUT = HERE / "image_patches" / "artblocks.json"
OUT.parent.mkdir(exist_ok=True)

HASURA = "https://data.artblocks.io/v1/graphql"
UA = "A(DAI)-seed-consolidation/1.0 (https://github.com/a-digital-arts-institute/adai-v1)"

# Only the three core Art Blocks contracts — exclude Engine / PBAB deployments.
CORE_CONTRACTS = [
    "0x059edd72cd353df5106d2b9cc5ab83a52287ac3a",  # V0, projects 0–3
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",  # V1, projects 4–373
    "0x99a9b7c1116f9ceeb1652de04d5969cce509b069",  # V3, projects 374+
]

PROJECTS_QUERY = """query Projects($contracts: [String!]!, $artist: String!) {
  projects_metadata(
    where: {
      contract_address: {_in: $contracts},
      artist_name: {_ilike: $artist}
    }
    order_by: {project_id: asc}
  ) {
    id
    name
    artist_name
    project_id
    contract_address
  }
}"""


def name_key(s: str) -> str:
    """Lowercase, NFKD-fold accents, strip punctuation, collapse whitespace."""
    s = unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode()
    s = re.sub(r"[^\w\s]", " ", s)
    return " ".join(s.split())


def clean_artist_for_search(name: str) -> str:
    """Strip parenthetical aliases like 'Mario Klingemann (Quasimondo)' → 'Mario Klingemann'."""
    return re.sub(r"\s*\([^)]*\)\s*", " ", name).strip()


def query_projects(artist_name: str):
    payload = {
        "query": PROJECTS_QUERY,
        "variables": {"contracts": CORE_CONTRACTS, "artist": f"%{artist_name}%"},
    }
    req = urllib.request.Request(
        HASURA,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "User-Agent": UA},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = json.loads(resp.read())
    if "errors" in body:
        raise RuntimeError(body["errors"])
    return body.get("data", {}).get("projects_metadata", []) or []


def head_ok(url: str) -> bool:
    try:
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=10) as r:
            return 200 <= r.status < 400
    except Exception:
        return False


def fuzzy_match(proj_key: str, art_keys: list):
    """Exact match wins; otherwise smallest containing key (both directions)."""
    if not proj_key:
        return None, None
    if proj_key in art_keys:
        return proj_key, "exact"
    # Containment either way — require the shorter key to be at least 4 chars
    # to avoid absurd partial matches.
    best = None
    for k in art_keys:
        if not k or min(len(k), len(proj_key)) < 4:
            continue
        if proj_key in k or k in proj_key:
            if best is None or len(k) < len(best):
                best = k
    return (best, "fuzzy") if best else (None, None)


def main():
    write_mode = "--write" in sys.argv

    nodes = json.load(open(SEED / "nodes.json"))
    edges = json.load(open(SEED / "edges.json"))

    node_by_id = {n["id"]: n for n in nodes}
    creator_of = {
        e["source_id"]: e["target_id"]
        for e in edges
        if e["edge_type"] == "CREATED_BY"
    }

    # Group artworks by their creator practitioner.
    artworks_by_creator: dict = {}
    for n in nodes:
        if n["type"] != "artwork":
            continue
        cid = creator_of.get(n["id"])
        if not cid or not cid.startswith("practitioner:"):
            continue
        artworks_by_creator.setdefault(cid, []).append(n)

    patches = []
    queried = 0
    no_project_count = 0
    errors = []

    for pract_id in sorted(artworks_by_creator):
        arts = artworks_by_creator[pract_id]
        pract_name = node_by_id[pract_id]["name"]
        search_name = clean_artist_for_search(pract_name)
        queried += 1

        try:
            projects = query_projects(search_name)
        except Exception as ex:
            errors.append((pract_id, str(ex)))
            time.sleep(3)
            continue

        if not projects:
            no_project_count += 1
            time.sleep(1)
            continue

        arts_by_key = {name_key(a["name"]): a for a in arts}
        art_keys = list(arts_by_key.keys())

        for proj in projects:
            pkey = name_key(proj["name"])
            match_key, method = fuzzy_match(pkey, art_keys)
            if not match_key:
                continue
            art = arts_by_key[match_key]
            # Confirm the CREATED_BY edge still points at this practitioner.
            if creator_of.get(art["id"]) != pract_id:
                continue
            token_id = str(int(proj["project_id"]) * 1_000_000)
            patches.append({
                "node_id": art["id"],
                "image_url": f"https://media.artblocks.io/thumb/{token_id}.png",
                "image_license": "Art Blocks (verify per project license)",
                "image_source": "artblocks",
                "artblocks_contract": proj["contract_address"],
                "artblocks_project_id": str(proj["project_id"]),
                "artblocks_token_id": token_id,
                "match_method": method,
                "matched_title_ab": proj["name"],
                "artist_name_ab": proj["artist_name"],
            })

        # Be polite to Hasura
        time.sleep(1)

    # Dedupe: keep the first patch per artwork.
    seen = set()
    deduped = []
    for p in patches:
        if p["node_id"] in seen:
            continue
        seen.add(p["node_id"])
        deduped.append(p)
    patches = deduped

    # Spot-check a sample of thumbnail URLs.
    sample = patches[: min(5, len(patches))]
    verified = 0
    for p in sample:
        ok = head_ok(p["image_url"])
        print(f"  verify {'OK  ' if ok else 'FAIL'}: {p['image_url']}")
        if ok:
            verified += 1

    print(f"\nQueried:           {queried} practitioners")
    print(f"No AB projects:    {no_project_count}")
    print(f"Errors:            {len(errors)}")
    for pid, why in errors[:5]:
        print(f"  ! {pid}: {why}")
    print(f"Patches:           {len(patches)}")
    if sample:
        print(f"Verified sample:   {verified}/{len(sample)} thumbnail URLs resolved")

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
