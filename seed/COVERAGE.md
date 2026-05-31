# seed/ coverage — Seed Canon (May 2026)

> **⚠️ Status note (May 2026).** What ships is the **clean two-platform
> pipeline: 4,509 nodes / 17,385 curated edges** (artwork 3,477,
> practitioner 1,016, concept 8, regime 6, platform 2; edges CLASSIFIED_BY
> 6,954 · CREATED_BY 3,477 · EXHIBITED_AT 3,477 · EMBODIES 3,477 ·
> PRACTICES 0). Assembled from only the Art Blocks + fxhash gatherers — no
> MoMA, no Wikidata, no cull. The four-source sweep and its digital-art cull
> were dropped after the Wikidata QID list was found corrupt. Any v1/sweep/
> cull column below (1,491 / 16k / 8,653) is superseded. See
> [`../CLAUDE.md`](../CLAUDE.md) § "The rebuild journey".

Two-platform snapshot. The full v1 enrichment narrative and the dropped
four-source sweep are preserved in git history. The current canon starts
from clean platform-attested data — every node is an on-chain generative
artwork or its artist; this report describes only what's in it.

## Totals

| Category | v1 (Apr 28) | **Shipped (May 2026)** | Note |
|---|---|---|---|
| Total nodes | 1,491 | **4,509** | ~3× — broad on platform artworks/artists, narrow on the editorial layer |
| Total edges | 4,544 | **17,385** | every artwork carries CLASSIFIED_BY (×2) + EXHIBITED_AT + CREATED_BY + EMBODIES |
| Edge types live | 9 | 4 | CLASSIFIED_BY / CREATED_BY / EXHIBITED_AT / EMBODIES. PRACTICES 0 (QID-derived); BELONGS_TO / COLLABORATES_WITH / USES_TECHNIQUE / INFLUENCES reserved at zero; RESPONDS_TO empty by design |
| Provenance signals | 12 | **3** | one per producer: artblocks, fxhash, curation |
| Contributors | 10 | **1** | `contributor:migration` trust tier `reviewed` |
| Wikidata aliases | 60 | **10** | not a Wikidata ingest — these 10 platform artists simply happen to carry a QID |

## Nodes by type

| Type | v1 (Apr 28) | **Shipped (May 2026)** |
|---|---|---|
| `artwork` | 728 | **3,477** |
| `practitioner` | 146 | **1,016** |
| `concept` | 474 | **8** |
| `classification_regime` | 6 | **6** |
| `platform` | 8 | **2** (Art Blocks, fxhash) |
| `institution` | 121 | 0 |
| `scene` | 30 | 0 |
| `collective` | 12 | 0 |
| `publication` | 3 | 0 |
| `project` | 2 | 0 |

Why concepts dropped from 474 → 8: v1's concept vocabulary was largely
LLM-derived ("AI-related variants preserved as signal, not noise" was the
v1 framing). The shipped canon keeps only the source-anchored generative-art
vocabulary emitted by `derive_curation.py` (digital / computer / generative
/ algorithmic / software / interactive / new-media / internet art). Future
practitioner contributions can extend it, but the seed is intentionally narrow.

Why institutions / scenes / collectives are zero: v1 curated those by hand
from practitioner research, and the dropped MoMA sweep would have added one
institution. The two-platform gatherers only emit nodes attested by their
source — Art Blocks + fxhash give `platform:art-blocks` + `platform:fxhash`
and nothing else. The whole editorial layer is deferred to post-deploy
contribution or a correctly-configured broader source.

## Edges by type

| Edge type | v1 (Apr 28) | **Shipped (May 2026)** |
|---|---|---|
| **CLASSIFIED_BY** | 295 | **6,954** (every artwork → A(DAI) lens + crypto-market-native sub-regime) |
| **CREATED_BY** | 737 | **3,477** (one per artwork → its platform artist) |
| **EXHIBITED_AT** | 305 | **3,477** (one per artwork → its platform: fxhash 3,000, Art Blocks 477) |
| **EMBODIES** | 1,096 | **3,477** (every artwork → `concept:generative art`) |
| **PRACTICES** | 461 | **0** (was QID-derived; platform artists carry no QIDs) |
| **BELONGS_TO** | 188 | 0 |
| **COLLABORATES_WITH** | 183 | 0 |
| **USES_TECHNIQUE** | 102 | 0 |
| **INFLUENCES** | 4 | 0 |
| RESPONDS_TO | 0 | 0 (empty by design — first-person testimony only) |

