# seed/ — A(DAI) canonical seed data

One place to look to answer "what is in the canon right now?"

> **⚠️ Status note (May 2026).** The shipped canon is the **clean
> two-platform pipeline — 4,558 nodes / 23,984 curated edges**, assembled
> from only the Art Blocks + fxhash gatherers plus a rule-derived editorial
> layer. There is **no MoMA, no Wikidata, no cull**: the four-source sweep
> and its digital-art cull were dropped after the Wikidata `digital_art_qids`
> list was found corrupt (it dragged 3,652 non-digital painters in). The
> canon is now clean *by construction* — `merge_batches.py` assembles it from
> only the batches present, so off-domain rows can't enter. If a section
> below still mentions a cull (8,653), an uncut sweep (16k), or a v1 restore
> (1,491), it's superseded. Full arc: [`../CLAUDE.md`](../CLAUDE.md) § "The
> rebuild journey".

Post-rebuild (May 2026): assembled from two source-attested platform gatherers
([`_build/fetch_artblocks.py`](_build/fetch_artblocks.py),
[`_build/fetch_fxhash.py`](_build/fetch_fxhash.py)) + a single rule-derived
curation pass ([`_build/derive_curation.py`](_build/derive_curation.py)),
folded into canon by [`_build/merge_batches.py`](_build/merge_batches.py).
(`_build/fetch_wikidata.py` is present but **quarantined** — see its banner;
re-enabling it is the documented "try more" path.) Every gatherer conforms to
[`_build/PRODUCER_CONTRACT.md`](_build/PRODUCER_CONTRACT.md) — the
load-bearing doc.

**This is one reading of the field, not the reading.** The structural
skeleton is a machine reading from public APIs and linked-open-data —
source-attested but not in the practitioners' own words. The Relational
Intelligence Protocol expects a second reading: the practitioner's.
RESPONDS_TO is zero by design — reserved for first-person testimony.
The graph holds both readings in tension, never collapses them. See
`SOURCES.md` § "Two readings" for the full framing.

## Files

| File | Maps to table | Contents |
|---|---|---|
| `nodes.json` | `nodes` | Every node: artworks (3,451 — every one R2-mirrored), practitioners (1,016), concepts (83 — 8 base + 75 **tag-concepts** from attested fxhash tags), classification_regimes (6), platforms (2 — Art Blocks, fxhash). 4,558 nodes total. |
| `edges.json` | `edges` | Typed edges: CLASSIFIED_BY (6,902), CREATED_BY (3,451), EXHIBITED_AT (3,451), EMBODIES (10,180 — two-tier: every artwork → generative-art + artwork → tag-concept). PRACTICES 0 (was QID-derived; platform artists carry no QIDs). Every edge carries `signal_id`, `valid_from`, optional `valid_until` (bi-temporal). BELONGS_TO / COLLABORATES_WITH / USES_TECHNIQUE / INFLUENCES schema-reserved at zero; RESPONDS_TO empty by design. 23,984 edges total. |
| `signals.json` | `signals` | 3 records — one per producer (artblocks, fxhash, curation). Each carries `source_url`, `processing_trace` (gatherer config, not LLM reasoning), `provenance_chain` (endpoint + fetched_at), consent posture. |
| `contributors.json` | `contributors` | 1 record — `contributor:migration` (trust tier `reviewed`). |
| `aliases.json` | `node_aliases` | 4,526 cross-source identity bindings — fxhash user_id + token_id (3,742), artblocks contract:project_id (477) + artist (297), plus 10 Wikidata QIDs that happen to attach to platform artists. |
| `image_overlay.json` | — | Build-time image gap-fills for nodes whose canon record lacks one. Applied by `seed-consolidated.ts`. Carries v1-era entries; refresh against the two-platform canon is a post-deploy follow-up. See CLAUDE.md → "Image coverage tooling". |
| `SOURCES.md` | — | Selection criteria, methodology, source citations, data sourcing rationale, and known gaps. |
| `COVERAGE.md` | — | Per-category counts, image hit rate, gaps list, notes for follow-up. |

