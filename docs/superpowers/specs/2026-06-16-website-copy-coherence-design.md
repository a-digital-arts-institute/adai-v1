# Website copy & IA coherence — design spec

**Date:** 2026-06-16
**Status:** Approved direction; awaiting spec review + user sign-off before writing-plans.
**Scope:** Copy and information-architecture only. No visual redesign, no new marketing landing page, no interaction-model changes.

## 1. Problem

The `/field` site (served on digitalartsinstitute.io) carries the right visual language — dark, sparse, terminal/protocol feeling — but its **copy is fragmented**. Six surfaces each open with a *different* name for the same thing (philosophy panel "A Digital Arts Institute", seed-thesis "The shape of a field", co-governance "A commons, not a platform", contribute walkthrough, brand, guide). There is no single canonical narrative, no reading order, and the coherent v1.0-beta whitepaper is not represented on the site at all. Copy is also, in places, too slogan-like — it doesn't carry the whitepaper's nuance.

## 2. Goals / non-goals

**Goals**
- Make the whitepaper the single source of truth; make on-site surfaces coherent doorways into it.
- "Sparse at the surface, deep when opened." A visitor understands within ~1 minute: what A(DAI) is, why it matters now, why artists should care, why machines are bounded, and how to go deeper.
- Preserve the existing dark protocol aesthetic and interaction model exactly.

**Non-goals**
- No redesign of the graph, panels' visual system, or nav interaction.
- No marketing landing page.
- No new Pixel Symphony card/panel (integrate into brand page only).
- Do not put the whole whitepaper into the main modal.

## 3. Target information architecture (layered depth)

```
0  SURFACE            the field graph (unchanged)
1  PHILOSOPHY PANEL   250–400 words + 8 principles   (the one-minute answer)
2a SEED THESIS page   600–900 words                  (the seed, provisional & honest)
2b PROTOCOL           600–900 words                  (governance as stewardship)
   STEWARDSHIP page
3  WHITEPAPER page    full canonical text            (the source of truth)
   CONTRIBUTE modal   unchanged flow + 1 framing line
   BRAND page         values/tone + Pixel Symphony proof point
```

The philosophy panel links out (buttons) to: **Seed Thesis**, **Protocol Stewardship**, **Read the Whitepaper**.

## 4. Decisions (locked)

1. **Whitepaper** → new on-site page `public/field/whitepaper.html`, dark protocol style, lightly cleaned. (Not an external link.)
2. **co-governance → Protocol Stewardship** → new file `public/field/protocol-stewardship.html`; `co-governance.html` becomes a tiny client-side redirect so old links survive; philosophy-panel button + label updated.
3. **Whitepaper link placement** → a button in the philosophy panel only (next to Seed Thesis / Stewardship). Not added to the top nav.
4. **Stats** → the numeric "Beta Opening" block (node/edge/signal counts) is **removed**. Keep the qualitative lines (what the graph can answer; reserved edge types at zero).
5. **Whitepaper text** → use the latest version supplied 2026-06-16 (Artists + Collectors lines expanded), with the cleanup rules in §11 applied.

## 5. Philosophy panel rewrite (`public/field/field.js`)

**Fully replace** the current WHAT/WHY/HOW/NEXT body **and** the current 7-principle list with the copy below — this is a wholesale rewrite of the panel body, not an additive edit. Keep only the panel chrome: `.ph-*` styling, eyebrow `[philosophy]`, title "A Digital Arts Institute", the section-label + `.ph-line` structure, and the button row. The principle list becomes the **8** below; note that `01` rewords the current "Plurality as **constraint**" → "Plurality as **architecture**", and a new `06 Machines assist; humans author meaning` is inserted, pushing "Commons without enclosure" → `07` and "Where language fails" → `08`.

**WHAT**
> A(DAI) is an open protocol for the digital arts: a shared meaning layer for a networked, agent-readable age.
>
> It helps artists, curators, galleries, archives, platforms and researchers connect knowledge across the field while preserving many canons, vocabularies and centres.

**WHY**
> Digital art already has galleries, museums, platforms, festivals, archives and communities doing important work. A(DAI) creates connective tissue between them.
>
> As culture becomes machine-readable, the field needs ways to structure its own meaning through context, testimony, provenance and relation.
>
> A(DAI) connects the people, places and systems already carrying the field, so knowledge can move between them without losing its tensions.

**HOW**
> A(DAI) builds provenance of meaning: who says a work matters, why, from what position, and on what basis.
>
> The protocol privileges relational density over quantified attention: interviews, essays, exhibitions, testimony, research, concepts, techniques, scenes and tensions.
>
> It is infrastructure for meaning: a commons where context can accumulate, remain attributable and be revised over time.

**PRINCIPLES**
```
01 Plurality as architecture
02 Artists as sovereign
03 Tensions held open
04 Provenance as ethics
05 Intention over attention
06 Machines assist; humans author meaning
07 Commons without enclosure
08 Where language fails
```

