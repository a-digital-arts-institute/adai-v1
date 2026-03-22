# A(DAI) -- Design Brief

**Version:** 2.2
**Date:** March 2026
**Authors:** Iri, JB, Piyush, Gio
**Status:** Active seed document
**Licence:** CC-BY-SA 4.0. The project builds in public.

> This is A(DAI)'s canonical design brief: the versioned source of truth for what A(DAI) is, how it works, and why. It is also the seed from which we prompt artefacts -- articles, pitches, grant applications, onboarding docs, room specs. Anything that needs to speak accurately about A(DAI) starts here.
>
> **Versioning:** Increment when the brief substantively changes. Tag the commit. Keep the changelog.
>
> **On the frameworks in this document:** Everything named here -- tendency vocabulary, CLA extraction, edge type ontology, merge parameters, processing protocol -- is a prototype being explored in public. These are the team's first hypotheses, published so they can be tested, challenged, and revised by the people who use them. They are not policies. They are starting conditions. If you are reading this and something is wrong, that is an invitation.

---

## 01. Vision

A(DAI) is a 10-year infrastructure project for the digital arts. Not a platform. Not a marketplace. A knowledge commons: a semantic graph where practitioner intelligence, lived experience, and field signals accumulate into something the field can query, traverse, and build on.

The operating premise: digital arts has no system that combines relational mapping, commons governance, and field-level synthesis. Partial infrastructure exists. Are.na holds collaborative knowledge but without structured relations. Artsy's Art Genome maps 1,300 genes but is proprietary. Rhizome preserves works but is editorially bottlenecked. Wikidata is open but thin on digital arts. Feral File and Art Blocks proved practitioner-led platforms can survive market cycles. None of them can answer: what is the relational map of this field? Which practices are converging? Where is the vocabulary still forming?

That question is what A(DAI) builds the infrastructure to hold.

### Why now

The NFT cycle demonstrated something specific: the only infrastructure the field had was borrowed from speculation. When the market contracted, the transaction layer contracted with it. But it did not leave nothing behind. Art Blocks, fxhash, Zora, and Manifold survive. On-chain provenance standards persist. Institutional adoption of digital art is a permanent structural change.

What the NFT era built was transaction infrastructure: creator contracts, marketplace protocols, provenance of ownership. What it did not build was knowledge infrastructure: relational field intelligence, semantic provenance, commons-governed synthesis. The market gave the field provenance of ownership. It never gave it provenance of meaning.

A(DAI) builds the missing layer. Not a replacement for what survived, but the knowledge infrastructure that contextualises what the transaction layer made tradeable.

### What comes first

Three responses to the field's structural gap are in circulation. The governance argument says the field needs rules. The preservation argument says governance is premature until works migrate reliably. The market argument says the field needs better detection.

A(DAI)'s position: there is a layer prior to all three. Legibility. You cannot preserve what you cannot name. You cannot govern what you cannot see. You cannot value what you cannot contextualise.

But legibility is not neutral. Every vocabulary choice is a governance decision, even when it is not called one. A(DAI) addresses this architecturally: governance lives at the merge boundary, not inside the data. The data layer preserves every observation. The merge boundary is where editorial judgment operates. And the merge parameters are open, versioned, and forkable -- anyone can take the same data, apply different rules, and run a different commons. That is the structural guarantee against enclosure.

The frameworks themselves -- CLA, tendency vocabulary, edge types -- are prototypes, not policies. They are published precisely so they can be tested and revised. The question is not "who chose these?" but "do they hold up, and how do we change them when they don't?"

---

## 02. Strategy

### Two modes, one commons

Mode 1 is the commons. Open, field-owned intelligence under CC-BY-SA. It is never sold. It is the work.

Mode 2 is advisory services for capital actors -- collectors, curators, institutions -- built on top of Mode 1 without replacing it. The advisory layer is only worth something because the commons beneath it is real.

### Conversations and works as primary signal

Before Basel, the team is recording conversations with key practitioners across the digital arts field. These conversations are not preparation for the project. They are the project. Each conversation is a signal: processed through the pipeline, structured into the graph, embedded into semantic space. The practitioners who speak become the first nodes in the commons. Their words become the raw material for the Sense room -- the immersive artefact that reads the field back to itself at Basel.

Alongside each conversation, 2-3 key works from the practitioner are collected and entered as artwork nodes linked to the conversation signal and the practitioner node. By Basel, 30-50 works sit in the graph -- not as illustrations, but as first-class nodes with their own edges, embeddings, and gravitational mass. The art is present in the system, not just talk about art.

This means community building, content generation, and graph seeding are the same activity. The team does not need to build a community and then ask it to contribute. The conversation is the contribution. The works are the evidence. The graph grows because the team is listening and looking.

By Basel, the graph is not seeded from scraped data or imported databases. It is built from practitioners speaking about their own field in their own language, and from the works they make. The system's first intelligence is lived experience and lived practice.

