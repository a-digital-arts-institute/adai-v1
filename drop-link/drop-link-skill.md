# Skill: Drop a Link

`skills/drop-link.md` · A(DAI) · Signal intake via Claude interface

---

## Purpose

Accept a URL from a team member and produce a valid signal file for `/inbox/` — matching the schema that the nightly pipeline expects. This is the team's internal intake channel. The website UI (`drop-link.html`) serves public contributors; this skill serves Iri, JB, and the team directly from Claude.

Both converge at `/inbox/`. The pipeline does not distinguish between them.

---

## Trigger

Use this skill when someone says:
- "Drop this link: [url]"
- "Add this as a signal: [url]"
- "Contribute this to the graph: [url]"
- "Log this signal: [url]"
- Any variation where a URL is provided and intake is intended

---

## Inputs

| Field | Required | Notes |
|---|---|---|
| `url` | Yes | The URL to ingest |
| `note` | No | Why it's interesting / what to pay attention to — carried as contributor note |
| `submitted_by` | No | Defaults to `"team"` if not provided |
| `protocol_stage` | No | Defaults to `SENSE` — only override if clearly at a different stage |
| `intelligence_tier` | No | Defaults to `secondary` for web links — override to `primary` for lived-experience sources |

---

## Behaviour

### Step 1 — Acknowledge and fetch
Confirm the URL was received. Attempt to infer the title, author, and a brief description from the URL itself or any context the user provides. Do not fabricate specifics — if uncertain, leave the title as the domain + path and flag it.

### Step 2 — Classify
Before writing the file, make a quick editorial judgement:
- What `source_type` is this? (`bookmark` for general web links, `article` for journalism/essays, `observation` for documentation/project pages)
- What `cla_layer` does it most likely touch? (`litany` = surface facts/news, `social` = structural patterns, `discourse` = conceptual vocabulary, `myth` = values/worldview)
- Is there a named practitioner, scene, or concept already visible from the URL or note?

State these briefly to the user before writing — one line each. This keeps provenance honest and gives the user a chance to correct before the file is written.

### Step 3 — Write the file

Produce a markdown file with this exact structure:

```
---
id: signal-YYYY-MM-DD-[slug]
title: "[Inferred or user-provided title]"
date: YYYY-MM-DD
source_type: bookmark | article | observation
submitted_by: "[name or 'team']"
url: "[the URL]"
protocol_stage: SENSE
intelligence_tier: secondary
cla_layer: litany | social | discourse | myth
status: raw

provenance:
  contributor: "[submitted_by value]"
  contribution_date: YYYY-MM-DD
  contribution_method: submitted_link
  source_verified: false
  confidence: unverified
  lived_experience: false
  consent: public
  license: CC-BY-SA

concepts: []
practitioners: []
scenes: []
tendencies: []
themes: []
summary: ""
thread: ""
---

## Source

[the URL]

## Contributor Note

[the note, if provided — omit this section entirely if no note was given]
```

### Step 4 — Deliver

**In Claude Code** (repo cloned locally):
Write the file directly to `/inbox/[filename]` and confirm the path.

**In claude.ai** (this interface):
Output the complete file contents in a code block, clearly labelled with the target filename. The user copies it into the repo manually, or triggers a GitHub commit via the API.

---

## Naming convention

```
/inbox/YYYY-MM-DD-[slug].md
```

Slug rules:
- Derived from the page title or URL hostname + path
- Lowercase, hyphens only, no special characters
- Max 60 characters
- Examples:
  - `2026-03-09-refik-anadol-machine-hallucinations.md`
  - `2026-03-09-rhizome-net-art-anthology.md`
  - `2026-03-09-are-na-channel-generative-systems.md`

---

## Schema constraints

These fields must be present and valid for the pipeline to process the file:

| Field | Valid values |
|---|---|
| `source_type` | `transcript`, `bookmark`, `observation`, `article`, `conversation` |
| `protocol_stage` | `SENSE`, `QUERY`, `SPECULATE`, `REACT`, `COLLABORATE`, `EXPERIMENT` |
| `intelligence_tier` | `primary`, `secondary`, `tertiary` |
| `cla_layer` | `litany`, `social`, `discourse`, `myth` |
| `confidence` | `high`, `medium`, `low`, `speculative`, `unverified` |
| `consent` | `recorded`, `anonymous`, `public` |
| `contribution_method` | always `submitted_link` for this skill |

Leave `concepts`, `practitioners`, `scenes`, `tendencies`, `themes`, and `summary` as empty arrays / empty strings. The pipeline populates these during processing. Do not pre-fill them unless the user explicitly provides them — the processor's job is extraction, not the intake skill's.

---

## What this skill does NOT do

- It does not process the signal (that is `signal_processor.py`'s job)
- It does not fetch or scrape the full page content
- It does not add nodes to the graph directly
- It does not run CLA extraction or tendency tagging
- It does not send anything to the website API (`/api/drop-link/submit`)

The skill's only job is to write a valid, well-formed raw signal into `/inbox/`. The pipeline does the rest.

---

## Example

**User says:**
> Drop this link: https://rhizome.org/editorial/2024/mar/12/net-art-and-infrastructure — it's about how net art practitioners are responding to platform decay. Submitted by JB.

**Claude responds:**

```
→ classifying signal

source_type: article
cla_layer: social (structural response to platform decay)
practitioner visible: Rhizome (organisation)
concept visible: net art, platform decay, infrastructure

writing file: inbox/2026-03-09-rhizome-net-art-infrastructure.md
```

Then outputs or writes:

```markdown
---
id: signal-2026-03-09-rhizome-net-art-infrastructure
title: "Net Art and Infrastructure"
date: 2026-03-09
source_type: article
submitted_by: "JB"
url: "https://rhizome.org/editorial/2024/mar/12/net-art-and-infrastructure"
protocol_stage: SENSE
intelligence_tier: secondary
cla_layer: social
status: raw

provenance:
  contributor: "JB"
  contribution_date: 2026-03-09
  contribution_method: submitted_link
  source_verified: false
  confidence: unverified
  lived_experience: false
  consent: public
  license: CC-BY-SA

concepts: []
practitioners: []
scenes: []
tendencies: []
themes: []
summary: ""
thread: ""
---

## Source

https://rhizome.org/editorial/2024/mar/12/net-art-and-infrastructure

## Contributor Note

About how net art practitioners are responding to platform decay.
```

---

## Relationship to the website UI

`drop-link.html` → `POST /api/drop-link/submit` → writes to `/inbox/`
This skill → Claude writes or outputs file → lands in `/inbox/`

Same destination. Same schema. Different contributors, different context richness. The pipeline processes both identically.

---

*Schema reference: `SCHEMA.md` v0.2 · Pipeline: `pipeline/signal_processor.py` · See also: `skills/provenance-standards.md`*
