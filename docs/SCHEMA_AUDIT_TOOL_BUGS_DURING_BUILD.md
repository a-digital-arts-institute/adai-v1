# Bugs caught while building the schema audit tool

**Date:** 2026-05-26
**Context:** Implementing the 24-task plan at [`docs/superpowers/plans/2026-05-24-schema-audit-tool.md`](superpowers/plans/2026-05-24-schema-audit-tool.md). This document tracks bugs found in the *audit tool itself* (or in its plan) during the build, by the code-quality-review subagents. Distinct from `SCHEMA_AUDIT_BUGS_BY_CAUSE_2026-05-26.md`, which lists bugs the finished audit found in the live graph data.

## Why this exists

Institutional memory. If anyone re-builds the schema-audit tool from a clean slate — or extends it into write-time enforcement — they will hit the same blind spots unless the lessons are recorded somewhere outside commit history. The pattern across all of these is one of two shapes:

1. **The plan's worked examples were authoritative, but the implementer subagents treated them as suggestions.** This produced eight separate empty-tuple-instead-of-direction bugs that all the reviewers missed at first, because the reviewers focused on whether the new entries were faithful, not on whether the worked-example template was consistently applied.
2. **The seed schema and the public API don't agree on field names or shape.** The plan was specced as if they did. Three bugs trace to that mismatch.

Total: 16 bugs/issues caught before merge — 13 in code or contract data, 3 in the plan itself. The code-quality reviewer subagent was the single highest-value step on the code-build side. The first FULL-tier run against live data caught two more bugs (8a and 8b) that no test had exercised because both required real-world inputs (a null `full_profile` in metadata; an actual Claude response with markdown fences).

---

## Bugs in the schema contract data (`schema_contract.py`)

These were not in code logic — they were in the machine-readable transcription of "what each schema document says." Each one would have produced wrong audit findings without a runtime error to make it visible.

### Bug 1 — STYLE_KIN and VISUALLY_AFFINE marked as undocumented in SOURCES.md when they are documented

**Caught by:** spec-compliance reviewer for Task 3.

**Symptom.** Two `EdgeClaim` entries had `sources_md = None`, meaning "SOURCES.md does not document this edge type." SOURCES.md does in fact document both, with explicit source/target types, in the "What the embedding pipeline produces" table at lines 309–310.

**What would have happened.** Section A of the audit would have reported "SOURCES.md is silent on STYLE_KIN" when it isn't. The whole point of Section A is to surface real disagreements between documents; a false `None` produces a fake disagreement.

**Fix.** Restored to `EdgeClaim(source_types=("practitioner",), target_types=("practitioner",), ...)` for STYLE_KIN, and `EdgeClaim(source_types=("artwork",), target_types=("artwork",), ...)` for VISUALLY_AFFINE, citing SOURCES.md lines 309 and 310 respectively.

**Commit:** `5ab9a54`.

### Bug 2 — Eleven `ref=` line citations pointed at the wrong lines

**Caught by:** code-quality reviewer for Task 3.

**Symptom.** Every `EdgeClaim` carries a `ref="…line N"` field so a maintainer can re-verify it against the source. Eleven of these were wrong: six in SKILL.md (off by one consistently — the implementer counted from the table header rather than reading the file line number) and five in SOURCES.md (two of which were transposed with each other).

The worst case: `EXHIBITED_AT.skill_md.ref` and `USES_TECHNIQUE.skill_md.ref` both said "SKILL.md line 220," which is actually `BELONGS_TO`. Two different edge types both pointing at a third edge type.

**What would have happened.** The whole point of the contract file is to be machine-readable AND hand-verifiable. Wrong line numbers undermine the verifiability without affecting runtime behaviour. They would also have fed wrong context into the Section D LLM cache key (the cache hashes `ref` strings, so any change would invalidate the cache — but the cache would be hashing wrong-by-content refs).

**Fix.** All 11 corrected with a one-shot edit driven by `grep -n` against the actual source files. Lock-in test would be useful future work (parse the source files at test time and assert each `ref` matches reality), not yet written.

**Commit:** `8fab68b`.

### Bug 3 — Eight `claude_md` entries had empty source/target tuples

**Caught by:** Task 8 implementer hitting a test failure (1 case); code-quality reviewer for Task 8 (7 more cases following the same pattern).

**Symptom.** Eight `EdgeClaim` entries had `source_types=()` and `target_types=()` — empty tuples — with descriptive text saying "CLAUDE.md only mentions the count, not the direction." The implementer's reasoning was honest: CLAUDE.md *does* in fact only mention `EXHIBITED_AT (305)` etc. as counts in the edge-types paragraph, without re-stating source/target types.

