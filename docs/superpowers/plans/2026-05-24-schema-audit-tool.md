# Schema Audit Tool Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-tier Python audit tool that catalogs schema-related issues in the A(DAI) knowledge graph (1,491 nodes, 4,544 edges) and produces a reproducible markdown + CSV report. The tool reports only; it does not modify data.

**Architecture:** Two Python files in `seed/_build/` sitting next to the existing offline gatherer pipeline: `schema_contract.py` (data-only — `EDGE_CLAIMS` constants + pinned denylists) and `audit_schema.py` (single-file script with per-section `check_*` functions, CSV/markdown rendering, and CLI). Two npm script wrappers (`audit:schema:fast` / `audit:schema:full`) invoke the script via the existing `seed/_build/.venv/`. Tests use pytest with per-function unit tests as primary and a single golden-file smoke test (with normalisation) as secondary.

**Tech Stack:** Python 3.10+, pytest, anthropic SDK (FULL tier only), requests (--live mode only). No new system dependencies. No Node/TypeScript changes other than the two npm script entries.

**Spec:** [`docs/superpowers/specs/2026-05-24-schema-audit-design.md`](../specs/2026-05-24-schema-audit-design.md) — read before starting; this plan operationalises it.

**Branching note:** The author of this plan recommends working on a dedicated branch (e.g. `feat/schema-audit-tool`) since the changes span multiple files. Brainstorming did not create a worktree; the developer executing this plan may create one with @using-git-worktrees if preferred. The audit is read-only and does not modify graph data, so the risk profile is low — branch-or-worktree is preference, not requirement.

**Commit convention:** Use Conventional Commits — `feat:`, `test:`, `chore:`, `docs:`. End every commit message with the Co-Authored-By footer per the repo convention. Do NOT push to remote without explicit user approval.

---

## Chunk 1: Bootstrap

Sets up the file skeleton, dependencies, and the data-only `schema_contract.py` module with all 14 `EDGE_CLAIMS` entries populated. After this chunk: imports work, structural tests pass, no audit logic exists yet.

### Task 1: Add Python deps and create the file skeleton

**Files:**
- Modify: `seed/_build/requirements.txt` (add `pytest`, `anthropic`)
- Create: `seed/_build/schema_contract.py` (empty stub)
- Create: `seed/_build/audit_schema.py` (empty stub with `if __name__ == "__main__": pass`)
- Create: `seed/_build/tests/__init__.py` (empty)

- [ ] **Step 1: Inspect existing requirements.txt to see what's already declared**

Run:
```bash
cat seed/_build/requirements.txt
```
Expected: see existing deps (likely `requests`, possibly more). Note whether `pytest` and `anthropic` are already present.

- [ ] **Step 2: Add missing deps**

Append the following lines to `seed/_build/requirements.txt` IF they are not already present:

```
pytest>=8.0
anthropic>=0.40
```

`requests` should already be present (used by existing gatherers). Do not re-pin if a different version is already declared — leave the existing pin.

- [ ] **Step 3: Install into the existing venv**

Run:
```bash
seed/_build/.venv/bin/pip install -r seed/_build/requirements.txt
```
Expected: pip resolves deps, prints "Successfully installed pytest-X.Y.Z anthropic-X.Y.Z ..." or "Requirement already satisfied" if pre-existing.

- [ ] **Step 4: Create the empty file skeleton**

Run:
```bash
mkdir -p seed/_build/tests/fixtures/schema_audit/expected_csvs
touch seed/_build/tests/__init__.py
```

Create `seed/_build/schema_contract.py` with content:

```python
"""Machine-readable expression of each schema document's claims.

Companion to seed/_build/audit_schema.py. See
docs/superpowers/specs/2026-05-24-schema-audit-design.md
for the design rationale.
"""
```

Create `seed/_build/audit_schema.py` with content:

```python
"""A(DAI) schema audit — catalogs schema-related issues in the graph.

See docs/superpowers/specs/2026-05-24-schema-audit-design.md.
"""

if __name__ == "__main__":
    raise SystemExit("audit_schema.py not yet implemented")
```

- [ ] **Step 5: Verify the venv can import both stubs**

Run:
```bash
seed/_build/.venv/bin/python3 -c "import sys; sys.path.insert(0, 'seed/_build'); import schema_contract, audit_schema; print('ok')"
```
Expected: prints `ok`.

- [ ] **Step 6: Commit**

```bash
git add seed/_build/requirements.txt seed/_build/schema_contract.py seed/_build/audit_schema.py seed/_build/tests/__init__.py
git commit -m "chore: scaffold seed/_build/schema_contract.py and audit_schema.py

Empty stubs + pytest/anthropic deps. Per spec docs/superpowers/specs/2026-05-24-schema-audit-design.md.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 2: Add npm script wrappers

**Files:**
- Modify: `package.json` (add two entries under `scripts`)

- [ ] **Step 1: Inspect existing scripts**

Run:
```bash
jq '.scripts' package.json
```
Expected: see existing npm scripts (likely `dev`, `seed`, `seed:consolidated`, etc.).

- [ ] **Step 2: Add the two audit scripts**

Edit `package.json`. Inside the `"scripts"` object, add:

```json
"audit:schema:fast": "seed/_build/.venv/bin/python3 seed/_build/audit_schema.py --tier fast",
"audit:schema:full": "seed/_build/.venv/bin/python3 seed/_build/audit_schema.py --tier full"
```

Maintain alphabetical ordering of script keys if the existing file is alphabetised; otherwise add at the end.

- [ ] **Step 3: Verify npm sees them**

Run:
```bash
npm run audit:schema:fast 2>&1 | head -5
```
Expected: invokes the python stub which raises `SystemExit("audit_schema.py not yet implemented")`. The npm wrapper exits non-zero. That's correct for this stage.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "feat: add audit:schema:fast and audit:schema:full npm scripts

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 3: Populate schema_contract.py with all 14 EDGE_CLAIMS entries + pinned constants

**Files:**
- Modify: `seed/_build/schema_contract.py` (replace the stub with full content)
- Reference (read-only): `SKILL.md`, `seed/SOURCES.md`, `CLAUDE.md`

- [ ] **Step 1: Read each document and extract the per-edge-type claims**

Open all three files. For each of the 14 edge types listed in the spec (CREATED_BY, EMBODIES, PRACTICES, USES_TECHNIQUE, BELONGS_TO, EXHIBITED_AT, CLASSIFIED_BY, COLLABORATES_WITH, INFLUENCES, RESPONDS_TO, CONTESTS, TENSION_WITH, STYLE_KIN, VISUALLY_AFFINE), record what each document says — source types, target types, whether it's an invitation, the line/section reference. **If a document does not document an edge type, the value is `None` (not an empty `EdgeClaim`).**

Use these as starting references:
- SKILL.md edge table: §1.4 (the "Direction" table)
- SOURCES.md edge table: around line 296 ("Edge structure and design rationale" / "What the seed produces honestly")
- SOURCES.md invitation edges: lines 20-24, 318-322 (RESPONDS_TO, CONTESTS, TENSION_WITH)
- CLAUDE.md edge type paragraph: in the "Database" section

The spec already shows worked examples for EXHIBITED_AT, RESPONDS_TO, and CONTESTS — copy those verbatim into the file as the starting point.

- [ ] **Step 2: Write the full module**

Replace `seed/_build/schema_contract.py` with:

```python
"""Machine-readable expression of each schema document's claims.

Companion to seed/_build/audit_schema.py.
See docs/superpowers/specs/2026-05-24-schema-audit-design.md.

CONTRACT_SCHEMA_VERSION participates in the Section D LLM cache key.
Bump it when the structure of EDGE_CLAIMS or any pinned constant changes,
to invalidate cached LLM results.
"""
from dataclasses import dataclass
from typing import Optional, List, Dict, FrozenSet, Tuple

CONTRACT_SCHEMA_VERSION = "1.0"


@dataclass(frozen=True)
class EdgeClaim:
    source_types: Tuple[str, ...]
    target_types: Tuple[str, ...]
    is_invitation: bool = False
    description: str = ""
    ref: str = ""


EDGE_CLAIMS: Dict[str, Dict[str, Optional[EdgeClaim]]] = {
    "EXHIBITED_AT": {
        "skill_md": EdgeClaim(
            source_types=("artwork",),
            target_types=("institution", "platform"),
            description="A specific artwork was shown at a specific institution/platform.",
            ref="SKILL.md §1.4 edge table",
        ),
        "sources_md": EdgeClaim(
            source_types=("practitioner",),
            target_types=("institution",),
            description="Where a practitioner has shown work (practitioner-level CV).",
            ref="SOURCES.md line 296 edge structure table",
        ),
        "claude_md": EdgeClaim(
            source_types=("artwork",),
            target_types=("institution", "platform"),
            description="A specific artwork was shown at a specific institution/platform.",
            ref="CLAUDE.md edge-type paragraph",
        ),
    },
    "RESPONDS_TO": {
        "skill_md": EdgeClaim(
            source_types=("artwork",), target_types=("artwork",),
            is_invitation=True,
            description="This work references or responds to that one. Requires attested artist intent.",
            ref="SKILL.md §1.4 'don't infer' rule",
        ),
        "sources_md": EdgeClaim(
            source_types=("artwork",), target_types=("artwork",),
            is_invitation=True,
            description="Reserved for practitioner voice; zero by design.",
            ref="SOURCES.md line 20, line 318",
        ),
        "claude_md": EdgeClaim(
            source_types=("artwork",), target_types=("artwork",),
            is_invitation=True,
            description="Empty by design; pipeline refuses to auto-emit.",
            ref="CLAUDE.md edge-types paragraph + 'pipeline refuses' clause",
        ),
    },
    "CONTESTS": {
        "skill_md": None,
        "sources_md": EdgeClaim(
            source_types=("signal",), target_types=("edge",),
            is_invitation=True,
            description="Practitioner contestation of an existing edge. Reserved for the second reading.",
            ref="SOURCES.md line 20, line 322",
        ),
        "claude_md": None,
    },
    # === Implementer: populate the remaining 11 entries from the three documents.
    # The pattern is the same. Read each document literally. If a document does
    # not document an edge type, use None (NOT an empty EdgeClaim).
    "CREATED_BY":         { "skill_md": ..., "sources_md": ..., "claude_md": ... },
    "EMBODIES":           { "skill_md": ..., "sources_md": ..., "claude_md": ... },
    "PRACTICES":          { "skill_md": ..., "sources_md": ..., "claude_md": ... },
    "USES_TECHNIQUE":     { "skill_md": ..., "sources_md": ..., "claude_md": ... },
    "BELONGS_TO":         { "skill_md": ..., "sources_md": ..., "claude_md": ... },
    "CLASSIFIED_BY":      { "skill_md": ..., "sources_md": ..., "claude_md": ... },
    "COLLABORATES_WITH":  { "skill_md": ..., "sources_md": ..., "claude_md": ... },
    "INFLUENCES":         { "skill_md": ..., "sources_md": ..., "claude_md": ... },
    "TENSION_WITH":       { "skill_md": ..., "sources_md": ..., "claude_md": ... },
    "STYLE_KIN":          { "skill_md": ..., "sources_md": ..., "claude_md": ... },
    "VISUALLY_AFFINE":    { "skill_md": ..., "sources_md": ..., "claude_md": ... },
}


# Pinned constants — additions/edits require a code commit.
# See spec §C.1 — pinning these keeps acceptance criterion #5 (byte-identical re-runs) intact.

GENERIC_TITLE_DENYLIST: FrozenSet[str] = frozenset([
    "untitled", "untitled.", "untitled (no.1)", "untitled (no.2)",
    "sin título", "sans titre", "ohne titel", "senza titolo",
    "black hole", "numbers", "composition", "study", "no title",
    "1", "i", "n/a",
])

CRYPTO_ERA_SLUG_TOKENS: FrozenSet[str] = frozenset([
    "on-chain", "nft", "dao", "blockchain", "smart-contract",
    "tezos", "ethereum", "web3", "crypto",
])

ERA_VIOLATION_WHITELIST: FrozenSet[Tuple[str, str]] = frozenset([
    # (source_artwork_id, target_concept_id) pairs that are pre-2009
    # but legitimately crypto-related (curator-managed). Empty initially.
])

KNOWN_LEGACY_EDGE_TYPES: FrozenSet[str] = frozenset([
    "RELATED_TO",  # legacy seed.ts path; CLAUDE.md flags it
])

INVITATION_STATUS_SET: FrozenSet[str] = frozenset([
    "placeholder", "stub", "anchor", "draft", "bridge",
])

AUTOMATED_WRITER_PREFIXES: Tuple[str, ...] = ("gatherer-", "embedding-")
```

The `...` (Ellipsis) sentinels in the 11 remaining entries are intentional — they will cause the test in Task 4 to fail until they're filled in. This is TDD-correct.

- [ ] **Step 3: Fill in the 11 remaining entries**

Replace each `...` block with `EdgeClaim` instances (or `None` where a document omits the edge type). For each entry, the `ref` field must cite the exact line/section in that document. Refer to the worked examples for shape.

**Per-entry sub-checklist** (tick each as it lands; prevents accidentally skipping one):

- [ ] `CREATED_BY` populated
- [ ] `EMBODIES` populated
- [ ] `PRACTICES` populated
- [ ] `USES_TECHNIQUE` populated
- [ ] `BELONGS_TO` populated
- [ ] `CLASSIFIED_BY` populated
- [ ] `COLLABORATES_WITH` populated
- [ ] `INFLUENCES` populated
- [ ] `TENSION_WITH` populated (SOURCES.md only — other two are `None`)
- [ ] `STYLE_KIN` populated (CLAUDE.md only — other two are `None`)
- [ ] `VISUALLY_AFFINE` populated (CLAUDE.md only — other two are `None`)

Expected entry counts after this step:
- `EXHIBITED_AT`, `RESPONDS_TO` — all three documents document them (3 `EdgeClaim` instances each)
- `CONTESTS`, `TENSION_WITH` — only SOURCES.md documents them (2 `None` + 1 `EdgeClaim` each)
- `STYLE_KIN`, `VISUALLY_AFFINE` — only CLAUDE.md documents them (2 `None` + 1 `EdgeClaim` each)
- The 9 curated types — typically all three documents (3 `EdgeClaim` instances each), but verify literally

- [ ] **Step 4: Verify module imports cleanly**

Run:
```bash
seed/_build/.venv/bin/python3 -c "import sys; sys.path.insert(0, 'seed/_build'); from schema_contract import EDGE_CLAIMS, CONTRACT_SCHEMA_VERSION; print(len(EDGE_CLAIMS), CONTRACT_SCHEMA_VERSION)"
```
Expected: prints `14 1.0`.

- [ ] **Step 5: Commit**

```bash
git add seed/_build/schema_contract.py
git commit -m "feat: populate schema_contract.py with EDGE_CLAIMS and pinned constants

All 14 edge types from SKILL.md / SOURCES.md / CLAUDE.md.
Pinned denylists per spec §C.1 and §C.7.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 4: Structural tests for schema_contract.py

**Files:**
- Create: `seed/_build/tests/test_schema_contract.py`

- [ ] **Step 1: Write the failing tests**

Create `seed/_build/tests/test_schema_contract.py`:

