# Spec: A(DAI) Schema Audit Tool

**Date:** 2026-05-24
**Author:** Irina (with Claude, via /brainstorming)
**Status:** Draft — pending spec review
**Repo:** `/Users/aiio/Documents/ADAI/adai-v1`
**Next step after this spec is approved:** writing-plans skill produces implementation plan

---

## Context

A(DAI) is preparing for a June 2026 public launch at Art Basel ("Field Conditions" event). Three weeks of investigation against the live graph (1,491 nodes, 4,544 edges) has surfaced multiple categories of data-quality issue:

- 78 known-bad edges documented in `docs/ENRICHMENT_AUDIT_2026_05_20.md`
- 525 additional schema-shape questions discovered today (15.6% of curated edges have a source-type that disagrees with at least one schema document)
- 438 zero-inbound auto-generated artwork shells with no provenance
- 288 long-tail descriptive concepts that read more like tag-scraper output than curated taxonomy
- An ecosystem-coverage skew (Tezos artists over-indexed, Ethereum artists under-indexed) traceable to gatherer prioritisation choices
- 513 nodes with a metadata-serialisation bug (`metadata` stored as string instead of JSON)
- At least one confirmed narrative-text inaccuracy (Sofia Crespo's metadata claims primary Tezos presence when she is mainly Ethereum)
- Three schema documents (SOURCES.md, SKILL.md, CLAUDE.md) that disagree about what edge types are permitted and what their valid source/target types are

The team has decided (separately, not in scope of this spec) that the appropriate response is likely a partial or full v2 reseed of the canon — but that v2 design depends on having a clear diagnostic of v1's actual state. **This spec defines that diagnostic.**

The audit is the bridge between "we know things are wrong" and "we know what to redo." Its output is read by humans planning the v2 reseed and (later) potentially fed into write-time schema enforcement, neither of which are in scope here.

## Goals

1. Produce a reproducible, categorised report of every schema-related issue in the current graph.
2. Surface schema disagreements between the three documenting sources (SOURCES.md, SKILL.md, CLAUDE.md) without forcing a winner — let the reader pick which document becomes canonical.
3. Identify genuine bugs (issues wrong by every reasonable reading of the schema) so they can be cleaned up regardless of the reconciliation outcome.
4. Respect the project's "two readings" design philosophy — empty edge types reserved for practitioner voice (RESPONDS_TO, CONTESTS, TENSION_WITH) and empty stubs awaiting contributor fill-in must be acknowledged as invitations, never flagged as missing data.
5. Be cheap enough to re-run after every significant change to the graph or the schema documents.

## Non-goals (explicit)

- **No fixing.** This tool reports; it does not modify data. No DELETEs, no UPDATEs, no PATCHes.
- **No write-time enforcement.** This tool does not add guards to `/api/v1/edges` or the gatherer pipeline. That is a separate piece of work.
- **No v2 reseed design.** The findings inform a future brainstorming session; this spec does not propose what v2 should look like.
- **No automatic reconciliation.** The audit reports document-disagreements; it does not decide which document is correct.
- **No narrative correction.** The narrative-vs-edge mismatch detection identifies candidates; it does not rewrite metadata prose.

---

## Architecture

Two Python files in `seed/_build/`, sitting alongside the existing offline gatherer pipeline. Same dependency footprint as the rest of `seed/_build/` (uses `seed/_build/.venv/`).

```
seed/_build/
├── schema_contract.py        # NEW — machine-readable expression of each document's claims
├── audit_schema.py           # NEW — the audit script
└── (existing pipeline scripts unchanged)
```

Two npm scripts wrap the audit:

```json
{
  "scripts": {
    "audit:schema:fast": "seed/_build/.venv/bin/python3 seed/_build/audit_schema.py --tier fast",
    "audit:schema:full": "seed/_build/.venv/bin/python3 seed/_build/audit_schema.py --tier full"
  }
}
```

### Inputs

| Input | Source | Required by |
|---|---|---|
| `seed/nodes.json` | local file | both tiers |
| `seed/edges.json` | local file | both tiers |
| `seed/contributors.json` | local file | both tiers (for provenance check) |
| `seed/signals.json` | local file | both tiers (for signal_id integrity check) |
| `schema_contract.py` | local module | both tiers |
| `ANTHROPIC_API_KEY` | `.env` | full tier only |
| Live API | `--live` flag pulls from `https://adai-basel.fly.dev/api/graph?type=_all` | optional, both tiers |

The `--live` flag exists so the audit can be run against production after deploys, but the default reads local seed files (deterministic, free, no network).

### Outputs

| Output | Path | When |
|---|---|---|
| Markdown report | `docs/SCHEMA_AUDIT_<YYYY-MM-DD>.md` | every run |
| Per-category CSVs | `docs/schema_audit_<YYYY-MM-DD>/*.csv` | every run |
| Stderr log | terminal | every run |

If the report already exists for today's date, append a numeric suffix (`-2`, `-3`) so re-runs don't clobber. Stderr log shows category counts as they're computed.

### Cross-cutting data-handling rules

**Rule 1 — Metadata always goes through `_parse_metadata`.** The seed has a serialisation bug where ~513 nodes have `metadata` stored as a JSON string instead of a dict. Every read of `node["metadata"]` (or any nested field) must route through `_parse_metadata(node)` (defined in `audit_schema.py`), which transparently unwraps both forms. Direct access to `node["metadata"]["status"]` will silently produce wrong results on the affected nodes — there is no schema enforcement to catch this. This rule applies to every check function, every loader, every renderer.

---

## Component 1: `schema_contract.py`

Single module exporting one constant `EDGE_CLAIMS: Dict[str, Dict[str, Optional[EdgeClaim]]]`. Each top-level key is an edge type name. Each second-level key is a source document (`"skill_md"`, `"sources_md"`, `"claude_md"`). Each value is either an `EdgeClaim` dataclass or `None` (meaning that document does not document this edge type).

```python
from dataclasses import dataclass
from typing import Optional, List, Dict

CONTRACT_SCHEMA_VERSION = "1.0"  # bump when EDGE_CLAIMS shape changes (invalidates LLM cache)

@dataclass
class EdgeClaim:
    source_types: List[str]                # allowed source node types
    target_types: List[str]                # allowed target node types
    is_invitation: bool = False            # True if the edge is documented as deliberately empty
    description: str = ""                  # one-line summary of what the doc says the edge means
    ref: str = ""                          # human-readable location (e.g. "line 296", "§1.4 table")

EDGE_CLAIMS: Dict[str, Dict[str, Optional[EdgeClaim]]] = {
    # WORKED EXAMPLE 1 — the canonical disagreement case:
    "EXHIBITED_AT": {
        "skill_md": EdgeClaim(
            source_types=["artwork"],
            target_types=["institution", "platform"],
            description="A specific artwork was shown at a specific institution/platform.",
            ref="SKILL.md §1.4 edge table",
        ),
        "sources_md": EdgeClaim(
            source_types=["practitioner"],
            target_types=["institution"],
            description="Where a practitioner has shown work (practitioner-level CV).",
            ref="SOURCES.md line 296 edge structure table",
        ),
        "claude_md": EdgeClaim(
            source_types=["artwork"],
            target_types=["institution", "platform"],
            description="A specific artwork was shown at a specific institution/platform.",
            ref="CLAUDE.md edge-type paragraph",
        ),
    },
    # WORKED EXAMPLE 2 — an invitation edge documented across all three:
    "RESPONDS_TO": {
        "skill_md": EdgeClaim(
            source_types=["artwork"], target_types=["artwork"],
            is_invitation=True,
            description="This work references or responds to that one. Requires attested artist intent.",
            ref="SKILL.md §1.4 'don't infer' rule",
        ),
        "sources_md": EdgeClaim(
            source_types=["artwork"], target_types=["artwork"],
            is_invitation=True,
            description="Reserved for practitioner voice; zero by design.",
            ref="SOURCES.md line 20, line 318",
        ),
        "claude_md": EdgeClaim(
            source_types=["artwork"], target_types=["artwork"],
            is_invitation=True,
            description="Empty by design; pipeline refuses to auto-emit.",
            ref="CLAUDE.md edge-types paragraph + 'pipeline refuses' clause",
        ),
    },
    # WORKED EXAMPLE 3 — an invitation documented in only one source:
    "CONTESTS": {
        "skill_md": None,   # not documented in SKILL.md
        "sources_md": EdgeClaim(
            source_types=["signal"], target_types=["edge"],
            is_invitation=True,
            description="Practitioner contestation of an existing edge. Reserved for the second reading.",
            ref="SOURCES.md line 20, line 322",
        ),
        "claude_md": None,  # not documented in CLAUDE.md
    },
    # Remaining 11 entries follow the same pattern, populated during implementation
    # by reading each cited section of each document literally. To populate:
    # CREATED_BY, EMBODIES, PRACTICES, USES_TECHNIQUE, BELONGS_TO, CLASSIFIED_BY,
    # COLLABORATES_WITH, INFLUENCES, TENSION_WITH, STYLE_KIN, VISUALLY_AFFINE.
    # If a document omits an edge type, record None (not an empty EdgeClaim).
}
```

**Coverage: 14 entries total** — 9 curated edge types from SKILL.md + CLAUDE.md (CREATED_BY, EMBODIES, PRACTICES, USES_TECHNIQUE, BELONGS_TO, EXHIBITED_AT, CLASSIFIED_BY, COLLABORATES_WITH, INFLUENCES), 2 auto-derived embedding edges from CLAUDE.md (STYLE_KIN, VISUALLY_AFFINE), and 3 invitation edges from SOURCES.md (RESPONDS_TO, CONTESTS, TENSION_WITH).

Maintenance: hand-edited. Schema documents change infrequently; auto-parsing markdown is fragile (the three docs use different table formats, prose mentions, and inline assertions). Each `ref` field cites the document line/section so a future maintainer can re-verify. The `CONTRACT_SCHEMA_VERSION` constant exists for the Section D cache-key — bump it whenever the dict shape changes to invalidate stale LLM results.

The module has no logic beyond holding the data structure. Importable from anywhere in the seed pipeline without side effects.

---

## Component 2: `audit_schema.py`

Single-file Python script. Command-line interface:

```
python3 audit_schema.py [--tier fast|full] [--live] [--out-dir DIR]
```

| Flag | Default | Meaning |
|---|---|---|
| `--tier` | `fast` | `fast` = mechanical + heuristic; `full` = adds LLM narrative pass |
| `--live` | off | Pull graph from production API instead of local seed files |
| `--out-dir` | `docs/` | Where to write report and CSVs |

### Internal structure

```
audit_schema.py
├── load_graph() → (nodes_by_id, edges)              # reads seed/*.json or live API
├── load_contract() → EDGE_CLAIMS                    # imports schema_contract.py
├── check_schema_disagreements() → list[Finding]     # Section A
├── check_per_document_conformance() → list[Finding] # Section B
├── check_genuine_bugs() → list[Finding]             # Section C — composed of sub-checks below
│   ├── detect_id_collisions()
│   ├── detect_forked_created_by()
│   ├── detect_era_violations()
│   ├── detect_bitemporal_integrity()
│   ├── detect_provenance_broken()
│   ├── detect_self_loops()
│   └── detect_unknown_edge_types()
├── check_narrative_mismatches() → list[Finding]     # Section D, FULL tier only
├── check_invitations_honored() → list[Finding]      # Section E
├── render_report(findings) → str                    # markdown
├── render_csvs(findings) → dict[str, str]           # one CSV per category
└── main()
```

Each `check_*` function takes `(nodes_by_id, edges, contract)` and returns a `list[Finding]`. The `Finding` dataclass:

```python
@dataclass
class Finding:
    section: str           # "A" | "B" | "C" | "D" | "E"
    category: str          # e.g. "schema_disagreement", "id_collision", "forked_created_by"
    severity: str          # "info" | "warning" | "bug"
    subject_id: str        # the edge or node id this finding concerns
    subject_kind: str      # "edge" | "node"
    details: dict          # category-specific structured data
    suggested_fix: str     # human-readable, may be empty
```

### Section A: Schema disagreements

For each edge type in `EDGE_CLAIMS`, produce one Finding describing where the three documents agree, where they disagree, and what fraction of the live data conforms to each document's claim. Includes both source-type and target-type comparison.

Sample output row (rendered in markdown — figures derived from the actual graph as of 2026-05-24, where 294 of 305 EXHIBITED_AT edges have practitioner source and 11 have artwork source):

| Edge type | SKILL.md | SOURCES.md | CLAUDE.md | Data conforms to |
|---|---|---|---|---|
| EXHIBITED_AT | source: artwork; target: institution, platform | source: practitioner; target: institution | source: artwork; target: institution, platform | 96.4% SOURCES.md, 3.6% SKILL.md/CLAUDE.md |
| CONTESTS | not documented | source: signal; target: edge; invitation | not documented | 100% invitation (0 edges) |

**Edge filtering for Sections A and B.** The conformance computation includes only curated edges (`created_by NOT LIKE 'embedding-%'`); auto-derived embedding edges (STYLE_KIN, VISUALLY_AFFINE) are reported separately in their own row, not folded into the per-edge-type conformance averages. This prevents the 1,168 disciplined embedding edges from dominating the numerator and masking issues in the smaller curated set.

CSV: `schema_audit_<date>/section_a_disagreements.csv` — one row per edge type with columns for each document's claim and the conformance breakdown.

### Section B: Per-document conformance

For each document, compute the % of edges that conform to that document's full contract (source type AND target type). Three numbers per edge type, plus a roll-up. Lets the reader see at a glance which document is most aligned with the data as-is.

CSV: `schema_audit_<date>/section_b_conformance.csv`.

### Section C: Genuine bugs

Seven sub-checks. Each produces its own list of Findings.

**C.1 — ID collisions.** Detect nodes whose name is too generic **and** whose edges suggest the node represents multiple distinct works.

The denylist of generic titles is pinned in `schema_contract.py` as:

```python
GENERIC_TITLE_DENYLIST = frozenset([
    "untitled", "untitled.", "untitled (no.1)", "untitled (no.2)",
    "sin título", "sans titre", "ohne titel", "senza titolo",
    "black hole", "numbers", "composition", "study", "no title",
    "1", "i", "n/a",
])
```

Matching: lowercase + strip punctuation; an exact match against the denylist plus the edge heuristic flags a candidate. The denylist is exhaustive; additions require a code commit (this is intentional — pinning the denylist keeps acceptance criterion #5's byte-identical re-run guarantee intact).

**Edge heuristic.** A node is flagged as a collision candidate if it has CREATED_BY edges to ≥ 2 practitioners AND those practitioners are NOT linked by a COLLABORATES_WITH edge between them. Report each candidate with the conflicting creator list and the source gatherer(s) that emitted each edge. Manual review required to confirm; the audit produces candidates, not verdicts.

**C.2 — Forked CREATED_BY without legitimate co-authorship.** Artworks with > 1 CREATED_BY edge where the creators are NOT linked by COLLABORATES_WITH. Sub-classify into: (a) platform/institution wrongly listed as creator (target type is not practitioner), (b) ID collisions (overlap with C.1 — cross-referenced), (c) other.

**C.3 — Era violations.** Restricted to artworks with a **structured** `metadata.year_start` integer field. The fallback regex on `metadata.full_profile.basic_info.active_years` strings is explicitly out of scope — too many natural-language variants ("late 1990s", "c. 1965", "1985–present") to parse deterministically. For artworks with `year_start < 2009` AND pointing at concepts whose slug matches `frozenset(["on-chain", "nft", "dao", "blockchain", "smart-contract", "tezos", "ethereum", "web3", "crypto"])`, emit a Finding. Whitelist exceptions live in `schema_contract.py` as `ERA_VIOLATION_WHITELIST: frozenset[tuple[str, str]]` (empty initially; curator-managed).

**Coverage transparency.** Strict mode means C.3 only audits artworks with a structured `year_start`. As of 2026-05-24, that's **183 of 728 artworks (25%)**; the remaining 545 are excluded. To make this gap visible in the report rather than buried, C.3 emits one **summary** Finding (`category: era_check_coverage`, severity `info`) at the start of its output with the structured fields `{covered: N, total: M, coverage_pct: P, excluded_with_year_raw: X, excluded_with_active_years_string: Y, excluded_no_year_info: Z}`. The previous per-artwork "era_check_skipped" sub-findings are replaced by this single summary — emitting 545 info-rows per run would dominate Section C without adding information.

**C.4 — Bi-temporal integrity.** Audits ALL edges including superseded ones (not just `valid_until IS NULL`); the goal is integrity of the history, not the current state. Checks: `valid_until < valid_from`; `invalidated_by` references an edge id that doesn't exist; supersession chains that loop; edges with `valid_until IS NOT NULL` but no `invalidated_by`.

**C.5 — Provenance broken.** Edges where `created_by` references a value that is neither a known gatherer name (matches `gatherer-*` or `embedding-*` pattern) nor a `contributor:*` id present in `contributors.json`. Also flag edges where `created_by` is null or empty. Also flag edges where `signal_id` is set but doesn't resolve to an entry in `signals.json`.

**C.6 — Self-loops.** Edges where `source_id == target_id`. Should always be zero.

**C.7 — Unknown edge types.** Edges with an `edge_type` that does not appear in `EDGE_CLAIMS`. The legacy `RELATED_TO` type from `seed.ts` is pre-listed in a `KNOWN_LEGACY_EDGE_TYPES` set in `schema_contract.py` so its appearance is reported with a specific "legacy-path leak" annotation rather than a generic "unknown" finding. Any other unknown edge type produces a generic finding.

CSV: one file per sub-check (`section_c_id_collisions.csv`, `section_c_forked_created_by.csv`, etc.). All CSVs share base columns `subject_id, subject_kind, severity, category` plus sub-check-specific columns documented in the implementation.

### Section D: Narrative-vs-edge mismatches (FULL tier only)

For each practitioner whose metadata contains `full_profile.network_position.scene_affiliation` (a free-text prose field):

1. Extract the actual BELONGS_TO and CLASSIFIED_BY edges from the graph for that practitioner.
2. Call the Anthropic API with a structured prompt: feed the prose + the edge list, ask for two outputs in JSON:
   - `claimed_but_unlinked`: scenes/platforms/institutions named in the prose but not present as edges
   - `linked_but_unclaimed`: edges present in the graph but contradicted by or absent from the prose
3. Record any non-empty result as a Finding.

**Model.** Pinned in `audit_schema.py` as a module-level `NARRATIVE_MODEL_ID` constant. Implementer must verify the model id is current at implementation time and amend if needed; recommended default is the project's standard Haiku id (the cheapest model adequate for a structured comparison task). Examples at time of writing: `claude-haiku-4-5`, `claude-3-5-haiku-latest`. The constant's value participates in the cache key (see below).

**Prompt.** Defined as a module-level `NARRATIVE_PROMPT_TEMPLATE` string constant. Versioned via a sibling `NARRATIVE_PROMPT_VERSION` integer constant (bumped manually whenever the prompt is meaningfully revised; the version participates in the cache key).

**Cache key.** Composite of the following, hashed with SHA-256 and stored at `seed/_build/.cache/narrative_audit.json`:

```python
cache_key = sha256(json.dumps([
    practitioner_id,
    sha256(prose_text.encode()).hexdigest(),
    sha256(canonical_edges_json(edges_for_practitioner)).hexdigest(),
    NARRATIVE_MODEL_ID,
    NARRATIVE_PROMPT_VERSION,
    CONTRACT_SCHEMA_VERSION,
]).encode()).hexdigest()
```

`canonical_edges_json` sorts edges by `(source_id, edge_type, target_id)`, includes only the fields `source_id, edge_type, target_id, created_by` (excludes bi-temporal and embedding-only fields), and uses `json.dumps(sort_keys=True)`. This means: any change to prose, edges, model, prompt, or contract structure invalidates the relevant cache entries automatically.

**Edge filtering for Section D.** The edges passed to the LLM are only the practitioner's BELONGS_TO and CLASSIFIED_BY edges with `valid_until IS NULL` (current state only — superseded edges and the embedding-derived STYLE_KIN/VISUALLY_AFFINE are excluded; they would only add noise to a narrative comparison).

**Cost / timing.** Expected per full run: ~$1-2 against 146 practitioners. Expected wall time: 3-5 minutes. If `ANTHROPIC_API_KEY` is not set, the full tier exits Section D with a warning and continues with the other sections, marking Section D in the report as "not run."

**CSV:** `section_d_narrative_mismatches.csv` — one row per finding, with columns `subject_id, subject_kind, severity, category, mismatch_type, claim_or_edge, llm_explanation, model_id, prompt_version`.

### Section E: Invitations honored

For each edge type documented as an invitation in any of the three documents (`is_invitation: True`), count edges and confirm the count matches expectation:

- `RESPONDS_TO`: expected 0 (per SOURCES.md line 318)
- `CONTESTS`: expected 0 (per SOURCES.md line 322)
- `TENSION_WITH`: expected 0 (per SOURCES.md line 322)
- `INFLUENCES`: expected sparse (per SOURCES.md line 320)

Also count nodes that are deliberately empty stubs and report the count as "invitations awaiting contribution." Stub-detection criterion: 0 in-degree AND 0 out-degree AND `status` (extracted from metadata; recall 513 nodes have metadata-as-string and need `json.loads` first) is in the pinned set `frozenset(["placeholder", "stub", "anchor", "draft", "bridge"])` OR the status field is missing. This set is drawn from CLAUDE.md's documented status vocabulary (`confirmed`, `bridge`, `draft`) plus values empirically observed in `docs/DATA_INVENTORY_2026_05_23.md` (`anchor`, `placeholder`, `stub`). Pinned in `schema_contract.py` as `INVITATION_STATUS_SET`. This count is informational, not a bug.

Section E exists primarily to confirm the audit is respecting the project's "two readings" philosophy — if these counts ever look wrong (e.g. RESPONDS_TO is suddenly non-zero from a gatherer), the audit surfaces it.

CSV: `section_e_invitations.csv`.

### Report rendering

The markdown report has a fixed structure:

```markdown
# A(DAI) Schema Audit — 2026-05-24 (FAST)

Generated: 2026-05-24 14:32:11 UTC
Graph snapshot: 1,491 nodes, 4,544 edges (from local seed files)
Schema contract: docs/superpowers/specs/2026-05-24-schema-audit-design.md

## Headline counts

| Section | Findings | Severity |
|---|---:|---|
| A. Schema disagreements | 5 | warning |
| B. Per-document conformance | (table below) | info |
| C. Genuine bugs | 91 | bug |
|   C.1 ID collisions | 2 | bug |
|   C.2 Forked CREATED_BY | 6 | bug |
|   ... etc

## Section A: Schema disagreements
[full table per edge type]

## Section B: Per-document conformance
[full table]

## Section C: Genuine bugs
[per-sub-check sections with example rows and CSV links]

## Section D: Narrative-vs-edge mismatches
[FAST tier: "not run in this tier"; FULL tier: full results]

## Section E: Invitations honored
[confirmation table]

## Reproducing this audit
[npm command]
```

CSVs sit in a sibling directory: `docs/schema_audit_2026-05-24/section_a_disagreements.csv` etc.

---

## Error handling

| Situation | Behavior |
|---|---|
| `seed/nodes.json` or `seed/edges.json` missing | Exit code 1, error message naming the missing file |
| `seed/nodes.json` or `seed/edges.json` malformed (JSON parse error) | Exit code 1, error message with file + parse error location |
| `seed/contributors.json` missing or malformed | **Continue, treat as empty dict, log warning to stderr, mark C.5 in report as "ran without contributor registry — unknown_contributor and dangling_signal_id checks degraded"** |
| `seed/signals.json` missing or malformed | **Same as above — continue, treat as empty dict, log warning, mark C.5 signal-id checks degraded** |
| `schema_contract.py` import fails | Exit code 1, error message |
| `--live` mode and production API unreachable | Exit code 1, error message with the HTTP failure |
| FULL tier and `ANTHROPIC_API_KEY` not set | Continue, skip Section D with warning logged to stderr and recorded in report |
| FULL tier and LLM call fails for a specific practitioner | Log warning, continue with next practitioner, mark that practitioner's row in Section D as "incomplete" |
| Report path collision (same date already exists) | Add `-2`, `-3` suffix to filename |

The audit must run end-to-end even if some checks produce zero findings or degraded inputs. Hard-fail is reserved for situations where the audit literally cannot proceed (nodes/edges missing, contract import broken, live API unreachable in --live mode). Missing-but-non-essential inputs (contributors, signals, API key) degrade specific checks with explicit warnings — consistent with the "partial failures don't abort" philosophy.

---

## Testing

**Primary strategy — per-function unit tests on `Finding` lists.** Each `check_*` function is unit-tested against a minimal in-memory fixture (a dict of nodes and a list of edges constructed in the test file itself). The test asserts that the returned `list[Finding]` has the expected length, categories, and `subject_id` set. This is the dominant strategy because it's robust to rendering changes — adding a column to a CSV or rewording a section header doesn't break the bug-detection tests.

**Secondary strategy — golden-file smoke test for end-to-end rendering.** A single fixture at `seed/_build/tests/fixtures/schema_audit/` (`nodes_fixture.json` + `edges_fixture.json`) covers at least one example per finding category. The test runs the audit against the fixture (with `--out-dir` pointed at a temp directory) and compares against `expected_report.md` + `expected_csvs/`. Before comparison, both expected and actual are passed through a `normalize_output()` helper that:

1. Strips the report header timestamp (regex on the `Generated:` line).
2. Sorts Findings within each section by `(category, subject_id)`.
3. Normalises CSV row order by sorting on `subject_id` (column order is fixed by the CSV writer).
4. Normalises line endings to `\n`.

`EDGE_CLAIMS` dict iteration order is explicitly relied on (Python 3.7+ guarantees insertion order) — the test fixture for `expected_report.md` matches the order edge types are declared in `schema_contract.py`.

The golden-file test fails loudly on substantive output changes (intentional — forces the implementer to update the fixture when they change rendering) but doesn't fail on whitespace, timestamps, or ordering noise.

Tests must run in under 30 seconds total (no network, no LLM calls). The FULL tier's LLM logic is tested separately with a mocked `anthropic.Anthropic` client that returns canned responses; cache-key correctness is asserted by verifying the mock is called exactly once per unique key and zero times for repeated keys.

---

## Dependencies

| Dependency | Where it comes from | Why |
|---|---|---|
| Python 3.10+ | `seed/_build/.venv/` | Already present in pipeline |
| `pytest` | venv install | Tests only |
| `anthropic` Python SDK | venv install | FULL tier only |
| `requests` | venv install | `--live` mode and LLM calls |

No new system-level dependencies. Adds two pip packages to `seed/_build/requirements.txt` if not already present.

The audit deliberately does not depend on the running Node server or the live database; it reads seed files (or, optionally, the public API). This keeps it usable as an offline diagnostic.

---

## Acceptance criteria

The audit tool is considered complete and ready for use when:

1. `npm run audit:schema:fast` completes in under 30 seconds against the current seed and produces a valid markdown report at `docs/SCHEMA_AUDIT_<today>.md` plus a populated CSV directory at `docs/schema_audit_<today>/`.
2. `npm run audit:schema:full` completes in under 10 minutes, costs under $5 in Anthropic API usage (rough budget), and produces a report whose Section D is non-empty (the Sofia Crespo case should appear).
3. The fast tier produces Findings in at least Sections A, C, E (Section B always populated). Findings in Section C include the known cases from `docs/ENRICHMENT_AUDIT_2026_05_20.md` (the 78 enrichment edges should be visible as forked-CREATED_BY, era-violation, or unknown-edge-type findings depending on shape).
4. `pytest seed/_build/tests/test_audit_schema.py` passes.
5. Re-running the audit twice in succession produces byte-identical output (modulo timestamps in the report header), confirming determinism.
6. The audit produces zero findings in Section E.invitations of category "violated" (i.e. confirms the graph still respects the RESPONDS_TO=0, CONTESTS=0, TENSION_WITH=0 design).
7. `schema_contract.py` documents all 14 entries — 9 curated edge types (SKILL.md / CLAUDE.md), 2 auto-derived embedding edges (CLAUDE.md), 3 invitation edges (SOURCES.md) — with a non-empty `ref` field on every `EdgeClaim` instance. Entries where a document omits the edge type record `None` (not an empty `EdgeClaim`).

---

## Cadence and how it runs

- **Local dev:** Irina or any contributor runs `npm run audit:schema:fast` whenever they want a fresh report. Free, fast, no external dependencies.
- **Pre-deploy (recommended, not enforced):** the fast tier runs locally before each `flyctl deploy`. Findings are reviewed informally.
- **Pre-launch / pre-v2:** the full tier runs once and the report is committed to git as the authoritative v1 diagnostic.
- **Post-v2:** the audit runs against the v2 seed as the gating diagnostic before v2 ships.

The audit is not wired into CI in v1. CI integration is a deliberate later decision once the report format is stable.

---

## Out of scope (explicit reminders)

- Fixing any of the findings
- Designing the v2 reseed
- Building write-time enforcement in `/api/v1/edges` or the gatherer pipeline
- Reconciling the three schema documents into a single authoritative `SCHEMA_CONTRACT.md`
- Adding a `--fix` flag or any modification capability
- Re-classifying the seed-research-2025 narrative prose
- Anything in `docs/LAUNCH_CLEANUP_BRIEF.md` that depends on cleanup actions

The audit is a pure read tool. Its output drives later decisions but commits to none of them.

---

## Open questions (none blocking)

None. The design has been brainstormed end-to-end with the project owner (Irina) and all design decisions are committed. If new questions emerge during implementation, they should be surfaced in the implementation plan rather than this spec.
