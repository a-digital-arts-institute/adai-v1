# A(DAI) — Digital Arts Knowledge Commons

## What this is

A TypeScript/Express HTTP server that serves the A(DAI) digital arts knowledge graph. It stores practitioner/concept/scene data in SQLite with CR-SQLite CRDT extensions, serves HTML pages and a D3 graph visualization, and exposes a JSON API for graph queries.

Live at: https://adai-basel.fly.dev/

## Architecture

```
src/
  index.ts           — entry point: init DB, start Express server
  db.ts              — SQLite/CR-SQLite database setup and helpers
  seed.ts            — reads ./results/*.json, populates nodes + edges
  templates.ts       — HTML page templates (header, footer, CSS)
  routes/
    pages.ts         — HTML page route handlers
    api.ts           — JSON API route handlers
db.sql               — CR-SQLite schema (CRR tables + local tables)
results/             — 59 JSON research files (one per practitioner)
Dockerfile           — Node 22 based
fly.toml             — Fly.io config (fra region, 512MB)
entrypoint.sh        — seeds on first boot, starts server
```

## Running locally

```bash
# Install dependencies
npm install

# Fresh seed + run
rm -f adai.db && npm run seed && npm run dev

# Just run (if adai.db already exists)
npm run dev
```

Server starts on http://localhost:8080

## Database

Single SQLite file `adai.db` with CR-SQLite CRDT extensions (`@shards-lang/crsqlite`).

**CRR tables** (synced via CRDTs):
- `nodes` — id, type, name, slug, metadata (full JSON), updated_by
- `edges` — id, source_id, target_id, edge_type, signal_id, confidence, created_by
- `signals` — contributed information about practitioners
- `contributors` — who contributed, trust tier, counts

**Local tables**:
- `intake_queue` — contribution review pipeline (pending/approved/rejected)
- `settings` — key-value config

**Edge types**: PRACTICES, BELONGS_TO, RELATED_TO, COLLABORATES_WITH, EXHIBITED_AT

**Trust tiers**: high (auto-merge), medium (auto-merge + tagged), low (queued), unverified (queued + flagged)

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
- `GET /practitioner/:slug/data` — full JSON export for a practitioner
- `POST /api/contribute` — submit a signal (JSON body)
- `POST /api/review/:id/approve` — approve intake item
- `POST /api/review/:id/reject` — reject with reason

## Deploying

```bash
# Deploy to Fly.io (use IAD builder if Depot times out)
FLY_REMOTE_BUILDER_REGION=iad fly deploy

# Check logs
fly logs --app adai-basel --no-tail | tail -20

# SSH into machine
fly ssh console --app adai-basel
```

## Data model

Each JSON in `results/` has: basic_info, practice_description, key_works, commons_orientation, governance_model, network_position (connections, scene_affiliation), and more. The seed creates:

- **Practitioner nodes** from basic_info (full JSON stored as metadata)
- **Concept nodes** from practice_description.medium (comma-separated)
- **Scene nodes** from network_position.scene_affiliation
- **Related nodes** from network_position.connections
- **PRACTICES edges** between practitioners and concepts
- **BELONGS_TO edges** between practitioners and scenes
- **RELATED_TO edges** between practitioners and related entities

All seeded data has `confidence: 'low'`, `created_by: 'migration'`.
