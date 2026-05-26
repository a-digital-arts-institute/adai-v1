# Schema audit findings — bug → cause → fix

**Date:** 2026-05-26
**Companion to:** [`SCHEMA_AUDIT_2026-05-26.md`](SCHEMA_AUDIT_2026-05-26.md)
**Also see:** [`ENRICHMENT_AUDIT_2026_05_20.md`](ENRICHMENT_AUDIT_2026_05_20.md) — the prior hand-audit of the gatherer-enrichment pass

## How to read this

The audit reports symptoms — "X edges don't conform to document Y" or "node Z has multiple unrelated creators." This document maps those symptoms back to **which gatherer or contributor produced the bad data**, and proposes a concrete fix.

Provenance discipline pays off: every edge in the graph carries a `created_by` field naming its origin. So every audit finding can be traced to one of:

- **`contributor:migration`** — the original April 2026 seed-research-2025 migration. Author of the bulk of the v1 graph.
- **`gatherer-enrichment`** — the AI-enrichment pass tagged `enrichment-seed-canon-v1-2026-04`. ~722 edges. Already audited at `docs/ENRICHMENT_AUDIT_2026_05_20.md`; this run confirms and extends those findings.
- **`gatherer-moma-digital-v3`** — MoMA Collection CSV ingest, third pass.
- **`gatherer-wikidata-v3b`** — Wikidata SPARQL ingest, third revision.
- **`gatherer-wikidata-named-anchors`** — Wikidata pass targeted at named canonical anchors.
- **`gatherer-objkt-tags-v3`** — Tezos NFT marketplace (`objkt.com`) tag scraper.
- **Other gatherers** (Art Blocks, fxhash, etc.) — produced no findings in this audit.

Headcount: 9 actionable bugs in Section C, plus systemic disagreements in Sections A and B that originate from competing interpretations baked into different gatherers.

---

## Bug 1 — `USES_TECHNIQUE` direction is wrong everywhere

**What the audit says.** Section A: 102 `USES_TECHNIQUE` edges, all artwork→concept. SKILL.md and CLAUDE.md both say USES_TECHNIQUE is **practitioner→technique**. So 0% conform to SKILL.md and CLAUDE.md; 100% conform to SOURCES.md (which says artwork→concept).

**Cause.** Two gatherers, same misreading of the schema:

| Gatherer | Edges |
|---|---:|
| `gatherer-enrichment` | 75 |
| `gatherer-moma-digital-v3` | 27 |

The prior `ENRICHMENT_AUDIT_2026_05_20` already documented the gatherer-enrichment portion (Finding 1) as a 100% violation of the SKILL.md rule. This audit confirms it AND newly flags the 27 from `gatherer-moma-digital-v3` — the same misreading happened independently in two places.

There is no `technique` node type in the canonical type list (only `concept`). That's part of why both gatherers ended up emitting `artwork→concept`: the type SKILL.md prescribes literally doesn't exist as a node type. SOURCES.md (line 300) updated the contract to match reality. SKILL.md and CLAUDE.md did not.

**Fix.** One of these, by decision:

- **Repair SKILL.md and CLAUDE.md.** Change the documented direction for USES_TECHNIQUE to `artwork→concept` so the docs agree with the data and with each other. Cost: doc edit. No data movement.
- **Repair the data.** Re-encode all 102 edges as `practitioner→technique` requires inventing the `technique` node type and re-running both gatherers with new logic. Cost: high. Risk: bigger.

Recommendation: repair the docs. Section B already shows SOURCES.md at 92.9% vs SKILL.md/CLAUDE.md at 82.0% — the seed has been built to the SOURCES.md contract, and the other two docs have drifted.

---

## Bug 2 — `EXHIBITED_AT` direction disagreement: SOURCES.md vs SKILL.md/CLAUDE.md

**What the audit says.** Section A: 305 `EXHIBITED_AT` edges. SKILL.md and CLAUDE.md say `artwork→institution|platform`; SOURCES.md says `practitioner→institution`. **294 of 305 (96.4%) are practitioner-source** — they match SOURCES.md. Only 11 (3.6%) are artwork-source.

**Cause.** A single gatherer determined the outcome:

| Gatherer | Edges | Source type |
|---|---:|---|
| `gatherer-enrichment` | 291 | practitioner |
| `contributor:migration` | 9 | mostly practitioner |
| `gatherer-wikidata-v3b` | 4 | practitioner |
| `gatherer-wikidata-named-anchors` | 1 | practitioner |

`gatherer-enrichment` extracted exhibition data from practitioner-level CVs, not artwork-level provenance — so it emitted `practitioner→institution` ("this artist showed at this place") rather than `artwork→institution` ("this work was shown at this place"). That's a defensible reading of the underlying data sources, just not the reading SKILL.md and CLAUDE.md describe.

The 11 artwork-source edges that DO match SKILL.md likely come from the manual seed research (`contributor:migration`) where specific artwork-exhibition pairs were known.

**Fix.** Same decision as Bug 1:

- **Repair the docs.** Update SKILL.md and CLAUDE.md to describe `EXHIBITED_AT` as `practitioner→institution`. Acknowledge that artwork-level exhibition data is rarer and lives in a separate edge (or in extended metadata) when present.
- **Repair the data.** Re-extract 291 edges from gatherer-enrichment as artwork-level. Likely impossible — the source CVs name practitioner-level shows, not work-level placement at those shows.

Recommendation: repair the docs. The 11 artwork-source edges become a documented exception (or get a sub-type) rather than the "true" form.

---

## Bug 3 — `PRACTICES` non-conforming sources: 96 edges from collectives/platforms/institutions

**What the audit says.** Section A: 461 PRACTICES edges total. All three documents say `practitioner→concept`. 79.2% conform — meaning **96 edges have a non-practitioner source** (collectives, platforms, institutions, artworks, publications, projects).

**Cause.** All 96 come from `contributor:migration` — the original seed-research-2025 author. The migration encoded "X works with concept Y" for X = collective/platform/institution/etc. as PRACTICES, presumably because there was no better edge type at hand.

**Fix.** Add a new edge type, or extend PRACTICES.

Two clean options:

- **Extend PRACTICES to allow `collective | platform | institution | publication | project | artwork` as source.** Update SKILL.md, SOURCES.md, CLAUDE.md. Cheapest path. The semantics "X engages with concept Y" generalises naturally beyond practitioners.
- **Introduce a new edge type `ENGAGES_WITH`** for non-practitioner entities. More precise; bigger change. Requires re-encoding 96 edges.

Recommendation: extend PRACTICES. The plan for v2 reseed (out of scope here) can revisit whether `ENGAGES_WITH` is worth the precision cost.

---

## Bug 4 — `COLLABORATES_WITH` non-conforming sides: 43 edges

**What the audit says.** Section A: 183 COLLABORATES_WITH edges. All three documents say `practitioner ↔ practitioner`. 76.5% conform — meaning **43 edges have at least one non-practitioner side** (platforms, collectives, institutions, publications, projects).

**Cause.** All 43 come from `contributor:migration`. Same pattern as Bug 3: the original seed used COLLABORATES_WITH as a catch-all for "X did something with Y" when X or Y wasn't a practitioner.

The prior `ENRICHMENT_AUDIT_2026_05_20` noted that gatherer-enrichment had already reclassified *polluted* COLLABORATES_WITH edges into proper types (EXHIBITED_AT, INFLUENCES, BELONGS_TO) — but those 43 from migration weren't touched, presumably because they predate that enrichment pass and aren't obviously the wrong type, just the wrong source type.

**Fix.** Manual reclassification, edge by edge. Some are probably genuine (a publication co-published with a practitioner = could be `COLLABORATES_WITH` if the docs broaden the contract); others should become EXHIBITED_AT, BELONGS_TO, or new types.

CSV reference: `docs/schema_audit_2026-05-26/section_a_schema_agreement.csv` for the COLLABORATES_WITH row; cross-reference against `seed/edges.json` filtered by `created_by=contributor:migration` AND `edge_type=COLLABORATES_WITH` to get the 43 candidates.

---

## Bug 5 — `CREATED_BY` non-practitioner targets: 65 edges (overlaps with C.2)

**What the audit says.** Section A: 737 CREATED_BY edges. All three documents say `artwork→practitioner`. 91.2% conform — meaning **65 edges have a non-practitioner target** (collective, platform, institution, project, publication, artwork). Section C.2 also catches a subset of these as `forked_created_by` with sub-class `platform_or_institution_as_creator`.

