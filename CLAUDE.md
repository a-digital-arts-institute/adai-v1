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
  _build/                 — offline Python pipeline (fetch_artblocks, fetch_fxhash gatherers + merge_batches + derive_curation + validate_seed + embed/image tooling); produces seed/*.json. fetch_wikidata.py is present but QUARANTINED (corrupt QID list — see its banner)
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

> **⚠️ What ships right now: the clean two-platform canon (4,509 nodes, May 2026).**
>
> The canon is the genuine output of two source-of-truth gatherers —
> **Art Blocks + fxhash** — plus the rule-derived editorial layer. Every node
> traces to an on-chain generative artwork or its artist. There is **no MoMA,
> no Wikidata, no named-anchors** layer: those were dropped after the Wikidata
> `digital_art_qids` list was found to be **corrupt** (a bee species, moths,
> "combat", and "graphic artist" — the last alone dragged 3,652 non-digital
> painters/sculptors, Duchamp and Miró among them, into a generative-art canon).
> See "The rebuild journey" below for the full story. The canon is now clean
> **by construction**: `merge_batches.py` assembles it from only the two clean
> batches, so off-domain rows can't enter — no filter/cull step exists.
>
> If `git log` or older doc revisions mention 8,653 nodes (digital-art cull),
> 1,491 (v1 restore), or 16,244/16,351 (uncut sweep), those are all superseded.
> Trust the counts below.

**Node types** — live in Seed Canon (4,509 nodes total, May 2026, from the Art Blocks + fxhash pipeline): artwork (3,477), practitioner (1,016), concept (8), classification_regime (6 — A(DAI) canonical lens + 5 sub-regimes), platform (2 — Art Blocks, fxhash). Schema reserves `institution`, `scene`, `collective`, `publication`, `project`, `event`, `related` — empty. Every practitioner is a platform-native generative artist (Art Blocks or fxhash); every artwork is an on-chain generative token. No node carries a Wikidata occupation/movement QID anymore — the contamination is gone at the root. New practitioners/artworks enter via the contributor API or by re-running the gatherers; broader sources (a *correctly-configured* Wikidata, objkt, etc.) are the "try more later" path — see `fetch_wikidata.py`'s quarantine note before re-enabling it.

**Edge types** — 9 curated + 2 auto-derived. Curated counts (May 2026, two-platform pipeline): CLASSIFIED_BY (6,954 — every artwork → A(DAI) lens + crypto sub-regime), CREATED_BY (3,477), EXHIBITED_AT (3,477), EMBODIES (3,477 — every artwork → generative-art), PRACTICES (0 — was QID-derived; platform artists carry no QIDs, so it's empty until a QID-bearing source returns), BELONGS_TO / COLLABORATES_WITH / USES_TECHNIQUE / INFLUENCES (0 — reserved). Auto-derived from `npm run embed:derive`, refreshed by the daily `embed-derive-daily` GitHub Actions workflow: STYLE_KIN (creator ↔ creator, ~694 rows), VISUALLY_AFFINE (artwork ↔ artwork, ~9,052 rows) — bounded by the per-node mutual-kNN cap. The canonical edge-type list lives in [seed/SOURCES.md](seed/SOURCES.md), which adds one intentionally empty edge: **RESPONDS_TO** (artwork → artwork) — zero because it requires evidence of artist intent, not thematic similarity. It's the highest-value edge type for Basel-floor practitioner contributions. `db.sql` has no CHECK constraint on `edge_type`. When adding rows, prefer the existing 9 unless the relation is genuinely new, and update these counts rather than letting them drift.

**Embedding pipeline** (Gemini Embedding 2, multimodal, 768-d, L2-normalised): batch embed lives in Python under `seed/_build/embed_nodes.py` and writes `seed/embeddings.{bin,json}` (committed alongside the seed JSONs — the Docker builder needs them in context). `src/seed-consolidated.ts` reads the sidecar into the local-only `node_embeddings` table. Derive lives in TypeScript: `npm run embed:derive` chains `centroids → derive`, recomputing style centroids for both **practitioners and collectives** from live `CREATED_BY` edges (artwork → creator direction) and emitting STYLE_KIN + VISUALLY_AFFINE rows plus SUGGESTS_CREATED_BY proposals into `intake_queue` (`kind='ai_suggestion'`). Calibrated thresholds (May 2026): τ_attribute=0.88, τ_kin=0.91, τ_visual=0.84 — override via `TAU_ATTRIBUTE`, `TAU_KIN`, `TAU_VISUAL` env vars. Curators approve attributions at `/review?kind=ai_suggestion`; rejected pairs land in `rejected_ai_suggestions` so the next derive run skips them. These proposals often surface real **attribution gaps** in the seed — artworks whose only `CREATED_BY` edge points to a non-practitioner target (project / platform / institution / publication / parent-artwork), so the derive treats them as orphans and proposes the human creator from the closest style centroid. See #24 for the May 2026 Holly+ / Webrecorder / etc. cluster. Every `embed:derive` starts with `DELETE FROM edges WHERE created_by='embedding-multimodal-v1'` so re-runs are clean. Derived edges render dashed in `/field` (press `e` to flip into 'embeddings mode' where they're the foreground). **The pipeline refuses to auto-emit INFLUENCES or RESPONDS_TO** — semantic similarity is the wrong signal for either, by design.

**Threshold drift surveillance**: `npm run embed:report-drift` emits a JSON snapshot of where the hard-coded τ values currently sit in the live similarity distribution (target percentiles: τ_kin ≈ p95, τ_visual ≈ p99, τ_attribute ≈ p99). Drift far from those originals → re-tune by hand using `npm run embed:calibrate`. **Auto-recalibration is intentionally not wired** — that's how the visible graph silently changes shape under contributors and curators.

**Embed-on-write**: contributor-API endpoints (`POST /api/v1/nodes`, `PATCH /api/v1/nodes/:id`, `POST /api/v1/images`) and curator-approve handlers call `embedNodeAsync(db, nodeId)` from `src/embed/server.ts` immediately after the materialise step. Failures are logged but never block the HTTP response — the daily backfill catches them. Requires `GEMINI_API_KEY` set as a Fly secret (`flyctl secrets set GEMINI_API_KEY=...`); locally, `.env` works because `src/index.ts` calls `process.loadEnvFile()` at startup. Idempotency is `(text_hash, image_hash)` matching the offline pipeline; for backfill the SQL only targets nodes with no existing `node_embeddings` row, so already-embedded nodes are never disturbed.

**Daily re-derive on Fly**: `.github/workflows/embed-derive-daily.yml` runs four stages against the live DB at 04:00 UTC — `embed:backfill` (catches anything that slipped past embed-on-write, calls Gemini), `embed:derive` (propagates curator-approved CREATED_BY edges into STYLE_KIN / VISUALLY_AFFINE / SUGGESTS_CREATED_BY, no API calls), UMAP refresh (re-projects to `/data/embeddings.umap2d.json`, debounced via `/data/umap.lockfile`), then `embed:report-drift`. Triggered manually via `workflow_dispatch` as well. Required secrets: `FLY_API_TOKEN` (repo — an **org-scoped deploy token** minted with `flyctl tokens create org personal --expiry 8760h` and stored via `gh secret set FLY_API_TOKEN < tokenfile`; scoped `deploy` / `ssh` tokens fail the pre-flight `appcompact` GraphQL query that `flyctl ssh console` does, and the deprecated `flyctl auth token` output is multi-line so it must be set from a file to avoid stdin newline mangling); `GEMINI_API_KEY` (Fly). The CLI auto-resolves `/data/adai.db` inside the Fly machine via `src/utils/db-path.ts` — no env config needed in the workflow. UMAP runs on the **GH runner**, not the Fly machine — sklearn/UMAP on the 1-CPU / 512 MB image timed out every run (29 min, hit the 30 min workflow timeout). The runner SSH-exports `node_embeddings` as a compact `AEVB` binary (`node /app/dist/embed/cli.js export-vectors`), fits UMAP in seconds with pip-cached `umap-learn`, then SFTPs the result back to `/data/embeddings.umap2d.json` via a `*.new` sibling path + `mv` swap so the live server never sees a half-written file. Every SSH-using step in the workflow first `curl`-warms `/api/stats` because `fly.toml` has `auto_stop_machines = 'stop'` and SSH activity alone doesn't reset the idle timer (the workflow's per-step boundary is just long enough to fall into that window). The `/api/embed-space` endpoint prefers the volume file over the baked sidecar so contributor-added nodes appear in the scatter within one cron cycle.

**Embedding visualisation surfaces**:
- **Profile pages** (`/practitioner/:slug`, `/artwork/:slug`, `/concept/:slug`, `/scene/:slug`) — append "Style kin" / "Visually affine" / "Style proximity" / "Closest artworks" sections computed on-demand via `src/embed/neighbours.ts`. Practitioner pages also surface pending AI-attribution proposals that name them as the candidate creator.
- **`/neighbours/:type/:slug`** — similarity browser: top-20 cosine neighbours of any node, with knobs for query/candidate kind and type prefix. Shareable URLs.
- **`/field`** — press `e` (or click the chip in the chrome) to fade curatorial edges and foreground STYLE_KIN / VISUALLY_AFFINE.
- **`/embed-space`** — UMAP-projected 2D scatter of all 1,338+ vectors with pan / zoom / hover / type filters / name search. Practitioners cluster by aesthetic, artworks by visual similarity, concepts by semantic field. The projection lives in `seed/embeddings.umap2d.json` (committed alongside the other embedding sidecars — see the "Deploying" section), produced offline by `seed/_build/.venv/bin/python3 seed/_build/project_umap.py` — re-run after any new embed pass. Cosine metric, `n_neighbors=15`, `min_dist=0.1`, `random_state=42` for determinism.

**Trust tiers**: `auto` (founding team + practitioner self-report on own data — auto-merge), `reviewed` (established track record — auto-merge + tagged), `probationary` (default for new contributors — queued for review). The auto-approve check in `POST /api/contribute` treats `auto` and `reviewed` as auto-merge; everyone else goes to the review queue.

**A(DAI) canonical regime**: `classification_regime:adai seed canon v1 april 2026` (slug `adai-seed-canon-v1-april-2026`) is the single canonical lens. Canonical entities declare `CLASSIFIED_BY → classification_regime:adai seed canon v1 april 2026` — these edges are emitted by `derive_curation.py`, not auto-injected at seed time. 3,477 CLASSIFIED_BY edges point to it (one per artwork). The earlier `classification_regime:a(dai)` root (which produced an edge explosion that centred the graph on itself) was retired and its auto-injecting loop in `src/seed-consolidated.ts` was disabled — see the comment block around line 184. Do not reintroduce the auto-injection. Five sub-regimes also exist as nodes (`academic media-art history`, `asia-pacific institutional`, `crypto market-native`, `euro-american institutional`, `practitioner self-report`); on the two-platform canon only **crypto market-native** carries edges (3,477 — every artwork), since every artwork is an on-chain generative token. The other four are reserved for when a non-crypto source returns. Renders gold in `/graph`.

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

# Production (writes against /data/adai.db on the volume)
flyctl ssh console --app adai-basel -C \
  "node /app/dist/cli/issue-token.js --contributor 'Name' --label 'label' --create --tier reviewed"
flyctl ssh console --app adai-basel -C \
  "node /app/dist/cli/revoke-token.js --prefix adai_xxxxxxxx"
```
The CLI resolves its DB path via `src/utils/db-path.ts`: explicit `DB_PATH` env wins, otherwise it prefers `/data/adai.db` if present (Fly volume), falling back to `./adai.db` for local dev. **Don't run the CLI as `node dist/cli/...` without one of those guards** — older versions silently fell back to `./adai.db`, which on Fly creates a throwaway DB at `/app/adai.db` and the token never reaches the running server.

The raw token is printed to **stdout** exactly once. The store keeps only `sha256(token)` and the first 13 characters (`adai_` + 8 hex) for human reference. Issuance is operator-only (no HTTP endpoint).

R2 secrets on Fly: the runtime image-upload path needs `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE` set as `flyctl secrets`. Locally they come from `.env` (the same file `seed/_build/upload_to_r2.py` reads); `src/index.ts` calls `process.loadEnvFile()` at startup when `.env` exists. Without them `POST /api/v1/images` returns `503 r2_not_configured`; the other endpoints still work.

`db.sql` adds `contributor_tokens` (local-only, NOT a CRR). Don't `crsql_as_crr` it — token material must never sync.

## Deploying

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
  On restart, the entrypoint sees no DB and copies the baked one.
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

So: the **shipped canon is genuine two-platform pipeline output** — Art Blocks +
fxhash gatherers → merge → rule-derived curation. No sweep, no cull, no Wikidata,
no MoMA. The lesson: a deterministic rule that *trusts a corrupt source tag* is
still poison; the fix lives in the producer config, not a downstream filter.
Don't "fix" the doc counts back to 8,653 (cull), 1,491 (v1 restore), or 16k
(uncut sweep).

### Canonical path — `seed/*.json` via `seed-consolidated.ts`

The flat JSON files in `seed/` map 1:1 to schema rows (nodes, edges, signals, contributors, node_aliases). `seed/_build/` contains the offline Python pipeline. Every gatherer conforms to [`seed/_build/PRODUCER_CONTRACT.md`](seed/_build/PRODUCER_CONTRACT.md) — read that file before writing any new gatherer. It's the load-bearing one.

**How the shipped canon is produced — the two-platform pipeline.** Clean *by construction*: `merge_batches.py` assembles canon from only the batches present in `seed/_build/runs/<YYYY-MM>/`, so if the only batches are Art Blocks + fxhash, off-domain rows physically cannot enter. There is no cull/filter step.

```bash
rm -rf seed/_build/runs/*                                   # 1. clean batch dir
seed/_build/.venv/bin/python3 seed/_build/fetch_artblocks.py            # 2. ~477 artworks, 297 artists (3 core contracts)
seed/_build/.venv/bin/python3 seed/_build/fetch_fxhash.py --limit 3000  # 3. ~3000 tokens, ~742 artists
seed/_build/.venv/bin/python3 seed/_build/merge_batches.py             # 4. assemble canon (cross-source dedup)
seed/_build/.venv/bin/python3 seed/_build/derive_curation.py           # 5. rule-derived editorial batch
seed/_build/.venv/bin/python3 seed/_build/merge_batches.py             # 6. fold curation in
seed/_build/.venv/bin/python3 seed/_build/validate_seed.py --canon     # 7. 0 errors / 0 warnings
# then reuse the cache (next section) → embed → project → seed
```

Both gatherers are **deterministic** (Art Blocks orders `project_id asc`; fxhash pages `skip/take`), and node IDs embed the on-chain token id (`artwork:delineation--fxhash-31648`), so a re-run returns the same artworks with the same IDs — only newly-minted tokens append. That's what makes the embedding/image cache reuse work (see below). `derive_curation.py` emits the rule-based editorial layer (8 concepts + A(DAI) regime + 5 sub-regimes + CLASSIFIED_BY + EMBODIES `generative-art`); **PRACTICES is empty** on this base (it was QID-derived, and platform artists carry no QIDs). The validator enforces the contract: every row has a signal_id, no narrative metadata without a sibling source URL (anti-enrichment), no orphan edges, no auto-derived edge types in canon.

**Cache reuse on re-run** (the expensive steps skip unchanged nodes):
```bash
seed/_build/.venv/bin/python3 seed/_build/upload_to_r2.py --mirror   # only new tokens' images upload (content-addressed)
seed/_build/.venv/bin/python3 seed/_build/embed_nodes.py             # reuses vectors by (text_hash,image_hash) — only new tokens hit Gemini
seed/_build/.venv/bin/python3 seed/_build/project_umap.py
rm -f adai.db && npm run seed:consolidated                           # chains the capped embed:derive
```
Keep `seed/embeddings.{bin,json}` + `seed/image_mirror.json` across rebuilds — that's the cache. On the May 2026 rebuild, 4,500/4,501 embeddings and 3,451/3,477 images reused (1 Gemini call, 26 uploads).

**Expanding the canon ("try more").** Add a *correctly-configured* source: a new gatherer, or re-enable `fetch_wikidata.py` after curating real digital-art **occupation** QIDs (its genre QIDs are already corrected; the occupation list is intentionally empty — see the quarantine banner in that file). New batch in `runs/` → merge → derive → cache-reuse embed → seed. Never hand-edit canon; never re-add the corrupt QID list.

Deleted in the May-2026 cleanup (recoverable from git history): the cull (`cull_digital_art.py`), the v1 restore (`restore_canon.py`), every dropped-source gatherer (`fetch_moma*`, `fetch_wikidata_v3*`, `fetch_named_anchors*`, `fetch_met_openaccess`, `fetch_objkt_tags_v3`, `fetch_fxhash_tags_v3`), and the whole `seed/_build/archive/` tree (frozen 2026-04 migrations + legacy). The current `seed/_build/` is only the live two-platform pipeline + embedding/image tooling.

See `seed/_build/README.md` for the producer map, `seed/SOURCES.md` for the six selection criteria + methodology, `seed/COVERAGE.md` for the gap analysis.

ID convention: `<type>:<name>` with spaces preserved and lowercase (e.g. `practitioner:casey reas`, `artwork:fidenza`, `classification_regime:a(dai) seed canon v1 (april 2026)`). The `slug` field is the kebab-case URL-safe form (produced by `seed/_build/_slug.py`'s `node_slug`).

Seed signals (15 in `seed/signals.json`): the 12 original v1 provenance batches (seed-taxonomy, enrichment, the April-28 real-source + named-anchors gatherers) kept as history, plus the v2-era producer signals where they survived, plus `signal:restore-canon-*` stamping the restore. Some are orphaned (their Step-6 rows were stripped) — orphan signals are history, not errors. The migration contributor (`contributor:migration`) is trust tier `reviewed` — contributions attributed to it auto-approve.

Practitioner metadata after restore: **no narrative prose** (stripped). Each carries structural fields only — `wikidata_qid`, `image_url`/`cdn_image_url`, `active_years`, `location`, `seed_category`, `key_works`, `canon_tier: "primary"`, etc. Real bios re-enter via practitioner contribution through the contributor API at `human_primary` trust.

### Image mirror — Cloudflare R2

All node-level image_urls are mirrored into a Cloudflare R2 bucket so the graph stays renderable when upstream URLs rot (MoMA signed URLs, dead IPFS gateways like `gateway.objkt.com`, Wikimedia rate limits, etc.). 393 images live there as of May 2 — covers every artwork (335) and practitioner (57) with a known image plus one collective.

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
- **Read by `embed_nodes.py`** (`load_mirror_images()`): for an artwork that already has `image_url`, the mirror's cdn is injected so `pick_image_url` returns the **stable R2 copy** — the multimodal embedder fetches from R2 instead of rotting/rate-limited upstream (fxhash gateway, Art Blocks, MoMA signed URLs), avoiding silent text-only fallback. **Always `--mirror` before re-embedding.**
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
