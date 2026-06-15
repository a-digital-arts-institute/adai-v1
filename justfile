# A(DAI) — ops recipes.
#
# Mostly thin wrappers around `flyctl`, `npm`, and `curl`, plus the
# documented "wipe-and-reseed" dance that we run every time a new seed
# is baked into the image. The point is to keep the order of those
# steps (deploy → nuke volume → wait → restore tokens) honest, so we
# never deploy fresh seed data and then forget to put the admin tokens
# back. Token restore is idempotent — running it when it's not needed
# is a no-op.
#
# Run `just` (no args) to see the recipe list.
#
# Prereqs:  just (brew install just), flyctl, jq, curl. The token
# recipes also need `.tokens.json` (gitignored — see .tokens.json.example).

app         := "adai-basel"
hostname    := "https://" + app + ".fly.dev"
db_path     := "/data/adai.db"
tokens_file := ".tokens.json"

# Show available recipes.
default:
    @just --list

# --- local dev ---------------------------------------------------------

# Re-seed local DB from seed/*.json + start dev server (canonical first-run).
dev:
    rm -f adai.db adai.db-shm adai.db-wal
    npm run seed:consolidated
    npm run dev

# --- Fly: low-level building blocks ------------------------------------

# Wake the idle machine (fly.toml auto_stop_machines='stop'; SSH alone won't).
warm:
    @curl -fs {{hostname}}/api/stats >/dev/null && echo "warm"

# Tail recent logs (last 20 lines, non-streaming).
logs:
    flyctl logs --app {{app}} --no-tail | tail -20

# Open an interactive SSH shell on the machine.
ssh: warm
    flyctl ssh console --app {{app}}

# Wait up to 30s for /api/stats to come back healthy after a restart.
wait-healthy:
    @echo "waiting for {{hostname}}/api/stats..."
    @for i in 1 2 3 4 5 6 7 8 9 10; do \
        if curl -fs {{hostname}}/api/stats >/dev/null; then echo "healthy"; exit 0; fi; \
        sleep 3; \
    done; \
    echo "not healthy after 30s" >&2; exit 1

# --- Fly: deploy / wipe ------------------------------------------------

# Build + deploy via the IAD remote builder (Depot times out for us).
# --ha=false: flyctl's HA default silently creates a SECOND machine + volume
# (= two divergent DBs behind one hostname, observed June 2026). Never omit it.
deploy:
    FLY_REMOTE_BUILDER_REGION=iad flyctl deploy --ha=false

# ⚠️ CANON FROZEN (owner decision, 2026-06-06): we do NOT wipe /data anymore.
# The live DB carries practitioner contributions (aiio's protocol-art session
# onward) that exist nowhere in seed/*.json — a wipe destroys them for good.
# Deploy code with `just deploy` only. This recipe is kept strictly for
# disaster recovery (prefer the Litestream replica even then).
#
# DANGER: rm /data/adai.db on prod + restart so entrypoint copies fresh seed.
# All local-only rows (contributor_tokens, intake_queue, archivist_sessions,
# rejected_ai_suggestions, …) are lost — follow with `just restore-tokens`.
# Prompts for 'yes' before doing anything destructive.
[doc("RETIRED — canon frozen 2026-06-06, live contributions live only on the volume. Disaster recovery only.")]
nuke-volume: warm
    @echo "⚠️  CANON FROZEN (2026-06-06): the live DB holds practitioner contributions that exist nowhere else."
    @echo "    This wipe destroys them permanently. Disaster recovery only — prefer the Litestream replica."
    @read -p "About to delete {{db_path}} on prod. Type 'yes' to continue: " ans && [ "$ans" = "yes" ] || { echo "aborted"; exit 1; }
    flyctl ssh console --app {{app}} -C "sh -c 'rm -f {{db_path}} {{db_path}}-shm {{db_path}}-wal && echo wiped'"
    @just _restart-machine

# Internal: restart the (single) fra machine by ID.
_restart-machine:
    @machine=$(flyctl machine list --app {{app}} --json | jq -r '.[0].id'); \
        echo "restarting machine $machine"; \
        flyctl machine restart "$machine" --app {{app}}

