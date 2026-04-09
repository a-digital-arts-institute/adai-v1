---
name: agent-native-builder
description: Checkpoint principles for building A(DAI). Run these before designing pipeline features, adding intake channels, or making architecture decisions.
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
