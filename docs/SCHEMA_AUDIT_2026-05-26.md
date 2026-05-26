# A(DAI) Schema Audit — 2026-05-26 (FULL)

Generated: 2026-05-26T21:00:58.001870+00:00
Graph snapshot: 1491 nodes, 3376 edges

## Headline counts

| Section | Findings | Highest severity |
|---|---:|---|
| A. Schema disagreements | 14 | warning |
| B. Per-document conformance | 3 | info |
| C. Genuine bugs | 9 | bug |
| D. Narrative-vs-edge mismatches | 353 | warning |
| E. Invitations honored | 4 | info |

## Section A: Schema disagreements

| Edge type | SKILL.md | SOURCES.md | CLAUDE.md | Data conforms to | Edges |
|---|---|---|---|---|---:|
| `BELONGS_TO` | src: practitioner; tgt: collective, scene | src: practitioner; tgt: scene | src: practitioner; tgt: collective, scene | skill_md: 95.9%; sources_md: 95.9%; claude_md: 95.9% | 193 |
| `CLASSIFIED_BY` | src: any; tgt: classification_regime | src: any; tgt: classification_regime | src: any; tgt: classification_regime | skill_md: 100.0%; sources_md: 100.0%; claude_md: 100.0% | 295 |
| `COLLABORATES_WITH` | src: practitioner; tgt: practitioner | src: practitioner; tgt: practitioner | src: practitioner; tgt: practitioner | skill_md: 76.5%; sources_md: 76.5%; claude_md: 76.5% | 183 |
| `CONTESTS` | _not documented_ | src: signal; tgt: edge · invitation | _not documented_ | skill_md: –; sources_md: 100.0%; claude_md: – | 0 |
| `CREATED_BY` | src: artwork; tgt: practitioner | src: artwork; tgt: practitioner | src: artwork; tgt: practitioner | skill_md: 91.2%; sources_md: 91.2%; claude_md: 91.2% | 737 |
| `EMBODIES` | src: artwork; tgt: concept | src: artwork; tgt: concept | src: artwork; tgt: concept | skill_md: 100.0%; sources_md: 100.0%; claude_md: 100.0% | 1096 |
| `EXHIBITED_AT` | src: artwork; tgt: institution, platform | src: practitioner; tgt: institution | src: artwork; tgt: institution, platform | skill_md: 3.6%; sources_md: 90.8%; claude_md: 3.6% | 305 |
| `INFLUENCES` | src: practitioner; tgt: practitioner | src: practitioner; tgt: practitioner | src: practitioner; tgt: practitioner | skill_md: 100.0%; sources_md: 100.0%; claude_md: 100.0% | 4 |
| `PRACTICES` | src: practitioner; tgt: concept | src: practitioner; tgt: concept | src: practitioner; tgt: concept | skill_md: 79.2%; sources_md: 79.2%; claude_md: 79.2% | 461 |
| `RESPONDS_TO` | src: artwork; tgt: artwork · invitation | src: artwork; tgt: artwork · invitation | src: artwork; tgt: artwork · invitation | skill_md: 100.0%; sources_md: 100.0%; claude_md: 100.0% | 0 |
| `STYLE_KIN` | _not documented_ | src: practitioner; tgt: practitioner | src: practitioner; tgt: practitioner | skill_md: –; sources_md: –; claude_md: – | 0 |
| `TENSION_WITH` | _not documented_ | src: concept; tgt: concept · invitation | _not documented_ | skill_md: –; sources_md: 100.0%; claude_md: – | 0 |
| `USES_TECHNIQUE` | src: practitioner; tgt: technique | src: artwork; tgt: concept | src: practitioner; tgt: concept | skill_md: 0.0%; sources_md: 100.0%; claude_md: 0.0% | 102 |
| `VISUALLY_AFFINE` | _not documented_ | src: artwork; tgt: artwork | src: artwork; tgt: artwork | skill_md: –; sources_md: –; claude_md: – | 0 |

## Section B: Per-document conformance

| Document | Edges considered | Conforming | Conformance % |
|---|---:|---:|---:|
| claude_md | 3376 | 2768 | 82.0% |
| skill_md | 3376 | 2768 | 82.0% |
| sources_md | 3376 | 3136 | 92.9% |

## Section C: Genuine bugs

### `era_check_coverage` (1)

