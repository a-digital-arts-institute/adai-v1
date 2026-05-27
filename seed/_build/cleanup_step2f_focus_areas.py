"""Cleanup step 2f: move 96 PRACTICES non-conforming edges to source-node metadata.

SKILL.md defines PRACTICES as `practitioner → concept`. The audit found 96 edges
where the source is not a practitioner — collective, platform, institution,
project, publication, or artwork.

These are a mix of activity claims ('0xSalon practices Writing', 'Fellowship.xyz
practices curation') and type-tags ('Are.na practices Collaborative knowledge
platform', 'Starmirror practices AI installation'). The line between them is
fuzzy; for the cleanup pass we collapse both into a single metadata field
`focus_areas`. Manual curation can refine the distinction later if useful.

Movement: each edge becomes an entry in source-node.metadata.focus_areas
with {id, name, source}.

Idempotent.

Usage:
  seed/_build/.venv/bin/python3 seed/_build/cleanup_step2f_focus_areas.py            # dry-run
  seed/_build/.venv/bin/python3 seed/_build/cleanup_step2f_focus_areas.py --apply    # write
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys
from collections import Counter, defaultdict

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
        if e["edge_type"] != "PRACTICES":
            continue
        if ntype(e["source_id"]) == "practitioner":
            continue
        targets.append({
            "edge_id": e.get("id"),
            "source_id": e["source_id"],
            "source_name": nname(e["source_id"]),
            "source_type": ntype(e["source_id"]),
            "concept_id": e["target_id"],
            "concept_name": nname(e["target_id"]),
            "created_by": e["created_by"],
        })

    print(f"=== Cleanup step 2f — {'APPLY' if args.apply else 'DRY-RUN'} ===")
    print(f"Edges to move: {len(targets)}")
    print(f"Source types: {dict(Counter(t['source_type'] for t in targets))}")
    print()

    plan: dict[str, list[dict]] = defaultdict(list)
    for t in targets:
        plan[t["source_id"]].append(t)

    print(f"Affects {len(plan)} source nodes.")
    print()
    print("--- sample of planned metadata additions (first 8 source nodes) ---")
    for src_id, entries in list(plan.items())[:8]:
        print(f"  {nname(src_id)!r} ({ntype(src_id)}) — {len(entries)} focus areas:")
        for t in entries[:5]:
            print(f"      → {t['concept_name']!r}")
        if len(entries) > 5:
            print(f"      ...and {len(entries) - 5} more")
    print()

    # Idempotency
    skipped = 0
    for src_id, entries in plan.items():
        md = nodes_by_id.get(src_id, {}).get("metadata") or {}
        if isinstance(md, str):
            try:
                md = json.loads(md)
                if not isinstance(md, dict): md = {}
            except json.JSONDecodeError: md = {}
        existing = md.get("focus_areas") or []
        existing_ids = {x.get("id") for x in existing if isinstance(x, dict)}
        remaining = [t for t in entries if t["concept_id"] not in existing_ids]
        skipped += len(entries) - len(remaining)
        plan[src_id] = remaining
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
        existing = md.get("focus_areas") or []
        if not isinstance(existing, list): existing = []
        for t in entries:
            existing.append({
                "id": t["concept_id"],
                "name": t["concept_name"],
                "source": t["created_by"],
            })
            entries_added += 1
        md["focus_areas"] = existing
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
