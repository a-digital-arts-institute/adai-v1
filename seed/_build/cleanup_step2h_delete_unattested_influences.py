"""Cleanup step 2h: delete the 3 gatherer-emitted INFLUENCES edges that lack attestation.

Both SKILL.md and CLAUDE.md state: "The pipeline refuses to auto-emit INFLUENCES
or RESPONDS_TO — semantic similarity is the wrong signal for either, by design."

The gatherer-enrichment pass emitted these three INFLUENCES edges before the
refusal guard existed:

  - Sol LeWitt → Casey Reas
  - Gilbert Simondon → Yuk Hui
  - Augusto de Campos → Waldemar Cordeiro

All three are plausible art-historical lineages — exactly the trap the rule
exists to catch. Plausibility ≠ attestation. They were also flagged in
docs/ENRICHMENT_AUDIT_2026_05_20.md Finding 2.

Practitioner contributions at Basel (or later) can re-add these with proper
attestation if the lineages are real. Until then, INFLUENCES remains at 1
edge (Bernard Stiegler → Yuk Hui, contributor:migration — manual, attested).

Usage:
  seed/_build/.venv/bin/python3 seed/_build/cleanup_step2h_delete_unattested_influences.py            # dry-run
  seed/_build/.venv/bin/python3 seed/_build/cleanup_step2h_delete_unattested_influences.py --apply    # write
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
EDGES_PATH = REPO_ROOT / "seed" / "edges.json"
NODES_PATH = REPO_ROOT / "seed" / "nodes.json"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    nodes = {n["id"]: n for n in json.loads(NODES_PATH.read_text())}
    edges = json.loads(EDGES_PATH.read_text())

    targets = [
        e for e in edges
        if e["edge_type"] == "INFLUENCES" and e["created_by"].startswith("gatherer-")
    ]

    print(f"=== Cleanup step 2h — {'APPLY' if args.apply else 'DRY-RUN'} ===")
    print(f"Edges to delete: {len(targets)}")
    for e in targets:
        sname = nodes.get(e["source_id"], {}).get("name", e["source_id"])
        tname = nodes.get(e["target_id"], {}).get("name", e["target_id"])
        print(f"  {sname!r} → {tname!r}  [created_by: {e['created_by']}]")
    print()

    if not args.apply:
        print("Dry-run complete. Re-run with --apply to write changes.")
        return 0

    target_ids = {e["id"] for e in targets}
    new_edges = [e for e in edges if e.get("id") not in target_ids]
    if len(edges) - len(new_edges) != len(targets):
        print("ERROR: count mismatch on delete. Aborting.", file=sys.stderr)
        return 1
    EDGES_PATH.write_text(json.dumps(new_edges, indent=2, ensure_ascii=False))
    print(f"Wrote {EDGES_PATH} ({len(targets)} edges deleted).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