But the plan's *worked example* for EXHIBITED_AT specified `source_types=("artwork",), target_types=("institution", "platform")` for CLAUDE.md — meaning the plan author had decided CLAUDE.md inherits SKILL.md's direction by virtue of the shared seed-research-2025 narrative. The Task 3 implementer overrode the worked example with their own faithfulness call.

The Task 8 test caught the EXHIBITED_AT case (the test asserted `claude_md == 10.0` conformance, but empty tuples produce 0%). The code-quality reviewer for Task 8 then noticed the same pattern was repeated across seven more edge types: CREATED_BY, EMBODIES, PRACTICES, USES_TECHNIQUE, BELONGS_TO, COLLABORATES_WITH, INFLUENCES.

**What would have happened.** Every edge of those types in the live graph — 738 + 1096 + 461 + 102 + 193 + 183 + 4 = 2,777 edges — would have reported as 0% claude_md conformance. The `documents_disagree` flag would have fired on most of them, producing spurious "documents disagree" warnings in Section A that don't reflect real disagreements.

**Fix.** All seven entries restored to mirror SKILL.md's direction, with a note in the description that CLAUDE.md was silent on direction and we encoded the plan's evident intent. EXHIBITED_AT had a separate fix commit because it was caught first.

**Commits:** `f68232f` (EXHIBITED_AT), `486bd8d` (the other seven).

### Bug 4 — `"any"` wildcard sentinel was treated as a literal string

**Caught by:** code-quality reviewer for Task 8.

**Symptom.** CLASSIFIED_BY's three claims all use `source_types=("any",)` to mean "any node type." This is consistent with how SOURCES.md and CLAUDE.md write it. But the conformance check did `node_type in claim.source_types`, which only returns True when the node's type is literally the string `"any"`. No real node has that type.

**What would have happened.** All 295 CLASSIFIED_BY edges would compute as 0% conformant across all three documents. Because all three documents agreed on the same wrong-when-naively-evaluated tuple, the `documents_disagree` flag would *not* fire — so the audit would silently report 0% conformance with no warning of why. A quarter of the curated edge corpus, gone dark.

**Fix.** Added a `_types_match(node_type, claim_types)` helper that treats `"any"` in `claim_types` as a wildcard (matches any non-None node type). Applied in both Section A and Section B conformance loops. Pre-emptively threaded into Task 9 before the same plan-pattern repeated.

**Commit:** `5f9b9cb`.

---

## Bugs in the audit code (`audit_schema.py`)

These were in actual function logic.

### Bug 5 — `_parse_metadata` returned non-dict values

**Caught by:** code-quality reviewer for Task 6.

**Symptom.** The metadata parser was supposed to handle the seed's known issue where ~513 nodes store `metadata` as a JSON-encoded string instead of a dict. It correctly handled `"metadata": '{"status": "x"}'` (string-of-dict). It did **not** handle `"metadata": '"foo"'`, `'"42"'`, `"true"`, `"null"`, `"[1,2]"` — all valid JSON, all decode to non-dict values. The function then returned those non-dict values instead of falling back to an empty dict.

**What would have happened.** Every downstream check that does `metadata.get("status")` would have crashed with `AttributeError: 'str' object has no attribute 'get'` on the affected rows. The audit would have either fully aborted or — worse — silently skipped those rows depending on where the error landed.

**Fix.** Added an `isinstance(decoded, dict)` check after the JSON parse; non-dict decodes fall back to `{}`. Test added.

**Commit:** `756724c`.

### Bug 6 — `--live` mode produced zero edge findings, silently

**Caught by:** code-quality reviewer for Task 6.

**Symptom.** The audit's `--live` flag pulls the graph from the public `/api/graph` endpoint instead of local seed files. Local seed uses `{source_id, target_id, edge_type}`. The public API uses `{source, target, type}`. The implementer passed API edges through unchanged, so every downstream check that looks at `edge["source_id"]` would find a missing key and either crash or silently produce empty findings.

**What would have happened.** Anyone running `npm run audit:schema:fast --live` after a production deploy would see "zero findings" and conclude the live graph is clean — when in reality the audit didn't even look at any edges in the right shape.

**Fix.** `load_graph` now normalises edge field names from API format to seed format in the `--live` branch. Test added.

Also documented (in the same commit) that the public API strips node metadata, signal_id, valid_until, and other fields — making `--live` mode partial regardless. Six of the ten audit sections fundamentally cannot run in `--live` because the required fields aren't exposed by the public API.

