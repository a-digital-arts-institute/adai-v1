#!/usr/bin/env python3
"""
fold_named_anchors_into_seed.py — apply the wikidata named-anchors bundle
to seed/nodes.json + seed/edges.json.

Sister to fold_merge_into_seed.py, but the named-anchors bundle is insert-only
(no `delete` block — it's pure additions: 12 practitioners + 9 artworks +
3 concepts + 27 edges that didn't exist before).

INSERT OR REPLACE semantics by id, same as the original fold. Idempotent.

Run order:
  1. fetch_wikidata_named_anchors.py     → produces the bundle
  2. fold_named_anchors_into_seed.py     → applies it (this script)
  3. dedup_pre_commit.py                 → catches any concept-slug collisions
                                            the new pass may have introduced
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
SEED = HERE.parent
NODES = SEED / "nodes.json"
EDGES = SEED / "edges.json"
BUNDLE = HERE / "wikidata_named_anchors_2026-04-28.json"


def main():
    nodes = json.loads(NODES.read_text())
    edges = json.loads(EDGES.read_text())
    bundle = json.loads(BUNDLE.read_text())

    nodes_by_id = {n["id"]: n for n in nodes}
    edges_by_id = {e["id"]: e for e in edges}
    before = {"nodes": len(nodes_by_id), "edges": len(edges_by_id)}

    inserted_nodes = replaced_nodes = 0
    for n in bundle["insert"]["nodes"]:
        if n["id"] in nodes_by_id:
            replaced_nodes += 1
        else:
            inserted_nodes += 1
        nodes_by_id[n["id"]] = n

    inserted_edges = replaced_edges = 0
    for e in bundle["insert"]["edges"]:
        if e["id"] in edges_by_id:
            replaced_edges += 1
        else:
            inserted_edges += 1
        edges_by_id[e["id"]] = e

    NODES.write_text(json.dumps(list(nodes_by_id.values()), indent=2, ensure_ascii=False))
    EDGES.write_text(json.dumps(list(edges_by_id.values()), indent=2, ensure_ascii=False))

    after = {"nodes": len(nodes_by_id), "edges": len(edges_by_id)}
    print("=== Folded named-anchors bundle into seed/nodes.json + seed/edges.json ===")
    print(f"  Before: {before['nodes']} nodes, {before['edges']} edges")
    print(f"  Nodes:  +{inserted_nodes} new, ~{replaced_nodes} replaced")
    print(f"  Edges:  +{inserted_edges} new, ~{replaced_edges} replaced")
    print(f"  After:  {after['nodes']} nodes, {after['edges']} edges  "
          f"(Δ nodes {after['nodes']-before['nodes']:+d}, edges {after['edges']-before['edges']:+d})")


if __name__ == "__main__":
    main()