PRACTICES and the four reserved rows return when source data or
practitioner contribution supports them:

- **PRACTICES** (practitioner → concept): was derived from Wikidata
  movement/occupation QIDs. Platform artists carry no such QIDs, so it's
  empty until a QID-bearing source (a correctly-configured Wikidata) returns.
- **BELONGS_TO** (practitioner → scene): blocked on scene nodes existing.
- **COLLABORATES_WITH**: blocked on multi-creator artwork detection — the
  gatherers currently emit a single CREATED_BY per token.
- **USES_TECHNIQUE**: blocked on concept vocabulary expansion to technique
  level.
- **INFLUENCES**: high editorial bar; re-add via a curation pass against
  established art-historical citations or practitioner contribution.

## Embeddings + auto-derived edges

| Layer | Status |
|---|---|
| `seed/embeddings.bin` (Gemini multimodal vectors) | Committed sidecars, baked into `seed.db` at build. The daily `embed-derive-daily` GitHub Actions workflow backfills anything new against the live Fly DB. |
| `seed/embeddings.umap2d.json` (UMAP scatter) | Committed; workflow re-fits UMAP on the GH runner and SFTPs back to `/data/embeddings.umap2d.json`. |
| `STYLE_KIN` (practitioner ↔ practitioner, derived) | ~694 rows, baked in; refreshed by `npm run embed:derive` in the daily workflow. |
| `VISUALLY_AFFINE` (artwork ↔ artwork, derived) | ~9,052 rows, baked in. Same refresh. |
| `SUGGESTS_CREATED_BY` (AI attribution proposals) | Lands in `intake_queue`, surfaces at `/review?kind=ai_suggestion`. |

Embedding surfaces (profile style-kin / visually-affine sections,
`/embed-space`) are live from the baked DB; the daily workflow keeps them
fresh as contributors add nodes.

## Image coverage

The seed carries `image_url` on:

| Scope | Has `image_url` | Source |
|---|---|---|
| Artworks (3,477) | ~All | Art Blocks `media.artblocks.io/thumb/`, fxhash `displayUri` → gateway.fxhash2.xyz |
| Practitioners (1,016) | Where the platform exposes a portrait | Art Blocks / fxhash artist asset |

The R2 image mirror (`cdn_image_url`) covers ~3,451 artwork images
(content-addressed, rot-insurance) and is read by the embedder via
`seed/image_mirror.json`. `image_url` (upstream) remains the provenance
record. The v1-era `image_overlay.json` mostly no longer matches the
two-platform canon; a refresh is a post-deploy follow-up.

## What this does NOT include (yet)

1. **Anything outside the two platforms.** No institutions / scenes /
   collectives / publications / projects, and no non-platform practitioners
   (theorists, pioneers, sound artists). Editorial work, deferred to
   post-deploy contribution or a correctly-configured broader source. The
   contributor API + `find_missing_images.py` discovery are the channels.
2. **A correctly-configured Wikidata / objkt / Met pass.** `fetch_wikidata.py`
   is quarantined (corrupt QID list); re-enabling it with curated occupation
   QIDs is the documented "try more" path.
3. **Practitioner self-report.** RESPONDS_TO, CONTESTS, TENSION_WITH are
   reserved for first-person contribution. Currently zero — by design.
4. **Multi-creator collapse to COLLABORATES_WITH.** A single CREATED_BY is
   emitted per token. Refactor opportunity.
5. **Asia-Pacific and Latin American institutional sources.** No public
   APIs; requires institutional outreach.

## Read this honestly

The numbers above describe a machine reading of the field. They are
dense, source-attested, and incomplete *on purpose*. The practitioner
reading is what closes the loop: `RESPONDS_TO`, `CONTESTS`, `TENSION_WITH`,
and any edge entering at `lived_experience: 1`.

A useful test for whether A(DAI) is working: do those columns start
filling up after Basel? If they don't, the system is mirroring its
founders, not sensing the field. If they do — and especially if they
contradict what's here — the protocol is doing what it was designed to
do.

**Come sense with us.**