**Commit:** `756724c`.

### Bug 7 — `detect_id_collisions` produced non-deterministic output

**Caught by:** Task 22 implementer running the determinism check.

**Symptom.** The `creators` list inside each id-collision Finding was built with `list(set(...))`. Python's `set` iteration order is not stable across runs, so successive audit runs produced different `creators` orderings — which propagated through the rendered report. The plan's acceptance criterion #5 says "re-running the audit twice in succession produces byte-identical output (modulo timestamps)" — that would have failed.

**What would have happened.** The audit would have appeared non-deterministic, breaking the golden-file smoke test and undermining the spec's reproducibility guarantee.

**Fix.** Changed `list(set(creators))` to `sorted(set(creators))`. The determinism check then printed `IDENTICAL`.

**Commit:** Part of `4984d6d` (the Task 22 main-wiring commit).

### Bug 8a — `check_narrative_mismatches` crashed on practitioners with `full_profile = null`

**Caught by:** the first FULL-tier run against the live seed (2026-05-26, after Task 24).

**Symptom.** `md.get("full_profile", {}).get("network_position", {}).get("scene_affiliation", "")` works fine when `full_profile` is missing (the `.get` default kicks in) and works fine when `full_profile` is a dict. It blows up with `AttributeError: 'NoneType' object has no attribute 'get'` when `full_profile` exists but is explicitly `null` in the metadata — because in that case `.get("full_profile", {})` returns `None`, not `{}`. At least one practitioner in the live seed had this shape.

**What would have happened.** The audit's FULL tier would have aborted with a traceback the first time it encountered such a practitioner. Section D would produce nothing.

**Fix.** Replaced the chained `.get` with explicit `or {}` guards at each nesting level:
```python
full_profile = md.get("full_profile") or {}
network_position = full_profile.get("network_position") or {}
prose = network_position.get("scene_affiliation") or ""
```

**Lesson.** `dict.get(key, default)` returns the default only when the *key is missing*. When the key is present with value `None`, the default is not used. Anywhere we chain `.get` calls on optional sub-objects, this trap is one practitioner away.

**Commit:** `47fe775`.

### Bug 8b — Anthropic responses are wrapped in markdown code fences

**Caught by:** the first FULL-tier run, immediately after fixing Bug 8a.

**Symptom.** The narrative prompt says "Respond with ONLY the JSON object, nothing else." `claude-haiku-4-5` ignored that and wrapped every response in `` ```json … ``` `` markdown fences. `json.loads()` then failed on the leading backticks. All 43 practitioners with prose silently became `section_d_incomplete` warnings with the same error message ("Expecting value: line 1 column 1 (char 0)").

**What would have happened.** Without the wrapper fix, Section D would have shipped 43 warnings and zero actual mismatch findings — the most valuable section of the audit would have produced no usable output.

**Fix.** Added `_extract_json(text)` helper that strips leading/trailing code fences, finds the first `{`, bracket-matches to the closing `}`, and returns just the JSON substring. Added 5 unit tests covering: plain JSON, ```json fences, unlabelled ``` fences, prose-before-object, and nested braces.

**Lesson.** Even with explicit instructions to return raw JSON, frontier-model responses can include framing. Robust LLM JSON parsing needs a wrapping layer; don't trust the prompt alone. Consider adding `response_format={"type": "json_object"}` to future calls if the SDK supports it.

**Commit:** `47fe775`.

---

### Bug 9 — npm scripts placed at the top of `package.json` instead of the end

**Caught by:** controller spot-check after Task 2 implementer reported done.

**Symptom.** The plan said "Maintain alphabetical ordering of script keys if the existing file is alphabetised; otherwise add at the end." The existing scripts in `package.json` were grouped, not alphabetised. The implementer added the new audit scripts at the top anyway.

**What would have happened.** Cosmetic — npm doesn't care about script order. But the file would have diverged from project convention.

**Fix.** Moved the two scripts to the end of the `scripts` object.

**Commit:** `6fcc15b`.

---

## Plan-level issues (environmental, surfaced during build)

These weren't bugs in the *code*; they were assumptions in the plan that didn't hold for this machine.

### Issue 10 — `seed/_build/.venv/` referenced everywhere didn't exist

**Symptom.** CLAUDE.md and the plan both refer to `seed/_build/.venv/bin/python3` and `seed/_build/requirements.txt` as if they exist. On this checkout, neither did. The plan's Task 1 Step 1 begins with `cat seed/_build/requirements.txt` — would have errored.

