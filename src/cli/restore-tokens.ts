// CLI: re-insert previously-issued contributor / admin bearer tokens
// from a JSON file. Disaster-recovery sister of `issue-token` — used
// after a volume wipe (the `contributor_tokens` table is local-only and
// does not survive `rm /data/adai.db`). The raw tokens themselves are
// stored gitignored in `.tokens.json` at the repo root.
//
//   npm run token:restore -- --from .tokens.json
//   DB_PATH=/data/adai.db node /app/dist/cli/restore-tokens.js --from /tmp/.adai-tokens.json
//
// Flags:
//   --from <path>          (required) path to a .tokens.json file
//   --dry-run              parse + validate the file, print what WOULD happen, write nothing
//
// File format (`.tokens.json`):
//   {
//     "label_default": "ops-bootstrap",   // optional; used when an entry omits "label"
//     "tier_default":  "reviewed",        // optional; used when an entry omits "tier"
//     "scope_default": "write",           // optional; used when an entry omits "scope"
//     "tokens": [
//       { "name": "Gio", "raw": "adai_…", "scope": "admin", "tier": "reviewed", "label": "…" },
//       ...
//     ]
//   }
//
// Idempotent: re-running with the same file is a no-op for entries
// whose token_hash is already present. Wrapped in a transaction — if
// any entry fails (e.g. token_belongs_to_other_contributor), the whole
// batch rolls back.

import { readFileSync } from "node:fs";
import { initDb, getDb } from "../db.js";
import { resolveCliDbPath } from "../utils/db-path.js";
import { restoreToken, MintError, type TokenScope, type TrustTier } from "../utils/token-mint.js";

interface RawEntry {
  name?: unknown;
  raw?: unknown;
  scope?: unknown;
  tier?: unknown;
  label?: unknown;
}

interface RawFile {
  label_default?: unknown;
  tier_default?: unknown;
  scope_default?: unknown;
  tokens?: unknown;
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function usage(): never {
  console.error("Usage: npm run token:restore -- --from <path/to/.tokens.json> [--dry-run]");
  process.exit(2);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const from = typeof args.from === "string" ? args.from : null;
  const dryRun = args["dry-run"] === true;
  if (!from) usage();

  let payload: RawFile;
  try {
    payload = JSON.parse(readFileSync(from, "utf-8")) as RawFile;
  } catch (e: any) {
    console.error(`[token:restore] cannot read ${from}: ${e.message}`);
    process.exit(2);
  }

  const labelDefault =
    typeof payload.label_default === "string" ? payload.label_default : null;
  const tierDefault =
    typeof payload.tier_default === "string" ? (payload.tier_default as TrustTier) : "reviewed";
  const scopeDefault =
    typeof payload.scope_default === "string" ? (payload.scope_default as TokenScope) : "write";

  if (!Array.isArray(payload.tokens) || payload.tokens.length === 0) {
    console.error(`[token:restore] ${from}: no \`tokens\` array (or empty)`);
    process.exit(2);
  }

  const entries: Array<{
    name: string;
    raw: string;
    scope: TokenScope;
    tier: TrustTier;
    label: string | null;
  }> = [];
  payload.tokens.forEach((t: RawEntry, i: number) => {
    if (!t || typeof t !== "object") {
      console.error(`[token:restore] tokens[${i}]: not an object`);
      process.exit(2);
    }
    const name = typeof t.name === "string" ? t.name.trim() : "";
    const raw = typeof t.raw === "string" ? t.raw.trim() : "";
    if (!name) {
      console.error(`[token:restore] tokens[${i}]: missing "name"`);
      process.exit(2);
    }
    if (!raw) {
      console.error(`[token:restore] tokens[${i}] (${name}): missing "raw"`);
      process.exit(2);
    }
    entries.push({
      name,
      raw,
      scope: (typeof t.scope === "string" ? t.scope : scopeDefault) as TokenScope,
      tier: (typeof t.tier === "string" ? t.tier : tierDefault) as TrustTier,
      label: typeof t.label === "string" ? t.label : labelDefault,
    });
  });

  const dbPath = resolveCliDbPath();
  console.error(`[token:restore] using DB ${dbPath}`);
  console.error(`[token:restore] entries: ${entries.length}${dryRun ? " (DRY RUN)" : ""}`);
  initDb(dbPath);
  const db = getDb();

  db.exec("BEGIN");
  let inserted = 0;
  let alreadyPresent = 0;
  let contributorsCreated = 0;
  try {
    for (const e of entries) {
      const r = restoreToken(db, {
        rawToken: e.raw,
        contributorName: e.name,
        label: e.label,
        scope: e.scope,
        tier: e.tier,
      });
      if (r.contributor_created) contributorsCreated++;
      if (r.token_inserted) inserted++;
      else alreadyPresent++;
      const tag = r.token_inserted ? "inserted" : "already present";
      console.error(
        `  [${tag}] ${r.token_prefix}  ${r.contributor_name}  (scope=${r.scope}, tier=${r.contributor_trust_tier}${r.label ? `, label="${r.label}"` : ""})`
      );
    }
    if (dryRun) {
      db.exec("ROLLBACK");
      console.error(`\n[token:restore] DRY RUN — rolled back. Would have:`);
      console.error(`  contributors created: ${contributorsCreated}`);
      console.error(`  tokens inserted:      ${inserted}`);
      console.error(`  tokens already present: ${alreadyPresent}`);
      return;
    }
    db.exec("COMMIT");
    console.error(`\n[token:restore] committed.`);
    console.error(`  contributors created: ${contributorsCreated}`);
    console.error(`  tokens inserted:      ${inserted}`);
    console.error(`  tokens already present: ${alreadyPresent}`);
  } catch (e: any) {
    db.exec("ROLLBACK");
    if (e instanceof MintError) {
      console.error(`\n[token:restore] FAILED, rolled back: ${e.message}`);
      process.exit(1);
    }
    console.error(`\n[token:restore] FAILED, rolled back: ${e?.message ?? e}`);
    process.exit(1);
  }
}

main();
