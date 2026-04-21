# Seed Canon: Sources & Methodology

## What this document is

This file documents how the A(DAI) seed canon was assembled — the selection criteria, the sources consulted, the methodology applied, and the gaps acknowledged. It exists to make the canon's provenance transparent and its editorial decisions defensible.

The seed canon is a starting point. It is *a* canon, not *the* canon — the indefinite article is load-bearing. Every entry carries a `status` field (`confirmed`, `draft`, or `bridge`) to track editorial confidence. Every category is a versioned hypothesis, not a permanent claim. The graph will reveal whether the categories hold up, need splitting, merging, or replacing as practitioner knowledge enters the system.

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

Practitioners in the `confirmed` tier appear across multiple independent field sources. This guards against the selection reflecting any single editorial voice. Practitioners in the `draft` tier may enter on a single source if they fill a documented practice or source-coverage gap — and their single-source status is visible in their `status` field.

**Bias declaration.** The sources consulted for this seed share an English-language, Euro-American, market-adjacent orientation. Source convergence within this set confirms visibility to these specific networks, not field significance universally. Practitioners significant to scenes our sources cannot see — non-English-speaking communities, non-institutional practices, emerging scenes without editorial coverage — require different evidence: practitioner testimony, scene-level knowledge, or signals from sources listed in `sources.yaml` that have not yet been ingested.

A(DAI)'s principle #6 says the system watches for what's forming, not what's already legible. Source convergence selects for what's already legible. This tension is acknowledged, not resolved — the confirmed tier necessarily starts from what existing sources can see, and subsequent ingestion passes expand what the graph can sense.

### 3. Infrastructure contribution

Practitioners who built tools, platforms, or frameworks that other practitioners use are included regardless of other criteria. They are load-bearing nodes in the graph — remove them and entire regions of the field lose their connective tissue.

Examples: Casey Reas and Ben Fry (Processing), Zach Lieberman (openFrameworks), Snowfro (Art Blocks), Kevin McCoy (first NFT), Olia Lialina (web preservation). These are not just artists; they are infrastructure that made other artists' work possible. This is a deliberate exception to other criteria — a tool-builder who doesn't meet the source convergence threshold still belongs in the seed because their structural role is self-evident.

### 4. Relational significance

The practitioner's work connects to other works, concepts, scenes, or institutions in ways that can be articulated relationally. A practitioner whose significance is purely market-based — price, trading volume, speculative attention — with no relational structure does not generate field intelligence and is not included.

This criterion is deliberately framed as *articulable relationships*, not as connectivity within the existing graph. Connectivity is a consequence of inclusion, not a condition for it. A practitioner with zero documented collaborations but whose work embodies concepts and responds to other practitioners' work has relational significance — the graph reveals their connections once they are included.

**Frontier clause.** If a practitioner's significance resists the current edge vocabulary — if their work can't be described through PRACTICES, COLLABORATES_WITH, or CREATED_BY without flattening it — that resistance is a frontier signal. It is evidence that the edge vocabulary needs expanding, not that the practitioner should be excluded. A(DAI)'s gatherer protocol treats what the system can't classify as the editorial agenda, not as an error.

### 5. Source and scene diversity

The seed must draw from sources and scenes across world regions, not only the Euro-American institutional circuit. The gap being measured is in what the graph can *sense* — which sources it draws from, which scenes it has visibility into, which institutional edges it can trace — not in the demographic composition of its practitioner list.

Practitioners are not classified by geography. Where a practitioner was born, where they live, where they work, and where their practice is epistemologically rooted may be four different places. The graph tracks scenes and institutional affiliations as edges, not as properties of people. Source-coverage gaps are documented as deficiencies in what the graph can sense, not as demographic gaps in who it contains.

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
59 practitioners from A(DAI)'s own deep research (2025–2026) were assigned to categories. These form the `confirmed` tier. Each has a detailed profile covering practice, key works, institutional presence, commons orientation, and relevance to the knowledge graph.

**Step 3 — Cross-reference against external sources.**
The ADIN taxonomy, Right Click Save A-Z, Rhizome ArtBase, Ostachowski chronology, Art Basel and Sotheby's overviews were cross-referenced to identify practitioners with field-wide significance who were absent from the confirmed set. 45 practitioners were added at `draft` status. 3 additional practitioners (Ben Fry, Jesse Kanda, Golan Levin) were added to close specific gaps identified through cross-referencing.

**Step 4 — Apply selection criteria.**
Every entry was evaluated against the six criteria. Practitioners who met only the market/hype criterion without relational significance were excluded. Practitioners who filled practice breadth or source-coverage gaps were included even on single-source evidence, with their status reflecting the lower confidence.

**Step 5 — Document gaps.**
Categories with thin coverage, source-coverage blind spots, and missing artwork data are documented in `COVERAGE.md` and the Known Gaps section of this file. Gaps are editorial agenda items for subsequent ingestion passes, not hidden deficiencies.

---

