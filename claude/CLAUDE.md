# CLAUDE.md — A(DAI) Digital Arts Institute

## What this is

A(DAI) started with a question: what if the digital arts could sense themselves?

Practitioners carry the real knowledge of their scenes — who influenced whom, what actually happened in a specific studio, which works shifted things. But that knowledge lives in people, not in any shared structure. History gets written after the fact by people who weren't in the room.

A(DAI) is the infrastructure for that memory. A knowledge commons and semantic graph where practitioner intelligence, lived experience, artworks, and field signals accumulate into something the field can query, traverse, challenge, and build on. Artworks sit at the centre of gravity. Their relational position — what they embody, what they respond to, what tensions they hold — is the intelligence.

It's *a* canon, not *the* canon. The indefinite article is load-bearing.

Notion is for team operations only (kanban, todos). Never for intelligence storage, signal querying, or source of truth.

## Principles

Six instincts guide how A(DAI) is built:

1. **Show the bias.** No one is neutral. A declared position produces stronger knowledge than pretending otherwise.
2. **It matters how you know something.** We track who made a connection, why, from what position, with what evidence.
3. **Contradictions coexist.** When claims conflict, they sit side by side with their provenance intact. The graph remembers how it changed.
4. **The art comes first.** Movements and genealogies emerge from the works. They don't get imposed onto them.
5. **Our vocabulary is a hypothesis.** Every parameter is versioned and open to challenge. Disagreement is evidence.
6. **The system watches for what's forming.** Most knowledge systems reward what's already legible. We're trying to notice when practitioners reach for language that doesn't exist yet — where the field is actually moving.

Additional principles (full detail in the seed doc):

7. Intention over attention — never optimise for engagement
8. Gravity, not hierarchy — mass through relations, not rank
9. Governance at the gate, not inside the data — parameters are open and forkable
10. Everything is a prototype until the field says otherwise
11. Provenance of meaning — trace the intellectual arc, not just the ownership chain
12. Deep time — every decision against a 10-year horizon
13. Show the work — if the reasoning cannot be traced, the system has failed
14. Contribution deserves feedback — when someone gives knowledge, they see what happened with it
15. Agent-native — agents are first-class actors, not bolt-ons
16. Coherence over consensus — multiple readings coexist
17. Sympoietic, not autopoietic — the system makes-with, not makes-itself
18. Scaffolding over delegation — the practitioner's sensing capacity is the primary intelligence source

## The three-layer prototype

The full vision (audio-first immersive experience) is the destination. The build is staged in three layers that establish the foundation first.

### Layer 1 — Generative landing page + North Star

The immediate deliverable. Publish the North Star on Substack and deploy a generative landing page on Netlify that communicates the aesthetic and vision. Not connected to the backend yet. It should evoke the feeling of what A(DAI) is — the vastness, the partiality, the plurality — before the full system exists.

**Piyush is building:** Particle/gravitational node visualizations. Brand system (logos, fonts, colours, generative system for collateral extraction). Infinite scroll.

**How the design embodies the North Star:**
- You can never see the whole universe, only a snapshot → a canon that refuses completeness before it can be read
- Edge diversity as visual weight, not volume → it matters how you know something
- Generative surface, different every visit → our vocabulary is a hypothesis
- Brighter/denser nodes where relations cross regions → gravitational mass through relational density
- User can customise the aesthetic → forkability, one of many, make your own

**Call to action:** Collect emails. When the graph is ready, these people are the first to test it.

### Layer 2 — Public data layer + graph

First automated data runs from curated sources populate the graph with enough substance to be interesting — and provocative. This is the foundation. The design principle is provocation: the first runs should produce something substantive enough for people to disagree with. Disagreement drives contribution.

**Sources (first pass ):**
https://github.com/a-digital-arts-institute/adai-v1/blob/main/sources.yaml 


**Scout agents with editorial lens:** Not valueless scraping. Agents carry coded values and a structured reasoning scaffolding. The editorial lens is the critique of AI built into the practice. Iri is creating the value-based framework.

### Layer 3 — Intimate layer + practitioner profiles

Where the unique value lives. Qualitative input from practitioners — the implicit knowledge that isn't accessible on the web. What they know about their own scenes, who actually influenced whom, which works shifted things.

