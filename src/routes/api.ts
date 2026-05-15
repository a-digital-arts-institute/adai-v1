import { Router } from "express";
import crypto from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "../db.js";
import { HTML_HEADERS, JSON_HEADERS } from "../templates.js";
import {
  materialiseCreateNode,
  materialisePatchNode,
  materialiseAttachImage,
  materialiseEdge,
} from "../utils/contribution.js";
import { buildEmbeddingSections } from "../embed/sections.js";
import { YEAR_SQL_FRAGMENT, formatArtworkYear } from "../utils/year.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");

const router = Router();

// GET /api/stats
router.get("/api/stats", (_req, res) => {
  const db = getDb();
  const { count: totalNodes } = db.prepare("SELECT COUNT(*) as count FROM nodes").get() as any;
  const { count: totalEdges } = db.prepare("SELECT COUNT(*) as count FROM edges").get() as any;
  const { count: totalSignals } = db.prepare("SELECT COUNT(*) as count FROM signals").get() as any;
  const { count: pendingReviews } = db
    .prepare("SELECT COUNT(*) as count FROM intake_queue WHERE status = 'pending'")
    .get() as any;

  res.set(JSON_HEADERS).json({
    total_nodes: totalNodes,
    total_edges: totalEdges,
    total_signals: totalSignals,
    pending_reviews: pendingReviews,
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
    YEAR_SQL_FRAGMENT;

  let nodeRows: any[];
  if (!typeFilter) {
    // Include scenes in the default view — they are the primary connective
    // tissue for ~22 practitioners (Paul-canon pass, April 28). Filtering
    // them out makes those practitioners appear orphan when zoomed out.
    nodeRows = db
      .prepare(`SELECT ${NODE_COLS} FROM nodes WHERE type != 'related' ORDER BY name`)
      .all();
  } else if (typeFilter === "_all") {
    nodeRows = db
      .prepare(`SELECT ${NODE_COLS} FROM nodes WHERE type != 'related' ORDER BY name`)
      .all();
  } else {
    nodeRows = db
      .prepare(`SELECT ${NODE_COLS} FROM nodes WHERE type = ? ORDER BY name`)
      .all(typeFilter);
  }

  let edgeRows: any[];
  if (!typeFilter) {
    edgeRows = db
      .prepare(
        "SELECT e.source_id, e.target_id, e.edge_type, e.confidence, e.created_by FROM edges e WHERE e.valid_until IS NULL AND e.source_id IN (SELECT id FROM nodes WHERE type != 'related') AND e.target_id IN (SELECT id FROM nodes WHERE type != 'related')"
      )
      .all();
  } else if (typeFilter === "_all") {
    edgeRows = db
      .prepare(
        "SELECT e.source_id, e.target_id, e.edge_type, e.confidence, e.created_by FROM edges e WHERE e.valid_until IS NULL AND e.source_id IN (SELECT id FROM nodes WHERE type != 'related') AND e.target_id IN (SELECT id FROM nodes WHERE type != 'related')"
      )
      .all();
  } else {
    edgeRows = db
      .prepare(
        "SELECT e.source_id, e.target_id, e.edge_type, e.confidence, e.created_by FROM edges e WHERE e.valid_until IS NULL AND e.source_id IN (SELECT id FROM nodes WHERE type = ?) AND e.target_id IN (SELECT id FROM nodes WHERE type = ?)"
      )
      .all(typeFilter, typeFilter);
  }

  res.set(JSON_HEADERS).json({
    nodes: nodeRows.map((n: any) => {
      const year = n.type === "artwork" ? formatArtworkYear(n) : null;
      return {
        id: n.id,
        name: n.name,
        type: n.type,
        slug: n.slug,
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

  const nodeRows = db.prepare(`SELECT ${NODE_COLS} FROM nodes`).all() as any[];
  const nodeById = new Map<string, any>();
  for (const n of nodeRows) nodeById.set(n.id, n);

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

// Hash a rejected (source, edge_type, target) triple so the embedding
// derive pass can skip pairs the curator has already vetoed. Matches the
// pairHash convention in src/embed/derive.ts.
const sha256Hex = (s: string): string =>
  crypto.createHash("sha256").update(s).digest("hex");

// POST /api/review/:id/approve
router.post("/api/review/:id/approve", (req, res) => {
  const db = getDb();
  const id = req.params.id;

  const item = db
    .prepare(
      "SELECT id, signal_id, target_node, submitted_by, kind, proposed_edges, proposed_nodes FROM intake_queue WHERE id = ? AND status = 'pending'"
    )
    .get(id) as any;

  if (!item) {
    res.status(404).set(JSON_HEADERS).json({ error: "not found or already reviewed" });
    return;
  }

  // For AI-suggestion items, materialise the proposed edge into the live
  // graph. The `proposed_edges` column carries a JSON array of edge specs
  // produced by the embedding derive pass.
  if (item.kind === "ai_suggestion" && item.proposed_edges) {
    let proposals: Array<{ source_id: string; target_id: string; edge_type: string; similarity?: number }> = [];
    try {
      proposals = JSON.parse(item.proposed_edges);
    } catch {
      res.status(500).set(JSON_HEADERS).json({ error: "proposed_edges is not valid JSON" });
      return;
    }
    const insertEdge = db.prepare(
      `INSERT INTO edges (
         id, source_id, target_id, edge_type, signal_id,
         confidence, charge, created_at, created_by,
         event_time, valid_from, valid_until, invalidated_by
       ) VALUES (?, ?, ?, ?, ?, 'medium', NULL,
                 strftime('%Y-%m-%dT%H:%M:%SZ','now'), 'curator-from-ai-suggestion',
                 NULL, strftime('%Y-%m-%dT%H:%M:%SZ','now'), NULL, NULL)`
    );
    for (const p of proposals) {
      const edgeId = `${p.source_id}--${p.edge_type}--${p.target_id}--curator-from-ai-suggestion`;
      insertEdge.run(edgeId, p.source_id, p.target_id, p.edge_type, item.signal_id);
    }
  }

  // For human_signal items submitted via /api/v1/*, materialise the queued
  // payload. Shape matches the helpers in src/utils/contribution.ts —
  // proposed_nodes is a discriminated array (create_node / patch_node /
  // attach_image), proposed_edges is a flat list of edge specs (may carry
  // supersedes_edge_id for bi-temporal supersession).
  if (item.kind === "human_signal") {
    const createdBy = `curator-from-${item.submitted_by ?? "api"}`;
    if (item.proposed_nodes) {
      let ops: any[] = [];
      try { ops = JSON.parse(item.proposed_nodes); } catch { ops = []; }
      for (const op of ops) {
        if (op?.op === "create_node") {
          materialiseCreateNode(db, op, { signalId: item.signal_id, createdBy });
        } else if (op?.op === "patch_node") {
          materialisePatchNode(db, op, { createdBy });
        } else if (op?.op === "attach_image") {
          materialiseAttachImage(db, op, { createdBy });
        }
      }
    }
    if (item.proposed_edges) {
      let edges: any[] = [];
      try { edges = JSON.parse(item.proposed_edges); } catch { edges = []; }
      for (const e of edges) {
        materialiseEdge(db, { ...e, signal_id: item.signal_id }, { signalId: item.signal_id, createdBy });
      }
    }
  }

  db.prepare(
    "UPDATE intake_queue SET status = 'approved', reviewed_by = 'curator', reviewed_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?"
  ).run(id);

  db.prepare("UPDATE contributors SET approved_count = approved_count + 1 WHERE name = ?").run(item.submitted_by);

  res.set(HTML_HEADERS).send("<div class='msg msg-ok'>Approved and is now live.</div>");
});

// POST /api/review/:id/reject
router.post("/api/review/:id/reject", (req, res) => {
  const db = getDb();
  const id = req.params.id;
  const reason = req.body?.reason;

  if (!reason) {
    res.status(400).set(JSON_HEADERS).json({ error: "reason is required" });
    return;
  }

  const item = db
    .prepare(
      "SELECT id, kind, proposed_edges FROM intake_queue WHERE id = ? AND status = 'pending'"
    )
    .get(id) as any;
  if (!item) {
    res.status(404).set(JSON_HEADERS).json({ error: "not found or already reviewed" });
    return;
  }

  // For AI suggestions, record the rejected pair in rejected_ai_suggestions
  // so the next derive pass won't re-propose it. Hash is sha256(source||
  // type||target) — same convention as src/embed/derive.ts.
  if (item.kind === "ai_suggestion" && item.proposed_edges) {
    let proposals: Array<{ source_id: string; target_id: string; edge_type: string }> = [];
    try {
      proposals = JSON.parse(item.proposed_edges);
    } catch {
      proposals = [];
    }
    const insertRej = db.prepare(
      `INSERT OR REPLACE INTO rejected_ai_suggestions
         (pair_hash, source_id, target_id, edge_type, reason)
         VALUES (?, ?, ?, ?, ?)`
    );
    for (const p of proposals) {
      const h = sha256Hex(`${p.source_id}|${p.edge_type}|${p.target_id}`);
      insertRej.run(h, p.source_id, p.target_id, p.edge_type, reason);
    }
  }

  db.prepare(
    "UPDATE intake_queue SET status = 'rejected', rejection_reason = ?, reviewed_by = 'curator', reviewed_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?"
  ).run(reason, id);

  res.set(HTML_HEADERS).send("<div class='msg msg-err'>Rejected.</div>");
});

// GET /api/embed-space — UMAP 2D projection joined with node metadata.
// Reads the precomputed sidecar `seed/embeddings.umap2d.json` (produced
// offline by `seed/_build/project_umap.py` — see CLAUDE.md) and joins
// each point with name/type/slug/cdn_image_url for client rendering.
//
// Cached at module scope after first read since the sidecar is static.
let umapCache: any = null;

router.get("/api/embed-space", (_req, res) => {
  const db = getDb();
  if (!umapCache) {
    const umapPath = join(PROJECT_ROOT, "seed", "embeddings.umap2d.json");
    if (!existsSync(umapPath)) {
      res.status(404).set(JSON_HEADERS).json({
        error: "UMAP projection not available",
        hint: "Run `seed/_build/.venv/bin/python3 seed/_build/project_umap.py` to produce seed/embeddings.umap2d.json",
      });
      return;
    }
    const raw = JSON.parse(readFileSync(umapPath, "utf-8"));
    const ids = raw.items.map((i: any) => i.node_id);
    // One IN-query for all metadata in one hop (~1300 rows).
    const placeholders = ids.map(() => "?").join(",");
    const meta = db
      .prepare(
        `SELECT id, name, type, slug,
                json_extract(metadata,'$.cdn_image_url') AS cdn_image_url,
                json_extract(metadata,'$.image_url')     AS image_url,
                ${YEAR_SQL_FRAGMENT}
           FROM nodes WHERE id IN (${placeholders})`
      )
      .all(...ids) as Array<{
        id: string; name: string; type: string; slug: string;
        cdn_image_url: string | null; image_url: string | null;
        year_raw: string | null; year_start: number | null;
        year_end: number | null; year_ongoing: number | null;
        active_years_1: string | null; active_years_2: string | null;
      }>;
    const byId = new Map(meta.map((m) => [m.id, m]));
    const items = raw.items.map((p: any) => {
      const m = byId.get(p.node_id);
      const year = m && m.type === "artwork" ? formatArtworkYear(m) : null;
      return {
        id: p.node_id,
        kind: p.kind,
        x: p.x,
        y: p.y,
        ...(m
          ? {
              name: m.name,
              type: m.type,
              slug: m.slug,
              ...(year ? { year } : {}),
              ...(m.cdn_image_url ? { cdn_image_url: m.cdn_image_url } : {}),
              ...(m.image_url ? { image_url: m.image_url } : {}),
            }
          : {}),
      };
    });
    umapCache = {
      model: raw.model,
      method: raw.method,
      params: raw.params,
      n_items: items.length,
      items,
    };
  }
  res.set(JSON_HEADERS).json(umapCache);
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
