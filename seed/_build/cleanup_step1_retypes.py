"""Cleanup step 1: re-type edges whose edge_type doesn't match SKILL.md.

Two operations:
  1. USES_TECHNIQUE edges where (source is artwork AND target is concept) → EMBODIES.
     SKILL.md says USES_TECHNIQUE is practitioner-level; the audit found 102
     artwork-level edges that are structurally EMBODIES.
  2. CREATED_BY edges where target is platform OR institution → EXHIBITED_AT.
     SKILL.md says CREATED_BY targets are practitioner; the audit found 27 edges
     with platform/institution targets that are structurally EXHIBITED_AT
     (artwork → platform/institution conforms to SKILL.md's EXHIBITED_AT line).

Other non-conformers (CREATED_BY → collective/project/publication/artwork targets,
PRACTICES non-practitioner sources, EXHIBITED_AT practitioner sources, BELONGS_TO
collective sources) are out of scope for this step — they need either a more
specific re-type or a move to node metadata, and are handled in later steps.

Usage:
  seed/_build/.venv/bin/python3 seed/_build/cleanup_step1_retypes.py            # dry-run
  seed/_build/.venv/bin/python3 seed/_build/cleanup_step1_retypes.py --apply    # write
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys
from collections import Counter

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
EDGES_PATH = REPO_ROOT / "seed" / "edges.json"
NODES_PATH = REPO_ROOT / "seed" / "nodes.json"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true",
                        help="Write changes to seed/edges.json. Without this flag, dry-run only.")
    args = parser.parse_args()

    nodes = {n["id"]: n for n in json.loads(NODES_PATH.read_text())}
    edges = json.loads(EDGES_PATH.read_text())

    def ntype(nid: str) -> str:
        return nodes.get(nid, {}).get("type", "?")

    def nname(nid: str) -> str:
        return nodes.get(nid, {}).get("name", nid)

    changes: list[dict] = []

    # Operation 1: USES_TECHNIQUE artwork→concept → EMBODIES
    for e in edges:
        if (e["edge_type"] == "USES_TECHNIQUE"
                and ntype(e["source_id"]) == "artwork"
                and ntype(e["target_id"]) == "concept"):
            changes.append({
                "id": e.get("id"),
                "from_type": "USES_TECHNIQUE",
                "to_type": "EMBODIES",
                "source_name": nname(e["source_id"]),
                "target_name": nname(e["target_id"]),
                "created_by": e["created_by"],
                "rule": "op1_uses_technique_to_embodies",
            })

    # Operation 2: CREATED_BY artwork→(platform|institution) → EXHIBITED_AT
    for e in edges:
        if (e["edge_type"] == "CREATED_BY"
                and ntype(e["source_id"]) == "artwork"
                and ntype(e["target_id"]) in ("platform", "institution")):
            changes.append({
                "id": e.get("id"),
                "from_type": "CREATED_BY",
                "to_type": "EXHIBITED_AT",
                "source_name": nname(e["source_id"]),
                "target_name": nname(e["target_id"]),
                "target_type": ntype(e["target_id"]),
                "created_by": e["created_by"],
                "rule": "op2_created_by_to_exhibited_at",
            })

    # Print summary
    by_rule = Counter(c["rule"] for c in changes)
    print(f"=== Cleanup step 1 — {'APPLY' if args.apply else 'DRY-RUN'} ===")
    print(f"Total edges affected: {len(changes)}")
    for rule, count in sorted(by_rule.items()):
        print(f"  {rule}: {count}")
    print()

    # Print samples per rule
    for rule in sorted(by_rule):
        samples = [c for c in changes if c["rule"] == rule][:5]
        print(f"--- {rule} (showing first 5 of {by_rule[rule]}) ---")
        for c in samples:
            tt = c.get("target_type", "")
            tt_str = f" ({tt})" if tt else ""
            print(f"  {c['source_name']!r:50s}  {c['from_type']:18s} → {c['to_type']:14s}  {c['target_name']!r}{tt_str}")
        print()

    # Apply if requested
    if args.apply:
        # Build a lookup from edge id → planned change
        change_by_id = {c["id"]: c for c in changes if c["id"]}
        applied = 0
        for e in edges:
            if e.get("id") in change_by_id:
                c = change_by_id[e["id"]]
                # Sanity assert: we are about to change the type we expected
                if e["edge_type"] != c["from_type"]:
                    print(f"ERROR: edge {e['id']} has type {e['edge_type']!r}, "
                          f"expected {c['from_type']!r}. Aborting.", file=sys.stderr)
                    return 1
                e["edge_type"] = c["to_type"]
                applied += 1
        if applied != len(changes):
            print(f"ERROR: applied {applied} but planned {len(changes)}. Aborting.",
                  file=sys.stderr)
            return 1
        EDGES_PATH.write_text(json.dumps(edges, indent=2, ensure_ascii=False))
        print(f"Wrote {EDGES_PATH} with {applied} edge re-types.")
    else:
        print("Dry-run complete. Re-run with --apply to write changes.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
