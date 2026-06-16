# A(DAI) — Digital Arts Knowledge Commons

> **⚠️ THE LIVE DATABASE IS THE ONLY SOURCE OF TRUTH.**
>
> The genesis seed pipeline — `seed/*.json`, the offline `seed/_build`
> gatherers, and the build-time reseed bake — was **RETIRED in June 2026**
> (recoverable from git history). The service is live; there is **no
> reseed-from-JSON** and the Docker image ships **no `seed.db`**.
>
> - **Data lives in `/data/adai.db`** on the Fly volume, continuously
>   replicated to R2 by **Litestream**. A fresh host restores the live DB
>   from that replica (see `entrypoint.sh`) — never from a baked seed.
> - **Deploys are code-only.** `just deploy` never touches data; the volume
>   persists across deploys. There is no `nuke-volume` / `redeploy-fresh`
>   anymore. Disaster recovery = a Litestream restore.
> - **New data enters through the governed write path** (`/api/v1/*`,
>   curator `/review`) — never by editing a file and rebuilding.
> - The only files left under `seed/` are the **live R2 janitors**
>   (`cull_orphans.py`, `shrink_oversized.py`); they reconcile the image
>   bucket against the live DB and never read any genesis JSON.

## What this is

A TypeScript/Express HTTP server that serves the A(DAI) digital arts knowledge
graph. It stores practitioner/concept/artwork data in SQLite with CR-SQLite CRDT
extensions, serves HTML pages and a D3/canvas graph visualization, and exposes a
JSON API for graph queries plus a token-gated contributor API for AI assistants.

Live at: https://adai-basel.fly.dev/

## Architecture

```
src/
  index.ts                — entry point: init DB, start Express server
  db.ts                   — SQLite/CR-SQLite setup + migrations
  auth.ts                 — bearer-token auth, requireAdmin
  templates.ts            — HTML page templates (header, footer, CSS)
  routes/
    pages.ts              — HTML page route handlers
    api.ts                — public JSON API route handlers
    contributor-api.ts    — token-gated /api/v1/* write surface
  embed/                  — embedding derive + on-write + neighbours
  archivist/              — the in-app research/archivist surface
  utils/                  — token-mint, review, admin-actions, visibility, db-path, …
  cli/                    — operator CLIs (token issue/revoke/restore, rename,
                            notify-digest, apply-image-patch)
db.sql                    — CR-SQLite schema (CRR tables + local tables)
seed/_build/              — the LIVE R2 janitors only (genesis pipeline retired):
    cull_orphans.py       — delete R2 images no live node references
    shrink_oversized.py   — downsize oversized R2 images, repoint cdn in live DB
    .venv/                — boto3 + Pillow (host-only; never in the image)
Dockerfile                — Node 22, multi-stage: builds the server; ships NO seed.db
entrypoint.sh             — boot: use volume DB → else Litestream restore → else fail loud
litestream.yml            — continuous WAL replication of /data/adai.db → R2 (private bucket)
fly.toml                  — Fly.io config (fra region, persistent /data volume)
```

## Running locally

The genesis seed is gone, so a local run needs an existing `./adai.db`. Get one
by pulling the live DB off prod (or restoring from the Litestream replica):

```bash
npm install
echo "get //data/adai.db ./adai.db" | flyctl ssh sftp shell --app adai-basel
just dev          # = npm run dev against the existing ./adai.db (refuses if absent)
# or directly:
npm run dev
```

Server: http://localhost:8080

## Database

Single SQLite file (`/data/adai.db` on Fly, `./adai.db` locally) with CR-SQLite
CRDT extensions (`@shards-lang/crsqlite`). Litestream replicates it to a private
R2 backup bucket continuously.

**CRR tables** (CRDT-synced):
- `nodes` — id, type, name, slug, metadata (full JSON), updated_by
- `edges` — id, source_id, target_id, edge_type, signal_id, confidence, charge,
  created_by, and bi-temporal fields: `event_time` (when the relationship was
  true in the world), `valid_from` (when it entered the graph), `valid_until`
  (NULL = still current), `invalidated_by` (the signal/edge that superseded it)
- `signals` — contributed information; consent fields (`consent_scope`,
  `consent_attribution`, `consent_revocable`), audit fields (`processing_trace`,
  `provenance_chain`), `source_origin`, `batch_id`, `status` ∈ {active, revoked,
  superseded}
- `contributors` — who contributed, trust tier, counts
- `node_aliases` — cross-source entity resolution: `(source, external_id) → node_id`

**Local tables** (NOT CRRs — never synced): `intake_queue` (review pipeline),
`settings`, `contributor_tokens` (sha256-hashed bearer tokens), `node_embeddings`
(768-d multimodal vectors), `archivist_sessions`, `rejected_ai_suggestions`.