- **(era_check_coverage)** [info] — `{"coverage_pct": 25.1, "covered": 183, "excluded_no_year_info": 486, "excluded_with_active_years_string": 2, "excluded_with_year_raw": 57, "total": 728}` — _fix:_ strict mode covers 183 of 728 artworks (25.1%); add metadata.year_start to remaining 545 to expand

### `forked_created_by` (6)

- **artwork:black hole** [bug] — `{"creator_types": ["practitioner", "practitioner"], "creators": ["practitioner:suzanne treister", "practitioner:addie wagenknecht"], "gatherers": ["gatherer-objkt-tags-v3", "gatherer-wikidata-v3b"], "sub_class": "id_collision_overlap"}` — _fix:_ split node — see Section C.1 finding for same id
- **artwork:chromie squiggle** [bug] — `{"creator_types": ["platform", "practitioner"], "creators": ["platform:art blocks", "practitioner:snowfro"], "gatherers": ["contributor:migration"], "sub_class": "platform_or_institution_as_creator"}` — _fix:_ remap non-practitioner CREATED_BY to EXHIBITED_AT or PUBLISHED_ON
- **artwork:fidenza** [bug] — `{"creator_types": ["platform", "practitioner"], "creators": ["platform:art blocks", "practitioner:tyler hobbs"], "gatherers": ["contributor:migration"], "sub_class": "platform_or_institution_as_creator"}` — _fix:_ remap non-practitioner CREATED_BY to EXHIBITED_AT or PUBLISHED_ON
- **artwork:future art ecosystems 4: art x public ai** [bug] — `{"creator_types": ["institution", "publication"], "creators": ["institution:serpentine arts technologies", "publication:serpentine fae4: art x decentralised ai 2024"], "gatherers": ["contributor:migration"], "sub_class": "platform_or_institution_as_creator"}` — _fix:_ remap non-practitioner CREATED_BY to EXHIBITED_AT or PUBLISHED_ON
- **artwork:the hearth** [bug] — `{"creator_types": ["artwork", "artwork"], "creators": ["artwork:starmirror holly herndon & mat dryhurst", "artwork:the call holly herndon & mat dryhurst"], "gatherers": ["contributor:migration"], "sub_class": "platform_or_institution_as_creator"}` — _fix:_ remap non-practitioner CREATED_BY to EXHIBITED_AT or PUBLISHED_ON
- **artwork:untitled** [bug] — `{"creator_types": ["practitioner", "practitioner", "practitioner"], "creators": ["practitioner:vera molnar", "practitioner:american artist", "practitioner:harold cohen"], "gatherers": ["gatherer-enrichment", "gatherer-moma-digital-v3", "gatherer-wikidata-v3b"], "sub_class": "id_collision_overlap"}` — _fix:_ split node — see Section C.1 finding for same id

### `id_collision` (2)

- **artwork:black hole** [bug] — `{"creators": ["practitioner:addie wagenknecht", "practitioner:suzanne treister"], "gatherers": ["gatherer-objkt-tags-v3", "gatherer-wikidata-v3b"], "name": "Black Hole"}` — _fix:_ split into per-creator nodes with disambiguated ids
- **artwork:untitled** [bug] — `{"creators": ["practitioner:american artist", "practitioner:harold cohen", "practitioner:vera molnar"], "gatherers": ["gatherer-enrichment", "gatherer-moma-digital-v3", "gatherer-wikidata-v3b"], "name": "Untitled"}` — _fix:_ split into per-creator nodes with disambiguated ids


## Section D: Narrative-vs-edge mismatches

### `claimed_but_unlinked` (347)

