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
  _build/                 — offline Python pipeline (fetch_moma_csv, fetch_wikidata_artworks/portraits, fetch_fxhash, fetch_artblocks, fetch_met_openaccess + normalisation/dedup tasks); regenerates seed/*.json
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

**Node types** — live in Seed Canon v1 (1,491 nodes total, May 2026 — re-counted from `seed/nodes.json`): artwork (728), concept (435), practitioner (146), institution (121), scene (30), collective (12), platform (8), `classification_regime` (6 — one per ingesting source; makes how an institution/market/platform classifies visible as a structural actor), publication (3), project (2). Schema also reserves `event` and `related` but neither has rows yet. The big jump from the original 1,007 came from the source-attested EMBODIES ingestion pass against MoMA / fxhash / Wikidata / objkt / Rhizome; subsequent passes added Wikidata named-anchors and dropped stale concepts.

**Edge types** — 9 curated + 2 auto-derived. Curated counts (May 2026, re-counted from `seed/edges.json`): EMBODIES (1096), CREATED_BY (737 — of which 20 target collectives, attributing work to 8 distinct groups), PRACTICES (461), EXHIBITED_AT (305), CLASSIFIED_BY (295 — any node → classification_regime that actively positioned it), BELONGS_TO (193), COLLABORATES_WITH (183), USES_TECHNIQUE (102), INFLUENCES (4). Auto-derived from `npm run embed:derive` (will change every run): STYLE_KIN (~792 rows, creator ↔ creator over style centroids — covers both practitioners and collectives, stored bidirectionally), VISUALLY_AFFINE (~404 rows, artwork ↔ artwork, also bidirectional). Exact derive counts shift with every threshold tweak and every contributor approval — use the daily `embed-derive-daily` GitHub Action's log (or `npm run embed:report-drift` locally) for the live numbers. The canonical edge-type list lives in [seed/SOURCES.md](seed/SOURCES.md), which adds one intentionally empty edge: **RESPONDS_TO** (artwork → artwork) — left at zero because it requires evidence of artist intent (statements, interviews, practitioner contribution), not thematic similarity. It's the highest-value edge type for Basel-floor practitioner contributions. `db.sql` has no CHECK constraint on `edge_type` — `RELATED_TO` is used by the legacy `seed.ts` path but is not in the canonical seed. When adding rows, prefer the existing 9 unless the relation is genuinely new, and update these counts rather than letting them drift.

**Embedding pipeline** (Gemini Embedding 2, multimodal, 768-d, L2-normalised): batch embed lives in Python under `seed/_build/embed_nodes.py` and writes `seed/embeddings.{bin,json}` (committed alongside the seed JSONs — the Docker builder needs them in context). `src/seed-consolidated.ts` reads the sidecar into the local-only `node_embeddings` table. Derive lives in TypeScript: `npm run embed:derive` chains `centroids → derive`, recomputing style centroids for both **practitioners and collectives** from live `CREATED_BY` edges (artwork → creator direction) and emitting STYLE_KIN + VISUALLY_AFFINE rows plus SUGGESTS_CREATED_BY proposals into `intake_queue` (`kind='ai_suggestion'`). Calibrated thresholds (May 2026): τ_attribute=0.88, τ_kin=0.91, τ_visual=0.84 — override via `TAU_ATTRIBUTE`, `TAU_KIN`, `TAU_VISUAL` env vars. Curators approve attributions at `/review?kind=ai_suggestion`; rejected pairs land in `rejected_ai_suggestions` so the next derive run skips them. Every `embed:derive` starts with `DELETE FROM edges WHERE created_by='embedding-multimodal-v1'` so re-runs are clean. Derived edges render dashed in `/field` (press `e` to flip into 'embeddings mode' where they're the foreground). **The pipeline refuses to auto-emit INFLUENCES or RESPONDS_TO** — semantic similarity is the wrong signal for either, by design.

**Threshold drift surveillance**: `npm run embed:report-drift` emits a JSON snapshot of where the hard-coded τ values currently sit in the live similarity distribution (target percentiles: τ_kin ≈ p95, τ_visual ≈ p99, τ_attribute ≈ p99). Drift far from those originals → re-tune by hand using `npm run embed:calibrate`. **Auto-recalibration is intentionally not wired** — that's how the visible graph silently changes shape under contributors and curators.

**Embed-on-write**: contributor-API endpoints (`POST /api/v1/nodes`, `PATCH /api/v1/nodes/:id`, `POST /api/v1/images`) and curator-approve handlers call `embedNodeAsync(db, nodeId)` from `src/embed/server.ts` immediately after the materialise step. Failures are logged but never block the HTTP response — the daily backfill catches them. Requires `GEMINI_API_KEY` set as a Fly secret (`flyctl secrets set GEMINI_API_KEY=...`); locally, `.env` works because `src/index.ts` calls `process.loadEnvFile()` at startup. Idempotency is `(text_hash, image_hash)` matching the offline pipeline; for backfill the SQL only targets nodes with no existing `node_embeddings` row, so already-embedded nodes are never disturbed.

**Daily re-derive on Fly**: `.github/workflows/embed-derive-daily.yml` runs four stages against the live DB at 04:00 UTC — `embed:backfill` (catches anything that slipped past embed-on-write, calls Gemini), `embed:derive` (propagates curator-approved CREATED_BY edges into STYLE_KIN / VISUALLY_AFFINE / SUGGESTS_CREATED_BY, no API calls), UMAP refresh (re-projects to `/data/embeddings.umap2d.json`, debounced via `/data/umap.lockfile`), then `embed:report-drift`. Triggered manually via `workflow_dispatch` as well. Required secrets: `FLY_API_TOKEN` (repo — an **org-scoped deploy token** minted with `flyctl tokens create org personal --expiry 8760h` and stored via `gh secret set FLY_API_TOKEN < tokenfile`; scoped `deploy` / `ssh` tokens fail the pre-flight `appcompact` GraphQL query that `flyctl ssh console` does, and the deprecated `flyctl auth token` output is multi-line so it must be set from a file to avoid stdin newline mangling); `GEMINI_API_KEY` (Fly). The CLI auto-resolves `/data/adai.db` inside the Fly machine via `src/utils/db-path.ts` — no env config needed in the workflow. UMAP runs on the **GH runner**, not the Fly machine — sklearn/UMAP on the 1-CPU / 512 MB image timed out every run (29 min, hit the 30 min workflow timeout). The runner SSH-exports `node_embeddings` as a compact `AEVB` binary (`node /app/dist/embed/cli.js export-vectors`), fits UMAP in seconds with pip-cached `umap-learn`, then SFTPs the result back to `/data/embeddings.umap2d.json` via a `*.new` sibling path + `mv` swap so the live server never sees a half-written file. Every SSH-using step in the workflow first `curl`-warms `/api/stats` because `fly.toml` has `auto_stop_machines = 'stop'` and SSH activity alone doesn't reset the idle timer (the workflow's per-step boundary is just long enough to fall into that window). The `/api/embed-space` endpoint prefers the volume file over the baked sidecar so contributor-added nodes appear in the scatter within one cron cycle.

**Embedding visualisation surfaces**:
- **Profile pages** (`/practitioner/:slug`, `/artwork/:slug`, `/concept/:slug`, `/scene/:slug`) — append "Style kin" / "Visually affine" / "Style proximity" / "Closest artworks" sections computed on-demand via `src/embed/neighbours.ts`. Practitioner pages also surface pending AI-attribution proposals that name them as the candidate creator.
- **`/neighbours/:type/:slug`** — similarity browser: top-20 cosine neighbours of any node, with knobs for query/candidate kind and type prefix. Shareable URLs.
- **`/field`** — press `e` (or click the chip in the chrome) to fade curatorial edges and foreground STYLE_KIN / VISUALLY_AFFINE.
- **`/embed-space`** — UMAP-projected 2D scatter of all 1,338+ vectors with pan / zoom / hover / type filters / name search. Practitioners cluster by aesthetic, artworks by visual similarity, concepts by semantic field. The projection lives in `seed/embeddings.umap2d.json` (committed alongside the other embedding sidecars — see the "Deploying" section), produced offline by `seed/_build/.venv/bin/python3 seed/_build/project_umap.py` — re-run after any new embed pass. Cosine metric, `n_neighbors=15`, `min_dist=0.1`, `random_state=42` for determinism.

**Trust tiers**: `auto` (founding team + practitioner self-report on own data — auto-merge), `reviewed` (established track record — auto-merge + tagged), `probationary` (default for new contributors — queued for review). The auto-approve check in `POST /api/contribute` treats `auto` and `reviewed` as auto-merge; everyone else goes to the review queue.

**A(DAI) canonical regime**: `classification_regime:a(dai) seed canon v1 (april 2026)` (slug `adai-seed-canon-v1-2026-04`) is the single canonical lens. Canonical entities declare `CLASSIFIED_BY → classification_regime:a(dai) seed canon v1 (april 2026)` — these edges are authored in `seed/edges.json`, not auto-injected. 295 CLASSIFIED_BY edges point to it (12 of those came from the April 28 named-anchors pass). The earlier `classification_regime:a(dai)` root (which produced a 483-edge explosion that centred the graph on itself) was retired and its auto-injecting loop in `src/seed-consolidated.ts` was disabled — see the comment block around line 184. Do not reintroduce the auto-injection. Five sub-regimes also exist (`academic media-art history`, `asia-pacific institutional`, `crypto market-native`, `euro-american institutional`, `practitioner self-report`) for cross-source classification. Renders gold in `/graph`.

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

### Canonical path — `seed/*.json` via `seed-consolidated.ts`

The flat JSON files in `seed/` map 1:1 to schema rows (nodes, edges, signals, contributors, node_aliases). `seed/_build/` contains the offline Python pipeline that regenerates them from upstream sources. As of the Apr 21–22 run: MoMA CSV (image patches merged + 89 KB of net-new artworks staged in `moma_new_artworks.json`, merge into `nodes.json` not yet verified), Wikidata SPARQL (60 aliases merged into `seed/aliases.json`, 35 portrait patches merged; the artwork query returned empty), Art Blocks Hasura (image patches merged), fxhash GraphQL (9.4 KB of net-new artworks staged in `fxhash_new_artworks.json`, image patches returned empty), and Met OpenAccess (returned empty — no data produced). See `seed/README.md`, `seed/SOURCES.md`, `seed/COVERAGE.md` for methodology and gaps.

ID convention: `<type>:<name>` with spaces preserved and lowercase (e.g. `practitioner:casey reas`, `artwork:fidenza`, `classification_regime:a(dai) seed canon v1 (april 2026)`). The `slug` field is the kebab-case URL-safe form.

Seed signals (currently 2 in `seed/signals.json`): `signal:seed-taxonomy-2026-04` (full commons, attributed, human_secondary, status `active`) for the taxonomy consolidation; `signal:artblocks-api-2026-04` (source_origin `api`, status `processed`) for API-ingested artwork drafts. The earlier `signal:adai-root-2026-04-21` was removed when the A(DAI) root regime was retired in Task 0e. The migration contributor (`contributor:migration`) is trust tier `reviewed` — meaning contributions attributed to it auto-approve.

Node status in metadata: `confirmed` (vetted), `bridge` (partial research — Harold Cohen, Lillian Schwartz, Prema Murthy, Waldemar Cordeiro), `draft` (new entries and auto-generated stubs from collaborator/concept references).

### Image mirror — Cloudflare R2

All node-level image_urls are mirrored into a Cloudflare R2 bucket so the graph stays renderable when upstream URLs rot (MoMA signed URLs, dead IPFS gateways like `gateway.objkt.com`, Wikimedia rate limits, etc.). 393 images live there as of May 2 — covers every artwork (335) and practitioner (57) with a known image plus one collective.

- **Bucket**: `adai` on account `b0b8de38bb6568e28bcd3d7c86940ee5`. Public base: `https://pub-ebd869876a824a5e83dbb2fe42d03211.r2.dev`. CORS allows `GET`/`HEAD` for `*`.
- **Key scheme**: content-addressable, `images/{sha256[:2]}/{sha256}.{ext}` — same image under two source URLs dedups automatically. Cache-Control is `public, max-age=31536000, immutable`, so browsers can keep them forever.
- **Per-node fields** (in `metadata`, both stored, both exposed by the API): `image_url` (upstream provenance) + `cdn_image_url` (R2). Profile pages prefer `cdn_image_url` when rendering. Don't drop `image_url` — provenance matters for an arts knowledge commons.
- **Uploader**: `seed/_build/upload_to_r2.py` (Python, runs from `seed/_build/.venv/bin/python3`). Idempotent: skips nodes that already carry `cdn_image_url`, and HEAD-checks the R2 key before re-uploading. Includes a fallback for the dead `gateway.objkt.com` IPFS gateway (tries `ipfs.io` → `nftstorage.link` → `dweb.link`) and per-host concurrency caps to dodge Wikimedia 429s. Reads R2 credentials from project-root `.env` (gitignored): `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE`. Run with `seed/_build/.venv/bin/python3 seed/_build/upload_to_r2.py`; `--dry-run` and `--limit N` are available for testing.
- **Workflow**: when ingesting new images via the `seed/_build` fetchers, just write `image_url` into `seed/nodes.json` and re-run the uploader — it'll find the new entries and write `cdn_image_url` back. No runtime R2 dependency: the cooked DB carries the URLs, the server never talks to R2.

### Image coverage tooling — sanitize + find-missing + overlay apply

Two `seed/_build` producers + a build-time DB-patch mechanism keep images healthy and fill gaps. They are **producers, not editors**: they propose; canon never moves through a hand-edit. **`seed/nodes.json` is never mutated by these tools** — approved images live in `seed/image_overlay.json`, which `seed-consolidated.ts` applies as metadata `UPDATE`s after the node `INSERT` loop (image-only, gap-fill, idempotent, before the WAL checkpoint). The baked `seed.db` ships the images; `nodes.json` stays pristine. May 2026 first pass: **89 previously-imageless nodes filled** via the overlay (54 institution / 25 practitioner / 7 scene / 2 collective / 1 platform); ~560 still imageless (the long tail Wikidata + agentic web-search can't authoritatively cover). `sanitize_images.py` + `find_missing_images.py` are stdlib-only (no venv needed) and use a descriptive User-Agent (Wikimedia 403s the default urllib UA).

- **`sanitize_images.py`** (read-only) — HEAD/GET-checks every `image_url` + `cdn_image_url`, classifies each node `ok` / `upstream_rotted` (mirror alive, upstream dead — fine) / `cdn_dead` (re-mirror with `upload_to_r2.py`) / `both_dead` (proposes an IPFS-gateway or Wayback fallback). Healing is `upload_to_r2.py`'s job; this only diagnoses. Report → `seed/_build/image_sanitize_report.json` (gitignored). Flags: `--types`, `--limit`, `--no-upstream`, `--workers`. **Known data-quality issue**: 48 Rhizome-artbase artworks (`artbase.rhizome.org` upstream) are flagged `both_dead` — the R2 mirror was populated with HTML landing-page bytes by an earlier `upload_to_r2.py` run that had no content-type guard. The guard is now in place (refuses non-`image/*` responses), preventing future repeats, but healing the existing 48 needs a Rhizome-aware fetcher that extracts the artwork screenshot from each landing page (`<meta property="og:image">` or the main `<img>`) — not yet built; ~50-line follow-up.
- **`find_missing_images.py`** — proposes images for imageless nodes. Tier 1: Wikidata QID from `seed/aliases.json`, else a `P31`-type-verified name search → `P18`/`P154`. Tier 2: `--agentic` (experimental; needs `ANTHROPIC_API_KEY`) LLM web search via `claude-haiku-4-5` + `web_search_20250305` for the long tail. Every candidate is HEAD-validated to a live image and provenance-stamped (QID + property, or `agentic-websearch` + source page). **Artworks are never name-searched** (generic-title slug collisions, e.g. `artwork:untitled`) — QID-alias only. Confidence: `high` = QID-alias · `medium` = type-verified search · `low` = unverified (eyeball — a few are subject misfires, e.g. `Sónar`→SonarQube, `teamLab`→ONLYOFFICE, `Metro Pictures`→an old film studio, `Darmstadt`→the city not the New Music summer courses). Stages to `seed/_build/image_candidates.json` (committed, reviewable). **`--apply --write`** merges approved candidates into `seed/image_overlay.json` — **never into `nodes.json`**.
- **`upload_to_r2.py --overlay`** — reads `seed/image_overlay.json`, mirrors each `image_url` to R2 (content-addressed, same key scheme as the nodes.json path), and writes `cdn_image_url` back into the overlay. The default (no flag) still mirrors `nodes.json` for the pre-existing 393 images. Both modes refuse responses whose content-type isn't `image/*` (defense against the Rhizome regression above). Wikimedia rate-limits aggressively (HTTP 429); per-host cap is 2 concurrent, and re-running `--overlay` is idempotent (only retries entries still missing `cdn_image_url`) so 429-failed mops up in subsequent passes.
- **Overlay apply (`src/seed-consolidated.ts`)** — after the node `INSERT` loop and before the WAL checkpoint, each overlay entry's image fields are merged into the matching node's metadata via `UPDATE nodes SET metadata=…`. Image-only, gap-fill (never overwrites an existing image), idempotent. Look for `Image overlay applied: N nodes (M skipped)` in the seeder's log. `embed_nodes.py` reads the same overlay (via `load_overlay_images()`) so an artwork image supplied via the overlay still reaches the multimodal embedder — no-op when the overlay holds only non-artwork types (the common case), since only `artwork` is in `TYPES_WITH_IMAGE`.

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

### Legacy path — `results/*.json` via `seed.ts`

Each JSON in `results/` has: basic_info, practice_description, key_works, commons_orientation, governance_model, network_position (connections, scene_affiliation), and more. The legacy seed creates practitioner/concept/scene/related nodes + PRACTICES/BELONGS_TO/RELATED_TO edges from those fields. All rows tagged `confidence: 'low'`, `created_by: 'migration'`, `batch_id: 'seed-migration-2026-04-20'`. ID convention is kebab-dash (`practitioner-casey-reas`) — **do not mix with the canonical path in the same DB**.
