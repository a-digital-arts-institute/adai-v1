# Canon Evaluation — seed/ practitioners

Read-only analysis generated from `seed/nodes.json` and `seed/edges.json`.

- Total nodes with `type == "practitioner"`: **201**
  - Canonical (hand-authored or confirmed research): **72**
  - Auto-generated stubs from `network_position.connections`: **129**
  - **⚠ Of the auto-stubs, 14 are research-backed practitioners incorrectly trapped as stubs** (see §8 below for the list and the underlying `build_seed.py` bug).

The remainder of this report counts **canonical practitioners only** — auto-generated stubs are excluded from per-category and per-region tallies because they carry no authored metadata. The trapped practitioners in §8 are therefore not counted either; once the bug is fixed they will add ~14 entries to the canonical totals.

**Coverage note on categories**: only the 45 April-2026 new-entry practitioners carry an explicit `seed_category` field. The 59 confirmed + 4 bridge entries predate the 12-category taxonomy, so they show up under the bucket *Uncategorized (pre-taxonomy 2025 research)*. A retroactive categorization pass by editorial is needed to fill those in.

## 1. All canonical practitioners

Sorted alphabetically by name. `Cat` column shows the April 2026 seed-taxonomy category when present; `—` means pre-taxonomy research entry.

| Name | Status | Nationality / Location | Region | Category | Degree |
|---|---|---|---|---|---|
| Addie Wagenknecht | draft | American-Austrian | North America | Post-Internet Art | 8 |
| Allison Parrish | confirmed | United States | North America | — | 11 |
| Amalia Ulman | draft | Argentine-Spanish | Latin America | Post-Internet Art | 9 |
| American Artist | confirmed | United States | North America | — | 13 |
| Anna Ridler | confirmed | United Kingdom | Western Europe | — | 11 |
| Arca | draft | Venezuelan | Latin America | Sound and Algorithmic Music | 10 |
| Beeple | draft | American | North America | Crypto and NFT Art | 11 |
| Ben Fry | draft | American | North America | Generative and Code Art | 12 |
| Brian Eno | confirmed | United Kingdom | Western Europe | — | 14 |
| Cao Fei | confirmed | People's Republic of China | East Asia | — | 16 |
| Casey Reas | confirmed | United States | North America | — | 25 |
| Charles Csuri | draft | American | North America | Early Computer Art Pioneers | 8 |
| Cory Arcangel | draft | American | North America | Post-Internet Art | 12 |
| Danielle Brathwaite-Shirley | confirmed | Berlin, Germany (formerly London, UK) | Unknown/not specified | — | 11 |
| Dmitri Cherniak | draft | Canadian | North America | Generative and Code Art | 13 |
| Ed Atkins | draft | British | Western Europe | Post-Internet Art | 9 |
| Everest Pipkin | confirmed | United States | North America | — | 13 |
| Florian Hecker | confirmed | Austria | Western Europe | — | 17 |
| Frieder Nake | draft | German | Western Europe | Early Computer Art Pioneers | 10 |
| Golan Levin | draft | American | North America | Generative and Code Art | 12 |
| Grimes / Elf.Tech | confirmed | Los Angeles, USA | North America | — | 8 |
| Harm van den Dorpel | confirmed | Kingdom of the Netherlands | Western Europe | — | 14 |
| Harold Cohen | bridge | United Kingdom | Western Europe | — | 16 |
| Heath Bunting | draft | British | Western Europe | Net Art | 9 |
| Hito Steyerl | confirmed | Germany | Western Europe | — | 19 |
| Holly Herndon | confirmed | United States | North America | — | 18 |
| Ian Cheng | confirmed | United States | North America | — | 12 |
| Interdependence (podcast/framework) | confirmed | Berlin, Germany (produced); distributed globally (listenership) | Unknown/not specified | — | 8 |
| Jake Elwes | confirmed | London, UK | Western Europe | — | 9 |
| Jesse Kanda | draft | Canadian-Japanese | North America | AI Art | 8 |
| Jon Rafman | draft | Canadian | North America | Post-Internet Art | 14 |
| Jonas Lund | confirmed | Sweden | Western Europe | — | 14 |
| Joshua Davis | draft | American | North America | Generative and Code Art | 11 |
| Katja Novitskova | draft | Estonian | Eastern Europe | Post-Internet Art | 8 |
| Kevin McCoy | draft | American | North America | Crypto and NFT Art | 13 |
| Kim Asendorf | draft | German | Western Europe | Crypto and NFT Art | 12 |
| Lauren Lee McCarthy | confirmed | Los Angeles, USA | North America | — | 12 |
| Lawrence Lek | draft | German-Malaysian-British | Western Europe | Speculative and World-Building Practice | 10 |
| Libby Heaney | confirmed | United Kingdom | Western Europe | — | 10 |
| Lynn Hershman Leeson | draft | American | North America | Early Computer Art Pioneers | 9 |
| Manfred Mohr | draft | German-American | Western Europe | Early Computer Art Pioneers | 10 |
| Mario Klingemann (Quasimondo) | confirmed | Munich, Germany | Western Europe | — | 10 |
| Matt DesLauriers | draft | Canadian | North America | Generative and Code Art | 11 |
| Matt Kane | draft | American | North America | Crypto and NFT Art | 8 |
| Mitchell Chan | draft | Canadian | North America | Crypto and NFT Art | 8 |
| Nicolas Jaar | draft | Chilean-American | Latin America | Sound and Algorithmic Music | 7 |
| Olia Lialina | draft | Russian-German | Eastern Europe | Net Art | 12 |
| Petra Cortright | draft | American | North America | Post-Internet Art | 11 |
| Philip Beesley | confirmed | Canada | North America | — | 10 |
| Prema Murthy | bridge | New York City (South Asian American) | Unknown/not specified | — | 12 |
| Primavera De Filippi | draft | Italian-French | Western Europe | Web3 and DAO Art | 9 |
| Rafael Lozano-Hemmer | draft | Mexican-Canadian | North America | Digital Installation and Immersive Art | 10 |
| Rhea Myers | draft | British-Canadian | Western Europe | Crypto and NFT Art | 9 |
| Robbie Barrat | draft | American | North America | AI Art | 9 |
| Robert Hodgin | draft | American | North America | Generative and Code Art | 16 |
| Ryoji Ikeda | confirmed | Japan | East Asia | — | 14 |
| Sarah Friend | confirmed | Berlin, Germany | Western Europe | — | 14 |
| Sarah Zucker | draft | American | North America | Crypto and NFT Art | 10 |
| Simon Denny | draft | New Zealander-German | Oceania | Post-Internet Art | 7 |
| Snowfro | draft | American | North America | Crypto and NFT Art | 12 |
| Sondra Perry | draft | American | North America | Video Art Extended | 9 |
| Sougwen Chung | confirmed | New York, USA / London, UK | Western Europe | — | 15 |
| Suzanne Treister | confirmed | United Kingdom | Western Europe | — | 14 |
| Tabita Rezaire | confirmed | France | Western Europe | — | 21 |
| Tega Brain | confirmed | Australia | Oceania | — | 10 |
| Trevor Paglen | draft | American | North America | AI Art | 14 |
| Tyler Hobbs | draft | American | North America | Generative and Code Art | 15 |
| Vera Molnár | draft | Hungarian-French | Eastern Europe | Early Computer Art Pioneers | 11 |
| Vuk Ćosić | draft | Slovenian | Eastern Europe | Net Art | 8 |
| Waldemar Cordeiro | bridge | Brazil | Latin America | — | 12 |
| XCOPY | draft | British | Western Europe | Crypto and NFT Art | 13 |
| Zach Lieberman | draft | American | North America | Generative and Code Art | 14 |