- **practitioner:allison parrish** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Electronic literature"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:allison parrish** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "ELO (Electronic Literature Organization)"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:allison parrish** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Counterpath"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:allison parrish** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Processing/p5.js community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:allison parrish** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Processing Foundation"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:allison parrish** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "computational linguistics"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:allison parrish** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "NLP/AI art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:allison parrish** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "academic creative writing"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:allison parrish** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "ITP/NYU"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:allison parrish** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "AI/ML art scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:american artist** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "New York contemporary art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:american artist** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Black art and technology"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:american artist** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "critical race and technology studies"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:american artist** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "museum circuit (MoMA, Whitney, Queens Museum)"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:american artist** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "academic discourse (Carnegie Mellon, Parsons)"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:american artist** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Rhizome network"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:american artist** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "post-internet art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:anna ridler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "machine learning art community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:anna ridler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "London digital art scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:anna ridler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Royal College of Art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:anna ridler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Ars Electronica"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:anna ridler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Barbican"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:anna ridler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "V&A"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:anna ridler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Serpentine"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:anna ridler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "PHI Foundation Montreal"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:anna ridler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "international biennials and media art festivals"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:brian eno** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Long Now Foundation"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:brian eno** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Roxy Music"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:brian eno** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "art-rock scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:brian eno** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "electronic music scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:brian eno** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Tate"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:brian eno** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "MoMA"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:brian eno** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "generative art movement"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:brian eno** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "ambient music"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:brian eno** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "contemporary art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:brian eno** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "generative systems"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:brian eno** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "long-term thinking communities"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:brian eno** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "museum/gallery world"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:cao fei** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Chinese contemporary art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:cao fei** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Venice Biennale (2003, 2007, 2015)"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:cao fei** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Documenta"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:cao fei** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Serpentine Galleries"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:cao fei** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "MoMA PS1"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:cao fei** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Centre Pompidou"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:cao fei** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "UCCA Beijing"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:cao fei** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Vitamin Creative Space"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:cao fei** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Second Life art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:cao fei** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Spruth Magers"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:casey reas** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "generative art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:casey reas** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "digital art infrastructure"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:casey reas** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "UCLA"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:casey reas** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Whitney"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:casey reas** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "V&A"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:casey reas** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Processing community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:casey reas** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Feral File"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:casey reas** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "historical computational art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:casey reas** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "blockchain/NFT art scenes"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:danielle brathwaite-shirley** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Berlin digital art scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:danielle brathwaite-shirley** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "London art scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:danielle brathwaite-shirley** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Slade School of Fine Art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:danielle brathwaite-shirley** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "UK institutional circuit (Tate, Serpentine, Barbican)"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:danielle brathwaite-shirley** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "international biennials"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:danielle brathwaite-shirley** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "queer digital art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:danielle brathwaite-shirley** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "archival art practice"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:danielle brathwaite-shirley** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Black trans art and activism"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:everest pipkin** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "indie games"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:everest pipkin** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "digital commons movement"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:everest pipkin** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "creative coding community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:everest pipkin** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "art world"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:everest pipkin** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "tech ethics discourse"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:florian hecker** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Editions Mego"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:florian hecker** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Raster-Noton"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:florian hecker** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Urbanomic"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:florian hecker** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "CCRU"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:florian hecker** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Vienna electronic music scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:florian hecker** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "London art scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:florian hecker** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "psychoacoustics research community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:grimes elftech** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Mainstream pop/electronic music"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:grimes elftech** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "AI art and music"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:grimes elftech** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Tech industry"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:grimes elftech** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Web3/crypto-adjacent"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:grimes elftech** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Experimental electronic music"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:grimes elftech** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "CreateSafe ecosystem"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:harm van den dorpel** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Berlin digital art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:harm van den dorpel** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "crypto/blockchain art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:harm van den dorpel** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "artificial life art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:harold cohen** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "UC San Diego Centre for Research in Computing and the Arts (CRCA)"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:harold cohen** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "symbolic-AI research community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:harold cohen** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "early AI art pioneers (pre-deep-learning era)"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:hito steyerl** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "critical media art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:hito steyerl** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Berlin art scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:hito steyerl** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Venice Biennale"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:hito steyerl** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "documenta"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:hito steyerl** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Serpentine"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:hito steyerl** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "critical AI/technology discourse"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:hito steyerl** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "UdK Berlin academic community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:hito steyerl** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "e-flux publishing network"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:holly herndon** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "AI art and music"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:holly herndon** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Berlin electronic music and experimental art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:holly herndon** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Stanford CCRMA alumni network"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:holly herndon** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Serpentine Arts Technologies"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:holly herndon** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Web3/DAO art community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:holly herndon** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "AI ethics and policy"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:holly herndon** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "TIME 100 most influential voices in AI (2023)"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:holly herndon** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Ars Electronica STARTS Prize 2022"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:holly herndon** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Austrian Digital Human Rights Award 2024"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:holly herndon** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Kairos Prize 2025"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:holly herndon** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "European digital arts"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:ian cheng** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Contemporary art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:ian cheng** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "MoMA"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:ian cheng** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Serpentine"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:ian cheng** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "LUMA"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:ian cheng** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "The Shed"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:ian cheng** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "simulation art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:ian cheng** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "post-internet art generation"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:ian cheng** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "cognitive science"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:ian cheng** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "complexity theory"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:ian cheng** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "philosophy of mind"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jake elwes** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "London AI art scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jake elwes** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Slade School of Fine Art (UCL)"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jake elwes** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Barbican"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jake elwes** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Science Gallery London"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jake elwes** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "arebyte"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jake elwes** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "AI ethics and art discourse"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jake elwes** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "LGBTQ+ art and drag culture"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jake elwes** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Ars Electronica"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:james bridle** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "art-technology crossover"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:james bridle** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "investigative art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:james bridle** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "new aesthetics"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:james bridle** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "ecological technology"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:james bridle** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "transmediale"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:james bridle** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Serpentine Galleries"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:james bridle** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Barbican"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:james bridle** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "critical technology studies"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jonas lund** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "European digital art scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jonas lund** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "post-internet scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jonas lund** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "blockchain art community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jonas lund** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Amsterdam art scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jonas lund** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Berlin art scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jonas lund** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "institutional critique"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jonas lund** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "net art tradition"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jonas lund** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Sandberg Instituut"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jonas lund** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Piet Zwart Institute"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jonas lund** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "NOME Gallery Berlin"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jonas lund** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Whitechapel Gallery"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jonas lund** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Ars Electronica"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:jonas lund** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Steve Turner Gallery LA"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:k allado-mcdowell** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "AI art community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:k allado-mcdowell** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "experimental publishing"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:k allado-mcdowell** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Ignota Books"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:k allado-mcdowell** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Serpentine R&D Platform"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:k allado-mcdowell** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Silicon Valley tech-art intersection"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:k allado-mcdowell** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Indigenous futurism"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:k allado-mcdowell** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "psychedelic culture"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:k allado-mcdowell** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Los Angeles art scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:kate crawford** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Critical AI studies"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:kate crawford** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "AI ethics"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:kate crawford** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "art-technology crossover"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:kate crawford** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "USC Annenberg"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:kate crawford** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "AI Now Institute"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:kate crawford** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "MoMA/V&A exhibition circuit"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:kate crawford** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "policy/regulation community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lauren lee mccarthy** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "p5.js"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lauren lee mccarthy** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "UCLA Design Media Arts"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lauren lee mccarthy** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "MIT Media Lab"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lauren lee mccarthy** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Processing Foundation"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lauren lee mccarthy** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "new media art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lauren lee mccarthy** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "performance art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lauren lee mccarthy** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "surveillance art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lauren lee mccarthy** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Ars Electronica"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lauren lee mccarthy** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "LACMA"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lauren lee mccarthy** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Whitney Museum"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lauren lee mccarthy** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "MoMA"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lauren lee mccarthy** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "international new media festivals"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lawrence abu hamdan** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Forensic Architecture network"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lawrence abu hamdan** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Turner Prize / UK contemporary art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lawrence abu hamdan** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Beirut art scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lawrence abu hamdan** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "human rights investigation community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lawrence abu hamdan** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "documenta / Venice Biennale circuit"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lawrence abu hamdan** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Maureen Paley gallery"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lawrence abu hamdan** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Portikus Frankfurt"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:legacy russell** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "New York contemporary art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:legacy russell** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Black feminist technology studies"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:legacy russell** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "The Kitchen community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:legacy russell** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Verso Books intellectual network"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:libby heaney** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Quantum computing research community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:libby heaney** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Venice Biennale"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:libby heaney** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "international art biennale circuit"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:libby heaney** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "UK digital art scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:libby heaney** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "science-art intersection"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:libby heaney** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Goethe-Institut"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:libby heaney** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Schirn Kunsthalle"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:libby heaney** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Light Art Space Berlin"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:libby heaney** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "quantum humanities/quantum aesthetics emerging discourse"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lillian schwartz** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Bell Laboratories computer-graphics group"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lillian schwartz** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Murray Hill NJ"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lillian schwartz** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "early computer-art scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:lillian schwartz** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "SIGGRAPH community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mario klingemann** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "GAN art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mario klingemann** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "NFT art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mario klingemann** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Google Arts & Culture"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mario klingemann** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Sotheby's"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mat dryhurst** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "AI art and ethics"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mat dryhurst** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "TIME 100 most influential voices in AI (2023)"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mat dryhurst** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Berlin experimental art and music"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mat dryhurst** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Web3/DAO art community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mat dryhurst** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "AI policy (EU text and data mining policy)"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mat dryhurst** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Serpentine Arts Technologies"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mat dryhurst** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Ars Electronica (STARTS Prize 2022)"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mat dryhurst** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "NYU teaching"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mat dryhurst** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "crypto art community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mat dryhurst** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Austrian Digital Human Rights Award 2024"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mat dryhurst** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Kairos Prize 2025"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:matteo pasquinelli** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Critical AI studies"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:matteo pasquinelli** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Italian operaismo-influenced media theory"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:matteo pasquinelli** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "post-digital theory"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:matteo pasquinelli** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "network culture commons movement"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:matteo pasquinelli** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "KW Institute for Contemporary Art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:matteo pasquinelli** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "transmediale"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:matteo pasquinelli** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "European art-theory crossover scenes"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mckenzie wark** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Critical theory"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mckenzie wark** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "media studies"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mckenzie wark** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "The New School"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mckenzie wark** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Verso Books"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mckenzie wark** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "situationist-influenced media theory"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mckenzie wark** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "digital culture criticism"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:mckenzie wark** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "e-flux discourse community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:memo akten** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "openFrameworks community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:memo akten** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "academic creative AI research"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:memo akten** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "contemplative/spiritual art intersection"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:memo akten** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Goldsmiths creative computing network"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:philip beesley** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "responsive architecture"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:philip beesley** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "interactive art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:philip beesley** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "biomimetic design"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:philip beesley** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "computational architecture"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:philip beesley** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "responsive environments community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:philip beesley** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Kas Oosterhuis"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:philip beesley** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "dECOi"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:philip beesley** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "kinetic art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:philip beesley** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "near-living/protocell research community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:philip beesley** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Martin Hanczyc"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:philip beesley** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Ars Electronica"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:prema murthy** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "late-1990s net.art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:prema murthy** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Rhizome community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:prema murthy** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "New York"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:prema murthy** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "feminist digital practice"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:prema murthy** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "critical-race digital practice"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:refik anadol** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "immersive/experiential art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:refik anadol** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "major gallery representation"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:refik anadol** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "MoMA"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:refik anadol** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Google"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:refik anadol** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "NVIDIA"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:refik anadol** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Meta"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:refik anadol** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Feral File"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:refik anadol** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Web3/NFT art ecosystem"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:ryoji ikeda** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "scene:electronic music"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:ryoji ikeda** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "scene:minimal electronic music"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:ryoji ikeda** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "institution:Ars Electronica"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:ryoji ikeda** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "institution:ZKM"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:ryoji ikeda** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "institution:Centre Pompidou"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:ryoji ikeda** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "institution:Tate"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:ryoji ikeda** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "institution:Audemars Piguet Contemporary"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:ryoji ikeda** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "scene:contemporary art installation"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sam lavigne** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "New York new media art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sam lavigne** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "NYU ITP community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sam lavigne** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "computational journalism"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sam lavigne** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "net art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sam lavigne** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "tactical media"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sarah friend** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Blockchain art community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sarah friend** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Berlin digital art scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sarah friend** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Ethereum developer community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sarah friend** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "ConsenSys"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sarah friend** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "trust (Berlin art/tech collective)"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sarah friend** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Haus der Kulturen der Welt"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sarah friend** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Feral File"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sarah friend** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Rhizome"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sarah friend** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "crypto-art and DAO discourse"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sarah friend** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "commons/governance theory community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sarah friend** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Radical Networks"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sougwen chung** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "MIT Media Lab"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sougwen chung** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "World Economic Forum"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sougwen chung** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "V&A"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sougwen chung** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "TIME100 AI list"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sougwen chung** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "contemporary art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sougwen chung** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "AI/robotics research"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sougwen chung** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "technology ethics"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:sougwen chung** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "human-machine collaboration art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:suzanne treister** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Tate"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:suzanne treister** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Centre Pompidou"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:suzanne treister** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Modern Art Oxford"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:suzanne treister** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "occult/esoteric art traditions"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:suzanne treister** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "London's art and technology scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:suzanne treister** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "European new media art networks"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:suzanne treister** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "digital culture critique"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tabita rezaire** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Decolonial technology art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tabita rezaire** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Afrofuturism"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tabita rezaire** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Global South digital art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tabita rezaire** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "London/Goldsmiths network"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tabita rezaire** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Johannesburg art scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tabita rezaire** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Goodman Gallery"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tabita rezaire** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Wits"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tabita rezaire** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "French Guiana/South American indigenous knowledge"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tabita rezaire** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "international biennial circuit"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tabita rezaire** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "healing and wellness practice"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tabita rezaire** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Serpentine Galleries"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tabita rezaire** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "post-internet art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tega brain** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Environmental/systems art community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tega brain** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "NYU ITP"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tega brain** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Australian new media art scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tega brain** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Ars Electronica"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tega brain** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Rhizome"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tega brain** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "critical engineering"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tega brain** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Julian Oliver connection"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tega brain** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "AI art and ethics discourse"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tega brain** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "SFPC (School for Poetic Computation)"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:tega brain** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "environmental humanities"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:vladan joler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "critical art/technology"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:vladan joler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "investigative art"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:vladan joler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "design and information visualization"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:vladan joler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "digital rights advocacy"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:vladan joler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "academic research (AI ethics, critical data studies)"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:vladan joler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "MoMA"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:vladan joler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "V&A"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:vladan joler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Ars Electronica"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:vladan joler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "AI Now Institute"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:vladan joler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "University of Novi Sad"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:vladan joler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "SHARE Foundation"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:vladan joler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Design Museum"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:vladan joler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "critical AI/technology community"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:vladan joler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Kate Crawford"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:vladan joler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Trevor Paglen"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:vladan joler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Matteo Pasquinelli"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:vladan joler** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Knowing Machines project"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:waldemar cordeiro** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "S\u00e3o Paulo concretism"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:waldemar cordeiro** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Grupo Ruptura"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:waldemar cordeiro** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "USP computing centre circle"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:waldemar cordeiro** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Latin American computer-art circuit"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:yuk hui** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Continental philosophy of technology"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:yuk hui** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "post-colonial technology studies"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:yuk hui** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "e-flux discourse network"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:yuk hui** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Simondon studies"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:yuk hui** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Stiegler's International network"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:yuk hui** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Chinese philosophy"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:yuk hui** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Hong Kong intellectual scene"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:yuk hui** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "Leuphana University"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:yuk hui** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "German philosophy of technology"}` — _fix:_ add edge OR remove claim from prose
- **practitioner:yuk hui** [warning] — `{"model_id": "claude-haiku-4-5", "prompt_version": 1, "prose_claim": "art-technology discourse"}` — _fix:_ add edge OR remove claim from prose