Canon is committed in **compact one-record-per-line JSON** (see
`_build/merge_batches.py` `_compact_lines()`). Same byte size, line counts
in `git diff` are sane — and `.gitattributes` marks each file `-diff` so
GitHub renders changes as binary in the per-file view. Substantive review
of canon changes happens at the producer level (re-run the gatherer + read
the run log), not by reading 50k JSON lines.

## ID convention

Every node's `id` is `<type>:<human-readable name>` — spaces preserved,
lowercase. Per CLAUDE.md: `practitioner:casey reas`, `artwork:fidenza`,
`concept:generative art`, `classification_regime:adai seed canon v1 april 2026`.
The separate `slug` field is kebab-case for URLs.

**Artwork ids are always disambiguated** when the producer knows the
source's external id: `artwork:delineation--fxhash-31648`,
`artwork:fidenza--artblocks-0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270:78`.
The producer-side `_slug.node_id()` helper enforces this — generic titles
collide at scale (the slug-disambiguation pass, PR #25, caught colliding
`artwork:untitled` / `artwork:black hole` nodes). Same logic guards
practitioners in the generic-name set, though that set is currently empty.

## Status field

Every node's metadata is **source-attested only**. The validator's
anti-enrichment rule rejects narrative fields (`description`, `bio`,
`summary`, `notes`, `biography`) unless a sibling source URL is present
(`source_url`, `wikipedia_url`, `wikidata_url`, or `citations[].url`).

No `status` taxonomy is needed post-rebuild — every node was either
fetched from an API (status implicit: confirmed-by-source) or derived
from explicit source tags (status implicit: rule-emitted). The earlier
v1 `status` field (`confirmed` / `bridge` / `draft`) reflected an
editorial review workflow that the contract now enforces at emit time.

## Classification regimes

Six regimes, held in `nodes.json` as `classification_regime` type nodes:

- `classification_regime:adai seed canon v1 april 2026` — the canonical
  lens. 3,451 CLASSIFIED_BY edges (one per artwork).
- 5 sub-lenses for cross-source positioning. On the two-platform canon
  only one carries edges:
  - **Crypto Market-Native** — Art Blocks / fxhash artworks (3,451 edges,
    one per artwork — every artwork here is an on-chain generative token).
  - **Euro-American Institutional**, **Academic Media-Art History**,
    **Asia-Pacific Institutional**, **Practitioner Self-Report** —
    schema-reserved, currently zero. They populate when a non-crypto
    source (a correctly-configured Wikidata, an institutional API) returns.

The genealogy of each entry — which regime classified it, when, by whom —
is visible directly in the graph via the CLASSIFIED_BY edges.

## Ingesting into the database

The JSON files map 1:1 to the tables in `db.sql`. The canonical path is
`npm run seed:consolidated` which reads `seed/*.json` + applies the
image overlay. A minimal manual ingest:

```python
import json, sqlite3
conn = sqlite3.connect("adai.db")
conn.executescript(open("db.sql").read())

for row in json.load(open("seed/nodes.json")):
    conn.execute(
        "INSERT OR IGNORE INTO nodes (id, type, name, slug, metadata) VALUES (?, ?, ?, ?, ?)",
        (row["id"], row["type"], row["name"], row["slug"], row["metadata"])
    )
# repeat for edges, signals, contributors, aliases
conn.commit()
```

For a Production-equivalent build, see [`../Dockerfile`](../Dockerfile) —
multi-stage with the seeder baking `seed.db` into the image.

## Image coverage tooling

Two `_build` scripts keep node images healthy and fill gaps. Both are
producers: they propose, curators dispose. Neither hand-edits canon — the
write path is `find_missing_images.py --apply --write` against the
**overlay** (`seed/image_overlay.json`), and only for reviewed candidates.

- **`sanitize_images.py`** — link-rot scanner (read-only). HEAD/GET-checks
  every `image_url` + `cdn_image_url` and classifies each node `ok` /
  `upstream_rotted` (mirror alive, upstream dead — fine) / `cdn_dead`
  (re-mirror with `upload_to_r2.py`) / `both_dead` (proposes an
  IPFS-gateway or Wayback fallback in the report). Healing is
  `upload_to_r2.py`'s job; this only diagnoses. Report →
  `image_sanitize_report.json` (gitignored).