```python
"""Structural tests for schema_contract.py.

These assert the shape of EDGE_CLAIMS without prescribing the per-edge content.
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from schema_contract import (
    EDGE_CLAIMS,
    EdgeClaim,
    CONTRACT_SCHEMA_VERSION,
    GENERIC_TITLE_DENYLIST,
    CRYPTO_ERA_SLUG_TOKENS,
    KNOWN_LEGACY_EDGE_TYPES,
    INVITATION_STATUS_SET,
    AUTOMATED_WRITER_PREFIXES,
)


EXPECTED_EDGE_TYPES = {
    "CREATED_BY", "EMBODIES", "PRACTICES", "USES_TECHNIQUE", "BELONGS_TO",
    "EXHIBITED_AT", "CLASSIFIED_BY", "COLLABORATES_WITH", "INFLUENCES",
    "RESPONDS_TO", "CONTESTS", "TENSION_WITH",
    "STYLE_KIN", "VISUALLY_AFFINE",
}
EXPECTED_DOCS = {"skill_md", "sources_md", "claude_md"}


def test_edge_claims_has_14_entries():
    """Spec acceptance criterion #7."""
    assert len(EDGE_CLAIMS) == 14, f"expected 14 entries, got {len(EDGE_CLAIMS)}"


def test_edge_claims_covers_expected_edge_types():
    assert set(EDGE_CLAIMS.keys()) == EXPECTED_EDGE_TYPES


def test_each_entry_has_three_document_keys():
    for edge_type, doc_map in EDGE_CLAIMS.items():
        assert set(doc_map.keys()) == EXPECTED_DOCS, (
            f"{edge_type} missing or has extra document keys: {set(doc_map.keys())}"
        )


def test_each_documented_claim_is_edgeclaim_or_none():
    for edge_type, doc_map in EDGE_CLAIMS.items():
        for doc_name, claim in doc_map.items():
            assert claim is None or isinstance(claim, EdgeClaim), (
                f"{edge_type}.{doc_name} must be EdgeClaim or None, got {type(claim)}"
            )


def test_at_least_one_document_per_edge_type():
    """Spec §C.7 — every edge type in EDGE_CLAIMS must be documented somewhere."""
    for edge_type, doc_map in EDGE_CLAIMS.items():
        if not any(v is not None for v in doc_map.values()):
            raise AssertionError(f"{edge_type} is in EDGE_CLAIMS but no document declares it")


def test_every_edgeclaim_has_non_empty_ref():
    """Spec acceptance criterion #7."""
    for edge_type, doc_map in EDGE_CLAIMS.items():
        for doc_name, claim in doc_map.items():
            if claim is not None:
                assert claim.ref.strip(), (
                    f"{edge_type}.{doc_name}.ref is empty — every EdgeClaim needs a citation"
                )


def test_no_ellipsis_sentinels_remain():
    """Catches the Task 3 'remaining 11 entries' placeholder if not filled in."""
    for edge_type, doc_map in EDGE_CLAIMS.items():
        for doc_name, claim in doc_map.items():
            assert claim is not Ellipsis, (
                f"{edge_type}.{doc_name} still has the Ellipsis sentinel from the implementation TODO"
            )


def test_invitation_edges_are_flagged():
    """RESPONDS_TO, CONTESTS, TENSION_WITH must have is_invitation=True wherever documented."""
    for edge_type in ("RESPONDS_TO", "CONTESTS", "TENSION_WITH"):
        for doc_name, claim in EDGE_CLAIMS[edge_type].items():
            if claim is not None:
                assert claim.is_invitation, (
                    f"{edge_type}.{doc_name}.is_invitation should be True (invitation edge per SOURCES.md)"
                )


def test_contract_schema_version_is_string():
    assert isinstance(CONTRACT_SCHEMA_VERSION, str)
    assert CONTRACT_SCHEMA_VERSION.strip()


def test_denylist_constants_are_frozensets():
    assert isinstance(GENERIC_TITLE_DENYLIST, frozenset)
    assert isinstance(CRYPTO_ERA_SLUG_TOKENS, frozenset)
    assert isinstance(KNOWN_LEGACY_EDGE_TYPES, frozenset)
    assert isinstance(INVITATION_STATUS_SET, frozenset)


def test_known_legacy_includes_related_to():
    """CLAUDE.md flags RELATED_TO specifically."""
    assert "RELATED_TO" in KNOWN_LEGACY_EDGE_TYPES


def test_automated_writer_prefixes_complete():
    assert "gatherer-" in AUTOMATED_WRITER_PREFIXES
    assert "embedding-" in AUTOMATED_WRITER_PREFIXES
```

- [ ] **Step 2: Run the tests**

Run:
```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_schema_contract.py -v
```
Expected: all 12 tests pass. If `test_no_ellipsis_sentinels_remain` or `test_every_edgeclaim_has_non_empty_ref` fails, the implementer has not finished Task 3 step 3 — go back and fill in the remaining entries.

- [ ] **Step 3: Commit**

```bash
git add seed/_build/tests/test_schema_contract.py
git commit -m "test: structural tests for schema_contract.py

Asserts EDGE_CLAIMS shape, ref citations, invitation flagging.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 2: Audit framework — Finding type, loaders, CLI skeleton

Builds the shared scaffolding the per-section checks depend on. After this chunk: `audit_schema.py` has a runnable CLI that parses args, loads graph data, but produces no findings yet.

### Task 5: Finding dataclass and shared types

**Files:**
- Modify: `seed/_build/audit_schema.py` (add module-level types)
- Create: `seed/_build/tests/test_finding.py`

- [ ] **Step 1: Write the failing test**

Create `seed/_build/tests/test_finding.py`:

```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import Finding, SEVERITY_INFO, SEVERITY_WARNING, SEVERITY_BUG


def test_finding_constructable():
    f = Finding(
        section="C",
        category="id_collision",
        severity=SEVERITY_BUG,
        subject_id="artwork:untitled",
        subject_kind="node",
        details={"creators": ["practitioner:a", "practitioner:b"]},
        suggested_fix="split into per-creator nodes",
    )
    assert f.section == "C"
    assert f.severity == "bug"
    assert f.details["creators"] == ["practitioner:a", "practitioner:b"]


def test_finding_severity_constants():
    assert SEVERITY_INFO == "info"
    assert SEVERITY_WARNING == "warning"
    assert SEVERITY_BUG == "bug"


def test_finding_subject_kind_validates():
    """subject_kind must be 'edge' or 'node'."""
    import pytest
    with pytest.raises(ValueError, match="subject_kind"):
        Finding(section="A", category="x", severity="info",
                subject_id="x", subject_kind="other", details={}, suggested_fix="")
```

- [ ] **Step 2: Run to verify failure**

Run:
```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_finding.py -v
```
Expected: ImportError or AttributeError on `Finding` / `SEVERITY_*`.

- [ ] **Step 3: Implement Finding in audit_schema.py**

Edit `seed/_build/audit_schema.py`. Replace the file content with:

```python
"""A(DAI) schema audit — catalogs schema-related issues in the graph.

See docs/superpowers/specs/2026-05-24-schema-audit-design.md.
"""
from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal

SEVERITY_INFO = "info"
SEVERITY_WARNING = "warning"
SEVERITY_BUG = "bug"

_VALID_SUBJECT_KINDS = frozenset({"edge", "node"})


@dataclass
class Finding:
    section: Literal["A", "B", "C", "D", "E"]
    category: str
    severity: str
    subject_id: str
    subject_kind: str
    details: Dict[str, Any] = field(default_factory=dict)
    suggested_fix: str = ""

    def __post_init__(self) -> None:
        if self.subject_kind not in _VALID_SUBJECT_KINDS:
            raise ValueError(
                f"subject_kind must be 'edge' or 'node', got {self.subject_kind!r}"
            )


if __name__ == "__main__":
    raise SystemExit("audit_schema.py not yet implemented")
```

- [ ] **Step 4: Re-run tests**

Run:
```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_finding.py -v
```
Expected: all 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add seed/_build/audit_schema.py seed/_build/tests/test_finding.py
git commit -m "feat: Finding dataclass + severity constants in audit_schema.py

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 6: load_graph (local seed files + --live mode)

**Files:**
- Modify: `seed/_build/audit_schema.py` (add `load_graph`, `_parse_metadata`)
- Create: `seed/_build/tests/test_loaders.py`

- [ ] **Step 1: Write the failing test**

Create `seed/_build/tests/test_loaders.py`:

```python
import json, sys, pathlib, tempfile

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import load_graph, _parse_metadata


def _write_temp_seed(tmpdir, nodes, edges, contributors=None, signals=None):
    """Helper — writes seed files into tmpdir and returns the dir path."""
    seed_dir = pathlib.Path(tmpdir) / "seed"
    seed_dir.mkdir()
    (seed_dir / "nodes.json").write_text(json.dumps(nodes))
    (seed_dir / "edges.json").write_text(json.dumps(edges))
    (seed_dir / "contributors.json").write_text(json.dumps(contributors or []))
    (seed_dir / "signals.json").write_text(json.dumps(signals or []))
    return seed_dir


def test_load_graph_reads_local_seed_files():
    with tempfile.TemporaryDirectory() as tmp:
        seed_dir = _write_temp_seed(
            tmp,
            nodes=[{"id": "practitioner:a", "type": "practitioner", "name": "A",
                    "slug": "a", "metadata": {"status": "confirmed"}}],
            edges=[{"id": "e1", "source_id": "practitioner:a", "target_id": "concept:x",
                    "edge_type": "PRACTICES", "created_by": "contributor:migration",
                    "valid_until": None}],
        )
        nodes_by_id, edges, contributors_by_id, signals_by_id = load_graph(seed_dir=seed_dir)
        assert "practitioner:a" in nodes_by_id
        assert len(edges) == 1
        assert edges[0]["edge_type"] == "PRACTICES"


def test_parse_metadata_handles_dict():
    node = {"metadata": {"status": "confirmed"}}
    assert _parse_metadata(node) == {"status": "confirmed"}


def test_parse_metadata_handles_string():
    """Spec §E mentions 513 nodes have metadata serialised as a JSON string."""
    node = {"metadata": '{"status": "confirmed"}'}
    assert _parse_metadata(node) == {"status": "confirmed"}


def test_parse_metadata_handles_none():
    node = {"metadata": None}
    assert _parse_metadata(node) == {}


def test_parse_metadata_handles_missing():
    node = {}
    assert _parse_metadata(node) == {}


def test_load_graph_missing_nodes_or_edges_hard_fails():
    """nodes.json or edges.json missing → audit can't run; FileNotFoundError."""
    import pytest
    with tempfile.TemporaryDirectory() as tmp:
        # Empty dir — nodes.json missing.
        with pytest.raises(FileNotFoundError):
            load_graph(seed_dir=pathlib.Path(tmp))


def test_load_graph_missing_contributors_warns_returns_empty(capsys):
    """contributors.json missing → degrade gracefully, return empty dict, warn to stderr.

    Per spec error-handling table: contributors/signals are non-essential — C.5
    can still run, just with degraded coverage of unknown_contributor / dangling_signal_id checks.
    """
    with tempfile.TemporaryDirectory() as tmp:
        seed_dir = pathlib.Path(tmp) / "seed"
        seed_dir.mkdir()
        (seed_dir / "nodes.json").write_text("[]")
        (seed_dir / "edges.json").write_text("[]")
        (seed_dir / "signals.json").write_text("[]")
        # contributors.json deliberately absent

        nodes_by_id, edges, contribs, signals = load_graph(seed_dir=seed_dir)
        assert contribs == {}  # degraded gracefully
        captured = capsys.readouterr()
        assert "contributors.json" in captured.err
        assert "warning" in captured.err.lower() or "warn" in captured.err.lower()


def test_load_graph_malformed_contributors_warns_returns_empty(capsys):
    """contributors.json present but malformed JSON → same degrade-with-warning behavior."""
    with tempfile.TemporaryDirectory() as tmp:
        seed_dir = pathlib.Path(tmp) / "seed"
        seed_dir.mkdir()
        (seed_dir / "nodes.json").write_text("[]")
        (seed_dir / "edges.json").write_text("[]")
        (seed_dir / "signals.json").write_text("[]")
        (seed_dir / "contributors.json").write_text("{not valid json")

        nodes_by_id, edges, contribs, signals = load_graph(seed_dir=seed_dir)
        assert contribs == {}
        captured = capsys.readouterr()
        assert "contributors.json" in captured.err


def test_load_graph_missing_signals_warns_returns_empty(capsys):
    """signals.json missing → same as contributors: degrade, warn, continue."""
    with tempfile.TemporaryDirectory() as tmp:
        seed_dir = pathlib.Path(tmp) / "seed"
        seed_dir.mkdir()
        (seed_dir / "nodes.json").write_text("[]")
        (seed_dir / "edges.json").write_text("[]")
        (seed_dir / "contributors.json").write_text("[]")
        # signals.json deliberately absent

        nodes_by_id, edges, contribs, signals = load_graph(seed_dir=seed_dir)
        assert signals == {}
        captured = capsys.readouterr()
        assert "signals.json" in captured.err
```

- [ ] **Step 2: Run to verify failure**

Run:
```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_loaders.py -v
```
Expected: ImportError on `load_graph` / `_parse_metadata`.

- [ ] **Step 3: Implement loaders**

Append to `seed/_build/audit_schema.py` (above the `if __name__` block):

```python
import json
import pathlib
import sys
from typing import Optional, Tuple


REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
DEFAULT_SEED_DIR = REPO_ROOT / "seed"
DEFAULT_API_URL = "https://adai-basel.fly.dev/api/graph?type=_all"


def _parse_metadata(node: dict) -> dict:
    """The seed has a bug where some metadata is stored as JSON string instead of dict.

    Spec §E mentions 513 affected nodes. This helper unwraps both forms.
    """
    raw = node.get("metadata")
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}
    return {}


def _load_optional_json_list(path: pathlib.Path, name: str) -> List[dict]:
    """Load a JSON-array seed file that's non-essential to the audit.

    Per spec error-handling: missing or malformed contributors/signals files
    should degrade with a stderr warning rather than hard-fail. The audit can
    still run, just with degraded C.5 coverage for the affected check.
    """
    if not path.exists():
        print(f"[audit] WARNING: {name} not found at {path} — "
              f"continuing with empty registry; C.5 checks degraded",
              file=sys.stderr)
        return []
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError as e:
        print(f"[audit] WARNING: {name} at {path} is malformed JSON ({e}) — "
              f"continuing with empty registry; C.5 checks degraded",
              file=sys.stderr)
        return []


def load_graph(
    seed_dir: Optional[pathlib.Path] = None,
    live_url: Optional[str] = None,
) -> Tuple[Dict[str, dict], List[dict], Dict[str, dict], Dict[str, dict]]:
    """Return (nodes_by_id, edges, contributors_by_id, signals_by_id).

    Hard-fail (FileNotFoundError) if nodes.json or edges.json missing — audit
    can't run without them. Soft-fail (warning + empty registry) for
    contributors.json and signals.json — C.5 checks degrade gracefully.

    If live_url is given, fetch nodes+edges from the live API and treat
    contributors/signals as empty (the public API does not expose them).
    """
    if live_url is not None:
        import requests  # local import — only required for --live
        resp = requests.get(live_url, timeout=30)
        resp.raise_for_status()
        payload = resp.json()
        nodes = payload.get("nodes", [])
        edges = payload.get("edges", [])
        contributors: List[dict] = []
        signals: List[dict] = []
    else:
        sd = seed_dir if seed_dir is not None else DEFAULT_SEED_DIR
        # Hard-fail for essential files
        nodes = json.loads((sd / "nodes.json").read_text())  # FileNotFoundError if missing
        edges = json.loads((sd / "edges.json").read_text())  # FileNotFoundError if missing
        # Soft-fail for non-essential files
        contributors = _load_optional_json_list(sd / "contributors.json", "contributors.json")
        signals = _load_optional_json_list(sd / "signals.json", "signals.json")

    nodes_by_id = {n["id"]: n for n in nodes}
    contributors_by_id = {c["id"]: c for c in contributors}
    signals_by_id = {s["id"]: s for s in signals}
    return nodes_by_id, edges, contributors_by_id, signals_by_id
```

- [ ] **Step 4: Re-run tests**

Run:
```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_loaders.py -v
```
Expected: all 9 tests pass (4 _parse_metadata + 1 load-graph happy-path + 4 degraded-input behaviors for missing/malformed contributors/signals).

- [ ] **Step 5: Sanity-check against the real seed**

Run:
```bash
seed/_build/.venv/bin/python3 -c "
import sys, pathlib
sys.path.insert(0, 'seed/_build')
from audit_schema import load_graph
nodes, edges, contribs, signals = load_graph()
print(f'nodes: {len(nodes)}, edges: {len(edges)}, contribs: {len(contribs)}, signals: {len(signals)}')
"
```
Expected: `nodes: 1491, edges: 3376, contribs: 12, signals: 14` (numbers as of 2026-05-24; may drift if seed changes).

- [ ] **Step 6: Commit**

```bash
git add seed/_build/audit_schema.py seed/_build/tests/test_loaders.py
git commit -m "feat: load_graph + _parse_metadata in audit_schema.py

