# A(DAI) Design Brief v1 -- Critical Evaluation Report

**Date:** 2026-03-19 (revised)
**Scope:** Systematic evaluation of 10 core claims in DESIGN-BRIEF-v1.md
**Method:** Each claim was independently researched against prior art, comparable projects, academic literature, and failure cases. This report synthesizes the findings.

**Revision note:** The CR-SQLite Matryoshka architecture section has been substantially revised following review of Giovanni's full technical proposal. The original evaluation was based on the design brief's description alone and made incorrect assumptions about the team's relationship to the technology. See Section 3 for corrected assessment.

---

## 1. Executive Summary

The A(DAI) design brief is an unusually ambitious and intellectually serious document. Its core insight -- that the digital arts field lacks a structured, queryable knowledge layer and that this gap is prior to governance, preservation, and market questions -- is genuinely original as a strategic position. The gravitational model, the merge boundary concept, and the "intention over attention" stance are not decorative framing; they are architectural commitments with real epistemological grounding. The brief reads like it was written by people who have thought carefully about why previous attempts at arts infrastructure failed, and who are trying not to repeat those failures. That seriousness is the brief's greatest asset.

The weaknesses are concentrated in three areas. First, the brief systematically overstates the novelty of its position by understating or ignoring what already exists. The claim that the NFT era left "no structural residue" is factually vulnerable -- Art Blocks, fxhash, Zora, on-chain provenance standards, and institutional adoption all persist. Are.na is never seriously engaged with as a direct precedent. The brief would be more persuasive if it acknowledged the partial infrastructure that exists and argued precisely for what is missing. Second, the technical architecture -- CR-SQLite with a Matryoshka nesting model and CRDT-based merging -- has real strengths that were initially underestimated (see revision note), particularly the typed edge schema and Giovanni's direct ownership of the CR-SQLite implementation. However, it contains open design questions that need resolution before build: the aggregation layer for field-wide queries, the intake/review flow before CRDT merge, and the contributor-facing tooling. The schema design is the strongest part of the proposal; the distributed layer needs scoping. Third, governance is simultaneously the brief's most sophisticated concern and its most dangerous gap. The merge boundary concept is well-designed as a transparency mechanism, but the brief conflates transparency with contestability, and it defers governance while already performing it through the founding team's vocabulary choices. Multiple research strands converged on the same finding: classification is governance, and claiming to defer governance while building a classification system is a philosophical contradiction the brief must resolve.

The timeline to Art Basel June 2026 is tight but not impossible -- provided the team scopes ruthlessly. The core value proposition does not require five rooms, a fully distributed database, and a complete governance framework simultaneously. What it requires is a well-seeded graph with typed semantic edges, one or two working rooms, a live contribution flow, and honest framing about what is built and what is architectural direction.

---

## 2. Claim-by-Claim Assessment Table

