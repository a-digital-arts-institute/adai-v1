import { Router } from "express";
import crypto from "node:crypto";
import { createGzip } from "node:zlib";
import { getDb } from "../db.js";
import { HTML_HEADERS, JSON_HEADERS } from "../templates.js";
import { approveIntakeItem, rejectIntakeItem } from "../utils/review.js";
import { buildEmbeddingSections } from "../embed/sections.js";
import { YEAR_SQL_FRAGMENT, formatArtworkYear } from "../utils/year.js";
import { NODE_NOT_RETIRED } from "../utils/visibility.js";
import { sourceLabel } from "../utils/source-label.js";

// SQL fragment that exposes the two metadata keys sourceLabel() reads. Kept
// next to the helper so the projection and the deriver can't drift.
const SOURCE_SQL_FRAGMENT =
  "json_extract(metadata,'$.source_url') AS source_url, " +
  "json_extract(metadata,'$.va_maker_name') AS va_maker_name";

const router = Router();

// Tag stamped on every embedding-derived edge by src/embed/derive.ts
// (CREATED_BY_TAG). The /field streaming loader splits these out of the initial
// payload and lazy-loads them only when the user enters embeddings ('e') mode.
const DERIVED_CREATED_BY = "embedding-multimodal-v1";

// Visible-node clause shared by /api/stats and the /api/graph* family.
// Retired nodes (admin correction — see src/utils/visibility.ts) and the
// reserved 'related' type are filtered from every listing surface.
const VISIBLE_NODES = `type != 'related' AND ${NODE_NOT_RETIRED}`;

// GET /api/stats
router.get("/api/stats", (_req, res) => {
  const db = getDb();
  // total_nodes is PINNED to /api/graph/stream's node WHERE clause — the
  // /field worker stamps its IndexedDB cache on `${total_nodes}:${curated_edges}`
  // and compares it to the stream's `${nodes}:${edges}` meta. Diverge these
  // and the cache never validates (every visit re-streams).
  const { count: totalNodes } = db.prepare(`SELECT COUNT(*) as count FROM nodes WHERE ${VISIBLE_NODES}`).get() as any;
  const { count: totalEdges } = db.prepare("SELECT COUNT(*) as count FROM edges").get() as any;
  const { count: totalSignals } = db.prepare("SELECT COUNT(*) as count FROM signals").get() as any;
  const { count: pendingReviews } = db
    .prepare("SELECT COUNT(*) as count FROM intake_queue WHERE status = 'pending'")
    .get() as any;

  // Split the *live* (valid_until IS NULL) edge count into curated vs the
  // embedding-derived overlay. The /field streaming loader stamps its
  // IndexedDB cache on (nodes, curated_edges) so a nightly re-derive — which
  // only changes derived_edges — doesn't needlessly invalidate the curated
  // graph cache; the derived layer is lazy-loaded and stamped separately.
  //
  // curated_edges MUST be computed with the exact same WHERE clause as
  // /api/graph/stream's edge query (live, non-derived, both endpoints
  // non-'related') — the stamp it forms (`${nodes}:${curated_edges}`) has to
  // equal the stream's meta stamp, or the IndexedDB cache never validates and
  // every visit re-streams. 'related' is reserved/empty today so the related
  // filter is a no-op, but pinning the clauses together keeps it that way.
  const { count: curatedEdges } = db
    .prepare(
      `SELECT COUNT(*) as count FROM edges e
       WHERE e.valid_until IS NULL
         AND e.created_by IS NOT '${DERIVED_CREATED_BY}'
         AND e.source_id IN (SELECT id FROM nodes WHERE ${VISIBLE_NODES})
         AND e.target_id IN (SELECT id FROM nodes WHERE ${VISIBLE_NODES})`
    )
    .get() as any;
  // Pinned to /api/graph/derived's WHERE clause for the same stamp reason.
  const { count: derivedEdges } = db
    .prepare(
      `SELECT COUNT(*) as count FROM edges e
       WHERE e.valid_until IS NULL
         AND e.created_by = '${DERIVED_CREATED_BY}'
         AND e.source_id IN (SELECT id FROM nodes WHERE ${VISIBLE_NODES})
         AND e.target_id IN (SELECT id FROM nodes WHERE ${VISIBLE_NODES})`
    )
    .get() as any;

  res.set(JSON_HEADERS).json({
    total_nodes: totalNodes,
    total_edges: totalEdges,
    total_signals: totalSignals,
    pending_reviews: pendingReviews,
    curated_edges: curatedEdges,
    derived_edges: derivedEdges,
  });
});