**Node types**: `artwork`, `practitioner`, `concept`, `classification_regime`,
`collective`, `platform`, `institution` (schema reserves `scene`, `publication`,
`project`, `event`, `related`). Cross-source identity merges by node id. Live
counts: `GET /api/stats`.

**Edge types** — 9 curated + 2 auto-derived. Curated: **CLASSIFIED_BY**,
**CREATED_BY**, **EXHIBITED_AT**, **EMBODIES** (artwork → concept/tag-concept),
**PRACTICES**, **BELONGS_TO**, **COLLABORATES_WITH**, **USES_TECHNIQUE**,
**INFLUENCES**. Auto-derived by `npm run embed:derive`: **STYLE_KIN**
(creator ↔ creator), **VISUALLY_AFFINE** (artwork ↔ artwork), plus Tier-2
inferred concept-EMBODIES (`created_by='embedding-multimodal-v1'`, dashed in
`/field`). **RESPONDS_TO** (artwork → artwork) is reserved and intentionally
empty — it requires evidence of artist intent, not thematic similarity.
`db.sql` has no CHECK constraint on `edge_type`; prefer the existing types.

### Querying rules

- **Bi-temporal**: always filter `WHERE valid_until IS NULL` on `edges` queries
  that represent current state (unfiltered queries return historical edges too).
  `db.sql` indexes `valid_until`. Profile pages, `/api/graph`, `/api/graph/:slug`,
  and the component endpoint all apply it.
- **Retired-node visibility** (`src/utils/visibility.ts`,
  `json_extract(metadata,'$.retired') IS NOT 1`): retired nodes drop out of every
  listing surface but stay reachable by direct URL. Applied at `/api/stats`,
  `/api/graph*` (⚠️ stamp-pinned — `total_nodes`/`curated_edges` must stay
  clause-identical to the stream queries or the `/field` IndexedDB cache never
  validates), page listings, archivist search, `src/embed/vectors.ts loadAll`,
  and embed backfill.

## HTTP endpoints

### HTML pages
- `GET /` — home with stats + recent additions
- `GET /explore` — list practitioners
- `GET /graph` — D3 force-directed graph
- `GET /field` — the 30k canvas field view (press `e` for embeddings mode)
- `GET /practitioner/:slug` · `/artwork/:slug` · `/concept/:slug` · `/scene/:slug`
  — profile pages (with on-demand Style-kin / Visually-affine sections)
- `GET /neighbours/:type/:slug` — similarity browser (top-20 cosine neighbours)
- `GET /contribute` — signal submission form
- `GET /review` — curator review queue
- `GET /skill.md` — the contributor contract (verbatim `SKILL.md`)

### JSON API
- `GET /api/stats` — node/edge/signal counts (retired-filtered)
- `GET /api/graph` — full graph as D3 `{nodes, edges}`, `?type=` filter; nodes
  carry `cdn_image_url`/`image_url` when present
- `GET /api/graph/:slug` — ego graph (1-hop)
- `GET /api/graph/:slug/component` — full connected component (BFS over live
  edges; `?max_nodes=800`, up to 5000; `truncated: true` when hit)
- `GET /:type/:slug/data` — full JSON export (metadata + edges + approved
  signals); slug-only resolution, the type segment is decorative
- `POST /api/contribute` — submit a signal
- `POST /api/review/:id/approve` · `/reject` — curator actions

### Contributor API (`/api/v1/*`) — bearer-token, AI-driven

The write surface for AI assistants. Every endpoint requires
`Authorization: Bearer <token>`; tokens are issued out-of-band
(`npm run token:issue`) and stored sha256-hashed in `contributor_tokens`. The
caller contract is `SKILL.md` (served at `GET /skill.md`).

- `GET /api/v1/whoami` — identity + trust tier + r2 status + token scope
- `POST /api/v1/signals` — text contribution about an existing node
- `POST /api/v1/nodes` — create practitioner / artwork / concept / …
- `PATCH /api/v1/nodes/:id` — JSON-merge-patch on `metadata` (null deletes a key)
- `POST /api/v1/edges` — add an edge; bi-temporal supersession via
  `supersedes_edge_id`
- `POST /api/v1/images` — `multipart/form-data` or JSON `image_base64`; uploads to
  R2 (content-addressed `images/<sha[:2]>/<sha>.<ext>`), attaches `cdn_image_url`
- `GET /api/v1/contributions` — the contributor's own history

Every write accepts an optional **`batch_id`** (stamped onto the anchoring
signal) making a whole upload session inspectable (`GET /api/v1/batches`) and
rollback-able. Format `[A-Za-z0-9][A-Za-z0-9._:-]{0,119}`.

