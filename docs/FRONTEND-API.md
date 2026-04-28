# A(DAI) Frontend Data Contract

`docs/FRONTEND-API.md` · For Piyush (and anyone else reading the graph from the browser).

**Backend:** `https://adai-basel.fly.dev` (live, public, no auth)
**Live counts (probed 2026-04-28):** 1,007 nodes · 2,486 edges · 9 active edge types · 10 node types
**Source-of-truth handlers:** `server.shs` on `a-digital-arts-institute/adai-v1` (`feat/cr-sqlite-backend`)

This doc is **read-only frontend contract**. For write-side concerns (intake, consent, processing trace, trust tiers, db schema), see [`claude/SCHEMA.md`](../claude/SCHEMA.md).

**New here? Read [`FRONTEND-WALKTHROUGH.md`](FRONTEND-WALKTHROUGH.md) first** — step-by-step companion that walks through the integration sequence. This doc is the full reference; the walkthrough is the on-ramp.

---

## TL;DR

Three endpoints get you 95% of what you need:

1. **`GET /api/graph?type=_all`** — full graph as `{nodes, edges}` for the canvas.
2. **`GET /api/graph/:slug`** — ego graph (1-hop from a node) for click-to-focus.
3. **`GET /practitioner/:slug/data`** — full record (node + metadata JSON + edges + signals) for the info panel.

Default `/api/graph` (no query param) **silently filters out** `scene` and `related` types — use `?type=_all` for the full canvas.

CORS is open. No auth. No rate limiting yet. The backend is a single Fly.io instance running Shards over CR-SQLite.

---

## Endpoints

### `GET /api/stats`

```json
{
  "total_nodes": 1007,
  "total_edges": 2486,
  "total_signals": 2,
  "pending_reviews": 0
}
```

All four fields are integers. Use this for badge counters or to detect when the graph has grown (poll on visibility change, not on a timer — the graph mutates infrequently).

### `GET /api/graph` — full graph for the canvas

D3-compatible JSON.

```json
{
  "nodes": [
    {"id": "artwork:fidenza", "name": "Fidenza", "type": "artwork", "slug": "fidenza"}
  ],
  "edges": [
    {"source": "artwork:fidenza", "target": "concept:flow fields", "type": "EMBODIES", "confidence": "high"}
  ]
}
```

**Query params:**
- *(no param)* — practitioners + concepts + everything except `scene` and `related`. Returns ~982 nodes / 2,332 edges. **Default is filtered. Don't use this for "show me the whole graph."**
- `?type=_all` — everything except `related`. Returns 1,007 / 2,486. **This is what you want for the full canvas.**
- `?type=practitioner` (or `artwork`, `concept`, `institution`, `scene`, `collective`, `platform`, `classification_regime`, `publication`, `project`) — single-type filter.

Edges are auto-filtered to only include those where **both** endpoints are in the returned node set. So filtering by node type implicitly filters edges.

### `GET /api/graph/:slug` — ego graph (1-hop)

For "I clicked a node, show me its neighborhood." The center node carries `center: true`.

```json
{
  "nodes": [
    {"id": "practitioner:casey reas", "name": "Casey Reas", "type": "practitioner", "slug": "casey-reas", "center": true},
    {"id": "concept:software", "name": "software", "type": "concept", "slug": "software"},
    {"id": "artwork:process series", "name": "Process series", "type": "artwork", "slug": "process-series"}
  ],
  "edges": [
    {"source": "practitioner:casey reas", "target": "concept:software", "type": "PRACTICES", "confidence": "high"}
  ]
}
```

**Slug, not ID.** The endpoint takes the URL-friendly slug (`casey-reas`), not the type-prefixed ID (`practitioner:casey reas`). Slugs come back on every node response.

**Caveat:** the route is `/api/graph/:slug` but it works for **any** node type that has a slug, despite the absence of a type prefix in the URL. Slugs are unique across the node set in practice but this is convention, not enforced.

### `GET /practitioner/:slug/data` — full node export

The detail-panel endpoint. The path says "practitioner" but the handler queries `WHERE slug = ?` — it works for any node type. (This is a known frontend-API smell that the backend team should probably rename to `/api/node/:slug`.)

