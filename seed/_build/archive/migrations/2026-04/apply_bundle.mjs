#!/usr/bin/env node
// apply_bundle.mjs — apply a real_source_merge bundle to a CR-SQLite db.
// Node sibling of apply_bundle.py (Python's sqlite3 has extension loading
// disabled on macOS, so the CR-SQLite triggers can't fire there).
//
// Usage:
//   node seed/_build/apply_bundle.mjs                  # dry-run
//   node seed/_build/apply_bundle.mjs --apply --backup
//   node seed/_build/apply_bundle.mjs --bundle <path> --db <path> --apply
//
// Idempotent: re-running --apply is safe (INSERT OR REPLACE; deletes match by id).

import { DatabaseSync } from "node:sqlite";
import { readFileSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extensionPath } from "@shards-lang/crsqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const DEFAULT_BUNDLE = join(__dirname, "real_source_merge_2026-04-28.json");
const DEFAULT_DB = join(PROJECT_ROOT, "adai.db");

function parseArgs(argv) {
  const opts = { apply: false, backup: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") opts.apply = true;
    else if (a === "--backup") opts.backup = true;
    else if (a === "--bundle") opts.bundle = argv[++i];
    else if (a === "--db") opts.db = argv[++i];
    else {
      console.error(`unknown arg: ${a}`);
      process.exit(2);
    }
  }
  opts.bundle = resolve(opts.bundle || DEFAULT_BUNDLE);
  opts.db = resolve(opts.db || DEFAULT_DB);
  return opts;
}

function counts(db) {
  const c = {};
  c.nodes_total = db.prepare("SELECT COUNT(*) AS n FROM nodes").get().n;
  c.edges_total = db.prepare(
    "SELECT COUNT(*) AS n FROM edges WHERE valid_until IS NULL"
  ).get().n;
  c.embodies = db.prepare(
    "SELECT COUNT(*) AS n FROM edges WHERE edge_type='EMBODIES' AND valid_until IS NULL"
  ).get().n;
  c.embodies_heuristic = db.prepare(
    "SELECT COUNT(*) AS n FROM edges " +
    "WHERE edge_type='EMBODIES' AND signal_id='enrichment-seed-canon-v1-2026-04' " +
    "AND valid_until IS NULL"
  ).get().n;
  c.artwork_with_image = db.prepare(
    "SELECT COUNT(*) AS n FROM nodes " +
    "WHERE type='artwork' AND json_extract(metadata,'$.image_url') IS NOT NULL"
  ).get().n;
  c.artworks = db.prepare("SELECT COUNT(*) AS n FROM nodes WHERE type='artwork'").get().n;
  c.practitioners = db.prepare("SELECT COUNT(*) AS n FROM nodes WHERE type='practitioner'").get().n;
  c.scenes = db.prepare("SELECT COUNT(*) AS n FROM nodes WHERE type='scene'").get().n;
  return c;
}

function nodeRow(n) {
  let meta = n.metadata ?? "";
  if (typeof meta === "object") meta = JSON.stringify(meta);
  return [
    n.id,
    n.type ?? "",
    n.name ?? "",
    n.slug ?? "",
    meta,
    n.updated_by ?? "real-source-merge-2026-04-28",
  ];
}

function edgeRow(e) {
  return [
    e.id,
    e.source_id ?? "",
    e.target_id ?? "",
    e.edge_type ?? "",
    e.signal_id ?? null,
    e.confidence ?? "medium",
    e.created_by ?? "real-source-merge-2026-04-28",
  ];
}

function main() {
  const opts = parseArgs(process.argv);
  if (!existsSync(opts.bundle)) { console.error(`missing bundle: ${opts.bundle}`); process.exit(1); }
  if (!existsSync(opts.db))     { console.error(`missing db: ${opts.db}`); process.exit(1); }

  const bundle = JSON.parse(readFileSync(opts.bundle, "utf-8"));
  const deleteIds = bundle.delete.edges.map(e => e.id);
  const insertNodes = bundle.insert.nodes;
  const insertEdges = bundle.insert.edges;

  console.log(`Bundle:  ${opts.bundle}`);
  console.log(`DB:      ${opts.db}`);
  console.log(`  delete edges: ${deleteIds.length}`);
  console.log(`  insert nodes: ${insertNodes.length}`);
  console.log(`  insert edges: ${insertEdges.length}\n`);

  const db = new DatabaseSync(opts.db, { allowExtension: true });
  db.loadExtension(extensionPath);

  const before = counts(db);
  console.log("Baseline (before):");
  for (const [k, v] of Object.entries(before)) console.log(`  ${k.padEnd(22)} ${v}`);
  console.log();

  // Overlap diagnostics
  const existingNodeIds = new Set(db.prepare("SELECT id FROM nodes").all().map(r => r.id));
  const existingEdgeIds = new Set(db.prepare("SELECT id FROM edges").all().map(r => r.id));
  const newNodes = insertNodes.filter(n => !existingNodeIds.has(n.id)).length;
  const replacedNodes = insertNodes.length - newNodes;
  const newEdges = insertEdges.filter(e => !existingEdgeIds.has(e.id)).length;
  const replacedEdges = insertEdges.length - newEdges;
  const deletePresent = deleteIds.filter(id => existingEdgeIds.has(id)).length;
  console.log("Effect on db:");
  console.log(`  nodes: ${newNodes} new + ${replacedNodes} replaced (INSERT OR REPLACE)`);
  console.log(`  edges: ${newEdges} new + ${replacedEdges} replaced`);
  console.log(`  delete: ${deletePresent} of ${deleteIds.length} target edges present in db`);
  console.log();

  if (!opts.apply) {
    console.log("DRY RUN — no writes. Re-run with --apply to commit.");
    db.close();
    return;
  }

  if (opts.backup) {
    const ts = new Date().toISOString().replace(/[:T.-]/g, "").slice(0, 14);
    const bak = `${opts.db}.${ts}.bak`;
    console.log(`Backing up db → ${bak}`);
    copyFileSync(opts.db, bak);
  }

  console.log("Applying...");
  const delStmt = db.prepare("DELETE FROM edges WHERE id = ?");
  const upsertNode = db.prepare(
    "INSERT OR REPLACE INTO nodes (id, type, name, slug, metadata, updated_by) " +
    "VALUES (?, ?, ?, ?, ?, ?)"
  );
  const upsertEdge = db.prepare(
    "INSERT OR REPLACE INTO edges (id, source_id, target_id, edge_type, signal_id, confidence, created_by) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  db.exec("BEGIN");
  try {
    let deleted = 0;
    for (const id of deleteIds) {
      const r = delStmt.run(id);
      deleted += r.changes ?? 0;
    }
    let nodesWritten = 0;
    for (const n of insertNodes) {
      upsertNode.run(...nodeRow(n));
      nodesWritten++;
    }
    let edgesWritten = 0;
    for (const e of insertEdges) {
      upsertEdge.run(...edgeRow(e));
      edgesWritten++;
    }
    db.exec("COMMIT");
    console.log(`  deleted: ${deleted}`);
    console.log(`  nodes upserted: ${nodesWritten}`);
    console.log(`  edges upserted: ${edgesWritten}\n`);
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  const after = counts(db);
  console.log("Final state (after):");
  for (const k of Object.keys(after)) {
    const delta = after[k] - before[k];
    const sign = delta >= 0 ? "+" : "";
    console.log(`  ${k.padEnd(22)} ${after[k]}  (${sign}${delta})`);
  }
  db.close();
  console.log("\nDone.");
}

main();
