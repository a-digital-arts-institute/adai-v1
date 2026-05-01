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

  return db;
}

export function getDb(): DatabaseSync {
  if (!db) throw new Error("Database not initialized. Call initDb() first.");
  return db;
}
