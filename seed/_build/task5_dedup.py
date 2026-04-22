"""
Task 5: Deduplicate edges.

Rules:
  - Same (source_id, target_id, edge_type) = duplicate; keep first instance
  - Honour cross-type duplicates created by reclassification:
    e.g. if EXHIBITED_AT exists AND a legacy COLLABORATES_WITH still exists for the same pair,
    the EXHIBITED_AT wins (more specific) and the COLLABORATES_WITH is removed.

Reports known duplicate clusters from the spec (Tyler Hobbs, Hito Steyerl, etc.) and whether
they were caught.
"""
from __future__ import annotations
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "seed"


def main():
    edges = json.loads((SEED / "edges-final.json").read_text())

    # Phase 1: exact dedup by (source, target, type)
    seen_exact: dict[tuple, dict] = {}
    removed_exact = 0
    for e in edges:
        key = (e.get("source_id"), e.get("target_id"), e.get("edge_type"))
        if key in seen_exact:
            removed_exact += 1
            continue
        seen_exact[key] = e

    # Phase 2: cross-type suppression
    # For each (source, target), if both a reclassified type AND the generic COLLABORATES_WITH/RELATED_TO
    # exist, drop the generic.
    SPECIFIC_WINS_OVER_GENERIC = {
        "COLLABORATES_WITH": {"EXHIBITED_AT", "INFLUENCES", "BELONGS_TO"},
        "RELATED_TO": {"EXHIBITED_AT", "INFLUENCES", "BELONGS_TO",
                       "COLLABORATES_WITH", "EMBODIES", "USES_TECHNIQUE"},
    }

    # Build by (s,t) pairs with set of types
    pair_types: dict[tuple[str, str], set[str]] = defaultdict(set)
    for (s, t, etype), _ in seen_exact.items():
        pair_types[(s, t)].add(etype)

    cross_suppressed = 0
    after_cross: list[dict] = []
    for (s, t, etype), e in seen_exact.items():
        if etype in SPECIFIC_WINS_OVER_GENERIC:
            specific_present = SPECIFIC_WINS_OVER_GENERIC[etype] & pair_types[(s, t)]
            if specific_present:
                cross_suppressed += 1
                continue
        after_cross.append(e)

    # Phase 3: symmetric-edge dedup for COLLABORATES_WITH (A->B and B->A are the same fact).
    # Keep the lexicographically-lower source for deterministic canonical direction.
    SYMMETRIC_TYPES = {"COLLABORATES_WITH"}
    sym_seen: set[tuple] = set()
    final_edges: list[dict] = []
    symmetric_dedup = 0
    for e in after_cross:
        et = e.get("edge_type")
        s, t = e.get("source_id"), e.get("target_id")
        if et in SYMMETRIC_TYPES:
            pair = tuple(sorted([s, t]))
            key = (pair, et)
            if key in sym_seen:
                symmetric_dedup += 1
                continue
            sym_seen.add(key)
        final_edges.append(e)

    (SEED / "edges-final.json").write_text(json.dumps(final_edges, indent=2, ensure_ascii=False))

    # Known duplicate clusters from spec (for verification)
    spec_pairs = [
        ("practitioner:tyler hobbs", "practitioner:dmitri cherniak"),
        ("practitioner:tyler hobbs", "practitioner:matt deslauriers"),
        ("practitioner:tyler hobbs", "practitioner:snowfro"),
        ("practitioner:hito steyerl", "practitioner:k allado-mcdowell"),
        ("practitioner:hito steyerl", "practitioner:yuk hui"),
        ("practitioner:hito steyerl", "practitioner:trevor paglen"),
        ("practitioner:kim asendorf", "practitioner:xcopy"),
        ("practitioner:casey reas", "practitioner:ben fry"),
    ]
    print("Spec-listed known-duplicate pairs — edge counts after dedup:")
    for a, b in spec_pairs:
        cnt = sum(1 for e in final_edges
                   if ({e.get("source_id"), e.get("target_id")} == {a, b}))
        print(f"  {a.split(':', 1)[-1]:<25} <-> {b.split(':', 1)[-1]:<25}  {cnt} edge(s)")

    print()
    print(f"Exact duplicates removed:                 {removed_exact}")
    print(f"Cross-type suppressed (generic→specific): {cross_suppressed}")
    print(f"Symmetric COLLABORATES_WITH collapsed:     {symmetric_dedup}")
    print(f"Final edge total:                         {len(final_edges)}")

    etypes = Counter(e.get("edge_type") for e in final_edges)
    print(f"\nFinal edge types: {dict(etypes)}")

    report = {
        "task": "Task 5 — Deduplicate edges",
        "exact_duplicates_removed": removed_exact,
        "cross_type_suppressed": cross_suppressed,
        "symmetric_collaborates_with_collapsed": symmetric_dedup,
        "final_edge_count": len(final_edges),
        "final_edge_type_counts": dict(etypes),
    }
    (SEED / "_build" / "task5_report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
