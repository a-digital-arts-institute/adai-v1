import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initDb, getDb } from "./db.js";
import { derive } from "./embed/derive.js";

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

// --- Image overlay (build-time DB patch) ------------------------------
// Images for previously-imageless nodes are NOT written into nodes.json
// (pristine build output). They live in seed/image_overlay.json and are
// applied here, after the node INSERT loop, as metadata UPDATEs — image
// fields only, and only for nodes that don't already carry an image
// (gap-fill, idempotent). Produced by find_missing_images.py --apply
// (image_url + provenance) + upload_to_r2.py --overlay (cdn_image_url).
//
// CRITICAL: like the embeddings block below, this must run BEFORE the
// PRAGMA wal_checkpoint(TRUNCATE) near the end of this file — otherwise the
// UPDATEs sit in the WAL and the Dockerfile (which copies only seed.db from
// the builder) silently loses them.
type ImageOverlayEntry = {
  node_id: string;
  image_url?: string | null;
  cdn_image_url?: string | null;
  image_provenance?: unknown;
};
let imageOverlay: ImageOverlayEntry[] | null = null;
try {
  imageOverlay = JSON.parse(readFileSync(join(seedDir, "image_overlay.json"), "utf-8")) as ImageOverlayEntry[];
} catch (err) {
  if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") throw err;
  console.log("Image overlay: seed/image_overlay.json absent — skipped.");
}
if (imageOverlay) {
  const selectMeta = db.prepare("SELECT metadata FROM nodes WHERE id = ?");
  const updateMeta = db.prepare("UPDATE nodes SET metadata = ? WHERE id = ?");
  let overlayApplied = 0;
  let overlaySkipped = 0;
  db.exec("BEGIN");
  for (const e of imageOverlay) {
    const row = selectMeta.get(e.node_id) as { metadata: string | null } | undefined;
    if (!row) {
      overlaySkipped++; // overlay references a node not in the seed
      continue;
    }
    let md: Record<string, unknown> = {};
    if (row.metadata) {
      try {
        md = JSON.parse(row.metadata) as Record<string, unknown>;
      } catch {
        md = {};
      }
    }
    // Never overwrite an existing image — overlay only fills gaps.
    if (md.image_url || md.cdn_image_url) {
      overlaySkipped++;
      continue;
    }
    if (!e.image_url && !e.cdn_image_url) {
      overlaySkipped++;
      continue;
    }
    if (e.image_url) md.image_url = e.image_url;
    if (e.cdn_image_url) md.cdn_image_url = e.cdn_image_url;
    if (e.image_provenance !== undefined && md.image_provenance === undefined) {
      md.image_provenance = e.image_provenance;
    }
    updateMeta.run(JSON.stringify(md), e.node_id);
    overlayApplied++;
  }
  db.exec("COMMIT");
  console.log(`Image overlay applied: ${overlayApplied} nodes (${overlaySkipped} skipped) from seed/image_overlay.json`);
}

// --- Image mirror (build-time DB patch) -------------------------------
// The R2 cdn_image_url for nodes that ALREADY carry an upstream image_url in
// nodes.json. Kept out of nodes.json (pristine cull output — cull_digital_art.py
// would clobber any cdn written there on its next re-run) and out of the image
// overlay (which is gap-fill for IMAGELESS nodes and refuses to touch a node
// that already has an image). This block is the inverse: it sets cdn_image_url
// ADDITIVELY on nodes that have image_url but no cdn yet. image_url is never
// overwritten (provenance stays). Produced by upload_to_r2.py --mirror; keyed
// by node_id; survives canon rebuilds. Same WAL trap as above — must run before
// the PRAGMA wal_checkpoint(TRUNCATE) at the end of this file.
type ImageMirrorEntry = {
  node_id: string;
  image_url?: string | null;
  cdn_image_url?: string | null;
};
let imageMirror: ImageMirrorEntry[] | null = null;
try {
  imageMirror = JSON.parse(readFileSync(join(seedDir, "image_mirror.json"), "utf-8")) as ImageMirrorEntry[];
} catch (err) {
  if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") throw err;
  console.log("Image mirror: seed/image_mirror.json absent — skipped.");
}
if (imageMirror) {
  const selectMeta = db.prepare("SELECT metadata FROM nodes WHERE id = ?");
  const updateMeta = db.prepare("UPDATE nodes SET metadata = ? WHERE id = ?");
  let mirrorApplied = 0;
  let mirrorSkipped = 0;
  db.exec("BEGIN");
  for (const e of imageMirror) {
    if (!e.cdn_image_url) {
      mirrorSkipped++;
      continue;
    }
    const row = selectMeta.get(e.node_id) as { metadata: string | null } | undefined;
    if (!row) {
      mirrorSkipped++; // mirror references a node not in the seed (e.g. culled out)
      continue;
    }
    let md: Record<string, unknown> = {};
    if (row.metadata) {
      try {
        md = JSON.parse(row.metadata) as Record<string, unknown>;
      } catch {
        md = {};
      }
    }
    // Idempotent — don't re-stamp an existing cdn.
    if (md.cdn_image_url) {
      mirrorSkipped++;
      continue;
    }
    // Correctness guard: the cdn is content-addressed to the image_url that was
    // mirrored. If the node's current image_url drifted from what the mirror
    // recorded, the cdn is stale — skip and let upload_to_r2.py --mirror re-run.
    if (e.image_url && md.image_url && md.image_url !== e.image_url) {
      mirrorSkipped++;
      continue;
    }
    md.cdn_image_url = e.cdn_image_url;
    updateMeta.run(JSON.stringify(md), e.node_id);
    mirrorApplied++;
  }
  db.exec("COMMIT");
  console.log(`Image mirror applied: ${mirrorApplied} nodes (${mirrorSkipped} skipped) from seed/image_mirror.json`);
}

