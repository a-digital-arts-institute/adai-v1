#!/bin/sh
set -e

DB_PATH="/data/adai.db"

echo "A(DAI) server starting..."

# If no database exists on the volume, seed it
if [ ! -f "$DB_PATH" ]; then
  echo "No database found, running seed..."
  cd /app
  # seed.shs creates adai.db in the working directory
  # we'll seed into /data by overriding the define
  shards seed.shs "adai-db:$DB_PATH"
  echo "Seed complete."
else
  echo "Existing database found at $DB_PATH"
fi

# Cleanup function
cleanup() {
  echo "Shutting down..."
  if [ -n "$SHARDS_PID" ] && kill -0 "$SHARDS_PID" 2>/dev/null; then
    kill -TERM "$SHARDS_PID"
    wait "$SHARDS_PID"
  fi
  echo "Shutdown complete."
}

trap cleanup EXIT TERM INT

echo "Starting HTTP server on port 8080..."
cd /app
shards run.shs "adai-db:$DB_PATH" "http-port:8080" &
SHARDS_PID=$!
echo "Server started with PID: $SHARDS_PID"
wait "$SHARDS_PID"
