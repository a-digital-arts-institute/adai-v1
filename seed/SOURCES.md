# Seed Canon: Sources & Methodology

> **⚠️ Status note (May 2026).** What ships is the **cleaned v1 editorial
> canon** (1,491 nodes), produced by `_build/restore_canon.py`. Parts of
> this doc were updated mid-session to describe a v2 *source-attested
> sweep* (16k nodes) that was built and then **superseded** by the restore.
> The **six selection criteria below are the authoritative editorial logic**
> and still describe the shipped canon. Where the methodology / counts
> mention the four-gatherer sweep (MoMA/Wikidata/Art Blocks/fxhash) or
> 16k/50k figures, treat that as the *regrowth pipeline* (infrastructure for
> expanding past the 146 post-Basel), not the current canon. Authoritative
> counts + the full arc live in [`../CLAUDE.md`](../CLAUDE.md) § "The rebuild
> journey".

## What this document is

This file documents how the A(DAI) seed canon was assembled — the selection criteria, the sources consulted, the methodology applied, and the gaps acknowledged. It exists to make the canon's provenance transparent and its editorial decisions defensible.

The seed canon is a starting point. It is *a* canon, not *the* canon — the indefinite article is load-bearing. Every entry carries a `source_origin` field (`human_secondary`, `ai_assisted`, `platform_api`, `webscrape`, etc.) to track how the profile was produced. Every category is a versioned hypothesis, not a permanent claim. The graph will reveal whether the categories hold up, need splitting, merging, or replacing as practitioner knowledge enters the system. When practitioners contribute their own profiles, those enter at `human_primary` — the highest trust level — and supersede any existing profile.

---

## Two readings — what this seed is and isn't

The Relational Intelligence Protocol that governs A(DAI) is built around **two readings of the same field, held in contradiction**: the machine's reading and the practitioner's. The intelligence isn't in either reading alone — it lives in the convergence and divergence between them. *(See `claude/skills/relational-intelligence-protocol.md`.)*

This seed contains one of those two readings. Specifically:

- **The 6,249 practitioners** in v2 (May 2026 rebuild) come from a source-attested sweep — MoMA digital classifications, Wikidata's digital-art occupation/movement QIDs, Art Blocks core contracts, fxhash. They are a much broader machine reading than v1's 146-practitioner editorial canon. The selection criteria below still describe what *belongs* in a curated seed; they shape post-deploy curation work rather than gating the rebuild's entry.
- **The 50,793 edges** describing what those practitioners do, what their works embody, who they exhibited with, what concepts they engage — those are a **machine reading**, gathered from public APIs and linked-open-data. They are source-attested. They are not the practitioners' own words.

The practitioner reading lives in the empty edge types: **RESPONDS_TO** (artwork → artwork, "this work answers that one"), **CONTESTS** (signal → edge, "this is wrong"), **TENSION_WITH** (concept ↔ concept, "these don't sit easily together"). Those are zero by design. They are reserved for first-person testimony — the kind of knowledge that lives in practitioners' studios, not on platform tag clouds.

When a practitioner enters the system at the **Paired** trust layer, their reading enters at `lived_experience: 1`, `source_origin: human_primary`. They can confirm what the machine got right, contest what it got wrong, and name what it couldn't see at all — frontier signals where the field is forming faster than any vocabulary can catch. The graph doesn't collapse the two readings into one truth. It holds them side by side with provenance, so the negotiation between them is visible.

**Come sense with us.** This canon is incomplete on purpose. The second reading is the missing limb, and it begins when you contest a single edge.

---

## Selection criteria

Six criteria govern which practitioners, theorists, and artworks enter the seed. These criteria select for field-structural significance — the kind of importance that persists after a market cycle ends — rather than market performance, social following, auction results, or hype-cycle prominence.

### 1. Practice breadth

The seed must represent the breadth of digital art practice — from early computer art through net art, generative code, crypto-native work, AI art, installation, game art, and forms still emerging. Twelve categories are used as a starting scaffold to ensure no major area of practice is left empty. These categories are hypotheses, not claims about how the field is structured.

