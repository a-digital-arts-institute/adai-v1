# seed/ coverage — Seed Canon (May 2026)

> **⚠️ Status note (May 2026).** What ships is the **curated-platform + V&A
> pipeline** — Art Blocks (curated Ethereum generative) + a `--curate`d slice of
> fxhash (the collector-validated 2021 Tezos generative canon) + the V&A Computer
> Arts Society collection (1960s–70s computer-art spine) + SuperRare (the 2018
> genesis of crypto art, curated 1/1). No MoMA, no Wikidata,
> no cull. Two May-2026 passes shaped it: the **V&A de-bias pass** (historical
> spine, IIIF-imaged) and the **fxhash curation pass** (relevance + secondary-
> market demand gate — killed the permissionless trash + over-dominance). **Exact
> counts: [`STATS.md`](STATS.md)** (generated, can't drift) / `GET /api/stats`.
> Any superseded column below — v1 (1,491), sweep (16k), cull (8,653), two-platform
> (4,558), V&A-pass-pre-curation (5,930) — is history. See
> [`../CLAUDE.md`](../CLAUDE.md) § "The rebuild journey".

Two-platform-plus-V&A snapshot. The full v1 enrichment narrative and the
dropped four-source sweep are preserved in git history. The current canon
starts from clean source-attested data — every node is an on-chain generative
artwork, a V&A computer-art holding, or its maker/institution; this report
describes only what's in it.

## Counts

**All exact counts live in [`STATS.md`](STATS.md)** — generated from the canon
by `seed/_build/gen_stats.py` so they can't drift. Live counts on a running
server: `GET /api/stats`. This file describes *shape and gaps*; the numbers are
there. The May 2026 V&A de-bias pass added ~1,372 nodes (the 1960s–70s
computer-art spine + 1 institution + 6 collectives) on top of the clean
two-platform base.

Node types present: `artwork`, `practitioner`, `concept`,
`classification_regime`, `collective`, `platform`, `institution`. Live curated
edge types: CLASSIFIED_BY, CREATED_BY, EXHIBITED_AT, EMBODIES, and **PRACTICES**
(revived by the V&A pass — V&A makers → computer-art; it was 0 on the
platform-only base since platform artists carry no QIDs). BELONGS_TO /
COLLABORATES_WITH / USES_TECHNIQUE / INFLUENCES are reserved at zero;
RESPONDS_TO is empty by design (first-person testimony only).

**Concepts** are 8 source-anchored base concepts (digital / computer /
generative / algorithmic / software / interactive / new-media / internet art)
PLUS tag-concepts minted from artist-applied fxhash tags (`TAG_STOPLIST`-
filtered) — every one source-attested (a Wikidata-anchored base concept or a
tag the artist actually wrote), not LLM-derived.

**Why scenes / publications / projects are still zero:** the platform gatherers
only emit nodes attested by their source — Art Blocks + fxhash give
`platform:art-blocks` + `platform:fxhash` and nothing else. The V&A pass adds
the first **institution** (Victoria and Albert Museum) and the first
**collectives** (artistic groups, e.g. the Computer Technique Group), because
the V&A's records attest a holding institution and group makers. The remaining
editorial layer (scenes, publications, projects, non-V&A institutions) is
deferred to post-deploy contribution or a correctly-configured broader source.

**The reserved edge types** return when source data or practitioner
contribution supports them: BELONGS_TO needs scene nodes; COLLABORATES_WITH
needs multi-creator artwork detection (the gatherers emit one CREATED_BY per
token); USES_TECHNIQUE needs technique-level concept vocabulary; INFLUENCES
carries a high editorial bar (curation against citations or practitioner
contribution).

## Embeddings + auto-derived edges

Gemini multimodal vectors (`seed/embeddings.bin`) are committed sidecars baked
into `seed.db`; the daily `embed-derive-daily` workflow backfills + re-derives
against the live Fly DB. The derived layers — **STYLE_KIN** (creator ↔ creator),
**VISUALLY_AFFINE** (artwork ↔ artwork), and Tier-2 concept-EMBODIES (inferred
tag labels) — are recomputed each run; counts in [`STATS.md`](STATS.md).
`SUGGESTS_CREATED_BY` proposals land in `intake_queue` (`/review?kind=ai_suggestion`).

The 1960s V&A pioneers form a tight internal STYLE_KIN cluster
(Nake↔Nees↔Mohr↔Molnár↔Noll↔Verostko) and receive **zero** Tier-2 cross-era
edges — the embeddings keep 1968 and 2021 honestly distinct, so the eras connect
through shared *curated* concepts, not fabricated visual similarity. Surfaces
(profile sections, `/embed-space`) are live from the baked DB.

## Image coverage

**Every artwork carries a mirrored R2 image** — enforced by the `--require-cdn`
merge flag (Art Blocks `media.artblocks.io/thumb/`, fxhash `displayUri` →
gateway.fxhash2.xyz, V&A IIIF `framemark.vam.ac.uk`). The V&A's IIIF served all
its artworks cleanly (no Commons-429 — the wall the Wikidata attempt hit). The R2
mirror (`cdn_image_url`, content-addressed, rot-insurance) is read by the embedder
via `seed/image_mirror.json`; `image_url` (upstream) stays the provenance record.
Practitioner portraits exist only where the platform exposes one; V&A makers carry
none (a long-tail `find_missing_images.py` gap-fill candidate).

## What this does NOT include (yet)

1. **Most of the non-platform field.** The V&A pass added the historical
   computer-art spine (1960s–70s pioneers + 1 institution + 6 collectives),
   but scenes / publications / projects, non-V&A institutions, sound artists,
   net-art, and contemporary theorists are still absent. Editorial work,
   deferred to post-deploy contribution or further correctly-configured
   sources. The contributor API + `find_missing_images.py` discovery are the
   channels. (Sound/video/installation were *deliberately* excluded from this
   canon — see `derive_curation.py`.)
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
