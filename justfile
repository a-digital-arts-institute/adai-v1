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

# Start the dev server against an EXISTING ./adai.db. The genesis seed was
# retired June 2026 — there is no reseed-from-JSON. To get a local DB, restore
# the live one from the Litestream replica, or pull a copy off prod:
#   echo "get //data/adai.db ./adai.db" | flyctl ssh sftp shell --app adai-basel
dev:
    @test -f adai.db || { echo "no ./adai.db — pull one from prod or restore from Litestream (see recipe comment)"; exit 1; }
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

# --- Fly: deploy -------------------------------------------------------

# Build + deploy via the IAD remote builder (Depot times out for us).
# --ha=false: flyctl's HA default silently creates a SECOND machine + volume
# (= two divergent DBs behind one hostname, observed June 2026). Never omit it.
#
# Deploy is CODE-ONLY and never touches data: the /data volume persists across
# deploys and the live DB is the only source of truth. The genesis seed +
# volume-wipe ("redeploy-fresh") dance was RETIRED June 2026 — there is no
# reseed. Disaster recovery is a Litestream restore (entrypoint does it
# automatically on a fresh host), not a wipe.
deploy:
    FLY_REMOTE_BUILDER_REGION=iad flyctl deploy --ha=false

# Internal: fail fast if .tokens.json is missing (used by restore-tokens).
_check-tokens-file:
    @test -f {{tokens_file}} || { echo "missing {{tokens_file}} — see {{tokens_file}}.example." >&2; exit 1; }

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
# Shared by the cull-orphans and shrink-oversized recipes (both diff R2 against
# the LIVE references, which only exist on the volume under the canon freeze).
_pull-live-db: warm
    @echo "[pull-live-db] pulling {{db_path}} (+ WAL) → /tmp/adai-cull.db"
    @rm -f /tmp/adai-cull.db /tmp/adai-cull.db-wal /tmp/adai-cull.db-shm
    @echo "get {{db_path}} /tmp/adai-cull.db" | flyctl ssh sftp shell --app {{app}}
    @echo "get {{db_path}}-wal /tmp/adai-cull.db-wal" | flyctl ssh sftp shell --app {{app}} || echo "[cull] no -wal (checkpointed) — ok"

# Dry-run: report orphan R2 images against the LIVE prod DB (reads only).
# The running DB is the only source of truth — an object is orphan iff no live
# node references it (genesis seed retired June 2026; no JSON is consulted).
[doc("Report orphan R2 images, diffed against the live prod DB (read-only).")]
cull-orphans-prod: _pull-live-db
    seed/_build/.venv/bin/python3 seed/_build/cull_orphans.py --db /tmp/adai-cull.db
    @rm -f /tmp/adai-cull.db /tmp/adai-cull.db-wal /tmp/adai-cull.db-shm

# DESTRUCTIVE: delete orphan R2 images, diffed against the live prod DB.
[doc("Delete orphan R2 images (diffed against the live prod DB). Destructive.")]
cull-orphans-prod-delete: _pull-live-db
    seed/_build/.venv/bin/python3 seed/_build/cull_orphans.py --db /tmp/adai-cull.db --delete
    @rm -f /tmp/adai-cull.db /tmp/adai-cull.db-wal /tmp/adai-cull.db-shm

# --- Fly: R2 oversized-image shrinker ----------------------------------
#
# shrink_oversized.py finds R2 images over a size threshold (default 5 MiB)
# that are still referenced by a LIVE node, downsizes them (longest edge
# <= 2048px, ANIMATION PRESERVED, format kept) to a NEW content-addressed key,
# uploads them, and emits a patch repointing each node's cdn_image_url.
#
# Because seed/*.json is frozen, the repoint lands in the LIVE prod DB only,
# via dist/cli/apply-image-patch.js over SSH (the only thing that writes the
# DB; it never re-embeds — the image is visually identical). The old oversized
# objects become orphans the instant the DB is repointed — reclaim them with
# `just cull-orphans-prod-delete` afterwards. Same live-DB-pull discipline as
# the cull recipes (the references only exist on the volume).
#
# ⚠️ The apply path needs dist/cli/apply-image-patch.js ON THE MACHINE — run
#    `just deploy` first if you've just added or changed that CLI.

# Dry-run: report oversized referenced images (list + DB scan only, no downloads).
[doc("Report oversized R2 images referenced by the live prod DB (read-only).")]
shrink-oversized-prod: _pull-live-db
    seed/_build/.venv/bin/python3 seed/_build/shrink_oversized.py --db /tmp/adai-cull.db
    @rm -f /tmp/adai-cull.db /tmp/adai-cull.db-wal /tmp/adai-cull.db-shm

# Measure: download+resize a sample, report REAL savings (no upload, no DB write).
[doc("Measure real savings on a sample of oversized images (no writes).")]
shrink-oversized-prod-measure: _pull-live-db
    seed/_build/.venv/bin/python3 seed/_build/shrink_oversized.py --db /tmp/adai-cull.db --measure
    @rm -f /tmp/adai-cull.db /tmp/adai-cull.db-wal /tmp/adai-cull.db-shm

# DESTRUCTIVE: resize+upload new objects, then repoint cdn_image_url in the live prod DB.
[doc("Resize oversized images → new R2 keys + repoint cdn_image_url in the live prod DB.")]
shrink-oversized-prod-apply: _pull-live-db
    seed/_build/.venv/bin/python3 seed/_build/shrink_oversized.py --db /tmp/adai-cull.db --apply --out /tmp/adai-shrink-patch.json
    @test -s /tmp/adai-shrink-patch.json || { echo "[shrink] no patch produced — nothing to apply"; rm -f /tmp/adai-cull.db /tmp/adai-cull.db-wal /tmp/adai-cull.db-shm; exit 0; }
    @echo "[shrink] uploading patch → prod /tmp/.adai-shrink-patch.json"
    @echo "put /tmp/adai-shrink-patch.json /tmp/.adai-shrink-patch.json" | flyctl ssh sftp shell --app {{app}}
    flyctl ssh console --app {{app}} -C "sh -c 'node /app/dist/cli/apply-image-patch.js --from /tmp/.adai-shrink-patch.json; rm -f /tmp/.adai-shrink-patch.json'"
    @rm -f /tmp/adai-cull.db /tmp/adai-cull.db-wal /tmp/adai-cull.db-shm /tmp/adai-shrink-patch.json
    @echo "[shrink] done — reclaim the now-orphaned originals with: just cull-orphans-prod-delete"
