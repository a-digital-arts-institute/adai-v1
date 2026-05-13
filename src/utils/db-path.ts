// Resolve the SQLite path the CLI tools should open. Operator scripts (token
// issue/revoke) are commonly run via `flyctl ssh console -C "node …"`, where
// the working directory is /app and the shell session inherits no DB_PATH.
// In that situation the legacy default of "./adai.db" silently creates a new,
// empty DB next to the server bundle while the live database sits on the
// /data volume — the new token then doesn't exist as far as the running
// server is concerned (see CLAUDE.md → "Deploy gotchas").
//
// Priority:
//   1. process.env.DB_PATH if set (explicit override)
//   2. /data/adai.db if it exists (Fly volume mount)
//   3. ./adai.db (local dev default)
//
// The server itself uses the simpler `process.env.DB_PATH || "adai.db"`
// pattern because entrypoint.sh sets DB_PATH explicitly on Fly. This
// resolver is only for the CLI tools that bypass entrypoint.sh.

import fs from "node:fs";

export function resolveCliDbPath(): string {
  const explicit = process.env.DB_PATH;
  if (explicit) return explicit;
  try {
    if (fs.existsSync("/data/adai.db")) return "/data/adai.db";
  } catch {
    // Permission denied on /data outside Fly — fall through.
  }
  return "adai.db";
}