## Artwork selection

Artworks are the gravitational centre of the A(DAI) graph. Their selection follows from the practitioner criteria rather than requiring a parallel framework — an artwork enters the seed because of the practitioner whose work it represents and the role it plays in the field.

Artworks enter through two paths:

**Key works from practitioner research.** The `key_works` field in each confirmed practitioner profile identifies the works the A(DAI) team assessed as most significant to that practitioner's position in the field. This is the founding team's informed editorial position, drawn from publicly available documentation and the team's own field knowledge. It is declared bias — which is what principle #1 asks for. It becomes higher-quality data when practitioners enter the system and confirm, contest, or expand their own profiles.

**Works referenced across sources.** Artworks explicitly named in the cross-referenced sources — Fidenza, Ringers, AARON, "My Boyfriend Came Back from the War", Holly+, "Quantum", "Digital Zones of Immaterial Pictorial Sensibility" — enter because their field-inflection role is independently documented. These are works that changed what was possible or thinkable in their category: AARON opened machine authorship decades early, Quantum created the NFT category, Fidenza demonstrated that algorithmic systems could carry emotional weight.

Current seed: 254 artwork nodes, 21 with images (all from Art Blocks).

---

## Why these data sources, and why not others

### The logic

The selection criteria require practice breadth, source convergence, and source diversity. For the seed pass, these criteria must be met through data that can be ingested with integrity — meaning provenance is trackable, source origin is typed, and the consent pathway is unambiguous.

**Ingestion is deterministic and cost-controlled.** Raw data enters through parsers for structured sources (APIs, datasets, SPARQL endpoints). No agent runs at ingestion. Agent-assisted classification, concept linking, and edge typing happen post-ingestion as a deliberate batch operation, controlled for cost and reviewed before merge.

This means the seed draws first from sources that offer structured, queryable data with clear licensing — what we call Tier A. Sources that require custom HTML parsing — institutional archive pages with consistent but non-API structure — form Tier B. Both tiers enter through deterministic ingestion with full provenance.

### Tier A — API and structured dataset sources

These have queryable endpoints. Parsers exist or are trivial to write.

| Source | What it provides | Licensing | Categories covered |
|---|---|---|---|
| Art Blocks Hasura API | Generative artwork metadata + thumbnails | Platform data | Generative, Crypto |
| Wikidata SPARQL | Biographical data, artwork images (P18) | CC0 | All (institutional) |
| MoMA Collection CSV | Artworks + thumbnails for MoMA holdings | CC0 | All (institutional crossover) |
| Met Open Access API | Public domain artwork images | CC0 / public domain | Pioneers, Institutional |
| fxhash API | Tezos generative artwork data | Platform data | Generative |
| Rhizome ArtBase SPARQL | Net art metadata (2,200+ works) | Open access | Net Art, Glitch |

### Tier B — Institutional archive sources requiring custom parsers

Data exists as structured HTML on institutional pages — consistent formats with title, artist, date, description. Requires a parser per source, but each parser is a bounded task. These are published institutional records intended for public reference.

| Source | What it provides | Categories it fills |
|---|---|---|
| e-flux | Exhibition records, journal articles | Installation, Video, Post-Internet |
| ZKM | 8,000+ artworks, largest computer art collection | Pioneers, Installation, Generative |
| CAN (Creative Applications Network) | 4,000+ curated projects | Generative, AI, Robotic |
| ADA (Archive of Digital Art) | 650 artist profiles, 3,000 artworks | Installation, AI, Robotic |
| Ars Electronica | 173,900+ archive entries since 1987 | Performance, Installation, Robotic |
| ISEA Archives | 21,000+ cross-referenced entries | All |

### Why not scrape everything

The broader digital art field is documented across gallery websites, institutional collection pages, artist portfolios, and platform archives. This data is technically accessible. Ingesting it raises two issues the seed pass intentionally defers.

**Consent.** A(DAI)'s signal pipeline requires source origin typing and provenance tracking on every signal. Scraping a gallery's exhibition page for artwork metadata produces `human_secondary` data that enters through the merge boundary — legitimate, but it needs review, attribution, and a consent pathway back to the source. A curator writing a wall text for an exhibition didn't consent to that text becoming a training signal for how A(DAI) maps the field. A(DAI) distinguishes between data published for reference and data contributed for graph intelligence. The former enters as `human_secondary` through the merge boundary with review. The latter enters as `human_primary` with practitioner authority. The seed prioritises sources where the data was explicitly made available for reuse (CC0, open access APIs) because the consent pathway is unambiguous.

**Intentionality.** A(DAI) does not optimise for volume. 254 artworks selected through a declared research process carry more graph intelligence than 10,000 artworks scraped without editorial judgment. The gatherer skill exists to do this work properly — scouting with declared bias, producing processing traces, flagging frontier signals. That infrastructure is designed for scale but the seed pass is about quality, not quantity. Scaling comes through the gatherer skill and the contribution pipeline, with the consent and provenance infrastructure in place.