**NEXT**
> A provisional canon, built to be contested, forked and improved.
> A select cohort of artists, curators and institutions will help seed the graph and shape protocol stewardship.
> Each contribution stays attributable, consent-bound and correctable.

**Note on the old "flattening" line:** the current WHY contains "No single institution holds that tension without flattening it. The field needs a native one." Because the whole body is replaced, that line is simply gone. It is reframed positively by the third WHY paragraph above ("A(DAI) connects the people, places and systems already carrying the field, so knowledge can move between them without losing its tensions."). No separate find-and-replace is needed. Tone note: the whole panel defines A(DAI) by what it *does* (connect, preserve, structure), not by what it refuses.

**Buttons (bottom of panel):**
- Keep **Read the Seed Thesis →** (`/field-static/seed-thesis.html`).
- Rename the Co-governance button → **Protocol Stewardship →** pointing at `/field-static/protocol-stewardship.html`. Drop the "Pre-seed" suffix from the button label (provisional status lives inside the page).
- Add **Read the Whitepaper →** (`/field-static/whitepaper.html`).

**Copy-length watch:** WHAT/WHY/HOW/8 principles/NEXT is near the modal's upper bound. Keep sentences short; the panel scrolls, so this is acceptable, but avoid adding further prose.

## 6. Contribute modal (`public/field/field.js`)

Keep the "Set up once. Then just talk." walkthrough exactly. Prepend one framing line at the very top of the scroll body (before "Curate A(DAI) in plain language…"):
> Contribution is a way to place knowledge into the commons with attribution, consent and the right to withdraw.

## 7. Seed Thesis page (`public/field/seed-thesis.html`)

Rewrite the body to the following. Keep the dark `.ph-*` page shell, eyebrow `[seed thesis]`, footer, and background.

**Title:** Seed Thesis

**Opening**
> The seed is a starting map: documented, partial, shaped by what public records make visible, and open to correction.
>
> Its purpose is to make the first structure legible enough to contest. A good seed invites disagreement, extension and repair.

**WHAT ENTERS**
- verified artworks, practitioners, exhibitions, concepts, platforms and institutions
- documented claims with source trails
- records from licensed / open / replicable sources
- post-launch contributions as signals with provenance and consent

**WHAT REQUIRES ATTESTATION**
- influence
- intent
- response
- contestation
- sensitive context
- claims grounded in lived experience

**WHAT THE SEED MAKES VISIBLE**
- where records are dense
- where histories are missing
- where vocabulary breaks
- where practitioner testimony is needed
- where the field is ahead of the archive

**Core sentence (pull line):** The protocol prefers a visible gap over a fake link.

**End**
> The seed is a beginning, not a verdict. It exists to be corrected, extended, forked and argued with.

Footer link: keep "A(DAI) · digitalartsinstitute.io" → https://digitalartsinstitute.io/.

## 8. Protocol Stewardship page (`public/field/protocol-stewardship.html`, new)

New page built from the co-governance shell (same styling, eyebrow becomes `[protocol stewardship]`). `co-governance.html` is replaced by a minimal redirect to this page.

**Title:** Protocol Stewardship

**Opening**
> A(DAI) begins with a founding architecture, but should not remain governed by founding authority.
>
> Protocol stewardship is the process by which artists, curators, researchers, institutions and technical maintainers turn open boundaries into working rules.

**WHO STEWARDS**
> Artists, curators, researchers, institutions, technical maintainers and partner communities participate as the contributor base grows.

**WHAT THEY STEWARD**
- merge rules
- classification regimes
- first-person testimony
- contested claims
- machine-derived proposals
- consent and revocation
- fork and federation norms
- funding and labor commitments

**WHAT THEY DO NOT STEWARD**
- an artist's intent on behalf of the artist
- one official canon
- market rankings
- machine-inferred influence
- private extraction of testimony

**OPEN BOUNDARIES**
> Several hard questions remain open by design: semantic disagreement between instances, scalable review of machine proposals, erasure when graph structure reveals identity, relational consent for contested claims, and fair compensation for testimony and review labor.
>
> These are not bugs hidden by the system. They are the first mandate of the Protocol Stewards.

**co-governance.html redirect:** replace file contents with a minimal HTML doc that `<meta http-equiv="refresh">` + JS `location.replace('/field-static/protocol-stewardship.html')`, plus a fallback link. No styling required.

## 9. Whitepaper page (`public/field/whitepaper.html`, new)

Render the **latest (2026-06-16) whitepaper text**, cleaned per §11, in the dark protocol style (reuse the seed-thesis/co-governance `.ph-*` shell, but allow a wider column and section headings for long-form). Structure preserved from the source:

Protocol Metadata · Abstract · Why an Institute, Why Now? · The Founding Question · An Extitution for a Networked Field · Post-Web, Agent-Native, Human-First · Starting Design Principles · The Artist-First Value Proposition (incl. Beta Deliverables table, Pixel Symphony) · Who Decides What the Graph Can Say? / Roadmap to Decentralized Governance · Shipped vs. Pending Matrix (3-col table) · Consent, Erasure, and Continuity · Economics Without Capture · Seed Method + Four Core Source Principles · Open Boundaries for the Protocol Stewards · The Beta Opening (stats removed) · Next 3 Months Roadmap · Glossary.

