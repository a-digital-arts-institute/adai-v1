# A(DAI) CR-SQLite Backend — Build Instructions for Claude Code

## What you're building

A Shards-based HTTP server that serves the A(DAI) digital arts knowledge commons. It:
1. Stores practitioner/concept/scene data in SQLite with CR-SQLite CRDT extensions
2. Serves HTML pages for practitioner profiles, contribution, review queue, onboarding
3. Exposes JSON API for graph queries
4. Seeds from existing JSON research files in `./results/`

## Critical references — READ THESE FIRST

- **Shards language guide**: `/Users/sugar/devel/edge-talk/Scripts-Src/CLAUDE.md`
- **CR-SQLite schema example**: `/Users/sugar/devel/edge-talk/Scripts-Src/db.sql`
- **CR-SQLite init + extension loading**: `/Users/sugar/devel/edge-talk/Scripts-Src/init.shs`
- **DB migration pattern**: `/Users/sugar/devel/edge-talk/Scripts-Src/Utils/db-migrations.shs`
- **HTTP server pattern**: `/Users/sugar/devel/formabble/identity/identity.shs`
- **HTTP server base (headers, auth, templates)**: `/Users/sugar/devel/formabble/identity/identity-base.shs`
- **HTTP server entry point**: `/Users/sugar/devel/formabble/identity/run-identity.shs`
- **Fly.io deployment**: `/Users/sugar/devel/formabble/identity/fly.toml` and `/Users/sugar/devel/formabble/identity/Dockerfile`
- **Litestream R2 replication**: `/Users/sugar/devel/formabble/identity/relay-entrypoint-litestream.sh`
- **Design brief**: `./DESIGN-BRIEF-v2.md`

## Shards binary

`shards` should be on PATH. If not: `/Users/sugar/devel/shards/build/Release/shards`

## Architecture decisions

### Single DB for MVP (not Matryoshka yet)
Use ONE database file `adai.db` for the Basel MVP. All nodes, edges, signals in one DB. The Matryoshka split (per-practitioner DBs) comes later. This keeps the build simple.

### CR-SQLite tables
The nodes, edges, and signals tables are CR-SQLite CRRs (for future sync). The intake_queue and settings tables are local-only.

### Edge types (Basel MVP — 5 coarse types)
```
PRACTICES          Practitioner → Concept     "works with"
BELONGS_TO         Practitioner → Scene       "is part of"  
EXHIBITED_AT       Practitioner → Institution "showed work at"
COLLABORATES_WITH  Practitioner ↔ Practitioner "works together"
RELATED_TO         Any → Any                   catch-all
```

### Trust tiers
```
high       practitioner self-report, vetted curator  → auto-merge
medium     known scout agent, returning contributor  → auto-merge, tagged confidence:medium
low        new/unknown contributor                   → queued for review
unverified unverified web signal, cold submission    → queued + flagged
```

## Database Schema (db.sql)

```sql
PRAGMA journal_mode = WAL;

-- === CR-SQLite CRR TABLES ===

CREATE TABLE IF NOT EXISTS nodes (
    id          TEXT PRIMARY KEY NOT NULL,
    type        TEXT NOT NULL,
    name        TEXT NOT NULL,
    slug        TEXT UNIQUE,
    metadata    TEXT,
    created_at  TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_by  TEXT NOT NULL
);

SELECT crsql_as_crr('nodes');

CREATE TABLE IF NOT EXISTS edges (
    id          TEXT PRIMARY KEY NOT NULL,
    source_id   TEXT NOT NULL,
    target_id   TEXT NOT NULL,
    edge_type   TEXT NOT NULL,
    signal_id   TEXT,
    confidence  TEXT DEFAULT 'medium',
    charge      TEXT,
    created_at  TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    created_by  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);
CREATE INDEX IF NOT EXISTS idx_edges_type ON edges(edge_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_edges_composite ON edges(source_id, target_id, edge_type, signal_id);

SELECT crsql_as_crr('edges');

CREATE TABLE IF NOT EXISTS signals (
    id              TEXT PRIMARY KEY NOT NULL,
    title           TEXT,
    source_url      TEXT,
    source_type     TEXT,
    cla_layer       TEXT,
    summary         TEXT,
    content         TEXT,
    submitted_by    TEXT NOT NULL,
    confidence      TEXT DEFAULT 'medium',
    lived_experience INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

SELECT crsql_as_crr('signals');

CREATE TABLE IF NOT EXISTS contributors (
    id              TEXT PRIMARY KEY NOT NULL,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL,
    trust_tier      TEXT DEFAULT 'low',
    contributions   INTEGER DEFAULT 0,
    approved_count  INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

SELECT crsql_as_crr('contributors');

-- === LOCAL-ONLY TABLES ===

CREATE TABLE IF NOT EXISTS intake_queue (
    id              TEXT PRIMARY KEY NOT NULL,
    signal_id       TEXT,
    target_node     TEXT,
    submitted_by    TEXT NOT NULL,
    trust_tier      TEXT NOT NULL,
    status          TEXT DEFAULT 'pending',
    reviewed_by     TEXT,
    reviewed_at     TEXT,
    rejection_reason TEXT,
    proposed_nodes  TEXT,
    proposed_edges  TEXT,
    created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_intake_status ON intake_queue(status);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('db_version', '1');
```

## Seed migration strategy

The `./results/` folder contains ~59 JSON files, one per practitioner/entity. Each has:
- `basic_info`: name, type, location, url, active_years
- `practice_description`: medium, practice_summary, methodology
- `network_position`: position_type, scene_affiliation, connections
- `key_works`: array of works
- `commons_orientation`, `governance_model`, etc.

