# seed/ — A(DAI) canonical seed data

One place to look to answer "what is in the canon right now?"

Consolidates prior `results/` (59 confirmed practitioner JSONs), `results/_drafts/` (4 bridge practitioners + 5 classification lenses + 177-artwork preview), and 45 new practitioners extracted from the April 2026 seed taxonomy article "Digital Art Is the Art of Our Age."

Replaces the `results/` directory in the repo. Every entry maps 1:1 to a row in the database schema on `feat/cr-sqlite-backend` (PR #5 schema with bi-temporal edges, consent fields, and `node_aliases`).

## Files

| File | Maps to table | Contents |
|---|---|---|
| `nodes.json` | `nodes` | Every node: practitioners, artworks, concepts, scenes, classification_regimes, institutions, platforms, publications, projects. |
| `edges.json` | `edges` | Typed edges: PRACTICES, COLLABORATES_WITH, CREATED_BY, CLASSIFIED_BY. Every edge carries `signal_id` pointing back to the seed signal, plus bi-temporal `valid_from` / `valid_until`. |
| `signals.json` | `signals` | Single seed-batch signal with `source_origin: "human_secondary"`, `consent_scope: "full_commons"`, `batch_id: "seed-taxonomy-2026-04"`. |
| `contributors.json` | `contributors` | Single `contributor:migration` entry, trust_tier `reviewed`. |
| `aliases.json` | `node_aliases` | Verified Wikidata QIDs for 60 practitioners. |
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

Two seed regimes, both held in `nodes.json` as `classification_regime` type nodes:

- `classification_regime:seed research (2025)` — the lens behind the 2025 research consolidation (59 practitioners + 177 artworks). Euro-American institutional + crypto-native blend, theorist-heavy, contemporary-leaning.
- `classification_regime:seed taxonomy (april 2026)` — the lens behind the April 2026 article. Organises practice by historical moment (Early Computer Art, Net Art, Post-Internet, Generative Code, Crypto/NFT, AI, Immersive Installation, Sound, Speculative, Web3/DAO). Legible to Western-anglophone art history; shallow on Asia-Pacific and Latin American pioneers.

Plus 5 draft classification lenses ported from `_drafts/Lens_*.json` (Crypto Market-Native, Euro-American Institutional, Asia-Pacific Institutional, Academic Media Art History, Practitioner Self-Report) for future CLASSIFIED_BY edges.

Every confirmed and bridge node is linked `CLASSIFIED_BY` to `seed research (2025)`. Every new-entry node is linked `CLASSIFIED_BY` to `seed taxonomy (april 2026)`. That makes the genealogy of each entry visible in the graph.

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

- **Artwork images** — Wikidata lookups covered 32% of practitioners but 0% of artworks. Artwork image sourcing is a follow-up pass (Wikidata creator→work, MoMA CSV, Art Blocks subgraph, fxhash API, Met API).
- **Institutional nodes** — very few `institution:` nodes created. EXHIBITED_AT edges were deferred; institutions can be added in a second pass reading `key_works[].description` for institution mentions.
- **Concept vocabulary** — concepts were extracted verbatim from each practitioner's `medium` field. Some overlap exists (e.g., "generative art" and "generative code"). A dedupe/merge pass would consolidate the vocabulary.
- **GDPR erasure hooks** — schema support exists but no per-entry consent overrides are encoded. Every entry defaults to `consent_scope: full_commons` via the seed signal.

## Provenance

Generated by `build_seed.py` on 2026-04-20. Inputs pulled from GitHub `a-digital-arts-institute/adai-v1` branch `feat/cr-sqlite-backend` at commit 8722a52. Wikidata queries run against the public SPARQL endpoint on the same day.