Admin endpoints (require `scope='admin'`, enforced by `requireAdmin`):
- `GET/POST /api/v1/tokens`, `POST /api/v1/tokens/:prefix/revoke` — token mgmt
  (HTTP can only mint **write**-scope; admin tokens are operator-CLI-only)
- `GET /api/v1/review`, `POST /api/v1/review/:id/approve|reject`,
  `POST /api/v1/review/bulk` — JSON twin of the curator queue
- `POST /api/v1/signals/:id/revoke` — status→revoked + supersede anchored edges
- `POST /api/v1/nodes/:id/retire` — supersede live edges + set `metadata.retired`
- `GET /api/v1/batches`, `POST /api/v1/batches/:batch_id/retire` — batch rollback

**Admin correction model (`src/utils/admin-actions.ts`): nothing is ever
deleted.** Signals flip `status='revoked'`; edges supersede bi-temporally; nodes
get `metadata.retired` and drop out of listings while staying reachable by URL.
Every correction inserts an anchoring admin signal (`source_type='api_admin'`)
that superseded edges reference via `invalidated_by`. SKILL.md §4.4–4.7 + §6
document the workflow.

**Trust tiers**: `auto` (founding team + self-report — auto-merge), `reviewed`
(established — auto-merge + tagged), `probationary` (default for new contributors
— queued for `/review`). `scope` (write|admin) governs *which endpoints*;
`trust_tier` governs *whether writes auto-merge or queue* — the two are
decoupled (an admin can be probationary). Mint/revoke/list logic lives in
`src/utils/token-mint.ts`, shared between HTTP and CLI.

Token CLI (local issues raw token to stdout once; store keeps only the hash):
```bash
npm run token:issue   -- --contributor "Name" --label "laptop" [--create --tier probationary] [--admin]
npm run token:revoke  -- --prefix adai_abc12345        # or --list [--contributor X]
npm run token:restore -- --from .tokens.json [--dry-run]   # disaster recovery

# Production (against /data/adai.db on the volume, via SSH):
flyctl ssh console --app adai-basel -C \
  "node /app/dist/cli/issue-token.js --contributor 'Name' --label 'l' --create --tier reviewed"
```
CLIs resolve the DB path via `src/utils/db-path.ts` (`DB_PATH` → `/data/adai.db`
→ `./adai.db`). `.tokens.json` (gitignored, repo root) holds the raw operator
tokens for `just restore-tokens`. `contributor_tokens` is local-only — never a
CRR (token material must never sync).

## Embeddings

Gemini Embedding (multimodal, 768-d, L2-normalised). Vectors live in the
local-only `node_embeddings` table (NOT a CRR).

- **`npm run embed:derive`** chains `centroids → derive`: recomputes style
  centroids for practitioners + collectives from live `CREATED_BY` edges and
  emits **STYLE_KIN** + **VISUALLY_AFFINE** rows plus **SUGGESTS_CREATED_BY**
  proposals into `intake_queue` (`kind='ai_suggestion'`), then runs **Tier-2
  concept propagation** (`src/embed/concept-edges.ts`). Calibrated thresholds:
  τ_attribute=0.88, τ_kin=0.91, τ_visual=0.84 (env-overridable
  `TAU_ATTRIBUTE`/`TAU_KIN`/`TAU_VISUAL`). Each run starts with
  `DELETE FROM edges WHERE created_by='embedding-multimodal-v1'`. The pipeline
  **refuses to auto-emit INFLUENCES or RESPONDS_TO** by design.
- **Embed-on-write**: `/api/v1/nodes` (POST/PATCH) and `/api/v1/images` call
  `embedNodeAsync` after materialise; failures are logged, never block the
  response. Requires `GEMINI_API_KEY` (Fly secret; `.env` locally).
- **Daily re-derive** (`.github/workflows/embed-derive-daily.yml`, 04:00 UTC):
  `embed:backfill` (catches anything embed-on-write missed) → `embed:derive`
  (no API calls) → `embed:report-drift`, all against the live DB. Required
  secrets: `FLY_API_TOKEN` (org-scoped deploy token), `GEMINI_API_KEY`. Each
  SSH step `curl`-warms `/api/stats` first (auto-stop idle timer).
- **Drift surveillance**: `npm run embed:report-drift` shows where the hard-coded
  τ sit in the live distribution (target τ_kin≈p95, τ_visual≈p99,
  τ_attribute≈p99). Re-tune by hand with `npm run embed:calibrate`.
  Auto-recalibration is intentionally not wired.
