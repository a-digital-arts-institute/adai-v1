# A(DAI) — Digital Arts Knowledge Commons

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

**Node types** — live in Seed Canon v1 (1,007 nodes total): artwork (399), concept (318), institution (121), practitioner (117), scene (25), collective (8), platform (8), `classification_regime` (6 — one per ingesting source; makes how an institution/market/platform classifies visible as a structural actor), publication (3), project (2). Schema also reserves `event` and `related` but neither has rows yet.

**Edge types** — 9 live in seed (2,486 edges total): EMBODIES (621), PRACTICES (461), CREATED_BY (405), EXHIBITED_AT (300), CLASSIFIED_BY (283 — any node → classification_regime that actively positioned it), COLLABORATES_WITH (183), BELONGS_TO (154), USES_TECHNIQUE (75), INFLUENCES (4). The canonical edge-type list lives in [seed/SOURCES.md](seed/SOURCES.md), which adds one intentionally empty edge: **RESPONDS_TO** (artwork → artwork) — left at zero because it requires evidence of artist intent (statements, interviews, practitioner contribution), not thematic similarity. It's the highest-value edge type for Basel-floor practitioner contributions. `db.sql` has no CHECK constraint on `edge_type` — `RELATED_TO` is used by the legacy `seed.ts` path but is not in the canonical seed. When adding rows, prefer the existing 9 unless the relation is genuinely new, and update these counts rather than letting them drift.

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
- `GET /api/graph` — full graph as D3-compatible `{nodes, edges}`, supports `?type=` filter
- `GET /api/graph/:slug` — ego graph (1-hop neighborhood)
- `GET /api/graph/:slug/component` — full connected component reached from `:slug` via BFS over live edges; caps at `?max_nodes=800` (override up to 5000), returns `truncated: true` when hit
- `GET /practitioner/:slug/data` — full JSON export for a practitioner
- `POST /api/contribute` — submit a signal (JSON body)
- `POST /api/review/:id/approve` — approve intake item
- `POST /api/review/:id/reject` — reject with reason

## Deploying

```bash
# Deploy to Fly.io (use IAD builder if Depot times out)
FLY_REMOTE_BUILDER_REGION=iad flyctl deploy

# Check logs
flyctl logs --app adai-basel --no-tail | tail -20

# SSH into machine
flyctl ssh console --app adai-basel
```

The Dockerfile is multi-stage: the builder runs `npm run seed:consolidated` and produces `/app/seed.db`; the runtime image ships only that baked DB plus the compiled server (no raw JSON, no seeder source). `entrypoint.sh` copies `/app/seed.db → /data/adai.db` on first boot.

### Deploy gotchas

- **Persistent volume**: `/data` survives deploys, so new code sees the old DB. To ship fresh seed data, SSH in and remove the DB files, then restart:
  ```bash
  flyctl ssh console --app adai-basel -C "sh -c 'rm -f /data/adai.db /data/adai.db-shm /data/adai.db-wal'"
  flyctl machine restart <machine-id> --app adai-basel
  ```
  On restart, the entrypoint sees no DB and copies the baked one.
- **Schema migrations are not automatic**. `initDb` runs `db.sql` against the live DB on every boot — fine for `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`, but it will fail if the new schema adds a column to an existing table (observed: adding `valid_until` to `edges` crash-looped an older volume). When schema expands, blow away the volume or write a real migration.
- **WAL checkpoint trap in the seeder**: `src/seed-consolidated.ts` ends with `PRAGMA wal_checkpoint(TRUNCATE)` — **keep it**. CR-SQLite runs in WAL mode; small writes at the end of the seeder (e.g. the A(DAI) bootstrap) otherwise sit in `seed.db-wal`. The Dockerfile only copies `seed.db` to the runtime stage, so uncheckpointed writes silently disappear. If you add inserts anywhere after the main node/edge loops, make sure the checkpoint still runs after them.

## Data model

### Canonical path — `seed/*.json` via `seed-consolidated.ts`

The flat JSON files in `seed/` map 1:1 to schema rows (nodes, edges, signals, contributors, node_aliases). `seed/_build/` contains the offline Python pipeline that regenerates them from upstream sources. As of the Apr 21–22 run: MoMA CSV (image patches merged + 89 KB of net-new artworks staged in `moma_new_artworks.json`, merge into `nodes.json` not yet verified), Wikidata SPARQL (60 aliases merged into `seed/aliases.json`, 35 portrait patches merged; the artwork query returned empty), Art Blocks Hasura (image patches merged), fxhash GraphQL (9.4 KB of net-new artworks staged in `fxhash_new_artworks.json`, image patches returned empty), and Met OpenAccess (returned empty — no data produced). See `seed/README.md`, `seed/SOURCES.md`, `seed/COVERAGE.md` for methodology and gaps.

ID convention: `<type>:<name>` with spaces preserved and lowercase (e.g. `practitioner:casey reas`, `artwork:fidenza`, `classification_regime:a(dai) seed canon v1 (april 2026)`). The `slug` field is the kebab-case URL-safe form.

Seed signals (currently 2 in `seed/signals.json`): `signal:seed-taxonomy-2026-04` (full commons, attributed, human_secondary, status `active`) for the taxonomy consolidation; `signal:artblocks-api-2026-04` (source_origin `api`, status `processed`) for API-ingested artwork drafts. The earlier `signal:adai-root-2026-04-21` was removed when the A(DAI) root regime was retired in Task 0e. The migration contributor (`contributor:migration`) is trust tier `reviewed` — meaning contributions attributed to it auto-approve.

Node status in metadata: `confirmed` (vetted), `bridge` (partial research — Harold Cohen, Lillian Schwartz, Prema Murthy, Waldemar Cordeiro), `draft` (new entries and auto-generated stubs from collaborator/concept references).

### Legacy path — `results/*.json` via `seed.ts`

Each JSON in `results/` has: basic_info, practice_description, key_works, commons_orientation, governance_model, network_position (connections, scene_affiliation), and more. The legacy seed creates practitioner/concept/scene/related nodes + PRACTICES/BELONGS_TO/RELATED_TO edges from those fields. All rows tagged `confidence: 'low'`, `created_by: 'migration'`, `batch_id: 'seed-migration-2026-04-20'`. ID convention is kebab-dash (`practitioner-casey-reas`) — **do not mix with the canonical path in the same DB**.