Eyebrow `[whitepaper]`, title "A Commons for the Digital Arts", subtitle "A(DAI) Protocol — Version 1.0-beta, July 2026". Footer link to digitalartsinstitute.io.

The canonical source text (latest version) to render is stored with this spec context; implementation must use it verbatim except for the §11 cleanups.

## 10. Brand page (`public/field/brand.html`)

Keep the existing brand system content. Integrate **Pixel Symphony** as a short artist-first proof point — no new card/panel — placed after the artist-sovereignty / intention-over-attention framing (or near "the interface becoming infrastructure for meaning"):

> Pixel Symphony is A(DAI)'s first artist-in-residence: an artist working with the front end as artwork, studio instrument and research method for testing how a cultural graph can be seen, heard, questioned and recomposed.
>
> The residency shows what artist-first infrastructure means in practice: artists are not data sources; they are co-authors of field intelligence.

## 11. Whitepaper cleanup rules

Apply to the latest text when building `whitepaper.html`:
- "A(DAI) is co-designing and developing a new institutional form…" → **"A(DAI) is building a new institutional form…"**
- Extitution reference: render cleanly — "A(DAI) is better understood as an **extitution** than as a traditional institution." Remove the "(referencing Primavera and Marc)" placeholder. (Glossary already defines extitution.)
- **Remove** the numeric "Beta Opening" stats block (4,819 nodes / 31,536 edges / 571 signals / 0 queue). Keep the surrounding qualitative sentences (what the graph can answer today; RESPONDS_TO / CONTESTS / TENSION_WITH at zero pending testimony).
- "Who Decides What the Graph Can Say?" — the source line "A(DAI) separates three distinct kinds of knowledge:" is incomplete (no list follows). Remove that dangling sentence and let the section lead into the Roadmap; do not invent the three kinds.
- Use **"Protocol Stewards"** (never "Governance Council").
- Ensure **"a canon, not the canon"** appears prominently (it is already carried in the panel/pages; keep the whitepaper's "a seed canon, not the canon").
- Do **not** mention Alex Estorick or Georg Bak (not present — keep it that way).
- Keep Beta Deliverables + Shipped/Pending as real tables.

## 12. Tone & copy rules (apply everywhere)

- Precise, spare, philosophical, legible. No hype. Short sentences.
- Do not imply existing institutions have failed — A(DAI) complements them.
- Avoid "AI database" framing — this is institutional/protocol/cultural infrastructure.
- "Machines can sense; humans author meaning" recurs as a principle.
- Use "A(DAI)" consistently. Prefer "digital arts" for the field broadly; "digital art" acceptable in short phrases.
- Keep modal/panel copy compact.

## 13. Navigation / labels

- Top nav unchanged: `sense · query · contribute · philosophy · brand`.
- Philosophy panel buttons: Seed Thesis, **Protocol Stewardship** (renamed), **Read the Whitepaper** (new).
- No "whitepaper" or "stewardship" item added to the top nav.

## 14. Cache-busting & deploy

- `field.js` is served `immutable, max-age=1yr` via a `?v=` query in `index.html`. Bump the tag when the panel copy changes: current is `field.js?v=20260616a` → set **`?v=20260616b`** (a plain date bump would collide with today's existing tag and be a no-op).
- New `.html` pages (whitepaper, protocol-stewardship) are served `no-cache` (revalidate) — no version tag needed; they reach visitors on next load.
- `co-governance.html` redirect is `no-cache` too — fine.
- Deploy is manual (`just deploy`); merging to `main` does not deploy.

## 15. Verification

- `node -c public/field/field.js` parses after edits.
- Each new/edited page opens standalone (relative bg path resolves) and matches the dark shell.
- Philosophy panel: 3 buttons present and pointing at the right routes; the "connective tissue" line replaced the old one; 8 principles.
- `co-governance.html` redirects to `protocol-stewardship.html`.
- Whitepaper page: no numeric stats block; no placeholder text; grammar fixes applied.
- Whitepaper page: the two tables (Beta Deliverables; Shipped/Pending 3-column) render, and the long-form column width + tables are readable on mobile (tables scroll or reflow; no horizontal page scroll).
- Contribute modal: framing line present above the walkthrough.
- Brand page: Pixel Symphony integrated inline (no new card).

## 16. Delivery / reporting

On completion report: files changed, major copy changes, any unclear files/routes, and any copy that still feels too long for modal UI. Ship as one PR off `main` (frontend-only, `public/field/*` + `index.html` cache bump). Two new files, several edits.

## 17. Risks / open items

- Philosophy panel length is near the modal ceiling; may need a light trim after seeing it rendered.
- Whitepaper page long-form styling needs a slightly wider/scrollable treatment than the short panels — verify readability on mobile.
- The incomplete "three kinds of knowledge" is dropped, not authored; if the team wants those three defined, that's a follow-up copy task.
