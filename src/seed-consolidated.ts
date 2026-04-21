import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initDb, getDb } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");

const dbPath = process.env.DB_PATH || "adai.db";
const seedDir = join(PROJECT_ROOT, "seed");

type NodeRow = {
  id: string;
  type: string;
  name: string;
  slug: string;
  metadata: string | null;
  created_at: string;
  updated_by: string;
};

type EdgeRow = {
  id: string;
  source_id: string;
  target_id: string;
  edge_type: string;
  signal_id: string | null;
  confidence: string | null;
  charge: string | null;
  created_at: string;
  created_by: string;
  event_time: string | null;
  valid_from: string | null;
  valid_until: string | null;
  invalidated_by: string | null;
};

type SignalRow = {
  id: string;
  title: string | null;
  source_url: string | null;
  source_type: string | null;
  cla_layer: string | null;
  summary: string | null;
  content: string | null;
  submitted_by: string;
  confidence: string;
  lived_experience: number | boolean;
  created_at: string;
  consent_scope: string;
  consent_attribution: string;
  consent_revocable: number | boolean;
  processing_trace: string | null;
  source_origin: string;
  batch_id: string | null;
  status: string;
  provenance_chain: string | null;
};

type ContributorRow = {
  id: string;
  name: string;
  type: string;
  trust_tier: string;
  contributions: number;
  approved_count: number;
  created_at: string;
};

type AliasRow = {
  source: string;
  external_id: string;
  node_id: string;
  created_at: string;
};

function loadJson<T>(filename: string): T[] {
  return JSON.parse(readFileSync(join(seedDir, filename), "utf-8")) as T[];
}

const toInt = (v: number | boolean): number => (typeof v === "boolean" ? (v ? 1 : 0) : v);

console.log("Initializing database:", dbPath);
initDb(dbPath);
const db = getDb();

const nodes = loadJson<NodeRow>("nodes.json");
const edges = loadJson<EdgeRow>("edges.json");
const signals = loadJson<SignalRow>("signals.json");
const contributors = loadJson<ContributorRow>("contributors.json");
const aliases = loadJson<AliasRow>("aliases.json");

console.log(
  `Loaded seed/: ${nodes.length} nodes, ${edges.length} edges, ${signals.length} signals, ${contributors.length} contributors, ${aliases.length} aliases`
);

const insertContributor = db.prepare(
  "INSERT OR IGNORE INTO contributors (id, name, type, trust_tier, contributions, approved_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
);
for (const c of contributors) {
  insertContributor.run(c.id, c.name, c.type, c.trust_tier, c.contributions, c.approved_count, c.created_at);
}
console.log(`Contributors inserted: ${contributors.length}`);

const insertSignal = db.prepare(
  `INSERT OR IGNORE INTO signals (
    id, title, source_url, source_type, cla_layer, summary, content,
    submitted_by, confidence, lived_experience, created_at,
    consent_scope, consent_attribution, consent_revocable,
    processing_trace, source_origin, batch_id, status, provenance_chain
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
for (const s of signals) {
  insertSignal.run(
    s.id, s.title, s.source_url, s.source_type, s.cla_layer, s.summary, s.content,
    s.submitted_by, s.confidence, toInt(s.lived_experience), s.created_at,
    s.consent_scope, s.consent_attribution, toInt(s.consent_revocable),
    s.processing_trace, s.source_origin, s.batch_id, s.status, s.provenance_chain
  );
}
console.log(`Signals inserted: ${signals.length}`);

const insertNode = db.prepare(
  "INSERT OR IGNORE INTO nodes (id, type, name, slug, metadata, created_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)"
);
db.exec("BEGIN");
for (const n of nodes) {
  insertNode.run(n.id, n.type, n.name, n.slug, n.metadata, n.created_at, n.updated_by);
}
db.exec("COMMIT");
console.log(`Nodes inserted: ${nodes.length}`);

const insertEdge = db.prepare(
  `INSERT OR IGNORE INTO edges (
    id, source_id, target_id, edge_type, signal_id, confidence, charge,
    created_at, created_by, event_time, valid_from, valid_until, invalidated_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
db.exec("BEGIN");
for (const e of edges) {
  insertEdge.run(
    e.id, e.source_id, e.target_id, e.edge_type, e.signal_id, e.confidence, e.charge,
    e.created_at, e.created_by, e.event_time, e.valid_from, e.valid_until, e.invalidated_by
  );
}
db.exec("COMMIT");
console.log(`Edges inserted: ${edges.length}`);

const insertAlias = db.prepare(
  "INSERT OR IGNORE INTO node_aliases (source, external_id, node_id, created_at) VALUES (?, ?, ?, ?)"
);
for (const a of aliases) {
  insertAlias.run(a.source, a.external_id, a.node_id, a.created_at);
}
console.log(`Aliases inserted: ${aliases.length}`);

const { count: totalNodes } = db.prepare("SELECT COUNT(*) as count FROM nodes").get() as any;
const { count: totalEdges } = db.prepare("SELECT COUNT(*) as count FROM edges").get() as any;
const { count: totalSignals } = db.prepare("SELECT COUNT(*) as count FROM signals").get() as any;
const { count: totalAliases } = db.prepare("SELECT COUNT(*) as count FROM node_aliases").get() as any;
console.log(`Totals: ${totalNodes} nodes, ${totalEdges} edges, ${totalSignals} signals, ${totalAliases} aliases`);

const nodesByType = db.prepare("SELECT type, COUNT(*) as count FROM nodes GROUP BY type ORDER BY count DESC").all();
console.log("Nodes by type:", nodesByType);

const edgesByType = db.prepare("SELECT edge_type, COUNT(*) as count FROM edges GROUP BY edge_type ORDER BY count DESC").all();
console.log("Edges by type:", edgesByType);

console.log("Consolidated seed complete!");