// GET /api/graph — full graph as D3-compatible JSON
router.get("/api/graph", (req, res) => {
  const db = getDb();
  const typeFilter = (req.query.type as string) || "";

  const NODE_COLS =
    "id, name, type, slug, " +
    "json_extract(metadata,'$.image_url') AS image_url, " +
    "json_extract(metadata,'$.cdn_image_url') AS cdn_image_url, " +
    SOURCE_SQL_FRAGMENT + ", " +
    YEAR_SQL_FRAGMENT;

  let nodeRows: any[];
  if (!typeFilter || typeFilter === "_all") {
    // Include scenes in the default view — they are the primary connective
    // tissue for ~22 practitioners (Paul-canon pass, April 28). Filtering
    // them out makes those practitioners appear orphan when zoomed out.
    nodeRows = db
      .prepare(`SELECT ${NODE_COLS} FROM nodes WHERE ${VISIBLE_NODES} ORDER BY name`)
      .all();
  } else {
    nodeRows = db
      .prepare(`SELECT ${NODE_COLS} FROM nodes WHERE type = ? AND ${NODE_NOT_RETIRED} ORDER BY name`)
      .all(typeFilter);
  }

  let edgeRows: any[];
  if (!typeFilter || typeFilter === "_all") {
    edgeRows = db
      .prepare(
        `SELECT e.source_id, e.target_id, e.edge_type, e.confidence, e.created_by FROM edges e WHERE e.valid_until IS NULL AND e.source_id IN (SELECT id FROM nodes WHERE ${VISIBLE_NODES}) AND e.target_id IN (SELECT id FROM nodes WHERE ${VISIBLE_NODES})`
      )
      .all();
  } else {
    edgeRows = db
      .prepare(
        `SELECT e.source_id, e.target_id, e.edge_type, e.confidence, e.created_by FROM edges e WHERE e.valid_until IS NULL AND e.source_id IN (SELECT id FROM nodes WHERE type = ? AND ${NODE_NOT_RETIRED}) AND e.target_id IN (SELECT id FROM nodes WHERE type = ? AND ${NODE_NOT_RETIRED})`
      )
      .all(typeFilter, typeFilter);
  }

  res.set(JSON_HEADERS).json({
    nodes: nodeRows.map((n: any) => {
      const year = n.type === "artwork" ? formatArtworkYear(n) : null;
      const source = sourceLabel(n);
      return {
        id: n.id,
        name: n.name,
        type: n.type,
        slug: n.slug,
        ...(source ? { source } : {}),
        // Exact upstream page for the label — lets the client link "source:
        // fxhash" to the actual work page, not just https://<host>.
        ...(source && n.source_url ? { source_url: n.source_url } : {}),
        ...(year ? { year } : {}),
        ...(n.cdn_image_url ? { cdn_image_url: n.cdn_image_url } : {}),
        ...(n.image_url ? { image_url: n.image_url } : {}),
      };
    }),
    edges: edgeRows.map((e: any) => ({
      source: e.source_id,
      target: e.target_id,
      type: e.edge_type,
      confidence: e.confidence,
      created_by: e.created_by,
    })),
  });
});

