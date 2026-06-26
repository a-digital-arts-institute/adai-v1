---
name: deploy
description: Deploy A(DAI) to Fly.io (app adai-basel) — build the image, ship it, verify. The /data volume is NEVER wiped (canon frozen, owner decision 2026-06-06): live practitioner contributions exist only on the volume. Use when the user says "deploy", "ship it", "push to prod/fly", or "release".
---

# Deploy A(DAI) to Fly.io

Ship the current working tree's code to production (`adai-basel.fly.dev`).
This is the procedure from `CLAUDE.md` § "Deploying" + "Deploy gotchas", codified.

> **⚠️ THE LIVE `/data/adai.db` IS THE ONLY SOURCE OF TRUTH. NEVER wipe it.**
> The genesis seed pipeline was **RETIRED June 2026** — the image ships **no
> `seed.db`** and the builder does **no reseed**. A deploy is a **code-only
> event**: the new server + static assets ship, the `/data` volume (and its DB)
> survives, `entrypoint.sh` uses the existing DB as-is. There is no
> `nuke-volume` / `redeploy-fresh` recipe anymore. Disaster recovery is a
> **Litestream restore** from the private R2 replica (automatic on a fresh host),
> never a reseed.

The whole thing is `just deploy`. The steps below are the same sequence
spelled out, plus verification.

## Pre-flight

```bash
export PATH="$HOME/.fly/bin:$PATH"      # flyctl installs here; may already be on PATH
flyctl auth whoami                       # must be authed. If not: tell the user to run `flyctl auth login` (interactive browser) — you can't do it headless.
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
- Builds the server only (no seed bake, no `seed.db` shipped) — ~2–4 min.
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
  the volume survived. If counts DROPPED (or the app 500s on an empty DB),
  something recreated the volume — stop, tell the user, reach for the Litestream
  replica (there is no baked seed to fall back to).
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
  Action, against the live DB. A deploy ships no embeddings — there's no seed
  bake anymore.
- New data reaches the live DB only through the governed write path
  (`/api/v1/*`) / curator `/review`. There is no reseed-from-file.

## Appendix — disaster recovery ONLY (requires explicit owner approval)

Never run any of this as part of a routine deploy. The genesis seed is gone, so
the ONLY recovery path is the Litestream replica.

1. **Litestream replica** — it has every live write and is the only source of
   truth. The R2 backup (`R2_BACKUP_*` secrets, see commit 7d73930) is what
   `entrypoint.sh` restores from automatically when `/data/adai.db` is missing.
   To force a manual restore: SSH in, stop the process, `litestream restore`
   from `/etc/litestream.yml`, restart. After any volume loss, re-insert the
   operator tokens with `just restore-tokens` (from the gitignored
   `.tokens.json`; idempotent, transactional) — those are local-only and not in
   the replica's CRR tables.
2. If the app has no `data` volume at all (full teardown):
   `flyctl volumes create data --app adai-basel --region fra --size 1 --yes`,
   then redeploy; the entrypoint restores the live DB from the replica on boot.
   If the replica is ALSO gone, there is no genesis fallback — the DB is
   unrecoverable by design (live is the only truth). Escalate to the owner.
