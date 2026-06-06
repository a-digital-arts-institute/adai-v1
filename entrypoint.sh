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
# Priority: (1) existing DB on the volume (warm restart, same host) — use as-is;
#           (2) else restore the live DB from the R2 Litestream replica (fresh
#               volume / new host after a host failure) — recovers runtime writes;
#           (3) else genesis from the baked seed.db (genuine first boot, empty R2).
if [ ! -f "$DB_PATH" ]; then
  if r2_configured; then
    echo "No DB on volume; attempting Litestream restore from R2..."
    # -if-replica-exists makes this a no-op (exit 0) when nothing's been
    # replicated yet, so the genesis fallback below can take over.
    litestream restore -if-replica-exists -config "$LITESTREAM_CONFIG" "$DB_PATH" || true
  fi

  if [ -f "$DB_PATH" ]; then
    echo "Restored live DB from R2 replica."
  else
    echo "No R2 replica; seeding from baked /app/seed.db (genesis)."
    cp /app/seed.db "$DB_PATH"
    echo "Seed copy complete."
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