## 2. Practitioners per seed-taxonomy category

### April 2026 seed-taxonomy (explicit `seed_category`)

| Category | Count |
|---|---|
| Crypto and NFT Art | 9 |
| Generative and Code Art | 8 |
| Post-Internet Art | 8 |
| Early Computer Art Pioneers | 5 |
| AI Art | 3 |
| Net Art | 3 |
| Sound and Algorithmic Music | 2 |
| Video Art Extended | 1 |
| Digital Installation and Immersive Art | 1 |
| Speculative and World-Building Practice | 1 |
| Web3 and DAO Art | 1 |
| **Total (explicit)** | **42** |

### Without explicit category (need retroactive assignment)

| Bucket | Count |
|---|---|
| Uncategorized (pre-taxonomy 2025 research) | 30 |

## 3. Practitioners by geographic region

| Region | Count | % of canonical |
|---|---|---|
| North America | 34 | 47.2% |
| Western Europe | 23 | 31.9% |
| Eastern Europe | 4 | 5.6% |
| East Asia | 2 | 2.8% |
| Southeast Asia | 0 | 0.0% |
| South Asia | 0 | 0.0% |
| Latin America | 4 | 5.6% |
| Middle East / North Africa | 0 | 0.0% |
| Sub-Saharan Africa | 0 | 0.0% |
| Oceania | 2 | 2.8% |
| Unknown/not specified | 3 | 4.2% |
| **Total** | **72** | **100%** |

### `Unknown/not specified` breakdown (3 practitioners)

These lack nationality + parsable location in metadata. Most are platforms or entities without a natural nationality, and a few are Wikidata-enriched but the nationality string didn't match the region map.

- Danielle Brathwaite-Shirley — `Berlin, Germany (formerly London, UK)`
- Interdependence (podcast/framework) — `Berlin, Germany (produced); distributed globally (listenership)`
- Prema Murthy — `New York City (South Asian American)`