### Practitioner agents as collaborative experimentation

The system's backend is agent-native: built for agents as first-class actors, not as bolt-ons. The tools are atomic primitives -- read signal, write signal, create edge, query graph, embed media. Agents compose these tools to achieve outcomes. New capabilities emerge from new prompts, not new code.

This opens a track of experimentation where practitioners from the field -- the same people the team has conversations with -- collaborate to create custom scout agents. A practitioner knows what matters in their corner of the field. They encode that editorial judgment as an agent: what to look for, where to look, what counts as a signal. The agent scouts on their behalf, submitting through the same merge boundary as any human contributor. The practitioner's knowledge scales beyond the time they personally have to contribute.

A custom agent is itself a form of practitioner knowledge -- it encodes what someone with deep field expertise considers worth paying attention to. Agent behaviours are defined as markdown skill files in the commons, editable without code, versioned alongside everything else. A practitioner does not need to be a developer to shape how their agent sees the field. They need to be able to describe what matters.

This is not automation replacing human judgment. The merge boundary still governs what enters the graph. An agent submits. The gate reviews. Trust-based auto-merge applies to agents the same way it applies to people: a new agent starts reviewed, builds a track record, earns auto-merge. The governance model does not change. The volume and reach of signal intake does.

### The first 100 people

The Art Basel encounter introduces A(DAI) to approximately 100 curated people -- practitioners, curators, collectors, institutional figures, technologists -- designed to produce three responses: recognition, contribution, and commitment.

Everything built before June 2026 serves this.

**Primary target for contribution:** digitally native artists who are technically literate, community-oriented, and already frustrated with the field's illegibility. These are the people who will seed the graph. Many of them will already be in it -- their conversations processed, their knowledge visible in the graph, their words surfacing in the Sense room. They arrive at Basel and encounter a system that already holds something they recognise.

Secondary audiences (curators, collectors, institutional actors) are important for recognition and commitment but are not the primary source of early contributions.

### Intention over attention

The system does not track time-on-page, click-through, or audience growth. It measures:

- **Relational density:** how richly connected the graph is. Weighted by edge type diversity per node.
- **Edge diversity:** distribution of edge types across the graph. Prevents collapse into a single relation type.
- **Provenance quality:** percentage of signals with complete provenance chains.
- **Frontier signal rate:** rate of signals that generate new concept nodes or edge types not in the existing ontology. Frontier signals carry a 90-day lifecycle, after which they are absorbed, reclassified, or archived with a rationale.

There is a tension here: frontier signals will always score low on relational density because they have few connections by definition. If the gravitational model does not account for this, it quietly buries the signals the system claims to value most. Frontier connections must carry extra weight.

On feedback: A(DAI) never optimises for engagement. But when someone contributes knowledge to a commons, they should see what happened with it. That is not engagement. That is respect.

---

## 03. Concept

### Artists and works at the centre of gravity

The core metaphor is gravitational. An artist's node accumulates mass not from fame or market value but from the density and diversity of their relational connections. More typed edges (PRACTICES, PIONEERED, CRITIQUES, INFLUENCES, COLLABORATES_WITH, BELONGS_TO), backed by higher-confidence and more diverse signals, means more mass. More mass means more gravitational pull. Concept and scene nodes orient around the artist, not the other way around.

Artworks are nodes too. A work carries edges to its creator (CREATED_BY), to the techniques it uses (USES_TECHNIQUE), to the concepts it embodies (EMBODIES), to works it responds to (RESPONDS_TO), to institutions where it was shown (EXHIBITED_IN). A work's gravitational mass comes from the same place as a practitioner's: the density and diversity of its connections. A work that is practiced with, critiqued, responded to, and exhibited accumulates mass. A work that sits unlinked does not disappear -- it occupies space in the graph as a frontier node, waiting for the connections that will give it weight.

This inverts the institutional model, where artists are classified into pre-existing categories and works are filed into collections.

Limitations the team is designing around: preferential attachment means relational density naturally produces power-law distributions. Artists with more existing connections attract more signals. To counteract this: frontier signal connections contribute mass. All edge weighting coefficients are public and challengeable. Geographic and temporal normalization prevents the graph from mapping only the founding team's existing networks. At launch, the graph reflects founding team curation. Emergent intelligence requires contributors the team does not yet know. This is acknowledged.

### The merge boundary: governance at the gate, not inside the data

Every signal entering the graph passes through a reviewed gate. The parameters at this gate -- what auto-merges, what gets held, what triggers frontier flagging -- are curatorial decisions made executable, auditable, and revisable.

The merge boundary is where governance lives. Not inside the data -- the CRDT layer preserves every observation, no majority overwrites a minority -- but at the gate.

