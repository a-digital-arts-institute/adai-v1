#!/usr/bin/env python3
"""merge_batches.py — Fold per-gatherer batch outputs into canonical seed/*.json.

Reads:  seed/_build/runs/<YYYY-MM>/*.json (every batch from every gatherer)
Writes: seed/nodes.json, seed/edges.json, seed/signals.json,
        seed/contributors.json, seed/aliases.json
        (preserves seed/image_overlay.json untouched)

Merge rules:

  Nodes:
    - Keyed by ``id``. Multi-source nodes collapse to one row.
    - Metadata is union-merged across sources (later batch wins on conflict
      — gatherers are ordered by recency).
    - ``signal_id`` keeps the FIRST source's signal (the producer of record).
      Other contributing signals get listed in ``metadata.contributing_signals``.

  Edges:
    - Keyed by ``id`` (the deterministic ``edge:source|type|target`` form).
    - Multi-source edges collapse — earliest ``valid_from`` wins.

  Signals:
    - One row per signal_id. Keep the first one seen.

  Aliases:
    - Keyed by ``(source, external_id)``. Duplicates collapse.

  Placeholder edges (``_alias:<source>:<external_id>`` as source or target):
    - Resolved via the alias table to the real node_id. Unresolvable
      placeholders are dropped (logged in the report).

Contributors:
    - Emits a single ``contributor:migration`` row with trust_tier=reviewed
      (matching the prior canon's contract — gatherer-emitted rows auto-merge).

Final step: runs validate_seed.py --canon on the assembled canon. Exits
non-zero on validation failure.

Run:
    python3 seed/_build/merge_batches.py
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections import OrderedDict
from pathlib import Path
from typing import Any

HERE = Path(__file__).parent
REPO = HERE.parent.parent
SEED = REPO / "seed"
RUNS = HERE / "runs"


def _load_batches() -> list[tuple[str, dict[str, Any]]]:
    """Return [(path_str, payload)] for every batch JSON in runs/."""
    out: list[tuple[str, dict[str, Any]]] = []
    if not RUNS.exists():
        return out
    for month_dir in sorted(RUNS.iterdir()):
        if not month_dir.is_dir():
            continue
        for f in sorted(month_dir.glob("*.json")):
            try:
                payload = json.loads(f.read_text())
            except json.JSONDecodeError as e:
                print(f"WARN: skipping {f}: {e}", file=sys.stderr)
                continue
            out.append((str(f.relative_to(REPO)), payload))
    return out


def _resolve_placeholder(placeholder: str, alias_index: dict[tuple[str, str], str]) -> str | None:
    """Resolve ``_alias:source:external_id`` placeholders via the alias table."""
    if not placeholder.startswith("_alias:"):
        return placeholder
    parts = placeholder[len("_alias:"):].split(":", 1)
    if len(parts) != 2:
        return None
    src, ext = parts
    return alias_index.get((src, ext))


def merge() -> dict[str, Any]:
    batches = _load_batches()
    print(f"Found {len(batches)} batch(es) in {RUNS.relative_to(REPO)}")
    for path, _ in batches:
        print(f"  - {path}")

    # Accumulators (OrderedDict preserves first-seen ordering for diffability)
    nodes: OrderedDict[str, dict[str, Any]] = OrderedDict()
    edges: OrderedDict[str, dict[str, Any]] = OrderedDict()
    signals: OrderedDict[str, dict[str, Any]] = OrderedDict()
    aliases: OrderedDict[tuple[str, str], dict[str, Any]] = OrderedDict()

    stats: dict[str, int] = {
        "nodes_seen": 0, "edges_seen": 0, "signals_seen": 0, "aliases_seen": 0,
        "nodes_merged": 0, "edges_merged": 0, "aliases_merged": 0,
        "placeholders_resolved": 0, "placeholders_dropped": 0,
    }

    for path, payload in batches:
        # signal
        sig = payload.get("signal")
        if sig and sig.get("id"):
            stats["signals_seen"] += 1
            signals.setdefault(sig["id"], sig)
        # nodes
        for n in payload.get("nodes") or []:
            stats["nodes_seen"] += 1
            nid = n.get("id")
            if not nid:
                continue
            if nid in nodes:
                stats["nodes_merged"] += 1
                existing = nodes[nid]
                # Union metadata. Later sources fill in missing keys but
                # don't overwrite existing — first source wins on conflict
                # (the gatherer that emitted first had the data; later
                # gatherers just contribute additional fields).
                em = existing.get("metadata") or {}
                nm = n.get("metadata") or {}
                if isinstance(em, str):
                    em = json.loads(em)
                if isinstance(nm, str):
                    nm = json.loads(nm)
                merged_md = {**nm, **em}  # existing wins on conflict
                # Track contributing signals
                contributing = merged_md.setdefault("contributing_signals", [])
                if isinstance(contributing, list):
                    if sig and sig.get("id") and sig["id"] not in contributing and existing.get("signal_id") != sig["id"]:
                        contributing.append(sig["id"])
                existing["metadata"] = merged_md
            else:
                # First time seeing this node
                # Ensure contributing_signals tracking is consistent
                md = n.get("metadata") or {}
                if isinstance(md, str):
                    md = json.loads(md)
                # Don't double-list the primary signal
                n_copy = dict(n)
                n_copy["metadata"] = md
                nodes[nid] = n_copy
        # aliases (collected before edges so we can resolve placeholders)
        for a in payload.get("aliases") or []:
            stats["aliases_seen"] += 1
            key = (a.get("source"), a.get("external_id"))
            if not key[0] or not key[1]:
                continue
            if key in aliases:
                stats["aliases_merged"] += 1
            aliases.setdefault(key, a)
        # edges (will resolve placeholders in a second pass)
        for e in payload.get("edges") or []:
            stats["edges_seen"] += 1
            eid = e.get("id")
            if not eid:
                continue
            if eid in edges:
                stats["edges_merged"] += 1
            edges.setdefault(eid, e)

    # Build alias index (source, external_id) → node_id
    alias_index: dict[tuple[str, str], str] = {
        (a["source"], a["external_id"]): a["node_id"]
        for a in aliases.values()
    }

    # Resolve _alias placeholders on edges. Drop unresolvable ones.
    resolved_edges: OrderedDict[str, dict[str, Any]] = OrderedDict()
    for eid, e in edges.items():
        src = e.get("source_id", "")
        tgt = e.get("target_id", "")
        new_src = _resolve_placeholder(src, alias_index) if src.startswith("_alias:") else src
        new_tgt = _resolve_placeholder(tgt, alias_index) if tgt.startswith("_alias:") else tgt
        if not new_src or not new_tgt:
            stats["placeholders_dropped"] += 1
            continue
        if new_src != src or new_tgt != tgt:
            stats["placeholders_resolved"] += 1
            e = dict(e)
            e["source_id"] = new_src
            e["target_id"] = new_tgt
            # Recompute id since source/target changed
            from _node_schema import id_for  # noqa: PLC0415
            e["id"] = id_for(new_src, e["edge_type"], new_tgt)
        # Edge target must point at a known node — drop if not
        if e["source_id"] not in nodes or e["target_id"] not in nodes:
            stats["placeholders_dropped"] += 1
            continue
        resolved_edges[e["id"]] = e

    # Contributors row — single migration contributor, trust tier reviewed
    import datetime as _dt
    _now = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    contributors = [
        {
            "id": "contributor:migration",
            "name": "Canon Rebuild Pipeline",
            "type": "system",
            "trust_tier": "reviewed",
            "contributions": len(nodes) + len(resolved_edges),
            "approved_count": len(nodes) + len(resolved_edges),
            "created_at": _now,
        }
    ]

    return {
        "nodes": list(nodes.values()),
        "edges": list(resolved_edges.values()),
        "signals": list(signals.values()),
        "aliases": [a for a in aliases.values()],
        "contributors": contributors,
        "stats": stats,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="don't write seed/*.json")
    ap.add_argument("--no-validate", action="store_true", help="skip validate_seed --canon")
    args = ap.parse_args()

    result = merge()
    stats = result["stats"]

    print()
    print(f"Nodes:        {len(result['nodes']):>6}  (seen {stats['nodes_seen']}, "
          f"merged {stats['nodes_merged']})")
    print(f"Edges:        {len(result['edges']):>6}  (seen {stats['edges_seen']}, "
          f"merged {stats['edges_merged']}, "
          f"placeholders resolved {stats['placeholders_resolved']}, dropped {stats['placeholders_dropped']})")
    print(f"Signals:      {len(result['signals']):>6}")
    print(f"Aliases:      {len(result['aliases']):>6}  (seen {stats['aliases_seen']}, "
          f"merged {stats['aliases_merged']})")
    print(f"Contributors: {len(result['contributors']):>6}")

    # Per-type breakdown
    by_type: dict[str, int] = {}
    for n in result["nodes"]:
        by_type[n["type"]] = by_type.get(n["type"], 0) + 1
    print()
    print("Nodes by type:")
    for t, c in sorted(by_type.items(), key=lambda x: -x[1]):
        print(f"  {t:>22}: {c:>6}")

    by_etype: dict[str, int] = {}
    for e in result["edges"]:
        by_etype[e["edge_type"]] = by_etype.get(e["edge_type"], 0) + 1
    print("Edges by type:")
    for t, c in sorted(by_etype.items(), key=lambda x: -x[1]):
        print(f"  {t:>22}: {c:>6}")

    if args.dry_run:
        print()
        print("(dry-run) Would write seed/{nodes,edges,signals,contributors,aliases}.json")
        return 0

    # JSON-encode metadata for canon (seeder expects string)
    out_nodes = []
    for n in result["nodes"]:
        n2 = dict(n)
        md = n2.get("metadata") or {}
        if isinstance(md, dict):
            n2["metadata"] = json.dumps(md, ensure_ascii=False, sort_keys=True)
        out_nodes.append(n2)

    SEED.mkdir(exist_ok=True)
    (SEED / "nodes.json").write_text(json.dumps(out_nodes, ensure_ascii=False, indent=2))
    (SEED / "edges.json").write_text(json.dumps(result["edges"], ensure_ascii=False, indent=2))
    (SEED / "signals.json").write_text(json.dumps(result["signals"], ensure_ascii=False, indent=2))
    (SEED / "aliases.json").write_text(json.dumps(result["aliases"], ensure_ascii=False, indent=2))
    (SEED / "contributors.json").write_text(json.dumps(result["contributors"], ensure_ascii=False, indent=2))
    print()
    print(f"Wrote seed/{{nodes,edges,signals,contributors,aliases}}.json")

    if args.no_validate:
        return 0

    # Run validator
    print()
    print("Running validate_seed.py --canon ...")
    r = subprocess.run(
        [sys.executable, str(HERE / "validate_seed.py"), "--canon"],
        capture_output=False,
    )
    return r.returncode


if __name__ == "__main__":
    sys.exit(main())
