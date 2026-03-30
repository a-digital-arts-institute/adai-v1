---
name: agent-native-builder
description: Reference principles for Iri when building A(DAI) with Claude Code or in conversation. Use this when designing new pipeline features, auditing existing scripts, planning the query layer, or making architecture decisions. Synthesised from Every.to's Agent-Native Architectures guide, interpreted for A(DAI)'s specific context.
---

# Building A(DAI) Agent-Native: Builder Reference

When you're building A(DAI), these principles are the checkpoint layer. Run them before writing new scripts, before adding intake channels, before designing the query interface.

---

## The Five Questions (run these first)

Before any build decision:

1. **Parity:** Can the agent achieve this outcome, or only the human through the UI?
2. **Granularity:** Is the judgment in a skills file / prompt, or hardcoded in Python?
3. **Context:** Does the pipeline know its own current state before it runs?
4. **Frontier:** Does the system log what it *can't* classify, not just what it can?
5. **Completion:** Does every pipeline run exit with an explicit status — not a heuristic?

---

## What A(DAI) is doing differently from standard agent-native

Standard agent-native surfaces *latent user demand* — what users ask agents to do reveals what features to build.

**A(DAI) surfaces latent field structure** — what the field produces that the system can't yet classify reveals what the field is becoming. Unlinkable signals are the editorial agenda, not errors. The concept linker's failures are as important as its successes.

Hold this when you're tempted to treat pipeline errors as pure infrastructure problems. Some of them are signals about where digital arts discourse is ahead of your model.

---

## CRUD completeness audit

Run this whenever you add a new entity type. Gaps are bugs.

| Entity | Create | Read | Update | Delete |
|---|---|---|---|---|
| Signal | inbox intake | signal_processor | update metadata? | ? |
| Concept | concept_linker | concepts_cache | strengthen/merge? | ? |
| Practitioner | profiling skill | /practitioners dir | update profile? | ? |
| Thread | ? | ? | ? | ? |

The Raindrop gap is a parity failure at Create/Signal. Fix intake before adding capabilities.

---

## Anti-patterns to check before shipping

**Logic in Python instead of prompts**
If `concept_linker.py` is making linking decisions via code (string matching, similarity thresholds), that's judgment in the wrong place. It should pass signal + concept list to Claude with skills injected, and let the agent decide.

**Skills files not injected**
`/skills/tendency-vocabulary.md`, `cla-extraction.md`, etc. must be *read and passed as context* in Claude API calls — not just exist in the repo. If they're not injected, they're documentation, not skills.

**Context starvation**
Pipeline runs should know: what concepts exist, what was processed last run, what the current frontier signals are. If a run starts cold, it's working blind.

**Static ADAI_CONTEXT.md**
The context file describes the system but shouldn't be frozen. Add a `PIPELINE_STATE.md` that gets auto-written at the end of every nightly run with current counts, frontier signals, and pipeline health.

**Query layer as lookup**
The `/query` page should reason, not retrieve. When someone asks a question, the agent should loop — retrieve relevant concepts, identify gaps, pull related signals, synthesise — until it has an answer. Not: run a semantic search and return top matches.

**Silent failures**
Every signal should exit the pipeline with an explicit status: `processed` | `concept_linked` | `frontier` | `error`. Log the frontier signals somewhere visible.

---

## The context.md pattern for A(DAI)

`ADAI_CONTEXT.md` = what A(DAI) is, the vocabulary, the schema, the editorial framework. Stable.

`PIPELINE_STATE.md` = what exists right now, what ran last, what the system couldn't classify. Updated nightly by GitHub Actions.

Both get injected into pipeline calls. The query agent reads both before answering anything.

---

## The test that tells you if it's working

Ask the system: *"Identify signals from the last 30 days that suggest an emerging tendency not yet in the vocabulary. Draft a candidate tendency name and definition."*

This wasn't explicitly built. Can it do it?

If yes — agent-native. If no — either the query layer is too constrained, or context injection is incomplete, or the frontier signals aren't being logged.
