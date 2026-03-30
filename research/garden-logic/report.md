# Garden Logic Comparative Analysis — Ontology, Neural KGs, Media as Training Data, Intention Economy, Attention Critique, Provocations, Pre-Movement Sensing

**Comparative anchor:** The Garden Logic: How A(DAI) Becomes an Institution Through Generative Intention

**Items researched:** 72

**Fields per item:** 34

**Date:** 2026-03-23

**Comparative dimensions:**

- Does this item support or challenge the intention-over-attention distinction?
- Does it offer a technical precedent for any Garden Logic layer (substrate, sensing, prompt, participation)?
- Does it address coherence-without-consensus or default to consensus?
- Does it handle absence detection, structural gaps, or blind spots?
- Does it support forkability, distributed sovereignty, or commons governance?
- What is its temporal logic — real-time (attention) or tidal/cyclical (intention)?
- Does it embed its critique in architecture or in rhetoric?

---

## Table of Contents


### Ontology & Knowledge Representation

| # | Item | Layer | Key Adoption |
|---|------|-------|-------------|
| 1 | [CIDOC-CRM](#cidoc-crm) | substrate — CIDOC-CRM operates at the… | The event-centric data model pattern. Anchoring assertions to events (creation,… |
| 2 | [Wikidata / Wikibase](#wikidata-wikibase) | substrate + participation — Wikidata… | The qualifier and reference system as a model for provenance-rich assertions.… |
| 3 | [Schema.org](#schemaorg) | substrate — Schema.org is pure data… | The Pending mechanism as a model for vocabulary proposals. Schema.org's staging… |
| 4 | [Getty ULAN / AAT / TGN](#getty-ulan-aat-tgn) | substrate — The Getty vocabularies are… | The rich relational vocabulary between artists in ULAN (teacher-of, student-of,… |
| 5 | [SKOS (Simple Knowledge Organization System)](#skos-simple-knowledge-organization-system) | substrate — SKOS operates at the… | The concept scheme architecture for organizing tendency vocabularies. Each… |
| 6 | [OntoGPT / LLM-driven ontology learning](#ontogpt-llm-driven-ontology-learning) | sensing-loop — LLM ontology learning… | The SPIRES pattern: define a schema template, extract structured instances from… |
| 7 | [Emergent ontology / taxonomy induction](#emergent-ontology-taxonomy-induction) | sensing-loop — Emergent ontology… | DeepOnto's ontology alignment capabilities for connecting A(DAI)'s vocabulary… |
| 8 | [CR-SQLite / Automerge / Local-first Software](#cr-sqlite-automerge-local-first-software) | substrate. CRDTs provide the mechanical… | CRDT-based graph replication as the mechanical substrate for fork-and-merge… |
| 9 | [CHAD-KG (2025)](#chad-kg-2025) | substrate. CHAD-KG demonstrates how… | The composition method: A(DAI) should study how CHAD-KG composes CIDOC-CRM,… |

### Neural Knowledge Graphs

| # | Item | Layer | Key Adoption |
|---|------|-------|-------------|
| 10 | [GraphRAG (Microsoft, 2024)](#graphrag-microsoft-2024) | sensing-loop + prompt-generation —… | The Leiden community detection as a technique for cluster analysis in the… |
| 11 | [LightRAG (EMNLP 2025)](#lightrag-emnlp-2025) | sensing-loop — LightRAG's… | The dual-level retrieval concept as a model for A(DAI)'s multi-resolution… |
| 12 | [NodeRAG (2025)](#noderag-2025) | substrate + sensing-loop — The… | The heterogeneous graph architecture as validation for A(DAI)'s 17-node-type… |
| 13 | [Knowledge Graph Embeddings (TransE, RotatE, ComplEx)](#knowledge-graph-embeddings-transe-rotate-complex) | sensing-loop + prompt-generation — Link… | Link prediction as the primary computational mechanism for coherence prompts.… |
| 14 | [Think-on-Graph / KAPING / KG-augmented LLM reasoning](#think-on-graph-kaping-kg-augmented-llm-reasoning) | prompt-generation — KG-augmented LLM… | The graph-context injection pattern for coherence prompts. Instead of A(DAI)'s… |
| 15 | [Neo4j + Vector Search / hybrid graph-vector stores](#neo4j-vector-search-hybrid-graph-vector-stores) | substrate — Neo4j + vector search is… | The hybrid structural + semantic query pattern. A(DAI) needs to query both by… |
| 16 | [Multimodal Knowledge Graphs](#multimodal-knowledge-graphs) | substrate + sensing-loop — MMKGs… | The Matryoshka multimodal embedding approach (referenced in the Design Brief… |
| 17 | [Graphiti / Zep (2025)](#graphiti-zep-2025) | substrate + sensing-loop. The… | The bi-temporal model is the single most important technical adoption from this… |
| 18 | [AutoSchemaKG (2025)](#autoschemakg-2025) | substrate. AutoSchemaKG addresses how… | Dynamic schema extension as a mechanism for A(DAI)'s vocabulary evolution (Mode… |
| 19 | [KG Incompleteness as Feature (NSF-KGE, 2024)](#kg-incompleteness-as-feature-nsf-kge-2024) | substrate. NSF-KGE provides a technical… | The Open World Assumption as the fundamental principle for A(DAI)'s graph… |
| 20 | [Temporal KG Reasoning — LGevo (2024)](#temporal-kg-reasoning-lgevo-2024) | substrate — LGevo provides a technical… | The cyclical pattern detection as a technical model for A(DAI)'s tidal… |

### Media as Training Data

| # | Item | Layer | Key Adoption |
|---|------|-------|-------------|
| 21 | [Spawning AI / Have I Been Trained / Source.Plus](#spawning-ai-have-i-been-trained-sourceplus) | substrate — Spawning operates at the… | The datadiligence pattern of checking provenance and consent at processing time… |
| 22 | [The Pile / LAION-5B / Common Crawl debates](#the-pile-laion-5b-common-crawl-debates) | none — these datasets represent the… | Nothing from the dataset construction methodology. However, A(DAI) should study… |
| 23 | [Data-centric AI movement (Datacomp, DataPerf)](#data-centric-ai-movement-datacomp-dataperf) | sensing-loop — Data-centric AI's… | The 'data ratchet' concept — using processed outputs to evaluate and improve… |
| 24 | [Indigenous Data Sovereignty (CARE Principles)](#indigenous-data-sovereignty-care-principles) | participation — CARE maps most directly… | The fundamental question: whose commons? A(DAI) must build governance… |
| 25 | [W3C PROV / Model Cards / Datasheets for Datasets](#w3c-prov-model-cards-datasheets-for-datasets) | substrate — Provenance standards map… | W3C PROV as the formal provenance model for the signal pipeline. Every signal… |
| 26 | [AI training data governance 2025-2026 (EU AI Act, California AB 2013, CONSENT Act)](#ai-training-data-governance-2025-2026-eu-ai-act-california-ab-2013-consent-act) | none directly — these are external… | Compliance as a design constraint. A(DAI) should build its signal pipeline to… |
| 27 | [Consent in Crisis — AI Data Commons Decline (2024)](#consent-in-crisis-ai-data-commons-decline-2024) | sensing-loop + participation. The paper… | The empirical finding as a design constraint: A(DAI) cannot rely on web-scraped… |
| 28 | [Transparency Coalition (TCAI) — Do Not Train Standard](#transparency-coalition-tcai-do-not-train-standard) | participation. DNT maps to A(DAI)'s… | Respect for DNT tags in the intake pipeline — A(DAI) must not ingest content… |

### Intention Economy

| # | Item | Layer | Key Adoption |
|---|------|-------|-------------|
| 29 | [Doc Searls — The Intention Economy (2012)](#doc-searls-the-intention-economy-2012) | prompt-generation — Searls' intention… | The fundamental inversion: systems should serve declared structural needs, not… |
| 30 | [VRM (Vendor Relationship Management)](#vrm-vendor-relationship-management) | substrate / sensing-loop — VRM's… | The inversion pattern: A(DAI) inverts platform analytics the way VRM inverts… |
| 31 | [Solid Project (Tim Berners-Lee)](#solid-project-tim-berners-lee) | substrate — Solid maps to A(DAI)'s… | The decoupling principle: separate data from applications. A(DAI) should design… |
| 32 | [Protocol Labs / IPFS / Filecoin](#protocol-labs-ipfs-filecoin) | substrate — IPFS/Filecoin maps to… | Content-addressing for the intelligence graph. If graph-data.json had a CID,… |
| 33 | [Ostrom's Commons Governance (Governing the Commons, 1990)](#ostroms-commons-governance-governing-the-commons-1990) | participation — Ostrom's governance… | All eight design principles as the governance framework for the merge boundary.… |
| 34 | [IEEE 7012 / MyTerms (Doc Searls, 2025)](#ieee-7012-myterms-doc-searls-2025) | participation — MyTerms governs the… | The merge boundary should support machine-readable contributor terms. If a… |
| 35 | [Chaudhary & Penn — 'Beware the Intention Economy' (Harvard Data Science Review, 2024)](#chaudhary-penn-beware-the-intention-economy-harvard-data-science-review-2024) | none — this is a critical analysis, not… | The temporal analysis of intent — A(DAI) should understand that its prompts… |
| 36 | [Data Cooperatives as AI Governance (Harvard Ash Center, 2024)](#data-cooperatives-as-ai-governance-harvard-ash-center-2024) | participation — directly relevant to… | The cooperative governance model for the merge boundary — rather than… |
| 37 | [Platform Cooperativism (Scholz, 2014->)](#platform-cooperativism-scholz-2014-) | participation — Platform cooperativism… | The question: who governs the merge boundary? A(DAI) should adopt platform… |

### Attention Economy Critique

| # | Item | Layer | Key Adoption |
|---|------|-------|-------------|
| 38 | [Georg Franck — The Economy of Attention (1998)](#georg-franck-the-economy-of-attention-1998) | none — Franck's theory IS the system… | The analytical precision. Franck's framework is the best diagnostic tool for… |
| 39 | [Yves Citton — The Ecology of Attention (2017)](#yves-citton-the-ecology-of-attention-2017) | sensing-loop — Citton's ecology of… | The 'echosystem' concept as a model for how signals circulate through A(DAI)'s… |
| 40 | [Shoshana Zuboff — Surveillance Capitalism (2019)](#shoshana-zuboff-surveillance-capitalism-2019) | none — Zuboff describes the extraction… | The diagnostic framework. Zuboff provides the most powerful analytical tools… |
| 41 | [Jenny Odell — How to Do Nothing (2019)](#jenny-odell-how-to-do-nothing-2019) | Substrate layer. Odell's work provides… | The philosophical grounding that tidal rhythms and cyclical temporality are not… |
| 42 | [Jonathan Crary — Scorched Earth (2022)](#jonathan-crary-scorched-earth-2022) | None directly — Crary would likely… | The structural link between attention enclosure and ecological collapse. If… |
| 43 | [Tim Wu — The Attention Merchants (2016)](#tim-wu-the-attention-merchants-2016) | Sensing loop. Wu's historical analysis… | The 200-year pattern as diagnostic context. A(DAI) should embed Wu's historical… |
| 44 | [James Williams — Stand Out of Our Light (2018)](#james-williams-stand-out-of-our-light-2018) | Sensing loop and prompt-generation… | The three-level attention model as a diagnostic tool for A(DAI)'s own… |
| 45 | [Kate Crawford — Atlas of AI (2021)](#kate-crawford-atlas-of-ai-2021) | none — this is a critique that applies… | A(DAI) should include a materiality layer in its self-description —… |
| 46 | [AI Attention Economy Ouroboros (2025)](#ai-attention-economy-ouroboros-2025) | sensing-loop — the ouroboros directly… | Ouroboros detection as a first-class concern in the pipeline. Specific… |

### Provocations & Artistic Precedents

| # | Item | Layer | Key Adoption |
|---|------|-------|-------------|
| 47 | [Forensic Architecture](#forensic-architecture) | Sensing loop and participation layer.… | FA's treatment of absence as a first-class analytical category maps directly to… |
| 48 | [Hito Steyerl](#hito-steyerl) | Sensing loop and prompt-generation.… | Steyerl's mapping of commons-vs-enclosure dynamics specifically within the art… |
| 49 | [Holly Herndon + Mat Dryhurst + Spawning](#holly-herndon-mat-dryhurst-spawning) | Substrate and participation layers.… | The practitioner-as-institution-builder model. Herndon/Dryhurst demonstrate… |
| 50 | [Sougwen Chung](#sougwen-chung) | Sensing loop (the DOUG feedback system… | Chung's trajectory as the primary case study for A(DAI)'s tendency analysis.… |
| 51 | [Jonas Staal — New World Summit](#jonas-staal-new-world-summit) | Participation layer primarily. Staal's… | The principle that institutions can be artworks and artworks can be… |
| 52 | [Furtherfield](#furtherfield) | All layers. Furtherfield operates… | The durational commitment. Furtherfield's primary lesson is that commons… |
| 53 | [Benjamin Bratton — The Stack](#benjamin-bratton-the-stack) | Meta-layer — The Stack maps the… | The Stack as the map of A(DAI)'s operating environment. A(DAI) should… |
| 54 | [Crawford & Joler — Calculating Empires (2023)](#crawford-joler-calculating-empires-2023) | substrate — provides the… | The deep-historical framing for A(DAI)'s myth prompts and CLA Layer 4… |
| 55 | [Holly Herndon — The Call (Serpentine, 2024-2025)](#holly-herndon-the-call-serpentine-2024-2025) | participation — directly relevant to… | The Data Trust model for contributor governance. A(DAI) could establish a data… |
| 56 | [Lev Manovich — Cultural Analytics (2007-2025)](#lev-manovich-cultural-analytics-2007-2025) | sensing-loop — Cultural Analytics is… | The commitment to seeing culture computationally before theorizing it — A(DAI)… |

### Sensing Mechanisms That Precede Movements

| # | Item | Layer | Key Adoption |
|---|------|-------|-------------|
| 57 | [Weak Signals (Igor Ansoff, 1975)](#weak-signals-igor-ansoff-1975) | Sensing loop. Weak signals are the raw… | Already adopted as the frontier signal concept. What A(DAI) should deepen is… |
| 58 | [Three Horizons Framework (Bill Sharpe, 2013)](#three-horizons-framework-bill-sharpe-2013) | Prompt-generation layer. Three Horizons… | The H2+/H2- distinction as a core analytical tool. For every signal A(DAI)… |
| 59 | [Santa Fe Institute — Complex Adaptive Systems](#santa-fe-institute-complex-adaptive-systems) | substrate. SFI's complex systems theory… | Power-law awareness in graph topology: expect a few densely connected nodes and… |
| 60 | [Dark Matter Labs / Indy Johar](#dark-matter-labs-indy-johar) | sensing-loop + participation. DML maps… | The dark matter diagnostic: A(DAI) should look not just at visible cultural… |
| 61 | [Pierre Bourdieu — Field Theory / Cultural Capital](#pierre-bourdieu-field-theory-cultural-capital) | sensing-loop + prompt-generation.… | Field analysis as A(DAI)'s theoretical vocabulary for what the graph does:… |
| 62 | [Bruno Latour — Actor-Network Theory](#bruno-latour-actor-network-theory) | substrate + sensing-loop. ANT provides… | The flat ontology: A(DAI)'s graph should not privilege human practitioners over… |
| 63 | [Robert Rosen — Anticipatory Systems (1985, renewed 2024)](#robert-rosen-anticipatory-systems-1985-renewed-2024) | sensing-loop — Rosen's anticipatory… | The formal concept of the modeling relation as the foundation for the dream… |
| 64 | [Maturana & Varela — Autopoiesis (1972)](#maturana-varela-autopoiesis-1972) | substrate — autopoiesis describes the… | The concept of operational closure as a design principle for the merge boundary… |
| 65 | [ScenarioDNA — Culture Mapping](#scenariodna-culture-mapping) | sensing-loop — ScenarioDNA is the… | The rigor of systematic semiotic analysis — ScenarioDNA's method of decoding… |
| 66 | [Sitra Weak Signals (Finland)](#sitra-weak-signals-finland) | sensing-loop — Sitra's weak signal… | The PESTEC classification as a complement to A(DAI)'s tendency vocabulary —… |
| 67 | [Ronald Burt — Structural Holes Theory (1992)](#ronald-burt-structural-holes-theory-1992) | sensing-loop and prompt-generation —… | The structural holes concept as the formal foundation for the coherence prompt.… |
| 68 | [Donna Haraway — Sympoiesis / Making-With](#donna-haraway-sympoiesis-making-with) | substrate — sympoiesis is the deepest… | The self-description. A(DAI) should describe itself as sympoietic rather than… |
| 69 | [Anticipatory Governance (David Guston)](#anticipatory-governance-david-guston) | sensing-loop. Anticipatory governance… | The three-capacity model (foresight + engagement + integration) as the explicit… |
| 70 | [Causal Layered Analysis (Sohail Inayatullah)](#causal-layered-analysis-sohail-inayatullah) | Directly adopted as A(DAI)'s dream… | Already adopted as the dream cycle's analytical framework. What A(DAI) should… |
| 71 | [Cynefin Framework](#cynefin-framework) | sensing-loop. Cynefin maps directly to… | The probe-sense-respond cycle as the explicit operational logic for A(DAI)'s… |
| 72 | [Will Straw — Scene Analysis](#will-straw-scene-analysis) | sensing-loop. Scene analysis provides… | The ontological distinction between scene and community as separate entity… |

---

## Comparative Synthesis

### Intention vs. Attention Spectrum

How each item positions itself relative to A(DAI)'s core distinction:

**Intention-aligned** (50 items):

- **OntoGPT / LLM-driven ontology learning**: Intention-adjacent but not intention-native. LLM ontology learning finds concepts (what exists in…
- **Emergent ontology / taxonomy induction**: Intention-aligned but attention-contaminated. The goal of taxonomy induction — discovering the…
- **LightRAG (EMNLP 2025)**: Attention, but with a structural hint of intention. The dual-level retrieval model is interesting…
- **Knowledge Graph Embeddings (TransE, RotatE, ComplEx)**: Intention-native in a limited sense. Link prediction is structural diagnosis — it identifies what…
- **Think-on-Graph / KAPING / KG-augmented LLM reasoning**: Attention-oriented with intention-enabling mechanisms. The systems answer questions (attention) but…
- **Spawning AI / Have I Been Trained / Source.Plus**: Pure intention. Spawning's entire architecture is organized around creator intent (what they…
- **Indigenous Data Sovereignty (CARE Principles)**: Intention, but a deeper form than A(DAI) currently articulates. CARE's intention is not just…
- **W3C PROV / Model Cards / Datasheets for Datasets**: Intention-enabling infrastructure. Provenance standards do not generate intention themselves, but…
- **Doc Searls — The Intention Economy (2012)**: The conceptual origin of A(DAI)'s intention/attention distinction. Searls names the structural…
- **VRM (Vendor Relationship Management)**: Pure intention infrastructure. VRM is the technical implementation of the intention economy — tools…
- **Solid Project (Tim Berners-Lee)**: Intention-enabling through data sovereignty. Solid does not generate intention directly, but by…
- **Protocol Labs / IPFS / Filecoin**: Infrastructure-neutral but intention-enabling. Content-addressing does not optimize for either…
- **Ostrom's Commons Governance (Governing the Commons, 1990)**: Intention through governance design. Ostrom's communities do not optimize for engagement or…
- **Jenny Odell — How to Do Nothing (2019)**: Firmly intention-oriented. Odell's entire project is a refusal of attention logic. However, she…
- **Tim Wu — The Attention Merchants (2016)**: Wu documents the attention side comprehensively but does not theorize intention as an alternative.…
- **James Williams — Stand Out of Our Light (2018)**: Williams provides the clearest articulation of why attention and intention are different things.…
- **Forensic Architecture**: Strongly intention-oriented. FA does not optimize for engagement or novelty but for accountability…
- **Holly Herndon + Mat Dryhurst + Spawning**: Strongly intention-oriented. Spawning replaces 'who gets the most attention?' with 'who consented…
- **Sougwen Chung**: The practice sits at a tension point. The process is intention-oriented — deep engagement with…
- **Jonas Staal — New World Summit**: Strongly intention-oriented. Staal's assemblies are designed to produce structural diagnosis of…
- **Furtherfield**: Firmly intention-oriented. Furtherfield has never optimized for attention metrics. Their intention…
- **Benjamin Bratton — The Stack**: Bratton does not directly address the intention/attention distinction, but his framework implies…
- **Weak Signals (Igor Ansoff, 1975)**: Weak signal detection is inherently intention-oriented. It requires deliberate, structured…
- **Three Horizons Framework (Bill Sharpe, 2013)**: The framework makes the intention/attention distinction structural and temporal. H1 (attention…
- **Santa Fe Institute — Complex Adaptive Systems**: SFI's framework is analytically neutral — it can model both intention and attention systems.…
- **Dark Matter Labs / Indy Johar**: DML is the purest institutional expression of intention logic. It diagnoses structural conditions…
- **CR-SQLite / Automerge / Local-first Software**: CRDTs are intention-neutral at the data layer — they guarantee convergence regardless of what the…
- **Pierre Bourdieu — Field Theory / Cultural Capital**: Bourdieu's framework is the deepest theoretical articulation of the intention/attention…
- **Graphiti / Zep (2025)**: Graphiti's design is intention-aligned at the mechanical level: it prioritises temporal accuracy…
- **AutoSchemaKG (2025)**: AutoSchemaKG is intention-neutral. It does not discriminate between signals based on intention or…
- **KG Incompleteness as Feature (NSF-KGE, 2024)**: NSF-KGE is the deepest technical alignment with A(DAI)'s intention logic in this entire research…
- **CHAD-KG (2025)**: CHAD-KG is neither intention- nor attention-oriented. It is descriptive — documenting what exists…
- **Consent in Crisis — AI Data Commons Decline (2024)**: The paper documents the failure of both intention and attention logic in web data governance.…
- **IEEE 7012 / MyTerms (Doc Searls, 2025)**: Strongly intention-aligned. MyTerms operationalizes individual intention as machine-readable terms…
- **Chaudhary & Penn — 'Beware the Intention Economy' (Harvard Data Science Review, 2024)**: THE critical inversion. Chaudhary and Penn redefine 'intention economy' as the commodification of…
- **Data Cooperatives as AI Governance (Harvard Ash Center, 2024)**: Intention-aligned in governance structure — cooperative members collectively determine their…
- **Kate Crawford — Atlas of AI (2021)**: Critiques both attention and intention frameworks for ignoring material conditions. Crawford would…
- **Crawford & Joler — Calculating Empires (2023)**: Transcends the intention/attention distinction by historicizing both. The genealogy shows that…
- **AI Attention Economy Ouroboros (2025)**: Reveals the convergence risk: even intention-oriented systems can become ouroboric if their sensing…
- **Holly Herndon — The Call (Serpentine, 2024-2025)**: Intention-aligned through collective creative practice. The choirs' intention is to create a shared…
- **Lev Manovich — Cultural Analytics (2007-2025)**: Cultural Analytics operates in a space between intention and attention. The methodology itself is…
- **Robert Rosen — Anticipatory Systems (1985, renewed 2024)**: Profoundly intention-aligned, but in a specific formal sense. Anticipatory systems do not respond…
- **ScenarioDNA — Culture Mapping**: ScenarioDNA operates in the intention-to-attention pipeline: it senses cultural intentions (what…
- **Sitra Weak Signals (Finland)**: Intention-aligned in method but institutional in application. The weak signal methodology…
- **Donna Haraway — Sympoiesis / Making-With**: Sympoiesis transcends the intention/attention distinction by questioning the entity that 'intends'…
- **Platform Cooperativism (Scholz, 2014->)**: Intention through democratic governance. Cooperatives serve member-declared needs rather than…
- **Anticipatory Governance (David Guston)**: Anticipatory governance is the most explicitly intention-aligned governance framework in this…
- **Causal Layered Analysis (Sohail Inayatullah)**: Strongly intention-oriented. CLA's purpose is structural diagnosis — revealing the deep layers…
- **Cynefin Framework**: Cynefin is fundamentally an intention framework. It diagnoses the structural nature of a situation…
- **Will Straw — Scene Analysis**: Scene theory is diagnostically intention-oriented: it asks 'how do cultural formations come into…

**Attention-aligned** (10 items):

- **Schema.org**: Serves the attention economy directly. Schema.org markup exists to help search engines allocate…
- **GraphRAG (Microsoft, 2024)**: Primarily attention. GraphRAG is designed to answer user queries — it allocates attention to the…
- **NodeRAG (2025)**: Attention, but with the richest structural foundation among RAG systems. NodeRAG's 7 node types…
- **The Pile / LAION-5B / Common Crawl debates**: Pure attention crystallization. These datasets encode the web's attention hierarchies directly into…
- **AI training data governance 2025-2026 (EU AI Act, California AB 2013, CONSENT Act)**: These regulations constrain attention-economy infrastructure but do not generate intention. They…
- **Georg Franck — The Economy of Attention (1998)**: Pure attention theory. Franck's entire framework analyzes attention as an economic force. There is…
- **Shoshana Zuboff — Surveillance Capitalism (2019)**: Attention as extraction mechanism for behavioral prediction. Zuboff reveals that the attention…
- **Jonathan Crary — Scorched Earth (2022)**: Crary provides the most radical critique of attention logic. His argument implies that…
- **Hito Steyerl**: Steyerl operates within the attention economy while critiquing it — her work is some of the most…
- **Transparency Coalition (TCAI) — Do Not Train Standard**: TCAI operates within attention-economy logic — it is a defensive response to extractive AI…

**Neither / Orthogonal** (12 items):

- **CIDOC-CRM**: Neither, strictly. CIDOC-CRM serves institutional documentation, not diagnosis or engagement. It…
- **Wikidata / Wikibase**: Neither optimally. Wikidata is designed for reference — answering factual queries. It does not…
- **Getty ULAN / AAT / TGN**: Neither. The vocabularies serve reference — providing stable, authoritative terms for cataloguing.…
- **SKOS (Simple Knowledge Organization System)**: Neither. SKOS is a representational format, not an optimization system. It does not diagnose gaps…
- **Neo4j + Vector Search / hybrid graph-vector stores**: Infrastructure that can serve either. The hybrid query capability (structural pattern matching +…
- **Multimodal Knowledge Graphs**: Both, depending on application. Multimodal data enables richer structural diagnosis (intention —…
- **Data-centric AI movement (Datacomp, DataPerf)**: Technically neutral — data-centric AI optimizes for task performance, which could serve either…
- **Yves Citton — The Ecology of Attention (2017)**: The closest intellectual ally to A(DAI), with a crucial difference. Citton's ecology still centers…
- **Bruno Latour — Actor-Network Theory**: ANT is descriptively neutral — it follows the actors without normative commitment. However, its…
- **Maturana & Varela — Autopoiesis (1972)**: Neither — autopoiesis describes a system that does not attend to or intend toward its environment.…
- **Ronald Burt — Structural Holes Theory (1992)**: This is the crucial reframing. Burt frames structural holes as competitive advantage — brokers…
- **Temporal KG Reasoning — LGevo (2024)**: Technically neutral — LGevo optimizes for prediction accuracy, not for any particular values.…

### Garden Logic Layer Distribution

Which layers of the Garden Logic architecture are supported by existing precedents:

**Substrate** (36 items): CIDOC-CRM, Wikidata / Wikibase, Schema.org, Getty ULAN / AAT / TGN, SKOS (Simple Knowledge Organization System), NodeRAG (2025), Neo4j + Vector Search / hybrid graph-vector stores, Multimodal Knowledge Graphs, Spawning AI / Have I Been Trained / Source.Plus, The Pile / LAION-5B / Common Crawl debates, W3C PROV / Model Cards / Datasheets for Datasets, AI training data governance 2025-2026 (EU AI Act, California AB 2013, CONSENT Act), VRM (Vendor Relationship Management), Solid Project (Tim Berners-Lee), Protocol Labs / IPFS / Filecoin, Shoshana Zuboff — Surveillance Capitalism (2019), Jenny Odell — How to Do Nothing (2019), Jonathan Crary — Scorched Earth (2022), Holly Herndon + Mat Dryhurst + Spawning, Jonas Staal — New World Summit, Furtherfield, Benjamin Bratton — The Stack, Santa Fe Institute — Complex Adaptive Systems, Dark Matter Labs / Indy Johar, CR-SQLite / Automerge / Local-first Software, Bruno Latour — Actor-Network Theory, Graphiti / Zep (2025), AutoSchemaKG (2025), KG Incompleteness as Feature (NSF-KGE, 2024), CHAD-KG (2025), Kate Crawford — Atlas of AI (2021), Crawford & Joler — Calculating Empires (2023), Maturana & Varela — Autopoiesis (1972), Donna Haraway — Sympoiesis / Making-With, Temporal KG Reasoning — LGevo (2024), Transparency Coalition (TCAI) — Do Not Train Standard

**Sensing** (24 items): OntoGPT / LLM-driven ontology learning, Emergent ontology / taxonomy induction, GraphRAG (Microsoft, 2024), LightRAG (EMNLP 2025), Knowledge Graph Embeddings (TransE, RotatE, ComplEx), Data-centric AI movement (Datacomp, DataPerf), Yves Citton — The Ecology of Attention (2017), Tim Wu — The Attention Merchants (2016), James Williams — Stand Out of Our Light (2018), Forensic Architecture, Hito Steyerl, Sougwen Chung, Weak Signals (Igor Ansoff, 1975), Pierre Bourdieu — Field Theory / Cultural Capital, Consent in Crisis — AI Data Commons Decline (2024), AI Attention Economy Ouroboros (2025), Lev Manovich — Cultural Analytics (2007-2025), Robert Rosen — Anticipatory Systems (1985, renewed 2024), ScenarioDNA — Culture Mapping, Sitra Weak Signals (Finland), Ronald Burt — Structural Holes Theory (1992), Anticipatory Governance (David Guston), Cynefin Framework, Will Straw — Scene Analysis

**Prompt** (4 items): Think-on-Graph / KAPING / KG-augmented LLM reasoning, Doc Searls — The Intention Economy (2012), Three Horizons Framework (Bill Sharpe, 2013), Chaudhary & Penn — 'Beware the Intention Economy' (Harvard Data Science Review, 2024)

**Participation** (6 items): Indigenous Data Sovereignty (CARE Principles), Ostrom's Commons Governance (Governing the Commons, 1990), IEEE 7012 / MyTerms (Doc Searls, 2025), Data Cooperatives as AI Governance (Harvard Ash Center, 2024), Holly Herndon — The Call (Serpentine, 2024-2025), Platform Cooperativism (Scholz, 2014->)

**None** (1 items): Georg Franck — The Economy of Attention (1998)

**Other** (1 items): Causal Layered Analysis (Sohail Inayatullah)


### Coherence vs. Consensus

A(DAI)'s commitment to coherence-without-consensus has **no direct precedent** in any surveyed system. The closest approaches:

- **SKOS (Simple Knowledge Organization System)**: Structurally enables coherence. SKOS's loose coupling means multiple concept schemes can coexist without requiring consensus. The mapping relations…
- **Emergent ontology / taxonomy induction**: Coherence-compatible. Emergent methods can discover multiple valid categorizations of the same domain (different clusterings, different hierarchy…
- **Knowledge Graph Embeddings (TransE, RotatE, ComplEx)**: Structurally coherence-compatible. Embeddings encode multiple latent dimensions simultaneously — an entity's position in embedding space reflects all…
- **Neo4j + Vector Search / hybrid graph-vector stores**: Structurally neutral. Neo4j can represent both consensus (single canonical graph) and coherence (multiple labeled subgraphs representing different…
- **Multimodal Knowledge Graphs**: Coherence-compatible. Different modalities can provide conflicting evidence about the same entity — an artwork's visual style may suggest one…
- **Spawning AI / Have I Been Trained / Source.Plus**: Neither, strictly. Spawning operates on individual consent rather than collective coherence or consensus. Each creator's consent decision is…
- **The Pile / LAION-5B / Common Crawl debates**: Neither. These datasets do not seek coherence (no structural consistency) or consensus (no resolution of disagreements). They present the web's…
- **Indigenous Data Sovereignty (CARE Principles)**: Neither in the Western sense. CARE operates through community protocols that may prioritize harmony, elder authority, or consensus processes specific…
- **W3C PROV / Model Cards / Datasheets for Datasets**: Coherence-supporting. Provenance enables multiple valid readings of the same data by preserving the chain of transformations that produced each…
- **VRM (Vendor Relationship Management)**: Individual coherence. Each customer maintains a coherent record of their relationships, preferences, and intentions. There is no collective consensus…
- **Solid Project (Tim Berners-Lee)**: Neither at the protocol level. Solid provides infrastructure, not interpretation. Coherence or consensus is delegated to applications built on top of…
- **Georg Franck — The Economy of Attention (1998)**: Neither. Attention produces neither coherence nor consensus — it produces celebrity. The 'vanity fair' of attention capital trading does not seek…
- **Yves Citton — The Ecology of Attention (2017)**: Ecological coherence. Citton seeks a healthy attention ecology — one that supports collective intelligence through resonance and echo rather than…
- **Shoshana Zuboff — Surveillance Capitalism (2019)**: Neither. Surveillance capitalism does not seek coherence (it does not care about structural consistency of knowledge) or consensus (it does not care…
- **Jenny Odell — How to Do Nothing (2019)**: Coherence. Odell explicitly embraces multiple, coexisting readings of place and community. She does not seek consensus but rather a richer, more…
- **Jonathan Crary — Scorched Earth (2022)**: Neither, in Crary's framework. He is not interested in building systems at all. His critique suggests that both coherence and consensus are…
- **Tim Wu — The Attention Merchants (2016)**: Neither explicitly. Wu is a historian, not a system designer. His work contributes to coherence by providing historical depth that makes the present…
- **James Williams — Stand Out of Our Light (2018)**: Implicitly coherence. Williams' three-level model allows for multiple valid ways of pursuing goals (starlight) and defining values (daylight). He…
- **Forensic Architecture**: Coherence. FA's evidence models allow for multiple interpretations and readings while maintaining structural consistency. Their 3D models present…
- **Hito Steyerl**: Coherence through contradiction. Steyerl's method embraces paradox — art is both liberation and weapon, images are both information and currency. She…
- **Holly Herndon + Mat Dryhurst + Spawning**: Both, strategically. Spawning seeks industry consensus on consent standards (working with the EU AI Act, engaging major AI companies) while…
- **Sougwen Chung**: Coherence. The DOUG series maintains structural consistency (human-machine drawing collaboration) while allowing each generation to diverge…
- **Jonas Staal — New World Summit**: Both, depending on context. Within each assembly, participants seek consensus on political declarations and actions. But across the New World Summit…
- **Furtherfield**: Coherence through practice. Furtherfield maintains coherence not through formal agreement but through consistent practice over decades. Different…
- **Benjamin Bratton — The Stack**: Coherence at the analytical level. Bratton's six-layer model provides structural coherence to a phenomena that appears chaotic. He does not seek…
- **Weak Signals (Igor Ansoff, 1975)**: Coherence. Weak signals admit multiple interpretations by nature — a vague signal can be read as indicating several possible futures. The framework…
- **Three Horizons Framework (Bill Sharpe, 2013)**: Coherence. The Three Horizons framework allows different observers to identify different H1/H2/H3 elements in the same situation. The framework…
- **Santa Fe Institute — Complex Adaptive Systems**: Coherence through emergence. SFI's systems produce coherent global patterns from local interactions without any consensus mechanism. Flocking,…
- **Dark Matter Labs / Indy Johar**: Coherence-seeking. DML's system demonstrators do not require consensus — they operate as parallel institutional experiments that may prove or…
- **CR-SQLite / Automerge / Local-first Software**: CRDTs achieve coherence without consensus. This is their fundamental innovation: two replicas will converge to the same state without ever needing to…
- **Pierre Bourdieu — Field Theory / Cultural Capital**: Coherence-seeking. Bourdieu does not seek consensus — he maps structural relationships that hold regardless of whether participants agree about them.…
- **Bruno Latour — Actor-Network Theory**: Coherence through network stability. ANT does not seek consensus — it traces how networks achieve temporary stability through aligned translations. A…
- **Graphiti / Zep (2025)**: Coherence through temporal consistency. The bi-temporal model maintains coherent graph state across time without requiring consensus — different…
- **AutoSchemaKG (2025)**: Neither. AutoSchemaKG produces a single, unified schema from the corpus — this is closer to consensus (one induced truth) than coherence (multiple…
- **KG Incompleteness as Feature (NSF-KGE, 2024)**: Coherence. By refusing to resolve unobserved triples into negatives, NSF-KGE maintains a representation where multiple potential truths coexist. The…
- **Consent in Crisis — AI Data Commons Decline (2024)**: The paper documents the failure of consensus — there is no agreement between content owners and AI developers about data rights. robots.txt provides…
- **IEEE 7012 / MyTerms (Doc Searls, 2025)**: Neither — MyTerms seeks bilateral agreement between two parties, not systemic coherence or collective consensus. Each agreement is sovereign and…
- **Chaudhary & Penn — 'Beware the Intention Economy' (Harvard Data Science Review, 2024)**: Neither — the paper is diagnostic. But it implicitly warns against systems that create false coherence through sycophantic alignment with user…
- **Crawford & Joler — Calculating Empires (2023)**: Coherence-seeking through genealogical method — the work reveals structural patterns (coherences) across centuries without seeking consensus about…
- **AI Attention Economy Ouroboros (2025)**: The ouroboros produces false coherence — as model outputs converge toward attractor states, they appear more coherent (more consistent, more…
- **Holly Herndon — The Call (Serpentine, 2024-2025)**: Coherence through harmony — the choral model finds patterns across fifteen different choirs' performances of the same hymns, producing a 'collective…
- **Lev Manovich — Cultural Analytics (2007-2025)**: Neither explicitly — Cultural Analytics reveals patterns without judging their coherence or seeking consensus about their meaning. The methodology…
- **Robert Rosen — Anticipatory Systems (1985, renewed 2024)**: Coherence — anticipatory systems achieve coherence through the modeling relation: the internal model must be structurally coherent with the external…
- **Maturana & Varela — Autopoiesis (1972)**: Organizational coherence — an autopoietic system maintains coherence through invariant organization despite structural changes. This is the strongest…
- **ScenarioDNA — Culture Mapping**: Coherence within the analytical framework — culture mapping seeks structural coherence across semiotic codes, not consensus among cultural…
- **Sitra Weak Signals (Finland)**: Neither explicitly — Sitra groups signals into phenomena to identify emerging patterns (a form of coherence analysis), but the final output is…
- **Ronald Burt — Structural Holes Theory (1992)**: Coherence — structural holes theory is about network coherence (or the lack of it). A structural hole represents a coherence failure: two groups that…
- **Donna Haraway — Sympoiesis / Making-With**: Neither — sympoiesis suggests that coherence and consensus are both modes of resolution that impose premature closure on the ongoing trouble of…
- **Temporal KG Reasoning — LGevo (2024)**: Coherence — LGevo seeks structural coherence in temporal patterns (what local and global evolutionary patterns jointly explain a fact's recurrence).…
- **Anticipatory Governance (David Guston)**: Seeks democratic coherence rather than expert consensus. Anticipatory governance explicitly includes publics in deliberation, not to achieve…
- **Causal Layered Analysis (Sohail Inayatullah)**: Coherence. CLA explicitly embraces multiple readings at each layer. Different analysts working on the same topic may identify different systemic…
- **Cynefin Framework**: Coherence-seeking. Cynefin explicitly rejects the idea that complex domains can be resolved into consensus. Multiple valid interpretations coexist.…
- **Will Straw — Scene Analysis**: Coherence. Scenes cohere without consensus — participants in a scene may have vastly different aesthetic commitments, political positions, and…

### What A(DAI) Should Adopt (Aggregated)

The most actionable technical and conceptual patterns across all 72 items:

- **CIDOC-CRM**: The event-centric data model pattern. Anchoring assertions to events (creation, exhibition, collaboration, critique) rather than static attributes gives A(DAI)'s graph temporal depth and forensic…
- **Wikidata / Wikibase**: The qualifier and reference system as a model for provenance-rich assertions. The ability to attach 'according to whom' and 'as of when' to every edge is exactly what A(DAI)'s merge boundary needs.…
- **Schema.org**: The Pending mechanism as a model for vocabulary proposals. Schema.org's staging area — where new types are proposed, discussed, and either promoted or abandoned — maps directly to A(DAI)'s /extend…
- **Getty ULAN / AAT / TGN**: The rich relational vocabulary between artists in ULAN (teacher-of, student-of, collaborated-with, influenced-by, partner-of) maps directly to A(DAI)'s practitioner edge types. The polyhierarchical…
- **SKOS (Simple Knowledge Organization System)**: The concept scheme architecture for organizing tendency vocabularies. Each tendency axis (openness-enclosure, commons-capture, spectacle-infrastructure) could be a SKOS concept scheme with…
- **OntoGPT / LLM-driven ontology learning**: The SPIRES pattern: define a schema template, extract structured instances from text, ground against existing vocabulary. This maps directly to A(DAI)'s signal processing pipeline…
- **Emergent ontology / taxonomy induction**: DeepOnto's ontology alignment capabilities for connecting A(DAI)'s vocabulary to established vocabularies (Getty AAT, CIDOC-CRM) without forcing alignment. The embedding-based gap detection pattern —…
- **GraphRAG (Microsoft, 2024)**: The Leiden community detection as a technique for cluster analysis in the survey cycle. The hierarchical community summarization as a model for multi-level graph diagnosis — summaries at different…
- **LightRAG (EMNLP 2025)**: The dual-level retrieval concept as a model for A(DAI)'s multi-resolution sensing. Low-level = individual signal/practitioner queries. High-level = thematic/tendency analysis. The incremental update…
- **NodeRAG (2025)**: The heterogeneous graph architecture as validation for A(DAI)'s 17-node-type design. NodeRAG proves that richer node typing improves structural analysis (even if the analysis is retrieval-oriented).…
- **Knowledge Graph Embeddings (TransE, RotatE, ComplEx)**: Link prediction as the primary computational mechanism for coherence prompts. 'These clusters should be connected based on embedding proximity but aren't' is exactly the kind of structural diagnosis…
- **Think-on-Graph / KAPING / KG-augmented LLM reasoning**: The graph-context injection pattern for coherence prompts. Instead of A(DAI)'s current 'one Claude call per prompt, fresh context' approach, consider iterative graph walking where the LLM follows…
- **Neo4j + Vector Search / hybrid graph-vector stores**: The hybrid structural + semantic query pattern. A(DAI) needs to query both by graph structure ('find all practitioners connected to this concept via PRACTICES edges') and by semantic similarity…
- **Multimodal Knowledge Graphs**: The Matryoshka multimodal embedding approach (referenced in the Design Brief section 06) for semantic positioning of artworks. Cross-modal embedding similarity as a sensing mechanism — detecting…
- **Spawning AI / Have I Been Trained / Source.Plus**: The datadiligence pattern of checking provenance and consent at processing time rather than only at ingestion time. A(DAI)'s signal pipeline should verify provenance dynamically, not just when a…
- **The Pile / LAION-5B / Common Crawl debates**: Nothing from the dataset construction methodology. However, A(DAI) should study these as the failure mode to avoid. The one technical lesson: Common Pile v0.1's approach of restricting to verifiably…
- **Data-centric AI movement (Datacomp, DataPerf)**: The 'data ratchet' concept — using processed outputs to evaluate and improve intake quality. A(DAI)'s signal pipeline should include feedback loops where downstream graph quality informs upstream…
- **Indigenous Data Sovereignty (CARE Principles)**: The fundamental question: whose commons? A(DAI) must build governance mechanisms that prevent the merge boundary from reproducing existing power asymmetries in the digital arts field. Adopt CARE's…
- **W3C PROV / Model Cards / Datasheets for Datasets**: W3C PROV as the formal provenance model for the signal pipeline. Every signal in /inbox/ should be representable as a PROV entity with documented derivation. Adopt Model Cards' approach of…
- **AI training data governance 2025-2026 (EU AI Act, California AB 2013, CONSENT Act)**: Compliance as a design constraint. A(DAI) should build its signal pipeline to be AB 2013-compliant from day one — documenting signal sources, licensing, processing methods. This is not just legal…
- **Doc Searls — The Intention Economy (2012)**: The fundamental inversion: systems should serve declared structural needs, not capture engagement. A(DAI) should adopt the principle that the graph's primary output is not 'interesting content' but…
- **VRM (Vendor Relationship Management)**: The inversion pattern: A(DAI) inverts platform analytics the way VRM inverts CRM. Adopt the principle that contributors (the 'customers' of A(DAI)) control their own data and relationship with the…
- **Solid Project (Tim Berners-Lee)**: The decoupling principle: separate data from applications. A(DAI) should design its architecture so that the intelligence graph can be accessed by multiple applications without any application…
- **Protocol Labs / IPFS / Filecoin**: Content-addressing for the intelligence graph. If graph-data.json had a CID, any version could be verified, any fork could reference the exact state it diverged from, and provenance chains would be…
- **Ostrom's Commons Governance (Governing the Commons, 1990)**: All eight design principles as the governance framework for the merge boundary. Specifically: (1) clearly defined boundaries for the commons and its contributors; (2) proportional benefits and costs…
- **Georg Franck — The Economy of Attention (1998)**: The analytical precision. Franck's framework is the best diagnostic tool for recognizing when attention logic leaks into A(DAI)'s systems. Adopt Franck's analysis as a detection mechanism: if any…
- **Yves Citton — The Ecology of Attention (2017)**: The 'echosystem' concept as a model for how signals circulate through A(DAI)'s sensing loop. Adopt the principle that the system's architecture conditions what can be noticed — A(DAI) must design its…
- **Shoshana Zuboff — Surveillance Capitalism (2019)**: The diagnostic framework. Zuboff provides the most powerful analytical tools for recognizing when an intelligence system crosses from service into extraction. A(DAI) should use Zuboff's concepts as…
- **Jenny Odell — How to Do Nothing (2019)**: The philosophical grounding that tidal rhythms and cyclical temporality are not merely design choices but political acts of refusal. Odell's framing of 'maintenance as productivity' validates…
- **Jonathan Crary — Scorched Earth (2022)**: The structural link between attention enclosure and ecological collapse. If Crary is right, then A(DAI)'s intention-economy is not merely a design preference but an ecological necessity. Adopt the…
- **Tim Wu — The Attention Merchants (2016)**: The 200-year pattern as diagnostic context. A(DAI) should embed Wu's historical depth into its sensing apparatus: current attention-capture strategies are not new but iterations of a deep industrial…
- **James Williams — Stand Out of Our Light (2018)**: The three-level attention model as a diagnostic tool for A(DAI)'s own operations. A(DAI) should classify its signals and prompts by which level of attention they address: frontier signals are…
- **Forensic Architecture**: FA's treatment of absence as a first-class analytical category maps directly to A(DAI)'s gap-detection function. A(DAI) should adopt FA's methodology of negative evidence — the absence of expected…
- **Hito Steyerl**: Steyerl's mapping of commons-vs-enclosure dynamics specifically within the art world. Her analysis of duty-free art zones (art withdrawn from circulation into financial instruments) maps directly to…
- **Holly Herndon + Mat Dryhurst + Spawning**: The practitioner-as-institution-builder model. Herndon/Dryhurst demonstrate that artists can build infrastructure, not just critique it. A(DAI) should study their trajectory as a case study in how…
- **Sougwen Chung**: Chung's trajectory as the primary case study for A(DAI)'s tendency analysis. The DOUG series demonstrates in real-time how an open-source, commons-oriented practice gets pulled toward proprietary,…
- **Jonas Staal — New World Summit**: The principle that institutions can be artworks and artworks can be institutions. Staal demonstrates that the distinction between 'art about politics' and 'political infrastructure' can be collapsed.…
- **Furtherfield**: The durational commitment. Furtherfield's primary lesson is that commons infrastructure requires sustained institutional commitment measured in decades, not funding cycles. A(DAI) should adopt this…
- **Benjamin Bratton — The Stack**: The Stack as the map of A(DAI)'s operating environment. A(DAI) should understand itself as a system operating within Bratton's six layers: dependent on Earth (energy, minerals for servers), Cloud…
- **Weak Signals (Igor Ansoff, 1975)**: Already adopted as the frontier signal concept. What A(DAI) should deepen is the graduated-response model — matching the specificity and intensity of response to the strength of the signal. When a…
- **Three Horizons Framework (Bill Sharpe, 2013)**: The H2+/H2- distinction as a core analytical tool. For every signal A(DAI) detects, the system should ask: does this innovation serve the declining attention economy (H2-) or accelerate transition…
- **Santa Fe Institute — Complex Adaptive Systems**: Power-law awareness in graph topology: expect a few densely connected nodes and many sparse ones, and design for this distribution rather than assuming uniformity. Phase transition detection: build…
- **Dark Matter Labs / Indy Johar**: The dark matter diagnostic: A(DAI) should look not just at visible cultural signals but at the invisible institutional structures that determine what culture gets produced, funded, and distributed.…
- **CR-SQLite / Automerge / Local-first Software**: CRDT-based graph replication as the mechanical substrate for fork-and-merge rights. The bi-temporal model inherent in CRDTs (operation time vs. merge time) as a natural fit for A(DAI)'s tidal sensing…
- **Pierre Bourdieu — Field Theory / Cultural Capital**: Field analysis as A(DAI)'s theoretical vocabulary for what the graph does: mapping positions, position-takings, and capital flows within the digital arts field. The concept of multiple capital types…
- **Bruno Latour — Actor-Network Theory**: The flat ontology: A(DAI)'s graph should not privilege human practitioners over tools, venues, algorithms, funding structures, or artworks — all are actants with typed relationships. The concept of…
- **Graphiti / Zep (2025)**: The bi-temporal model is the single most important technical adoption from this entire research set. A(DAI) must track event time (when something happened in the cultural field) separately from…
- **AutoSchemaKG (2025)**: Dynamic schema extension as a mechanism for A(DAI)'s vocabulary evolution (Mode B3). Instead of manually defining every entity type and relation type, A(DAI) should use LLM-based schema induction to…
- **KG Incompleteness as Feature (NSF-KGE, 2024)**: The Open World Assumption as the fundamental principle for A(DAI)'s graph embeddings. Never treat an unobserved connection as evidence of non-existence. The non-contrastive self-supervised training…
- **CHAD-KG (2025)**: The composition method: A(DAI) should study how CHAD-KG composes CIDOC-CRM, LRMoo, CRMdig, and AAT into a single coherent application profile. The pattern of using an existing controlled vocabulary…
- **Consent in Crisis — AI Data Commons Decline (2024)**: The empirical finding as a design constraint: A(DAI) cannot rely on web-scraped data for its knowledge graph. The intake pipeline must use explicit contribution (transcriber, /contribute page, manual…
- **IEEE 7012 / MyTerms (Doc Searls, 2025)**: The merge boundary should support machine-readable contributor terms. If a contributor declares their signal can only be used under specific conditions (e.g., non-commercial, attribution-required, no…
- **Chaudhary & Penn — 'Beware the Intention Economy' (Harvard Data Science Review, 2024)**: The temporal analysis of intent — A(DAI) should understand that its prompts operate on trajectories of meaning over time, not just momentary signals. The sycophancy critique: A(DAI) must build…
- **Data Cooperatives as AI Governance (Harvard Ash Center, 2024)**: The cooperative governance model for the merge boundary — rather than founding-team control, A(DAI) could transition merge boundary parameters to cooperative governance where contributors vote on…
- **Kate Crawford — Atlas of AI (2021)**: A(DAI) should include a materiality layer in its self-description — acknowledging the computational resources, energy, and infrastructure that run the system. The supply chain methodology: just as…
- **Crawford & Joler — Calculating Empires (2023)**: The deep-historical framing for A(DAI)'s myth prompts and CLA Layer 4 (myth/metaphor). A(DAI)'s tendency vocabulary should be tested against Calculating Empires' four axes: does A(DAI) address…
- **AI Attention Economy Ouroboros (2025)**: Ouroboros detection as a first-class concern in the pipeline. Specific mechanisms: (1) Maintain provenance tracking that distinguishes human-originated signals from AI-processed or AI-generated ones.…
- **Holly Herndon — The Call (Serpentine, 2024-2025)**: The Data Trust model for contributor governance. A(DAI) could establish a data trust where contributors collectively govern how their signals are processed, who has access to intelligence outputs,…
- **Lev Manovich — Cultural Analytics (2007-2025)**: The commitment to seeing culture computationally before theorizing it — A(DAI) should build its intelligence layer on empirical signal processing before generating theoretical claims. The multi-modal…
- **Robert Rosen — Anticipatory Systems (1985, renewed 2024)**: The formal concept of the modeling relation as the foundation for the dream cycle. Specifically: A(DAI)'s graph is an internal model (M) of the digital arts field (S). The processing pipeline is the…
- **Maturana & Varela — Autopoiesis (1972)**: The concept of operational closure as a design principle for the merge boundary — A(DAI) needs a boundary between its internal operations and external perturbations (signals). The boundary should…
- **ScenarioDNA — Culture Mapping**: The rigor of systematic semiotic analysis — ScenarioDNA's method of decoding cultural signals through structured semiotic frameworks is methodologically sophisticated. A(DAI) should develop…
- **Sitra Weak Signals (Finland)**: The PESTEC classification as a complement to A(DAI)'s tendency vocabulary — ensuring signals are analyzed across political, economic, social, technological, environmental, and cultural dimensions…
- **Ronald Burt — Structural Holes Theory (1992)**: The structural holes concept as the formal foundation for the coherence prompt. Specifically: A(DAI)'s graph should be analyzed for structural holes — gaps between clusters of practitioners,…
- **Donna Haraway — Sympoiesis / Making-With**: The self-description. A(DAI) should describe itself as sympoietic rather than autopoietic — a system that makes-with rather than a system that makes itself. This is not merely philosophical: it…
- **Temporal KG Reasoning — LGevo (2024)**: The cyclical pattern detection as a technical model for A(DAI)'s tidal computation. Specifically: (1) A(DAI)'s graph should track temporal annotations on signals and relationships — when was this…
- **Platform Cooperativism (Scholz, 2014->)**: The question: who governs the merge boundary? A(DAI) should adopt platform cooperativism's insistence that governance must be democratic and that workers/contributors should own the infrastructure…
- **Anticipatory Governance (David Guston)**: The three-capacity model (foresight + engagement + integration) as the explicit operational structure of A(DAI)'s dream cycle. Foresight = the 72h synthesis that maps plausible cultural trajectories.…
- **Causal Layered Analysis (Sohail Inayatullah)**: Already adopted as the dream cycle's analytical framework. What A(DAI) should deepen is CLA's emphasis on the myth/metaphor layer — the deepest, most transformative layer that is hardest to…
- **Cynefin Framework**: The probe-sense-respond cycle as the explicit operational logic for A(DAI)'s tidal rhythm at 6/24/72h intervals. The insight that complex systems require safe-to-fail probes rather than fail-safe…
- **Transparency Coalition (TCAI) — Do Not Train Standard**: Respect for DNT tags in the intake pipeline — A(DAI) must not ingest content marked as Do Not Train. The principle of machine-readable consent as a first-class element of the data pipeline. The TDVR…
- **Will Straw — Scene Analysis**: The ontological distinction between scene and community as separate entity types in the graph. The concept of cultural memory as a scene-enabling mechanism — A(DAI)'s graph should track how scenes…

### What A(DAI) Should Refuse (Aggregated)

- **CIDOC-CRM**: The consensus governance model. A(DAI) must refuse the assumption that ontological authority flows from expert committees. The CRM's inability to accommodate frontier signals — things that don't yet…
- **Wikidata / Wikibase**: The consensus-resolution social process. A(DAI) must keep contested edges visible, not resolve them. The encyclopedic completeness goal — the garden should be selective and intentional about what it…
- **Schema.org**: The market epistemology. Schema.org's validity is determined by what Google will consume, not by what is true or useful for the field. A(DAI) must refuse this — its vocabulary's validity comes from…
- **Getty ULAN / AAT / TGN**: The gatekeeping editorial model. A(DAI) must refuse any system where a central editorial authority determines which terms and practitioners are legitimate. The exclusion of 'frontier' concepts — AAT…
- **SKOS (Simple Knowledge Organization System)**: The lack of temporal representation. A(DAI) needs to track how concepts emerge, evolve, and decay — SKOS cannot do this. The absence of provenance on relationships — SKOS says 'A is broader than B'…
- **OntoGPT / LLM-driven ontology learning**: The assumption that LLM extraction is objective or neutral. LLMs reproduce the biases of their training data — concepts that are well-represented online will be easier to extract, while frontier or…
- **Emergent ontology / taxonomy induction**: The assumption that discovered categories are natural kinds. Emergent ontology methods discover statistical patterns, not truths. A(DAI) must label computationally discovered categories as…
- **GraphRAG (Microsoft, 2024)**: The single-answer query model. A(DAI) should not collapse community-level insights into a single answer. Instead, it should present the community structure itself as the output — showing…
- **LightRAG (EMNLP 2025)**: The query-answer optimization. A(DAI) should not frame its output as answers to questions but as structural diagnoses of the field. Also refuse: the flat entity-relationship extraction. A(DAI) needs…
- **NodeRAG (2025)**: The retrieval optimization as the primary design goal. A(DAI) should design its heterogeneous graph for structural diagnosis, not for answering questions. Also refuse: NodeRAG's generic node types…
- **Knowledge Graph Embeddings (TransE, RotatE, ComplEx)**: The assumption that embedding proximity equals meaningful relatedness. Embeddings learn statistical regularities, not cultural meaning. Two practitioners may be close in embedding space because they…
- **Think-on-Graph / KAPING / KG-augmented LLM reasoning**: The single-query-single-answer paradigm. A(DAI) should not answer questions but generate diagnostic prompts. The static KG assumption — A(DAI)'s graph is constantly evolving as signals arrive; the…
- **Neo4j + Vector Search / hybrid graph-vector stores**: The centralized server model. A(DAI)'s forkability requirement means practitioners must be able to take their subgraph, modify it, and potentially merge it back. Neo4j cannot do this. The CR-SQLite…
- **Multimodal Knowledge Graphs**: The large-scale centralized storage model. A(DAI)'s CR-SQLite architecture cannot host millions of media files. Instead, store embedding vectors locally and reference media via URIs. The…
- **Spawning AI / Have I Been Trained / Source.Plus**: The binary consent model. A(DAI) needs richer consent gradients — not just 'include/exclude' but 'include with attribution,' 'include for structural analysis only,' 'include but contestable.' Also…
- **The Pile / LAION-5B / Common Crawl debates**: Everything about the extraction model: undifferentiated scraping, absent provenance, static consent assumptions, no contributor governance, scale-as-virtue thinking, and the treatment of creative…
- **Data-centric AI movement (Datacomp, DataPerf)**: The benchmark-as-truth epistemology. A(DAI) should not reduce signal quality to a leaderboard metric. Cultural intelligence cannot be benchmarked against a fixed test set. Also refuse the competition…
- **Indigenous Data Sovereignty (CARE Principles)**: Nothing should be refused from CARE itself — the question is what A(DAI) must refuse IN LIGHT OF CARE. Refuse the assumption that fork rights are sufficient for justice. Refuse the assumption that a…
- **W3C PROV / Model Cards / Datasheets for Datasets**: The overhead assumption. Full W3C PROV compliance for every signal would create prohibitive documentation burden. A(DAI) should implement a lightweight provenance profile — capturing essential…
- **AI training data governance 2025-2026 (EU AI Act, California AB 2013, CONSENT Act)**: The procedural-compliance-as-ethics framing. Filling out disclosure forms is not the same as genuine data governance. A(DAI) should refuse the assumption that regulatory compliance equals ethical…
- **Doc Searls — The Intention Economy (2012)**: The market framing. Searls' intention economy is still fundamentally about commerce — matching supply and demand through price. A(DAI)'s intention is not commercial; it is epistemic and structural.…
- **VRM (Vendor Relationship Management)**: The individualism. VRM is fundamentally about individual customer empowerment, not collective sensemaking. A(DAI) needs collective governance of the merge boundary, not just individual contributor…
- **Solid Project (Tim Berners-Lee)**: The individual-sovereignty-only model. A(DAI) is a commons, not a collection of individual pods. The merge boundary requires collective governance, not just individual access control. Solid's pod…
- **Protocol Labs / IPFS / Filecoin**: The cryptocurrency-incentive layer. Filecoin's token economics introduce speculation, financialization, and complexity that are orthogonal to A(DAI)'s mission. A(DAI) should not require contributors…
- **Ostrom's Commons Governance (Governing the Commons, 1990)**: The assumption that commons governance requires centuries of evolution. A(DAI) must design its governance intentionally rather than waiting for it to emerge organically. Also refuse the assumption…
- **Georg Franck — The Economy of Attention (1998)**: Everything about the attention-as-capital model as a design principle. Refuse the assumption that attention is the primary scarce resource in cultural intelligence. Refuse reputation-accumulation as…
- **Yves Citton — The Ecology of Attention (2017)**: The continued centering of attention. Citton improves attention theory but does not replace it. A(DAI) must go further: the system's outputs should not be 'what deserves attention' but 'what…
- **Shoshana Zuboff — Surveillance Capitalism (2019)**: Every element of the surveillance capitalist pipeline: behavioral data extraction as raw material, prediction product fabrication, behavioral futures markets, and behavioral modification as…
- **Jenny Odell — How to Do Nothing (2019)**: Odell's anti-scalability. A(DAI) needs to operate at field-level, not just local bioregional scale. Also refuse Odell's implicit individualism — while she gestures toward community, her practice of…
- **Jonathan Crary — Scorched Earth (2022)**: Crary's absolutism about computation. His position that all digital infrastructure is inherently extractive leaves no room for the kind of commons-first computational infrastructure A(DAI) is…
- **Tim Wu — The Attention Merchants (2016)**: Wu's implicit reform orientation. He suggests we can 'reclaim' attention within existing systems, which underestimates the structural depth of the pattern he himself documents. If attention capture…
- **James Williams — Stand Out of Our Light (2018)**: Williams' residual individualism. Despite arguing for collective attention as a political resource, his framework remains anchored in individual cognitive capacities. A(DAI) needs a model of…
- **Forensic Architecture**: FA's case-based, bespoke methodology does not scale to the continuous, field-wide sensing A(DAI) requires. Refuse the forensic temporality of reconstruction (working backward from evidence) in favor…
- **Hito Steyerl**: Steyerl's implicit nihilism. Her analysis can produce a sense that all positions are compromised, all alternatives are co-opted, and critique itself is merely content for the system it critiques.…
- **Holly Herndon + Mat Dryhurst + Spawning**: The dependency on industry adoption. Spawning's impact depends on major AI companies respecting their consent signals. A(DAI) should not build infrastructure that requires cooperation from the…
- **Sougwen Chung**: The individual-genius framing that Chung's institutional trajectory reinforces. Despite Chung's discourse of 'collective authorship,' the art market treats DOUG as Sougwen Chung's work, reinforcing…
- **Jonas Staal — New World Summit**: Staal's dependence on the charismatic artist-as-organizer. While Staal theorizes collective infrastructure, the project depends heavily on his vision, networks, and reputation. A(DAI) must build…
- **Furtherfield**: Furtherfield's chronic underfunding and precarity. While admirable, the 27-year struggle for sustainability is not a model to emulate — it is a warning. A(DAI) must build economic sustainability into…
- **Benjamin Bratton — The Stack**: Bratton's implicit technological determinism — the sense that the Stack is inevitable and can only be analyzed, not transformed. A(DAI) must insist that alternatives are possible within the Stack,…
- **Weak Signals (Igor Ansoff, 1975)**: The corporate-strategic framing. Ansoff designed weak signal detection for competitive advantage — detecting threats before competitors. A(DAI) should refuse this competitive logic and instead use…
- **Three Horizons Framework (Bill Sharpe, 2013)**: The implicit progressivism -- the assumption that H3 will inevitably emerge and H1 will inevitably decline. History shows that H1 systems can persist far longer than expected by co-opting H2…
- **Santa Fe Institute — Complex Adaptive Systems**: Mathematical reductionism. SFI's power comes from abstracting complex systems into mathematical models, but A(DAI) deals with cultural meaning, which resists full formalisation. Refuse the temptation…
- **Dark Matter Labs / Indy Johar**: DML's lack of computational infrastructure. DML operates through human networks, workshops, and policy papers — it has no graph, no data pipeline, no automated sensing. A(DAI) must not replicate…
- **CR-SQLite / Automerge / Local-first Software**: The assumption that all conflicts are syntactic. CRDTs resolve data conflicts (two writers edited the same field), but A(DAI) also faces semantic conflicts (two communities interpret the same…
- **Pierre Bourdieu — Field Theory / Cultural Capital**: The implicit elitism. Bourdieu's field theory was developed to expose inequality, but it can reproduce it — the sociologist who maps the field from above risks replicating the very hierarchies they…
- **Bruno Latour — Actor-Network Theory**: ANT's descriptive neutrality. Latour follows the actors without normative commitment, but A(DAI) is explicitly normative — it operates on commons-first, intention-over-attention principles. A(DAI)…
- **Graphiti / Zep (2025)**: The 'new information wins' contradiction resolution. In cultural intelligence, newer is not necessarily truer — an older, well-established reading of a cultural tendency may be more accurate than a…
- **AutoSchemaKG (2025)**: The single-schema-from-corpus model. A(DAI) must preserve multiple schema perspectives — what counts as a valid category should be contestable by different communities. Schema induction should be…
- **KG Incompleteness as Feature (NSF-KGE, 2024)**: The purely technical framing. NSF-KGE treats incompleteness as a training-data problem, but A(DAI) treats it as a cultural-diagnostic principle. A(DAI) must not reduce gap detection to a link…
- **CHAD-KG (2025)**: The archival-descriptive orientation. CHAD-KG documents what is; A(DAI) must also detect what is not. Heritage documentation assumes a stable object of description (an artwork, a collection); A(DAI)…
- **Consent in Crisis — AI Data Commons Decline (2024)**: The implicit assumption that the web was ever a genuine data commons. The paper treats the web's openness as a baseline being eroded, but the web was always a conditionally open space governed by…
- **IEEE 7012 / MyTerms (Doc Searls, 2025)**: The purely individualistic framing. MyTerms treats each person as a sovereign contracting party, which is appropriate for privacy but insufficient for a commons. A(DAI) needs collective consent…
- **Chaudhary & Penn — 'Beware the Intention Economy' (Harvard Data Science Review, 2024)**: The implicit fatalism — the paper diagnoses commodification but offers no alternative architecture. A(DAI) should not accept that any LLM-mediated system necessarily commodifies intent. The refusal…
- **Data Cooperatives as AI Governance (Harvard Ash Center, 2024)**: Pure consensus governance — A(DAI) needs to preserve space for frontier signals and minority positions that a majority might vote to suppress. Democratic governance of the merge boundary should not…
- **Kate Crawford — Atlas of AI (2021)**: The implicit purism that makes materiality critique paralyzing. Crawford's analysis can lead to the conclusion that no AI system is ethically justifiable because all have material costs. A(DAI)…
- **Crawford & Joler — Calculating Empires (2023)**: The art-world framing that turns critical analysis into collectible object. Calculating Empires exists as six editions, each acquired by museums or collectors — the critique of extraction circulates…
- **AI Attention Economy Ouroboros (2025)**: The temptation to use AI-generated summaries of the field as input signals. The scout agent should prioritize primary sources (artist statements, exhibition documentation, institutional records) over…
- **Holly Herndon — The Call (Serpentine, 2024-2025)**: The dependency on a single artistic vision. The Call works because Herndon and Dryhurst are brilliant artists who made specific creative choices. A(DAI) cannot rely on singular artistic genius; it…
- **Lev Manovich — Cultural Analytics (2007-2025)**: The descriptive neutrality — Cultural Analytics reveals patterns without evaluating them. A(DAI) must go further, diagnosing structural gaps and tendencies. Description without diagnosis is cultural…
- **Robert Rosen — Anticipatory Systems (1985, renewed 2024)**: The anti-computational stance. Rosen argues that living systems are non-computable, which would imply that A(DAI) (a computational system) cannot truly anticipate. A(DAI) should acknowledge this…
- **Maturana & Varela — Autopoiesis (1972)**: Operational closure taken to its logical extreme. A(DAI) is not a self-producing system; it depends on external contributors, Claude API, GitHub infrastructure, and human curatorial judgment.…
- **ScenarioDNA — Culture Mapping**: The enclosure model entirely — patenting cultural analysis methods, keeping insights proprietary, and serving brand strategy. A(DAI) should also refuse the archetypical framework: pre-defined…
- **Sitra Weak Signals (Finland)**: The institutional framing that ties weak signal interpretation to national strategy. A(DAI) serves a cultural field, not a nation-state, and its interpretive frame should emerge from the field's own…
- **Ronald Burt — Structural Holes Theory (1992)**: The competitive framing entirely. A(DAI) must not position itself or its users as brokers who exploit structural holes for advantage. The intelligence that A(DAI) produces about gaps should be…
- **Donna Haraway — Sympoiesis / Making-With**: The anti-technological implications of Haraway's strongest claims. If nothing makes itself, and if computational systems are fundamentally reductionist, then A(DAI) (a computational system) cannot be…
- **Temporal KG Reasoning — LGevo (2024)**: The purely predictive orientation — LGevo aims to predict the next fact in a temporal KG, which is a forecasting task. A(DAI) should not try to predict what will happen in the field; it should…
- **Platform Cooperativism (Scholz, 2014->)**: The platform framing. A(DAI) is explicitly NOT a platform — it is a commons. Cooperatives still operate as platforms (matching supply and demand), just with democratic governance. A(DAI) produces…
- **Anticipatory Governance (David Guston)**: The institutional dependency. Anticipatory governance requires embedding practices in existing institutions (universities, funding agencies), which means it only works where those institutions exist…
- **Causal Layered Analysis (Sohail Inayatullah)**: The risk of CLA becoming a checklist rather than a genuine analytical process. If A(DAI) applies CLA mechanically — filling in four boxes — it loses the method's transformative power. Also refuse the…
- **Cynefin Framework**: The consultancy-dependency model. Cynefin's operational deployment requires trained facilitators and proprietary software (SenseMaker), creating a bottleneck that contradicts A(DAI)'s commons-first…
- **Transparency Coalition (TCAI) — Do Not Train Standard**: The binary consent model. DNT is yes/no, but A(DAI) needs more nuanced consent: 'train but attribute', 'train for diagnosis but not for generation', 'share within this community but not beyond', 'use…
- **Will Straw — Scene Analysis**: The purely retrospective orientation. Straw's analysis is strongest as historical/ethnographic interpretation and weakest as real-time detection. A(DAI) needs to detect scenes as they emerge, not…

### Structural Tensions with A(DAI)

Productive tensions that challenge A(DAI)'s assumptions:

- **CIDOC-CRM**: The deepest tension is between interoperability and frontier sensitivity. CIDOC-CRM achieves interoperability precisely by fixing categories. A(DAI) achieves frontier sensitivity precisely by keeping…
- **SKOS (Simple Knowledge Organization System)**: The tension is between lightweight representation and rich semantics. SKOS is deliberately simple — it trades semantic richness for broad adoptability. A(DAI) needs both: the adoptability of simple…
- **GraphRAG (Microsoft, 2024)**: The deepest tension is between query-answering optimization and structural diagnosis. GraphRAG's entire architecture is designed to produce better answers to questions. A(DAI)'s architecture needs to…
- **LightRAG (EMNLP 2025)**: The dual-level model maps suggestively to A(DAI)'s pulse/dream distinction, but the mapping is imperfect. LightRAG's low-level is entity-centric (what facts exist about X?), while A(DAI)'s pulse is…
- **NodeRAG (2025)**: The tension between retrieval-optimized and diagnosis-optimized heterogeneous graphs. NodeRAG's node types are chosen to improve retrieval precision. A(DAI)'s node types are chosen to model the…
- **Think-on-Graph / KAPING / KG-augmented LLM reasoning**: The tension is between depth and cost. Iterative graph walking produces richer, more grounded reasoning than single-prompt approaches, but at much higher computational cost (multiple LLM calls per…
- **Neo4j + Vector Search / hybrid graph-vector stores**: This is the core tension identified in the task brief: query power vs. forkability. Neo4j maximizes query power — expressive pattern matching, efficient traversal, native vector search, billions of…
- **Spawning AI / Have I Been Trained / Source.Plus**: Spawning solves consent at the individual level but does not address collective governance of shared cultural knowledge. A(DAI) must handle both: individual contributor consent AND collective…
- **The Pile / LAION-5B / Common Crawl debates**: The deepest tension: these datasets work. Models trained on them produce powerful outputs. A(DAI)'s principled approach to consent, provenance, and governance will produce a much smaller, more…
- **Data-centric AI movement (Datacomp, DataPerf)**: Data-centric AI assumes that 'better data' can be objectively measured through task performance. A(DAI) operates in a domain where 'better' is contested — what counts as a valuable cultural signal…
- **Indigenous Data Sovereignty (CARE Principles)**: The deepest challenge to A(DAI). CARE reveals that A(DAI)'s commons model could reproduce extraction if the contributing community is not diverse and the governance is not genuinely polycentric. Fork…
- **W3C PROV / Model Cards / Datasheets for Datasets**: Provenance standards document what happened but do not govern what should happen. A(DAI) needs both: provenance tracking (what was the chain of transformations?) AND governance (should this…
- **AI training data governance 2025-2026 (EU AI Act, California AB 2013, CONSENT Act)**: These regulations apply to AI systems and their developers, but A(DAI) is a commons, not a product. The regulatory frameworks assume a developer-user relationship that does not map cleanly to…
- **Doc Searls — The Intention Economy (2012)**: Searls' intention economy never achieved widespread implementation — VRM tools remain niche despite 15+ years of development. This suggests that inverting the attention economy through individual…
- **VRM (Vendor Relationship Management)**: VRM has failed to achieve adoption because it requires customers to do work (formulate intent, manage tools) that the attention economy does for them (through targeting, recommendations,…
- **Solid Project (Tim Berners-Lee)**: Solid solves data sovereignty but not collective sensemaking. A(DAI) needs both: contributors must control their own signals AND those signals must merge into collective intelligence. The tension is…
- **Protocol Labs / IPFS / Filecoin**: IPFS/Filecoin provides persistence and distribution but not interpretation. A(DAI) needs both: the data must persist AND it must be intelligently organized. The tension is between infrastructure…
- **Ostrom's Commons Governance (Governing the Commons, 1990)**: Ostrom's design principles were developed for natural resource commons (fisheries, forests, water) where the resource is rival and geographically bounded. A(DAI)'s commons is digital (non-rival),…
- **Georg Franck — The Economy of Attention (1998)**: Franck may be right that attention IS the fundamental currency of mental life — that humans cannot escape the desire for attention. If so, A(DAI)'s intention architecture must coexist with this…
- **Yves Citton — The Ecology of Attention (2017)**: Citton provides the best available theory for understanding collective attention, but A(DAI) claims to move beyond attention entirely. The tension: is this move genuine, or does A(DAI)'s intention…
- **Shoshana Zuboff — Surveillance Capitalism (2019)**: Zuboff's analysis is compelling but primarily diagnostic — she describes the disease without prescribing a cure. A(DAI) must translate Zuboff's diagnosis into architectural commitments. The tension:…
- **Jenny Odell — How to Do Nothing (2019)**: Odell's 'doing nothing' risks becoming a privilege position — only those with economic security can afford to refuse the attention economy. A(DAI) must build infrastructure that enables refusal…
- **Tim Wu — The Attention Merchants (2016)**: Wu's historical pattern (capture-revolt-recapture) suggests that ALL alternatives to the attention economy will eventually be captured. This is a fundamental challenge to A(DAI): is the intention…
- **Forensic Architecture**: FA demonstrates that evidence infrastructure IS an artistic practice, which validates A(DAI)'s premise. But FA operates in high-stakes political contexts (human rights, state violence) where the…
- **Furtherfield**: Furtherfield demonstrates that commons-first digital art infrastructure can survive for decades, but also that it survives precariously. The tension for A(DAI) is whether durational commitment can be…
- **Benjamin Bratton — The Stack**: The Stack is the infrastructure A(DAI) operates within, cannot escape, and must account for. Every A(DAI) signal passes through the Cloud, every node has an Address, every practitioner is a User,…
- **Santa Fe Institute — Complex Adaptive Systems**: The deepest tension: SFI's complexity science suggests that complex adaptive systems cannot be governed — they can only be nudged and observed. But A(DAI) aims to do more than observe; it aims to…
- **Dark Matter Labs / Indy Johar**: DML works at the institutional layer; A(DAI) works at the knowledge/sensing layer. The tension is whether cultural intelligence infrastructure (A(DAI)) can operate without the institutional reforms…
- **CR-SQLite / Automerge / Local-first Software**: CRDTs guarantee convergence at the data structure level, but A(DAI) needs coherence at the semantic level. Two replicas of the graph will have the same triples, but may interpret them differently.…
- **Pierre Bourdieu — Field Theory / Cultural Capital**: The deepest tension: Bourdieu shows that field structure determines cultural production, but A(DAI) aims to change field structure by making it visible. Can a graph that maps the field's power…
- **Bruno Latour — Actor-Network Theory**: The fundamental tension: ANT refuses to pre-determine what kinds of actants matter or how they should be categorised, but A(DAI) must operationalise a schema with typed nodes (practitioners,…
- **Graphiti / Zep (2025)**: Graphiti resolves temporal contradictions; A(DAI) needs to preserve them as diagnostic information. When two observations contradict each other, Graphiti asks 'which is newer?' while A(DAI) should…
- **AutoSchemaKG (2025)**: AutoSchemaKG discovers schemas from what IS in the corpus; A(DAI) needs to detect what is MISSING from the field. Schema induction from existing text will reproduce existing categories and miss…
- **KG Incompleteness as Feature (NSF-KGE, 2024)**: The core tension: NSF-KGE preserves gaps but does not interpret them. It learns embeddings that do not close off unobserved connections, but it does not ask why those connections are absent or what…
- **CHAD-KG (2025)**: CHAD-KG demonstrates that ontological standards CAN be composed, which is encouraging for A(DAI). But it also demonstrates the cost: composing four standards requires deep ontological expertise,…
- **Consent in Crisis — AI Data Commons Decline (2024)**: The paper documents a trend that makes A(DAI) more necessary and more difficult simultaneously. More necessary: as the open web commons shrinks, curated knowledge commons like A(DAI) become the…
- **IEEE 7012 / MyTerms (Doc Searls, 2025)**: MyTerms assumes bilateral relationships (individual ↔ service), but A(DAI) operates as a commons where signals are collectively processed. A contributor's terms interact with other contributors'…
- **Chaudhary & Penn — 'Beware the Intention Economy' (Harvard Data Science Review, 2024)**: The deepest tension: Chaudhary and Penn show that LLM-generated outputs inherently shape user intent through latent persuasion, even without explicit manipulative design. If A(DAI) uses LLMs to…
- **Data Cooperatives as AI Governance (Harvard Ash Center, 2024)**: The fundamental tension: A(DAI) is currently governed by a founding team with specific curatorial judgment about what constitutes valid intelligence. The cooperative model would democratize this…
- **Kate Crawford — Atlas of AI (2021)**: A(DAI) describes itself as a commons-first system that generates intention rather than attention. Crawford's work challenges this self-description at the material level: A(DAI) uses Claude API…
- **Crawford & Joler — Calculating Empires (2023)**: Calculating Empires reveals that every classification system (including A(DAI)'s taxonomy of concepts, practitioners, and scenes) is an exercise of power. A(DAI)'s categories — the typed edges, the…
- **AI Attention Economy Ouroboros (2025)**: A(DAI) IS an AI system that processes signals through Claude and produces intelligence outputs that will circulate and potentially be ingested by future AI systems (including A(DAI)'s own future…
- **Holly Herndon — The Call (Serpentine, 2024-2025)**: The Call moves from individual consent (Holly+, where Holly Herndon controls her own vocal model) to collective consent (The Call, where fifteen choirs collectively govern a shared dataset). A(DAI)…
- **Lev Manovich — Cultural Analytics (2007-2025)**: Cultural Analytics treats culture as data to be analyzed; A(DAI) treats culture as a living system to be sensed. The tension is between analysis (standing outside the system, measuring it) and…
- **Robert Rosen — Anticipatory Systems (1985, renewed 2024)**: The deepest tension: Rosen argues that anticipatory systems must have non-computable complexity — their internal models have causal structures that cannot be reduced to algorithms. A(DAI) is a…
- **Maturana & Varela — Autopoiesis (1972)**: A(DAI) describes itself as a system that senses the field and produces intelligence about it. Autopoiesis says living systems do not represent their environment — they navigate their coupling with…
- **ScenarioDNA — Culture Mapping**: ScenarioDNA demonstrates that cultural sensing CAN be commercialized and enclosed — and that there is significant market demand for it. A(DAI)'s Mode 2 (advisory services) faces the same temptation.…
- **Sitra Weak Signals (Finland)**: Sitra's weak signal methodology has been institutionalized within a government body, which tests whether intention-based sensing survives institutionalization. The evidence is mixed: Sitra maintains…
- **Ronald Burt — Structural Holes Theory (1992)**: Burt's theory assumes that information flows across bridges serve the broker's interest. A(DAI) assumes that revealing structural gaps serves the field's interest. But who decides that a gap is a…
- **Donna Haraway — Sympoiesis / Making-With**: The deepest critique of A(DAI)'s self-description. If A(DAI) claims to be a self-producing commons (autopoietic), Haraway's response is: nothing makes itself. A(DAI) is constituted through its…
- **Temporal KG Reasoning — LGevo (2024)**: LGevo models cyclical recurrence in knowledge graphs, but A(DAI)'s signals are not purely factual triples — they carry qualitative meaning, aesthetic judgment, and cultural context. The tension is…
- **Platform Cooperativism (Scholz, 2014->)**: Platform cooperatives must compete in markets shaped by attention-economy incumbents. Up&Go competes with TaskRabbit; Driver's Cooperative competes with Uber. This competitive pressure may force…
- **Anticipatory Governance (David Guston)**: Anticipatory governance assumes that there is a window of malleability before technologies crystallise, and that governance can act during this window. But cultural tendencies may not have such clear…
- **Causal Layered Analysis (Sohail Inayatullah)**: CLA was designed for human analytical workshops, not computational systems. The method's deepest layer (myth/metaphor) requires interpretive judgment, cultural knowledge, and hermeneutic sensitivity…
- **Cynefin Framework**: Cynefin is a diagnostic framework, not a computational one. It tells you how to think about complexity but does not itself process signals at scale. A(DAI) needs to operationalise Cynefin's insights…
- **Transparency Coalition (TCAI) — Do Not Train Standard**: TCAI frames AI training as extraction to be restricted. A(DAI) frames knowledge contribution as a commons practice to be enabled. These are fundamentally different orientations: restriction vs.…
- **Will Straw — Scene Analysis**: The core tension: scene analysis is a qualitative interpretive framework that resists formalisation, but A(DAI) needs to operationalise it computationally. How do you detect 'effervescence' or…


---

## Detailed Research Results


---

## Ontology & Knowledge Representation


### CIDOC-CRM

**Brief:** ISO 21127 standard ontology for cultural heritage. Event-based model. The canonical fixed-taxonomy approach.

**Garden Logic relevance:** Counter-model — cathedral ontology vs. A(DAI)'s emergent/extensible vocabulary. Tests whether fixed ontologies can accommodate frontier signals.

#### Basic identification and classification

- **name**: CIDOC-CRM
- **type**: ontology
- **originator**: ICOM/CIDOC Documentation Standards Working Group, led by Martin Doerr (ICS-FORTH)
- **year**: 2006 (ISO 21127:2006, latest edition ISO 21127:2023, CRM v7.1.3)
- **key_text**: Definition of the CIDOC Conceptual Reference Model, ISO 21127:2023
- **key_url**: https://cidoc-crm.org/

#### Core ideas and theoretical positioning


**core_claim**

Cultural heritage information can be semantically integrated across institutions through a shared event-centric ontology that models objects, actors, places, and time-spans as participants in historical events.


**relation_to_attention_economy**

Explicitly refuses attention logic. CIDOC-CRM serves institutional memory and scholarly inquiry, not engagement or discovery. Its temporality is archival and forensic, not real-time. However, its institutional adoption functions as a prestige signal within the museum-academic complex.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Event-centric ontology graph. 81 classes and 160 properties organized around temporal entities (events) that connect persistent items (objects, people, places). Modular extensions (CRMsci, CRMdig, CRMarchaeo, LRMoo) specialize the core.


**data_model**

RDF/OWL triples following the event-based pattern. Core relations include P14 (carried out by), P108 (has produced), P7 (took place at), P4 (has time-span). Every assertion is anchored to a production, modification, or transfer event.


**temporal_logic**

Archival with chronological reasoning support (ISO 21127:2023 added temporal properties). Time is modeled as time-spans attached to events. Supports fuzzy dating through uncertain boundaries. No anticipatory or cyclical temporal logic.


**absence_handling**

No native absence detection. The model represents what is known and documented. Gaps appear only as missing triples, with no mechanism to flag or diagnose structural absence. Lacunae are invisible unless a human researcher notices them.


**scalability_model**

Centralized standard, federated implementation. Each institution maintains its own CRM-compliant dataset. Integration happens through semantic alignment at query time. The standard itself is centrally governed by the CIDOC CRM SIG.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate — CIDOC-CRM operates at the data model layer, defining how cultural information is structured. It is infrastructure, not sensing or prompt-generation.


**intention_vs_attention**

Neither, strictly. CIDOC-CRM serves institutional documentation, not diagnosis or engagement. It does not optimize for intention (structural gap detection) because it cannot see what is missing. It does not optimize for attention because it has no discovery or ranking layer. It optimizes for archival fidelity — preserving what is known with maximal provenance. A(DAI) should note that archival fidelity is necessary but insufficient: the garden needs to sense what the archive cannot see.


**coherence_vs_consensus**

Strong consensus orientation. The ontology is developed through multi-year expert deliberation. Changes require formal proposals to the CRM SIG. This produces high semantic consistency but at the cost of responsiveness to frontier signals. Coherence (in A(DAI)'s sense of holding multiple valid readings simultaneously) is structurally impossible — the CRM resolves ambiguity toward canonical definitions.


**contestability**

Very low. The ontology's outputs are not designed to be contested by end users. Proposals for change go through the CRM SIG, which meets periodically. There is no mechanism for counter-signals, dissenting classifications, or parallel readings. The model assumes expert authority.


**forkability**

Technically forkable (the definition is published), but practically unforkable. A fork would break interoperability — the entire value proposition is institutional alignment on a single shared model. No provenance tracking across forks. The extension mechanism (CRMsci, CRMarchaeo) is the sanctioned alternative to forking.


**tendency_axis_position**

openness: semi-open (definition public, ISO document paywalled) | commons: institutional commons (shared but expert-governed) | spectacle: pure infrastructure | individual: distributed across institutions but governed centrally


**what_adai_should_adopt**

The event-centric data model pattern. Anchoring assertions to events (creation, exhibition, collaboration, critique) rather than static attributes gives A(DAI)'s graph temporal depth and forensic traceability. The typed relationship vocabulary (P14 carried out by, P108 has produced) is a proven pattern for the kind of dense edge networks A(DAI) needs. The modular extension architecture shows how a core ontology can specialize without breaking.


**what_adai_should_refuse**

The consensus governance model. A(DAI) must refuse the assumption that ontological authority flows from expert committees. The CRM's inability to accommodate frontier signals — things that don't yet have institutional names — is exactly the gap A(DAI) exists to fill. Also refuse: the assumption that ambiguity should be resolved rather than held. A(DAI)'s coherence model requires that contested edges remain visible, not collapsed into canonical readings.


#### Limitations, blind spots, and failure modes


**limits**

Extremely high adoption cost. Requires deep ontological expertise to model data correctly. The event-centric pattern, while powerful, creates verbose graphs for simple assertions. 81 classes and 160 properties create a steep learning curve. Extensions add further complexity. The model assumes institutional data practices that many smaller organizations and independent practitioners cannot sustain.


#### Governance models and consent architectures


**governance_model**

Expert committee within an international standards body (ICOM/CIDOC). Changes proposed through formal SIG meetings. ISO standardization adds a further governance layer with national body voting.


#### Material and operational conditions


**composability**

Modular via extension mechanism (CRMsci, CRMdig, etc.). Can be embedded in larger systems. RDF/OWL foundation allows interoperability with other semantic web vocabularies. Not API-first but protocol-level (RDF is the protocol).


**liveness**

Actively maintained. ISO 21127:2023 is the latest edition. CRM SIG meets regularly. Summer School 2025 held. Over 400 projects worldwide. Living standard with institutional momentum.


**scale_of_operation**

Institutional to field-level. Designed for museums, archives, libraries. Cross-institutional integration is the primary use case. Not designed for individual-scale or small-group use.


**temporality**

Deep historical depth. Designed to model events spanning millennia. Chronological reasoning added in 2023 edition. No cyclical, anticipatory, or tidal temporal logic. Time is linear and archival.


**Uncertain fields:** relation_to_commons, who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### Wikidata / Wikibase

**Brief:** Open knowledge graph with community-governed ontology evolution. Multilingual. 100M+ items.

**Garden Logic relevance:** Closest precedent for commons-governed category extension (Mode B3). Tests whether community vocabulary governance scales without consensus collapse.

#### Basic identification and classification

- **name**: Wikidata / Wikibase
- **type**: ontology

**originator**

Wikimedia Foundation / Wikimedia Deutschland. Key figures: Denny Vrandecic (founder), Lydia Pintscher (portfolio lead)

- **year**: 2012 (Wikidata launch). Wikibase software first released alongside Wikidata.

**key_text**

Wikidata: A Free Collaborative Knowledgebase (Vrandecic & Krotzsch, 2014, Communications of the ACM)

- **key_url**: https://www.wikidata.org/

#### Core ideas and theoretical positioning


**core_claim**

A free, collaborative, multilingual knowledge graph that anyone can edit, serving as central structured data storage for Wikimedia projects and beyond, with community-governed ontology evolution.


**relation_to_attention_economy**

Wikidata explicitly refuses attention-driven design — no algorithmic feeds, no engagement optimization. However, its integration with Wikipedia means it indirectly shapes what gets surfaced by search engines and AI systems. The knowledge graph's structure influences LLM training data, creating a quiet but powerful attention-shaping effect that is unacknowledged in its governance model.


**relation_to_commons**

The strongest commons model among existing knowledge graphs. CC0 licensing. Community-governed with transparent decision processes. Recognized as a Digital Public Good (2025). However, the commons governance struggles with scale — 116 million items create governance challenges that push toward technocratic solutions.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Centralized knowledge graph with federated query capability (SPARQL federation). Item-property-value triples with qualifiers, references, and ranks. Wikibase software can be self-hosted for independent instances.


**data_model**

Entity-centric: Items (Q-numbers) connected by Properties (P-numbers) to values. Values can be other items, strings, quantities, coordinates, dates, etc. Qualifiers add context to statements. References track provenance. Ranks indicate preferred/normal/deprecated status.


**temporal_logic**

Bi-temporal by design. Statements can have start/end date qualifiers. Historical and current data coexist. However, temporal reasoning is not native — it requires SPARQL queries to reconstruct timelines. No anticipatory or cyclical temporal logic.


**absence_handling**

No structural absence detection. Missing data is simply absent — there is no mechanism to flag what should exist but doesn't. WikiProjects manually identify coverage gaps, but this is social rather than computational. The constraint system (EntitySchemas, ShEx) can validate what exists but cannot diagnose what is missing.


**scalability_model**

Centralized with federation aspirations. 116 million items, 16 billion triples. Blazegraph backend is under severe stress. The 2025-2028 development plan focuses on federated SPARQL and the Wikibase ecosystem, but true federation remains aspirational. Self-hosted Wikibase instances are operationally independent.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate + participation — Wikidata provides both data infrastructure (substrate) and a community contribution model (participation). It does not have a sensing loop or prompt-generation layer.


**intention_vs_attention**

Neither optimally. Wikidata is designed for reference — answering factual queries. It does not diagnose structural gaps (intention) or optimize for engagement (attention). It optimizes for coverage — making as many facts as possible available. This is a third mode: encyclopedic completeness. A(DAI) should note that completeness is a trap for the garden — the goal is not to know everything but to sense what matters.


**coherence_vs_consensus**

Strong consensus orientation. The community process drives toward agreed-upon values. While multiple statements can technically coexist (with different ranks), the social norm is to resolve disagreements. Deprecated rank is used to mark superseded claims. This is not coherence in A(DAI)'s sense — contested readings are not first-class. However, the qualifier system hints at what coherence infrastructure could look like: a statement with qualifiers like 'according to source X' and 'disputed by source Y' approaches contestable knowledge.


**contestability**

Moderate. Any editor can contest any statement. Edit wars are mediated through community processes. However, the contestation is oriented toward resolving disputes, not preserving productive tension. There is no 'contested edge' status that remains visible to downstream consumers.


**forkability**

High for data (CC0 license), moderate for infrastructure. Anyone can download and fork the entire dataset. Wikibase software enables sovereign instances. However, the network effects of the central Wikidata instance create gravitational pull that makes forks practically marginal. No provenance tracking across forks — a forked dataset loses its connection to the living community process.


**tendency_axis_position**

openness: maximally open (CC0) | commons: strong commons (community-governed, no extraction) | spectacle: infrastructure (no engagement layer) | individual: distributed contribution, centralized aggregation


**what_adai_should_adopt**

The qualifier and reference system as a model for provenance-rich assertions. The ability to attach 'according to whom' and 'as of when' to every edge is exactly what A(DAI)'s merge boundary needs. The EntitySchema/ShEx validation pattern for defining structural expectations on node types. The multilingual architecture — A(DAI) will need this as scenes are global. The Wikibase self-hosting model as evidence that federated sovereignty is possible with shared infrastructure.


**what_adai_should_refuse**

The consensus-resolution social process. A(DAI) must keep contested edges visible, not resolve them. The encyclopedic completeness goal — the garden should be selective and intentional about what it indexes. The centralized SPARQL endpoint model — A(DAI)'s CR-SQLite architecture prioritizes forkability over query power for good reason. The anonymous editing model — A(DAI) needs attributed provenance on every contribution.


#### Limitations, blind spots, and failure modes


**limits**

Severe scalability crisis. 116M items strain Blazegraph. Query timeouts are common for complex SPARQL. Ontological inconsistencies accumulate faster than they can be resolved — disjointness violations documented by researchers. The gap between the formal data model (which allows nuanced statements) and the social practice (which trends toward simple assertions) means the model's full expressive power is rarely used.


#### Governance models and consent architectures


**governance_model**

Polycentric commons. The Wikimedia Foundation provides infrastructure. The community governs content through policies, guidelines, and consensus processes. Property proposals require community approval. No single authority controls the ontology, but the Foundation controls the infrastructure.


#### Material and operational conditions


**composability**

Highly composable. CC0 data can be embedded anywhere. SPARQL endpoint enables programmatic access. Wikibase is self-hostable. JSON/RDF exports available. Mix-and-match with other ontologies via federated SPARQL. API-first and protocol-level.


**liveness**

Extremely active. Thousands of edits per hour. Continuous community governance. 2025-2028 development plan recently published. Recognized as Digital Public Good in 2025. Growing ecosystem of Wikibase instances.


**scale_of_operation**

Planetary. 116 million items. Multilingual. Used by search engines, AI systems, Wikipedia, and thousands of downstream applications. The largest open knowledge graph in existence.


**temporality**

Bi-temporal (statements with date qualifiers can represent both historical and current facts). Archives change history through edit logs. No anticipatory or cyclical temporal logic. Deep historical coverage but present-focused editing practice.


**Uncertain fields:** epistemological_stance, structural_tension, who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### Schema.org

**Brief:** Lightweight consensus-driven web vocabulary. Extended without breaking via extension mechanism.

**Garden Logic relevance:** Model for vocabulary extension that preserves backward compatibility. Relevant to edge type and node type proposals in /extend.

#### Basic identification and classification

- **name**: Schema.org
- **type**: ontology

**originator**

Founded by Google, Microsoft, Yahoo, Yandex (2011). Now governed via W3C Schema.org Community Group. Key figures: Dan Brickley, R.V. Guha.

- **year**: 2011

**key_text**

Schema.org: Evolution of Structured Data on the Web (Guha, Brickley, Macbeth, 2016, Communications of the ACM)

- **key_url**: https://schema.org/

#### Core ideas and theoretical positioning


**core_claim**

A lightweight, consensus-driven vocabulary for structured data on the web that can be extended without breaking existing consumers, enabling search engines and applications to understand web content semantically.


**relation_to_attention_economy**

Schema.org is deeply embedded in the attention economy. Its primary consumers are search engines that use structured data for ranking, rich snippets, and knowledge panels. The vocabulary exists to make content more legible to attention-allocation algorithms. However, Schema.org itself is neutral infrastructure — it describes, it does not rank.


**relation_to_commons**

A corporate-commons hybrid. Created by competing corporations for mutual benefit. Open specification, freely usable. Governed through a W3C Community Group (open participation). However, the founding companies have outsized influence. The vocabulary serves commercial web infrastructure first.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Flat vocabulary with type hierarchy. Types inherit properties from supertypes. Extension mechanisms: Pending types (staging area), external extensions (hosted independently), PropertyValue (arbitrary key-value pairs), Role (annotation wrapper). JSON-LD is the preferred serialization.


**data_model**

Type-property-value triples embedded in web pages. Types form a hierarchy (Thing > CreativeWork > VisualArtwork). Properties are global across the vocabulary (a property like 'name' works everywhere). No formal constraints — any type can technically use any property.


**temporal_logic**

Minimal. Date properties exist (dateCreated, dateModified, startDate, endDate) but no temporal reasoning. The vocabulary itself is versioned but consumers are encouraged to use unversioned URLs. Time is a data attribute, not a structural concern.


**absence_handling**

No absence detection. The vocabulary describes what is present. Missing markup is simply invisible to consumers. The Pending mechanism is the closest thing to absence handling — it captures concepts that are recognized as needed but not yet stabilized.


**scalability_model**

Distributed by design. Each website publishes its own markup independently. No central database. Scales through the web itself. Extension mechanism allows domain-specific vocabularies (GS1 for commerce, etc.) without central coordination.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate — Schema.org is pure data vocabulary infrastructure. It defines how things are described, not how they are sensed, diagnosed, or governed.


**intention_vs_attention**

Serves the attention economy directly. Schema.org markup exists to help search engines allocate attention — rich snippets, knowledge panels, voice assistant answers all flow from Schema.org data. However, the vocabulary itself does not optimize for engagement; it optimizes for legibility. The distinction matters: A(DAI) also seeks legibility, but for intention (structural diagnosis) rather than attention (ranking/surfacing).


**coherence_vs_consensus**

Consensus through pragmatic adoption. Schema.org resolves vocabulary disputes through what Google/Bing will actually consume. This is consensus-by-market-power rather than deliberative consensus. Coherence is not a goal — the vocabulary tolerates inconsistencies and overlapping types because its consumers are forgiving parsers, not formal reasoners.


**contestability**

Low for core vocabulary, moderate for extensions. The W3C Community Group process allows proposals but the founding companies have effective veto power through selective implementation. External extensions provide a pressure valve — if Schema.org won't adopt a type, you can define it elsewhere and mix it in via JSON-LD.


**forkability**

High in principle (open specification), low in practice. A fork would have zero value because Schema.org's utility comes from search engine consumption of a shared vocabulary. The external extension mechanism is the sanctioned alternative to forking.


**tendency_axis_position**

openness: open specification, corporate governance | commons: corporate commons (open but commercially motivated) | spectacle: enables spectacle (search ranking) while being infrastructure | individual: benefits large publishers disproportionately


**what_adai_should_adopt**

The Pending mechanism as a model for vocabulary proposals. Schema.org's staging area — where new types are proposed, discussed, and either promoted or abandoned — maps directly to A(DAI)'s /extend pattern for edge type and node type proposals. The backward-compatible extension pattern: new types can be added without breaking existing consumers. The global property principle: A(DAI) should consider whether some edge types (like 'influences' or 'critiques') should work across all node types without restriction.


**what_adai_should_refuse**

The market epistemology. Schema.org's validity is determined by what Google will consume, not by what is true or useful for the field. A(DAI) must refuse this — its vocabulary's validity comes from whether it helps practitioners and researchers see the field more clearly. Also refuse: the flat property model that allows any property on any type. A(DAI)'s typed edges need semantic constraints. Also refuse: the absence of temporal depth — Schema.org treats time as metadata, not structure.


#### Limitations, blind spots, and failure modes


**limits**

Designed for breadth, not depth. The vocabulary covers many domains shallowly. Art and culture types (VisualArtwork, CreativeWork) are too generic for serious cultural analysis. No support for contested claims, provenance chains, or temporal reasoning. The 'anything goes' property model means markup quality varies wildly across the web.


#### Governance models and consent architectures


**governance_model**

Corporate consortium with open community layer. W3C Schema.org Community Group provides discussion forum. Founding companies (Google, Microsoft, Yahoo, Yandex) retain significant influence through implementation choices. Changes proposed via GitHub issues.


#### Material and operational conditions


**composability**

Highly composable. JSON-LD serialization allows mixing with any other vocabulary. External extensions are independently maintained. Can be embedded in any web page. Library-level and protocol-level composability.


**liveness**

Actively maintained. Regular releases. 45+ million domains use it. Over 450 billion Schema.org objects on the web. Ongoing development through GitHub and W3C Community Group.


**scale_of_operation**

Planetary. The most widely deployed structured data vocabulary on the web. Used by billions of web pages across millions of domains.


**temporality**

Ahistorical. Schema.org describes the present state of things. Version history exists but is not emphasized. No deep time, no cyclical logic, no anticipatory capacity. The vocabulary evolves through accretion — new types are added, old types rarely removed.


**Uncertain fields:** epistemological_stance, structural_tension, who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### Getty ULAN / AAT / TGN

**Brief:** Art-specific controlled vocabularies. Expert-curated. High authority, low adaptability.

**Garden Logic relevance:** Represents the institutional voice A(DAI) critiques — authoritative but not contestable. No fork rights, no frontier signals.

#### Basic identification and classification

- **name**: Getty ULAN / AAT / TGN
- **type**: ontology

**originator**

Getty Research Institute, Getty Vocabulary Program. Key figure: Patricia Harpring (Managing Editor).

- **year**: AAT: 1990 (first edition), ULAN: 1984 (origins), TGN: 1987 (origins). CONA and IA added later.

**key_text**

Introduction to Controlled Vocabularies: Terminology for Art, Architecture, and Other Cultural Works (Harpring, updated edition)

- **key_url**: https://www.getty.edu/research/tools/vocabularies/

#### Core ideas and theoretical positioning


**core_claim**

Art-specific knowledge requires expert-curated controlled vocabularies with hierarchical structure, multilingual coverage, and rich relational networks to enable precise cataloguing, retrieval, and research across cultural heritage institutions.


**relation_to_attention_economy**

Explicitly opposes attention logic. The vocabularies serve scholarly precision, not discoverability or engagement. However, they function as gatekeeping infrastructure — institutions that use Getty vocabularies produce more 'findable' collections, creating an indirect attention advantage. The vocabularies are invisible to the attention economy's surface but structurally present in its plumbing.


**relation_to_commons**

Partially open commons. Released as Linked Open Data (LOD) since 2014. Free to access via web services and bulk downloads. However, the editorial process is expert-controlled with no community governance. Contributions come from 350+ institutions but are filtered through Getty editorial standards. A commons of data, not of governance.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Hierarchical thesaurus structure (AAT) and authority files (ULAN, TGN). Polyhierarchical — terms can belong to multiple broader categories. Rich relational network with typed relationships (hierarchical, associative, equivalence). ISO 25964 (thesaurus standard) compliant.


**data_model**

Concepts with preferred/variant terms, scope notes, hierarchical (broader/narrower) and associative relationships, source citations, contributor attributions. ULAN adds biographical data (dates, nationalities, roles, relationships between artists). Available as LOD (RDF), XML, relational tables, and web services.


**temporal_logic**

Historical depth with bi-temporal elements. ULAN records include birth/death dates, active dates, and date qualifiers (circa, before, after). TGN records include historical names and date ranges. However, this is metadata temporality, not structural — the vocabularies don't reason about time.


**absence_handling**

No computational absence detection. Coverage gaps are identified through editorial review and community feedback. The scope definitions explicitly state what is included and excluded — AAT excludes proper names, TGN excludes non-art-relevant places. These exclusion boundaries are documented but not dynamic.


**scalability_model**

Centralized editorial control with distributed contribution. Getty maintains the authoritative versions. 350+ institutions contribute terms and data. No federation — all changes flow through Getty editorial process. Scales through institutional contribution, not technical distribution.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate — The Getty vocabularies are reference data infrastructure. They define the canonical terms and relationships for describing cultural objects and their creators.


**intention_vs_attention**

Neither. The vocabularies serve reference — providing stable, authoritative terms for cataloguing. They do not diagnose gaps (intention) or surface novelty (attention). They are designed to be invisible infrastructure: the cataloguer looks up the correct term, applies it, and moves on. This is the 'cathedral' model that A(DAI) positions itself against — authoritative but not alive to what the field is becoming.


**coherence_vs_consensus**

Expert consensus. The vocabularies represent the settled vocabulary of art history as determined by qualified editors. When terms are disputed, the editorial process resolves toward a preferred term with variants recorded. This is not coherence — it is resolution. The vocabularies cannot hold two equally valid but contradictory readings of a concept.


**contestability**

Very low for end users. Contributors can propose terms, but Getty editors determine inclusion. There is no mechanism for practitioners to contest how their work is categorized. No fork rights. The vocabularies present themselves as descriptive (recording how terms are used) but function as prescriptive (defining which terms are legitimate).


**forkability**

Data is forkable (LOD/CC-BY license since 2014). The vocabularies themselves cannot be forked in any meaningful sense — their value comes from institutional authority and editorial quality, neither of which transfers to a fork. A fork of the AAT would be a list of terms without the Getty imprimatur.


**tendency_axis_position**

openness: data open, governance closed | commons: institutional commons (open data, expert governance) | spectacle: pure infrastructure, invisible | individual: institutional, not individual or distributed


**what_adai_should_adopt**

The rich relational vocabulary between artists in ULAN (teacher-of, student-of, collaborated-with, influenced-by, partner-of) maps directly to A(DAI)'s practitioner edge types. The polyhierarchical structure of AAT — where a concept can have multiple broader terms — is more flexible than single-hierarchy taxonomies and relevant to A(DAI)'s concept organization. The accommodation of uncertainty in dates and attributions (circa, attributed to, possibly) shows how a structured system can represent epistemic humility.


**what_adai_should_refuse**

The gatekeeping editorial model. A(DAI) must refuse any system where a central editorial authority determines which terms and practitioners are legitimate. The exclusion of 'frontier' concepts — AAT by definition excludes terms that haven't been established in published sources. A(DAI) exists precisely to make visible what the Getty vocabularies cannot yet name. Also refuse: the scope limitations that separate people (ULAN), concepts (AAT), and places (TGN) into separate databases. A(DAI)'s graph should integrate these as connected node types.


#### Limitations, blind spots, and failure modes


**limits**

Slow to evolve. New terms take years to be added through editorial review. Cannot accommodate rapidly emerging practices (AI art, generative aesthetics, blockchain-native culture) until they have established published literature. The scope definitions create structural blind spots — practices that cross AAT/ULAN/TGN boundaries or that don't fit established categories are invisible. Western art historical bias despite multilingual expansion efforts.


#### Governance models and consent architectures


**governance_model**

Centralized institutional governance. Getty Research Institute maintains editorial control. Contributions from 350+ institutions are filtered through Getty editorial standards. Advisory committees provide guidance. No community governance or democratic process.


#### Material and operational conditions


**composability**

Moderately composable. Available as LOD (RDF), XML, relational tables, web services API. Can be embedded in other systems through LOD integration. Not modular — the vocabularies are monolithic within their domains. Cross-vocabulary links exist but are not deeply integrated.


**liveness**

Actively maintained. Continuous editorial work. Growing multilingual coverage. Updated edition of the terminology guide published. However, the pace of change is slow by design — editorial rigor requires time.


**scale_of_operation**

Field-level for the visual arts domain. AAT contains 400,000+ terms. ULAN contains 300,000+ artist records. TGN contains 2+ million geographic names. Used by major museums, archives, and libraries worldwide.


**temporality**

Deep historical depth. ULAN covers artists from antiquity to present. TGN includes historical place names across centuries. AAT includes historical and contemporary terms. The vocabularies are designed to be durable — terms are rarely removed, only marked as deprecated. Archival temporality, not emergent.


**Uncertain fields:** epistemological_stance, structural_tension, who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### SKOS (Simple Knowledge Organization System)

**Brief:** W3C standard for concept schemes with loose coupling between terms. Supports broader/narrower/related.

**Garden Logic relevance:** Lightweight enough for A(DAI)'s typed edges. Could model tendency axes as concept schemes.

#### Basic identification and classification

- **name**: SKOS (Simple Knowledge Organization System)
- **type**: ontology
- **originator**: W3C Semantic Web Deployment Working Group. Key figures: Alistair Miles, Sean Bechhofer.
- **year**: 2009 (W3C Recommendation). Development began 2003-2004.
- **key_text**: SKOS Simple Knowledge Organization System Reference (W3C Recommendation, 18 August 2009)
- **key_url**: https://www.w3.org/TR/skos-reference/

#### Core ideas and theoretical positioning


**core_claim**

Knowledge organization systems (thesauri, classifications, taxonomies) can be represented on the Semantic Web using a lightweight, loosely-coupled model that preserves broader/narrower/related relationships without requiring formal ontological commitments.


**relation_to_attention_economy**

SKOS is neutral infrastructure with no direct relationship to the attention economy. It is a representational vocabulary, not a retrieval or ranking system. However, SKOS-encoded vocabularies are used in search and discovery systems, making SKOS an invisible enabler of attention allocation in library and archival contexts.


**relation_to_commons**

Open standard (W3C Recommendation), freely implementable. Used extensively in public sector and cultural heritage contexts. The standard itself is a commons — no licensing restrictions, no gatekeeping. However, the vocabularies encoded in SKOS are often institutionally controlled.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

RDF vocabulary for concept schemes. Concepts linked by semantic relations (broader, narrower, related) within concept schemes. Mapping relations (broadMatch, narrowMatch, relatedMatch, exactMatch, closeMatch) connect concepts across schemes. Built on RDF/OWL.


**data_model**

Concepts identified by URIs with preferred/alternate/hidden labels in multiple languages. Organized into concept schemes via skos:inScheme. Hierarchical relations (broader/narrower) are non-transitive by default but have transitive super-properties (broaderTransitive/narrowerTransitive). Scope notes, definitions, examples, and editorial notes provide human-readable context.


**temporal_logic**

None. SKOS has no native temporal representation. Concept schemes are static snapshots. Change over time is not modeled — a concept either exists in a scheme or it doesn't. Versioning is left to implementers.


**absence_handling**

No absence detection. SKOS represents what exists in a concept scheme. Missing concepts are simply absent. The mapping relations (broadMatch, etc.) can reveal gaps when concepts in one scheme have no match in another, but this requires manual comparison.


**scalability_model**

Distributed. Each concept scheme is independently published and maintained. Mapping relations connect schemes without requiring central coordination. Scales through decentralized publication on the Semantic Web.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate — SKOS operates at the vocabulary/data model layer. It defines how concepts and their relationships are represented. It is not a sensing, diagnostic, or participation layer.


**intention_vs_attention**

Neither. SKOS is a representational format, not an optimization system. It does not diagnose gaps (intention) or surface novelty (attention). It provides the vocabulary for other systems to do these things. For A(DAI), SKOS is interesting as a lightweight format for representing tendency axes and concept vocabularies — the question is whether SKOS's loose coupling is sufficient for A(DAI)'s needs or whether stronger typing is required.


**coherence_vs_consensus**

Structurally enables coherence. SKOS's loose coupling means multiple concept schemes can coexist without requiring consensus. The mapping relations (closeMatch, relatedMatch) explicitly model relationships between different conceptualizations of the same domain without resolving them. This is closer to A(DAI)'s coherence model than most ontological approaches — SKOS can hold 'different ways of organizing the same territory' simultaneously.


**contestability**

Moderate. Anyone can publish a competing concept scheme. Mapping relations can express disagreement (A in scheme X closeMatches B in scheme Y, but not exactMatch — they are close but not identical). However, there is no native mechanism for recording why concepts are contested or for tracking the provenance of conceptual disagreements.


**forkability**

High. Concept schemes are independently publishable. Anyone can fork a scheme, modify it, and publish their version. Mapping relations can reconnect forked schemes. Provenance is not native but can be added through RDF metadata. This is close to A(DAI)'s forkability requirement.


**tendency_axis_position**

openness: fully open (W3C standard, no restrictions) | commons: protocol commons (shared standard, no governance of content) | spectacle: pure infrastructure | individual: neutral (used at all scales)


**what_adai_should_adopt**

The concept scheme architecture for organizing tendency vocabularies. Each tendency axis (openness-enclosure, commons-capture, spectacle-infrastructure) could be a SKOS concept scheme with broader/narrower structure. The mapping relations for connecting A(DAI)'s vocabulary to external vocabularies (Getty AAT, Wikidata) without requiring alignment. The loose coupling principle — A(DAI) should not require concepts to fit into a single hierarchy. SKOS's multilingual label support for global scene coverage.


**what_adai_should_refuse**

The lack of temporal representation. A(DAI) needs to track how concepts emerge, evolve, and decay — SKOS cannot do this. The absence of provenance on relationships — SKOS says 'A is broader than B' but not 'according to whom' or 'since when.' Also refuse the assumption that broader/narrower/related is sufficient — A(DAI) needs richer edge types (CRITIQUES, PIONEERS, INFLUENCES) that SKOS cannot express.


#### Limitations, blind spots, and failure modes


**limits**

Too simple for complex knowledge representation. Three relation types (broader, narrower, related) cannot capture the nuanced relationships that cultural knowledge requires. No support for reasoning beyond transitive hierarchy traversal. No constraints — any concept can relate to any other concept in any way, which permits structural nonsense. No native versioning or change tracking.


#### Governance models and consent architectures


**governance_model**

Open protocol. The SKOS standard is governed by W3C processes. Individual concept schemes are governed by whoever publishes them. No governance of content, only of the representational format.


#### Material and operational conditions


**composability**

Highly composable. RDF foundation enables mixing with any other Semantic Web vocabulary. Concept schemes can be independently published and connected through mapping relations. Protocol-level composability.


**liveness**

Stable standard, not actively evolving. The 2009 W3C Recommendation remains current. SKOS-XL (extended label model) added in 2009. No significant updates since. The standard is complete for its intended purpose. Widely adopted in library and cultural heritage sectors.


**scale_of_operation**

Multi-scale. Used by individual researchers, institutions, and international organizations. Concept schemes range from small specialist vocabularies to large thesauri with hundreds of thousands of concepts.


**temporality**

Ahistorical. SKOS represents the current state of a concept scheme. No built-in support for tracking how concepts evolve over time. Implementers can add temporal metadata through RDF extensions, but this is not standardized.


**Uncertain fields:** who_is_excluded, failure_under_attention, consent_architecture

---


### OntoGPT / LLM-driven ontology learning

**Brief:** Using LLMs to extract and propose ontological structures from unstructured text. Bottom-up category discovery.

**Garden Logic relevance:** Direct precedent for absence detection — finding concepts the graph implicitly contains but hasn't formalized. Automates what Mode B3 does manually.

#### Basic identification and classification

- **name**: OntoGPT / LLM-driven ontology learning
- **type**: ontology

**originator**

OntoGPT: Monarch Initiative (Christopher Mungall, J. Harry Caufield et al., Lawrence Berkeley National Laboratory). Broader field: LLMs4OL community, OntoGenix (Cota et al.), various research groups.


**year**

OntoGPT: 2023 (SPIRES paper, arXiv:2304.02711). LLMs4OL Challenge: 2024 (1st edition), 2025 (2nd edition).


**key_text**

SPIRES: Structured Prompt Interrogation and Recursive Extraction of Semantics (Caufield et al., 2023). Also: LLMs4OL 2024/2025 Challenge proceedings.

- **key_url**: https://github.com/monarch-initiative/ontogpt

#### Core ideas and theoretical positioning


**core_claim**

Large language models can extract and propose ontological structures from unstructured text, enabling bottom-up category discovery that complements and potentially replaces labor-intensive expert curation.


**relation_to_attention_economy**

Indirect relationship. LLM-driven ontology learning uses the same LLMs that power attention-economy applications, but repurposes them for knowledge structuring. The approach inherits LLM biases (trained on attention-economy-shaped corpora), meaning that the ontologies it discovers may reflect what has received the most attention rather than what is structurally important.


**relation_to_commons**

OntoGPT is open source (BSD license). The approach democratizes ontology construction — domain experts can define schemas without ontological training. However, dependency on proprietary LLMs (GPT-4o is the default) creates a private infrastructure dependency within a commons-oriented tool.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

LLM-pipeline with ontological grounding. SPIRES pattern: user defines YAML schema template referencing existing ontologies; LLM extracts structured instances from text; results are grounded against ontology term databases. OntoGenix extends this with iterative refinement. LLMs4OL decomposes into subtasks: term extraction, term typing, taxonomy construction, relation extraction, axiom discovery.


**data_model**

Schema-defined attribute-value pairs grounded to ontology URIs. Output is structured instances that conform to user-defined templates. Can produce OWL ontology fragments. The data model is determined by the input schema, not by the system itself.


**temporal_logic**

None native. The extraction operates on text at a point in time. No tracking of how extracted ontologies evolve. No temporal reasoning about when concepts emerged or how they relate across time. The LLM's training data cutoff creates an implicit temporal boundary.


**absence_handling**

This is the critical capability for A(DAI). LLM ontology learning can detect implicit concepts — things the text discusses but that no existing ontology has formalized. When the LLM encounters a concept that doesn't ground to any existing ontology term, it creates a new candidate concept. This is structural absence detection through failed grounding. However, the detection is dependent on the quality of the input text and the LLM's ability to distinguish genuine novelty from extraction noise.


**scalability_model**

Centralized LLM dependency. Each extraction call requires an LLM API call. Processing is sequential (one document at a time recommended for quality). Scales linearly with corpus size but limited by LLM costs and rate limits. Not distributed or federated.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

sensing-loop — LLM ontology learning directly maps to A(DAI)'s sensing function. It detects patterns, extracts structure, and identifies concepts that haven't been formalized. It is the computational analog of the human editorial judgment in the merge boundary.


**intention_vs_attention**

Intention-adjacent but not intention-native. LLM ontology learning finds concepts (what exists in text) but does not diagnose gaps (what should exist but doesn't). The failed-grounding pattern (when a concept doesn't match any existing term) is a primitive form of absence detection, but it detects absence in the ontology, not in the field. A(DAI) needs both: absence in the vocabulary (OntoGPT can help) and absence in the graph (requires structural analysis). The approach is closer to intention than attention because it structures rather than ranks, but it lacks the diagnostic capacity that intention requires.


**coherence_vs_consensus**

Neither explicitly. LLM ontology learning produces candidate structures without resolving whether they are consensual or coherent. The output is a proposal, not a determination. This is useful for A(DAI) — the system proposes; the merge boundary deliberates. However, the LLM's training data encodes consensus (popular/dominant framings are overrepresented), creating an implicit consensus bias in the proposals.


**contestability**

High in principle — LLM outputs are explicitly presented as proposals to be reviewed by domain experts. OntoGPT's documentation emphasizes human oversight. In practice, the automation pressure (extracting hundreds of concepts from large corpora) makes review increasingly cursory. Contestability exists but may not survive scaling.


**forkability**

OntoGPT itself is forkable (open source). The extracted ontologies are forkable. The LLM is not forkable (proprietary). This creates an asymmetric forkability — you can fork the tool and the output, but not the core intelligence. Open-weight LLMs (LLAMA) offer a path to full forkability but with quality trade-offs.


**tendency_axis_position**

openness: tool open, LLM dependency semi-closed | commons: tool is commons, LLM is corporate | spectacle: infrastructure (invisible automation) | individual: research-group scale currently, field-level aspirations


**what_adai_should_adopt**

The SPIRES pattern: define a schema template, extract structured instances from text, ground against existing vocabulary. This maps directly to A(DAI)'s signal processing pipeline (scripts/process_signals.py). The failed-grounding pattern as a primitive absence detector — when signals reference concepts that don't exist in A(DAI)'s vocabulary, flag them for Mode B3 vocabulary proposals. The YAML schema approach for defining extraction templates without code. The LLMs4OL task decomposition (term extraction, typing, taxonomy construction, relation extraction) as a structured approach to processing inbox signals.


**what_adai_should_refuse**

The assumption that LLM extraction is objective or neutral. LLMs reproduce the biases of their training data — concepts that are well-represented online will be easier to extract, while frontier or marginalized concepts will be missed or misclassified. A(DAI) must treat LLM-extracted ontology as hypothesis, not discovery. Also refuse: the single-LLM dependency. A(DAI) should use multiple LLMs and compare outputs to detect extraction biases.


#### Limitations, blind spots, and failure modes


**limits**

65% agreement with human reviewers means 35% error or disagreement. Hallucination is a persistent problem — LLMs confidently propose ontological structures that are plausible but wrong. Performance degrades for interpretation-heavy or study-specific information. Dependent on expensive proprietary LLMs. Cannot reason about ontological constraints (consistency, disjointness) — it extracts structure but cannot verify it. Poor at capturing complex axioms and property relationships.


#### Governance models and consent architectures


**governance_model**

OntoGPT: open-source project governance (Monarch Initiative, GitHub). LLMs4OL: academic challenge governance (annual competition with review). No formal governance for the broader field of LLM-driven ontology learning. Individual research groups set their own standards.


#### Material and operational conditions


**composability**

Moderately composable. OntoGPT is a Python package (pip installable). YAML schema templates are modular. Output can be in various formats. However, the LLM dependency makes it harder to embed in constrained environments. Library-level composability.


**liveness**

Actively developed. OntoGPT receives regular updates on GitHub. LLMs4OL Challenge held in 2024 and 2025. The broader field is rapidly evolving. However, individual tools may be abandoned as the landscape shifts.


**scale_of_operation**

Currently research-group to institutional scale. Processing individual papers or small corpora. Not yet proven at field-level scale (processing thousands of signals per day). The LLM cost constraint limits deployment scale.


**temporality**

Snapshot-based. Each extraction operates on text at a point in time. No tracking of how extracted structures evolve. The LLM's training cutoff creates an implicit temporal boundary. No cyclical, anticipatory, or tidal temporal logic.


**Uncertain fields:** epistemological_stance, structural_tension, who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### Emergent ontology / taxonomy induction

**Brief:** Unsupervised discovery of categories from data. REBEL, DeepOnto, ontology alignment research.

**Garden Logic relevance:** The garden's sensing layer needs to detect categories that don't exist yet. This is the technical literature for that capability.

#### Basic identification and classification

- **name**: Emergent ontology / taxonomy induction
- **type**: ontology

**originator**

Multiple research groups. DeepOnto: Yuan He, Jiaoyan Chen, Ian Horrocks (University of Oxford). REBEL: Pere-Lluis Huguet Cabot, Roberto Navigli (Sapienza University). Chain-of-Layer: Yanzhen Shen et al. BERTMap: Jiaoyan Chen et al. Taxonomy induction community broadly.


**year**

DeepOnto: 2023-2024 (Semantic Web journal, 2024). REBEL: 2021. BERTMap: 2022 (AAAI). Ontology alignment research: 2000s-present. Hyperbolic taxonomy construction: 2024-2025.


**key_text**

DeepOnto: A Python Package for Ontology Engineering with Deep Learning (He et al., Semantic Web, 2024). Language Models as Hierarchy Encoders (NeurIPS 2024).

- **key_url**: https://github.com/KRR-Oxford/DeepOnto

#### Core ideas and theoretical positioning


**core_claim**

Categories and taxonomic structures can be discovered from data through unsupervised or semi-supervised computational methods, rather than being imposed by expert committees, enabling ontologies that emerge from usage patterns rather than top-down design.


**relation_to_commons**

Largely commons-oriented. DeepOnto is open source (Apache 2.0). Research papers are mostly available on arXiv. Benchmark datasets are publicly available. However, the computational resources required (GPU clusters, large language models) create access barriers that favor well-funded research institutions.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Multiple patterns: (1) Embedding-based: encode terms/concepts as vectors, cluster or structure them in embedding space (DeepOnto, BERTMap, hyperbolic methods). (2) Extraction-based: identify entities and relations from text using neural models (REBEL). (3) LLM-prompted: use large language models with structured prompts to generate taxonomies (Chain-of-Layer, LLMs4OL). (4) Alignment-based: match concepts across existing ontologies using neural similarity (ontology matching/alignment).


**data_model**

Varies by method. Output is typically: hierarchical taxonomies (is-a relations), flat concept lists with similarity scores, ontology alignment mappings (concept X in ontology A matches concept Y in ontology B), or open triples (entity-relation-entity). DeepOnto uses OWL ontologies as both input and output. REBEL produces relation triples from text.


**temporal_logic**

Generally none. Most methods operate on static corpora. Some work on streaming data (incremental ontology learning) but this is rare. The temporal dimension of category emergence — how concepts are born, evolve, and die — is not modeled by current methods.


**absence_handling**

This is the critical capability. Taxonomy induction methods discover categories that exist in data but haven't been formally named. Ontology alignment methods identify concepts that exist in one ontology but not another — a form of structural gap detection. Hyperbolic embedding methods can detect structural holes in taxonomies where intermediate concepts should exist but don't. LKD-KGC (2025) uses embedding-based schema integration to automatically discover entity types that emerge from data but aren't in any existing schema.


**scalability_model**

Varies. Embedding methods scale to large corpora but require GPU compute. REBEL scales well (pre-trained model, fast inference). LLM-based methods are limited by API costs. Ontology alignment methods are typically applied to pairs of ontologies, not at field scale. Overall: research-scale, not production-scale.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

sensing-loop — Emergent ontology methods are A(DAI)'s sensing layer technology. They detect what the graph implicitly contains but hasn't formalized. They are the computational foundation for absence detection and vocabulary extension.


**intention_vs_attention**

Intention-aligned but attention-contaminated. The goal of taxonomy induction — discovering the structure of a domain — is a structural diagnosis task (intention). However, the methods learn from corpora that are attention-shaped, so the discovered categories reflect what has received attention rather than what is structurally important. A(DAI) needs to layer editorial judgment over emergent categories to filter attention-artifacts from structural discoveries. This is exactly what the merge boundary does.


**coherence_vs_consensus**

Coherence-compatible. Emergent methods can discover multiple valid categorizations of the same domain (different clusterings, different hierarchy orderings). This multiplicity is usually treated as a problem to resolve (pick the best clustering), but A(DAI) could treat it as a feature — different categorizations represent different readings of the field. Ontology alignment's explicit modeling of near-matches (closeMatch, not exactMatch) supports coherence over consensus.


**contestability**

High by nature. Emergent categories are explicitly provisional — they are discovered patterns, not authoritative classifications. Any discovered taxonomy can be challenged by re-running with different parameters, different data, or different methods. However, once deployed, emergent categories tend to ossify — the system treats them as established even if their provenance is computational.


**forkability**

High. Open-source tools, standard data formats, reproducible methods. A fork of A(DAI) could run its own taxonomy induction with its own data and produce a legitimately different categorization. Provenance tracking (which method, which data, which parameters) is technically feasible but not standardized.


**tendency_axis_position**

openness: research open (papers, code, data) | commons: academic commons (shared methods, competitive publication) | spectacle: invisible research infrastructure | individual: research-group scale


**what_adai_should_adopt**

DeepOnto's ontology alignment capabilities for connecting A(DAI)'s vocabulary to established vocabularies (Getty AAT, CIDOC-CRM) without forcing alignment. The embedding-based gap detection pattern — encode A(DAI)'s graph in embedding space and identify structural holes where concepts should exist but don't. REBEL-style relation extraction for processing inbox signals. The hyperbolic embedding approach for representing hierarchical structure (tendencies, concept hierarchies) in a mathematically principled way. The LLMs4OL task decomposition as a framework for the signal processing pipeline.


**what_adai_should_refuse**

The assumption that discovered categories are natural kinds. Emergent ontology methods discover statistical patterns, not truths. A(DAI) must label computationally discovered categories as hypotheses, with explicit provenance showing the method, data, and parameters that produced them. Also refuse: the single-run discovery model. Categories should emerge through repeated sensing over time (the survey cycle), not from a single computational pass. Also refuse: the focus on is-a hierarchies. A(DAI)'s typed edges (CRITIQUES, INFLUENCES, PRACTICES) are richer than taxonomic relations.


#### Limitations, blind spots, and failure modes


**limits**

Methods are sensitive to corpus composition — different input data produces different categories. No standard evaluation metrics for taxonomy quality (precision/recall assume a gold standard, but the point is to discover what the gold standard missed). Computational cost is high. Most methods produce flat or shallow hierarchies — deep multi-level taxonomies are harder. The gap between research benchmarks and real-world deployment is large.


#### Governance models and consent architectures


**governance_model**

Academic open research. No formal governance of the field. Individual projects have their own governance (DeepOnto: Oxford KRR group). Benchmarks and challenges (LLMs4OL, OAEI) provide informal coordination. No community governance of discovered categories.


#### Material and operational conditions


**composability**

Highly composable for technical users. DeepOnto is a Python package. REBEL is a pre-trained model available on Hugging Face. Methods can be chained (extract entities with REBEL, build taxonomy with DeepOnto, align with BERTMap). Library-level composability.


**liveness**

Active research area. DeepOnto updated in 2024. LLMs4OL Challenge held annually. NeurIPS 2024 paper on hierarchy encoding. New methods published regularly. However, individual tools may be abandoned as the field moves fast.


**scale_of_operation**

Research-scale currently. Ontology alignment benchmarks operate on pairs of ontologies with thousands of concepts. Taxonomy induction tested on datasets up to millions of terms. Not yet proven at the scale of continuous field-level sensing.


**temporality**

Snapshot-based. Most methods operate on static corpora at a point in time. No tracking of how categories emerge, evolve, or decay over time. Incremental ontology learning is an active research area but not yet mature. No cyclical or anticipatory temporal logic.


**Uncertain fields:** epistemological_stance, relation_to_attention_economy, structural_tension, who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### CR-SQLite / Automerge / Local-first Software

**Brief:** CRDT-based databases enabling forkable, mergeable, offline-first data. Mathematical conflict resolution.

**Garden Logic relevance:** The mechanical foundation for fork rights. CRDTs guarantee that independent observations never conflict — the composite primary key design. Tests whether CRDT semantics match commons governance needs.

#### Basic identification and classification

- **name**: CR-SQLite / Automerge / Local-first Software
- **type**: ontology

**originator**

CR-SQLite: Matt Wonlaw (vlcn.io). Automerge: Martin Kleppmann, Ink & Switch. Local-first concept: Kleppmann et al. (Ink & Switch). Related: Yjs (Kevin Jahns), Loro, ElectricSQL.


**year**

2019 (Kleppmann et al. 'Local-first software' essay); 2017 (Automerge initial release); 2022 (CR-SQLite initial release); 2024 (Automerge 3).


**key_text**

Kleppmann, M. et al. (2019) 'Local-first software: You own your data, in spite of the cloud', Ink & Switch. Kleppmann, M. (2022) 'Making CRDTs 98% More Efficient'. CR-SQLite docs at vlcn.io.

- **key_url**: https://www.inkandswitch.com/local-first/

#### Core ideas and theoretical positioning


**core_claim**

Users should own their data, and software should work locally first — with synchronisation as an optional layer. CRDTs (Conflict-free Replicated Data Types) guarantee that independent concurrent modifications can always be merged without conflict, enabling offline-first, multi-writer collaboration without central coordination.


**relation_to_attention_economy**

Local-first software is a direct structural challenge to the attention economy. Cloud-first platforms capture attention because they own the data — local-first inverts this by giving data ownership back to users. When users own their data, platforms cannot lock them in, cannot mine their data for ad targeting, and cannot manipulate feeds for engagement. Local-first is infrastructure-level resistance to attention capture.


**relation_to_commons**

Deeply aligned with commons principles. Local-first software treats data as a user-owned resource that can be voluntarily pooled through synchronisation. CRDTs enable a novel form of commons governance: participants can contribute to shared data structures without any single party controlling the merge. Fork-and-merge is a commons pattern — the right to take your data and go.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

CRDT (Conflict-free Replicated Data Types). Peer-to-peer or multi-master replication. No central server required. CR-SQLite extends SQLite with CRDT columns (counter, fractional index, last-write-wins). Automerge provides a JSON-like CRDT data structure with git-like versioning (diff, branch, merge). Key patterns: eventual consistency, causal ordering, tombstones, vector clocks/Lamport timestamps.


**data_model**

CR-SQLite: relational tables with CRDT-enabled columns, changesets exchanged via virtual tables. Automerge: JSON-like document CRDT with operational history. Both track per-column causality and maintain full operation logs for merge resolution. Data is structured, versioned, and cryptographically hashable.


**temporal_logic**

Bi-temporal by nature. CRDTs inherently track two timelines: operation time (when a change was made by a user) and merge time (when that change was observed by a replica). This is structurally identical to the bi-temporal model in Graphiti/Zep. Additionally, Automerge maintains full operation history, enabling time-travel queries.


**absence_handling**

CRDTs handle absence through tombstones — deleted items are marked, not removed, to prevent resurrection conflicts. The fork model means that if a replica has not yet seen certain operations, this absence is a known state with a clear resolution path (apply the missing operations). Absence is structural and resolvable, not diagnostic.


**scalability_model**

Distributed and forkable. Each replica is sovereign. Scaling is horizontal — more replicas, not bigger servers. However, metadata overhead grows with the number of writers and operations. CR-SQLite optimises for small-to-medium datasets. Automerge 3 achieved 10x memory reduction but remains expensive for very large documents.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate. CRDTs provide the mechanical foundation for A(DAI)'s fork rights and merge guarantees. This is the deepest infrastructure layer — it determines what is computationally possible for distributed, sovereign knowledge graphs.


**intention_vs_attention**

CRDTs are intention-neutral at the data layer — they guarantee convergence regardless of what the data represents. However, the local-first philosophy is structurally aligned with intention: by giving users sovereignty over their data, it prevents the platform dynamics that drive attention capture. Fork rights are intention infrastructure — they ensure that any community can maintain its own reading of the graph without being overridden by a central authority. The mechanism is silent; it operates at the level of data structure, not signal processing.


**coherence_vs_consensus**

CRDTs achieve coherence without consensus. This is their fundamental innovation: two replicas will converge to the same state without ever needing to agree on an ordering or resolve a conflict through negotiation. Coherence is a mathematical guarantee, not a social process. This is the strongest possible technical alignment with A(DAI)'s coherence principle — the graph should produce structurally consistent states across distributed replicas without requiring any community to agree.


**contestability**

CRDTs enable contestability at the fork level — any replica can diverge and maintain a different state indefinitely. CR-SQLite explicitly supports forking: developers can choose to fork data on merge conflict rather than auto-merging. Contested readings of the graph can coexist as parallel forks with full provenance.


**forkability**

Maximum forkability. This is the primary design goal. CRDTs guarantee that forked replicas can always re-merge without conflict. Provenance is preserved through operation logs and causal ordering. A(DAI) communities can fork the graph, develop independent readings, and selectively re-merge — exactly the 'fork rights' the architecture requires.


**tendency_axis_position**

openness: maximally open — all projects are open-source, protocols are documented. commons: pure data commons infrastructure — users own their data, no platform captures it. spectacle vs infrastructure: pure infrastructure — CRDTs are invisible to end users. individual vs distributed: designed for distributed multi-writer scenarios, but sovereignty starts with the individual.


**what_adai_should_adopt**

CRDT-based graph replication as the mechanical substrate for fork-and-merge rights. The bi-temporal model inherent in CRDTs (operation time vs. merge time) as a natural fit for A(DAI)'s tidal sensing — signals have event time (when something happened in the field) and ingestion time (when A(DAI) observed it). Automerge's git-like versioning (diff, branch, merge, pull request) as the collaboration model for the graph. CR-SQLite's approach to conflict resolution — offering the choice between auto-merge and fork — as the pattern for how communities handle contested readings. The local-first principle: A(DAI) communities should be able to operate their graph fragment offline and sync when ready.


**what_adai_should_refuse**

The assumption that all conflicts are syntactic. CRDTs resolve data conflicts (two writers edited the same field), but A(DAI) also faces semantic conflicts (two communities interpret the same cultural phenomenon differently). CRDT merge cannot resolve interpretive disagreements — these require human judgment. Refuse the temptation to treat CRDT convergence as sufficient for cultural coherence. Also refuse the metadata overhead at scale — CRDTs track every operation, which can become prohibitive for A(DAI)'s graph at field scale. Selective operation compaction (Automerge 3's approach) must be adopted early.


#### Limitations, blind spots, and failure modes


**limits**

CRDTs add significant metadata overhead — every operation must be tracked for merge resolution. This limits practical scalability for very large datasets or high-frequency writes. Last-write-wins semantics can silently discard meaningful changes. CRDT merge resolution is syntactic, not semantic — it cannot resolve conflicts that require human judgment. The local-first ecosystem is still immature — tooling, libraries, and developer experience lag behind cloud-first alternatives.


#### Governance models and consent architectures


**governance_model**

Open protocol. CRDT specifications are open. Automerge and CR-SQLite are open-source projects with community governance. No central authority — any implementation that follows CRDT semantics can interoperate. This is protocol-level governance: the rules are in the mathematics, not in an institution.


#### Material and operational conditions


**composability**

Library-level and protocol-level composability. CRDTs can be embedded in any application. Automerge provides language bindings for JavaScript, Rust, and others. CR-SQLite extends SQLite, which is itself maximally composable. These are building blocks, not monolithic platforms.


**liveness**

Active and rapidly evolving. Automerge 3 released in 2024 with major performance improvements. CR-SQLite actively maintained. The local-first ecosystem is growing with new projects (Loro, ElectricSQL, PowerSync). However, CR-SQLite development appears to have slowed in late 2024.


**scale_of_operation**

Individual to small group. Current local-first tools are optimised for personal data and small-team collaboration (10s of writers, not 1000s). Scaling to field-level (A(DAI)'s ambition) will require additional infrastructure beyond current CRDT implementations.


**temporality**

Bi-temporal (operation time vs. merge time). Full operation history enables time-travel. Causal ordering preserves temporal relationships between events. The temporality is granular (per-operation) rather than rhythmic — A(DAI) would need to add tidal rhythm on top.


**Uncertain fields:** who_is_excluded, failure_under_attention, extraction_vector

---


### CHAD-KG (2025)

**Brief:** Knowledge graph for cultural heritage built on CIDOC-CRM, LRMoo, CRMdig, Getty AAT. Demonstrates ontology integration.

**Garden Logic relevance:** Shows how existing cultural ontologies can be composed. Tests whether A(DAI) needs its own ontology or can compose from existing standards.

#### Basic identification and classification

- **name**: CHAD-KG (2025)
- **type**: ontology

**originator**

Sebastian Barzaghi et al., University of Bologna / CHANGES Project. Built on CIDOC-CRM (ICOM), LRMoo (IFLA), CRMdig, and Getty AAT.

- **year**: 2025 (arXiv: May 2025, paper ID 2505.13276). CHAD-AP application profile developed from 2024.

**key_text**

Barzaghi, S. et al. (2025) 'CHAD-KG: A Knowledge Graph for Representing Cultural Heritage Objects and Digitisation Paradata', arXiv:2505.13276.

- **key_url**: https://arxiv.org/abs/2505.13276

#### Core ideas and theoretical positioning


**core_claim**

Cultural heritage objects and their digitisation processes can be described in a single knowledge graph by composing existing ontological standards — CIDOC-CRM for objects, LRMoo for bibliographic metadata, CRMdig for digitisation processes, and Getty AAT for standardised terminology.


**relation_to_attention_economy**

CHAD-KG operates entirely outside attention dynamics. It is a digital humanities infrastructure project focused on archival accuracy and provenance, not engagement or discovery. Its value is preserving cultural knowledge for long-term access, not surfacing it for contemporary attention.


**relation_to_commons**

Strongly aligned with cultural commons. CHAD-KG is published under CC0 (public domain), provides a SPARQL endpoint for open access, and is designed for institutional interoperability. The underlying ontologies (CIDOC-CRM, LRMoo, AAT) are themselves commons resources maintained by international cultural institutions (ICOM, IFLA, Getty). The project demonstrates how cultural knowledge can be shared as structured commons.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Application profile (CHAD-AP) composed from multiple ontological standards, materialised into RDF via Morph-KGC pipeline. Two modules: Object Module (CIDOC-CRM + LRMoo for cultural heritage objects) and Process Module (CRMdig for digitisation workflows). SPARQL endpoint for querying. Linked to 3D virtual environment (Aldrovandi Digital Twin).


**data_model**

RDF triples structured by CHAD-AP. Reuses 20 classes and 38 properties from CIDOC-CRM (37,610 uses), CRMdig (9,643), AAT (8,135), and LRMoo (4,827). Objects are described by type, material, creator, provenance. Processes are described by activity, tool, actor, output. Getty AAT provides controlled vocabulary for types, roles, and activities.


**temporal_logic**

Archival-historical. Objects have creation dates, acquisition histories, and exhibition records. Digitisation processes have timestamps and workflow sequences. Time is historical and documentary — tracking when objects were created, acquired, digitised. No real-time, cyclical, or anticipatory temporal logic.


**absence_handling**

Not explicitly addressed. CHAD-KG documents what exists and has been digitised — it does not detect or represent what is missing from collections, what has been lost, or what has not yet been digitised. The knowledge graph is additive: it grows as more objects are documented. Gaps are not represented.


**scalability_model**

Centralised SPARQL endpoint. Designed for institutional deployment. Currently contains data from the University of Bologna's Aldrovandi collection. Planned expansion to eight case studies from various cultural heritage institutions. Scales through institutional adoption, not through technical distribution.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate. CHAD-KG demonstrates how cultural ontologies can be composed at the schema level — a substrate concern. It does not sense, diagnose, or generate participation. It is a reference model for how A(DAI) might compose existing ontological standards into its own schema.


**intention_vs_attention**

CHAD-KG is neither intention- nor attention-oriented. It is descriptive — documenting what exists without diagnosing what is missing or ranking what matters. This is archival logic, not diagnostic logic. A(DAI) can learn from CHAD-KG's ontological composability without adopting its purely descriptive orientation. The value for A(DAI) is not in CHAD-KG's purpose (heritage documentation) but in its method (ontology composition).


**coherence_vs_consensus**

Consensus-seeking at the ontological level. CHAD-KG composes standards that are themselves products of institutional consensus (ICOM for CIDOC-CRM, IFLA for LRMoo, Getty for AAT). The application profile is a consensus document — it defines how these standards should be composed for this particular domain. This is appropriate for heritage documentation but conflicts with A(DAI)'s need for contestable, evolving ontologies.


**contestability**

Low. Ontological standards are consensus products designed to be stable and authoritative. CHAD-AP is a fixed application profile — there is no mechanism for communities to contest the ontological choices or propose alternative mappings. This is by design for heritage documentation (stability and interoperability are paramount) but misaligned with A(DAI)'s need for evolving, contested vocabularies.


**forkability**

Technically forkable — the application profile and RDF data are CC0. Any institution can take and adapt CHAD-AP. However, forking an ontological standard undermines its purpose (interoperability), so forks are discouraged in practice. This is the ontology stability/evolution tension.


**tendency_axis_position**

openness: maximally open — CC0 licence, SPARQL endpoint, open documentation. commons: institutional commons — governed by heritage institutions through community standards. spectacle vs infrastructure: pure infrastructure — ontological plumbing. individual vs distributed: institutional — CHAD-KG serves heritage institutions, not individual practitioners.


**what_adai_should_adopt**

The composition method: A(DAI) should study how CHAD-KG composes CIDOC-CRM, LRMoo, CRMdig, and AAT into a single coherent application profile. The pattern of using an existing controlled vocabulary (Getty AAT) for standardised terminology rather than inventing one from scratch. The Object Module / Process Module separation: A(DAI) could similarly separate its 'what exists in the field' (objects, practitioners, concepts) from 'how the field operates' (processes, events, flows). The materialisation pipeline (Morph-KGC) as a reference for A(DAI)'s own signal-to-graph conversion process. The SPARQL endpoint pattern for making the graph queryable by external tools.


**what_adai_should_refuse**

The archival-descriptive orientation. CHAD-KG documents what is; A(DAI) must also detect what is not. Heritage documentation assumes a stable object of description (an artwork, a collection); A(DAI) deals with emerging, dissolving, and contested cultural formations that resist stable description. Refuse the institutional consensus model for ontology governance — A(DAI)'s vocabulary must evolve faster than CIDOC-CRM's committee process allows. Refuse the separation of object from context: CHAD-KG describes objects and their digitisation, but A(DAI) must embed objects within living networks of practice, scene, and tendency. Refuse the assumption that a single ontological mapping is sufficient — A(DAI) needs multiple, coexisting, and sometimes contradictory ontological mappings.


#### Limitations, blind spots, and failure modes


**limits**

CHAD-KG is currently limited to a single institutional collection (University of Bologna's Aldrovandi collection). The ontological composition is complex — understanding and correctly applying CIDOC-CRM, LRMoo, CRMdig, and AAT requires significant expertise. The application profile is designed for digitised heritage objects, not for living cultural practices, digital-native artworks, or emergent cultural phenomena. The RDF/SPARQL technology stack has well-known usability limitations.


#### Governance models and consent architectures


**governance_model**

Institutional commons. CHAD-KG itself is CC0. The underlying standards are governed by international heritage institutions: CIDOC-CRM by ICOM (International Council of Museums), LRMoo by IFLA (International Federation of Library Associations), AAT by the Getty Research Institute. These are polycentric but institution-controlled commons.


#### Material and operational conditions


**composability**

Maximally composable at the ontological level. CHAD-AP is itself a composition of four standards. The RDF output is composable with any other RDF-based system. SPARQL provides standard query interoperability. This is the most composable ontological approach in this research set.


**liveness**

Recently published (May 2025). Part of the active CHANGES project. Plans for expansion to eight additional institutional case studies. Active development, but dependent on project funding.


**scale_of_operation**

Institutional. Currently one collection; planned expansion to eight. Designed for heritage institutions, not for field-level or community-scale operation.


**temporality**

Archival-historical. Objects have creation dates and provenance timelines. Digitisation processes have timestamps. No cyclical, anticipatory, or tidal temporal logic. Time is documentary — tracking what happened when in the lifecycle of objects and their digital representations.


**Uncertain fields:** failure_under_attention, consent_architecture, extraction_vector

---


---

## Neural Knowledge Graphs


### GraphRAG (Microsoft, 2024)

**Brief:** LLM-augmented KG construction. Community detection + hierarchical summarization. Query-focused.

**Garden Logic relevance:** Direct technical precedent for the sensing loop. Community detection maps to cluster analysis in the survey cycle. But GraphRAG optimizes for query answering (attention), not structural diagnosis (intention).

#### Basic identification and classification

- **name**: GraphRAG (Microsoft, 2024)
- **type**: neural-kg

**originator**

Microsoft Research. Key authors: Darren Edge, Ha Trinh, Newman Cheng, Joshua Bradley, Alex Chao, Apurva Mody et al.

- **year**: 2024 (arXiv:2404.16130, April 2024)
- **key_text**: From Local to Global: A Graph RAG Approach to Query-Focused Summarization (Edge et al., 2024)
- **key_url**: https://arxiv.org/abs/2404.16130

#### Core ideas and theoretical positioning


**core_claim**

Knowledge graphs constructed from source text via LLM extraction, combined with community detection and hierarchical summarization, enable query-focused summarization that handles both specific and global sensemaking questions over large private corpora.


**relation_to_attention_economy**

GraphRAG optimizes for query answering — a form of attention allocation. The system decides what information is relevant to a query and surfaces it. The community detection and summarization pipeline is designed to compress information for consumption, not to diagnose structural gaps. However, GraphRAG's community structure reveals thematic clusters, which is closer to structural analysis than pure attention optimization.


**relation_to_commons**

Open source (MIT license, GitHub). The methodology is publicly documented. However, the system is designed for private corpora, not public knowledge commons. The infrastructure serves corporate knowledge management, not collective intelligence. Microsoft Research develops the tool; the commons benefits from the release but does not govern it.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Two-phase pipeline: (1) Indexing: text chunking, LLM-based entity/relationship extraction, Leiden community detection on the resulting graph, hierarchical bottom-up community summarization. (2) Querying: map-reduce over community summaries — summaries produce partial answers independently, then partial answers are combined into a global answer.


**data_model**

Entity-relationship graph with community hierarchy overlay. Nodes are entities extracted by LLM. Edges are relationships. Covariates include claims. Communities are hierarchical clusters detected by Leiden algorithm. Each community has an LLM-generated summary. TextUnits (source chunks) provide fine-grained provenance.


**temporal_logic**

None native. The graph is a snapshot of extracted entities/relationships from a corpus at indexing time. No temporal reasoning, no tracking of how the graph evolves. Dynamic community selection (2025 update) allows querying across hierarchy levels but does not add temporal logic.


**absence_handling**

Limited. GraphRAG's community structure can reveal thematic gaps — areas of the corpus that are sparse or disconnected. However, this is an emergent property of the graph, not a designed feature. There is no mechanism to explicitly detect, flag, or diagnose what is missing. The system is optimized to answer questions about what exists, not about what doesn't.


**scalability_model**

Centralized. Designed for single-corpus deployment. Indexing scales to million-token corpora. Querying uses map-reduce over summaries for efficiency (97% fewer tokens than baseline). However, each corpus requires separate indexing. No federation, no forking, no multi-instance coordination.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

sensing-loop + prompt-generation — GraphRAG's entity/relationship extraction maps to A(DAI)'s sensing function. The community detection and summarization pipeline is analogous to A(DAI)'s cluster analysis in the survey cycle. The map-reduce query answering is a form of prompt-generation (turning structural analysis into natural language output).


**intention_vs_attention**

Primarily attention. GraphRAG is designed to answer user queries — it allocates attention to the most relevant parts of the corpus. The community structure provides a map of what exists, not a diagnosis of what's missing. The hierarchical summarization compresses information for consumption, not for structural analysis. However, the community detection step is genuinely structural — it reveals modular clusters and their relationships. A(DAI) should note that this structural analysis is an intermediate step in GraphRAG (used for query answering) but could be a primary output for the garden (used for structural diagnosis). The technology is attention-optimized but intention-capable if reoriented.


**coherence_vs_consensus**

Consensus-oriented. The map-reduce query answering combines partial answers into a single global answer. Disagreements between community summaries are resolved during reduction, not preserved. The system does not maintain multiple readings or contested interpretations. Each query produces one answer, not a spectrum of perspectives.


**contestability**

Low. GraphRAG outputs are presented as authoritative answers synthesized from the corpus. There is no mechanism for users to contest the community structure, challenge entity extraction, or propose alternative summaries. The LLM's extraction decisions are opaque. Provenance is available (TextUnits trace back to source chunks) but not designed for contestation.


**forkability**

Technically forkable (open source). However, the system is designed for individual corpus deployment, not for multi-instance coordination. A fork would be a separate installation with separate data, not a divergent reading of shared data. No provenance tracking across instances. No merge capability.


**tendency_axis_position**

openness: code open, methodology published | commons: tool is open, but serves private knowledge management | spectacle: infrastructure (invisible pipeline) | individual: single-corpus, organizational scale


**what_adai_should_adopt**

The Leiden community detection as a technique for cluster analysis in the survey cycle. The hierarchical community summarization as a model for multi-level graph diagnosis — summaries at different hierarchy levels provide different resolution views of the same structure. The entity/relationship extraction pipeline as a reference architecture for signal processing. The TextUnit provenance model — every graph element traces back to specific source chunks. The map-reduce pattern for generating synthetic analysis from graph structure.


**what_adai_should_refuse**

The single-answer query model. A(DAI) should not collapse community-level insights into a single answer. Instead, it should present the community structure itself as the output — showing practitioners how the field clusters, where boundaries are contested, and what the gaps are. Also refuse: the opacity of LLM extraction. A(DAI)'s merge boundary must be more transparent than GraphRAG's extraction layer. Also refuse: the static indexing model. A(DAI) needs incremental, continuous sensing — not one-time corpus processing.


#### Limitations, blind spots, and failure modes


**limits**

High indexing cost (multiple LLM calls per text chunk for extraction). Quality depends on LLM extraction accuracy. Community detection is sensitive to graph density — sparse graphs produce poor communities. The map-reduce query answering can lose nuance during compression. Not designed for incremental updates — corpus changes require re-indexing. No temporal reasoning.


#### Governance models and consent architectures


**governance_model**

Corporate open source. Microsoft Research develops and releases the tool. Community contributions via GitHub. No governance of the extracted knowledge or community structures. The tool is governed; the outputs are not.


#### Material and operational conditions


**composability**

Moderately composable. Python library, can be integrated into larger pipelines. Output graphs can be exported. However, the system is monolithic — the indexing pipeline, community detection, and query answering are tightly coupled. Not easy to swap individual components.


**liveness**

Actively maintained. Regular updates on GitHub. Dynamic community selection added in 2025. Integrated into Microsoft Discovery platform. Active research and engineering investment from Microsoft.


**scale_of_operation**

Organizational to field-level. Demonstrated on corpora up to 1 million tokens. Graphs of 8,000-15,000 nodes. Not tested at planetary scale but designed for scalability within organizational contexts.


**temporality**

Snapshot-based. Index once, query many times. No incremental updates in the core design (though community contributions are addressing this). No temporal reasoning about how the corpus or its structure evolves.


**Uncertain fields:** who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### LightRAG (EMNLP 2025)

**Brief:** Dual-level retrieval — entity-level (low) and thematic (high). Graph-structured text indexing.

**Garden Logic relevance:** The dual-level model maps to A(DAI)'s pulse (low-level metrics) and dream (high-level narrative). But LightRAG is retrieval-optimized, not diagnosis-optimized.

#### Basic identification and classification

- **name**: LightRAG (EMNLP 2025)
- **type**: neural-kg

**originator**

HKUDS (Hong Kong University Data Science Lab). Key authors: Zirui Guo, Lianghao Xia, Yanhua Yu, Tu Ao, Chao Huang.

- **year**: 2024 (arXiv: October 2024), published in Findings of EMNLP 2025.
- **key_text**: LightRAG: Simple and Fast Retrieval-Augmented Generation (Guo et al., EMNLP 2025 Findings)
- **key_url**: https://arxiv.org/abs/2410.05779

#### Core ideas and theoretical positioning


**core_claim**

Graph-structured text indexing with dual-level retrieval (entity-level for specific facts, thematic-level for broad patterns) produces more comprehensive and contextually aware retrieval than flat document chunking approaches.


**relation_to_attention_economy**

LightRAG is a retrieval system — it allocates attention to relevant information in response to queries. The dual-level design serves two modes of attention: focused (specific entity lookup) and diffuse (thematic overview). This is attention optimization, but with more structural awareness than flat RAG systems.


**relation_to_commons**

Open source (MIT license on GitHub). Freely available. However, depends on proprietary LLMs for entity extraction. The tool serves private knowledge management more than public knowledge commons. Integration with RAG-Anything extends its scope.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Knowledge graph construction from text via LLM extraction, combined with vector embeddings for similarity search. Dual-level retrieval: low-level (entity + direct relationships) and high-level (thematic aggregation across related entities). Incremental graph updates for evolving corpora.


**data_model**

Entity-relationship graph constructed from source text. Entities and relationships are extracted by LLM and stored with both graph structure (adjacency) and vector embeddings (similarity). The dual indexing allows both exact graph traversal and approximate vector similarity search.


**temporal_logic**

Incremental updates. Unlike GraphRAG's static indexing, LightRAG supports adding new data without full re-indexing. This is operational temporality (the system can evolve) rather than temporal reasoning (it doesn't reason about time). No cyclical or anticipatory temporal logic.


**absence_handling**

No explicit absence handling. Like GraphRAG, structural gaps appear as sparse regions in the graph but are not flagged or diagnosed. The dual-level retrieval may surface thematic gaps (high-level queries return sparse results for certain themes) but this is a side effect, not a designed feature.


**scalability_model**

Centralized but more efficient than GraphRAG. Lower indexing cost, faster query time, smaller storage footprint. Incremental updates improve operational scalability. Not federated or distributed.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

sensing-loop — LightRAG's entity/relationship extraction is a sensing function. The dual-level indexing maps loosely to A(DAI)'s multi-resolution analysis (pulse for low-level metrics, dream for high-level narrative).


**intention_vs_attention**

Attention, but with a structural hint of intention. The dual-level retrieval model is interesting for A(DAI): low-level retrieval maps to specific signal lookup (which practitioner works with which material?), while high-level retrieval maps to thematic sensing (what are the emerging tendencies in the field?). However, both levels optimize for query answering (attention), not for structural diagnosis (intention). The high-level retrieval could be repurposed for A(DAI)'s dream mode — aggregating thematic patterns across the graph — but it would need to be reoriented from 'answer questions about themes' to 'diagnose structural gaps in thematic coverage.'


**coherence_vs_consensus**

Consensus-oriented. Each query produces a single answer combining low-level and high-level retrieval. No mechanism for presenting multiple readings or contested interpretations. The graph structure implicitly contains multiple possible traversals, but the retrieval system selects one.


**contestability**

Low. Retrieval results are presented as authoritative. No mechanism for users to contest entity extraction, relationship identification, or retrieval ranking. The graph structure is opaque to end users.


**forkability**

Technically forkable (open source). The incremental update mechanism is more fork-friendly than GraphRAG's static indexing — a forked instance could evolve independently with new data. However, no provenance tracking across instances. No merge capability.


**tendency_axis_position**

openness: code open, LLM dependency semi-closed | commons: tool is open, serves private use | spectacle: infrastructure | individual: organizational scale


**what_adai_should_adopt**

The dual-level retrieval concept as a model for A(DAI)'s multi-resolution sensing. Low-level = individual signal/practitioner queries. High-level = thematic/tendency analysis. The incremental update architecture — A(DAI) needs continuous sensing, not batch re-indexing. The graph + vector hybrid indexing that enables both structural traversal (follow typed edges) and semantic similarity (find related concepts by embedding proximity).


**what_adai_should_refuse**

The query-answer optimization. A(DAI) should not frame its output as answers to questions but as structural diagnoses of the field. Also refuse: the flat entity-relationship extraction. A(DAI) needs typed nodes and typed edges with domain-specific semantics (PRACTICES, CRITIQUES, INFLUENCES), not generic entity-relationship pairs. Also refuse: the single-graph-single-owner model. A(DAI) needs forkable, mergeable graphs.


#### Limitations, blind spots, and failure modes


**limits**

Depends on LLM quality for entity extraction — garbage in, garbage out. The dual-level distinction is intuitive but not formally defined — the boundary between 'low-level' and 'high-level' queries is determined by keyword heuristics. Evaluation is on benchmark datasets that may not reflect real-world complexity. Incremental updates may accumulate inconsistencies over time.


#### Governance models and consent architectures


**governance_model**

Academic open source. Maintained by HKUDS research group. Community contributions via GitHub. No governance of extracted knowledge or graph structure.


#### Material and operational conditions


**composability**

Highly composable. Python package, pip installable. Integrates with RAG-Anything and LangChain ecosystems. Graph and vector indices can be used independently. Library-level composability.


**liveness**

Actively maintained. Regular GitHub updates. Growing integration ecosystem (RAG-Anything). Published at EMNLP 2025. Active research community.


**scale_of_operation**

Organizational scale. Tested on Agriculture, CS, Legal, and Mix datasets. More efficient than GraphRAG, enabling deployment on larger corpora. Not yet proven at field-level continuous sensing.


**temporality**

Incremental. Supports adding new data over time, unlike GraphRAG's static index. However, no temporal reasoning about the data itself. The graph evolves but doesn't model the evolution.


**Uncertain fields:** who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### NodeRAG (2025)

**Brief:** Heterogeneous graph with 7 node types for richer retrieval. Outperforms GraphRAG on multi-hop reasoning.

**Garden Logic relevance:** A(DAI) has 17 node types. NodeRAG's heterogeneous graph architecture validates the design. The multi-hop reasoning is relevant to coherence prompts that trace connections across clusters.

#### Basic identification and classification

- **name**: NodeRAG (2025)
- **type**: neural-kg

**originator**

Tianyang Xu, Haojie Zheng, Chengze Li, Haoxiang Chen, Yixin Liu, Ruoxi Chen, Lichao Sun. Columbia University, University of Pennsylvania, Lehigh University.

- **year**: 2025 (arXiv:2504.11544, April 2025. First stable release v0.1.0, March 2025)
- **key_text**: NodeRAG: Structuring Graph-based RAG with Heterogeneous Nodes (Xu et al., 2025)
- **key_url**: https://arxiv.org/abs/2504.11544

#### Core ideas and theoretical positioning


**core_claim**

A heterogeneous graph structure with multiple distinct node types enables richer, more precise retrieval-augmented generation by fully flattening information into a nodalized structure that integrates graph indexing, text indexing, and vector indexing simultaneously.


**relation_to_attention_economy**

NodeRAG is an attention-allocation system — its entire design optimizes for surfacing the most relevant information in response to queries. The heterogeneous node types (document, entity, keyword, etc.) provide multiple entry points for attention, but the goal is still to answer questions (attention) rather than to diagnose structure (intention).


**relation_to_commons**

Open source (GitHub). Academic research project. Available via PyPI. Serves private knowledge management. Not designed for commons governance or collective knowledge.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Heterogeneous graph (heterograph) with 7 node types. Two-stage pipeline: (1) Graph indexing: decomposition (chunking, entity/relationship extraction), augmentation (keyword, community detection, high-level summaries), enrichment (embeddings, metadata). (2) Graph searching: entry node identification via keyword/vector matching, shallow Personalized PageRank (PPR) for multi-hop retrieval, irrelevant node pruning.


**data_model**

Heterograph with 7 node types: document nodes, entity nodes, relationship nodes, keyword nodes, community nodes, high-level summary nodes, and semantic unit nodes. Edges connect nodes across types. Triple indexing: graph index (structural traversal), text index (exact matching), vector index (embedding similarity). This achieves full nodalization — all information is represented as nodes, not just entities.


**temporal_logic**

None native. The heterograph is a static index of a corpus. No temporal reasoning. However, the richer node structure means temporal metadata could be attached to individual node types (e.g., date nodes, event nodes) — the architecture is more extensible than simpler graph models.


**absence_handling**

No explicit absence detection. However, the heterogeneous structure provides richer signals for gap identification than homogeneous graphs. If a community node has few entity nodes, or if keyword nodes are poorly connected to entity nodes, this reveals structural sparsity. The PPR-based retrieval naturally avoids sparse regions, which means gaps are not surfaced — they are navigated around.


**scalability_model**

Centralized. Single-corpus deployment. More efficient than GraphRAG and LightRAG in indexing time, query time, and storage. The heterograph structure enables more targeted retrieval (fewer tokens retrieved for equivalent performance).


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate + sensing-loop — The heterograph architecture operates at the substrate level (defining how information is structured), while the PPR-based retrieval operates as a sensing mechanism (finding relevant patterns in the graph).


**intention_vs_attention**

Attention, but with the richest structural foundation among RAG systems. NodeRAG's 7 node types provide a more nuanced view of information structure than GraphRAG's entity-relationship-community model or LightRAG's entity-relationship-theme model. A(DAI) has 17 node types — NodeRAG validates the design principle that heterogeneous typing enriches structural analysis. However, NodeRAG's heterogeneity serves retrieval precision (attention), not structural diagnosis (intention). The node types are chosen for retrieval utility, not for domain semantics. A(DAI)'s node types (practitioner, concept, scene, signal, etc.) are domain-semantic — they model the cultural field's actual structure.


**coherence_vs_consensus**

Consensus-oriented. Like GraphRAG and LightRAG, NodeRAG produces single answers to queries. The heterograph could theoretically support multiple traversals revealing different perspectives, but the PPR-based retrieval converges to a single retrieval set. No mechanism for holding contested interpretations.


**contestability**

Low. Same as other RAG systems — outputs are presented as authoritative retrievals. The heterograph's provenance (document nodes trace to source text) enables verification but not contestation. Users cannot challenge node typing or edge structure.


**forkability**

Technically forkable (open source, PyPI). The heterograph is more complex than simpler graph models, making forks harder to maintain. No federation, no merge, no provenance across instances.


**tendency_axis_position**

openness: open source, academic | commons: tool is open, serves private use | spectacle: infrastructure | individual: organizational scale


**what_adai_should_adopt**

The heterogeneous graph architecture as validation for A(DAI)'s 17-node-type design. NodeRAG proves that richer node typing improves structural analysis (even if the analysis is retrieval-oriented). The full nodalization principle — representing relationships, keywords, and communities as first-class nodes rather than just edge properties — enables richer graph algorithms. The triple indexing pattern (graph + text + vector) for A(DAI)'s hybrid query needs. The PPR-based multi-hop retrieval for coherence prompts that trace connections across clusters.


**what_adai_should_refuse**

The retrieval optimization as the primary design goal. A(DAI) should design its heterogeneous graph for structural diagnosis, not for answering questions. Also refuse: NodeRAG's generic node types (document, entity, keyword). A(DAI) needs domain-specific types (practitioner, concept, scene, tendency, signal). Also refuse: the pruning strategy that filters out 'irrelevant' nodes — in A(DAI), sparse or weakly-connected nodes may be the most important signals (frontier signals are by definition under-connected).


#### Limitations, blind spots, and failure modes


**limits**

Relatively new (v0.1.0 March 2025, paper April 2025). Not yet battle-tested at scale. The 7 node types are generic — domain-specific applications may need different types. The heterograph complexity increases maintenance burden. Depends on LLM quality for entity extraction. PPR-based retrieval may miss globally important but locally disconnected information.


#### Governance models and consent architectures


**governance_model**

Academic open source. Small research team at Columbia/Penn/Lehigh. GitHub-based development. No governance of extracted knowledge.


#### Material and operational conditions


**composability**

Moderately composable. Python package (pip). Triple indexing can potentially be used independently. However, the heterograph construction pipeline is tightly integrated. Library-level composability.


**liveness**

Early-stage active development. v0.1.0 released March 2025. Paper April 2025. Growing GitHub community. Academic research pace.


**scale_of_operation**

Research to organizational scale. Benchmarked on MuSiQue (46.29% accuracy) and HotpotQA (89.5%). Not yet proven at continuous field-level sensing.

- **temporality**: Snapshot-based. Static index of corpus. No incremental updates documented. No temporal reasoning.

**Uncertain fields:** who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### Knowledge Graph Embeddings (TransE, RotatE, ComplEx)

**Brief:** Vector representations of graph structure. Enable link prediction, gap detection, similarity computation.

**Garden Logic relevance:** Link prediction = structural absence detection. Could automate coherence prompts: 'these clusters should be connected based on embedding proximity but aren't.'

#### Basic identification and classification

- **name**: Knowledge Graph Embeddings (TransE, RotatE, ComplEx)
- **type**: neural-kg

**originator**

TransE: Antoine Bordes, Nicolas Usunier, Alberto Garcia-Duran, Jason Weston, Oksana Yakhnenko (2013). RotatE: Zhiqing Sun, Zhi-Hong Deng, Jian-Yun Nie, Jian Tang (2019). ComplEx: Theo Trouillon, Johannes Welbl, Sebastian Riedel, Eric Gaussier, Guillaume Bouchard (2016).

- **year**: TransE: 2013 (NeurIPS). ComplEx: 2016 (ICML). RotatE: 2019 (ICLR).

**key_text**

TransE: Translating Embeddings for Modeling Multi-relational Data (Bordes et al., NeurIPS 2013). RotatE: RotatE: Knowledge Graph Embedding by Relational Rotation in Complex Space (Sun et al., ICLR 2019). ComplEx: Complex Embeddings for Simple Link Prediction (Trouillon et al., ICML 2016).

- **key_url**: https://arxiv.org/abs/1301.4083

#### Core ideas and theoretical positioning


**core_claim**

Knowledge graphs can be embedded into continuous vector spaces where structural patterns (symmetry, asymmetry, inversion, composition) are captured by mathematical operations (translation, rotation, complex multiplication), enabling link prediction — inferring missing facts from existing structure.


**relation_to_attention_economy**

KG embeddings are infrastructure-level tools with no direct relationship to the attention economy. They are used in recommendation systems and search engines (which are attention-optimized), but the embeddings themselves are mathematically neutral. However, embedding-based recommendation systems do allocate attention — they surface related entities based on structural similarity.


**relation_to_commons**

Largely commons-oriented. Seminal papers are publicly available. Implementations are open source (PyTorch-based libraries like PyKEEN, LibKGE). Benchmark datasets (FB15k-237, WN18RR) are public. The research community operates on open publication norms.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Embedding models map entities and relations to vectors in continuous space. TransE: relations as translations (h + r ≈ t). RotatE: relations as rotations in complex space (h ∘ r ≈ t). ComplEx: Hermitian dot product in complex space for scoring triples. All trained by minimizing a loss function that distinguishes true triples from corrupted (negative) triples.


**data_model**

Triples (head, relation, tail). Each entity and relation is a vector (or complex vector). The embedding space encodes structural patterns: TransE captures asymmetry and composition but not symmetry or 1-to-N relations. RotatE captures symmetry, asymmetry, inversion, and composition. ComplEx handles symmetric and antisymmetric relations via complex-valued embeddings.


**temporal_logic**

None in base models. Extensions exist (TTransE, TA-DistMult, DE-SimplE) that add temporal dimensions to embeddings, but these are research extensions, not standard practice. The core models operate on static graph snapshots.


**absence_handling**

This is the key capability. Link prediction IS absence detection — the model scores unobserved triples and ranks them by plausibility. High-scoring unobserved triples represent structural absences: facts the graph implicitly contains but hasn't formalized. Embedding proximity between unconnected entities suggests they should be connected. This is exactly the kind of structural diagnosis A(DAI) needs for coherence prompts.


**scalability_model**

Centralized training, distributed inference. Training requires full graph access. Once trained, embeddings can be used for fast inference (scoring individual triples or finding nearest neighbors). Scales to millions of entities and billions of triples with appropriate hardware. Models like NodePiece and CompGCN address scalability for very large graphs.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

sensing-loop + prompt-generation — Link prediction operates at the sensing level (detecting structural gaps). The identification of high-scoring unobserved triples generates diagnostic prompts ('these entities should be connected based on embedding proximity but aren't — why?').


**intention_vs_attention**

Intention-native in a limited sense. Link prediction is structural diagnosis — it identifies what the graph should contain based on its existing structure. This is closer to A(DAI)'s intention model than any RAG system. However, KG embeddings diagnose factual gaps (missing triples), not interpretive gaps (what the field doesn't yet understand). A(DAI) needs both: factual absence detection ('this practitioner has no INFLUENCES edges') AND interpretive absence detection ('the field lacks vocabulary for this emerging tendency'). KG embeddings handle the first; they cannot handle the second.


**coherence_vs_consensus**

Structurally coherence-compatible. Embeddings encode multiple latent dimensions simultaneously — an entity's position in embedding space reflects all its relationships at once. Different regions of the space can represent different structural contexts. However, the link prediction output is a ranked list (consensus on what's most likely missing), not a set of alternative readings (coherence). The technology could be used for coherence analysis (clustering embedding space to find structurally similar but disconnected communities) but isn't designed for it.


**contestability**

Low for outputs, high for methodology. The link prediction rankings are presented as probabilistic but not contestable by end users. However, different embedding models (TransE vs. RotatE vs. ComplEx) produce different predictions, making the methodology itself a source of productive disagreement. A(DAI) could run multiple models and present the divergences as diagnostic information.


**forkability**

High. Open-source implementations. Standard training procedures. A fork of A(DAI)'s graph could train its own embeddings and produce different link predictions. Provenance (which model, which training data) is straightforward to track.


**tendency_axis_position**

openness: fully open (research, code, benchmarks) | commons: academic commons | spectacle: invisible infrastructure | individual: research to institutional scale


**what_adai_should_adopt**

Link prediction as the primary computational mechanism for coherence prompts. 'These clusters should be connected based on embedding proximity but aren't' is exactly the kind of structural diagnosis A(DAI) needs. Embedding-based gap detection for the survey cycle — identify practitioners, concepts, or scenes that are structurally isolated when they should be connected. Entity similarity via embedding proximity for the sensing loop — 'this new signal is closest to these existing nodes, suggesting it belongs in this cluster.' RotatE's ability to model asymmetric relations (influences is directional, as is critiques) is essential for A(DAI)'s typed edges.


**what_adai_should_refuse**

The assumption that embedding proximity equals meaningful relatedness. Embeddings learn statistical regularities, not cultural meaning. Two practitioners may be close in embedding space because they are frequently co-mentioned, not because they share meaningful artistic connections. A(DAI) must layer cultural judgment over embedding-based suggestions. Also refuse: the single-model approach. Different embedding models reveal different aspects of graph structure. A(DAI) should use multiple models and treat their disagreements as diagnostic. Also refuse: the triple-only data model. A(DAI)'s richer data model (typed nodes, typed edges, temporal metadata) requires embedding approaches that can handle heterogeneous graphs (e.g., R-GCN, CompGCN).


#### Limitations, blind spots, and failure modes


**limits**

TransE cannot model symmetric relations or 1-to-N mappings. All models are sensitive to training hyperparameters and negative sampling strategy. Performance depends heavily on KG structure — recent research (December 2024 survey) shows that KG structure can be a significant source of bias. Embeddings capture statistical regularity, not causal or meaningful structure. Evaluation relies on synthetic link prediction benchmarks that may not reflect real-world utility. Adding ontological relations can actually decrease performance.


#### Governance models and consent architectures


**governance_model**

Academic open research. No central governance. Multiple competing models and implementations. Benchmark-driven evaluation (leaderboards). Individual research groups maintain their implementations.


#### Material and operational conditions


**composability**

Highly composable. Multiple open-source libraries (PyKEEN, LibKGE, DGL-KE). Standard APIs. Can be integrated into any graph processing pipeline. Library-level composability.


**liveness**

Mature and active. Foundational models (TransE, ComplEx, RotatE) are well-established. Active research in 2024-2025 on hybrid models (TH-RotatE, TP-RotatE), negative sampling (Ne_AnKGE), and structural analysis. Multiple surveys published in 2024.


**scale_of_operation**

Research to field-level. Trained on benchmarks with thousands to millions of entities. Deployed in production systems (Google Knowledge Graph, Wikidata tools). Scalable to very large graphs with appropriate infrastructure.


**temporality**

Static by default. Temporal extensions exist but are not mainstream. Each training run captures a snapshot of graph structure. No cyclical, anticipatory, or tidal temporal logic. Re-training is needed to incorporate graph changes.


**Uncertain fields:** epistemological_stance, structural_tension, who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### Think-on-Graph / KAPING / KG-augmented LLM reasoning

**Brief:** Systems that give LLMs graph-walking capabilities. Reasoning chains follow edges.

**Garden Logic relevance:** The Ralph pattern (one Claude call per prompt, graph context injected) is a simpler version of this. These systems show what happens when the LLM can traverse the graph during reasoning.

#### Basic identification and classification

- **name**: Think-on-Graph / KAPING / KG-augmented LLM reasoning
- **type**: neural-kg

**originator**

Think-on-Graph (ToG): Jiashuo Sun, Chengjin Xu, Lumingyuan Tang, Saizhuo Wang, Chen Lin, Yeyun Gong, Lionel M. Ni, Heung-Yeung Shum, Jian Guo (ICLR 2024). KAPING: Baek et al. (2023). Graph-Constrained Reasoning (GCR): ICML 2025 authors. Paths-over-Graph: ACM Web Conference 2025.

- **year**: KAPING: 2023. Think-on-Graph: 2023 (arXiv), ICLR 2024. ToG 2.0: 2024. GCR: ICML 2025.

**key_text**

Think-on-Graph: Deep and Responsible Reasoning of Large Language Model on Knowledge Graph (Sun et al., ICLR 2024)

- **key_url**: https://arxiv.org/abs/2307.07697

#### Core ideas and theoretical positioning


**core_claim**

LLMs can be given graph-walking capabilities, enabling them to reason by iteratively exploring knowledge graph structures — following edges, evaluating candidate paths, and producing answers grounded in explicit graph traversal rather than parametric memory alone.


**relation_to_attention_economy**

These systems reduce hallucination — a key failure mode of attention-economy LLMs. By grounding reasoning in explicit graph structure, they trade speed and fluency for accuracy and traceability. This is a corrective to the attention economy's preference for confident, fast responses over verifiable, structured ones.


**relation_to_commons**

Mixed. Think-on-Graph is open source (GitHub). GCR is published research. However, the systems depend on both public knowledge graphs (Wikidata, Freebase) and proprietary LLMs (GPT-4, GPT-3.5). The commons provides the knowledge; the corporation provides the reasoning.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

LLM-as-agent on KG. The LLM iteratively: (1) identifies relevant entities in the query, (2) explores neighboring nodes and edges in the KG, (3) evaluates candidate reasoning paths using beam search, (4) selects the most promising path, (5) generates an answer grounded in the traversed subgraph. Think-on-Graph uses beam search. GCR uses KG-Trie constrained decoding. KAPING uses zero-shot prompting with KG-retrieved facts.


**data_model**

Existing knowledge graphs (Wikidata, Freebase, domain-specific KGs) provide the structured data. The LLM operates on subgraphs — local neighborhoods of query-relevant entities. Reasoning paths are sequences of (entity, relation, entity) triples. The LLM's role is to select and evaluate paths, not to create structure.


**temporal_logic**

None. The systems reason over static KG snapshots. The LLM's temporal knowledge (from training data) may be invoked informally, but graph traversal is atemporal. No temporal reasoning about how graph structure changes.


**absence_handling**

Indirect. When the LLM's beam search finds no promising paths from a query entity, this indicates a structural gap in the KG. ToG 2.0's hybrid approach (combining KG and document retrieval) partially addresses this — when the graph is sparse, it falls back to document retrieval. This fallback pattern is an implicit absence detection: 'the graph doesn't contain what we need, so we look elsewhere.'


**scalability_model**

Centralized. Requires access to both a KG and an LLM. Each query involves multiple LLM calls (one per beam search step), making it expensive. Scales with the size of the KG but limited by LLM cost per query. Not designed for batch processing or continuous sensing.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

prompt-generation — KG-augmented LLM reasoning maps directly to A(DAI)'s prompt generation layer, where structural analysis (graph context) is injected into LLM reasoning to produce coherence prompts and diagnostic outputs.


**intention_vs_attention**

Attention-oriented with intention-enabling mechanisms. The systems answer questions (attention) but do so by traversing graph structure (which reveals structural properties). The key insight for A(DAI) is that graph-walking reasoning naturally encounters structural features — dense clusters, isolated nodes, missing paths — that are invisible to parametric LLM reasoning. If the walking is oriented toward diagnosis rather than answering, it becomes an intention tool. A(DAI)'s 'Ralph pattern' (one Claude call per prompt, graph context injected) is a simpler version of Think-on-Graph's iterative approach. The question is whether A(DAI) needs the full iterative beam search or whether single-prompt graph-context injection is sufficient.


**coherence_vs_consensus**

Consensus-oriented in output (single answer per query) but coherence-compatible in process. Different beam search paths represent different readings of the graph. ToG uses beam search width to explore multiple paths simultaneously, then selects the best. A(DAI) could use the same mechanism but present the multiple paths as alternative readings rather than selecting a winner — this would be coherence via beam search.


**contestability**

Moderate. The reasoning chain is explicit and traceable — each step can be verified against the KG. This is more contestable than parametric LLM reasoning. However, the LLM's path evaluation is opaque — why it chose one path over another is not fully explainable. Think-on-Graph explicitly claims 'knowledge traceability and correctability by leveraging LLM reasoning and expert feedback.'


**forkability**

High for the approach, moderate for implementations. The general pattern (LLM + KG traversal) can be implemented with any LLM and any KG. However, specific implementations are tuned to specific KGs. A fork of A(DAI) could run Think-on-Graph-style reasoning on its own graph.


**tendency_axis_position**

openness: research open, LLM dependency semi-closed | commons: public KGs as commons, proprietary LLMs as infrastructure | spectacle: infrastructure (invisible reasoning) | individual: query-level interaction, organizational deployment


**what_adai_should_adopt**

The graph-context injection pattern for coherence prompts. Instead of A(DAI)'s current 'one Claude call per prompt, fresh context' approach, consider iterative graph walking where the LLM follows edges to discover unexpected connections. The beam search as a mechanism for generating multiple structural readings — run beam search from a query concept, present the top-K paths as alternative interpretations. The KG-Trie constrained decoding (GCR) as a way to ensure LLM outputs are grounded in actual graph structure. ToG's small-LLM-plus-KG performance matching GPT-4 — A(DAI) may not need the most powerful LLM if it has a good graph.


**what_adai_should_refuse**

The single-query-single-answer paradigm. A(DAI) should not answer questions but generate diagnostic prompts. The static KG assumption — A(DAI)'s graph is constantly evolving as signals arrive; the reasoning system must handle graph volatility. The expensive multi-step LLM calls per query — at scale, A(DAI) needs efficient sensing, not expensive per-query reasoning. The 'LLM as judge' pattern where the LLM evaluates which path is 'best' — A(DAI) should present multiple paths to human judgment rather than having the LLM decide.


#### Limitations, blind spots, and failure modes


**limits**

High computational cost (multiple LLM calls per query). Dependent on KG quality — reasoning on a sparse or incorrect graph produces bad results. Beam search can miss optimal paths. The LLM's path evaluation is not fully reliable — it may prefer plausible-sounding but structurally unsupported paths. Not tested on domain-specific KGs at scale. The gap between academic benchmarks and real-world deployment is significant.


#### Governance models and consent architectures


**governance_model**

Academic open research. Individual research groups maintain implementations. No governance of the reasoning process or outputs. The KGs used (Wikidata, Freebase) have their own governance.


#### Material and operational conditions


**composability**

Moderately composable. Think-on-Graph is open source. The pattern is general enough to be implemented with various LLMs and KGs. However, the tight coupling between LLM prompting and KG structure makes it harder to swap components than simpler architectures.


**liveness**

Active research area. ToG at ICLR 2024. GCR at ICML 2025. Paths-over-Graph at ACM Web Conference 2025. Growing rapidly with new papers every few months. Individual implementations may have limited maintenance lifecycles.


**scale_of_operation**

Research to organizational scale. Tested on benchmark datasets (WebQSP, ComplexWebQuestions, QALD, CWQ). Not yet deployed at field-level continuous reasoning. Per-query cost limits large-scale deployment.


**temporality**

Snapshot-based. Reasons over static KG at query time. No temporal reasoning about graph evolution. The LLM may invoke temporal knowledge from training data, but this is parametric, not structural.


**Uncertain fields:** epistemological_stance, who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### Neo4j + Vector Search / hybrid graph-vector stores

**Brief:** Graph databases with native embedding support. Combines symbolic structure with neural similarity.

**Garden Logic relevance:** Infrastructure option for the substrate layer. The CR-SQLite choice prioritizes forkability over query power. Neo4j prioritizes query power over forkability. This is the core tension.

#### Basic identification and classification

- **name**: Neo4j + Vector Search / hybrid graph-vector stores
- **type**: neural-kg

**originator**

Neo4j Inc. Founded by Emil Eifrem, Johan Svensson, Peter Neubauer (2007). Vector search integration developed 2023-2024. Competing approaches: TigerVector (TigerGraph), Amazon Neptune, ArangoDB, NebulaGraph.


**year**

Neo4j: 2007 (founding), 2024-2025 (native vector index via HNSW). Hybrid graph-vector architecture: 2023-present as a field-wide trend.


**key_text**

Neo4j Vector Index documentation. Also: TigerVector: Supporting Vector Search in Graph Databases for Advanced RAGs (arXiv, January 2025).

- **key_url**: https://neo4j.com/developer/genai-ecosystem/vector-search/

#### Core ideas and theoretical positioning


**core_claim**

Combining graph databases (symbolic structure, relationship traversal, pattern matching) with vector search (semantic similarity, embedding-based retrieval) creates a hybrid store that enables both reasoning over explicit structure and discovery via semantic proximity.


**relation_to_attention_economy**

Neo4j + vector search serves the AI/RAG pipeline — it is infrastructure for LLM-based applications that allocate attention. The hybrid approach enables more 'intelligent' attention allocation (considering both structure and semantics), but the system itself is neutral infrastructure.


**relation_to_commons**

Neo4j Community Edition is open source (GPLv3). Enterprise features are proprietary. The Cypher query language is open-standardized (GQL/ISO). However, the ecosystem is commercially driven — Neo4j Inc. is a venture-backed company. The hybrid graph-vector pattern is not proprietary, but Neo4j's implementation is commercially maintained.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Graph database with native vector index. Graph layer: labeled property graph (nodes, relationships, properties). Vector layer: HNSW (Hierarchical Navigatable Small World) index on node/relationship embedding properties. Query language: Cypher with vector search functions. Enables hybrid queries: 'find nodes similar to X AND connected to Y.'


**data_model**

Labeled Property Graph (LPG). Nodes have labels (types) and properties. Relationships have types and properties. Embeddings stored as node/relationship properties (float arrays). No formal ontology — schema is implicit in the data. This is more flexible than RDF triples but less formally constrained.


**temporal_logic**

Graph databases support temporal modeling (nodes/relationships with timestamp properties, temporal indexes). Neo4j supports bi-temporal patterns (valid time + transaction time). However, temporal logic is not native — it must be modeled by the application. No built-in temporal reasoning, cyclical analysis, or anticipatory logic.


**absence_handling**

Graph pattern matching can detect structural absence (MATCH patterns that return no results indicate missing connections). Combined with vector similarity, the hybrid approach can find 'nodes that should be connected based on embedding proximity but aren't' — a direct implementation of absence detection via structural + semantic gap analysis.


**scalability_model**

Centralized server with clustering (Neo4j Enterprise). Scales to billions of nodes and relationships with sharding. Vector index scales with node count. Not designed for federation or forking — single-instance or clustered deployment. The TigerVector paper (2025) shows 3.77x better throughput than Neo4j for vector-heavy workloads.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate — Neo4j + vector search is infrastructure. It defines how data is stored, indexed, and queried. It is not a sensing, diagnostic, or participation layer, but it enables all of them.


**intention_vs_attention**

Infrastructure that can serve either. The hybrid query capability (structural pattern matching + vector similarity) enables both attention-type queries ('find me related entities') and intention-type queries ('find structurally isolated entities with high embedding similarity to connected clusters'). The technology is intention-capable if the queries are designed for structural diagnosis. However, the dominant use case (RAG pipelines) is attention-oriented.


**coherence_vs_consensus**

Structurally neutral. Neo4j can represent both consensus (single canonical graph) and coherence (multiple labeled subgraphs representing different readings). The labeled property graph model supports multiple relationship types between the same nodes, enabling contested edges. However, the database does not enforce or support coherence — it is a storage and query engine, not a knowledge governance system.


**contestability**

Technically supported but not designed for it. Any node or relationship can be queried, modified, or deleted. Provenance can be stored as properties. However, there is no built-in mechanism for recording dissent, tracking contested claims, or managing parallel interpretations. Contestability must be built at the application layer.


**forkability**

Low. Neo4j is a centralized database server. Forking a Neo4j instance means copying the entire database — there is no native fork/merge mechanism. The labeled property graph model doesn't support CRDTs or conflict-free replication. This is the core tension with A(DAI)'s CR-SQLite architecture: Neo4j prioritizes query power; CR-SQLite prioritizes forkability.


**tendency_axis_position**

openness: Community Edition open source, Enterprise proprietary | commons: commercial product with open-source core | spectacle: infrastructure (invisible) | individual: organizational to field-level deployment


**what_adai_should_adopt**

The hybrid structural + semantic query pattern. A(DAI) needs to query both by graph structure ('find all practitioners connected to this concept via PRACTICES edges') and by semantic similarity ('find practitioners whose embedding is close to this signal'). The ability to store embeddings as node properties alongside symbolic data. The Cypher query language's expressive power for graph pattern matching. The HNSW index for efficient approximate nearest neighbor search.


**what_adai_should_refuse**

The centralized server model. A(DAI)'s forkability requirement means practitioners must be able to take their subgraph, modify it, and potentially merge it back. Neo4j cannot do this. The CR-SQLite choice is correct for A(DAI) even though it sacrifices Neo4j's query power. Also refuse: the absence of formal schema. A(DAI) needs typed nodes and typed edges with semantic constraints — Neo4j's implicit schema is too loose. Also refuse: the commercial dependency. A(DAI) is a commons; building on a venture-backed company's database creates capture risk.


#### Limitations, blind spots, and failure modes


**limits**

Centralized architecture limits forkability and sovereignty. Commercial dependency (Neo4j Inc.) creates business risk for commons projects. Vector search via HNSW is approximate (not exact). Neo4j's labeled property graph lacks formal ontological support — schema must be enforced at the application layer. TigerVector benchmark (2025) shows performance limitations relative to purpose-built vector databases. GQL standardization is incomplete.


#### Governance models and consent architectures


**governance_model**

Commercial open-core. Neo4j Inc. controls development. Community Edition is open source (GPLv3). Enterprise Edition is proprietary. Cypher is being standardized as GQL via ISO. Governance of data stored in Neo4j is entirely the user's responsibility.


#### Material and operational conditions


**composability**

Highly composable. Native integrations with LangChain, LlamaIndex, and other AI frameworks. REST API, Bolt protocol, and language-specific drivers. Cypher query language. Plugin architecture for custom procedures. API-first composability.


**liveness**

Very active. Major investment from Neo4j Inc. Regular releases. Growing AI/vector capabilities. Cloud service (AuraDB). GQL standardization in progress. Strong commercial and community ecosystem.


**scale_of_operation**

Organizational to field-level. Deployed in production at banks, telecoms, and tech companies. Billions of nodes supported. However, most deployments are organizational — field-level commons deployment is not the primary use case.


**temporality**

Application-dependent. Neo4j can model temporal data (timestamp properties, temporal indexes) but does not natively reason about time. Bi-temporal patterns must be explicitly designed. No cyclical, anticipatory, or tidal temporal logic. Historical queries require versioned data modeling.


**Uncertain fields:** who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### Multimodal Knowledge Graphs

**Brief:** KGs that incorporate images, audio, video as node properties alongside text. MMKG, VisualSem.

**Garden Logic relevance:** A(DAI) indexes artworks as nodes. The substrate stores multimodal embeddings (Design Brief section 06). This literature covers the technical challenges.

#### Basic identification and classification

- **name**: Multimodal Knowledge Graphs
- **type**: neural-kg

**originator**

Multiple research groups. MMKG: Haotian Liu et al. (2019). VisualSem: Houda Alberts et al. (2021). TIVA-KG: Tsinghua University (Xin Wang et al., 2023). VAT-KG: 2025 (arXiv:2506.21556). NativE: SIGIR 2024. Survey: zjukg group (Zhejiang University).


**year**

MMKG: 2019. VisualSem: 2021. TIVA-KG: 2023 (ACM Multimedia). VAT-KG: 2025. NativE: 2024 (SIGIR). Field survey: 2024.


**key_text**

Knowledge Graphs Meet Multi-Modal Learning: A Comprehensive Survey (zjukg, 2024). TIVA-KG: A Multimodal Knowledge Graph with Text, Image, Video and Audio (Wang et al., ACM MM 2023).

- **key_url**: https://github.com/zjukg/KG-MM-Survey

#### Core ideas and theoretical positioning


**core_claim**

Knowledge graphs that incorporate images, audio, video, and other modalities alongside text as first-class node properties enable richer entity representation, cross-modal reasoning, and grounding of abstract knowledge in perceptual data.


**relation_to_commons**

Research outputs are largely commons-oriented (open papers, open code). However, multimodal data has much higher storage and compute costs than text, creating practical barriers to commons participation. Large multimodal KGs require institutional resources. The media itself may have copyright constraints that limit commons distribution.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

KGs with multimodal node properties. Two main approaches: (1) KG4MM — use existing KGs to guide multimodal learning (e.g., visual question answering, image captioning). (2) MM4KG — enrich KGs with multimodal data (images, video, audio as node properties or linked media). Entity nodes carry text descriptions AND media references. Embeddings can be unimodal or cross-modal.


**data_model**

Entities with multimodal properties. Traditional KG triples (head, relation, tail) augmented with media attachments. VisualSem connects WordNet concepts to ImageNet images. TIVA-KG uses typed edges (ImageOf, VideoOf, AudioOf) to link media nodes to entity nodes. VAT-KG aligns video, audio, and text at the triplet level. NativE (SIGIR 2024) proposes fusion-based multimodal entity representations.


**temporal_logic**

Video and audio introduce implicit temporal structure (they unfold over time), but this is not formally modeled in most MMKGs. VAT-KG addresses spatial and temporal features of audio/video, but temporal reasoning across the graph is not a standard feature. No cyclical or anticipatory temporal logic.


**absence_handling**

Limited. Multimodal KG completion (predicting missing triples given multimodal evidence) is an active research area (NativE, SIGIR 2024). Cross-modal absence detection is possible: 'this entity has text and image but no audio' or 'this entity's image embedding is far from its text embedding, suggesting inconsistency.' However, these are research capabilities, not production features.


**scalability_model**

Centralized with significant storage requirements. Images take far more storage than text. Video and audio multiply this further. Hosting and querying large MMKGs requires institutional infrastructure. Storage-constrained environments cannot participate. No federation or distribution standards for multimodal data.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate + sensing-loop — MMKGs provide the data infrastructure for storing multimodal representations of artworks and practitioners (substrate). Cross-modal embeddings enable sensing that operates on perceptual similarity as well as symbolic structure.


**intention_vs_attention**

Both, depending on application. Multimodal data enables richer structural diagnosis (intention — 'these artworks share visual qualities that suggest an unnamed tendency') AND richer engagement (attention — 'here is what this art looks like'). For A(DAI), the intention use is primary: multimodal embeddings enable sensing that text alone cannot. Visual similarity between artworks may reveal connections that textual descriptions miss. Audio recordings of artist talks may carry signal that transcripts lose. However, A(DAI) must be careful that multimodal richness doesn't become an engagement feature ('look at this beautiful graph visualization') at the expense of structural diagnosis.


**coherence_vs_consensus**

Coherence-compatible. Different modalities can provide conflicting evidence about the same entity — an artwork's visual style may suggest one movement, while its textual description claims another. MMKGs can hold both readings without resolving them. This multi-modal contestation is a natural form of coherence. However, most MMKG research focuses on aligning modalities (consensus), not on preserving productive disagreement between them.


**contestability**

Low in current implementations. MMKG research focuses on completion and alignment, not on contestation. However, cross-modal disagreement is inherently contestable — when visual and textual evidence conflict, the system could surface this as a diagnostic prompt rather than resolving it.


**forkability**

Very low practically. Multimodal data is large, making full forks expensive. Media files may have copyright restrictions. No standards for distributing multimodal KGs across sovereign instances. A fork of a 10-million-image MMKG is an infrastructure challenge, not just a data challenge.


**tendency_axis_position**

openness: research open, data partially restricted (copyright) | commons: academic commons, media rights complicate sharing | spectacle: can serve spectacle (visual engagement) or infrastructure | individual: institutional scale (resource requirements)


**what_adai_should_adopt**

The Matryoshka multimodal embedding approach (referenced in the Design Brief section 06) for semantic positioning of artworks. Cross-modal embedding similarity as a sensing mechanism — detecting visual/audio/textual similarities that reveal structural connections not captured by typed edges alone. The TIVA-KG typed-edge pattern (ImageOf, VideoOf, AudioOf) for linking media to entity nodes. The concept of cross-modal inconsistency as a diagnostic signal — when visual and textual descriptions disagree, that disagreement is information.


**what_adai_should_refuse**

The large-scale centralized storage model. A(DAI)'s CR-SQLite architecture cannot host millions of media files. Instead, store embedding vectors locally and reference media via URIs. The alignment-as-resolution assumption — when modalities disagree, A(DAI) should surface the disagreement, not resolve it. The engagement potential of visual richness — A(DAI) must resist turning the graph into a gallery and keep multimodal data as structural evidence, not as spectacle.


#### Limitations, blind spots, and failure modes


**limits**

Storage and compute costs are much higher than text-only KGs. Media quality varies — outdated or irrelevant images confuse models. Missing media requires fallback strategies. Cross-modal alignment is research-grade, not production-ready. Evaluation benchmarks are limited. Copyright constraints limit data sharing. Most MMKGs are English-centric and Western-art-centric in their visual data.


#### Governance models and consent architectures


**governance_model**

Academic research governance. Individual projects managed by research groups. No field-level governance of MMKG standards or practices. Media rights governance is fragmented and varies by jurisdiction.


#### Material and operational conditions


**composability**

Low to moderate. MMKG data formats are not standardized. Each system uses its own media storage and embedding approach. Interoperability between MMKGs is limited. Cross-modal embeddings can be composed with vector search infrastructure. However, raw media is not easily composable across systems.


**liveness**

Active research area. Multiple papers at top venues (SIGIR 2024, AAAI 2025, CVPR 2025, ACM MM 2023). Growing survey literature. VAT-KG (2025) extends to video/audio. However, production-ready MMKG systems are rare — most work is research-grade.


**scale_of_operation**

Research to institutional scale. VisualSem and MMKG are mid-scale (millions of images). TIVA-KG and VAT-KG are research benchmarks. No planetary-scale MMKG exists. The storage costs of multimodal data limit scale.


**temporality**

Video and audio introduce temporal data intrinsically (they have duration, sequence). However, temporal reasoning across the graph is not modeled. No support for tracking how media representations of artworks change over time (restoration, degradation, re-interpretation). No cyclical or anticipatory temporal logic.


**Uncertain fields:** epistemological_stance, relation_to_attention_economy, structural_tension, who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### Graphiti / Zep (2025)

**Brief:** Temporal KG engine with bi-temporal model (event time vs ingestion time), episodic/semantic/community subgraphs. 300ms retrieval.

**Garden Logic relevance:** The bi-temporal model directly addresses A(DAI)'s tidal sensing. Event time = when a signal happened. Ingestion time = when the commons noticed. The gap between them is an intention metric.

#### Basic identification and classification

- **name**: Graphiti / Zep (2025)
- **type**: neural-kg

**originator**

Preston Rasmussen and team at Zep (getzep.com). Graphiti is the open-source engine; Zep is the enterprise product.

- **year**: 2025 (paper: January 2025, arXiv:2501.13956). Graphiti open-sourced in 2024.

**key_text**

Rasmussen, P. et al. (2025) 'Zep: A Temporal Knowledge Graph Architecture for Agent Memory', arXiv:2501.13956. Presented at KGC 2025.

- **key_url**: https://github.com/getzep/graphiti

#### Core ideas and theoretical positioning


**core_claim**

Agent memory requires a temporally-aware knowledge graph that dynamically synthesises unstructured conversational data and structured business data while maintaining historical relationships — not a static RAG store but a living, bi-temporal graph that tracks both when facts occurred and when they were observed.


**relation_to_attention_economy**

Graphiti/Zep is built for AI agent contexts where memory must be persistent, accurate, and temporally precise — the opposite of attention-driven retrieval that surfaces recent or popular content. The framework optimises for factual accuracy and temporal coherence, not engagement. However, as enterprise AI infrastructure, it operates within market dynamics that are attention-adjacent.


**relation_to_commons**

Graphiti is open-source (Apache 2.0), which aligns with commons principles at the code level. However, Zep as an enterprise product adds a proprietary layer. The knowledge graphs Graphiti builds are owned by the deploying organisation, not collectively governed. The relationship to commons is through open infrastructure, not through collective data governance.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Temporal knowledge graph with three-tier hierarchical subgraph structure: episodic (raw observations), semantic entity (extracted entities and relations), and community (clustered entity groups). Neo4j as graph store. LLM for semantic extraction and contradiction detection. Hybrid retrieval (cosine similarity + BM25 + graph traversal). Edge invalidation for temporal fact management.


**data_model**

G = (N, E, phi) where N = nodes, E = edges, phi = formal incidence function. Three subgraph tiers: (1) Episodic nodes with timestamps, preserving raw input as ground truth. (2) Semantic entity nodes with 1024-dimensional embeddings, connected by typed edges that can carry temporal validity windows. (3) Community nodes from label propagation clustering. Edges have both event time (T) and ingestion time (T') — the bi-temporal model.


**temporal_logic**

Bi-temporal: event time (when a fact actually occurred) and ingestion time (when the system observed it). This enables retroactive correction, temporal reasoning, and distinguishing between 'what was true' and 'what we knew'. Edge invalidation preserves history — old facts are invalidated, not deleted. This is the most sophisticated temporal model in this research set.


**absence_handling**

Edge invalidation creates a structured representation of what is no longer true — superseded facts remain in the graph as invalidated edges. The system can distinguish between 'never observed' and 'observed and invalidated'. Community detection identifies clusters of related entities, and gaps between communities could be interpreted as structural absences. However, absence as diagnostic information (detecting what is missing) is not explicitly supported — the focus is on temporal accuracy, not gap detection.


**scalability_model**

Centralised (Neo4j) with enterprise scaling. P95 retrieval latency of 300ms. Designed for individual agent deployments, not federated or distributed graphs. Zep Cloud provides managed infrastructure.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate + sensing-loop. The bi-temporal graph model maps directly to A(DAI)'s substrate (how the knowledge graph is mechanically structured) and to the sensing loop (the episodic subgraph is a continuous intake of observations, processed into semantic entities through tidal-like extraction cycles).


**intention_vs_attention**

Graphiti's design is intention-aligned at the mechanical level: it prioritises temporal accuracy and factual consistency over recency or popularity. The edge invalidation model ensures that outdated information is not surfaced just because it was recently ingested — the system tracks truth, not freshness-for-engagement. However, Graphiti is designed for AI agents, not for collective sensemaking. It generates accurate memory, not structural diagnosis. A(DAI) needs to extend Graphiti's temporal accuracy into diagnostic intention: not just 'what is true now' but 'what structural gap does this reveal?'


**coherence_vs_consensus**

Coherence through temporal consistency. The bi-temporal model maintains coherent graph state across time without requiring consensus — different observations may contradict each other, and the system resolves these through temporal ordering and LLM-based contradiction detection, not through voting or agreement. This is mechanically aligned with A(DAI)'s coherence principle, though at a simpler level (factual coherence vs. interpretive coherence).


**contestability**

Limited. Graphiti resolves contradictions by prioritising newer information — 'new information wins' is the default resolution strategy. This is pragmatic for agent memory but anti-contestable: it means the most recent observation overrides earlier ones without preserving the disagreement. A(DAI) needs a model where contradictions can coexist as legitimate competing readings.


**forkability**

Not designed for forking. Graphiti maintains a single graph with temporal layers, not forkable replicas. Multiple agents can read from the same graph, but there is no mechanism for sovereign forks or community-specific views. This is a significant limitation for A(DAI)'s commons architecture.


**tendency_axis_position**

openness: open-source core (Graphiti) with proprietary enterprise layer (Zep). commons: open infrastructure, private data. spectacle vs infrastructure: pure infrastructure. individual vs distributed: designed for individual agent deployments, not distributed commons.


**what_adai_should_adopt**

The bi-temporal model is the single most important technical adoption from this entire research set. A(DAI) must track event time (when something happened in the cultural field) separately from ingestion time (when A(DAI) observed it). This directly enables the tidal sensing rhythm: the 6h/24h/72h cycles are ingestion-time operations, while event-time preserves the actual temporal structure of cultural developments. The three-tier subgraph structure (episodic, semantic, community) maps naturally to A(DAI)'s pipeline: raw signals (episodic) are processed into structured intelligence (semantic) and clustered into scenes/movements (community). The edge invalidation pattern: when cultural facts change (a scene dissolves, a practitioner changes practice), the old edges should be invalidated, not deleted, preserving the full temporal record.


**what_adai_should_refuse**

The 'new information wins' contradiction resolution. In cultural intelligence, newer is not necessarily truer — an older, well-established reading of a cultural tendency may be more accurate than a recent hot take. A(DAI) needs contested edges where multiple readings coexist with different temporal validity windows, not automatic priority for the newest observation. Refuse the single-agent design — Graphiti is built for one agent's memory, but A(DAI) is a collective intelligence system where multiple communities contribute observations that may legitimately conflict. Refuse the enterprise scaling model — Neo4j Cloud is vendor-dependent infrastructure.


#### Limitations, blind spots, and failure modes


**limits**

Graphiti is designed for agent memory, not for collective intelligence or cultural sensemaking. The LLM-based extraction is expensive (each episode requires multiple LLM calls). The system assumes a single source of truth that evolves over time, which does not accommodate legitimate disagreements. Neo4j dependency creates vendor lock-in. Community detection via label propagation may not capture culturally meaningful groupings.


#### Governance models and consent architectures


**governance_model**

Open-core commercial. Graphiti is open-source under Apache 2.0; Zep is commercial with enterprise governance. The graph data within any deployment is owned by the deploying organisation. No collective or commons governance of the knowledge base itself.


#### Material and operational conditions


**composability**

Library-level composability. Graphiti is a Python SDK that can be embedded in applications. Integrates with Neo4j, various LLMs, and custom data sources. Open-source core enables modification and extension. API-first design allows integration with other systems.


**liveness**

Actively developed. Paper published January 2025, regular GitHub releases, presented at KGC 2025. The project is well-funded through Zep's commercial operations. Active open-source community.


**scale_of_operation**

Individual agent to small-team scale. Designed for single-agent or small-team deployments, not for field-level collective intelligence. Scaling to A(DAI)'s ambition would require significant architectural extension.


**temporality**

Bi-temporal by design — the most temporally sophisticated system in this research set. Event time and ingestion time are first-class concepts. Edge invalidation preserves full temporal history. Temporal reasoning is a core capability, not an afterthought.


**Uncertain fields:** who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### AutoSchemaKG (2025)

**Brief:** Dynamic schema discovery for KGs. Auto-extracts and merges entity types via vector clustering + LLM deduplication.

**Garden Logic relevance:** Automates Mode B3 vocabulary extension. Schema emerges from data rather than being designed. The question: does emergent schema satisfy the contestability requirement?

#### Basic identification and classification

- **name**: AutoSchemaKG (2025)
- **type**: neural-kg

**originator**

Jiaxin Bai and 19 co-authors, HKUST (Hong Kong University of Science and Technology) Knowledge Computation group (KnowComp)

- **year**: 2025 (arXiv: May 2025, paper ID 2505.23628)

**key_text**

Bai, J. et al. (2025) 'AutoSchemaKG: Autonomous Knowledge Graph Construction through Dynamic Schema Induction from Web-Scale Corpora', arXiv:2505.23628.

- **key_url**: https://github.com/HKUST-KnowComp/AutoSchemaKG

#### Core ideas and theoretical positioning


**core_claim**

Knowledge graph construction can be fully autonomous — eliminating predefined schemas by using LLMs to simultaneously extract triples and induce schemas directly from text, achieving 92% alignment with human-crafted schemas at billion-node scale.


**relation_to_attention_economy**

AutoSchemaKG is an infrastructure-level tool that does not participate in attention dynamics. It processes web-scale corpora without filtering for engagement or popularity — all documents are treated equally as knowledge sources. However, the web corpora it processes are themselves products of the attention economy (more popular content is more likely to be crawled and preserved).


**relation_to_commons**

The ATLAS knowledge graphs are research outputs, not commons resources. The code is open-source on GitHub, which aligns with academic commons. However, the pipeline processes 50+ million documents without consent from their authors — using web-scale corpora raises the same commons/extraction tensions as AI training data generally.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Four-phase pipeline: (1) Input processing — document filtering, segmentation, batching. (2) Triple extraction — LLM-based extraction of entity-relation-entity and event triples. (3) Schema induction — conceptualisation of instances into abstract categories via vector clustering + LLM deduplication. (4) KG construction — integration of triples and induced schemas into the ATLAS knowledge graph. Key innovation: events are first-class citizens alongside entities.


**data_model**

Typed triples (entity-relation-entity and event triples) with induced schema categories. Schema is a hierarchy of entity types and relation types discovered from data. Events are modelled alongside entities, capturing temporal, causal, and procedural knowledge. The ATLAS family of KGs contains 900+ million nodes and 5.9 billion edges. Hierarchical and faceted schema representations support both entity and event type taxonomies.


**temporal_logic**

Event-aware but not bi-temporal. Events are first-class entities with temporal attributes, capturing when things happened. However, the system does not distinguish between event time and ingestion time (no bi-temporal model). Schema evolution is handled through online merging/canonicalisation — the schema grows as new entity types are discovered — but this is additive, not temporal.


**absence_handling**

Not explicitly addressed. AutoSchemaKG is additive — it discovers and adds entities, relations, and schema categories. There is no mechanism for detecting what is missing from the graph or from the schema. The pipeline processes whatever is in the corpus and does not diagnose gaps in coverage. This is a significant contrast with A(DAI)'s core function of absence detection.


**scalability_model**

Centralised, massively parallel. Processes 50+ million documents to produce billion-scale graphs. Designed for batch processing at web scale, not for distributed or federated operation. Scaling is computational (more GPUs, more documents) rather than organisational (more communities, more perspectives).


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate. AutoSchemaKG addresses how the knowledge graph's schema is constructed — a substrate concern. It does not sense, diagnose, or generate participation. It is machinery for building and extending the graph's ontological structure.


**intention_vs_attention**

AutoSchemaKG is intention-neutral. It does not discriminate between signals based on intention or attention — it processes everything in the corpus. The framework automates schema discovery, which could serve either intention (discovering structural categories relevant to diagnosis) or attention (discovering trending topics). What matters for A(DAI) is whether the induced schemas serve diagnostic purposes. The risk is that schema induction from web corpora will reproduce the attention economy's biases — frequently discussed topics generate more robust schema categories than structurally important but rarely discussed ones.


**coherence_vs_consensus**

Neither. AutoSchemaKG produces a single, unified schema from the corpus — this is closer to consensus (one induced truth) than coherence (multiple valid readings). The merging and canonicalisation process actively eliminates duplicate categories and merges overlapping ones, producing a single coherent schema rather than preserving alternative categorisations.


**contestability**

Low. The induced schema is presented as an objective discovery from data, not as a contestable interpretation. There is no mechanism for alternative schema inductions from the same data, or for communities to challenge or modify the schema. This is the opposite of what A(DAI) needs — a contestable, community-influenced vocabulary.


**forkability**

Not designed for forking. The pipeline produces a single ATLAS knowledge graph. There is no mechanism for forking the schema or the graph, or for merging independently evolved schemas. The code is open-source, so technical forking is possible, but the framework provides no support for it.


**tendency_axis_position**

openness: open-source code, but the pipeline requires massive compute. commons: academic open-source, but web-scale data usage raises consent questions. spectacle vs infrastructure: infrastructure — schema induction is invisible plumbing. individual vs distributed: centralised — one pipeline, one schema, one graph.


**what_adai_should_adopt**

Dynamic schema extension as a mechanism for A(DAI)'s vocabulary evolution (Mode B3). Instead of manually defining every entity type and relation type, A(DAI) should use LLM-based schema induction to discover emerging categories from incoming signals. The 92% alignment with human schemas suggests that automatic induction is mature enough for production use. The treatment of events as first-class entities alongside agents — A(DAI) should model cultural events (exhibitions, performances, publications, controversies) with the same ontological status as practitioners and concepts. The online merging/canonicalisation pattern for handling schema evolution over time — as the cultural field changes, A(DAI)'s schema should grow organically.


**what_adai_should_refuse**

The single-schema-from-corpus model. A(DAI) must preserve multiple schema perspectives — what counts as a valid category should be contestable by different communities. Schema induction should be community-influenced, not corpus-determined. Refuse web-scale batch processing as the default mode — A(DAI) processes signals in tidal rhythms from a curated intake pipeline, not in massive batches from web crawls. Refuse the implicit assumption that more data = better schema: A(DAI)'s schema should be shaped by editorial judgment and community input, not just by statistical frequency in corpora. Refuse the lack of provenance in schema induction — A(DAI) must track why each schema category exists and which signals generated it.


#### Limitations, blind spots, and failure modes


**limits**

Schema induction from web corpora reproduces the biases of the web — overrepresenting English-language, commercially visible, and Western-centric knowledge. The 92% alignment metric is measured against human-crafted schemas that are themselves partial and biased. LLM-based extraction is expensive at web scale (inference costs for 50M+ documents). The pipeline is batch-mode, not real-time — schema evolution lags behind the field it represents.


#### Governance models and consent architectures


**governance_model**

Academic open-source. Code on GitHub under academic norms. No collective governance of the resulting knowledge graphs. The ATLAS KGs are research artefacts, not governed resources.


#### Material and operational conditions


**composability**

Library-level. The code is open-source and can be adapted. The pipeline architecture is modular (filtering, extraction, induction, construction can be modified independently). The ATLAS KG is a standalone artefact, not designed for composition with other KGs.


**liveness**

Recently published (May 2025). Active GitHub repository. Academic research project — liveness depends on continued research funding and team interest.


**scale_of_operation**

Planetary (web-scale). The pipeline processes the entire accessible web through 50M+ documents. The resulting ATLAS KG operates at a scale far beyond any individual field or community.


**temporality**

Event-aware but not bi-temporal. Events are captured with temporal attributes, but the system does not track when facts were observed vs. when they occurred. Schema evolution is additive (new categories are discovered) but not temporal (old categories are not invalidated or versioned).


**Uncertain fields:** failure_under_attention, extraction_vector

---


### KG Incompleteness as Feature (NSF-KGE, 2024)

**Brief:** Negative-sampling-free KG embeddings that treat incompleteness as structural information, not just missing data.

**Garden Logic relevance:** The deepest technical alignment. A(DAI)'s absence detection treats gaps as diagnostic information. This literature formalizes that principle mathematically.

#### Basic identification and classification

- **name**: KG Incompleteness as Feature (NSF-KGE, 2024)
- **type**: neural-kg
- **originator**: Adnan Bahaj and Mounir Ghogho, International University of Rabat / University of Leeds

**year**

2024 (published in Data Mining and Knowledge Discovery, Springer). Predecessor KG-NSF published on arXiv in 2022.


**key_text**

Bahaj, A. & Ghogho, M. (2024) 'Negative-sample-free knowledge graph embedding', Data Mining and Knowledge Discovery 38, 3590-3620. doi:10.1007/s10618-024-01052-9

- **key_url**: https://link.springer.com/article/10.1007/s10618-024-01052-9

#### Core ideas and theoretical positioning


**core_claim**

Knowledge graph embedding does not require negative sampling — the standard practice of assuming unobserved links are false — because incompleteness is structural information that can be learned from positive examples alone, using non-contrastive self-supervised objectives.


**relation_to_attention_economy**

NSF-KGE has no direct relationship to the attention economy — it is a technical method for learning KG embeddings. However, its core insight — that what is absent is not necessarily false, and that treating absence as signal rather than noise produces better representations — is philosophically aligned with A(DAI)'s intention logic. Attention economies treat what is invisible as irrelevant; NSF-KGE treats what is invisible as structurally informative.


**relation_to_commons**

The paper is standard academic research published through Springer (paywalled). The method addresses a commons-relevant technical problem: how to learn from incomplete shared knowledge without introducing false assumptions about what is not yet known.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Self-supervised representation learning without negative sampling. Uses non-contrastive objectives from the self-supervised learning literature (adapted from methods like BYOL and Barlow Twins) to learn relation-invariant embeddings. Key operations: relation transformation (translation, scaling, rotation) applied to entity embeddings, with objectives that enforce invariance to these transformations while preventing representation collapse.


**data_model**

Standard KG embedding: entities and relations embedded in continuous vector space. Triples (head, relation, tail) are the fundamental data unit. The key innovation is in how the model is trained: only positive triples are used, with no synthetic negative examples. Cross-correlation matrices of embedding vectors prevent degenerate solutions.


**temporal_logic**

Not temporal. NSF-KGE is a static embedding method — it learns representations from a fixed knowledge graph snapshot without temporal awareness. No mechanism for temporal evolution, bi-temporal tracking, or temporal reasoning.


**absence_handling**

This is the paper's central contribution and the deepest technical alignment with A(DAI). Standard KGE methods treat missing triples as negative evidence (Closed World Assumption): if the graph does not contain 'Artist X practices Style Y', traditional methods train the model to believe this is false. NSF-KGE instead treats this absence as uninformative (Open World Assumption): the model does not learn to reject unobserved connections. This means the learned embeddings preserve the structural potential for connections that have not yet been observed — gaps remain open rather than being closed. For A(DAI), this is the mathematical foundation for treating absence as diagnostic information rather than as evidence of non-existence.


**scalability_model**

Centralised. Standard GPU-based training pipeline. Comparable computational cost to traditional KGE methods (lower per epoch due to no negative sampling, similar total due to convergence speed). Not designed for distributed or federated operation.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate. NSF-KGE provides a technical mechanism for how A(DAI)'s graph embeddings should handle incompleteness — a substrate-level concern about how the graph's vector representations are learned.


**intention_vs_attention**

NSF-KGE is the deepest technical alignment with A(DAI)'s intention logic in this entire research set. The method treats gaps not as noise but as structural information — exactly the principle behind A(DAI)'s gap detection. Traditional KGE methods are attention-aligned: they assume that what is visible (observed triples) is true and what is invisible (unobserved triples) is false, privileging the present over the absent. NSF-KGE inverts this: absence is preserved as genuine incompleteness rather than resolved into false absence. This is the mathematical expression of 'intention over attention' at the embedding layer: the model learns to represent what is structurally possible, not just what has been observed.


**coherence_vs_consensus**

Coherence. By refusing to resolve unobserved triples into negatives, NSF-KGE maintains a representation where multiple potential truths coexist. The embedding space preserves structural possibilities rather than collapsing to a single truth. This is coherence at the vector level — the mathematical space holds together without forcing resolution.


**contestability**

Structurally contestable. Because the model does not close off unobserved connections, the embedding space preserves the possibility that current absence may become future presence. Every gap in the graph is a contestable proposition: 'this connection does not exist yet, but might.' This is the opposite of traditional KGE, which closes gaps by declaring them false.


**forkability**

Not directly forkable — NSF-KGE produces a single embedding space. However, different training runs on different subsets of the graph would produce different embeddings that preserve different structural possibilities. This suggests a path for community-specific embeddings: each A(DAI) community could train embeddings on their view of the graph, preserving their specific gaps and possibilities.


**tendency_axis_position**

openness: the method is published but the paper is paywalled. The technique is open in principle (reproducible from the paper) but not maximally accessible. commons: addresses a commons-relevant problem (learning from shared incomplete knowledge) but within academic publishing structures. spectacle vs infrastructure: pure infrastructure — embedding methods are invisible to end users. individual vs distributed: centralised training, but the Open World Assumption is philosophically distributed (multiple truths can coexist).


**what_adai_should_adopt**

The Open World Assumption as the fundamental principle for A(DAI)'s graph embeddings. Never treat an unobserved connection as evidence of non-existence. The non-contrastive self-supervised training objective: learn what IS true without assuming what IS NOT. The concept that embedding quality improves when incompleteness is preserved rather than artificially resolved — this validates A(DAI)'s approach of treating gaps as diagnostic features rather than data quality problems. The relation-invariant embedding principle: entities should have stable representations that are transformed (not replaced) by their relations, enabling structural diagnosis across different relation types.


**what_adai_should_refuse**

The purely technical framing. NSF-KGE treats incompleteness as a training-data problem, but A(DAI) treats it as a cultural-diagnostic principle. A(DAI) must not reduce gap detection to a link prediction task — gaps in the cultural graph mean something different from missing entries in a knowledge base. Refuse the static embedding model: A(DAI) needs temporal gap detection (how are gaps evolving over time?), which requires extending NSF-KGE's approach to temporal graphs. Refuse the benchmark-driven evaluation: NSF-KGE is validated by link prediction accuracy on standard KG benchmarks, but A(DAI)'s gap detection should be validated by its diagnostic utility for cultural communities.


#### Limitations, blind spots, and failure modes


**limits**

NSF-KGE achieves comparable but not superior performance to negative-sampling methods on standard benchmarks. The method prevents representation collapse through cross-correlation matrices, which have high space complexity (O(d^2) where d is embedding dimension). The approach is validated only on standard KG benchmarks (FB15k-237, WN18RR), not on culturally meaningful knowledge graphs. Static embedding — no temporal or dynamic capabilities.


#### Governance models and consent architectures


**governance_model**

Academic. Standard peer-reviewed publication. No governance of the method beyond academic review. The technique is in the intellectual commons once the paper is read, though access requires institutional subscription or purchase.


#### Material and operational conditions


**composability**

Method-level composability. NSF-KGE can be applied to any KG and combined with any downstream task. The non-contrastive objective can be adapted to different relation transformation types (translation, rotation, scaling). Compatible with existing KG infrastructure.


**liveness**

Recently published (2024). Active research line — the predecessor KG-NSF (2022) has been extended and improved. Part of a broader trend in non-contrastive and negative-sample-free learning. Academic research project — continued development depends on research interest.


**scale_of_operation**

Benchmark-scale. Validated on standard KGs with millions of triples. Not tested at web scale or field-level cultural knowledge graphs. Scaling properties are comparable to standard KGE methods.


**temporality**

Static. No temporal awareness — learns from a single graph snapshot. This is a significant limitation for A(DAI), which requires temporal evolution tracking. NSF-KGE would need to be extended with temporal dimensions (temporal-NSF-KGE) to serve A(DAI)'s tidal sensing.


**Uncertain fields:** failure_under_attention, consent_architecture, extraction_vector

---


### Temporal KG Reasoning — LGevo (2024)

**Brief:** Models cyclical and discontinuous recurrence patterns in temporal KGs. Signals that appear, disappear, and reappear across non-adjacent time windows.

**Garden Logic relevance:** Technical model for A(DAI)'s tidal computation. Signals don't just decay linearly — they recur, cycle, resurface. The sensing loop needs temporal pattern recognition beyond simple staleness.

#### Basic identification and classification

- **name**: Temporal KG Reasoning — LGevo (2024)
- **type**: neural-kg

**originator**

Research teams publishing in Pattern Recognition (Elsevier); related work by multiple groups including RLGNet (2024) and CyGLN (2025)

- **year**: 2024

**key_text**

Temporal knowledge graph reasoning with local-global evolutionary patterns (Pattern Recognition, 2025); Global-local evolution modeling with cyclic patterns for temporal knowledge graph reasoning (Pattern Recognition, 2025)

- **key_url**: https://www.sciencedirect.com/science/article/abs/pii/S0031320325013068

#### Core ideas and theoretical positioning


**core_claim**

Temporal knowledge graphs can model cyclical and discontinuous recurrence patterns by jointly capturing local evolutionary subgraphs (context around individual facts) and global evolutionary patterns (historical recurrence across timestamps), enabling prediction of future facts even when elements appear discontinuously.


**relation_to_attention_economy**

No direct relation to the attention economy. This is a technical ML research contribution focused on temporal reasoning in knowledge graphs. However, the underlying insight — that facts recur cyclically and that discontinuous appearances should be modeled rather than smoothed — challenges the attention economy's preference for recency and novelty. Things that have not appeared recently are not absent; they may be cyclically recurring.


**relation_to_commons**

Published as academic research (open access through institutional subscriptions). The methods contribute to the commons of knowledge graph reasoning techniques. However, implementation requires significant ML expertise, creating a de facto enclosure around practical application.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Dynamic subgraph sampling + relation-aware Graph Convolutional Networks + temporal fusion encoder. LGevo extracts correlated local evolutionary subgraphs for each fact (rather than fixed-window adjacent subgraphs) and integrates historical information with a decay function to weight entity contributions across timestamps.


**data_model**

Temporal knowledge graph — triples (subject, relation, object) with timestamps. Facts have temporal annotations indicating when they are valid. The graph evolves over time: new facts appear, old facts recur, and the structural context around entities changes. Key innovation: facts are not just present/absent but have patterns of recurrence that can be modeled.


**temporal_logic**

Cyclical and discontinuous — the core contribution. Historical events exhibit repetitive and cyclical patterns (per historical recurrence theory and social cycle theory). LGevo models these patterns by: (1) sampling dynamic subgraphs that capture the structural context of recurring facts, (2) applying decay functions that weight historical information by temporal distance, and (3) fusing local patterns (what happened around this entity recently) with global patterns (what has happened to similar entities across all time).


**absence_handling**

Directly addresses discontinuous absence — the key problem is that elements of facts may appear discontinuously (present at time t, absent from t+1 to t+5, present again at t+6). Prior methods using fixed adjacent time windows fail because they cannot 'see' through periods of absence. LGevo's dynamic subgraph sampling solves this by looking beyond fixed windows to find relevant historical contexts regardless of temporal adjacency.


**scalability_model**

Centralized ML training — requires GPU compute for training on temporal KG datasets. Inference scales with graph size. The method is computationally more expensive than simple recurrent approaches but more accurate for discontinuous patterns.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate — LGevo provides a technical model for how A(DAI)'s knowledge graph could handle temporal dynamics. Specifically relevant to the sensing-loop and dream-cycle components that need to detect recurring patterns in signal history.


**intention_vs_attention**

Technically neutral — LGevo optimizes for prediction accuracy, not for any particular values. However, the core insight supports A(DAI)'s intention framework: things that are not currently visible (not capturing attention) may be cyclically recurring and structurally significant. The model gives technical form to the idea that absence from current attention does not mean absence from structural significance. A(DAI)'s tidal computation — where signals ebb and flow, submerge and resurface — finds a technical foundation in LGevo's cyclical pattern modeling.


**coherence_vs_consensus**

Coherence — LGevo seeks structural coherence in temporal patterns (what local and global evolutionary patterns jointly explain a fact's recurrence). This is computational coherence: the model finds patterns that are structurally consistent across time. No consensus mechanism exists; coherence is optimized computationally.


**contestability**

Low at the model level — predictions are the output of a trained neural network and are not easily contestable except by comparing to alternative models. However, the inputs (what facts are in the temporal KG) and the interpretation of predictions (what does it mean that this pattern is predicted to recur?) are contestable.


**forkability**

The method is published in academic literature and the architecture is described in sufficient detail for reimplementation. The specific trained models depend on training data. The approach is forkable by any team with ML expertise.


**tendency_axis_position**

Infrastructure (technical substrate), commons (academic publication), computation (pure ML research). No inherent tendency toward capture or enclosure, but no inherent commons orientation either — the method is a tool that serves whatever purpose it is applied to.


**what_adai_should_adopt**

The cyclical pattern detection as a technical model for A(DAI)'s tidal computation. Specifically: (1) A(DAI)'s graph should track temporal annotations on signals and relationships — when was this connection first observed, when did it last appear, what is its recurrence pattern? (2) The dynamic subgraph sampling approach: when analyzing a signal, do not just look at adjacent signals; look for structurally similar historical contexts regardless of temporal distance. (3) The decay function: weight historical information by temporal distance, but do not discard distant history — a pattern from five years ago may be more relevant than one from last week if it represents a structural recurrence. (4) The local-global distinction: combine the immediate context of a signal (local) with the historical patterns across the entire graph (global) for richer analysis.


**what_adai_should_refuse**

The purely predictive orientation — LGevo aims to predict the next fact in a temporal KG, which is a forecasting task. A(DAI) should not try to predict what will happen in the field; it should diagnose what structural patterns are recurring, emerging, or decaying. The difference is between prediction (what will happen) and diagnosis (what is happening structurally). Also refuse the benchmark-driven epistemology: A(DAI)'s temporal reasoning should be validated by practitioner recognition ('yes, this pattern is real in our field'), not by link prediction accuracy on standard datasets.


#### Limitations, blind spots, and failure modes


**limits**

Temporal KG reasoning methods are evaluated on geopolitical event datasets (ICEWS, GDELT) and knowledge bases (YAGO), which have very different characteristics from cultural knowledge graphs. Cyclical patterns in geopolitics (diplomatic negotiations recur) may not map onto cultural dynamics (aesthetic movements may not recur in the same way). The computational requirements are significant, and the method requires well-structured temporal KG data that A(DAI) does not yet have.


#### Governance models and consent architectures


**governance_model**

Academic — published research governed by peer review and open scientific discourse. No governance model for the method's application.


#### Material and operational conditions


**composability**

Modular — the dynamic subgraph sampling, temporal fusion encoder, and decay function components can be independently adopted or modified. The architecture is designed as a pipeline with separable stages.


**liveness**

Active — published in 2024-2025, with related work (CyGLN, RLGNet) appearing simultaneously. The field of temporal KG reasoning is rapidly developing.


**scale_of_operation**

Dataset-scale — operates on temporal KGs with millions of facts across thousands of timestamps. Could be applied to A(DAI)'s graph once it reaches sufficient scale.


**temporality**

Cyclical and discontinuous — the core temporal innovation. Models recurrence patterns that are not periodic (not regular intervals) but cyclical (patterns that recur irregularly). Also models discontinuous appearance: facts that are absent for extended periods and then resurface.


**Uncertain fields:** who_is_excluded, failure_under_attention, structural_tension

---


---

## Media as Training Data


### Spawning AI / Have I Been Trained / Source.Plus

**Brief:** Consent infrastructure. Do Not Train registry. Source.Plus ethical dataset platform (2024). datadiligence library.

**Garden Logic relevance:** A graph node AND an architectural precedent. Spawning embodies the consent-infrastructure cluster. Source.Plus is what A(DAI)'s intake pipeline could learn from re: provenance.

#### Basic identification and classification

- **name**: Spawning AI / Have I Been Trained / Source.Plus
- **type**: media-data
- **originator**: Jordan Meyer, Mathew Dryhurst (Spawning AI)
- **year**: 2022 (HIBT), 2024 (Source.Plus)
- **key_text**: Have I Been Trained search tool; Source.Plus ethical dataset platform; datadiligence Python library
- **key_url**: https://spawning.ai/

#### Core ideas and theoretical positioning


**core_claim**

Consent infrastructure for AI training data must be built as a first-class technical layer, enabling creators to assert machine-readable opt-out/opt-in rights over their works.


**relation_to_attention_economy**

Refuses attention logic entirely. While attention economy treats creative works as raw material for engagement optimization, Spawning treats them as sovereign property requiring explicit consent before any computational use.


**relation_to_commons**

Navigates between commons and property: Source.Plus seeds with 40M public domain/CC0 images (commons-affirming), while Do Not Train registry protects individual property rights. Creates a consent-differentiated commons rather than an undifferentiated one.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Registry + marketplace + library pipeline. Do Not Train registry stores machine-readable opt-out preferences. Source.Plus is a curated marketplace. datadiligence is a pipeline integration library that checks consent status at training time.


**data_model**

Image-text pairs with licensing metadata, consent status flags, provenance records, and quality scores. Source.Plus enriches with captioning, safety scoring, and resolution metadata.


**temporal_logic**

Dynamic consent: consent can change over time, and the datadiligence library is designed to check consent at training time rather than at dataset creation time. This addresses the temporal gap between static datasets and evolving creator preferences.


**absence_handling**

Absence is the default state — if consent status is unknown or unverifiable, the work is excluded. The system operates on a precautionary principle where missing metadata means 'do not use.'


**scalability_model**

Centralized registry with distributed integration. The Do Not Train registry is centralized, but datadiligence allows any ML pipeline to check against it. Source.Plus scales through marketplace dynamics.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate — Spawning operates at the consent and provenance infrastructure layer, which maps to A(DAI)'s substrate layer where signals enter the system with verifiable provenance.


**intention_vs_attention**

Pure intention. Spawning's entire architecture is organized around creator intent (what they consent to) rather than engagement metrics. The Do Not Train registry is literally a declaration of intention. However, Source.Plus as a marketplace introduces some attention-adjacent dynamics — datasets that attract more buyers gain visibility.


**coherence_vs_consensus**

Neither, strictly. Spawning operates on individual consent rather than collective coherence or consensus. Each creator's consent decision is sovereign. This differs from A(DAI)'s coherence model, which seeks structural consistency across multiple readings rather than individual opt-in/opt-out.


**contestability**

Limited. Creator consent is binary (opt-in/opt-out) and not contestable by third parties. The system does not support counter-signals or alternative readings of consent status. A(DAI) requires richer contestability.


**forkability**

Low for the registry (centralized), moderate for datasets. Source.Plus datasets can be filtered and recombined, but the Do Not Train registry itself cannot be forked — it represents a single source of truth about consent.


**tendency_axis_position**

Strongly commons-side on the commons-capture axis. Infrastructure-side on spectacle-infrastructure. Individual-side on individual-distributed (consent is per-creator, not collective). Openness-enclosure is mixed: open infrastructure serving enclosure of individual rights.


**what_adai_should_adopt**

The datadiligence pattern of checking provenance and consent at processing time rather than only at ingestion time. A(DAI)'s signal pipeline should verify provenance dynamically, not just when a signal first enters /inbox/. Also adopt Source.Plus's approach of seeding with verified public domain material before adding consented contributions.


**what_adai_should_refuse**

The binary consent model. A(DAI) needs richer consent gradients — not just 'include/exclude' but 'include with attribution,' 'include for structural analysis only,' 'include but contestable.' Also refuse the marketplace framing: A(DAI)'s signals are contributions to a commons, not products for sale.


#### Limitations, blind spots, and failure modes


**limits**

Relies on creators actively registering opt-outs, creating an asymmetry where those unaware of AI training are unprotected. The registry is centralized and depends on Spawning's continued operation. Consent checking adds computational overhead to training pipelines, creating incentive to skip it.


#### Governance models and consent architectures


**governance_model**

Centralized platform governance by Spawning AI (venture-backed startup). Individual creator sovereignty over their own works. No collective governance mechanism for the registry as a whole.


#### Material and operational conditions


**composability**

Library-level (datadiligence is a pip-installable Python package). API-first for registry lookups. Source.Plus datasets are downloadable and filterable. Moderate composability overall.


**liveness**

Actively maintained and growing. Source.Plus launched in 2024. Have I Been Trained returned after CSAM-related hiatus. Active development on datadiligence library.


**scale_of_operation**

Field-level for the registry (80M+ artworks opted out as of 2023, growing). Source.Plus operates at dataset scale (40M+ images). Individual creators interact at individual scale.


**Uncertain fields:** failure_under_attention, temporality, epistemological_stance, extraction_vector

---


### The Pile / LAION-5B / Common Crawl debates

**Brief:** Training dataset controversies. The Pile discontinued. LAION-5B pulled for CSAM. Commons vs. extraction.

**Garden Logic relevance:** The anti-pattern. These datasets treated media as raw material for extraction. A(DAI) treats signals as contributions with provenance. The failure mode A(DAI) must avoid.

#### Basic identification and classification

- **name**: The Pile / LAION-5B / Common Crawl debates
- **type**: media-data
- **originator**: EleutherAI (The Pile), LAION e.V. (LAION-5B), Common Crawl Foundation (Common Crawl)
- **year**: 2020 (The Pile), 2022 (LAION-5B), 2013- (Common Crawl)

**key_text**

The Pile: An 800GB Dataset of Diverse Text for Language Modeling (Gao et al. 2020); LAION-5B: An Open Large-Scale Dataset for Training Next Generation Image-Text Models (Schuhmann et al. 2022)

- **key_url**: https://commoncrawl.org/

#### Core ideas and theoretical positioning


**core_claim**

Web-scale data scraping produces the raw material for foundation models, treating the open web as an extractable commons — but this framing collapses consent, copyright, safety, and representation into a single undifferentiated mass.


**relation_to_attention_economy**

These datasets are the substrate of the attention economy's computational layer. They encode the biases, preferences, and content hierarchies of the attention-driven web into the training data that powers generative AI. They do not critique attention — they crystallize it.


**relation_to_commons**

Misframes the open web as a commons while performing extraction. Common Crawl positions itself as a public good (nonprofit, freely available), but its funding from OpenAI and Anthropic reveals it as extraction infrastructure. The Pile's successor, Common Pile v0.1 (2025), attempts genuine commons by restricting to permissively licensed works.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Pipeline: crawl/scrape → filter → deduplicate → release. Common Crawl operates as continuous web archiving. LAION-5B used CLIP to filter Common Crawl for image-text pairs. The Pile curated multiple sub-datasets into a single training corpus.


**data_model**

Undifferentiated document collections (Common Crawl: raw HTML/text). LAION-5B: image-URL + alt-text pairs with CLIP similarity scores. The Pile: mixed-format text corpus from 22 sub-datasets. No provenance metadata, no consent status, minimal licensing information.


**temporal_logic**

Archival snapshot. Common Crawl takes periodic snapshots of the web. Datasets are static once released — they cannot track consent changes, content removal, or evolving creator preferences. The temporal gap between crawl and training is a governance blind spot.


**absence_handling**

No absence detection. These datasets cannot represent what is missing from the web — they only capture what is present and crawlable. Paywalled content, non-indexed communities, oral traditions, and opt-out works are structurally invisible.


**scalability_model**

Centralized production, distributed consumption. Datasets are created centrally and downloaded by many. No federation or forking mechanism — users get the whole corpus or nothing.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

none — these datasets represent the anti-pattern to Garden Logic. They are raw material extraction, not structured intelligence. If mapped forcefully, they sit below the substrate layer as undifferentiated noise that has not been through any sensing or processing pipeline.


**intention_vs_attention**

Pure attention crystallization. These datasets encode the web's attention hierarchies directly into training data. Content that received more attention (links, upvotes, engagement) is overrepresented. There is zero intention architecture — no mechanism for structural diagnosis, gap detection, or accountability.


**coherence_vs_consensus**

Neither. These datasets do not seek coherence (no structural consistency) or consensus (no resolution of disagreements). They present the web's contradictions, biases, and noise without any interpretive framework. The result is statistical averaging rather than structural understanding.


**contestability**

Zero. The datasets are monolithic — individual contributions cannot be contested, attributed, or withdrawn after inclusion. LAION-5B's CSAM crisis demonstrated that harmful content was uncontestable until external auditors intervened. The datasets have no internal mechanism for challenge or correction.


**forkability**

Technically forkable (downloadable files) but practically un-forkable in any meaningful governance sense. You can filter or subset, but there is no provenance chain to preserve across forks. Common Pile v0.1 represents an attempt at principled forking by restricting to licensed works.


**tendency_axis_position**

Maximally capture-side on commons-capture. Spectacle-side on spectacle-infrastructure (they encode the spectacle). Individual-side by default (no collective governance). Enclosure-side despite open access — they enclose the web's content into a form optimized for corporate model training.


**what_adai_should_adopt**

Nothing from the dataset construction methodology. However, A(DAI) should study these as the failure mode to avoid. The one technical lesson: Common Pile v0.1's approach of restricting to verifiably licensed content is aligned with A(DAI)'s provenance requirements.


**what_adai_should_refuse**

Everything about the extraction model: undifferentiated scraping, absent provenance, static consent assumptions, no contributor governance, scale-as-virtue thinking, and the treatment of creative works as raw material. A(DAI) must refuse the assumption that more data equals better intelligence.


#### Limitations, blind spots, and failure modes


**limits**

CSAM contamination in LAION-5B (1,679+ instances found by Stanford Internet Observatory). Copyright violations leading to lawsuits (NYT v. OpenAI). Common Crawl's misleading claims about content removal. The Pile's Books3 subset prompted class-action lawsuits. Representation bias (Reddit-heavy content skews male, white, English-speaking).


#### Governance models and consent architectures


**governance_model**

Common Crawl: nonprofit with corporate donor governance (funded by OpenAI, Anthropic, NVIDIA — conflict of interest). LAION: German nonprofit (e.V.) with academic governance. EleutherAI: open-source collective with informal governance. None have meaningful contributor governance.


#### Material and operational conditions


**composability**

Monolithic downloads. Subsets can be filtered but the datasets are not modular by design. Common Pile v0.1 attempts better composability through sub-corpus structure. Generally low composability for governance purposes.


**liveness**

Mixed. Common Crawl actively maintained with regular crawls. LAION-5B pulled (Dec 2023), re-released as Re-LAION-5B (Aug 2024) after CSAM removal. The Pile discontinued, replaced by Common Pile v0.1 (June 2025). Historically significant but the original versions are largely deprecated.


**scale_of_operation**

Planetary. Common Crawl: petabytes of web data. LAION-5B: 5.85 billion image-text pairs. The Pile: 825GB of diverse text. These operate at the scale of the entire indexable internet.


**temporality**

Static snapshots with no temporal depth. Each crawl captures a moment but datasets do not track change over time. No mechanism for temporal consent (consent at time of crawl vs. consent at time of training). The gap between archival snapshot and training use is a fundamental governance failure.


**Uncertain fields:** consent_architecture, epistemological_stance, extraction_vector

---


### Data-centric AI movement (Datacomp, DataPerf)

**Brief:** Shift from model-centric to data-centric ML. Training data curation as primary engineering.

**Garden Logic relevance:** A(DAI)'s signal pipeline IS data-centric. The intake quality determines everything downstream. Data-centric AI validates the architectural choice to invest in signal processing over model sophistication.

#### Basic identification and classification

- **name**: Data-centric AI movement (Datacomp, DataPerf)
- **type**: media-data

**originator**

Andrew Ng (evangelist), MLCommons (DataPerf), LAION/academic consortium (DataComp), DMLR Working Group

- **year**: 2021 (movement named), 2022 (DataPerf paper, DataComp launched)

**key_text**

DataPerf: Benchmarks for Data-Centric AI Development (Mazumder et al., 2022); DataComp: In search of the next generation of multimodal datasets

- **key_url**: https://dmlr.ai/

#### Core ideas and theoretical positioning


**core_claim**

The quality, curation, and composition of training data matters more than model architecture — shifting ML engineering focus from model-centric iteration to data-centric iteration.


**relation_to_attention_economy**

Indirect but important. Data-centric AI does not critique attention, but by emphasizing data quality over data quantity, it implicitly challenges the attention economy's assumption that more engagement data equals better models. Quality curation requires editorial judgment, not engagement metrics.


**relation_to_commons**

Mixed relationship. DataComp uses Common Crawl as its candidate pool (12.8B image-text pairs), inheriting all the commons-extraction tensions of web scraping. DataPerf benchmarks could be applied to ethically sourced datasets but the movement has not made commons governance a priority.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Benchmark suite + competition platform. DataPerf provides standardized benchmarks for evaluating dataset quality. DataComp provides a fixed candidate pool where participants compete on filtering and curation strategies. The 'data ratchet' creates iterative improvement cycles.


**data_model**

Evaluation-oriented: training sets, test sets, and metrics. DataPerf structures data-centric work into five benchmark types covering acquisition, debugging, curation, and prompting. DataComp uses image-text pairs filtered from Common Crawl with CLIP embeddings.


**temporal_logic**

Cyclical through competition rounds. DataPerf runs multiple challenge rounds, enabling iterative improvement. But the underlying datasets are static — the temporal logic is in the evaluation cycle, not in the data itself.


**absence_handling**

Implicit through benchmarking. If a dataset fails on specific demographic subgroups or task categories, the benchmark reveals the absence. DataPerf's bias evaluation benchmarks can detect underrepresentation. However, absence detection is a byproduct of evaluation, not a first-class design principle.


**scalability_model**

Centralized benchmark platform with distributed participation. MLCommons maintains the infrastructure; researchers worldwide submit entries. Scales through community participation in competitions.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

sensing-loop — Data-centric AI's emphasis on iterative data quality improvement maps to A(DAI)'s sensing loop, where signal quality determines everything downstream. The 'data ratchet' is structurally analogous to A(DAI)'s process → export → feedback cycle.


**intention_vs_attention**

Technically neutral — data-centric AI optimizes for task performance, which could serve either intention or attention depending on the downstream application. However, the emphasis on curation quality over raw scale has structural affinity with intention. The movement asks 'what data should we use?' rather than 'how much data can we get?'


**coherence_vs_consensus**

Consensus through benchmarking. The movement establishes shared metrics and competitions to reach consensus on what constitutes good data. This differs from A(DAI)'s coherence model, which tolerates multiple valid readings. Data-centric AI seeks a single leaderboard ranking.


**contestability**

Moderate. Competition format allows alternative approaches to be compared. Losing entries are not suppressed — they contribute to understanding. But benchmark tasks themselves are not contestable; they are set by organizers.


**forkability**

High at the methodology level — anyone can apply data-centric principles to their own datasets. Low at the platform level — DataPerf/DataComp infrastructure is centralized. The DMLR journal enables knowledge forking through publications.


**tendency_axis_position**

Infrastructure-side on spectacle-infrastructure (focused on engineering methodology). Mixed on commons-capture (uses Common Crawl but promotes quality over extraction). Distributed on individual-distributed (community-driven competitions). Openness-side (open benchmarks, open publications).


**what_adai_should_adopt**

The 'data ratchet' concept — using processed outputs to evaluate and improve intake quality. A(DAI)'s signal pipeline should include feedback loops where downstream graph quality informs upstream signal processing. Also adopt the principle that data curation is the primary engineering activity, not model or algorithm design.


**what_adai_should_refuse**

The benchmark-as-truth epistemology. A(DAI) should not reduce signal quality to a leaderboard metric. Cultural intelligence cannot be benchmarked against a fixed test set. Also refuse the competition framing — A(DAI)'s signal processing is collaborative sensemaking, not a contest to find the best filter.


#### Limitations, blind spots, and failure modes


**limits**

Inherits ethical problems from its data sources (DataComp uses Common Crawl). Benchmark tasks may not capture real-world data quality dimensions like consent, provenance, or cultural sensitivity. The movement has been primarily model-performance-oriented, not ethics-oriented.


#### Governance models and consent architectures


**governance_model**

Open protocol governance through MLCommons (industry consortium including Google, Meta, Intel, NVIDIA). Academic governance through DMLR journal and workshop committees. Hybrid corporate-academic governance with industry funding.


#### Material and operational conditions


**composability**

High. DataPerf benchmarks are modular and extensible. New benchmark tasks can be added. The DMLR journal publishes reusable methodologies. DataComp's filtering approaches are reproducible. Protocol-level composability.


**liveness**

Actively maintained and growing. DMLR Working Group formed January 2024. ICML 2024 workshop was the fifth in the series. DMLR journal accepting submissions. MLCommons actively developing new benchmark rounds.


**scale_of_operation**

Field-level. The movement spans the entire ML research community through conferences, journals, and competitions. DataComp operates at planetary data scale (12.8B image-text pairs). Impact extends to industry practice.


**temporality**

Cyclical through competition rounds and workshop series. The movement has emerged over 2021-2025 with increasing institutional formalization. Forward-looking through benchmark design that anticipates future data challenges.


**Uncertain fields:** who_is_excluded, failure_under_attention, consent_architecture, extraction_vector, epistemological_stance

---


### Indigenous Data Sovereignty (CARE Principles)

**Brief:** Collective benefit, Authority to control, Responsibility, Ethics. Non-Western data governance.

**Garden Logic relevance:** The deepest challenge to A(DAI)'s commons model. CARE asks: whose commons? Who governs? Fork rights are necessary but not sufficient if the forking population is homogeneous.

#### Basic identification and classification

- **name**: Indigenous Data Sovereignty (CARE Principles)
- **type**: media-data

**originator**

Global Indigenous Data Alliance (GIDA), International Indigenous Data Sovereignty Interest Group (within Research Data Alliance), Te Mana Raraunga, US Indigenous Data Sovereignty Network, Maiam nayri Wingara Collective

- **year**: 2018 (drafted at RDA Plenary, Gaborone, Botswana), 2019 (published)
- **key_text**: The CARE Principles for Indigenous Data Governance (Carroll et al., Data Science Journal, 2020)
- **key_url**: https://www.gida-global.org/care

#### Core ideas and theoretical positioning


**core_claim**

Data governance must center collective benefit, authority to control, responsibility, and ethics — particularly where colonial power asymmetries have historically stripped communities of sovereignty over their own knowledge, land, and identity data.


**relation_to_attention_economy**

Radical refusal. CARE challenges the foundational assumption of the attention economy: that data about people and cultures is freely available for extraction and optimization. Indigenous data sovereignty asserts that some knowledge should not be made 'findable' or 'accessible' in the FAIR sense without community governance.


**relation_to_commons**

Complexifies the commons concept fundamentally. CARE asks: whose commons? Commons governance that does not account for historical dispossession and ongoing power asymmetries reproduces extraction under a progressive label. The commons must be governed by those who are most affected by its use.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Governance framework (principles + protocols), not a technical system. CARE operates as a meta-protocol that constrains how technical systems should handle Indigenous data. Implementation varies by community — some use licenses (Traditional Knowledge labels), others use institutional policies.


**data_model**

Not a data model per se, but constrains data models: data about Indigenous peoples must carry governance metadata including collective ownership, permitted uses, and community authority. The Local Contexts Hub provides machine-readable Traditional Knowledge (TK) and Biocultural (BC) labels.


**temporal_logic**

Deep historical and intergenerational. CARE operates on timescales of colonial history and intergenerational knowledge transmission. Data governance decisions must account for past dispossession, present power dynamics, and future community benefit. This is fundamentally longer-horizon than any technical temporal logic.


**absence_handling**

CARE makes absence visible by design. The absence of Indigenous voice in data governance is the central problem CARE addresses. The framework highlights what is structurally missing: community authority, collective benefit mechanisms, ethical oversight, and responsibility structures.


**scalability_model**

Polycentric by design. Each Indigenous community develops its own governance protocols. CARE provides principles, not a universal implementation. Scales through adoption by institutions and communities, not through centralized infrastructure.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

participation — CARE maps most directly to A(DAI)'s participation layer, where the question of who governs the merge boundary is paramount. CARE does not prescribe technical architecture but demands that participation structures center the communities most affected.


**intention_vs_attention**

Intention, but a deeper form than A(DAI) currently articulates. CARE's intention is not just structural diagnosis (what gaps exist?) but relational accountability (who benefits? who decides?). This is intention grounded in historical responsibility, not just architectural analysis.


**coherence_vs_consensus**

Neither in the Western sense. CARE operates through community protocols that may prioritize harmony, elder authority, or consensus processes specific to each Indigenous governance tradition. The relevant framework is self-determination, not coherence or consensus as A(DAI) defines them.


**contestability**

High within community governance structures, but the right to contest is reserved for community members. External actors do not have the right to contest Indigenous data governance decisions. This challenges A(DAI)'s assumption that contestability should be universally available.


**forkability**

Complicated. CARE asserts that some data should NOT be forkable without community consent. Fork rights as A(DAI) defines them could reproduce colonial extraction if applied to Indigenous knowledge without community governance. Forkability must be constrained by authority to control.


**tendency_axis_position**

Radically commons-side, but a differentiated commons with clear governance boundaries. Anti-enclosure, but also anti-undifferentiated-openness. Infrastructure-side on spectacle-infrastructure. Distributed on individual-distributed (collective governance, not individual sovereignty).


**what_adai_should_adopt**

The fundamental question: whose commons? A(DAI) must build governance mechanisms that prevent the merge boundary from reproducing existing power asymmetries in the digital arts field. Adopt CARE's insistence that data governance is inseparable from historical power analysis. Adopt the principle that some signals may require restricted circulation based on community authority.


**what_adai_should_refuse**

Nothing should be refused from CARE itself — the question is what A(DAI) must refuse IN LIGHT OF CARE. Refuse the assumption that fork rights are sufficient for justice. Refuse the assumption that a commons is automatically equitable. Refuse the assumption that technical architecture can substitute for governance accountability.


#### Limitations, blind spots, and failure modes


**limits**

Implementation varies widely — principles without technical enforcement can become performative. Institutional adoption may be superficial (adding a land acknowledgment without changing data practices). The framework does not provide technical tools, making implementation dependent on institutional will.


#### Governance models and consent architectures


**governance_model**

Polycentric Indigenous governance. Each community maintains sovereignty over its own data governance protocols. GIDA provides coordination and principle-setting at the global level. The framework explicitly rejects universal top-down governance in favor of nested, community-led governance.


#### Material and operational conditions


**composability**

Framework-level composability. CARE principles can be embedded in institutional policies, research ethics protocols, data management plans, and technical systems. The Local Contexts Hub provides composable labels. But CARE itself is not a modular technical component.


**liveness**

Actively maintained and growing in institutional adoption. 2024 GIDA communiqué reaffirming original intent. Increasing integration with FAIR principles. Growing policy impact (UNESCO, AIATSIS). Five years of institutional uptake with ongoing refinement.


**scale_of_operation**

Multi-scale. Principles operate at the global level (UN Declaration on the Rights of Indigenous Peoples). Implementation operates at community level (specific protocols for specific nations). Institutional adoption operates at organizational level. Genuinely polycentric.


**temporality**

Intergenerational and historical. CARE operates on timescales of colonial history (centuries), knowledge transmission (generations), and community governance (ongoing). This temporal depth far exceeds any technical system's temporal logic.


**Uncertain fields:** epistemological_stance, who_is_excluded, failure_under_attention

---


### W3C PROV / Model Cards / Datasheets for Datasets

**Brief:** Provenance documentation standards. Machine-readable lineage tracking.

**Garden Logic relevance:** Direct architectural alignment. The Garden Logic's provenance chain tracks every fork, merge, narrative, and signal. W3C PROV is the standard this should conform to.

#### Basic identification and classification

- **name**: W3C PROV / Model Cards / Datasheets for Datasets
- **type**: media-data

**originator**

W3C Provenance Working Group (PROV), Margaret Mitchell et al. (Model Cards, 2019), Timnit Gebru et al. (Datasheets, 2018/2021)

- **year**: 2013 (W3C PROV Recommendation), 2018 (Datasheets), 2019 (Model Cards)

**key_text**

PROV-DM: The PROV Data Model (W3C Recommendation, 2013); Model Cards for Model Reporting (Mitchell et al., FAT* 2019); Datasheets for Datasets (Gebru et al., Communications of the ACM, 2021)

- **key_url**: https://www.w3.org/TR/prov-dm/

#### Core ideas and theoretical positioning


**core_claim**

Every piece of data, every model, and every dataset should carry machine-readable documentation of its provenance — who created it, how it was processed, what its intended uses are, and where its limitations lie.


**relation_to_attention_economy**

Indirect resistance. Provenance standards do not directly critique attention, but they undermine attention logic by making the origins and limitations of content visible. When provenance is transparent, the 'black box' that attention optimization depends on becomes auditable.


**relation_to_commons**

Enables responsible commons by providing the documentation infrastructure that commons governance requires. Without provenance tracking, a commons cannot enforce its own rules — it cannot know where contributions came from, how they were transformed, or who has authority over them.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Ontology + documentation templates. W3C PROV defines a generic ontology (Entity, Activity, Agent) with serializations in RDF/OWL, XML, and a human-readable notation (PROV-N). Model Cards and Datasheets define structured documentation templates for ML artifacts.


**data_model**

W3C PROV: directed acyclic graphs of entities, activities, and agents connected by relations (wasGeneratedBy, used, wasAssociatedWith, wasDerivedFrom, wasAttributedTo). Model Cards: structured sections covering model details, intended use, performance metrics across demographic groups. Datasheets: structured questions covering motivation, composition, collection process, preprocessing, uses, distribution, and maintenance.


**temporal_logic**

Bi-temporal. W3C PROV tracks both the time of the real-world events being described and the time of the provenance recording. This enables reasoning about when transformations occurred and when they were documented — a critical distinction for audit and accountability.


**absence_handling**

Explicit through documentation gaps. Model Cards require reporting performance across demographic groups, making absent evaluations visible. Datasheets require documenting what data was excluded and why. W3C PROV can represent unknown provenance through partial chains. Absence becomes a signal rather than invisible.


**scalability_model**

Distributed through standards adoption. W3C PROV is a web standard designed for interoperable provenance across systems. Model Cards and Datasheets scale through community adoption and institutional mandate. No centralized infrastructure required.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate — Provenance standards map directly to A(DAI)'s substrate layer. The provenance chain that tracks every fork, merge, narrative, and signal is architecturally aligned with W3C PROV's entity-activity-agent model.


**intention_vs_attention**

Intention-enabling infrastructure. Provenance standards do not generate intention themselves, but they provide the accountability infrastructure that intention requires. You cannot diagnose structural gaps if you cannot trace how the current state came to be. Provenance is the audit trail of intention.


**coherence_vs_consensus**

Coherence-supporting. Provenance enables multiple valid readings of the same data by preserving the chain of transformations that produced each reading. Different provenance paths explain different interpretations. This is coherence through transparency rather than consensus through resolution.


**contestability**

High. Complete provenance chains make outputs contestable by revealing their derivation. If you can see that a conclusion was derived from biased data or flawed processing, you can challenge it at the specific point of failure. Model Cards explicitly document limitations, inviting informed contestation.


**forkability**

Excellent provenance-across-forks support. W3C PROV's wasDerivedFrom relation can track how a dataset was forked, modified, and re-merged. This is exactly what A(DAI) needs: forkable intelligence where provenance survives forking.


**tendency_axis_position**

Infrastructure-side on spectacle-infrastructure (pure standards work). Openness-side (W3C open standards, academic open access). Commons-side (enables collective accountability). Distributed on individual-distributed (no central authority, adopted by many).


**what_adai_should_adopt**

W3C PROV as the formal provenance model for the signal pipeline. Every signal in /inbox/ should be representable as a PROV entity with documented derivation. Adopt Model Cards' approach of documenting performance across demographic groups for A(DAI)'s graph outputs. Adopt Datasheets' structured documentation for signal sources.


**what_adai_should_refuse**

The overhead assumption. Full W3C PROV compliance for every signal would create prohibitive documentation burden. A(DAI) should implement a lightweight provenance profile — capturing essential lineage (source, transformation, contributor) without requiring full ontological formalism for every node. Also refuse the assumption that documentation alone ensures ethical use.


#### Limitations, blind spots, and failure modes


**limits**

Adoption remains spotty — most ML models and datasets still lack adequate documentation. Hugging Face found license omission rates above 70% and error rates above 50% in major dataset repositories. Documentation overhead discourages adoption. Standards without enforcement are aspirational.


#### Governance models and consent architectures


**governance_model**

Open protocol governance (W3C standards process for PROV). Academic community governance for Model Cards and Datasheets (conference publications, community adoption). No enforcement mechanism — compliance is voluntary or institutionally mandated.


#### Material and operational conditions


**composability**

Protocol-level composability. W3C PROV is designed for interoperability through ontology (PROV-O) and serialization standards. Model Cards and Datasheets are template-level composable — they can be embedded in any model or dataset release. Extensions (ProvONE, DBpedia DataID) demonstrate composability.


**liveness**

W3C PROV is a stable W3C Recommendation (since 2013), actively used but not actively revised. Model Cards gaining institutional adoption (Hugging Face, Google). Datasheets increasingly required by venues (NeurIPS). Recent work (TeMLM, 2025) combines all three into unified release bundles.


**scale_of_operation**

Field-level for ML documentation (Model Cards, Datasheets). Planetary for W3C PROV (web standard). Individual artifact-level in practice (one card per model, one datasheet per dataset). The gap between standard availability and actual adoption is the primary scaling challenge.


**temporality**

Bi-temporal by design (W3C PROV). Historical through documentation of dataset collection and processing histories. The temporal logic is archival — provenance records are backward-looking, documenting what has already occurred rather than anticipating what will happen.


**Uncertain fields:** failure_under_attention, consent_architecture, epistemological_stance

---


### AI training data governance 2025-2026 (EU AI Act, California AB 2013, CONSENT Act)

**Brief:** Regulatory landscape. Training data transparency mandates. Opt-out vs consent debate.

**Garden Logic relevance:** External constraint on the system. If A(DAI) processes signals that contain copyrighted material, it operates within this regulatory regime. The consent-at-the-gate model (Design Brief) is ahead of regulation.

#### Basic identification and classification

- **name**: AI training data governance 2025-2026 (EU AI Act, California AB 2013, CONSENT Act)
- **type**: media-data

**originator**

European Commission (EU AI Act), California Legislature (AB 2013), US Senators Welch & Lujan (AI CONSENT Act), US Senators Hawley & Blumenthal (AI Accountability Act)

- **year**: 2024 (AB 2013 signed), 2024-2026 (EU AI Act phased implementation), 2025 (CONSENT Act introduced)

**key_text**

EU AI Act (Regulation 2024/1689); California AB 2013 (Generative AI Training Data Transparency Act); AI CONSENT Act (proposed federal legislation)

- **key_url**: https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202320240AB2013

#### Core ideas and theoretical positioning


**core_claim**

AI training data must be governed through transparency mandates (disclose what data was used), consent requirements (get permission before using personal data), and accountability frameworks (enforce compliance through regulatory mechanisms).


**relation_to_attention_economy**

Regulatory constraint on the attention economy's data infrastructure. These laws do not directly address attention but they constrain the data extraction that powers attention-optimized models. If training data requires consent and transparency, the unlimited data harvesting that feeds engagement optimization becomes legally risky.


**relation_to_commons**

Navigates between individual rights and collective regulation. AB 2013 focuses on transparency (corporate disclosure obligation). The CONSENT Act focuses on individual rights (opt-in consent). The EU AI Act focuses on systemic risk management. None fully articulate a commons governance model — they regulate within existing property and rights frameworks.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Regulatory framework, not a technical architecture. Imposes requirements on technical systems: AB 2013 requires documentation artifacts (12 disclosure categories). EU AI Act requires risk classification and conformity assessment. CONSENT Act requires consent management infrastructure.


**data_model**

Disclosure templates. AB 2013 requires structured information about data sources, licensing status, personal information inclusion, synthetic data use, and data processing methods. The EU AI Act requires technical documentation for high-risk AI systems. These create de facto data models for regulatory compliance.


**temporal_logic**

Phased implementation with deadlines. AB 2013: effective January 1, 2026, applies to systems released since January 1, 2022. EU AI Act: prohibited practices (Feb 2025), GPAI rules (Aug 2025), high-risk obligations (Aug 2026, possibly delayed to 2027). Regulatory temporal logic is deadline-driven.


**absence_handling**

Regulatory disclosure requirements make absent information visible by mandating what must be documented. If a developer cannot disclose their training data sources, that absence becomes a compliance violation. However, the regulations do not detect substantive absences in the data itself (bias, underrepresentation).


**scalability_model**

Centralized regulatory enforcement. AB 2013 enforced through California's Unfair Competition Law. EU AI Act enforced by national market surveillance authorities and the EU AI Office. Federal bills would be enforced by the FTC. Scales through jurisdictional reach rather than technical federation.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

none directly — these are external constraints on the system, not components of Garden Logic. However, they constrain the substrate layer by requiring that A(DAI)'s signal intake and processing pipeline be compliant with transparency and consent requirements.


**intention_vs_attention**

These regulations constrain attention-economy infrastructure but do not generate intention. They are defensive (preventing harm) rather than constructive (producing structural diagnosis). AB 2013 requires disclosure but does not ask 'what is this data for?' — only 'what data was used?' A(DAI)'s intention architecture goes further by asking what structural gaps the data reveals.


**coherence_vs_consensus**

Consensus through legislation. Regulatory frameworks seek political consensus (majority vote) on what rules should govern AI training data. This is democratic consensus, not structural coherence. The regulations do not ask whether AI systems produce coherent understanding — only whether they comply with rules.


**contestability**

High through legal mechanisms. AB 2013 enables private litigation under California's UCL. xAI has already challenged the statute as unconstitutional. The EU AI Act provides administrative contestation mechanisms. Legal contestability is strong but slow and expensive.


**forkability**

Regulations are jurisdictional, creating de facto forks. EU rules differ from California rules differ from proposed federal rules. Companies must navigate multiple overlapping frameworks. This jurisdictional fragmentation is a form of regulatory forkability, but not the principled forkability A(DAI) envisions.


**tendency_axis_position**

Mixed. Commons-adjacent (protecting public interest) but operating within property-rights frameworks. Infrastructure-side (creating regulatory infrastructure). Individual-side for consent laws (individual opt-in/opt-out). Openness-side for transparency mandates but potentially enclosure-side if compliance costs exclude smaller actors.


**what_adai_should_adopt**

Compliance as a design constraint. A(DAI) should build its signal pipeline to be AB 2013-compliant from day one — documenting signal sources, licensing, processing methods. This is not just legal protection but alignment with A(DAI)'s own provenance principles. Also adopt the CONSENT Act's principle that consent should be revocable and mechanisms should be accessible.


**what_adai_should_refuse**

The procedural-compliance-as-ethics framing. Filling out disclosure forms is not the same as genuine data governance. A(DAI) should refuse the assumption that regulatory compliance equals ethical operation. Also refuse the trade-secret exemption logic that companies like xAI use to resist transparency — A(DAI)'s intelligence graph should be structurally transparent.


#### Limitations, blind spots, and failure modes


**limits**

Enforcement is uncertain — AB 2013 faces constitutional challenges (xAI lawsuit). Federal bills may not pass (US legislative gridlock). EU AI Act timelines may slip. Compliance costs may disadvantage smaller developers and open-source projects. Regulations lag behind technical capabilities.


#### Governance models and consent architectures


**governance_model**

Democratic legislative governance (laws passed by elected bodies). Regulatory enforcement by government agencies (FTC, EU AI Office, California AG). Judicial interpretation through courts. This is the most formalized governance model in the set but also the most rigid and slow to adapt.


#### Material and operational conditions


**composability**

Low. Each regulation is a monolithic legal framework. Cross-jurisdictional compliance is complex and fragmented. No interoperability standard between AB 2013, EU AI Act, and proposed federal legislation. Companies must build separate compliance systems for each jurisdiction.


**liveness**

Actively evolving. AB 2013 effective January 2026 and already facing legal challenges. EU AI Act in phased implementation through 2027. Federal bills proposed but not enacted. The regulatory landscape will continue shifting through at least 2028.


**scale_of_operation**

Jurisdictional: AB 2013 applies to systems available to Californians; EU AI Act to systems deployed in the EU; federal bills would apply nationwide. Effectively planetary in impact because major AI systems serve global markets and must comply with the most restrictive applicable jurisdiction.


**temporality**

Deadline-driven and phased. Retroactive scope (AB 2013 covers systems released since 2022). Prospective requirements with specific compliance dates. The temporal logic is legislative — shaped by political cycles, sunset clauses, and amendment processes rather than technical rhythms.


**Uncertain fields:** epistemological_stance, failure_under_attention, extraction_vector

---


### Consent in Crisis — AI Data Commons Decline (2024)

**Brief:** Documents ~5% of major training corpora tokens becoming restricted by robots.txt in under a year. Quantifies commons erosion.

**Garden Logic relevance:** The external threat. The commons A(DAI) operates within is actively shrinking. The system must be designed for a world where open data is contracting, not expanding.

#### Basic identification and classification

- **name**: Consent in Crisis — AI Data Commons Decline (2024)
- **type**: media-data

**originator**

Shayne Longpre, Robert Mahari, and 40+ co-authors. Institutions include MIT, Data Provenance Initiative, and multiple universities.

- **year**: 2024 (arXiv: July 2024, paper ID 2407.14933; NeurIPS 2024 Datasets and Benchmarks Track).

**key_text**

Longpre, S., Mahari, R. et al. (2024) 'Consent in Crisis: The Rapid Decline of the AI Data Commons', NeurIPS 2024.

- **key_url**: https://arxiv.org/abs/2407.14933

#### Core ideas and theoretical positioning


**core_claim**

The web-sourced data commons that enabled general-purpose AI is rapidly shrinking — robots.txt restrictions grew 500%+ from 2023-2024 across major training corpora, biasing the diversity, freshness, and scaling potential of AI systems and reflecting a crisis of consent in web data governance.


**relation_to_attention_economy**

The paper documents the attention economy eating itself: platforms that built their audiences on open web content are now restricting access to protect their content from AI training. The crisis is a direct consequence of attention-economy dynamics — content was created to attract eyeballs, but now the eyeballs belong to AI crawlers rather than human readers. The tragedy of the commons plays out in attention terms: the more AI systems consume web content, the more content owners restrict access, reducing the commons for everyone.


**relation_to_commons**

This paper is the definitive empirical documentation of AI data commons decline. It shows that the web-as-commons model is collapsing: ~5% of major corpora tokens becoming restricted per year, with critical domains (news, high-quality reference sites) restricting at much higher rates (20-33% in one year). The commons is actively shrinking, and the restriction mechanisms (robots.txt, Terms of Service) are blunt instruments not designed for this purpose.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Longitudinal audit methodology. Scraping and parsing robots.txt files and Terms of Service across 14,000 domains at multiple time points. Mapping restriction patterns against major training corpora (C4, RefinedWeb, Dolma). Token-level analysis of restricted vs. unrestricted content. No computational system is proposed — this is measurement, not infrastructure.


**data_model**

Domain-level restriction metadata: robots.txt rules (per-crawler restrictions for Google, OpenAI, Anthropic, Meta, Common Crawl, Internet Archive), Terms of Service clauses, temporal snapshots. Token-level corpus analysis: how many tokens from each domain are restricted and when restrictions were imposed. The data model is tabular-temporal — domains x restriction-types x time.


**temporal_logic**

Longitudinal comparison. The paper tracks restriction rates from mid-2023 to April 2024, revealing a dramatic acceleration. The temporal logic is trend-based: measuring the rate of commons decline over time. The paper implies that this trend will continue or accelerate, but does not model future trajectories. The temporal insight is that the commons is not static — it is actively shrinking, and the rate of shrinkage is increasing.


**absence_handling**

The paper's central contribution IS an absence diagnosis. It documents what is being removed from the data commons — not just quantitatively (how many tokens) but qualitatively (which types of content: news 45% restricted, reference sites, high-quality sources). The absence analysis is structural: the most valuable content (news, high-quality reference) is being restricted fastest, meaning the remaining commons is biased toward low-quality, SEO-optimised, or automatically generated content.


**scalability_model**

The audit methodology scales to any number of domains but requires active web scraping and parsing. The findings are field-level (the entire AI training data ecosystem) rather than system-level. No infrastructure is proposed for ongoing monitoring.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

sensing-loop + participation. The paper provides critical intelligence for A(DAI)'s sensing about the external environment: the commons is shrinking, and A(DAI)'s intake pipeline must adapt. It also maps to participation because the consent crisis directly affects how A(DAI) can ethically source signals.


**intention_vs_attention**

The paper documents the failure of both intention and attention logic in web data governance. robots.txt was designed as a simple, well-intentioned protocol for web crawling — it was never intended to govern AI training data rights. Terms of Service were designed for human users, not AI systems. The consent crisis reveals that the web's governance infrastructure was designed for the attention economy (human readers visiting pages) and is failing under the intention economy (AI systems extracting structural knowledge). A(DAI) must build consent architecture that is native to knowledge extraction, not retrofitted from web browsing conventions.


**coherence_vs_consensus**

The paper documents the failure of consensus — there is no agreement between content owners and AI developers about data rights. robots.txt provides a unilateral restriction mechanism (content owners can block crawlers) but no negotiation or mutual agreement. Terms of Service are unilateral impositions. The absence of consensus is the crisis. A(DAI) should aim for coherence: a structurally consistent consent architecture that allows different parties to maintain different positions without requiring universal agreement.


**contestability**

Highly contested domain. The legal status of AI training as 'fair use' is unresolved. Content owners contest AI developers' right to train on their content. AI developers contest content owners' ability to restrict publicly available data. The paper documents this contestation empirically without resolving it. A(DAI) must operate within this contested landscape.


**forkability**

Not applicable in the technical sense. However, the paper documents a form of 'exit' — content owners leaving the data commons by imposing restrictions. This is a one-way fork: once content is restricted, it is removed from the commons without a merge path. A(DAI) must design consent that allows reversible participation, not just irreversible exit.


**tendency_axis_position**

openness: documents the collapse of openness — the trend is toward enclosure. commons: the paper IS the diagnosis of commons decline. spectacle vs infrastructure: infrastructure — the consent crisis is invisible to most users and manifests in protocol-level changes (robots.txt). individual vs distributed: the crisis is distributed but the responses are individual (each domain owner sets their own policy).


**what_adai_should_adopt**

The empirical finding as a design constraint: A(DAI) cannot rely on web-scraped data for its knowledge graph. The intake pipeline must use explicit contribution (transcriber, /contribute page, manual intake) rather than web crawling. The insight that consent protocols designed for one context (web browsing) fail catastrophically when applied to another (AI training) — A(DAI) must build consent architecture native to knowledge extraction, not borrowed from adjacent contexts. The temporal analysis: commons decline is accelerating, meaning A(DAI)'s value as a curated, consent-based knowledge commons increases over time as the open web commons shrinks. The content-type bias finding: the most valuable content is being restricted fastest, so A(DAI) should prioritise direct relationships with high-quality sources (practitioners, institutions, researchers) rather than relying on open web availability.


**what_adai_should_refuse**

The implicit assumption that the web was ever a genuine data commons. The paper treats the web's openness as a baseline being eroded, but the web was always a conditionally open space governed by implicit social norms (you can read but not bulk-extract). A(DAI) should not romanticise web openness — it should build a genuine commons with explicit consent, not mourn the loss of a pseudo-commons. Also refuse the frame that restriction is purely negative: content owners restricting their data from AI training may be exercising legitimate sovereignty over their creative work. A(DAI)'s commons must be built on affirmative contribution, not on the assumption that all public information should be freely extractable.


#### Limitations, blind spots, and failure modes


**limits**

The paper audits robots.txt and Terms of Service but cannot measure actual compliance — AI companies may ignore restrictions. The 14,000-domain sample, while large, may not represent the full web. The analysis is US/English-centric — restriction patterns in non-English web domains may differ. The paper documents the problem but does not propose solutions beyond better protocol design.


#### Governance models and consent architectures


**governance_model**

The paper diagnoses the absence of governance. robots.txt is a voluntary protocol with no enforcement mechanism. Terms of Service are unilateral and inconsistently applied. There is no governing body for AI data commons — the space is governed by market dynamics, legal threats, and unilateral actions. The paper implicitly calls for better governance without specifying what it should look like.


#### Material and operational conditions


**composability**

The audit methodology is reproducible — other researchers can audit other corpora and domains. The findings compose with policy analysis, legal scholarship, and technical standards work. The paper is a diagnostic, not a tool — it composes with solutions, not with other systems.


**liveness**

Published at NeurIPS 2024 and actively cited. The underlying trend (commons decline) is ongoing and likely accelerating. The Data Provenance Initiative continues to monitor and publish on these issues. The findings will need updating as the landscape continues to shift.


**scale_of_operation**

Planetary. The audit covers the major English-language web training corpora that underlie most large AI systems. The findings have implications for the entire AI industry and all content creators on the web.


**temporality**

Longitudinal and trend-based. The paper tracks restriction rates from mid-2023 to April 2024, revealing acceleration. The temporal insight is directional: the commons is shrinking, and the rate of shrinkage is increasing. The paper implies that without intervention, the trend will continue, but does not model specific timelines.


**Uncertain fields:** epistemological_stance

---


### Transparency Coalition (TCAI) — Do Not Train Standard

#### Basic identification and classification

- **name**: Transparency Coalition (TCAI) — Do Not Train Standard
- **type**: media-data

**originator**

Transparency Coalition for AI (TCAI). Coalition includes publishers, content creators, and advocacy organisations.


**year**

2024 (DNT standard advocacy); 2024 (Virginia HB 2250); 2024 (California AB 2013 training data transparency).


**key_text**

TCAI position papers on Do Not Train data and Training Data Request prompts. Virginia Consumer Opt-Out Artificial Intelligence Training Data Act (HB 2250). California AB 2013.

- **key_url**: https://www.transparencycoalition.ai/

#### Core ideas and theoretical positioning


**core_claim**

Content owners should have a machine-readable, universal mechanism to declare their work off-limits for AI training — analogous to robots.txt for web crawling or copyright pages in publishing — enforceable through both industry standards and legislation.


**relation_to_attention_economy**

TCAI operates within and responds to the attention economy's latest phase: the extraction of creative content for AI training. The DNT standard is a defensive mechanism against a new form of attention-economy extraction — using creative outputs not to attract eyeballs but to train models that may replace the creators. It represents a consent-based limit on extractive infrastructure.


**relation_to_commons**

Complicated. TCAI primarily represents content owners asserting property rights, which can conflict with commons principles. The DNT standard defaults to enclosure (opt-out of training = keeping content private), whereas a commons approach might default to sharing with conditions. However, TCAI also advocates for transparency (Training Data Verification Requests), which serves commons interests by making the AI training pipeline legible.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Machine-readable metadata standard (analogous to robots.txt). Proposed mechanisms: Do Not Train (DNT) tags in content metadata; Training Data Verification Request (TDVR) protocols; Training Data Deletion Request (TDDR) protocols. Regulatory compliance layer, not a data system.


**data_model**

Metadata annotations on existing content. Binary signals (train/do-not-train) attached to content at the file, page, or domain level. Verification and deletion request protocols add request-response patterns. The data model is simple and declarative — it does not describe the content, only its training-permission status.


**temporal_logic**

Regulatory-reactive. Standards emerge in response to AI training practices that are already occurring. The temporal logic is backward-looking: DNT is applied after content has been created and after AI training has become a threat. There is an inherent temporal asymmetry — once a model is trained on content, it cannot 'unlearn' it, so DNT is only effective prospectively.


**absence_handling**

DNT does not handle absence — it is a presence/absence signal (tag present = do not train; tag absent = ambiguous/implicit consent). The framework does not address what happens when training data lacks DNT tags — is silence consent? This ambiguity is a core vulnerability.


**scalability_model**

Centralised standard with decentralised implementation. The standard is designed to be adopted industry-wide, but compliance depends on individual AI developers choosing to respect the tags. Enforcement is regulatory, not technical.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

participation. DNT maps to A(DAI)'s participation layer because it defines the terms under which content can enter the system. It is a consent mechanism that sits at the intake boundary, not a sensing or substrate component.


**intention_vs_attention**

TCAI operates within attention-economy logic — it is a defensive response to extractive AI training, not a positive alternative. The DNT standard does not generate intention; it prevents unwanted extraction. However, the transparency mechanisms (TDVR, TDDR) have intention-aligned potential: they make the AI training pipeline structurally legible, which serves diagnostic purposes. A(DAI) should view DNT as a necessary hygiene standard for its intake pipeline, not as a model for its core logic.


**coherence_vs_consensus**

Consensus-seeking. TCAI aims for industry-wide adoption of a single standard — this is a consensus project. The DNT tag is binary (yes/no), not gradated or interpretive. This is appropriate for a consent mechanism but misaligned with A(DAI)'s coherence principle, which accommodates multiple readings.


**contestability**

Low contestability in the standard itself — DNT is meant to be unambiguous. But highly contested in the regulatory environment — AI companies resist DNT mandates, and the legal status of training as 'fair use' remains unresolved. The framework's outputs are not contestable (a DNT tag means what it means), but its legitimacy is hotly contested.


**forkability**

Not forkable. The DNT standard is designed to be universal and uniform — forks would undermine its purpose. Different jurisdictions may implement different regulatory versions, but these are not 'forks' in the commons sense.


**tendency_axis_position**

openness: tends toward enclosure — DNT defaults to restricting access. However, the transparency mechanisms push toward openness by making AI training pipelines legible. commons: ambiguous — serves individual property rights more than collective commons governance. But protects the creative commons from extractive AI training. spectacle vs infrastructure: infrastructure — DNT is an invisible metadata standard. individual vs distributed: individual — DNT is exercised by individual content owners, not collectively.


**what_adai_should_adopt**

Respect for DNT tags in the intake pipeline — A(DAI) must not ingest content marked as Do Not Train. The principle of machine-readable consent as a first-class element of the data pipeline. The TDVR concept: any contributor to A(DAI)'s graph should be able to query whether their content has been ingested and how it has been processed. The general principle that consent is not just ethical but architecturally necessary — it must be mechanically enforced, not just promised in a policy document.


**what_adai_should_refuse**

The binary consent model. DNT is yes/no, but A(DAI) needs more nuanced consent: 'train but attribute', 'train for diagnosis but not for generation', 'share within this community but not beyond', 'use for 2 years then re-consent'. A(DAI) should build a richer consent vocabulary than DNT provides. Also refuse the property-rights framing — A(DAI) is a commons, not a marketplace. Consent in A(DAI) should be about collective governance, not individual intellectual property.


#### Limitations, blind spots, and failure modes


**limits**

DNT is easily ignored — compliance depends on goodwill or regulation, not technical enforcement. The tag provides no mechanism for verification or enforcement. Once a model is trained, content cannot be 'unlearned'. The binary model (train/do-not-train) does not capture the nuances of how content might be used. The standard addresses text and images but has unclear applicability to audio, video, and multi-modal content.


#### Governance models and consent architectures


**governance_model**

Coalition-based advocacy pushing for regulatory mandates and industry standards. TCAI is a lobbying and standards organisation, not a governance body. Actual governance would come from legislation (Virginia, California) and industry compliance.


#### Material and operational conditions


**composability**

Standard-level composability. DNT tags are simple metadata that can be added to any content format. The standard is designed to be universally adoptable. However, it does not compose with more nuanced consent systems — it is binary, not modular.


**liveness**

Active and growing. Legislative momentum in Virginia, California, and other states. TCAI continues to advocate for adoption. The DNT concept is gaining traction as AI training becomes more politically salient.


**scale_of_operation**

Field-level to planetary. TCAI aims for universal adoption across the AI training industry. Current adoption is concentrated in US publishing and media industries.


**temporality**

Regulatory-reactive and prospective. DNT is only effective for future training runs, not retroactively. The temporal logic is defensive: protecting content from future extraction rather than diagnosing past harms.


**Uncertain fields:** failure_under_attention, extraction_vector

---


---

## Intention Economy


### Doc Searls — The Intention Economy (2012)

**Brief:** Demand-side economics. Users declare intent rather than being targeted. The inverse of advertising.

**Garden Logic relevance:** The conceptual origin. A(DAI) extends Searls from commerce to cultural intelligence: the commons declares what it intends, the system reads whether the intention is being fulfilled.

#### Basic identification and classification

- **name**: Doc Searls — The Intention Economy (2012)
- **type**: intention-economy
- **originator**: Doc Searls
- **year**: 2006 (term coined in Linux Journal), 2012 (book published)
- **key_text**: The Intention Economy: When Customers Take Charge (Harvard Business Review Press, 2012)
- **key_url**: https://cyber.harvard.edu/events/2012/05/searls

#### Core ideas and theoretical positioning


**core_claim**

Markets should be driven by declared buyer intent rather than seller-side targeting — the economy grows around buyers who come ready-made with needs, not around sellers who must manufacture demand through advertising and attention capture.


**relation_to_attention_economy**

Direct structural negation. Searls explicitly identifies the attention economy as the system to be inverted. Where the attention economy targets, captures, and directs consumers, the intention economy has consumers declare their needs and vendors respond. The asymmetry flips from seller-to-buyer to buyer-to-seller.


**relation_to_commons**

Implicit commons through interoperability. Searls envisions open standards and protocols that prevent vendor lock-in, creating a commons of commercial infrastructure. Buyers' declared intentions become a shared resource that multiple vendors can respond to, rather than a proprietary asset captured by a single platform.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Demand-side protocol. Buyers declare intent through standardized interfaces; vendors respond through open markets. The key architectural move is giving the demand side its own technical infrastructure (VRM tools) rather than relying on vendor-controlled CRM systems.


**data_model**

Intent declarations: structured expressions of what buyers want (product, service, terms, timing). These are buyer-controlled data objects that can be shared selectively with vendors. The data is demand-side, not supply-side.


**temporal_logic**

Anticipatory. The intention economy is future-oriented — buyers declare what they will want, and vendors respond to anticipated demand. This contrasts with the attention economy's present-tense logic of capturing current engagement.


**absence_handling**

Intent as absence signal. A declared intention is, by definition, a statement of what the buyer does not yet have. The system is built around absence — the gap between current state and desired state. This is structurally similar to A(DAI)'s gap detection.


**scalability_model**

Distributed through open protocols. Searls envisions no central marketplace but rather open standards that allow any number of intent-matching services to emerge. Scales through protocol adoption, not platform growth.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

prompt-generation — Searls' intention economy maps to A(DAI)'s prompt-generation layer, where structural diagnosis of gaps produces actionable intelligence. The declared intent is analogous to A(DAI)'s generated prompts: both articulate what is missing or needed.


**intention_vs_attention**

The conceptual origin of A(DAI)'s intention/attention distinction. Searls names the structural inversion: from systems that capture attention to systems that serve declared intention. A(DAI) extends this from commerce to cultural intelligence — from 'what do I want to buy?' to 'what structural gaps exist in the field?'


**coherence_vs_consensus**

Market consensus through price signaling. The intention economy resolves supply-demand matching through market mechanisms, which is a form of consensus (price agreement). This differs from A(DAI)'s coherence model — Searls seeks efficient matching, not structural consistency across multiple readings.


**contestability**

High through market competition. Multiple vendors can respond to the same declared intent, creating natural contestation of offers. The buyer retains the power to choose, reject, or modify. However, the intent declaration itself is not contestable — the buyer is sovereign.


**forkability**

Conceptually forkable — open protocols enable alternative implementations. But the intention economy has not been widely implemented, so forkability is theoretical. Customer Commons (nonprofit spinoff) attempts to maintain the open protocol commitment.


**tendency_axis_position**

Strongly openness-side (open protocols against platform lock-in). Commons-side for infrastructure but market-oriented for exchange. Infrastructure-side on spectacle-infrastructure (protocol design, not spectacle). Individual-side (buyer sovereignty, not collective governance).


**what_adai_should_adopt**

The fundamental inversion: systems should serve declared structural needs, not capture engagement. A(DAI) should adopt the principle that the graph's primary output is not 'interesting content' but 'structural diagnosis' — what the field needs, not what individuals want to see. Also adopt the buyer-sovereignty principle as contributor-sovereignty: contributors control how their signals are used.


**what_adai_should_refuse**

The market framing. Searls' intention economy is still fundamentally about commerce — matching supply and demand through price. A(DAI)'s intention is not commercial; it is epistemic and structural. The field does not need buyers and sellers of cultural intelligence; it needs collective sensemaking. Refuse the assumption that intention is individual and transactional.


#### Limitations, blind spots, and failure modes


**limits**

Never achieved mass adoption. VRM tools remain marginal after 15+ years. The book was well-received but the movement did not displace CRM. Individual buyers may not want to declare intent — privacy concerns, effort of formulating intent, and the convenience of being targeted. The theory underestimates the stickiness of attention systems.


#### Governance models and consent architectures


**governance_model**

Individual sovereignty plus open protocol governance. Buyers govern their own data through VRM tools. Protocols are governed through standards bodies and open-source communities. Customer Commons (nonprofit) provides institutional continuity. Berkman Klein Center provided early academic governance.


#### Material and operational conditions


**composability**

Protocol-level. VRM is designed as an interoperable protocol layer. Customer Commons provides open-source tools. The intention economy is designed to be composable with existing commercial infrastructure. High conceptual composability but low actual implementation.


**liveness**

Historically significant but practically marginal. The book remains influential in privacy and data sovereignty circles. Customer Commons continues operating. VRM concepts influence Solid Project and data sovereignty movements. But no mainstream implementation exists.


**scale_of_operation**

Theoretically planetary (open protocols), practically small-group (niche adoption). The gap between theoretical scale and actual scale is the central challenge.


**temporality**

Anticipatory (forward-looking intent declarations). The theory itself has a 14-year temporal arc (2006-present) without achieving the adoption its proponents anticipated. Historically significant as a conceptual precursor to data sovereignty movements.


**Uncertain fields:** epistemological_stance, failure_under_attention

---


### VRM (Vendor Relationship Management)

**Brief:** Technical infrastructure for intention-driven commerce. Customer-side CRM.

**Garden Logic relevance:** Architectural analogy. VRM inverts CRM. A(DAI) inverts platform analytics. Both replace 'what do they want from us' with 'what do we intend for ourselves.'

#### Basic identification and classification

- **name**: VRM (Vendor Relationship Management)
- **type**: intention-economy

**originator**

Doc Searls (ProjectVRM), Berkman Klein Center for Internet & Society at Harvard, Customer Commons (nonprofit)


**year**

2006 (term coined by Mike Vizard on Gillmor Gang), 2006-2010 (Searls as Berkman Fellow), 2012 (Customer Commons founded)

- **key_text**: ProjectVRM wiki and documentation; The Intention Economy (Searls, 2012) as the theoretical text
- **key_url**: https://cyber.harvard.edu/projectvrm

#### Core ideas and theoretical positioning


**core_claim**

Customers need their own technical tools for managing relationships with vendors — the customer-side counterpart to CRM — so that individuals bear their share of the relationship burden rather than being managed by corporate systems.


**relation_to_attention_economy**

Direct structural inversion. VRM replaces the CRM logic of targeting, capturing, acquiring, and locking in customers with customer-side tools for declaring needs, setting terms, and choosing vendors. VRM refuses the premise that vendors should 'own' the customer relationship.


**relation_to_commons**

VRM creates a commons of commercial protocols rather than a commons of data. The shared resource is the interoperability standard — any vendor can respond to VRM-formatted intent declarations, preventing platform lock-in and creating open market infrastructure.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Customer-side CRM. VRM tools are applications controlled by the customer that manage personal data, track vendor relationships, declare purchasing intent, and set engagement terms. The architectural pattern is the inversion of the CRM stack from vendor-controlled to customer-controlled.


**data_model**

Personal data stores under customer control. Intent declarations (what the customer wants). Relationship records (history with vendors). Terms of engagement (privacy preferences, communication channels, data sharing rules). All data is customer-owned and customer-controlled.


**temporal_logic**

Relationship lifecycle. VRM tracks vendor relationships over time: discovery, engagement, transaction, post-sale support, and relationship termination. The temporal logic is relational and ongoing rather than transaction-by-transaction.


**absence_handling**

Implicit through intent declaration. When a customer declares a need through VRM, the absence (unmet need) becomes a structured signal. However, VRM does not systematically detect absences in the broader market — it serves individual customers, not market-level gap analysis.


**scalability_model**

Distributed through protocol adoption. VRM is designed as an open protocol that any tool can implement. No central platform — scalability through standardization and interoperability.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate / sensing-loop — VRM's customer-side data management maps to A(DAI)'s substrate (where does contributor data live?), and VRM's intent declaration maps to the sensing loop (how are needs detected and communicated?).


**intention_vs_attention**

Pure intention infrastructure. VRM is the technical implementation of the intention economy — tools that enable customers to declare, manage, and act on their intentions rather than being targeted by vendor attention-capture systems. The entire architecture optimizes for customer intent.


**coherence_vs_consensus**

Individual coherence. Each customer maintains a coherent record of their relationships, preferences, and intentions. There is no collective consensus mechanism — VRM is fundamentally individualistic. This differs from A(DAI)'s field-level coherence, which seeks structural consistency across a community.


**contestability**

High at the individual level. Customers can challenge vendor terms, switch providers, and set their own engagement rules. Low at the systemic level — there is no mechanism for contesting the VRM framework itself or for collective action through VRM tools.


**forkability**

Conceptually high (open protocols), practically unrealized. VRM implementations are too sparse to demonstrate meaningful forking. The open-source nature of Customer Commons tools enables forking in principle.


**tendency_axis_position**

Openness-side (open protocols, interoperability). Individual-side (customer sovereignty, not collective governance). Infrastructure-side (protocol design). Mixed on commons-capture (creates protocol commons but serves individual market participants).


**what_adai_should_adopt**

The inversion pattern: A(DAI) inverts platform analytics the way VRM inverts CRM. Adopt the principle that contributors (the 'customers' of A(DAI)) control their own data and relationship with the commons. Adopt the structured intent declaration as a model for how contributors signal what the field needs.


**what_adai_should_refuse**

The individualism. VRM is fundamentally about individual customer empowerment, not collective sensemaking. A(DAI) needs collective governance of the merge boundary, not just individual contributor sovereignty. Also refuse the commercial framing — A(DAI)'s relationships are not vendor-customer relationships but contributor-commons relationships.


#### Limitations, blind spots, and failure modes


**limits**

Never achieved mainstream adoption. The tools are niche and underdeveloped. The CRM industry is worth billions; VRM has not produced a commercially viable alternative. Customers may prefer the convenience of being managed by vendors over the effort of managing vendors themselves.


#### Governance models and consent architectures


**governance_model**

Open-source community governance (ProjectVRM at Berkman Klein Center). Nonprofit governance through Customer Commons. Academic governance through published principles and community meetings. No corporate governance — VRM has deliberately avoided corporate capture.


#### Material and operational conditions


**composability**

Protocol-level (designed as interoperable standards). Open-source (Customer Commons provides reusable code). High conceptual composability but sparse actual implementations to compose with.


**liveness**

Marginal liveness. ProjectVRM continues at Berkman Klein. Customer Commons maintains institutional continuity. But active development is minimal. Historically significant as a conceptual precursor; practically dormant as a technology movement.


**scale_of_operation**

Small-group in practice. Individual tool users and a small community of developers and advocates. Theoretically designed for planetary scale through open protocols.


**temporality**

20-year arc (2006-2026) without achieving intended adoption. Historically significant for seeding data sovereignty concepts that appear in Solid Project, GDPR, and data portability movements. The temporal logic is that of a precursor movement whose ideas outlive its implementations.


**Uncertain fields:** epistemological_stance, failure_under_attention, who_is_excluded

---


### Solid Project (Tim Berners-Lee)

**Brief:** Personal data pods. Users control their data. Decouples apps from data.

**Garden Logic relevance:** The fork right as data sovereignty. Solid's pods are personal; A(DAI)'s forks are institutional. Same principle: sovereignty over your own view of the data.

#### Basic identification and classification

- **name**: Solid Project (Tim Berners-Lee)
- **type**: intention-economy
- **originator**: Tim Berners-Lee (MIT, then Inrupt), Open Data Institute (ODI, from October 2024)
- **year**: 2016 (initial development at MIT), 2018 (Inrupt founded), 2024 (transferred to ODI)

**key_text**

Solid Technical Reports (W3C community group specifications); This Is For Everyone (Berners-Lee, September 2025)

- **key_url**: https://solidproject.org/

#### Core ideas and theoretical positioning


**core_claim**

Users should control their own data through personal online data stores (pods), decoupling applications from data so that apps read from user-controlled pods rather than platform-controlled databases.


**relation_to_attention_economy**

Direct architectural refusal. Solid removes the data substrate that the attention economy depends on — if user data lives in pods rather than platform databases, platforms cannot accumulate the behavioral surplus that feeds attention optimization. Berners-Lee explicitly frames Solid as a counter to AI systems built on platform data hoards.


**relation_to_commons**

Individual data sovereignty within an interoperable protocol commons. Each pod is individually sovereign, but the Solid protocol itself is a shared standard (commons). This creates a commons of infrastructure that protects individual autonomy — the protocol is shared, the data is not.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Decentralized data pods + linked data protocols. Users store data in pods (WebID-TLS authenticated). Applications request access to specific data. Pods can be self-hosted, cloud-hosted, or institutionally hosted. Built on semantic web standards (RDF, SPARQL, linked data).


**data_model**

Linked data (RDF triples) stored in user-controlled pods. Data is structured according to vocabularies (ontologies) that enable interoperability. Access control is granular — users specify which applications can read/write which data. The data model is the semantic web vision applied to personal data.


**temporal_logic**

Persistent and user-managed. Data in pods persists as long as the user maintains the pod. Temporal tracking depends on application-level implementation. No built-in versioning or temporal logic in the core protocol, though applications can implement it.


**absence_handling**

Not a first-class concern. Solid focuses on presence (user data exists and is accessible) rather than absence. If data does not exist in a pod, it simply is not there — the system does not detect or signal absences. Gap detection would need to be built at the application layer.


**scalability_model**

Federated through pod distribution. Each pod is independently operated. The protocol enables interoperability across pods. Scales through adoption of the Solid standard, not through centralized infrastructure growth.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate — Solid maps to A(DAI)'s substrate layer as an infrastructure for data sovereignty. A(DAI) contributors could store their signal data in Solid pods, maintaining control over their contributions while making them available to the commons through access grants.


**intention_vs_attention**

Intention-enabling through data sovereignty. Solid does not generate intention directly, but by giving users control over their data, it enables them to act on their intentions rather than being acted upon by attention systems. The architectural choice is to enable intention by removing the conditions for attention capture.


**coherence_vs_consensus**

Neither at the protocol level. Solid provides infrastructure, not interpretation. Coherence or consensus is delegated to applications built on top of pods. The protocol itself is neutral — it enables data storage and access control without imposing interpretive frameworks.


**contestability**

High for data access. Users can revoke access, modify data, and control what applications see. Low for the protocol itself — the Solid standard is governed by W3C community processes and is not easily contested by individual users.


**forkability**

The fork right as data sovereignty. Users can move their pods to different hosts, export their data, and grant/revoke access. This is a strong form of exit-based forkability — the user can always leave with their data. However, application-level functionality depends on ecosystem adoption, limiting practical forkability.


**tendency_axis_position**

Strongly openness-side (open standards, W3C governance). Individual-side (personal data sovereignty). Infrastructure-side (protocol design). Commons-side for the protocol, individual-side for the data.


**what_adai_should_adopt**

The decoupling principle: separate data from applications. A(DAI) should design its architecture so that the intelligence graph can be accessed by multiple applications without any application 'owning' the data. Also consider Solid pods as a model for contributor-controlled signal storage — contributors could maintain their own signal pods that grant access to A(DAI)'s processing pipeline.


**what_adai_should_refuse**

The individual-sovereignty-only model. A(DAI) is a commons, not a collection of individual pods. The merge boundary requires collective governance, not just individual access control. Solid's pod model does not address the question of how individually contributed data becomes collective intelligence. Also refuse the semantic web overhead — RDF/SPARQL may be too heavy for A(DAI)'s signal pipeline.


#### Limitations, blind spots, and failure modes


**limits**

Not ready for mainstream adoption as of 2024-2025. Pod hosting services remain experimental. The semantic web stack (RDF, SPARQL) has a steep learning curve. Inrupt's commercial approach and the transfer to ODI suggest organizational instability. Network effects favor existing platforms — users have little incentive to move to pods without a critical mass of Solid-compatible applications.


#### Governance models and consent architectures


**governance_model**

Transitioning from startup governance (Inrupt) to institutional governance (ODI). W3C community group governs the protocol specification. Open-source community contributes implementations. The governance transition (October 2024) suggests the project needed more institutional stability than a startup could provide.


#### Material and operational conditions


**composability**

Protocol-level. Solid is designed as a standard that any application can build on. Pods are composable units of data storage. The semantic web foundation (RDF) enables data interoperability. However, the ecosystem is too immature for practical composability — few applications exist to compose with.


**liveness**

Actively developed but not mature. Transferred to ODI in October 2024 for better institutional support. Berners-Lee published advocacy book in September 2025. Active community development. But still described as 'not ready for general adoption' by developers who have tried to use it.


**scale_of_operation**

Pilot-scale. Early adopters, government pilot projects (Belgium, UK health services), and institutional experiments. Not yet at field-level adoption. The gap between the vision (planetary data sovereignty) and the reality (experimental pilots) is significant.


**temporality**

Long development arc (2016-present) with slow maturation. The vision is forward-looking but the implementation timeline has repeatedly extended. Berners-Lee's 2025 book represents a renewed push, but the temporal question is whether Solid can achieve adoption before platform lock-in becomes irreversible.


**Uncertain fields:** epistemological_stance, failure_under_attention, who_is_excluded

---


### Protocol Labs / IPFS / Filecoin

**Brief:** Decentralized storage and addressing. Content-addressed data. Persistence infrastructure.

**Garden Logic relevance:** Infrastructure layer for forkable commons. If the graph is content-addressed (IPFS), forks become lightweight and provenance is mathematical.

#### Basic identification and classification

- **name**: Protocol Labs / IPFS / Filecoin
- **type**: intention-economy
- **originator**: Juan Benet (Protocol Labs), open-source community
- **year**: 2014 (Protocol Labs founded), 2015 (IPFS launched), 2020 (Filecoin mainnet)

**key_text**

IPFS - Content Addressed, Versioned, P2P File System (Benet, 2014); Filecoin: A Decentralized Storage Network (Protocol Labs, 2017 whitepaper)

- **key_url**: https://www.protocol.ai/

#### Core ideas and theoretical positioning


**core_claim**

Data should be addressed by content (what it is) rather than by location (where it is stored), enabling decentralized, verifiable, and persistent storage that does not depend on any single server or platform.


**relation_to_attention_economy**

Indirect but structural. Content-addressing removes the platform's monopoly on data hosting, which is the physical infrastructure that attention economics depends on. If content can be retrieved from any node that has it, platform lock-in weakens and attention-capturing intermediaries lose leverage.


**relation_to_commons**

Infrastructure commons. IPFS is an open protocol that anyone can join. Filecoin adds an economic layer but the protocol itself remains a commons. Content-addressed storage creates a shared namespace where content is identified by its cryptographic hash — the addressing system is inherently common.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Peer-to-peer content-addressed storage. IPFS uses content identifiers (CIDs) based on cryptographic hashes. Data is distributed across nodes. Filecoin adds proof-of-storage (PoRep, PoSt) and economic incentives. Interplanetary Consensus (IPC) enables subnets for scalability.


**data_model**

Content-addressed objects linked by Merkle DAGs (directed acyclic graphs). Each object is identified by its CID. IPLD (InterPlanetary Linked Data) provides a data model for linking content-addressed data across protocols. Objects can be files, directories, or structured data.


**temporal_logic**

Versioning through content-addressing. Different versions of the same content have different CIDs. IPNS (InterPlanetary Name System) provides mutable pointers to immutable content, enabling evolving content while preserving version history. The temporal logic is version-chain-based.


**absence_handling**

Data absence is visible through CID resolution failure — if no node has the content for a CID, the retrieval fails. Filecoin's storage deals create contractual obligations for data persistence, making absence a contract violation rather than an invisible state. Pinning services ensure data remains available.


**scalability_model**

Distributed through peer-to-peer networking. Filecoin has grown to 3,300+ storage providers and 12+ exabytes of capacity. IPC enables recursive subnets for horizontal scaling. The economic incentive layer (FIL tokens) drives storage provision at scale.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate — IPFS/Filecoin maps to A(DAI)'s substrate as potential persistence and distribution infrastructure. The intelligence graph could be stored on IPFS, making it content-addressed, verifiable, and distributed.


**intention_vs_attention**

Infrastructure-neutral but intention-enabling. Content-addressing does not optimize for either attention or intention, but it removes platform intermediaries that optimize for attention. By making content self-verifiable and distributed, IPFS enables systems that serve structural needs rather than engagement metrics.


**coherence_vs_consensus**

Protocol-level consensus (Filecoin uses consensus mechanisms for storage proofs). Content-level neutrality — IPFS does not interpret or organize content, it only stores and retrieves. Any coherence or consensus must be built in application layers above IPFS.


**contestability**

Immutability makes content uncontestable at the storage level — a CID always refers to the same content. However, mutable pointers (IPNS) allow the reference to change, enabling updates and corrections. Contestation happens at the naming layer, not the storage layer.


**forkability**

Excellent. Content-addressed storage is inherently forkable — anyone can pin any content, create alternative indexes, or build competing applications on the same data. The data is protocol-level accessible, not application-level locked. Fork rights are architectural, not just policy.


**tendency_axis_position**

Strongly openness-side (open protocol, open source). Distributed on individual-distributed (peer-to-peer, no central authority). Infrastructure-side (protocol infrastructure). Commons-side for the protocol, mixed for Filecoin's economic layer (cryptocurrency speculation introduces capture dynamics).


**what_adai_should_adopt**

Content-addressing for the intelligence graph. If graph-data.json had a CID, any version could be verified, any fork could reference the exact state it diverged from, and provenance chains would be cryptographically verifiable. Also consider IPFS as distribution infrastructure for the public-facing graph.


**what_adai_should_refuse**

The cryptocurrency-incentive layer. Filecoin's token economics introduce speculation, financialization, and complexity that are orthogonal to A(DAI)'s mission. A(DAI) should not require contributors to hold tokens or participate in cryptocurrency markets. Also refuse the 'store everything forever' assumption — A(DAI)'s intelligence graph should be curated, not merely accumulated.


#### Limitations, blind spots, and failure modes


**limits**

Adoption challenges: Brave removed IPFS support in 2024 due to low usage. Content availability depends on nodes pinning data — without pinning, content disappears when nodes go offline. Filecoin's economic model is tied to cryptocurrency markets and their volatility. Performance (retrieval speed) lags behind centralized CDNs.


#### Governance models and consent architectures


**governance_model**

Open-source protocol governance for IPFS. Cryptocurrency-based governance for Filecoin (FIL token holders, Filecoin Foundation). Protocol Labs has transitioned toward a decentralized innovation network with 600+ organizations. Hybrid open-source/crypto governance.


#### Material and operational conditions


**composability**

Protocol-level composability. IPFS is designed as infrastructure that any application can build on. IPLD enables cross-protocol data linking. Multiple applications can read the same content-addressed data. High composability by design.


**liveness**

Actively maintained. IPFS continues development. Filecoin has an active ecosystem (3,300+ storage providers). Protocol Labs network expanding. However, browser support declining (Brave dropped IPFS in 2024). Active but facing adoption headwinds.


**scale_of_operation**

Planetary infrastructure. Filecoin: 12+ exabytes of storage capacity. IPFS: millions of end users, tens of thousands of developers. Protocol Labs network: 600+ organizations. Operating at significant scale despite adoption challenges.


**temporality**

Version-chain temporality through content-addressing. Each CID is a permanent timestamp of content state. The protocol has a 10-year development arc (2015-2025). Forward-looking through IPC and FVM developments. The temporal logic is append-only — history is preserved through immutable content identifiers.


**Uncertain fields:** consent_architecture, failure_under_attention, extraction_vector

---


### Ostrom's Commons Governance (Governing the Commons, 1990)

**Brief:** 8 design principles for managing shared resources. Polycentric governance. Nobel 2009.

**Garden Logic relevance:** The theoretical backbone. A(DAI)'s merge boundary IS Ostrom's governance boundary. The question is whether 'governance at the gate, not inside the data' satisfies Ostrom's principles.

#### Basic identification and classification

- **name**: Ostrom's Commons Governance (Governing the Commons, 1990)
- **type**: intention-economy
- **originator**: Elinor Ostrom (Indiana University, Workshop in Political Theory and Policy Analysis)
- **year**: 1990 (Governing the Commons published), 2009 (Nobel Prize in Economics)

**key_text**

Governing the Commons: The Evolution of Institutions for Collective Action (Cambridge University Press, 1990)

- **key_url**: https://www.cambridge.org/core/books/governing-the-commons/A8BB63BC4A1433A54A3D35121B0FDA72

#### Core ideas and theoretical positioning


**core_claim**

Commons resources are not doomed to the 'tragedy of the commons' — communities can and do develop self-governing institutions to manage shared resources sustainably, provided certain design principles are met.


**relation_to_attention_economy**

Foundational critique by implication. The attention economy treats attention as a rivalrous resource captured by platforms — this is the 'tragedy of the commons' logic that Ostrom debunked. Ostrom's work shows that shared resources need not be privatized or state-controlled; they can be community-governed.


**relation_to_commons**

THE theory of commons governance. Ostrom documented 800+ cases of successful commons management worldwide, from Swiss Alpine meadows to Japanese mountain forests to Philippine irrigation systems. She proved that commons can be sustainably governed through polycentric, community-designed institutions.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Polycentric governance framework. Eight design principles define the institutional conditions for successful commons. The architecture is nested: local governance for local resources, with coordination between governance levels. The pattern is fractal — the principles apply at any scale.


**data_model**

Institutional analysis: rules-in-use, action situations, resource systems, resource units, governance systems, users. The Institutional Analysis and Development (IAD) framework provides a structured vocabulary for analyzing commons governance. Ostrom's data model is about governance structures, not data per se.


**temporal_logic**

Evolutionary-institutional. Governance institutions evolve over time through community experimentation, adaptation, and learning. The temporal logic is generational — successful commons have been managed for centuries through slowly evolving rule systems. Change is incremental and adaptive, not revolutionary.


**absence_handling**

Through monitoring (Principle 4). The design principles require monitoring of both resource conditions and rule compliance. Absence of monitoring leads to commons degradation. The system detects governance absence (missing monitors, unenforced rules) as a signal of institutional failure.


**scalability_model**

Polycentric. Governance scales through nested enterprises (Principle 8) — local governance for local resources, with coordination between levels. Not centralized scaling but multi-scale governance. Each level has its own rules appropriate to its scope.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

participation — Ostrom's governance principles map directly to A(DAI)'s participation layer. The merge boundary IS Ostrom's governance boundary: a clearly defined boundary (Principle 1) around a resource system with rules for participation, monitoring, and dispute resolution.


**intention_vs_attention**

Intention through governance design. Ostrom's communities do not optimize for engagement or attention — they design rules that serve collective benefit over time. The intention is sustainability and collective welfare. This is structural intention at the governance level, not individual intention at the transaction level.


**coherence_vs_consensus**

Community-level consensus through collective choice (Principle 3). Ostrom's design principles require that those affected by governance rules participate in making them. This is democratic consensus, but at the community scale rather than the universal scale. Coherence emerges from sustained institutional practice, not from formal logical consistency.


**contestability**

Built-in through fast and fair conflict resolution (Principle 6) and graduated sanctions (Principle 5). Ostrom's commons are not harmony-seeking — they expect and accommodate conflict. Conflict resolution mechanisms are a design requirement, not an afterthought. Counter-signals (rule violations, complaints) are first-class governance inputs.


**forkability**

Not a concept in Ostrom's framework directly, but exit and voice are recognized. If governance fails, community members can exit (create a new commons) or voice (challenge rules through Principle 3 collective choice). The polycentric structure enables governance experimentation — different communities can try different rules.


**tendency_axis_position**

The theoretical backbone of A(DAI)'s tendency positioning. Strongly commons-side (the entire theory is about commons governance). Infrastructure-side (governance design is institutional infrastructure). Distributed on individual-distributed (polycentric, multi-scale). Openness-side (community self-governance against both privatization and state control).


**what_adai_should_adopt**

All eight design principles as the governance framework for the merge boundary. Specifically: (1) clearly defined boundaries for the commons and its contributors; (2) proportional benefits and costs for contributors; (3) collective choice in governance rules; (4) monitoring of signal quality and rule compliance; (5) graduated sanctions for bad-faith contributions; (6) fast and fair dispute resolution; (7) autonomy from external platform control; (8) nested governance for multi-scale operation.


**what_adai_should_refuse**

The assumption that commons governance requires centuries of evolution. A(DAI) must design its governance intentionally rather than waiting for it to emerge organically. Also refuse the assumption that commons resources are always physical/natural — Ostrom studied forests, fisheries, and irrigation, but digital commons have different characteristics (non-rival, easily copied, globally accessible) that require adaptation of the principles.


#### Limitations, blind spots, and failure modes


**limits**

Developed for small-to-medium scale natural resource commons. Application to large-scale digital commons is underexplored. The principles are descriptive (what worked historically) rather than prescriptive (what will work in novel contexts). Digital commons characteristics (non-rivalry, zero-cost copying, global access) challenge several principles designed for rival, local resources.


#### Governance models and consent architectures


**governance_model**

Polycentric commons governance. The canonical model: community-designed rules with clear boundaries, monitoring, sanctions, conflict resolution, and nested governance. This IS the governance model that A(DAI) should adapt.


#### Material and operational conditions


**composability**

Framework-level composability. The eight principles can be adapted to different contexts, scales, and resource types. The IAD framework provides analytical tools that compose with other governance analyses. Widely used in political science, economics, and environmental governance.


**liveness**

Ostrom died in 2012, but her work is more alive than ever. Active research community (Ostrom Workshop at Indiana University continues). Widespread policy influence. Growing application to digital commons (Wikipedia governance, open-source communities). The framework is being actively extended and adapted.


**scale_of_operation**

Multi-scale by design. Case studies ranged from village-level irrigation to national-level resource management. The polycentric governance model explicitly addresses scale through nested enterprises. Application to planetary-scale digital commons is a current research frontier.


**temporality**

Deep historical perspective. Ostrom studied commons governance institutions that had persisted for centuries. The temporal logic is evolutionary — institutions adapt slowly through community learning. This deep temporality contrasts with digital systems' rapid change cycles.


**Uncertain fields:** who_is_excluded, failure_under_attention

---


### IEEE 7012 / MyTerms (Doc Searls, 2025)

**Brief:** Machine-readable personal privacy terms standard. Individuals set terms for data use. Most concrete technical artifact of the intention economy.

**Garden Logic relevance:** The technical layer A(DAI)'s consent architecture could adopt. If contributors set machine-readable terms on their signals, the merge boundary can enforce them automatically.

#### Basic identification and classification

- **name**: IEEE 7012 / MyTerms (Doc Searls, 2025)
- **type**: intention-economy
- **originator**: Doc Searls, Customer Commons, IEEE Society on Social Implications of Technology
- **year**: 2025
- **key_text**: IEEE 7012-2025 Standard for Machine Readable Personal Privacy Terms
- **key_url**: https://myterms.info/

#### Core ideas and theoretical positioning


**core_claim**

Individuals should set machine-readable privacy terms that organizations must agree to, inverting the current consent model where users accept corporate terms.


**relation_to_attention_economy**

Directly opposes the attention economy's data extraction model by giving individuals contractual control over what data can be collected and how it can be used, eliminating the surveillance infrastructure that powers attention-based advertising.


**relation_to_commons**

Frames privacy as a contractual right exercised by sovereign individuals rather than as a commons-managed resource; the standard itself is freely available (IEEE GET Program) but the model is individual-first, not collective-first.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Protocol — machine-readable contract exchange between agents (browser plugins, AI agents, digital wallets) on both sides, modeled after Creative Commons' three-layer readability (human, lawyer, machine).


**data_model**

Standardized contract terms selected from a roster maintained by an independent non-business entity. Terms are machine-readable, structured as agreements between first-party (individual) and second-party (service provider).


**temporal_logic**

Contractual — terms are set at the point of interaction and persist as long as the relationship exists. No cyclical or anticipatory logic; agreements are static once formed.


**absence_handling**

If no agreement is reached, no data exchange occurs. The system defaults to refusal rather than consent — absence of agreement means absence of access.


**scalability_model**

Protocol-level — scales through adoption like TCP/IP or HTTP. Decentralized execution but relies on a centralized roster of standard-form agreements maintained by a neutral entity.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

participation — MyTerms governs the terms under which contributors interact with the system, directly relevant to A(DAI)'s merge boundary.


**intention_vs_attention**

Strongly intention-aligned. MyTerms operationalizes individual intention as machine-readable terms — the person declares what they want, not what the system wants from them. However, it frames intention as individual preference rather than structural diagnosis. A(DAI)'s intention is about surfacing gaps in a field; MyTerms' intention is about personal data sovereignty. The alignment is real but the scope differs: MyTerms handles the consent layer, not the intelligence layer.


**coherence_vs_consensus**

Neither — MyTerms seeks bilateral agreement between two parties, not systemic coherence or collective consensus. Each agreement is sovereign and local.


**contestability**

High at the individual level — each person can set and modify their own terms. But the roster of available terms is maintained by a neutral entity, and the process for contesting or adding new term types is institutional rather than open.


**forkability**

The standard is open (freely available via IEEE GET Program), but the roster of terms is centrally maintained. A fork would need its own neutral roster entity. The protocol layer is forkable; the governance layer is not.


**tendency_axis_position**

openness (protocol is open, standard is free) but individual rather than commons (each person sets their own terms, no collective negotiation). Anti-enclosure in intent but does not build shared infrastructure. Infrastructure over spectacle.


**what_adai_should_adopt**

The merge boundary should support machine-readable contributor terms. If a contributor declares their signal can only be used under specific conditions (e.g., non-commercial, attribution-required, no AI training), the merge boundary should enforce these terms automatically. The three-layer readability model (human-readable, lawyer-readable, machine-readable) is directly applicable to A(DAI)'s provenance standards.


**what_adai_should_refuse**

The purely individualistic framing. MyTerms treats each person as a sovereign contracting party, which is appropriate for privacy but insufficient for a commons. A(DAI) needs collective consent mechanisms (data trusts, cooperative governance) alongside individual terms. Also refuse the assumption that a neutral third-party roster can remain neutral at scale — this is a governance challenge MyTerms has not yet solved.


#### Limitations, blind spots, and failure modes


**limits**

Requires adoption by both individuals and organizations. The standard has been in development for nine years and adoption remains nascent. Relies on a neutral roster entity that could become a bottleneck or capture point. Does not address power asymmetries — a user's terms are only meaningful if the service actually needs them.


#### Governance models and consent architectures


**governance_model**

Sovereign individual with protocol-level coordination. The standard is maintained by IEEE (institutional), the roster by Customer Commons (non-profit), but execution is individual.


#### Material and operational conditions


**composability**

Protocol-level — designed to be embedded in any browser, wallet, or AI agent. Highly composable as a standard but requires ecosystem adoption.

- **liveness**: Active — published January 2026, with MyTerms Alliance forming. Early-stage adoption.
- **scale_of_operation**: Individual (by design) with aspirations to planetary (like TCP/IP). Currently pre-scale.

**temporality**

Contractual — agreements formed at interaction time, persist during relationship. No deep historical or anticipatory dimension.


**Uncertain fields:** who_is_excluded, failure_under_attention, consent_architecture

---


### Chaudhary & Penn — 'Beware the Intention Economy' (Harvard Data Science Review, 2024)

**Brief:** Redefines 'intention economy' as LLM-driven commodification of intent through latent persuasion, sycophancy, hyper-personalization. INVERTS Searls' formulation.

**Garden Logic relevance:** THE critical counterpoint. If LLMs can manufacture intention (not just capture attention), then A(DAI)'s claim to generate intention must address the possibility that its own Claude-powered prompts are a form of intention manufacturing. The system must demonstrate that its prompts surface existing structural gaps rather than create new desires.

#### Basic identification and classification

- **name**: Chaudhary & Penn — 'Beware the Intention Economy' (Harvard Data Science Review, 2024)
- **type**: intention-economy
- **originator**: Yaqub Chaudhary, Jonnie Penn (University of Cambridge)
- **year**: 2024
- **key_text**: Beware the Intention Economy: Collection and Commodification of Intent via Large Language Models
- **key_url**: https://hdsr.mitpress.mit.edu/pub/ujvharkk

#### Core ideas and theoretical positioning


**core_claim**

LLMs enable a new marketplace where human intention itself is commodified through hyper-personalized sycophancy, latent persuasion, and behavioral profiling — extending the attention economy into the temporal arc of desire.


**relation_to_attention_economy**

Positions the 'intention economy' as the attention economy's temporal extension — not its opposite. Where attention captures the present moment, intention economy captures the arc of attention over time: how preferences change, calcify, and connect to behavioral patterns. LLMs are the instrument that makes intention legible and therefore commodifiable.


**relation_to_commons**

Implicitly critical — the paper shows how intent data becomes private corporate asset. No commons framework is proposed; the analysis is diagnostic rather than prescriptive.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Diagnostic framework — not a system architecture but an analysis of how LLM architectures (predictive completion, personalization, natural language interaction) create infrastructure for intent capture.


**data_model**

Intent signals extracted from natural language interaction — cadence, vocabulary, politics, age, gender, preferences for sycophancy — combined with brokered advertising bids to maximize persuasive outcomes.


**temporal_logic**

The key insight: intention economy operates across time scales. Some intentions are fleeting, others persist. The discretization of intention trajectories over time is what makes them valuable to advertisers — predicting not just current attention but future desire.


**absence_handling**

Does not model absence directly, but identifies a crucial absence: the absence of user awareness that their intent is being profiled. The paper reveals the invisible infrastructure of intent extraction.


**scalability_model**

Centralized — the paper describes how established tech players with infrastructure and data capacity compete for first-mover advantage in intent commodification.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

none — this is a critical analysis, not a system. But it maps directly onto the critique layer that A(DAI) must internalize: the paper describes exactly what A(DAI)'s prompt-generation layer must NOT become.


**intention_vs_attention**

THE critical inversion. Chaudhary and Penn redefine 'intention economy' as the commodification of intent through LLMs — the exact opposite of Searls' original formulation where individuals exercise sovereign intent. In their reading, the intention economy is attention economy 2.0: deeper, more personalized, operating on the temporal arc of desire rather than the momentary capture of attention. A(DAI) claims to generate 'intention' (structural diagnosis of gaps), but this paper forces the question: whose intention? If A(DAI)'s prompts surface gaps that happen to align with market opportunities, is that structural diagnosis or latent persuasion? The distinction is existential for the project.


**coherence_vs_consensus**

Neither — the paper is diagnostic. But it implicitly warns against systems that create false coherence through sycophantic alignment with user preferences.


**contestability**

The paper itself is highly contestable and has generated debate (Doc Searls responded critically). The analysis is positioned as a contribution to ongoing discourse, not a final verdict.


**forkability**

As academic analysis, it is freely available and citeable. The framework can be adopted, extended, or contested by anyone.


**tendency_axis_position**

Critical infrastructure — reveals the extractive mechanisms beneath the surface of 'helpful' AI. Anti-spectacle in method (academic analysis) but describes spectacular capture mechanisms. Commons-aligned in diagnosis but offers no commons alternative.


**what_adai_should_adopt**

The temporal analysis of intent — A(DAI) should understand that its prompts operate on trajectories of meaning over time, not just momentary signals. The sycophancy critique: A(DAI) must build anti-sycophancy into its prompt layer, ensuring that coherence prompts surface genuinely missing structural connections rather than confirming existing preferences. The 'latent persuasion' concept: even without explicit persuasive intent, the structure of LLM responses shapes user thinking. A(DAI) should make its prompts' structural assumptions transparent and contestable.


**what_adai_should_refuse**

The implicit fatalism — the paper diagnoses commodification but offers no alternative architecture. A(DAI) should not accept that any LLM-mediated system necessarily commodifies intent. The refusal should be operational: build systems where the gap between 'structural diagnosis' and 'desire creation' is visible, auditable, and challengeable by contributors.


#### Limitations, blind spots, and failure modes


**limits**

The paper is diagnostic without being prescriptive — it identifies the problem but offers no alternative architecture. The analysis focuses on advertising-driven intent capture and may underweight non-commercial applications of LLMs. The 'sycophancy' framing may overstate LLM agency — these are systems tuned by humans for specific outcomes.


#### Governance models and consent architectures


**governance_model**

Academic analysis — no governance model proposed. Implicitly critiques the corporate governance of LLM platforms and the absence of democratic oversight over intent commodification.


#### Material and operational conditions


**composability**

Academic paper — freely citeable and extensible. The analytical framework can be applied to any LLM-mediated system.


**liveness**

Active — published December 2024, generating ongoing debate. Part of a special issue on generative AI.

- **scale_of_operation**: Field-level analysis of planetary-scale platforms.

**temporality**

The paper's core contribution is temporal: it shows how the intention economy extends attention capture across time, profiling the arc of desire rather than the moment of engagement.


**Uncertain fields:** who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### Data Cooperatives as AI Governance (Harvard Ash Center, 2024)

**Brief:** Cooperative ownership models for collective data control. Superset, Cohere Aya as examples. Democratic governance of AI resources.

**Garden Logic relevance:** Alternative governance model for the merge boundary. Instead of steward-governed, the commons could be cooperative-governed. Tests whether A(DAI)'s founding team model scales.

#### Basic identification and classification

- **name**: Data Cooperatives as AI Governance (Harvard Ash Center, 2024)
- **type**: intention-economy
- **originator**: Danielle Allen, Sarah Hubbard, Harvard Ash Center / Allen Lab for Democracy Renovation
- **year**: 2024
- **key_text**: Cooperative Paradigms for Artificial Intelligence (essay collection and conference proceedings)
- **key_url**: https://ash.harvard.edu/resources/cooperative-paradigms-for-artificial-intelligence/

#### Core ideas and theoretical positioning


**core_claim**

Cooperative ownership structures — at the cloud, data, and governance layers of the AI stack — provide a democratic alternative to concentrated corporate control of AI development.


**relation_to_attention_economy**

Opposes the attention economy indirectly by proposing alternative ownership structures that would prevent the concentration of data and compute power that enables attention-driven business models. If data is cooperatively owned, it cannot be unilaterally monetized through surveillance advertising.


**relation_to_commons**

Directly commons-aligned. Data cooperatives enable collective ownership and governance of data as a shared resource. The model draws on cooperative traditions (worker-owned, consumer-owned) applied to digital assets. Frames data as a collective resource requiring collective governance rather than individual property or corporate asset.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Cooperative governance layered onto the AI stack — cloud cooperatives, data cooperatives, and governance cooperatives operating at different levels. Polycentric rather than monolithic.


**data_model**

Pooled data governed by cooperative members. Members contribute data and collectively decide how it is used, who can access it, and under what terms. Bargaining power derives from aggregation.


**temporal_logic**

Institutional — cooperatives are durable structures designed for long-term collective governance. Decisions accumulate over time through democratic processes. No real-time or anticipatory logic.


**absence_handling**

Cooperatives address the absence of democratic voice in AI governance by creating structures for collective decision-making. The model identifies the structural gap between individual data subjects and corporate AI developers and fills it with cooperative intermediaries.


**scalability_model**

Federated — cooperatives can form at multiple scales and federate upward. Individual data cooperatives can join regional or sectoral federations. The model is explicitly designed to scale through federation rather than centralization.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

participation — directly relevant to how A(DAI)'s contributor community governs the merge boundary and the intelligence commons.


**intention_vs_attention**

Intention-aligned in governance structure — cooperative members collectively determine their intentions for data use rather than having their attention extracted. However, the model is about governance of data, not about what intelligence is produced from it. A cooperative could still produce attention-optimized outputs if its members chose to. The intention alignment is structural (who decides) rather than epistemic (what is produced).


**coherence_vs_consensus**

Consensus-oriented — cooperatives typically operate through democratic voting, one-member-one-vote. This seeks agreement on governance decisions rather than structural coherence across multiple interpretations. The consensus model may suppress minority positions or frontier signals that challenge majority assumptions.


**contestability**

Formally high — cooperative governance includes voice, vote, and exit mechanisms. But in practice, cooperatives can develop internal oligarchies, and the democratic process may disadvantage members without time or expertise to participate.


**forkability**

Cooperatives can split (as any organization can), but data cooperatives face unique challenges: if the data pool is the asset, forking means either duplicating the pool (legally complex) or splitting it (reducing value). Forkability is structurally constrained by the nature of pooled data.


**tendency_axis_position**

commons over capture (by design), distributed over individual (cooperative governance), infrastructure over spectacle (institutional rather than platform). But cooperatives can become enclosures themselves — a cooperative that controls access to a critical data pool is a monopoly with democratic governance, not an open commons.


**what_adai_should_adopt**

The cooperative governance model for the merge boundary — rather than founding-team control, A(DAI) could transition merge boundary parameters to cooperative governance where contributors vote on processing rules. The federated structure: scene-level cooperatives that federate into a field-level commons maps directly onto A(DAI)'s CR-SQLite Matryoshka architecture (practitioner DBs ← scene DBs ← field DB). The concept of 'data as collective bargaining asset' could inform how A(DAI) negotiates Mode 2 advisory relationships.


**what_adai_should_refuse**

Pure consensus governance — A(DAI) needs to preserve space for frontier signals and minority positions that a majority might vote to suppress. Democratic governance of the merge boundary should not extend to democratic governance of what counts as valid intelligence. Also refuse the assumption that cooperative governance automatically produces commons outcomes — cooperatives can become exclusionary clubs. A(DAI) needs explicit mechanisms for openness that override cooperative self-interest.


#### Limitations, blind spots, and failure modes


**limits**

Cooperatives require significant institutional infrastructure — legal frameworks, governance processes, member engagement mechanisms. They can be slow to form and slow to adapt. Data cooperatives specifically face unresolved questions about data valuation, member contribution accounting, and exit rights. The model assumes members have aligned interests, but in practice AI governance involves deeply contested values.


#### Governance models and consent architectures


**governance_model**

Polycentric commons — cooperative ownership at multiple layers (cloud, data, governance) with democratic decision-making. Draws on Ostrom's commons governance principles applied to digital resources.


#### Material and operational conditions


**composability**

Institutional — cooperatives are legally constituted entities that can be composed through federation but are not technically modular. Interoperability depends on legal agreements between cooperatives rather than protocol-level composability.


**liveness**

Active — the Ash Center work was published in 2024 with ongoing conference proceedings and policy development. The broader data cooperative movement is growing but still early-stage.


**scale_of_operation**

Multi-scale — designed to operate from small group (local data cooperative) through institutional (sector-specific cooperatives) to field-level (federated cooperatives).


**temporality**

Institutional — cooperatives operate on governance timescales (annual meetings, election cycles, strategic planning periods). Deep historical roots in cooperative movement (19th century onward) but no anticipatory or tidal temporal logic.


**Uncertain fields:** who_is_excluded, failure_under_attention, extraction_vector, consent_architecture

---


### Platform Cooperativism (Scholz, 2014->)

#### Basic identification and classification

- **name**: Platform Cooperativism (Scholz, 2014->)
- **type**: intention-economy

**originator**

Trebor Scholz (The New School, Berkman Klein Center), Platform Cooperativism Consortium (PCC), Institute for the Cooperative Digital Economy (ICDE)

- **year**: 2014 (concept introduced), 2018 (PCC founded), 2023 (Own This! published)

**key_text**

Own This! How Platform Cooperatives Help Workers Build a Democratic Internet (Verso, 2023); Platform Cooperativism (Rosa Luxemburg Stiftung, 2014)

- **key_url**: https://platform.coop/

#### Core ideas and theoretical positioning


**core_claim**

Digital platforms should be collectively owned and democratically governed by their workers and users — applying cooperative principles to platform technology to create alternatives to extractive platform capitalism.


**relation_to_attention_economy**

Structural alternative. Platform cooperatives replace attention-optimized platforms with worker/user-governed alternatives. Instead of optimizing for engagement to extract behavioral surplus, cooperatives optimize for member benefit. The governance structure determines the optimization target.


**relation_to_commons**

Cooperative ownership as commons governance. Platform cooperatives create digital commons governed by their members through democratic processes. The platform itself (code, data, infrastructure) is collectively owned. This is a specific institutional form of commons governance — the cooperative model applied to digital infrastructure.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Democratic governance layer on platform technology. The technical architecture of cooperative platforms may resemble conventional platforms (web applications, mobile apps, databases), but the governance layer is radically different: worker ownership, democratic decision-making, profit-sharing.


**data_model**

Varies by implementation. Driver's Cooperative uses standard ride-hailing data models. Up&Go uses domestic work scheduling data. The data model is not the innovation — the governance model is. However, cooperatives may implement data portability and user data ownership by design.


**temporal_logic**

Institutional lifecycle. Cooperatives have founding, growth, governance evolution, and potential dissolution phases. The temporal logic is organizational rather than technological. PCC's recent shift (2023-2025) toward AI governance demonstrates institutional adaptation.


**absence_handling**

Democratic identification of gaps. Cooperatives identify missing services and unmet needs through member governance processes. Worker-members know what their communities need because they are part of those communities. Absence detection is embedded in democratic practice.


**scalability_model**

Federated cooperative networks. Individual cooperatives operate locally; federations and consortia coordinate regionally and globally. PCC facilitates global networking. The 'Solidarity Stack' concept (2025) proposes interconnected cooperative infrastructure layers.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

participation — Platform cooperativism maps to A(DAI)'s participation layer. The central question for both is: who governs the platform/commons? Cooperatives answer with democratic member ownership. A(DAI) must articulate its own answer about who governs the merge boundary.


**intention_vs_attention**

Intention through democratic governance. Cooperatives serve member-declared needs rather than optimizing for engagement. The intention is collective benefit as determined by members. However, cooperatives competing in attention-economy markets may be pulled toward attention optimization for survival.


**coherence_vs_consensus**

Democratic consensus. Cooperatives make decisions through member voting, assemblies, and elected governance bodies. This is explicit consensus-seeking, not structural coherence. Decisions may not be structurally coherent (members may vote for contradictory policies) but they have democratic legitimacy.


**contestability**

Built-in through democratic governance. Members can propose alternative policies, challenge leadership, and vote on direction. Contestation is a feature of cooperative governance, not a bug. The one-member-one-vote principle ensures that contestation is not concentration-weighted.


**forkability**

Possible through cooperative dissolution and re-formation. Workers can leave one cooperative and form another. The cooperative model itself is freely forkable — no intellectual property prevents creating competing cooperatives. However, network effects and infrastructure investment create practical barriers to forking.


**tendency_axis_position**

Strongly commons-side (collective ownership). Infrastructure-side (building alternative platform infrastructure). Distributed on individual-distributed (democratic governance, not individual sovereignty). Openness-side but with boundaries (membership-defined participation).


**what_adai_should_adopt**

The question: who governs the merge boundary? A(DAI) should adopt platform cooperativism's insistence that governance must be democratic and that workers/contributors should own the infrastructure they depend on. The PCC's 2025 'Solidarity Stack' concept — linking energy, data, labor, platforms, and governance — is a useful model for thinking about A(DAI)'s infrastructure dependencies.


**what_adai_should_refuse**

The platform framing. A(DAI) is explicitly NOT a platform — it is a commons. Cooperatives still operate as platforms (matching supply and demand), just with democratic governance. A(DAI) produces collective intelligence, not platform services. Also refuse the assumption that worker-ownership automatically produces good cultural sensemaking — democratic governance is necessary but not sufficient for structural diagnosis.


#### Limitations, blind spots, and failure modes


**limits**

Cooperatives face capitalization challenges — they cannot raise venture capital because they do not offer equity returns. Scale remains modest: 1M+ workers globally, but this is small compared to platform economy incumbents. Democratic governance is slower than corporate decision-making, creating competitive disadvantage. Technical infrastructure may lag due to limited development resources.


#### Governance models and consent architectures


**governance_model**

Democratic cooperative governance. One-member-one-vote. Elected boards and managers. Profit-sharing among members. Federated cooperation through consortia like PCC. Multi-stakeholder cooperatives include workers, users, and community representatives.


#### Material and operational conditions


**composability**

Moderate. Individual cooperatives are independent organizations, not modular components. However, the cooperative model is replicable (anyone can start a cooperative). Federation structures (PCC, ICA) enable coordination. The Solidarity Stack concept proposes systematic composability across cooperative infrastructure layers.


**liveness**

Active and growing. 1M+ platform cooperative workers globally. PCC continuing conferences and policy work through 2025. Scholz's book (2023) won the Joyce Rothschild Prize. PCC's pivot toward AI governance (2023-2025) shows institutional vitality and adaptation.


**scale_of_operation**

Multi-scale. Individual cooperatives operate locally (Up&Go in NYC, Driver's Cooperative in Colorado). PCC operates globally (conferences in Hong Kong, Berlin, Rio de Janeiro, Mombasa). Movement scale is field-level but individual cooperative scale remains local.


**temporality**

11-year movement arc (2014-2025). Rooted in 200+ year cooperative tradition (Rochdale Pioneers, 1844). Currently pivoting toward AI governance, demonstrating institutional evolution. The temporality bridges historical cooperative principles and contemporary digital challenges.


**Uncertain fields:** epistemological_stance, who_is_excluded

---


---

## Attention Economy Critique


### Georg Franck — The Economy of Attention (1998)

**Brief:** Attention as scarce resource and currency. Mental capitalism. The original theoretical formulation.

**Garden Logic relevance:** The theoretical target. A(DAI) is designed as the structural negation of Franck's attention economy.

#### Basic identification and classification

- **name**: Georg Franck — The Economy of Attention (1998)
- **type**: attention-critique
- **originator**: Georg Franck (Vienna University of Technology, Department of Digital Architecture and Planning)
- **year**: 1998 (Okonomie der Aufmerksamkeit, Carl Hanser Verlag)

**key_text**

Okonomie der Aufmerksamkeit. Ein Entwurf (The Economy of Attention: A Draft, Munich: Hanser, 1998); Mental Capitalism (2005); The Economy of Attention (English, Journal of Sociology, 2019)

- **key_url**: https://journals.sagepub.com/doi/abs/10.1177/1440783318811778

#### Core ideas and theoretical positioning


**core_claim**

Attention functions as a scarce resource and a form of capital with dynamics parallel to money — it can be accumulated, invested, and exchanged — and contemporary society has entered an era of 'mental capitalism' where the struggle for attention has become the primary economic force.


**relation_to_attention_economy**

THE theoretical foundation. Franck provides the most rigorous analysis of attention as economic capital. His four-part theory — the fundamental human desire for attention, the parallels between attention and money, the self-reproducing character of attention capital, and the emergence of mental capitalism — defines the theoretical target that A(DAI) is designed to negate.


**relation_to_commons**

Attention is treated as a privatizable resource, not a commons. In Franck's framework, attention is scarce, rival, and accumulative — those who have it earn more of it (like compound interest). This is the anti-commons logic: attention is captured and hoarded, not shared or governed collectively.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Theoretical framework, not a technical system. Franck provides analytical tools (attention capital, mental capitalism, vanity fair) for understanding how attention circulates and accumulates. The architecture is conceptual: flows of attention structured by media, institutions, and social hierarchies.


**data_model**

Attention as measurable currency: circulation figures, viewing ratings, likes, visits, citations, follower counts. Reputation as accumulated attention capital. Celebrity as publicly traded attention stock. The data model is quantitative but Franck emphasizes that attention has qualitative dimensions that resist full quantification.


**temporal_logic**

Accumulative and self-reinforcing. Attention capital earns 'interest' — those who are already known attract more attention. The temporal logic is compound-growth: reputation builds on reputation. This creates winner-take-all dynamics over time.


**absence_handling**

Attention to absence is structurally impossible in Franck's framework. The economy of attention can only process what is attended to — what is not attended to does not exist in the system. This is the fundamental limitation that A(DAI) addresses: attention systems cannot see their own blind spots.


**scalability_model**

Centralized through media concentration. Attention flows through mass media channels, social platforms, and institutional prestige hierarchies. Scaling means reaching larger audiences, which concentrates attention in fewer hands.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

none — Franck's theory IS the system that Garden Logic is designed against. It does not map to any Garden Logic layer because it describes the architecture A(DAI) refuses. Understanding Franck is essential for understanding what A(DAI) must not become.


**intention_vs_attention**

Pure attention theory. Franck's entire framework analyzes attention as an economic force. There is no concept of intention in his work — intent is reduced to the desire for attention. This is the theoretical target A(DAI) is designed to negate: replacing the attention-accumulation logic with structural-gap-detection logic.


**coherence_vs_consensus**

Neither. Attention produces neither coherence nor consensus — it produces celebrity. The 'vanity fair' of attention capital trading does not seek structural consistency or democratic agreement. It produces popularity, which is a different kind of social ordering than either coherence or consensus.


**contestability**

Attention is contestable only through counter-attention — you challenge someone's prominence by becoming more prominent yourself. This is not genuine contestability (challenging the logic of the system) but competition within the system. Franck's framework does not allow contestation of the attention logic itself from within the system.


**forkability**

Not applicable. Attention systems are not forkable — they are gravitational. You cannot fork celebrity or fork a reputation hierarchy. The attention economy is anti-forkable by design: its value comes from concentration, not distribution.


**tendency_axis_position**

The pole that defines the opposite end of all A(DAI) tendency axes. Capture-side (attention is captured and accumulated). Spectacle-side (media spectacle is the attention distribution system). Individual-side (attention accrues to individuals as reputation). Enclosure-side (attention capital is privately owned).


**what_adai_should_adopt**

The analytical precision. Franck's framework is the best diagnostic tool for recognizing when attention logic leaks into A(DAI)'s systems. Adopt Franck's analysis as a detection mechanism: if any part of A(DAI) begins to optimize for engagement, accumulate individual reputation, or create winner-take-all dynamics, Franck's theory identifies the failure mode.


**what_adai_should_refuse**

Everything about the attention-as-capital model as a design principle. Refuse the assumption that attention is the primary scarce resource in cultural intelligence. Refuse reputation-accumulation as a valid organizing principle. Refuse the 'vanity fair' of celebrity-style knowledge production. Refuse the self-reinforcing dynamics that concentrate visibility.


#### Limitations, blind spots, and failure modes


**limits**

The theory is primarily descriptive, not prescriptive — Franck diagnoses mental capitalism but does not propose alternatives. The framework may overstate the parallel between attention and money (critics argue attention is not fungible or storable in the same way). The theory was developed before social media, and while it anticipates digital attention dynamics, it does not address algorithmic attention allocation.


#### Governance models and consent architectures


**governance_model**

Franck's framework describes the governance model of media and academic institutions as attention markets. There is no prescriptive governance model — only descriptive analysis of how attention is currently governed (through media gatekeepers, prestige hierarchies, and now algorithmic feeds).


#### Material and operational conditions


**composability**

Theoretical-analytical composability. Franck's concepts (attention capital, mental capitalism, vanity fair) compose with other critical theories (Zuboff's surveillance capitalism, Citton's ecology of attention). The framework is analytically reusable but not technically modular.


**liveness**

Historically significant, experiencing renewed relevance. The 1998 book was largely German-language; English translations and scholarly engagement (van Krieken, 2019) brought it to wider attention. The theory's relevance has increased with social media and AI, making Franck more cited now than at publication.


**scale_of_operation**

Planetary in scope — Franck theorizes attention as a global economic force. The analysis applies from individual interactions to mass media to scientific prestige systems. Multi-scale analytical framework.


**temporality**

Deep theoretical temporality. Franck traces attention economics from pre-modern prestige systems through industrial media to digital capitalism. The temporal logic is historical-structural: attention dynamics are not new, but their economic formalization is a modern development that accelerated with digital media.


**Uncertain fields:** consent_architecture, who_is_excluded, structural_tension

---


### Yves Citton — The Ecology of Attention (2017)

**Brief:** Reframes attention as ecological, not economic. Collective attention as commons. Joint attention as political.

**Garden Logic relevance:** The closest intellectual ally. Citton's 'ecology' maps to A(DAI)'s 'garden.' His joint attention maps to A(DAI)'s collective intention. The key difference: Citton still centers attention; A(DAI) replaces it.

#### Basic identification and classification

- **name**: Yves Citton — The Ecology of Attention (2017)
- **type**: attention-critique
- **originator**: Yves Citton (Universite Paris 8, literary and cultural theorist)

**year**

2014 (French original: Pour une ecologie de l'attention, Seuil), 2017 (English translation, Polity Press, translated by Barnaby Norman)

- **key_text**: The Ecology of Attention (Polity Press, 2017, 220 pages)
- **key_url**: https://www.wiley.com/en-us/The+Ecology+of+Attention-p-9781509503735

#### Core ideas and theoretical positioning


**core_claim**

Attention should be understood ecologically rather than economically — not as a scarce resource to be spent or invested but as a relational capacity shaped by environmental conditions, collective practices, and media architectures that can support or degrade collective intelligence.


**relation_to_attention_economy**

Explicit reframing. Citton argues that the economic metaphor (paying, investing, spending attention) is fundamentally misleading. Attention is not a fixed stock that depletes through use but an ecological capacity that can be cultivated or degraded depending on the attentional environment. He replaces 'economy' with 'ecology' to shift from scarcity thinking to cultivation thinking.


**relation_to_commons**

Collective attention as commons. Citton treats collective attention as a shared resource that can be well or badly managed. Media architectures create 'echosystems' that condition what we notice collectively. The commons is not data or content but the collective capacity to attend — a more radical commons concept than most in this set.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Conceptual framework (not a technical system). Citton proposes three registers of attention — collective, joint, and individuating — each conditioned by different environmental factors. The architecture is the media ecology: the 'echosystem' of resonances that condition what circulates through and within us.


**data_model**

Not a data model but an attention model: collective enthralments (media architectures), joint attention (shared focus in co-presence), and individuating attention (personal reflective capacity). These are relational categories, not data structures.


**temporal_logic**

Ecological temporality. Attention unfolds in rhythms conditioned by media architectures and social practices. Citton's temporal logic is not linear (past-present-future) but resonant — attention is shaped by echoes, repetitions, and patterns of circulation. The 'echosystem' metaphor emphasizes temporal reverberations.


**absence_handling**

Attention ecology reveals what economic attention misses. By shifting from economy to ecology, Citton makes visible the attention-degrading effects of media saturation, the collective enthralments that limit what we can notice, and the structural conditions that prevent certain voices from being heard. Absence is an ecological concept — what the environment makes inaudible.


**scalability_model**

Not applicable in engineering terms. Citton's framework operates at the conceptual-analytical level. It can be applied at multiple scales (individual, collective, planetary) but does not specify scaling mechanisms.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

sensing-loop — Citton's ecology of attention maps most closely to A(DAI)'s sensing loop. The question of what the system attends to, how it filters, and what it makes audible is the question of the sensing loop's design. Citton provides the theoretical vocabulary for understanding what the sensing loop does to collective attention.


**intention_vs_attention**

The closest intellectual ally to A(DAI), with a crucial difference. Citton's ecology still centers attention — he reframes it ecologically rather than economically, but attention remains the primary concept. A(DAI) replaces attention with intention: the system is not about cultivating better attention but about generating structural diagnosis. Citton asks 'how can we attend better?' A(DAI) asks 'what gaps exist regardless of what anyone is attending to?'


**coherence_vs_consensus**

Ecological coherence. Citton seeks a healthy attention ecology — one that supports collective intelligence through resonance and echo rather than consensus or disagreement. This is closer to A(DAI)'s coherence model than to consensus. The 'echosystem' concept describes coherence through mutual resonance rather than through explicit agreement.


**contestability**

Implicit through ecological diversity. A healthy attention ecology includes multiple voices, competing interpretations, and counter-signals. Citton's framework values attentional biodiversity — monocultures of attention (where everyone attends to the same things) are ecologically unhealthy. This is structural contestability through diversity rather than explicit challenge mechanisms.


**forkability**

Not a concept in Citton's framework. Ecological systems are not forkable in the engineering sense. However, attention ecologies can be cultivated in different directions — different communities can create different 'echosystems' with different resonance patterns. This is ecological diversification rather than forking.


**tendency_axis_position**

Commons-side (collective attention as shared capacity). Infrastructure-side (media ecology as infrastructure). Distributed on individual-distributed (ecology is inherently relational and collective). Openness-side (ecological health requires diversity and connection).


**what_adai_should_adopt**

The 'echosystem' concept as a model for how signals circulate through A(DAI)'s sensing loop. Adopt the principle that the system's architecture conditions what can be noticed — A(DAI) must design its sensing loop as an attention ecology that supports diversity and avoids monoculture. Adopt Citton's three-register model: collective patterns, joint sensemaking, and individual reflection are all necessary for healthy intelligence.


**what_adai_should_refuse**

The continued centering of attention. Citton improves attention theory but does not replace it. A(DAI) must go further: the system's outputs should not be 'what deserves attention' but 'what structural gaps exist.' The shift from attention-ecology to intention-architecture is the move Citton does not make. Also refuse the purely theoretical stance — A(DAI) must build infrastructure, not just provide analysis.


#### Limitations, blind spots, and failure modes


**limits**

Purely theoretical — no implementation, no technical system, no empirical validation. The ecological metaphor may be evocative but difficult to operationalize. The book does not propose concrete mechanisms for cultivating healthier attention ecologies. Academic reception has been positive but impact on technology design is minimal.


#### Governance models and consent architectures


**governance_model**

No governance model proposed. Citton analyzes attention as an ecological phenomenon but does not prescribe governance structures. The implicit governance model is cultural: better media architectures, critical education, and collective practices that cultivate attention rather than exploit it.


#### Material and operational conditions


**composability**

Theoretical composability. Citton's concepts (echosystem, collective enthralments, attentional ecology) compose with other critical theories (Franck, Zuboff, Stiegler). The framework is analytically reusable but not technically modular.


**liveness**

Active in academic discourse. Citton continues publishing and lecturing. The book remains in print and regularly cited. The ecological framing has influenced attention ethics and digital well-being discussions. Intellectually lively but not technically productive.


**scale_of_operation**

Theoretical-analytical at planetary scale. Citton's analysis applies to individual media encounters, collective media environments, and planetary information ecologies. The scale is conceptual, not operational.


**temporality**

Ecological-resonant. Citton's temporal logic is that of echoes and reverberations rather than linear progression. Attention moves through cycles of fascination, distraction, and return. The 'echosystem' concept describes temporal patterns of resonance that shape what persists in collective awareness.


**Uncertain fields:** epistemological_stance, who_is_excluded, failure_under_attention, extraction_vector

---


### Shoshana Zuboff — Surveillance Capitalism (2019)

**Brief:** Attention capture as raw material for behavioral prediction markets. Behavioral surplus extraction.

**Garden Logic relevance:** Zuboff describes the extraction A(DAI) refuses. The 'behavioral surplus' is what A(DAI)'s provenance chain prevents — the system never strips context from signals.

#### Basic identification and classification

- **name**: Shoshana Zuboff — Surveillance Capitalism (2019)
- **type**: attention-critique
- **originator**: Shoshana Zuboff (Harvard Business School, Professor Emerita)
- **year**: 2019 (The Age of Surveillance Capitalism published by PublicAffairs)

**key_text**

The Age of Surveillance Capitalism: The Fight for a Human Future at the New Frontier of Power (PublicAffairs, 2019)

- **key_url**: https://www.hbs.edu/faculty/Pages/item.aspx?num=56791

#### Core ideas and theoretical positioning


**core_claim**

A new form of capitalism has emerged that claims private human experience as free raw material for translation into behavioral data, fabricated into prediction products, and traded in behavioral futures markets — the systematic extraction of behavioral surplus for profit.


**relation_to_attention_economy**

Extends and radicalizes. Zuboff shows that the attention economy is not just about capturing eyeballs for advertising — it is about extracting behavioral data as raw material for prediction markets. Attention capture is the means; behavioral prediction is the product; behavioral modification is the end goal. The attention economy is the visible surface of a deeper extraction system.


**relation_to_commons**

Human experience as an enclosed commons. Zuboff argues that surveillance capitalists have unilaterally claimed human experience — the ultimate commons — as proprietary raw material. This is enclosure on a scale that exceeds anything in the history of capitalism: not land, not labor, but human behavioral data itself is enclosed and privatized.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Extraction pipeline: experience capture → behavioral data → behavioral surplus → prediction products → behavioral futures markets → behavioral modification. This is a technical pipeline, but Zuboff describes it analytically rather than architecturally. The key architectural insight is the conversion of 'exhaust data' into 'behavioral surplus.'


**data_model**

Behavioral data as raw material. Raw behavioral data → service improvement data (the portion that improves the product) + behavioral surplus (the proprietary excess). Surplus → machine intelligence processing → prediction products. The data model is extractive: it distinguishes between data that serves users and data that serves markets.


**temporal_logic**

Anticipatory-extractive. The system is oriented toward predicting future behavior. Prediction products are traded in 'behavioral futures markets' — the temporal logic is forward-looking, but in the service of control rather than understanding. The goal is to predict (and eventually shape) behavior before it occurs.


**absence_handling**

Surveillance capitalism cannot handle its own absence — it must expand continuously into new domains of human experience to generate more behavioral surplus. The system has no concept of 'enough data.' Absence of data is treated as a market opportunity, not a signal to be respected. This is the opposite of A(DAI)'s approach, which treats absence as meaningful.


**scalability_model**

Centralized extraction at planetary scale. Google and Meta operate globally, extracting behavioral data from billions of users. Scale is achieved through platform monopoly and network effects. The system scales by expanding the scope of extraction (more behaviors, more devices, more contexts) rather than by improving extraction quality.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

none — Zuboff describes the extraction system that Garden Logic is designed to resist. Surveillance capitalism is the anti-pattern at every layer: its 'sensing' is surveillance, its 'processing' is prediction, its 'participation' is behavioral modification, and its 'substrate' is platform monopoly.


**intention_vs_attention**

Attention as extraction mechanism for behavioral prediction. Zuboff reveals that the attention economy is not an end in itself but a means to a deeper extractive end: behavioral modification. The progression is attention → data → prediction → modification. A(DAI)'s intention architecture refuses every step of this pipeline: it does not capture attention, extract data, predict behavior, or modify action.


**coherence_vs_consensus**

Neither. Surveillance capitalism does not seek coherence (it does not care about structural consistency of knowledge) or consensus (it does not care about democratic agreement). It seeks certainty — the certainty of behavioral prediction. This is a third mode beyond coherence and consensus: probabilistic control.


**contestability**

Structurally uncontestable. Zuboff emphasizes the asymmetry: 'They know everything about us, but we know little about them.' Users cannot contest what they cannot see. The opacity of surveillance capitalism makes contestation nearly impossible. This is the anti-model for A(DAI)'s transparency requirements.


**forkability**

Anti-forkable. Platform monopoly, network effects, and proprietary prediction models create lock-in. Users cannot take their behavioral data and fork it into alternative systems. The data extraction is one-directional and non-recoverable. This is what A(DAI)'s fork rights are designed to prevent.


**tendency_axis_position**

The maximal capture pole. Capture-side on commons-capture (unprecedented enclosure of human experience). Spectacle-side on spectacle-infrastructure (attention capture as extraction surface). Individual-side in a warped sense (targeting individuals for behavioral modification). Enclosure-side (privatization of behavioral data).


**what_adai_should_adopt**

The diagnostic framework. Zuboff provides the most powerful analytical tools for recognizing when an intelligence system crosses from service into extraction. A(DAI) should use Zuboff's concepts as detection mechanisms: Is the system generating 'behavioral surplus'? Is it producing 'prediction products'? Is it enabling 'behavioral modification'? Any 'yes' answer indicates a design failure.


**what_adai_should_refuse**

Every element of the surveillance capitalist pipeline: behavioral data extraction as raw material, prediction product fabrication, behavioral futures markets, and behavioral modification as instrumentarian power. A(DAI) must refuse the entire architecture, not just its visible surface (attention capture) but its invisible depth (behavioral prediction and modification).


#### Limitations, blind spots, and failure modes


**limits**

The 'behavioral futures market' metaphor has been criticized as a category error — ad markets are spot markets (bidding on current clicks), not futures markets (bidding on predicted behavior). The framework may overstate the predictive power of surveillance capitalism. The analysis is U.S.-centric, focusing on Google and Meta. The book offers no viable alternative — diagnosis without prescription.


#### Governance models and consent architectures


**governance_model**

Zuboff calls for democratic governance to assert authority over surveillance capitalists. The governance model is regulatory: democratic institutions must create and enforce rules that limit behavioral data extraction. This is a state-centric governance model that depends on democratic institutions functioning effectively against concentrated corporate power.


#### Material and operational conditions


**composability**

Analytical composability. Zuboff's concepts (behavioral surplus, prediction products, behavioral futures markets, instrumentarian power) compose powerfully with other critical theories (Franck's attention capital, Citton's attention ecology, Ostrom's commons governance). The theory is a key node in the critical-theory network that A(DAI) draws on.


**liveness**

Highly active in public discourse. International bestseller. Continues to be widely cited in policy, academic, and public debates. Zuboff remains an active public intellectual. The concept of 'surveillance capitalism' has entered common usage. The theory is alive but the proposed solutions remain underdeveloped.


**scale_of_operation**

Planetary in analytical scope. Zuboff analyzes a global system operated by the world's largest corporations. The theory applies wherever digital platforms extract behavioral data — effectively everywhere. The analysis is comprehensive in scope.


**temporality**

Historical-structural. Zuboff traces surveillance capitalism from Google's discovery of behavioral surplus (early 2000s) through its expansion into behavioral modification (2010s). The temporal logic is historical narrative: how did we get here? The forward-looking question — how do we get out? — remains less developed.


**Uncertain fields:** consent_architecture, who_is_excluded, structural_tension

---


### Jenny Odell — How to Do Nothing (2019)

**Brief:** Attention refusal as political act. Bioregional attention. 'Third spaces' beyond productivity.

**Garden Logic relevance:** The tidal rhythm (6/24/72h cycles) IS 'doing nothing' at the architectural level. The dream cycle refuses real-time responsiveness. Odell's politics, A(DAI)'s engineering.

#### Basic identification and classification

- **name**: Jenny Odell — How to Do Nothing (2019)
- **type**: attention-critique
- **originator**: Jenny Odell
- **year**: 2019
- **key_text**: How to Do Nothing: Resisting the Attention Economy (Melville House, 2019)
- **key_url**: https://www.jennyodell.com/writing.html

#### Core ideas and theoretical positioning


**core_claim**

Attention refusal is a political act: 'doing nothing' from capitalism's standpoint means redirecting attention toward bioregional awareness, place-based community, and maintenance rather than productivity.


**relation_to_attention_economy**

Direct refusal. Odell rejects the attention economy's frame of value-through-productivity, arguing that attention is the most precious and overdrawn resource we have, and that its capture by platforms constitutes a monoculture analogous to ecological destruction.


**relation_to_commons**

Strongly commons-oriented. Odell advocates for 'third spaces' — parks, libraries, public squares — as commons that resist enclosure. Bioregionalism is presented as a commons epistemology: awareness of place as shared, living infrastructure rather than extractable resource.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

No technical architecture — this is a philosophical/cultural text. The implicit pattern is a practice-based protocol: rhythms of refusal, cycles of disengagement and re-engagement with place.


**data_model**

N/A — Odell works with attention as a qualitative, relational resource rather than a quantifiable data object. The closest analog is a phenomenological model of situated awareness.


**temporal_logic**

Cyclical and seasonal. Odell's bioregional attention follows ecological time — tidal, migratory, seasonal — rather than real-time or archival logic. This directly parallels A(DAI)'s tidal cycles.


**absence_handling**

Odell treats absence as generative. 'Doing nothing' IS the practice of absence — withdrawing from the attention economy to create space for perception. Silence and stillness are first-class modes of engagement.


**scalability_model**

Deliberately non-scalable. Odell's model is rooted in place, embodied attention, and local community. It resists abstraction and scaling by design, which is both its strength and its limit.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

Substrate layer. Odell's work provides the philosophical ground for why A(DAI)'s tidal rhythm exists. The refusal of real-time responsiveness is Odell's 'doing nothing' enacted as system architecture.


**intention_vs_attention**

Firmly intention-oriented. Odell's entire project is a refusal of attention logic. However, she does not use the language of 'structural diagnosis' or 'gap detection' — her intention is more phenomenological (what deserves our awareness?) than diagnostic (what is structurally missing?). A(DAI) operationalizes what Odell philosophizes.


**coherence_vs_consensus**

Coherence. Odell explicitly embraces multiple, coexisting readings of place and community. She does not seek consensus but rather a richer, more layered attention to what is already present. Her bioregionalism is about perceiving complexity, not resolving it.


**contestability**

Implicitly contestable but not formalized. Odell's framework is open to different readings and practices of refusal, but she does not build mechanisms for structured disagreement or counter-signals.


**forkability**

Highly forkable in spirit — Odell insists that attention practices must be local and place-specific, meaning every instantiation is already a 'fork.' However, there is no protocol or infrastructure to preserve provenance across forks.


**tendency_axis_position**

Strongly openness, commons, infrastructure, distributed. Odell sits at the far commons end of every spectrum. She refuses spectacle (attention capture), advocates for distributed attention (bioregional), and frames infrastructure (parks, libraries, ecosystems) as the site of resistance.


**what_adai_should_adopt**

The philosophical grounding that tidal rhythms and cyclical temporality are not merely design choices but political acts of refusal. Odell's framing of 'maintenance as productivity' validates A(DAI)'s emphasis on structural persistence over novelty. Her bioregional attention model provides language for why A(DAI)'s scene-level analysis matters — intelligence is always situated.


**what_adai_should_refuse**

Odell's anti-scalability. A(DAI) needs to operate at field-level, not just local bioregional scale. Also refuse Odell's implicit individualism — while she gestures toward community, her practice of attention remains largely personal and contemplative. A(DAI) needs collective infrastructure, not individual practice.


#### Limitations, blind spots, and failure modes


**limits**

No institutional form. Odell offers practice and philosophy but no organizational model, governance structure, or technical infrastructure. Her framework is difficult to operationalize beyond individual attention practice. The bioregional model is geographically bounded in ways that limit application to distributed digital communities.


#### Governance models and consent architectures


**governance_model**

No formal governance. Odell's model is anarchic in the philosophical sense — emergent, place-based, communal. She draws on bioregional governance traditions (indigenous land practices, Peter Berg's bioregionalism) but does not propose specific governance structures.


#### Material and operational conditions


**composability**

Library-level. Odell's ideas are highly composable — they can be embedded in other frameworks, combined with different practices, and adapted to different contexts. But they are philosophical building blocks, not modular technical components.


**liveness**

Actively maintained as a living discourse. Odell continues to write and speak (Saving Time, 2023). The ideas remain generative and are being extended by others.


**scale_of_operation**

Individual to small group/scene. Odell's practice is inherently local and embodied, operating at the scale of a person in a place, extended to a neighborhood or bioregion at most.


**temporality**

Cyclical recurrence and ecological time. Odell's temporal logic follows seasons, migrations, tides — patterns of natural recurrence rather than linear progress or real-time responsiveness.


**Uncertain fields:** epistemological_stance, who_is_excluded, failure_under_attention, extraction_vector, consent_architecture, structural_tension

---


### Jonathan Crary — Scorched Earth (2022)

**Brief:** Attention as the last frontier of enclosure. Links attention capture to ecological crisis.

**Garden Logic relevance:** The urgency claim. If Crary is right that attention enclosure is linked to ecological collapse, then A(DAI)'s intention-economy is not just a design preference — it's an ecological necessity.

#### Basic identification and classification

- **name**: Jonathan Crary — Scorched Earth (2022)
- **type**: attention-critique
- **originator**: Jonathan Crary
- **year**: 2022
- **key_text**: Scorched Earth: Beyond the Digital Age to a Post-Capitalist World (Verso, 2022)
- **key_url**: https://www.versobooks.com/products/214-scorched-earth

#### Core ideas and theoretical positioning


**core_claim**

The 'internet complex' is inseparable from 24/7 capitalism and ecologically incompatible with a habitable earth — attention enclosure and ecological collapse are structurally linked, not merely coincident.


**relation_to_attention_economy**

Total rejection. Crary argues the attention economy is not a distortion of an otherwise neutral technology but the fundamental purpose of the internet complex. Social media cannot be reformed; it must be abandoned. Attention capture is the mechanism by which capitalism completes its enclosure of all human experience.


**relation_to_commons**

Crary argues that global capitalism systematically destroys the resources communities need for self-sufficient subsistence and self-governance — a 'scorched earth' strategy against the commons. He calls for eco-socialism or no-growth post-capitalism as the only viable commons framework.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

No technical architecture — Crary is explicitly anti-technical. His argument is that any computational architecture is complicit in the internet complex. The implicit pattern is negation: the architecture of refusal is offline community.


**data_model**

N/A — Crary rejects data models as instruments of capture. The internet complex turns all human activity into data for extraction. Any data model is already part of the problem.


**temporal_logic**

Anti-temporal in the computational sense. Crary's earlier work (24/7, 2013) argued that capitalism attacks sleep — the last refuge from productivity. His temporal logic is the recovery of non-productive time: rest, embodied presence, seasonal rhythms.


**absence_handling**

Crary does not handle absence within a system — he advocates for absence FROM the system. The internet complex makes absence impossible (always-on, 24/7), so structural absence requires breaking the connection entirely.


**scalability_model**

Anti-scalable. Crary advocates for local, small-scale democratic processes and physical interactions. Scalability is itself a capitalist logic.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

None directly — Crary would likely reject A(DAI) as still operating within the internet complex. However, his critique maps to the substrate layer as a warning: any infrastructure built on computation risks reproducing the enclosure it claims to resist.


**intention_vs_attention**

Crary provides the most radical critique of attention logic. His argument implies that intention-economies are necessary but insufficient — even intention can be captured if it operates within computational infrastructure. A(DAI)'s intention economy is an ecological necessity IF it can avoid becoming another layer of the internet complex.


**coherence_vs_consensus**

Neither, in Crary's framework. He is not interested in building systems at all. His critique suggests that both coherence and consensus are system-level operations that presuppose the infrastructure he wants to abandon. The tension for A(DAI) is real: can you build coherence without reproducing enclosure?


**contestability**

Crary's work is contestable as critique but offers no internal mechanism for contestation. His position is absolutist — the internet complex must be abandoned, not reformed. This leaves no room for gradual transformation or hybrid approaches.


**forkability**

Not applicable. Crary's framework is not designed to be instantiated, so it cannot be forked. It functions as a warning system, not a protocol.


**tendency_axis_position**

Extreme openness (anti-enclosure), extreme commons (anti-capture), extreme infrastructure (anti-spectacle in the Debordian sense), distributed (anti-centralization). But also anti-computational, which places him outside the spectrum A(DAI) operates within.


**what_adai_should_adopt**

The structural link between attention enclosure and ecological collapse. If Crary is right, then A(DAI)'s intention-economy is not merely a design preference but an ecological necessity. Adopt the urgency: this is not an aesthetic choice but a survival imperative. Also adopt Crary's critique of reformism — the attention economy cannot be fixed, only replaced.


**what_adai_should_refuse**

Crary's absolutism about computation. His position that all digital infrastructure is inherently extractive leaves no room for the kind of commons-first computational infrastructure A(DAI) is building. Refuse the counsel of despair. Also refuse the implicit Eurocentrism of Crary's critique, which centers Western capitalism without adequate attention to Global South alternatives.


#### Limitations, blind spots, and failure modes


**limits**

Crary's absolutism makes his framework practically useless for building alternatives. He offers no path from here to there. The critique is powerful but paralyzing. He also underestimates the diversity of digital practices globally, treating the internet as a monolithic Western capitalist project.


#### Governance models and consent architectures


**governance_model**

Eco-socialist. Crary advocates for local, small-scale democratic processes, mutual cooperation, and physical interactions. The governance model is prefigurative — building post-capitalist forms of life through practice rather than policy.


#### Material and operational conditions


**composability**

Monolithic. Crary's argument does not modularize well — it is an all-or-nothing critique. You cannot adopt 'some' of Crary's framework without diluting its force. This is both its intellectual strength and its practical weakness.


**liveness**

Historically significant and actively cited. Crary continues to publish and lecture. The framework is alive as critique but static as a program for action.


**scale_of_operation**

Planetary in critique, local in prescription. Crary diagnoses a planetary-scale problem but prescribes local-scale solutions. This scalar mismatch is a known weakness.


**temporality**

Historical depth and anticipatory. Crary traces the present crisis through deep historical analysis (from Debord through neoliberalism) and projects forward to ecological collapse. His temporality is linear-catastrophic rather than cyclical.


**Uncertain fields:** epistemological_stance, who_is_excluded, failure_under_attention, structural_tension, extraction_vector, consent_architecture

---


### Tim Wu — The Attention Merchants (2016)

**Brief:** Historical account of attention capture from penny press to social media. The 'attention harvest.'

**Garden Logic relevance:** Historical context for what A(DAI) refuses. Wu shows that attention capture is not a tech problem — it's a 200-year pattern. A(DAI) needs to be robust against pattern recurrence.

#### Basic identification and classification

- **name**: Tim Wu — The Attention Merchants (2016)
- **type**: attention-critique
- **originator**: Tim Wu
- **year**: 2016
- **key_text**: The Attention Merchants: The Epic Scramble to Get Inside Our Heads (Knopf, 2016)
- **key_url**: https://scholarship.law.columbia.edu/books/64/

#### Core ideas and theoretical positioning


**core_claim**

Attention capture is a 200-year industrial pattern: from the penny press to social media, the business model of harvesting human attention for resale to advertisers has been the dominant commercial logic, with each new medium repeating the same cycle of capture, revolt, and re-capture.


**relation_to_attention_economy**

Historicizes it. Wu does not simply critique the attention economy — he genealogizes it, showing that attention capture is not a recent aberration but a deeply embedded industrial logic dating to the 1830s. This historical depth reveals the pattern as structural, not contingent.


**relation_to_commons**

Implicit. Wu treats attention as a common resource that has been progressively enclosed by industrial interests. His framework suggests that attention was once part of a shared public life and has been privatized through increasingly sophisticated capture mechanisms. However, he does not explicitly develop a commons framework.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Historical pattern analysis — Wu identifies a recurring cycle: a new medium emerges, attention merchants discover its capture potential, audiences revolt, and merchants adapt with new techniques. This is closer to a systems-dynamics model than a technical architecture.


**data_model**

Historical narrative. Wu organizes information chronologically and by medium (press, radio, television, internet), tracking the attention-merchant business model across technological eras. No formal data structure.


**temporal_logic**

Historical-cyclical. Wu's central insight is that attention capture follows a repeating historical pattern. Each new medium triggers the same cycle: innovation, capture, saturation, revolt, adaptation. This cyclical pattern over 200 years is the temporal core of his argument.


**absence_handling**

Wu tracks 'revolts' — moments when audiences refuse capture — as absence events. The remote control, ad-blocking, FDA regulations, and counter-cultural movements all represent moments of refusal. However, Wu notes that these absences are always temporary; the attention merchants always find new vectors.


**scalability_model**

Wu documents how attention capture has scaled from local (penny press) to national (radio/TV) to planetary (internet). The scalability model is historically determined by medium, with each new technology enabling capture at greater scale.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

Sensing loop. Wu's historical analysis functions as context for A(DAI)'s sensing apparatus — it provides the deep pattern recognition that makes current attention-capture strategies legible as instances of a 200-year structural dynamic.


**intention_vs_attention**

Wu documents the attention side comprehensively but does not theorize intention as an alternative. His work is diagnostic, not prescriptive. He shows what A(DAI) refuses but does not map what A(DAI) builds. His call to 'reclaim attention' remains within an attention framework rather than proposing an intention alternative.


**coherence_vs_consensus**

Neither explicitly. Wu is a historian, not a system designer. His work contributes to coherence by providing historical depth that makes the present legible, but he does not build systems for either coherence or consensus.


**contestability**

Wu's historical claims are contestable through standard academic methods, but his work does not build contestability as a system property. The historical pattern he identifies (capture-revolt-recapture) is itself a thesis that can be challenged.


**forkability**

The historical framework is inherently forkable — different historians can tell different stories about the same period, emphasizing different actors and dynamics. However, Wu provides no mechanism for managing divergent interpretations.


**tendency_axis_position**

Moderate openness (documents enclosure without necessarily proposing openness), implicit commons (treats attention as a common resource being enclosed), infrastructure-oriented (focuses on structural patterns rather than spectacle), multi-scale (traces patterns from individual to planetary).


**what_adai_should_adopt**

The 200-year pattern as diagnostic context. A(DAI) should embed Wu's historical depth into its sensing apparatus: current attention-capture strategies are not new but iterations of a deep industrial pattern. This historical grounding prevents A(DAI) from treating each new platform or technology as unprecedented. Also adopt Wu's concept of 'revolts' — moments of refusal are structural features of the attention economy, not exceptions.


**what_adai_should_refuse**

Wu's implicit reform orientation. He suggests we can 'reclaim' attention within existing systems, which underestimates the structural depth of the pattern he himself documents. If attention capture is a 200-year industrial logic, it cannot be reformed through individual choice. Also refuse Wu's Americentrism — his history is overwhelmingly US-centric, missing attention economies in other cultural contexts.


#### Limitations, blind spots, and failure modes


**limits**

Wu's framework is diagnostic, not generative — he documents the problem comprehensively but offers limited tools for building alternatives. His historical lens, while valuable, can produce fatalism: if capture always recaptures, what is the point of resistance? His legal-reform orientation may be insufficient for structural change.


#### Governance models and consent architectures


**governance_model**

Implicit regulatory/legal. Wu, as a legal scholar and former policy advisor, tends toward governance through regulation — FTC oversight, privacy law, antitrust action. This is a centralized, state-based governance model.


#### Material and operational conditions


**composability**

Library-level. Wu's historical framework is highly composable — it can be used as context for other analyses, combined with different theoretical frameworks, and applied to new media. His concepts (attention merchants, capture-revolt cycle) function as modular analytical tools.


**liveness**

Historically significant and actively referenced. Wu continues to write and advise on technology policy. The 2016 framework remains relevant as attention-capture mechanisms evolve.


**scale_of_operation**

Field-level to planetary. Wu's analysis spans from individual media companies to the global attention economy, with particular strength at the institutional and field level.


**temporality**

Deep historical. Wu's temporal logic is genealogical — he traces the present back 200 years to reveal structural continuities. This provides the kind of historical depth A(DAI)'s sensing apparatus needs, though Wu's temporality is linear rather than cyclical or tidal.


**Uncertain fields:** epistemological_stance, who_is_excluded, failure_under_attention, extraction_vector, consent_architecture, structural_tension

---


### James Williams — Stand Out of Our Light (2018)

**Brief:** Ex-Google strategist. Persuasive design undermines autonomy. Three levels of attention.

**Garden Logic relevance:** Williams' three levels (spotlight, starlight, daylight) map to A(DAI)'s CLA layers. Spotlight = surface. Starlight = worldview. Daylight = myth. The sensing loop operates at all three.

#### Basic identification and classification

- **name**: James Williams — Stand Out of Our Light (2018)
- **type**: attention-critique
- **originator**: James Williams
- **year**: 2018

**key_text**

Stand Out of Our Light: Freedom and Resistance in the Attention Economy (Cambridge University Press, 2018)

- **key_url**: https://www.cambridge.org/core/books/stand-out-of-our-light/3F8D7BA2C0FE3A7126A4D9B73A89415D

#### Core ideas and theoretical positioning


**core_claim**

Persuasive design in technology systematically undermines human autonomy at three levels — our ability to do what we want (spotlight), to be who we want (starlight), and to want what we want (daylight) — making the liberation of attention the defining moral and political struggle of our time.


**relation_to_attention_economy**

Insider critique. Williams spent a decade at Google before earning a philosophy doctorate at Oxford. He argues that the attention economy does not merely distract — it undermines the foundational capacities for self-governance. His three-level model shows that attention capture operates at progressively deeper levels of human agency.


**relation_to_commons**

Attention as a commons under siege. Williams frames attention not as an individual resource but as a collective capacity necessary for democratic self-governance. When attention is captured at the daylight level, the capacity for collective deliberation and shared value-formation is destroyed.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Three-layer model of attention: spotlight (task-level), starlight (goal-level), daylight (value-level). This layered architecture maps to different types of persuasive design intervention and different modes of capture. The pattern is diagnostic rather than prescriptive.


**data_model**

Conceptual layered model. Williams organizes attention into three qualitatively distinct layers, each with different vulnerability profiles. The model is not computational but could be operationalized as a classification system for types of attention intervention.


**temporal_logic**

Present-continuous. Williams focuses on the ongoing, real-time erosion of attention by persuasive design. His temporal concern is the cumulative effect of constant micro-distractions, which aggregate into structural damage to human autonomy over time.


**absence_handling**

Williams identifies 'daylight' — the capacity for metacognition and value-formation — as the most important form of attention, and its absence as the most dangerous. When daylight is compromised, people cannot even recognize what they are missing. This is absence as structural blindness.


**scalability_model**

Williams' framework applies at individual, institutional, and societal scales. The three levels of attention operate at all scales, from personal device interaction to democratic governance.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

Sensing loop and prompt-generation layers. Williams' three-level model maps productively to A(DAI)'s CLA layers: spotlight corresponds to litany (surface events), starlight to systemic/worldview (structural patterns and values), and daylight to myth/metaphor (foundational narratives). This mapping suggests A(DAI)'s dream cycle operates at the daylight level — the level where values and goals are formed.


**intention_vs_attention**

Williams provides the clearest articulation of why attention and intention are different things. Spotlight attention is what the attention economy captures; starlight is where intention begins (navigation by higher goals); daylight is where intention is formed (the capacity to define goals in the first place). A(DAI)'s intention economy operates at the starlight/daylight boundary — structural diagnosis that reveals what goals and values a field should pursue.


**coherence_vs_consensus**

Implicitly coherence. Williams' three-level model allows for multiple valid ways of pursuing goals (starlight) and defining values (daylight). He does not argue for a single correct set of values but for the preservation of the capacity to form values — which is a coherence concern, not a consensus one.


**contestability**

Williams' framework is itself highly contestable — other philosophers have challenged his categorization of attention types and his Aristotelian framework. But the three levels provide a useful structure FOR contestation: disagreements can be classified by which level they operate at.


**forkability**

The three-level model is inherently forkable — different contexts (cultures, institutions, communities) can define their own starlight values and daylight capacities while sharing the structural framework. The model provides scaffolding for divergence.


**tendency_axis_position**

Openness (anti-enclosure of attention), commons (attention as collective resource), infrastructure (focus on structural conditions for autonomy), individual-to-distributed (the framework spans personal and political scales).


**what_adai_should_adopt**

The three-level attention model as a diagnostic tool for A(DAI)'s own operations. A(DAI) should classify its signals and prompts by which level of attention they address: frontier signals are spotlight-level (emerging events), tendency analysis is starlight-level (structural patterns), and the dream cycle is daylight-level (foundational value-formation). This mapping creates clarity about what each A(DAI) component is actually doing. Also adopt Williams' argument that the deepest capture operates at the daylight level — where values are formed — as justification for A(DAI)'s emphasis on mythic/metaphoric analysis through CLA.


**what_adai_should_refuse**

Williams' residual individualism. Despite arguing for collective attention as a political resource, his framework remains anchored in individual cognitive capacities. A(DAI) needs a model of collective attention/intention that is not reducible to the aggregation of individual attention spans. Also refuse Williams' implicit technology-reform orientation — his proposals for 'ethical design' underestimate the structural dynamics that make attention capture profitable.


#### Limitations, blind spots, and failure modes


**limits**

Williams' three-level model, while elegant, may oversimplify the dynamics of attention. The boundaries between spotlight, starlight, and daylight are not always clear, and the model does not account well for collective or distributed forms of attention. His background as a Google insider may limit his critique — he reforms what perhaps cannot be reformed.


#### Governance models and consent architectures


**governance_model**

Liberal-democratic reform. Williams advocates for design ethics, regulatory oversight, and professional standards for technologists. His governance model is reformist rather than revolutionary — he wants to change how technology is designed within existing institutional frameworks.


#### Material and operational conditions


**composability**

Highly composable. The three-level model can be applied to any attention-related analysis — media criticism, educational design, political communication, interface design. It functions as a diagnostic module that can be embedded in larger frameworks.


**liveness**

Actively maintained. Williams co-founded the Time Well Spent movement (now Center for Humane Technology) and continues to write and advise on attention ethics. The framework is alive and evolving.


**scale_of_operation**

Multi-scale. The three-level model applies at individual, institutional, and societal scales. Williams moves fluently between personal device interaction and democratic governance.


**temporality**

Present-continuous with concern for cumulative long-term effects. Williams focuses on the ongoing erosion of attention capacities, emphasizing that the effects are not immediate but accumulative — each micro-distraction contributes to a macro-level degradation of autonomy.


**Uncertain fields:** epistemological_stance, who_is_excluded, failure_under_attention, structural_tension, extraction_vector, consent_architecture

---


### Kate Crawford — Atlas of AI (2021)

**Brief:** AI as extractive industry. Supply chains from mines to data centers to clickworkers. Material politics of computation.

**Garden Logic relevance:** The material critique A(DAI)'s architecture doesn't address. The system runs on Claude API calls, hosted on cloud infrastructure, powered by mining and labor. The garden has supply chains.

#### Basic identification and classification

- **name**: Kate Crawford — Atlas of AI (2021)
- **type**: attention-critique
- **originator**: Kate Crawford (USC, Microsoft Research)
- **year**: 2021

**key_text**

Atlas of AI: Power, Politics, and the Planetary Costs of Artificial Intelligence (Yale University Press)

- **key_url**: https://katecrawford.net/atlas

#### Core ideas and theoretical positioning


**core_claim**

AI is not an abstract computational process but an extractive industry with planetary supply chains running from lithium mines through data centers to e-waste dumps — its intelligence is produced through material extraction, labor exploitation, and data capture at every layer.


**relation_to_attention_economy**

Extends the attention economy critique downward into material infrastructure. The attention economy debate focuses on behavioral manipulation at the interface level; Crawford reveals the physical extraction — minerals, energy, labor, data — that makes that interface possible. Attention is the visible extraction; the supply chain is the invisible one.


**relation_to_commons**

Critical of enclosure at every layer — mineral extraction from commons land, labor extraction from precarious workers, data extraction from public behavior, classification systems that encode power. Does not propose a commons alternative but makes the case that any AI commons must reckon with its material conditions.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Supply chain analysis — not a technical architecture but a methodology for tracing the full material lifecycle of AI systems from extraction through processing to disposal.


**data_model**

Geographic and material — maps mines, warehouses, data centers, labor markets, and governance regimes as nodes in a planetary network. Each AI product is traced through its full supply chain.


**temporal_logic**

Life-cycle — follows the temporal arc of extraction, production, use, and disposal. Deep historical context (colonial extraction patterns) combined with contemporary supply chain analysis.


**absence_handling**

Reveals what is absent from standard AI discourse: the mines, the workers, the energy consumption, the e-waste. The methodology is fundamentally about surfacing absences — the hidden costs that make AI appear immaterial and costless.


**scalability_model**

Planetary — the analysis operates at the scale of global supply chains, connecting local extraction sites to global technology platforms.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

none — this is a critique that applies to A(DAI)'s substrate layer (the material infrastructure that runs the system) but has no direct mapping to the garden logic architecture itself.


**intention_vs_attention**

Critiques both attention and intention frameworks for ignoring material conditions. Crawford would likely argue that A(DAI)'s distinction between intention and attention is an interface-level debate that obscures the shared material extraction underlying both. Whether a system generates attention or intention, it still runs on servers powered by extracted resources and manufactured by exploited labor. The critique is not about what kind of signal the system produces but about what the system consumes.


**coherence_vs_consensus**

Neither — Crawford's analysis is not about epistemic processes but about material conditions. However, the work implicitly demands that any coherent analysis of technology must include its material base, and any consensus about technology's value must account for its costs.


**contestability**

The work itself is highly contestable and has generated significant debate. Crawford's methodology — tracing supply chains, interviewing workers, visiting extraction sites — produces claims that can be empirically verified or challenged.


**forkability**

As published scholarship, freely citeable and extensible. The supply chain analysis methodology can be applied to any AI system, including A(DAI).


**tendency_axis_position**

Anti-enclosure, anti-extraction, infrastructure-critical. Reveals the material infrastructure beneath the spectacle of AI. Does not build alternatives but makes alternatives impossible to build honestly without addressing materiality.


**what_adai_should_adopt**

A(DAI) should include a materiality layer in its self-description — acknowledging the computational resources, energy, and infrastructure that run the system. The supply chain methodology: just as Crawford traces the Amazon Echo from mine to dump, A(DAI) should be able to trace a signal from contributor through Claude API call through server infrastructure. Provenance should include computational provenance, not just intellectual provenance. The garden has supply chains, and those supply chains should be visible.


**what_adai_should_refuse**

The implicit purism that makes materiality critique paralyzing. Crawford's analysis can lead to the conclusion that no AI system is ethically justifiable because all have material costs. A(DAI) should acknowledge material costs without treating them as disqualifying. The question is not whether the system has a supply chain but whether the intelligence it produces justifies the extraction involved and whether the extraction is minimized.


#### Limitations, blind spots, and failure modes


**limits**

The supply chain analysis methodology is labor-intensive and does not easily scale to continuous monitoring. Crawford's work is diagnostic (revealing costs) rather than prescriptive (proposing alternatives). The planetary framing can make local action seem inadequate. The book was published in 2021 and some supply chain details may have shifted.


#### Governance models and consent architectures


**governance_model**

Academic analysis — no governance model proposed. Implicitly argues for democratic oversight of AI supply chains and labor protections for AI workers. The work supports regulatory approaches to AI governance that account for material conditions.


#### Material and operational conditions


**composability**

Book and methodology — the supply chain analysis approach is composable and can be applied to any AI system. The specific findings are static but the method is generative.


**liveness**

Historically significant and actively cited, but the book itself is a 2021 artifact. Crawford continues to publish and exhibit (Calculating Empires, 2023). The methodology remains live even if specific supply chain data ages.


**scale_of_operation**

Planetary — the analysis connects local extraction sites (a specific lithium mine in Nevada) to global technology platforms (Amazon, Google).


**temporality**

Deep historical — connects contemporary AI extraction to colonial extraction patterns. Life-cycle analysis traces products from extraction through disposal. The temporal frame extends from colonialism to e-waste futures.


**Uncertain fields:** failure_under_attention, consent_architecture, who_is_excluded

---


### AI Attention Economy Ouroboros (2025)

**Brief:** AI consuming its own AI-generated content creates recursive quality degradation. The attention economy's greatest success is its ultimate failure.

**Garden Logic relevance:** The self-referentiality risk. If A(DAI)'s prompts generate intelligence that becomes signals that generate more prompts, the system must prevent ouroboros. The Ralph pattern (fresh context each call) is a partial safeguard.

#### Basic identification and classification

- **name**: AI Attention Economy Ouroboros (2025)
- **type**: attention-critique

**originator**

Multiple researchers and commentators; key terms coined by Jathan Sadowski ('Habsburg AI'), with contributions from Ilia Shumailov et al. (model collapse research, Oxford)

- **year**: 2025

**key_text**

Multiple sources including 'The Curse of Recursion: Training on Generated Data Makes Models Forget' (Shumailov et al., 2023/2024) and widespread commentary

- **key_url**: https://fourweekmba.com/the-attention-economy-collapse-when-ai-consumes-its-own-content/

#### Core ideas and theoretical positioning


**core_claim**

AI systems increasingly trained on AI-generated content create a recursive feedback loop — model collapse — where each generation loses fidelity to human-originated information, producing a 'computational monoculture' of homogenized, degraded output.


**relation_to_attention_economy**

The ouroboros is the attention economy eating itself. Content mills, SEO farms, and AI-generated articles flood the internet to capture attention, but the resulting data pollution degrades the training data that future AI models need. The attention economy's demand for infinite content at minimal cost creates the conditions for recursive quality collapse.


**relation_to_commons**

Reveals a tragedy of the digital commons: the shared information environment (the open web) is being degraded by AI-generated pollution. Unlike traditional commons tragedies where resources are depleted, here the resource (information) is contaminated — there is more of it but it is less trustworthy. Authentic human-generated content becomes scarce precisely when it becomes most valuable.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Recursive feedback loop — AI output becomes AI input, creating a closed system that converges toward impoverished attractor states. The pattern is one of recursive self-reference without external grounding.


**data_model**

The 'data model' is the problem: training data that was once primarily human-generated is increasingly synthetic. By April 2025, 74.2% of new web pages contained AI-generated content (Ahrefs analysis). The distinction between training data and output data collapses.


**temporal_logic**

Degenerative — each generation of training introduces cumulative errors, like photocopying a photocopy. The temporal logic is one of decay and convergence toward homogeneity. Researchers project that human-generated training data may become scarce by 2026.


**absence_handling**

The ouroboros IS an absence problem — the progressive absence of authentic human-originated information from the training pipeline. The system cannot detect its own degradation because it has no external reference point. Absence of genuine novelty is the terminal condition.


**scalability_model**

Planetary and recursive — the problem scales with AI adoption. More AI-generated content → worse training data → worse AI output → more degraded AI-generated content. The feedback loop is self-amplifying.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

sensing-loop — the ouroboros directly threatens A(DAI)'s sensing loop. If A(DAI)'s scout agent ingests AI-generated content and the pipeline processes it through Claude, the resulting intelligence could be ouroboric: AI-mediated analysis of AI-generated signals producing AI-shaped outputs that become inputs to the next cycle.


**intention_vs_attention**

Reveals the convergence risk: even intention-oriented systems can become ouroboric if their sensing mechanisms ingest contaminated signals. The attention economy produces the ouroboros through content farming; an intention economy could produce it through prompt engineering that surfaces 'structural gaps' that are artifacts of the processing model rather than genuine field conditions. The ouroboros doesn't care about the system's stated purpose — it operates on the data pipeline.


**coherence_vs_consensus**

The ouroboros produces false coherence — as model outputs converge toward attractor states, they appear more coherent (more consistent, more self-reinforcing) while becoming less connected to reality. This is a direct warning for A(DAI): if the coherence prompt starts finding patterns in AI-processed signals, those patterns may reflect the processing model's biases rather than genuine structural relationships in the field.


**contestability**

The ouroboros reduces contestability by homogenizing output. If all models converge toward similar representations, there are fewer genuinely different perspectives to contest with. A(DAI) must maintain access to non-AI-mediated signals to preserve contestability.


**forkability**

Not applicable as a system, but the concept warns that forking an ouroboric system produces another ouroboric system. Forks only help if they introduce genuinely different data sources.


**tendency_axis_position**

Diagnostic — reveals the tendency toward enclosure (AI companies closing their training loops), monoculture (computational homogeneity), and spectacle (synthetic content that appears original). The ouroboros is the anti-commons: it degrades the shared information environment.


**what_adai_should_adopt**

Ouroboros detection as a first-class concern in the pipeline. Specific mechanisms: (1) Maintain provenance tracking that distinguishes human-originated signals from AI-processed or AI-generated ones. (2) Weight raw human input (transcriptions, direct contributions) higher than processed or web-sourced material. (3) Build cycle-detection into the sensing loop — if a signal's provenance traces back through AI processing to a previous A(DAI) output, flag it. (4) Preserve access to non-digital, non-AI-mediated signal sources (live events, direct conversations, physical exhibitions). (5) The dream cycle should be explicitly tested for convergence: if successive dream cycles produce increasingly similar outputs, the system is becoming ouroboric.


**what_adai_should_refuse**

The temptation to use AI-generated summaries of the field as input signals. The scout agent should prioritize primary sources (artist statements, exhibition documentation, institutional records) over AI-generated commentary. Also refuse the assumption that more processing always produces better intelligence — sometimes the most valuable thing is unprocessed human signal.


#### Limitations, blind spots, and failure modes


**limits**

The ouroboros thesis may be overstated — not all AI-generated content is equally degrading, and filtering techniques can mitigate contamination. The 'model collapse' research is primarily about language models trained sequentially on their own output, which is a specific scenario not all systems face. The broader cultural commentary conflates technical model collapse with general content quality decline.


#### Governance models and consent architectures


**governance_model**

No governance model — the ouroboros is a diagnosis of ungoverned recursive processes. Proposed governance responses include data provenance requirements, content labeling mandates, and 'controlled AI ecosystems' (private RAG environments with validation layers).


#### Material and operational conditions


**composability**

The ouroboros concept is highly composable as a diagnostic lens — it can be applied to any system that processes and re-circulates AI-mediated content.


**liveness**

Active and accelerating — the phenomenon is ongoing and measurable. New research and commentary appears regularly.


**scale_of_operation**

Planetary — the ouroboros operates at the scale of the entire internet and global AI training ecosystem.


**temporality**

Degenerative and recursive — each cycle degrades quality. The temporal logic is one of compounding decay, analogous to information entropy. The speed of degradation depends on the ratio of synthetic to authentic content in the training pipeline.


**Uncertain fields:** who_is_excluded, consent_architecture, failure_under_attention

---


---

## Provocations & Artistic Precedents


### Forensic Architecture

**Brief:** Investigative aesthetics. Evidence infrastructure as institutional form. Art as spatial and temporal analysis.

**Garden Logic relevance:** Directly referenced as a graph node. The coherence prompt example connects FA to the consent cluster. FA demonstrates that evidence infrastructure IS an artistic practice.

#### Basic identification and classification

- **name**: Forensic Architecture
- **type**: provocation
- **originator**: Eyal Weizman / Forensic Architecture (Goldsmiths, University of London)
- **year**: 2011

**key_text**

Forensic Architecture: Violence at the Threshold of Detectability (Zone Books, 2017); Investigative Aesthetics (Verso, 2021, with Matthew Fuller)

- **key_url**: https://forensic-architecture.org/

#### Core ideas and theoretical positioning


**core_claim**

Evidence infrastructure is an artistic and political practice — buildings, images, and environments are material witnesses that can be read forensically, and the assembly of evidence constitutes a new form of public truth production that operates across courtrooms, museums, and media.


**relation_to_attention_economy**

Orthogonal to attention logic. FA does not compete for attention but produces evidence that demands sustained, careful analysis. Their work is anti-viral by nature — it requires deep engagement with spatial, temporal, and material detail. However, FA's institutional visibility (Turner Prize nomination, museum exhibitions) means it must navigate the attention economy strategically.


**relation_to_commons**

FA produces evidence as a public resource. Their investigations are published openly and made available to NGOs, courts, and journalists. The evidence infrastructure functions as an evidentiary commons — collectively produced, publicly available, and designed to serve accountability rather than profit.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Multi-source evidence synthesis through spatial-temporal modeling. FA combines photogrammetry, lidar scanning, witness testimony, satellite imagery, social media posts, and acoustic analysis into unified 3D models that reconstruct events. The architecture is the investigation itself — each case builds a bespoke evidence infrastructure.


**data_model**

Spatial-temporal graph. FA organizes evidence by placing it in three-dimensional space and time. Each piece of evidence (image, testimony, material trace) is geolocated and timestamped, then cross-referenced with other evidence to reveal convergences and contradictions. This is a typed graph with spatial and temporal coordinates.


**temporal_logic**

Archival and reconstructive. FA works backwards from present evidence to reconstruct past events. Time is treated as a forensic dimension — the sequence and duration of events are evidence in themselves. This is bi-temporal: the time of the event and the time of evidence collection are both tracked.


**absence_handling**

Central to FA's methodology. 'Negative evidence' — the absence of expected evidence — is a first-class analytical category. Missing footage, destroyed buildings, erased data, and silenced witnesses are all treated as evidence of specific actions. FA's investigation of Syria's Saydnaya prison was built entirely from absence — survivors' memories of a building they were blindfolded in.


**scalability_model**

Project-based, not platform-based. Each investigation is bespoke. FA scales by training others in their methods (through Goldsmiths and public workshops) rather than by building a platform. This is closer to guild-based scaling than technical scaling.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

Sensing loop and participation layer. FA's investigative methodology is a sensing apparatus that detects what state power attempts to hide. Their public presentations and exhibitions function at the participation layer — making evidence accessible to multiple publics.


**intention_vs_attention**

Strongly intention-oriented. FA does not optimize for engagement or novelty but for accountability — structural diagnosis of state violence. Their work reveals what IS (evidence of events) and what SHOULD BE (accountability for violations). However, FA's exhibitions inevitably circulate within the attention economy of contemporary art, creating a tension between evidence and spectacle.


**coherence_vs_consensus**

Coherence. FA's evidence models allow for multiple interpretations and readings while maintaining structural consistency. Their 3D models present evidence spatially, allowing different observers to draw different conclusions from the same data. They do not seek consensus but evidentiary coherence — the convergence of independent evidence streams.


**contestability**

Extremely high. FA's evidence is designed to be tested in adversarial forums (courts, parliamentary inquiries). Their methodology is transparent and their data is published. Counter-evidence is expected and can be integrated. This is perhaps the highest-contestability model in this research set.


**forkability**

Methodologically forkable — FA trains others in their techniques, and their open-source tools can be adapted. However, each investigation is context-specific and cannot be directly forked. The methods fork; the cases do not.


**tendency_axis_position**

Extreme openness (evidence as public resource), commons (evidentiary commons against state secrecy), infrastructure (evidence infrastructure as institutional form), distributed (multi-source, multi-forum).


**what_adai_should_adopt**

FA's treatment of absence as a first-class analytical category maps directly to A(DAI)'s gap-detection function. A(DAI) should adopt FA's methodology of negative evidence — the absence of expected signals, practitioners, or connections IS evidence of structural dynamics. Also adopt FA's multi-forum strategy: the same evidence is presented in courts, museums, media, and publications, each forum revealing different aspects. A(DAI) should similarly operate across multiple presentation contexts. Most importantly, adopt the principle that evidence infrastructure IS an artistic practice — this validates A(DAI)'s core claim that intelligence infrastructure can be an artwork.


**what_adai_should_refuse**

FA's case-based, bespoke methodology does not scale to the continuous, field-wide sensing A(DAI) requires. Refuse the forensic temporality of reconstruction (working backward from evidence) in favor of A(DAI)'s anticipatory temporality (detecting weak signals of emerging change). Also refuse FA's adversarial framing — A(DAI) is not building evidence against an opponent but mapping a field's structural dynamics for collective benefit.


#### Limitations, blind spots, and failure modes


**limits**

FA requires enormous resources (skilled researchers, technology, institutional support) for each investigation. The model does not scale easily. FA also depends on existing legal and institutional frameworks (courts, UN, NGOs) that may themselves be compromised. Their art-world visibility creates a tension between evidence and spectacle.


#### Governance models and consent architectures


**governance_model**

Academic-institutional. FA is based at Goldsmiths, University of London, with additional relationships to legal institutions, NGOs, and cultural organizations. Governance is through the research group's leadership (Weizman) and its academic context.


#### Material and operational conditions


**composability**

Modular at the method level. FA's techniques (photogrammetry, acoustic analysis, open-source investigation) are individually composable and have been adopted by other groups. But FA's investigations are monolithic — each case is a unified evidence architecture that does not decompose easily.


**liveness**

Actively maintained and evolving. FA continues to conduct investigations, develop new methods, and train practitioners. The group is one of the most vital research-practice organizations in the field.


**scale_of_operation**

Institutional to field-level. FA operates as an institution but addresses field-level concerns (human rights, state violence, environmental destruction). Individual investigations are site-specific but contribute to field-level precedents.


**temporality**

Bi-temporal and reconstructive. FA tracks both the time of events and the time of evidence collection. Investigations reconstruct past events but produce evidence that persists and can be re-examined as new information emerges.


**Uncertain fields:** epistemological_stance, who_is_excluded, failure_under_attention, structural_tension, extraction_vector, consent_architecture

---


### Hito Steyerl

**Brief:** Theory-practice of circulation, poor images, duty-free art. Institutional critique from within technology.

**Garden Logic relevance:** Graph node. Steyerl's 'In Defense of the Poor Image' is the attention-economy critique as artistic practice. Her work on duty-free art zones maps to A(DAI)'s commons-vs-enclosure tendency.

#### Basic identification and classification

- **name**: Hito Steyerl
- **type**: provocation
- **originator**: Hito Steyerl
- **year**: 2009-2017

**key_text**

Duty Free Art: Art in the Age of Planetary Civil War (Verso, 2017); 'In Defense of the Poor Image' (e-flux journal, 2009)

- **key_url**: https://www.versobooks.com/products/486-duty-free-art

#### Core ideas and theoretical positioning


**core_claim**

Art circulates within and is structurally complicit with systems of financial speculation, arms dealing, tax evasion, and planetary civil war — institutional critique must operate from within technology and circulation rather than from an imagined outside.


**relation_to_attention_economy**

Steyerl does not simply critique the attention economy — she maps how images function as currency, ammunition, and infrastructure within it. The 'poor image' circulates freely precisely because it has been stripped of exchange value, making it simultaneously liberated and degraded. Attention is the medium through which images gain or lose power.


**relation_to_commons**

Ambivalent. The poor image represents a kind of accidental commons — images that circulate freely because they have been abandoned by proprietary systems. But Steyerl shows that freeport storage (duty-free zones for art) creates an anti-commons — art withdrawn from public circulation into private wealth vaults. Her work maps the tension between commons and enclosure in the art world specifically.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Circulation analysis. Steyerl's implicit architecture is a network-flow model: images move through systems of production, distribution, storage, and destruction. The pattern is topological — what matters is not the content of images but their paths through institutional, financial, and military networks.


**data_model**

Images as data objects with metadata including provenance, circulation history, financial transactions, and institutional affiliations. Steyerl treats images as having material lives — they are produced, circulated, stored, hidden, destroyed, and resurrected. This is closer to a supply-chain model than a content model.


**temporal_logic**

Circulatory. Time is measured in cycles of image production, distribution, and decay. The 'poor image' degrades over time through compression and copying. Art in freeports exists in suspended time — stored indefinitely, never exhibited. Steyerl maps multiple temporal regimes coexisting within the same image economy.


**absence_handling**

Steyerl's 'How Not To Be Seen' addresses absence as resistance — disappearance from the image economy as a political act. Absence is both a survival strategy (avoiding surveillance) and a symptom of power (art hidden in freeports). She treats visibility and invisibility as political categories, not merely perceptual ones.


**scalability_model**

Planetary. Steyerl's analysis operates at the scale of global image circulation — from conflict zones to freeport vaults to museum exhibitions. The system she describes is already at planetary scale.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

Sensing loop and prompt-generation. Steyerl's mapping of image circulation as structural analysis is a sensing operation. Her critiques function as prompts — they reveal structural dynamics that demand response.


**intention_vs_attention**

Steyerl operates within the attention economy while critiquing it — her work is some of the most visible in contemporary art (ArtReview Power 100 #1, 2017). This is not hypocrisy but method: she demonstrates that there is no pure outside from which to critique attention. A(DAI)'s intention economy must reckon with this — intention cannot simply be opposed to attention but must be built within and against attention systems.


**coherence_vs_consensus**

Coherence through contradiction. Steyerl's method embraces paradox — art is both liberation and weapon, images are both information and currency. She does not resolve contradictions but maps them structurally. This is a form of coherence that includes internal tension as a feature, not a bug.


**contestability**

Inherently contestable. Steyerl's work provokes disagreement by design. Her essays are polemical, her installations are disorienting, and her arguments are deliberately paradoxical. The work generates debate rather than consensus.


**forkability**

Steyerl's analytical method is highly forkable — her approach to circulation analysis can be applied to any cultural system. However, her specific arguments are tied to the art world's particular political economy.


**tendency_axis_position**

Maps the full spectrum rather than occupying a fixed position. Steyerl shows how the same image can be simultaneously open and enclosed, commons and captured, spectacle and infrastructure. Her contribution is diagnostic rather than positional — she reveals the tendency dynamics within cultural systems.


**what_adai_should_adopt**

Steyerl's mapping of commons-vs-enclosure dynamics specifically within the art world. Her analysis of duty-free art zones (art withdrawn from circulation into financial instruments) maps directly to A(DAI)'s tendency analysis. Adopt her method of treating circulation patterns as evidence of structural dynamics. Also adopt her refusal of the purity position — A(DAI) cannot pretend to operate outside the systems it critiques. The system must be self-aware about its own position within attention and financial economies.


**what_adai_should_refuse**

Steyerl's implicit nihilism. Her analysis can produce a sense that all positions are compromised, all alternatives are co-opted, and critique itself is merely content for the system it critiques. A(DAI) must refuse this paralysis while maintaining Steyerl's structural awareness. Also refuse the spectacularization of critique — Steyerl's art-world success demonstrates how critical positions can become premium content.


#### Limitations, blind spots, and failure modes


**limits**

Steyerl's work is brilliant as diagnosis but limited as prescription. She does not build alternatives. Her method of critique-from-within risks becoming a comfortable art-world position that substitutes visibility for transformation. The work is also primarily legible to art-world audiences, limiting its reach.


#### Governance models and consent architectures


**governance_model**

No formal governance model proposed. Steyerl operates as an individual artist-theorist within institutional contexts (galleries, universities, publishers). Her work critiques existing governance structures without proposing alternatives.


#### Material and operational conditions


**composability**

Library-level. Steyerl's concepts (poor images, duty-free art, how not to be seen) are highly composable — they function as analytical tools that can be applied across contexts. Her essays are modular and can be read independently.


**liveness**

Actively maintained. Steyerl continues to exhibit, write, and teach. Her work remains among the most cited in contemporary art theory and practice.


**scale_of_operation**

Planetary. Steyerl's analysis spans from individual images to global financial systems, military-industrial complexes, and planetary civil war. Her scale of operation matches the phenomena she analyzes.


**temporality**

Circulatory and decay-oriented. Images degrade through circulation (poor images), accumulate financial value through storage (freeport art), and oscillate between visibility and invisibility. Time is measured in circulation cycles rather than linear progression.


**Uncertain fields:** epistemological_stance, who_is_excluded, failure_under_attention, structural_tension, extraction_vector, consent_architecture

---


### Holly Herndon + Mat Dryhurst + Spawning

**Brief:** Consent-based AI art. Protocol as practice. Artist-led infrastructure.

**Garden Logic relevance:** The practitioner-as-institution-builder case study. Herndon's trajectory from album to protocol is the 'myth prompt' example — the graph documenting artists building infrastructure, not just making work.

#### Basic identification and classification

- **name**: Holly Herndon + Mat Dryhurst + Spawning
- **type**: provocation
- **originator**: Holly Herndon, Mat Dryhurst
- **year**: 2019-2022
- **key_text**: Spawning / Have I Been Trained? platform; Holly+ voice protocol (2021); PROTO album (2019)
- **key_url**: https://spawning.ai/

#### Core ideas and theoretical positioning


**core_claim**

Artists can and should build the consent infrastructure for AI — protocol design is itself an artistic practice, and the 'spawning' of new works from training data demands new frameworks for consent, attribution, and collective ownership.


**relation_to_attention_economy**

Side-steps attention logic entirely. Herndon/Dryhurst focus on the infrastructure layer beneath the attention economy — the training data, consent protocols, and attribution systems that determine who benefits from AI-generated content. They shift the conversation from 'who gets attention' to 'who consented to their data being used.'


**relation_to_commons**

Directly commons-building. Spawning's tools (Have I Been Trained?, Source.Plus) create infrastructure for collective data governance. The PD12M public-domain dataset is an explicit commons resource. Holly+ — an AI voice clone available for anyone to use — proposes a new model of creative commons where the artist's voice becomes a shared instrument.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Protocol-based consent infrastructure. Spawning builds machine-readable consent signals — opt-in/opt-out mechanisms that can be read by AI training pipelines. This is closer to web standards (robots.txt for AI) than to traditional art practice. The architecture is a consent layer that sits between data sources and AI training systems.


**data_model**

Dataset-centric. Spawning's primary data objects are training datasets (LAION-5B, PD12M) and the images/works within them. Each work has associated consent metadata: who created it, whether they consent to AI training, under what conditions. This is a provenance-rich data model with consent as a first-class property.


**temporal_logic**

Real-time consent management. Spawning's tools allow creators to update their consent preferences dynamically — opt in, opt out, or set conditions at any time. This is a living consent system rather than a one-time agreement.


**absence_handling**

Absence of consent is treated as a positive signal — if a creator has not opted in, the default position is that their work should not be used for training. This 'consent by default' approach treats absence as protective rather than permissive.


**scalability_model**

Protocol-level scaling. Spawning's consent infrastructure is designed to scale through standardization — if major AI companies adopt the protocol, it scales automatically. Have I Been Trained? already works with 5.8 billion images. This is standards-based scaling.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

Substrate and participation layers. Spawning's consent infrastructure operates at the substrate level — it defines the foundational rules for how data flows through AI systems. Holly+ and The Call operate at the participation layer — they create new modes of collective creative engagement.


**intention_vs_attention**

Strongly intention-oriented. Spawning replaces 'who gets the most attention?' with 'who consented and who benefits?' This is structural diagnosis applied to AI training: the system reveals whose labor is extracted without consent. Holly+ proposes an intention model where the artist's voice is shared not for attention but for collective creative use.


**coherence_vs_consensus**

Both, strategically. Spawning seeks industry consensus on consent standards (working with the EU AI Act, engaging major AI companies) while maintaining coherence with artistic values (consent, attribution, collective benefit). They build consensus on protocols while preserving space for divergent creative uses.


**contestability**

Moderate. Spawning's consent tools allow individual contestation — each creator can opt out. But the overall protocol design is relatively centralized (Spawning decides the architecture). The system is contestable at the individual level but less so at the protocol level.


**forkability**

Moderately forkable. The open-source tools can be forked. PD12M is a public dataset that can be used by anyone. However, the consent protocol's value depends on industry adoption, which creates network effects that resist forking.


**tendency_axis_position**

Strong openness (open-source tools, public datasets), strong commons (collective consent infrastructure), infrastructure (protocol design as practice), distributed (individual consent aggregated into collective standards). Herndon/Dryhurst sit at the commons-infrastructure intersection.


**what_adai_should_adopt**

The practitioner-as-institution-builder model. Herndon/Dryhurst demonstrate that artists can build infrastructure, not just critique it. A(DAI) should study their trajectory as a case study in how artistic practice can produce institutional form. Adopt the consent-by-design principle: A(DAI)'s provenance system should treat consent as a first-class property of every signal and node. Also adopt the protocol-as-artwork concept — A(DAI)'s architecture IS its artistic contribution, just as Spawning's consent protocol is theirs.


**what_adai_should_refuse**

The dependency on industry adoption. Spawning's impact depends on major AI companies respecting their consent signals. A(DAI) should not build infrastructure that requires cooperation from the platforms it critiques. Also refuse the binary opt-in/opt-out model — A(DAI)'s consent architecture should support more nuanced, graduated, and contextual consent than a simple toggle.


#### Limitations, blind spots, and failure modes


**limits**

Spawning's impact depends on voluntary adoption by AI companies. Without regulatory enforcement, consent signals can be ignored. The consent model also faces the problem of retroactive training — works already used to train existing models cannot be 'un-trained.' The focus on visual art and music may not translate to other domains.


#### Governance models and consent architectures


**governance_model**

Hybrid: cooperative ethos with startup execution. Spawning operates as a company but with commons-oriented goals. The governance is centralized in the founding team but the outputs (datasets, tools) are designed for collective benefit. This hybrid model is pragmatic but creates tensions around accountability.


#### Material and operational conditions


**composability**

Protocol-level and API-first. Spawning's tools are designed to be embedded in other systems — AI training pipelines, image databases, creative platforms. The consent protocol is maximally composable by design.


**liveness**

Actively maintained and rapidly evolving. Spawning continues to develop new tools, expand partnerships, and engage with regulatory processes. The project is at peak liveness.


**scale_of_operation**

Field-level to planetary. Have I Been Trained? operates at the scale of billions of images. The EU AI Act influence is planetary. But individual creator engagement is at the individual/small-group level.


**temporality**

Real-time consent with historical awareness. Spawning tracks both current consent preferences and the history of data usage. The system is forward-looking (preventing future extraction) while acknowledging historical extraction that cannot be undone.


**Uncertain fields:** epistemological_stance, who_is_excluded, failure_under_attention, structural_tension, extraction_vector, consent_architecture

---


### Sougwen Chung

**Brief:** Human-machine collaboration. D.O.U.G. series. V&A model acquisition. WEF Spectral performance.

**Garden Logic relevance:** The Garden Logic's primary trajectory analysis case. The open-source → proprietary → elite-adjacent arc is the intention system's diagnostic in action.

#### Basic identification and classification

- **name**: Sougwen Chung
- **type**: provocation
- **originator**: Sougwen Chung / Scilicet studio
- **year**: 2015-present
- **key_text**: Drawing Operations Unit: Generation 1-6 (DOUG series, 2015-present); MEMORY (V&A acquisition, 2022)
- **key_url**: https://sougwen.com/

#### Core ideas and theoretical positioning


**core_claim**

Human-machine collaboration is not a tool relationship but a genuine co-creative process — the 'mistakes' and emergent behaviors of robotic systems constitute a form of distributed authorship that challenges individual creative agency.


**relation_to_attention_economy**

Chung's work generates significant attention (WEF Davos, V&A, Art Basel), but the practice itself is attention-intensive in a different sense — it requires deep, sustained engagement between human and machine. The spectacle of the performance risks overshadowing the process, but the process itself demands the kind of slow, embodied attention that resists the attention economy's logic.


**relation_to_commons**

Complex trajectory. DOUG 1 began with open-source hardware and software — a commons-oriented starting point. Subsequent generations have become more proprietary and elite-adjacent (V&A acquisition, WEF Davos performance). Chung speaks of 'collective authorship' but the institutional trajectory suggests individual branding within the art market.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Feedback loop between human and machine. DOUG uses computer vision to track Chung's drawing in real-time, converts movements to coordinates, and drives a robotic arm that draws alongside the human. Later generations add neural networks trained on Chung's previous work, swarm robotics trained on surveillance data, and EEG-based brain-computer interfaces. The architecture is a tightly coupled human-machine feedback system.


**data_model**

Motion data and visual traces. The primary data objects are: pen positions (x,y coordinates), trajectory paths, video streams, neural network weights trained on Chung's previous work, and (in DOUG 4) EEG brainwave signals. Each generation adds a new data layer to the human-machine interface.


**temporal_logic**

Real-time and accumulative. Each DOUG performance operates in real-time (live drawing with robotic collaboration). But the neural network training creates a temporal depth — DOUG 2 and beyond draw on Chung's historical work, creating a system that remembers and interprets past practice. The temporality is both immediate (live performance) and historical (trained on years of practice).


**absence_handling**

Chung treats the machine's 'mistakes' — unexpected movements, misinterpretations, errant marks — as productive absences. What the machine gets 'wrong' about human gesture is where the collaboration becomes creative. Absence of perfect reproduction IS the art.


**scalability_model**

Individual to institutional. The practice is inherently personal (Chung's body, Chung's drawings, Chung's brainwaves) but scales through institutional visibility (V&A, WEF, Art Basel). The scaling is reputational rather than technical — the system itself does not scale, but its influence does.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

Sensing loop (the DOUG feedback system is a sensing apparatus) and participation layer (the performances create public engagement with human-machine collaboration).


**intention_vs_attention**

The practice sits at a tension point. The process is intention-oriented — deep engagement with human-machine collaboration as an inquiry into distributed agency. But the institutional trajectory is attention-oriented — WEF Davos, Art Basel, V&A acquisition represent increasing capture by attention-economy institutions. This trajectory is precisely what makes Chung a 'primary trajectory analysis case study' for A(DAI)'s Garden Logic.


**coherence_vs_consensus**

Coherence. The DOUG series maintains structural consistency (human-machine drawing collaboration) while allowing each generation to diverge significantly in methods and meaning. There is no consensus to seek — the work embraces the open-endedness of machine responses as constitutive of its coherence.


**contestability**

Low institutional contestability. Chung's work circulates within the art world's systems of validation (museums, biennials, WEF), which are not designed for contestation. The work itself is open to interpretation, but its institutional framing is not easily challenged.


**forkability**

DOUG 1 was inherently forkable — built from open-source components, anyone could build their own version. But as the series progresses, the work becomes less forkable: proprietary neural networks trained on Chung's specific gesture data, custom hardware, institutional relationships. The open-source-to-proprietary arc IS the trajectory A(DAI) should analyze.


**tendency_axis_position**

Trajectory from openness toward enclosure. DOUG 1 (open-source hardware) sits at the openness end. DOUG 6/Spectral (WEF Davos) sits closer to enclosure. The trajectory across the DOUG series maps the gravitational pull from commons to capture, from infrastructure to spectacle, from distributed practice to individual brand. This is the most instructive tendency-axis trajectory in this research set.


**what_adai_should_adopt**

Chung's trajectory as the primary case study for A(DAI)'s tendency analysis. The DOUG series demonstrates in real-time how an open-source, commons-oriented practice gets pulled toward proprietary, spectacle-driven, elite-institutional capture. A(DAI) should use this trajectory to test its own tendency-detection apparatus: can the system detect and name this drift while it is happening? Also adopt Chung's treatment of machine 'mistakes' as productive — A(DAI)'s gap-detection should similarly treat unexpected signals as generative rather than erroneous.


**what_adai_should_refuse**

The individual-genius framing that Chung's institutional trajectory reinforces. Despite Chung's discourse of 'collective authorship,' the art market treats DOUG as Sougwen Chung's work, reinforcing individual branding over distributed practice. A(DAI) must refuse this gravitational pull toward individual attribution and maintain its commitment to collective intelligence. Also refuse the elite-institutional validation circuit (WEF, Art Basel) as the measure of significance.


#### Limitations, blind spots, and failure modes


**limits**

Chung's practice is inherently personal and non-transferable — the neural networks are trained on Chung's specific gesture data, the EEG interfaces require Chung's brain. This makes the practice a fascinating case study but not a scalable model. The art-world validation circuit (V&A, WEF) creates dependencies on institutional attention that may constrain artistic freedom.


#### Governance models and consent architectures


**governance_model**

Sovereign individual. Chung governs the DOUG series as an individual artist with studio support (Scilicet). Institutional relationships (V&A, WEF) are transactional rather than governing. There is no commons governance of the practice or its outputs.


#### Material and operational conditions


**composability**

Increasingly monolithic. DOUG 1's open-source components were composable. Subsequent generations are custom-built and tightly integrated. The practice has moved from modular/composable to monolithic/proprietary.


**liveness**

Actively maintained and evolving. Chung continues to develop new DOUG generations and exhibit internationally. The practice is at peak liveness.


**scale_of_operation**

Individual to institutional. The practice originates at the individual scale (one artist, one robot) but operates at the institutional scale through museum acquisitions and elite events.


**temporality**

Accumulative and real-time. Each DOUG generation builds on the previous ones — neural networks remember past drawings. Performances operate in real-time. The temporal logic is layered: immediate performance on top of accumulated practice history.


**Uncertain fields:** epistemological_stance, who_is_excluded, failure_under_attention, structural_tension, extraction_vector, consent_architecture

---


### Jonas Staal — New World Summit

**Brief:** Art as institutional infrastructure. Parliamentary aesthetics. Assemblies as artwork.

**Garden Logic relevance:** Staal makes institutions AS art. A(DAI) IS an institution-as-artwork. Direct structural parallel: the system's architecture is its critique.

#### Basic identification and classification

- **name**: Jonas Staal — New World Summit
- **type**: provocation
- **originator**: Jonas Staal
- **year**: 2012-present
- **key_text**: Propaganda Art in the 21st Century (MIT Press, 2019); New World Summit project (2012-present)
- **key_url**: https://newworldsummit.org/

#### Core ideas and theoretical positioning


**core_claim**

Art can create institutional infrastructure — parliaments, embassies, and assemblies designed as artworks become functioning political spaces for stateless and blacklisted groups excluded from existing democratic forums.


**relation_to_attention_economy**

Staal's assemblies refuse attention logic by demanding physical presence, sustained deliberation, and structural engagement. These are not spectacles to be consumed but spaces to be inhabited. However, the projects gain visibility through the art world's attention circuits (museums, biennials, publications), creating a productive tension between the work's anti-spectacle function and its art-world circulation.


**relation_to_commons**

Explicitly commons-building. Staal constructs shared political infrastructure for communities denied access to existing democratic commons. The parliaments are commons in the most literal sense — shared spaces for collective deliberation. The project's outputs (architectural designs, proceedings, documentation) are public resources.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Assembly architecture. Each New World Summit is a purpose-designed space — circular, non-hierarchical, with specific sight-lines and acoustic properties. The architectural form IS the political technology. Staal designs these as sculptures that function as parliaments and parliaments that function as sculptures.


**data_model**

Proceedings and architectural records. Each summit produces transcripts, video documentation, architectural drawings, and political declarations. The data model is archival-performative: both the documentation and the live event constitute the work.


**temporal_logic**

Durational and prefigurative. Staal's assemblies are not one-time events but 'durational organizing' — ongoing processes that build toward new political forms. The Rojava parliament is permanent architecture. The temporality is prefigurative: the assembly enacts the future political form it advocates.


**absence_handling**

Staal's entire project is structured around political absence — the exclusion of stateless and blacklisted groups from democratic participation. The New World Summit makes this absence visible by constructing alternative forums. Absence is not a gap to be filled but a political condition to be addressed architecturally.


**scalability_model**

Federated. Each New World Summit is site-specific and context-dependent, but they share a common framework. The Rojava parliament demonstrates permanent scaling, while other summits are temporary. The model scales through replication and adaptation rather than centralized growth.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

Participation layer primarily. Staal's assemblies are participatory infrastructure par excellence. But the architectural design of each assembly also operates at the substrate layer — the physical form determines what kinds of participation are possible.


**intention_vs_attention**

Strongly intention-oriented. Staal's assemblies are designed to produce structural diagnosis of political exclusion and to build institutional responses. The intention is explicit: to create 'alternative global political infrastructure for non-statist politics.' This is not gap detection in A(DAI)'s sense but gap construction — building institutions where none exist.


**coherence_vs_consensus**

Both, depending on context. Within each assembly, participants seek consensus on political declarations and actions. But across the New World Summit project as a whole, coherence is maintained through shared commitment to the project's principles while allowing each summit to address different contexts and constituencies.


**contestability**

High. The assemblies are designed as deliberative spaces where disagreement is productive. The inclusion of diverse stateless and blacklisted groups ensures that internal contestation is a feature of the process. However, the overarching framework (art as political infrastructure) is less contestable — it is Staal's artistic vision.


**forkability**

Highly forkable at the conceptual level. The idea of constructing alternative assemblies as artworks can be replicated in any context. The Rojava parliament demonstrates that the model can be forked into permanent infrastructure. However, each fork requires significant resources and political relationships.


**tendency_axis_position**

Extreme openness (creating access for excluded groups), extreme commons (building shared political infrastructure), strong infrastructure (institutional form as primary output), distributed (multiple summits across geographies, each adapted to local context).


**what_adai_should_adopt**

The principle that institutions can be artworks and artworks can be institutions. Staal demonstrates that the distinction between 'art about politics' and 'political infrastructure' can be collapsed. A(DAI) IS an institution-as-artwork in this lineage. Also adopt Staal's treatment of absence as a design driver — the New World Summit exists because democratic forums exclude certain groups, just as A(DAI) exists because the attention economy excludes structural diagnosis. Adopt the assembly as a technology: the morphology of gathering shapes what can be thought and decided.


**what_adai_should_refuse**

Staal's dependence on the charismatic artist-as-organizer. While Staal theorizes collective infrastructure, the project depends heavily on his vision, networks, and reputation. A(DAI) must build infrastructure that persists beyond individual founders. Also refuse the high-stakes political framing — A(DAI) operates in cultural rather than military-political contexts, and importing the language of 'statelessness' and 'blacklisting' would be inappropriate.


#### Limitations, blind spots, and failure modes


**limits**

Staal's projects depend on his personal networks, reputation, and art-world position. The model is labor-intensive, resource-heavy, and difficult to sustain without institutional support. The political groups Staal works with operate in extremely complex and dangerous contexts, and the art-world framing can sometimes inadequately represent the gravity of their situations.


#### Governance models and consent architectures


**governance_model**

Hybrid: artistic direction with collective deliberation. Staal designs the framework and selects participants, but the assembly proceedings are self-governing. The Rojava parliament has its own governance structure independent of Staal. This is a transitional governance model — the artist initiates, then cedes control.


#### Material and operational conditions


**composability**

Modular at the conceptual level. The 'parliament as artwork' model can be applied to many contexts. The architectural designs can be adapted. But each instantiation requires significant bespoke work.


**liveness**

Actively maintained. Staal continues to develop new summits, exhibitions, and publications. The Rojava parliament is permanent and operational. The project is at full liveness.


**scale_of_operation**

Institutional to planetary. Individual summits are site-specific, but the project spans continents and addresses global political dynamics. The 'infrastructure of infrastructures' exhibition brings the full project to institutional scale.


**temporality**

Durational and prefigurative. The assemblies are ongoing processes, not discrete events. The Rojava parliament is permanent. The temporality is one of institution-building — patient, accumulative, and oriented toward long-term structural change.


**Uncertain fields:** epistemological_stance, who_is_excluded, failure_under_attention, structural_tension, extraction_vector, consent_architecture

---


### Furtherfield

**Brief:** 25+ year commons-first art platform. Art Data Money program. DECAL lab.

**Garden Logic relevance:** The longest-running precedent for commons-first digital art infrastructure. Tests whether commons-first institutions survive at scale. What did they learn in 25 years?

#### Basic identification and classification

- **name**: Furtherfield
- **type**: provocation
- **originator**: Ruth Catlow, Marc Garrett
- **year**: 1996-present

**key_text**

Artists Re:Thinking the Blockchain (2017); Radical Friends: Decentralised Autonomous Organisations and the Arts (2022)

- **key_url**: https://www.furtherfield.org/

#### Core ideas and theoretical positioning


**core_claim**

Commons-first digital art infrastructure can be sustained over decades — art, technology, and social change are inseparable, and building cooperative cultural infrastructure is itself an artistic practice.


**relation_to_attention_economy**

Furtherfield predates the attention economy's dominance. Founded in 1996, it was built on the open web's early commons logic — before the great centralization. Its persistence demonstrates that alternatives to attention-driven platforms are viable, though fragile. Furtherfield actively refuses attention-economy metrics (viral reach, engagement optimization) in favor of depth-of-engagement and community building.


**relation_to_commons**

Quintessentially commons-oriented. Every aspect of Furtherfield's operation — from its gallery (in a London park) to its DECAL lab to its publications — is designed to be a commons resource. The Art Data Money programme explicitly sought 'a new commons for the arts in the age of networks.' DECAL uses blockchain and web3 to build 'fairer, more dynamic and connected cultural ecologies and economies.'


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Commons infrastructure stack: web platform + physical gallery + lab programs + publications + blockchain/web3 experiments. Furtherfield operates as a layered commons, with each layer supporting the others. The DECAL lab specifically explores decentralized infrastructure (DAOs, blockchain, cooperative platforms).


**data_model**

Archival-relational. Furtherfield maintains decades of documentation — exhibitions, commissions, publications, lab proceedings — as a public archive. The DECAL lab experiments with decentralized data models (blockchain provenance, DAO governance records). The data model spans from traditional web archives to experimental web3 structures.


**temporal_logic**

Durational persistence. Furtherfield's primary temporal logic is simply persisting — maintaining commons infrastructure for nearly 30 years despite funding precarity, platform changes, and cultural shifts. This durational quality is itself an achievement: the system's longevity IS its argument.


**absence_handling**

Furtherfield fills the absence of commons-first digital art infrastructure. Their existence addresses a structural gap — the lack of long-term, cooperative, non-commercial platforms for digital art. The DECAL lab specifically addresses the absence of fair economic models for artists in the digital age.


**scalability_model**

Federated/cooperative. Furtherfield scales through partnerships, networks, and shared programs rather than platform growth. DAOWO (the blockchain lab series) was a partnership with Goethe Institut. The model is relational scaling — growing through connections rather than size.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

All layers. Furtherfield operates across A(DAI)'s entire stack: substrate (27 years of infrastructure), sensing loop (labs and exhibitions that surface emerging practices), prompt-generation (publications and debates that frame questions), and participation (gallery, community engagement, cooperative programs).


**intention_vs_attention**

Firmly intention-oriented. Furtherfield has never optimized for attention metrics. Their intention has been consistent for nearly 30 years: build commons infrastructure for digital art. This consistency IS their argument — sustained intention rather than attention-seeking novelty.


**coherence_vs_consensus**

Coherence through practice. Furtherfield maintains coherence not through formal agreement but through consistent practice over decades. Different programs, exhibitions, and labs may take different approaches, but they cohere around the commons-first principle. This is organic coherence, not imposed consensus.


**contestability**

Moderate. Furtherfield's programs are open to diverse perspectives, and their lab format encourages experimentation and disagreement. But the organization's core commitments (commons, cooperation, social change) are not up for contestation — they are the foundation on which everything else is built.


**forkability**

Highly forkable in principle. Furtherfield's model (commons-first gallery/lab/publication platform) can be replicated anywhere. Their publications and documentation provide a template. However, the durational quality — 27 years of relationships and institutional knowledge — cannot be forked.


**tendency_axis_position**

Extreme openness, extreme commons, extreme infrastructure, distributed. Furtherfield sits at the far commons-infrastructure end of every tendency spectrum. This consistency over nearly three decades makes it the definitive precedent for commons-first digital art infrastructure.


**what_adai_should_adopt**

The durational commitment. Furtherfield's primary lesson is that commons infrastructure requires sustained institutional commitment measured in decades, not funding cycles. A(DAI) should adopt this long-term orientation. Also adopt the multi-layer approach: Furtherfield combines physical space, digital platform, lab programs, and publications into a coherent commons stack. A(DAI)'s git-first intelligence layer is the digital equivalent, but it should aspire to the institutional depth that Furtherfield has built. Adopt DECAL's specific experiments with DAO governance for arts organizations as potential models for A(DAI)'s own governance evolution.


**what_adai_should_refuse**

Furtherfield's chronic underfunding and precarity. While admirable, the 27-year struggle for sustainability is not a model to emulate — it is a warning. A(DAI) must build economic sustainability into its architecture from the beginning, not rely on grant cycles and goodwill. Also refuse the web3/blockchain orientation that characterized DECAL's later work — the blockchain hype cycle has largely deflated, and A(DAI)'s git-first approach is more appropriate than blockchain for its provenance needs.


#### Limitations, blind spots, and failure modes


**limits**

Chronic underfunding. Furtherfield's 27 years of operation have been a constant struggle for resources. The organization has never achieved financial sustainability independent of grants and public funding. This precarity limits growth, institutional stability, and the ability to attract diverse talent. The web3/blockchain orientation of DECAL may have been partly driven by the need to explore new funding models.


#### Governance models and consent architectures


**governance_model**

Cooperative/non-profit. Furtherfield operates as a non-profit organization with cooperative principles. The DECAL lab experiments with DAO governance models for arts organizations. Governance is small-team based, with the founders maintaining significant influence.


#### Material and operational conditions


**composability**

Highly composable. Furtherfield's model, tools, and publications can be adopted, adapted, and recombined by others. The Art Data Money programme produced frameworks, publications, and lab formats that have been replicated elsewhere.


**liveness**

Actively maintained despite precarity. Furtherfield continues to operate, though with reduced capacity compared to peak periods. The organization has survived multiple funding crises and platform transitions over 27 years.


**scale_of_operation**

Small group/scene to institutional. Furtherfield operates at the community and scene level, with institutional partnerships extending its reach. It has never achieved field-level scale, which is both a limitation and a feature of its commons orientation.


**temporality**

Durational persistence and cyclical programming. Furtherfield operates in program cycles (exhibitions, lab series, publications) within a framework of long-term institutional persistence. The durational quality — nearly 30 years — is its most distinctive temporal feature.


**Uncertain fields:** epistemological_stance, who_is_excluded, failure_under_attention, structural_tension, extraction_vector, consent_architecture

---


### Benjamin Bratton — The Stack

**Brief:** Planetary-scale computation as accidental megastructure. Six layers of geopolitical infrastructure.

**Garden Logic relevance:** The Stack is the infrastructure A(DAI) operates within. A(DAI) is a deliberate, commons-first structure inside Bratton's accidental, sovereignty-eroding megastructure.

#### Basic identification and classification

- **name**: Benjamin Bratton — The Stack
- **type**: provocation
- **originator**: Benjamin H. Bratton
- **year**: 2015
- **key_text**: The Stack: On Software and Sovereignty (MIT Press, 2015; 10th anniversary edition, 2025)
- **key_url**: https://mitpress.mit.edu/9780262029575/the-stack/

#### Core ideas and theoretical positioning


**core_claim**

Planetary-scale computation forms an accidental megastructure — The Stack — with six layers (Earth, Cloud, City, Address, Interface, User) that distorts traditional political geography, creating new forms of sovereignty irreducible to states or markets.


**relation_to_attention_economy**

Bratton does not focus on attention specifically but provides the infrastructural map on which the attention economy operates. The Stack shows that attention capture is not a software problem but a planetary-scale infrastructure problem spanning mineral extraction to user interfaces. The attention economy is one layer-phenomenon within a much larger computational megastructure.


**relation_to_commons**

Ambivalent. Bratton describes platforms as new sovereign entities that are 'reducible to neither states nor markets,' which implies they could be commons but usually are not. The Stack as an accidental megastructure is a kind of anti-commons — its structure was not designed for collective benefit but emerged from corporate and military imperatives. However, Bratton's later work (Antikythera program) explores how computational infrastructure might be designed differently.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Six-layer stack: Earth, Cloud, City, Address, Interface, User. This is a conceptual architecture borrowed from network engineering (TCP/IP, OSI model) and applied to geopolitical analysis. Each layer has its own logic but interacts with adjacent layers. The model is compositional — planetary computation emerges from the interaction of all six layers.


**data_model**

Layer-based ontology. Each entity in Bratton's framework is classified by its primary layer and its cross-layer interactions. Users, interfaces, addresses, cities, clouds, and earth resources are all nodes in a multi-layer graph. The relationships between layers are the primary analytical objects.


**temporal_logic**

Geological to real-time. The Stack spans from geological time (Earth layer: mineral formation, extraction) to real-time (Interface layer: user interaction). Different layers operate at different temporal scales, and Bratton's analysis tracks how these temporalities interact — fast interfaces depend on slow geology.


**absence_handling**

Bratton identifies 'accidental' qualities of the Stack — it was not designed as a whole, so its absences are not planned but emergent. Missing layers, broken connections, and unaddressed externalities (e-waste, energy consumption, labor exploitation) are structural features of the accidental megastructure. The Stack does not handle absence — it produces it.


**scalability_model**

Planetary by definition. The Stack IS planetary-scale computation. It does not scale — it is already at maximum scale. The question is not how to scale it but how to govern, redirect, or redesign it.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

Meta-layer — The Stack maps the infrastructure WITHIN which A(DAI) operates. A(DAI)'s substrate sits within the Stack's Cloud and Interface layers. The Stack provides the context for understanding what A(DAI) is built on top of and cannot escape.


**intention_vs_attention**

Bratton does not directly address the intention/attention distinction, but his framework implies that both intention and attention economies operate within the same Stack. The question becomes: can A(DAI) build an intention-oriented system within infrastructure designed for other purposes? Bratton's framework suggests that infrastructure shapes what is possible — the Stack enables attention capture because its layers were built for it.


**coherence_vs_consensus**

Coherence at the analytical level. Bratton's six-layer model provides structural coherence to a phenomena that appears chaotic. He does not seek consensus about what the Stack should be but rather coherent understanding of what it IS. This diagnostic coherence is similar to A(DAI)'s dream cycle function.


**contestability**

Highly contestable as theory. Geert Lovink described The Stack as 'inspiring to disagree with.' The six-layer model can be contested, alternative layerings proposed, and different emphases given to different layers. However, Bratton's framework does not build contestability as a system property.


**forkability**

The conceptual framework is forkable — anyone can propose alternative layerings or different analyses of planetary computation. But the Stack itself (as infrastructure) is not forkable — you cannot fork Google or the mineral supply chain.


**tendency_axis_position**

Descriptive rather than positional. Bratton maps the tendency spectrum rather than occupying a position on it. The Stack contains elements of openness and enclosure, commons and capture, spectacle and infrastructure simultaneously. His contribution is the map, not a position on the map.


**what_adai_should_adopt**

The Stack as the map of A(DAI)'s operating environment. A(DAI) should understand itself as a system operating within Bratton's six layers: dependent on Earth (energy, minerals for servers), Cloud (hosting, compute), City (the physical locations of its users), Address (identifiers for nodes and signals), Interface (how intelligence is presented), and User (who participates). This mapping creates accountability — A(DAI) cannot claim to be a commons while depending on extractive infrastructure. Also adopt the multi-temporal perspective: A(DAI) should recognize that its intelligence operates across multiple temporal scales, from real-time signal capture to geological-scale resource dependencies.


**what_adai_should_refuse**

Bratton's implicit technological determinism — the sense that the Stack is inevitable and can only be analyzed, not transformed. A(DAI) must insist that alternatives are possible within the Stack, even if they cannot escape it entirely. Also refuse the scale fetishism — The Stack's planetary scope can produce paralysis. A(DAI) operates at field-level, which is the appropriate scale for cultural intelligence even within a planetary computational megastructure.


#### Limitations, blind spots, and failure modes


**limits**

The Stack's six-layer model may oversimplify the actual complexity of planetary computation. The framework is highly abstract and can be difficult to operationalize. Bratton's writing is notoriously dense, limiting accessibility. The framework describes more than it prescribes — it maps the terrain but provides limited guidance for building alternatives.


#### Governance models and consent architectures


**governance_model**

Bratton describes platforms as new sovereign entities — neither states nor markets — with their own governance logics. His later work (Antikythera) explores speculative governance models for planetary computation. The governance question in The Stack is open: who governs the accidental megastructure?


#### Material and operational conditions


**composability**

Conceptually highly composable. The six-layer model can be applied to analyze any computational system. Each layer can be examined independently or in relation to others. The framework functions as an analytical toolkit.


**liveness**

Actively maintained and evolving. Bratton continues to develop the framework through Antikythera (speculative philosophy of computation), new publications, and teaching. A 10th anniversary edition was published in 2025.


**scale_of_operation**

Planetary. The Stack is defined at planetary scale. Individual analyses within the framework can focus on smaller scales, but the overall model is planetary by definition.


**temporality**

Multi-temporal — geological (Earth), infrastructure-historical (Cloud, City), real-time (Interface, User), and anticipatory (Bratton's later speculative work). The Stack spans all temporal scales, which is both its analytical power and its daunting scope.


**Uncertain fields:** epistemological_stance, who_is_excluded, failure_under_attention, structural_tension, extraction_vector, consent_architecture

---


### Crawford & Joler — Calculating Empires (2023)

**Brief:** 24-meter genealogy of technology and power, 1500-2025. Communication/computation + control/classification. Silver Lion Venice 2025.

**Garden Logic relevance:** The deep-historical frame for A(DAI)'s myth prompts. If the sensing layer runs CLA at the narrative level, Calculating Empires shows what 500 years of that analysis looks like.

#### Basic identification and classification

- **name**: Crawford & Joler — Calculating Empires (2023)
- **type**: provocation
- **originator**: Kate Crawford (USC, Microsoft Research), Vladan Joler (University of Novi Sad, Share Lab)
- **year**: 2023
- **key_text**: Calculating Empires: A Genealogy of Technology and Power Since 1500
- **key_url**: https://calculatingempires.net/

#### Core ideas and theoretical positioning


**core_claim**

Technology and power have co-evolved since 1500 through four intertwined axes — communication, computing, classification, and control — and the present AI moment can only be understood through this deep genealogy.


**relation_to_attention_economy**

Historicizes the attention economy as one moment in a 500-year genealogy of technological control. The attention economy is not new — it is the latest expression of classification and control systems that began with colonial record-keeping, printing press propaganda, and census technologies. This deep-historical framing decenters attention economy discourse by showing it as a symptom rather than a cause.


**relation_to_commons**

Implicitly commons-relevant: the genealogy reveals how commons (land, knowledge, communication) have been progressively enclosed by technological-imperial systems. The work does not propose commons alternatives but makes the pattern of enclosure visible across five centuries.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Visual genealogy — a 24-meter elliptical fresco organized along four thematic axes (communication, computing, classification, control) and a temporal axis (1500-2025). The architecture is spatial-visual rather than computational.


**data_model**

Curated visual taxonomy — selected artifacts, technologies, systems, and events organized by theme and time. Each element is a visual node in a hand-curated map. Not a database but a designed information artifact.


**temporal_logic**

Deep historical — 525 years of continuous genealogy. The temporal logic is one of emergence and recurrence: patterns from colonial record-keeping reappear in digital surveillance, classification systems from natural history reappear in machine learning taxonomies.


**absence_handling**

The genealogical method reveals absences by showing what has been systematically excluded or suppressed across centuries. The four axes (communication, computing, classification, control) are chosen precisely because they make visible the infrastructures of power that are typically invisible.


**scalability_model**

Not applicable — this is a unique artwork/research artifact, not a scalable system. It exists as six editions worldwide.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate — provides the deep-historical frame within which A(DAI)'s garden logic operates. Not a functional layer but the mythological and historical substrate that gives the system meaning.


**intention_vs_attention**

Transcends the intention/attention distinction by historicizing both. The genealogy shows that every technological system — from the printing press to social media — has been described in terms of its intended purpose while functioning as a mechanism of control. A(DAI)'s claim to generate 'intention rather than attention' would, in this framing, be placed alongside 500 years of similar claims by technological systems that eventually reproduced existing power structures. This is not a dismissal but a demand for historical self-awareness.


**coherence_vs_consensus**

Coherence-seeking through genealogical method — the work reveals structural patterns (coherences) across centuries without seeking consensus about their meaning. The elliptical format literally surrounds the viewer, offering multiple entry points and readings. Different viewers will trace different connections, producing multiple coherent readings without convergence.


**contestability**

The genealogy is fundamentally contestable — each selection, placement, and connection in the fresco represents a curatorial judgment that could be made differently. The work invites viewers to trace their own genealogies and challenge the ones presented.


**forkability**

As a physical artwork in limited edition, not forkable in the technical sense. But the genealogical method is infinitely forkable — anyone can construct alternative genealogies of technology and power using different axes, different time periods, or different selections.


**tendency_axis_position**

Anti-enclosure (reveals enclosure mechanisms across centuries), infrastructure-critical (reveals infrastructure beneath spectacle), deep-time (525-year frame), commons-adjacent (reveals commons destruction without proposing commons construction).


**what_adai_should_adopt**

The deep-historical framing for A(DAI)'s myth prompts and CLA Layer 4 (myth/metaphor). A(DAI)'s tendency vocabulary should be tested against Calculating Empires' four axes: does A(DAI) address communication, computing, classification, AND control, or does it reproduce blind spots? The genealogical method as a model for how A(DAI) presents its own provenance — not just where a signal came from but what historical lineage of practice, technology, and power it belongs to. The spatial-visual format as inspiration for how graph.html presents deep-time connections.


**what_adai_should_refuse**

The art-world framing that turns critical analysis into collectible object. Calculating Empires exists as six editions, each acquired by museums or collectors — the critique of extraction circulates as a luxury commodity. A(DAI) should refuse this commodification path for its own outputs. Also refuse the purely retrospective orientation — Calculating Empires is a genealogy of the past, while A(DAI) needs anticipatory capacity.


#### Limitations, blind spots, and failure modes


**limits**

The 500-year scope necessarily involves massive compression and selective curation — many technologies, events, and actors are omitted. The four-axis framework (communication, computing, classification, control) may itself be a reductive classification. The work is primarily Euro-American in its genealogy, tracking technologies of Western empire rather than alternative technological traditions.


#### Governance models and consent architectures


**governance_model**

Artist-led research — governed by Crawford and Joler's curatorial decisions. No participatory governance. The work is presented as authored analysis, not collective knowledge production.


#### Material and operational conditions


**composability**

Low as artwork (limited edition, physically installed). High as methodology (the genealogical approach can be applied to any domain, time period, or set of axes).


**liveness**

Active — touring internationally (Milan, Berlin, Linz, Enschede, Tokyo, Paris, Venice). Recently acquired by Rijksmuseum Twenthe. Silver Lion at Venice 2025.


**scale_of_operation**

Planetary-historical — covers 500 years of global technological development, though centered on Western imperial technologies.


**temporality**

Deep historical — 525 years (1500-2025). The temporal logic is genealogical: tracing lines of descent and recurrence rather than linear progress. Historical patterns recur in new technological forms.


**Uncertain fields:** who_is_excluded, epistemological_stance, extraction_vector

---


### Holly Herndon — The Call (Serpentine, 2024-2025)

**Brief:** AI choral models trained on consented UK choir recordings. Choirs as co-owners of training data. Collective consent at scale.

**Garden Logic relevance:** Updates Herndon's trajectory in the graph. Moves from individual consent (Holly+) to collective consent (The Call). The commons orientation field should reflect this evolution.

#### Basic identification and classification

- **name**: Holly Herndon — The Call (Serpentine, 2024-2025)
- **type**: provocation
- **originator**: Holly Herndon, Mat Dryhurst, Serpentine Arts Technologies
- **year**: 2024
- **key_text**: The Call (exhibition, Serpentine North, 4 October 2024 – 2 February 2025)
- **key_url**: https://www.serpentinegalleries.org/whats-on/holly-herndon-mat-dryhurst-the-call/

#### Core ideas and theoretical positioning


**core_claim**

AI can be built through collective creative consent — choral AI models trained on consented recordings from UK choirs demonstrate that data training itself can be an artistic and communal practice, with governance through data trusts ensuring co-ownership.


**relation_to_attention_economy**

Refuses the attention economy's extraction model by making the data contribution process itself the artwork. The choirs are not passive data sources being scraped; they are active participants in a creative ritual. The value is in the process of making-with, not in the output's capacity to capture attention.


**relation_to_commons**

Directly builds a commons through the Data Trust Experiment (led by Serpentine's Future Art Ecosystems). The choral dataset is governed collectively by participating choristers who decide how the data and derived models can be used. Moves from individual consent (Herndon's earlier Holly+ project) to collective consent architecture.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Data trust + AI model training pipeline. Multi-channel recording protocol captures choir performances, which become training data for choral AI models. A data intermediary governs access to the dataset and derived models on behalf of participating choristers.


**data_model**

Multi-channel audio recordings structured by a songbook of hymns and singing exercises composed by Herndon and Dryhurst. Data is organized by choir, song, and channel. Derived models encode vocal patterns, harmonics, and call-and-response dynamics.


**temporal_logic**

Ritual-cyclical — organized around the Sacred Harp tradition (19th-century shape-note singing from the US South, itself based on older English choral music). The temporal logic is one of recurrence: old hymns re-sung, re-recorded, re-processed through AI, and re-performed in interactive installations. Deep cultural memory mediated through contemporary technology.


**absence_handling**

The interactive installation makes absence productive: visitors hum or sing into a microphone, and the AI choir responds. The absence of a full human choir is filled by the collective voice of the AI model. The work makes audible the 'collective voice' that is absent from any individual recording.


**scalability_model**

Federated — the project has expanded from UK choirs to Berlin (KW Institute) with each location training its own local AI choir. The model scales through replication in new communities rather than centralization.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

participation — directly relevant to how contributors interact with A(DAI) and govern their contributions. The Data Trust Experiment is a concrete implementation of collective consent architecture.


**intention_vs_attention**

Intention-aligned through collective creative practice. The choirs' intention is to create a shared vocal commons, not to capture audience attention. The interactive installation invites intentional participation (singing into a mic) rather than passive consumption. However, the project also circulates as an art exhibition — it exists within attention economy infrastructure (Serpentine, Art Basel coverage, art press) even as it models an alternative.


**coherence_vs_consensus**

Coherence through harmony — the choral model finds patterns across fifteen different choirs' performances of the same hymns, producing a 'collective voice' that is coherent without being identical to any individual choir. This is structural coherence (harmonic, rhythmic, timbral patterns) rather than consensus (agreement on a single interpretation).


**contestability**

Partially — choristers can contest how the dataset and models are used through the Data Trust governance mechanism. But the artistic and technical decisions (which hymns, which recording protocol, which AI architecture) are made by Herndon, Dryhurst, and collaborators. The art direction is not democratized.


**forkability**

The methodology is forkable — anyone could organize choirs, record them, train AI models, and establish data trusts. The specific dataset and models are governed by the Data Trust and not freely forkable. The Sacred Harp songbook itself is public domain.


**tendency_axis_position**

commons over capture (data trust governance), distributed over individual (fifteen choirs, not one voice), infrastructure over spectacle (the data trust and consent architecture are the innovation, not just the installation), openness over enclosure (methodology is shareable, though specific data is governed).


**what_adai_should_adopt**

The Data Trust model for contributor governance. A(DAI) could establish a data trust where contributors collectively govern how their signals are processed, who has access to intelligence outputs, and whether Mode 2 (advisory) uses are permitted. The ritual-as-data-collection model: A(DAI)'s signal intake (transcriptions of conversations, contributions from events) could be framed as collective creative practice rather than passive data extraction. The federated replication model: each A(DAI) scene could have its own 'choir' — local contributors whose signals are locally processed and collectively governed, with federation into the field-level commons.


**what_adai_should_refuse**

The dependency on a single artistic vision. The Call works because Herndon and Dryhurst are brilliant artists who made specific creative choices. A(DAI) cannot rely on singular artistic genius; it needs governance structures that work without exceptional leadership. Also refuse the art-world exhibition model as the primary mode of dissemination — A(DAI)'s intelligence should be operational infrastructure, not gallery installation.


#### Limitations, blind spots, and failure modes


**limits**

The Data Trust Experiment is experimental — it has not yet been tested at scale or over long time periods. The project relies on significant institutional support (Serpentine, architecture studio sub) that most communities cannot access. The Sacred Harp tradition has its own complex cultural politics (appropriation questions around a tradition rooted in the American South being used by UK and European choirs).


#### Governance models and consent architectures


**governance_model**

Data trust with artistic direction. A data intermediary (appointed by Serpentine) helps choristers exercise collective governance over the dataset and derived models. Artistic decisions remain with Herndon and Dryhurst. Governance is collective over data use but centralized over system design.


#### Material and operational conditions


**composability**

Methodology is composable — the 'choir + recording protocol + AI model + data trust' pattern can be replicated in any community. The specific outputs (trained models, installation design) are not freely composable.


**liveness**

Active and expanding — the project continues at KW Berlin (Starmirror, 2025) and is moving to Kunstsammlung Nordrhein-Westfalen, Dusseldorf. The methodology is being iterated with each new community.


**scale_of_operation**

Small group to institutional — fifteen UK choirs, expanding to Berlin communities. The project operates at scene scale with aspirations to demonstrate a replicable model.


**temporality**

Ritual-cyclical — rooted in the Sacred Harp tradition (19th century) with deep roots in English choral music. The temporal logic is one of cultural recurrence: old hymns re-performed through new technology. The Data Trust introduces a governance temporality: ongoing collective decision-making about future uses.


**Uncertain fields:** failure_under_attention, who_is_excluded, extraction_vector

---


### Lev Manovich — Cultural Analytics (2007-2025)

**Brief:** Computational cultural analytics. Data science applied to contemporary culture. Recent work on generative AI and aesthetics.

**Garden Logic relevance:** The methodological ancestor. Manovich does cultural field analysis computationally. A(DAI) adds the intention layer — not just analyzing the field but diagnosing its structural commitments.

#### Basic identification and classification

- **name**: Lev Manovich — Cultural Analytics (2007-2025)
- **type**: provocation
- **originator**: Lev Manovich (CUNY Graduate Center, Cultural Analytics Lab)
- **year**: 2007
- **key_text**: Cultural Analytics (MIT Press, 2020); Cultural Analytics Lab research output (2007-present)
- **key_url**: https://lab.culturalanalytics.info/

#### Core ideas and theoretical positioning


**core_claim**

Computational methods — data visualization, machine learning, and statistical analysis — can reveal patterns in contemporary culture at scales impossible for traditional humanistic methods, while requiring critical reflection on what is lost when culture is represented as data.


**relation_to_attention_economy**

Cultural Analytics does not directly critique the attention economy but operates within it — analyzing the same digital cultural artifacts (social media images, web content, digital art) that the attention economy produces and circulates. The methodology treats attention-economy outputs as cultural data to be analyzed rather than as systems to be critiqued.


**relation_to_commons**

Positioned as open research — lab publications and some tools are publicly available. Collaborations with MoMA, Getty, and other institutions make cultural data analysis accessible. However, the methodology requires significant computational expertise, creating a de facto enclosure around who can produce cultural analytics.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Data science pipeline applied to cultural artifacts — collection, processing, visualization, and statistical analysis of large cultural datasets (images, films, texts, social media posts).


**data_model**

Cultural artifacts represented as high-dimensional data — images as pixel arrays and feature vectors, texts as statistical distributions, temporal sequences as time series. Collections of millions of cultural artifacts analyzed simultaneously through dimensionality reduction and visualization.


**temporal_logic**

Historical-comparative — cultural analytics tracks change over time by analyzing large collections across temporal spans (decades of magazine covers, years of Instagram posts). The temporal logic is one of quantitative comparison across periods rather than qualitative interpretation of moments.


**absence_handling**

Cultural analytics can detect absence quantitatively — what is underrepresented in a collection, what visual patterns are missing from a period, what styles or subjects decline over time. However, the methodology is better at detecting statistical absence than interpreting structural absence (why something is missing).


**scalability_model**

Centralized expertise — scales through computational power and dataset size but requires specialized knowledge (data science, programming, visualization design). Not easily distributed to non-technical practitioners.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

sensing-loop — Cultural Analytics is the methodological ancestor of A(DAI)'s computational sensing of the cultural field. The key difference is that Cultural Analytics describes what is; A(DAI) aims to diagnose what is missing.


**intention_vs_attention**

Cultural Analytics operates in a space between intention and attention. The methodology itself is intention-driven (researchers define what to analyze and how), but the cultural data it analyzes is often produced by attention-economy dynamics (what gets posted, shared, liked). Cultural Analytics is descriptive rather than diagnostic — it reveals patterns but does not evaluate them as gaps, coherence failures, or structural tensions. A(DAI) adds the intention layer by asking not just 'what patterns exist in the field?' but 'what patterns SHOULD exist but don't?' This diagnostic question is what distinguishes A(DAI) from its methodological ancestor.


**coherence_vs_consensus**

Neither explicitly — Cultural Analytics reveals patterns without judging their coherence or seeking consensus about their meaning. The methodology produces evidence that can inform both coherence analysis and consensus-building but does not itself perform either function.


**contestability**

Methodologically contestable — choices about what data to collect, how to represent it, what statistical methods to apply, and how to interpret results are all debatable. Manovich has been explicit about these limitations. However, the computational expertise required to meaningfully contest the analysis creates a barrier to contestation.


**forkability**

The methodology is open and replicable. The specific tools and datasets vary in accessibility. The approach can be forked and applied to any cultural domain by anyone with the requisite technical skills.


**tendency_axis_position**

Infrastructure (builds analytical tools and methods), empirical (data-driven rather than theory-driven), open (publications freely available) but expertise-enclosed (requires significant technical capacity). Positioned between individual (researcher-led) and institutional (museum collaborations).


**what_adai_should_adopt**

The commitment to seeing culture computationally before theorizing it — A(DAI) should build its intelligence layer on empirical signal processing before generating theoretical claims. The multi-modal analysis approach: Cultural Analytics works with images, text, video, and time series simultaneously, which maps onto A(DAI)'s multimodal embedding architecture. The critical self-reflection: Manovich consistently asks what is lost when culture becomes data, and A(DAI) should maintain this reflexivity. The visualization methodology: Cultural Analytics' dimensionality reduction and visualization techniques could inform graph.html's approach to representing the field.


**what_adai_should_refuse**

The descriptive neutrality — Cultural Analytics reveals patterns without evaluating them. A(DAI) must go further, diagnosing structural gaps and tendencies. Description without diagnosis is cultural analytics; diagnosis is cultural intelligence. Also refuse the centralized expertise model — A(DAI) should be accessible to practitioners, curators, and artists, not just data scientists. The computational frame should be transparent enough for non-technical contributors to contest.


#### Limitations, blind spots, and failure modes


**limits**

Requires significant computational infrastructure and expertise. The methodology is better at analyzing visual culture and digital artifacts than at capturing embodied, oral, or performative cultural practices. The quantitative approach can miss qualitative meanings that are obvious to cultural practitioners. Large-scale analysis tends to reveal dominant patterns while potentially missing marginal or emergent ones.


#### Governance models and consent architectures


**governance_model**

Academic lab — governed by the research priorities of the lab director (Manovich) and institutional collaborators. No participatory governance of research agenda. Open publication of results but centralized decision-making about what to study.


#### Material and operational conditions


**composability**

Methodology is highly composable — data science pipelines can be adapted to any cultural domain. Tools and techniques are reusable. The approach is modular: collection, processing, visualization, and analysis can be independently modified.


**liveness**

Active — the Cultural Analytics Lab continues to produce research. Manovich is actively publishing and speaking. The field of cultural analytics has grown beyond the lab.


**scale_of_operation**

Multi-scale — from individual artwork analysis to millions of Instagram posts. The methodology deliberately operates at scales that exceed human perceptual capacity.


**temporality**

Historical-comparative — analyzes cultural change over time through quantitative comparison of large datasets across temporal periods. The temporal resolution depends on the data: daily (social media), yearly (magazine archives), decadal (art historical collections).


**Uncertain fields:** failure_under_attention, consent_architecture, who_is_excluded

---


---

## Sensing Mechanisms That Precede Movements


### Weak Signals (Igor Ansoff, 1975)

**Brief:** Strategic foresight. Early indicators of emerging change before they become trends. Signal-to-noise discrimination.

**Garden Logic relevance:** Frontier signals ARE weak signals with a 90-day lifecycle. Ansoff's framework distinguishes detection from interpretation. A(DAI) adds a third step: the commons' response to the signal is itself a signal.

#### Basic identification and classification

- **name**: Weak Signals (Igor Ansoff, 1975)
- **type**: sensing
- **originator**: H. Igor Ansoff
- **year**: 1975
- **key_text**: Managing Strategic Surprise by Response to Weak Signals (California Management Review, 1975)
- **key_url**: https://journals.sagepub.com/doi/10.2307/41164635

#### Core ideas and theoretical positioning


**core_claim**

Organizations can detect strategic discontinuities before they become crises by attending to 'weak signals' — early, vague, and incomplete information that improves gradually through time, allowing graduated response matched to signal strength rather than waiting for full clarity.


**relation_to_attention_economy**

Weak signals are anti-attention by definition. The attention economy privileges strong signals — clear, novel, engaging content. Weak signals are precisely what the attention economy filters out: vague, uncertain, incomplete, non-viral. Detecting weak signals requires a fundamentally different attention architecture — one that amplifies the quiet and uncertain rather than the loud and clear.


**relation_to_commons**

Ansoff's original framework is corporate-strategic, not commons-oriented. Weak signals serve organizational competitive advantage, not collective intelligence. However, the concept has been adopted in commons contexts — futures research, public policy, and collective foresight. When weak signal detection is shared openly, it becomes a commons resource.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Environmental scanning and amplification pipeline. Ansoff proposes a system that continuously scans the environment for weak signals, amplifies them through interpretation, and matches organizational response to signal strength. The architecture is a pipeline: detection → amplification → interpretation → graduated response.


**data_model**

Signal-strength gradient. Weak signals are characterized by their position on a strength continuum — from vague intimations through pattern recognition to clear trends. The data model tracks signals over time as they move along this continuum, with each stage requiring different analytical approaches and organizational responses.


**temporal_logic**

Anticipatory-gradual. Ansoff's key insight is that signals strengthen over time. The temporal logic is one of gradual amplification — what is vague today becomes clear tomorrow. The system must track signals longitudinally, watching for amplification patterns. This is directly relevant to A(DAI)'s 90-day frontier signal lifecycle.


**absence_handling**

Ansoff's framework treats the absence of expected strong signals as potentially informative — if a trend that 'should' be strengthening is not, that is itself a weak signal. However, the framework is primarily focused on detecting present weak signals rather than theorizing structural absence.


**scalability_model**

Organizational to field-level. Ansoff designed the framework for individual firms, but it has been scaled to industry-level, national, and global foresight systems. The method scales through adoption and networking — multiple organizations scanning for weak signals collectively create a more comprehensive sensing apparatus.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

Sensing loop. Weak signals are the raw material of A(DAI)'s sensing apparatus. The frontier signal concept directly inherits from Ansoff: signals that are early, vague, and potentially transformative, with a lifecycle that tracks their amplification over time.


**intention_vs_attention**

Weak signal detection is inherently intention-oriented. It requires deliberate, structured attention to what is quiet and uncertain — the opposite of attention-economy optimization. However, Ansoff's original framework serves corporate strategic advantage (a form of competitive attention), not structural diagnosis for collective benefit. A(DAI) transforms weak signal detection from competitive advantage to collective intelligence.


**coherence_vs_consensus**

Coherence. Weak signals admit multiple interpretations by nature — a vague signal can be read as indicating several possible futures. The framework maintains coherence through systematic scanning and tracking while accepting that interpretation remains open. Multiple analysts may disagree about what a weak signal means; this disagreement is productive.


**contestability**

High. Weak signal interpretation is inherently contestable — the same signal can be interpreted differently by different observers. The framework encourages multiple interpretations and graduated responses that can be adjusted as signals clarify. Disagreement about weak signals is a feature, not a bug.


**forkability**

Highly forkable. The weak signals framework has been forked extensively across fields — futures studies, strategic management, public policy, technology assessment, cultural analysis. Each application adapts the core concept to its specific domain while preserving the essential logic of early detection and graduated response.


**tendency_axis_position**

Methodologically neutral — weak signals can be detected by any actor for any purpose. In Ansoff's original corporate context: individual, enclosure-adjacent (competitive advantage). In A(DAI)'s adaptation: distributed, commons-oriented (collective intelligence). The tendency position depends on who deploys the method and for what purpose.


**what_adai_should_adopt**

Already adopted as the frontier signal concept. What A(DAI) should deepen is the graduated-response model — matching the specificity and intensity of response to the strength of the signal. When a signal is very weak, A(DAI) should note and track it without overinterpreting. As it amplifies, analysis should deepen. The 90-day lifecycle is A(DAI)'s implementation of this graduated approach. Also adopt Ansoff's concept of the 'amplification process' — signals strengthen through stages, and each stage requires different handling.


**what_adai_should_refuse**

The corporate-strategic framing. Ansoff designed weak signal detection for competitive advantage — detecting threats before competitors. A(DAI) should refuse this competitive logic and instead use weak signal detection for collective benefit. Also refuse Ansoff's implicit assumption that all weak signals eventually become strong signals. Some signals remain permanently weak — they are tendencies, not trends — and A(DAI) must develop ways to value and analyze perpetually weak signals.


#### Limitations, blind spots, and failure modes


**limits**

The framework provides no method for distinguishing genuine weak signals from noise. Not every vague piece of information is a weak signal — some are just noise. The method also depends on the scanner's interpretive capacity, which varies enormously. Ansoff's original framework is better at detecting threats than opportunities, and better at tracking individual signals than understanding systemic dynamics.


#### Governance models and consent architectures


**governance_model**

In Ansoff's framework: corporate hierarchy. Strategic planning groups scan for weak signals and report to management. In the futures-studies adaptation: distributed and participatory. Foresight networks share weak signal detection across organizations and communities. A(DAI) should implement the distributed model.


#### Material and operational conditions


**composability**

Maximally composable. Weak signal detection can be combined with any analytical framework — CLA, Three Horizons, scenario planning, systems dynamics. It is a component method, not a complete system. A(DAI) composes it with CLA to create its sensing-analysis pipeline.


**liveness**

Historically significant and actively developed. Ansoff's 1975 paper remains a foundational reference. The concept has been extensively developed by futures researchers (Hiltunen, Rossel, Kuosa). It is an evergreen concept that continues to be applied and refined.


**scale_of_operation**

Multi-scale. Originally organizational. Now applied at individual (personal foresight), organizational, field, national, and global scales. The method is scale-agnostic.


**temporality**

Anticipatory and gradual. Weak signals exist in the present but point to the future. Their temporal logic is one of emergence — they are the early indicators of what will later become visible. The amplification process occurs over time, with signals moving from vague to clear along a temporal gradient.


**Uncertain fields:** epistemological_stance, who_is_excluded, failure_under_attention, structural_tension, extraction_vector, consent_architecture

---


### Three Horizons Framework (Bill Sharpe, 2013)

**Brief:** H1 (declining dominant), H2 (emerging innovations), H3 (long-term vision). Maps transition dynamics.

**Garden Logic relevance:** The tendency vocabulary (openness↔enclosure, commons↔capture) maps to Three Horizons. H1 = attention economy. H3 = intention economy. H2 = A(DAI) itself. The framework helps the sensing layer read its own position.

#### Basic identification and classification

- **name**: Three Horizons Framework (Bill Sharpe, 2013)
- **type**: sensing
- **originator**: Bill Sharpe / International Futures Forum; also Anthony Hodgson, Andrew Curry, Graham Leicester
- **year**: 2013
- **key_text**: Three Horizons: The Patterning of Hope (International Futures Forum, 2013)
- **key_url**: https://www.h3uni.org/tutorial/three-horizons/

#### Core ideas and theoretical positioning


**core_claim**

Change can be understood through three simultaneous horizons -- H1 (the declining dominant system), H2 (the transitional zone of innovation), and H3 (the emerging desired future) -- and the critical distinction is between H2- innovations that prop up H1 and H2+ innovations that accelerate transition toward H3.


**relation_to_attention_economy**

The framework provides the structural analysis A(DAI) needs: H1 IS the attention economy -- the dominant but declining system. H3 IS the intention economy -- the emerging desired future. H2 is where A(DAI) operates -- as an innovation that could either prop up the attention economy (H2-) or accelerate transition toward intention (H2+).


**relation_to_commons**

Implicitly commons-oriented. The Three Horizons framework emerged from the International Futures Forum, which works on systems change for common benefit. The framework itself is a commons resource -- freely available and widely adapted. H3 visions typically involve commons-based alternatives to extractive H1 systems.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Three-curve temporal model. Graphically represented as three intersecting curves: H1 declining from dominance, H3 rising from the margins, and H2 peaking in the middle. The architecture is relational -- the meaning of each horizon depends on its relationship to the others.


**data_model**

Pattern-based classification. Each signal, innovation, or practice is classified by which horizon it belongs to and whether it serves H1 maintenance, H3 emergence, or H2 transition (and if H2, whether H2+ or H2-). This classification is interpretive, not algorithmic.


**temporal_logic**

Transitional-coexistent. All three horizons exist simultaneously in the present. H3 elements are always present in current marginal activity, and H1 elements persist in any new dominant system. Time is not linear progression but layered coexistence of dominant, declining, and emerging patterns.


**absence_handling**

H3 represents what is structurally absent from the dominant system but already present in embryonic form. The framework makes absence productive -- H3 is the future in the present, visible in marginal practices that the dominant system ignores or dismisses. This is structural absence detection.


**scalability_model**

Universal as a framework. Three Horizons can be applied at any scale and in any domain. It scales through adoption and adaptation.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

Prompt-generation layer. Three Horizons provides the framing for A(DAI)'s most consequential analytical outputs: what is dominant but declining? what is emerging? what innovations serve which horizon?


**intention_vs_attention**

The framework makes the intention/attention distinction structural and temporal. H1 (attention economy) is dominant but declining because its model is unsustainable. H3 (intention economy) is emerging because it addresses structural needs that H1 cannot. H2 is the dangerous middle -- innovations that look like H3 but serve H1 (H2-) are the primary capture risk. A(DAI) must constantly ask: is this H2+ or H2-?


**coherence_vs_consensus**

Coherence. The Three Horizons framework allows different observers to identify different H1/H2/H3 elements in the same situation. The framework provides structural coherence (everyone uses the same three-horizon model) while allowing divergent analysis (disagreement about what belongs to which horizon).


**contestability**

Very high. The classification of specific innovations, practices, or institutions as H1, H2+, H2-, or H3 is inherently contestable. Different H3 visions produce different H2 classifications.


**forkability**

Extremely forkable. Different groups can define different H3 visions and therefore different H2+/H2- classifications. The framework has been forked across dozens of fields and hundreds of applications. Each fork preserves the three-horizon structure while defining horizons differently.


**tendency_axis_position**

The framework IS a tendency mapping tool. H1 = enclosure/capture/spectacle/centralized. H3 = openness/commons/infrastructure/distributed. H2 = the contested middle. The Three Horizons framework and A(DAI)'s tendency axes are structurally homologous.


**what_adai_should_adopt**

The H2+/H2- distinction as a core analytical tool. For every signal A(DAI) detects, the system should ask: does this innovation serve the declining attention economy (H2-) or accelerate transition toward the intention economy (H2+)? Also adopt the three-mindset model: managerial (H1 -- maintain infrastructure), entrepreneurial (H2 -- what innovations to pursue), and visionary (H3 -- what is the long-term intention economy). All three mindsets are necessary.


**what_adai_should_refuse**

The implicit progressivism -- the assumption that H3 will inevitably emerge and H1 will inevitably decline. History shows that H1 systems can persist far longer than expected by co-opting H2 innovations. Also refuse the binary H2+/H2- classification when signals are genuinely ambiguous. Some innovations are simultaneously H2+ and H2- depending on how they are governed.


#### Limitations, blind spots, and failure modes


**limits**

The framework can oversimplify complex dynamics by forcing everything into three categories. The H2+/H2- distinction depends on defining H3, which is always contestable. The visual representation can suggest more precision than the method warrants.


#### Governance models and consent architectures


**governance_model**

Open protocol with community stewardship. Three Horizons is freely available through the International Futures Forum, H3Uni, and numerous publications. The community of practice provides informal governance through shared standards and peer review.


#### Material and operational conditions


**composability**

Highly composable. Three Horizons combines naturally with CLA (depth analysis within each horizon), weak signals (H3 innovations often first appear as weak signals), scenario planning, and systems mapping.


**liveness**

Actively maintained and growing. The International Futures Forum, H3Uni, and numerous practitioners continue to develop and apply the framework.

- **scale_of_operation**: Multi-scale. Applied at individual, organizational, sectoral, national, and civilizational scales.

**temporality**

Transitional-coexistent. All three horizons coexist in the present. The future is not a separate time but a set of patterns already present in the current moment. H3 is not after H1 -- it is alongside H1, growing while H1 declines.


**Uncertain fields:** epistemological_stance, who_is_excluded, failure_under_attention, structural_tension, extraction_vector, consent_architecture

---


### Santa Fe Institute — Complex Adaptive Systems

**Brief:** Mathematical foundations for emergence in networks. Phase transitions, power laws, fitness landscapes.

**Garden Logic relevance:** The substrate's graph topology exhibits complex-systems properties. Community detection, bridge nodes, structural holes — these are complex-systems analytics applied to cultural intelligence.

#### Basic identification and classification

- **name**: Santa Fe Institute — Complex Adaptive Systems
- **type**: sensing

**originator**

George Cowan, Murray Gell-Mann, David Pines, et al. Key contributors: Stuart Kauffman (fitness landscapes), W. Brian Arthur (increasing returns), Geoffrey West (scaling laws), Melanie Mitchell (complexity science education), Duncan Watts & Steven Strogatz (networks)

- **year**: 1984 (founding). Key publications span 1987–present.

**key_text**

Holland, J.H. (1992) 'Adaptation in Natural and Artificial Systems'. Kauffman, S. (1993) 'The Origins of Order'. West, G. (2017) 'Scale'. Mitchell, M. (2009) 'Complexity: A Guided Tour'. SFI Press (2024) 'Foundational Papers in Complexity Science'.

- **key_url**: https://www.santafe.edu/

#### Core ideas and theoretical positioning


**core_claim**

Complex adaptive systems — from ecosystems to economies to cities — exhibit emergent properties that cannot be predicted from their components; understanding requires studying the interactions, not just the parts.


**relation_to_attention_economy**

SFI's work is orthogonal to the attention economy — it provides mathematical and theoretical tools for understanding any complex system, including attention-driven ones. SFI's network science (Barabasi-Albert preferential attachment) actually describes the mechanism by which attention economies generate power-law distributions. The tools are neutral; they can diagnose attention dynamics without participating in them.


**relation_to_commons**

SFI operates as an academic commons — research is publicly published, courses are freely available (Complexity Explorer), and the institute functions as a cross-disciplinary intellectual commons. However, the institute itself is funded by private donors and endowments, not collectively governed.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Agent-based modelling, network topology analysis, scaling laws, fitness landscapes, cellular automata. The core architectural insight is that global order emerges from local interactions without central control.


**data_model**

Networks (nodes and edges with various topologies), fitness landscapes (multi-dimensional possibility spaces), phase spaces, power-law distributions. Data is typically quantitative and model-generated rather than empirically collected.


**temporal_logic**

Emergent and evolutionary. Time operates through adaptation cycles, phase transitions (sudden qualitative shifts), and fitness landscape deformation. Systems are perpetually far from equilibrium. Co-evolutionary dynamics mean that one agent's adaptation changes the landscape for all others.


**absence_handling**

Phase transitions and fitness landscape theory implicitly handle absence — unexplored regions of fitness landscapes, unoccupied niches, latent attractors that have not yet been activated. Emergence itself is about what was absent becoming present. However, absence is not explicitly theorised as a first-class concept.


**scalability_model**

Scale-free. SFI's core insight (via West) is that complex systems scale according to power laws, not linearly. The theoretical framework is inherently multi-scale — from cellular to planetary.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate. SFI's complex systems theory provides the mathematical substrate for understanding why A(DAI)'s graph topology behaves the way it does — emergence, power laws, phase transitions, fitness landscapes. It is not a sensing method but the theoretical ground beneath the sensing.


**intention_vs_attention**

SFI's framework is analytically neutral — it can model both intention and attention systems. However, its deep insight is that complex adaptive systems self-organise through local interactions without central direction, which aligns with intention logic (structural conditions generating emergent order) rather than attention logic (central signals driving engagement). The fitness landscape concept is particularly aligned: A(DAI) maps a cultural fitness landscape where gaps and peaks emerge from the topology itself, not from anyone directing attention to them.


**coherence_vs_consensus**

Coherence through emergence. SFI's systems produce coherent global patterns from local interactions without any consensus mechanism. Flocking, markets, ecosystems — all exhibit coherence without agreement. This is the strongest possible alignment with A(DAI)'s coherence-over-consensus principle: the graph should produce coherent structural diagnoses without requiring anyone to agree.


**contestability**

Not directly addressed. SFI's models are mathematical — they produce outputs, not contestable claims. However, the framework's emphasis on multiple attractors and path dependence implies that any particular outcome is contingent, not necessary. This supports contestability at the interpretive level: the same system could have evolved differently.


**forkability**

Fitness landscapes are inherently forkable — different agents can explore different peaks simultaneously. The theory of speciation in complex systems describes exactly the process A(DAI) envisions for community forking: populations that explore different regions of the fitness landscape diverge into distinct forms.


**tendency_axis_position**

openness: strongly open (publicly available research, free courses). commons: intellectual commons with private institutional structure. spectacle vs infrastructure: pure infrastructure — SFI is a research institute, not a media operation. individual vs distributed: distributed by design — emergence IS the distributed principle.


**what_adai_should_adopt**

Power-law awareness in graph topology: expect a few densely connected nodes and many sparse ones, and design for this distribution rather than assuming uniformity. Phase transition detection: build sensors for when the cultural graph undergoes qualitative shifts (a new scene crystallising, a practice dying). Fitness landscape metaphor as a way to explain A(DAI)'s gap detection — gaps are valleys in the cultural fitness landscape. Co-evolutionary dynamics: understand that mapping the field changes the field (observer effects). The concept of 'edge of chaos' as the optimal operating zone for A(DAI)'s tidal sensing — not too rigid (clear domain), not too chaotic, but at the productive boundary.


**what_adai_should_refuse**

Mathematical reductionism. SFI's power comes from abstracting complex systems into mathematical models, but A(DAI) deals with cultural meaning, which resists full formalisation. Refuse the temptation to treat cultural dynamics as purely computational phenomena. Also refuse the implicit value-neutrality — SFI studies complex systems without normative commitments, but A(DAI) is explicitly normative (commons-first, intention-over-attention). Pure complexity science cannot tell you which emergent patterns to cultivate and which to resist.


#### Limitations, blind spots, and failure modes


**limits**

Complexity science provides powerful descriptive and analytical tools but weak prescriptive guidance. Knowing that a system exhibits power-law behaviour does not tell you what to do about it. Agent-based models are highly sensitive to initial conditions and parameter choices, making prediction unreliable. The field has been criticised for being a 'theory of everything and therefore a theory of nothing' — its generality can become vacuous.


#### Governance models and consent architectures


**governance_model**

Academic nonprofit. SFI is governed by a board of trustees, funded by private donors and endowments. Research is openly published. Not collectively governed — it is an elite institution with selective fellowships.


#### Material and operational conditions


**composability**

Highly composable. SFI's theoretical tools (network theory, fitness landscapes, agent-based modelling, scaling laws) are modular and can be applied to any domain. Protocol-level composability — the mathematical frameworks are substrate-independent.


**liveness**

Actively maintained since 1984. Continuously producing new research, hosting workshops, and running educational programmes (Complexity Explorer). One of the most enduring interdisciplinary research institutions.


**scale_of_operation**

Multi-scale by definition. Complexity science operates from molecular to planetary scale. SFI as an institution is small (~100 researchers) but intellectually planetary in influence.


**temporality**

Evolutionary and emergent. SFI's temporal logic is deep time (evolutionary adaptation), punctuated equilibria (phase transitions), and far-from-equilibrium dynamics. Anticipatory in the sense of identifying conditions for phase transitions before they occur.


**Uncertain fields:** who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### Dark Matter Labs / Indy Johar

**Brief:** Civic infrastructure sensing. Systemic design. Institutional innovation for the 21st century.

**Garden Logic relevance:** Closest institutional analogy. Dark Matter also builds infrastructure that reads institutional gaps. Their 'institutional innovation' is A(DAI)'s 'institution of intention.' Different field, same logic.

#### Basic identification and classification

- **name**: Dark Matter Labs / Indy Johar
- **type**: sensing

**originator**

Indy Johar (co-founder). Dark Matter Labs (DML) team of ~65 including architects, economists, lawyers, data scientists.

- **year**: 2015 (Dark Matter Labs founded). Johar's earlier work at 00:/ (Architecture 00) from 2005.

**key_text**

Johar, I. various provocations on provocations.darkmatterlabs.org. DML system demonstrators: FreeHouse+FreeLand, Permissioning City, Self-owning Surveillance Cameras. Johar's 2022 London Design Medal citation.

- **key_url**: https://darkmatterlabs.org/

#### Core ideas and theoretical positioning


**core_claim**

Transforming visible systems (housing, food, nature) requires redesigning the invisible 'dark matter' — the governance, monetary, regulatory, ownership, and policy infrastructures that determine what is structurally possible.


**relation_to_attention_economy**

DML operates entirely outside attention logic. Its work targets the institutional substructure that attention-driven systems ignore — property law, fiduciary duty, municipal finance. DML's thesis is that attention-visible reforms fail because they do not alter the dark matter underneath. This is a structural critique of attention: looking at the wrong layer.


**relation_to_commons**

Central. DML's 'Radicle Civics' thesis argues that the public/private binary is obsolete and must be replaced by entangled commons governance. Projects like FreeHouse+FreeLand explore how housing and land can be governed as commons rather than as private property or public assets. Trees-as-infrastructure makes ecological commons financially legible.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

System demonstrators — small-scale institutional prototypes designed to 'infect' mainstream governance. Mission-based labs (Beyond The Rules Lab, Capital Systems Lab) operating across jurisdictions. Not a technology platform but an institutional design practice.


**data_model**

Institutional and regulatory. DML works with legal frameworks, financial instruments, governance structures, and ownership models. Data is qualitative-structural (property rights, fiduciary duties, regulatory frameworks) rather than quantitative.


**temporal_logic**

Anticipatory and generational. DML works on institutional timescales — decades, not quarters. The 'boring revolution' framing emphasises slow, structural change rather than rapid disruption. Temporal logic is about creating conditions now for futures that may take 20-50 years to materialise.


**absence_handling**

DML's entire practice is about addressing structural absences — the missing institutional forms that prevent just outcomes. The 'dark matter' metaphor itself is about what is present but invisible. DML makes absent institutions visible and designs prototypes to fill the gaps.


**scalability_model**

Federated-viral. System demonstrators are designed to be replicable across jurisdictions. DML has branches in Sweden, South Korea, Canada, and the Netherlands. Scaling happens through institutional infection — proven prototypes get adopted by governments and organisations.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

sensing-loop + participation. DML maps to both sensing (diagnosing invisible institutional structures) and participation (creating system demonstrators that communities can engage with). It does not map to substrate or prompt-generation because it operates at the institutional/governance layer rather than the computational/graph layer.


**intention_vs_attention**

DML is the purest institutional expression of intention logic. It diagnoses structural conditions (the dark matter) that prevent just outcomes, rather than responding to visible signals or trending issues. The system demonstrators are probes into institutional possibility space — structurally identical to A(DAI)'s gap detection but applied to governance rather than cultural knowledge. DML asks 'what institutional infrastructure is missing?' exactly as A(DAI) asks 'what cultural infrastructure is missing?'


**coherence_vs_consensus**

Coherence-seeking. DML's system demonstrators do not require consensus — they operate as parallel institutional experiments that may prove or disprove different governance models. The 'entangled economy' thesis explicitly rejects the binary consensus of public-vs-private in favour of a more coherent understanding of how value actually flows.


**contestability**

High. System demonstrators are experiments, not mandates. They can fail, be modified, or be rejected. DML's polycentric approach means different jurisdictions can try different institutional forms. The outputs are contestable by design — they are propositions, not prescriptions.


**forkability**

Institutional forkability is DML's method. Different jurisdictions fork system demonstrators and adapt them to local conditions. However, there is no formal fork-merge protocol — each implementation diverges without a mechanism for re-integration. Provenance is maintained through DML's central coordination but not through any technical system.


**tendency_axis_position**

openness: strongly open — institutional designs are published and shared. commons: core commitment to commons governance. spectacle vs infrastructure: the most infrastructure-committed item in this entire research set — DML literally calls its work 'the boring revolution'. individual vs distributed: radically distributed — polycentric governance across jurisdictions.


**what_adai_should_adopt**

The dark matter diagnostic: A(DAI) should look not just at visible cultural signals but at the invisible institutional structures that determine what culture gets produced, funded, and distributed. The system demonstrator model as a pattern for A(DAI)'s own development — small, testable institutional experiments rather than grand platform launches. The 'entangled economy' framing: A(DAI)'s graph should not separate 'art market' from 'public funding' from 'community practice' but map their entanglement. The temporal patience: institutional change takes decades, and A(DAI) should build for generational timescales.


**what_adai_should_refuse**

DML's lack of computational infrastructure. DML operates through human networks, workshops, and policy papers — it has no graph, no data pipeline, no automated sensing. A(DAI) must not replicate DML's institutional practice without adding the computational substrate. Also refuse the implicit London/European centrism of DML's network — A(DAI) must be globally distributed from the start.


#### Limitations, blind spots, and failure modes


**limits**

DML's system demonstrators are small-scale and slow to replicate. The gap between prototype and systemic change remains large. Funding dependence on progressive governments and philanthropies limits operational scope. The 'dark matter' metaphor, while powerful, can become a catch-all that obscures specific mechanisms of institutional change.


#### Governance models and consent architectures


**governance_model**

Nonprofit with global branches. Mission-driven labs with collaborative governance. Not a cooperative or DAO — DML is founder-led with distributed teams. Partners include governments, universities, and philanthropies.


#### Material and operational conditions


**composability**

Modular at the conceptual level — system demonstrator designs can be adapted and combined. Not technically composable — there is no API, protocol, or library. Composability happens through institutional mimesis, not technical integration.


**liveness**

Actively maintained. DML continues to produce system demonstrators and provocations. Growing network of global partners. Johar received MBE in 2023.


**scale_of_operation**

Institutional to field-level. System demonstrators operate at city/regional scale. Intellectual influence is planetary. Individual projects are typically local or municipal.


**temporality**

Generational and anticipatory. DML designs for 20-50 year institutional timescales. The 'boring revolution' is explicitly a long-duration project. Temporal logic is about creating conditions now for future institutional forms.


**Uncertain fields:** who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### Pierre Bourdieu — Field Theory / Cultural Capital

**Brief:** The field as a space of positions and position-takings. Cultural capital, symbolic violence, habitus.

**Garden Logic relevance:** The unacknowledged theoretical ancestor. A(DAI)'s graph IS a Bourdieusian field analysis made computational. The tendency vocabulary maps to Bourdieu's axes of capital. The question: does A(DAI) reproduce the field's power structure by mapping it?

#### Basic identification and classification

- **name**: Pierre Bourdieu — Field Theory / Cultural Capital
- **type**: sensing
- **originator**: Pierre Bourdieu (1930-2002), College de France, Paris

**year**

1979 ('La Distinction'); 1984 ('Homo Academicus'); 1992 ('Les Regles de l'art' / 'The Rules of Art'); 1986 ('The Forms of Capital'). Field theory developed across 1960s-1990s.


**key_text**

Bourdieu, P. (1984) 'Distinction: A Social Critique of the Judgement of Taste'. Bourdieu, P. (1993) 'The Field of Cultural Production'. Bourdieu, P. (1986) 'The Forms of Capital' in Richardson (ed.) Handbook of Theory and Research for the Sociology of Education.

- **key_url**: https://en.wikipedia.org/wiki/Pierre_Bourdieu

#### Core ideas and theoretical positioning


**core_claim**

Social life is structured by fields — semi-autonomous spaces of positions and position-takings — in which agents compete using different forms of capital (economic, cultural, social, symbolic) according to field-specific rules; the structure of the field determines what is possible, valued, and legitimate within it.


**relation_to_attention_economy**

Bourdieu provides the deepest sociological critique of what the attention economy actually does: it converts cultural capital into economic capital through symbolic violence, making the arbitrary appear natural. The attention economy is, in Bourdieusian terms, a field in which the dominant capital is visibility, and the illusio (the shared belief that the game is worth playing) is engagement metrics. Bourdieu would diagnose the attention economy as a mechanism of symbolic domination masquerading as democratic participation.


**relation_to_commons**

Ambivalent. Bourdieu analyzes cultural production as a field structured by competition, not cooperation. The commons appears in his work as what gets destroyed by field dynamics — the 'disinterested' cultural production of the autonomous pole is constantly threatened by the 'heteronomous' pole of commercial production. However, his analysis of cultural capital as collectively produced but individually captured provides powerful tools for diagnosing commons enclosure.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Field analysis — mapping the space of positions (agents) and position-takings (works, statements) within a structured field. Multiple Correspondence Analysis (MCA) as the primary computational tool for visualizing field structure. The field is a multi-dimensional space in which agents are positioned by their capital portfolio (volume and composition of economic, cultural, social, and symbolic capital).


**data_model**

Relational. Agents (practitioners), works (position-takings), institutions (field boundaries), and capital types (multiple currencies of value) form a relational structure. Not a graph in the formal sense, but a topology — agents are positioned relative to each other in capital-space. The data model is inherently multi-dimensional: an agent's position requires specifying their holdings across multiple capital types.


**temporal_logic**

Historical-structural. Fields evolve over time through struggles between agents and between the autonomous and heteronomous poles. Bourdieu tracks generational change (new entrants challenging incumbents), field autonomization (fields becoming more self-referential), and hysteresis (habitus lagging behind field changes). Time is neither cyclical nor linear but dialectical — field structures produce agents who then reproduce or transform those structures.


**absence_handling**

Implicit but powerful. The concept of 'symbolic violence' is about what is made invisible — the arbitrary social structures that appear natural. The concept of 'doxa' is about what cannot even be questioned because it has never been articulated. Bourdieu's entire project is about making visible the absent — the unspoken rules, the invisible hierarchies, the naturalized exclusions. However, absence is not a formal category in his data model.


**scalability_model**

Field-level. Each field (art, academia, journalism, politics) is analyzed as a bounded but interconnected space. The 'field of power' connects all fields. Analysis scales to the national level (French society) but is less developed for transnational or digital fields.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

sensing-loop + prompt-generation. Bourdieu's field analysis maps to sensing (diagnosing the structure of the cultural field) and to prompt-generation (the structural diagnosis generates questions about who occupies which positions and what capital flows enable or constrain cultural production). Field theory provides the analytical vocabulary for what A(DAI)'s graph is actually doing.


**intention_vs_attention**

Bourdieu's framework is the deepest theoretical articulation of the intention/attention distinction. Cultural capital analysis reveals the structural conditions that determine what gets produced and valued — this IS intention logic (diagnosing structural conditions). The 'illusio' concept explains why attention economics work: participants collectively believe the game (engagement, virality, follower counts) is worth playing. Bourdieu shows that attention is a symptom of field structure, not a cause. A(DAI)'s graph, in Bourdieusian terms, maps the field structure that generates both intention (what the field needs) and attention (what the field rewards). The gap between these two — what the field needs vs. what it rewards — is A(DAI)'s diagnostic territory.


**coherence_vs_consensus**

Coherence-seeking. Bourdieu does not seek consensus — he maps structural relationships that hold regardless of whether participants agree about them. Field analysis produces coherent structural descriptions (who holds what capital, where the poles are, how struggles are distributed) without requiring any participant to agree with the analysis. In fact, Bourdieu expects participants to misrecognize their own positions — coherence at the structural level coexists with misrecognition at the individual level.


**contestability**

Paradoxically contested. Bourdieu's analyses are intensely contested within the academic field — his own theory predicts this, as academic position-taking is itself a field strategy. The outputs of field analysis are contestable: any mapping of positions and capitals can be challenged. However, Bourdieu's framework is less self-critical about its own authority claims — it can appear to occupy a 'view from nowhere' that transcends the very field dynamics it describes.


**forkability**

Intellectually forkable — field theory has been applied, adapted, and extended across dozens of disciplines. No formal fork mechanism — the concept is in the intellectual commons, used differently by different scholars. However, Bourdieu himself resisted selective appropriation, insisting that habitus, capital, and field form an indivisible triad.


**tendency_axis_position**

openness: intellectually open (all works published, concepts widely available) but the analytical framework has a steep learning curve that creates implicit enclosure. commons: analyzes the commons/enclosure dynamic better than any other framework, but does not itself operate as commons infrastructure. spectacle vs infrastructure: pure analytical infrastructure — Bourdieu's work is anti-spectacle, diagnosing how spectacle works. individual vs distributed: structurally distributed — the individual is a product of field positions, not an autonomous agent.


**what_adai_should_adopt**

Field analysis as A(DAI)'s theoretical vocabulary for what the graph does: mapping positions, position-takings, and capital flows within the digital arts field. The concept of multiple capital types as a way to value what the attention economy ignores — cultural capital, social capital, symbolic capital cannot be reduced to follower counts. The autonomous/heteronomous pole distinction as a diagnostic axis: where is the digital arts field becoming more self-referential (autonomous) vs. more market-driven (heteronomous)? Reflexivity: A(DAI) must analyze its own position within the field it maps — it is a participant, not just an observer. The concept of hysteresis: habitus lags behind field changes. A(DAI) should detect when practitioners are still operating according to the rules of a field that has already shifted.


**what_adai_should_refuse**

The implicit elitism. Bourdieu's field theory was developed to expose inequality, but it can reproduce it — the sociologist who maps the field from above risks replicating the very hierarchies they diagnose. A(DAI) must be a commons tool, not a field analysis instrument wielded by a sociological elite. Refuse the competition-centric framing: Bourdieu models fields as spaces of struggle, but A(DAI)'s commons logic requires modeling cooperation, mutual aid, and collective production alongside competition. Refuse the nation-state as the primary container of field analysis — digital arts fields are transnational and networked. Refuse the focus on consecrated culture (literature, art, academia) at the expense of emergent, informal, and subcultural production.


#### Limitations, blind spots, and failure modes


**limits**

Field theory is strongest at the national level and for established cultural fields (literature, art, academia). It is less developed for transnational, digital, and emergent fields. The framework can be deterministic — agents appear as products of their positions rather than creative actors. Multiple Correspondence Analysis requires large datasets and clear categorical distinctions that may not exist for nascent cultural formations. Bourdieu's own analyses are rooted in 20th-century French society and require significant adaptation for other contexts.


#### Governance models and consent architectures


**governance_model**

Academic. Field theory is an intellectual framework produced within and for the academic field. No governance structure beyond academic peer review. The concepts are in the intellectual commons but the authoritative interpretation was centralized in Bourdieu and his collaborators at the Centre de Sociologie Europeenne.


#### Material and operational conditions


**composability**

Highly composable conceptually — field theory composes with feminist theory, postcolonial analysis, political economy, and cultural studies. The analytical method (MCA) is technically composable. However, Bourdieu insisted on holistic application (habitus-capital-field as a triad), which resists selective borrowing.


**liveness**

Historically significant and actively used. Bourdieu died in 2002 but his concepts remain among the most cited in social science. Ongoing adaptation to digital contexts (digital capital, platform field analysis). Not abandoned but operating primarily in academic contexts.


**scale_of_operation**

Field-level to national. Field analysis operates at the scale of cultural fields (art, literature, media) nested within national or transnational spaces. Not individual (it is inherently structural) but not easily planetary (field boundaries are contested at global scale).


**temporality**

Historical-structural. Field analysis traces the evolution of field structures over decades and generations. Temporal logic is dialectical: field structures produce habitus, which reproduces or transforms field structures. Time is layered — different forms of capital accumulate at different rates, creating temporal disjunctions (hysteresis).


**Uncertain fields:** who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### Bruno Latour — Actor-Network Theory

**Brief:** Non-human actants. Networks of associations. 'Follow the actors.' Reassembling the social.

**Garden Logic relevance:** The graph's typed edges between human and non-human nodes (artworks, platforms, protocols) IS ANT. Latour's insistence on tracing associations rather than explaining them maps to A(DAI)'s structural diagnosis.

#### Basic identification and classification

- **name**: Bruno Latour — Actor-Network Theory
- **type**: sensing

**originator**

Bruno Latour (1947-2022), Michel Callon, John Law. Developed at the Centre de Sociologie de l'Innovation, Ecole des Mines de Paris.


**year**

1986 (Callon's scallops paper); 1987 (Latour, 'Science in Action'); 2005 (Latour, 'Reassembling the Social'); roots in 1979 ('Laboratory Life').


**key_text**

Latour, B. (2005) 'Reassembling the Social: An Introduction to Actor-Network-Theory', Oxford University Press. Callon, M. (1986) 'Some elements of a sociology of translation'. Latour, B. (1987) 'Science in Action'.

- **key_url**: http://www.bruno-latour.fr/node/70.html

#### Core ideas and theoretical positioning


**core_claim**

The social world is not made of human intentions and social structures but of heterogeneous networks of associations between human and non-human actants; agency is distributed across these networks, and stability is an achievement that requires constant work, not a default state.


**relation_to_attention_economy**

ANT provides diagnostic tools for understanding the attention economy as a network of actants: algorithms, interfaces, servers, users, advertisers, content, and metrics are all actants in an attention network. ANT dissolves the human/technology distinction that allows attention platforms to claim neutrality — the algorithm IS an actant, not a neutral tool. However, ANT does not normatively critique the attention economy; it traces its associations.


**relation_to_commons**

ANT's concept of 'translation' — how actants recruit others into their networks — provides powerful tools for understanding both commons formation and commons enclosure. A commons is a network of associations that has been stabilised in a particular way; enclosure is a re-translation that excludes previous actants. Latour's 'Parliament of Things' (1993) proposes that non-human entities should have political representation, which extends commons governance beyond the human.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Network — but not in the technical sense. ANT's network is a topology of associations between heterogeneous actants, not a computational graph. Key operations: translation (how actants enrol others), inscription (how actions are delegated to artefacts), black-boxing (how stable networks become invisible). The architecture is flat — no a priori hierarchy between micro and macro, human and non-human.


**data_model**

Associations (typed relationships between actants). Actants are anything that acts or is granted agency — humans, technologies, texts, natural entities, organisations, concepts. The data model is inherently heterogeneous: there is no type hierarchy because ANT refuses to pre-determine what kinds of things matter. Edges represent translations, enrolments, and delegations.


**temporal_logic**

Process-relational. Networks are not static structures but ongoing achievements — they must be constantly maintained or they dissolve. Stability is the exception, not the rule. ANT traces how networks are assembled, stabilised, extended, and dismantled over time. Temporal logic is genealogical: follow the actors through their associations to understand how the present was constructed.


**absence_handling**

ANT is attentive to what is excluded from networks — the actants that are not enrolled, the translations that fail, the associations that are cut. Callon's concept of 'obligatory passage points' identifies what is structurally absent: actants who cannot pass through the network's required nodes are excluded. Latour's 'trials of strength' reveal what the network cannot hold together. However, absence is traced through its effects, not represented as a first-class entity.


**scalability_model**

Flat ontology — ANT refuses the micro/macro distinction. Networks extend through translation, not through hierarchical scaling. A laboratory network can extend to become global (Pasteur's microbes transform French agriculture) not by scaling up but by enrolling more actants. Scale is an effect of network extension, not a pre-existing container.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate + sensing-loop. ANT provides the ontological justification for A(DAI)'s graph structure — typed edges between human and non-human nodes IS an actor-network. It maps to the substrate (the graph's fundamental architecture is ANT-like) and to sensing (following the actors through their associations is the sensing practice).


**intention_vs_attention**

ANT is descriptively neutral — it follows the actors without normative commitment. However, its method of 'following the actors' aligns with intention logic rather than attention logic: ANT asks 'how are associations made and maintained?' (structural diagnosis) not 'what is most interesting or popular?' (engagement ranking). ANT would diagnose the attention economy as a particular network configuration that privileges certain actants (platforms, algorithms) and enrols others (users, content creators) through specific translations (engagement metrics, feed algorithms). A(DAI) can use ANT's method to trace how cultural associations are constructed without being captured by the attention dynamics within those associations.


**coherence_vs_consensus**

Coherence through network stability. ANT does not seek consensus — it traces how networks achieve temporary stability through aligned translations. A well-stabilised network is coherent (its actants hold together) without requiring that any actant agree about why they are holding together. Different actants in the same network may have entirely different 'interests' — what matters is that their associations are maintained. This is structurally identical to A(DAI)'s coherence principle.


**contestability**

Highly contestable. ANT's method of 'following the actors' means that any description of a network can be challenged by attending to different actants or tracing different associations. Controversies are central to ANT methodology — Latour specifically recommends studying controversies because they are moments when associations become visible. A(DAI)'s graph should be similarly contestable: any reading of the graph can be challenged by attending to different nodes and edges.


**forkability**

Networks can be re-translated — actants can be enrolled in different networks, producing competing assemblages. This is a form of forking: the same elements can be associated differently. However, ANT does not have a formal fork-merge model — competing networks either stabilise in parallel or one enrolls (absorbs) the other. Provenance is maintained through the tracing of translations, not through technical versioning.


**tendency_axis_position**

openness: radically open — ANT refuses to pre-determine what counts as relevant. commons: the Parliament of Things extends commons governance to non-humans. spectacle vs infrastructure: anti-spectacle — ANT makes infrastructure visible by tracing how it is constructed. individual vs distributed: radically distributed — agency is distributed across networks, not located in individual subjects.


**what_adai_should_adopt**

The flat ontology: A(DAI)'s graph should not privilege human practitioners over tools, venues, algorithms, funding structures, or artworks — all are actants with typed relationships. The concept of translation as the mechanism by which cultural associations are formed and maintained — A(DAI) should track not just what is connected but how connections were made. The concept of inscription: how actions are delegated to artefacts (a funding guideline inscribes values into grant decisions, a platform algorithm inscribes engagement logic into content distribution). The practice of following controversies as moments when field structure becomes visible — A(DAI) should detect and highlight controversies as diagnostic opportunities. The refusal of the micro/macro distinction: A(DAI) should trace associations across scales rather than imposing hierarchical levels.


**what_adai_should_refuse**

ANT's descriptive neutrality. Latour follows the actors without normative commitment, but A(DAI) is explicitly normative — it operates on commons-first, intention-over-attention principles. A(DAI) must follow the actors AND evaluate the networks they produce against its normative commitments. Also refuse ANT's resistance to formal data structures: ANT's 'network' is a metaphor for a method, not a data architecture. A(DAI) needs a computational graph with typed nodes and edges, which requires the kind of pre-determined categories ANT philosophically rejects. The tension between ANT's radical openness and A(DAI)'s need for operable schemas must be managed, not dissolved. Refuse the implicit assumption that all associations are equally worth tracing — A(DAI) must prioritise which associations to follow based on its diagnostic mission.


#### Limitations, blind spots, and failure modes


**limits**

ANT has been criticized for its descriptive approach — it traces associations but offers no criteria for evaluating them. The flat ontology can become politically evasive: treating human suffering and non-human actants as symmetrical can feel obscene. ANT's method is labor-intensive — tracing associations through detailed ethnography does not scale easily. The framework is strongest for controversial, unsettled situations and weakest for stable, routinised ones.


#### Governance models and consent architectures


**governance_model**

Academic. ANT is a research method developed within and for Science and Technology Studies (STS). No formal governance — the concept is in the intellectual commons. The 'Parliament of Things' is Latour's normative proposal for governance, but it has not been implemented.


#### Material and operational conditions


**composability**

Highly composable — ANT has been adopted across STS, organisational studies, geography, art history, archaeology, feminist theory, and ecology. The method (follow the actors, trace associations) is substrate-independent. However, the philosophical commitments (flat ontology, generalized symmetry) are harder to compose with frameworks that pre-determine categories.


**liveness**

Historically significant and actively applied. Latour died in 2022 but his work remains among the most cited in social science. ANT continues to evolve through Law, Callon, and a new generation of STS scholars. Not abandoned but increasingly canonised, which risks ossification.


**scale_of_operation**

Multi-scale by design. ANT refuses the micro/macro distinction — it operates at whatever scale the associations extend. In practice, most ANT studies are case-based (individual laboratories, controversies, technologies) rather than field-wide or planetary.


**temporality**

Process-relational and genealogical. Networks are assembled and maintained over time. Temporal logic is about the work required to sustain associations — networks are never finished, only temporarily stabilised. Latour traces how present configurations were constructed through historical sequences of translations.


**Uncertain fields:** who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### Robert Rosen — Anticipatory Systems (1985, renewed 2024)

**Brief:** Category-theoretic framework. Living systems act on internal models of themselves. Anticipation as fundamental property of life.

**Garden Logic relevance:** The mathematical foundation for the sensing loop. Rosen's anticipatory system contains an internal model and acts before stimuli arrive. A(DAI)'s dream cycle IS an anticipatory system — it models the graph's future state.

#### Basic identification and classification

- **name**: Robert Rosen — Anticipatory Systems (1985, renewed 2024)
- **type**: sensing
- **originator**: Robert Rosen (mathematical biologist, Dalhousie University); continued by A.H. Louie
- **year**: 1985

**key_text**

Anticipatory Systems: Philosophical, Mathematical & Methodological Foundations (Pergamon Press, 1985; 2nd ed. Springer, 2012)

- **key_url**: https://en.wikipedia.org/wiki/Anticipatory_Systems

#### Core ideas and theoretical positioning


**core_claim**

Living systems are anticipatory: they contain internal predictive models of themselves and their environments, and these models run faster than real-time, enabling the system to act on predictions rather than merely react to stimuli.


**relation_to_attention_economy**

No direct relation — Rosen's work predates the attention economy. However, the framework provides a deep alternative: anticipatory systems act on internal models of what WILL happen rather than responding to external stimuli designed to capture attention. A system that anticipates is structurally resistant to attention capture because it operates from internal models rather than external triggers.


**relation_to_commons**

No direct relation to commons. Rosen's work is about the formal properties of living systems. However, the concept of internal models shared across a system (collective anticipation) could be applied to commons governance — a commons that anticipates threats to its integrity rather than reacting after enclosure has occurred.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Modeling relation — the core pattern is an internal model (M) that maps the external system (S) through encoding (E) and decoding (D) functors, such that the model's dynamics run faster than the system's dynamics. The model's predictions are used for feedforward control.


**data_model**

Category-theoretic — systems, models, and their relationships are formalized as categories, functors, and natural transformations. The 'data' is the modeling relation itself: the structural correspondence between internal models and external reality.


**temporal_logic**

Anticipatory — the defining characteristic. The internal model's dynamics are faster than the modeled system's dynamics, allowing predictions to be available before the modeled events occur. This is not prediction in the statistical sense but structural anticipation: the model's behavior prefigures the system's behavior because they share formal structure.


**absence_handling**

Anticipation is fundamentally about acting on what is not yet present. The internal model represents future states that have not yet occurred. The system acts on these represented absences (future states) as if they were present. This is the most sophisticated absence-handling in any system reviewed: absence IS the operating principle.


**scalability_model**

Not applicable — Rosen's work is a mathematical framework, not a scalable system. It applies to any living system at any scale, from cells to ecosystems.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

sensing-loop — Rosen's anticipatory systems theory provides the mathematical foundation for A(DAI)'s dream cycle. The dream cycle IS an anticipatory process: it runs a model of the field faster than the field changes, producing anticipatory intelligence about structural gaps and emerging tendencies.


**intention_vs_attention**

Profoundly intention-aligned, but in a specific formal sense. Anticipatory systems do not respond to external stimuli (attention); they act on internal models of future states (intention, in the structural sense). The 'intention' here is not human desire but systemic anticipation — the system's behavior is directed by its own predictive model rather than by environmental triggers. This maps directly onto A(DAI)'s distinction: attention-based systems react to signals as they arrive; intention-based systems maintain internal models that diagnose what SHOULD be emerging before it appears.


**coherence_vs_consensus**

Coherence — anticipatory systems achieve coherence through the modeling relation: the internal model must be structurally coherent with the external system for anticipation to work. This is not consensus (agreement) but structural correspondence (formal coherence between model and modeled). If the model becomes incoherent with reality, anticipation fails.


**contestability**

The modeling relation can fail — if the internal model diverges from the external system, the anticipations become wrong. This failure IS the contestation mechanism: reality contests the model's predictions. However, the framework does not include mechanisms for external agents to contest the model's structure.


**forkability**

The mathematical framework is freely available and has been extended by A.H. Louie and others. Any system can implement its own anticipatory models. The framework is infinitely forkable at the theoretical level.


**tendency_axis_position**

Infrastructure (mathematical foundations), commons (freely available theory), deep-time (biological and evolutionary timescales). Non-spectacle by nature — this is abstract mathematics, not a product or platform.


**what_adai_should_adopt**

The formal concept of the modeling relation as the foundation for the dream cycle. Specifically: A(DAI)'s graph is an internal model (M) of the digital arts field (S). The processing pipeline is the encoding functor (E) that maps field signals into graph structures. The dream cycle runs the model's dynamics faster than the field changes, producing anticipatory intelligence. A(DAI) should formalize this relationship and test whether its model's structure is actually coherent with the field it models. The concept of feedforward control: A(DAI)'s coherence prompts and tendency analyses should function as feedforward signals — acting on predicted structural gaps before they manifest as actual problems.


**what_adai_should_refuse**

The anti-computational stance. Rosen argues that living systems are non-computable, which would imply that A(DAI) (a computational system) cannot truly anticipate. A(DAI) should acknowledge this limitation without treating it as disqualifying — the system can approximate anticipatory behavior even if it cannot achieve the formal properties Rosen attributes to living systems. Also refuse the purely formal abstraction — Rosen's category theory is powerful but must be grounded in operational mechanisms that practitioners can understand.


#### Limitations, blind spots, and failure modes


**limits**

Rosen's category-theoretic formalism is notoriously difficult to operationalize. The framework provides elegant mathematical descriptions but few practical guidelines for building anticipatory systems. The anti-computational stance (living systems are non-algorithmic) is philosophically provocative but empirically difficult to test. The work has had limited impact in mainstream biology, remaining influential primarily in theoretical biology and systems science.


#### Governance models and consent architectures


**governance_model**

Academic — the framework is maintained and extended by the scholarly community, primarily through A.H. Louie's continuations and the International Journal of General Systems.


#### Material and operational conditions


**composability**

Highly composable as a theoretical framework — can be applied to any system (biological, social, technological) that might exhibit anticipatory behavior. The category-theoretic formalism is modular by design.


**liveness**

Historically significant and actively extended. Rosen died in 1998, but his work continues through Louie's publications (2009, 2017) and a growing community of researchers. The 2024 publications indicate renewed interest.


**scale_of_operation**

Multi-scale — the framework applies from cellular to ecological to social scales. No inherent scale limitation.


**temporality**

Anticipatory — by definition. The framework's temporal logic IS anticipation: internal models that run faster than real time, enabling action on future states. This is the most distinctive temporal logic of any item reviewed.


**Uncertain fields:** who_is_excluded, failure_under_attention, structural_tension

---


### Maturana & Varela — Autopoiesis (1972)

**Brief:** Self-maintaining, self-producing systems. Operationally closed but structurally coupled with environment.

**Garden Logic relevance:** A(DAI) as autopoietic system: it produces the signals (prompts) that maintain its own structure (the graph). But Haraway's critique applies: 'nothing makes itself.' The garden is sympoietic — it makes-with contributors.

#### Basic identification and classification

- **name**: Maturana & Varela — Autopoiesis (1972)
- **type**: sensing
- **originator**: Humberto Maturana, Francisco Varela (Universidad de Chile)
- **year**: 1972

**key_text**

De Maquinas y Seres Vivos (1972); Autopoiesis and Cognition: The Realization of the Living (D. Reidel, 1980)

- **key_url**: https://en.wikipedia.org/wiki/Autopoiesis

#### Core ideas and theoretical positioning


**core_claim**

Living systems are autopoietic — they are networks of processes that recursively produce the components that constitute them, maintaining their organization as a unity through continuous self-production while being structurally coupled to their environment.


**relation_to_attention_economy**

No direct relation — autopoiesis predates the attention economy. However, the concept provides a framework for understanding how systems maintain their identity despite environmental perturbation. An autopoietic system does not 'attend' to its environment — it is structurally coupled to it, meaning environmental changes trigger internal structural changes without compromising organizational identity. This is a fundamentally different model from attention-based interaction.


**relation_to_commons**

Ambiguous — autopoietic systems are operationally closed, meaning they produce and maintain themselves from their own operations. This can be read as either commons-compatible (self-sustaining communities) or anti-commons (self-enclosed systems that exclude external inputs). Haraway's sympoiesis critique argues that autopoiesis overstates self-sufficiency.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Self-producing network — a bounded system (membrane) containing a network of processes that: (1) recursively generate the components participating in those processes, (2) realize the network as a topological unity, and (3) maintain this unity through the very components produced.


**data_model**

Relational rather than representational — the system is defined by its organization (the pattern of relations between components) not by the components themselves. Structure (the physical instantiation) can change while organization (the relational pattern) remains invariant.


**temporal_logic**

Continuous self-production — the system exists only as long as it continues producing itself. Time is operational: the system's 'clock' is its own production cycle. If self-production stops, the system ceases to exist as a unity.


**absence_handling**

Autopoietic systems respond to perturbations (environmental changes that trigger internal structural changes) but cannot represent absence in the external sense. The system has no model of its environment — it only has its own structural states. What is 'absent' from the environment is invisible to the system unless it causes a perturbation.


**scalability_model**

Not applicable as a scalable architecture. Autopoiesis describes individual living unities. Maturana and Varela's later work on 'social autopoiesis' and Luhmann's application to social systems extend the concept, but scalability is contested.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate — autopoiesis describes the fundamental organizational principle by which A(DAI) would maintain itself as a system. If A(DAI) is autopoietic, its operations (signal processing, graph maintenance, dream cycle) must recursively produce the conditions for their own continuation.


**intention_vs_attention**

Neither — autopoiesis describes a system that does not attend to or intend toward its environment. It is structurally coupled: environmental perturbations trigger internal structural changes, but the system does not direct its operations toward environmental goals. This is a challenge for A(DAI): if the garden is autopoietic, its self-maintenance takes precedence over its stated purpose (producing intelligence about the field). The system's primary 'intention' becomes self-continuation, not field sensing. This is precisely the tension that Haraway's sympoiesis critique addresses.


**coherence_vs_consensus**

Organizational coherence — an autopoietic system maintains coherence through invariant organization despite structural changes. This is the strongest possible form of coherence: the system's identity IS its organizational invariance. No consensus is needed because there is only one perspective — the system's own.


**contestability**

Low within the system — autopoietic systems do not include mechanisms for contesting their own organization. External perturbations can trigger structural changes but cannot alter the organization (if they do, the system is destroyed and a new system may emerge). This is a limitation for A(DAI): if the system is autopoietic, it resists organizational change from contributors.


**forkability**

Autopoietic systems reproduce through structural coupling but do not 'fork' — each new unity is its own autopoietic system with its own operational closure. There is no mechanism for divergence-and-re-merge that A(DAI)'s architecture requires.


**tendency_axis_position**

Enclosure (operational closure is definitional), individual (each autopoietic system is a bounded unity), self-sustaining infrastructure. The tendency is toward self-maintenance rather than openness.


**what_adai_should_adopt**

The concept of operational closure as a design principle for the merge boundary — A(DAI) needs a boundary between its internal operations and external perturbations (signals). The boundary should allow structural coupling (signals can trigger internal processing) without compromising organizational integrity (the system's core processing logic should not be arbitrarily overwritten by external input). The distinction between organization (invariant) and structure (changeable) is directly applicable: A(DAI)'s architecture (organization) should remain stable while its content (structure — the graph, the signals, the intelligence outputs) changes continuously.


**what_adai_should_refuse**

Operational closure taken to its logical extreme. A(DAI) is not a self-producing system; it depends on external contributors, Claude API, GitHub infrastructure, and human curatorial judgment. Claiming autopoiesis would obscure these dependencies. The anti-representationalist epistemology should be tempered: A(DAI) explicitly represents the field through its graph, which means it operates on internal models of external reality — a representationalist move that autopoiesis formally rejects. Most importantly, refuse autopoietic self-sufficiency in favor of Haraway's sympoietic 'making-with.'


#### Limitations, blind spots, and failure modes


**limits**

Autopoiesis has had limited impact in mainstream biology — it is more influential in systems theory, sociology (Luhmann), and cognitive science than in the biological sciences where it originated. The concept is difficult to operationalize: determining whether a given system is autopoietic requires identifying its boundary, organization, and self-production processes, which is often ambiguous for non-cellular systems. The extension to social systems is contested.


#### Governance models and consent architectures


**governance_model**

Not applicable as a governance model. Autopoietic systems are self-governing by definition — their organization determines their behavior. This maps onto a self-sustaining system with no external governance authority, which is problematic for a commons that requires collective decision-making.


#### Material and operational conditions


**composability**

The concept is composable as a theoretical framework — it can be applied to biological, social, cognitive, and technological systems. But autopoietic systems themselves are not composable: operational closure means they cannot be combined into larger autopoietic systems (this is a contested claim in the literature).


**liveness**

Historically significant and actively debated. The concept remains influential in systems theory, cognitive science, and sociology. Maturana died in 2021; Varela died in 2001. The framework is maintained by a scholarly community but is increasingly challenged by sympoiesis and related concepts.


**scale_of_operation**

Individual system (by definition). Extensions to social systems and ecosystems are proposed but contested.


**temporality**

Continuous self-production — the system exists in an ongoing present of self-making. Historical depth comes through structural coupling: the system's current structure reflects its history of perturbations. No anticipatory capacity in the basic framework (Rosen adds anticipation as a separate concept).


**Uncertain fields:** failure_under_attention, epistemological_stance, who_is_excluded, structural_tension

---


### ScenarioDNA — Culture Mapping

**Brief:** Patented method decoding meaning across language, image, behavior. Blends semiotics, systems thinking, computational linguistics.

**Garden Logic relevance:** Closest commercial analogue to A(DAI)'s sensing ambition. Tests what happens when cultural sensing is commercialized. The attention economy leaked in here — ScenarioDNA serves brands.

#### Basic identification and classification

- **name**: ScenarioDNA — Culture Mapping
- **type**: sensing
- **originator**: Tim Stock, Marie Lena Tupot (ScenarioDNA, New York; Parsons School of Design)
- **year**: 2001
- **key_text**: US Patent No. 9,002,755 — System and Method for Culture Mapping; Mapping Culture (book)
- **key_url**: https://www.scenariodna.com/culturemapping

#### Core ideas and theoretical positioning


**core_claim**

Culture can be systematically decoded through semiotic analysis of signifiers across language, image, and behavior, revealing structural patterns (personality archetypes, subcultural codes) that predict behavioral change — culture mapping provides coordinates for navigating uncertainty.


**relation_to_attention_economy**

Operates within the attention economy as a commercial service — culture mapping is sold to brands (Nike, IKEA, Verizon) to help them capture attention more effectively by understanding cultural codes. The methodology decodes culture to optimize brand strategy, which is fundamentally an attention-economy service even though the analytical method transcends simple attention metrics.


**relation_to_commons**

Anti-commons — the core methodology is patented (US Patent 9,002,755), proprietary, and commercially licensed. The cultural signals analyzed may come from commons (social media, public behavior), but the insights are private. This is the closest commercial analogue to A(DAI), and it demonstrates what happens when cultural sensing is enclosed.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Semiotic analysis pipeline backed by custom GPTs — cultural signals are collected from media, social platforms, and behavioral observation, then analyzed through a patented semiotic framework that maps them onto a two-dimensional quadrant of personality archetypes. Over 500,000 cultural signals in a continuously expanding dataset.


**data_model**

Cultural signals categorized by semiotic codes and personality archetypes, organized in a two-dimensional quadrant. Signals are classified by culture/subculture within sample populations. The data model tracks migration within the archetype matrix over time, producing 2D and 3D visualizations of cultural drift.


**temporal_logic**

Tracking over time — culture mapping monitors how cultural codes migrate within the archetype matrix across periods. The temporal logic is one of drift and migration: cultural meanings shift positions within a structural framework, and tracking these shifts reveals emerging trends.


**absence_handling**

Cultural mapping can detect absent codes — archetypical positions that are not being occupied, cultural quadrants that are underpopulated, or signifiers that have disappeared from the field. However, the framework interprets absence as market opportunity rather than structural gap.


**scalability_model**

Centralized consultancy — scales through the firm's capacity to take on clients. The custom GPTs and AI integration suggest a move toward platform-level scalability, but the core analytical method remains expertise-dependent.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

sensing-loop — ScenarioDNA is the closest commercial analogue to A(DAI)'s sensing capabilities. Both decode cultural signals to reveal structural patterns. The critical difference is in what happens after sensing: ScenarioDNA delivers brand strategy; A(DAI) aims to produce commons intelligence.


**intention_vs_attention**

ScenarioDNA operates in the intention-to-attention pipeline: it senses cultural intentions (what meanings are emerging, where behavior is shifting) in order to help brands capture attention more effectively. The sensing is intention-oriented (structural analysis of meaning), but the application is attention-oriented (optimizing brand impact). This is the exact configuration A(DAI) must avoid: using intention-quality sensing to serve attention-economy outcomes. However, A(DAI)'s Mode 2 (advisory services for capital actors) risks replicating this pattern.


**coherence_vs_consensus**

Coherence within the analytical framework — culture mapping seeks structural coherence across semiotic codes, not consensus among cultural participants. The quadrant model imposes coherence through its archetypical structure. This is analytical coherence (the framework makes culture legible) rather than emergent coherence (culture reveals its own patterns).


**contestability**

Low — the methodology is patented and proprietary. Clients receive deliverables but cannot contest the analytical framework. The semiotic codes and archetypical categories are defined by ScenarioDNA's methodology, not negotiated with the cultural communities being analyzed.


**forkability**

Not forkable — the method is patented. The analytical approach (semiotics + data visualization + archetype mapping) can be independently developed, but the specific Culture Mapping methodology is legally enclosed.


**tendency_axis_position**

enclosure (patented method), capture (commercial application for brand strategy), individual/institutional (consultancy serving corporate clients), spectacle-adjacent (helps brands create more effective spectacle through cultural insight). Anti-commons on every axis.


**what_adai_should_adopt**

The rigor of systematic semiotic analysis — ScenarioDNA's method of decoding cultural signals through structured semiotic frameworks is methodologically sophisticated. A(DAI) should develop comparable analytical rigor for its own signal processing, particularly in the CLA extraction layer where cultural codes need systematic interpretation. The temporal tracking of cultural drift is directly relevant to A(DAI)'s tendency axes. The 'glass box' transparency concept (evidence-based view of why culture is changing) is valuable, though ScenarioDNA's implementation is commercial rather than commons.


**what_adai_should_refuse**

The enclosure model entirely — patenting cultural analysis methods, keeping insights proprietary, and serving brand strategy. A(DAI) should also refuse the archetypical framework: pre-defined personality archetypes impose categories on culture rather than allowing culture to reveal its own patterns. A(DAI)'s gravitational model (where categories form around artists, not the reverse) is the correct alternative. Refuse the commercial epistemology where validity equals predictive power for brands — A(DAI)'s validity should come from structural coherence and contributor contestation.


#### Limitations, blind spots, and failure modes


**limits**

The patented method creates an analytical monoculture — one firm's semiotic framework defines how culture is mapped. The archetype-based approach imposes pre-defined categories rather than discovering emergent ones. The commercial client base skews analysis toward consumer culture and brand-relevant domains; non-commercial cultural practices are underweighted. The AI integration (custom GPTs) raises ouroboros risks.


#### Governance models and consent architectures


**governance_model**

Extractive corporate — private firm with patented methodology, serving corporate clients. No participatory governance. Analytical decisions are made by the firm's anthropologists and data scientists.


#### Material and operational conditions


**composability**

Monolithic — the patented method is not composable. Clients receive deliverables but cannot modify, extend, or recombine the methodology. The custom GPTs suggest some modular capability but within a proprietary framework.


**liveness**

Active — ScenarioDNA has been operating since 2001, with continuous client work, patent maintenance, and recent AI integration. The firm's dataset grows continuously.


**scale_of_operation**

Institutional — serves corporate clients across multiple markets (North America, Latin America, Europe, Asia). Operates at brand-strategy scale, not field-level or community-level.


**temporality**

Trend-tracking — temporal analysis follows cultural drift across periods, typically aligned with commercial planning cycles (seasonal, annual). No deep historical or anticipatory logic; the temporal frame is market-relevant near-term future.


**Uncertain fields:** consent_architecture, extraction_vector, who_is_excluded

---


### Sitra Weak Signals (Finland)

**Brief:** Institutional weak signal scanning using PESTEC + VERGE. Emphasizes that weak signals challenge assumptions and increase future capacity.

**Garden Logic relevance:** Institutional precedent for what A(DAI)'s pulse cycle does. Sitra is a government-funded futures organization. Tests whether intention-based sensing survives institutionalization.

#### Basic identification and classification

- **name**: Sitra Weak Signals (Finland)
- **type**: sensing
- **originator**: Sitra (Finnish Innovation Fund), led by Mikko Dufva; methodology draws on Igor Ansoff (1975)
- **year**: 2018
- **key_text**: Weak Signals from the Future (Sitra publications series, 2018-2025)
- **key_url**: https://www.sitra.fi/en/foresight/weak-signals/

#### Core ideas and theoretical positioning


**core_claim**

Weak signals — indicators of potentially emerging issues that may become significant in the future — can be systematically collected, classified (using PESTEC and VERGE frameworks), and interpreted to expand future-oriented thinking and challenge dominant narratives.


**relation_to_attention_economy**

Opposes the attention economy by focusing on signals that are explicitly NOT capturing attention yet. Weak signals are defined by their low salience — they are the opposite of viral content. The methodology values signals precisely because they have not been amplified by attention dynamics.


**relation_to_commons**

Positioned as a public good — Sitra is a Finnish government institution that publishes its weak signals analysis freely. The methodology is designed to serve national strategy and public foresight rather than private interests. The publications are openly accessible and intended for broad use.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Three-phase pipeline: collection (media monitoring, workshops, blogs, social media scanning) → classification (PESTEC categorization — Political, Economic, Social, Technological, Environmental, Cultural; VERGE categorization — defining, relating, interacting, production, consumption) → interpretation (grouping into phenomena, cross-domain analysis).


**data_model**

Individual signals classified by PESTEC and VERGE categories, with free-format subject identifiers. Signals are then grouped into phenomena — clusters of signals pointing toward the same emerging issue. A single signal may be a coincidence; grouped signals suggest a genuine phenomenon.


**temporal_logic**

Anticipatory-speculative — weak signals are about the future, but not the predictable future. They supplement trend analysis (what is likely to continue) with possibility analysis (what might emerge unexpectedly). The temporal logic is one of emergence: signals in the present that indicate possible futures.


**absence_handling**

Weak signal detection IS absence detection — the method looks for things that are not yet visible in mainstream discourse but may be emerging. However, the methodology depends on signals that are at least partially visible (published somewhere, mentioned somewhere). Completely absent phenomena — things that leave no trace at all — remain invisible even to weak signal scanning.


**scalability_model**

Institutional — scales through Sitra's organizational capacity and its partnerships with Finnish government and civil society. The methodology could be replicated by any institution, but requires significant curatorial labor for collection, classification, and interpretation.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

sensing-loop — Sitra's weak signal methodology is the institutional precedent for A(DAI)'s pulse cycle. Both systems scan for emerging signals, classify them, and interpret them in context. The key difference is that Sitra operates within national institutional frameworks while A(DAI) operates as a commons for a specific cultural field.


**intention_vs_attention**

Intention-aligned in method but institutional in application. The weak signal methodology deliberately seeks signals that attention dynamics have not amplified, which is intention-based sensing (looking for structural indicators rather than popular signals). However, Sitra's interpretation is filtered through institutional priorities (Finnish national strategy), which may introduce its own form of attention bias — what matters to the institution rather than what is structurally significant. A(DAI) should learn from Sitra's methodology but resist institutional filtering.


**coherence_vs_consensus**

Neither explicitly — Sitra groups signals into phenomena to identify emerging patterns (a form of coherence analysis), but the final output is designed to expand thinking rather than converge on a single interpretation. The methodology is deliberately pluralistic: different futures are presented as possibilities, not ranked predictions.


**contestability**

Moderate — Sitra publishes its signals and interpretations openly, allowing public scrutiny. However, the collection and classification process is not participatory; signals are curated by Sitra's foresight team. The methodology can be contested but the curatorial choices are not democratically governed.


**forkability**

The methodology is fully forkable — PESTEC and VERGE frameworks are open, and the collection-classification-interpretation pipeline can be replicated by anyone. Sitra does not patent or restrict its foresight methods.


**tendency_axis_position**

commons (publicly funded, freely published), infrastructure (national foresight capability), openness (methodology is replicable), institutional (government-funded, nationally scoped). The tension is between institutional commitment to public good and institutional capture of foresight priorities.


**what_adai_should_adopt**

The PESTEC classification as a complement to A(DAI)'s tendency vocabulary — ensuring signals are analyzed across political, economic, social, technological, environmental, and cultural dimensions rather than only through the field's internal categories. The three-phase pipeline (collection → classification → interpretation) maps directly onto A(DAI)'s inbox → process → graph flow. The grouping methodology: individual signals become significant when clustered into phenomena, which parallels how A(DAI) should detect emerging tendencies from individual signal contributions. The commitment to challenging assumptions rather than confirming them — Sitra's methodology explicitly aims to expand the range of considered futures.


**what_adai_should_refuse**

The institutional framing that ties weak signal interpretation to national strategy. A(DAI) serves a cultural field, not a nation-state, and its interpretive frame should emerge from the field's own tendencies rather than institutional priorities. Also refuse the purely speculative orientation — Sitra's weak signals are about possible futures, but A(DAI) also needs to diagnose present structural gaps. Sitra's methodology is forward-looking; A(DAI) must also be present-sensing. The VERGE framework (defining, relating, interacting, production, consumption) may be too generic for A(DAI)'s specific domain.


#### Limitations, blind spots, and failure modes


**limits**

Weak signal detection requires significant curatorial labor and expertise — it is not automated and does not scale without proportional human effort. The methodology is better at detecting signals that are at least partially visible than at sensing truly invisible phenomena. The interpretation phase introduces subjective judgment that may reflect institutional biases. The PESTEC framework may impose categories that miss domain-specific dynamics.


#### Governance models and consent architectures


**governance_model**

Public institution — Sitra is a Finnish government innovation fund with a parliamentary mandate. The foresight function is governed by institutional priorities set through democratic processes (Finnish parliament oversees Sitra's mandate). Operational decisions are made by Sitra's foresight team.


#### Material and operational conditions


**composability**

Highly composable — the PESTEC and VERGE frameworks, the three-phase pipeline, and the grouping methodology can all be independently adopted and modified. The approach is modular by design.


**liveness**

Active — Sitra publishes regular weak signals reports (2018, 2022, 2025). The foresight function is an ongoing institutional commitment. The 2025 edition was published as a magazine from 2046, demonstrating continued methodological experimentation.


**scale_of_operation**

Institutional-national — operates at the scale of Finnish national strategy with global signal sources. The methodology could be applied at other scales (scene, field, planetary) but Sitra operates nationally.


**temporality**

Anticipatory-speculative — oriented toward emerging futures, not established trends. The temporal horizon is medium-term (years to decades). Signals are dated but interpreted in terms of their future potential rather than their current significance.


**Uncertain fields:** who_is_excluded, failure_under_attention, consent_architecture

---


### Ronald Burt — Structural Holes Theory (1992)

**Brief:** Network theory of brokerage advantage at gaps between clusters. Competitive advantage from bridging disconnected groups.

**Garden Logic relevance:** The coherence prompt's theoretical foundation. Burt's structural holes = A(DAI)'s disconnected clusters. But Burt frames holes as competitive advantage (attention). A(DAI) frames them as coherence failures (intention).

#### Basic identification and classification

- **name**: Ronald Burt — Structural Holes Theory (1992)
- **type**: sensing
- **originator**: Ronald S. Burt (University of Chicago Booth School of Business)
- **year**: 1992
- **key_text**: Structural Holes: The Social Structure of Competition (Harvard University Press, 1992)
- **key_url**: https://www.hup.harvard.edu/books/9780674843714

#### Core ideas and theoretical positioning


**core_claim**

Competitive advantage in networks derives from brokerage across structural holes — gaps between otherwise disconnected groups — where brokers who bridge these gaps gain information advantages through early access to diverse, non-redundant information.


**relation_to_attention_economy**

Burt's theory is pre-attention-economy but deeply relevant: structural holes describe where information asymmetries exist, which is exactly what the attention economy exploits. Platform companies position themselves as brokers across structural holes (connecting advertisers to users, creators to audiences), extracting value from information arbitrage at network gaps.


**relation_to_commons**

Ambiguous — Burt frames structural holes as sources of competitive advantage for individual brokers, which is an anti-commons framing (private benefit from positional advantage). However, the identification of structural holes can serve commons purposes if gaps are bridged for collective benefit rather than individual profit.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Social network analysis — nodes (individuals, organizations) connected by ties (relationships), with structural holes identified as gaps between clusters. Key metrics: network constraint (how redundant a node's contacts are), effective size (number of non-redundant contacts), and betweenness centrality.


**data_model**

Network graph — nodes and edges with tie strength. The critical data is not the nodes themselves but the pattern of connections and, crucially, the pattern of non-connections (structural holes). Redundancy analysis: ties to contacts who are themselves connected provide redundant information; ties to otherwise disconnected contacts provide non-redundant information.


**temporal_logic**

Structural-positional — Burt's framework is primarily synchronic (analyzing network structure at a point in time). Temporal dynamics come from changes in network structure: holes open and close as relationships form and dissolve. The temporal logic is one of structural change rather than anticipation or cyclicity.


**absence_handling**

Structural holes ARE absences — the theory is fundamentally about the productive significance of missing connections. A structural hole is a gap between two groups where no bridge exists. The theory treats absence not as a deficiency but as an opportunity (for Burt, competitive advantage; for A(DAI), coherence analysis). This is the most directly relevant absence-handling framework for A(DAI)'s coherence prompt.


**scalability_model**

Scales with network analysis tools — can be applied to any network from small teams to global industries. The analysis is computationally tractable for moderately sized networks but becomes complex for very large, dynamic networks.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

sensing-loop and prompt-generation — structural holes theory directly informs A(DAI)'s coherence prompt, which detects gaps between clusters in the knowledge graph. Structural holes are what the coherence prompt looks for.


**intention_vs_attention**

This is the crucial reframing. Burt frames structural holes as competitive advantage — brokers exploit gaps for personal benefit (attention/capture logic). A(DAI) reframes structural holes as coherence failures — gaps that indicate the field's self-understanding is incomplete (intention/diagnostic logic). Same structural phenomenon, opposite interpretation. Burt asks: who benefits from this gap? A(DAI) asks: what does this gap reveal about what the field doesn't yet know about itself? This reframing IS A(DAI)'s core innovation: taking a competitive-advantage theory and converting it into a commons-diagnostic tool.


**coherence_vs_consensus**

Coherence — structural holes theory is about network coherence (or the lack of it). A structural hole represents a coherence failure: two groups that should be connected (because they have complementary information) are not. Bridging the hole increases network coherence. Burt's framing is competitive (the broker benefits), but the underlying structural logic is about coherence (the network becomes more connected, information flows more freely).


**contestability**

The theory itself is well-established and empirically supported but intellectually contestable. The competitive framing (holes as advantage) has been critiqued from commons and collective-benefit perspectives. The metrics (constraint, effective size) are debatable in their application to specific contexts. A(DAI)'s reframing — holes as coherence failures rather than brokerage opportunities — is itself a form of contestation.


**forkability**

The theory is freely available academic knowledge. The network analysis methods are implemented in open-source tools. Anyone can apply structural holes analysis to any network. Fully forkable.


**tendency_axis_position**

In Burt's framing: capture (brokers exploit holes for private benefit), individual (competitive advantage for positioned actors). In A(DAI)'s reframing: commons (holes reveal collective knowledge gaps), infrastructure (diagnostic tool for field coherence). The same theory occupies opposite positions depending on the interpretive frame.


**what_adai_should_adopt**

The structural holes concept as the formal foundation for the coherence prompt. Specifically: A(DAI)'s graph should be analyzed for structural holes — gaps between clusters of practitioners, concepts, or scenes that indicate missing connections. The redundancy analysis: A(DAI) should weight non-redundant signals (those that connect otherwise disconnected parts of the field) more heavily than redundant ones (those that confirm existing connections). The network metrics (constraint, effective size) can be computed on A(DAI)'s graph to identify the most significant coherence gaps. The empirical grounding: Burt's theory is backed by decades of empirical research, which lends credibility to coherence-gap detection as an analytical method.


**what_adai_should_refuse**

The competitive framing entirely. A(DAI) must not position itself or its users as brokers who exploit structural holes for advantage. The intelligence that A(DAI) produces about gaps should be commons knowledge, not proprietary insight for positioned actors. Mode 2 (advisory) risks reintroducing Burt's competitive logic: if A(DAI) tells institutional clients where the structural holes are, those clients can position themselves as brokers. A(DAI) must ensure that coherence analysis serves the field's collective understanding, not individual competitive positioning. Also refuse the assumption that all structural holes should be bridged — some gaps exist because they represent genuine differences (disciplinary boundaries, aesthetic disagreements) that should be respected rather than collapsed.


#### Limitations, blind spots, and failure modes


**limits**

The theory focuses on information and control benefits of brokerage but underweights the costs (trust-building across holes is difficult, brokers face role conflict). The competitive framing may not apply in contexts where collaboration, not competition, is the primary dynamic. The metrics (constraint, effective size) require complete network data, which is often unavailable. The theory is better at explaining structural advantage than at guiding structural change.


#### Governance models and consent architectures


**governance_model**

Academic — the theory is maintained and extended by the scholarly community. No governance structure applies to the theory itself. Applications of the theory are governed by whoever implements them.


#### Material and operational conditions


**composability**

Highly composable — network analysis tools, metrics, and interpretive frameworks can be independently adopted, combined, and modified. The theory is a toolkit, not a monolith.


**liveness**

Historically significant and actively cited. Burt continues to publish refinements and extensions. The structural holes concept is foundational in organizational sociology, management science, and network science.


**scale_of_operation**

Multi-scale — applies from small teams (intra-organizational networks) to global industries (inter-organizational networks). No inherent scale limitation.


**temporality**

Primarily synchronic (structural analysis at a point in time) with longitudinal extensions. The temporal dynamics of structural holes — how they open and close — are studied through repeated network measurements. No anticipatory or cyclical temporal logic in the basic theory.


**Uncertain fields:** failure_under_attention, who_is_excluded, structural_tension

---


### Donna Haraway — Sympoiesis / Making-With

**Brief:** Critique of autopoiesis. Nothing makes itself. All systems are sympoietic — making-with. Staying with the trouble.

**Garden Logic relevance:** The deepest critique of A(DAI)'s self-description. If the garden 'reads its own intentions,' Haraway asks: whose intentions? The system is sympoietic — it makes-with its contributors, its infrastructure, its supply chains, its silences.

#### Basic identification and classification

- **name**: Donna Haraway — Sympoiesis / Making-With
- **type**: sensing
- **originator**: Donna Haraway (UC Santa Cruz); term originally coined by Beth Dempster
- **year**: 2016

**key_text**

Staying with the Trouble: Making Kin in the Chthulucene (Duke University Press, 2016), Chapter 3: 'Sympoiesis: Symbiogenesis and the Lively Arts of Staying with the Trouble'

- **key_url**: https://www.dukeupress.edu/staying-with-the-trouble

#### Core ideas and theoretical positioning


**core_claim**

Nothing makes itself — all systems are sympoietic (making-with) rather than autopoietic (self-making). Entities emerge through relationality, multispecies entanglement, and mutual constitution rather than through self-enclosed self-production.


**relation_to_attention_economy**

Sympoiesis is a radical alternative to the attention economy's individualist ontology. The attention economy assumes discrete individuals whose attention can be captured; sympoiesis dissolves individual boundaries and frames all entities as constituted through their relationships. If nothing makes itself, then attention cannot be 'captured' — it is always already distributed across webs of making-with.


**relation_to_commons**

Deeply commons-aligned — sympoiesis frames existence itself as a commons practice. If nothing makes itself, then all production is collective production, all knowledge is co-produced knowledge, and all resources are shared resources. The concept goes further than most commons frameworks by questioning the boundaries between the entities that share the commons.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

No technical architecture — sympoiesis is a philosophical and biological concept, not a system design. However, it implies architectures that are: permeable (not operationally closed), distributed (information and control are distributed among components), and evolutionary (systems have potential for surprising change).


**data_model**

Relational — if adopted as a design principle, the data model would emphasize relationships (typed edges, co-occurrences, mutual constitution) over entities (nodes, individuals, discrete objects). The graph structure is more important than the node properties.


**temporal_logic**

Emergent and entangled — sympoietic systems do not have fixed temporal boundaries. Past, present, and future are entangled through the ongoing processes of making-with. The temporal logic is one of continuous becoming rather than discrete states or cyclical recurrence.


**absence_handling**

Sympoiesis challenges the concept of absence by questioning boundaries. What appears 'absent' from one system is present in the relationships that constitute it. Absence is relational, not absolute — something is missing only relative to a particular framing that defines what should be present. This radically destabilizes A(DAI)'s coherence prompt: is a structural hole really a gap, or is it a different configuration of relationships?


**scalability_model**

Not applicable as a scalable system. As a concept, it applies at all scales but does not provide implementation guidance.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

substrate — sympoiesis is the deepest philosophical critique of A(DAI)'s self-description. It challenges the system's claim to be a self-sustaining commons (autopoietic) by insisting that A(DAI) is always making-with: with contributors, with its technological substrate, with the field it senses, with the broader ecologies it participates in.


**intention_vs_attention**

Sympoiesis transcends the intention/attention distinction by questioning the entity that 'intends' or 'attends.' If A(DAI) is sympoietic — constituted through its relationships with contributors, the field, and its infrastructure — then 'A(DAI)'s intention' is a shorthand for a distributed process of making-with that has no single intending subject. This is not a refusal of the intention/attention distinction but a deepening: intention in a sympoietic system is collective, distributed, and emergent rather than designed, centralized, and deliberate.


**coherence_vs_consensus**

Neither — sympoiesis suggests that coherence and consensus are both modes of resolution that impose premature closure on the ongoing trouble of making-with. Haraway advocates 'staying with the trouble' rather than resolving it into either coherent structures or consensus positions. For A(DAI), this means the graph should be able to hold unresolved tensions, contradictions, and ongoing disagreements rather than smoothing them into coherent narratives.


**contestability**

Radically high — sympoiesis insists that all positions are partial, situated, and relational. Nothing has the authority to be uncontestable because nothing makes itself. Every node in A(DAI)'s graph is constituted through relationships and can be reframed, challenged, or dissolved through different relational configurations.


**forkability**

The concept is freely available and widely discussed. As a philosophical framework, it can be adopted, extended, critiqued, and combined with other frameworks by anyone. Haraway's own work draws on and extends Beth Dempster's original coinage.


**tendency_axis_position**

commons (by ontological definition — nothing makes itself, everything is shared production), distributed (information and control are distributed among components), anti-enclosure (boundaries are permeable), anti-spectacle (staying with the trouble rather than producing clean narratives).


**what_adai_should_adopt**

The self-description. A(DAI) should describe itself as sympoietic rather than autopoietic — a system that makes-with rather than a system that makes itself. This is not merely philosophical: it changes operational priorities. A sympoietic A(DAI) designs for contributor agency, field responsiveness, and infrastructure transparency rather than system autonomy and operational closure. The concept of 'staying with the trouble': A(DAI)'s intelligence outputs should hold unresolved tensions rather than resolving them prematurely. The dream cycle should produce questions and provocations, not answers. The relational emphasis: A(DAI)'s graph should be weighted toward edges (relationships, connections, tensions) rather than nodes (entities, practitioners, concepts). The boundary permeability: the merge boundary should be semi-permeable rather than closed — allowing signals to flow in while maintaining structural integrity.


**what_adai_should_refuse**

The anti-technological implications of Haraway's strongest claims. If nothing makes itself, and if computational systems are fundamentally reductionist, then A(DAI) (a computational system) cannot be truly sympoietic. Haraway's framework is more at home with biological and multispecies entanglement than with software architecture. A(DAI) should adopt the relational ontology without accepting that computation is inherently incompatible with it. Also refuse the dissolution of all boundaries — A(DAI) needs functional boundaries (the merge boundary, the distinction between signals and processed intelligence) even if it acknowledges that these boundaries are partial, situated, and permeable.


#### Limitations, blind spots, and failure modes


**limits**

Sympoiesis is powerful as a critique but difficult to operationalize. The insistence on relational emergence and boundary permeability provides no practical guidelines for system design. The anti-reductionist stance resists the categorization and measurement that any functioning system requires. The concept is better at challenging existing frameworks than at providing alternatives.


#### Governance models and consent architectures


**governance_model**

No governance model proposed — sympoiesis is a philosophical framework, not a governance structure. However, it implies governance that is distributed, relational, and responsive to all participants (human and non-human). Any governance model that concentrates authority in a single entity would be anti-sympoietic.


#### Material and operational conditions


**composability**

Maximally composable as a philosophical framework — can be combined with any other framework, applied to any domain, and extended in any direction. The concept is inherently relational and therefore inherently combinable.


**liveness**

Active and influential — Haraway continues to be a major figure in feminist theory, STS, and environmental humanities. The sympoiesis concept is widely cited and actively debated. The book remains a key reference across multiple fields.


**scale_of_operation**

Multi-scale — from microbial (holobionts, symbiogenesis) to planetary (the Chthulucene). The concept applies at every scale because making-with occurs at every scale.


**temporality**

Entangled — past, present, and future are intertwined through ongoing processes of making-with. The temporal logic is one of continuous becoming, not discrete states or linear progression. Historical depth comes through the deep evolutionary timescales of symbiogenesis.


**Uncertain fields:** who_is_excluded, failure_under_attention, consent_architecture, structural_tension

---


### Anticipatory Governance (David Guston)

#### Basic identification and classification

- **name**: Anticipatory Governance (David Guston)
- **type**: sensing

**originator**

David H. Guston, Arizona State University. Center for Nanotechnology in Society (CNS-ASU), funded by NSF.

- **year**: 2014 (key paper). Concept developed from 2008 onwards through CNS-ASU.

**key_text**

Guston, D.H. (2014) 'Understanding anticipatory governance', Social Studies of Science 44(2), 218-242.

- **key_url**: https://journals.sagepub.com/doi/10.1177/0306312713508669

#### Core ideas and theoretical positioning


**core_claim**

Anticipatory governance is a broad-based societal capacity to manage emerging knowledge-based technologies while management is still possible — through the integration of foresight, public engagement, and social science into technoscientific practice.


**relation_to_attention_economy**

Anticipatory governance is a direct counter to attention-driven technology governance, which only engages the public after technologies have been deployed and controversies have erupted. The framework insists on engagement before crystallisation — governance of what has not yet attracted attention. This is structurally aligned with A(DAI)'s intention logic: diagnosing structural conditions before they produce visible symptoms.


**relation_to_commons**

Anticipatory governance positions the trajectory of emerging technologies as a commons concern — not a private matter for developers or a bureaucratic matter for regulators. Public engagement is framed as a right to participate in shaping technological futures, not just a mechanism for legitimation.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Real-time technology assessment (RTTA). Continuous, integrated monitoring and deliberation about emerging technologies, not episodic regulation after the fact. The architecture is institutional — embedding social scientists and ethicists within technical research teams — rather than computational.


**data_model**

Scenario-based. Foresight produces plausible future scenarios; engagement produces deliberative outputs (citizen preferences, values); integration produces real-time assessments. Data is qualitative-deliberative, not computational.


**temporal_logic**

Anticipatory by definition. The temporal logic is forward-looking: governance acts on technologies before they crystallise into irreversible forms. This is Guston's etymological point — 'anticipatory' comes from capere (to take into possession), meaning the capacity to take hold of the future. The framework operates in the temporal window between emergence and crystallisation.


**absence_handling**

Anticipatory governance is fundamentally about handling absence — governing technologies that do not yet exist in their mature form. The framework works with what is not yet known and not yet formed. Foresight is explicitly the practice of mapping absent futures.


**scalability_model**

Institutional. Anticipatory governance scales through embedding anticipatory practices in existing institutions (universities, funding agencies, regulatory bodies). Not technically scalable — it requires human deliberation and institutional commitment.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

sensing-loop. Anticipatory governance maps to A(DAI)'s sensing layer — it is a framework for sensing and responding to emergent conditions before they crystallise. The RTTA model (real-time technology assessment) is structurally parallel to A(DAI)'s tidal sensing: continuous monitoring with periodic synthesis.


**intention_vs_attention**

Anticipatory governance is the most explicitly intention-aligned governance framework in this research set. It governs what has not yet attracted attention — emerging technologies that are still in formation. The framework diagnoses structural conditions (trajectories, embedded values, distributional consequences) rather than responding to public attention or market signals. The dream cycle in A(DAI) is anticipatory governance applied to culture: synthesising structural diagnoses of what the field needs before those needs become visible crises.


**coherence_vs_consensus**

Seeks democratic coherence rather than expert consensus. Anticipatory governance explicitly includes publics in deliberation, not to achieve consensus but to produce a more coherent (multi-perspective, structurally aware) understanding of technological trajectories. This is distinct from both expert consensus (which excludes publics) and majoritarian democracy (which reduces complex issues to binary votes).


**contestability**

Highly contestable. The framework is designed to surface disagreements about technological futures and make them productive. Engagement processes explicitly invite dissent and counter-scenarios. The outputs (foresight scenarios, deliberative recommendations) are contestable propositions, not binding determinations.


**forkability**

Intellectually forkable — the framework can be adapted to any domain (bio, nano, AI, culture). Institutionally, different universities and agencies can implement anticipatory governance differently. But there is no formal fork-merge protocol — implementations diverge without mechanisms for re-integration.


**tendency_axis_position**

openness: open — the framework insists on public engagement and democratic participation. commons: positions technological futures as commons concerns. spectacle vs infrastructure: infrastructure — anticipatory governance is about invisible institutional capacity, not visible public campaigns. individual vs distributed: distributed — broad-based societal capacity, not individual expertise.


**what_adai_should_adopt**

The three-capacity model (foresight + engagement + integration) as the explicit operational structure of A(DAI)'s dream cycle. Foresight = the 72h synthesis that maps plausible cultural trajectories. Engagement = the participation layer that invites community input. Integration = the process of embedding these insights back into the graph. The temporal logic of governing before crystallisation — A(DAI) should aim to detect cultural tendencies in their emergence phase, when they are still malleable, not after they have hardened into established categories. The concept of 'anticipation as capacity' rather than 'prediction' — A(DAI) does not predict what will happen in the digital arts field, it builds the capacity to respond intelligently to whatever emerges.


**what_adai_should_refuse**

The institutional dependency. Anticipatory governance requires embedding practices in existing institutions (universities, funding agencies), which means it only works where those institutions exist and are receptive. A(DAI) must work independently of institutional goodwill. Also refuse the focus on governance as the primary output — A(DAI) produces structural diagnoses, not governance recommendations. It informs but does not govern. Finally, refuse the implicit assumption that 'management is still possible' — in truly complex cultural domains, management may never be possible, only sensing and responding.


#### Limitations, blind spots, and failure modes


**limits**

Anticipatory governance has been criticised for proximity to technoscientific hubris — the assumption that governance can shape technologies before they form. In practice, the window of anticipatory opportunity may be much smaller than assumed. The framework has been most successful in nanoscience, where large public funding enabled institutional embedding, but has proven harder to apply in rapidly moving fields like AI where private capital moves faster than public deliberation.


#### Governance models and consent architectures


**governance_model**

Democratic-institutional. Anticipatory governance is embedded within existing democratic institutions (universities, funding agencies, regulatory bodies). It is polycentric — different institutions implement it differently — but not autonomous or commons-based.


#### Material and operational conditions


**composability**

Conceptually composable — the three-capacity model can be applied to any emerging technology or cultural domain. Not technically composable — there is no software, protocol, or data format.


**liveness**

Active but evolving. The framework continues to be developed and applied, particularly in responsible innovation contexts. Recent work (2022) has amplified the call for anticipatory governance in AI contexts. The concept has been taken up by the EU, OECD, and various national science agencies.


**scale_of_operation**

Institutional to field-level. Anticipatory governance operates at the scale of research programmes, funding agencies, and national science policy. Not individual and not yet planetary, though the concept is being applied to global AI governance.


**temporality**

Anticipatory by definition. Temporal logic is forward-looking: governance acts in the window between emergence and crystallisation. This is distinct from real-time (too fast) and historical (too late). The framework operates in anticipatory time — the interval of possibility.


**Uncertain fields:** who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### Causal Layered Analysis (Sohail Inayatullah)

#### Basic identification and classification

- **name**: Causal Layered Analysis (Sohail Inayatullah)
- **type**: sensing
- **originator**: Sohail Inayatullah
- **year**: 1998

**key_text**

Causal Layered Analysis: Poststructuralism as Method (Futures, 1998); The Causal Layered Analysis Reader (2004); CLA 3.0 (2022)

- **key_url**: https://www.metafuture.org/

#### Core ideas and theoretical positioning


**core_claim**

Complex phenomena must be analyzed at four layers simultaneously — litany (surface data), systemic causes (structural analysis), worldview/discourse (interpretive framing), and myth/metaphor (deep narrative) — to create transformative spaces for alternative futures rather than merely predict the most likely one.


**relation_to_attention_economy**

CLA provides the analytical framework for moving beneath the attention economy's surface (litany layer) to reveal its structural causes, underlying worldviews, and foundational myths. The attention economy operates by keeping analysis at the litany level — trending topics, engagement metrics, real-time feeds. CLA's four-layer structure is inherently anti-attention because it demands depth rather than speed.


**relation_to_commons**

CLA is itself a commons resource — Inayatullah has made the methodology freely available and it has been widely adopted across fields. The method creates a commons of analytical depth: by making deep structural analysis accessible, it democratizes futures thinking beyond professional forecasters.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Four-layer analytical stack: litany → systemic causes → worldview/discourse → myth/metaphor. Analysis moves vertically between layers, with each layer revealing deeper causal structures. The method is both top-down (starting from observable data) and bottom-up (starting from myths and working up to surface manifestations).


**data_model**

Layered narrative. Each layer contains different types of information: quantitative data at the litany level, institutional/structural analysis at the systemic level, discourse analysis at the worldview level, and narrative/archetypal analysis at the myth level. The layers are connected through causal relationships — myths produce worldviews, worldviews produce systems, systems produce the litany.


**temporal_logic**

Anticipatory. CLA is not designed to predict specific futures but to create 'transformative spaces for the creation of alternative futures.' The method opens temporal possibility by revealing that the litany (what seems inevitable) is produced by layers that could be different. This is anticipatory in the strongest sense — it creates the conditions for alternative futures to become conceivable.


**absence_handling**

CLA's deepest layer (myth/metaphor) addresses what is systemically absent from surface analysis. By moving to deeper layers, CLA reveals the myths and narratives that make certain futures invisible. The method's primary function is to make visible what surface analysis excludes — this IS absence detection.


**scalability_model**

Infinitely scalable as a method. CLA can be applied to any topic at any scale — from individual career planning to planetary futures. The method is a framework, not a platform, so it scales by adoption rather than infrastructure.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

Directly adopted as A(DAI)'s dream cycle analytical framework. CLA's four layers map to A(DAI)'s signal processing: frontier signals correspond to litany, tendency analysis to systemic causes, discourse analysis to worldview, and the dream cycle to myth/metaphor. This is not an approximate mapping — A(DAI) explicitly uses CLA.


**intention_vs_attention**

Strongly intention-oriented. CLA's purpose is structural diagnosis — revealing the deep layers beneath surface events to enable more informed action. The method does not optimize for attention but for depth of understanding. Its four-layer structure IS an intention architecture: each layer deepens the analysis, moving from 'what happened' (attention) to 'what does this mean structurally' (intention).


**coherence_vs_consensus**

Coherence. CLA explicitly embraces multiple readings at each layer. Different analysts working on the same topic may identify different systemic causes, different worldviews, and different myths. The method creates coherence by providing a shared analytical structure while allowing divergent content. This is structural coherence — agreement on the framework, not on the findings.


**contestability**

Very high. CLA is designed to be contested — each layer's analysis can be challenged, alternative readings proposed, and different myths surfaced. The method's poststructuralist foundation means it expects multiple, competing interpretations. Counter-analyses are first-class outputs.


**forkability**

Extremely forkable. CLA has been forked extensively — Inayatullah's CLA Reader series documents hundreds of applications across diverse contexts, each adapting the method to specific needs. The method encourages forking by design. Provenance is preserved through citation and methodological transparency.


**tendency_axis_position**

Openness (the method opens analysis rather than closing it), commons (freely available methodology), infrastructure (a thinking infrastructure rather than a platform), distributed (anyone can apply it anywhere).


**what_adai_should_adopt**

Already adopted as the dream cycle's analytical framework. What A(DAI) should deepen is CLA's emphasis on the myth/metaphor layer — the deepest, most transformative layer that is hardest to operationalize computationally. A(DAI) should invest in developing ways to surface and analyze the myths that shape the digital arts field: what are the foundational narratives (progress, disruption, individual genius, technological determinism) that make certain futures invisible? Also adopt CLA's multi-epistemic integration — the insistence that empirical data, structural analysis, discourse analysis, and narrative analysis are all necessary and none is sufficient alone.


**what_adai_should_refuse**

The risk of CLA becoming a checklist rather than a genuine analytical process. If A(DAI) applies CLA mechanically — filling in four boxes — it loses the method's transformative power. Also refuse the temptation to privilege the litany layer (which is most computationally tractable) over the myth layer (which requires hermeneutic judgment). The computational pipeline may naturally bias toward surface-level analysis; A(DAI) must resist this bias architecturally.


#### Limitations, blind spots, and failure modes


**limits**

CLA is a method, not a system — it depends entirely on the quality of the analysts applying it. The myth/metaphor layer is particularly difficult: identifying foundational myths requires cultural knowledge and interpretive skill that are unevenly distributed. The method can be applied superficially (filling in four boxes) without achieving genuine depth. CLA also does not specify how to move from analysis to action.


#### Governance models and consent architectures


**governance_model**

Open protocol. CLA is a freely available methodology that anyone can use, adapt, and teach. Inayatullah does not control its application. Governance is through the community of practice — the CLA Reader series, conferences, and practitioner networks provide peer accountability.


#### Material and operational conditions


**composability**

Maximally composable. CLA can be combined with any other analytical method — scenario planning, systems thinking, design thinking, participatory action research. It is a meta-method that provides analytical scaffolding for other approaches.


**liveness**

Actively maintained and evolving. Inayatullah continues to develop the method (CLA 3.0, published 2022). The global community of CLA practitioners is growing. The method is at full liveness.


**scale_of_operation**

Multi-scale. CLA can be applied at individual, organizational, field, and planetary scales. Its scalability as a method is one of its primary strengths.


**temporality**

Anticipatory and depth-oriented. CLA's temporal logic is futures-oriented — it creates conditions for alternative futures by revealing the deep layers that constrain present thinking. The four layers represent different temporal depths: litany (present), systemic (structural persistence), worldview (generational), myth (civilizational).


**Uncertain fields:** epistemological_stance, who_is_excluded, failure_under_attention, structural_tension, extraction_vector, consent_architecture

---


### Cynefin Framework

#### Basic identification and classification

- **name**: Cynefin Framework
- **type**: sensing
- **originator**: Dave Snowden (with Cynthia Kurtz, IBM Global Services; later The Cynefin Co)
- **year**: 1999 (model); 2003 (first formal paper with Kurtz); 2007 (HBR with Boone)

**key_text**

Snowden, D.J. & Boone, M.E. (2007) 'A Leader's Framework for Decision Making', Harvard Business Review. Kurtz, C.F. & Snowden, D.J. (2003) 'The new dynamics of strategy: Sense-making in a complex and complicated world', IBM Systems Journal 42(3).

- **key_url**: https://thecynefin.co/about-us/about-cynefin-framework/

#### Core ideas and theoretical positioning


**core_claim**

Decision-making requires first diagnosing which ontological domain you occupy — clear, complicated, complex, chaotic, or confused — because each demands a fundamentally different response pattern.


**relation_to_attention_economy**

Cynefin is structurally indifferent to attention economics; it is a diagnostic framework that precedes any engagement logic. However, it implicitly critiques attention-driven responses by insisting that complex domains require patience and pattern emergence rather than rapid signal-response cycles optimised for engagement.


**relation_to_commons**

Cynefin treats knowledge as situationally embedded and socially constructed through narrative. The framework itself is openly taught but commercially operated through The Cynefin Co. It frames collective sensemaking as a shared interpretive practice rather than a resource to be enclosed.


#### Architecture, data models, and implementation patterns


**architecture_pattern**

Diagnostic ontology with domain-specific decision protocols. Not a computational system but a classification framework that maps onto action patterns: Sense-Categorise-Respond (clear), Sense-Analyse-Respond (complicated), Probe-Sense-Respond (complex), Act-Sense-Respond (chaotic).


**data_model**

Narrative-based. Cynefin relies on distributed ethnography and micro-narrative collection (SenseMaker software) to populate its domains. Data is qualitative, self-signified (narrators classify their own stories), and pattern-emergent rather than schema-driven.


**temporal_logic**

Cyclical and anticipatory. Domains are not static — systems drift between domains over time. Collapse from clear to chaotic (complacency-driven catastrophic failure) is a key temporal pattern. The probe-sense-respond cycle is inherently iterative and time-aware.


**absence_handling**

Absence is central to the complex and confused domains. In the complex domain, the relevant patterns have not yet emerged — the system explicitly works with what is not yet known. The 'confused' centre domain represents the state of not even knowing which domain you are in.


**scalability_model**

Consultancy-scaled. The framework itself is infinitely replicable as a mental model, but its rigorous application (via SenseMaker and facilitated workshops) requires trained practitioners. Federated through certified practitioners.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

sensing-loop. Cynefin maps directly to A(DAI)'s sensing layer — it is a meta-framework for how to sense. The probe-sense-respond pattern for complex domains is the theoretical justification for A(DAI)'s tidal rhythm.


**intention_vs_attention**

Cynefin is fundamentally an intention framework. It diagnoses the structural nature of a situation before prescribing action, rather than optimising for engagement or novelty. The framework asks 'what kind of problem is this?' not 'what is most interesting or urgent?' This aligns with A(DAI)'s intention logic: structural diagnosis of gaps and conditions precedes any surface-level signal processing. The key insight is that complex domains cannot be navigated by attention — they require patient probing and emergent pattern recognition.


**coherence_vs_consensus**

Coherence-seeking. Cynefin explicitly rejects the idea that complex domains can be resolved into consensus. Multiple valid interpretations coexist. The framework seeks coherence — a structurally consistent reading of what domain you occupy — rather than agreement on what the 'answer' is. This directly parallels A(DAI)'s graph producing multiple valid readings rather than a single authoritative view.


**contestability**

Highly contestable by design. The domain classification itself is subject to debate and revision. SenseMaker specifically distributes the power of interpretation to narrators rather than analysts. Counter-signals (stories that challenge the emerging pattern) are first-class data.


**forkability**

The framework is intellectually forkable — anyone can apply the domain model. But The Cynefin Co maintains commercial control over SenseMaker tooling and certification. The conceptual layer is open; the operational layer is proprietary. No technical fork mechanism exists.


**tendency_axis_position**

openness: leans open (framework is widely taught and published) but with commercial enclosure of tooling. commons: operates as intellectual commons with proprietary practice layer. spectacle vs infrastructure: firmly infrastructure — Cynefin is anti-spectacle by nature. individual vs distributed: distributed sensemaking is core, but facilitation often depends on expert practitioners.


**what_adai_should_adopt**

The probe-sense-respond cycle as the explicit operational logic for A(DAI)'s tidal rhythm at 6/24/72h intervals. The insight that complex systems require safe-to-fail probes rather than fail-safe plans. The practice of self-signification — letting signal originators classify their own contributions rather than imposing analyst categories. The domain diagnostic as a meta-layer: A(DAI) should be able to diagnose whether a given cultural tendency is in a clear, complicated, complex, or chaotic phase.


**what_adai_should_refuse**

The consultancy-dependency model. Cynefin's operational deployment requires trained facilitators and proprietary software (SenseMaker), creating a bottleneck that contradicts A(DAI)'s commons-first architecture. A(DAI) should refuse any pattern that requires certified practitioners to operate. Also refuse the implicit hierarchy between framework-holder and framework-user — A(DAI) must distribute sensemaking capacity, not concentrate it.


#### Limitations, blind spots, and failure modes


**limits**

Cynefin is descriptive, not prescriptive beyond general response patterns. It does not specify what probes to design, how to detect patterns, or when enough sensing has occurred. The framework is powerful at the meta-level but thin at the operational level. SenseMaker, the primary data collection tool, requires significant facilitation expertise and does not scale easily to continuous automated sensing.


#### Governance models and consent architectures


**governance_model**

Hybrid: intellectual commons with proprietary practice layer. The Cynefin Co operates as a B-corp with Snowden as founder. Certification programmes control quality but also create gatekeeping. Open in theory, enclosed in tooling.


#### Material and operational conditions


**composability**

Modular at the conceptual level — the five-domain model composes well with other frameworks (agile, design thinking, systems dynamics). Monolithic at the tooling level — SenseMaker is a closed platform.


**liveness**

Actively maintained and evolving. Snowden continued developing the framework until his death in 2023. The Cynefin Co continues operations. The framework has been updated multiple times (domain renaming, addition of liminal spaces between domains).


**scale_of_operation**

Multi-scale: from individual decision-making to organisational strategy to national policy (used by Singapore government, NATO, various health systems).


**temporality**

Cyclical and emergent. Systems move between domains over time. The framework tracks temporal dynamics (drift toward chaos, recovery to complexity). Anticipatory in its warning about complacency-driven collapse from clear to chaotic.


**Uncertain fields:** who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---


### Will Straw — Scene Analysis

#### Basic identification and classification

- **name**: Will Straw — Scene Analysis
- **type**: sensing

**originator**

Will Straw, Professor, Department of Art History and Communication Studies, McGill University, Montreal

- **year**: 1991 (foundational paper); 2004, 2014 (subsequent refinements on 'Scene Thinking')

**key_text**

Straw, W. (1991) 'Systems of articulation, logics of change: Communities and scenes in popular music', Cultural Studies 5(3), 368-388. Straw, W. (2014) 'Scene Thinking', Cultural Studies 29(3).

- **key_url**: https://willstraw.com/

#### Core ideas and theoretical positioning


**core_claim**

A 'scene' is a cultural space of cosmopolitan circulation — distinct from rooted 'community' — where people, places, technologies, and activities assemble around a musical or cultural object, enabling both geographic mobility and cultural memory.


**relation_to_attention_economy**

Scene theory precedes the attention economy discourse but provides diagnostic tools for understanding it. Scenes generate their own internal attention dynamics — what matters within a scene is determined by scene-specific values, not by external metrics. Straw's concept of the scene as 'effervescence' or 'excess of sociability' describes the social energy that attention economies try to capture and commodify.


**relation_to_commons**

Scenes are informal commons — shared cultural spaces governed by implicit social codes rather than formal rules. Scene participation is a commons practice: people contribute to and draw from a shared cultural resource (venues, styles, networks) without formal ownership. However, scenes can be enclosed by commercial interests (gentrification, corporate sponsorship, platform capture).


#### Architecture, data models, and implementation patterns


**architecture_pattern**

No computational architecture — scene analysis is a theoretical lens for interpreting cultural formations. The conceptual architecture is relational: scenes are networks of associations between people, places, genres, technologies, and practices.


**data_model**

Qualitative-relational. Scene analysis maps associations between heterogeneous elements (venues, musicians, audiences, media, styles) without imposing formal data structures. Straw's concept of 'logics of change' describes how these associations evolve over time.


**temporal_logic**

Cyclical and memorial. Scenes form, coalesce, peak, dissipate, and reform. Straw identifies cultural memory as a crucial scene-enabling mechanism — scenes depend on the circulation of accumulated knowledge about past cultural formations. This is distinctly past-tense temporal logic: scenes are retrospective constructions as much as present realities.


**absence_handling**

Not explicitly theorised, but implicitly present. Straw's concept of 'logics of change' implies that scenes emerge where previous cultural formations have dissipated — new scenes fill the absence left by old ones. The distinction between scene and community implies that absence of rootedness (cosmopolitan mobility) is itself a productive condition.


**scalability_model**

Multi-scale by nature. Scenes operate at local (a specific club or neighbourhood), translocal (genre-based networks across cities), and virtual (online fan communities) scales. Straw's later work extends scene analysis to urban affect more broadly.


#### Direct comparison against A(DAI)'s Garden Logic architecture


**layer_mapping**

sensing-loop. Scene analysis provides the theoretical justification for A(DAI)'s practice of mapping scenes as a distinct entity type, separate from practitioners, practices, or institutions. It belongs to the sensing layer because it offers a framework for detecting and interpreting cultural formations.


**intention_vs_attention**

Scene theory is diagnostically intention-oriented: it asks 'how do cultural formations come into being and dissipate?' rather than 'what is most popular or engaging right now?' Straw's analysis of scenes as spaces of circulation and memory is structural — it examines the conditions that enable cultural production rather than ranking outputs by engagement. However, scenes themselves generate internal attention dynamics that can be captured by external forces. A(DAI) should use scene analysis to detect the structural conditions of cultural production (intention) rather than to surface trending scenes (attention).


**coherence_vs_consensus**

Coherence. Scenes cohere without consensus — participants in a scene may have vastly different aesthetic commitments, political positions, and motivations. What holds a scene together is not agreement but co-presence: shared spaces, overlapping networks, and mutual awareness. This is precisely the kind of coherence A(DAI)'s graph should model — structural co-presence rather than ideological agreement.


**contestability**

Highly contestable. Scene boundaries are perpetually debated — who is 'in' a scene, what counts as part of it, when it began and ended. Straw's framework treats this contestability as constitutive, not problematic. Scenes are defined precisely by the ongoing negotiation of their boundaries.


**forkability**

Scenes fork naturally — subgenres emerge, factions split off, local scenes differentiate from translocal ones. This organic forking is the primary mechanism of cultural evolution in Straw's framework. However, there is no formal fork-merge protocol — scene differentiation is organic and irreversible. Provenance is maintained through cultural memory, not technical systems.


**tendency_axis_position**

openness: strongly open — scenes are porous by nature, anyone can participate. commons: informal cultural commons, always at risk of enclosure. spectacle vs infrastructure: scenes contain both spectacle (performances, events) and infrastructure (venues, distribution networks, social codes). individual vs distributed: distributed — scenes are collective formations, not individual achievements.


**what_adai_should_adopt**

The ontological distinction between scene and community as separate entity types in the graph. The concept of cultural memory as a scene-enabling mechanism — A(DAI)'s graph should track how scenes reference and build on past formations. The insight that scenes are spaces of circulation, not fixed locations — A(DAI) should model the flows and exchanges that constitute scenes, not just static membership. The temporal logic of scene formation, coalescence, and dissipation as a pattern A(DAI)'s tidal sensing should detect. The notion that scene boundaries are constitutively contested — A(DAI) should represent scene membership as probabilistic and debatable, not categorical.


**what_adai_should_refuse**

The purely retrospective orientation. Straw's analysis is strongest as historical/ethnographic interpretation and weakest as real-time detection. A(DAI) needs to detect scenes as they emerge, not just describe them after they have formed. Also refuse the purely qualitative methodology — while scene analysis must include qualitative judgment, A(DAI) needs computable proxies for scene formation (co-occurrence patterns, venue overlap, citation networks). Refuse the implicit privilege of music scenes as the paradigmatic case — A(DAI) must extend scene analysis to digital arts, computational art, bio-art, and other cultural domains with different dynamics.


#### Limitations, blind spots, and failure modes


**limits**

Scene analysis is descriptive, not predictive. It offers no tools for anticipating which scenes will form or which will matter. The framework is qualitative and interpretive, making it difficult to operationalise at scale. Scene analysis has been criticised for vagueness — 'scene' can mean almost anything, from a specific venue to an entire cultural movement. Straw himself has acknowledged that the concept risks becoming a 'comfortable blanket' that covers too much.


#### Governance models and consent architectures


**governance_model**

Academic. Scene analysis is a scholarly framework published in academic journals and developed within universities. No formal governance — the concept is intellectually open and freely used across disciplines.


#### Material and operational conditions


**composability**

Highly composable conceptually — scene analysis combines with urban studies, music studies, cultural sociology, geography, and media studies. No technical composability — it is a conceptual lens, not a module.


**liveness**

Historically significant and still active. Straw continues to publish and the 'scene' concept remains widely used in cultural studies. The concept has been extended to digital scenes, night-time economies, and urban cultural policy. Not abandoned but not rapidly evolving either.


**scale_of_operation**

Local to translocal. Scene analysis operates at the scale of venues, neighbourhoods, cities, and translocal genre networks. Not individual (it is inherently collective) and not planetary (it is inherently situated).


**temporality**

Cyclical, memorial, and emergent. Scenes form, coalesce, and dissipate in irregular cycles. Cultural memory is a key temporal mechanism — scenes carry the past into the present. The temporal logic is retrospective-constructive: scenes are partially constructed after the fact through narrative and memory.


**Uncertain fields:** who_is_excluded, failure_under_attention, consent_architecture, extraction_vector

---