**Cause.**

| Gatherer | Edges |
|---|---:|
| `contributor:migration` | 64 |
| `gatherer-enrichment` | 1 |

Same pattern as Bugs 3 and 4: the original migration encoded "X made Y" for non-practitioner X as CREATED_BY. The audit picks out the most visible cases in Section C:

- `artwork:chromie squiggle` → `platform:art blocks` AND `practitioner:snowfro`
- `artwork:fidenza` → `platform:art blocks` AND `practitioner:tyler hobbs`
- `artwork:future art ecosystems 4: art x public ai` → `institution:serpentine arts technologies` AND `publication:serpentine fae4...`
- `artwork:the hearth` → `artwork:starmirror ...` AND `artwork:the call ...` (yes, artwork-as-creator)

**Fix.** Per the audit's own recommendation (built into the `suggested_fix` field): **remap non-practitioner CREATED_BY to EXHIBITED_AT, PUBLISHED_ON, or DERIVED_FROM**. Specifically:

- `platform:art blocks → CREATED_BY` becomes `EXHIBITED_AT` (artwork was published on the platform).
- `institution:serpentine` and `publication:serpentine fae4` → CREATED_BY become EXHIBITED_AT and PUBLISHED_ON respectively.
- `artwork:the hearth` ← `artwork:starmirror` / `artwork:the call`: this is a sequel/series relationship; needs a new edge type like `PART_OF` or `FOLLOWS`, or should be modelled as both sharing a `project` node.

64 edges, mostly mechanical. Worth doing as a one-shot cleanup script rather than edge-by-edge curation.

---

## Bug 6 — `BELONGS_TO` looks clean

The audit shows 95.9% conformance across all three documents. The 4.1% gap is from CLAUDE.md and SKILL.md allowing `collective | scene` as targets while SOURCES.md only mentions `scene`. The data uses scene exclusively (193 edges, all scene). No bug — just a documentation tightening opportunity (SOURCES.md could acknowledge collective).

**Fix.** None required. Optionally add `collective` to SOURCES.md's BELONGS_TO row for completeness.

---

## Bug 7 — Two id collisions: `Untitled` and `Black Hole`

**What the audit says.** Section C.1: two artworks have generic titles AND multiple unrelated creators, suggesting the node is actually multiple distinct works fused into one.

| Node | Creators | Gatherers |
|---|---|---|
| `artwork:untitled` | Vera Molnar + Harold Cohen + American Artist | gatherer-enrichment + gatherer-moma-digital-v3 + gatherer-wikidata-v3b |
| `artwork:black hole` | Suzanne Treister + Addie Wagenknecht | gatherer-objkt-tags-v3 + gatherer-wikidata-v3b |

**Cause.** Multiple gatherers, working independently, all attached their "Untitled by X" or "Black Hole by Y" to the same id because the canonical id scheme (`<type>:<name>`) doesn't disambiguate generic names. The MoMA catalog has untitled works by Vera Molnar; Wikidata has untitled works by Harold Cohen; the enrichment pass attached American Artist (a contemporary practitioner whose actual artist name is "American Artist"). All three landed in the same `artwork:untitled` row.

Same shape for `artwork:black hole`: objkt scraped one, Wikidata scraped another, both got `<type>:<slug>`-keyed into one.

**Fix.** **Split the nodes** with disambiguated ids: `artwork:untitled--vera-molnar-1968`, `artwork:black-hole--treister-2010`, etc. Then re-attach each CREATED_BY edge to its correct disambiguated node. About 5 edges to move. Document the disambiguation convention in CLAUDE.md so future gatherers honour it.

Structural prevention: future ingest paths should refuse to attach to an existing node whose name matches `GENERIC_TITLE_DENYLIST` (pinned in `schema_contract.py`) without a disambiguating year or context. The audit just made this list machine-readable; a gatherer guard is a small follow-up.

---

## Bug 8 — `era_check_coverage` is 25.1%

**What the audit says.** Section C: 183 of 728 artworks (25.1%) have a structured `metadata.year_start` integer. The other 545 are excluded from the era-violation check: 57 have only `year_raw` (unstructured strings like "c. 1965"), 2 have only the `active_years` prose field, 486 have no year info at all.