# Internal: fail fast if .tokens.json is missing.
_check-tokens-file:
    @test -f {{tokens_file}} || { echo "missing {{tokens_file}} — refusing to redeploy without it (would orphan auth). See {{tokens_file}}.example." >&2; exit 1; }

# Full dance: check tokens → deploy → wipe volume → wait → restore tokens.
# ⚠️ RETIRED with the canon freeze (2026-06-06) — see nuke-volume above.
redeploy-fresh: _check-tokens-file deploy nuke-volume wait-healthy restore-tokens

# --- Fly: tokens -------------------------------------------------------

# List active tokens on prod.
tokens-list: warm
    flyctl ssh console --app {{app}} -C "node /app/dist/cli/revoke-token.js --list"

# Restore operator bearer tokens from {{tokens_file}} (idempotent).
# SFTPs the file to /tmp on the VM, runs the CLI, deletes the file. The
# CLI is wrapped in a transaction so a partial failure rolls back cleanly.
[doc("Restore operator bearer tokens from .tokens.json into prod (idempotent).")]
restore-tokens: warm _check-tokens-file
    @echo "[restore-tokens] uploading {{tokens_file}} → /tmp/.adai-tokens.json"
    @echo "put {{tokens_file}} /tmp/.adai-tokens.json" | flyctl ssh sftp shell --app {{app}}
    flyctl ssh console --app {{app}} -C "sh -c 'node /app/dist/cli/restore-tokens.js --from /tmp/.adai-tokens.json; rc=$?; rm -f /tmp/.adai-tokens.json; exit $rc'"

# Dry-run the restore: validates {{tokens_file}} against prod, rolls back.
restore-tokens-dry: warm _check-tokens-file
    @echo "put {{tokens_file}} /tmp/.adai-tokens.json" | flyctl ssh sftp shell --app {{app}}
    flyctl ssh console --app {{app}} -C "sh -c 'node /app/dist/cli/restore-tokens.js --from /tmp/.adai-tokens.json --dry-run; rc=$?; rm -f /tmp/.adai-tokens.json; exit $rc'"

# --- Fly: R2 image janitor (orphan cull) -------------------------------
#
# cull_orphans.py reconciles the R2 bucket against canon references and
# reports/removes images nothing points at. Under the canon freeze,
# contributor-API uploads reference cdn_image_url only in the LIVE DB
# (/data/adai.db), never in seed/*.json — so the bucket MUST be diffed
# against the live DB, not just the committed canon, or a --delete would
# destroy live-referenced images. These recipes pull the live DB (incl.
# its WAL, so recent writes count) to a tmp file, run the cull with --db,
# then delete the tmp copy. (For a torn-free snapshot you can substitute a
# `litestream restore`d copy as the --db source.)

# Internal: pull /data/adai.db (+ -wal) off the volume → /tmp/adai-cull.db.
_pull-live-db: warm
    @echo "[cull] pulling {{db_path}} (+ WAL) → /tmp/adai-cull.db"
    @rm -f /tmp/adai-cull.db /tmp/adai-cull.db-wal /tmp/adai-cull.db-shm
    @echo "get {{db_path}} /tmp/adai-cull.db" | flyctl ssh sftp shell --app {{app}}
    @echo "get {{db_path}}-wal /tmp/adai-cull.db-wal" | flyctl ssh sftp shell --app {{app}} || echo "[cull] no -wal (checkpointed) — ok"

# Dry-run: report orphan R2 images against LIVE references (reads only).
[doc("Report orphan R2 images, diffed against the live prod DB (read-only).")]
cull-orphans-prod: _pull-live-db
    seed/_build/.venv/bin/python3 seed/_build/cull_orphans.py --db /tmp/adai-cull.db
    @rm -f /tmp/adai-cull.db /tmp/adai-cull.db-wal /tmp/adai-cull.db-shm

# DESTRUCTIVE: delete orphan R2 images, diffed against the live prod DB.
[doc("Delete orphan R2 images (diffed against the live prod DB). Destructive.")]
cull-orphans-prod-delete: _pull-live-db
    seed/_build/.venv/bin/python3 seed/_build/cull_orphans.py --db /tmp/adai-cull.db --delete
    @rm -f /tmp/adai-cull.db /tmp/adai-cull.db-wal /tmp/adai-cull.db-shm