**Trust-based auto-merge.** The gate responds to the contributor. A reliable source auto-merges. A new contributor goes to the inbox, flagged for review. Trust evolves: a new contributor starts as reviewed, builds a track record, gets promoted. A field on their profile, not a committee decision. The CRDT does not care who you are. The gate does.

**Open, versioned, forkable.** Every merge parameter is a versioned document in the commons. Contributors can propose changes through the same mechanism used for data. Anyone can fork the parameters -- a different institution could take the same protocol, apply different rules, and run a different commons on the same data. That is the structural guarantee against enclosure.

**Frontier signals get first-class representation.** Visible in the graph. Present in the constellation, visibly unlinked, occupying real space. Visitors see where the system's vocabulary fails, not just where it succeeds. Frontier signals carry a 90-day lifecycle: absorbed into the vocabulary, reclassified, or archived with a rationale.

**Everything here is a prototype.** The tendency vocabulary, the edge types, the CLA parameters, the processing protocol -- all are the founding team's first hypotheses. Published for testing. Some will hold. Some will be revised beyond recognition. The architecture is designed for that.

The test: the merge boundary should be uncomfortable for the founding team at least as often as it is comfortable. If every signal that auto-merges confirms what the team already thinks, the parameters are too tight.

### Provenance of meaning, not ownership

Every node carries full provenance: who contributed the signal, when, how, at what confidence level, whether it comes from lived experience, under what consent. When the system surfaces a connection, it can show its reasoning, traceable back to specific practitioner knowledge. The commons is trustworthy not because it is open, but because it is legible.

---

## 04. Governance

A(DAI)'s governance is architectural, not bureaucratic. The data preserves everything. The merge boundary is where editorial judgment lives. The merge parameters are open source.

### The architectural backstop

Fork rights are declared from the start. The data is CC-BY-SA. The parameters are open. The protocol is open source. Anyone can take the commons, apply different merge rules, and run a different institution on the same intelligence. This keeps the founding team accountable without requiring a governance committee on day one.

### How governance develops

**Now:** The founding team makes all editorial decisions. Acknowledged, not hidden. All parameters committed to git with rationale. Contributors can see the full history.

**Trust-based auto-merge (launch):** New contributors start reviewed. Track record earns auto-merge. A profile field, not a committee. The data keeps every observation regardless.

**Contributor feedback (post-Basel):** Contributors flag disagreements. Flags aggregate. At threshold, they trigger review with a public response. Dissent is logged even when the founding team's decision holds -- the minority is never overwritten.

**Formal contestation (50+ active contributors):** Documented challenge process. Rotating review group including contributors from outside the founding team. Outcomes documented as precedent.

**Governance transition (maturity):** Founding team authority structurally constrained. Community override through defined process. But the fork right has been operative from day one -- the community has always had the ultimate override.

---

## 05. The five rooms

The five rooms are the same graph seen through different states of attention. Not five pages. Five temperatures. Each reads from and writes to the same graph through the same merge boundary. There is no first room. No sequence. A visitor enters anywhere.

### Build sequencing

Two rooms built for Basel. The rest presented as design concepts.

**For Basel:** Sense (the centrepiece -- the immersive artefact) and Query (proves the graph is useful).
**Prototype:** React (simplest, demonstrates two-way contribution).
**Later:** Speculate (needs editorial depth) and Experiment (needs technical research).

### Sense

The centrepiece. The graph made immersive. Art as substrate, voice as surface.

The artworks are always present. They form the visual and spatial ground layer of the generative artefact -- embedded in multimodal semantic space, positioned by the graph's relational structure. Which works sit next to which is not curated by the team. It is determined by semantic proximity, relational density, and gravitational pull. The art is the landscape.

The voices come and go. Conversation fragments from recorded practitioner interviews surface on top of the artwork layer -- contextualising, narrating, connecting. A practitioner in Berlin describing how their practice shifted, their words surfacing alongside the works their concepts touch, the scenes they named, the other practitioners whose work resonates in embedding space. The voices are not curated by the team. They are curated by the graph.

A visitor sees works first, then hears the field thinking about what it makes. The composition is a living thing drawn from the graph: 30-50 artworks forming the substrate, conversation fragments threading through and around them. The artefact is not a gallery with audio guides. It is not a playlist of interviews. It is a generative composition where art and voice occupy the same semantic space and the graph determines what surfaces alongside what.

A contributor walks in and encounters their own works and words, but transformed -- threaded through the graph, positioned next to voices and works they may not have known, connected to concepts they may not have named but whose gravitational field they occupy. The system demonstrates it listened and looked. The contribution receipt is the experience itself.

Nothing asks you to click, type, or respond. The graph is visible beneath like sediment under water -- the relational structure legible behind the surfaced works and voices. The visitor sees not just what the field holds, but how what the field holds is connected.

Visual register: slow, high-density, breathing. Artworks as ground, voices as weather. The graph as substrate, not interface.
Generates: ambient signal. Presence as data. The feedback loop made visible.

