# A(DAI) — Digital Arts Knowledge Commons

## What this is

A Shards-based HTTP server that serves the A(DAI) digital arts knowledge graph. It stores practitioner/concept/scene data in SQLite with CR-SQLite CRDT extensions, serves HTML pages and a D3 graph visualization, and exposes a JSON API for graph queries.

Live at: https://adai-basel.fly.dev/

## Shards language reference

See `/Users/sugar/devel/edge-talk/Scripts-Src/CLAUDE.md` for the full Shards language reference. Key things to know for this codebase:

- Shards is a **dataflow language** — data flows through pipes, newlines are implicit pipes
- `=` is immutable ref, `>=` is mutable set, `>` is update
- `Do(wire)` runs inline sharing parent scope — **variable names must not collide between router and handler wires**
- `DB.Query` returns `{column: [values...]}` — **returns `{}` (empty table) for 0 rows**, so `Take("col") | ExpectSeq` fails on empty results. Always wrap in `Maybe({})` or count first.
- CRR tables (CR-SQLite) cannot have `UNIQUE` indices besides PK, and all `NOT NULL` columns must have `DEFAULT` values
- CLI args override `@define` values as strings — use `#(@define-name | ToInt)` for numeric conversion (see `Http.Server` port pattern)
- `ForRange(from to { ... })` is inclusive on both ends — prefer `Repeat({ ... Inc(idx) } Times: n)` for index-based iteration to avoid off-by-one

## Architecture

```
run.shs              — entry point: init DB, load crsqlite, start server
server.shs           — all HTTP handlers + routing
server-base.shs      — shared defines, headers, CSS, html-page template
seed.shs             — reads ./results/*.json, populates nodes + edges
db.sql               — CR-SQLite schema (CRR tables + local tables)
results/             — 59 JSON research files (one per practitioner)
Dockerfile           — fragcolor/shards-headless based
fly.toml             — Fly.io config (fra region, 512MB)
entrypoint.sh        — seeds on first boot, starts server
```

## Shards binary

`shards` should be on PATH. If not: `/Users/sugar/devel/shards/build/Release/shards`

## Running locally

```bash
# Fresh seed + run
rm -f adai.db && shards seed.shs && shards run.shs

# Just run (if adai.db already exists)
shards run.shs
```

Server starts on http://localhost:8080

## Database

Single SQLite file `adai.db` with CR-SQLite CRDT extensions.

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

## Patterns to follow

### HTTP handler pattern (from Formabble identity server)
```shards
@wire(handle-something {
  = input  ; receive from pipe

  ; do work, query DB, build HTML
  "" >= body
  "content" | AppendTo(body)

  @html-page("Title" body) = page
  page | Http.Response(200 Headers: @html-headers)
  none | Stop
})
```

### Safe DB query pattern
```shards
; DB.Query returns {} for 0 rows — ExpectSeq will fail
; Always wrap in Maybe or count first
Maybe({
  [param] | DB.Query("SELECT ..." @adai-db)
  Take("column") | ExpectSeq = results
  results | Count = n
  ; ... use results ...
})
```

### Routing pattern
```shards
Http.Read
{Take("method") = method}
{Take("target") = target}
{Take("body") = raw-body}

method | Match([
  "GET" {
    target | Cond([
      {Is("/path")} { Do(handler) }
      {String.Starts(With: "/prefix/")} {
        target | String.Split("/") = parts
        parts | Take(2) | ExpectString | Do(handler)
      }
    ] Passthrough: true)
  }
  "POST" {
    raw-body | ExpectString | Await(FromJson) | ExpectTable = post-body
    ; ... route POST endpoints ...
  }
] Passthrough: true)
```

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