| Claim | Strength | Core Issue | Recommended Revision |
|---|---|---|---|
| **No shared knowledge layer exists for digital arts** | Moderate | Overstates the void; partial systems exist (Are.na, Art Genome, Rhizome, Wikidata). The specific gap -- relational, commons-governed field intelligence -- is real. | Reframe as "no system combines relational mapping, commons governance, and field-level synthesis" rather than claiming an empty field. |
| **Legibility must precede governance and preservation** | Moderate | Historical record shows co-evolution, not strict sequencing. The merge boundary is already governance. Bowker & Star demonstrate that classification *is* governance. | Reframe as "legibility and meta-governance concurrently." Define minimum viable governance alongside the legibility layer. |
| **Gravitational model inverts institutional hierarchy** | Moderate | Sound graph-theoretic principles, but preferential attachment (rich-get-richer) will likely reproduce hierarchies with different inputs. No normalization strategy for geographic or temporal bias. Edge weighting coefficients are unspecified curatorial choices. | Specify the centrality algorithm, normalization strategy, and edge weighting coefficients. Make all weights public and challengeable. Acknowledge the cold-start problem. |
| **Merge boundary as non-enclosing infrastructure** | Moderate | Transparency is well-designed (git-versioned skills files). But transparency does not equal contestability -- no challenge process, adjudication mechanism, or remedy pathway is specified. | Distinguish transparency from contestability. Replace "non-enclosure" with "transparent curation with declared assumptions." Specify a minimum viable challenge process. |
| **Frontier signals are the most valuable signals** | Moderate | Strong epistemological grounding (boundary objects, weak signals theory). Central unsolved problem: no operational way to distinguish genuine novelty from noise. No lifecycle model for frontier signals. | Add operational criteria for frontier signals, a lifecycle/expiry model, and a resolution for the gravitational model tension (frontier signals have low relational density by definition). |
| **CR-SQLite Matryoshka architecture** | Moderate (revised from Weak) | Schema design is strong. Giovanni maintains CR-SQLite himself -- not external experimental tech. "Matryoshka" is a clear nesting metaphor, not a confused reference to embeddings. Open questions remain: CRDT/editorial-review tension, aggregation layer for field-wide queries, contributor-facing tooling. | Resolve the five open design questions Giovanni flagged. Scope the build timeline with explicit milestones. Separate must-have-at-Basel from fast-follow. |
| **Five Rooms as interaction design** | Moderate | Conceptually novel combination of epistemic postures. No comparable knowledge system has implemented this. Five rooms for four people in three months is scope that guarantees underdelivery. | Prioritize and sequence rooms explicitly. Build 1-2 for Art Basel (Query + Sense recommended). Present remaining rooms as design concepts. |
| **Intention over attention (anti-engagement metrics)** | Moderate | Philosophically sound critique. But anti-engagement platforms consistently fail to sustain participation. No contributor feedback mechanism specified. Alternative metrics are underspecified. | Replace absolute rejection with a three-tier metric taxonomy: never build engagement optimization, always build system health diagnostics, design values-aligned contributor feedback. |
| **Art Basel as launch strategy (100-person encounter)** | Moderate | Art fairs have precedent as launch venues. Recognition response is achievable. But contribution-to-commitment conversion from events is historically 1-5%. No post-encounter infrastructure specified. Encounter format is undefined with 3 months remaining. | Specify the encounter format immediately. Build post-encounter conversion infrastructure before the encounter. Segment the 100-person target by contributor archetype. Consider pre-Basel salon series. |
| **Post-NFT field: no structural residue** | Weak | Art Blocks, fxhash, Zora, Manifold, institutional adoption, collector communities, and critical writing all persist. The claim is factually vulnerable and risks alienating the most likely early contributors. | Replace with precise language: the NFT era built transaction infrastructure but not knowledge infrastructure. Position A(DAI) as complementary to surviving platforms, not a replacement for a void. |

---

## 3. Cross-Cutting Themes

### Where the brief is strongest

**The epistemological framework.** The concepts of "provenance of meaning" (vs. ownership), "tendency vocabulary" (vs. fixed taxonomy), and the founding vocabulary as "hypothesis, not description" reflect genuine intellectual sophistication. These are not marketing language; they are design commitments that would produce a meaningfully different system if implemented. The brief's understanding of why previous arts infrastructure failed -- editorial bottlenecks at Rhizome, proprietary capture at Artsy, encyclopedic bias at Wikidata -- is precise and well-informed.

**The merge boundary as transparency mechanism.** Externalizing curatorial judgment into readable, diffable markdown files (skills/) and versioning every editorial decision through git is architecturally sound and genuinely unusual. Most knowledge systems hide their editorial logic in code or admin interfaces. A(DAI)'s approach makes the curation auditable at a level that few comparable systems achieve.

**The "intention over attention" commitment.** Rejecting engagement metrics is philosophically defensible and strategically distinctive. The proposed alternatives (relational density, edge diversity, provenance quality) are grounded in established network science. The stance correctly identifies that engagement optimization is incompatible with commons values.

**The typed edge schema and evidence-based graph.** (Added in revision.) Giovanni's proposal introduces typed semantic edges (PRACTICES, CRITIQUES, PIONEERED, INFLUENCES, etc.) with a composite primary key on edges -- (source_id, target_id, edge_type, signal_id) -- so that independent observations produce independent rows of evidence rather than competing writes. This is a genuinely well-designed data model that solves the current architecture's biggest gap: edges are currently co-occurrence only. The schema turns co-occurrence into semantics. Every edge traces back to a signal, every signal carries provenance. This is the single strongest technical contribution in the proposal.