**Cause.** Not a bug per se — this is informational. The gatherers are inconsistent about emitting structured years:

- MoMA CSV → mostly structured years
- Wikidata → some structured, some not
- gatherer-enrichment → frequently leaves years off entirely (the prior enrichment audit identified Schotter and others where the year was wrong or missing)
- Art Blocks / fxhash → varies

The 486 with no year info are mostly the auto-generated stubs (drafts and bridges).

**Fix.** Two paths, neither urgent:

- **Normalise unstructured years to structured.** A small pass over the 57 `year_raw` strings could lift "c. 1965" → `year_start: 1965` for many of them. Mechanical, ~1 hour of work.
- **Backfill the 486 bare nodes.** Requires upstream lookups, much more work, only useful if era-violation coverage matters for the v2 reseed.

Either way, the audit's coverage % goes up but no actual bugs surface unless year_start gets backfilled AND that backfill reveals pre-2009 artworks linked to crypto concepts. The prior enrichment audit found 1 such case (Schotter 1968 → on-chain) which has since been cleaned up; this audit finds zero violations against the 183 currently covered.

---

## Bug 9 — `gatherer-enrichment`'s 3 forbidden INFLUENCES edges *(carried over from prior audit)*

**What the audit says.** This audit shows 4 INFLUENCES edges with 100% conformance to all three docs — clean by direction. But the prior `ENRICHMENT_AUDIT_2026_05_20.md` (Finding 2) flagged that 3 of those 4 were emitted by `gatherer-enrichment` despite **CLAUDE.md and SKILL.md both forbidding auto-emission** of INFLUENCES without an attested URL.

The new audit didn't flag this because direction conforms — the new audit checks structure (source/target types), not the "needs attestation" rule. The forbidden-auto-emit rule is enforced at write time by the embedding-derive pipeline, but `gatherer-enrichment` predates that guard.

**Cause.**

| Source | Target | Created_by |
|---|---|---|
| `practitioner:sol lewitt` | `practitioner:casey reas` | `gatherer-enrichment` |
| `practitioner:gilbert simondon` | `practitioner:yuk hui` | `gatherer-enrichment` |
| `practitioner:augusto de campos` | `practitioner:waldemar cordeiro` | `gatherer-enrichment` |

All three are *plausible* art-historical lineages — exactly the trap the rule exists to catch (plausibility ≠ attestation).

**Fix.** Either (a) delete the 3 edges and let practitioner contributions re-add them with attested URLs at Basel, or (b) source the attestation now (each lineage is documented somewhere — finding the URL is a 30-minute task per edge).

**Audit improvement.** This bug is invisible to the current audit because the audit doesn't check `confidence` or `signal_id`. A future check could flag any `INFLUENCES` edge whose `created_by` starts with `gatherer-` and whose `signal_id` is null. Add to the C.5 provenance check as a follow-up.

---

## Bug 10 — 353 narrative-vs-edge mismatches (Section D, FULL tier)

**What the audit says.** After the FULL tier was run (claude-haiku-4-5, ~$0.07, 87 seconds), Section D produced **347 `claimed_but_unlinked` findings + 6 `linked_but_unclaimed` findings across 43 practitioners**. Each claimed_but_unlinked finding is a specific scene, institution, platform, or movement the practitioner's prose bio (`metadata.full_profile.network_position.scene_affiliation`) names but that is *not* represented as a `BELONGS_TO` or `CLASSIFIED_BY` edge in the graph.

Examples (truncated; full list in `docs/schema_audit_2026-05-26/section_d_claimed_but_unlinked.csv`):