// GET /api/graph/stream — the /field graph as newline-delimited JSON (NDJSON).
//
// Same projection as /api/graph but (a) streamed line-by-line so the client
// can parse + index in a Web Worker as bytes arrive (no 9 MB main-thread
// JSON.parse freeze), and (b) CURATED-ONLY by default — the ~10k derived
// STYLE_KIN / VISUALLY_AFFINE edges are excluded and lazy-loaded via
// /api/graph/derived when the user enters embeddings mode.
//
// Wire format, one JSON object per line:
//   {"meta":{"nodes":N,"edges":M,"stamp":"N:M"}}   ← always first
//   {"n":{id,name,type,slug,year?,cdn_image_url?,image_url?}}
//   {"e":{source,target,type,confidence,created_by}}
//
// stamp = `${nodes}:${curated_edges}` — matches /api/stats so the worker can
// check its IndexedDB cache (via /api/stats) before deciding to stream.
router.get("/api/graph/stream", (req, res) => {
  const db = getDb();
  const NODE_COLS =
    "id, name, type, slug, " +
    "json_extract(metadata,'$.image_url') AS image_url, " +
    "json_extract(metadata,'$.cdn_image_url') AS cdn_image_url, " +
    // tag_origin distinguishes the ~100 fxhash artist-tag concepts (folksonomy)
    // from the ~8 wikidata-anchored base concepts (the real fields). The field
    // view colours them differently — see colorForNode() in graph-field.js.
    "json_extract(metadata,'$.tag_origin') AS tag_origin, " +
    // source_url / va_maker_name feed sourceLabel() → the entity-view footer's
    // real "source: …" attribution (replaces the old graph-stub placeholder).
    SOURCE_SQL_FRAGMENT + ", " +
    YEAR_SQL_FRAGMENT;

  // Node + edge WHERE clauses are PINNED to /api/stats total_nodes /
  // curated_edges — together they form the IndexedDB cache stamp. Change
  // one, change both.
  const nodeRows = db
    .prepare(`SELECT ${NODE_COLS} FROM nodes WHERE ${VISIBLE_NODES} ORDER BY name`)
    .all() as any[];
  const edgeRows = db
    .prepare(
      `SELECT e.source_id, e.target_id, e.edge_type, e.confidence, e.created_by
       FROM edges e
       WHERE e.valid_until IS NULL
         AND e.created_by IS NOT '${DERIVED_CREATED_BY}'
         AND e.source_id IN (SELECT id FROM nodes WHERE ${VISIBLE_NODES})
         AND e.target_id IN (SELECT id FROM nodes WHERE ${VISIBLE_NODES})`
    )
    .all() as any[];

  // Per-node "intention" = count of distinct curated edge types touching it.
  // The client's /field layout orders nodes BEFORE edges arrive (artworks by
  // `year`, everything else by intention) — that's what lets the worker
  // render the node constellation progressively (nodes first) while the edges
  // (67% of the payload, only needed on zoom) are still streaming.
  const typesByNode = new Map<string, Set<string>>();
  for (const e of edgeRows) {
    let s = typesByNode.get(e.source_id); if (!s) { s = new Set(); typesByNode.set(e.source_id, s); }
    let t = typesByNode.get(e.target_id); if (!t) { t = new Set(); typesByNode.set(e.target_id, t); }
    s.add(e.edge_type); t.add(e.edge_type);
  }

  // Compress at the app level. Fly's edge does NOT compress chunked/streamed
  // responses, so without this the raw NDJSON ships at ~7 MB (vs ~1 MB gzipped)
  // — 7× the wire transfer, which dominates load time. gzip is a Transform
  // stream, so the response stays chunked/streamed; the worker still parses
  // incrementally. gzip (not brotli) keeps CPU low on the 1-core Fly machine.
  const acceptsGzip = /\bgzip\b/.test(String(req.headers["accept-encoding"] || ""));
  res.set({
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-cache",
  });
  let sink: NodeJS.WritableStream = res;
  if (acceptsGzip) {
    res.set("Content-Encoding", "gzip");
    res.set("Vary", "Accept-Encoding");
    const gzip = createGzip();
    gzip.pipe(res);
    sink = gzip;
  }

  // Batch writes (~64 KB) so we don't issue one syscall per row.
  let buf = "";
  const FLUSH_AT = 64 * 1024;
  const push = (obj: unknown) => {
    buf += JSON.stringify(obj) + "\n";
    if (buf.length >= FLUSH_AT) {
      sink.write(buf);
      buf = "";
    }
  };

  push({ meta: { nodes: nodeRows.length, edges: edgeRows.length, stamp: `${nodeRows.length}:${edgeRows.length}` } });
  for (const n of nodeRows) {
    const year = n.type === "artwork" ? formatArtworkYear(n) : null;
    const intention = typesByNode.get(n.id)?.size ?? 0;
    const source = sourceLabel(n);
    push({
      n: {
        id: n.id,
        name: n.name,
        type: n.type,
        slug: n.slug,
        int: intention,
        ...(source ? { source } : {}),
        // Exact upstream page for the label — the entity-view footer links
        // "source: fxhash" to the actual work page, not just https://<host>.
        // Cached clients on the old projection fall back to https://<label>.
        ...(source && n.source_url ? { source_url: n.source_url } : {}),
        ...(year ? { year } : {}),
        // Prefer the R2 cdn; only ship the upstream image_url when there's no
        // cdn (the client falls cdn -> image_url, so the upstream is redundant
        // when a cdn exists — ~4.7k nodes worth of long URLs saved).
        ...(n.cdn_image_url
          ? { cdn_image_url: n.cdn_image_url }
          : n.image_url
            ? { image_url: n.image_url }
            : {}),
        // Only concepts ever carry tag_origin; shipped so the field view can
        // tell a folksonomy tag-concept from a real field at colour time.
        ...(n.tag_origin ? { tag_origin: n.tag_origin } : {}),
      },
    });
  }
  // created_by is omitted — every curated edge carries the same constant
  // ('contributor:migration') and the client filters by type, not provenance.
  for (const e of edgeRows) {
    push({ e: { source: e.source_id, target: e.target_id, type: e.edge_type, confidence: e.confidence } });
  }
  if (buf) sink.write(buf);
  sink.end();
});