- **Surfaces**: profile-page Style-kin/Visually-affine sections,
  `/neighbours/:type/:slug`, and `/field` (`e` to foreground derived edges).

## Image mirror — Cloudflare R2

All node images are mirrored to a public R2 bucket so the graph renders even when
upstream URLs rot. New images arrive at runtime via `POST /api/v1/images`.

- **Bucket** `adai`. Public base `https://pub-ebd869876a824a5e83dbb2fe42d03211.r2.dev`.
- **Key scheme**: content-addressed `images/{sha256[:2]}/{sha256}.{ext}` — same
  bytes dedup automatically. `Cache-Control: public, max-age=31536000, immutable`.
- **Per-node fields** (in `metadata`): `image_url` (upstream provenance) +
  `cdn_image_url` (R2). Profile pages prefer `cdn_image_url`; keep both.
- **R2 secrets** (Fly secrets / `.env`): `R2_ENDPOINT`, `R2_BUCKET`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE`. Litestream uses a
  **separate private** backup bucket via `R2_BACKUP_*` (never the public image
  bucket). Without the image creds `POST /api/v1/images` returns
  `503 r2_not_configured`; other endpoints still work.

### The R2 janitors (`seed/_build/*.py`, host venv)

Both reconcile against the **live DB only** — they never read any genesis JSON.
Run via the justfile recipes, which pull `/data/adai.db` (+ WAL) off the volume.

- **`cull_orphans.py`** — deletes R2 objects under `images/` that **no live node
  references** (`metadata.cdn_image_url`, retired nodes included). Dry-run by
  default; `--delete` removes them (batched; refuses if the DB resolved <100
  references — bucket-wipe guard). `just cull-orphans-prod` / `-delete`.
- **`shrink_oversized.py`** + **`dist/cli/apply-image-patch.js`** — finds R2
  images over a size threshold (default >5 MiB) still referenced by a live node,
  downsizes them (longest edge ≤2048px, **format + animation preserved**, never
  upscaling) to a **new content-addressed key**, uploads it, and emits a patch.
  Because keys are content-addressed the resized bytes hash to a new key, so the
  repoint lands in the **live DB only** via `apply-image-patch.js` (guarded by an
  old-value match; idempotent; **never re-embeds** — the image is visually
  identical). The old object becomes an orphan → reclaimed by `cull_orphans.py`.
  **Separation of concerns: shrink swaps the reference, cull reaps the dead
  object.** `just shrink-oversized-prod` / `-measure` / `-apply`. ⚠️ the apply
  recipe needs `dist/cli/apply-image-patch.js` on the machine — `just deploy`
  first if you just changed it.

## Deploying

```bash
just deploy        # FLY_REMOTE_BUILDER_REGION=iad flyctl deploy --ha=false
just logs          # tail recent logs
just ssh           # interactive shell (warms the machine first)
just wait-healthy  # poll /api/stats until healthy
```

- **Deploy is code-only.** The `/data` volume persists across deploys; the
  entrypoint sees the existing DB and uses it as-is. There is **no reseed and no
  volume wipe** — the genesis bake + `nuke-volume`/`redeploy-fresh` were retired
  June 2026. Disaster recovery is a **Litestream restore** (automatic on a fresh
  host; manual via `litestream restore`).
- `--ha=false` is mandatory: flyctl's HA default silently creates a second
  machine + volume (two divergent DBs behind one hostname).
- **Schema migrations are not automatic.** `initDb` runs `db.sql` on every boot
  (fine for `CREATE … IF NOT EXISTS`), but adding a column to an existing table
  must go through the idempotent try/catch pattern in `src/db.ts` (keyed to
  SQLite's stable "duplicate column name" error). Don't strip those try/catch
  blocks; blowing away the volume is not an option.

### Ops via `just`

`brew install just`; `just` lists recipes. Key ones beyond deploy:
- `just warm` — wake the idle machine (`fly.toml auto_stop_machines='stop'`).
- `just tokens-list` — list active tokens on prod over SSH.
- `just restore-tokens` / `-dry` — re-insert operator tokens from `.tokens.json`
  (SFTP → run CLI → delete; idempotent, transactional). `.tokens.json` is
  gitignored and never lands on the VM at rest.
- `just cull-orphans-prod[-delete]` · `just shrink-oversized-prod[-measure|-apply]`
  — the R2 janitors (above).

## ID convention

`<type>:<name>` with spaces preserved and lowercase (e.g. `practitioner:casey
reas`, `artwork:fidenza`). The `slug` field is the kebab-case URL-safe form.
Server-side writes compute `<type>:<slug>`; live contributions may use kebab ids
(`practitioner:mat-dryhurst`). Cross-source identity merges by node id.
