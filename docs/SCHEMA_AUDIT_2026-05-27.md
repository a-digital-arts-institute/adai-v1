# A(DAI) Schema Audit — 2026-05-27 (FAST)

Generated: 2026-05-27T14:46:57.039484+00:00
Graph snapshot: 1491 nodes, 2889 edges

## Headline counts

| Section | Findings | Highest severity |
|---|---:|---|
| A. Schema disagreements | 14 | warning |
| B. Per-document conformance | 3 | info |
| C. Genuine bugs | 1 | info |
| D. Narrative-vs-edge mismatches | 0 | – |
| E. Invitations honored | 4 | info |

## Section A: Schema disagreements

| Edge type | SKILL.md | SOURCES.md | CLAUDE.md | Data conforms to | Edges |
|---|---|---|---|---|---:|
| `BELONGS_TO` | src: practitioner; tgt: collective, scene | src: practitioner; tgt: scene | src: practitioner; tgt: collective, scene | skill_md: 100.0%; sources_md: 100.0%; claude_md: 100.0% | 185 |
| `CLASSIFIED_BY` | src: any; tgt: classification_regime | src: any; tgt: classification_regime | src: any; tgt: classification_regime | skill_md: 100.0%; sources_md: 100.0%; claude_md: 100.0% | 295 |
| `COLLABORATES_WITH` | src: practitioner; tgt: practitioner | src: practitioner; tgt: practitioner | src: practitioner; tgt: practitioner | skill_md: 100.0%; sources_md: 100.0%; claude_md: 100.0% | 140 |
| `CONTESTS` | _not documented_ | src: signal; tgt: edge · invitation | _not documented_ | skill_md: –; sources_md: 100.0%; claude_md: – | 0 |
| `CREATED_BY` | src: artwork; tgt: practitioner | src: artwork; tgt: practitioner | src: artwork; tgt: practitioner | skill_md: 100.0%; sources_md: 100.0%; claude_md: 100.0% | 669 |
| `EMBODIES` | src: artwork; tgt: concept | src: artwork; tgt: concept | src: artwork; tgt: concept | skill_md: 100.0%; sources_md: 100.0%; claude_md: 100.0% | 1196 |
| `EXHIBITED_AT` | src: artwork; tgt: institution, platform | src: artwork; tgt: institution, platform | src: artwork; tgt: institution, platform | skill_md: 100.0%; sources_md: 100.0%; claude_md: 100.0% | 38 |
| `INFLUENCES` | src: practitioner; tgt: practitioner | src: practitioner; tgt: practitioner | src: practitioner; tgt: practitioner | skill_md: 100.0%; sources_md: 100.0%; claude_md: 100.0% | 1 |
| `PRACTICES` | src: practitioner; tgt: concept | src: practitioner; tgt: concept | src: practitioner; tgt: concept | skill_md: 100.0%; sources_md: 100.0%; claude_md: 100.0% | 365 |
| `RESPONDS_TO` | src: artwork; tgt: artwork · invitation | src: artwork; tgt: artwork · invitation | src: artwork; tgt: artwork · invitation | skill_md: 100.0%; sources_md: 100.0%; claude_md: 100.0% | 0 |
| `STYLE_KIN` | _not documented_ | src: practitioner; tgt: practitioner | src: practitioner; tgt: practitioner | skill_md: –; sources_md: –; claude_md: – | 0 |
| `TENSION_WITH` | _not documented_ | src: concept; tgt: concept · invitation | _not documented_ | skill_md: –; sources_md: 100.0%; claude_md: – | 0 |
| `USES_TECHNIQUE` | src: practitioner; tgt: technique | src: artwork; tgt: concept | src: practitioner; tgt: concept | skill_md: –; sources_md: –; claude_md: – | 0 |
| `VISUALLY_AFFINE` | _not documented_ | src: artwork; tgt: artwork | src: artwork; tgt: artwork | skill_md: –; sources_md: –; claude_md: – | 0 |

## Section B: Per-document conformance

| Document | Edges considered | Conforming | Conformance % |
|---|---:|---:|---:|
| claude_md | 2889 | 2889 | 100.0% |
| skill_md | 2889 | 2889 | 100.0% |
| sources_md | 2889 | 2889 | 100.0% |

## Section C: Genuine bugs

### `era_check_coverage` (1)

- **(era_check_coverage)** [info] — `{"coverage_pct": 25.1, "covered": 183, "excluded_no_year_info": 486, "excluded_with_active_years_string": 2, "excluded_with_year_raw": 57, "total": 728}` — _fix:_ strict mode covers 183 of 728 artworks (25.1%); add metadata.year_start to remaining 545 to expand


## Section D: Narrative-vs-edge mismatches

_No findings._

## Section E: Invitations honored

### `empty_stub_count` (1)

- **(empty_stubs)** [info] — `{"count": 191, "rationale": "0-degree nodes with stub-like status \u2014 invitations awaiting contribution", "status_set": ["anchor", "bridge", "draft", "placeholder", "stub"]}`

### `invitation_honored` (3)

- **CONTESTS** [info] — `{"count": 0, "expected": 0, "rationale": "invitation edge reserved for practitioner voice"}`
- **RESPONDS_TO** [info] — `{"count": 0, "expected": 0, "rationale": "invitation edge reserved for practitioner voice"}`
- **TENSION_WITH** [info] — `{"count": 0, "expected": 0, "rationale": "invitation edge reserved for practitioner voice"}`


## Reproducing this audit

```bash
npm run audit:schema:fast
```