### `linked_but_unclaimed` (6)

- **practitioner:danielle brathwaite-shirley** [warning] — `{"edge_description": "scene:race technology and digital culture", "model_id": "claude-haiku-4-5", "prompt_version": 1}` — _fix:_ add to prose OR remove edge
- **practitioner:grimes elftech** [warning] — `{"edge_description": "scene:sound art", "model_id": "claude-haiku-4-5", "prompt_version": 1}` — _fix:_ add to prose OR remove edge
- **practitioner:ian cheng** [warning] — `{"edge_description": "scene:speculative and sci-fi practice", "model_id": "claude-haiku-4-5", "prompt_version": 1}` — _fix:_ add to prose OR remove edge
- **practitioner:james bridle** [warning] — `{"edge_description": "scene:forensic and research-based art", "model_id": "claude-haiku-4-5", "prompt_version": 1}` — _fix:_ add to prose OR remove edge
- **practitioner:legacy russell** [warning] — `{"edge_description": "scene:critical tech art", "model_id": "claude-haiku-4-5", "prompt_version": 1}` — _fix:_ add to prose OR remove edge
- **practitioner:mario klingemann** [warning] — `{"edge_description": "scene:crypto art", "model_id": "claude-haiku-4-5", "prompt_version": 1}` — _fix:_ add to prose OR remove edge


## Section E: Invitations honored

### `empty_stub_count` (1)

- **(empty_stubs)** [info] — `{"count": 5, "rationale": "0-degree nodes with stub-like status \u2014 invitations awaiting contribution", "status_set": ["anchor", "bridge", "draft", "placeholder", "stub"]}`

### `invitation_honored` (3)

- **CONTESTS** [info] — `{"count": 0, "expected": 0, "rationale": "invitation edge reserved for practitioner voice"}`
- **RESPONDS_TO** [info] — `{"count": 0, "expected": 0, "rationale": "invitation edge reserved for practitioner voice"}`
- **TENSION_WITH** [info] — `{"count": 0, "expected": 0, "rationale": "invitation edge reserved for practitioner voice"}`


## Reproducing this audit

```bash
npm run audit:schema:full
```
