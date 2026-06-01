#!/usr/bin/env bash
# build_canon.sh — reproduce the A(DAI) canon end-to-end, deterministically.
#
# ONE command rebuilds seed/*.json + embeddings + seed.db from the committed
# producers and committed input artifacts (the "lockfiles": rescued_tags.json,
# image_overlay.json, image_mirror.json, embeddings.{bin,json}). No ad-hoc steps.
#
# REPRODUCE mode (default): pins the exact committed token sets and reuses the
#   committed embedding/image caches → byte-stable canon, no Gemini/Wikidata spend.
#   - fxhash via --refresh-from-canon (re-pulls the EXACT committed token ids;
#     --curate is non-deterministic because relevance/sales drift over time).
#   - embed_nodes reuses cached vectors by (text_hash,image_hash) → 0 API calls
#     when the node set is unchanged.
#
# REFRESH mode (BUILD_REFRESH=1): re-selects fxhash by --curate and re-runs the
#   derived-input producers (rescue_tags, find_missing_images are still manual —
#   see "Updating the lockfiles" below). Use when intentionally changing the canon.
#
# Updating the lockfiles (intentional canon changes — run by hand, then re-build):
#   - fxhash selection : fetch_fxhash.py --curate --preview   (calibrate) then --curate
#   - tag rescue       : rescue_tags.py                       (writes rescued_tags.json)
#   - missing images   : find_missing_images.py [--apply --write]  + upload_to_r2.py --overlay
#   These hit the network/Gemini; commit their outputs so REPRODUCE stays offline.
#
# Run:  seed/_build/build_canon.sh
set -euo pipefail
cd "$(dirname "$0")/../.."                     # repo root
PY="seed/_build/.venv/bin/python3"
[ -x "$PY" ] || PY="python3"                   # fall back if venv absent (tier-1 only)
REFRESH="${BUILD_REFRESH:-0}"
step() { printf '\n\033[1m== %s ==\033[0m\n' "$*"; }

step "1/6 gather (deterministic selections)"
rm -rf seed/_build/runs/*
$PY seed/_build/fetch_artblocks.py
if [ "$REFRESH" = "1" ]; then
  $PY seed/_build/fetch_fxhash.py --curate --top 1200 --min-secondary-sales 10 --min-minted 40 --min-sellthrough 0.7
else
  $PY seed/_build/fetch_fxhash.py --refresh-from-canon   # pin the committed set
fi
$PY seed/_build/fetch_va.py
$PY seed/_build/fetch_superrare.py                        # V1 genesis, oldest-first (deterministic)

step "2/6 assemble + mirror (mirror BEFORE cull/embed)"
$PY seed/_build/merge_batches.py --no-validate            # plain: net-new images present for the mirror
$PY seed/_build/upload_to_r2.py --mirror                  # idempotent; only new images upload
$PY seed/_build/merge_batches.py --require-cdn --no-validate   # cull imageless

step "3/6 rule-derived curation (reads committed rescued_tags.json → single pass)"
$PY seed/_build/derive_curation.py
$PY seed/_build/merge_batches.py --require-cdn --no-validate   # fold curation
$PY seed/_build/validate_seed.py --canon                  # 0 errors / 0 warnings

step "4/6 embed + project (reuses committed cache → 0 API calls when unchanged)"
$PY seed/_build/upload_to_r2.py --mirror                  # ensure mirrored before embed
$PY seed/_build/embed_nodes.py
$PY seed/_build/project_umap.py
$PY seed/_build/cull_orphans.py --apply                   # keep embedding sidecars FK-consistent

step "5/6 regenerate the single-source-of-truth counts"
$PY seed/_build/gen_stats.py                              # seed/STATS.md

step "6/6 bake seed.db (chains embed:derive — STYLE_KIN / VISUALLY_AFFINE / Tier-2)"
rm -f adai.db adai.db-shm adai.db-wal
npm run seed:consolidated

printf '\n\033[1m✓ canon rebuilt.\033[0m  counts: seed/STATS.md  ·  validate: 0/0 above\n'