// GET /api/graph/derived — ONLY the embedding-derived edges (STYLE_KIN /
// VISUALLY_AFFINE), as one JSON payload. Lazy-loaded by /field the first time
// the user enters embeddings ('e') mode; merged into the already-indexed graph
// client-side. Small enough (~10k edges) not to need streaming.
router.get("/api/graph/derived", (_req, res) => {
  const db = getDb();
  const edgeRows = db
    .prepare(
      `SELECT e.source_id, e.target_id, e.edge_type, e.confidence, e.created_by
       FROM edges e
       WHERE e.valid_until IS NULL
         AND e.created_by = '${DERIVED_CREATED_BY}'
         AND e.source_id IN (SELECT id FROM nodes WHERE ${VISIBLE_NODES})
         AND e.target_id IN (SELECT id FROM nodes WHERE ${VISIBLE_NODES})`
    )
    .all() as any[];
  res.set(JSON_HEADERS).json({
    stamp: String(edgeRows.length),
    edges: edgeRows.map((e: any) => ({
      source: e.source_id,
      target: e.target_id,
      type: e.edge_type,
      confidence: e.confidence,
      created_by: e.created_by,
    })),
  });
});

// GET /api/graph/:slug/component — full connected component reachable from :slug
router.get("/api/graph/:slug/component", (req, res) => {
  const db = getDb();
  const slug = req.params.slug;
  const maxNodes = Math.min(Math.max(parseInt((req.query.max_nodes as string) || "800", 10) || 800, 1), 5000);

  const NODE_COLS =
    "id, name, type, slug, " +
    "json_extract(metadata,'$.image_url') AS image_url, " +
    "json_extract(metadata,'$.cdn_image_url') AS cdn_image_url, " +
    YEAR_SQL_FRAGMENT;

  const start = db.prepare(`SELECT ${NODE_COLS} FROM nodes WHERE slug = ?`).get(slug) as any;
  if (!start) {
    res.status(404).set(JSON_HEADERS).json({ error: "not found" });
    return;
  }

  const nodeRows = db.prepare(`SELECT ${NODE_COLS} FROM nodes WHERE ${NODE_NOT_RETIRED}`).all() as any[];
  const nodeById = new Map<string, any>();
  for (const n of nodeRows) nodeById.set(n.id, n);
  // The start node always hydrates, even when retired — direct inspection of
  // a husk is allowed; only listings filter it. (Its edges are superseded at
  // retire time, so the BFS goes nowhere either way.)
  nodeById.set(start.id, start);

  const edgeRows = db
    .prepare("SELECT source_id, target_id, edge_type, confidence, created_by FROM edges WHERE valid_until IS NULL")
    .all() as any[];

  const adj = new Map<string, Array<{ other: string; e: any }>>();
  for (const e of edgeRows) {
    if (!adj.has(e.source_id)) adj.set(e.source_id, []);
    if (!adj.has(e.target_id)) adj.set(e.target_id, []);
    adj.get(e.source_id)!.push({ other: e.target_id, e });
    adj.get(e.target_id)!.push({ other: e.source_id, e });
  }

  const visited = new Set<string>([start.id]);
  const queue: string[] = [start.id];
  const edgesOut: any[] = [];
  const seenEdgeKeys = new Set<string>();
  let truncated = false;

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const neighbours = adj.get(cur) || [];
    for (const { other, e } of neighbours) {
      const ek = `${e.source_id}|${e.target_id}|${e.edge_type}`;
      if (!seenEdgeKeys.has(ek)) {
        seenEdgeKeys.add(ek);
        edgesOut.push({ source: e.source_id, target: e.target_id, type: e.edge_type, confidence: e.confidence, created_by: e.created_by });
      }
      if (!visited.has(other)) {
        if (visited.size >= maxNodes) {
          truncated = true;
          continue;
        }
        visited.add(other);
        queue.push(other);
      }
    }
  }

  const nodes: any[] = [];
  for (const id of visited) {
    const n = nodeById.get(id);
    if (n) {
      const year = n.type === "artwork" ? formatArtworkYear(n) : null;
      nodes.push({
        id: n.id,
        name: n.name,
        type: n.type,
        slug: n.slug,
        center: n.id === start.id,
        ...(year ? { year } : {}),
        ...(n.cdn_image_url ? { cdn_image_url: n.cdn_image_url } : {}),
        ...(n.image_url ? { image_url: n.image_url } : {}),
      });
    }
  }

  res.set(JSON_HEADERS).json({ nodes, edges: edgesOut, truncated, start_id: start.id });
});