Reads local seed/*.json by default; --live mode reads /api/graph.
nodes/edges missing → FileNotFoundError (hard fail; audit can't run).
contributors/signals missing or malformed → warn to stderr, return empty
(C.5 degrades gracefully per spec error-handling table).
Handles the metadata-as-string serialisation bug (spec §E).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 7: CLI skeleton with argparse

**Files:**
- Modify: `seed/_build/audit_schema.py` (add `main()`, argparse)

- [ ] **Step 1: Implement main**

Replace the `if __name__ == "__main__":` block in `seed/_build/audit_schema.py` with:

```python
import argparse
import sys


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="A(DAI) schema audit — catalog schema issues in the graph."
    )
    parser.add_argument("--tier", choices=["fast", "full"], default="fast",
                        help="fast = mechanical + heuristic; full = adds LLM narrative pass")
    parser.add_argument("--live", action="store_true",
                        help="Pull graph from production API instead of local seed files")
    parser.add_argument("--out-dir", default="docs",
                        help="Where to write the report and CSV directory (default: docs)")
    args = parser.parse_args(argv)

    print(f"[audit] tier={args.tier} live={args.live} out_dir={args.out_dir}",
          file=sys.stderr)
    try:
        nodes_by_id, edges, contributors_by_id, signals_by_id = load_graph(
            live_url=DEFAULT_API_URL if args.live else None,
        )
    except FileNotFoundError as e:
        print(f"[audit] ERROR: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"[audit] ERROR loading graph: {e}", file=sys.stderr)
        return 1

    print(f"[audit] loaded {len(nodes_by_id)} nodes, {len(edges)} edges",
          file=sys.stderr)

    # Findings pipeline lands in Chunks 3-8. For now this is a no-op.
    print("[audit] check_* pipeline not yet implemented — no findings produced.",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Verify CLI runs**

Run:
```bash
npm run audit:schema:fast 2>&1 | head -10
```
Expected stderr:
```
[audit] tier=fast live=False out_dir=docs
[audit] loaded 1491 nodes, 3376 edges
[audit] check_* pipeline not yet implemented — no findings produced.
```
Exit code 0.

- [ ] **Step 3: Verify --help works**

Run:
```bash
seed/_build/.venv/bin/python3 seed/_build/audit_schema.py --help
```
Expected: argparse-style help text listing `--tier`, `--live`, `--out-dir`.

- [ ] **Step 4: Commit**

```bash
git add seed/_build/audit_schema.py
git commit -m "feat: CLI skeleton for audit_schema.py

argparse with --tier / --live / --out-dir. Loads graph and exits.
No findings produced yet (per-section checks land in later chunks).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 3: Sections A and B — schema disagreements + per-document conformance

Implements the schema-comparison checks. After this chunk: the audit produces Findings for Sections A and B; rendering still missing.

### Task 8: check_schema_disagreements (Section A)

**Files:**
- Modify: `seed/_build/audit_schema.py` (add `check_schema_disagreements`)
- Create: `seed/_build/tests/test_section_a_disagreements.py`

- [ ] **Step 1: Write the failing test**

Create `seed/_build/tests/test_section_a_disagreements.py`:

```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import check_schema_disagreements, Finding
from schema_contract import EDGE_CLAIMS


def _curated_edges():
    """Build minimal curated-edge fixture excluding embedding-derived."""
    return [
        # EXHIBITED_AT — 9 practitioner-source, 1 artwork-source
        *[{"source_id": f"practitioner:p{i}", "target_id": "institution:moma",
           "edge_type": "EXHIBITED_AT", "created_by": "contributor:migration"} for i in range(9)],
        {"source_id": "artwork:a1", "target_id": "institution:moma",
         "edge_type": "EXHIBITED_AT", "created_by": "contributor:migration"},
    ]


def _nodes_by_id():
    by = {}
    for i in range(9):
        by[f"practitioner:p{i}"] = {"id": f"practitioner:p{i}", "type": "practitioner"}
    by["artwork:a1"] = {"id": "artwork:a1", "type": "artwork"}
    by["institution:moma"] = {"id": "institution:moma", "type": "institution"}
    return by


def test_produces_one_finding_per_edge_type_in_contract():
    findings = check_schema_disagreements(_nodes_by_id(), _curated_edges(), EDGE_CLAIMS)
    section_a_ids = {f.subject_id for f in findings if f.section == "A"}
    # one Finding per edge type — subject_id is the edge type name
    assert "EXHIBITED_AT" in section_a_ids
    assert len(section_a_ids) == len(EDGE_CLAIMS)


def test_exhibited_at_finding_records_per_document_conformance():
    findings = check_schema_disagreements(_nodes_by_id(), _curated_edges(), EDGE_CLAIMS)
    ea = next(f for f in findings if f.subject_id == "EXHIBITED_AT")
    # SOURCES.md says practitioner-source — 9 of 10 conform = 90%
    # SKILL.md and CLAUDE.md say artwork-source — 1 of 10 conform = 10%
    conformance = ea.details["conformance_pct"]
    assert conformance["sources_md"] == 90.0
    assert conformance["skill_md"] == 10.0
    assert conformance["claude_md"] == 10.0


def test_disagreement_severity():
    findings = check_schema_disagreements(_nodes_by_id(), _curated_edges(), EDGE_CLAIMS)
    ea = next(f for f in findings if f.subject_id == "EXHIBITED_AT")
    # documents disagree → severity is warning
    assert ea.severity == "warning"


def test_embedding_edges_excluded_from_conformance():
    """Spec — embedding-derived edges must not be counted in per-edge-type conformance."""
    edges = _curated_edges() + [
        {"source_id": "practitioner:p0", "target_id": "practitioner:p1",
         "edge_type": "EXHIBITED_AT", "created_by": "embedding-multimodal-v1"},
    ]
    findings = check_schema_disagreements(_nodes_by_id(), edges, EDGE_CLAIMS)
    ea = next(f for f in findings if f.subject_id == "EXHIBITED_AT")
    # the embedding edge must NOT bump the practitioner-source count to 10
    assert ea.details["edge_count"] == 10
```

- [ ] **Step 2: Run to verify failure**

Run:
```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_section_a_disagreements.py -v
```
Expected: ImportError on `check_schema_disagreements`.

- [ ] **Step 3: Implement check_schema_disagreements**

Append to `seed/_build/audit_schema.py`:

```python
from schema_contract import (
    EDGE_CLAIMS,
    AUTOMATED_WRITER_PREFIXES,
)


def _is_embedding_edge(edge: dict) -> bool:
    """Embedding-derived edges live in their own row, not folded into curated conformance."""
    cb = edge.get("created_by", "") or ""
    return cb.startswith("embedding-")


def check_schema_disagreements(
    nodes_by_id: Dict[str, dict],
    edges: List[dict],
    contract: Dict[str, Dict[str, Any]],
) -> List[Finding]:
    """Section A: for each edge type, compare source/target types across documents.

    Excludes embedding-derived edges from the conformance numerator.
    """
    findings: List[Finding] = []

    # Group curated edges by type
    curated = [e for e in edges if not _is_embedding_edge(e)]
    by_type: Dict[str, List[dict]] = {}
    for e in curated:
        by_type.setdefault(e["edge_type"], []).append(e)

    for edge_type, doc_map in contract.items():
        live_edges = by_type.get(edge_type, [])
        n = len(live_edges)

        # Documents disagree if non-None claims differ in source_types or target_types
        non_none = {d: c for d, c in doc_map.items() if c is not None}
        documents_disagree = False
        if len(non_none) > 1:
            first = next(iter(non_none.values()))
            for c in non_none.values():
                if c.source_types != first.source_types or c.target_types != first.target_types:
                    documents_disagree = True
                    break

        # Per-document conformance
        conformance_pct: Dict[str, Optional[float]] = {}
        for doc_name, claim in doc_map.items():
            if claim is None:
                conformance_pct[doc_name] = None
                continue
            if n == 0:
                conformance_pct[doc_name] = 100.0 if claim.is_invitation else None
                continue
            ok = sum(
                1 for e in live_edges
                if nodes_by_id.get(e["source_id"], {}).get("type") in claim.source_types
                and nodes_by_id.get(e["target_id"], {}).get("type") in claim.target_types
            )
            conformance_pct[doc_name] = round(100.0 * ok / n, 1)

        severity = SEVERITY_WARNING if documents_disagree else SEVERITY_INFO
        findings.append(Finding(
            section="A",
            category="schema_disagreement" if documents_disagree else "schema_agreement",
            severity=severity,
            subject_id=edge_type,
            subject_kind="edge",
            details={
                "edge_count": n,
                "documents_disagree": documents_disagree,
                "claims": {
                    doc_name: None if c is None else {
                        "source_types": list(c.source_types),
                        "target_types": list(c.target_types),
                        "is_invitation": c.is_invitation,
                        "ref": c.ref,
                    }
                    for doc_name, c in doc_map.items()
                },
                "conformance_pct": conformance_pct,
            },
        ))
    return findings
```

- [ ] **Step 4: Re-run tests**

Run:
```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_section_a_disagreements.py -v
```
Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add seed/_build/audit_schema.py seed/_build/tests/test_section_a_disagreements.py
git commit -m "feat: Section A check_schema_disagreements

Per-edge-type compare across SKILL/SOURCES/CLAUDE docs.
Excludes embedding-derived edges from conformance numerator.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 9: check_per_document_conformance (Section B)

**Files:**
- Modify: `seed/_build/audit_schema.py` (add `check_per_document_conformance`)
- Create: `seed/_build/tests/test_section_b_conformance.py`

- [ ] **Step 1: Write the failing test**

Create `seed/_build/tests/test_section_b_conformance.py`:

```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import check_per_document_conformance, Finding
from schema_contract import EDGE_CLAIMS


def test_returns_one_finding_per_document():
    findings = check_per_document_conformance(
        nodes_by_id={"practitioner:p1": {"type": "practitioner"},
                     "institution:moma": {"type": "institution"}},
        edges=[{"source_id": "practitioner:p1", "target_id": "institution:moma",
                "edge_type": "EXHIBITED_AT", "created_by": "contributor:migration"}],
        contract=EDGE_CLAIMS,
    )
    doc_names = {f.subject_id for f in findings if f.section == "B"}
    assert doc_names == {"skill_md", "sources_md", "claude_md"}


def test_overall_conformance_per_doc():
    """1 edge total, conforms to SOURCES (practitioner-source), not to SKILL/CLAUDE (artwork-source)."""
    findings = check_per_document_conformance(
        nodes_by_id={"practitioner:p1": {"type": "practitioner"},
                     "institution:moma": {"type": "institution"}},
        edges=[{"source_id": "practitioner:p1", "target_id": "institution:moma",
                "edge_type": "EXHIBITED_AT", "created_by": "contributor:migration"}],
        contract=EDGE_CLAIMS,
    )
    sources = next(f for f in findings if f.subject_id == "sources_md")
    skill = next(f for f in findings if f.subject_id == "skill_md")
    assert sources.details["conforming_edges"] == 1
    assert sources.details["total_curated_edges"] == 1
    assert sources.details["conformance_pct"] == 100.0
    assert skill.details["conforming_edges"] == 0
    assert skill.details["conformance_pct"] == 0.0
```

- [ ] **Step 2: Run to verify failure**

Run:
```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_section_b_conformance.py -v
```
Expected: ImportError on `check_per_document_conformance`.

- [ ] **Step 3: Implement**

Append to `seed/_build/audit_schema.py`:

```python
def check_per_document_conformance(
    nodes_by_id: Dict[str, dict],
    edges: List[dict],
    contract: Dict[str, Dict[str, Any]],
) -> List[Finding]:
    """Section B: roll-up of conformance per document across all curated edges.

    Excludes embedding-derived edges (their disciplined types are reported separately).
    Edges whose edge_type isn't in the contract at all are not counted in any
    document's denominator — they show up in Section C.7 instead.
    """
    findings: List[Finding] = []
    curated = [e for e in edges if not _is_embedding_edge(e) and e["edge_type"] in contract]
    total = len(curated)

    for doc_name in ("skill_md", "sources_md", "claude_md"):
        conforming = 0
        considered = 0
        for e in curated:
            claim = contract[e["edge_type"]].get(doc_name)
            if claim is None:
                # this document does not document this edge type; skip
                continue
            considered += 1
            src_type = nodes_by_id.get(e["source_id"], {}).get("type")
            tgt_type = nodes_by_id.get(e["target_id"], {}).get("type")
            if src_type in claim.source_types and tgt_type in claim.target_types:
                conforming += 1
        pct = round(100.0 * conforming / considered, 1) if considered else None
        findings.append(Finding(
            section="B",
            category="per_document_conformance",
            severity=SEVERITY_INFO,
            subject_id=doc_name,
            subject_kind="node",  # arbitrary — Section B subject is a document, not a graph object
            details={
                "total_curated_edges": total,
                "edges_considered": considered,
                "conforming_edges": conforming,
                "conformance_pct": pct,
            },
        ))
    return findings
```

- [ ] **Step 4: Re-run tests**

Run:
```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_section_b_conformance.py -v
```
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add seed/_build/audit_schema.py seed/_build/tests/test_section_b_conformance.py
git commit -m "feat: Section B check_per_document_conformance

Roll-up % per document; ignores edge types a document doesn't document.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 4: Section C bugs — sub-checks 1-4

Implements the first half of the genuine-bug detectors: ID collisions, forked CREATED_BY, era violations, bi-temporal integrity.

### Task 10: detect_id_collisions (C.1)

**Files:**
- Modify: `seed/_build/audit_schema.py`
- Create: `seed/_build/tests/test_c1_id_collisions.py`

- [ ] **Step 1: Write the failing test**

Create `seed/_build/tests/test_c1_id_collisions.py`:

```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import detect_id_collisions


def test_untitled_with_unrelated_creators_is_collision():
    nodes = {
        "artwork:untitled": {"id": "artwork:untitled", "type": "artwork", "name": "Untitled"},
        "practitioner:a": {"type": "practitioner"},
        "practitioner:b": {"type": "practitioner"},
    }
    edges = [
        {"source_id": "artwork:untitled", "target_id": "practitioner:a",
         "edge_type": "CREATED_BY", "created_by": "gatherer-x"},
        {"source_id": "artwork:untitled", "target_id": "practitioner:b",
         "edge_type": "CREATED_BY", "created_by": "gatherer-y"},
    ]
    findings = detect_id_collisions(nodes, edges)
    assert len(findings) == 1
    assert findings[0].subject_id == "artwork:untitled"
    assert findings[0].section == "C"
    assert findings[0].category == "id_collision"


def test_untitled_with_collaborators_is_not_collision():
    """Two creators who collaborate are legitimate co-authors, not a collision."""
    nodes = {
        "artwork:untitled": {"id": "artwork:untitled", "type": "artwork", "name": "Untitled"},
        "practitioner:a": {"type": "practitioner"},
        "practitioner:b": {"type": "practitioner"},
    }
    edges = [
        {"source_id": "artwork:untitled", "target_id": "practitioner:a",
         "edge_type": "CREATED_BY", "created_by": "gatherer-x"},
        {"source_id": "artwork:untitled", "target_id": "practitioner:b",
         "edge_type": "CREATED_BY", "created_by": "gatherer-x"},
        {"source_id": "practitioner:a", "target_id": "practitioner:b",
         "edge_type": "COLLABORATES_WITH", "created_by": "contributor:migration"},
    ]
    findings = detect_id_collisions(nodes, edges)
    assert findings == []


def test_non_generic_name_is_not_collision_candidate():
    nodes = {
        "artwork:fidenza": {"id": "artwork:fidenza", "type": "artwork", "name": "Fidenza"},
        "practitioner:a": {"type": "practitioner"},
        "practitioner:b": {"type": "practitioner"},
    }
    edges = [
        {"source_id": "artwork:fidenza", "target_id": "practitioner:a",
         "edge_type": "CREATED_BY", "created_by": "x"},
        {"source_id": "artwork:fidenza", "target_id": "practitioner:b",
         "edge_type": "CREATED_BY", "created_by": "y"},
    ]
    # "Fidenza" is not in the denylist — even with 2 creators, not C.1 (this is C.2)
    assert detect_id_collisions(nodes, edges) == []


def test_punctuation_and_case_normalised_against_denylist():
    nodes = {
        "artwork:untitled-punct": {"id": "artwork:untitled-punct", "type": "artwork",
                                   "name": "UNTITLED!"},
        "practitioner:a": {"type": "practitioner"},
        "practitioner:b": {"type": "practitioner"},
    }
    edges = [
        {"source_id": "artwork:untitled-punct", "target_id": "practitioner:a",
         "edge_type": "CREATED_BY", "created_by": "x"},
        {"source_id": "artwork:untitled-punct", "target_id": "practitioner:b",
         "edge_type": "CREATED_BY", "created_by": "y"},
    ]
    findings = detect_id_collisions(nodes, edges)
    assert len(findings) == 1
```

- [ ] **Step 2: Run to verify failure**

Run:
```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_c1_id_collisions.py -v
```
Expected: ImportError on `detect_id_collisions`.

- [ ] **Step 3: Implement**

Append to `seed/_build/audit_schema.py`:

```python
import re
import string
from schema_contract import GENERIC_TITLE_DENYLIST


_PUNCT_STRIP = str.maketrans("", "", string.punctuation)


def _normalise_title(name: str) -> str:
    """Lowercase + strip ASCII punctuation. Non-ASCII (e.g. é, ü) preserved."""
    return name.lower().translate(_PUNCT_STRIP).strip()


def detect_id_collisions(
    nodes_by_id: Dict[str, dict],
    edges: List[dict],
) -> List[Finding]:
    """C.1: nodes with generic names whose CREATED_BY edges suggest multiple distinct works."""
    findings: List[Finding] = []

    # Index CREATED_BY edges by source artwork
    creators_by_artwork: Dict[str, List[dict]] = {}
    for e in edges:
        if e["edge_type"] == "CREATED_BY":
            creators_by_artwork.setdefault(e["source_id"], []).append(e)

    # Index COLLABORATES_WITH (symmetric — store both directions)
    collab_pairs: set = set()
    for e in edges:
        if e["edge_type"] == "COLLABORATES_WITH":
            s, t = e["source_id"], e["target_id"]
            collab_pairs.add((s, t))
            collab_pairs.add((t, s))

    for artwork_id, creator_edges in creators_by_artwork.items():
        node = nodes_by_id.get(artwork_id)
        if not node or node.get("type") != "artwork":
            continue
        norm = _normalise_title(node.get("name", ""))
        if norm not in GENERIC_TITLE_DENYLIST:
            continue
        # Must have ≥ 2 distinct practitioner creators
        creator_ids = [
            e["target_id"] for e in creator_edges
            if nodes_by_id.get(e["target_id"], {}).get("type") == "practitioner"
        ]
        if len(set(creator_ids)) < 2:
            continue
        # If every pair of creators is in collab_pairs, it's legitimate co-authorship
        all_pairs_collaborate = all(
            (creator_ids[i], creator_ids[j]) in collab_pairs
            for i in range(len(creator_ids)) for j in range(i + 1, len(creator_ids))
        )
        if all_pairs_collaborate:
            continue
        findings.append(Finding(
            section="C", category="id_collision", severity=SEVERITY_BUG,
            subject_id=artwork_id, subject_kind="node",
            details={
                "name": node.get("name"),
                "creators": list(set(creator_ids)),
                "gatherers": sorted({e["created_by"] for e in creator_edges}),
            },
            suggested_fix="split into per-creator nodes with disambiguated ids",
        ))
    return findings
```

- [ ] **Step 4: Re-run tests**

Run:
```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_c1_id_collisions.py -v
```
Expected: 4 tests pass.

- [ ] **Step 5: Sanity-check against real seed**

Run:
```bash
seed/_build/.venv/bin/python3 -c "
import sys; sys.path.insert(0, 'seed/_build')
from audit_schema import load_graph, detect_id_collisions
nodes, edges, _, _ = load_graph()
findings = detect_id_collisions(nodes, edges)
for f in findings:
    print(f.subject_id, '→', f.details['creators'])
"
```
Expected: at least 1 finding for `artwork:untitled` (creators: vera molnar, american artist, harold cohen).

- [ ] **Step 6: Commit**

```bash
git add seed/_build/audit_schema.py seed/_build/tests/test_c1_id_collisions.py
git commit -m "feat: C.1 detect_id_collisions

Denylist + multi-creator-without-collab heuristic.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 11: detect_forked_created_by (C.2)

**Files:**
- Modify: `seed/_build/audit_schema.py`
- Create: `seed/_build/tests/test_c2_forked_created_by.py`

- [ ] **Step 1: Write the failing test**

Create `seed/_build/tests/test_c2_forked_created_by.py`:

```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import detect_forked_created_by


def test_legitimate_co_authorship_is_not_flagged():
    nodes = {
        "artwork:starmirror": {"type": "artwork", "name": "Starmirror"},
        "practitioner:hh": {"type": "practitioner"},
        "practitioner:md": {"type": "practitioner"},
    }
    edges = [
        {"source_id": "artwork:starmirror", "target_id": "practitioner:hh",
         "edge_type": "CREATED_BY", "created_by": "x"},
        {"source_id": "artwork:starmirror", "target_id": "practitioner:md",
         "edge_type": "CREATED_BY", "created_by": "x"},
        {"source_id": "practitioner:hh", "target_id": "practitioner:md",
         "edge_type": "COLLABORATES_WITH", "created_by": "contributor:migration"},
    ]
    assert detect_forked_created_by(nodes, edges) == []


def test_platform_as_creator_is_flagged_with_sub_a():
    nodes = {
        "artwork:fidenza": {"type": "artwork", "name": "Fidenza"},
        "platform:art blocks": {"type": "platform"},
        "practitioner:tyler": {"type": "practitioner"},
    }
    edges = [
        {"source_id": "artwork:fidenza", "target_id": "platform:art blocks",
         "edge_type": "CREATED_BY", "created_by": "contributor:migration"},
        {"source_id": "artwork:fidenza", "target_id": "practitioner:tyler",
         "edge_type": "CREATED_BY", "created_by": "contributor:migration"},
    ]
    findings = detect_forked_created_by(nodes, edges)
    assert len(findings) == 1
    assert findings[0].details["sub_class"] == "platform_or_institution_as_creator"


def test_two_unrelated_practitioners_is_flagged_sub_c():
    nodes = {
        "artwork:black hole": {"type": "artwork", "name": "Black Hole"},
        "practitioner:treister": {"type": "practitioner"},
        "practitioner:wagenknecht": {"type": "practitioner"},
    }
    edges = [
        {"source_id": "artwork:black hole", "target_id": "practitioner:treister",
         "edge_type": "CREATED_BY", "created_by": "x"},
        {"source_id": "artwork:black hole", "target_id": "practitioner:wagenknecht",
         "edge_type": "CREATED_BY", "created_by": "y"},
    ]
    findings = detect_forked_created_by(nodes, edges)
    assert len(findings) == 1
    # "Black Hole" is in the C.1 denylist too — sub-class should flag this overlap
    assert findings[0].details["sub_class"] in ("id_collision_overlap", "other")
```

- [ ] **Step 2: Run to verify failure, then implement**

Run pytest (expect ImportError), then append to `seed/_build/audit_schema.py`:

```python
def detect_forked_created_by(
    nodes_by_id: Dict[str, dict],
    edges: List[dict],
) -> List[Finding]:
    """C.2: artworks with > 1 CREATED_BY edge where creators are NOT collaborators.

    Sub-classes:
      (a) "platform_or_institution_as_creator": at least one target is not a practitioner
      (b) "id_collision_overlap": the artwork name is in GENERIC_TITLE_DENYLIST (also caught by C.1)
      (c) "other": forked but no obvious cause
    """
    findings: List[Finding] = []

    creators_by_artwork: Dict[str, List[dict]] = {}
    for e in edges:
        if e["edge_type"] == "CREATED_BY":
            creators_by_artwork.setdefault(e["source_id"], []).append(e)

    collab_pairs: set = set()
    for e in edges:
        if e["edge_type"] == "COLLABORATES_WITH":
            s, t = e["source_id"], e["target_id"]
            collab_pairs.add((s, t))
            collab_pairs.add((t, s))

    for artwork_id, creator_edges in creators_by_artwork.items():
        if len(creator_edges) < 2:
            continue
        target_ids = [e["target_id"] for e in creator_edges]
        # All-practitioner co-authorship?
        all_practitioner = all(
            nodes_by_id.get(t, {}).get("type") == "practitioner" for t in target_ids
        )
        if all_practitioner:
            all_pairs_collaborate = all(
                (target_ids[i], target_ids[j]) in collab_pairs
                for i in range(len(target_ids)) for j in range(i + 1, len(target_ids))
            )
            if all_pairs_collaborate:
                continue

        # Sub-class
        if not all_practitioner:
            sub_class = "platform_or_institution_as_creator"
        else:
            artwork_name = nodes_by_id.get(artwork_id, {}).get("name", "")
            if _normalise_title(artwork_name) in GENERIC_TITLE_DENYLIST:
                sub_class = "id_collision_overlap"
            else:
                sub_class = "other"

        findings.append(Finding(
            section="C", category="forked_created_by", severity=SEVERITY_BUG,
            subject_id=artwork_id, subject_kind="node",
            details={
                "sub_class": sub_class,
                "creators": target_ids,
                "creator_types": [nodes_by_id.get(t, {}).get("type") for t in target_ids],
                "gatherers": sorted({e["created_by"] for e in creator_edges}),
            },
            suggested_fix={
                "platform_or_institution_as_creator": "remap non-practitioner CREATED_BY to EXHIBITED_AT or PUBLISHED_ON",
                "id_collision_overlap": "split node — see Section C.1 finding for same id",
                "other": "manual review",
            }[sub_class],
        ))
    return findings
```

- [ ] **Step 3: Re-run tests**

Run:
```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_c2_forked_created_by.py -v
```
Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add seed/_build/audit_schema.py seed/_build/tests/test_c2_forked_created_by.py
git commit -m "feat: C.2 detect_forked_created_by with 3 sub-classes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 12: detect_era_violations (C.3)

**Files:**
- Modify: `seed/_build/audit_schema.py`
- Create: `seed/_build/tests/test_c3_era_violations.py`

- [ ] **Step 1: Write the failing test**

Create `seed/_build/tests/test_c3_era_violations.py`:

```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import detect_era_violations


def _nodes(year_start_for_a1=None, include_active_years=False):
    md = {}
    if year_start_for_a1 is not None:
        md["year_start"] = year_start_for_a1
    if include_active_years:
        md["full_profile"] = {"basic_info": {"active_years": "1968"}}
    return {
        "artwork:a1": {"id": "artwork:a1", "type": "artwork", "name": "X", "metadata": md},
        "concept:on-chain-generative-art": {"type": "concept", "slug": "on-chain-generative-art"},
        "concept:plotter-drawing": {"type": "concept", "slug": "plotter-drawing"},
    }


def _violations(findings):
    """Helper — filter out the era_check_coverage summary finding."""
    return [f for f in findings if f.category == "era_violation"]


def test_pre_2009_artwork_to_crypto_concept_is_flagged():
    edges = [
        {"source_id": "artwork:a1", "target_id": "concept:on-chain-generative-art",
         "edge_type": "EMBODIES", "created_by": "gatherer-enrichment"},
    ]
    findings = detect_era_violations(_nodes(year_start_for_a1=1968), edges)
    vs = _violations(findings)
    assert len(vs) == 1
    assert vs[0].section == "C"
    assert vs[0].category == "era_violation"


def test_pre_2009_artwork_to_non_crypto_concept_is_not_flagged():
    edges = [
        {"source_id": "artwork:a1", "target_id": "concept:plotter-drawing",
         "edge_type": "EMBODIES", "created_by": "gatherer-enrichment"},
    ]
    assert _violations(detect_era_violations(_nodes(year_start_for_a1=1968), edges)) == []


def test_post_2009_artwork_to_crypto_concept_is_not_flagged():
    edges = [
        {"source_id": "artwork:a1", "target_id": "concept:on-chain-generative-art",
         "edge_type": "EMBODIES", "created_by": "x"},
    ]
    assert _violations(detect_era_violations(_nodes(year_start_for_a1=2021), edges)) == []


def test_coverage_summary_finding_is_emitted():
    """Spec C.3 — emit one summary Finding reporting coverage %, not per-artwork skip rows."""
    # 1 artwork with year_start, 2 without
    nodes = {
        "artwork:has-year": {"id": "artwork:has-year", "type": "artwork", "name": "X",
                             "metadata": {"year_start": 1968}},
        "artwork:has-year-raw": {"id": "artwork:has-year-raw", "type": "artwork", "name": "Y",
                                 "metadata": {"year_raw": "c. 1970"}},
        "artwork:bare": {"id": "artwork:bare", "type": "artwork", "name": "Z",
                         "metadata": {}},
        "concept:on-chain-generative-art": {"type": "concept", "slug": "on-chain-generative-art"},
    }
    findings = detect_era_violations(nodes, [])
    summaries = [f for f in findings if f.category == "era_check_coverage"]
    assert len(summaries) == 1
    d = summaries[0].details
    assert d["total"] == 3
    assert d["covered"] == 1
    assert d["coverage_pct"] == 33.3
    assert d["excluded_with_year_raw"] == 1
    assert d["excluded_no_year_info"] == 1
    # Per-artwork "era_check_skipped" rows must NOT be emitted (replaced by summary)
    assert not any(f.category == "era_check_skipped" for f in findings)
```

- [ ] **Step 2: Implement after verifying failure**

Append to `seed/_build/audit_schema.py`:

```python
from schema_contract import (
    CRYPTO_ERA_SLUG_TOKENS,
    ERA_VIOLATION_WHITELIST,
)


def detect_era_violations(
    nodes_by_id: Dict[str, dict],
    edges: List[dict],
) -> List[Finding]:
    """C.3: pre-2009 artworks linked to crypto-era concepts.

    Strict: only checks artworks with a structured `metadata.year_start` int.
    Emits ONE summary Finding showing coverage % so the gap is visible in the
    report (we don't emit per-artwork skip rows — would dominate Section C
    without adding information).
    """
    findings: List[Finding] = []

    # Index concept slugs once
    concept_slugs = {nid: n.get("slug", "") for nid, n in nodes_by_id.items()
                     if n.get("type") == "concept"}

    # Classify artworks for the coverage summary
    total_artworks = 0
    covered = 0
    excluded_with_year_raw = 0
    excluded_with_active_years_string = 0
    excluded_no_year_info = 0
    for nid, n in nodes_by_id.items():
        if n.get("type") != "artwork":
            continue
        total_artworks += 1
        md = _parse_metadata(n)
        if isinstance(md.get("year_start"), int):
            covered += 1
        elif isinstance(md.get("year_raw"), str):
            excluded_with_year_raw += 1
        elif isinstance(md.get("full_profile", {}).get("basic_info", {}).get("active_years"), str):
            excluded_with_active_years_string += 1
        else:
            excluded_no_year_info += 1
    coverage_pct = round(100.0 * covered / total_artworks, 1) if total_artworks else 0.0

    findings.append(Finding(
        section="C", category="era_check_coverage", severity=SEVERITY_INFO,
        subject_id="(era_check_coverage)", subject_kind="node",
        details={
            "total": total_artworks,
            "covered": covered,
            "coverage_pct": coverage_pct,
            "excluded_with_year_raw": excluded_with_year_raw,
            "excluded_with_active_years_string": excluded_with_active_years_string,
            "excluded_no_year_info": excluded_no_year_info,
        },
        suggested_fix=(f"strict mode covers {covered} of {total_artworks} artworks ({coverage_pct}%); "
                       f"add metadata.year_start to remaining {total_artworks - covered} to expand"),
    ))

    # Walk edges and emit era_violation findings
    for e in edges:
        src_id = e["source_id"]
        tgt_id = e["target_id"]
        src = nodes_by_id.get(src_id, {})
        if src.get("type") != "artwork":
            continue
        if tgt_id not in concept_slugs:
            continue
        slug = concept_slugs[tgt_id]
        if not any(token in slug for token in CRYPTO_ERA_SLUG_TOKENS):
            continue
        if (src_id, tgt_id) in ERA_VIOLATION_WHITELIST:
            continue

        md = _parse_metadata(src)
        year_start = md.get("year_start")
        if not isinstance(year_start, int):
            continue  # captured in the coverage summary above
        if year_start >= 2009:
            continue

        findings.append(Finding(
            section="C", category="era_violation", severity=SEVERITY_BUG,
            subject_id=f"{src_id}--{e['edge_type']}--{tgt_id}",
            subject_kind="edge",
            details={
                "artwork": src_id,
                "year_start": year_start,
                "concept": tgt_id,
                "concept_slug": slug,
                "edge_type": e["edge_type"],
                "created_by": e["created_by"],
            },
            suggested_fix="delete edge OR add to ERA_VIOLATION_WHITELIST if curator attests",
        ))

    return findings
```

- [ ] **Step 3: Run tests + commit**

```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_c3_era_violations.py -v
# expected: 4 pass

git add seed/_build/audit_schema.py seed/_build/tests/test_c3_era_violations.py
git commit -m "feat: C.3 detect_era_violations

Strict mode: requires structured metadata.year_start. Whitelist support.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 13: detect_bitemporal_integrity (C.4)

**Files:**
- Modify: `seed/_build/audit_schema.py`
- Create: `seed/_build/tests/test_c4_bitemporal.py`

- [ ] **Step 1: Write the failing test**

Create `seed/_build/tests/test_c4_bitemporal.py`:

```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import detect_bitemporal_integrity


def test_valid_until_before_valid_from_is_flagged():
    edges = [{
        "id": "e1", "source_id": "x", "target_id": "y", "edge_type": "EMBODIES",
        "valid_from": "2024-01-01", "valid_until": "2023-01-01",
        "invalidated_by": "e2", "created_by": "x",
    }, {
        "id": "e2", "source_id": "x", "target_id": "y", "edge_type": "EMBODIES",
        "valid_from": "2024-02-01", "valid_until": None, "created_by": "x",
    }]
    findings = detect_bitemporal_integrity(edges)
    inv = [f for f in findings if f.category == "valid_until_before_valid_from"]
    assert len(inv) == 1


def test_dangling_invalidated_by_is_flagged():
    edges = [{
        "id": "e1", "source_id": "x", "target_id": "y", "edge_type": "EMBODIES",
        "valid_from": "2024-01-01", "valid_until": "2024-06-01",
        "invalidated_by": "nonexistent", "created_by": "x",
    }]
    findings = detect_bitemporal_integrity(edges)
    dang = [f for f in findings if f.category == "dangling_invalidated_by"]
    assert len(dang) == 1


def test_superseded_without_invalidator_is_flagged():
    edges = [{
        "id": "e1", "source_id": "x", "target_id": "y", "edge_type": "EMBODIES",
        "valid_from": "2024-01-01", "valid_until": "2024-06-01",
        "invalidated_by": None, "created_by": "x",
    }]
    findings = detect_bitemporal_integrity(edges)
    orph = [f for f in findings if f.category == "superseded_without_invalidator"]
    assert len(orph) == 1


def test_clean_edges_produce_no_findings():
    edges = [{
        "id": "e1", "source_id": "x", "target_id": "y", "edge_type": "EMBODIES",
        "valid_from": "2024-01-01", "valid_until": None,
        "invalidated_by": None, "created_by": "x",
    }]
    assert detect_bitemporal_integrity(edges) == []


def test_supersession_loop_is_flagged():
    """e1 → invalidated_by → e2 → invalidated_by → e1 (cycle)."""
    edges = [
        {"id": "e1", "source_id": "x", "target_id": "y", "edge_type": "EMBODIES",
         "valid_from": "2024-01-01", "valid_until": "2024-06-01",
         "invalidated_by": "e2", "created_by": "z"},
        {"id": "e2", "source_id": "x", "target_id": "y", "edge_type": "EMBODIES",
         "valid_from": "2024-06-01", "valid_until": "2024-12-01",
         "invalidated_by": "e1", "created_by": "z"},
    ]
    findings = detect_bitemporal_integrity(edges)
    loops = [f for f in findings if f.category == "supersession_loop"]
    assert len(loops) >= 1
```

- [ ] **Step 2: Implement after verifying failure**

Append to `seed/_build/audit_schema.py`:

```python
def detect_bitemporal_integrity(edges: List[dict]) -> List[Finding]:
    """C.4: integrity of bi-temporal fields. Audits ALL edges including superseded.

    Categories:
      - valid_until_before_valid_from
      - dangling_invalidated_by (invalidated_by → nonexistent edge id)
      - superseded_without_invalidator (valid_until set but invalidated_by is null)
      - supersession_loop (chain of invalidated_by loops back to self)
    """
    findings: List[Finding] = []
    edge_ids = {e.get("id") for e in edges if e.get("id")}

    for e in edges:
        eid = e.get("id", "<no-id>")
        vf = e.get("valid_from")
        vu = e.get("valid_until")
        invby = e.get("invalidated_by")

        if vu is not None and vf is not None and vu < vf:
            findings.append(Finding(
                section="C", category="valid_until_before_valid_from", severity=SEVERITY_BUG,
                subject_id=eid, subject_kind="edge",
                details={"valid_from": vf, "valid_until": vu},
                suggested_fix="repair valid_from or valid_until — temporal range invalid",
            ))

        if invby and invby not in edge_ids:
            findings.append(Finding(
                section="C", category="dangling_invalidated_by", severity=SEVERITY_BUG,
                subject_id=eid, subject_kind="edge",
                details={"invalidated_by": invby},
                suggested_fix="invalidated_by must reference an existing edge id",
            ))

        if vu is not None and not invby:
            findings.append(Finding(
                section="C", category="superseded_without_invalidator", severity=SEVERITY_BUG,
                subject_id=eid, subject_kind="edge",
                details={"valid_until": vu},
                suggested_fix="set invalidated_by to the successor edge id, or null out valid_until",
            ))

    # Detect supersession loops: follow invalidated_by from each edge,
    # raise if we revisit the start.
    invalidator_map = {e.get("id"): e.get("invalidated_by") for e in edges if e.get("id")}
    for start, _ in invalidator_map.items():
        seen = set()
        cur = invalidator_map.get(start)
        steps = 0
        while cur and cur in invalidator_map and steps < 100:
            if cur == start:
                findings.append(Finding(
                    section="C", category="supersession_loop", severity=SEVERITY_BUG,
                    subject_id=start, subject_kind="edge",
                    details={"loop_through": sorted(seen)},
                    suggested_fix="break the cycle in invalidated_by chain",
                ))
                break
            if cur in seen:
                break
            seen.add(cur)
            cur = invalidator_map.get(cur)
            steps += 1
    return findings
```

- [ ] **Step 3: Run tests + commit**

```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_c4_bitemporal.py -v
# expected: 5 pass

git add seed/_build/audit_schema.py seed/_build/tests/test_c4_bitemporal.py
git commit -m "feat: C.4 detect_bitemporal_integrity

Four categories: temporal-range invalid, dangling invalidator, superseded
without invalidator, supersession loop.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 5: Section C bugs — sub-checks 5-7

Provenance integrity, self-loops, unknown edge types. Completes Section C.

### Task 14: detect_provenance_broken (C.5)

**Files:**
- Modify: `seed/_build/audit_schema.py`
- Create: `seed/_build/tests/test_c5_provenance.py`

- [ ] **Step 1: Write the failing test**

Create `seed/_build/tests/test_c5_provenance.py`:

```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import detect_provenance_broken


def _ctx(contribs=None, signals=None):
    return (contribs or {"contributor:migration": {"id": "contributor:migration"}},
            signals or {})


def test_known_gatherer_is_ok():
    edges = [{"id": "e1", "created_by": "gatherer-objkt-tags-v3", "signal_id": None}]
    assert detect_provenance_broken(edges, *_ctx()) == []


def test_known_embedding_is_ok():
    edges = [{"id": "e1", "created_by": "embedding-multimodal-v1", "signal_id": None}]
    assert detect_provenance_broken(edges, *_ctx()) == []


def test_known_contributor_is_ok():
    edges = [{"id": "e1", "created_by": "contributor:migration", "signal_id": None}]
    assert detect_provenance_broken(edges, *_ctx()) == []


def test_unknown_contributor_is_flagged():
    edges = [{"id": "e1", "created_by": "contributor:ghost", "signal_id": None}]
    findings = detect_provenance_broken(edges, *_ctx())
    assert len(findings) == 1
    assert findings[0].category == "unknown_contributor"


def test_missing_created_by_is_flagged():
    edges = [{"id": "e1", "created_by": None, "signal_id": None}]
    findings = detect_provenance_broken(edges, *_ctx())
    assert findings[0].category == "created_by_missing"


def test_dangling_signal_id_is_flagged():
    edges = [{"id": "e1", "created_by": "contributor:migration", "signal_id": "signal:nope"}]
    findings = detect_provenance_broken(edges, *_ctx())
    assert findings[0].category == "dangling_signal_id"
```

- [ ] **Step 2: Implement after verifying failure**

Append to `seed/_build/audit_schema.py`:

```python
def detect_provenance_broken(
    edges: List[dict],
    contributors_by_id: Dict[str, dict],
    signals_by_id: Dict[str, dict],
) -> List[Finding]:
    """C.5: integrity of edge.created_by + edge.signal_id."""
    findings: List[Finding] = []
    for e in edges:
        eid = e.get("id", "<no-id>")
        cb = e.get("created_by")
        if cb is None or (isinstance(cb, str) and not cb.strip()):
            findings.append(Finding(
                section="C", category="created_by_missing", severity=SEVERITY_BUG,
                subject_id=eid, subject_kind="edge",
                details={}, suggested_fix="every edge must have a created_by value",
            ))
        elif cb.startswith(AUTOMATED_WRITER_PREFIXES):
            pass  # known automated writer
        elif cb.startswith("contributor:"):
            if cb not in contributors_by_id:
                findings.append(Finding(
                    section="C", category="unknown_contributor", severity=SEVERITY_BUG,
                    subject_id=eid, subject_kind="edge",
                    details={"created_by": cb},
                    suggested_fix="add contributor row or repair edge",
                ))
        else:
            findings.append(Finding(
                section="C", category="unrecognised_created_by_format", severity=SEVERITY_BUG,
                subject_id=eid, subject_kind="edge",
                details={"created_by": cb},
                suggested_fix="created_by must match gatherer-*, embedding-*, or contributor:<id>",
            ))

        sig = e.get("signal_id")
        if sig and sig not in signals_by_id:
            findings.append(Finding(
                section="C", category="dangling_signal_id", severity=SEVERITY_BUG,
                subject_id=eid, subject_kind="edge",
                details={"signal_id": sig},
                suggested_fix="add signals.json row or null out signal_id on edge",
            ))
    return findings
```

- [ ] **Step 3: Run tests + commit**

```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_c5_provenance.py -v
# expected: 6 pass

git add seed/_build/audit_schema.py seed/_build/tests/test_c5_provenance.py
git commit -m "feat: C.5 detect_provenance_broken

Validates created_by + signal_id against contributors/signals tables.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 15: detect_self_loops (C.6)

**Files:**
- Modify: `seed/_build/audit_schema.py`
- Create: `seed/_build/tests/test_c6_self_loops.py`

- [ ] **Step 1: Write + implement (single small function)**

Create `seed/_build/tests/test_c6_self_loops.py`:

```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import detect_self_loops


def test_self_loop_is_flagged():
    edges = [{"id": "e1", "source_id": "x", "target_id": "x", "edge_type": "INFLUENCES"}]
    findings = detect_self_loops(edges)
    assert len(findings) == 1
    assert findings[0].category == "self_loop"
    assert findings[0].severity == "bug"


def test_no_self_loop_no_finding():
    edges = [{"id": "e1", "source_id": "x", "target_id": "y", "edge_type": "INFLUENCES"}]
    assert detect_self_loops(edges) == []
```

Append to `seed/_build/audit_schema.py`:

```python
def detect_self_loops(edges: List[dict]) -> List[Finding]:
    """C.6: source == target. Should always be zero."""
    findings: List[Finding] = []
    for e in edges:
        if e["source_id"] == e["target_id"]:
            findings.append(Finding(
                section="C", category="self_loop", severity=SEVERITY_BUG,
                subject_id=e.get("id", f"{e['source_id']}--{e['edge_type']}--{e['target_id']}"),
                subject_kind="edge",
                details={"source_id": e["source_id"], "edge_type": e["edge_type"]},
                suggested_fix="delete self-referential edge",
            ))
    return findings
```

- [ ] **Step 2: Run tests + commit**

```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_c6_self_loops.py -v
# expected: 2 pass

git add seed/_build/audit_schema.py seed/_build/tests/test_c6_self_loops.py
git commit -m "feat: C.6 detect_self_loops

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 16: detect_unknown_edge_types (C.7)

**Files:**
- Modify: `seed/_build/audit_schema.py`
- Create: `seed/_build/tests/test_c7_unknown_edge_types.py`

- [ ] **Step 1: Write + implement**

Create `seed/_build/tests/test_c7_unknown_edge_types.py`:

```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import detect_unknown_edge_types
from schema_contract import EDGE_CLAIMS


def test_known_edge_type_no_finding():
    edges = [{"id": "e1", "source_id": "x", "target_id": "y", "edge_type": "EMBODIES",
              "created_by": "x"}]
    assert detect_unknown_edge_types(edges, EDGE_CLAIMS) == []


def test_related_to_flagged_as_legacy_leak():
    edges = [{"id": "e1", "source_id": "x", "target_id": "y", "edge_type": "RELATED_TO",
              "created_by": "x"}]
    findings = detect_unknown_edge_types(edges, EDGE_CLAIMS)
    assert len(findings) == 1
    assert findings[0].details["annotation"] == "legacy_path_leak"


def test_truly_unknown_edge_type_flagged_generically():
    edges = [{"id": "e1", "source_id": "x", "target_id": "y", "edge_type": "MAKES_FRIENDS_WITH",
              "created_by": "x"}]
    findings = detect_unknown_edge_types(edges, EDGE_CLAIMS)
    assert len(findings) == 1
    assert findings[0].details["annotation"] == "unknown"
```

Append to `seed/_build/audit_schema.py`:

```python
from schema_contract import KNOWN_LEGACY_EDGE_TYPES


def detect_unknown_edge_types(
    edges: List[dict],
    contract: Dict[str, Any],
) -> List[Finding]:
    """C.7: edges whose edge_type isn't in EDGE_CLAIMS at all."""
    findings: List[Finding] = []
    known = set(contract.keys())
    for e in edges:
        et = e["edge_type"]
        if et in known:
            continue
        annotation = "legacy_path_leak" if et in KNOWN_LEGACY_EDGE_TYPES else "unknown"
        findings.append(Finding(
            section="C", category="unknown_edge_type", severity=SEVERITY_BUG,
            subject_id=e.get("id", f"{e['source_id']}--{et}--{e['target_id']}"),
            subject_kind="edge",
            details={"edge_type": et, "annotation": annotation,
                     "created_by": e.get("created_by")},
            suggested_fix=("delete legacy-path edge — should never be in canonical seed"
                           if annotation == "legacy_path_leak"
                           else "remap to a known edge type or add the type to EDGE_CLAIMS"),
        ))
    return findings
```

- [ ] **Step 2: Run tests + commit**

```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_c7_unknown_edge_types.py -v
# expected: 3 pass

git add seed/_build/audit_schema.py seed/_build/tests/test_c7_unknown_edge_types.py
git commit -m "feat: C.7 detect_unknown_edge_types

Distinguishes legacy-path leak (RELATED_TO) from truly unknown types.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 6: Section D — narrative-vs-edge mismatches (FULL tier)

LLM pass with cache. Includes mocked-client tests so this chunk doesn't hit the real API.

### Task 17: canonical_edges_json + cache helpers

**Files:**
- Modify: `seed/_build/audit_schema.py`
- Create: `seed/_build/tests/test_section_d_narrative.py` (cache portion)

- [ ] **Step 1: Write the failing test**

Create `seed/_build/tests/test_section_d_narrative.py`:

```python
import sys, pathlib, json, tempfile
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import (
    canonical_edges_json,
    narrative_cache_key,
    NarrativeCache,
)


def test_canonical_edges_json_sorts_and_keeps_only_known_fields():
    edges = [
        {"source_id": "a", "target_id": "b", "edge_type": "BELONGS_TO",
         "created_by": "x", "valid_from": "2024", "extra": "ignored"},
        {"source_id": "a", "target_id": "a", "edge_type": "BELONGS_TO",
         "created_by": "x"},
    ]
    result = canonical_edges_json(edges)
    data = json.loads(result)
    # Sorted by (source_id, edge_type, target_id)
    assert data[0]["target_id"] == "a"
    assert data[1]["target_id"] == "b"
    # Only the four fields kept
    assert set(data[0].keys()) == {"source_id", "target_id", "edge_type", "created_by"}


def test_canonical_edges_json_deterministic_across_input_order():
    a = [{"source_id": "1", "target_id": "2", "edge_type": "X", "created_by": "c"},
         {"source_id": "3", "target_id": "4", "edge_type": "X", "created_by": "c"}]
    b = list(reversed(a))
    assert canonical_edges_json(a) == canonical_edges_json(b)


def test_cache_key_components_affect_key():
    base = ("practitioner:a", "prose", "edges_json", "model", 1, "1.0")
    different = list(base)
    different[3] = "model-v2"  # change model
    k1 = narrative_cache_key(*base)
    k2 = narrative_cache_key(*different)
    assert k1 != k2


def test_cache_load_save_roundtrip():
    with tempfile.TemporaryDirectory() as tmp:
        path = pathlib.Path(tmp) / "narrative_audit.json"
        cache = NarrativeCache(path)
        cache.put("key1", {"finding": "x"})
        cache.save()
        cache2 = NarrativeCache(path)
        assert cache2.get("key1") == {"finding": "x"}
        assert cache2.get("missing") is None
```

- [ ] **Step 2: Implement after verifying failure**

Append to `seed/_build/audit_schema.py`:

```python
import hashlib


def canonical_edges_json(edges: List[dict]) -> str:
    """Canonicalised JSON of an edge list for cache-key hashing.

    Keeps only source_id, edge_type, target_id, created_by. Sorts by tuple of those.
    """
    KEEP = ("source_id", "target_id", "edge_type", "created_by")
    minimal = [{k: e.get(k) for k in KEEP} for e in edges]
    minimal.sort(key=lambda e: (e["source_id"], e["edge_type"], e["target_id"]))
    return json.dumps(minimal, sort_keys=True)


def narrative_cache_key(
    practitioner_id: str,
    prose_text: str,
    canonical_edges: str,
    model_id: str,
    prompt_version: int,
    contract_schema_version: str,
) -> str:
    """SHA-256 over the six cache-key components."""
    payload = json.dumps([
        practitioner_id,
        hashlib.sha256(prose_text.encode()).hexdigest(),
        hashlib.sha256(canonical_edges.encode()).hexdigest(),
        model_id,
        prompt_version,
        contract_schema_version,
    ], sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


class NarrativeCache:
    """JSON-file-backed cache for Section D LLM results.

    Single-writer assumption (the audit script). Load reads if file exists;
    save atomically replaces the file.
    """

    def __init__(self, path: pathlib.Path):
        self.path = path
        self._data: Dict[str, Any] = {}
        if path.exists():
            try:
                self._data = json.loads(path.read_text())
            except json.JSONDecodeError:
                self._data = {}

    def get(self, key: str) -> Optional[Any]:
        return self._data.get(key)

    def put(self, key: str, value: Any) -> None:
        self._data[key] = value

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(self.path.suffix + ".tmp")
        tmp.write_text(json.dumps(self._data, sort_keys=True, indent=2))
        tmp.replace(self.path)
```

- [ ] **Step 3: Run tests + commit**

```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_section_d_narrative.py -v
# expected: 4 pass

git add seed/_build/audit_schema.py seed/_build/tests/test_section_d_narrative.py
git commit -m "feat: canonical_edges_json + narrative_cache_key + NarrativeCache

Cache key composes practitioner, prose hash, edges hash, model id,
prompt version, contract schema version. Atomic JSON-file save.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 18: check_narrative_mismatches with mocked Anthropic client

**Files:**
- Modify: `seed/_build/audit_schema.py`
- Modify: `seed/_build/tests/test_section_d_narrative.py`

- [ ] **Step 0: Verify NARRATIVE_MODEL_ID is a currently-available Anthropic Haiku model**

The spec says the implementer must pin a verified model id. The plan's default is `claude-haiku-4-5`. Before continuing, verify by running:

```bash
seed/_build/.venv/bin/python3 -c "
import anthropic, os
if not os.environ.get('ANTHROPIC_API_KEY'):
    print('No ANTHROPIC_API_KEY set — skipping live verification.')
    print('Implementer must verify NARRATIVE_MODEL_ID manually before FULL tier runs.')
else:
    client = anthropic.Anthropic()
    resp = client.messages.create(
        model='claude-haiku-4-5',
        max_tokens=10,
        messages=[{'role': 'user', 'content': 'ping'}],
    )
    print(f'OK: claude-haiku-4-5 responded with: {resp.content[0].text!r}')
"
```

If the call fails with a 404 or "model not found", the model id has been retired. Replace `claude-haiku-4-5` with the project's current standard Haiku id (check Anthropic's docs or run `client.models.list()`) and update `NARRATIVE_MODEL_ID` in the code block below before proceeding. Bump `CONTRACT_SCHEMA_VERSION` in `schema_contract.py` from `"1.0"` to `"1.1"` if you change the model id — this invalidates the cache.

- [ ] **Step 1: Add test for the check function**

Append to `seed/_build/tests/test_section_d_narrative.py`:

```python
from unittest.mock import MagicMock


def test_check_narrative_mismatches_with_mocked_client():
    """Mock the Anthropic client; assert one Finding per non-empty LLM result."""
    from audit_schema import check_narrative_mismatches, NARRATIVE_MODEL_ID

    nodes = {
        "practitioner:sofia": {
            "id": "practitioner:sofia", "type": "practitioner", "name": "Sofia",
            "metadata": {
                "full_profile": {
                    "network_position": {
                        "scene_affiliation": "Active in the Tezos generative art scene.",
                    },
                },
            },
        },
        "scene:tezos": {"type": "scene"},
    }
    edges = [{
        "source_id": "practitioner:sofia", "target_id": "scene:tezos",
        "edge_type": "BELONGS_TO", "created_by": "x", "valid_until": None,
    }]

    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=json.dumps({
        "claimed_but_unlinked": ["Ethereum platform Feral File"],
        "linked_but_unclaimed": [],
    }))]
    mock_client.messages.create.return_value = mock_response

    with tempfile.TemporaryDirectory() as tmp:
        cache = NarrativeCache(pathlib.Path(tmp) / "cache.json")
        findings = check_narrative_mismatches(nodes, edges, client=mock_client, cache=cache)

    assert any("Ethereum platform Feral File" in str(f.details) for f in findings)
    # called once
    assert mock_client.messages.create.call_count == 1


def test_check_narrative_mismatches_uses_cache_on_second_call():
    from audit_schema import check_narrative_mismatches

    nodes = {
        "practitioner:p": {
            "id": "practitioner:p", "type": "practitioner",
            "metadata": {"full_profile": {"network_position": {"scene_affiliation": "X"}}},
        },
    }
    edges = []

    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=json.dumps({"claimed_but_unlinked": [],
                                                       "linked_but_unclaimed": []}))]
    mock_client.messages.create.return_value = mock_response

    with tempfile.TemporaryDirectory() as tmp:
        cache = NarrativeCache(pathlib.Path(tmp) / "cache.json")
        check_narrative_mismatches(nodes, edges, client=mock_client, cache=cache)
        check_narrative_mismatches(nodes, edges, client=mock_client, cache=cache)

    # second call should hit the cache, not the client
    assert mock_client.messages.create.call_count == 1


def test_check_narrative_mismatches_skips_when_no_key():
    """If neither client nor key provided, returns one info Finding noting skip."""
    from audit_schema import check_narrative_mismatches
    with tempfile.TemporaryDirectory() as tmp:
        cache = NarrativeCache(pathlib.Path(tmp) / "cache.json")
        findings = check_narrative_mismatches({}, [], client=None, cache=cache)
    assert len(findings) == 1
    assert findings[0].category == "section_d_skipped"
```

- [ ] **Step 2: Implement check_narrative_mismatches**

Append to `seed/_build/audit_schema.py`:

```python
import os

from schema_contract import CONTRACT_SCHEMA_VERSION


NARRATIVE_MODEL_ID = "claude-haiku-4-5"  # implementer-verify; participates in cache key
NARRATIVE_PROMPT_VERSION = 1

NARRATIVE_PROMPT_TEMPLATE = """\
You are comparing two views of one practitioner's place in the digital arts field.

The PROSE below comes from the practitioner's profile metadata (free-text scene_affiliation).
The EDGES below are the structured BELONGS_TO and CLASSIFIED_BY edges actually in the graph.

Compare them. Produce JSON with two fields:
  - "claimed_but_unlinked": list of scenes/platforms/institutions the prose names that are NOT present as edges
  - "linked_but_unclaimed": list of edges whose target is contradicted by or absent from the prose

Be strict. If everything aligns, both lists should be empty. Do not invent claims.

PROSE:
{prose}

EDGES:
{edges_json}

Respond with ONLY the JSON object, nothing else.
"""


def check_narrative_mismatches(
    nodes_by_id: Dict[str, dict],
    edges: List[dict],
    client: Optional[Any] = None,
    cache: Optional[NarrativeCache] = None,
) -> List[Finding]:
    """Section D: per-practitioner narrative-vs-edge comparison via LLM.

    If client is None (no ANTHROPIC_API_KEY), returns one info finding marking skip.
    """
    if cache is None:
        cache = NarrativeCache(pathlib.Path("seed/_build/.cache/narrative_audit.json"))

    if client is None:
        return [Finding(
            section="D", category="section_d_skipped", severity=SEVERITY_INFO,
            subject_id="(section_d)", subject_kind="node",
            details={"reason": "no Anthropic client (ANTHROPIC_API_KEY unset)"},
        )]

    findings: List[Finding] = []
    # Index practitioner edges (BELONGS_TO + CLASSIFIED_BY, current state only)
    edges_for: Dict[str, List[dict]] = {}
    for e in edges:
        if e["edge_type"] not in ("BELONGS_TO", "CLASSIFIED_BY"):
            continue
        if e.get("valid_until") is not None:
            continue
        edges_for.setdefault(e["source_id"], []).append(e)

    for pid, p in sorted(nodes_by_id.items()):
        if p.get("type") != "practitioner":
            continue
        md = _parse_metadata(p)
        prose = (md.get("full_profile", {}).get("network_position", {})
                   .get("scene_affiliation", "") or "")
        if not prose.strip():
            continue

        prac_edges = edges_for.get(pid, [])
        canon = canonical_edges_json(prac_edges)
        key = narrative_cache_key(
            pid, prose, canon, NARRATIVE_MODEL_ID, NARRATIVE_PROMPT_VERSION,
            CONTRACT_SCHEMA_VERSION,
        )
        cached = cache.get(key)
        if cached is None:
            try:
                prompt = NARRATIVE_PROMPT_TEMPLATE.format(prose=prose, edges_json=canon)
                resp = client.messages.create(
                    model=NARRATIVE_MODEL_ID,
                    max_tokens=1024,
                    messages=[{"role": "user", "content": prompt}],
                )
                text = resp.content[0].text
                cached = json.loads(text)
                cache.put(key, cached)
            except Exception as e:
                findings.append(Finding(
                    section="D", category="section_d_incomplete", severity=SEVERITY_WARNING,
                    subject_id=pid, subject_kind="node",
                    details={"reason": str(e)},
                ))
                continue

        for claim in cached.get("claimed_but_unlinked", []):
            findings.append(Finding(
                section="D", category="claimed_but_unlinked", severity=SEVERITY_WARNING,
                subject_id=pid, subject_kind="node",
                details={"prose_claim": claim, "model_id": NARRATIVE_MODEL_ID,
                         "prompt_version": NARRATIVE_PROMPT_VERSION},
                suggested_fix="add edge OR remove claim from prose",
            ))
        for edge_desc in cached.get("linked_but_unclaimed", []):
            findings.append(Finding(
                section="D", category="linked_but_unclaimed", severity=SEVERITY_WARNING,
                subject_id=pid, subject_kind="node",
                details={"edge_description": edge_desc, "model_id": NARRATIVE_MODEL_ID,
                         "prompt_version": NARRATIVE_PROMPT_VERSION},
                suggested_fix="add to prose OR remove edge",
            ))

    cache.save()
    return findings
```

- [ ] **Step 3: Run tests + commit**

```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_section_d_narrative.py -v
# expected: 7 pass (4 from earlier + 3 new)

git add seed/_build/audit_schema.py seed/_build/tests/test_section_d_narrative.py
git commit -m "feat: Section D check_narrative_mismatches with cache + mocked-client tests

Cache hits avoid re-cost. Skip-with-finding when ANTHROPIC_API_KEY unset.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 7: Section E + rendering

Section E (invitations honored) + markdown / CSV rendering + normalize_output.

### Task 19: check_invitations_honored (Section E)

**Files:**
- Modify: `seed/_build/audit_schema.py`
- Create: `seed/_build/tests/test_section_e_invitations.py`

- [ ] **Step 1: Write the failing test**

Create `seed/_build/tests/test_section_e_invitations.py`:

```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import check_invitations_honored


def test_invitation_edges_with_zero_count_reported_info():
    findings = check_invitations_honored({}, [])
    cats = {f.category for f in findings}
    assert "invitation_honored" in cats
    # RESPONDS_TO, CONTESTS, TENSION_WITH at minimum
    honored_subjects = {f.subject_id for f in findings if f.category == "invitation_honored"}
    assert {"RESPONDS_TO", "CONTESTS", "TENSION_WITH"}.issubset(honored_subjects)


def test_invitation_edge_with_non_zero_count_is_violated():
    edges = [{"id": "e1", "source_id": "a", "target_id": "b",
              "edge_type": "RESPONDS_TO", "created_by": "x"}]
    findings = check_invitations_honored({}, edges)
    violated = [f for f in findings if f.category == "invitation_violated"]
    assert len(violated) == 1
    assert violated[0].subject_id == "RESPONDS_TO"
    assert violated[0].severity == "bug"


def test_empty_stubs_counted_as_info():
    nodes = {
        "scene:empty": {"id": "scene:empty", "type": "scene",
                        "metadata": {"status": "placeholder"}},
        "scene:filled": {"id": "scene:filled", "type": "scene",
                         "metadata": {"status": "confirmed"}},
    }
    edges = [{"source_id": "x", "target_id": "scene:filled",
              "edge_type": "BELONGS_TO", "created_by": "x"}]
    findings = check_invitations_honored(nodes, edges)
    stubs = [f for f in findings if f.category == "empty_stub_count"]
    assert len(stubs) == 1
    assert stubs[0].details["count"] == 1
```

- [ ] **Step 2: Implement after verifying failure**

Append to `seed/_build/audit_schema.py`:

```python
from schema_contract import INVITATION_STATUS_SET


def check_invitations_honored(
    nodes_by_id: Dict[str, dict],
    edges: List[dict],
) -> List[Finding]:
    """Section E: confirms invitation edges are still empty and counts empty stubs.

    Per spec — informational, not bugs (except invitation_violated, which IS a bug
    because it means the design contract was breached).
    """
    findings: List[Finding] = []
    # Edge counts per invitation type
    invitation_types = {
        et for et, doc_map in EDGE_CLAIMS.items()
        if any(c is not None and c.is_invitation for c in doc_map.values())
    }
    edge_counts: Dict[str, int] = {et: 0 for et in invitation_types}
    for e in edges:
        if e["edge_type"] in invitation_types:
            edge_counts[e["edge_type"]] += 1

    for et, count in sorted(edge_counts.items()):
        if count == 0:
            findings.append(Finding(
                section="E", category="invitation_honored", severity=SEVERITY_INFO,
                subject_id=et, subject_kind="edge",
                details={"count": 0, "expected": 0,
                         "rationale": "invitation edge reserved for practitioner voice"},
            ))
        else:
            findings.append(Finding(
                section="E", category="invitation_violated", severity=SEVERITY_BUG,
                subject_id=et, subject_kind="edge",
                details={"count": count, "expected": 0,
                         "rationale": "invitation edge has non-zero edges — contract breach"},
                suggested_fix="audit how these edges entered the graph; remove or attest",
            ))

    # Empty-stub count (0 in-degree AND 0 out-degree AND status in INVITATION_STATUS_SET)
    in_degree: Dict[str, int] = {}
    out_degree: Dict[str, int] = {}
    for e in edges:
        out_degree[e["source_id"]] = out_degree.get(e["source_id"], 0) + 1
        in_degree[e["target_id"]] = in_degree.get(e["target_id"], 0) + 1

    stub_count = 0
    for nid, n in nodes_by_id.items():
        if in_degree.get(nid, 0) > 0 or out_degree.get(nid, 0) > 0:
            continue
        md = _parse_metadata(n)
        status = md.get("status")
        if status in INVITATION_STATUS_SET or status is None:
            stub_count += 1

    findings.append(Finding(
        section="E", category="empty_stub_count", severity=SEVERITY_INFO,
        subject_id="(empty_stubs)", subject_kind="node",
        details={"count": stub_count,
                 "status_set": sorted(INVITATION_STATUS_SET),
                 "rationale": "0-degree nodes with stub-like status — invitations awaiting contribution"},
    ))
    return findings
```

- [ ] **Step 3: Run tests + commit**

```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_section_e_invitations.py -v
# expected: 3 pass

git add seed/_build/audit_schema.py seed/_build/tests/test_section_e_invitations.py
git commit -m "feat: Section E check_invitations_honored

Reports invitation-edge counts (info if zero, bug if non-zero) and
empty-stub count (info).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 20: render_report + render_csvs

**Files:**
- Modify: `seed/_build/audit_schema.py`
- Create: `seed/_build/tests/test_render.py`

- [ ] **Step 1: Write the failing test**

Create `seed/_build/tests/test_render.py`:

```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import render_report, render_csvs, Finding


def test_report_includes_all_five_sections():
    findings = [
        Finding(section="A", category="schema_disagreement", severity="warning",
                subject_id="EXHIBITED_AT", subject_kind="edge",
                details={"edge_count": 10, "documents_disagree": True,
                         "claims": {
                             "skill_md": {"source_types": ["artwork"], "target_types": ["institution"],
                                          "is_invitation": False, "ref": "x"},
                             "sources_md": {"source_types": ["practitioner"], "target_types": ["institution"],
                                            "is_invitation": False, "ref": "y"},
                             "claude_md": {"source_types": ["artwork"], "target_types": ["institution"],
                                           "is_invitation": False, "ref": "z"},
                         },
                         "conformance_pct": {"skill_md": 10.0,
                                             "sources_md": 90.0,
                                             "claude_md": 10.0}}),
        Finding(section="B", category="per_document_conformance", severity="info",
                subject_id="skill_md", subject_kind="node",
                details={"conformance_pct": 50.0, "conforming_edges": 5,
                         "total_curated_edges": 10, "edges_considered": 10}),
        Finding(section="C", category="id_collision", severity="bug",
                subject_id="artwork:untitled", subject_kind="node", details={"name": "Untitled"}),
        Finding(section="D", category="section_d_skipped", severity="info",
                subject_id="(section_d)", subject_kind="node",
                details={"reason": "no key"}),
        Finding(section="E", category="invitation_honored", severity="info",
                subject_id="RESPONDS_TO", subject_kind="edge",
                details={"count": 0, "expected": 0}),
    ]
    md = render_report(findings, tier="fast", node_count=10, edge_count=20)
    for header in ("Section A", "Section B", "Section C", "Section D", "Section E"):
        assert header in md
    assert "EXHIBITED_AT" in md
    assert "artwork:untitled" in md


def test_section_a_renders_as_markdown_table():
    """Spec mandates per-edge-type comparison table for Section A."""
    findings = [Finding(
        section="A", category="schema_disagreement", severity="warning",
        subject_id="EXHIBITED_AT", subject_kind="edge",
        details={"edge_count": 305, "documents_disagree": True,
                 "claims": {
                     "skill_md": {"source_types": ["artwork"], "target_types": ["institution", "platform"],
                                  "is_invitation": False, "ref": "§1.4"},
                     "sources_md": {"source_types": ["practitioner"], "target_types": ["institution"],
                                    "is_invitation": False, "ref": "line 296"},
                     "claude_md": {"source_types": ["artwork"], "target_types": ["institution", "platform"],
                                   "is_invitation": False, "ref": "edge-type paragraph"},
                 },
                 "conformance_pct": {"skill_md": 3.6, "sources_md": 96.4, "claude_md": 3.6}}),
    ]
    md = render_report(findings, tier="fast", node_count=10, edge_count=305)
    # Section A row uses table syntax (pipes), not bullet syntax
    assert "| `EXHIBITED_AT` |" in md
    assert "src: artwork" in md
    assert "src: practitioner" in md
    assert "sources_md: 96.4%" in md


def test_section_b_renders_as_markdown_table():
    findings = [Finding(
        section="B", category="per_document_conformance", severity="info",
        subject_id="sources_md", subject_kind="node",
        details={"edges_considered": 100, "conforming_edges": 80, "conformance_pct": 80.0,
                 "total_curated_edges": 100}),
    ]
    md = render_report(findings, tier="fast", node_count=10, edge_count=100)
    assert "| sources_md | 100 | 80 | 80.0% |" in md


def test_csvs_one_per_category():
    findings = [
        Finding(section="C", category="id_collision", severity="bug",
                subject_id="artwork:untitled", subject_kind="node", details={}),
        Finding(section="C", category="self_loop", severity="bug",
                subject_id="e1", subject_kind="edge", details={}),
    ]
    csvs = render_csvs(findings)
    assert "section_c_id_collision.csv" in csvs
    assert "section_c_self_loop.csv" in csvs
    # base columns present
    assert "subject_id" in csvs["section_c_id_collision.csv"]
    assert "subject_kind" in csvs["section_c_id_collision.csv"]


def test_csvs_sorted_by_subject_id():
    findings = [
        Finding(section="C", category="self_loop", severity="bug",
                subject_id="e2", subject_kind="edge", details={}),
        Finding(section="C", category="self_loop", severity="bug",
                subject_id="e1", subject_kind="edge", details={}),
    ]
    csv = render_csvs(findings)["section_c_self_loop.csv"]
    lines = [l for l in csv.splitlines() if l]
    # data rows in order: e1, e2
    assert lines[1].startswith("e1,")
    assert lines[2].startswith("e2,")
```

- [ ] **Step 2: Implement**

Append to `seed/_build/audit_schema.py`:

```python
import csv
import io
import datetime as dt
from datetime import timezone


_SECTION_TITLES = {
    "A": "Schema disagreements",
    "B": "Per-document conformance",
    "C": "Genuine bugs",
    "D": "Narrative-vs-edge mismatches",
    "E": "Invitations honored",
}


def _render_section_a_table(findings: List[Finding]) -> List[str]:
    """Section A as a per-edge-type comparison table (spec-mandated format)."""
    lines = [
        "| Edge type | SKILL.md | SOURCES.md | CLAUDE.md | Data conforms to | Edges |",
        "|---|---|---|---|---|---:|",
    ]
    for f in sorted(findings, key=lambda f: f.subject_id):
        claims = f.details.get("claims", {})
        conf = f.details.get("conformance_pct", {})
        edge_count = f.details.get("edge_count", 0)

        def claim_cell(doc: str) -> str:
            c = claims.get(doc)
            if c is None:
                return "_not documented_"
            inv = " · invitation" if c.get("is_invitation") else ""
            return f"src: {', '.join(c['source_types'])}; tgt: {', '.join(c['target_types'])}{inv}"

        def conf_cell() -> str:
            parts = []
            for doc in ("skill_md", "sources_md", "claude_md"):
                pct = conf.get(doc)
                if pct is None:
                    parts.append(f"{doc}: –")
                else:
                    parts.append(f"{doc}: {pct}%")
            return "; ".join(parts)

        lines.append(
            f"| `{f.subject_id}` | {claim_cell('skill_md')} | {claim_cell('sources_md')} | "
            f"{claim_cell('claude_md')} | {conf_cell()} | {edge_count} |"
        )
    return lines


def _render_section_b_table(findings: List[Finding]) -> List[str]:
    """Section B as a document-conformance roll-up table."""
    lines = [
        "| Document | Edges considered | Conforming | Conformance % |",
        "|---|---:|---:|---:|",
    ]
    for f in sorted(findings, key=lambda f: f.subject_id):
        d = f.details
        pct = d.get("conformance_pct")
        pct_str = f"{pct}%" if pct is not None else "–"
        lines.append(
            f"| {f.subject_id} | {d.get('edges_considered', 0)} | "
            f"{d.get('conforming_edges', 0)} | {pct_str} |"
        )
    return lines


def _render_section_findings_as_bullets(findings: List[Finding]) -> List[str]:
    """Sections C/D/E render as one bullet per finding with structured detail."""
    lines: List[str] = []
    # Group by category for readability
    by_category: Dict[str, List[Finding]] = {}
    for f in findings:
        by_category.setdefault(f.category, []).append(f)
    for category in sorted(by_category):
        items = sorted(by_category[category], key=lambda f: f.subject_id)
        lines.append(f"### `{category}` ({len(items)})")
        lines.append("")
        for f in items:
            details_compact = json.dumps(f.details, sort_keys=True)
            fix = f" — _fix:_ {f.suggested_fix}" if f.suggested_fix else ""
            lines.append(f"- **{f.subject_id}** [{f.severity}] — `{details_compact}`{fix}")
        lines.append("")
    return lines


def render_report(
    findings: List[Finding],
    tier: str,
    node_count: int,
    edge_count: int,
) -> str:
    """Markdown report. Sections A and B render as spec-mandated tables;
    Sections C, D, E render as grouped-by-category bullets. All within-group
    ordering is by subject_id for deterministic golden-file comparison.
    """
    lines: List[str] = []
    lines.append(f"# A(DAI) Schema Audit — {dt.date.today().isoformat()} ({tier.upper()})")
    lines.append("")
    lines.append(f"Generated: {dt.datetime.now(timezone.utc).isoformat()}")
    lines.append(f"Graph snapshot: {node_count} nodes, {edge_count} edges")
    lines.append("")

    # Headline table
    lines.append("## Headline counts")
    lines.append("")
    lines.append("| Section | Findings | Highest severity |")
    lines.append("|---|---:|---|")
    by_section: Dict[str, List[Finding]] = {}
    for f in findings:
        by_section.setdefault(f.section, []).append(f)
    SEVERITY_RANK = {SEVERITY_INFO: 0, SEVERITY_WARNING: 1, SEVERITY_BUG: 2}
    for section in ("A", "B", "C", "D", "E"):
        sf = by_section.get(section, [])
        if not sf:
            lines.append(f"| {section}. {_SECTION_TITLES[section]} | 0 | – |")
        else:
            max_sev = max(sf, key=lambda f: SEVERITY_RANK[f.severity]).severity
            lines.append(f"| {section}. {_SECTION_TITLES[section]} | {len(sf)} | {max_sev} |")
    lines.append("")

    # Per-section detail — Section A and B as tables, C/D/E as grouped bullets
    for section in ("A", "B", "C", "D", "E"):
        lines.append(f"## Section {section}: {_SECTION_TITLES[section]}")
        lines.append("")
        sf = by_section.get(section, [])
        if not sf:
            lines.append("_No findings._")
            lines.append("")
            continue
        if section == "A":
            lines.extend(_render_section_a_table(sf))
        elif section == "B":
            lines.extend(_render_section_b_table(sf))
        else:
            lines.extend(_render_section_findings_as_bullets(sf))
        lines.append("")

    lines.append("## Reproducing this audit")
    lines.append("")
    lines.append(f"```bash\nnpm run audit:schema:{tier}\n```")
    lines.append("")
    return "\n".join(lines)


def render_csvs(findings: List[Finding]) -> Dict[str, str]:
    """One CSV per (section, category). Filename: section_<section>_<category>.csv (lowercase)."""
    by_key: Dict[str, List[Finding]] = {}
    for f in findings:
        fname = f"section_{f.section.lower()}_{f.category}.csv"
        by_key.setdefault(fname, []).append(f)

    out: Dict[str, str] = {}
    for fname, items in by_key.items():
        items_sorted = sorted(items, key=lambda f: f.subject_id)
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["subject_id", "subject_kind", "severity", "category",
                    "details_json", "suggested_fix"])
        for f in items_sorted:
            w.writerow([f.subject_id, f.subject_kind, f.severity, f.category,
                        json.dumps(f.details, sort_keys=True), f.suggested_fix])
        out[fname] = buf.getvalue()
    return out
```

- [ ] **Step 3: Run tests + commit**

```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_render.py -v
# expected: 5 pass

git add seed/_build/audit_schema.py seed/_build/tests/test_render.py
git commit -m "feat: render_report (markdown) + render_csvs (per-category)

Sections A and B render as spec-mandated tables; C/D/E grouped bullets.
Uses datetime.now(timezone.utc) (Py3.12+ safe). Stable sort.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Chunk 8: Integration — wire up main(), normalize_output, golden-file smoke test

Wires every check into main(), writes the report + CSVs to disk, adds the smoke test against a hand-crafted fixture, runs against the real seed.

### Task 21: normalize_output helper for golden-file comparison

**Files:**
- Modify: `seed/_build/audit_schema.py`
- Create: `seed/_build/tests/test_normalize.py`

- [ ] **Step 1: Write the failing test**

Create `seed/_build/tests/test_normalize.py`:

```python
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import normalize_output


def test_strips_generated_timestamp():
    md = "# Title\n\nGenerated: 2026-05-24T12:34:56Z\nMore content"
    norm = normalize_output(md)
    assert "Generated:" not in norm
    assert "Title" in norm
    assert "More content" in norm


def test_strips_graph_snapshot_line():
    md = "# Title\n\nGraph snapshot: 1234 nodes, 5678 edges\nMore"
    norm = normalize_output(md)
    assert "Graph snapshot:" not in norm
    assert "More" in norm


def test_normalises_line_endings():
    norm = normalize_output("a\r\nb\r\n")
    assert "\r" not in norm
```

- [ ] **Step 2: Implement after verifying failure**

Append to `seed/_build/audit_schema.py`:

```python
def normalize_output(text: str) -> str:
    """Strip volatile lines from a rendered report for golden-file comparison."""
    out_lines: List[str] = []
    for line in text.replace("\r\n", "\n").splitlines():
        if line.startswith("Generated:"):
            continue
        if line.startswith("Graph snapshot:"):
            continue
        out_lines.append(line)
    return "\n".join(out_lines)
```

- [ ] **Step 3: Run + commit**

```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_normalize.py -v
# 3 pass

git add seed/_build/audit_schema.py seed/_build/tests/test_normalize.py
git commit -m "feat: normalize_output strips Generated + Graph snapshot lines

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 22: Wire main() to run all checks and write outputs

**Files:**
- Modify: `seed/_build/audit_schema.py`

- [ ] **Step 1: Replace main() with the full pipeline**

In `seed/_build/audit_schema.py`, replace the existing `main()` with:

```python
def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="A(DAI) schema audit — catalog schema issues in the graph."
    )
    parser.add_argument("--tier", choices=["fast", "full"], default="fast")
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--out-dir", default="docs")
    parser.add_argument("--seed-dir", default=None,
                        help="Override seed directory (for testing)")
    args = parser.parse_args(argv)

    print(f"[audit] tier={args.tier} live={args.live} out_dir={args.out_dir}",
          file=sys.stderr)

    try:
        nodes_by_id, edges, contributors_by_id, signals_by_id = load_graph(
            seed_dir=pathlib.Path(args.seed_dir) if args.seed_dir else None,
            live_url=DEFAULT_API_URL if args.live else None,
        )
    except FileNotFoundError as e:
        print(f"[audit] ERROR: {e}", file=sys.stderr)
        return 1

    print(f"[audit] loaded {len(nodes_by_id)} nodes, {len(edges)} edges", file=sys.stderr)

    findings: List[Finding] = []
    findings.extend(check_schema_disagreements(nodes_by_id, edges, EDGE_CLAIMS))
    print(f"[audit] A schema disagreements: {sum(1 for f in findings if f.section == 'A')}",
          file=sys.stderr)
    findings.extend(check_per_document_conformance(nodes_by_id, edges, EDGE_CLAIMS))
    findings.extend(detect_id_collisions(nodes_by_id, edges))
    findings.extend(detect_forked_created_by(nodes_by_id, edges))
    findings.extend(detect_era_violations(nodes_by_id, edges))
    findings.extend(detect_bitemporal_integrity(edges))
    findings.extend(detect_provenance_broken(edges, contributors_by_id, signals_by_id))
    findings.extend(detect_self_loops(edges))
    findings.extend(detect_unknown_edge_types(edges, EDGE_CLAIMS))
    section_c = sum(1 for f in findings if f.section == "C")
    print(f"[audit] C genuine bugs: {section_c}", file=sys.stderr)

    if args.tier == "full":
        client = None
        if os.environ.get("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
            except Exception as e:
                print(f"[audit] WARN: failed to construct anthropic client: {e}",
                      file=sys.stderr)
        cache_path = REPO_ROOT / "seed" / "_build" / ".cache" / "narrative_audit.json"
        cache = NarrativeCache(cache_path)
        findings.extend(check_narrative_mismatches(
            nodes_by_id, edges, client=client, cache=cache,
        ))
        section_d = sum(1 for f in findings if f.section == "D")
        print(f"[audit] D narrative mismatches: {section_d}", file=sys.stderr)

    findings.extend(check_invitations_honored(nodes_by_id, edges))

    # Write outputs
    today = dt.date.today().isoformat()
    out_dir = pathlib.Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    md_path = out_dir / f"SCHEMA_AUDIT_{today}.md"
    suffix = 2
    while md_path.exists():
        md_path = out_dir / f"SCHEMA_AUDIT_{today}-{suffix}.md"
        suffix += 1

    md = render_report(findings, tier=args.tier,
                       node_count=len(nodes_by_id), edge_count=len(edges))
    md_path.write_text(md)
    print(f"[audit] wrote {md_path}", file=sys.stderr)

    # Rename: docs/SCHEMA_AUDIT_2026-05-24.md → docs/schema_audit_2026-05-24/
    csv_dir = out_dir / md_path.name.replace("SCHEMA_AUDIT_", "schema_audit_").replace(".md", "")
    csv_dir.mkdir(parents=True, exist_ok=True)
    csvs = render_csvs(findings)
    for fname, content in csvs.items():
        (csv_dir / fname).write_text(content)
    print(f"[audit] wrote {len(csvs)} CSVs to {csv_dir}/", file=sys.stderr)

    return 0
```

- [ ] **Step 2: Run the fast tier end-to-end against real seed**

Run:
```bash
npm run audit:schema:fast
```
Expected stderr ends with:
```
[audit] wrote docs/SCHEMA_AUDIT_<today>.md
[audit] wrote N CSVs to docs/schema_audit_<today>/
```
Verify:
```bash
ls -la docs/SCHEMA_AUDIT_*.md docs/schema_audit_*/
head -50 docs/SCHEMA_AUDIT_*.md
```
Expected: report file exists with Section A/B/C/D/E headers, real counts.

- [ ] **Step 3: Verify deterministic re-run**

Run the audit twice, normalise output, diff:
```bash
seed/_build/.venv/bin/python3 seed/_build/audit_schema.py --tier fast --out-dir /tmp/audit1
seed/_build/.venv/bin/python3 seed/_build/audit_schema.py --tier fast --out-dir /tmp/audit2
seed/_build/.venv/bin/python3 -c "
import sys; sys.path.insert(0, 'seed/_build')
from audit_schema import normalize_output
import pathlib
a = pathlib.Path('/tmp/audit1').glob('SCHEMA_AUDIT_*.md').__next__().read_text()
b = pathlib.Path('/tmp/audit2').glob('SCHEMA_AUDIT_*.md').__next__().read_text()
print('IDENTICAL' if normalize_output(a) == normalize_output(b) else 'DIFFER')
"
```
Expected: prints `IDENTICAL`. If not, debug — likely an unsorted collection somewhere.

- [ ] **Step 4: Commit**

```bash
git add seed/_build/audit_schema.py
git commit -m "feat: wire main() to run all sections and write report + CSVs

