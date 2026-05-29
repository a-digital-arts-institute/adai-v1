#!/usr/bin/env python3
"""cull_digital_art.py — deterministic digital-art cull over the clean sweep.

The source-attested sweep (MoMA + Wikidata + Art Blocks + fxhash) is
poison-free but noisy: MoMA's broad classification filter (Installation /
Performance / Film) swept in sculptors, filmmakers, and performance artists
who aren't digital artists. This producer culls to digital-art-only using
ONLY the structured tags the sources already provide — no LLM, no judgment,
no per-row review. One rule, reproducible.

KEEP a practitioner iff EITHER:
  - platform-native: carries `artblocks_artist_name` or `fxhash_user_id`
    (Art Blocks / fxhash are generative-art platforms — digital by definition); OR
  - Wikidata digital-art tag: carries `movement_qids` or `occupation_qids`
    (the Wikidata gatherer only returns people tagged with a digital-art
    occupation/movement QID, so presence of these = Wikidata says digital).

DROP a practitioner that is MoMA-only with no QID — got in purely via MoMA's
loose classification net, nothing corroborates them as digital.

CASCADE:
  - artwork kept iff it has a CREATED_BY edge to a surviving practitioner
  - edge kept iff BOTH endpoints survive
  - alias kept iff its node survives
  - concepts / classification_regimes / platforms / institutions: kept
    (vocabulary + structure, not the noise)

A dropped practitioner re-enters the moment a QID or a contributor vouches
for them — bounded and recoverable, never silent fabrication.

Run:
    python3 seed/_build/cull_digital_art.py --src /tmp/sweep60k --out seed
"""
from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any


def _md(n: dict[str, Any]) -> dict[str, Any]:
    m = n.get("metadata")
    if isinstance(m, str):
        try:
            return json.loads(m)
        except json.JSONDecodeError:
            return {}
    return m or {}


def _keep_practitioner(p: dict[str, Any]) -> bool:
    m = _md(p)
    platform_native = bool(m.get("artblocks_artist_name") or m.get("fxhash_user_id"))
    wikidata_digital = bool(m.get("movement_qids") or m.get("occupation_qids"))
    return platform_native or wikidata_digital


# Node types kept wholesale (vocabulary + structure, not practitioner noise).
KEEP_TYPES_WHOLESALE = {"concept", "classification_regime", "platform", "institution"}


def _compact(rows: list[dict[str, Any]]) -> str:
    if not rows:
        return "[]\n"
    return "[\n" + ",\n".join("  " + json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in rows) + "\n]\n"


def cull(src: Path) -> dict[str, Any]:
    nodes = json.loads((src / "nodes.json").read_text())
    edges = json.loads((src / "edges.json").read_text())
    signals = json.loads((src / "signals.json").read_text())
    contribs = json.loads((src / "contributors.json").read_text())
    aliases = json.loads((src / "aliases.json").read_text())

    before_nodes = Counter(n["type"] for n in nodes)

    # 1. survivors among practitioners
    kept_practitioners = {p["id"] for p in nodes if p["type"] == "practitioner" and _keep_practitioner(p)}

    # 2. artworks cascade: keep iff a CREATED_BY edge points to a surviving practitioner
    artwork_creator_ok: set[str] = set()
    for e in edges:
        if e["edge_type"] == "CREATED_BY" and e["target_id"] in kept_practitioners:
            artwork_creator_ok.add(e["source_id"])

    # 3. decide each node
    keep_ids: set[str] = set()
    for n in nodes:
        t = n["type"]
        if t == "practitioner":
            if n["id"] in kept_practitioners:
                keep_ids.add(n["id"])
        elif t == "artwork":
            if n["id"] in artwork_creator_ok:
                keep_ids.add(n["id"])
        elif t in KEEP_TYPES_WHOLESALE:
            keep_ids.add(n["id"])
        # other reserved types (scene/collective/etc): none in the sweep; drop if any

    out_nodes = [n for n in nodes if n["id"] in keep_ids]
    out_edges = [e for e in edges if e["source_id"] in keep_ids and e["target_id"] in keep_ids]
    out_aliases = [a for a in aliases if a["node_id"] in keep_ids]
    # signals + contributors: keep all (provenance history; orphans are harmless)

    after_nodes = Counter(n["type"] for n in out_nodes)
    return {
        "nodes": out_nodes, "edges": out_edges, "signals": signals,
        "contributors": contribs, "aliases": out_aliases,
        "_before_nodes": before_nodes, "_after_nodes": after_nodes,
        "_before_edges": len(edges), "_after_edges": len(out_edges),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    r = cull(args.src)
    print("=== CULL: digital-art-only (deterministic, source-tag rule) ===")
    print(f"{'type':<22} {'before':>8} {'after':>8}")
    for t in sorted(set(r["_before_nodes"]) | set(r["_after_nodes"])):
        print(f"{t:<22} {r['_before_nodes'].get(t,0):>8} {r['_after_nodes'].get(t,0):>8}")
    print(f"{'TOTAL nodes':<22} {sum(r['_before_nodes'].values()):>8} {sum(r['_after_nodes'].values()):>8}")
    print(f"{'edges':<22} {r['_before_edges']:>8} {r['_after_edges']:>8}")

    if args.dry_run:
        print("\n(dry-run) nothing written.")
        return 0

    args.out.mkdir(parents=True, exist_ok=True)
    for name in ("nodes", "edges", "signals", "contributors", "aliases"):
        (args.out / f"{name}.json").write_text(_compact(r[name]))
    print(f"\nwrote culled canon → {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
