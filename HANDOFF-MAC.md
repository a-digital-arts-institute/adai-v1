# Handoff → Mac Claude (May 2026)

You're picking up `feat/canon-rebuild`. Read this, then **read `CLAUDE.md`
§ "The rebuild journey"** — it's the authority on how the canon got here.
This file is the short version + what to actually do.

## State of the world (don't re-derive it)

- **Shipped canon = the digital-art CULL of the clean sweep: 8,653 nodes /
  26,771 edges.** Produced by `seed/_build/cull_digital_art.py` over the
  poison-free sweep (commit `b12b15e`). Practitioner 4,790 · artwork 3,841 ·
  concept 13 · regime 6 · platform 2 · institution 1.
- It is **clean**: every row traces to a download (MoMA / Wikidata /
  Art Blocks / fxhash). No LLM-generated facts.
- The `/field` renderer was just made fast: batched dot drawing, sprited
  thumbnails, and a label "reading lens". Don't undo those.

## Hard rules (the whole reason this branch exists)

1. **Never hand-edit `seed/*.json` or write a script that mutates it.** The
   canon is build output. It's produced by `cull_digital_art.py`. If
   something's wrong in canon, fix the producer and regenerate.
2. **Do NOT restore the v1 canon** (`restore_canon.py`, commit `163ffa0`,
   "1,491 nodes"). It carried an April LLM-enrichment hallucination
   (`deepening.json` → fake institutions + EXHIBITED_AT edges). That whole
   path is a dead end, left in tree only as history. We already deleted the
   hallucination source from the repo.
3. **No LLM judgment in the data path.** The cull is a deterministic
   source-tag rule. Keep it that way.

## What to actually do (in order)

```bash
git checkout feat/canon-rebuild && git pull
rm -f adai.db && npm run seed:consolidated && npm run dev   # confirm it builds + serves
```

### Priority 1 — EMBEDDINGS (this is the one that matters)

`/field` style-kin, `/embed-space`, and profile similarity sections are
**empty** right now — the embedding sidecars were dropped at the cull (they
were keyed to old node ids). Regenerating them is the single highest-value
thing you can do. Needs `GEMINI_API_KEY` in `.env`.

```bash
# venv if missing:
#   python3 -m venv seed/_build/.venv && seed/_build/.venv/bin/pip install -r seed/_build/requirements.txt
seed/_build/.venv/bin/python3 seed/_build/embed_nodes.py      # ~3,841 artworks + practitioners
seed/_build/.venv/bin/python3 seed/_build/project_umap.py     # → embeddings.umap2d.json
git add seed/embeddings.{bin,json,umap2d.json}
git commit -m "feat(seed): embeddings for the digital-art canon"
rm -f adai.db && npm run seed:consolidated                    # chains embed:derive → STYLE_KIN + VISUALLY_AFFINE
```

After this, the embedding surfaces light up and ship baked into `seed.db`.

### Priority 2 — IMAGES (optional polish, skip if short on time)

Artwork `image_url`s are already in canon and render fine. These only add
durability + fill gaps:

```bash
# (a) mirror existing image_urls to R2 (rot-insurance; needs .env R2_* creds)
seed/_build/.venv/bin/python3 seed/_build/upload_to_r2.py

# (b) fill imageless nodes via Wikidata (Tier-1, 'high' confidence is safe, no review)
python3 seed/_build/find_missing_images.py
python3 seed/_build/find_missing_images.py --apply --accept-confidence high --write
seed/_build/.venv/bin/python3 seed/_build/upload_to_r2.py --overlay
git add seed/image_overlay.json && git commit -m "chore(seed): tier-1 image gap-fill"
```

NB: `find_missing_images.py --apply` writes `seed/image_overlay.json`, NOT
`nodes.json` (rule #1). The overlay is applied at seed time.

## Loose ends you may want to close

- **PR #26 description is stale** — still describes earlier states (v1
  restore / uncut sweep). Refresh it to the cull (8,653) before merge.
- **`restore_canon.py` is dead code** — abandoned v1 path. Safe to delete if
  you want the tree clean; harmless if left.
- **Tuning the cull** — if 4,790 practitioners still feels broad, the rule is
  one function in `cull_digital_art.py` (keep iff platform-native OR Wikidata
  digital-art QID). Tighten the QID set, re-run `--dry-run` to see counts,
  then without `--dry-run`, then re-seed. Never edit `nodes.json` directly.
- **`/field` perf dials** (if needed): `LABEL_MAX_SHOWN` (60),
  `LABEL_LENS_RADIUS` (170), thumbnail sprite cache cap `_THUMB_CACHE_MAX`
  (600) — all in `public/field/js-interface/graph-field.js`.

## Deploy (when ready)

```bash
FLY_REMOTE_BUILDER_REGION=iad flyctl deploy
# then wipe the volume DB so the new baked seed.db takes:
flyctl ssh console --app adai-basel -C "sh -c 'rm -f /data/adai.db /data/adai.db-shm /data/adai.db-wal'"
flyctl machine restart <machine-id> --app adai-basel
```
The daily `embed-derive-daily` GitHub Action will also keep embeddings fresh
post-deploy — but committing them locally (Priority 1) means they ship
immediately instead of populating overnight.