### Where the brief is weakest

**Technical architecture -- open design questions.** The CR-SQLite Matryoshka architecture was initially assessed as the brief's most significant liability. This assessment was partially incorrect. The original evaluation assumed CR-SQLite was external experimental technology the team was adopting. In fact, Giovanni maintains his own C port of CR-SQLite, battle-tested across multiple production systems (Shards, Formable). He is not adopting unfamiliar technology -- he is proposing to use his own tool. The "Matryoshka" label is a straightforward nesting-doll metaphor for hierarchical databases (practitioner -> scene -> field), not a confused reference to Matryoshka embedding models as initially assumed.

What remains genuinely unresolved:
1. **The CRDT/editorial-review tension.** CRDTs merge automatically and irreversibly. The merge boundary requires editorial review. Giovanni's "CRDT diffs as pull requests" model is promising but underspecified: where does a signal live while awaiting review? Can a CRDT merge be reversed if review rejects it? If review happens before merge, the intake step is functionally a conventional approval queue, not a CRDT operation.
2. **The aggregation layer.** SQLite's ATTACH has a practical limit of ~10 databases. The gravitational model needs field-wide centrality computation. Giovanni flags this as an open question but does not propose a solution.
3. **Contributor-facing tooling.** The architecture describes what the database looks like but not what a practitioner sees. For "you own your data" to be real at Basel, contributors need a way to view, inspect, and correct their data. This tooling is unscoped.
4. **Schema evolution.** Adding new edge types across distributed databases requires migration coordination that is not addressed.
5. **Cross-scene edges.** Practitioners belong to multiple scenes. Edges cross boundaries. The nesting model assumes clean containment that cultural relationships do not provide.

Giovanni himself flagged five open design questions in his proposal. These are real and need resolution before build starts, but they are engineering questions with answers -- not fundamental architectural contradictions.

**Operational specificity.** The brief excels at articulating what A(DAI) *is* but is weak on how it actually *works* in practice. What happens when a contributor submits a signal? What feedback do they receive? How is a frontier signal distinguished from noise? What does the Art Basel encounter look like physically? How do users transition between rooms? These operational questions are not secondary -- they are where the system succeeds or fails.

**Scope discipline.** The brief describes a system that would take years to build in full: five interaction rooms, a distributed database architecture, a signal processing pipeline, a graph visualization engine, a multi-audience encounter format, contributor onboarding, post-event conversion infrastructure, and a governance framework. The team must choose what to build for Basel and what comes after. The brief needs to make hard cuts.

### Recurring blind spots

**No contributor feedback mechanism.** Across all ten research outputs, a consistent finding: the brief describes what the system does with signals but never specifies what contributors *see* as a result of their participation. Submitting a signal into a system that returns nothing is contributing into a void. Every successful commons -- Wikipedia, open source, Are.na -- provides some form of feedback that says "your contribution mattered." The anti-engagement stance, if interpreted absolutely, prevents building this. The brief must distinguish between engagement optimization (designing for compulsive use) and contribution feedback (telling people what happened with their input).

**No post-Basel conversion infrastructure.** The brief describes the Art Basel encounter in detail but says nothing about what happens afterward. Research on event-to-contributor conversion is unambiguous: without a pre-built follow-up system (onboarding flow, first-contribution pathway, community space, structured re-engagement), event energy dissipates within weeks. This infrastructure must be ready *before* Art Basel, not designed afterward.

**No accessibility analysis.** The Five Rooms are described entirely through visual and spatial metaphor. There is no consideration of non-visual interaction, cognitive accessibility, varying technical literacy, or mobile contexts. For a commons project, structural exclusion through design is antithetical to the mission.

**No landscape positioning.** The brief does not engage with Are.na, Feral File, Art Blocks, or fxhash as direct or adjacent precedents. This omission makes the brief appear either uninformed or deliberately evasive -- neither serves the project. A landscape analysis that honestly maps where A(DAI) sits relative to existing systems would strengthen, not weaken, the case.