### Query

The graph under tension. Provocations drawn live from the graph's contested edges -- where typed relationships disagree across signals. "Three practitioners link generative aesthetics to institutional critique. Two link it to market capture. Where do you stand?" Your response does not resolve the tension. It adds mass to it.

Visual register: sharp, high-contrast. Tension zones foregrounded.
Generates: tension edges. Disagreement as mass.

### Speculate

The graph's narrative layer made editable. The manifesto assembled from tendency vocabulary and discourse signals at CLA layers 3-4, not pre-written. Each line carries provenance. Click a line and you are proposing a vocabulary shift at the merge boundary. Previous edits visible beneath yours, ghosted, part of the stratigraphy.

Visual register: layered, typographically dense.
Generates: vocabulary signal. Frontier language.

### React

The graph stripped to a single node. One artwork from the graph, no metadata, no name, no context. You see it as the system sees a frontier signal: unclassified, demanding language. Type what you see. Reactions accumulate across sessions, a growing textual field around the work. The artwork is real -- pulled from an artwork node in the graph. Your reaction becomes an edge.

Visual register: sparse, confrontational.
Generates: the language people reach for when description fails.

### Experiment

The graph's sparse region made habitable. The canvas corresponds to a real coordinate in embedding space where signal density is lowest. What you make here creates a node -- or a frontier signal if the system cannot link it. Over time, canvases populate the field's uncharted territory.

This is also where practitioner agents live. A practitioner creates a custom scout agent -- encoding what they know about their corner of the field as a skill file. The agent scouts, submits signals through the merge boundary, and its activity is visible here: what it found, what the gate accepted, what it missed. The Experiment room becomes a space where practitioners and their agents explore the graph's edges together.

Visual register: open, minimal, the constellation visible at the edges.
Generates: new nodes. Practice -- human and agent -- that creates mass by existing.

### Accessibility

The rooms must not exclude through design. Keyboard navigation, screen reader support, text alternatives for graph visualisations, mobile-responsive layouts. Scoped into the build for each room, not added later.

---

## 06. Architecture

### Data layer: CR-SQLite Matryoshka

CR-SQLite extends SQLite with CRDT capabilities -- databases that merge without conflicts. Giovanni maintains the C port used by A(DAI), battle-tested across production systems. This is the team's own tool.

The architecture nests like dolls:

- **Practitioner DB.** One .db file per practitioner. Signals, edges, metadata, full provenance. Portable. "Give me my data" = hand them a file.
- **Scene DB.** One .db file per scene. Index of practitioners, scene-level signals, materialized aggregates. References, not copies.
- **Field DB.** One .db file for the full commons. Index of everything, cross-scene connections. The lightest layer.

### Agent-native backend

The backend is designed for agents as first-class actors. This means:

- **Atomic tools.** Every system capability is exposed as a small, composable primitive: read signal, write signal, create node, create edge, query graph, embed media, check provenance. No bundled decision logic. Agents compose tools to achieve outcomes.
- **Parity.** Whatever a human contributor can do through the interface, an agent can achieve through tools. No orphan capabilities.
- **Emergent capability.** New features come from new prompts, not new code. A "scout for generative art residencies in Southeast Asia" agent is a markdown skill file, not a software feature.
- **Same merge boundary.** Agents submit signals through the same gate as humans. Same typed edges, same provenance requirements, same trust-based auto-merge progression.
- **Agent behaviours as commons.** Skill files live in the repo as markdown. Open, versioned, forkable -- just like the merge parameters. A practitioner's custom agent is a contribution to the commons, not a private tool.

The test: describe an outcome within the system's domain that was not explicitly built as a feature. Can an agent figure out how to accomplish it using the available tools? If yes, the architecture is working. If no, a tool is missing.

### Typed edges

The current graph uses co-occurrence: "these two things appeared in the same signal." That is not semantics. Typed edges turn co-occurrence into meaning:

| Edge type | From -> To | What it means |
|---|---|---|
| PRACTICES | Practitioner -> Concept | Works with this concept |
| PIONEERED | Practitioner -> Concept | Originated or significantly advanced |
| CRITIQUES | Practitioner -> Concept | Actively challenges or works against |
| BELONGS_TO | Practitioner -> Scene | Part of this scene |
| INFLUENCES | Practitioner -> Practitioner | Directional influence |
| COLLABORATES_WITH | Practitioner -> Practitioner | Active collaboration |
| EMERGED_FROM | Concept -> Scene | Originated in or tied to this scene |
| EXHIBITED_AT | Practitioner -> Institution | Exhibition record |
| RELATED_TO | Concept -> Concept | Conceptual relationship (weakest edge) |
| TENSION_WITH | Concept -> Concept | Productive tension |
| CREATED_BY | Artwork -> Practitioner | Made this work |
| USES_TECHNIQUE | Artwork -> Concept | Technique or medium used |
| EXHIBITED_IN | Artwork -> Institution/Event | Where the work was shown |
| RESPONDS_TO | Artwork -> Artwork | Direct dialogue between works |
| EMBODIES | Artwork -> Concept | The work manifests this concept |