const insertEdge = db.prepare(
  `INSERT OR IGNORE INTO edges (
    id, source_id, target_id, edge_type, signal_id, confidence, charge,
    created_at, created_by, event_time, valid_from, valid_until, invalidated_by
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
db.exec("BEGIN");
for (const e of edges) {
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
console.log(`Edges inserted: ${edges.length}`);

// --- Canon overlay (build-time DB patch for corrections) -------------
// nodes.json / edges.json / signals.json stay pristine. The overlay carries
// CORRECTIONS only (not new ingestions — those still come from gatherers
// writing to the canon files directly). Use it for: slug-collision splits,
// curator-driven bi-temporal supersessions, manual additions that don't have
// a natural producer. Apply order: signals → nodes → edges → supersessions
// (referential integrity: a supersession's invalidated_by may reference a new
// signal_id; a new edge may reference new node_ids and/or new signal_ids).
//
// CRITICAL: must run BEFORE the wal_checkpoint near the end of this file —
// same WAL trap as the image overlay and the embeddings block.
type CanonOverlay = {
  add_signals?: any[];
  add_nodes?: any[];
  add_edges?: any[];
  supersede_edges?: Array<{
    edge_id: string;
    valid_until: string;
    invalidated_by: string;
    reason?: string;
  }>;
};
let canonOverlay: CanonOverlay | null = null;
try {
  canonOverlay = JSON.parse(readFileSync(join(seedDir, "canon_overlay.json"), "utf-8")) as CanonOverlay;
} catch (err) {
  if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") throw err;
  console.log("Canon overlay: seed/canon_overlay.json absent — skipped.");
}
if (canonOverlay) {
  let appliedSignals = 0, appliedNodes = 0, appliedEdges = 0, appliedSupersessions = 0;
  // UPDATE is idempotent via `valid_until IS NULL`: a second run won't shift
  // valid_until forward, and won't re-supersede an already-superseded edge.
  const supersedeEdge = db.prepare(
    "UPDATE edges SET valid_until = ?, invalidated_by = ? WHERE id = ? AND valid_until IS NULL"
  );
  db.exec("BEGIN");
  for (const s of canonOverlay.add_signals ?? []) {
    insertSignal.run(
      s.id, s.title, s.source_url ?? null, s.source_type ?? null,
      s.cla_layer ?? null, s.summary ?? null, s.content ?? null,
      s.submitted_by ?? null, s.confidence ?? null, toInt(s.lived_experience ?? false),
      s.created_at ?? nowSeedIso,
      s.consent_scope ?? "structural_only", s.consent_attribution ?? "attributed",
      toInt(s.consent_revocable ?? true),
      s.processing_trace ?? null, s.source_origin ?? "ai_assisted",
      s.batch_id ?? null, s.status ?? "active", s.provenance_chain ?? null
    );
    appliedSignals++;
  }
  for (const n of canonOverlay.add_nodes ?? []) {
    insertNode.run(
      n.id, n.type, n.name, n.slug ?? null,
      asString(n.metadata),
      n.created_at ?? nowSeedIso,
      n.updated_by ?? "canon-overlay"
    );
    appliedNodes++;
  }
  for (const e of canonOverlay.add_edges ?? []) {
    insertEdge.run(
      e.id, e.source_id, e.target_id, e.edge_type,
      e.signal_id ?? null, e.confidence ?? null, e.charge ?? null,
      e.created_at ?? nowSeedIso, e.created_by ?? "canon-overlay",
      e.event_time ?? null, e.valid_from ?? null,
      e.valid_until ?? null, e.invalidated_by ?? null
    );
    appliedEdges++;
  }
  for (const s of canonOverlay.supersede_edges ?? []) {
    const result = supersedeEdge.run(s.valid_until, s.invalidated_by, s.edge_id);
    if (result.changes > 0) appliedSupersessions++;
  }
  db.exec("COMMIT");
  console.log(
    `Canon overlay applied: ${appliedSignals} signals, ${appliedNodes} nodes, ` +
    `${appliedEdges} edges, ${appliedSupersessions} supersessions from seed/canon_overlay.json`
  );
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