### The governance gap

This was the single most consistent finding across all ten research strands. The brief claims to defer governance while simultaneously performing it through:

- The tendency vocabulary (who chose these tendencies?)
- The CLA extraction framework (who chose Causal Layered Analysis as the classification model?)
- The edge type ontology (who decided PIONEERED, CRITIQUES, INFLUENCES are the right relation types?)
- The merge boundary parameters (who sets auto-merge thresholds?)
- The six-stage processing protocol (who designed it?)

Every one of these is a governance decision that shapes what the system can see and how it categorizes what it finds. Bowker and Star's "Sorting Things Out" demonstrates conclusively that classification *is* governance -- there is no neutral way to make a field legible. Jo Freeman's "The Tyranny of Structurelessness" warns that claiming to have no governance simply creates invisible, unaccountable governance.

The brief partially addresses this by declaring the founding vocabulary as "hypothesis, not description" and making parameters public and versioned. This is genuinely better than most comparable systems. But it is not sufficient. The brief needs:

1. An explicit governance roadmap with stages (founding team curation -> contributor feedback -> formal contestation -> governance transition)
2. A minimum viable contestation mechanism (how does a contributor actually challenge a parameter?)
3. A clear statement about what happens when the founding team disagrees with a community challenge
4. Acknowledgment that the merge boundary is already governance, and should be designed as such

### The timeline reality

The full scope described in the brief is not achievable by Art Basel June 2026. However, the right subset is. The brief describes:

- A distributed database with CRDT merging (open design questions need resolution first -- weeks, not months, if Giovanni scopes them)
- Five distinct interaction rooms (build 1-2 for Basel, present the rest as design concepts)
- A signal processing pipeline with Claude API integration (buildable, already partially prototyped)
- Graph visualization with gravitational model (buildable on the typed edge schema)
- An encounter format for Art Basel (still unspecified -- needs immediate design attention)
- Post-encounter conversion infrastructure (not addressed -- must be built before Basel)
- Contributor onboarding flows (not addressed -- minimum viable version needed)
- Seeding the graph to demonstrable density (200-500+ nodes with rich typed edges)

The team must scope and sequence explicitly. The biggest risk is not that the technology is wrong -- it is that the team tries to build everything at once and ships nothing at the quality needed to generate the "recognition" response at Basel.

---

## 4. Priority Revisions for v2

Ranked by impact on the brief's credibility and the project's viability.

### 1. Scope the Art Basel deliverable ruthlessly

The brief should include a section titled "What we are building for Basel" that specifies exactly what will be demonstrated. Recommended minimum viable demonstration: the CR-SQLite schema with typed semantic edges and full provenance, 500+ densely connected nodes covering 3-5 well-mapped scenes, one fully functional room (Query), one experiential room (Sense), a live contribution flow where a visitor's input visibly changes the graph, and post-encounter follow-up infrastructure ready on day one. Everything else is declared as architectural direction.

### 2. Resolve the technical architecture's open questions

Giovanni should produce a scoped design document addressing:
- The intake/review flow: where signals live before review, how rejection works within the CRDT model
- The aggregation strategy for field-wide queries across distributed practitioner files
- The minimum viable contributor interface for Basel (what does a practitioner see in a browser?)
- Cross-scene edge ownership
- Schema evolution process

These need answers in the next 2-3 weeks to avoid blocking the build. The schema and typed edges should be locked first -- they are the clearest value and the foundation everything else depends on.

### 3. Add a governance roadmap

Replace the implicit claim that governance is deferred with an explicit governance development plan:
- **Phase 1 (pre-Basel):** Founding team curation with full transparency. All parameters public, versioned, auditable.
- **Phase 2 (post-Basel):** Contributor feedback mechanisms. Flags on classifications, aggregated review triggers.
- **Phase 3 (50+ active contributors):** Formal contestation process with documented challenge and adjudication flow.
- **Phase 4 (maturity):** Governance transition constraining founding team authority.

### 4. Revise the post-NFT market framing

