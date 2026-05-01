# seed/ coverage — post real-source + named-anchors passes (April 28, 2026)

Updated against GitHub branch `claude/integrate-seed-consolidation`. Supersedes the April 22 post-enrichment report.

Full task-by-task provenance: `seed/enrichment-trace.json` and per-pass merge bundles in `seed/_build/`.

## Totals

| Category | Apr 20 build | Apr 22 enrichment | **Apr 28 (current)** |
|---|---|---|---|
| Total nodes | 723 | 1,007 | **1,530** |
| Total edges | 1,297 | 2,486 | **3,371** |
| Edge types | 4 | 9 | 9 |
| Provenance signals | 1 | 1 | **12** |
| Staking contributors | 1 | 1 | **10** |
| Wikidata aliases | 60 | 60 | 60 |

## Nodes by type

| Type | Apr 22 | **Apr 28** | Δ |
|---|---|---|---|
| `artwork` | 399 | **728** | +329 (objkt thumbnails + Wikidata depicts + MoMA digital + Rhizome ArtBase net.art + fxhash + 9 named anchors) |
| `concept` | 318 | **474** | +156 (real-source tag vocabulary + 3 named-anchor concepts) |
| `practitioner` | 117 | **146** | +29 (22 Paul-canon + 12 named anchors + dedup adjustments — 12 named anchors include 2 theorist-anchor stubs) |
| `institution` | 121 | **121** | unchanged |
| `scene` | 26 | **30** | +5 Paul-canon scenes (bio art and artificial life, telematic art and telepresence, virtual and immersive environments, locative and mobile art, software art) – 1 merge |
| `collective` | 8 | **12** | +4 (etoy, Critical Art Ensemble, Electronic Disturbance Theater, Eva and Franco Mattes) |
| `classification_regime` | 6 | 6 | unchanged |
| `platform` | 8 | 8 | unchanged |
| `publication` | 3 | 3 | unchanged |
| `project` | 2 | 2 | unchanged |

## Practitioner status breakdown

| Status | Count | Source origin |
|---|---|---|
| `confirmed` | **141** | 44 `human_secondary` (original research) + 70 `ai_assisted` (April 22 enrichment) + 22 `webscrape` (Paul-canon Wikidata pass) + 10 `webscrape` (named-anchors pass: JODI, Eva & Franco Mattes, VNS Matrix, Rafaël Rozendaal, Shu Lea Cheang, Coco Fusco, Rosa Menkman, Stephanie Dinkins, John Gerrard, Maurice Benayoun) |
| `stub` | **3** | Sol LeWitt, Gilbert Simondon, Augusto de Campos — preserved as INFLUENCES anchors; not digital-arts practitioners |
| `anchor` | **2** | Friedrich Kittler, Vilém Flusser — theorist anchors from the named-anchors pass |

Every confirmed practitioner has the canonical top-level metadata fields populated: `practice_summary`, `methodology`, `medium`, `key_works`, `exhibitions`, `scene_affiliation`, `collaborators`, `commons_summary`, `governance_summary`. Practitioners added via the April 28 passes inherit Wikidata's structured data and may have thinner editorial fields pending review.

## Edges by type