This vocabulary is provisional. New edge types can be proposed through the same mechanism used for data.

**Artwork hosting:** How artwork media (video, images, interactive works) are stored and served is an open question for team discussion. The architecture supports linking to external platforms (Feral File, IPFS, artist websites), hosting directly, or hybrid caching. The graph holds the node and its edges regardless of where the media lives.

### Evidence-based graph

The composite primary key on edges -- (source_id, target_id, edge_type, signal_id) -- means independent observations produce independent rows, not conflicts. Two scouts observing the same connection create two pieces of evidence. "How strong is the connection between practitioner X and concept Y?" is not a number. It is: "Observed 5 times, by 3 sources, earliest January 2026, including 1 practitioner self-report."

The graph stores evidence. Queries draw conclusions.

### CRDT diffs as pull requests

Collaboration follows Git's model: propose, review, merge. CR-SQLite makes merging conflict-free by mathematical guarantee. Independent observations are independent records, not competing writes.

### Open design questions

To be resolved before build:

1. **Intake/review flow.** Where does a signal live while awaiting review? How does rejection work within the CRDT model?
2. **Aggregation layer.** ATTACH has a practical limit of ~10 databases. The gravitational model needs field-wide computation. The field DB needs a concrete aggregation strategy.
3. **Cross-scene edges.** Practitioners belong to multiple scenes. Edges cross boundaries. Ownership rules needed.
4. **Schema evolution.** Adding new edge types across distributed databases requires migration coordination.
5. **Browser access.** The minimum viable browser interface for practitioners at Basel needs scoping.
6. **Agent trust model.** How does trust-based auto-merge work for agents vs. humans? What provenance metadata does an agent signal carry? How does a practitioner's trust level affect their agent's trust level?

### Signal flow

```
RECORDED CONVERSATION / ARTWORK / SCOUT AGENT / PRACTITIONER AGENT / ROOM INTERACTION / CONTRIBUTED SIGNAL
        |
Transcription + provenance metadata (conversations)
Artwork metadata + media embedding (works)
Agent provenance (which agent, which skill file, which practitioner created it)
  (who/what, when, source type, consent)
        |
PROCESSING
  Entity extraction, edge type classification,
  multimodal embedding (text, video, audio, image)
        |
INTAKE (staging -- "submitted, pending")
        |
MERGE BOUNDARY
  Auto-merge | Hold for review | Frontier flag (90-day lifecycle)
  Parameters: public, versioned, forkable
        |
GRAPH (CR-SQLite Matryoshka)
  Practitioner DBs <- scene DBs <- field DB
  Typed edges, full provenance, embeddings
        |
CONTRIBUTION RECEIPT
  Contributor sees what was extracted,
  what connections formed, where their signal sits
        |
ROOMS
  Sense: artworks as substrate, voices as surface -- generative artefact
  Query: provocations from contested edges
  React: language for what resists classification
```

### Embeddings

Multimodal embeddings (currently Gemini Embedding) map text, images, audio, and video into a single semantic space. A video fragment from a practitioner conversation, a text signal from a scout, an image of an artwork, and a generative piece running as video all occupy positions in the same space. This enables semantic search across modalities and determines where nodes sit in the visualisation. Embedding distance measures how far a signal sits from what the system already knows. High distance = frontier.

For the Sense room, embeddings are what make the art-as-substrate model possible: artworks and conversation fragments are positioned by semantic proximity in the same space. A generative artwork sits near the concepts it embodies, near the practitioner who made it, near the conversation where that practitioner described their process. The graph's relational structure determines what surfaces alongside what.

The embedding layer is model-agnostic. Embeddings are stored alongside the data, not as the data. If the provider changes pricing or terms, the system re-embeds with a different model without losing the graph structure beneath.

---

## 07. The contributor experience

### The flow

1. **Submission.** Through a recorded conversation, the rooms, the /contribute page, or a direct interview. Practitioners can contribute or link works during or after conversations -- works become artwork nodes connected to their practitioner node.
2. **Acknowledgment.** Immediate confirmation. Signal enters intake.
3. **Processing.** Entities extracted, edge types classified, graph connections proposed. Video/audio/artwork media embedded into semantic space.
4. **Review.** At launch, the founding team reviews before merge. Capacity: ~10-15 signals per day alongside Basel. Beyond that: relaxed auto-merge or additional reviewers.
5. **Receipt.** The contributor sees what was extracted, what connections formed, where their signal sits. For conversation contributors: they see their words in the Sense room, threaded through the graph, positioned alongside voices and concepts they may not have known were nearby. The graph changed because they spoke.
6. **Correction.** Something wrong? Flag it. Flags enter the merge boundary as signals.

