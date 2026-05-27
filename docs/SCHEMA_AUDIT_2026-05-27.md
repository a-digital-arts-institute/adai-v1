# A(DAI) Schema Audit — 2026-05-27 (FAST)

Generated: 2026-05-27T17:04:30.535629+00:00
Graph snapshot: 1491 nodes, 3376 edges

## How to read this report

This audit is a **diagnostic**. It reports where shapes in the seed diverge from one of the schema documents (`SKILL.md`, `seed/SOURCES.md`, `CLAUDE.md`). Divergence is a signal to **investigate the producer** (the script in `seed/_build/` or the contributor that emitted the shape) and / or the document — it is **not** a list of rows to delete or rewrite. `seed/*.json` is build output, not source. Fix the producer; the artefact follows.

Per `CLAUDE.md`: *if many producers "violate" the same documented rule, the rule is probably too narrow. Update the doc / validator, not the rows.*

## Headline counts

| Section | Findings | Highest severity |
|---|---:|---|
| A. Schema-doc disagreements (diagnostic, not a delete-list) | 14 | warning |
| B. Per-document conformance (diagnostic; lower = doc and producer disagree) | 3 | info |
| C. Producer findings — shapes worth investigating | 9 | bug |
| D. Narrative-vs-edge mismatches (candidates for curator triage) | 0 | – |
| E. Invitations honored | 4 | info |

## Section A: Schema-doc disagreements (diagnostic, not a delete-list)

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

## Section B: Per-document conformance (diagnostic; lower = doc and producer disagree)

| Document | Edges considered | Conforming | Conformance % |
|---|---:|---:|---:|
| claude_md | 3376 | 2768 | 82.0% |
| skill_md | 3376 | 2768 | 82.0% |
| sources_md | 3376 | 3136 | 92.9% |

## Section C: Producer findings — shapes worth investigating

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


## Section D: Narrative-vs-edge mismatches (candidates for curator triage)

_No findings._

## Section E: Invitations honored

### `empty_stub_count` (1)

- **(empty_stubs)** [info] — `{"count": 5, "rationale": "0-degree nodes with stub-like status \u2014 invitations awaiting contribution", "status_set": ["anchor", "bridge", "draft", "placeholder", "stub"]}`

### `invitation_honored` (3)

- **CONTESTS** [info] — `{"count": 0, "expected": 0, "rationale": "invitation edge reserved for practitioner voice"}`
- **RESPONDS_TO** [info] — `{"count": 0, "expected": 0, "rationale": "invitation edge reserved for practitioner voice"}`
- **TENSION_WITH** [info] — `{"count": 0, "expected": 0, "rationale": "invitation edge reserved for practitioner voice"}`


## Reproducing this audit

```bash
npm run audit:schema:fast
```
