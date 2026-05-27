"""Cleanup step 2d: move 8 BELONGS_TO collective-source edges to collective metadata.

SKILL.md defines BELONGS_TO as `practitioner → collective/scene`. The audit found
8 edges where a collective is the source ("etoy belongs_to net art", "Critical Art
Ensemble belongs_to tactical media", etc.) — real collective-to-scene affiliations
that don't fit the practitioner-source contract.

Movement: each edge becomes an entry in source-collective.metadata.scenes,
preserving the scene id, name, and originating gatherer for provenance.

Idempotent.

Usage:
  seed/_build/.venv/bin/python3 seed/_build/cleanup_step2d_collective_scenes.py            # dry-run
  seed/_build/.venv/bin/python3 seed/_build/cleanup_step2d_collective_scenes.py --apply    # write
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys
from collections import defaultdict

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
EDGES_PATH = REPO_ROOT / "seed" / "edges.json"
NODES_PATH = REPO_ROOT / "seed" / "nodes.json"


def _ensure_dict_metadata(node: dict) -> dict:
    raw = node.get("metadata")
    if raw is None:
        node["metadata"] = {}
    elif isinstance(raw, dict):
        pass
    elif isinstance(raw, str):
        try:
            decoded = json.loads(raw)
        except json.JSONDecodeError:
            decoded = {}
        node["metadata"] = decoded if isinstance(decoded, dict) else {}
    else:
        node["metadata"] = {}
    return node["metadata"]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    nodes_list = json.loads(NODES_PATH.read_text())
    edges = json.loads(EDGES_PATH.read_text())
    nodes_by_id = {n["id"]: n for n in nodes_list}

    def ntype(nid: str) -> str:
        return nodes_by_id.get(nid, {}).get("type", "?")

    def nname(nid: str) -> str:
        return nodes_by_id.get(nid, {}).get("name", nid)

    targets = []
    for e in edges:
        if e["edge_type"] != "BELONGS_TO":
            continue
        if ntype(e["source_id"]) != "collective":
            continue
        targets.append({
            "edge_id": e.get("id"),
            "collective_id": e["source_id"],
            "collective_name": nname(e["source_id"]),
            "scene_id": e["target_id"],
            "scene_name": nname(e["target_id"]),
            "scene_type": ntype(e["target_id"]),
            "created_by": e["created_by"],
        })

    print(f"=== Cleanup step 2d — {'APPLY' if args.apply else 'DRY-RUN'} ===")
    print(f"Edges to move: {len(targets)}")
    print()

    plan: dict[str, list[dict]] = defaultdict(list)
    for t in targets:
        plan[t["collective_id"]].append(t)

    print(f"Affects {len(plan)} collective nodes.")
    print()
    print("--- all planned metadata additions ---")
    for cid, entries in plan.items():
        print(f"  {nname(cid)!r} ({cid}):")
        for t in entries:
            print(f"      → {t['scene_name']!r} ({t['scene_type']}, source: {t['created_by']})")
    print()

    # Idempotency
    skipped = 0
    for cid, entries in plan.items():
        md = nodes_by_id.get(cid, {}).get("metadata") or {}
        if isinstance(md, str):
            try:
                md = json.loads(md)
                if not isinstance(md, dict): md = {}
            except json.JSONDecodeError: md = {}
        existing = md.get("scenes") or []
        existing_ids = {x.get("id") for x in existing if isinstance(x, dict)}
        remaining = [t for t in entries if t["scene_id"] not in existing_ids]
        skipped += len(entries) - len(remaining)
        plan[cid] = remaining
    if skipped:
        print(f"Note: {skipped} entries already present; skipping.")
        print()

    if not args.apply:
        print("Dry-run complete. Re-run with --apply to write changes.")
        return 0

    edge_ids_to_delete = {t["edge_id"] for t in targets}
    nodes_modified = 0
    entries_added = 0
    for n in nodes_list:
        if n["id"] not in plan: continue
        entries = plan[n["id"]]
        if not entries: continue
        md = _ensure_dict_metadata(n)
        existing = md.get("scenes") or []
        if not isinstance(existing, list): existing = []
        for t in entries:
            existing.append({
                "id": t["scene_id"],
                "name": t["scene_name"],
                "source": t["created_by"],
            })
            entries_added += 1
        md["scenes"] = existing
        nodes_modified += 1

    new_edges = [e for e in edges if e.get("id") not in edge_ids_to_delete]
    edges_deleted = len(edges) - len(new_edges)

    if edges_deleted != len(targets):
        print(f"ERROR: planned to delete {len(targets)} but deleted {edges_deleted}. Aborting.", file=sys.stderr)
        return 1

    NODES_PATH.write_text(json.dumps(nodes_list, indent=2, ensure_ascii=False))
    EDGES_PATH.write_text(json.dumps(new_edges, indent=2, ensure_ascii=False))

    print(f"Wrote {NODES_PATH} ({nodes_modified} nodes, {entries_added} entries).")
    print(f"Wrote {EDGES_PATH} ({edges_deleted} edges deleted).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