### At Basel: someone says "I want in"

1. A practitioner node is created -- or they discover they are already in the graph, from a conversation recorded months ago.
2. They see what the commons holds about them. Connections to concepts, scenes, other practitioners.
3. They can correct, add, or challenge anything.
4. They get a contributor identifier tied to provenance on everything they submit.
5. Follow-up: 48 hours (link to their node), 1 week (how the graph has grown), 1 month (invitation to contribute further).

Data sovereignty: practitioners can request a full export at any time. As the Matryoshka architecture matures, this becomes a portable .db file they literally own.

### Creating a practitioner agent

A practitioner who wants to contribute beyond their own signals can create a custom scout agent:

1. They describe what matters in their area of the field -- what to look for, where, what counts as significant.
2. This becomes a skill file: a markdown document encoding their editorial judgment as agent behaviour.
3. The agent scouts on their behalf, submitting signals through the same merge boundary.
4. The practitioner sees what their agent found, what was accepted, what was flagged.
5. They refine the skill file over time. The agent gets better because the practitioner's knowledge deepens.

No code required. A practitioner needs to be able to describe what matters, not write software. The skill file is itself a contribution to the commons -- open, versioned, forkable.

---

## 08. Landscape

A(DAI) does not operate in an empty field. It fills a specific gap.

**Are.na** -- collaborative knowledge commons with strong community culture. No structured relations, no field-level synthesis. A(DAI) builds the relational layer. Potential interoperability partner.

**Artsy / Art Genome Project** -- 1,300-gene structured taxonomy. Proprietary, institution-facing, genes assigned by staff. A(DAI) is commons-governed and practitioner-contributed.

**Rhizome ArtBase** -- premier digital art archive, editorially bottlenecked. Rhizome preserves works. A(DAI) maps the relational intelligence between works, practitioners, concepts, and scenes.

**Wikidata** -- structured open data, thin on digital arts, encyclopedic posture. A(DAI) is field-specific and designed to hold what is not yet classifiable.

**Art Blocks / fxhash** -- on-chain generative art that survived the downturn. Art Blocks hosts works. A(DAI) connects them -- to their makers, to the concepts they embody, to the field's relational structure. On-chain provenance could feed into meaning provenance.

**Feral File** -- artist-curated exhibitions with strong practitioner community. Feral File exhibits works. A(DAI) maps the field around them. Feral File artists are a natural early contributor community.

Rhizome archives. Feral File exhibits. Art Blocks hosts. A(DAI) maps the relational intelligence between works, practitioners, concepts, and scenes. The art is present as connected knowledge, not as inventory.

A(DAI) builds bridges, not parallel systems. On-chain attestation could serve meaning provenance. Are.na channels could feed signal intake. Wikidata identifiers could anchor practitioner nodes.

---

## 09. Art Basel

### What we build

The encounter demonstrates the thesis, not the full system:

- The Sense room as immersive generative artefact: artworks as substrate, voices as surface, built from months of recorded practitioner conversations and 30-50 collected works processed through the graph
- The Query room, fully functional -- live provocations from contested edges
- The React room as prototype -- two-way contribution in its simplest form, presenting artwork nodes from the graph
- CR-SQLite schema with typed edges (including artwork edges) and full provenance
- 500+ densely connected nodes across 3-5 well-mapped scenes, seeded from real practitioner conversations and works
- Live contribution flow -- a visitor's input visibly changes the graph
- Agent-native backend with atomic tools -- ready for practitioner agent creation post-Basel
- Post-encounter follow-up infrastructure, ready on day one

Everything else -- including practitioner-created scout agents, full Experiment room, and Speculate room -- is declared as architectural direction.

### The encounter

The Sense room is the centrepiece. A visitor walks into an immersive space where the field's own works form the ground and the field's own voices surface above them. 30-50 artworks positioned by the graph's relational structure, conversation fragments threading through -- selected and composed not by the team but by the graph: surfaced by proximity, by gravitational mass, by the density of connections around them. The visitor sees the field sensing itself through what it makes and what it says about what it makes.

From Sense, they move to Query -- where the graph's tensions become provocations. From Query, they move to React -- where they contribute. At every point, the system is reading from and writing to the same graph. The encounter is not a demo of a system. It is the system, live, fed by the conversations of practitioners who are in the room.

A practitioner walks in, encounters their own works and words in the Sense room, threaded through the graph alongside voices, works, and concepts they recognise and some they do not. They move to Query and find the field's tensions waiting for them as questions. They respond. Their response enters the merge boundary and becomes part of the commons. The graph shifts. The next visitor encounters a slightly different field.

### Encounter format

**TBD -- must be resolved by end of March.**