```json
{
  "node": {
    "id": "practitioner:casey reas",
    "name": "Casey Reas",
    "type": "practitioner",
    "slug": "casey-reas",
    "created_at": "2026-04-23T12:18:38Z",
    "updated_by": "contributor:migration",
    "metadata": { /* see "Metadata fields per node type" below */ }
  },
  "edges": [
    {"id": "...", "source_id": "...", "target_id": "...", "edge_type": "PRACTICES", "confidence": "high"}
  ],
  "signals": [
    {"id": "signal:...", "title": "...", "submitted_by": "..."}
  ]
}
```

Note the field naming **differs** from `/api/graph` — here it's `source_id`/`target_id`/`edge_type`, not `source`/`target`/`type`. Two endpoints, two shapes. (Also a known smell.)

**Signals** array is only signals that made it through the merge boundary (`status = 'approved'` in `intake_queue`). Most nodes will have 0–1 signals attached at current scale (only 2 signals total in the database right now — most nodes were seeded directly).

### Write endpoints (not for the public canvas, but documented for completeness)

- `POST /api/contribute` — submit a signal
- `POST /api/review/:id/approve`
- `POST /api/review/:id/reject`

These need a contributor identity. Practitioner auth is designed but not built — currently anyone can post via these endpoints, which is why they're not exposed in the canvas yet.

---

## Node types

10 types in active use. CLAUDE.md lists 6 — the actual graph has 4 more (`collective`, `platform`, `publication`, `project`) that came in via seed import.

