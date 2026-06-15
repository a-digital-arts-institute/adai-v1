# A(DAI) — A Digital Arts Institute

Field intelligence infrastructure for the digital arts. A knowledge commons and semantic graph where practitioner intelligence, lived experience, artworks, and field signals accumulate into something the field can query, traverse, challenge, and build on.

*A* canon, not *the* canon. The indefinite article is load-bearing.

**Live at [adai-basel.fly.dev](https://adai-basel.fly.dev)**

---

## What's in the graph (May 2026 — Seed Canon, curated-platform + V&A pipeline)

**Exact counts: [`seed/STATS.md`](seed/STATS.md)** (generated from the canon, so
they never drift) · live: `GET /api/stats`. In shape:

- **Nodes** — `artwork` (platform tokens + V&A holdings, **every one with a
  mirrored R2 image**), `practitioner` (platform artists + V&A pioneers),
  `concept` (8 base + fxhash tag-concepts), `classification_regime` (6),
  `collective` (V&A groups), `platform` (Art Blocks, fxhash), `institution` (V&A).
- **Curated edges** — CLASSIFIED_BY, CREATED_BY, EXHIBITED_AT, EMBODIES (two-tier:
  generative-art/computer-art + fxhash tag-concepts), PRACTICES (V&A makers →
  computer-art). BELONGS_TO / COLLABORATES_WITH / USES_TECHNIQUE / INFLUENCES
  reserved at 0; RESPONDS_TO empty by design (artist-intent only).
- **Multimodal embeddings** — Gemini Embedding 2 (768-d), committed sidecars baked
  into `seed.db`; auto-derived STYLE_KIN + VISUALLY_AFFINE + Tier-2 concept-EMBODIES
  refreshed by the daily `embed-derive-daily` workflow.

**The May 2026 rebuild + V&A de-bias pass.** The canon went through a long arc (full story in [`CLAUDE.md`](CLAUDE.md) § "The rebuild journey"): the contaminated original was wiped; a four-source *sweep* (MoMA / Wikidata / Art Blocks / fxhash) was generated, then culled — until the Wikidata `digital_art_qids` list was found to be **corrupt** (one QID, "graphic artist", dragged in 3,652 non-digital painters/sculptors — Duchamp, Miró). The cull couldn't catch it because it *trusted the source tag*. So the tainted sources were dropped and the canon was **re-run from the two genuinely-clean platform gatherers — Art Blocks + fxhash**, plus a rule-derived editorial layer. Two May-2026 passes then refined it: a **V&A de-bias pass** added the **Victoria & Albert Museum's Computer Arts Society collection** — the 1960s–70s computer-art spine (Nake, Cohen, Mohr, Molnár, Nees …), all IIIF-imaged (the every-artwork-imaged bar Wikidata's Commons images couldn't clear); and an **fxhash curation pass** replaced a provenance-murky chronological dump with a `--curate`d selection (fxhash relevance + a secondary-market demand gate → the collector-validated 2021 generative canon: SMOLSKULL, RGB Elementary Cellular Automaton, Dragons …), killing the permissionless trash and over-dominance. Each source now contributes its *most significant slice*. The canon stays clean *by construction*: `merge_batches.py` assembles only the batches present; **every artwork carries a mirrored R2 image** (the `merge --require-cdn` invariant). The EMBODIES layer is enriched from **artist-applied fxhash tags** into source-attested tag-concepts (`abstract`, `pixel`, `geometric`, …), with the embedding pipeline propagating inferred tag-labels to visually-similar untagged works. Counts live in [`seed/STATS.md`](seed/STATS.md); the producer contract is in [`seed/_build/PRODUCER_CONTRACT.md`](seed/_build/PRODUCER_CONTRACT.md).

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
                   /field, /neighbours                       /review?kind=ai_suggestion
                   profile-page enrichment                   attribution candidates
```

Full reference: [`docs/EMBEDDINGS.md`](docs/EMBEDDINGS.md).

---

## Stack

- **CR-SQLite** ([Gio's C port](https://github.com/shards-lang/crsqlite-rs)) — SQLite + CRDT extensions for sync
- **Node 22 + TypeScript + Express** — HTTP server, JSON API, HTML pages
- **D3 + Canvas** — graph viz (`/graph`), field viz (`/field`)
- **Google Gemini Embedding 2** — multimodal vector space (offline batch via Python, online derive in TS)
- **Cloudflare R2** — content-addressable image mirror (every artwork)
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
│   │   ├── pages.ts             — HTML page handlers (incl. /field)
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
│   ├── SOURCES.md               — canonical edge types + source provenance
│   ├── COVERAGE.md, README.md
│   └── _build/                  — offline Python pipeline (gitignored from Docker)
│       ├── embed_nodes.py, image_fetch.py, calibrate.py
│       ├── fetch_artblocks.py, fetch_fxhash.py — the two live gatherers (fetch_wikidata.py quarantined)
│       └── upload_to_r2.py      — R2 image mirror uploader
├── public/
│   └── field/                   — /field generative dot-field view
├── results/                     — 59 legacy per-practitioner JSONs (reference)
├── docs/
│   ├── EMBEDDINGS.md            — canonical reference for the embedding pipeline
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
git add seed/embeddings.{bin,json}
```

Requires `GEMINI_API_KEY` in `.env` (gitignored). Cost ~$0.03 per full pass.

---

## Deploying

```bash
FLY_REMOTE_BUILDER_REGION=iad flyctl deploy
```

The persistent `/data` volume survives deploys, so code ships without touching live data. **The canon is frozen** — live contributions exist only on the volume, so the volume is **never** wiped in routine operation; reseeding/volume replacement is a disaster-recovery procedure only. See [`CLAUDE.md` § Deploy gotchas](CLAUDE.md).

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

## License

A(DAI) is a commons, licensed by layer:

- **Code** — Apache License 2.0 ([`LICENSE`](LICENSE)). The TypeScript server, the Python pipeline (`seed/_build/`), and the schema.
- **Knowledge graph + documentation** — Creative Commons Attribution-ShareAlike 4.0 ([`LICENSE-DATA`](LICENSE-DATA)). The nodes, edges, concepts, curated descriptions and connections (`seed/*.json`), and the written content. Attribution + share-alike, so forks of the data stay openly licensed — *it cannot be enclosed*.
- **Mirrored artwork images** — **not licensed here.** Copyright remains with the artists and holding institutions (Victoria & Albert Museum, SuperRare creators, Art Blocks, fxhash, …). Images are mirrored only so the graph stays renderable when upstream URLs rot, with upstream provenance preserved in each node's metadata. Several sources are explicitly **not** CC0. Their presence in this repository is not permission to reuse them.

The *reading* of the field is the commons; the *works* stay with the artists who made them.

---

## Further reading

- [`CLAUDE.md`](CLAUDE.md) — authoritative architecture spec: data model, edge types, trust tiers, gravity model, embedding pipeline operator notes, deploy gotchas
- [`docs/EMBEDDINGS.md`](docs/EMBEDDINGS.md) — embedding pipeline reference: design rationale, schema, calibration, visualisation surfaces
- [`seed/SOURCES.md`](seed/SOURCES.md) — canonical edge-type list and source provenance
- [`seed/COVERAGE.md`](seed/COVERAGE.md) — coverage gaps and known issues
