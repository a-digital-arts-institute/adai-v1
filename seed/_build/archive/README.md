# seed/_build/archive/ — frozen history

Code and data preserved for git-archaeology and provenance. Nothing in here
is executed by the live pipeline or referenced by any live producer.

- **`migrations/`** — one-shot cleanup / enrichment scripts from earlier
  passes. Each script mutated `seed/*.json` directly, which the producer
  model now forbids. Kept so the provenance of historical canon rows is
  traceable to the script that emitted them.
- **`legacy/`** — gatherers superseded by newer versions. Kept so prior
  fetch logic is reproducible; not on the live pipeline.
- **`runs/`** — dated raw output from prior gatherer / merge runs. Kept
  so canon decisions can be re-derived against the exact upstream
  snapshot of the time.

If you're a new contributor / Claude, **do not run anything from here.**
The live producers live one directory up. See `../README.md` and
`../PRODUCER_CONTRACT.md` for the current pipeline.
