"""
Post-Task-1 cleanup:
  A. merge duplicate institution variants (Pompidou Paris, V&A London, Venice Biennale years, etc.)
  B. retype platform-like nodes (SuperRare, Nifty Gateway) and publication-like (Outland)
     merge fxhash into existing platform:fxhash v2 tezos ecosystem
  C. drop fragment artifacts (Haus, Gallery, Museum, Palais, Physical)
  D. drop non-venues (Processing Foundation community, African Diaspora,
     Computer Art Exhibitions 1968-70, Compart database, Hyperdub 10)
     retarget 'The Machine as Seen...' (exhibition title) -> institution:moma
     retarget 'AI. Whitney Biennial' -> institution:whitney museum
     merge 3 Furtherfield nodes -> institution:furtherfield
     merge 3 Tate nodes (Tate + Tate Modern + Tate Britain) -> institution:tate
"""
from __future__ import annotations
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "seed"

# MERGE MAP: old_id -> new_id (edges retargeted; old nodes dropped)
MERGES: dict[str, str] = {
    # A: duplicates
    "institution:centre pompidou paris": "institution:centre pompidou",
    "institution:v&a london": "institution:v&a",
    "institution:v&a collection context": "institution:v&a",
    "institution:venice biennale 2001": "institution:venice biennale",
    "institution:venice biennale 2015": "institution:venice biennale",
    "institution:moma ps": "institution:moma ps1",
    "institution:sprth magers": "institution:spruth magers",
    "institution:zentrum fr kunst und medien karlsruhe": "institution:zkm",
    "institution:onassis cultural centre": "institution:onassis stegi",
    "institution:tate modern": "institution:tate",
    "institution:tate britain": "institution:tate",
    # D: furtherfield consolidation
    "institution:furtherfield gallery": "institution:furtherfield",
    "institution:furtherfield commons": "institution:furtherfield",
    # D: retargets
    "institution:ai whitney biennial": "institution:whitney museum",
    "institution:whitney biennial": "institution:whitney museum",
    "institution:the machine as seen at the end of the mechanical age": "institution:moma",
    # B: fxhash into existing platform
    "institution:fxhash": "platform:fxhash v2 tezos ecosystem",
}

# RETYPES: node whose type+id changes (edges retargeted to new id)
# old_id -> (new_id, new_type, new_display_name)
RETYPES: dict[str, tuple[str, str, str]] = {
    "institution:superrare": ("platform:superrare", "platform", "SuperRare"),
    "institution:nifty gateway": ("platform:nifty gateway", "platform", "Nifty Gateway"),
    "institution:outland": ("publication:outland", "publication", "Outland"),
}

# DROPS: nodes deleted, edges touching them also deleted
DROPS: set[str] = {
    "institution:hyperdub 10",
    "institution:haus",
    "institution:gallery",
    "institution:museum",
    "institution:palais",
    "institution:physical",
    "institution:compart database",
    "institution:computer art exhibitions 1968-70",
    "institution:processing foundation community",
    "institution:african diaspora",
}

# Display-name overrides (for canonical nodes whose name should be updated after merge)
RENAMES: dict[str, str] = {
    "institution:spruth magers": "Sprüth Magers",
    "institution:tate": "Tate",
}