### The visibility gradient this creates

Sources that have structured APIs tend to be institutional and Western — MoMA, Met, Wikidata, Art Blocks. Sources that *don't* have clean APIs are often the ones documenting non-Western practice, emerging scenes, and experimental work. "We only ingest from structured, licensed sources" sounds principled but in practice means "we ingest first from institutions wealthy enough to build APIs."

This is a real bias and we name it rather than hide it. The visibility gradient is addressed in two ways: Tier B sources (e-flux, ZKM, ADA, CAN) extend coverage beyond the API-first set, and the non-Western sources listed in `sources.yaml` — Asia Art Archive, ARTLINKART, FILE Festival, NTT ICC, Chronus Art Center, African Digital Art Network, Sharjah Art Foundation — are the explicit agenda for subsequent ingestion passes.

---

## Sources consulted

### Primary sources

**A(DAI) original research (2025–2026)**
Internal. 59 practitioner profiles produced by the A(DAI) team. Source of the `confirmed` tier.

**ADIN / Tribute Labs. "Digital Art Is the Art of Our Age." ADIN ONLINE (Substack), April 18, 2026.**
https://adinonline.substack.com/p/digital-art-is-the-art-of-our-age
12-category taxonomy naming ~50 unique practitioners with an evaluative framework. Published by ADIN, an AI-native venture platform operated by Tribute Labs (Aaron Wright). One of several sources informing category structure and draft-tier selections.

### Cross-reference and validation sources

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

**ArtGraph (Castellano, Digeno, Sansaro, Vessio, 2021–2022)**
Artistic knowledge graph based on WikiArt + DBpedia (~135,000 resources). "Leveraging Knowledge Graphs and Deep Learning for automatic art analysis," Knowledge-Based Systems, 2022. Dataset: https://zenodo.org/records/6337958.

**Getty Art & Architecture Thesaurus (AAT)**
Standard institutional controlled vocabulary for art classification. Referenced as the baseline that A(DAI)'s taxonomy extends beyond.

**Art Basel. "Digital Art: It's not just NFTs and crypto." June 2025.**
https://www.artbasel.com/stories/digital-art-nfts-crypto

**Sotheby's. "A Brief History of NFTs and Digital Art." March 2024.**
https://www.sothebys.com/en/articles/a-brief-history-of-nfts-and-digital-art

---

## Current state (April 21, 2026)

| Metric | Value |
|---|---|
| Canonical practitioners | 87 (41 confirmed, 4 bridge, 42 draft) |
| Total artworks | 254 |
| Artworks with images | 21 (all Art Blocks) |
| Total nodes | 738 |
| Total edges | 1,327 |
| Wikidata QIDs | 60 |
| Validation | 0 errors, 0 warnings |

---

## Known gaps

1. **Source-coverage skew.** The seed draws primarily from English-language, Euro-American sources. This is a source-coverage deficiency, not an acceptable baseline. Subsequent ingestion passes will draw from non-Western sources listed in `sources.yaml`.

2. **fxhash/Tezos generative artists.** Iskra Velitchkova, Michaël Zancan, and others significant to the generative art field are absent because the primary sources skew toward Ethereum/Art Blocks.

3. **Second-wave AI art.** Anna Ridler is in the confirmed set but Sasha Stiles and others who gained institutional prominence 2024–2025 are absent from the draft tier.

4. **Pre-boom conceptual blockchain.** Sarah Meyohas ("BitchCoin", 2015) is historically significant to the crypto art lineage but absent. Rhea Myers is in the draft tier.

5. **Artwork images.** 21 of 254 artworks have images (all Art Blocks). Institutional sources (Wikidata, MoMA, Met) are being run separately. The generative/crypto gap will persist until fxhash and additional Art Blocks passes.

6. **EXHIBITED_AT edges.** No institutional layer in the graph yet. Requires an institution dedup pass.

7. **Uncategorized confirmed practitioners.** 30 of the confirmed practitioners predate the 12-category taxonomy and lack explicit category assignments. A retroactive categorization pass is needed.

8. **Thin categories.** Video Art Extended, Digital Installation, Speculative Practice, Web3/DAO Art, and Sound Art each have 1–2 explicit entries. The recategorization pass (gap #7) will partially address this.

---

## How to cite this seed

> A(DAI) Seed Canon v1 (April 2026). 87 canonical practitioners, 254 artworks across 12 categories of digital art practice. Assembled through multi-source cross-referencing: original A(DAI) research, validated against ADIN/Tribute Labs taxonomy, Right Click Save editorial archive, Rhizome ArtBase, Ostachowski Digital & Crypto Art Chronology, and institutional sources (Art Blocks, MoMA, Wikidata, Met Open Access). Selection criteria: practice breadth, source convergence with declared bias, infrastructure contribution, relational significance with frontier clause, source and scene diversity, exclusion of market-only significance. Commons-licensed under A(DAI) full commons consent scope.
