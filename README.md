# A(DAI) — Digital Arts Knowledge Commons

A semantic graph of digital arts practitioners, scenes, concepts, and their relationships. Built with [Shards](https://github.com/fragcolor-xyz/shards) and [CR-SQLite](https://github.com/shards-lang/cr-sqlite).

## Architecture

- **Database:** SQLite + CR-SQLite (CRDT-enabled, merge-ready)
- **Server:** Shards HTTP server on port 8080
- **Schema:** `db.sql` — 4 CRR tables (nodes, edges, signals, contributors) + 2 local tables (intake_queue, settings)

## Running

```bash
# First run: seed the database from JSON research data
shards seed.shs

# Start the server
shards run.shs
# → http://localhost:8080
```

## Endpoints

| Route | Description |
|---|---|
| `/` | Home — stats + recent additions |
| `/explore` | Browse all entities |
| `/practitioner/:slug` | Practitioner profile with graph connections |
| `/practitioner/:slug/data` | Raw JSON data export ("give me my data") |
| `/contribute` | Submit a signal |
| `/review` | Curator review queue |
| `/api/stats` | JSON stats |

## Data

- `results/` — 59 JSON research files (seed input)
- `adai-digital-arts-report-research/` — field/outline schemas (reference)
- `db.sql` — database schema

## Current Stats

- **774 nodes** (practitioners, concepts, scenes, platforms, etc.)
- **929 edges** (284 PRACTICES, 366 BELONGS_TO, 279 RELATED_TO)
- Single-DB deployment (Matryoshka per-practitioner split designed, not yet implemented)

## License

CC-BY-SA 4.0 (Mode 1 — commons)
