"""Cleanup step 2c: move 294 EXHIBITED_AT practitioner-source edges to practitioner metadata.

SKILL.md defines EXHIBITED_AT as `artwork → institution/platform` — artwork-level
provenance. The audit found 294 edges that are `practitioner → institution/platform`,
encoding biographical CV data ("Anna Ridler exhibited at Barbican at some point").
These don't fit the artwork-level contract.

Movement: each edge becomes an entry in source-practitioner.metadata.exhibitions,
preserving the venue id, name, type, and originating gatherer for provenance.

Idempotent: re-running detects entries already present by venue id and skips them.

Usage:
  seed/_build/.venv/bin/python3 seed/_build/cleanup_step2c_exhibitions.py            # dry-run
  seed/_build/.venv/bin/python3 seed/_build/cleanup_step2c_exhibitions.py --apply    # write
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
    """Mutate node['metadata'] to a dict in-place; returns the dict.

    Handles the known seed bug where some nodes have metadata stored as a JSON
    string instead of a dict.
    """
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
    parser.add_argument("--apply", action="store_true",
                        help="Write changes. Without this flag, dry-run only.")
    args = parser.parse_args()

    nodes_list = json.loads(NODES_PATH.read_text())
    edges = json.loads(EDGES_PATH.read_text())
    nodes_by_id = {n["id"]: n for n in nodes_list}

    def ntype(nid: str) -> str:
        return nodes_by_id.get(nid, {}).get("type", "?")

    def nname(nid: str) -> str:
        return nodes_by_id.get(nid, {}).get("name", nid)

    # Identify the 294 target edges: EXHIBITED_AT where source is a practitioner.
    targets: list[dict] = []
    for e in edges:
        if e["edge_type"] != "EXHIBITED_AT":
            continue
        if ntype(e["source_id"]) != "practitioner":
            continue
        targets.append({
            "edge_id": e.get("id"),
            "practitioner_id": e["source_id"],
            "practitioner_name": nname(e["source_id"]),
            "venue_id": e["target_id"],
            "venue_name": nname(e["target_id"]),
            "venue_type": ntype(e["target_id"]),
            "created_by": e["created_by"],
        })

    print(f"=== Cleanup step 2c — {'APPLY' if args.apply else 'DRY-RUN'} ===")
    print(f"Edges to move: {len(targets)}")
    by_venue_type = Counter(t["venue_type"] for t in targets)
    by_creator = Counter(t["created_by"] for t in targets)
    print(f"Venue types: {dict(by_venue_type)}")
    print(f"Originating gatherers: {dict(by_creator)}")
    print()

    # Group plan by practitioner
    plan: dict[str, list[dict]] = defaultdict(list)
    for t in targets:
        plan[t["practitioner_id"]].append(t)

    print(f"Affects {len(plan)} practitioner nodes.")
    print(f"Median exhibitions per practitioner: {sorted(len(v) for v in plan.values())[len(plan)//2]}")
    print(f"Max for one practitioner: {max(len(v) for v in plan.values())}")
    print()
    print("--- sample of planned metadata additions (top 5 by count) ---")
    samples = sorted(plan.items(), key=lambda kv: -len(kv[1]))[:5]
    for pid, entries in samples:
        print(f"  {nname(pid)!r} ({pid}) — {len(entries)} exhibitions:")
        for t in entries[:5]:
            print(f"      → {t['venue_name']!r} ({t['venue_type']}, source: {t['created_by']})")
        if len(entries) > 5:
            print(f"      ...and {len(entries) - 5} more")
    print()

    # Idempotency check: don't re-add entries that already exist by venue_id
    skipped_already_present = 0
    for pid, entries in plan.items():
        md = nodes_by_id.get(pid, {}).get("metadata") or {}
        if isinstance(md, str):
            try:
                md = json.loads(md)
                if not isinstance(md, dict):
                    md = {}
            except json.JSONDecodeError:
                md = {}
        existing = md.get("exhibitions") or []
        existing_venue_ids = {x.get("id") for x in existing if isinstance(x, dict)}
        remaining = [t for t in entries if t["venue_id"] not in existing_venue_ids]
        if len(remaining) != len(entries):
            skipped_already_present += len(entries) - len(remaining)
        plan[pid] = remaining

    if skipped_already_present:
        print(f"Note: {skipped_already_present} entries already present in metadata; will be skipped.")
        print()

    if not args.apply:
        print("Dry-run complete. Re-run with --apply to write changes.")
        return 0

    # APPLY
    edge_ids_to_delete = {t["edge_id"] for t in targets}

    nodes_modified = 0
    entries_added = 0
    for n in nodes_list:
        if n["id"] not in plan:
            continue
        entries = plan[n["id"]]
        if not entries:
            continue
        md = _ensure_dict_metadata(n)
        existing = md.get("exhibitions") or []
        if not isinstance(existing, list):
            existing = []
        for t in entries:
            existing.append({
                "id": t["venue_id"],
                "name": t["venue_name"],
                "type": t["venue_type"],
                "source": t["created_by"],
            })
            entries_added += 1
        md["exhibitions"] = existing
        nodes_modified += 1

    new_edges = [e for e in edges if e.get("id") not in edge_ids_to_delete]
    edges_deleted = len(edges) - len(new_edges)

    if edges_deleted != len(targets):
        print(f"ERROR: planned to delete {len(targets)} edges but actually deleted {edges_deleted}. Aborting.",
              file=sys.stderr)
        return 1

    NODES_PATH.write_text(json.dumps(nodes_list, indent=2, ensure_ascii=False))
    EDGES_PATH.write_text(json.dumps(new_edges, indent=2, ensure_ascii=False))

    print(f"Wrote {NODES_PATH} ({nodes_modified} practitioner nodes modified, "
          f"{entries_added} exhibitions entries added).")
    print(f"Wrote {EDGES_PATH} ({edges_deleted} edges deleted).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