| Edge type | Apr 22 | **Apr 28** | Notes |
|---|---|---|---|
| **EMBODIES** | 621 | **1,096** | What artworks are *about*. 564 heuristic-keyword EMBODIES (April 22 scaffolding) deleted on April 28; replaced by 1,035 source-attested edges from objkt tags (975), fxhash tags (37), Wikidata depicts (23). 57 hand-assigned (medium confidence) survive. 4 from named-anchors pass. |
| **CREATED_BY** | 405 | **737** | +332 from real-source pass: 179 objkt + 82 Wikidata depicts + 49 Rhizome ArtBase net.art + 26 MoMA digital + 9 named-anchors + 8 fxhash API. |
| **PRACTICES** | 461 | 461 | Unchanged. |
| **EXHIBITED_AT** | 300 | **305** | +4 Wikidata-attested + 1 named-anchors (Shu Lea Cheang's "Wet Networks" → Queens Museum). |
| **CLASSIFIED_BY** | 283 | **295** | +12 from named-anchors pass (one per named-anchor practitioner → A(DAI) seed canon root). |
| **BELONGS_TO** | 154 | **188** | +34: 31 Paul-canon practitioners → 5 new scenes; +2 named anchors (e.g. VNS Matrix → feminist digital practice via cyberfeminism alias); +1 misc. |
| **COLLABORATES_WITH** | 183 | 183 | Unchanged. |
| **USES_TECHNIQUE** | 75 | **102** | +27 from MoMA digital department CSV (technique metadata). |
| **INFLUENCES** | 4 | 4 | **Deliberately sparse by design** — see SOURCES.md §"Why the seed is structured this way". Sol LeWitt → Casey Reas; Stiegler → Yuk Hui; Simondon → Yuk Hui; de Campos → Cordeiro. |
| RESPONDS_TO | 0 | 0 | **The second reading.** Reserved for first-person practitioner testimony — "this work answers that one." Zero is not incomplete; it marks where the loop closes. See SOURCES.md §"Two readings". |
| CONTESTS / TENSION_WITH | 0 | 0 | **The second reading.** Reserved for first-person practitioner contribution — corrections, refusals, frontier framings the machine couldn't see. Zero by design. |

## Image coverage

| Scope | Apr 20 | Apr 22 | **Apr 28** | Coverage |
|---|---|---|---|---|
| Artworks with images | 21 / 239 (8.8%) | 94 / 399 (23%) | **335 / 728** | **46%** |
| — Art Blocks | 21 | 21 | 21 | — |
| — MoMA (combined) | 0 | 65 | ~91 | +26 from MoMA digital pass |
| — fxhash | 0 | 8 | ~45 | +37 from fxhash tags pass |
| — Wikidata depicts/genre | 0 | 0 | ~23 | new |
| — objkt thumbnails | 0 | 0 | ~146 | new |
| — Rhizome ArtBase | 0 | 0 | ~49 | new |
| — Named-anchors (Wikidata) | 0 | 0 | 9 | new |
| Practitioner portraits | 35 / 87 (40%) | 35 / 117 (30%) | 35 / 146 (24%) | Wikidata P18 on person entity |

The April 28 real-source pass roughly tripled image coverage. 393 artworks remain image-less — most are the in-graph references from `key_works[]` arrays whose canonical titles don't match any indexed source.

**Practitioner portrait coverage went down in percentage** despite no portrait passes running, because the practitioner count grew (+29 from Paul-canon + named anchors) without corresponding portrait fetches. A follow-up Wikidata P18 run on the new practitioners would lift coverage back above 40%.

## Scenes (26)

Distribution, each tagged with grounding source (SOURCES.md seed-canon categories / `outline.yaml` traditions / practitioner language / established field usage / Claude inference). One scene — `infrastructure and artist-run platforms` — is marked "Claude inference" and flagged for editorial review.

| Count | Grounding | Scene |
|---|---|---|
| 14 | SOURCES.md | post-internet art |
| 12 | SOURCES.md | sound art |
| 11 | SOURCES.md | generative art |
| 11 | SOURCES.md | net art |
| 11 | SOURCES.md | crypto art |
| 11 | practitioner language | creative coding |
| 9 | SOURCES.md | AI art |
| 9 | SOURCES.md | early computer art |
| 7 | established field usage | new media art |
| 6 | practitioner language | speculative and sci-fi practice |
| 5 | SOURCES.md | game art |
| 5 | practitioner language | race technology and digital culture |
| 5 | outline.yaml | data art |
| 5 | practitioner language | critical tech art |
| 5 | established field usage | feminist digital practice |
| 4 | practitioner language | forensic and research-based art |
| 4 | practitioner language | digital art infrastructure (renamed from "infrastructure and artist-run platforms") |
| 4 | established field usage | tactical media |
| 3 | practitioner language | performance art |
| 3 | SOURCES.md | digital installation |
| 3 | SOURCES.md | glitch art |
| 2 | practitioner language | blockchain governance and DAO art |
| 2 | established field usage | digital-art preservation |
| 2 | SOURCES.md | video art and moving image |
| 2 | practitioner language | sound/audio-visual performance |

## What the April 22 enrichment did

Task 0 — **profile normalisation + cleanup**: extracted canonical top-level metadata fields from every practitioner's `full_profile`; deepened 42 intentional-draft profiles + 29 stub promotions; removed 108 phantom auto-generated stubs; retargeted 19 stubs to existing canonical nodes; kept 3 historical-figure stubs as INFLUENCES anchors; merged 2 seed classification regimes into one canonical lens; retired the 483-edge A(DAI) root explosion.

Task 1 — **EXHIBITED_AT edges**: 307 edges, 148 institutions. Cleanup pass then merged 17 duplicate institution variants, retyped 3 nodes to platform/publication, dropped 10 fragment/non-venue artifacts.

Task 2 — **COLLABORATES_WITH reclassification**: 14 edges reclassified (6 pract→inst as EXHIBITED_AT, 6 artwork→venue, 2 INFLUENCES reversed); 234 kept as genuine collaborations; 17 non-person partnerships (platform↔institution) kept as COLLABORATES_WITH.

Task 3 — **EMBODIES + USES_TECHNIQUE**: 621 + 75 edges, 63 new thematic concept nodes. 20 high-visibility artworks hand-assigned; the other 564 EMBODIES were heuristic keyword scaffolding — superseded in the April 28 pass below.

Task 4 — **BELONGS_TO scenes**: 155 edges, 26 scenes, post-audit. Removed `digital-arts theory` (theorists positioned via INFLUENCES) and `Asia-Pacific digital art` (geographic, not practice). Renamed `Black digital art` → `race technology and digital culture`. Added `new media art`, `performance art`, `critical tech art`. Merged `commons and open-source culture` into `digital art infrastructure`.

Task 5 — **dedup**: 0 exact duplicates (earlier passes had caught them), 47 symmetric COLLABORATES_WITH collapsed (A↔B directional duplicates).

**April 22 image pipeline**: Wikidata P18 portraits (35 practitioners), MoMA Collection CSV patches (7 existing artworks + 58 new artworks with CREATED_BY edges across 23 practitioners), fxhash API (8 new artworks from Jonas Lund + Kim Asendorf VERIFIED accounts).

## What the April 28 real-source pass did

Replaced the April 22 heuristic EMBODIES with source-attested edges from public APIs and linked-open-data. Every contributing signal recorded in `signals.json`:

- **`gatherer-objkt-tags-v3`** — objkt.com Hasura GraphQL: 975 EMBODIES + 179 CREATED_BY from artist-applied tags. False matches (e.g. "beeple fan" → Beeple) pruned.
- **`gatherer-fxhash-tags-v3`** — fxhash GraphQL: 37 EMBODIES from artist-set tags on generative tokens.
- **`gatherer-wikidata-v3b`** — Wikidata SPARQL: 23 EMBODIES + 82 CREATED_BY + 8 BELONGS_TO + 4 EXHIBITED_AT from depicts/genre.
- **`gatherer-moma-digital-v3`** — MoMA Artworks.csv (digital department filter): 27 USES_TECHNIQUE + 26 CREATED_BY.
- **`gatherer-rhizome-artbase-v1`** — Rhizome ArtBase SPARQL: 49 CREATED_BY for net.art works. Practitioner reconciliation: name-normalised exact equality only (no substring matching, the failure mode that produced earlier false-matches).
- **`gatherer-paul-canon-v1`** — Wikidata pull keyed on Christiane Paul's *Digital Art* index: 22 new practitioners + 5 missing scenes + 31 BELONGS_TO.

Net effect: −564 heuristic EMBODIES, +1,442 source-attested edges, +21% image coverage.

## What the April 28 named-anchors pass did

A 12-entry hand-curated pass (`gatherer-wikidata-named-anchors`) closed canonical-figure gaps surfaced during the real-source pass review. Verifies QIDs first, then queries P170/P135/P136.

Adds 12 practitioners + 9 artworks + 3 concepts + 27 edges:
- 10 practitioners: JODI, Eva & Franco Mattes, VNS Matrix, Rafaël Rozendaal, Shu Lea Cheang, Coco Fusco, Rosa Menkman, Stephanie Dinkins, John Gerrard, Maurice Benayoun
- 2 theorist-anchor stubs: Friedrich Kittler, Vilém Flusser
- 9 artworks: JODI's "Automatic Rain" / "All Wrongs Reversed" / "ZYX", John Gerrard's "Dust Storm Manter Kansas" / "Solar Reserve Tonopah Nevada", VNS Matrix's "Cyberfeminist Manifesto", Stephanie Dinkins' "Secret Garden", Shu Lea Cheang's "Wet Networks", Rafaël Rozendaal's "Neo Geo City"
- 3 new concepts: solar power plant, time-based media, site-specific art
- 27 edges: 12 CLASSIFIED_BY + 9 CREATED_BY + 4 EMBODIES + 1 BELONGS_TO (VNS Matrix → feminist digital practice, via cyberfeminism alias) + 1 EXHIBITED_AT (Shu Lea Cheang → Queens Museum)

## Provenance closure

Both registries close after the April 28 passes:

- **`signals.json` — 12 records.** Every `signal_id` referenced on an edge resolves to a real signal record. Every signal has `source_url`, `source_type`, `submitted_by`, `consent_scope`, `source_origin`.
- **`contributors.json` — 10 records.** Every `created_by` and `updated_by` reference resolves to a real contributor record. 1 founding-team script (`contributor:migration`) + 9 `agent`-typed gatherers, with `trust_tier` carrying the meaningful distinction.

The supersession of the April 22 heuristic EMBODIES is encoded in plain English in the relevant signal records — anyone reading `signals.json` can trace the swap from `enrichment-seed-canon-v1-2026-04` to its three superseder signals.

## What these passes did **not** do — and why

- **Did not populate RESPONDS_TO, CONTESTS, TENSION_WITH.** These are architecturally reserved for practitioner contribution — see SOURCES.md §"Why the seed is structured this way". Populating them from training knowledge or institutional data would misrepresent the source of the claim.
- **Did not deepen profiles for the 32 practitioners added on April 28.** The 22 Paul-canon + 10 named-anchor practitioners enter with Wikidata-attested structured data but thinner editorial fields than the 114 deeply-researched profiles. Targeted editorial deepening before Basel is the next step.
- **Did not run portrait fetches for the new practitioners.** Practitioner portrait coverage dropped from 30% → 24% in percentage terms because the count grew without a corresponding Wikidata P18 pass on the new entries.

## Known limitations (post April 28)

Earlier limitations about noisy concepts, missing institution nodes, and heuristic EMBODIES are addressed. New / persisting limitations:

1. **Concept vocabulary still has deliberate multiplicity.** 18 AI-related concept variants preserved (not collapsed), per editorial direction — the diversity of framings is signal, not noise. A future practitioner review may merge where merging is the practitioner's own framing.
2. **One scene is a Claude-inference composite label.** `digital art infrastructure` (formerly `infrastructure and artist-run platforms`) was renamed to better match practitioner language, but still flagged.
3. **fxhash coverage remains narrow.** Two passes (`fxhash-api-ingest-2026-04-22`, `fxhash-tags-ingest-2026-04-28`) cover ~45 works total. Schema-deeper fxhash work would close gaps for Iskra Velitchkova, Michaël Zancan, and others.
4. **Met Open Access not yet ingested.** Public-domain artwork images for digital-art holdings remain unlit. Next Tier 1 candidate.
5. **Editorial depth lag.** 32 practitioners added on April 28 from Wikidata structured data have lighter `full_profile` fields than the 114 deeply-researched ones. Editorial deepening is queued.
6. **No RESPONDS_TO, CONTESTS, or TENSION_WITH edges** — by design. See SOURCES.md.

## Citation

See `seed/SOURCES.md` § "How to cite this seed" for the v1 citation paragraph. Every claim in this report is backed by per-task reports at `seed/_build/task{1..5}_report.json`, the top-level trace at `seed/enrichment-trace.json`, the merge bundles `seed/_build/real_source_merge_2026-04-28.json` and `seed/_build/wikidata_named_anchors_2026-04-28.json`, and the provenance registry at `seed/signals.json` + `seed/contributors.json`.

---

## Read this honestly

The numbers above describe a machine reading of the field. They are dense, source-attested, and incomplete *on purpose*. The practitioner reading is what closes the loop: `RESPONDS_TO`, `CONTESTS`, `TENSION_WITH`, and any edge entering at `lived_experience: 1`.

A useful test for whether A(DAI) is working: do those columns start filling up after Basel? If they don't, the system is mirroring its founders, not sensing the field. If they do — and especially if they contradict what's here — the protocol is doing what it was designed to do.

**Come sense with us.**
