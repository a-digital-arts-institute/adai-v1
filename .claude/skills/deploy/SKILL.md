---
name: deploy
description: Deploy A(DAI) to Fly.io (app adai-basel) — build the image, then wipe the persistent /data volume and restart so the freshly-baked seed.db actually takes, then verify. Use when the user says "deploy", "ship it", "push to prod/fly", or "release".
---

# Deploy A(DAI) to Fly.io

Ship the current working tree's canon + code to production (`adai-basel.fly.dev`).
This is the procedure from `CLAUDE.md` § "Deploying" + "Deploy gotchas", codified.

## ⚠️ The one thing you must not skip

`/data` is a **persistent Fly volume**. `flyctl deploy` ships a new image whose
builder bakes a fresh `/app/seed.db`, but `entrypoint.sh` only copies it to
`/data/adai.db` **when no DB is already there**. So a deploy *alone* keeps
serving the OLD database. You MUST wipe `/data/adai.db*` and restart, or the
new seed data silently never goes live. Always verify `/api/stats` at the end.

## Pre-flight (do this, then ask the user to confirm — it's production)

```bash
export PATH="$HOME/.fly/bin:$PATH"      # flyctl installs here; may already be on PATH
flyctl auth whoami                       # must be authed (g@hasten.gg). If not: tell the user to run `flyctl auth login` (interactive browser) — you can't do it headless.
git status --short && git branch --show-current   # what's about to ship (deploy builds from the WORKING TREE, not a branch on origin)
seed/_build/.venv/bin/python3 seed/_build/validate_seed.py --canon   # canon must be 0 errors / 0 warnings before shipping
curl -s https://adai-basel.fly.dev/api/stats; echo   # current LIVE counts (the "before")
```

Show the user the before-counts and the local canon counts, and **confirm**
before proceeding — this replaces what's live. Note any uncommitted seed/*.json
(you usually want it committed first, but deploy builds the tree as-is).

## Deploy

```bash
export PATH="$HOME/.fly/bin:$PATH"
FLY_REMOTE_BUILDER_REGION=iad flyctl deploy --app adai-basel
```

- Long (~3–6 min): the builder runs `npm run seed:consolidated` (re-bakes
  `seed.db` from `seed/*.json` + the committed `embeddings.{bin,json}` sidecars,
  chains `embed:derive`). Watch the build log echo the node/edge counts — they
  should match your local canon (sanity check the data is right BEFORE it ships).
- Run it backgrounded (`run_in_background`) and monitor; it's slow.
- No `GEMINI_API_KEY` needed at build (embed:derive is pure vector math on the
  committed embeddings). If the sidecars are missing/stale the build still
  succeeds but ships an embedding-less DB — that's why validate + the sidecars
  matter.

## The volume-wipe + restart (THE GOTCHA)

```bash
export PATH="$HOME/.fly/bin:$PATH"
MID=$(flyctl machine list --app adai-basel --json | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['id'])")
echo "machine: $MID"
# wipe the stale DB on the volume (entrypoint re-copies the baked one on restart)
flyctl ssh console --app adai-basel -C "sh -c 'rm -f /data/adai.db /data/adai.db-shm /data/adai.db-wal'"
flyctl machine restart "$MID" --app adai-basel
```

- Look up the machine id dynamically (don't hardcode — it changes). There's
  normally one `app` machine in `fra`.
- `fly.toml` has `auto_stop_machines = 'stop'`, so the machine may be stopped;
  a `curl https://adai-basel.fly.dev/api/stats` first wakes it, and the `ssh`
  itself starts it. The `Metrics token unavailable` warning on flyctl commands
  is benign — ignore it.

## Verify (don't declare done until this passes)

```bash
for i in $(seq 1 20); do
  curl -s --max-time 8 https://adai-basel.fly.dev/api/stats; echo
  sleep 3
done
```

Confirm `total_nodes` / `curated_edges` now match the local canon (NOT the
old "before" counts). Spot-check a representative page returns 200
(e.g. `/concept/abstract`, `/field`, a known practitioner). If `/api/stats`
still shows the old counts, the volume wipe didn't take — re-run the wipe+restart.

## Notes

- `flyctl logs --app adai-basel --no-tail | tail -30` to debug a crash-loop
  (a common cause: a schema migration that adds a column to an existing table —
  see CLAUDE.md § "Deploy gotchas"; the volume wipe also resolves those since
  the baked DB has the new schema).
- This does NOT push git. Commit/push separately if intended.
- Embeddings/UMAP on prod are refreshed nightly by the `embed-derive-daily`
  GitHub Action; a deploy ships whatever sidecars are committed.
