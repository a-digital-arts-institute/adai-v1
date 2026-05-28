# seed/_build/ — offline data pipeline

Tooling, not canonical data. The canonical data is in `seed/*.json` (the
seeder reads it; the Docker builder bakes it into `seed.db`).

**If you're new here, read [`PRODUCER_CONTRACT.md`](PRODUCER_CONTRACT.md)
first.** It's the load-bearing one — every gatherer must conform to it.
This file is just a map of what's where.

## The pipeline

```
gatherer ── writes ──→ runs/<YYYY-MM>/<source>-<ts>.json
                            ↓
                        merge (Phase 2.5)
                            ↓
                seed/{nodes,edges,signals,contributors,aliases}.json
                            ↓
              source-derived curation (Phase 3)
                            ↓
                  embed pipeline + image overlay
                            ↓
                npm run seed:consolidated  →  adai.db / seed.db
```

## Shared infrastructure

| File | What it does |
|---|---|
| [`PRODUCER_CONTRACT.md`](PRODUCER_CONTRACT.md) | What every gatherer must do — read first. |
| [`_http.py`](_http.py) | Shared HTTP with retry + per-host throttling + descriptive UA. Stdlib only. |
| [`_provenance.py`](_provenance.py) | `GathererSignal` — one signal per run, stamps every emitted row. Stdlib only. |
| [`_node_schema.py`](_node_schema.py) | `Node`/`Edge`/`Alias` dataclasses with per-row `validate()` + the anti-enrichment rule. Stdlib only. |
| [`_slug.py`](_slug.py) | `node_id` / `node_slug` / `artwork_slug` — shared, with generic-title disambiguation. Stdlib only. |
| [`validate_seed.py`](validate_seed.py) | `--canon` validates `seed/*.json`; `--batch <path>` validates one gatherer's output. Runs in CI. |

## Live producers

| Gatherer | Source | Status |
|---|---|---|
| `fetch_moma_digital_v3.py` | MoMA digital collection | Will be rewritten to contract (Task #12). |
| `fetch_wikidata_v3.py` + `_v3b.py` + `_named_anchors.py` | Wikidata SPARQL | Will be unified into `fetch_wikidata.py` (Task #13). |
| `fetch_fxhash.py` + `fetch_fxhash_tags_v3.py` | fxhash GraphQL | Will be unified into `fetch_fxhash.py` (Task #14). |
| `fetch_objkt_tags_v3.py` | objkt GraphQL | Will be rewritten (Task #15). |
| `fetch_artblocks.py` | Art Blocks Hasura | Will be rewritten (Task #16). |
| `fetch_met_openaccess.py` | Met OpenAccess API | Will be rewritten (Task #17). |

| Image stack | What it does |
|---|---|
| `apply_image_patches.py` | Merges per-fetcher image patches into `seed/nodes.json`. |
| `image_patches/` | Output directory for per-fetcher image patches. |
| `image_fetch.py` | Image fetcher + Pillow normaliser. Used by `embed_nodes.py`. |
| `sanitize_images.py` | HEAD-checks every `image_url` / `cdn_image_url` in canon. Diagnoses rot. |
| `find_missing_images.py` | Tier-1 (Wikidata QID + name search) and `--agentic` (LLM web search) image discovery for imageless nodes. Writes `image_candidates.json` → reviewer approves → `seed/image_overlay.json`. |
| `upload_to_r2.py` | Mirrors approved images to Cloudflare R2. Content-addressed, idempotent. |
| `image_candidates.json` | Committed reviewable candidates (each scored low/medium/high). |
| `image_sanitize_report.json` | Latest `sanitize_images.py` report — committed for visibility. |

| Embed stack | What it does |
|---|---|
| `embed_nodes.py` | Gemini Embedding 2 (multimodal) → `seed/embeddings.{bin,json}`. Idempotent. |
| `project_umap.py` | UMAP-2D projection → `seed/embeddings.umap2d.json`. Deterministic. |
| `calibrate.py` + `calibration_pairs.json` | Threshold calibration for τ_kin / τ_visual / τ_attribute. |

## What's NOT here

`archive/` is everything frozen for provenance — old gatherer versions,
one-shot migration scripts, dated run artifacts. **Don't run anything from
`archive/`** — see `archive/README.md`. The live pipeline is what's in this
directory.

`runs/` is the gitignored ephemeral output of gatherers. Per-batch JSONs
land there; the merger reads them; nothing else should.

## Quick commands

```bash
# A new gatherer
python3 seed/_build/fetch_<source>.py --limit 100
python3 seed/_build/validate_seed.py --batch seed/_build/runs/<YYYY-MM>/<...>.json

# Validate canon after all batches are merged
python3 seed/_build/validate_seed.py --canon

# Image gap-fill on the assembled canon
python3 seed/_build/sanitize_images.py
python3 seed/_build/find_missing_images.py
# (review image_candidates.json — set "approved": true)
python3 seed/_build/find_missing_images.py --apply --write
seed/_build/.venv/bin/python3 seed/_build/upload_to_r2.py --overlay

# Embeddings — needs GEMINI_API_KEY in .env
seed/_build/.venv/bin/python3 seed/_build/embed_nodes.py
seed/_build/.venv/bin/python3 seed/_build/project_umap.py
```
