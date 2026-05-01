#!/usr/bin/env python3
"""
Add draft artwork nodes (+ CREATED_BY edges) for Art Blocks core-contract
projects whose creator is already a seed practitioner but whose work is
missing from nodes.json.

Runs the same Hasura query as fetch_artblocks.py. For each project returned,
if no existing artwork for that practitioner fuzzy-matches the project name,
emit a new artwork node with status="draft" and a CREATED_BY edge.

Side-effects (only with --write):
  - seed/nodes.json      : appends new artwork nodes (backup to .json.bak)
  - seed/edges.json      : appends new CREATED_BY edges (backup to .json.bak)
  - seed/signals.json    : adds signal:artblocks-api-2026-04 if absent

Dry-run by default. Run with --write to persist.
"""
import json
import re
import shutil
import sys
import time
import unicodedata
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).parent
SEED = HERE.parent

HASURA = "https://data.artblocks.io/v1/graphql"
UA = "A(DAI)-seed-consolidation/1.0 (https://github.com/a-digital-arts-institute/adai-v1)"

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
    description
    start_datetime
  }
}"""

SIGNAL_ID = "signal:artblocks-api-2026-04"
CONTRIBUTOR = "gatherer-artblocks-v1"
NOW_ISO = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def name_key(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode()
    s = re.sub(r"[^\w\s]", " ", s)
    return " ".join(s.split())


def clean_artist_for_search(name: str) -> str:
    return re.sub(r"\s*\([^)]*\)\s*", " ", name).strip()


def strip_trailing_paren(name: str) -> str:
    """'Chromie Squiggle (Snowfro)' -> 'Chromie Squiggle'."""
    return re.sub(r"\s*\([^)]*\)\s*$", "", name).strip()


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s).strip("-")
    return s


def fuzzy_match(proj_key: str, art_keys: list):
    if not proj_key:
        return None
    if proj_key in art_keys:
        return proj_key
    for k in art_keys:
        if not k or min(len(k), len(proj_key)) < 4:
            continue
        if proj_key in k or k in proj_key:
            return k
    return None


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


def build_artwork_node(project: dict, practitioner_id: str) -> dict:
    clean_name = strip_trailing_paren(project["name"])
    nid = f"artwork:{clean_name.lower()}"
    slug = slugify(clean_name)
    token_id = str(int(project["project_id"]) * 1_000_000)

    year = None
    if project.get("start_datetime"):
        try:
            year = int(project["start_datetime"][:4])
        except Exception:
            year = None

    metadata = {
        "status": "draft",
        "description": (project.get("description") or "").strip() or None,
        "work_type": "platform",
        "year_start": year,
        "year_end": year,
        "year_ongoing": False,
        "year_uncertain": year is None,
        "image_url": f"https://media.artblocks.io/thumb/{token_id}.png",
        "image_license": "Art Blocks (verify per project license)",
        "image_source": "artblocks",
        "artblocks_contract": project["contract_address"],
        "artblocks_project_id": str(project["project_id"]),
        "artblocks_token_id": token_id,
        "artblocks_title": project["name"],
        "artblocks_artist_name": project["artist_name"],
        "data_provenance": {
            "source": "artblocks-hasura",
            "fetched_at": NOW_ISO,
            "signal_id": SIGNAL_ID,
        },
        "creator_practitioner_id": practitioner_id,
    }

    return {
        "id": nid,
        "type": "artwork",
        "name": clean_name,
        "slug": slug,
        "metadata": json.dumps(metadata, ensure_ascii=False),
        "created_at": NOW_ISO,
        "updated_by": CONTRIBUTOR,
    }


def build_created_by_edge(artwork_id: str, practitioner_id: str) -> dict:
    return {
        "id": f"{artwork_id}--created_by--{practitioner_id}",
        "source_id": artwork_id,
        "target_id": practitioner_id,
        "edge_type": "CREATED_BY",
        "signal_id": SIGNAL_ID,
        "confidence": "high",
        "charge": None,
        "created_at": NOW_ISO,
        "created_by": CONTRIBUTOR,
        "event_time": None,
        "valid_from": NOW_ISO,
        "valid_until": None,
        "invalidated_by": None,
    }


def build_signal() -> dict:
    return {
        "id": SIGNAL_ID,
        "title": "Art Blocks Hasura API — artwork drafts (April 2026)",
        "source_url": HASURA,
        "source_type": "api",
        "cla_layer": "public",
        "summary": (
            "Bulk ingest of Art Blocks core-contract projects (V0/V1/V3) whose "
            "artist_name matches an existing seed practitioner. Creates draft "
            "artwork nodes so follow-up passes (fetch_artblocks.py, editorial "
            "review) have something to attach to."
        ),
        "content": None,
        "submitted_by": CONTRIBUTOR,
        "confidence": "high",
        "lived_experience": False,
        "created_at": NOW_ISO,
        "consent_scope": "public",
        "consent_attribution": "Art Blocks (per-project license varies)",
        "consent_revocable": False,
        "processing_trace": json.dumps({
            "contracts": CORE_CONTRACTS,
            "query": "projects_metadata by artist_name ilike %practitioner_name%",
        }),
        "source_origin": "api",
        "batch_id": "artblocks-drafts-2026-04",
        "status": "processed",
        "provenance_chain": None,
    }


def main():
    write_mode = "--write" in sys.argv

    nodes = json.load(open(SEED / "nodes.json"))
    edges = json.load(open(SEED / "edges.json"))
    signals = json.load(open(SEED / "signals.json"))

    node_by_id = {n["id"]: n for n in nodes}
    existing_node_ids = set(node_by_id)
    existing_edge_ids = {e["id"] for e in edges}

    creator_of = {
        e["source_id"]: e["target_id"]
        for e in edges
        if e["edge_type"] == "CREATED_BY"
    }

    # Practitioner -> list of artwork nodes (existing)
    artworks_by_creator: dict = {}
    for n in nodes:
        if n["type"] != "artwork":
            continue
        cid = creator_of.get(n["id"])
        if not cid or not cid.startswith("practitioner:"):
            continue
        artworks_by_creator.setdefault(cid, []).append(n)

    new_nodes = []
    new_edges = []
    skipped_existing_art = []  # (pract_id, project_name, matched_existing_name)
    skipped_id_collision = []  # (pract_id, project_name, node_id)
    queried = 0
    projects_seen = 0

    for pract_id in sorted(artworks_by_creator):
        arts = artworks_by_creator[pract_id]
        pract_name = node_by_id[pract_id]["name"]
        search_name = clean_artist_for_search(pract_name)
        queried += 1
        try:
            projects = query_projects(search_name)
        except Exception as ex:
            print(f"  ! query error for {pract_id}: {ex}")
            time.sleep(3)
            continue

        if not projects:
            time.sleep(1)
            continue

        arts_by_key = {name_key(a["name"]): a for a in arts}
        art_keys = list(arts_by_key.keys())

        for proj in projects:
            projects_seen += 1
            clean_proj_name = strip_trailing_paren(proj["name"])
            pkey = name_key(clean_proj_name)

            matched = fuzzy_match(pkey, art_keys)
            if matched:
                skipped_existing_art.append(
                    (pract_id, proj["name"], arts_by_key[matched]["name"])
                )
                continue

            new_node = build_artwork_node(proj, pract_id)
            if new_node["id"] in existing_node_ids:
                skipped_id_collision.append(
                    (pract_id, proj["name"], new_node["id"])
                )
                continue

            new_edge = build_created_by_edge(new_node["id"], pract_id)
            if new_edge["id"] in existing_edge_ids:
                skipped_id_collision.append(
                    (pract_id, proj["name"], new_edge["id"])
                )
                continue

            new_nodes.append(new_node)
            new_edges.append(new_edge)
            existing_node_ids.add(new_node["id"])
            existing_edge_ids.add(new_edge["id"])

        time.sleep(1)

    print(f"Queried:                 {queried} practitioners")
    print(f"AB projects seen:        {projects_seen}")
    print(f"Already-present matches: {len(skipped_existing_art)}")
    print(f"ID collisions skipped:   {len(skipped_id_collision)}")
    print(f"New draft artworks:      {len(new_nodes)}")
    if new_nodes:
        print("\nNew artworks:")
        for n in new_nodes:
            md = json.loads(n["metadata"])
            print(f"  + {n['id']}  ({md['artblocks_artist_name']}, project {md['artblocks_project_id']})")

    if not write_mode:
        print(f"\n(dry-run) Would add {len(new_nodes)} nodes + {len(new_edges)} edges.")
        print("Run with --write to persist.")
        return

    # Persist: signal first (if absent), then nodes, then edges.
    if not any(s["id"] == SIGNAL_ID for s in signals):
        signals.append(build_signal())
        backup = (SEED / "signals.json").with_suffix(".json.bak")
        shutil.copy(SEED / "signals.json", backup)
        (SEED / "signals.json").write_text(json.dumps(signals, indent=2, ensure_ascii=False))
        print(f"\nSignals: +1 ({SIGNAL_ID})")

    if new_nodes:
        backup = (SEED / "nodes.json").with_suffix(".json.bak")
        shutil.copy(SEED / "nodes.json", backup)
        nodes.extend(new_nodes)
        (SEED / "nodes.json").write_text(json.dumps(nodes, indent=2, ensure_ascii=False))
        print(f"Nodes:   +{len(new_nodes)} written to {SEED / 'nodes.json'}")

    if new_edges:
        backup = (SEED / "edges.json").with_suffix(".json.bak")
        shutil.copy(SEED / "edges.json", backup)
        edges.extend(new_edges)
        (SEED / "edges.json").write_text(json.dumps(edges, indent=2, ensure_ascii=False))
        print(f"Edges:   +{len(new_edges)} written to {SEED / 'edges.json'}")


if __name__ == "__main__":
    main()
