# seed/ — A(DAI) canonical seed data

One place to look to answer "what is in the canon right now?"

Consolidates prior `results/` (59 confirmed practitioner JSONs), `results/_drafts/` (4 bridge practitioners + 5 classification lenses + 177-artwork preview), and 45 new practitioners extracted from the April 2026 seed taxonomy article "Digital Art Is the Art of Our Age."

Replaces the `results/` directory in the repo. Every entry maps 1:1 to a row in the database schema on `feat/cr-sqlite-backend` (PR #5 schema with bi-temporal edges, consent fields, and `node_aliases`).

**This is one reading of the field, not the reading.** The 146 practitioners are an editorial canon (selected, accountable). Most of the 3,371 edges around them are a machine reading from public APIs and linked-open-data — source-attested but not in the practitioners' own words. The Relational Intelligence Protocol expects a second reading: the practitioner's. RESPONDS_TO, CONTESTS, and TENSION_WITH are zero by design — they're reserved for first-person testimony. The graph holds both readings in tension, never collapses them. See `SOURCES.md` § "Two readings" for the full framing.

## Files

| File | Maps to table | Contents |
|---|---|---|
| `nodes.json` | `nodes` | Every node: practitioners, artworks, concepts, scenes, classification_regimes, institutions, platforms, publications, projects. 1,530 nodes total. |
| `edges.json` | `edges` | Typed edges: EMBODIES, CREATED_BY, PRACTICES, EXHIBITED_AT, CLASSIFIED_BY, BELONGS_TO, COLLABORATES_WITH, USES_TECHNIQUE, INFLUENCES. Every edge carries `signal_id` pointing back to a seed signal, plus bi-temporal `valid_from` / `valid_until`. 3,371 edges total. |
| `signals.json` | `signals` | 12 records — one per ingest batch (seed taxonomy, editorial enrichment, and 10 real-source/API passes). Each carries source URL, consent posture, and submitter. |
| `contributors.json` | `contributors` | 10 records — every agent (script or human) that staked data into the graph. Mix of `type: script` and `type: agent` with `trust_tier` carrying the meaningful distinction. |
| `aliases.json` | `node_aliases` | Verified Wikidata QIDs for 60 practitioners. |
| `SOURCES.md` | — | Selection criteria, methodology, source citations, data sourcing rationale, and known gaps. |
| `COVERAGE.md` | — | Per-category counts, image hit rate, gaps list, notes for follow-up. |

## ID convention

Every node's `id` is `<type>:<human-readable name>` — spaces preserved, lowercase. Per CLAUDE.md: `practitioner:casey reas`, `artwork:fidenza`, `concept:generative code`, `classification_regime:seed-taxonomy (april 2026)`. The separate `slug` field is kebab-case for URLs.

## Status field

Every node's metadata carries a `status`:

- `confirmed` — from the 59 existing research JSONs, deeply vetted.
- `bridge` — Harold Cohen, Lillian Schwartz, Prema Murthy, Waldemar Cordeiro. Partial research; needs completion.
- `draft` — 45 new practitioners from the April 2026 seed taxonomy, plus ~500 auto-generated stubs (concepts, scenes, connection references). Draft means the editorial team hasn't reviewed the full content yet.

The 500+ auto-generated stubs exist because the existing 59 research JSONs reference collaborators and concepts that the graph should represent — the stubs are the empty containers, waiting to be authored or promoted to canonical entries. Many are legitimately famous people (Sol LeWitt, Peter Chilvers, Vera Molnár before the new-entries pass upgraded her). Others are the names of scenes or communities.

## Classification regimes

Six regimes, held in `nodes.json` as `classification_regime` type nodes:

- `classification_regime:a(dai) seed canon v1 (april 2026)` — the canonical lens. The April 22 enrichment retired the earlier auto-injecting A(DAI) root (which had caused a 483-edge explosion centred on itself) and merged the two seed regimes into this single canon.
- 5 sub-lenses for cross-source positioning: Crypto Market-Native, Euro-American Institutional, Asia-Pacific Institutional, Academic Media Art History, Practitioner Self-Report.

295 CLASSIFIED_BY edges connect canonical entities to the canon regime; 12 of those came from the April 28 named-anchors pass. The genealogy of each entry — which regime classified it, when, by whom — is visible directly in the graph.

## Ingesting into the database

The JSON files map 1:1 to the tables in `db.sql`. A minimal ingest:

```python
import json, sqlite3
conn = sqlite3.connect("adai.db")
conn.executescript(open("db.sql").read())

for row in json.load(open("seed/nodes.json")):
    conn.execute(
        "INSERT OR IGNORE INTO nodes (id, type, name, slug, metadata, created_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (row["id"], row["type"], row["name"], row["slug"], row["metadata"], row["created_at"], row["updated_by"])
    )
# repeat for edges, signals, contributors, node_aliases
conn.commit()
```

`seed.shs` (the current Shards ingest script) reads `results/*.json` directly — it will need a small rewrite to read `seed/*.json` instead, since the shape is flattened rather than nested per-file.

## What this does NOT include

- **fxhash full coverage** — the artist-set tags pass (`gatherer-fxhash-tags-v3`) and the initial API pass cover ~45 works total. A schema-deeper fxhash pass plus an objkt-side coverage push would close more gaps.
- **Practitioner self-report at scale** — only `gatherer-paul-canon-v1` brought in scenes via a curated theorist's lens. RESPONDS_TO, CONTESTS, and TENSION_WITH edges are reserved for practitioner contribution and currently empty by design (see SOURCES.md).
- **GDPR erasure hooks at the entry level** — schema support exists, but no per-entry consent overrides are encoded. Every entry inherits `consent_scope` from its source signal.
- **Asia-Pacific and Latin American institutional sources** — Tier 2 work, no public APIs to ingest from. Requires institutional outreach.

Closed since the April 20 build:
- **Artwork images** — 335/728 artworks have `image_url` (46%) after the April 28 real-source pass folded in MoMA digital, Wikidata depicts, objkt thumbnails, and fxhash tag art.
- **Institutional nodes** — 121 institutions present, with 305 EXHIBITED_AT edges.
- **Heuristic editorial scaffolding** — the 564 keyword-heuristic EMBODIES from the April 22 pass were superseded on April 28 by source-attested EMBODIES from objkt, fxhash, and Wikidata depicts.

## Provenance

Initial build: `build_seed.py` on 2026-04-20. Inputs pulled from GitHub `a-digital-arts-institute/adai-v1` branch `claude/integrate-seed-consolidation`. Wikidata queries run against the public SPARQL endpoint.

Subsequent passes recorded as signals in `signals.json`:
- April 22 — editorial enrichment (`gatherer-enrichment`)
- April 22 — initial MoMA Artworks.csv + fxhash API drafts
- April 28 — real-source pass: objkt tags, Wikidata depicts (v3b), MoMA digital, fxhash tags, Rhizome ArtBase net.art, Paul-canon practitioners
- April 28 — named-anchors pass: 12 hand-curated canonical figures via Wikidata SPARQL

Every edge has `signal_id` pointing to one of these. Every node and edge carries `created_by` / `updated_by` pointing to a contributor or gatherer in `contributors.json`. The two registries close: every reference resolves, every record is referenced.

---

**Come sense with us.** Every edge here is contestable. If you're a practitioner reading this and the machine got your work wrong, the corrective edge has a place in the graph at the highest trust tier the system offers. That's where the canon stops being a canon and starts being intelligence.
