#!/usr/bin/env python3
"""
apply_real_source_merge.py — produce a single merge-ready JSON that swaps
heuristic EMBODIES for source-attested ones and adds new artworks.

Reads the four pruned real-source pass outputs:
  - moma_digital_2026-04-28.pruned.json
  - fxhash_tags_2026-04-28.pruned.json
  - wikidata_artworks_2026-04-28b.pruned.json
  - objkt_tags_2026-04-28.pruned.json

Reads adai.db to identify the heuristic EMBODIES edges scheduled for
deletion (per editorial:heuristic-embodies-scaffolding policy: scaffolding
goes away on the editorial decision date).

Outputs:
  - real_source_merge_2026-04-28.json — the merge bundle Gio applies on deploy
  - real_source_merge_2026-04-28.summary.md — human-readable change summary

Bundle structure:
  {
    "signal_id": "real-source-merge-2026-04-28",
    "decisions": ["editorial:heuristic-embodies-scaffolding"],
    "delete": {
      "edges": [...]          # heuristic EMBODIES to remove
    },
    "insert": {
      "nodes": [...],         # new artworks + new concepts (deduped)
      "edges": [...]          # source-attested edges (deduped)
    },
    "stats": {...}
  }

This script is dry-run; it does NOT mutate adai.db. Gio applies the bundle on
deploy via seed-consolidated.ts (or a separate apply step against the Fly
volume). The bundle is idempotent: re-applying produces the same end state.
"""
from __future__ import annotations
import json, sqlite3
from collections import Counter
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
DB = ROOT / "adai.db"
OUT = HERE / "real_source_merge_2026-04-28.json"
SUMMARY = HERE / "real_source_merge_2026-04-28.summary.md"

PRUNED_FILES = [
    HERE / "moma_digital_2026-04-28.pruned.json",
    HERE / "fxhash_tags_2026-04-28.pruned.json",
    HERE / "wikidata_artworks_2026-04-28b.pruned.json",
    HERE / "objkt_tags_2026-04-28.pruned.json",
]

SIGNAL_ID = "real-source-merge-2026-04-28"
EDITORIAL_DECISION = "editorial:heuristic-embodies-scaffolding"
HEURISTIC_EVIDENCE = "Task 3 heuristic (artwork description keyword match against theme vocabulary)"

