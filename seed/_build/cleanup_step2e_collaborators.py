"""Cleanup step 2e: move 43 COLLABORATES_WITH non-conforming edges to source-node metadata.

SKILL.md defines COLLABORATES_WITH as `practitioner ↔ practitioner`. The audit
found 43 edges where at least one side is not a practitioner:

  - 33 across collective/platform/institution/project/publication and
    practitioners (e.g. JODI ↔ Olia Lialina, Feral File ↔ Refik Anadol,
    Holly+ ↔ Holly Herndon)
  - 10 between organisations (e.g. Are.na ↔ Rhizome, fx(hash) ↔ Art Blocks)

These are a mix of real cross-boundary collaborations and arguably
mis-typed relations (Feral File "collaborates with" artists is closer to
curator-artist; Holly+ "collaborates with" Holly Herndon is identity).
Cleanup preserves the data without judging each case — manual curation
can triage later.

Movement: each edge becomes an entry in source-node.metadata.collaborators
with {id, name, type, source}.

Idempotent.

Usage:
  seed/_build/.venv/bin/python3 seed/_build/cleanup_step2e_collaborators.py            # dry-run
  seed/_build/.venv/bin/python3 seed/_build/cleanup_step2e_collaborators.py --apply    # write
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
        if e["edge_type"] != "COLLABORATES_WITH":
            continue
        src_t = ntype(e["source_id"])
        tgt_t = ntype(e["target_id"])
        if src_t == "practitioner" and tgt_t == "practitioner":
            continue  # conforming
        targets.append({
            "edge_id": e.get("id"),
            "source_id": e["source_id"],
            "source_name": nname(e["source_id"]),
            "source_type": src_t,
            "target_id": e["target_id"],
            "target_name": nname(e["target_id"]),
            "target_type": tgt_t,
            "created_by": e["created_by"],
        })

    print(f"=== Cleanup step 2e — {'APPLY' if args.apply else 'DRY-RUN'} ===")
    print(f"Edges to move: {len(targets)}")
    print(f"Source types: {dict(Counter(t['source_type'] for t in targets))}")
    print(f"Target types: {dict(Counter(t['target_type'] for t in targets))}")
    print()

    plan: dict[str, list[dict]] = defaultdict(list)
    for t in targets:
        plan[t["source_id"]].append(t)

    print(f"Affects {len(plan)} source nodes.")
    print()
    print("--- sample of planned metadata additions (first 10 source nodes) ---")
    for src_id, entries in list(plan.items())[:10]:
        print(f"  {nname(src_id)!r} ({ntype(src_id)}):")
        for t in entries:
            print(f"      ↔ {t['target_name']!r} ({t['target_type']}, source: {t['created_by']})")
    if len(plan) > 10:
        print(f"  ...and {len(plan) - 10} more source nodes")
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
        existing = md.get("collaborators") or []
        existing_ids = {x.get("id") for x in existing if isinstance(x, dict)}
        remaining = [t for t in entries if t["target_id"] not in existing_ids]
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
        existing = md.get("collaborators") or []
        if not isinstance(existing, list): existing = []
        for t in entries:
            existing.append({
                "id": t["target_id"],
                "name": t["target_name"],
                "type": t["target_type"],
                "source": t["created_by"],
            })
            entries_added += 1
        md["collaborators"] = existing
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