### Migration approach:
1. Read each JSON file from `./results/`
2. Create a node for each entity (id = slugified name)
3. Store the full JSON as `metadata` on the node
4. Extract `network_position.connections` to create RELATED_TO edges
5. Extract concepts from `practice_description.medium` to create concept nodes + PRACTICES edges
6. Create a migration signal for provenance
7. All migrated data: `confidence: 'low'`, `created_by: 'migration'`

### Slug generation:
`Casey_Reas.json` → slug `casey-reas`, id `practitioner-casey-reas`

## HTTP endpoints

### HTML pages (server-rendered, return Content-Type: text/html)

```
GET /                           → Home page: what is A(DAI), link to explore
GET /practitioner/:slug         → Practitioner profile page
GET /explore                    → Simple list/search of all nodes
GET /contribute                 → Contribution form
GET /review                     → Curator review queue
GET /onboard                    → Practitioner onboarding form
```

### JSON API

```
GET  /api/node/:id              → Node + all connected edges + connected nodes (1 hop)
GET  /api/nodes?type=X          → List nodes, optionally filtered by type
GET  /api/edges?source=X        → List edges from a node
POST /api/contribute            → Submit a signal (goes to intake)
POST /api/review/:id/approve    → Approve intake item
POST /api/review/:id/reject     → Reject intake item
GET  /api/stats                 → Graph stats: node count, edge count, etc.
```

### HTML rendering approach

Build HTML strings in Shards using string concatenation. Use a template helper:

```shards
@template(html-page [title body-content] {
  ["<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>" title " — A(DAI)</title><style>" @css "</style></head><body>" body-content "</body></html>"] | String.Format
})
```

Keep CSS minimal and inline. No external dependencies for MVP.

## Server structure

```
adai-v1/
├── db.sql                    -- schema
├── server.shs                -- main HTTP server (handlers + routing)
├── server-base.shs           -- shared defines, headers, templates
├── seed.shs                  -- migration script: reads ./results/*.json → populates DB
├── run.shs                   -- entry point: init DB, run migrations, start server
├── Utils/
│   └── db-migrations.shs     -- migration chain
├── Dockerfile                -- for Fly.io deployment
├── fly.toml                  -- Fly.io config
├── entrypoint.sh             -- Litestream + shards startup
└── results/                  -- existing JSON research files (input for seed)
```

## Build phases

### Phase 1: Schema + Seed
1. Create `db.sql` with the schema above
2. Create `seed.shs` that reads all JSON files from `./results/`, creates nodes and edges
3. Test: run seed, verify data with sqlite3 CLI

### Phase 2: Server basics
1. Create `server-base.shs` with shared defines (headers, HTML template, CSS)
2. Create `server.shs` with HTTP handlers
3. Create `run.shs` entry point
4. Test: start server, hit endpoints

### Phase 3: Full endpoints
1. Practitioner profile page (HTML)
2. Explore page (HTML, list all nodes)
3. JSON API for node/edge queries
4. Contribute endpoint (form + POST handler)
5. Review queue

### Phase 4: Deploy
1. Dockerfile
2. fly.toml
3. entrypoint.sh with Litestream

## CR-SQLite patterns to follow

### Extension loading (from Edge Talk init.shs):
```shards
DB.LoadExtension("crsqlite")
```

### Schema init (from Edge Talk):
```shards
@read("db.sql") | DB.RawQuery
```

### Querying with params:
```shards
[node-id] | DB.Query("SELECT * FROM nodes WHERE id = ?")
```

### The Database parameter:
```shards
[node-id] | DB.Query("SELECT * FROM nodes WHERE id = ?" "adai.db")
```
When using a specific DB file, pass it as the second positional param to DB.Query.

### Getting CRDT changes (diff):
```shards
[db-version] | DB.Query("SELECT table, pk, cid, val, col_version, db_version, COALESCE(site_id, crsql_site_id()) FROM crsql_changes WHERE db_version > ? AND site_id IS NULL")
```

### Applying CRDT changes (merge):
```shards
[table pk cid val col_version db_version site_id] | DB.Query("INSERT INTO crsql_changes (table, pk, cid, val, col_version, db_version, site_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
```

## Important Shards patterns

### HTTP Server (from Formabble):
```shards
@wire(handler {
  Http.Read
  {Take("method") = method}
  {Take("target") = target}
  {Take("body") | ExpectString | Await(FromJson) | ExpectTable = body}
  
  target | Match([
    "/endpoint" {
      "response" | Http.Response(200 Headers: {"Content-Type": "text/html"})
    }
  ])
  none
} Looped: true)

@wire(server {
  Http.Server(Port: 8080 Handler: handler)
} Looped: true)
```

### Error handling:
```shards
@wire(safe-handler {
  Maybe(
    Do(handler)
    {
      "Error" | Http.Response(500)
      none | Stop
    }
  )
  none
} Looped: true)
```

### Mesh + scheduling:
```shards
@mesh(main)
@schedule(main server)
@run(main FPS: 15)
```

## CSS for MVP

Use a minimal, clean CSS. Dark background, light text, monospace accents. Think: the graph is the aesthetic. Keep it brutalist but readable. Mobile-friendly. No framework.

## IMPORTANT: What NOT to build yet

- No authentication (open for Basel demo)
- No Matryoshka split (single DB)
- No graph visualization (list view is fine)
- No embeddings
- No blockchain
- No scene DBs
- No ATTACH DATABASE queries
