# A(DAI) — A Digital Arts Institute

Field intelligence infrastructure for the digital arts. A knowledge commons and semantic graph where practitioner intelligence, lived experience, artworks, and field signals accumulate into something the field can query, traverse, challenge, and build on.

*A* canon, not *the* canon. The indefinite article is load-bearing.

**Live at [adai-basel.fly.dev](https://adai-basel.fly.dev)**

---

## What's in the graph (May 2026 — Seed Canon, two-platform pipeline)

| | count |
|---|---|
| Nodes | **4,558**: artwork (3,451 — every one carries a mirrored R2 image), practitioner (1,016), concept (83 — 8 base + 75 tag-concepts from attested fxhash tags), classification_regime (6), platform (2 — Art Blocks, fxhash) |
| Edges | **23,984** curated: CLASSIFIED_BY 6,902 · CREATED_BY 3,451 · EXHIBITED_AT 3,451 · EMBODIES 10,180 (two-tier: every artwork → generative-art + artwork → tag-concept). PRACTICES 0 (was QID-derived; platform artists carry no QIDs). BELONGS_TO / COLLABORATES_WITH / USES_TECHNIQUE / INFLUENCES reserved at 0; RESPONDS_TO empty by design (artist-intent only). |
| Multimodal embeddings | Gemini Embedding 2 (768-d), committed sidecars baked into `seed.db`. Auto-derived STYLE_KIN (~702) + VISUALLY_AFFINE (~9,044) + Tier-2 concept-EMBODIES (~516, inferred tag labels) refreshed by the daily `embed-derive-daily` GitHub Actions workflow; `/embed-space` projects all vectors. |

**The May 2026 rebuild.** The canon went through a long arc (full story in [`CLAUDE.md`](CLAUDE.md) § "The rebuild journey") and the shipped state reverses the middle of it: the contaminated original was wiped; a four-source *sweep* (MoMA / Wikidata / Art Blocks / fxhash) was generated, then culled — until the Wikidata `digital_art_qids` list was found to be **corrupt** (one QID, "graphic artist", dragged in 3,652 non-digital painters/sculptors — Duchamp, Miró). The cull couldn't catch it because it *trusted the source tag*. So the tainted sources were dropped entirely and the canon was **re-run from the two genuinely-clean platform gatherers — Art Blocks + fxhash — only**, plus a rule-derived editorial layer. It's clean *by construction*: `merge_batches.py` assembles canon from only the batches present, so off-domain rows can't enter — there is no cull/filter step. Every node traces to an on-chain generative artwork or its artist, and **every artwork carries a mirrored R2 image** (the `merge --require-cdn` invariant — no blank nodes). The EMBODIES layer is enriched from **artist-applied fxhash tags** into 75 source-attested tag-concepts (`abstract`, `pixel`, `geometric`, …), with the embedding pipeline propagating inferred tag-labels to visually-similar untagged works. The producer contract is in [`seed/_build/PRODUCER_CONTRACT.md`](seed/_build/PRODUCER_CONTRACT.md).

See [`docs/EMBEDDINGS.md`](docs/EMBEDDINGS.md) for the embedding pipeline; [`seed/SOURCES.md`](seed/SOURCES.md) for the selection criteria + provenance; [`CLAUDE.md`](CLAUDE.md) for architecture + operator notes.

---

## Architecture

CR-SQLite Matryoshka — the long-term design is one SQLite database per practitioner, scene, and the field itself, synced via CRDTs. Today the live deployment is a single CRR-mode DB; per-practitioner split is designed, not yet implemented.

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

### Multimodal embedding pipeline

Layered on top of the graph: **Gemini Embedding 2** (multimodal, 768-d) projects artworks (text + image fused), practitioners, concepts, and scenes into one vector space. From that space we derive `STYLE_KIN` edges (practitioner ↔ practitioner aesthetic adjacency), `VISUALLY_AFFINE` edges (artwork ↔ artwork visual rhymes), and `SUGGESTS_CREATED_BY` proposals for unattributed artworks (routed through the curator review queue, never auto-merged).

```
seed/nodes.json
    ↓
seed/_build/embed_nodes.py  ──► Gemini API  ──► seed/embeddings.bin (+ .json)
                                                       │
                                                       ▼
                                          src/seed-consolidated.ts
                                          loads + chains embed:derive
                                                       │
                                                       ▼
                                       seed.db (baked into Docker image)
                                                       │
                              ┌────────────────────────┴───────────────────┐
                              ▼                                            ▼
                   /field, /embed-space, /neighbours        /review?kind=ai_suggestion
                   profile-page enrichment                   attribution candidates
```

Full reference: [`docs/EMBEDDINGS.md`](docs/EMBEDDINGS.md).

---

## Stack

- **CR-SQLite** ([Gio's C port](https://github.com/shards-lang/crsqlite-rs)) — SQLite + CRDT extensions for sync
- **Node 22 + TypeScript + Express** — HTTP server, JSON API, HTML pages
- **D3 + Canvas** — graph viz (`/graph`), field viz (`/field`), embedding scatter (`/embed-space`)
- **Google Gemini Embedding 2** — multimodal vector space (offline batch via Python, online derive in TS)
- **UMAP** (umap-learn) — offline 2D projection for `/embed-space`
- **Cloudflare R2** — content-addressable image mirror (~3,451 artwork images)
- **Fly.io** — backend hosting, single 512MB machine in `fra`, persistent `/data` volume
- **Docker** — multi-stage build, runtime image ~74 MB

---

## Endpoints

### Browsing
| Route | Description |
|---|---|
| `/` | Home — stats + recent additions |
| `/explore` | Browse all entities, filterable by type |
| `/practitioner/:slug` | Profile + connections + style kin + AI attribution proposals |
| `/artwork/:slug` | Profile + visually affine artworks + style proximity |
| `/concept/:slug`, `/scene/:slug`, `/collective/:slug`, … | Polymorphic profile pages |

### Visualisation
| Route | Description |
|---|---|
| `/graph` | D3 force-directed graph view |
| `/field` | Generative dot-field view (press `e` for embeddings mode) |
| `/embed-space` | UMAP 2D scatter of all embedding vectors |
| `/neighbours/:type/:slug` | Top-K cosine neighbours of any node, with knobs |

### Curation
| Route | Description |
|---|---|
| `/contribute` | Submit a signal |
| `/review` | Curator review queue (human signals tab) |
| `/review?kind=ai_suggestion` | Curator review queue (AI attribution proposals) |

### API
| Route | Description |
|---|---|
| `/api/stats` | Node / edge / signal / pending-review counts |
| `/api/graph` | Full graph as `{nodes, edges}`, supports `?type=` filter |
| `/api/graph/:slug` | Ego graph (1-hop neighborhood) |
| `/api/graph/:slug/component` | Full connected component reached via BFS |
| `/api/embed-space` | UMAP coords + node metadata for the scatter |
| `/practitioner/:slug/data`, `/artwork/:slug/data`, … | Full JSON export per node ("give me my data") |
| `POST /api/contribute` | Submit a signal (JSON body) |
| `POST /api/review/:id/approve` / `/reject` | Curator actions |

---

## Repo layout

```
adai-v1/
├── src/
│   ├── index.ts                 — entry point: init DB, start Express
│   ├── db.ts                    — SQLite/CR-SQLite setup + migrations
│   ├── seed.ts                  — legacy seed (results/*.json, kebab IDs)
│   ├── seed-consolidated.ts     — canonical seed (seed/*.json) + chained embed:derive
│   ├── templates.ts             — HTML templates
│   ├── routes/
│   │   ├── pages.ts             — HTML page handlers (incl. /field, /embed-space)
│   │   └── api.ts               — JSON API handlers
│   └── embed/                   — multimodal embedding derive pipeline
│       ├── vectors.ts           — cosine, decode/encode, loadAll
│       ├── centroids.ts         — practitioner style centroid computation
│       ├── derive.ts            — pairwise pass → STYLE_KIN + VISUALLY_AFFINE + AI suggestions
│       ├── neighbours.ts        — shared topK module (profile pages, /neighbours)
│       └── cli.ts               — npm run embed:* entrypoint
├── db.sql                       — CR-SQLite schema (CRR + local-only tables)
├── seed/
│   ├── nodes.json, edges.json, signals.json, contributors.json, aliases.json
│   ├── embeddings.bin           — Gemini multimodal vectors (committed, baked into seed.db)
│   ├── embeddings.json          — sidecar metadata (offsets, hashes)
│   ├── embeddings.umap2d.json   — UMAP projection, served at /api/embed-space
│   ├── SOURCES.md               — canonical edge types + source provenance
│   ├── COVERAGE.md, README.md
│   └── _build/                  — offline Python pipeline (gitignored from Docker)
│       ├── embed_nodes.py, image_fetch.py, project_umap.py, calibrate.py
│       ├── fetch_artblocks.py, fetch_fxhash.py — the two live gatherers (fetch_wikidata.py quarantined)
│       └── upload_to_r2.py      — R2 image mirror uploader
├── public/
│   └── field/                   — /field generative dot-field view
├── results/                     — 59 legacy per-practitioner JSONs (reference)
├── docs/
│   ├── EMBEDDINGS.md            — canonical reference for the embedding pipeline
│   ├── SPEC-GAP-ANALYSIS.md     — early spec gap audit
│   └── BUILD-INSTRUCTIONS.md    — original build spec
├── Dockerfile / fly.toml / entrypoint.sh   — Fly.io deployment
├── CLAUDE.md                    — architecture + operator notes
└── README.md                    — this file
```

---

## Running locally

```bash
npm install

# Canonical path (what production ships): reads seed/*.json + embeddings.bin
rm -f adai.db && npm run seed:consolidated && npm run dev

# If adai.db already exists
npm run dev
```

Server: http://localhost:8080

`npm run seed:consolidated` loads nodes/edges/signals/embeddings and chains the derive pass — single command produces a fully populated DB including STYLE_KIN + VISUALLY_AFFINE + AI suggestions.

### Re-embedding after seed changes

```bash
# Idempotent — only re-embeds rows whose content hash changed
seed/_build/.venv/bin/python3 seed/_build/embed_nodes.py
seed/_build/.venv/bin/python3 seed/_build/project_umap.py
git add seed/embeddings.{bin,json,umap2d.json}
```

Requires `GEMINI_API_KEY` in `.env` (gitignored). Cost ~$0.03 per full pass.

---

## Deploying

```bash
FLY_REMOTE_BUILDER_REGION=iad flyctl deploy
```

After deploys that touch seed data or schema, nuke the persistent volume so the new baked `seed.db` replaces the stale one — see [`CLAUDE.md` § Deploy gotchas](CLAUDE.md).

---

## Entity IDs

Human-readable with type prefix: `artwork:fidenza`, `practitioner:casey reas`, `concept:generative code`. The `slug` field is the kebab-case URL-safe form.

---

## Team

- **Iri** — strategy, editorial, signal source curation, value framework for agents
- **JB** — market development, artist relations, sensing conversations
- **Gio** — backend architecture, CR-SQLite, protocol, public layer data collection
- **Piyush** — frontend, generative landing page, brand system, particle/gravitational visualization

---

## Further reading

- [`CLAUDE.md`](CLAUDE.md) — authoritative architecture spec: data model, edge types, trust tiers, gravity model, embedding pipeline operator notes, deploy gotchas
- [`docs/EMBEDDINGS.md`](docs/EMBEDDINGS.md) — embedding pipeline reference: design rationale, schema, calibration, visualisation surfaces
- [`seed/SOURCES.md`](seed/SOURCES.md) — canonical edge-type list and source provenance
- [`seed/COVERAGE.md`](seed/COVERAGE.md) — coverage gaps and known issues
- [`docs/SPEC-GAP-ANALYSIS.md`](docs/SPEC-GAP-ANALYSIS.md) — early spec audit
