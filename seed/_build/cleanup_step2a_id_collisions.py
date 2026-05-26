"""Cleanup step 2a: resolve the 2 id collisions by deleting spurious edges.

Background. Two artwork nodes had multiple CREATED_BY edges from unrelated
practitioners because the canonical id scheme (<type>:<lower(name)>) collapses
all "Untitled" or "Black Hole" works into one node. The metadata on each node
identifies which artwork it "really" is:

  artwork:untitled    — American Artist 2019 "Untitled" (MoMA, object_id 435713)
  artwork:black hole  — Suzanne Treister 1987 painting (Wikidata Q119409616)

Other CREATED_BY edges and source-specific EMBODIES tags were attached by
gatherers that hit the slug collision. They reference works we don't have
detailed information about (Vera Molnár has many untitled works; Addie
Wagenknecht has a digital "Black Hole" we only know via two objkt tags).

Resolution: delete the spurious edges. The nodes become uniquely attributed
to their canonical creator. No placeholder nodes created (we'd have nothing
to put in them).

Edges to delete:
  - artwork:untitled --CREATED_BY--> practitioner:vera molnár
  - artwork:untitled --CREATED_BY--> practitioner:harold cohen
  - artwork:black hole --CREATED_BY--> practitioner:addie wagenknecht
  - artwork:black hole --EMBODIES--> concept:blackhole
  - artwork:black hole --EMBODIES--> concept:julianhechenberger

5 edges total.

Usage:
  seed/_build/.venv/bin/python3 seed/_build/cleanup_step2a_id_collisions.py            # dry-run
  seed/_build/.venv/bin/python3 seed/_build/cleanup_step2a_id_collisions.py --apply    # write
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
EDGES_PATH = REPO_ROOT / "seed" / "edges.json"
NODES_PATH = REPO_ROOT / "seed" / "nodes.json"

# (source_id, edge_type, target_id) tuples to delete
TO_DELETE = {
    ("artwork:untitled", "CREATED_BY", "practitioner:vera molnar"),
    ("artwork:untitled", "CREATED_BY", "practitioner:harold cohen"),
    ("artwork:black hole", "CREATED_BY", "practitioner:addie wagenknecht"),
    ("artwork:black hole", "EMBODIES", "concept:blackhole"),
    ("artwork:black hole", "EMBODIES", "concept:julianhechenberger"),
}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    nodes = {n["id"]: n for n in json.loads(NODES_PATH.read_text())}
    edges = json.loads(EDGES_PATH.read_text())

    def nname(nid: str) -> str:
        return nodes.get(nid, {}).get("name", nid)

    # Find matching edges
    matched = []
    for e in edges:
        key = (e["source_id"], e["edge_type"], e["target_id"])
        if key in TO_DELETE:
            matched.append(e)

    print(f"=== Cleanup step 2a — {'APPLY' if args.apply else 'DRY-RUN'} ===")
    print(f"Edges queued for deletion: {len(matched)} (expected {len(TO_DELETE)})")
    print()
    for e in matched:
        s = nname(e["source_id"])
        t = nname(e["target_id"])
        print(f"  DELETE  {s!r:40s}  --{e['edge_type']:10s}-->  {t!r:30s}  (id={e.get('id', '<no-id>')!r}, by {e['created_by']})")
    print()

    if len(matched) != len(TO_DELETE):
        print(f"ERROR: expected {len(TO_DELETE)} matches, found {len(matched)}. Aborting.",
              file=sys.stderr)
        return 1

    if args.apply:
        matched_ids = {e.get("id") for e in matched}
        matched_keys = {(e["source_id"], e["edge_type"], e["target_id"]) for e in matched}
        new_edges = []
        for e in edges:
            # Drop if id matches OR (no id but key matches)
            if e.get("id") and e["id"] in matched_ids:
                continue
            if (e["source_id"], e["edge_type"], e["target_id"]) in matched_keys and not e.get("id"):
                continue
            new_edges.append(e)
        deleted = len(edges) - len(new_edges)
        if deleted != len(TO_DELETE):
            print(f"ERROR: deletion count {deleted} != expected {len(TO_DELETE)}. Aborting.",
                  file=sys.stderr)
            return 1
        EDGES_PATH.write_text(json.dumps(new_edges, indent=2, ensure_ascii=False))
        print(f"Wrote {EDGES_PATH}: {len(edges)} edges -> {len(new_edges)} ({deleted} deleted).")
    else:
        print("Dry-run complete. Re-run with --apply to delete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