- **`find_missing_images.py`** — discovery for imageless nodes. Tier 1
  resolves a Wikidata QID (from `aliases.json`, else a `P31`-verified
  name search) and pulls `P18` / `P154`; Tier 2 (`--agentic`, experimental,
  needs `ANTHROPIC_API_KEY`) is an LLM web search for the long tail. Every
  candidate is HEAD-validated to a live image and carries provenance
  (QID + property). Artworks are never name-searched (generic-title
  collisions) — QID-alias only.

  Confidence: `high` = QID-alias match · `medium` = type-verified search ·
  `low` = unverified search. Candidates stage to `image_candidates.json`
  (committed, reviewable). Workflow:

  ```bash
  python3 seed/_build/find_missing_images.py                 # stage
  # review image_candidates.json; set "approved": true on keepers
  python3 seed/_build/find_missing_images.py --apply --write # → image_overlay.json
  seed/_build/.venv/bin/python3 seed/_build/upload_to_r2.py --overlay  # → cdn_image_url
  # only if the overlay added ARTWORK images:
  seed/_build/.venv/bin/python3 seed/_build/embed_nodes.py
  seed/_build/.venv/bin/python3 seed/_build/project_umap.py
  git add seed/image_overlay.json seed/embeddings.{bin,json,umap2d.json}
  ```

The Docker builder re-applies the overlay on every build (image-only,
gap-fill, idempotent). The image overlay carries v1-era entries; most no
longer match the two-platform canon (the institutions / collectives the
rebuild dropped). Refresh is a follow-up post-deploy — most artworks
already carry an upstream `image_url` from their platform.

## What this does NOT include (yet)

- **Anything outside the two platforms.** The canon is Art Blocks + fxhash
  only — every node is an on-chain generative artwork or its artist. No
  institutions, scenes, collectives, publications, or projects. Those
  return when a correctly-configured broader source (a fixed Wikidata, an
  institutional API) is added, or via the contributor API.
- **Non-platform practitioners.** Theorists, pre-digital pioneers, sound
  artists, curators — the field's intellectual spine — carry no platform
  token, so no gatherer here sees them. They are the highest-value
  contributor target.
- **PRACTICES edges.** Zero — they were QID-derived, and platform artists
  carry no occupation/movement QIDs. They return with a QID-bearing source.
- **Practitioner self-report.** RESPONDS_TO, CONTESTS, TENSION_WITH are
  reserved for first-person contribution and currently empty by design.
- **Deeper platform enrichment.** Current gatherers carry token IDs and
  thumbnails; tag-set / collection-tier / license analysis is a follow-up.

## Provenance

Every node and edge carries `signal_id` pointing to a row in
`signals.json`, which carries `processing_trace` (gatherer config +
git_sha + argv at run time) and `provenance_chain` (source endpoint +
fetched_at). Every row also carries `created_by` (= `contributor:migration`
during the rebuild) and `batch_id` (= `<producer>-<YYYYMMDDhhmm>`).

The current 3 signals:

| signal_id | producer | source |
|---|---|---|
| `signal:artblocks-2026-05` | artblocks | data.artblocks.io/v1/graphql (V0/V1/V3 contracts) |
| `signal:fxhash-2026-05` | fxhash | api.fxhash.xyz/graphql (paged sweep) |
| `signal:curation-2026-05` | curation | seed/{nodes,edges}.json post-merge (rule-derived) |

The producer-model discipline is documented in
[`_build/PRODUCER_CONTRACT.md`](_build/PRODUCER_CONTRACT.md). Don't
hand-edit `seed/*.json` — write a producer.

---

**Come sense with us.** Every edge here is contestable. If you're a
practitioner reading this and the machine got your work wrong, the
corrective edge has a place in the graph at the highest trust tier
the system offers. That's where the canon stops being a canon and
starts being intelligence.