| Practitioner | Missing edges (prose names them, graph doesn't) |
|---|---|
| Anna Ridler | Royal College of Art, Barbican, V&A, Serpentine, PHI Foundation Montreal, Ars Electronica |
| Brian Eno | Long Now Foundation, Tate, MoMA, Roxy Music, generative art movement, ambient music |
| Cao Fei | Venice Biennale (2003, 2007, 2015), Documenta, Serpentine Galleries, MoMA PS1, Centre Pompidou, UCCA Beijing, Vitamin Creative Space |
| Allison Parrish | Electronic Literature Organization, Counterpath, Processing/p5.js community, ITP/NYU, AI/ML art scene |
| American Artist | MoMA, Whitney, Queens Museum, Carnegie Mellon, Parsons, Rhizome network, post-internet art |

These are not invented by the model — they all appear in the practitioners' actual bio prose, which was written by humans during the seed-research-2025 pass.

**Cause.** The seed-research-2025 narrative captured each practitioner's positioning in fluent prose ("Active in the Tezos generative art scene; exhibited at Serpentine and Centre Pompidou; teaches at Goldsmiths"). The structured edge layer was populated separately, and only some of the prose-named entities became canonical nodes with edges. The gap between prose and edges is the gap between what the team *knows* about each practitioner and what the *graph* knows.

**Fix.** Two paths, complementary:

- **Mechanical pass for high-confidence cases.** For each `claimed_but_unlinked` finding where the named entity already exists as a node (e.g. `institution:moma` is a real node; "MoMA" in prose should add `EXHIBITED_AT`), generate a candidate edge with `confidence: medium` flagged for curator review. Roughly 1/3 of the 347 are nodes that already exist.
- **Curator triage for the rest.** The remaining 2/3 (scenes/institutions/movements not yet in the graph as nodes) need a human decision: create the node + edge, or note that the prose claim is too vague to model (e.g. "academic creative writing").

This is also the **single highest-value Basel-floor activity**: practitioners visiting the floor can confirm or contest each row in real time, turning prose into structured edges with attestation.

**Cost discipline.** The audit's Section D LLM call is cached per (practitioner, prose hash, edges hash, model id, prompt version, contract schema version). Re-running the FULL tier without changing any of those is free — only changed practitioners hit the API. A full re-cost happens when the prompt is revised (bump `NARRATIVE_PROMPT_VERSION`) or the model is changed.

The 6 `linked_but_unclaimed` findings (edges in the graph not corroborated by prose) deserve separate manual review — they may be over-eager gatherer attributions, or they may be prose gaps.

---

## What's clean (no findings, worth confirming)

- **Section C.4 bi-temporal integrity:** zero findings. `valid_from`, `valid_until`, `invalidated_by` are internally consistent across all 3376 edges. The supersession discipline has held up.
- **Section C.5 provenance:** zero findings. Every edge has a `created_by`; every contributor reference resolves; no dangling `signal_id`s.
- **Section C.6 self-loops:** zero. No edge has `source == target`.
- **Section C.7 unknown edge types:** zero. Every edge uses one of the 11 known types (`RELATED_TO` doesn't appear).
- **Section E invitations honoured:** RESPONDS_TO, CONTESTS, TENSION_WITH all at zero. The "two readings" design contract is intact.
- **`classification_regime:a(dai) seed canon v1 (april 2026)`:** Section A shows CLASSIFIED_BY at 100% conformance across all three documents. The April 2026 retirement of the earlier root regime stuck.

---

## How to use this document

For each bug above, the "Fix" paragraph is concrete enough to act on. Priority order, in my read:

1. **Bug 5 (CREATED_BY platform-as-creator) and Bug 7 (id collisions)** — most visible to graph readers, easiest to fix (about 70 edges combined), highest signal-to-noise.
2. **Bug 9 (forbidden auto-INFLUENCES)** — 3 edges, design-rule violation, important to clean before Basel where practitioners may see these and reasonably ask "you wrote this without asking me?"
3. **Bug 10 (Section D — 353 narrative-vs-edge mismatches)** — biggest source of work, but also the highest-value Basel-floor activity. The mechanical pass on the ~1/3 where the named entity is already a node can happen pre-Basel; the rest is curator triage.
4. **Bugs 1, 2, 3, 4 (Section A/B disagreements)** — documentation work, not data work. Likely best resolved by editing SKILL.md and CLAUDE.md to match what SOURCES.md says and what the data does.
5. **Bug 8 (era coverage)** — not urgent. Improves the audit's coverage but doesn't reveal new bugs until backfilled.

If you want a single cleanup script: `scripts/cleanup_v1_audit_findings.py` could mechanically apply the Bug 5 and Bug 7 fixes (the rest need judgment). Pre-launch, before Basel.

For tracking: each finding has a stable subject_id and a CSV row. After cleanup, re-run `npm run audit:schema:fast` and the bug-class finding should disappear from the new report.