// GET /api/graph/:slug — ego graph (1-hop)
router.get("/api/graph/:slug", (req, res) => {
  const db = getDb();
  const slug = req.params.slug;

  const NODE_COLS =
    "id, name, type, slug, " +
    "json_extract(metadata,'$.image_url') AS image_url, " +
    "json_extract(metadata,'$.cdn_image_url') AS cdn_image_url, " +
    YEAR_SQL_FRAGMENT;

  const node = db.prepare(`SELECT ${NODE_COLS} FROM nodes WHERE slug = ?`).get(slug) as any;
  if (!node) {
    res.status(404).set(JSON_HEADERS).json({ error: "not found" });
    return;
  }

  const projectNode = (n: any, extra: Record<string, unknown> = {}) => {
    const year = n.type === "artwork" ? formatArtworkYear(n) : null;
    return {
      id: n.id,
      name: n.name,
      type: n.type,
      slug: n.slug,
      ...extra,
      ...(year ? { year } : {}),
      ...(n.cdn_image_url ? { cdn_image_url: n.cdn_image_url } : {}),
      ...(n.image_url ? { image_url: n.image_url } : {}),
    };
  };

  const nodes: any[] = [projectNode(node, { center: true })];

  const edgeRows = db
    .prepare("SELECT source_id, target_id, edge_type, confidence, created_by FROM edges WHERE valid_until IS NULL AND (source_id = ? OR target_id = ?)")
    .all(node.id, node.id) as any[];

  const edges: any[] = [];
  for (const e of edgeRows) {
    edges.push({
      source: e.source_id,
      target: e.target_id,
      type: e.edge_type,
      confidence: e.confidence,
      created_by: e.created_by,
    });

    const neighborId = e.source_id === node.id ? e.target_id : e.source_id;
    const nb = db.prepare(`SELECT ${NODE_COLS} FROM nodes WHERE id = ?`).get(neighborId) as any;
    if (nb && !nodes.some((n) => n.id === nb.id)) {
      nodes.push(projectNode(nb));
    }
  }

  res.set(JSON_HEADERS).json({ nodes, edges });
});

