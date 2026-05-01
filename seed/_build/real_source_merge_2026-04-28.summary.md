# Real-source merge — 2026-04-28

Bundle: `real_source_merge_2026-04-28.json`. Idempotent.

## Inserts

- **22** new practitioners/collectives (of which 15 carry image URLs)
- **5** new scenes (Paul-chapter-aligned)
- **334** new artworks (248 with image URLs)
- **156** new concepts
- **1442** new edges total
  - 336 CREATED_BY
  - 1036 EMBODIES
  - 39 BELONGS_TO
  - 27 USES_TECHNIQUE
  - 4 EXHIBITED_AT

## Deletes

- **564** heuristic-keyword EMBODIES edges (per editorial:heuristic-embodies-scaffolding)

## Per-source contributions

- `moma-digital-ingest-2026-04-28`: 26 nodes, 53 edges
- `fxhash-tags-ingest-2026-04-28`: 22 nodes, 37 edges
- `wikidata-artworks-ingest-2026-04-28b`: 97 nodes, 117 edges
- `objkt-tags-ingest-2026-04-28`: 304 nodes, 1155 edges
- `wikidata-practitioners-2026-04-28`: 22 nodes, 31 edges
- `paul-canon-scenes-2026-04-28`: 5 nodes, 0 edges
- `rhizome-artbase-net-art-2026-04-28`: 49 nodes, 49 edges

## Apply

`python3 apply_real_source_merge.py` (or run via seed-consolidated.ts deploy path).