Replace "the NFT cycle left no structural residue" with precise language: "The NFT era built transaction infrastructure -- on-chain provenance, creator contracts, marketplace protocols -- but not knowledge infrastructure. A(DAI) builds the missing layer: relational field intelligence that contextualizes what the NFT era made tradeable." This is more defensible, more accurate, and avoids alienating the practitioners most likely to contribute. Consider explicitly positioning A(DAI) as complementary to surviving platforms (Art Blocks, fxhash, Feral File) rather than as a replacement for a void.

### 5. Specify the contributor experience end-to-end

Add a section that walks through the complete contributor journey: submission -> acknowledgment -> processing -> feedback -> graph integration -> contributor notification. At minimum, define a "contribution receipt" -- when a signal is processed, the contributor sees what entities were extracted, what connections were formed, and where their signal sits in the graph. This is feedback, not engagement optimization.

### 6. Add operational definitions for the four alternative metrics

Each metric needs a computable definition:
- **Relational density:** Average weighted degree centrality, weighted by edge type diversity (Shannon entropy of edge types per node)
- **Edge diversity:** Distribution of edge types across the graph, measured against the ontology's full edge vocabulary
- **Provenance quality:** Percentage of signals with complete provenance chains (source, contributor, consent, confidence, processing log)
- **Frontier signal rate:** Rate of signals that generate new concept nodes or new edge types not in the existing ontology, with a lifecycle model (90-day time-to-live, then absorb/reclassify/archive)

Note the tension: relational density as a primary metric systematically undervalues frontier signals, which by definition have low connectivity. This contradiction needs explicit resolution.

### 7. Prioritize and sequence the Five Rooms

Add an explicit build roadmap:
1. **Query** -- proves the graph is useful (high knowledge value, medium build complexity)
2. **Sense** -- proves the system is experientially compelling (high demo value, medium build complexity)
3. **React** -- simplest to build, demonstrates the two-way principle
4. **Speculate** -- requires the most content and editorial infrastructure
5. **Experiment** -- requires the most technical research; defer to post-Basel

### 8. Design the Art Basel encounter concretely

Add a section specifying: physical format (installation? salon? dinner? booth?), encounter duration per visitor (5 minutes? 20 minutes?), intended visitor journey through the rooms, the specific contribution action visitors take, and what they leave with (physically and conceptually). Design backward from the 7-minute encounter: what must they see, do, and feel?

### 9. Build the post-Basel conversion funnel before Basel

Specify the infrastructure that must be ready before the encounter:
- A "contribute your first signal" flow completable in 5 minutes
- A community channel (Discord, Signal, or bespoke)
- A follow-up sequence at 48 hours, 1 week, and 1 month post-encounter
- A "founding contributor" designation for the first cohort

### 10. Add a landscape analysis section

Name and engage with Are.na, Feral File, Rhizome, Art Genome Project, Wikidata, Art Blocks, fxhash. For each, state what they built, what they cannot do, and where A(DAI) differs. This shows due diligence, prevents credibility challenges, and sharpens the value proposition through contrast.

---

## 5. Questions the Team Must Answer Before Proceeding

### Architecture and Technology

1. Giovanni: Can you produce a scoped design document resolving the five open questions you flagged (intake pipeline, scene membership, aggregation layer, browser access, edge classification)? These need answers before build starts.
2. Giovanni: When a signal is proposed via CRDT diff, where does it physically live before review accepts it? Is it in a staging table? A separate intake DB? What happens to the CRDT state if review rejects it?
3. Giovanni: For field-level gravitational queries across hundreds of practitioner files, what is your current best thinking on the aggregation strategy? Materialized views? Batch recomputation? Approximate methods?
4. Giovanni: What is the minimum browser-based interface a practitioner needs at Basel to experience data ownership? Can you scope that as a separate deliverable?
5. Giovanni: Have you tested edge type classification with Claude on real signals? What accuracy do you expect for distinguishing PRACTICES from CRITIQUES from PIONEERED?
6. Giovanni: What is the realistic build timeline for the full architecture? What must be ready at Basel vs. what follows in the months after?

### Governance and Curation