- Physical format: immersive installation? salon with projection? multi-room?
- Duration per visitor: how long in Sense before Query? How long before contribution?
- The specific contribution action: what do they do, and how long does it take?
- What do they leave with?

Design backward from the time they have.

### Three responses

**Recognition.** The visitor sees the field in a way that reflects practitioner reality. Connections they know are real but have never seen mapped. Gaps where they know knowledge exists but the system has not captured it. For practitioners who were recorded: they recognise their own works and words, but see them in a new relational context. The graph shows them something about their own position they did not know.

**Contribution.** The visitor adds something: a signal, a correction, a missing connection. The rooms make this frictionless. They see the commons change because they were there.

**Commitment.** The visitor leaves understanding that A(DAI) is a commons -- something that deepens as it is used, earns authority through transparency, operates on a 10-year timeline. They want to come back. They want to bring practitioners.

### After Basel

This infrastructure must be ready before the encounter:

- "Contribute your first signal" flow, completable in 5 minutes
- Community channel for post-Basel conversation
- Follow-up at 48 hours, 1 week, 1 month
- "Founding contributor" designation for the first cohort

Without follow-up infrastructure, event energy dissipates within weeks.

### The test

A practitioner walks through the rooms, encounters the graph, queries the commons, and says: this knows something real about my field, and it is missing something I can add.

### The failure test

If no frontier signals are visible, the merge boundary is too tight. If every auto-merge confirms the founding team's map, the system mirrors its founders. If 100 people leave impressed but do not contribute, the rooms are spectacle. If the graph has 500 nodes but 3 edge types, the semantic layer is cosmetic. If no contribution receipt exists, the system takes from practitioners without showing what it did with what they gave. If the Sense room plays back conversations without threading them through the graph, it is a video installation, not a commons artefact. If the Sense room has voices but no art, it is a podcast, not an arts encounter.

---

## 10. Timeline

| Week | Milestone | Owner |
|---|---|---|
| W1 (Mar 24) | Encounter format decided. Giovanni resolves 6 open architecture questions (including agent trust model). | Iri, Gio |
| W2-3 | Schema locked. Typed edges, provenance, intake flow designed. Conversation recording and processing pipeline active. | Gio |
| W4-5 | Conversations processing into graph. Artwork collection from recorded practitioners (target: 30-50 works). 3-5 scenes forming from real practitioner signals. Sense room generative artefact prototyped with art-as-substrate model. | All |
| W6-7 | Query room functional. Signal processor with edge type classification. Continued conversations. | Gio, JB |
| W8-9 | Sense room functional with embedded video fragments. Follow-up infrastructure built. | Iri, Piyush |
| W10-11 | React prototype. 500+ nodes, primarily from recorded conversations. Contribution receipts working. | All |
| W12 (Jun 9) | Integration testing. Encounter rehearsal. | All |
| **Jun 16-22** | **Art Basel** | **All** |

Conversations are continuous from now through Basel and beyond. They are not a phase. They are the practice.

If the five open architecture questions are not resolved by end of W1, the team decides: build on the current pipeline as fallback, or delay.

---

## 11. Design principles

1. **Intention over attention.** Never optimise for engagement. Measure relational depth.
2. **Gravity, not hierarchy.** Mass through relations, not rank. Categories form around practice.
3. **Frontier signals are the most valuable signals.** Surface what the system cannot classify. Give it a lifecycle.
4. **Governance at the gate, not inside the data.** The data preserves everything. The merge boundary is where judgment lives. The parameters are open and forkable.
5. **Everything is a prototype until the field says otherwise.** Published for testing. Designed to be rewritten.
6. **Provenance of meaning.** Trace the intellectual arc, not just the ownership chain.
7. **Deep time.** Every decision against a 10-year horizon.
8. **The rooms are two-way.** Every interaction reads from and writes to the same graph.
9. **Show the work.** If the reasoning cannot be traced, the system has failed.
10. **Contribution deserves feedback.** When someone gives knowledge, they see what happened with it.
11. **Build bridges, not parallel systems.** Interoperability over competition.
12. **Listen first.** The system's first intelligence is recorded conversation. Practitioner knowledge enters as lived experience before it enters as data.
13. **The art is present.** The system holds works, not just words about works. A Digital Arts Institute that cannot show you art has missed the point.
14. **Agent-native.** Agents are first-class actors, not bolt-ons. The backend is atomic tools composed by agents pursuing outcomes. Practitioner agents are practitioner knowledge.

Narrative formation first. Infrastructure makes it hold.

---

## Artefact prompting guide

Reference specific sections rather than asking for a general summary.

