# A(DAI) — Digital Arts Knowledge Commons

> **⚠️ Audits target contracts, not artefacts.**
>
> `seed/*.json` is build output. The contracts are the producer scripts
> in `seed/_build/` (and every committed gatherer). When seed rows look
> wrong:
>
> - **Trace each row to its producer.** No producer? That's the bug —
>   an ungoverned write path. Don't delete the row; close the gap.
> - **Compare producer output to the producer's own stated contract**
>   (docstring, signal record). Not to the global schema doc — yet.
> - **If many producers "violate" the same documented rule**, the rule
>   is probably too narrow. Update the doc / validator, not the rows.
> - **Substantive ≠ procedural.** A row can have a sloppy
>   `source_evidence` and still be true. Editorial cleanup of
>   historical canon is almost never the right move.
>
> Never hand-edit `seed/*.json`, and never write a post-hoc script that
> mutates it. New bad writes get rejected at `POST /api/v1/edges` and
> `/review`. Historical canon stays.

## What this is

A TypeScript/Express HTTP server that serves the A(DAI) digital arts knowledge graph. It stores practitioner/concept/scene data in SQLite with CR-SQLite CRDT extensions, serves HTML pages and a D3 graph visualization, and exposes a JSON API for graph queries.

Live at: https://adai-basel.fly.dev/

## Architecture

```
src/
  index.ts                — entry point: init DB, start Express server
  db.ts                   — SQLite/CR-SQLite database setup and helpers
  seed.ts                 — legacy seed: reads ./results/*.json (kebab-dash IDs)
  seed-consolidated.ts    — canonical seed: reads ./seed/*.json (colon IDs, PR #5 schema)
  templates.ts            — HTML page templates (header, footer, CSS)
  routes/
    pages.ts              — HTML page route handlers
    api.ts                — JSON API route handlers
db.sql                    — CR-SQLite schema (CRR tables + local tables)
seed/                     — canonical seed data (nodes/edges/signals/contributors/aliases JSON)
  _build/                 — offline Python pipeline (fetch_artblocks, fetch_fxhash, fetch_va gatherers + merge_batches + derive_curation + validate_seed + embed/image tooling); produces seed/*.json. fetch_va.py = the V&A Computer Arts Society de-bias pass (IIIF images, the 1960s–70s spine). fetch_wikidata.py is verified-clean (QIDs corrected, no bees) but SHELVED — its artworks are Wikimedia-Commons-hosted and Commons' 429 throttle starves the image mirror vs. the every-artwork-imaged invariant; practitioner-only is viable but unused
results/                  — 59 legacy per-practitioner research JSONs (kept for reference)
  _drafts/                — bridge practitioners, classification-lens drafts, artwork previews
pipeline/                 — offline Python scripts (clean_artworks, embed, snapshot)
Dockerfile                — Node 22, multi-stage: builder bakes seed.db, runtime ships only the DB
fly.toml                  — Fly.io config (fra region, 512MB, persistent /data volume)
entrypoint.sh             — copies baked /app/seed.db → /data/adai.db on first boot
```

## Running locally

```bash
npm install

# Canonical path (what production ships): reads seed/*.json
rm -f adai.db && npm run seed:consolidated && npm run dev

# Legacy path: reads results/*.json (different ID convention, incompatible with the above)
rm -f adai.db && npm run seed && npm run dev

npm run dev   # if adai.db already exists
```

Server: http://localhost:8080

The two seed paths can't share a DB — they use different ID conventions (`practitioner:casey reas` vs `practitioner-casey-reas`) and would produce semantic duplicates. Pick one per DB.

## Database

Single SQLite file `adai.db` with CR-SQLite CRDT extensions (`@shards-lang/crsqlite`).