7. When the brief says "legibility before governance," what specifically is being deferred? The merge boundary is already governance -- how do you reconcile this?
8. What specific process does a contributor follow to challenge a curatorial parameter? Walk through a concrete example.
9. Is the founding team willing to accept a community override on a curatorial decision they disagree with? Under what conditions?
10. How does the team distinguish between "provisional vocabulary that evolves" and "founding-team vocabulary that becomes default through inertia"? What structural mechanisms prevent the latter?
11. What happens when two practitioners disagree about how they are represented in the graph?

### Metrics and Sustainability

12. When a contributor submits a signal and it is processed, what do they see? If the answer is "nothing," how do you expect sustained contribution?
13. How will you report impact to funders? If a foundation asks "what did our grant achieve," what do you provide?
14. How does relational density as a primary metric interact with the goal of valuing frontier signals? Frontier signals have low relational density by definition.
15. What happens in year 3 or year 5 when the founding team's intrinsic motivation may wane? What sustains maintenance labor?

### Art Basel and Launch

16. What is the encounter format? Physical space, duration, visitor journey. Has this been designed?
17. Which 1-2 audience segments (practitioners, curators, collectors, institutional, technologists) are the primary target for contribution? How does the encounter serve them?
18. What post-encounter infrastructure exists or is planned? How does someone who sees the demo become a contributor within 48 hours?
19. What is the minimum viable graph density that would generate the "recognition" response? Has this been tested outside the founding team?
20. At Basel, who actually reviews proposed signals before they merge into practitioner DBs? If it is the founding team, how much review volume can four people handle alongside running the encounter?

### Field and Community

21. What specific value does a practitioner receive from contributing to A(DAI) that they do not get from Are.na, Discord, or their existing network?
22. Have you engaged with Rhizome, Feral File, or Are.na about potential data partnerships or interoperability?
23. How will you seed the initial graph? What is the target node count and what sources will you draw from?
24. If practitioners resist having their practice taxonomized even with the "tendencies" framing, what is the response?
25. Who in the team's existing network can serve as founding contributors? How many, and have they been approached?
26. On-chain attestation systems (EAS, Manifold contracts) could serve as infrastructure for meaning provenance. Has the team considered building bridges to existing on-chain provenance rather than parallel systems?

---

## 6. Key Sources

Organized by theme, drawn from across all ten research outputs. Sources marked [uncertain] had their existence or details flagged as uncertain by the research process.

### Commons Governance and Theory

- **Ostrom, E. (1990). *Governing the Commons*.** Foundational design principles for long-enduring commons. Demonstrates co-evolution of resource definition and governance.
- **Bowker, G.C. & Star, S.L. (1999). *Sorting Things Out: Classification and Its Consequences*.** Classification systems are inherently political. Creating categories is governance. Essential reading for the merge boundary.
- **Freeman, J. (1972). "The Tyranny of Structurelessness."** Claiming to have no governance creates invisible, unaccountable governance. Directly applicable to governance deferral.
- **Benkler, Y. (2006). *The Wealth of Networks*.** Commons-based peer production theory. Contributor motivation in non-market systems.
- **Eghbal, N. (2020). *Working in Public*.** Open-source contributor funnels, maintenance labor, governance sustainability. Directly applicable to A(DAI)'s contributor challenge.
- **Scott, J.C. (1998). *Seeing Like a State*.** Legibility as a precondition for governance -- and as a mechanism of control.

### Network Science and Graph Models

- **Barabasi, A.-L. & Albert, R. (1999). "Emergence of Scaling in Random Networks."** Preferential attachment produces power-law hierarchies. Rich-get-richer dynamics in relational density models.
- **Bonacich, P. (1987). "Power and Centrality."** Eigenvector centrality in social networks. Mathematical basis for the gravitational model.
- **Wang, D. & Barabasi, A.-L. (2021). *The Science of Science*.** Citation networks as cultural significance measures. Matthew Effects in network-based impact metrics.
- **Barabasi, A.-L. (2016). *Network Science*.** Framework for computing relational density, clustering, and centrality.
- **Noble, S.U. (2018). *Algorithms of Oppression*.** Data availability biases in algorithmic systems reproduce structural inequalities.

### Epistemology and Classification

