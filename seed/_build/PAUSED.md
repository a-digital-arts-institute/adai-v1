# Paused gatherers / outputs that violated rules

Irina's 2026-05-20 enrichment-pass audit identified two ad-hoc gathering
operations that emitted rule-violating edges into `seed/edges.json`:

| `created_by` | Output | Why it's paused |
|---|---|---|
| `gatherer-enrichment` (the INFLUENCES subset only — the EMBODIES subset stays live) | 3 INFLUENCES edges tagged `"Kept-stub anchor rule: target is a historical-influence stub preserved for INFLUENCES"` | INFLUENCES requires attested artist intent (statement, interview, first-person attestation) per `SKILL.md` §1.4 and `seed/README.md`. The "Kept-stub anchor rule" applies that edge type by heuristic — exactly what the policy forbids. |
| `gatherer-theorist-completion` | 5 BELONGS_TO edges placing theorists (Galloway, Hayles, Chun) in scenes | Contradicts `seed/COVERAGE.md:119` which records the Task 4 audit decision: *"Removed digital-arts theory (theorists positioned via INFLUENCES)"*. The committed decision is that theorists are not scene members; they're positioned by intellectual influence. |

Both gatherers' producing scripts are **not committed to this repo** —
the rows were applied by ad-hoc one-shots whose source code isn't
recoverable. The 8 rows were retired by
`seed/_build/task6_audit_cleanup_2026_05.py` on 2026-05-20.

## If you want to revive either pattern

Don't paste an ad-hoc script over the canon. Land the producer code in
`seed/_build/` for review (same shape as `task1_exhibited_at.py` etc.)
and gate on:

1. **The defense-in-depth guards in `src/utils/edge-types.ts` exist on
   the running deploy.** Those guards make `POST /api/v1/edges` (and the
   seed loader) reject violations of edge-type direction, the
   INFLUENCES/RESPONDS_TO URL-attestation requirement, and the pre-2009
   artwork → crypto-concept era check. If the running code doesn't
   enforce them, fix that first.

2. **For INFLUENCES specifically:** every row must carry a `source_url`
   anchoring the artist's statement / interview / catalogue text that
   asserts the influence. No URL → not an INFLUENCES edge. This is the
   policy; the guard enforces it.

3. **For theorist positioning:** if you want a structural place for
   theorists, propose a new edge type (e.g. `THEORISES` —
   practitioner → concept) rather than shoehorning them into
   BELONGS_TO. Decisions like that go through the same review loop as
   any other vocabulary change.

## Cross-references

- Root-cause fix for the third bucket (75 USES_TECHNIQUE from artwork
  sources): `seed/_build/task3_embodies.py` v3 — that one's been
  defanged at source.
- Reproducible cleanup of all three buckets:
  `seed/_build/task6_audit_cleanup_2026_05.py`.
- Runtime guards: `src/utils/edge-types.ts`,
  `src/routes/contributor-api.ts` (`POST /api/v1/edges`),
  `src/seed-consolidated.ts` (edge insert loop).