Determinism verified by double-run with normalize_output.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 23: Golden-file smoke test against a hand-crafted fixture

**Files:**
- Create: `seed/_build/tests/fixtures/schema_audit/nodes_fixture.json`
- Create: `seed/_build/tests/fixtures/schema_audit/edges_fixture.json`
- Create: `seed/_build/tests/fixtures/schema_audit/contributors_fixture.json`
- Create: `seed/_build/tests/fixtures/schema_audit/signals_fixture.json`
- Create: `seed/_build/tests/test_smoke_end_to_end.py`

- [ ] **Step 1: Build the fixture**

Create `seed/_build/tests/fixtures/schema_audit/contributors_fixture.json`:
```json
[{"id": "contributor:migration", "name": "Migration", "trust_tier": "reviewed"}]
```

Create `seed/_build/tests/fixtures/schema_audit/signals_fixture.json`:
```json
[{"id": "signal:seed", "title": "Seed signal"}]
```

Create `seed/_build/tests/fixtures/schema_audit/nodes_fixture.json` — the exact content the smoke test exercises:

```json
[
  {
    "id": "practitioner:fixture-sofia",
    "type": "practitioner",
    "name": "Fixture Sofia",
    "slug": "fixture-sofia",
    "metadata": {
      "status": "confirmed",
      "full_profile": {
        "network_position": {
          "scene_affiliation": "Active in the Tezos generative art scene and Feral File platform."
        }
      }
    }
  },
  {
    "id": "practitioner:fixture-molnar",
    "type": "practitioner",
    "name": "Fixture Molnar",
    "slug": "fixture-molnar",
    "metadata": {"status": "confirmed"}
  },
  {
    "id": "practitioner:fixture-cohen",
    "type": "practitioner",
    "name": "Fixture Cohen",
    "slug": "fixture-cohen",
    "metadata": {"status": "confirmed"}
  },
  {
    "id": "practitioner:fixture-hobbs",
    "type": "practitioner",
    "name": "Fixture Hobbs",
    "slug": "fixture-hobbs",
    "metadata": {"status": "confirmed"}
  },
  {
    "id": "practitioner:fixture-nees",
    "type": "practitioner",
    "name": "Fixture Nees",
    "slug": "fixture-nees",
    "metadata": {"status": "confirmed"}
  },
  {
    "id": "artwork:untitled",
    "type": "artwork",
    "name": "Untitled",
    "slug": "untitled",
    "metadata": {"status": "draft", "year_start": 1975}
  },
  {
    "id": "artwork:fidenza-fixture",
    "type": "artwork",
    "name": "Fidenza Fixture",
    "slug": "fidenza-fixture",
    "metadata": {"status": "confirmed", "year_start": 2021}
  },
  {
    "id": "artwork:schotter-fixture",
    "type": "artwork",
    "name": "Schotter Fixture",
    "slug": "schotter-fixture",
    "metadata": {"status": "confirmed", "year_start": 1968}
  },
  {
    "id": "artwork:starmirror-fixture",
    "type": "artwork",
    "name": "Starmirror Fixture",
    "slug": "starmirror-fixture",
    "metadata": {"status": "confirmed", "year_start": 2024}
  },
  {
    "id": "platform:art-blocks-fixture",
    "type": "platform",
    "name": "Art Blocks Fixture",
    "slug": "art-blocks-fixture",
    "metadata": {"status": "confirmed"}
  },
  {
    "id": "institution:moma-fixture",
    "type": "institution",
    "name": "MoMA Fixture",
    "slug": "moma-fixture",
    "metadata": {"status": "confirmed"}
  },
  {
    "id": "institution:empty-fixture",
    "type": "institution",
    "name": "Empty Institution Fixture",
    "slug": "empty-fixture",
    "metadata": {"status": "placeholder"}
  },
  {
    "id": "concept:on-chain-generative-art",
    "type": "concept",
    "name": "On-chain generative art",
    "slug": "on-chain-generative-art",
    "metadata": {}
  },
  {
    "id": "concept:plotter-drawing",
    "type": "concept",
    "name": "Plotter drawing",
    "slug": "plotter-drawing",
    "metadata": {}
  },
  {
    "id": "scene:tezos-fixture",
    "type": "scene",
    "name": "Tezos generative art",
    "slug": "tezos-fixture",
    "metadata": {"status": "confirmed"}
  }
]
```

