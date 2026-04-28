// Inverse of seed-consolidated.ts: read the live SQLite database and write
// seed/*.json that, when re-imported via `npm run seed:consolidated`, would
// reproduce the same DB.
//
// Use this whenever the live graph has drifted ahead of the static seed
// (enrichment passes, contributions, regime additions, etc.) and downstream
// consumers (the vault, frontend fixtures, audits) need a current snapshot.
//
// Run: `npm run seed:export` (writes into seed/, overwriting existing files)
// Optional env: DB_PATH (default `adai.db`), SEED_OUT (default `seed/`).

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initDb, getDb } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

const dbPath = process.env.DB_PATH || "adai.db";
const seedDir = process.env.SEED_OUT || join(PROJECT_ROOT, "seed");

console.log("Reading database:", dbPath);
console.log("Writing seed/   :", seedDir);
mkdirSync(seedDir, { recursive: true });

initDb(dbPath);
const db = getDb();

const writeJson = (filename: string, data: unknown[]) => {
  const path = join(seedDir, filename);
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`  ${filename}: ${data.length} rows`);
};

// nodes — parse metadata JSON-string back to object so the exported file
// matches the "post-enrichment" convention seed-consolidated.ts already
// accepts (legacy string form is also accepted but objects are richer to diff).
const tryParse = (v: unknown): unknown => {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

const nodes = (db.prepare("SELECT id, type, name, slug, metadata, created_at, updated_by FROM nodes ORDER BY id").all() as any[])
  .map((n) => ({ ...n, metadata: tryParse(n.metadata) }));

const edges = db.prepare(
  `SELECT id, source_id, target_id, edge_type, signal_id, confidence, charge,
          created_at, created_by, event_time, valid_from, valid_until, invalidated_by
   FROM edges ORDER BY id`
).all() as any[];

const signals = db.prepare(
  `SELECT id, title, source_url, source_type, cla_layer, summary, content,
          submitted_by, confidence, lived_experience, created_at,
          consent_scope, consent_attribution, consent_revocable,
          processing_trace, source_origin, batch_id, status, provenance_chain
   FROM signals ORDER BY id`
).all() as any[];

const contributors = db.prepare(
  "SELECT id, name, type, trust_tier, contributions, approved_count, created_at FROM contributors ORDER BY id"
).all() as any[];

const aliases = db.prepare(
  "SELECT source, external_id, node_id, created_at FROM node_aliases ORDER BY source, external_id"
).all() as any[];

writeJson("nodes.json", nodes);
writeJson("edges.json", edges);
writeJson("signals.json", signals);
writeJson("contributors.json", contributors);
writeJson("aliases.json", aliases);

const nodesByType = db.prepare("SELECT type, COUNT(*) as count FROM nodes GROUP BY type ORDER BY count DESC").all();
const edgesByType = db.prepare("SELECT edge_type, COUNT(*) as count FROM edges GROUP BY edge_type ORDER BY count DESC").all();
console.log("Nodes by type:", nodesByType);
console.log("Edges by type:", edgesByType);
console.log("Export complete.");
