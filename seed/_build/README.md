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

The shipped canon (May 2026) is **two platform gatherers + a rule-derived
curation pass**. The old multi-source script zoo (MoMA / objkt / Met /
`*_v3` / named-anchors) was `git rm`'d in the rebuild — recoverable from git
history, gone from the live tree.

| Gatherer | Source | Status |
|---|---|---|
| `fetch_artblocks.py` | Art Blocks Hasura (V0/V1/V3 core contracts) | **Live.** ~477 artworks + 297 artists. |
| `fetch_fxhash.py` | fxhash GraphQL | **Live.** ~3,000 generative tokens + artist-applied `tags` + 297→742 authors. `--refresh-from-canon` re-pulls the EXACT current token ids via `generativeTokens(filters:{id_in},take:50)` — adds tags without reshaping the set (so committed embeddings stay aligned). |
| `fetch_wikidata.py` | Wikidata SPARQL | **Shelved.** QIDs verified-clean (no bees) + bare-stub filter, but Commons-429 starves its artwork images vs the every-artwork-imaged invariant. Practitioner-only is viable; dormant on the branch. |
| `merge_batches.py` | `runs/*.json` | Assembles batches → canon (cross-source dedup, alias placeholder resolution). `--require-cdn` drops any artwork lacking a mirrored R2 cdn (cascades edges/aliases; practitioners untouched) — enforces "every artwork has an image". |
| `derive_curation.py` | post-merge canon | Rule-derived editorial layer: 8 base concepts + **tag-concepts** from fxhash tags (`--tag-min-artworks` gate, `TAG_STOPLIST` for junk) + A(DAI) regime + 5 sub-regimes + CLASSIFIED_BY / EMBODIES (incl. attested tag-EMBODIES). |

> **Tier-2 concept propagation** (the inferred "generated labels") lives in
> TypeScript, not here — `src/embed/concept-edges.ts`, run by `npm run
> embed:derive`. It propagates tag-concepts to visually-similar untagged works
> (centred kNN-vote) as low-confidence, dashed EMBODIES. See `docs/EMBEDDINGS.md`.

| Image stack | What it does |
|---|---|
| `apply_image_patches.py` | Merges per-fetcher image patches into `seed/nodes.json`. |
| `image_patches/` | Output directory for per-fetcher image patches. |
| `image_fetch.py` | Image fetcher + Pillow normaliser. Used by `embed_nodes.py`. |
| `sanitize_images.py` | HEAD-checks every `image_url` / `cdn_image_url` in canon. Diagnoses rot. |
| `find_missing_images.py` | Tier-1 (Wikidata QID + name search) and `--agentic` (LLM web search) image discovery for imageless nodes. Writes `image_candidates.json` → reviewer approves → `seed/image_overlay.json`. |
| `upload_to_r2.py` | Mirrors images to Cloudflare R2 (content-addressed, idempotent). `--mirror` → writes `seed/image_mirror.json` (cull-safe cdn for nodes that already have `image_url`); `--overlay` → mirrors gap-fill `image_overlay.json`; default → writes cdn back into `nodes.json`. **Run before re-embedding** (artworks embed multimodally from the R2 copy). |
| `cull_orphans.py` | R2 + embedding **janitor**. Drops (a) embedding rows whose node_id left the canon — keeps `node_embeddings` FK-consistent after a `--require-cdn` cull, else the seeder crashes; (b) R2 objects no longer referenced by any cdn. Dry-run default; `--apply` rewrites the embedding sidecars (offsets recomputed, atomic), `--delete` removes orphan R2 objects (guarded: refuses if <100 referenced). |
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
# Rebuild canon from the two platforms (the shipped pipeline)
rm -rf seed/_build/runs/*
python3 seed/_build/fetch_artblocks.py
python3 seed/_build/fetch_fxhash.py --limit 3000          # paged scan (newest); or:
python3 seed/_build/fetch_fxhash.py --refresh-from-canon  # re-pull the EXACT current set + tags (no reshape)
python3 seed/_build/merge_batches.py --require-cdn --no-validate
seed/_build/.venv/bin/python3 seed/_build/upload_to_r2.py --mirror   # MIRROR BEFORE EMBED
python3 seed/_build/merge_batches.py --require-cdn         # cull imageless + re-assemble
python3 seed/_build/derive_curation.py                    # concepts (base + tag) + classifications
python3 seed/_build/merge_batches.py --require-cdn        # fold curation + validate
python3 seed/_build/validate_seed.py --canon              # 0 errors / 0 warnings

# Embeddings — needs GEMINI_API_KEY in .env. ALWAYS mirror (above) first.
seed/_build/.venv/bin/python3 seed/_build/embed_nodes.py
seed/_build/.venv/bin/python3 seed/_build/project_umap.py
seed/_build/.venv/bin/python3 seed/_build/cull_orphans.py            # dry-run: orphan embeddings + R2
seed/_build/.venv/bin/python3 seed/_build/cull_orphans.py --apply   # after a cull: realign sidecars

# Image gap-fill on imageless nodes
python3 seed/_build/sanitize_images.py
python3 seed/_build/find_missing_images.py     # review image_candidates.json, set "approved": true
python3 seed/_build/find_missing_images.py --apply --write
```
