#!/usr/bin/env python3
"""
fold_merge_into_seed.py — apply the real-source merge bundle directly to
seed/nodes.json and seed/edges.json so they become the unified canonical
state. After fold:
  - 564 heuristic EMBODIES are gone from seed/edges.json
  - 517 new nodes are present in seed/nodes.json (deduped by id, INSERT OR
    REPLACE semantics)
  - 1,442 source-attested edges are present in seed/edges.json (same)

seed-consolidated.ts loads these files into adai.db on next Fly deploy.
Idempotent — safe to re-run.
"""
import json, sys
from pathlib import Path

HERE = Path(__file__).parent
SEED = HERE.parent
NODES = SEED / "nodes.json"
EDGES = SEED / "edges.json"
BUNDLE = HERE / "real_source_merge_2026-04-28.json"

def main():
    nodes = json.loads(NODES.read_text())
    edges = json.loads(EDGES.read_text())
    bundle = json.loads(BUNDLE.read_text())

    nodes_by_id = {n["id"]: n for n in nodes}
    edges_by_id = {e["id"]: e for e in edges}

    before = {"nodes": len(nodes_by_id), "edges": len(edges_by_id)}

    # 1. DELETE the heuristic EMBODIES
    delete_ids = {e["id"] for e in bundle["delete"]["edges"]}
    deleted = 0
    for eid in delete_ids:
        if edges_by_id.pop(eid, None) is not None:
            deleted += 1

    # 2. INSERT OR REPLACE new nodes
    inserted_nodes = 0
    replaced_nodes = 0
    for n in bundle["insert"]["nodes"]:
        if n["id"] in nodes_by_id:
            replaced_nodes += 1
        else:
            inserted_nodes += 1
        nodes_by_id[n["id"]] = n

    # 3. INSERT OR REPLACE new edges
    inserted_edges = 0
    replaced_edges = 0
    for e in bundle["insert"]["edges"]:
        if e["id"] in edges_by_id:
            replaced_edges += 1
        else:
            inserted_edges += 1
        edges_by_id[e["id"]] = e

    # Write back
    NODES.write_text(json.dumps(list(nodes_by_id.values()), indent=2, ensure_ascii=False))
    EDGES.write_text(json.dumps(list(edges_by_id.values()), indent=2, ensure_ascii=False))

    after = {"nodes": len(nodes_by_id), "edges": len(edges_by_id)}

    print("=== Folded merge bundle into seed/nodes.json + seed/edges.json ===")
    print(f"  Before:  {before['nodes']} nodes, {before['edges']} edges")
    print(f"  Deleted: {deleted} heuristic EMBODIES")
    print(f"  Nodes:   +{inserted_nodes} new, ~{replaced_nodes} replaced")
    print(f"  Edges:   +{inserted_edges} new, ~{replaced_edges} replaced")
    print(f"  After:   {after['nodes']} nodes, {after['edges']} edges")
    print()
    print(f"  Net change: nodes {after['nodes']-before['nodes']:+d}, edges {after['edges']-before['edges']:+d}")

if __name__ == "__main__":
    main()