def main():
    # Load and merge all four pruned passes
    all_nodes = {}
    all_edges = {}
    per_source_stats = {}

    for path in PRUNED_FILES:
        if not path.exists():
            print(f"  ! missing: {path.name}")
            continue
        d = json.loads(path.read_text())
        label = d.get("signal_id", path.stem)
        per_source_stats[label] = {
            "nodes": len(d.get("nodes", [])),
            "edges": len(d.get("edges", [])),
        }
        for n in d.get("nodes", []):
            existing = all_nodes.get(n["id"])
            if existing and existing.get("type") == "concept" and n.get("type") == "concept":
                continue  # dedupe concepts across passes
            if existing and n.get("type") == "artwork":
                continue
            all_nodes[n["id"]] = n
        for e in d.get("edges", []):
            all_edges[e["id"]] = e

    # Load heuristic EMBODIES from seed/edges.json (or .bak fallback) — these
    # get deleted. The live db doesn't keep source_evidence; the canonical source
    # is the seed JSON, which preserves the heuristic vs. hand-assignment mark.
    heuristic_edges = []
    seed_edges_path = ROOT / "seed" / "edges.json"
    if not seed_edges_path.exists():
        seed_edges_path = ROOT / "seed" / "edges.json.bak"
    if seed_edges_path.exists():
        for e in json.loads(seed_edges_path.read_text()):
            if e.get("edge_type") == "EMBODIES" and e.get("source_evidence") == HEURISTIC_EVIDENCE:
                heuristic_edges.append({
                    "id": e["id"],
                    "source_id": e["source_id"],
                    "target_id": e["target_id"],
                    "edge_type": e["edge_type"],
                    "confidence": e.get("confidence"),
                    "signal_id": e.get("signal_id"),
                    "source_evidence": e["source_evidence"],
                    "deletion_reason": "Heuristic scaffolding superseded by real-source ingestion (per editorial:heuristic-embodies-scaffolding, 2026-04-28)",
                })

    # Build the merge bundle
    insert_nodes = list(all_nodes.values())
    insert_edges = list(all_edges.values())

    artwork_count   = sum(1 for n in insert_nodes if n.get("type") == "artwork")
    concept_count   = sum(1 for n in insert_nodes if n.get("type") == "concept")
    embodies_count  = sum(1 for e in insert_edges if e.get("edge_type") == "EMBODIES")
    created_count   = sum(1 for e in insert_edges if e.get("edge_type") == "CREATED_BY")
    technique_count = sum(1 for e in insert_edges if e.get("edge_type") == "USES_TECHNIQUE")
    exhibited_count = sum(1 for e in insert_edges if e.get("edge_type") == "EXHIBITED_AT")
    belongs_count   = sum(1 for e in insert_edges if e.get("edge_type") == "BELONGS_TO")
    img_count       = sum(1 for n in insert_nodes
                          if n.get("type") == "artwork"
                          and (n.get("metadata") or {}).get("image_url"))

    bundle = {
        "signal_id": SIGNAL_ID,
        "generated_at": "2026-04-28T00:00:00Z",
        "decisions": [EDITORIAL_DECISION],
        "method_note": (
            "Single merge bundle combining MoMA digital v3, fxhash tags v3, "
            "Wikidata SPARQL v3b, and objkt tags v3 — pruned for tag noise, "
            "false matches, marketing-hashtag canonicalisation, and self-refs. "
            "Deletes the 564 heuristic-keyword EMBODIES from the live db "
            "(scaffolding from April 22 enrichment pass) per editorial decision. "
            "Inserts source-attested replacements, new artworks with images, "
            "new concept nodes from artist tags + Wikidata depicts/genre. "
            "Idempotent — safe to reapply."
        ),
        "delete": {
            "edges": heuristic_edges,
        },
        "insert": {
            "nodes": insert_nodes,
            "edges": insert_edges,
        },
        "stats": {
            "delete_heuristic_embodies": len(heuristic_edges),
            "insert_artworks": artwork_count,
            "insert_artworks_with_images": img_count,
            "insert_concepts": concept_count,
            "insert_embodies": embodies_count,
            "insert_created_by": created_count,
            "insert_uses_technique": technique_count,
            "insert_exhibited_at": exhibited_count,
            "insert_belongs_to": belongs_count,
            "insert_total_edges": len(insert_edges),
            "per_source": per_source_stats,
        },
    }
    OUT.write_text(json.dumps(bundle, indent=2, ensure_ascii=False))

    # Human-readable summary
    s = bundle["stats"]
    summary = f"""# Real-source merge — 2026-04-28

Generated by `seed/_build/apply_real_source_merge.py`. Bundle file:
`real_source_merge_2026-04-28.json`. Idempotent.

## What this bundle changes

### Delete
- **{s['delete_heuristic_embodies']}** heuristic-keyword EMBODIES edges
  (the April 22 enrichment scaffolding, `confidence: medium`, all carrying
  `source_evidence = "{HEURISTIC_EVIDENCE}"`).
  Rationale: editorial decision `{EDITORIAL_DECISION}` — scaffolding goes away
  once real-source ingestion provides replacements.

### Insert
- **{s['insert_artworks']} new artwork nodes** ({s['insert_artworks_with_images']} with image URLs)
- **{s['insert_concepts']} new concept nodes** (from Wikidata depicts/genre + artist tags)
- **{s['insert_embodies']} EMBODIES edges** — all `confidence: high`,
  mostly `source_origin: human_primary` (artist-set tags) or `human_secondary`
  (Wikidata depicts/genre)
- **{s['insert_created_by']} CREATED_BY edges** (high confidence, source-attested)
- **{s['insert_uses_technique']} USES_TECHNIQUE edges**
- **{s['insert_exhibited_at']} EXHIBITED_AT edges**
- **{s['insert_belongs_to']} BELONGS_TO edges** (practitioner → scene)
- **Total: {s['insert_total_edges']} new edges**

## Per-source contributions

"""
    for label, stats in per_source_stats.items():
        summary += f"- `{label}`: {stats['nodes']} nodes, {stats['edges']} edges\n"
    summary += f"""
## Net effect on the graph

| Layer | Before | After |
|---|---|---|
| EMBODIES (heuristic, `confidence: medium`) | 564 | 0 |
| EMBODIES (source-attested, `confidence: high`) | 57 (hand-assigned) | {57 + s['insert_embodies']} |
| Artworks with image URLs | 94 | {94 + s['insert_artworks_with_images']} |

## Apply

Per the live-db deploy mechanism: pass this bundle through seed-consolidated.ts
or a one-off apply script that runs `DELETE FROM edges WHERE id IN (delete.edges[*].id)`
and `INSERT OR REPLACE INTO nodes/edges (...)` for everything in `insert`.

Re-runnable: applying twice is idempotent (delete is by id, insert uses
INSERT OR REPLACE).
"""
    SUMMARY.write_text(summary)

    # Console output
    print(f"\nWrote {OUT.name}")
    print(f"Wrote {SUMMARY.name}")
    print(f"\nMerge bundle stats:")
    print(f"  delete heuristic EMBODIES: {s['delete_heuristic_embodies']}")
    print(f"  insert artworks:           {s['insert_artworks']} ({s['insert_artworks_with_images']} with images)")
    print(f"  insert concepts:           {s['insert_concepts']}")
    print(f"  insert edges:              {s['insert_total_edges']}")
    print(f"    EMBODIES:                {s['insert_embodies']}")
    print(f"    CREATED_BY:              {s['insert_created_by']}")
    print(f"    USES_TECHNIQUE:          {s['insert_uses_technique']}")
    print(f"    EXHIBITED_AT:            {s['insert_exhibited_at']}")
    print(f"    BELONGS_TO:              {s['insert_belongs_to']}")

if __name__ == "__main__":
    main()