// POST /api/contribute — submit a signal
router.post("/api/contribute", (req, res) => {
  const db = getDb();
  const { target_node, title, content, source_url, contributor_name, consent_scope, consent_attribution } = req.body;

  const signalId = `signal-${crypto.randomBytes(8).toString("hex")}`;
  const intakeId = `intake-${crypto.randomBytes(8).toString("hex")}`;

  let trustTier = "probationary";
  const contrib = db.prepare("SELECT trust_tier FROM contributors WHERE name = ?").get(contributor_name) as any;
  if (contrib) trustTier = contrib.trust_tier;

  const scope = consent_scope === "structural_only" ? "structural_only" : "full_commons";
  const attribution =
    consent_attribution === "anonymous" || consent_attribution === "attributed_with_notification"
      ? consent_attribution
      : "attributed";

  db.prepare(
    "INSERT INTO signals (id, title, source_url, source_type, cla_layer, summary, content, submitted_by, confidence, lived_experience, consent_scope, consent_attribution, source_origin) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(signalId, title, source_url || null, "contribution", null, null, content, contributor_name, trustTier, 0, scope, attribution, "human_primary");

  const intakeStatus = trustTier === "auto" || trustTier === "reviewed" ? "approved" : "pending";

  db.prepare(
    "INSERT INTO intake_queue (id, signal_id, target_node, submitted_by, trust_tier, status) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(intakeId, signalId, target_node, contributor_name, trustTier, intakeStatus);

  const existing = db.prepare("SELECT id FROM contributors WHERE name = ?").get(contributor_name) as any;
  if (!existing) {
    const contribId = `contributor-${crypto.randomBytes(8).toString("hex")}`;
    db.prepare(
      "INSERT INTO contributors (id, name, type, trust_tier, contributions, approved_count) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(contribId, contributor_name, "contributor", "probationary", 1, 0);
  } else {
    db.prepare("UPDATE contributors SET contributions = contributions + 1 WHERE name = ?").run(contributor_name);
  }

  const responseHtml =
    intakeStatus === "approved"
      ? "<div class='msg msg-ok'>Signal submitted and auto-approved (reviewed contributor). It is now live.</div>"
      : "<div class='msg msg-ok'>Signal submitted successfully. It has been queued for review.</div>";

  res.set(HTML_HEADERS).send(responseHtml);
});

// POST /api/connect — beta-programme email signup from the /field "Connect"
// room ("Enter the Beta"). Stores {email, role, note} in the local
// beta_signups table (db.sql). Public + unauthenticated like /api/contribute;
// visitor-facing, so it returns JSON the panel renders as its success state.
// Idempotent on email (UNIQUE) — a repeat submit reads back as already-listed.
const CONNECT_ROLES = new Set(["artist", "curator", "institution", "collector", "builder"]);
const CONNECT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
router.post("/api/connect", (req, res) => {
  const db = getDb();
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!CONNECT_EMAIL_RE.test(email) || email.length > 254) {
    res.status(400).set(JSON_HEADERS).json({ ok: false, error: "invalid_email" });
    return;
  }
  const roleRaw = typeof req.body?.role === "string" ? req.body.role.trim().toLowerCase() : "";
  const role = CONNECT_ROLES.has(roleRaw) ? roleRaw : null;
  const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 500) || null : null;

  const existing = db.prepare("SELECT id FROM beta_signups WHERE email = ?").get(email) as any;
  if (existing) {
    res.set(JSON_HEADERS).json({ ok: true, already: true });
    return;
  }
  const id = `beta-${crypto.randomBytes(8).toString("hex")}`;
  db.prepare(
    "INSERT OR IGNORE INTO beta_signups (id, email, role, note, source) VALUES (?, ?, ?, ?, ?)"
  ).run(id, email, role, note, "field_connect");
  res.set(JSON_HEADERS).json({ ok: true, already: false });
});

// POST /api/review/:id/approve — thin HTML wrapper over the shared
// approve logic in src/utils/review.ts (also used by the admin JSON
// endpoints in contributor-api.ts).
router.post("/api/review/:id/approve", (req, res) => {
  const db = getDb();
  const outcome = approveIntakeItem(db, req.params.id, "curator");
  if (!outcome.ok) {
    res.status(outcome.status).set(JSON_HEADERS).json({ error: outcome.error });
    return;
  }
  res.set(HTML_HEADERS).send("<div class='msg msg-ok'>Approved and is now live.</div>");
});

// POST /api/review/:id/reject — thin HTML wrapper over the shared reject
// logic in src/utils/review.ts.
router.post("/api/review/:id/reject", (req, res) => {
  const db = getDb();
  const reason = req.body?.reason;
  if (!reason) {
    res.status(400).set(JSON_HEADERS).json({ error: "reason is required" });
    return;
  }
  const outcome = rejectIntakeItem(db, req.params.id, reason, "curator");
  if (!outcome.ok) {
    res.status(outcome.status).set(JSON_HEADERS).json({ error: outcome.error });
    return;
  }
  res.set(HTML_HEADERS).send("<div class='msg msg-err'>Rejected.</div>");
});

// GET /api/islands — latent k-means cluster id per node. Reads the local
// node_islands table (rewritten each embed:derive run from the identity
// vectors — see src/embed/islands.ts).
//
// ⚠️ Currently UNCONSUMED: /field briefly grouped nodes into contiguous
// island regions of the Shape of Time (June 2026), but feedback sent the
// 30k view back to the artist's structured field-flow layout, so
// graph-field.js no longer fetches this. The endpoint + derive stage are
// kept so a future surface can re-adopt the latent geography cheaply.
// Returns {k:0, n:0} when derive hasn't run yet.
router.get("/api/islands", (_req, res) => {
  const db = getDb();
  let rows: Array<{ node_id: string; island: number }> = [];
  try {
    rows = db
      .prepare("SELECT node_id, island FROM node_islands")
      .all() as Array<{ node_id: string; island: number }>;
  } catch {
    // Table absent (pre-migration boot) — treat as "no islands yet".
    rows = [];
  }
  const islands: Record<string, number> = {};
  let k = 0;
  for (const r of rows) {
    islands[r.node_id] = r.island;
    if (r.island + 1 > k) k = r.island + 1;
  }
  res.set(JSON_HEADERS).json({ k, n: rows.length, islands });
});

// GET /api/neighbours/:type/:slug — embedding-derived sections for a node.
//
// Returns the same "Style kin / Visually affine / Style proximity / Closest
// artworks / AI-suggested attributions" cards that the HTML profile pages
// render (`renderEmbeddingSections` in src/routes/pages.ts), in machine form
// so the /field overlays (1k entity view + 10k zoom strip) can fetch and
// render them client-side.
//
// Slug-only lookup (the type segment is decorative, like the other polymorphic
// endpoints) so the client doesn't need to know about colon-id internals.
function neighboursHandler(req: any, res: any) {
  const db = getDb();
  const slug = req.params.slug;

  const node = db
    .prepare("SELECT id, name, type, slug FROM nodes WHERE slug = ?")
    .get(slug) as
    | { id: string; name: string; type: string; slug: string }
    | undefined;
  if (!node) {
    res.status(404).set(JSON_HEADERS).json({ error: "not found" });
    return;
  }

  const sections = buildEmbeddingSections(db, node);
  res.set(JSON_HEADERS).json({
    node: { id: node.id, name: node.name, type: node.type, slug: node.slug },
    sections,
  });
}

// Polymorphic registration matches the rest of the slug-keyed surface.
router.get("/api/neighbours/:type/:slug", neighboursHandler);

export default router;