| Type | Count | Render priority | Notes |
|------|-------|-----------------|-------|
| `artwork` | 399 | **First-class — gravitational centres** | Per design language: white. Works are what the canon is *about*. |
| `concept` | 318 | First-class — connectors | Embodied by artworks, practiced by practitioners. The shared vocabulary that links the graph. |
| `institution` | 121 | Secondary | Galleries, museums, festivals. Surface on EXHIBITED_AT traversal. |
| `practitioner` | 117 | **First-class** | Per design language: electric green. The people. |
| `scene` | 25 | Secondary | Named scenes (e.g. "Berlin generative art"). Excluded from default `/api/graph` — opt in via `?type=_all`. |
| `collective` | 8 | Secondary | Groups of practitioners working together as a unit. |
| `platform` | 8 | Secondary | fxhash, Art Blocks, Foundation, etc. |
| `classification_regime` | 6 | **Special — meta-layer** | MoMA-curatorial, fxhash-algorithmic, etc. These are the *lenses* through which other nodes are seen. Probably hide by default; surface in a "regime view" toggle. See [SCHEMA.md → Classification regimes](../claude/SCHEMA.md#classification-regimes). |
| `publication` | 3 | Secondary | Critical/editorial publications (Right Click Save, Outland, etc.). |
| `project` | 2 | Secondary | Long-running projects spanning multiple works. |

**`related` type:** appears in `/api/graph` filtering logic but should be excluded from the canvas in all cases — it's a placeholder, not a renderable node. (The backend filters it out by default; only `?type=_all` could surface it but the database currently has zero `related` nodes.)

**Visual treatment recommendation (from design language):** practitioners electric green, artworks white as gravitational centres, concepts as the connective tissue (treatment TBD with brand system), the rest as supporting types with progressively reduced visual weight. Classification regimes are a different register — they're not in the same plane as the content nodes, they classify the content nodes. Treat them separately (different shape, different layer, or hidden behind a toggle).

---

## Edge types

9 active. The first 5 carry the bulk of the structural information.

| Type | Count | From → To | What it tells the visitor | Info-panel grouping |
|------|-------|-----------|---------------------------|---------------------|
| **EMBODIES** | 621 | artwork → concept | What this work is *about* | Group under "What this work embodies" on artwork pages. Group under "Embodied by" on concept pages. |
| **PRACTICES** | 461 | practitioner → concept | What this practitioner works with | Group under "Practices" on practitioner pages. Group under "Practiced by" on concept pages. |
| **CREATED_BY** | 405 | artwork → practitioner | Authorship | Group under "Works by" on practitioner pages. Surface as the credit line on artwork pages. |
| **EXHIBITED_AT** | 300 | practitioner → institution | Exhibition history | Group under "Exhibited at" on practitioner pages. Group under "Exhibitors" on institution pages. |
| **CLASSIFIED_BY** | 283 | any → classification_regime | Which regime classified this | **Don't surface in the main info panel.** This is meta — show in a "Visible to" or "Lenses" subsection, or in the regime-view mode. |
| **COLLABORATES_WITH** | 183 | practitioner ↔ practitioner | Creative collaboration (not co-occurrence) | Group under "Collaborates with" on practitioner pages. Bidirectional — render once, link both ways. |
| **BELONGS_TO** | 154 | practitioner → scene | Part of a named scene | Group under "Scenes" on practitioner pages. Group under "Practitioners" on scene pages. |
| **USES_TECHNIQUE** | 75 | artwork → concept | Method/material (not subject) | Distinguish from EMBODIES — same target type but different relationship. Group under "Technique" on artwork pages. |
| **INFLUENCES** | 4 | practitioner → practitioner | Historical influence | Intentionally sparse. Worth visual emphasis when present — these are the rare evidenced lineage links. |

**`RELATED_TO` (0 edges):** reserved for frontier signals (relationships the vocabulary can't yet name). Currently empty — no rows. When it gains rows, render with reduced confidence (dashed line, lower opacity), not hidden.

**Confidence distribution across all edges:**
- `high`: 1,293 (52%)
- `medium`: 1,100 (44%)
- `low`: 93 (4%)

Suggested visual mapping: high = full opacity, medium = ~60% opacity, low = ~30% opacity + dashed. The design language calls for "edge type diversity as visual weight (brightness), not volume" — so a node sitting at a junction of 4 edge types should be brighter than one with 20 edges of one type.

---

## Metadata fields per node type

`metadata` is parsed JSON. Different fields per type. The fields below were observed live; treat them as "common but not guaranteed" — always handle missing keys.

### `practitioner`

```json
{
  "status": "confirmed",
  "source_origin": "human_secondary",
  "sub_type": "artist",
  "active_years": "1999-present",
  "location": null,
  "wikidata_qid": "Q5006090",
  "url": "https://reas.com",
  "practice_summary": "Artist and educator who co-created the Processing programming language...",
  "methodology": "Reas writes code to define systems of autonomous elements...",
  "medium": ["software", "generative art", "installation", "print", "drawing", "machine learning"],
  "key_works": [
    {"title": "...", "year": "...", "description": "...", "relevance": "..."}
  ],
  "exhibitions": ["Whitney Museum", "LACMA", "SFMOMA", "Centre Pompidou"],
  "scene_affiliation": ["Central figure in generative art", "creative coding"],
  "collaborators": ["..."]
}
```

`practice_summary` is the one-paragraph bio for the info panel. `methodology` is the longer-form description. `key_works` is structured — render each as a sub-card. `exhibitions` and `scene_affiliation` overlap with the EXHIBITED_AT / BELONGS_TO edges — prefer the edges as the source of truth (they have provenance), use these arrays as fallbacks or context when edges are sparse.

### `artwork`

```json
{
  "year": "2021",
  "medium": "generative, on-chain",
  "image_url": "...",
  "platform": "Art Blocks",
  "edition_size": 999,
  "summary": "..."
}
```

**`image_url`** is the field to look for. Not all artworks have one (the seed didn't include image scraping). When present, it's a direct URL to the image asset (no CORS proxy needed at current scale, but worth verifying as the source set grows).

### `concept`

```json
{
  "frontier": false,
  "summary": "...",
  "first_surfaced": "2026-03-15"
}
```

`frontier: true` marks concepts the vocabulary can't yet classify confidently — render with a "frontier" visual treatment (per design language: probably the dashed/uncertain treatment used for low-confidence edges).

### `institution`, `platform`, `publication`, `scene`, `collective`, `project`

Less standardised. Common fields: `summary`, `url`, `location`, `founded_year`. Treat metadata as best-effort and fall back to the node's `name` + edge counts when fields are missing.

### `classification_regime`

```json
{
  "regime_type": "curatorial | market | academic | algorithmic | practitioner",
  "institution_id": "institution:moma",
  "classification_logic": "Historical period + medium + department taxonomy...",
  "update_frequency": "slow | medium | fast",
  "legibility_domain": "institutional | market | academic | platform | practitioner"
}
```

See [SCHEMA.md → Classification regimes](../claude/SCHEMA.md#classification-regimes). These are infrastructure, not content. If you build a "regime view" mode, this is what powers it.

---

## Renderer recommendations at current scale

**1,007 nodes / 2,486 edges** is comfortably in the range where:

- **Canvas + quadtree force layout** is the right call (D3-force on canvas, not SVG). SVG starts to choke around 500–1,000 nodes; canvas handles 10,000+.
- **No level-of-detail (LOD) needed yet.** Render everything every frame. Revisit when nodes cross ~5,000.
- **Fetch-once-then-stream-updates** is fine. The whole graph is ~250–350 KB JSON uncompressed; gzip cuts that to ~50–80 KB. Initial load is one fetch.
- **No spatial indexing for clicks needed.** `quadtree.find()` on the force layout's positions is plenty fast at 1k nodes.

When you cross 5,000–10,000 nodes (post-Basel as content ingest scales):
- Add type-based filtering (use `?type=` for narrower views)
- Add LOD: hide labels at low zoom, hide low-confidence edges at low zoom, hide secondary node types at low zoom
- Consider WebGL (regl, PixiJS) over canvas2d if frame rate drops below 30 fps during force simulation

---

## Frontend caveats (read these)

1. **Default `/api/graph` is filtered.** Excludes `scene` and `related` types. Always use `?type=_all` if you want the actual graph the stats endpoint reports.

2. **Two edge field naming conventions.** `/api/graph` returns `{source, target, type}`. `/practitioner/:slug/data` returns `{source_id, target_id, edge_type}`. Same data, different keys. Worth normalising in the frontend layer rather than handling both downstream.

3. **`/practitioner/:slug/data` is a misnomer.** Works for any node type, not just practitioners. Backend team has acknowledged the rename (`/api/node/:slug`) is needed but not done.

4. **Slugs are convention-unique, not enforced-unique.** Two nodes of different types could in principle share a slug. Hasn't happened yet. If you need guaranteed uniqueness, use the `id` field (type-prefixed).

5. **Metadata JSON shape varies even within a type.** Practitioners seeded from the canon vs. practitioners seeded from later API runs may have different fields populated. Always default-handle missing keys.

6. **No CORS preflight needed for GETs** — open access. POSTs (contribute, review) will need credentials when auth lands.

7. **No webhook / SSE / WS push.** If you need to detect graph mutations, poll `/api/stats` on visibility change. The graph mutates ~weekly at current pace, so polling every 60s during active session is fine.

8. **Bi-temporal edges have `valid_until` in the database**, but it's **not surfaced in `/api/graph`** today. Every edge returned is implicitly current. When the correction model goes live, this endpoint will need to add `WHERE valid_until IS NULL` filtering server-side. Today this is a no-op (no corrections yet).

---

## Things to ask the backend team for

In rough priority order:

1. **`/api/node/:slug`** to replace `/practitioner/:slug/data` — or at least an alias. The current name is misleading.
2. **Consistent edge field naming** between `/api/graph` and the node-detail endpoint.
3. **Image proxy** (`/api/image?url=...`) for artwork `image_url` fields when they cross-origin to platforms with restrictive caching headers. Not a blocker today; will be when image-rich sources start ingesting.
4. **Embedding similarity endpoint** (e.g. `/api/similar/:slug?limit=20`) — once concept embeddings exist, this is what powers "show me artworks structurally similar to this one." Per CLAUDE.md, embeddings are flagged as "future."
5. **`?since=<timestamp>` on `/api/graph`** to support delta fetching once the graph is large enough that re-fetching the full set on every page load gets expensive.
6. **WebSocket or SSE for graph updates** — same justification, post-scale.

---

## Cross-references

- [`docs/FRONTEND-WALKTHROUGH.md`](FRONTEND-WALKTHROUGH.md) — step-by-step integration companion to this contract (start here if you're new)
- [`claude/SCHEMA.md`](../claude/SCHEMA.md) — write-side schema, full table definitions, intake / consent / trust model
- [`claude/CLAUDE.md`](../claude/CLAUDE.md) — project-level architecture
- [`docs/profile-user-flow.html`](profile-user-flow.html) — Piyush's profile UX flow + endpoint surface (April 16 reference)
- [`docs/adai-walkthrough.html`](adai-walkthrough.html) — first-pass walkthrough of how the canon fills itself in
- Source: `server.shs` on `a-digital-arts-institute/adai-v1` branch `feat/cr-sqlite-backend` ([live](https://github.com/a-digital-arts-institute/adai-v1/blob/feat/cr-sqlite-backend/server.shs))
- Live API: https://adai-basel.fly.dev