Create `seed/_build/tests/fixtures/schema_audit/edges_fixture.json` — the exact edges the smoke test exercises:

```json
[
  {
    "id": "fx-e1",
    "source_id": "artwork:untitled",
    "target_id": "practitioner:fixture-molnar",
    "edge_type": "CREATED_BY",
    "created_by": "gatherer-moma-digital-v3",
    "confidence": "high",
    "valid_from": "2024-01-01",
    "valid_until": null,
    "invalidated_by": null,
    "signal_id": null
  },
  {
    "id": "fx-e2",
    "source_id": "artwork:untitled",
    "target_id": "practitioner:fixture-cohen",
    "edge_type": "CREATED_BY",
    "created_by": "gatherer-wikidata-v3b",
    "confidence": "high",
    "valid_from": "2024-01-01",
    "valid_until": null,
    "invalidated_by": null,
    "signal_id": null
  },
  {
    "id": "fx-e3",
    "source_id": "artwork:fidenza-fixture",
    "target_id": "practitioner:fixture-hobbs",
    "edge_type": "CREATED_BY",
    "created_by": "contributor:migration",
    "confidence": "high",
    "valid_from": "2024-01-01",
    "valid_until": null,
    "invalidated_by": null,
    "signal_id": null
  },
  {
    "id": "fx-e4",
    "source_id": "artwork:fidenza-fixture",
    "target_id": "platform:art-blocks-fixture",
    "edge_type": "CREATED_BY",
    "created_by": "contributor:migration",
    "confidence": "medium",
    "valid_from": "2024-01-01",
    "valid_until": null,
    "invalidated_by": null,
    "signal_id": null
  },
  {
    "id": "fx-e5",
    "source_id": "artwork:schotter-fixture",
    "target_id": "concept:on-chain-generative-art",
    "edge_type": "EMBODIES",
    "created_by": "gatherer-enrichment",
    "confidence": "medium",
    "valid_from": "2024-01-01",
    "valid_until": null,
    "invalidated_by": null,
    "signal_id": null
  },
  {
    "id": "fx-e6",
    "source_id": "artwork:starmirror-fixture",
    "target_id": "concept:plotter-drawing",
    "edge_type": "EMBODIES",
    "created_by": "contributor:migration",
    "confidence": "high",
    "valid_from": "2024-01-01",
    "valid_until": "2024-06-01",
    "invalidated_by": null,
    "signal_id": null
  },
  {
    "id": "fx-e7",
    "source_id": "artwork:fidenza-fixture",
    "target_id": "concept:plotter-drawing",
    "edge_type": "EMBODIES",
    "created_by": "contributor:ghost",
    "confidence": "medium",
    "valid_from": "2024-01-01",
    "valid_until": null,
    "invalidated_by": null,
    "signal_id": null
  },
  {
    "id": "fx-e8",
    "source_id": "practitioner:fixture-nees",
    "target_id": "practitioner:fixture-nees",
    "edge_type": "INFLUENCES",
    "created_by": "gatherer-enrichment",
    "confidence": "low",
    "valid_from": "2024-01-01",
    "valid_until": null,
    "invalidated_by": null,
    "signal_id": null
  },
  {
    "id": "fx-e9",
    "source_id": "artwork:starmirror-fixture",
    "target_id": "concept:plotter-drawing",
    "edge_type": "RELATED_TO",
    "created_by": "contributor:migration",
    "confidence": "medium",
    "valid_from": "2024-01-01",
    "valid_until": null,
    "invalidated_by": null,
    "signal_id": null
  },
  {
    "id": "fx-e10",
    "source_id": "practitioner:fixture-sofia",
    "target_id": "institution:moma-fixture",
    "edge_type": "EXHIBITED_AT",
    "created_by": "gatherer-enrichment",
    "confidence": "medium",
    "valid_from": "2024-01-01",
    "valid_until": null,
    "invalidated_by": null,
    "signal_id": null
  },
  {
    "id": "fx-e11",
    "source_id": "artwork:fidenza-fixture",
    "target_id": "artwork:schotter-fixture",
    "edge_type": "RESPONDS_TO",
    "created_by": "gatherer-enrichment",
    "confidence": "low",
    "valid_from": "2024-01-01",
    "valid_until": null,
    "invalidated_by": null,
    "signal_id": null
  },
  {
    "id": "fx-e12",
    "source_id": "practitioner:fixture-sofia",
    "target_id": "scene:tezos-fixture",
    "edge_type": "BELONGS_TO",
    "created_by": "contributor:migration",
    "confidence": "high",
    "valid_from": "2024-01-01",
    "valid_until": null,
    "invalidated_by": null,
    "signal_id": null
  }
]
```

