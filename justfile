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
deploy:
    FLY_REMOTE_BUILDER_REGION=iad flyctl deploy

# DANGER: rm /data/adai.db on prod + restart so entrypoint copies fresh seed.
# All local-only rows (contributor_tokens, intake_queue, archivist_sessions,
# rejected_ai_suggestions, …) are lost — follow with `just restore-tokens`.
# Prompts for 'yes' before doing anything destructive.
[doc("DANGER: rm /data/adai.db on prod + restart (entrypoint copies fresh seed). Prompts for confirmation.")]
nuke-volume: warm
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