| Artefact | Seed sections | Notes |
|---|---|---|
| Elevator pitch (30s) | 01 para 1-3, 02 "Two modes" | Lead with the gap, not the solution |
| Collector pitch | 01 "Why now", 02 "Two modes", 09 "Commitment" | Mode 2 is the hook |
| Practitioner pitch | 03 "Gravitational", 05 Sense, 09 "Recognition" | The Sense room is the hook -- their works and words, in relation |
| Institutional pitch | 01, 03 "Merge boundary", 04 governance | Transparency and fork rights |
| Interview/conversation guide | 03 "Provenance", 02 "Conversations", 05 React + Query | Elicit signal, don't explain the system |
| Grant application | 01, 02 metrics, 04 governance, 11 | Commons, deep time, CC-BY-SA |
| Article (field-facing) | 01, 05 Sense, 08 | Write from the field's problem. The Sense room as lead image. |
| Technical spec | 03, 06 full | Architecture, agent-native design, signal flow, open questions |
| Onboarding doc | 03 "Merge boundary", 05, 07 | How signals enter, what you see back |
| Basel brief | 05 Sense, 09, 10 | The Sense room is the encounter |

**Pattern:** "Using sections [X] of DESIGN-BRIEF-v2.md, draft a [artefact] for [audience]. Tone: [register]. Length: [constraint]."

---

## Changelog

### v2.2 -- 2026-03-20

**Agent-native backend and practitioner agents:**
- Backend declared agent-native: atomic tools, parity, emergent capability.
- Practitioner agents as collaborative experimentation track: practitioners encode editorial judgment as custom scout agents via markdown skill files.
- Agent behaviours are commons contributions -- open, versioned, forkable.
- Agents submit through the same merge boundary as humans. Trust-based auto-merge applies to agents.
- Experiment room connected to practitioner agent activity.
- New open design question: agent trust model.
- New design principle: "Agent-native."
- Signal flow updated with agent provenance.
- Contributor experience expanded: "Creating a practitioner agent" flow.

### v2.1 -- 2026-03-19

**Artworks as first-class nodes:**
- Artworks integrated throughout as first-class graph nodes with gravitational mass.
- New artwork edge types: CREATED_BY, USES_TECHNIQUE, EXHIBITED_IN, RESPONDS_TO, EMBODIES.
- 30-50 works collected from recorded practitioners for Basel.
- Sense room rewritten: art as substrate (always present), voice as surface (contextualising, coming and going).
- React room explicitly pulls artwork nodes from the graph.
- Artwork hosting model flagged as open question for team discussion.
- Landscape sharpened: "Rhizome archives. Feral File exhibits. Art Blocks hosts. A(DAI) maps."
- New failure test: if the Sense room has voices but no art, it is a podcast, not an arts encounter.
- New design principle: "The art is present."
- Multimodal embeddings explicitly include artwork media for Sense room positioning.

### v2.0 -- 2026-03-19

**Framing:**
- Open source declaration. CC-BY-SA. The project builds in public.
- All frameworks declared as prototypes, not policies.

**Conversations as primary signal:**
- Recorded practitioner conversations replace salons as pre-Basel strategy.
- Conversations are simultaneously community building, content generation, and graph seeding.
- The Sense room is built from these conversations -- an immersive generative artefact that reads the field back to itself.
- Added design principle: "Listen first."

**Sense room as centrepiece:**
- Sense elevated from "graph at rest" to the immersive generative artefact at the centre of the Basel encounter.
- Built from recorded conversations processed through the graph and embedded into multimodal semantic space.
- Video fragments selected and composed by the graph's relational structure -- semantic proximity, gravitational mass, connection density.
- The contribution receipt for recorded practitioners is the experience itself.

**Governance:**
- "Governance at the gate, not inside the data."
- Trust-based auto-merge. Fork rights from day one. Dissent always logged.
- Governance develops from founding team curation through contributor feedback, formal contestation, to governance transition.

**Claims revised:**
- Post-NFT: transaction infrastructure (built) vs knowledge infrastructure (not built).
- Legibility/governance: governance is architectural, present from day one.
- "Non-enclosure" replaced with "everything is a prototype until the field says otherwise."

**Architecture:**
- CR-SQLite correctly framed as Giovanni's own tool.
- Typed edge schema as key contribution. Five open design questions listed.
- Gemini Embedding for multimodal semantic space. Model-agnostic design -- embeddings stored alongside data, swappable.
- Signal flow updated to include conversation transcription and multimodal embedding.

**New sections:**
- Governance (04), Contributor experience (07), Landscape (08), Timeline (10)

**Basel:**
- Build sequencing: Sense + Query for Basel, React as prototype.
- Post-encounter conversion infrastructure specified.
- Failure test includes: if Sense room plays back conversations without threading them through the graph, it is a video installation, not a commons artefact.

**Other:**
- Operational definitions for alternative metrics. Frontier signal 90-day lifecycle.
- Gravitational model limitations acknowledged.
- Accessibility requirement for rooms.
- Voice pass: unified register, stripped academic hedging.

### v1.0 -- 2026-03-19
- Initial versioned brief
- Artefact prompting guide and changelog
