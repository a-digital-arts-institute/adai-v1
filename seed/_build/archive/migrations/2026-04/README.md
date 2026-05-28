# 2026-04 migration scripts — frozen

One-shot scripts from the April 2026 enrichment / cleanup pass. They each
mutated `seed/*.json` directly. Kept for provenance only — **do not run.**

| Script | What it did |
|---|---|
| `task1_cleanup.py` + `task1_exhibited_at.py` | Profile normalisation + EXHIBITED_AT edge cleanup. |
| `task2_reclassify.py` | Reclassification of CLASSIFIED_BY edges. |
| `task3_embodies.py` | Bulk-emit EMBODIES (artwork → concept) edges. The primary contamination vector in the May 2026 audit. |
| `task4_belongs_to.py` | BELONGS_TO (practitioner → scene) edge emission. |
| `task5_dedup.py` | Node-deduplication pass. |
| `fold_merge_into_seed.py` + `fold_named_anchors_into_seed.py` | Hand-merge fetcher outputs into canon (replaced by the contract pipeline). |
| `apply_real_source_merge.py` + `extend_real_source_merge.py` + `prune_real_source_passes.py` | The "real source merge" series — multi-pass attempted re-attribution. |
| `apply_key_works.py` | Promoted artworks to "key work" status per practitioner. |
| `add_artblocks_drafts.py` | Bulk-add Art Blocks artwork drafts. |
| `build_seed.py` | Old orchestration that read from `/tmp/adai_work/results/`. Replaced by `npm run seed:consolidated` running directly on `seed/*.json`. |
| `build_trace.py` | Aggregated processing trace from the Task 0–5 pipeline. |
| `normalize.py` | "Task 0" profile normalisation pass. |
| `apply_bundle.mjs` + `apply_bundle.py` | Apply a `real_source_merge` bundle to a live CR-SQLite DB. Tied to `real_source_merge_2026-04-28.json` in `../runs/2026-04/`. |
| `CANON_EVALUATION.md` | Read-only practitioner audit from the April pass. |
| `deepening.json` | Editorial content for 71 practitioners — the "deepening" enrichment dataset. The named contamination source. |
| `key_works_promotions.json` | Source data for `apply_key_works.py`. |
| `paul_diff.json` + `paul_digital_art_index.json` | Editorial pass tied to a specific contributor. Kept under attribution. |
| `new_entries.json` | Staged new-entry data from the April pass. |

The canon shipped before the rebuild contained rows emitted by these scripts.
The rebuild starts from a clean canon and re-derives everything from live
upstreams against `../../../PRODUCER_CONTRACT.md`.
