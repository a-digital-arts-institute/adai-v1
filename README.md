# A(DAI) — A Digital Arts Institute

Field intelligence infrastructure for the digital arts. A knowledge commons and semantic graph where practitioner intelligence, lived experience, artworks, and field signals accumulate into something the field can query, traverse, challenge, and build on.

*A* canon, not *the* canon. The indefinite article is load-bearing.

## Architecture

CR-SQLite Matryoshka — every practitioner, scene, and the field itself gets its own SQLite database file, synced via CRDTs.

```
┌──────────────────────────────────────────────────┐
│  FIELD DB (full commons — fat materialized view)  │
│  ┌────────────────────────────────────────────┐   │
│  │  SCENE DB ("Berlin generative art")        │   │
│  │  ┌──────────────────────────────────────┐  │   │
│  │  │  PRACTITIONER DB (artist-rafael)     │  │   │
│  │  └──────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

**Signal flow:** Arrive → classify source origin → extract entities/edges → intake queue → merge boundary check → CRDT merge → contribution receipt

## Current State (April 2026)

- **Live at** [adai-basel.fly.dev](https://adai-basel.fly.dev)
- 774 nodes, 929 edges, 3 edge types (PRACTICES 284, BELONGS_TO 366, RELATED_TO 279)
- Single-DB deployment (per-practitioner split designed, not yet implemented)

## Three-Layer Prototype

1. **Landing page** (in progress) — generative particle viz, North Star text, email capture → Netlify
2. **Public data layer** (starts April 9) — automated runs from curated sources, target 2,000–5,000+ nodes, first artwork nodes
3. **Intimate layer** — practitioner sovereign DBs, LLM-assisted interviews, qualitative input
4. **Audio layer** — deferred until foundation is solid

## Stack

CR-SQLite (Gio's C port), Shards (HTTP server + scripting), Claude API (processing, classification, narrative), Fly.io (backend), Netlify (landing page), D3 (graph viz), TouchDesigner (particle/gravitational viz), Docker (deployment)

## Repos

GitHub org: `a-digital-arts-institute`

- **`adai-v1`** — live codebase, branch `feat/cr-sqlite-backend`. Deployed at adai-basel.fly.dev
- **`seed-doc`** — single `index.html`, the living specification

```
adai-v1/
├── adai-digital-arts-report-research/   # Field/outline schemas (reference)
├── docs/                                # Spec gap analysis
├── results/                             # 59 JSON research files (seed input)
├── db.sql                               # Database schema
├── Dockerfile / fly.toml / entrypoint.sh  # Fly.io deployment
├── run.shs / seed.shs / server.shs      # Shards server + seed scripts
└── CLAUDE.md
```

## Endpoints

| Route | Description |
|-------|-------------|
| `/` | Home — stats + recent additions |
| `/explore` | Browse all entities |
| `/practitioner/:slug` | Practitioner profile with graph connections |
| `/practitioner/:slug/data` | Raw JSON data export ("give me my data") |
| `/contribute` | Submit a signal |
| `/review` | Curator review queue |
| `/api/stats` | JSON stats |

## Entity IDs

Human-readable with type prefix: `artwork:fidenza`, `practitioner:casey reas`, `concept:generative code`

## Team

- **Iri** — strategy, editorial, signal source curation, value framework for agents
- **JB** — market development, artist relations, sensing conversations
- **Gio** — backend architecture, CR-SQLite, protocol, public layer data collection
- **Piyush** — frontend, generative landing page, brand system, particle/gravitational visualization

## Full Reference

See [`claude/CLAUDE.md`](claude/CLAUDE.md) for the authoritative specification — architecture, principles, edge types, gravity model, trust model, agentic risk map, critical gaps, and core rules.
