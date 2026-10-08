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

# --- Staging (ADAI_ENV=staging, fly.staging.toml) ------------------------------
# Staging runs on a copy of the prod DB restored from the same Litestream
# replica, and NEVER replicates: a staging writer in the prod backup bucket
# would corrupt the disaster-recovery copy. The copy is refreshed on the first
# boot after 03:00 UTC each day (the nightly Action restarts a running
# machine), or when /data/.refresh exists (`just staging-refresh`).
# STAGING_SWITCHES containing data=keep holds the current copy.
if [ "$ADAI_ENV" = "staging" ]; then
  STAMP=/data/.restored-at
  now=$(date -u +%s)
  boundary=$(( now - (now - 10800) % 86400 ))
  last=$(cat "$STAMP" 2>/dev/null || echo 0)
  refresh=no
  if [ ! -f "$DB_PATH" ] || [ -f /data/.refresh ]; then
    refresh=yes
  elif [ "$last" -lt "$boundary" ]; then
    case " $STAGING_SWITCHES " in
      *" data=keep "*) echo "[staging] data=keep — keeping the copy restored at $(date -u -d "@$last" 2>/dev/null || echo "$last")" ;;
      *) refresh=yes ;;
    esac
  fi
  if [ "$refresh" = yes ]; then
    if r2_configured; then
      echo "[staging] restoring a fresh copy of the prod DB from the Litestream replica..."
      rm -f "$DB_PATH.restoring"
      if litestream restore -config "$LITESTREAM_CONFIG" -o "$DB_PATH.restoring" "$DB_PATH"; then
        rm -f "$DB_PATH" "$DB_PATH-wal" "$DB_PATH-shm"
        mv "$DB_PATH.restoring" "$DB_PATH"
        echo "$now" > "$STAMP"
        rm -f /data/.refresh
        echo "[staging] restored."
      else
        rm -f "$DB_PATH.restoring"
        echo "[staging] restore failed — keeping the existing copy." >&2
      fi
    else
      echo "[staging] R2_BACKUP_* unset — cannot restore." >&2
    fi
  fi
  if [ ! -f "$DB_PATH" ]; then
    echo "FATAL: [staging] no DB and no replica to restore from." >&2
    exit 1
  fi
  echo "[staging] starting HTTP server on port 8080 (no replication)."
  exec node dist/index.js
fi

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