- **Star, S.L. & Griesemer, J. (1989). "Boundary Objects."** Objects at the intersection of social worlds resist classification and enable cooperation. Theoretical basis for frontier signals.
- **Galison, P. (1997). *Image and Logic*.** Trading zones where communities develop shared pidgin languages at boundaries.
- **Hiltunen, E. (2008). "A Framework for Understanding Weak Signals."** Weak signals are ambiguous and resist classification. High false-positive rate is inherent.
- **Douglas, M. (1966). *Purity and Danger*.** Anomalous categories carry disproportionate symbolic power.
- **Bourdieu, P. (1993). *The Field of Cultural Production*.** Classification systems in cultural fields reproduce power structures.

### Interaction Design and Experience

- **Ishii, H. (1997). "Tangible Bits."** Multi-modal interfaces reveal different aspects of the same data. Foundation for Five Rooms concept.
- **Dunne, A. & Raby, F. (2013). *Speculative Everything*.** Speculative design as interaction methodology. Relevant to Rooms 3-5.
- **Case, A. (2015). *Calm Technology*.** Non-engagement design principles. Theoretical ancestor of "intention over attention."
- **Weiser, M. & Brown, J.S. (1995). "Designing Calm Technology."** Original calm tech principles.

### Digital Art Infrastructure

- **Rhizome ArtBase** (https://artbase.rhizome.org/) -- Premier digital art archive, ~2,400 works. Editorial bottleneck limits scale.
- **Are.na** (https://www.are.na/) -- Collaborative knowledge platform. Closest existing community precedent.
- **Feral File** (https://feralfile.com/) -- Artist-curated digital art exhibitions with on-chain provenance.
- **Art Blocks** (https://www.artblocks.io/) -- Curated on-chain generative art. Key counterexample to "no structural residue."
- **fxhash** (https://www.fxhash.xyz/) -- Open generative art platform, survived the NFT downturn.
- **Artsy Art Genome Project** (https://www.artsy.net/categories) -- ~1,300-gene structured art taxonomy. Proprietary.
- **Getty AAT** (https://www.getty.edu/research/tools/vocabularies/aat/) -- Gold standard institutional art vocabulary.

### Technical Infrastructure

- **Kleppmann, M. et al. (2019). "Local-First Software."** Foundational principles for practitioner-owned data.
- **Shapiro, M. et al. (2011). "Conflict-Free Replicated Data Types."** CRDT guarantees and limitations.
- **Giovanni's CR-SQLite C port** (https://github.com/shards-lang/cr-sqlite) -- The actual implementation A(DAI) would use. Maintained by the team's own developer, battle-tested in production.
- **ElectricSQL** (https://electric-sql.com/) -- Local-first SQLite sync. Pivoted away from full CRDT approach, but Giovanni's position is materially different as he controls the implementation. [uncertain -- ElectricSQL status may have changed]
- **Alfrink, K. et al. (2023). "Contestable AI by Design."** Framework: visibility, challenge channel, remedy mechanism.

### Contestability and Governance Precedents

- **Halfaker, A. et al. (2013). "The Rise and Decline of an Open Collaboration System."** Wikipedia's transparency-based governance still produced exclusion and power concentration.
- **Buterin, V. (2020). "Credible Neutrality as a Guiding Principle."** Infrastructure mechanisms must be credibly neutral.
- **Rust RFC Process** (https://rust-lang.github.io/rfcs/) -- Best-in-class versioned, debated parameter changes.
- **Wikidata Property Proposal process** (https://www.wikidata.org/wiki/Wikidata:Property_proposal) -- Community-governed ontological evolution.
- **DORA -- San Francisco Declaration on Research Assessment (2012).** Difficulty of replacing entrenched metrics with quality-oriented alternatives.

---

*This report was generated from 10 independent research outputs evaluating specific claims in DESIGN-BRIEF-v1.md. Each research output examined supporting evidence, counter-evidence, blind spots, comparable projects, failure cases, and implementation risks. The CR-SQLite Matryoshka architecture section was revised after reviewing Giovanni's full technical proposal, which corrected several assumptions in the original evaluation. The findings were synthesized, deduplicated, and prioritized for this evaluation.*
