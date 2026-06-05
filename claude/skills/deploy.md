---
name: deploy
description: Deploy A(DAI) to Fly.io (app adai-basel) — build the image, wipe the persistent /data volume and restart so the freshly-baked seed.db actually takes (a genesis event), restore the operator tokens from .tokens.json, then verify. Use when the user says "deploy", "ship it", "push to prod/fly", or "release".
---

# Deploy A(DAI) to Fly.io

Ship the current working tree's canon + code to production (`adai-basel.fly.dev`).
This is the procedure from `CLAUDE.md` § "Deploying" + "Deploy gotchas", codified.

This is a **genesis event**: the volume wipe deliberately destroys ALL runtime
state (`intake_queue`, runtime signals, `rejected_ai_suggestions`, …). The one
thing we carry across is the operator **bearer tokens**, restored from the
local `.tokens.json` at the end — never skip that step or the team's API
credentials die with the wipe.

> The whole dance is also wrapped as `just redeploy-fresh`
> (check tokens → deploy → nuke-volume → wait-healthy → restore-tokens).
> If `just` is available, prefer it; the steps below are the same sequence
> spelled out.

## ⚠️ The two things you must not skip

1. `/data` is a **persistent Fly volume**. `flyctl deploy` ships a new image
   whose builder bakes a fresh `/app/seed.db`, but `entrypoint.sh` only copies
   it to `/data/adai.db` **when no DB is already there**. So a deploy *alone*
   keeps serving the OLD database. You MUST wipe `/data/adai.db*` and restart,
   or the new seed data silently never goes live. Always verify `/api/stats`
   at the end.
2. The wipe kills `contributor_tokens` (local-only, never in the baked seed).
   You MUST restore them from `.tokens.json` afterwards (idempotent), or every
   issued token 401s until re-minted and redistributed by hand.

## Pre-flight (do this, then ask the user to confirm — it's production)

```bash
export PATH="$HOME/.fly/bin:$PATH"      # flyctl installs here; may already be on PATH
flyctl auth whoami                       # must be authed (g@hasten.gg). If not: tell the user to run `flyctl auth login` (interactive browser) — you can't do it headless.
test -f .tokens.json || echo "MISSING .tokens.json — STOP"   # refuse to proceed without it (the wipe would orphan auth; see .tokens.json.example)
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

## Restore tokens (genesis killed them — put them back)

The fresh DB has zero `contributor_tokens` rows. Re-insert the team's raw
tokens from the local gitignored `.tokens.json` (same flow as
`just restore-tokens`: SFTP to `/tmp`, run the CLI, delete the file in the
same SSH session — the raw tokens never rest on the VM):

```bash
export PATH="$HOME/.fly/bin:$PATH"
curl -s https://adai-basel.fly.dev/api/stats >/dev/null   # wake the machine first
echo "put .tokens.json /tmp/.adai-tokens.json" | flyctl ssh sftp shell --app adai-basel
flyctl ssh console --app adai-basel -C "sh -c 'node /app/dist/cli/restore-tokens.js --from /tmp/.adai-tokens.json; rc=\$?; rm -f /tmp/.adai-tokens.json; exit \$rc'"
```

- Idempotent (matched by `sha256(raw)`) and transactional — re-running is a
  no-op, a partial failure rolls back. Safe to retry.
- Expect one `restored` line per token (currently 4). A `skipped — already
  present` is fine; an error means the tokens file and prod disagree
  (re-bound contributor / changed scope) — stop and show the user.
- Verify with `flyctl ssh console --app adai-basel -C "node /app/dist/cli/revoke-token.js --list"`
  (or `just tokens-list`): every `.tokens.json` entry should show active.

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

- **Litestream interplay** (once the R2 replication ships and `R2_BACKUP_*`
  secrets are set): `entrypoint.sh` prefers restoring `/data/adai.db` from the
  R2 replica over genesis-seeding from the baked `seed.db`. A plain volume
  wipe then resurrects the OLD database instead of shipping the new canon —
  the genesis path needs the replica out of the way (or an explicit
  genesis override) for this procedure to keep working. If `/api/stats`
  shows the old counts after a wipe+restart and the logs say
  `Restored live DB from R2 replica`, that's what happened.
- `flyctl logs --app adai-basel --no-tail | tail -30` to debug a crash-loop
  (a common cause: a schema migration that adds a column to an existing table —
  see CLAUDE.md § "Deploy gotchas"; the volume wipe also resolves those since
  the baked DB has the new schema).
- This does NOT push git. Commit/push separately if intended.
- Embeddings/UMAP on prod are refreshed nightly by the `embed-derive-daily`
  GitHub Action; a deploy ships whatever sidecars are committed.
