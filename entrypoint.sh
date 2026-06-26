#!/bin/sh
set -e

DB_PATH="/data/adai.db"
LITESTREAM_CONFIG="/etc/litestream.yml"
export DB_PATH
export PORT=8080

echo "A(DAI) server starting..."

cd /app

# True only when the PRIVATE backup-bucket secrets Litestream needs are all
# present. Deliberately gated on R2_BACKUP_* (NOT the public image-bucket creds)
# so replication can never accidentally target the world-readable image bucket.
# Until these are set we degrade gracefully to plain node (no replication) — safe
# by default. See litestream.yml for why the backup bucket must be private.
r2_configured() {
  [ -n "$R2_ENDPOINT" ] && [ -n "$R2_BACKUP_BUCKET" ] && \
  [ -n "$R2_BACKUP_ACCESS_KEY_ID" ] && [ -n "$R2_BACKUP_SECRET_ACCESS_KEY" ]
}

# --- Boot-time DB provisioning -------------------------------------------------
# The live /data/adai.db is the ONLY source of truth (genesis seed RETIRED
# June 2026 — there is no baked seed.db to fall back to).
# Priority: (1) existing DB on the volume (warm restart, same host) — use as-is;
#           (2) else restore the live DB from the R2 Litestream replica (fresh
#               volume / new host after a host failure) — recovers runtime writes.
# If neither exists we FAIL LOUD rather than silently boot an empty database.
if [ ! -f "$DB_PATH" ]; then
  if r2_configured; then
    echo "No DB on volume; restoring live DB from the Litestream R2 replica..."
    litestream restore -if-replica-exists -config "$LITESTREAM_CONFIG" "$DB_PATH" || true
  fi

  if [ -f "$DB_PATH" ]; then
    echo "Restored live DB from R2 replica."
  else
    echo "FATAL: no DB on the volume and no Litestream replica to restore from." >&2
    echo "       This service has no genesis seed (retired June 2026). Restore a" >&2
    echo "       known-good /data/adai.db (Litestream backup) before starting." >&2
    exit 1
  fi
else
  echo "Existing database found at $DB_PATH."
fi

# --- Run the server ------------------------------------------------------------
# Under Litestream supervision: litestream opens the DB (establishing its
# replication position), execs node as a child, forwards signals, and on
# shutdown flushes the final WAL frames to R2 before exiting. This is what makes
# auto-stop / redeploy lose nothing and host-death lose <=sync-interval.
if r2_configured; then
  echo "Starting HTTP server on port 8080 under Litestream (continuous R2 replication)..."
  exec litestream replicate -config "$LITESTREAM_CONFIG" -exec "node dist/index.js"
else
  echo "R2 not configured; starting HTTP server on port 8080 without replication."
  exec node dist/index.js
fi
