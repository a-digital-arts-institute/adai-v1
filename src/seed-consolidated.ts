import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initDb, getDb } from "./db.js";
import { derive } from "./embed/derive.js";
import { validateEdge } from "./utils/edge-types.js";

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
// Metadata can arrive as a JSON-string (legacy seed) or a parsed object (post-enrichment seed).
// Normalise to string before binding.
const asString = (v: unknown): string | null => {
  if (v == null) return null;
  if (typeof v === "string") return v;
  return JSON.stringify(v);
};
const nowSeedIso = new Date().toISOString().slice(0, 19) + "Z";
db.exec("BEGIN");
for (const n of nodes) {
  insertNode.run(
    n.id,
    n.type,
    n.name,
    n.slug ?? null,
    asString(n.metadata),
    n.created_at ?? nowSeedIso,
    n.updated_by ?? "contributor:migration"
  );
}
db.exec("COMMIT");
console.log(`Nodes inserted: ${nodes.length}`);

const insertEdge = db.prepare(
  `INSERT OR IGNORE INTO edges (
    id, source_id, target_id, edge_type, signal_id, confidence, charge,
    created_at, created_by, event_time, valid_from, valid_until, invalidated_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

// Defense-in-depth: report (don't skip) edges that violate direction /
// attestation / era rules. seed/edges.json is canonical for the database,
// so the loader should not silently drop rows — that would break the
// file-as-truth invariant. Instead, count violations + print a sample so
// future audits know where to look. Hard blocking happens at write time
// in src/routes/contributor-api.ts. Rules live in src/utils/edge-types.ts.
// Skipping IS done for genuinely missing referents (orphan source_id or
// target_id), because the INSERT would fail anyway.
const nodeIndex = new Map(nodes.map((n) => [n.id, n]));
type FlagRow = { id: string; reason: string };
const orphanSkipped: FlagRow[] = [];
const ruleFlagged: FlagRow[] = [];

db.exec("BEGIN");
for (const e of edges) {
  const src = nodeIndex.get(e.source_id);
  const dst = nodeIndex.get(e.target_id);
  if (!src || !dst) {
    orphanSkipped.push({ id: e.id, reason: !src ? `missing source_id ${e.source_id}` : `missing target_id ${e.target_id}` });
    continue;
  }
  const violation = validateEdge(
    { id: src.id, type: src.type, metadata: src.metadata },
    { id: dst.id, type: dst.type },
    e.edge_type,
    null,
    { checkUrlAttestation: false }, // attestation chains live in signals/metadata, not per-edge in the seed
  );
  if (violation) {
    ruleFlagged.push({ id: e.id, reason: `${violation.kind}: ${violation.message}` });
    // fall through: still insert (canon-preserving)
  }
  insertEdge.run(
    e.id,
    e.source_id,
    e.target_id,
    e.edge_type,
    e.signal_id ?? null,
    e.confidence ?? null,
    e.charge ?? null,
    e.created_at ?? nowSeedIso,
    e.created_by ?? "gatherer-enrichment",
    e.event_time ?? null,
    e.valid_from ?? null,
    e.valid_until ?? null,
    e.invalidated_by ?? null
  );
}
db.exec("COMMIT");
console.log(`Edges inserted: ${edges.length - orphanSkipped.length} (of ${edges.length})`);
if (orphanSkipped.length > 0) {
  console.log(`Edges skipped (orphan references): ${orphanSkipped.length}`);
  for (const s of orphanSkipped.slice(0, 10)) console.log(`  - ${s.id}: ${s.reason}`);
}
if (ruleFlagged.length > 0) {
  console.log(`Edges flagged (rule violations, inserted anyway): ${ruleFlagged.length}`);
  const byKind = new Map<string, number>();
  for (const f of ruleFlagged) {
    const kind = f.reason.split(":")[0]!;
    byKind.set(kind, (byKind.get(kind) ?? 0) + 1);
  }
  for (const [k, n] of byKind) console.log(`  ${k}: ${n}`);
}

const insertAlias = db.prepare(
  "INSERT OR IGNORE INTO node_aliases (source, external_id, node_id, created_at) VALUES (?, ?, ?, ?)"
);
for (const a of aliases) {
  insertAlias.run(a.source, a.external_id, a.node_id, a.created_at);
}
console.log(`Aliases inserted: ${aliases.length}`);

// --- A(DAI) root regime: disabled after enrichment pass (2026-04-22) ---
// The enriched seed already ships a single canonical lens:
//   classification_regime:a(dai) seed canon v1 (april 2026)
// Every canonical entity in the seed has a CLASSIFIED_BY edge to that node.
// The former 'classification_regime:a(dai)' root injected here produced a
// 483-edge explosion that centred the graph on itself, hiding the actual
// relational structure. It was removed in Task 0e of the enrichment spec.
//
// If you want a single umbrella regime again, promote the seed canon node
// to root — do not reintroduce the auto-injecting loop.
console.log(
  "A(DAI) root regime: skipped (enrichment 2026-04-22 — single seed-canon lens already in nodes.json)."
);

// Note: the upstream `A(DAI) root presence assertion` (commit 18e1ff4) was
// dropped here because the enrichment (Task 0e) retired the
// `classification_regime:a(dai)` root. The single canonical lens is now
// `classification_regime:a(dai) seed canon v1 (april 2026)`, already in
// seed/nodes.json. The upstream WAL checkpoint fix (205f4c6) is preserved
// further down — see PRAGMA wal_checkpoint(TRUNCATE) near the end of this file.

const { count: totalNodes } = db.prepare("SELECT COUNT(*) as count FROM nodes").get() as any;
const { count: totalEdges } = db.prepare("SELECT COUNT(*) as count FROM edges").get() as any;
const { count: totalSignals } = db.prepare("SELECT COUNT(*) as count FROM signals").get() as any;
const { count: totalAliases } = db.prepare("SELECT COUNT(*) as count FROM node_aliases").get() as any;
console.log(`Totals: ${totalNodes} nodes, ${totalEdges} edges, ${totalSignals} signals, ${totalAliases} aliases`);

const nodesByType = db.prepare("SELECT type, COUNT(*) as count FROM nodes GROUP BY type ORDER BY count DESC").all();
console.log("Nodes by type:", nodesByType);

const edgesByType = db.prepare("SELECT edge_type, COUNT(*) as count FROM edges GROUP BY edge_type ORDER BY count DESC").all();
console.log("Edges by type:", edgesByType);

// --- Embeddings sidecar (Gemini Embedding 2 multimodal pass) ----------
// Produced by seed/_build/embed_nodes.py and committed (or not — see CLAUDE.md)
// as seed/embeddings.{bin,json}. Skip silently when absent so local devs can
// run seed:consolidated without first running the Python embed pass.
//
// CRITICAL: this block must run BEFORE the wal_checkpoint below — otherwise
// inserts sit in the WAL file and the Dockerfile (which copies only seed.db
// from the builder) silently loses them. Same trap that bit the upstream
// A(DAI) bootstrap (commit 205f4c6).
const embBinPath = join(seedDir, "embeddings.bin");
const embMetaPath = join(seedDir, "embeddings.json");
try {
  const metaText = readFileSync(embMetaPath, "utf-8");
  const binBytes = readFileSync(embBinPath);
  type EmbMeta = {
    node_id: string;
    kind: string;
    model: string;
    dims: number;
    has_image: number;
    image_hash: string | null;
    text_hash: string | null;
    offset: number;
  };
  const meta: EmbMeta[] = JSON.parse(metaText);
  const insertEmb = db.prepare(
    `INSERT OR REPLACE INTO node_embeddings
      (node_id, kind, model, dims, vector, has_image, image_hash, text_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))`
  );
  let embCount = 0;
  // Wrap in a transaction — 1k+ inserts otherwise WAL-fsync per row.
  db.exec("BEGIN");
  try {
    for (const e of meta) {
      const byteLen = e.dims * 4;
      // node-sqlite expects Uint8Array for BLOB parameters.
      const vec = binBytes.subarray(e.offset, e.offset + byteLen);
      if (vec.byteLength !== byteLen) {
        throw new Error(`embedding ${e.node_id}/${e.kind} truncated: expected ${byteLen}, got ${vec.byteLength}`);
      }
      insertEmb.run(e.node_id, e.kind, e.model, e.dims, vec,
                    e.has_image, e.image_hash, e.text_hash);
      embCount++;
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  console.log(`Embeddings inserted: ${embCount} (from ${embBinPath})`);
  const embByKind = db.prepare("SELECT kind, COUNT(*) as count FROM node_embeddings GROUP BY kind ORDER BY count DESC").all();
  console.log("Embeddings by kind:", embByKind);

  // Now that embeddings are live, chain the derive pass so the baked seed.db
  // ships complete: STYLE_KIN, VISUALLY_AFFINE, and SUGGESTS_CREATED_BY rows
  // are produced from the just-loaded vectors + live CREATED_BY edges.
  // Conditional on embeddings actually loading — no point deriving over
  // an empty node_embeddings table.
  if (embCount > 0) {
    console.log("Running embed:derive over freshly-loaded vectors...");
    const stats = derive(db, {});
    console.log("Derive stats:", JSON.stringify(stats, null, 2));
  }
} catch (e: any) {
  if (e?.code === "ENOENT") {
    console.log("Embeddings sidecar (seed/embeddings.{bin,json}) absent — skipping embeddings + derive. Run seed/_build/embed_nodes.py to produce it.");
  } else {
    throw e;
  }
}

db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
console.log("Consolidated seed complete!");
