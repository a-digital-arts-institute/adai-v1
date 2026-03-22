# A(DAI) v1 — Spec vs Implementation Gap Analysis

**Date:** 2026-03-22
**Spec source:** `adai-db-spec.md` (Jamie's pre-build spec)
**Build source:** `docs/BUILD-INSTRUCTIONS.md` (Gio + Claude build spec, adapted from above)

---

## ✅ IMPLEMENTED — Matches Spec

### Schema
- [x] `nodes` table with id, type, name, metadata (JSON blob), created_at, updated_by
- [x] `edges` table with source_id, target_id, edge_type, signal_id, confidence, charge, created_by
- [x] `signals` table with title, source_url, source_type, cla_layer, summary, content, submitted_by, confidence, lived_experience
- [x] `contributors` table with trust_tier, contributions count, approved_count
- [x] `intake_queue` table with signal_id, target_node, status, reviewed_by, rejection_reason, proposed_nodes, proposed_edges
- [x] All sync tables marked `crsql_as_crr()`
- [x] intake_queue + settings are local-only (not CRR)
- [x] Composite index on edges (source_id, target_id, edge_type, signal_id)

### Schema Adaptations (correct deviations from spec)
- [x] CRR tables can't have `NOT NULL` without `DEFAULT` — all columns adapted
- [x] CRR tables can't have `UNIQUE` indexes (besides PK) — slug UNIQUE dropped, composite index is regular not unique
- [x] Edges have synthetic `id TEXT PRIMARY KEY` instead of composite PK — CR-SQLite requires single-column PK for CRR. Composite is preserved as an index.

### Edge Types (Basel MVP)
- [x] `PRACTICES` — Practitioner → Concept (seeded from `practice_description.medium`)
- [x] `BELONGS_TO` — Practitioner → Scene (seeded from `network_position.scene_affiliation`)
- [x] `RELATED_TO` — Any → Any (seeded from `network_position.connections`)

### Trust Tiers
- [x] HIGH → auto-merge
- [x] LOW → queued for review
- [x] Contributor lookup on submit
- [x] New contributor auto-created with `trust_tier: 'low'`

### Seed Migration
- [x] Reads all 59 JSON files from `./results/`
- [x] Creates node per entity with full JSON as metadata
- [x] Extracts concepts, scenes, connections into typed edges
- [x] All migrated data: `confidence: 'low'`, `created_by: 'migration'`
- [x] Migration signal + migration contributor created for provenance

### Server
- [x] Shards HTTP server (spec's primary choice confirmed by Gio)
- [x] Server-rendered HTML, no SPA
- [x] Inline CSS, dark theme, mobile-friendly, no framework
- [x] Error handling via `Maybe` wrapper

### Endpoints Implemented
- [x] `GET /` — home with stats
- [x] `GET /explore` — list all entities
- [x] `GET /practitioner/:slug` — full profile page with connections, signals, metadata
- [x] `GET /practitioner/:slug/data` — JSON dump ("give me my data")
- [x] `GET /contribute` — contribution form
- [x] `POST /api/contribute` — submit signal with trust tier logic
- [x] `GET /review` — curator review queue with pending items
- [x] `POST /api/review/:id/approve` — approve + increment contributor stats
- [x] `POST /api/review/:id/reject` — reject with reason
- [x] `GET /api/stats` — JSON stats

---

## 🐛 BUGS FIXED

### 1. Signal content mapping (FIXED)
**Was:** User-submitted text went into `summary` field, `content` got NULL.
Profile page read from `content` → contributions never displayed.
**Fix:** Swapped mapping — content goes to `content`, `summary` gets NULL.

---

## ⚠️ NOT YET IMPLEMENTED — From Spec

### Endpoints

| Spec Endpoint | Status | Priority | Notes |
|---|---|---|---|
| `GET /practitioner/:slug/download` | ❌ | Medium | Serve actual .db file. Currently single-DB so this means extracting practitioner data into a standalone file. Deferred until Matryoshka split. |
| `POST /practitioner/:slug/correct` | ❌ | High | Practitioner corrects edges. Auto-merge at HIGH trust. Key for Basel — practitioners need to fix their data. |
| `POST /practitioner/:slug/confirm` | ❌ | High | Practitioner confirms edges as accurate. Bumps confidence, sets lived_experience=1. |
| `GET /contribute/status/:intake_id` | ❌ | Low | Check status of queued contribution. Nice-to-have. |
| `GET /onboard` | ❌ | High | Practitioner onboarding form. Multi-step: name, practice, concepts, connections, scenes. |
| `POST /onboard` | ❌ | High | Create practitioner node from self-report (trust: HIGH). |
| `GET /explore` — search | ❌ | Medium | Current explore is a flat list. Spec wants search bar + filtering. |
| `GET /api/query` | ❌ | Low | Structured query endpoint with scope/type/edge_type params. |
| `GET /api/graph/:node_id` | ❌ | Low | Node + 1-hop edges as JSON. Partially covered by `/practitioner/:slug/data`. |
| `GET /api/nodes?type=X` | ❌ | Low | Filtered node listing. |
| `GET /api/edges?source=X` | ❌ | Low | Edge query by source. |

### Features

| Feature | Status | Priority | Notes |
|---|---|---|---|
| Auth (any form) | ❌ | High for Basel | Need at minimum: practitioner identity for self-report, curator identity for review. Magic link or simple token. |
| Edge type: `EXHIBITED_AT` | ❌ | Medium | Not extractable from current JSON. Needs manual curation or new data source. |
| Edge type: `COLLABORATES_WITH` | ❌ | Medium | Same — not in JSON structure. |
| Trust tier auto-graduation | ❌ | Low | When `approved_count / contributions > 0.8` AND `contributions > 10`, promote LOW → MEDIUM. Logic designed, not coded. |
| R2 storage integration | ❌ | High for deploy | Push/pull .db files to Cloudflare R2. Formabble has reference code. |
| Fly.io deployment | ❌ | High for deploy | Dockerfile, fly.toml, Litestream entrypoint. |
| HTML escaping | ❌ | Medium | User content goes straight into HTML. XSS vector. |
| JSON escaping in data export | ❌ | Medium | Hand-built JSON in `/practitioner/:slug/data` breaks on special chars. |
| DB migrations framework | ❌ | Low | Schema applied via RawQuery. No incremental migration path. |
| Graph visualization | ❌ | Low | Spec says "skip for V1, list view is fine" — this is what we have. |
| Autocomplete on contribute/onboard | ❌ | Medium | Suggest existing concepts/practitioners/scenes from DB. |

### Architecture (deferred by design)

| Feature | Status | Notes |
|---|---|---|
| Matryoshka split | Deferred | Single DB for MVP. Schema is migration-ready. |
| Scene DBs | Deferred | Spec says "skip for Basel". |
| R2 sync lifecycle | Deferred | Pull-on-demand, push-on-write, TTL cache. Needs R2 integration first. |
| CRDT sync endpoints | Deferred | Tables are CRR-ready. No `crsql_changes` GET/POST endpoints yet. |
| Blockchain hash anchoring | Deferred | Optional layer, build CR-SQLite first. |
| ATTACH DATABASE cross-query | Deferred | Not needed with single DB. |

---

## 🔧 IMPLEMENTATION NOTES

### Spec said Rust+axum as primary, Shards as alternative
Gio confirmed Shards. Correct call — CR-SQLite is already integrated, no extension loading dance, HTTP server works. The Rust file structure in the spec (`src/db/`, `src/api/`, etc.) was replaced by 4 Shards files.

### Spec said composite PK on edges
CR-SQLite CRR requires single-column PK. Implementation uses synthetic `id TEXT PRIMARY KEY` and a regular composite index. The semantic guarantee (two scouts = two rows) is preserved — just enforced by INSERT logic and the index rather than the PK constraint.

### Spec said `target_db` in intake_queue
Implementation uses `target_node` instead (references node ID not a DB filename). Correct for single-DB — and still correct for Matryoshka since node ID maps deterministically to a DB file.

### Spec said signals duplicate into practitioner DBs
Open question resolved by single-DB: moot for now. When Matryoshka splits, the recommendation stands — duplicate signal rows into each practitioner DB for portability ("the file should be self-contained").

---

## 📋 RECOMMENDED BUILD ORDER — Next Steps

### For Basel readiness:
1. **Auth** — even simple bearer tokens for practitioner vs curator identity
2. **Onboarding** (`/onboard` GET + POST) — practitioners need to join at Basel
3. **Correct/Confirm** — practitioners need to fix their data at Basel
4. **HTML escaping** — before any public-facing deployment
5. **Deploy** — Dockerfile, fly.toml, Litestream, R2

### Post-Basel:
6. Matryoshka split
7. Search/filter on explore
8. Graph visualization
9. CRDT sync endpoints
10. Trust tier auto-graduation