Categories emerged from surveying how multiple independent sources partition the field — but those sources share an English-language, market-adjacent bias. A(DAI) treats its own vocabulary as contestable (principle #5: "Our vocabulary is a hypothesis. Every parameter is versioned and open to challenge. Disagreement is evidence."). Categories are typed as edges (`CLASSIFIED_BY`) rather than properties of practitioners, which means practitioners can hold multiple classifications and can contest their assigned categories. The graph will reveal where these boundaries blur, where practitioners resist classification, and where new categories are forming.

The categories exist to ensure breadth in the seed. They do not define practitioners.

The 12 categories used in this pass:

1. Early Computer Art Pioneers (1960s–1980s)
2. Net Art (1990s–2000s)
3. Post-Internet Art (2008–present)
4. Generative and Code Art
5. Crypto and NFT Art
6. AI Art
7. Digital Installation and Immersive Art
8. Game Art, Virtual Worlds, and Simulation
9. Glitch Art
10. Digital Video and Moving Image
11. Sound Art and Audio-Visual Digital
12. VR, AR, and XR Art

### 2. Source convergence (with declared bias)

Practitioners in the `confirmed` tier appear across multiple independent field sources. This guards against the selection reflecting any single editorial voice. Practitioners may enter on a single source if they fill a documented practice or source-coverage gap — and their single-source status is visible in provenance metadata.

**Bias declaration.** The sources consulted for this seed share an English-language, Euro-American, market-adjacent orientation. Source convergence within this set confirms visibility to these specific networks, not field significance universally. Practitioners significant to scenes our sources cannot see — non-English-speaking communities, non-institutional practices, emerging scenes without editorial coverage — require different evidence: practitioner testimony, scene-level knowledge, or signals from sources listed in `sources.yaml` that have not yet been ingested.

A(DAI)'s principle #6 says the system watches for what's forming, not what's already legible. Source convergence selects for what's already legible. This tension is acknowledged, not resolved — the confirmed tier necessarily starts from what existing sources can see, and subsequent ingestion passes expand what the graph can sense.

### 3. Infrastructure contribution

Practitioners who built tools, platforms, or frameworks that other practitioners use are included regardless of other criteria. They are load-bearing nodes in the graph — remove them and entire regions of the field lose their connective tissue.

Examples: Casey Reas and Ben Fry (Processing), Zach Lieberman (openFrameworks), Snowfro (Art Blocks), Kevin McCoy (first NFT), Olia Lialina (web preservation), Mark Tribe (founded Rhizome), Ken Perlin (Perlin noise). These are not just artists; they are infrastructure that made other artists' work possible. This is a deliberate exception to other criteria — a tool-builder who doesn't meet the source convergence threshold still belongs in the seed because their structural role is self-evident.

### 4. Relational significance

The practitioner's work connects to other works, concepts, scenes, or institutions in ways that can be articulated relationally. A practitioner whose significance is purely market-based — price, trading volume, speculative attention — with no relational structure does not generate field intelligence and is not included.

This criterion is deliberately framed as *articulable relationships*, not as connectivity within the existing graph. Connectivity is a consequence of inclusion, not a condition for it. A practitioner with zero documented collaborations but whose work embodies concepts and responds to other practitioners' work has relational significance — the graph reveals their connections once they are included.

**Frontier clause.** If a practitioner's significance resists the current edge vocabulary — if their work can't be described through PRACTICES, COLLABORATES_WITH, or CREATED_BY without flattening it — that resistance is a frontier signal. It is evidence that the edge vocabulary needs expanding, not that the practitioner should be excluded. A(DAI)'s gatherer protocol treats what the system can't classify as the editorial agenda, not as an error.

### 5. Source and scene diversity

The seed must draw from sources and scenes across world regions, not only the Euro-American institutional circuit. The gap being measured is in what the graph can *sense* — which sources it draws from, which scenes it has visibility into, which institutional edges it can trace — not in the demographic composition of its practitioner list.

Practitioners are not classified by geography or demographic categories. Where a practitioner was born, where they live, where they work, and where their practice is epistemologically rooted may be four different places. The graph tracks scenes and institutional affiliations as edges, not as properties of people. Scene names describe practices and intellectual traditions, not identities. Source-coverage gaps are documented as deficiencies in what the graph can sense, not as demographic gaps in who it contains.

The current seed draws primarily from English-language, Euro-American sources. This is a documented deficiency in source coverage. Subsequent ingestion passes will draw from the non-Western sources listed in `sources.yaml` (Asia Art Archive, ARTLINKART, FILE Festival, NTT ICC, Chronus Art Center, African Digital Art Network, Sharjah Art Foundation, and others) to expand what the graph can sense.

### 6. Exclusion principle

The seed does not select for market performance, social following, auction results, or hype-cycle prominence. It selects for field-structural significance.

This requires an honest accounting of edge cases. A practitioner like Beeple is included not because of a $69M sale but because that sale forced every major institution to update its definition of what digital art could be — that is infrastructure-level impact on the field, regardless of whether the market price holds. The distinction between "the market valued this work" and "this work changed how the field operates" is the line the seed draws.

The seed includes theorists, writers, and curators whose intellectual contributions shaped how the field understands itself — not only practitioners who make objects. The knowledge graph traces intellectual lineage and critical frameworks alongside artworks and practices. This is consistent with A(DAI)'s principle that it matters *how* you know something, not just *what* you know.

Practitioners whose primary claim to significance is a single high-value sale, a large social following, or prominence during the 2021 NFT boom — without satisfying criteria 1–4 above — are not included.

---

## Methodology

The seed was assembled through a multi-source cross-referencing process, not drawn from a single editorial decision.

**Step 1 — Define practice categories.**
The 12 categories were identified by surveying how multiple independent sources partition the digital art field. The ADIN taxonomy, Right Click Save editorial coverage, Rhizome ArtBase archive structure, Art Basel editorial framing, Sotheby's historical overview, and the Ostachowski chronology all converge on substantially similar categories — early computer art, net art, generative/code art, crypto/NFT art, AI art, immersive/installation, game art, and glitch art appear across all of them, with variation at the edges. The 12-category structure used here represents the union of those sources, held as a hypothesis.

**Step 2 — Populate from original research.**
45 practitioners from A(DAI)'s own deep research (2025–2026) were the founding editorial pass. Each has a detailed profile covering practice, methodology, key works, institutional presence, commons orientation, and governance model. Source origin: `human_secondary`.

**Step 3 — Cross-reference against external sources.**
The ADIN taxonomy, Right Click Save A-Z, Rhizome ArtBase, Ostachowski chronology, Art Basel and Sotheby's overviews were cross-referenced to identify practitioners with field-wide significance who were absent from the confirmed set. 42 practitioners were added to close specific gaps identified through cross-referencing.

**Step 4 — Apply selection criteria.**
Every entry was evaluated against the six criteria. Practitioners who met only the market/hype criterion without relational significance were excluded. Practitioners who filled practice breadth or source-coverage gaps were included even on single-source evidence.

**Step 5 — Document gaps.**
Categories with thin coverage, source-coverage blind spots, and missing artwork data are documented in `COVERAGE.md` and the Known Gaps section of this file. Gaps are editorial agenda items for subsequent ingestion passes, not hidden deficiencies.

**Step 6 — v1 enrichment passes (April 2026, retired).**
The v1 canon went through multiple editorial enrichment passes (profile
normalisation, scene extraction, EMBODIES heuristic scaffolding,
real-source replacement, named-anchors pass). These produced a denser
curated graph (1,491 nodes, 4,544 edges) but accumulated LLM-padded
narrative fields that couldn't be cited. The full v1 methodology is
preserved in git history and in `_build/archive/migrations/2026-04/`.

**Step 7 — v2 rebuild (May 2026).**
The seed was wiped to source-attested ground and rebuilt under a producer
contract ([`_build/PRODUCER_CONTRACT.md`](_build/PRODUCER_CONTRACT.md)).
Every gatherer:

1. Mints ids via shared `_slug.node_id()` (artworks always disambiguated
   by source + external_id).
2. Stamps every row with a signal_id, created_by, batch_id.
3. Emits only source-attested fields — the validator rejects any
   `description` / `bio` / `summary` without a sibling `source_url`.
4. Uses shared `_http` (retry + per-host throttling + descriptive UA) so
   no producer reinvents fetching.

The four contract-conformant producers:

- `fetch_moma.py` — MoMA Artworks.csv + Artists.csv filtered to digital
  classifications (Video / Audio / Installation / Media / Film /
  Performance / Software) and departments (Media and Performance / Film /
  Fluxus Collection). 6,495 artworks + 1,618 practitioners. CC0.
- `fetch_wikidata.py` — query.wikidata.org SPARQL against
  `Q649652 / Q9418008 / Q170630 / Q4671777 / Q4671798 / Q650711 /
  Q4904305 / Q19798649 / Q1925963 / Q15265344` (digital-art occupation +
  movement). 3,655 practitioners with QID + P18 portrait + P569/P570
  birth/death + P27 country + P135 movement + P106 occupation.
- `fetch_artblocks.py` — data.artblocks.io/v1/graphql, V0/V1/V3 core
  contracts only. 477 projects + 297 distinct artists with thumbnails.
- `fetch_fxhash.py` — api.fxhash.xyz/graphql paged sweep skipping
  MALICIOUS / HIDDEN flag tokens. 3,000 tokens + 742 distinct authors,
  IPFS displayUri rewritten to gateway.fxhash2.xyz.

**Step 8 — Rule-derived curation.**
`derive_curation.py` emits the editorial layer mechanically from existing
metadata:

- 14 concept nodes anchored to Wikidata QIDs with verbatim
  `schema:description` (source-attested).
- 6 classification regimes (A(DAI) canon + 5 sub-regimes — Academic
  Media-Art History, Asia-Pacific Institutional, Crypto Market-Native,
  Euro-American Institutional, Practitioner Self-Report).
- 20,798 CLASSIFIED_BY edges (every artwork from the four producers +
  every practitioner with a digital-art QID).
- 3,655 PRACTICES edges from `practitioner.metadata.movement_qids` +
  `.occupation_qids`.
- 4,786 EMBODIES edges from `artwork.metadata.moma_classification` +
  `.genre_qids` + platform implication (Art Blocks / fxhash → generative-art).

The merger (`merge_batches.py`) folds the five batches into canon,
resolves `_alias:wikidata:Q...` placeholder edges via the alias table,
backfills schema-required signal/alias fields, and runs
`validate_seed.py --canon` as a CI gate.

The two registries — `signals.json` (5 records, one per producer + curation)
and `contributors.json` (1 record, `contributor:migration` trust tier
`reviewed`) — close: every `signal_id` and every `created_by` reference
resolves to a real record, and every record is referenced. This is the
provenance trail.

---

## Artwork selection

Artworks are the gravitational centre of the A(DAI) graph. Their selection follows from the practitioner criteria rather than requiring a parallel framework — an artwork enters the seed because of the practitioner whose work it represents and the role it plays in the field.

Artworks enter through three paths:

**Key works from practitioner research.** The `key_works` field in each practitioner profile identifies the works the A(DAI) team assessed as most significant to that practitioner's position in the field. This is the founding team's informed editorial position, drawn from publicly available documentation and the team's own field knowledge. It is declared bias — which is what principle #1 asks for. It becomes higher-quality data when practitioners enter the system and confirm, contest, or expand their own profiles.

**Works referenced across sources.** Artworks explicitly named in the cross-referenced sources — Fidenza, Ringers, AARON, "My Boyfriend Came Back from the War", Holly+, "Quantum", "Digital Zones of Immaterial Pictorial Sensibility" — enter because their field-inflection role is independently documented. These are works that changed what was possible or thinkable in their category.

**Institutional collection data.** Artworks ingested from Tier 1 licensed sources — MoMA Collection CSV (CC0), Art Blocks Hasura API, fxhash API — enter with institutional provenance and, where available, images. Source origin: `human_secondary`.

Current seed (v2): 9,972 artwork nodes — sources are MoMA digital classifications (6,495), fxhash generative tokens (3,000), and Art Blocks core contracts (477). Most carry image URLs directly from their source (MoMA `ImageURL`, fxhash `displayUri`, Art Blocks `media.artblocks.io/thumb/`). The R2 mirror refresh against v2 is a post-deploy step.

---

## Why these data sources, and why not others

### The logic

The selection criteria require practice breadth, source convergence, and source diversity. For the seed pass, these criteria must be met through data that can be ingested with integrity — meaning provenance is trackable, source origin is typed, and the consent pathway is unambiguous.

**Ingestion is deterministic and cost-controlled.** Raw data enters through parsers for structured sources (APIs, datasets, SPARQL endpoints). No agent runs at ingestion. Agent-assisted classification, concept linking, and edge typing happen post-ingestion as a deliberate batch operation, controlled for cost and reviewed before merge.

This means the seed draws first from sources that offer structured, queryable data with clear licensing — what we call Tier 1. Sources that require institutional outreach and explicit permission form Tier 2. No scraping.

### Tier 1 — API and licensed sources (used in this seed pass)

These have queryable endpoints. Parsers exist or are trivial to write.

| Source | What it provides | Licensing | Categories covered |
|---|---|---|---|
| Art Blocks Hasura API | Generative artwork metadata + thumbnails | Platform data | Generative, Crypto |
| Wikidata SPARQL | Biographical data, artwork images (P18) | CC0 | All (institutional) |
| MoMA Collection CSV | Artworks + thumbnails for MoMA holdings | CC0 | All (institutional crossover) |
| Met Open Access API | Public domain artwork images | CC0 / public domain | Pioneers, Institutional |
| fxhash API | Tezos generative artwork data | Platform data | Generative |
| Rhizome ArtBase SPARQL | Net art metadata (2,200+ works) | Open access | Net Art, Glitch |

### Tier 2 — Institutional partnerships (future work, no scraping)

Sources with important practitioner and artwork data that do not offer public APIs. Rather than scraping their websites, A(DAI) will reach out to these institutions directly, request data access or partnership, and ingest only with explicit permission. This is both an ethical position and a strategic one — it builds real relationships with the institutions whose knowledge A(DAI) depends on, and it makes A(DAI)'s data provenance defensible.

| Source | What it provides | Categories it fills |
|---|---|---|
| Ars Electronica | 173,900+ archive entries since 1987 | Performance, Installation, Robotic |
| ZKM | 8,000+ artworks, largest computer art collection | Pioneers, Installation, Generative |
| ELMCIP | Electronic literature and digital writing | Writing, Net Art |
| ADA (Archive of Digital Art) | 650 artist profiles, 3,000 artworks | Installation, AI, Robotic |
| ISEA Archives | 21,000+ cross-referenced entries | All |
| e-flux | Exhibition records, journal articles | Installation, Video, Post-Internet |
| CAN (Creative Applications Network) | 4,000+ curated projects | Generative, AI, Robotic |
| Asia Art Archive | Non-Western digital arts documentation | Non-Western coverage |
| ARTLINKART | Chinese contemporary art documentation | Non-Western coverage |
| Chronus Art Center | Chinese new media art | Non-Western coverage |
| FILE Festival | Brazilian electronic arts | Non-Western coverage |
| NTT ICC | Japanese media art | Non-Western coverage |
| African Digital Art Network | African digital arts | Non-Western coverage |
| Sharjah Art Foundation | Middle Eastern digital arts | Non-Western coverage |

### Why not scrape everything

The broader digital art field is documented across gallery websites, institutional collection pages, artist portfolios, and platform archives. This data is technically accessible. Ingesting it raises two issues the seed pass intentionally defers.

**Consent.** A(DAI)'s signal pipeline requires source origin typing and provenance tracking on every signal. Scraping a gallery's exhibition page for artwork metadata produces `human_secondary` data that enters through the merge boundary — legitimate, but it needs review, attribution, and a consent pathway back to the source. A curator writing a wall text for an exhibition didn't consent to that text becoming a training signal for how A(DAI) maps the field. A(DAI) distinguishes between data published for reference and data contributed for graph intelligence. The former enters as `human_secondary` through the merge boundary with review. The latter enters as `human_primary` with practitioner authority. The seed prioritises sources where the data was explicitly made available for reuse (CC0, open access APIs) because the consent pathway is unambiguous.

**Intentionality.** A(DAI) does not optimise for volume. 399 artworks selected through a declared research process carry more graph intelligence than 10,000 artworks scraped without editorial judgment. The gatherer skill exists to do this work properly — scouting with declared bias, producing processing traces, flagging frontier signals. That infrastructure is designed for scale but the seed pass is about quality, not quantity. Scaling comes through the gatherer skill and the contribution pipeline, with the consent and provenance infrastructure in place.

### The visibility gradient this creates

Sources that have structured APIs tend to be institutional and Western — MoMA, Met, Wikidata, Art Blocks. Sources that *don't* have clean APIs are often the ones documenting non-Western practice, emerging scenes, and experimental work. "We only ingest from structured, licensed sources" sounds principled but in practice means "we ingest first from institutions wealthy enough to build APIs."

This is a real bias and we name it rather than hide it. The visibility gradient is addressed through Tier 2 institutional outreach — direct relationships with the archives and institutions whose knowledge the graph needs but whose data isn't API-accessible. The non-Western sources listed above are the explicit agenda for subsequent ingestion passes.

---

## Sources consulted

### Primary sources

**A(DAI) original research (2025–2026)**
Internal. 45 practitioner profiles produced by the A(DAI) team. Source origin: `human_secondary`.

**A(DAI) enrichment pass (April 22, 2026)**
Internal. 70 practitioner profiles deepened or created by Claude from training knowledge and structured data. Source origin: `ai_assisted`. Reviewed by human editor. Documented in `seed/enrichment-trace.json`.

**ADIN / Tribute Labs. "Digital Art Is the Art of Our Age." ADIN ONLINE (Substack), April 18, 2026.**
https://adinonline.substack.com/p/digital-art-is-the-art-of-our-age
12-category taxonomy naming ~50 unique practitioners with an evaluative framework. Published by ADIN, an AI-native venture platform operated by Tribute Labs (Aaron Wright). One of several sources informing category structure and draft-tier selections.

### Cross-reference and validation sources

**Christiane Paul. *Digital Art.* Thames & Hudson World of Art series.**
First edition 2003; updated editions 2008, 2015, 2023 (4th edition).
The standard field-survey textbook — the most widely assigned introductory text on digital art in art-school curricula globally. Covers net art, software art, AI art, generative and algorithmic art, game art, virtual reality, bioart, and more across its ~300 illustrated pages. Paul is adjunct curator of digital art at the Whitney Museum and director of Artport (the Whitney's online exhibition platform). Practitioners named across successive editions of this text are the primary candidate set for the next ingestion pass — the book's cumulative index is the single best source for "who the field treats as canonical" across two decades of editorial revision. Note: Paul herself is a candidate for inclusion in the graph as an infrastructure practitioner (see Known Gaps).

**Right Click Save. "A-Z of Digital Art 2026." January 2026.**
https://www.rightclicksave.com/article/a-z-of-digital-art-2026-art-and-technology-a-to-z
Annual editorial survey of the digital art field. Published by ClubNFT / Right Click Save (editor-in-chief: Alex Estorick).

**Rhizome ArtBase**
https://artbase.rhizome.org
Archive of 2,200+ born-digital artworks on Linked Open Data infrastructure (Wikibase). Founded 1999, affiliated with the New Museum (NYC). Relaunched 2021 (NEH CARES grant HC-274988-20). SPARQL queryable. Architecturally the closest existing project to what A(DAI) is building, though its purpose is archival preservation rather than field intelligence.

**Martin Ostachowski. Digital & Crypto Art Chronology.**
https://dminti.com/digital-art-chronology/
Detailed timeline of crypto art milestones 2011–present.

**Art Blocks**
https://artblocks.io
Generative art platform (est. 2020). Public Hasura GraphQL API. MCP server deployed March 2026.

**MoMA Collection**
https://github.com/MuseumofModernArt/collection
CC0 dataset. 160,627 artworks. Used for artwork images and institutional crossover data.

**fxhash**
https://fxhash.xyz
Tezos generative art platform. Public GraphQL API. Used for generative artwork data and images.

**ArtGraph (Castellano, Digeno, Sansaro, Vessio, 2021–2022)**
Artistic knowledge graph based on WikiArt + DBpedia (~135,000 resources). "Leveraging Knowledge Graphs and Deep Learning for automatic art analysis," Knowledge-Based Systems, 2022. Dataset: https://zenodo.org/records/6337958.

**Getty Art & Architecture Thesaurus (AAT)**
Standard institutional controlled vocabulary for art classification. Referenced as the baseline that A(DAI)'s taxonomy extends beyond.

**Art Basel. "Digital Art: It's not just NFTs and crypto." June 2025.**
https://www.artbasel.com/stories/digital-art-nfts-crypto

**Sotheby's. "A Brief History of NFTs and Digital Art." March 2024.**
https://www.sothebys.com/en/articles/a-brief-history-of-nfts-and-digital-art

---

## Edge structure and design rationale

The graph has 9 edge types curated by humans, plus 2 auto-derived from the Gemini Embedding 2 multimodal pass. Some are dense, some are deliberately sparse, and some important edge types have zero edges. This is intentional.

### What the seed produces honestly (v2, May 2026)

These edge types are emitted from source-attested data by the producer
pipeline:

| Edge type | Count | Direction | What it captures |
|---|---|---|---|
| CLASSIFIED_BY | 20,798 | any → classification regime | Which lens claims this node — derived from gatherer + sub-regime rules |
| CREATED_BY | 11,582 | artwork → practitioner | Who made it — directly from source attribution |
| EXHIBITED_AT | 9,972 | artwork → institution/platform | Where the work lives — every artwork → its source MoMA / Art Blocks / fxhash |
| EMBODIES | 4,786 | artwork → concept | What a work is *about* — MoMA Classification + Wikidata genre + platform implication |
| PRACTICES | 3,655 | practitioner → concept | What someone works *with* — Wikidata movement_qids + occupation_qids |
| BELONGS_TO | 0 | practitioner → scene | Blocked on scene nodes existing (post-deploy curation) |
| COLLABORATES_WITH | 0 | practitioner ↔ practitioner | Blocked on multi-creator collapse (currently emits multiple CREATED_BY) |
| USES_TECHNIQUE | 0 | artwork → concept | Blocked on technique-level concept vocabulary expansion |
| INFLUENCES | 0 | practitioner → practitioner | High editorial bar — re-add via curation against established citations |

### What the embedding pipeline produces (auto-derived, low-confidence)

The Gemini Embedding 2 multimodal pass emits these directly into the live `edges` table, tagged `created_by='embedding-multimodal-v1'` so they're trivially deletable and visually distinguishable (rendered dashed in `/field` and `/graph`). Both are stored bidirectionally so readers don't need to special-case symmetric types. All rows carry `confidence='low'`. Re-running the derive pass replaces them wholesale — never hand-edit these rows.

| Edge type | Direction | What it captures |
|---|---|---|
| STYLE_KIN | practitioner ↔ practitioner | Stylistic adjacency, cosine over each practitioner's style centroid (mean of artwork vectors they `CREATED_BY`). Above τ_kin = 0.91. |
| VISUALLY_AFFINE | artwork ↔ artwork | Cross-artist visual rhymes from artwork-vector cosine, gated to different creators. Above τ_visual = 0.84. |

Counts populate when the daily `embed-derive-daily` GitHub Actions workflow runs (~03:00 UTC daily; first run post-deploy populates them against the new canon). Will change on each `npm run embed:derive` re-run.

`SUGGESTS_CREATED_BY` is intentionally **not** an edge type. Practitioner-attribution candidates surfaced by the embedding pass (artwork ↔ practitioner above τ_attribute = 0.88) flow into `intake_queue` with `kind='ai_suggestion'`; the curator's approval at `/review?kind=ai_suggestion` is what turns them into real `CREATED_BY` edges. The auto-derive logic explicitly refuses to write `CREATED_BY` (or `INFLUENCES` or `RESPONDS_TO`) without that human ratification.

### What the seed intentionally leaves empty

**RESPONDS_TO** (artwork → artwork) — zero edges. This edge says "this work directly references or responds to that work." These relationships are real and documented, but they require evidence of artist intent, not thematic similarity. That evidence lives in artist statements, exhibition texts, interviews, and practitioner knowledge — the intimate layer that comes from sensing conversations and practitioner contribution, not from editorial research or API data.

**INFLUENCES** — only 4 edges. Influence is directional and claims something specific: this person's practice was shaped by that person's work. Making that claim from the outside, without the practitioner confirming it, is editorially risky. More will come from practitioner contributions.

**CONTESTS / TENSION_WITH** — zero edges. Contestation and tension between practitioners or between artworks and concepts are the most editorially sensitive edges in the vocabulary. They require practitioner voice — you don't tell two artists they're in tension with each other, they tell you.

### The logic

The seed is structured so that everything the founding team can honestly claim is in the graph, and everything that requires practitioner voice is visibly absent. The gaps are not failures — they're invitations. The graph says: here's what we can see from our position. The RESPONDS_TO edges are empty because we're not the ones who should fill them. The INFLUENCES edges are sparse because we're not the ones who should claim them. The CONTESTS edges don't exist because we're not the ones who should name them.

The seed is the provocation. The practitioner's response is the intelligence.

---

## Current state (May 2026 — post rebuild)

| Metric | Value |
|---|---|
| Practitioners | 6,249 |
| — with Wikidata QID + image (P18) | 3,655 |
| — with MoMA ConstituentID | 1,618 |
| — sourced from fxhash | 742 |
| — sourced from Art Blocks | 297 |
| Total artworks | 9,972 |
| — with `image_url` (upstream attestable) | ~Most |
| Total nodes | 16,244 |
| Total edges | 50,793 |
| Edge types live | 5 (CLASSIFIED_BY, CREATED_BY, EXHIBITED_AT, EMBODIES, PRACTICES) |
| Concepts | 14 (source-anchored vocabulary) |
| Classification regimes | 6 (A(DAI) canon + 5 sub-regimes) |
| Signals (provenance batches) | 5 (moma, wikidata, artblocks, fxhash, curation) |
| Contributors | 1 (`contributor:migration`, trust tier `reviewed`) |
| Source origins | `platform_api` only — see `signals.json` |

---

## Known gaps

1. **Source-coverage skew.** The seed draws primarily from English-language, Euro-American sources. This is a source-coverage deficiency, not an acceptable baseline. Subsequent ingestion passes will draw from non-Western sources listed in `sources.yaml`. Tier 1 API queries for non-Western practitioners (Wikidata SPARQL filtering by non-Euro-American nationality) have been drafted but not yet run.

2. **fxhash/Tezos generative artists.** Partially addressed — 8 fxhash artworks ingested (Jonas Lund, Kim Asendorf). Iskra Velitchkova, Michaël Zancan, and others significant to the generative art field remain absent. fxhash API queries drafted for next pass.

3. **Second-wave AI art.** Post-2020 practitioners working with diffusion models and LLMs remain underrepresented. Wikidata queries drafted.

4. **Pre-boom conceptual blockchain.** Rhea Myers and Kevin McCoy are now in the graph. Sarah Meyohas ("BitchCoin", 2015) remains absent. Wikidata-sourceable.

5. **Artwork images.** 335 of 728 artworks have images (46%) after the April 28 real-source pass. Coverage roughly tripled via objkt thumbnails, MoMA digital, Wikidata depicts, and fxhash tag art. Remaining gap requires Met Open Access API pass and Tier 2 institutional sourcing.

6. **RESPONDS_TO edges.** Zero artwork-to-artwork edges. Intentionally empty — requires practitioner contribution. This is the highest-value edge type practitioners can add at Basel.

7. **INFLUENCES edges.** Only 4. Conservative by design — requires practitioner confirmation. Will grow through sensing conversations and contribution interface.

8. **Concept vocabulary overlap.** 318 concepts with significant overlap (18 AI variants, 16 installation variants, 11 generative variants). Diversity preserved intentionally for AI concepts; consolidation deferred for others.

9. **Robotic/physical-computing and bio-digital traditions.** Stelarc and Eduardo Kac now in graph. Moon Ribas, Amy Karle absent. Wikidata-sourceable.

10. **Sound art.** Boosted from 2 to 6 practitioners (Nicolai, Fell, Ablinger, Haswell, Xenakis, Amacher added). Target is 10+. Pan Daijing, AGF absent. Wikidata queries drafted.

11. **EMBODIES edge quality.** Closed in the April 28 real-source pass. The 564 heuristic-keyword EMBODIES (April 22 editorial scaffolding) were superseded by 1,035 source-attested EMBODIES from objkt, fxhash, and Wikidata depicts. 57 hand-assigned EMBODIES (medium confidence) survive. Total EMBODIES: 1,096, all from named ingest signals.

12. **Exhibitions gap for 28 practitioners.** Pass 1+2 practitioners whose exhibition data was in prose format rather than venue lists. Partially recovered through COLLABORATES_WITH reclassification. Remaining gap requires manual research or Tier 2 institutional data.

13. **Christiane Paul's *Digital Art* canon — partially closed.** The April 28 `gatherer-paul-canon-v1` pass added 22 practitioners + 5 missing scenes from Paul's index (Paik, Kac, Stelarc, the Vasulkas, Davies, Rokeby, Shaw, Ascott, Utterback, Sommerer, Mignonneau, Goldberg, Rubin, Hayles, Galloway, Chun, Paul herself, and others). Remaining: full diff against the 2023 4th-edition index for any missed Tier-1-sourceable absences.

14. **fxhash full coverage.** Two passes (`fxhash-api-ingest-2026-04-22`, `fxhash-tags-ingest-2026-04-28`) cover ~45 works. A schema-deeper fxhash pass would close more gaps for artists like Iskra Velitchkova, Michaël Zancan.

---

## How to cite this seed

> A(DAI) Seed Canon v2 (May 2026 rebuild). 6,249 practitioners and 9,972 artworks across 5 live edge types (CLASSIFIED_BY, CREATED_BY, EXHIBITED_AT, EMBODIES, PRACTICES), totalling 50,793 edges, against 14 source-anchored concept nodes and 6 classification regimes. Assembled by four contract-conformant gatherers — MoMA digital classifications (CC0), Wikidata SPARQL on digital-art QIDs, Art Blocks Hasura (V0/V1/V3 contracts), and fxhash GraphQL — folded into canon by `merge_batches.py` with a single rule-derived curation pass (`derive_curation.py`) for the editorial layer. Every row carries `signal_id` pointing back to its producer's batch; validator-enforced anti-enrichment rule (no narrative field without sibling source URL). 5 ingest signals + 1 migration contributor (trust tier `reviewed`) recorded as the provenance trail. Tier 1 sources only — no scraping, no LLM-generated prose. The long-tail editorial layer (institutions / scenes / collectives / INFLUENCES / RESPONDS_TO) is deferred to a post-deploy curation pass via the contributor API or `find_missing_images.py` discovery. Commons-licensed under A(DAI) full commons consent scope.
