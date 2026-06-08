---
name: deploy
description: Deploy A(DAI) to Fly.io (app adai-basel) — build the image, ship it, verify. The /data volume is NEVER wiped (canon frozen, owner decision 2026-06-06): live practitioner contributions exist only on the volume. Use when the user says "deploy", "ship it", "push to prod/fly", or "release".
---

# Deploy A(DAI) to Fly.io

Ship the current working tree's code to production (`adai-basel.fly.dev`).
This is the procedure from `CLAUDE.md` § "Deploying" + "Deploy gotchas", codified.

> **⚠️ CANON FROZEN (owner decision, 2026-06-06). NEVER wipe `/data`.**
> The live DB carries practitioner contributions made through the contributor
> API (aiio's protocol-art session onward) that exist **nowhere in
> `seed/*.json`** — a volume wipe destroys them permanently. A deploy is now a
> **code-only event**: the image ships the new server + static assets, the
> volume (and its DB) survives, `entrypoint.sh` never overwrites an existing
> DB. The old "genesis event" doctrine (wipe → restart → restore tokens) is
> **retired from routine use** — it survives only as the disaster-recovery
> appendix at the bottom, and even then the Litestream R2 replica (which has
> the live writes) is preferred over the baked seed.

The whole thing is `just deploy`. The steps below are the same sequence
spelled out, plus verification.

## Pre-flight

```bash
export PATH="$HOME/.fly/bin:$PATH"      # flyctl installs here; may already be on PATH
flyctl auth whoami                       # must be authed (g@hasten.gg). If not: tell the user to run `flyctl auth login` (interactive browser) — you can't do it headless.
git status --short && git branch --show-current   # what's about to ship (deploy builds from the WORKING TREE, not a branch on origin)
curl -s https://adai-basel.fly.dev/api/stats; echo   # current LIVE counts — these must be IDENTICAL after the deploy (the volume survives)
```

Confirm with the user before proceeding — it's production. Usually you want
to deploy a just-merged `main` (checkout + pull first), not a dirty tree.

## Deploy

```bash
export PATH="$HOME/.fly/bin:$PATH"
FLY_REMOTE_BUILDER_REGION=iad flyctl deploy --app adai-basel --ha=false
# == `just deploy`
```

- **`--ha=false` is mandatory.** Without it flyctl defaults to HA and silently
  creates a SECOND machine with its own fresh volume — two divergent DBs behind
  one hostname (observed June 2026: runtime writes round-robin between them and
  token restores only land on one). One machine, one volume, always.
- Long (~3–6 min): the builder still runs `npm run seed:consolidated` and bakes
  `/app/seed.db` into the image. **That baked DB is inert on prod** — the
  entrypoint sees `/data/adai.db` already exists and leaves it alone. It only
  matters for a from-scratch machine (disaster recovery).
- Run it backgrounded (`run_in_background`) and monitor; it's slow.
- The machine restarts on the new image; `/data` (DB, tokens, intake queue)
  carries over untouched.

## Verify (don't declare done until this passes)

```bash
for i in $(seq 1 10); do
  curl -s --max-time 8 https://adai-basel.fly.dev/api/stats; echo
  sleep 3
done
```

- `total_nodes` / `total_edges` must match the **pre-deploy** counts exactly —
  the volume survived. If counts DROPPED to the baked-seed numbers, something
  recreated the volume — stop, tell the user, reach for the Litestream replica.
- Spot-check what you shipped: a static-asset change → confirm the new
  cache-bust versions serve (`curl -s https://adai-basel.fly.dev/field | grep 'v='`);
  a server change → hit the endpoint it touched. `/field`, `/graph`, and a
  known practitioner page should all 200.
- A contributor token should still work: `curl -s -H "Authorization: Bearer …"
  https://adai-basel.fly.dev/api/v1/whoami` (tokens live on the volume — they
  survive; no restore step exists anymore).
- `flyctl logs --app adai-basel --no-tail | tail -30` to debug a crash-loop.
  A common cause: a schema migration adding a column to an existing table —
  `initDb` replays `db.sql` on boot, fine for `CREATE TABLE/INDEX IF NOT
  EXISTS`, fatal for `ALTER`-shaped changes. Wrap column adds in the
  idempotent try/catch pattern from `src/db.ts` (the `intake_queue.kind`
  example) — **blowing away the volume is not an option under the freeze**.

## Notes

- This does NOT push git. Commit/push separately if intended.
- Embeddings on prod refresh nightly via the `embed-derive-daily` GitHub
  Action; a deploy ships whatever sidecars are committed (they bake into the
  inert seed.db only).
- Seed-data changes (`seed/*.json`) do NOT reach prod through a deploy
  anymore. They land in the baked (inert) seed.db only. Until the CRDT-patch
  transport from the roadmap exists, new canon reaches the live DB through
  the governed write path (`/api/v1/*`) or an explicitly-approved
  disaster-recovery reseed (below).

## Appendix — disaster recovery ONLY (requires explicit owner approval)

Never run any of this as part of a routine deploy. If the live DB is lost or
corrupted:

1. **Prefer the Litestream replica** — it has every live write. The R2 backup
   (`R2_BACKUP_*` secrets, see commit 7d73930) is the source of truth;
   `entrypoint.sh` restores from it when `/data/adai.db` is missing.
2. **Only if the replica is also gone**: the old genesis dance re-seeds from
   the baked image — `just nuke-volume` (interactive confirm) → restart →
   `just restore-tokens` (re-inserts team bearer tokens from the gitignored
   `.tokens.json`; idempotent, transactional). This LOSES all live writes
   since the seed was baked: contributor nodes/edges/signals, intake queue,
   `rejected_ai_suggestions` — everything local-only or written post-freeze.
3. If the app has no `data` volume at all (full teardown):
   `flyctl volumes create data --app adai-basel --region fra --size 1 --yes`,
   then redeploy from the already-pushed image.