**Fix.** Bootstrapped both before starting Task 1: `python3 -m venv seed/_build/.venv` and seeded `requirements.txt` with the third-party imports existing gatherer scripts already use (`pyyaml`, `numpy`, `requests`).

**Lesson.** The plan should have a pre-Task-1 environment-bootstrap step that creates the venv and requirements.txt if missing.

**Commit:** `5238878`.

### Issue 11 — Plan + spec documents were untracked files in main's working tree

**Symptom.** `docs/superpowers/plans/2026-05-24-schema-audit-tool.md` and `docs/superpowers/specs/2026-05-24-schema-audit-design.md` existed in the working directory but had never been committed to any branch. If the directory had been cleaned, they would have been lost.

**Fix.** Committed both onto the feature branch at the start of the work.

**Lesson.** Brainstorming and writing-plans skills should commit their outputs immediately, not leave them as untracked files in the working tree.

**Commit:** `3edec59`.

### Issue 12 — Plan oversold `--live` mode

**Symptom.** The plan presents `--live` as a peer of the local-seed audit path: "the audit can be run against production after deploys." Reality (discovered while fixing Bug 6): the public `/api/graph` endpoint strips out node metadata, `signal_id`, `valid_until`, `event_time`, `invalidated_by`, and a few other fields. Six of the ten audit sections — Section B (mostly), Section C.1, C.3, C.4, C.5, and Section D, plus part of E — fundamentally cannot run against the public API regardless of any field normalisation.

**Fix.** Documented the limitation in `load_graph`'s docstring. `--live` mode is realistic as a deploy spot-check ("did node counts move?") but cannot be a full audit substitute.

**Lesson.** If `--live` is ever meant to be a first-class audit path, the public API needs to expose more fields, or the audit needs to authenticate and use a different endpoint.

**Commit:** Same as Bug 6 — `756724c`.

---

## Recurring patterns

**Pattern A — Worked examples treated as suggestions, not templates.** Bugs 1, 3, and the seven look-alikes of Bug 3 are all the same shape. The plan author had encoded the EXHIBITED_AT worked example with CLAUDE.md mirroring SKILL.md's direction. The implementer over-corrected with empty tuples in eight places. Two reviewers in Task 3 missed it because they were focused on the *new* entries' faithfulness, not on whether the worked-example *template* was consistently applied.

If you re-run this kind of plan in the future: tell the implementer subagent explicitly that worked examples are mandatory templates, and tell the spec-reviewer subagent to check that subsequent entries follow the template's shape.

**Pattern B — Seed format and public API format don't agree.** Bugs 5, 6, and Issue 11 all trace to this. The audit was specced as if `load_graph(seed_dir)` and `load_graph(live_url)` were symmetric. They aren't, because the public API was designed for a frontend graph viewer, not for an audit tool. Either the API needs to expose audit-required fields (gated behind a write-scope token) or `--live` needs to be downscoped in the spec.

**Pattern C — Code-quality reviewer caught more than spec-compliance reviewer.** Across 24 tasks, the spec-compliance reviewer found one substantive issue (Task 3 Bug 1). The code-quality reviewer found Bugs 2, 3, 4, 5, 6. The pattern: spec compliance review is reliably skippable when a task has a verbatim code block in the plan, because there's nothing for the implementer to be non-compliant about. Code quality review is where the real value sits.

For future plans of this shape: drop spec-compliance review on verbatim-code tasks and keep code-quality review on every task with real logic.

---

## How many of these would have shipped?

Of the 13 bugs/issues above:

- 6 (Bugs 5, 6, 7, 8a, 8b, 9) would have produced wrong or non-functional output but with detectable symptoms — would have been caught in any human run-through.
- 4 (Bugs 1, 2, 3, 4) would have produced *silently* wrong audit findings in Section A and Section B. No runtime error, no crash, just wrong numbers in a report meant to drive v2 reseed decisions. These are the most consequential — none would have been caught by integration testing because they're not behavioural bugs, they're correctness-of-the-data-model bugs.
- 3 (Issues 10, 11, 12) are plan-level. Would have surfaced as friction for the next person picking up this work.

The code-quality reviewer earned its keep specifically on the silent-correctness bugs. The two FULL-tier bugs (8a, 8b) also reinforce that real-data testing catches things mocked-client tests can't.

**Cost of catching them:** roughly 4 review subagent dispatches across 24 tasks (Tasks 3, 6, 8 had code-quality review; one Section D bug caught during build by a test failure on first FULL run). The catches more than paid for the review time — the silent-correctness bugs would otherwise have shipped wrong numbers in a report meant to guide significant downstream decisions about the v2 reseed.
