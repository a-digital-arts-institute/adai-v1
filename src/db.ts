import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extensionPath } from "@shards-lang/crsqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

let db: DatabaseSync;

export function initDb(dbPath: string): DatabaseSync {
  db = new DatabaseSync(dbPath, { allowExtension: true });
  db.loadExtension(extensionPath);

  const schema = readFileSync(join(PROJECT_ROOT, "db.sql"), "utf-8");
  db.exec(schema);

  runMigrations(db);

  return db;
}

// Migrations that cannot live in db.sql because they would fail (and abort the
// whole script) on re-runs once already applied. Each one is wrapped in its
// own try/catch keyed to a SPECIFIC, STABLE SQLite error message — do not
// "clean these up" by removing the try/catch or by swallowing the error
// generically. The comments are load-bearing.
function runMigrations(db: DatabaseSync) {
  // Add `kind` discriminator to intake_queue so AI suggestions (from the
  // Gemini embedding derive pass) can be filtered out of the human /review
  // tab. SQLite raises "duplicate column name: kind" on re-runs; that error
  // string is stable across versions and is the documented migration path
  // (see CLAUDE.md § Deploy gotchas — adding a column to an existing CRR or
  // local table can't be done declaratively in db.sql).
  try {
    db.exec("ALTER TABLE intake_queue ADD COLUMN kind TEXT NOT NULL DEFAULT 'human_signal'");
  } catch (e: any) {
    if (!String(e?.message ?? e).includes("duplicate column name")) throw e;
  }
}

export function getDb(): DatabaseSync {
  if (!db) throw new Error("Database not initialized. Call initDb() first.");
  return db;
}