def main():
    nodes = json.loads((SEED / "nodes-final.json").read_text())
    edges = json.loads((SEED / "edges-final.json").read_text())

    n_before = len(nodes)
    e_before = len(edges)

    # 1) Apply RETYPES: rewrite the node's id + type + name
    retype_map: dict[str, str] = {}  # old_id -> new_id (for edge rewrite)
    for n in list(nodes):
        if n["id"] in RETYPES:
            new_id, new_type, new_name = RETYPES[n["id"]]
            old_id = n["id"]
            # If new_id already exists, treat as merge (drop this node, retarget edges)
            existing_with_new_id = any(x["id"] == new_id for x in nodes if x is not n)
            if existing_with_new_id:
                retype_map[old_id] = new_id
                nodes.remove(n)
            else:
                n["id"] = new_id
                n["type"] = new_type
                n["name"] = new_name
                if "metadata" in n and isinstance(n["metadata"], dict):
                    n["metadata"]["retyped_from"] = old_id
                retype_map[old_id] = new_id

    # 2) Apply DROPS: remove from node list
    nodes = [n for n in nodes if n["id"] not in DROPS]

    # 3) Apply MERGES: remove merged-from nodes, retarget edges
    merged_ids = set(MERGES.keys())
    nodes = [n for n in nodes if n["id"] not in merged_ids]

    # 4) Apply RENAMES to surviving canonical nodes
    for n in nodes:
        if n["id"] in RENAMES:
            n["name"] = RENAMES[n["id"]]

    # 5) Edge rewrites: apply retype_map + MERGES to source_id/target_id; drop edges touching DROPS
    full_rewrite = {**retype_map, **MERGES}
    new_edges = []
    edge_keys_seen: set[tuple] = set()
    dropped_edges_because_node_dropped = 0
    rewritten_edges = 0
    for e in edges:
        s, t = e.get("source_id"), e.get("target_id")
        # Drop edges touching removed nodes
        if s in DROPS or t in DROPS:
            dropped_edges_because_node_dropped += 1
            continue
        new_s = full_rewrite.get(s, s)
        new_t = full_rewrite.get(t, t)
        if (new_s, new_t) != (s, t):
            rewritten_edges += 1
        et = e.get("edge_type") or ""
        # Rebuild edge id
        new_id = f"{new_s}--{et.lower()}--{new_t}"
        # Dedupe by (source, target, type)
        key = (new_s, new_t, et)
        if key in edge_keys_seen:
            continue
        edge_keys_seen.add(key)
        new_e = dict(e)
        new_e["source_id"] = new_s
        new_e["target_id"] = new_t
        new_e["id"] = new_id
        new_edges.append(new_e)

    # 6) Remove self-loops (if any)
    self_loops = sum(1 for e in new_edges if e["source_id"] == e["target_id"])
    new_edges = [e for e in new_edges if e["source_id"] != e["target_id"]]

    # Save
    (SEED / "nodes-final.json").write_text(json.dumps(nodes, indent=2, ensure_ascii=False))
    (SEED / "edges-final.json").write_text(json.dumps(new_edges, indent=2, ensure_ascii=False))

    # Report
    print(f"Nodes: {n_before} -> {len(nodes)} (Δ {len(nodes) - n_before})")
    print(f"Edges: {e_before} -> {len(new_edges)} (Δ {len(new_edges) - e_before})")
    print()
    print(f"Operations:")
    print(f"  Retypes:                  {len(RETYPES)} (platform/publication reassignments)")
    print(f"  Merges:                   {len(MERGES)} (duplicate institution collapses)")
    print(f"  Drops:                    {len(DROPS)} (fragment/non-venue nodes removed)")
    print(f"  Edges rewritten via retarget: {rewritten_edges}")
    print(f"  Edges dropped (touched DROPS):{dropped_edges_because_node_dropped}")
    print(f"  Self-loops removed:           {self_loops}")
    print()

    ntypes = Counter(n.get("type") for n in nodes)
    etypes = Counter(e.get("edge_type") for e in new_edges)
    print(f"Node types: {dict(ntypes)}")
    print(f"Edge types: {dict(etypes)}")

    # Verify specific collapses
    print()
    print("Verification of key collapses:")
    ids_present = {n["id"] for n in nodes}
    for old_id, new_id in list(MERGES.items())[:10]:
        assert old_id not in ids_present, f"leak: {old_id}"
        assert new_id in ids_present, f"missing target: {new_id}"
        # count edges to new_id
        n = sum(1 for e in new_edges if e.get("target_id") == new_id or e.get("source_id") == new_id)
        print(f"  {old_id:<60} -> {new_id} (now has {n} edges)")

    # Check Tate
    for tid in ["institution:tate modern", "institution:tate britain"]:
        assert tid not in ids_present, f"Tate leak: {tid}"
    tate_edges = sum(1 for e in new_edges if e.get("target_id") == "institution:tate")
    print(f"  Tate (merged from 3):                     -> institution:tate ({tate_edges} inbound)")

    # EXHIBITED_AT count
    exhib = sum(1 for e in new_edges if e.get("edge_type") == "EXHIBITED_AT")
    print(f"\nEXHIBITED_AT edges: {exhib}")


if __name__ == "__main__":
    main()