**CRR tables** (synced via CRDTs):
- `nodes` — id, type, name, slug, metadata (full JSON), updated_by
- `edges` — id, source_id, target_id, edge_type, signal_id, confidence, charge, created_by, and bi-temporal fields: `event_time` (when the relationship was true in the world), `valid_from` (when the edge entered the graph), `valid_until` (NULL = still current), `invalidated_by` (id of the signal or edge that superseded it)
- `signals` — contributed information about practitioners; consent fields (`consent_scope` ∈ {structural_only, full_commons}, `consent_attribution` ∈ {anonymous, attributed, attributed_with_notification}, `consent_revocable`), audit fields (`processing_trace` JSON of the agent's reasoning, `provenance_chain` JSON tracking flow through classification systems), `source_origin` ∈ {human_primary, human_secondary, ai_assisted, ai_generated, webscrape, platform_api, uncertain_origin, unknown}, `batch_id` for import-run tracking, `status` ∈ {active, revoked, superseded}
- `contributors` — who contributed, trust tier, counts
- `node_aliases` — cross-source entity resolution: `(source, external_id) → node_id` so MoMA's "Casey Reas", Wikidata's Q28936957, and fxhash's wallet all resolve to one node

**Local tables**:
- `intake_queue` — contribution review pipeline (pending/approved/rejected)
- `settings` — key-value config

> **⚠️ What ships right now: curated platforms + the V&A historical layer (May 2026). Counts: [`seed/STATS.md`](seed/STATS.md).**
>
> The canon is the genuine output of four source-of-truth gatherers, **each
> contributing its most significant slice, not a random sample**: **Art Blocks**
> (curated Ethereum generative) **+ a curated slice of fxhash** (the collector-
> validated 2021 Tezos generative canon — SMOLSKULL, RGB Elementary Cellular
> Automaton …, selected by `--curate`: relevance + a secondary-market demand gate)
> **+ the Victoria & Albert Museum's Computer Arts Society collection** (the
> 1960s–70s computer-art spine: Nake, Cohen, Mohr, Molnár, Nees …) **+ SuperRare**
> (the 2018-2019 genesis of crypto art — XCOPY, Robbie Barrat …, the V1 1/1 canon)
> — plus the rule-derived editorial layer. There is still **no MoMA,
> no Wikidata, no named-anchors** layer: those were dropped after the Wikidata
> `digital_art_qids` list was found to be **corrupt** (a bee species, moths,
> "combat", and "graphic artist" — the last alone dragged 3,652 non-digital
> painters/sculptors, Duchamp and Miró among them, into a generative-art canon).
> See "The rebuild journey" below for the full story. The canon stays clean
> **by construction**: `merge_batches.py` assembles it from only the batches
> present (now three clean ones), so off-domain rows can't enter — no filter/cull
> step exists. Two May-2026 passes refined it: (1) the **V&A de-bias pass** added
> the historical spine the platforms missed — the V&A serves IIIF images (no
> Wikimedia-Commons 429 throttle) so every record survives the `--require-cdn`
> every-artwork-imaged invariant, the exact wall the Wikidata re-attempt hit; and
> (2) the **fxhash curation pass** replaced a provenance-murky chronological dump
> with a collector-validated `--curate` selection (relevance + secondary-market
> demand gate), killing the permissionless trash and the platform's over-dominance.
>
> If `git log` or older doc revisions mention 4,558 nodes (clean two-platform,
> pre-V&A), 5,930 (V&A pass, pre-fxhash-curation), 8,653 (digital-art cull), 1,491
> (v1 restore), or 16,244/16,351 (uncut sweep), those are all superseded.
>
> **Exact counts live in one generated place — [`seed/STATS.md`](seed/STATS.md)**
> (produced from the canon by `seed/_build/gen_stats.py`, so they can't drift) —
> and live at `GET /api/stats`. The figures woven into the prose below are
> narrative (they tell the de-bias story); when they and `STATS.md` disagree,
> `STATS.md` wins — regenerate it and don't hand-reconcile the prose.

**Node types** — live in Seed Canon (May 2026, from the Art Blocks + curated-fxhash + V&A pipeline; **counts in [`seed/STATS.md`](seed/STATS.md)**): **artwork** (curated-fxhash 2021 generative tokens + Art Blocks generative tokens + V&A computer-art holdings; **every one carries a mirrored R2 image**, see the `--require-cdn` invariant below), **practitioner** (platform-native generative artists + the V&A 1960s–70s computer-art spine, pre-platform, recognised through the museum + scholarship), **concept** (8 base + **tag-concepts** minted from attested fxhash tags at the ≥25 frequency gate, `TAG_STOPLIST`-filtered; see "Tag-derived concepts"), **classification_regime** (A(DAI) canonical lens + 5 sub-regimes), **collective** (V&A artistic groups, e.g. the Computer Technique Group), **platform** (Art Blocks, fxhash, SuperRare), **institution** (Victoria and Albert Museum). Schema reserves `scene`, `publication`, `project`, `event`, `related` — empty. Cross-source identity merges by node id (e.g. XCOPY appears on more than one platform → one node). Every artwork is an on-chain generative token, a V&A computer-art holding, or a SuperRare curated 1/1. No node carries a Wikidata occupation/movement QID — the contamination is gone at the root. New practitioners/artworks enter via the contributor API or by re-running the gatherers. **Wikidata was re-attempted in May 2026 and dropped again**: the practitioner gatherer is verified-clean (occupation QIDs, no bees), but Wikidata *artworks* are Wikimedia-Commons-hosted and Commons' bot-throttle (429) starves the image mirror — which collides with the "every artwork has a mirrored image" invariant. The V&A pass exists because it clears that exact bar (IIIF, no throttle). So Wikidata stays shelved (practitioner-only would be viable; the gatherer + occupation→concept map are on the branch, dormant). objkt / a correctly-configured non-Commons source remain the "try more later" path.

**Edge types** — 9 curated + 2 auto-derived (**counts in [`seed/STATS.md`](seed/STATS.md)**). Curated: **CLASSIFIED_BY** (every artwork → A(DAI) lens + its sub-regime: platform artworks → crypto-market-native, V&A artworks → euro-american-institutional; V&A makers → academic-media-art-history + euro-american-institutional), **CREATED_BY** (artwork → its maker), **EXHIBITED_AT** (platform artworks → their platform, V&A artworks → institution:victoria and albert museum), **EMBODIES** (**two-tier**: every platform artwork → generative-art + artwork → fxhash tag-concept, every V&A artwork → computer-art, all Tier-1 confidence 1.0 in canon; see "Tag-derived concepts"), **PRACTICES** (V&A makers → computer-art; **revived by the V&A pass** — it was empty on the platform-only canon because platform artists carry no QIDs), **BELONGS_TO / COLLABORATES_WITH / USES_TECHNIQUE / INFLUENCES** (reserved, empty). Auto-derived from `npm run embed:derive`, refreshed by the daily `embed-derive-daily` GitHub Actions workflow: **STYLE_KIN** (creator ↔ creator — note the 1960s V&A pioneers form a tight internally-coherent cluster, Nake↔Nees↔Mohr↔Molnár↔Noll↔Verostko; the embeddings correctly do *not* fabricate cross-era visual rhymes with 2021 platform work), **VISUALLY_AFFINE** (artwork ↔ artwork), and **Tier-2 concept-EMBODIES** (inferred artwork→tag-concept for visually-similar untagged works, `created_by='embedding-multimodal-v1'`, dashed; ~0 land on V&A works — they cluster apart from tagged fxhash work, so the eras connect through shared *curated* concepts, not forced similarity) — bounded by the per-node mutual-kNN cap / gates. The canonical edge-type list lives in [seed/SOURCES.md](seed/SOURCES.md), which adds one intentionally empty edge: **RESPONDS_TO** (artwork → artwork) — zero because it requires evidence of artist intent, not thematic similarity. It's the highest-value edge type for Basel-floor practitioner contributions. `db.sql` has no CHECK constraint on `edge_type`. When adding rows, prefer the existing 9 unless the relation is genuinely new, and update these counts rather than letting them drift.

> **⚠️ ALWAYS MIRROR IMAGES TO R2 *BEFORE* EMBEDDING — WE KEEP GETTING THIS WRONG.**
> Artwork embeddings are MULTIMODAL: the image is part of the vector. `embed_nodes.py`
> reads artwork images from the R2 mirror (`image_mirror.json`); if an image isn't
> mirrored yet, it **silently falls back to text-only** — a wrong vector that looks
> fine. THE ORDER IS ALWAYS: **(1) `upload_to_r2.py --mirror` → (2) `embed_nodes.py`
> → (3) `project_umap.py`.** The runner `seed/_build/materialize_wikidata_embeddings.sh`
> enforces it; do the same in any new path.

**Embedding pipeline** (Gemini Embedding 2, multimodal, 768-d, L2-normalised): batch embed lives in Python under `seed/_build/embed_nodes.py` and writes `seed/embeddings.{bin,json}` (committed alongside the seed JSONs — the Docker builder needs them in context). `src/seed-consolidated.ts` reads the sidecar into the local-only `node_embeddings` table. Derive lives in TypeScript: `npm run embed:derive` chains `centroids → derive`, recomputing style centroids for both **practitioners and collectives** from live `CREATED_BY` edges (artwork → creator direction) and emitting STYLE_KIN + VISUALLY_AFFINE rows plus SUGGESTS_CREATED_BY proposals into `intake_queue` (`kind='ai_suggestion'`). Calibrated thresholds (May 2026): τ_attribute=0.88, τ_kin=0.91, τ_visual=0.84 — override via `TAU_ATTRIBUTE`, `TAU_KIN`, `TAU_VISUAL` env vars. Curators approve attributions at `/review?kind=ai_suggestion`; rejected pairs land in `rejected_ai_suggestions` so the next derive run skips them. These proposals often surface real **attribution gaps** in the seed — artworks whose only `CREATED_BY` edge points to a non-practitioner target (project / platform / institution / publication / parent-artwork), so the derive treats them as orphans and proposes the human creator from the closest style centroid. See #24 for the May 2026 Holly+ / Webrecorder / etc. cluster. Every `embed:derive` starts with `DELETE FROM edges WHERE created_by='embedding-multimodal-v1'` so re-runs are clean. Derived edges render dashed in `/field` (press `e` to flip into 'embeddings mode' where they're the foreground). **The pipeline refuses to auto-emit INFLUENCES or RESPONDS_TO** — semantic similarity is the wrong signal for either, by design.

**Tier-2 concept propagation** (`src/embed/concept-edges.ts`, runs inside `embed:derive` after VISUALLY_AFFINE): enriches EMBODIES beyond the single flat `generative-art` target. For each **tag-concept** (minted by `derive_curation.py` from attested fxhash tags — see "Tag-derived concepts" below), it **mean-centres** the artwork vectors first (generative-art embeddings are anisotropic — every vector points roughly the same way, so raw cosine matches everything-to-everything; centring removes that common component), gates the concept by member **coherence ≥ τ** *and* **≥ N distinct creators** (drops umbrella tags like `generative`/`p5js`/`art` and single-artist tag-series like one artist's handle used as a tag), then **kNN-votes** each untagged artwork's centred neighbours to propose low-confidence `EMBODIES → concept`. These land **directly in the graph — no `/review`** (the owner's call: gated propagation is trusted) — tagged `created_by='embedding-multimodal-v1'`, confidence `low`, dashed in `/field`, wiped+recomputed each run, and **never written to the committed canon JSON** (so the validator's attested-only rule holds; provenance always separates an inferred EMBODIES from an attested one). Thresholds are env-tunable: `TAU_CONCEPT_COH=0.15`, `CONCEPT_MIN_CREATORS=8`, `CONCEPT_MIN_MEMBERS=15`, `CONCEPT_KNN_K=30`, `CONCEPT_VOTE=0.30`, `CONCEPT_MAX_PER=200`. **Validated on real fxhash tags + live embeddings before merge**: naive centroid-cosine matched everything-to-everything (the cone effect); centred kNN-vote gives tight, plausible propagation (`pixel`→untagged pixel-art creatures, `grid`/`glitch`→nothing). These edges populate **only after the canon is regenerated with tags** (see the pipeline section).

**Threshold drift surveillance**: `npm run embed:report-drift` emits a JSON snapshot of where the hard-coded τ values currently sit in the live similarity distribution (target percentiles: τ_kin ≈ p95, τ_visual ≈ p99, τ_attribute ≈ p99). Drift far from those originals → re-tune by hand using `npm run embed:calibrate`. **Auto-recalibration is intentionally not wired** — that's how the visible graph silently changes shape under contributors and curators.

**Embed-on-write**: contributor-API endpoints (`POST /api/v1/nodes`, `PATCH /api/v1/nodes/:id`, `POST /api/v1/images`) and curator-approve handlers call `embedNodeAsync(db, nodeId)` from `src/embed/server.ts` immediately after the materialise step. Failures are logged but never block the HTTP response — the daily backfill catches them. Requires `GEMINI_API_KEY` set as a Fly secret (`flyctl secrets set GEMINI_API_KEY=...`); locally, `.env` works because `src/index.ts` calls `process.loadEnvFile()` at startup. Idempotency is `(text_hash, image_hash)` matching the offline pipeline; for backfill the SQL only targets nodes with no existing `node_embeddings` row, so already-embedded nodes are never disturbed.

**Daily re-derive on Fly**: `.github/workflows/embed-derive-daily.yml` runs four stages against the live DB at 04:00 UTC — `embed:backfill` (catches anything that slipped past embed-on-write, calls Gemini), `embed:derive` (propagates curator-approved CREATED_BY edges into STYLE_KIN / VISUALLY_AFFINE / SUGGESTS_CREATED_BY, no API calls), UMAP refresh (re-projects to `/data/embeddings.umap2d.json`, debounced via `/data/umap.lockfile`), then `embed:report-drift`. Triggered manually via `workflow_dispatch` as well. Required secrets: `FLY_API_TOKEN` (repo — an **org-scoped deploy token** minted with `flyctl tokens create org personal --expiry 8760h` and stored via `gh secret set FLY_API_TOKEN < tokenfile`; scoped `deploy` / `ssh` tokens fail the pre-flight `appcompact` GraphQL query that `flyctl ssh console` does, and the deprecated `flyctl auth token` output is multi-line so it must be set from a file to avoid stdin newline mangling); `GEMINI_API_KEY` (Fly). The CLI auto-resolves `/data/adai.db` inside the Fly machine via `src/utils/db-path.ts` — no env config needed in the workflow. UMAP runs on the **GH runner**, not the Fly machine — sklearn/UMAP on the 1-CPU / 512 MB image timed out every run (29 min, hit the 30 min workflow timeout). The runner SSH-exports `node_embeddings` as a compact `AEVB` binary (`node /app/dist/embed/cli.js export-vectors`), fits UMAP in seconds with pip-cached `umap-learn`, then SFTPs the result back to `/data/embeddings.umap2d.json` via a `*.new` sibling path + `mv` swap so the live server never sees a half-written file. Every SSH-using step in the workflow first `curl`-warms `/api/stats` because `fly.toml` has `auto_stop_machines = 'stop'` and SSH activity alone doesn't reset the idle timer (the workflow's per-step boundary is just long enough to fall into that window). The `/api/embed-space` endpoint prefers the volume file over the baked sidecar so contributor-added nodes appear in the scatter within one cron cycle.

**Embedding visualisation surfaces**:
- **Profile pages** (`/practitioner/:slug`, `/artwork/:slug`, `/concept/:slug`, `/scene/:slug`) — append "Style kin" / "Visually affine" / "Style proximity" / "Closest artworks" sections computed on-demand via `src/embed/neighbours.ts`. Practitioner pages also surface pending AI-attribution proposals that name them as the candidate creator.
- **`/neighbours/:type/:slug`** — similarity browser: top-20 cosine neighbours of any node, with knobs for query/candidate kind and type prefix. Shareable URLs.
- **`/field`** — press `e` (or click the chip in the chrome) to fade curatorial edges and foreground STYLE_KIN / VISUALLY_AFFINE.
- **`/embed-space`** — UMAP-projected 2D scatter of all ~5,921 vectors with pan / zoom / hover / type filters / name search. Practitioners cluster by aesthetic, artworks by visual similarity, concepts by semantic field. The projection lives in `seed/embeddings.umap2d.json` (committed alongside the other embedding sidecars — see the "Deploying" section), produced offline by `seed/_build/.venv/bin/python3 seed/_build/project_umap.py` — re-run after any new embed pass. Cosine metric, `n_neighbors=15`, `min_dist=0.1`, `random_state=42` for determinism.

**Trust tiers**: `auto` (founding team + practitioner self-report on own data — auto-merge), `reviewed` (established track record — auto-merge + tagged), `probationary` (default for new contributors — queued for review). The auto-approve check in `POST /api/contribute` treats `auto` and `reviewed` as auto-merge; everyone else goes to the review queue.

**A(DAI) canonical regime**: `classification_regime:adai seed canon v1 april 2026` (slug `adai-seed-canon-v1-april-2026`) is the single canonical lens. Canonical entities declare `CLASSIFIED_BY → classification_regime:adai seed canon v1 april 2026` — these edges are emitted by `derive_curation.py`, not auto-injected at seed time (one CLASSIFIED_BY per artwork; counts in [`seed/STATS.md`](seed/STATS.md)). The earlier `classification_regime:a(dai)` root (which produced an edge explosion that centred the graph on itself) was retired and its auto-injecting loop in `src/seed-consolidated.ts` was disabled — see the comment block around line 184. Do not reintroduce the auto-injection. Five sub-regimes also exist as nodes (`academic media-art history`, `asia-pacific institutional`, `crypto market-native`, `euro-american institutional`, `practitioner self-report`); on this canon **three** carry edges: **crypto market-native** (every platform artwork — an on-chain generative token), **euro-american-institutional** (V&A artworks + V&A makers — the holding-museum lens), and **academic-media-art-history** (V&A makers — the field's computer-art scholarship). `asia-pacific institutional` and `practitioner self-report` remain reserved for when those sources return. Renders gold in `/graph`.

### Querying rules

- **Bi-temporal**: always filter `WHERE valid_until IS NULL` on `edges` queries that represent the current state. Unfiltered queries return historical edges too. `db.sql` indexes `valid_until` for this.
- Profile-page queries, `/api/graph`, `/api/graph/:slug`, and the walk-component endpoint all apply this filter.

## HTTP endpoints

### HTML pages
- `GET /` — home with stats + recent additions
- `GET /explore` — list all practitioners
- `GET /graph` — D3 force-directed graph visualization
- `GET /practitioner/:slug` — full profile page
- `GET /contribute` — signal submission form
- `GET /review` — curator review queue

### JSON API
- `GET /api/stats` — node/edge/signal counts
- `GET /api/graph` — full graph as D3-compatible `{nodes, edges}`, supports `?type=` filter. Each node carries `cdn_image_url` and/or `image_url` when present (omitted otherwise).
- `GET /api/graph/:slug` — ego graph (1-hop neighborhood). Same image projection.
- `GET /api/graph/:slug/component` — full connected component reached from `:slug` via BFS over live edges; caps at `?max_nodes=800` (override up to 5000), returns `truncated: true` when hit. Same image projection.
- `GET /:type/:slug/data` — full JSON export (full parsed metadata + edges + approved signals) for any node type. Polymorphic (`practitioner`, `artwork`, `concept`, `scene`, `collective`, `institution`, `platform`, `publication`, `project`, `classification_regime`); slug-only resolution, the type segment is decorative.
- `POST /api/contribute` — submit a signal (JSON body)
- `POST /api/review/:id/approve` — approve intake item
- `POST /api/review/:id/reject` — reject with reason

### Contributor API (`/api/v1/*`) — bearer-token, AI-driven

The contributor surface for AI assistants ("Claude with a sandbox") rather than a web frontend. Every endpoint requires `Authorization: Bearer <token>`; tokens are issued out-of-band via `npm run token:issue` and live in the local-only `contributor_tokens` table (sha256-hashed, soft-revocable). The caller-facing contract is `SKILL.md` at the repo root, also served verbatim at `GET /skill.md` so a Claude can bootstrap with `curl $ADAI_BASE/skill.md`.

Endpoints:
- `GET /api/v1/whoami` — identity + trust tier + r2 status + token scope
- `POST /api/v1/signals` — text contribution about an existing node (token-gated successor to `/api/contribute`)
- `POST /api/v1/nodes` — create practitioner / artwork / concept / etc.; server computes `<type>:<slug>` id
- `PATCH /api/v1/nodes/:id` — JSON-merge-patch on `metadata` (null deletes a key)
- `POST /api/v1/edges` — add an edge; supports bi-temporal supersession via `supersedes_edge_id`
- `POST /api/v1/images` — `multipart/form-data` (`image=@file`, `node_id=...`) OR `application/json` with `image_base64` + `mime_type`; uploads to R2 with the same content-addressed key scheme as the offline Python uploader (`images/<sha[:2]>/<sha>.<ext>`), then attaches `cdn_image_url` to the node's metadata

Admin endpoints (require `scope='admin'` token, enforced by `requireAdmin` in `src/auth.ts`):
- `GET  /api/v1/tokens` — list tokens (`?contributor=<name>&active=1` filters)
- `POST /api/v1/tokens` — mint a **write-scope** contributor token (refuses `scope=admin` in body; only the operator CLI can mint admins)
- `POST /api/v1/tokens/:prefix/revoke` — soft-delete a token by prefix

Scope and trust_tier are deliberately decoupled: `scope` (write|admin) governs *which endpoints* the token can hit, `trust_tier` (auto|reviewed|probationary) governs *whether writes auto-merge or queue*. An admin can be `probationary` (every contribution they make queues) and still mint tokens. The mint/revoke/list logic lives in `src/utils/token-mint.ts` and is shared between the HTTP endpoints and the operator CLI so the two paths can't drift.

Trust gating mirrors the legacy `/api/contribute` policy: `trust_tier in (auto, reviewed)` writes land live, anything else queues in `intake_queue` as `kind='human_signal'` with `proposed_nodes` / `proposed_edges` populated. The curator's existing `/review` page renders these queued operations in human form (create-node / patch-node / attach-image / edge-with-supersession previews) and the existing `POST /api/review/:id/approve` materialises them via the helpers in `src/utils/contribution.ts`. Image bytes upload to R2 **regardless of tier** (content-addressed + immutable, so no harm); only the metadata attachment is queued for probationary contributors.

Token CLI:
```bash
# Local dev
npm run token:issue -- --contributor "Casey Reas" --label "claude-laptop"
npm run token:issue -- --contributor "New Person" --label "first" --create --tier probationary
npm run token:issue -- --contributor "Giovanni" --label "ops" --admin   # admin-scope (CLI-only)
npm run token:revoke -- --prefix adai_abc12345
npm run token:revoke -- --list [--contributor "<name>"]
npm run token:restore -- --from .tokens.json [--dry-run]   # bulk re-insert (disaster recovery)

# Production (writes against /data/adai.db on the volume)
flyctl ssh console --app adai-basel -C \
  "node /app/dist/cli/issue-token.js --contributor 'Name' --label 'label' --create --tier reviewed"
flyctl ssh console --app adai-basel -C \
  "node /app/dist/cli/revoke-token.js --prefix adai_xxxxxxxx"
# Tokens-on-prod ops are wrapped by `just tokens-list` and `just restore-tokens` —
# see the "Ops via just" section below for the SFTP+CLI+cleanup flow.
```
The CLI resolves its DB path via `src/utils/db-path.ts`: explicit `DB_PATH` env wins, otherwise it prefers `/data/adai.db` if present (Fly volume), falling back to `./adai.db` for local dev. **Don't run the CLI as `node dist/cli/...` without one of those guards** — older versions silently fell back to `./adai.db`, which on Fly creates a throwaway DB at `/app/adai.db` and the token never reaches the running server.

The raw token is printed to **stdout** exactly once for `token:issue`. The store keeps only `sha256(token)` and the first 13 characters (`adai_` + 8 hex) for human reference. Issuance is operator-only (no HTTP endpoint).

`token:restore` is the disaster-recovery sister of `token:issue` — it takes a pre-supplied raw token (one you already issued and saved) and re-inserts it into `contributor_tokens` so existing API clients keep working after a `/data` volume wipe. The raw tokens live in `.tokens.json` at the repo root (gitignored; see `.tokens.json.example` for the schema). The restore CLI is **idempotent** (matched by `sha256(raw)`) and wrapped in a transaction, so re-running is a no-op and partial failures roll back. It refuses to silently re-bind a token to a different contributor or change its scope — those raise instead of overwriting.

R2 secrets on Fly: the runtime image-upload path needs `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE` set as `flyctl secrets`. Locally they come from `.env` (the same file `seed/_build/upload_to_r2.py` reads); `src/index.ts` calls `process.loadEnvFile()` at startup when `.env` exists. Without them `POST /api/v1/images` returns `503 r2_not_configured`; the other endpoints still work.

`db.sql` adds `contributor_tokens` (local-only, NOT a CRR). Don't `crsql_as_crr` it — token material must never sync.

## Deploying

### Ops via `just`

The recurring Fly operations are wrapped in a `justfile` at the repo root so the order of the documented dance (deploy → wipe volume → wait → restore tokens) stays honest. `brew install just`; then `just` (no args) lists recipes. The important ones:

- `just deploy` — `FLY_REMOTE_BUILDER_REGION=iad flyctl deploy`.
- `just nuke-volume` — the destructive `rm /data/adai.db*` + machine-restart sequence, with an interactive `'yes'` confirmation. Use this when you want the freshly-baked seed to land on prod.
- `just restore-tokens` — re-insert the operator admin tokens from `.tokens.json` (gitignored). SFTPs the file to `/tmp` on the VM, runs the restore CLI in a transaction, deletes the file. Idempotent. Pair with `just restore-tokens-dry` first if you want to see what would happen.
- `just redeploy-fresh` — the full sequence: `_check-tokens-file → deploy → nuke-volume → wait-healthy → restore-tokens`. Refuses to start if `.tokens.json` is missing, so you can't deploy fresh seed and then discover you've orphaned auth.
- `just tokens-list` — `node /app/dist/cli/revoke-token.js --list` over SSH.
- `just warm` / `just logs` / `just ssh` / `just wait-healthy` — low-level building blocks.

`.tokens.json` holds the raw bearer strings keyed by contributor name (see `.tokens.json.example` for the schema). It is gitignored and never lands on the production VM at rest — `just restore-tokens` deletes it from `/tmp` in the same SSH session as the CLI run. The restore CLI is also reachable directly: `flyctl ssh console -C "node /app/dist/cli/restore-tokens.js --from <path>"`.

The raw recipe-less commands still work:

```bash
# Deploy to Fly.io (use IAD builder if Depot times out)
FLY_REMOTE_BUILDER_REGION=iad flyctl deploy

# Check logs
flyctl logs --app adai-basel --no-tail | tail -20

# SSH into machine
flyctl ssh console --app adai-basel
```

The Dockerfile is multi-stage: the builder runs `npm run seed:consolidated` and produces `/app/seed.db` (with embeddings + STYLE_KIN + VISUALLY_AFFINE baked in — see the embedding pipeline section); the runtime image ships only that baked DB plus the compiled server plus `seed/embeddings.umap2d.json` (read by `/api/embed-space`). `entrypoint.sh` copies `/app/seed.db → /data/adai.db` on first boot.

`seed/embeddings.{bin,json,umap2d.json}` are **committed to git** so they reach the Docker build context. Recreate after editing the seed:
```bash
seed/_build/.venv/bin/python3 seed/_build/embed_nodes.py
seed/_build/.venv/bin/python3 seed/_build/project_umap.py
git add seed/embeddings.{bin,json,umap2d.json} && git commit
```
`.gitignore` carries a warning against re-ignoring them. `seed/_build/` is in `.dockerignore` (~483 MB venv + research artifacts — never ships).

### Deploy gotchas

- **Persistent volume**: `/data` survives deploys, so new code sees the old DB. To ship fresh seed data (including any new embeddings or derive thresholds), SSH in and remove the DB files, then restart:
  ```bash
  flyctl ssh console --app adai-basel -C "sh -c 'rm -f /data/adai.db /data/adai.db-shm /data/adai.db-wal'"
  flyctl machine restart <machine-id> --app adai-basel
  ```
  On restart, the entrypoint sees no DB and copies the baked one. **Use `just nuke-volume` (or the chained `just redeploy-fresh`) for this — it picks the machine ID, confirms, and reminds you to restore tokens.** Wiping the volume drops every local-only row (`contributor_tokens`, `intake_queue`, `archivist_sessions`, `rejected_ai_suggestions`, …); the tokens come back via `just restore-tokens` reading `.tokens.json`, but the rest is gone for good — only do this when you actually want fresh state.
- **Schema migrations are not automatic**. `initDb` runs `db.sql` against the live DB on every boot — fine for `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`, but it will fail if the new schema adds a column to an existing table (observed: adding `valid_until` to `edges` crash-looped an older volume). The May 2026 `intake_queue.kind` column add is wrapped in a `try/catch` in `src/db.ts` keyed to SQLite's stable "duplicate column name" error so it's idempotent — **don't strip the try/catch**. When schema expands further, either reuse the same pattern or blow away the volume.
- **WAL checkpoint trap in the seeder**: `src/seed-consolidated.ts` ends with `PRAGMA wal_checkpoint(TRUNCATE)` — **keep it**. CR-SQLite runs in WAL mode; small writes at the end of the seeder (e.g. the A(DAI) bootstrap, the embeddings load, the chained derive pass) otherwise sit in `seed.db-wal`. The Dockerfile only copies `seed.db` to the runtime stage, so uncheckpointed writes silently disappear. If you add inserts anywhere after the main node/edge loops, make sure the checkpoint still runs after them.
- **Embedding sidecar drift**: if `seed/embeddings.bin` (or `.json`) is missing or out of sync with `seed/nodes.json`, the builder will produce a `seed.db` with no `node_embeddings` rows and no STYLE_KIN / VISUALLY_AFFINE edges (the chained derive silently skips when embeddings are absent). Production then 404s `/api/embed-space` and shows empty profile-page sections. Always re-run `embed_nodes.py` + `project_umap.py` after material changes to `seed/nodes.json`, and re-commit the three sidecars. The script is idempotent — only nodes whose `(text_hash, image_hash)` changed get re-embedded.

## Data model

### The rebuild journey (READ THIS if you're a fresh Claude on this branch)

`feat/canon-rebuild` is not a single clean rebuild — it's a sequence of
decisions, and the final one reverses the middle ones. Commit order:

1. **Phase 0–3 (75152d9..a33c18d)** — wiped the contaminated v1 canon and
   rebuilt from scratch via a *source-attested sweep*: four contract
   gatherers (MoMA / Wikidata / Art Blocks / fxhash) + rule-derived
   curation → **16,244 nodes, 50,793 edges**. Established the producer
   contract + shared helpers + validator. Good infrastructure.
2. **Named anchors (b12b15e)** — discovered the sweep had *lost* 108 of the
   146 hand-curated v1 practitioners (theorists, pioneers, sound artists)
   because they carry no digital-art source tags. Recovered the whitelist.
3. **Restore (7495768) — ABANDONED** — restored the full v1 editorial canon
   via `restore_canon.py` and stripped its prose. But this **re-imported the
   April-2026 LLM-enrichment hallucination**: `deepening.json` (a Claude
   wrote exhibition histories from memory) had spawned 118 institutions +
   305 EXHIBITED_AT edges stamped `confidence:high` with no source. Stripping
   prose didn't remove that fabricated *structure*. The owner caught it.
   Reverted.
4. **Cull (4be8e49) — superseded** — went back to the clean sweep
   (`b12b15e`) and culled it to digital-art-only via a source-tag rule
   (`cull_digital_art.py`) → 8,653 nodes. Shipped for a while, but the cull
   *trusted the sweep's source tags*, and one class of tag was poison (next).
5. **Bee-QID discovery + two-platform rebuild (May 2026) — THE SHIPPED STATE.**
   The owner could feel the canon was wrong — full of painters, not digital
   artists. Tracing it: the Wikidata gatherer's `DIGITAL_ART_QIDS` list was
   **corrupt**. Every QID resolved to an insect (Q649652 "digital art" = a bee
   species; Q4671798 "generative art" = a moth), a 404, or an unrelated item —
   except **Q1925963 = "graphic artist"**, which via `wdt:P106` matched 3,652
   non-digital painters/sculptors (Duchamp, Miró, Dubuffet). The *same* garbage
   list was duplicated in `derive_curation.py`'s `CONCEPT_VOCAB`, so the concept
   provenance pointed at bees too. The cull couldn't catch this — it trusted the
   tag. **Fix:** delete the tainted sources entirely (MoMA = too broad; Wikidata
   = corrupt QIDs; named-anchors = by-name re-fetch of non-digital theorists),
   correct the QIDs in `derive_curation.py`, quarantine `fetch_wikidata.py`, and
   **re-run the pipeline from the two genuinely-clean platform gatherers
   (Art Blocks + fxhash) only**. The cull, the v1 restore, and every MoMA/
   Wikidata/named-anchors script were `git rm`'d.

So: the **shipped canon is genuine platform + V&A pipeline output** — Art Blocks +
fxhash + V&A gatherers → merge → rule-derived curation. No sweep, no cull, no
Wikidata, no MoMA. The lesson: a deterministic rule that *trusts a corrupt source
tag* is still poison; the fix lives in the producer config, not a downstream filter.
Don't "fix" the doc counts back to 4,558 (clean two-platform, pre-V&A), 8,653
(cull), 1,491 (v1 restore), or 16k (uncut sweep).

6. **V&A Computer Arts Society de-bias pass (May 2026).**
   The clean two-platform canon (4,558 nodes) was correct but *skewed*: every
   artist had minted on Art Blocks or fxhash, so it read as post-2021 crypto-
   native generative art with no historical depth — the 1960s–70s pioneers who
   *invented* the form (Nake, Cohen, Mohr, Molnár, Nees, Noll, Verostko, the
   Computer Technique Group) were structurally absent (no platform token → no
   gatherer saw them). The Wikidata re-attempt that would have added them died
   on Wikimedia-Commons' 429 image throttle vs. the every-artwork-imaged
   invariant. The fix was a source that serves machine-accessible images: the
   **Victoria & Albert Museum** holds the Computer Arts Society collection and
   serves **IIIF** (`framemark.vam.ac.uk`, no bot-throttle). `fetch_va.py`
   (`api.vam.ac.uk/v2` search, `q=computer art&images_exist=1`, individual-maker
   filter so CREATED_BY always resolves) added **1,159 artworks + 207
   practitioners + 6 collectives + 1 institution**, all imaged. Cross-source
   identity is free via NFKD slugs — but in practice only 1 maker overlapped
   (Licia He, on both V&A and Art Blocks); the pioneers are genuinely net-new,
   which is the point. `derive_curation.py` classifies the V&A layer under the
   *non-crypto* lenses (euro-american-institutional + academic-media-art-history)
   and EMBODIES `computer-art`, **reviving PRACTICES** (0 → 213). The embeddings
   keep the eras honestly distinct: the pioneers form a tight internal STYLE_KIN
   cluster and receive **zero** forced cross-era visual edges — the 1968 and 2021
   regions connect through shared *curated* concepts, not fabricated similarity.
   Caveat: V&A images are **not CC0** (unlike Met/Smithsonian) — provenance is
   the V&A; we mirror for graph-renderability with attribution preserved.

7. **fxhash curation pass (May 2026).** With the V&A in, the
   remaining problem was the fxhash layer itself: it dominated the canon (~3,000
   of ~4,600 artworks) and was a *provenance-murky* set (a 2023–2025 slice the
   `--refresh-from-canon` mechanism had been perpetuating from an earlier, non-
   relevance selection — re-running the documented `mintOpensAt ASC` gatherer
   would have produced a *different*, 2021-first set). fxhash is permissionless,
   so an arbitrary slice is mostly low-effort/test mints. Fix: a new additive
   `fetch_fxhash.py --curate` mode that selects by fxhash's own **relevance**
   ranking + a transparent **secondary-market demand gate** (`secVolumeNb` ≥ N —
   collectors trading a work on is near-impossible to fake — OR enough mints with
   high sell-through; stats stored in node metadata for audit). The curated set
   is the collector-validated fxhash *canon* (SMOLSKULL, RGB Elementary Cellular
   Automaton, Dragons …) — which is concentrated in 2021 because that era's work
   had years to accumulate real markets. So each source now contributes its
   **most significant slice**: V&A = 1960s–70s pioneers, Art Blocks = curated
   2020–24 Ethereum generative, fxhash = the 2021 Tezos generative canon. The
   curation reselected (didn't refresh), so the new tokens were net-new and got a
   fresh embed pass; the dropped chronological set's vectors fell out of the
   rewritten sidecar (no orphan-FK crash) and its R2 images linger until pruned.
   The lesson echoes the bee bug from the other side: a *selection* (not just a
   rule) that trusts the wrong signal — here "first N chronological" — is its own
   kind of poison; fix it at the producer's selection criteria.

8. **SuperRare genesis pass (May 2026) — THE CURRENT STATE.** The augmenting
   move the SuperRare investigation recommended (see the agent report): the canon
   was still all *generative* on the crypto side. SuperRare adds curated 1/1
   Ethereum art via `fetch_superrare.py` (`api.superrare.com/graphql`, no auth).
   Default selection = the **V1 genesis canon** (oldest-first on the 2018 contract
   = the founding of crypto art: XCOPY, Robbie Barrat, videodrome …) — the same
   "most-significant-slice" instinct as the others, deterministic. Images via an
   imgix CDN (no throttle; avif/jpeg, embed-venv-decodable), IPFS original kept as
   provenance → clears `--require-cdn`. Classified crypto-market-native, EMBODIES
   the broad `digital-art` concept (it's 1/1 art, not generative) + artist tags.
   Implementation note: the SuperRare server mis-coerces a GraphQL variable named
   `$take`, so the gatherer inlines pagination. Not CC0 (creator-copyright) —
   thumbnail-mirror posture documented, like the V&A. Open item: curated "Spaces"
   aren't API-enumerable, so this targets the flagship contract; Space-targeting
   needs an external contract list (a follow-up).

So: the **shipped canon is genuine four-source pipeline output** — Art Blocks +
curated-fxhash + V&A + SuperRare gatherers → merge → rule-derived curation. Each
source is its most-significant slice, not a dump (curated generative / 2021 fxhash
canon / 1960s–70s computer-art spine / 2018 crypto-art genesis). Don't "fix" the
doc counts back to 5,930 (V&A pass, pre-curation) or 4,558 (two-platform). **Trust
[`seed/STATS.md`](seed/STATS.md)** — it's generated from the canon and can't drift.

### Canonical path — `seed/*.json` via `seed-consolidated.ts`

The flat JSON files in `seed/` map 1:1 to schema rows (nodes, edges, signals, contributors, node_aliases). `seed/_build/` contains the offline Python pipeline. Every gatherer conforms to [`seed/_build/PRODUCER_CONTRACT.md`](seed/_build/PRODUCER_CONTRACT.md) — read that file before writing any new gatherer. It's the load-bearing one.

**How the shipped canon is produced — the platform + V&A pipeline.** Clean *by construction*: `merge_batches.py` assembles canon from only the batches present in `seed/_build/runs/<YYYY-MM>/`, so if the only batches are Art Blocks + fxhash + V&A, off-domain rows physically cannot enter. There is no cull/filter step (beyond `--require-cdn`, which only drops imageless artworks).

Note the **mirror-before-cull ordering** for any source with net-new images (the V&A pass): `--require-cdn` drops artworks absent from `image_mirror.json`, but the mirror reads `nodes.json`, so the *first* merge must be plain (no cull) or the new artworks vanish before they can be mirrored.

```bash
rm -rf seed/_build/runs/*                                   # 1. clean batch dir
seed/_build/.venv/bin/python3 seed/_build/fetch_artblocks.py            # 2. Art Blocks core (V0/V1/V3)
seed/_build/.venv/bin/python3 seed/_build/fetch_fxhash.py --curate --top 1200 \
    --min-secondary-sales 10 --min-minted 40 --min-sellthrough 0.7      # 3. curated fxhash (relevance + demand gate); --preview first to calibrate
seed/_build/.venv/bin/python3 seed/_build/fetch_va.py                   # 4. V&A "computer art" (imaged, IIIF)
seed/_build/.venv/bin/python3 seed/_build/fetch_superrare.py            # 4b. SuperRare V1 genesis 1/1 canon (2018-19)
seed/_build/.venv/bin/python3 seed/_build/merge_batches.py --no-validate           # 5. PLAIN merge — net-new imgs present so the mirror can see them
seed/_build/.venv/bin/python3 seed/_build/upload_to_r2.py --mirror                 # 6. mirror new images → image_mirror.json (MIRROR BEFORE CULL/EMBED)
seed/_build/.venv/bin/python3 seed/_build/merge_batches.py --require-cdn --no-validate  # 7. cull imageless, re-assemble
seed/_build/.venv/bin/python3 seed/_build/derive_curation.py           # 8. rule-derived editorial batch (V&A + tag aware)
seed/_build/.venv/bin/python3 seed/_build/merge_batches.py --require-cdn            # 9. fold curation in
seed/_build/.venv/bin/python3 seed/_build/validate_seed.py --canon     # 10. 0 errors / 0 warnings
seed/_build/.venv/bin/python3 seed/_build/gen_stats.py                 # 11. regenerate seed/STATS.md (the count source of truth)
# then embed → project → cull_orphans → seed (next section)
```

All three gatherers are **deterministic** (Art Blocks orders `project_id asc`; fxhash pages `skip/take` with `sort:{mintOpensAt:"ASC"}` — chronological from token #0; the V&A search orders by `systemNumber`), and node IDs embed the source's external id (`artwork:delineation--fxhash-31648`, `artwork:running cola is africa--va-o1034089`), so a re-run returns the same artworks with the same IDs — only newly-minted/accessioned items append. That's what makes the embedding/image cache reuse work (see below). `derive_curation.py` emits the rule-based editorial layer (8 base concepts + tag-concepts + A(DAI) regime + 5 sub-regimes + CLASSIFIED_BY + EMBODIES `generative-art`/`computer-art` + attested tag-EMBODIES + V&A-maker PRACTICES). **PRACTICES is 213** (V&A makers → computer-art); it was 0 on the platform-only base (QID-derived, and platform artists carry no QIDs) — the V&A pass revives it. The validator enforces the contract: every row has a signal_id, no narrative metadata without a sibling source URL (anti-enrichment), no orphan edges, no auto-derived edge types in canon.

**Tag-derived concepts (the EMBODIES enrichment).** fxhash artworks carry artist-applied `tags` (source-attested). `derive_curation.py` frequency-gates them (`--tag-min-artworks`, default 25, `TAG_STOPLIST` for noise) and mints a `concept:<tag>` node per surviving tag, then emits **attested `EMBODIES` artwork→tag-concept at confidence 1.0** (Tier 1 — the artist wrote the tag; tags whose slug matches a base concept fold in rather than duplicate). On top of that, the embedding pipeline's **Tier-2 concept propagation** (see the embedding section) adds *inferred* low-confidence EMBODIES for visually-similar untagged works. So EMBODIES stops being one flat `generative-art` target and is a real vocabulary: base concepts + tag-concepts (counts in [`seed/STATS.md`](seed/STATS.md)), spanning attested fxhash-tag EMBODIES + every V&A artwork → `computer-art` + Tier-2 inferred. `TAG_STOPLIST` is populated (drops `nft`/`tezos`/tool/promo tags + the `artsofchet` handle). Two-tier provenance: Tier-1 EMBODIES are confidence 1.0 in `seed/edges.json`; Tier-2 are confidence `low`, `created_by='embedding-multimodal-v1'`, baked into `seed.db` but never in the committed JSON. Note: the tag-concept set is smaller on the curated fxhash canon than on the old chronological dump — fewer artworks clear the ≥25 frequency gate, which is correct (the curation kept quality, not breadth). **Two ways to move the fxhash set:** `fetch_fxhash.py --refresh-from-canon` re-pulls the *exact* current token ids (no reshape, embeddings stay aligned, no Gemini spend — for adding tags/fields to an existing set); `fetch_fxhash.py --curate` deliberately *reselects* by relevance + demand gate (reshapes the set → the net-new tokens need a fresh embed pass).

**The `--require-cdn` image invariant.** `merge_batches.py --require-cdn` drops every artwork node lacking a mirrored R2 cdn (read from `image_mirror.json` / `image_overlay.json`), cascading its edges + aliases (practitioners are *not* cascaded — a creator who loses all artworks stays). So **every canon artwork has a real, mirrored image** — no blank nodes in `/graph` or `/field`. The 26 imageless artworks (oversized fxhash >25 MB renders + a few dead urls) were culled this way.

**`cull_orphans.py` — the R2 + embedding janitor.** `seed/_build/cull_orphans.py` finds (a) embedding rows whose node_id left the canon and (b) R2 objects no longer referenced by any cdn (nodes.json + the two image sidecars). Default dry-run; `--apply` rewrites `embeddings.{bin,json,umap2d.json}` (recomputing offsets, atomic), `--delete` removes orphan R2 objects (batched, with a refuse-if-<100-referenced bucket-wipe guard). Run `--apply` after any cull so the embeddings stay FK-consistent with the canon (`node_embeddings` has an FK to `nodes` — a stale vector crashes the seeder). May 2026: reclaimed 2.6 GiB of orphan R2 left by the wikidata/refetch experiments.

**Regenerating canon with tags (this PR's materialisation step — needs network + `.venv` + `GEMINI_API_KEY`).** The gatherer + derive changes are automatic; run the standard pipeline above, then the cache-reuse embed → project → seed. Two caveats unique to this change: (1) the new chronological fxhash sort changes *which* ~3,000 tokens are pulled (oldest-first now), so node IDs shift and the embedding cache only partially reuses — the new tokens need a Gemini embed pass (`embed_nodes.py` handles it incrementally); (2) tags are stored in artwork metadata but deliberately **not** fed into the embedding text, so already-embedded tokens keep their vectors (no re-embed for unchanged nodes). After seeding, `npm run embed:derive` (chained by `seed:consolidated`) runs Tier-2 propagation automatically.

**Cache reuse on re-run** (the expensive steps skip unchanged nodes):
```bash
seed/_build/.venv/bin/python3 seed/_build/upload_to_r2.py --mirror   # only new tokens' images upload (content-addressed)
seed/_build/.venv/bin/python3 seed/_build/embed_nodes.py             # reuses vectors by (text_hash,image_hash) — only new tokens hit Gemini
seed/_build/.venv/bin/python3 seed/_build/project_umap.py
rm -f adai.db && npm run seed:consolidated                           # chains the capped embed:derive
```
Keep `seed/embeddings.{bin,json}` + `seed/image_mirror.json` across rebuilds — that's the cache. Cache reuse holds whenever node ids are stable (same source selection). A *reselection* breaks it on purpose: the fxhash curation pass swapped the murky chronological set for the relevance+demand `--curate` set, which barely overlapped, so its ~1,173 artworks were all net-new (fresh Gemini multimodal embeds + R2 mirrors); the V&A + Art Blocks vectors reused unchanged. `embed_nodes.py` rewrites a fresh sidecar for the current node set, so dropped-source vectors fall out cleanly (no orphan-FK crash on reseed). The dropped set's R2 images linger until pruned — `image_mirror.json` is cull-safe, so reclaim them via `cull_orphans.py` after pruning the sidecar.

**Expanding the canon ("try more").** Add a *correctly-configured* source: a new gatherer, or re-enable `fetch_wikidata.py` after curating real digital-art **occupation** QIDs (its genre QIDs are already corrected; the occupation list is intentionally empty — see the quarantine banner in that file). New batch in `runs/` → merge → derive → cache-reuse embed → seed. Never hand-edit canon; never re-add the corrupt QID list.

Deleted in the May-2026 cleanup (recoverable from git history): the cull (`cull_digital_art.py`), the v1 restore (`restore_canon.py`), every dropped-source gatherer (`fetch_moma*`, `fetch_wikidata_v3*`, `fetch_named_anchors*`, `fetch_met_openaccess`, `fetch_objkt_tags_v3`, `fetch_fxhash_tags_v3`), and the whole `seed/_build/archive/` tree (frozen 2026-04 migrations + legacy). The current `seed/_build/` is only the live two-platform pipeline + embedding/image tooling.

See `seed/_build/README.md` for the producer map, `seed/SOURCES.md` for the six selection criteria + methodology, `seed/COVERAGE.md` for the gap analysis.

### Roadmap — toward a dynamic, patch-synced canon (NOT now; design intent)

The static-build model (gatherers → `seed/*.json` → bake `seed.db` → redeploy →
wipe `/data`) is a **prototype convenience for a curated seed under deadline**,
not the destination. Captured here so the direction isn't lost:

- **Gathering shouldn't stay static.** The end-state is gatherers as *scheduled
  contributors* that diff the platform against the live DB and write new
  nodes/edges through the **same governed `/api/v1` path** (idempotent via the
  deterministic IDs + alias table we already have), instead of emitting JSON +
  redeploy. `embed-on-write` + the nightly derive already pick up live writes.
  Later still: the archivist calls gathering *on demand* ("I don't have this
  artist — fetch them now") — gathering becomes a tool, not a cron job.
- **`seed/*.json` should graduate to a snapshot format, not the transport.**
  CR-SQLite already speaks deltas (`crsql_changes`): ship a compressed CRDT
  changeset and `apply` it to the live volume — **idempotent by construction**
  (CRDT merge handles ordering/dedup/conflict-with-provenance). That replaces
  the whole reseed-bake-wipe-redeploy dance and **deletes the volume-wipe
  gotcha** (you apply, you don't wipe). It's also how forks/instances sync —
  the Matryoshka story. Keep periodic committed JSON snapshots as the *legible,
  git-diffable, auditable checkpoint* (the binary patch isn't reviewable; the
  whole "audit targets contracts" discipline leans on a readable canon).
- **The trap — dynamic RAISES governance stakes, never lowers them.** The bee
  bug was a static error a human caught by eyeballing a file. At ingestion
  velocity with no committed file to diff, a corrupt-source-tag rule poisons
  the live graph faster than anyone notices. So **before** going dynamic, the
  validator + anti-enrichment + the `--require-cdn` invariant + provenance must
  move onto the **live write boundary** (they're currently build-time gates).
  Dynamic ingestion on top of build-time-only governance = the contamination
  back, but live.
- **Embeddings are a separate channel.** `node_embeddings` / UMAP are *local*
  tables, not CRRs (vectors must not sync as CRDT). A CRDT patch covers the
  graph; the vectors still ride `embed-on-write` + nightly derive. Two
  coordinated channels, not one.
- **Sequencing instinct:** (1) make the practitioner contribution loop solid —
  that's the Basel value AND it forces the live-write governance to be real;
  (2) retarget the gatherers to write through it incrementally; (3) on-demand
  agent gathering last. Each step hardens the governance the next one leans on.

ID convention: `<type>:<name>` with spaces preserved and lowercase (e.g. `practitioner:casey reas`, `artwork:fidenza`, `classification_regime:a(dai) seed canon v1 (april 2026)`). The `slug` field is the kebab-case URL-safe form (produced by `seed/_build/_slug.py`'s `node_slug`).

Seed signals (15 in `seed/signals.json`): the 12 original v1 provenance batches (seed-taxonomy, enrichment, the April-28 real-source + named-anchors gatherers) kept as history, plus the v2-era producer signals where they survived, plus `signal:restore-canon-*` stamping the restore. Some are orphaned (their Step-6 rows were stripped) — orphan signals are history, not errors. The migration contributor (`contributor:migration`) is trust tier `reviewed` — contributions attributed to it auto-approve.

Practitioner metadata after restore: **no narrative prose** (stripped). Each carries structural fields only — `wikidata_qid`, `image_url`/`cdn_image_url`, `active_years`, `location`, `seed_category`, `key_works`, `canon_tier: "primary"`, etc. Real bios re-enter via practitioner contribution through the contributor API at `human_primary` trust.

### Image mirror — Cloudflare R2

All node-level image_urls are mirrored into a Cloudflare R2 bucket so the graph stays renderable when upstream URLs rot (dead IPFS gateways like `gateway.objkt.com`, fxhash gateway, Art Blocks, V&A IIIF, Wikimedia rate limits, etc.). **Every canon artwork is mirrored** (content-addressed, enforced by the `--require-cdn` invariant; count in [`seed/STATS.md`](seed/STATS.md)). The bucket also retains images from superseded selections (e.g. the dropped chronological-fxhash set) until pruned — see `cull_orphans.py`.

- **Bucket**: `adai` on account `b0b8de38bb6568e28bcd3d7c86940ee5`. Public base: `https://pub-ebd869876a824a5e83dbb2fe42d03211.r2.dev`. CORS allows `GET`/`HEAD` for `*`.
- **Key scheme**: content-addressable, `images/{sha256[:2]}/{sha256}.{ext}` — same image under two source URLs dedups automatically. Cache-Control is `public, max-age=31536000, immutable`, so browsers can keep them forever.
- **Per-node fields** (in `metadata`, both stored, both exposed by the API): `image_url` (upstream provenance) + `cdn_image_url` (R2). Profile pages prefer `cdn_image_url` when rendering. Don't drop `image_url` — provenance matters for an arts knowledge commons.
- **Uploader**: `seed/_build/upload_to_r2.py` (Python, runs from `seed/_build/.venv/bin/python3`). Idempotent: skips nodes that already carry `cdn_image_url`, and HEAD-checks the R2 key before re-uploading. Includes a fallback for the dead `gateway.objkt.com` IPFS gateway (tries `ipfs.io` → `nftstorage.link` → `dweb.link`) and per-host concurrency caps to dodge Wikimedia 429s. Reads R2 credentials from project-root `.env` (gitignored): `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE`. Run with `seed/_build/.venv/bin/python3 seed/_build/upload_to_r2.py`; `--dry-run` and `--limit N` are available for testing.
- **Workflow**: when ingesting new images via the `seed/_build` fetchers, just write `image_url` into `seed/nodes.json` and re-run the uploader — it'll find the new entries and write `cdn_image_url` back. No runtime R2 dependency: the cooked DB carries the URLs, the server never talks to R2.

#### Mirror sidecar — `seed/image_mirror.json` (cull-safe `cdn_image_url`)

> **Use `upload_to_r2.py --mirror`, NOT the default `nodes.json`-writing mode, on the cull canon.**

The default `upload_to_r2.py` (no flag) writes `cdn_image_url` back into `seed/nodes.json`. That's fine for hand-maintained canon, but **`nodes.json` is pristine pipeline output** (`merge_batches.py`) — a pipeline re-run regenerates `nodes.json` and **silently drops every `cdn_image_url`** written into it. You'd lose the mirror on every rebuild and re-fetch all upstream images to recompute the content-addressed keys.

`--mirror` solves this. It mirrors every `nodes.json` `metadata.image_url` to R2 exactly like the default, but records the cdn in a **separate committed sidecar `seed/image_mirror.json`** (`[{node_id, image_url, cdn_image_url}]`, keyed by node_id) that the cull never touches. It survives rebuilds.

- **Producer**: `seed/_build/.venv/bin/python3 seed/_build/upload_to_r2.py --mirror` (`--dry-run`, `--limit N`, `--workers` available). Idempotent: skips a node whose mirror entry already records the same `image_url` with a cdn; re-mirrors when the upstream `image_url` drifted (source data moved) or the node is new. Covers **all** typed images (artworks + practitioner portraits + …), not just artworks. `--overlay` and `--mirror` are mutually exclusive.
- **Read by `embed_nodes.py`** (`load_mirror_images()`): for an artwork that already has `image_url`, the mirror's cdn is injected so `pick_image_url` returns the **stable R2 copy** — the multimodal embedder fetches from R2 instead of rotting/rate-limited upstream (fxhash gateway, Art Blocks, MoMA signed URLs), avoiding silent text-only fallback. **⚠️ ALWAYS `--mirror` BEFORE RE-EMBEDDING — mirror first, embed second, ALWAYS (see the loud callout in the Embedding pipeline section).**
- **Applied by `seed-consolidated.ts`** after the image-overlay block, before the WAL checkpoint: sets `cdn_image_url` **additively** on nodes that have `image_url` but no cdn (the inverse of the gap-fill overlay, which only touches imageless nodes). Never overwrites `image_url`; skips when the node's current `image_url` drifted from the mirror's recorded one (stale-cdn guard → re-run `--mirror`). Look for `Image mirror applied: N nodes (M skipped)` in the seeder log.
- **Three image carriers, three jobs — don't cross them**: `nodes.json` = images that arrived *with* a fetcher batch (`apply_image_patches.py`); `image_overlay.json` = gap-fill for *imageless* nodes (`find_missing_images.py --apply` + `upload_to_r2.py --overlay`); `image_mirror.json` = R2 cdn for nodes that *already* have `image_url` (`upload_to_r2.py --mirror`). All three are committed and applied at seed time; only the mirror and overlay survive a cull re-run.

### Image coverage tooling — sanitize + find-missing + overlay apply

Two `seed/_build` producers + a build-time DB-patch mechanism keep images healthy and fill gaps. They are **producers, not editors**: they propose; canon never moves through a hand-edit. **`seed/nodes.json` is never mutated by these tools** — approved images live in `seed/image_overlay.json`, which `seed-consolidated.ts` applies as metadata `UPDATE`s after the node `INSERT` loop (image-only, gap-fill, idempotent, before the WAL checkpoint). The baked `seed.db` ships the images; `nodes.json` stays pristine. May 2026 first pass: **89 previously-imageless nodes filled** via the overlay (54 institution / 25 practitioner / 7 scene / 2 collective / 1 platform); ~560 still imageless (the long tail Wikidata + agentic web-search can't authoritatively cover — tracked in #23). `sanitize_images.py` + `find_missing_images.py` are stdlib-only (no venv needed) and use a descriptive User-Agent (Wikimedia 403s the default urllib UA).

- **`sanitize_images.py`** (read-only) — HEAD/GET-checks every `image_url` + `cdn_image_url`, classifies each node `ok` / `upstream_rotted` (mirror alive, upstream dead — fine) / `cdn_dead` (re-mirror with `upload_to_r2.py`) / `both_dead` (proposes an IPFS-gateway or Wayback fallback). Healing is `upload_to_r2.py`'s job; this only diagnoses. Report → `seed/_build/image_sanitize_report.json` (gitignored). Flags: `--types`, `--limit`, `--no-upstream`, `--workers`. **Known data-quality issue**: 48 Rhizome-artbase artworks (`artbase.rhizome.org` upstream) are flagged `both_dead` — the R2 mirror was populated with HTML landing-page bytes by an earlier `upload_to_r2.py` run that had no content-type guard. The guard is now in place (refuses non-`image/*` responses), preventing future repeats, but healing the existing 48 needs a Rhizome-aware fetcher that extracts the artwork screenshot from each landing page (`<meta property="og:image">` or the main `<img>`) — not yet built; ~50-line follow-up tracked in #22.
- **`find_missing_images.py`** — proposes images for imageless nodes. Tier 1: Wikidata QID from `seed/aliases.json`, else a `P31`-type-verified name search → `P18`/`P154`. Tier 2: `--agentic` (experimental; needs `ANTHROPIC_API_KEY`) LLM web search via `claude-haiku-4-5` + `web_search_20250305` for the long tail. Every candidate is HEAD-validated to a live image and provenance-stamped (QID + property, or `agentic-websearch` + source page). **Artworks are never name-searched** (generic-title slug collisions, e.g. `artwork:untitled`) — QID-alias only. Confidence: `high` = QID-alias · `medium` = type-verified search · `low` = unverified (eyeball — a few are subject misfires, e.g. `Sónar`→SonarQube, `teamLab`→ONLYOFFICE, `Metro Pictures`→an old film studio, `Darmstadt`→the city not the New Music summer courses). Stages to `seed/_build/image_candidates.json` (committed, reviewable). **`--apply --write`** merges approved candidates into `seed/image_overlay.json` — **never into `nodes.json`**.
- **`upload_to_r2.py --overlay`** — reads `seed/image_overlay.json`, mirrors each `image_url` to R2 (content-addressed, same key scheme as the nodes.json path), and writes `cdn_image_url` back into the overlay. The default (no flag) still mirrors `nodes.json` for the pre-existing 393 images. Both modes refuse responses whose content-type isn't `image/*` (defense against the Rhizome regression above). Wikimedia rate-limits aggressively (HTTP 429); per-host cap is 2 concurrent, and re-running `--overlay` is idempotent (only retries entries still missing `cdn_image_url`) so 429-failed mops up in subsequent passes.
- **Overlay apply (`src/seed-consolidated.ts`)** — after the node `INSERT` loop and before the WAL checkpoint, each overlay entry's image fields are merged into the matching node's metadata via `UPDATE nodes SET metadata=…`. Image-only, gap-fill (never overwrites an existing image), idempotent. Look for `Image overlay applied: N nodes (M skipped)` in the seeder's log. `embed_nodes.py` reads the same overlay (via `load_overlay_images()`) so an artwork image supplied via the overlay still reaches the multimodal embedder — no-op when the overlay holds only non-artwork types (the common case), since only `artwork` is in `TYPES_WITH_IMAGE`.

**Data flow** — so no one routes images through the wrong path:

```
seed/_build/find_missing_images.py            proposes
        │   writes seed/_build/image_candidates.json (committed, reviewable)
        ▼
  [human reviews — sets "approved": true on keepers]
        │
        ▼
find_missing_images.py --apply --write        stages
        │   merges approved candidates into seed/image_overlay.json
        ▼
upload_to_r2.py --overlay                     mirrors to R2
        │   writes cdn_image_url back into seed/image_overlay.json
        ▼
  [git add seed/image_overlay.json + seed/_build/image_candidates.json + commit]
        │
        ▼
npm run seed:consolidated   (locally or in Docker builder)   applies
        │   reads seed/image_overlay.json, runs UPDATE nodes SET metadata=…
        ▼
adai.db / seed.db                             carries the images
```

`seed/image_overlay.json` is **committed, not gitignored** — that's how the Docker builder bakes the images into the shipped `seed.db` (the builder runs `seed:consolidated` after `COPY seed/ ./seed/`). Sample entry:

```json
{
  "node_id": "institution:moma",
  "type": "institution",
  "name": "MoMA",
  "image_url": "https://commons.wikimedia.org/wiki/Special:FilePath/Museum_of_Modern_Art_logo.svg",
  "cdn_image_url": "https://pub-…r2.dev/images/ab/abc…def.svg",
  "image_provenance": { "source": "wikidata", "qid": "Q188740", "property": "P154", "match": "search_verified" }
}
```

**Two image-add paths — don't confuse them:**

- **Overlay** (this section, `find_missing_images.py` + `upload_to_r2.py --overlay`) — for filling image gaps on nodes that *already exist* in the seed. Writes `seed/image_overlay.json`. Applied at seed time by `seed-consolidated.ts`. `nodes.json` is untouched.
- **`apply_image_patches.py` (older path)** — for new artwork batches *ingested with* their images together (MoMA / Met / Art Blocks / fxhash / Wikidata fetchers). Reads `seed/_build/image_patches/*.json` (fetcher output) and merges into `seed/nodes.json` directly. Used by the fetcher pipeline; unchanged by the overlay work. Don't route gap-fill images through it, and don't route fetcher-discovered images through the overlay.

**Don't hand-edit `seed/nodes.json` or `seed/image_overlay.json`.** Hand-edits look right locally but lose provenance and get clobbered the next time a producer runs. Use `find_missing_images.py --apply --write` (gap-fill), an existing fetcher (new batches), or the contributor API (`POST /api/v1/images`) at runtime. The overlay's `image_provenance` block is what makes every image traceable back to a Wikidata QID + property or an agentic web-search page — preserve that.

**Full run sequence (needs a machine with `.env` R2 creds + `seed/_build/.venv`; `GEMINI_API_KEY` only if re-embedding artworks; `ANTHROPIC_API_KEY` only for `--agentic`):**
```bash
# 1. find candidates (no creds for tier-1; --agentic needs ANTHROPIC_API_KEY exported)
python3 seed/_build/find_missing_images.py --types institution platform scene collective practitioner
# (optional Tier 2 long-tail pass)
ANTHROPIC_API_KEY=... seed/_build/.venv/bin/python3 seed/_build/find_missing_images.py --agentic --types ...
# 2. review seed/_build/image_candidates.json — set "approved": true on keepers,
#    OR auto-accept a confidence tier (medium is type-verified and safe; low needs eyes).
python3 seed/_build/find_missing_images.py --apply --accept-confidence medium --write
# → merges approved candidates into seed/image_overlay.json (NOT nodes.json)
# 3. mirror to R2 (needs .env R2_* creds) — writes cdn_image_url back into the overlay
seed/_build/.venv/bin/python3 seed/_build/upload_to_r2.py --overlay
# 4. re-seed locally to verify (look for "Image overlay applied: N nodes" in the seeder's log)
rm -f adai.db adai.db-shm adai.db-wal && npm run seed:consolidated
# 5. ONLY if the overlay added ARTWORK images: re-embed + re-project + re-commit the sidecars.
#    Non-artwork overlays are a provable no-op for embed_nodes.py (practitioner/collective/scene
#    are text-only; institution/platform are non-embeddable; so image_hash never changes).
seed/_build/.venv/bin/python3 seed/_build/embed_nodes.py
seed/_build/.venv/bin/python3 seed/_build/project_umap.py
git add seed/image_overlay.json seed/_build/image_candidates.json
# + (step 5 only) seed/embeddings.{bin,json,umap2d.json}
git commit
```
`--apply` without `--write` is a dry-run. It never overwrites a node that already has an image (idempotent), and never touches `nodes.json` or `edges.json`. Skipping step 5 is safe **for non-artwork batches** — those types either don't embed images (institution/platform aren't even in `EMBEDDABLE_TYPES`) or are text-only (practitioner/collective/scene have no images in their embedding inputs by design), so STYLE_KIN/VISUALLY_AFFINE/embed-space are unaffected.

### Canon corrections — `seed/canon_overlay.json`

The image overlay (above) established a pattern: a committed, provenance-bearing, build-time-applied file that adds/corrects data without ever hand-editing `seed/*.json`. `canon_overlay.json` generalises it for **corrections** (not new ingestions — new ingestions still go through gatherers writing to canon files directly).

`seed-consolidated.ts` applies it after the edge INSERT loop and before the WAL checkpoint, in this order — referential integrity matters:
1. `add_signals` — new signals (a supersession's `invalidated_by` may reference one).
2. `add_nodes` — new nodes (a new edge may reference these).
3. `add_edges` — new edges.
4. `supersede_edges` — `UPDATE edges SET valid_until = ?, invalidated_by = ? WHERE id = ? AND valid_until IS NULL` (idempotent — re-runs don't shift `valid_until` forward).

Use it when:
- The producer model can't fix a bug retroactively (the existing collided rows in canon were already shipped — fix the producer + supersede the old).
- A curator decides an edge or claim needs to be retired (bi-temporal supersession is the schema's correction primitive — *never* delete).
- A manual addition has no natural producer but needs provenance attached.

**Don't use it for:**
- New ingestion batches — those belong in a gatherer or `apply_image_patches.py` (write to `seed/nodes.json` / `seed/edges.json` as a producer).
- Bulk image gap-fill — that's `seed/image_overlay.json` (different shape, different apply step, image-only).
- "Cleanup" passes that aren't real corrections — the CLAUDE.md banner still applies.

Every overlay entry MUST carry a `signal_id` and `invalidated_by` linked to a signal in `add_signals` (or an existing one). The `reason` field on a supersession is human-readable and lives only in the overlay file — it doesn't enter the DB.

**Example: the May 2026 slug-disambiguation pass** (the first use of this mechanism, PR #25). Two artworks had collided slugs — `artwork:untitled` accumulated 3 unrelated CREATED_BY edges from 3 gatherers (Vera Molnár / American Artist / Harold Cohen); `artwork:black hole` accumulated 2 (Suzanne Treister / Addie Wagenknecht). The producer-side fix (`seed/_build/_slug.py` — generic-title disambiguation via source+external_id) closed the gap for future runs; the existing canon was corrected via this overlay: 5 disambiguated nodes added (`artwork:untitled--american-artist` etc.), 8 new edges pointing at them, 8 supersessions of the colliding edges, anchored by `signal:slug-disambiguation-2026-05`. Look for `Canon overlay applied: …` in the seeder's log. The old `artwork:untitled` / `artwork:black hole` nodes remain as historical husks (their live edges are all superseded — `/api/graph` shows no creator until queries are widened to historical state).

### Legacy path — `results/*.json` via `seed.ts`

Each JSON in `results/` has: basic_info, practice_description, key_works, commons_orientation, governance_model, network_position (connections, scene_affiliation), and more. The legacy seed creates practitioner/concept/scene/related nodes + PRACTICES/BELONGS_TO/RELATED_TO edges from those fields. All rows tagged `confidence: 'low'`, `created_by: 'migration'`, `batch_id: 'seed-migration-2026-04-20'`. ID convention is kebab-dash (`practitioner-casey-reas`) — **do not mix with the canonical path in the same DB**.