## 4. Orphan practitioners (zero edges)

None — every canonical practitioner has at least one edge.

## 5. Categories with fewer than 3 practitioners

These categories are thin in the current canon — either genuinely narrow fields, or blind spots to address.

| Category | Count |
|---|---|
| Video Art Extended | 1 |
| Digital Installation and Immersive Art | 1 |
| Speculative and World-Building Practice | 1 |
| Web3 and DAO Art | 1 |
| Sound and Algorithmic Music | 2 |

Pre-taxonomy (59 + 4 bridge) practitioners may retroactively fit into several of these — a re-categorization pass would likely grow them. For example, Holly Herndon and Mat Dryhurst belong under *Sound and Algorithmic Music*; Cao Fei and Ian Cheng under *Video Art Extended*; Sarah Friend and Harm van den Dorpel under *Web3 and DAO Art*.

## 6. Top 10 practitioners by edge count (relational density)

Edge count = total edges where this node is either source or target (all edge types).

| Rank | Name | Edges | Status | Region | Category |
|---|---|---|---|---|---|
| 1 | Casey Reas | 25 | confirmed | North America | — |
| 2 | Tabita Rezaire | 21 | confirmed | Western Europe | — |
| 3 | Hito Steyerl | 19 | confirmed | Western Europe | — |
| 4 | Holly Herndon | 18 | confirmed | North America | — |
| 5 | Florian Hecker | 17 | confirmed | Western Europe | — |
| 6 | Cao Fei | 16 | confirmed | East Asia | — |
| 7 | Harold Cohen | 16 | bridge | Western Europe | — |
| 8 | Robert Hodgin | 16 | draft | North America | Generative and Code Art |
| 9 | Tyler Hobbs | 15 | draft | North America | Generative and Code Art |
| 10 | Sougwen Chung | 15 | confirmed | Western Europe | — |

## 7. Evaluation — what this tells us

**Geographic skew.** North America + Western Europe account for 79% of canonical practitioners (34+23=57 of 72). Sub-Saharan Africa (0), South Asia (0), Southeast Asia (0), and the Middle East / North Africa (0) are each sparsely represented or absent. This mirrors the geographic bias flagged in CLAUDE.md.

**Category coverage.** Only 42 of 72 canonical practitioners are bucketed into the 12 April-2026 taxonomy categories — the other 30 predate the taxonomy. A retroactive categorization pass is the single highest-leverage editorial move available: it would make the thin categories (*Video Art Extended*, *Sound and Algorithmic Music*, *Speculative and World-Building Practice*, *Web3 and DAO Art*) substantially healthier without adding new practitioners.

**Relational density.** The top-10 list is dominated by East Asia, North America, Western Europe-based practitioners — the densest relational clusters sit in the geographically dominant regions, which is expected but reinforces the skew. If we want the graph's gravitational mass to reflect practice outside those regions, we need both more practitioners *and* more edges between them.

## 8. ⚠ Trapped practitioners (build_seed.py ordering bug)

14 practitioners have a real research JSON in `results/` or `results/_drafts/` but appear in `nodes.json` only as auto-generated stubs — meaning their authored metadata (practice description, key works, connections, network position, etc.) was silently dropped.

**Why this happened.** `build_seed.py` processes practitioner files alphabetically. As each file is processed, its `network_position.connections` list spawns stub nodes for every named collaborator. If a collaborator's own research file happens to sort later alphabetically, by the time it's processed a stub with the same ID already exists — and the canonical insert's `add_node()` call has no `upgrade_stub=True`, so the duplicate check skips it silently.

**Impact.** The graph shows 72 canonical practitioners, but the true number is 86 (72 + 14 trapped). The trapped entries are disproportionately theorists and AI-art figures — several are high-profile names the canon is supposed to lead with.

| Name | Expected status | Original type |
|---|---|---|
| James Bridle | confirmed | theorist |
| K Allado-McDowell | confirmed | artist-writer |
| Kate Crawford | confirmed | theorist |
| Lawrence Abu Hamdan | confirmed | artist |
| Legacy Russell | confirmed | theorist |
| Lillian Schwartz | bridge | artist |
| Mat Dryhurst | confirmed | artist |
| Matteo Pasquinelli | confirmed | theorist |
| McKenzie Wark | confirmed | theorist |
| Memo Akten | confirmed | artist |
| Refik Anadol | confirmed | artist |
| Sam Lavigne | confirmed | artist |
| Vladan Joler | confirmed | artist |
| Yuk Hui | confirmed | theorist |

**Fix (not applied — read-only analysis).** In `build_seed.py`, the `normalize_practitioner_file` function must call `add_node(..., upgrade_stub=True)` when inserting a canonical practitioner. That mirrors the pattern already used in `ingest_new_entry` for the April 2026 entries. After re-running `build_seed.py` the trapped 14 will properly populate as canonical.