**What each fixture edge triggers** (verifies the smoke test's coverage matrix):
- `fx-e1` + `fx-e2` together → C.1 id_collision (Untitled with 2 unrelated practitioners) AND C.2 forked_created_by sub-class `id_collision_overlap`
- `fx-e3` + `fx-e4` together → C.2 forked_created_by sub-class `platform_or_institution_as_creator`
- `fx-e5` → C.3 era_violation (1968 artwork → on-chain-generative-art concept)
- `fx-e6` → C.4 superseded_without_invalidator (valid_until set, invalidated_by null)
- `fx-e7` → C.5 unknown_contributor (`contributor:ghost`)
- `fx-e8` → C.6 self_loop (source == target)
- `fx-e9` → C.7 unknown_edge_type with `legacy_path_leak` annotation
- `fx-e10` → Section A: EXHIBITED_AT practitioner-source contradicts SKILL.md → schema_disagreement Finding for EXHIBITED_AT will show `documents_disagree: True`
- `fx-e11` → Section E: invitation_violated (RESPONDS_TO with 1 edge)
- `fx-e12` → counted in Section B conformance (BELONGS_TO practitioner→scene per all three docs)
- `institution:empty-fixture` (placeholder status, 0-degree) → Section E empty_stub_count includes this

- [ ] **Step 2: Write the smoke test**

Create `seed/_build/tests/test_smoke_end_to_end.py`:

```python
import sys, pathlib, subprocess, tempfile, json
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import normalize_output

FIXTURE_DIR = pathlib.Path(__file__).parent / "fixtures" / "schema_audit"
REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent.parent


def test_fast_tier_against_fixture_produces_expected_findings():
    """End-to-end: run audit against the fixture seed; assert key findings appear."""
    with tempfile.TemporaryDirectory() as tmp:
        result = subprocess.run([
            "seed/_build/.venv/bin/python3", "seed/_build/audit_schema.py",
            "--tier", "fast",
            "--seed-dir", str(FIXTURE_DIR),
            "--out-dir", tmp,
        ], capture_output=True, text=True, cwd=str(REPO_ROOT))
        assert result.returncode == 0, f"audit exited {result.returncode}: {result.stderr}"

        md_files = list(pathlib.Path(tmp).glob("SCHEMA_AUDIT_*.md"))
        assert len(md_files) == 1
        report = md_files[0].read_text()

        # Sanity checks per section
        assert "Section A: Schema disagreements" in report
        assert "EXHIBITED_AT" in report
        assert "Section C: Genuine bugs" in report
        assert "id_collision" in report
        assert "self_loop" in report
        assert "Section E: Invitations honored" in report
        assert "invitation_violated" in report  # RESPONDS_TO fixture edge


def test_double_run_is_byte_identical_after_normalisation():
    with tempfile.TemporaryDirectory() as tmp1, tempfile.TemporaryDirectory() as tmp2:
        for out in (tmp1, tmp2):
            subprocess.run([
                "seed/_build/.venv/bin/python3", "seed/_build/audit_schema.py",
                "--tier", "fast",
                "--seed-dir", str(FIXTURE_DIR),
                "--out-dir", out,
            ], capture_output=True, text=True, cwd=str(REPO_ROOT)).check_returncode()

        r1 = next(pathlib.Path(tmp1).glob("SCHEMA_AUDIT_*.md")).read_text()
        r2 = next(pathlib.Path(tmp2).glob("SCHEMA_AUDIT_*.md")).read_text()
        assert normalize_output(r1) == normalize_output(r2)
```

- [ ] **Step 3: Run + verify**

```bash
seed/_build/.venv/bin/pytest seed/_build/tests/test_smoke_end_to_end.py -v
```
Expected: 2 pass. If the first test fails with missing categories, the fixture is incomplete — go back to step 1 and add the missing nodes/edges.

- [ ] **Step 4: Final test run — all tests pass**

```bash
seed/_build/.venv/bin/pytest seed/_build/tests/ -v
```
Expected: all tests pass, under 30 seconds total runtime.

- [ ] **Step 5: Commit**

```bash
git add seed/_build/tests/fixtures/ seed/_build/tests/test_smoke_end_to_end.py
git commit -m "test: golden-file smoke test against hand-crafted fixture

Exercises every Section C category + Section A disagreement + Section E invitation_violated.
Determinism check via double-run with normalize_output.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 24: Produce the first real audit report

**Files:**
- Adds: `docs/SCHEMA_AUDIT_2026-05-24.md`
- Adds: `docs/schema_audit_2026-05-24/*.csv`

- [ ] **Step 1: Run the fast tier against the live seed**

```bash
npm run audit:schema:fast
```

- [ ] **Step 2: Sanity-check the report**

```bash
head -80 docs/SCHEMA_AUDIT_2026-05-24.md
ls docs/schema_audit_2026-05-24/
```
Verify Section A shows EXHIBITED_AT as a disagreement, Section C lists `artwork:untitled` as an id_collision, Section E confirms RESPONDS_TO/CONTESTS/TENSION_WITH counts are 0.

- [ ] **Step 3: Hand the artifact to the user**

Do **not** commit `docs/SCHEMA_AUDIT_2026-05-24.md` or the CSV directory automatically. The plan's commit-per-task convention applies to code and tests; the *output artifact* is generated by the tool and should be reviewed by Irina before being committed (since it will become a permanent record of the v1 graph's state). Surface to the user:

> The audit produced `docs/SCHEMA_AUDIT_2026-05-24.md` and the CSV directory. The first real run against the live seed is ready for your review. Do you want me to commit it, or do you want to read it and decide what to do with the findings first?

- [ ] **Step 4: Optional — only on user request, run the FULL tier**

If the user has `ANTHROPIC_API_KEY` set and wants Section D populated:
```bash
npm run audit:schema:full
```
Expected duration: 3-5 minutes. Cost: ~$1-2. Section D will append findings; subsequent runs hit the cache.

---

## Acceptance verification

After Task 24, walk through each acceptance criterion from the spec and confirm:

1. `npm run audit:schema:fast` completes under 30 seconds → run with `time` prefix to verify.
2. `npm run audit:schema:full` completes under 10 minutes, costs under $5 → verify only if user runs the full tier.
3. Fast tier produces Findings in Sections A, B, C, E → grep `docs/SCHEMA_AUDIT_2026-05-24.md`.
4. `pytest seed/_build/tests/` passes → run once more, confirm.
5. Re-running twice produces byte-identical normalised output → covered by `test_double_run_is_byte_identical_after_normalisation`.
6. Section E.invitations has zero `invitation_violated` rows in the real-seed report → grep for `invitation_violated` in the report.
7. `schema_contract.py` has all 14 entries with non-empty `ref` → covered by `test_every_edgeclaim_has_non_empty_ref`.

If any criterion fails, stop and surface the failure before declaring done.

---

## Notes for the implementing developer

- **TDD discipline.** Every task is test-first. If you're tempted to skip writing the failing test, stop — the test is what defines what "done" means for that step.
- **DRY across check functions.** Several checks index edges by source_id or by edge_type. Factor common indexing helpers into module-level functions if you find yourself copy-pasting. Don't pre-factor; do it when you write the third copy.
- **Don't merge files.** Resist the urge to put `schema_contract.py` and `audit_schema.py` together. The split exists so a future write-time enforcement layer can import `schema_contract.py` without pulling in the audit logic.
- **Cross-cutting rule: every metadata access goes through `_parse_metadata`.** The seed has ~513 nodes whose `metadata` field is serialised as a JSON string instead of a dict. Direct access (`node["metadata"]["status"]`) silently returns wrong results on those nodes — there is no schema enforcement to catch this. Always call `_parse_metadata(node)` first, then access keys on the returned dict. This applies to every check function, every loader, every renderer. If you add a new check that touches metadata, add a test that exercises the metadata-as-string case (a fixture with `"metadata": "{\"status\": \"x\"}"`).
- **File-size watch.** `audit_schema.py` accumulates across Chunks 2-8 to roughly 900-1000 lines. That's manageable as a single file. If it exceeds ~1200 lines after implementation (e.g. because additional checks landed), refactor into a `seed/_build/audit_schema/` package with one module per check (`checks/section_a.py`, `checks/c1_id_collisions.py`, etc.) — preserving the same public function names so the tests and `main()` don't need to change.
- **Commit per task.** Each task ends with a commit. The plan is granular enough that bisect will work.
- **C.3 coverage is ~25%.** Strict mode means only artworks with structured `metadata.year_start` are audited — ~183 of 728 as of 2026-05-24. The plan emits one summary `era_check_coverage` info finding so the gap is visible in the report. Don't drop the summary; don't add per-artwork skip rows back. If at some future point you want to expand coverage, the path is to add `year_start` to more nodes (or write a separate v2 normalisation pass), not to weaken the strict check.
- **No `--live` in CI.** The `--live` flag exists for ad-hoc inspection of prod; tests use local fixtures only.
- **Reference skills:** @test-driven-development, @verification-before-completion when finishing each task.