**LLM-assisted interviews (under critical evaluation):** JB proposed LLM-conducted interviews as a scalable alternative to manual recordings. The idea: send practitioners a link, LLM conducts the interview with an editorial persona, transcript becomes signal. Vouch system: each participant can invite others they trust.

**Critical caveat:** This needs human-in-the-loop. Without it, it's a glorified chatbot. The intimate layer's value IS lived experience and implicit knowledge — an LLM alone risks flattening exactly what makes practitioner input irreplaceable. The editorial persona must be carefully designed, and human review of extracted signals is non-negotiable. This approach is under evaluation, not confirmed.

**Practitioner profiles:** Each practitioner gets a sovereign database (the Matryoshka's Layer 1). Self-authored data has no merge boundary — if you write to your own DB, free pass. External contributions go through review.

### The audio layer (post-foundation)

Voice input, TTS narratives, pause-and-challenge, intent classification — all of this is the full vision but only gets built once the foundation is solid. The data layers, the protocol, the graph density must be right first. Audio sits on top of a protocol; without the protocol, there's nothing to narrate.

## Architecture: CR-SQLite Matryoshka

Every practitioner, every scene, and the field itself gets its own SQLite database file. These files sync using CRDTs (CR-SQLite — Gio maintains a C port). No blockchain. No tokens. CRDTs give you decentralisation, provenance, and forks without gas fees.

```
┌──────────────────────────────────────────────────┐
│  FIELD DB (full commons — fat materialized view)  │
│  ┌────────────────────────────────────────────┐   │
│  │  SCENE DB ("Berlin generative art")        │   │
│  │  ┌──────────────────────────────────────┐  │   │
│  │  │  PRACTITIONER DB (artist-rafael)     │  │   │
│  │  └──────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

**Layer 1 — Practitioner DB:** One `.db` per practitioner. Portable — "give me my data" = hand them a file. Self-authored data merges without boundary.

**Layer 2 — Scene DB:** One `.db` per scene. Index of practitioners, scene-level signals, materialized aggregates.

**Layer 3 — Field DB:** Single `.db` for the full commons. Fat materialized view. Gravitational queries run here. Refreshed via batch or triggered on merge.

**Queries:** Field-wide queries run against `field.db` — single file, single SQL. Drill-down uses ATTACH for specific practitioner DBs. Never attach more than a handful at once.

**Current state:** Single-DB deployment. Per-practitioner split is designed but not implemented — not a blocker for the prototype but needed for the data sovereignty promise.

## Two data layers

| Layer | What | Source | Confidence | Character |
|---|---|---|---|---|
| **Public** | Crawled from open sources | Wikipedia, institutional archives, platform APIs, RSS, BlueSky | `medium` (agent-classified) | Noisy, substantive, the "Dante's inferno underneath" |
| **Intimate** | Qualitative practitioner input | LLM-assisted interviews, direct contribution, recorded conversations | `high` (practitioner-confirmed) | Implicit knowledge, lived experience, the unique value |

Both flow through the same backend. The distinction should be visually represented — the public layer is the broad, noisy foundation; the intimate layer is the refined, qualitative surface.

## Signal flow

1. Signal arrives (contribution, scout agent, practitioner input, recorded conversation)
2. Source origin classification + provenance metadata + ouroboros check
3. Processing: entity extraction, edge type classification, processing trace logged
4. **Intake queue** (staging — submitted, pending)
5. **Merge boundary:** auto-merge (practitioner self-report on own data) | hold for review (new contributor) | frontier flag (can't classify → 90-day lifecycle)
6. Approved signals CRDT-merge into practitioner/scene/field DBs
7. **Contribution receipt:** contributor sees what was extracted, what connections formed

## Edge types

**Ship first (6 types — reliable classification):**

| Edge type | Meaning |
|---|---|
| PRACTICES | Practitioner → Concept ("this artist works with generative code") |
| BELONGS_TO | Practitioner → Scene ("this artist is part of Berlin generative art") |
| EXHIBITED_AT | Practitioner → Institution ("showed at ZKM") |
| COLLABORATES_WITH | Practitioner → Practitioner ("these two work together") |
| CREATED_BY | Artwork → Practitioner ("this work was made by this artist") |
| RELATED_TO | Catch-all — flag for vocabulary expansion |

**10 more types exist for later deployment** (PIONEERED, CRITIQUES, INFLUENCES, TENSION_WITH, EMERGED_FROM, EMBODIES, RESPONDS_TO, USES_TECHNIQUE, EXHIBITED_IN, CONTESTS). Deploy when signal volume justifies the classification judgment. Full list and classification rules in the seed doc.

Accumulation of RELATED_TO edges is the agenda for expanding the vocabulary. What the system can't classify marks where the field is actually moving.

## Gravity model

Nodes don't have a score. They accumulate gravitational mass through **relational density** and **edge type diversity** — not volume.

A practitioner with 5 edges across 4 different types has more visual weight than one with 20 PRACTICES edges. Diversity of connection is the signal. A node bridges separate regions of the graph — that structural position is the intelligence.

This applies to artworks too. A work that EMBODIES a concept in TENSION_WITH another concept it also EMBODIES holds a contradiction — that's the kind of work the canon should foreground.

**Interpretive diversity is the primary system health alarm.** Low narrative diversity signals monoculture. Frontier signals carry extra mass precisely because they have few connections.

## Trust model

| Trust level | Who | Behaviour |
|---|---|---|
| New contributor | First submission | Held for review |
| Reviewed | Established track record | Auto-merge eligible |
| Practitioner (self-report) | Artist on their own work | Highest epistemic authority, no merge boundary on own DB |
| Agent (scaffolded) | Agent surfaces candidates, practitioner approves | Dual provenance |
| Agent (autonomous) | Established track record | Trust-level upgrade, not the default |

## Agentic risk map

Mapped from "Agents of Chaos" (Shapira et al., Feb 2026) — 11 failure modes from live red-teaming of autonomous LLM agents, plus GDPR erasure. Full detail in Notion: [Agentic Risk Map](https://www.notion.so/3367b5c8702081be9a23f7d1efe8e858).

| Risk | A(DAI) defence | Status |
|---|---|---|
| Disproportionate response | Constrained mutation operations (no raw SQL) | Principle exists, not enforced |
| Non-owner compliance | Trust tiers + merge boundary | Designed, not in schema |
| Information disclosure | Consent architecture | Not in db.sql |
| Resource looping | Rate limits + dedup | Not built |
| Denial of service | Rate limits on contribution endpoint | Not built |
| Provider value override | Editorial guidance docs | Written — 3 skills files (protocol + gatherer + reader) |
| Self-harm / config tampering | Read-only pipeline config | Not enforced |
| Identity spoofing | Authentication | Not designed |
| Cross-agent corruption | Stateless pipeline + merge boundary | Needs enforcement |
| Persistent state injection | Signal content as data, not instructions | Needs enforcement |
| Libel / misinformation | Confidence levels + practitioner correction | Schema exists, UX not built |
| GDPR erasure vs "never delete" | Dedicated erasure tool across Matryoshka | Not designed — legal requirement before EU practitioners |

**Priority before Basel:** (1) Constrain pipeline to predefined mutation ops, (2) trust tiers in contributor schema, (3) write editorial guidance docs, (4) rate limiting on contribution, (5) authentication flow for practitioner onboarding.

**Priority before public scale:** (1) GDPR erasure propagation, (2) consent enforcement at query layer, (3) practitioner correction flow, (4) input sanitisation for prompt injection, (5) processing traces with full audit trail.

## Current state (as of April 2026)

GitHub org: `a-digital-arts-institute`. Two repos:

- **`seed-doc`** — single `index.html`, the living specification
- **`adai-v1`** — the live codebase, branch `feat/cr-sqlite-backend` (to be merged to main). **Deployed at [adai-basel.fly.dev](https://adai-basel.fly.dev)**

### What's live

CR-SQLite backend (Gio, Shards). 774 nodes, 929 edges (3 types: PRACTICES 284, BELONGS_TO 366, RELATED_TO 279). Contribution flow, curator review queue, practitioner profiles, data export. Single-DB deployment.

### What's in progress

- **Piyush:** Particle/gravitational visualizations, brand system, generative landing page → deploying on Netlify
- **Iri:** North Star article for Substack, identifying 10–15 signal sources for public layer, value-based framework for scout agents
- **Gio:** Available from April 9 (Sicily, Europe timezone, full month). Merging branch to main, creating Claude skill for repo, exploring public layer data collection
- **JB:** Artist relations, testing LLM interview concept, sourcing archivists (Piyush and others who find deep/obscure material)

### Repo structure

```
adai-v1/
├── adai-digital-arts-report-research/   # Field/outline schemas (reference)
├── docs/                                # Spec gap analysis
├── results/                             # 59 JSON research files (seed input)
├── db.sql                               # Database schema
├── Dockerfile / fly.toml / entrypoint.sh  # Fly.io deployment
├── run.shs / seed.shs / server.shs      # Shards server + seed scripts
└── CLAUDE.md                            # This file
```

### Endpoints (live at adai-basel.fly.dev)

| Route | Description |
|---|---|
| `/` | Home — stats + recent additions |
| `/explore` | Browse all entities |
| `/practitioner/:slug` | Practitioner profile with graph connections |
| `/practitioner/:slug/data` | Raw JSON data export ("give me my data") |
| `/contribute` | Submit a signal |
| `/review` | Curator review queue |
| `/api/stats` | JSON stats |

## Critical gaps (updated April 2026)

1. **Artwork nodes do not exist.** 774 nodes, 0 artworks. The narrative engine and visual graph depend on artwork nodes. The public layer's first runs should bring them in (platform APIs, institutional archives).
2. **Only 3 edge types in use.** Need CREATED_BY, EXHIBITED_AT, and COLLABORATES_WITH at minimum before the graph reads as more than co-occurrence.
3. **Editorial guidance docs written.** Three skills files authored: `relational-intelligence-protocol.md` (master protocol), `gatherer.md` (intake agent), `reader.md` (interpretation agent). Must be injected in every API call.
4. **No authentication system.** Basel-critical if practitioners are onboarded live.
5. **Geographic intake bias.** 47 of 59 practitioners are North American/European. The public layer should intentionally diversify.
6. **Signal sources not yet identified.** Iri's task this week — 10–15 validated sources for the public layer.
7. **Frontend not connected to backend.** Piyush building visual language separately. Connection work starts when Gio is available (April 9+).
8. **Consent fields not in db.sql.** Needed before onboarding practitioners who share under restricted terms.

## Relational intelligence protocol

A(DAI) produces relational intelligence — knowledge that exists in the structure of connections, not in any single node. AI agents and humans generate independent readings of the same field, held in the graph with provenance. Where they converge, confidence rises. Where they diverge, you have a visible tension. The divergence is the intelligence.

The framework is influenced by Tyson Yunkaporta's complexity protocols (Sand Talk, 2019). See `research/yunkaporta-agent-complexity/` for full research backing and `skills/relational-intelligence-protocol.md` for the attribution table mapping A(DAI)'s terms to their sources.

### The five-layer loop

1. **Gather** — AI agents crawl sources and propose nodes + edges. Humans contribute through sensing conversations. Both produce signals. Both enter the graph.
2. **Structure** — The graph holds both readings without collapsing them. Contradictions are data: the machine says "generative aesthetics," the practitioner says "process-based ritual." Both edges exist.
3. **Render** — The frontend turns the graph into physics. Typed edges become gravitational pull. Edge type diversity becomes brightness. The visitor sees the topology.
4. **Narrate** — The system reads the graph aloud. Not *the* reading — *a* reading. Partial by design. Names what it foregrounds and what it leaves out.
5. **Change** — The visitor responds. Questions become signals. Challenges become CONTESTS edges. The graph updates. The next visitor sees a different field.

The relational intelligence isn't in any single layer. It's in the loop between all five.

### Two agent personas

**The Gatherer** — operates at the intake edge. Same protocol whether scouting public sources (commons trust) or sensing with a practitioner (paired trust). Reports its own bias. Flags what it can't classify as frontier signals.

**The Reader** — operates at the interpretation edge. Same protocol whether narrating to a visitor or weaving cross-layer patterns for editorial review. Tends the graph as a living system. Names absences. Detects its own wrong stories.

### Four agent protocols

- **Diversify** — Agents must increase the diversity of what the graph can sense, not confirm existing patterns.
- **Connect** — Every action produces edges, not just nodes. Edge type diversity > edge count.
- **Interact** — Engage reciprocally. Every interaction feeds back into the graph.
- **Adapt** — What agents can't classify IS the field adapting. Frontier signals are the agenda.

## Skills files

Skills files are not documentation — they are context that must be read and passed in Claude API calls. If they're not injected, they do nothing.

```
/skills/
  relational-intelligence-protocol.md  # Master protocol — injected in EVERY call
  gatherer.md                          # Intake agent: scouting + sensing modes
  reader.md                            # Interpretation agent: narrating + weaving modes
```

**Injection rule:** `relational-intelligence-protocol.md` goes in every call. Add `gatherer.md` for intake/extraction work. Add `reader.md` for narration/editorial work. Both agent skills require the master protocol alongside them.

## Core rules

1. **Judgment in skills, not Python.** If code is making linking decisions via string matching, that's judgment in the wrong place. Pass signal + context to Claude with skills injected.
2. **Skills must be injected.** Read and pass as context in every Claude API call.
3. **Context before execution.** Every pipeline run should know what concepts exist, what was processed last, what the current frontier signals are.
4. **Frontier signals are the point.** What the system can't classify marks where the field's vocabulary is forming. Surface these, don't drop them. Every signal exits with explicit status: `processed` | `concept_linked` | `frontier` | `error`.
5. **Processing traces are mandatory.** Every signal processed through Claude carries what it extracted, rejected, and at what confidence.
6. **Ouroboros defense.** Source origin typing: `human_primary`, `human_secondary`, `ai_assisted`, `ai_generated`. Raw practitioner voice is the highest-value signal.

## Quality tests

If any of these are true, the system is failing:
- No frontier signals visible → merge boundary too tight
- Every auto-merge confirms the founding team's map → system mirrors its founders
- The narrative sounds the same every session → the generative interface isn't generative
- 500 nodes, 3 edge types → semantic layer is cosmetic
- Graph has practitioners but no artworks → directory, not a canon
- Nobody asks for a different perspective → the system isn't provoking curiosity
- Visitors can't tell what the system left out → the partiality isn't honest
- Artworks are present but have no edges → illustrations, not first-class nodes

## Governance

**Governance transition trigger:** 200 contributors OR 2 years, whichever comes first. Review is binding.

**Fork proliferation as success metric.** When a community in Lagos or São Paulo or Taipei wants to run their own A(DAI) — fork the data, apply their own merge parameters, define their own vocabulary — that is the system working. The founding team's A(DAI) is one instance. It should not be the only one.

## Document hierarchy

1. **This CLAUDE.md** — the authoritative reference for all current decisions. Updated April 2026.
2. **North Star** (Notion) — the public-facing articulation. Distilled principles and vision for Substack publication.
3. **Design Brief: How the Backend Shapes the Frontend** (Notion) — from Apr 2 team call. What the backend means for design, what can be built now vs later.
4. **Agentic Risk Map** (Notion) — 12 failure modes mapped to A(DAI) with priority actions.
5. **adaiconceptpaper.pdf** — Iri's foundational vision. Authoritative on thesis and positioning.
6. **adai_living_graph_spec.pdf** — JB's living graph spec. Audio interaction model = current reference. Architecture = historical (superseded by CR-SQLite).
7. **seed-doc** (v3.1, March 2026) — The living specification. Full edge types, merge boundary, gravity model, sensing loop.
8. **Backend & Storage Idea** (Notion) — Gio's CR-SQLite Matryoshka proposal. Confirmed technical architecture.

## Stack

CR-SQLite (Gio's C port), Shards (HTTP server + scripting), Python (pipeline scripts), Anthropic API (Claude — processing, classification, narrative generation, query), Gemini Embedding 2 (embeddings — future), Fly.io (backend — adai-basel.fly.dev), Netlify (landing page — Piyush), Docker (deployment), D3 (graph visualisation — starting point), TouchDesigner (particle/gravitational viz — Piyush). TTS and transcription providers TBD (post-foundation).

## Team

- **Iri** — strategy, editorial, signal source curation, value framework for agents, build coordination
- **JB** — market development, artist relations, sensing conversations, LLM interview concept
- **Gio** — backend architecture, CR-SQLite, protocol, public layer data collection (available full-time from April 9, Sicily)
- **Piyush** — frontend, generative landing page, brand system, particle/gravitational visualization, immersive site design

## Entity IDs

Human-readable IDs with type prefix: `artwork:fidenza`, `practitioner:casey reas`, `concept:generative code`. Not kebab-case slugs or UUIDs.

## Mode 1 — 

A(DAI) builds the commons.. Open, field-owned intelligence. Never sold. CC-BY-SA. 
