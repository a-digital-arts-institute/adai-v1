#!/bin/sh
set -e

DB_PATH="/data/adai.db"

echo "A(DAI) server starting..."

if [ ! -f "$DB_PATH" ]; then
  echo "No database on volume; seeding from baked /app/seed.db"
  cp /app/seed.db "$DB_PATH"
  echo "Seed copy complete."
else
  echo "Existing database found at $DB_PATH"
fi

# Cleanup function
cleanup() {
  echo "Shutting down..."
  if [ -n "$NODE_PID" ] && kill -0 "$NODE_PID" 2>/dev/null; then
    kill -TERM "$NODE_PID"
    wait "$NODE_PID"
  fi
  echo "Shutdown complete."
}

trap cleanup EXIT TERM INT

echo "Starting HTTP server on port 8080..."
cd /app
DB_PATH="$DB_PATH" PORT=8080 node dist/index.js &
NODE_PID=$!
echo "Server started with PID: $NODE_PID"
wait "$NODE_PID"
