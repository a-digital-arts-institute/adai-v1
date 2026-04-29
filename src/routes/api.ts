import { Router } from "express";
import crypto from "node:crypto";
import { getDb } from "../db.js";
import { HTML_HEADERS, JSON_HEADERS } from "../templates.js";

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

  let nodeRows: any[];
  if (!typeFilter) {
    // Include scenes in the default view — they are the primary connective
    // tissue for ~22 practitioners (Paul-canon pass, April 28). Filtering
    // them out makes those practitioners appear orphan when zoomed out.
    nodeRows = db
      .prepare("SELECT id, name, type, slug FROM nodes WHERE type != 'related' ORDER BY name")
      .all();
  } else if (typeFilter === "_all") {
    nodeRows = db
      .prepare("SELECT id, name, type, slug FROM nodes WHERE type != 'related' ORDER BY name")
      .all();
  } else {
    nodeRows = db
      .prepare("SELECT id, name, type, slug FROM nodes WHERE type = ? ORDER BY name")
      .all(typeFilter);
  }

  let edgeRows: any[];
  if (!typeFilter) {
    edgeRows = db
      .prepare(
        "SELECT e.source_id, e.target_id, e.edge_type, e.confidence FROM edges e WHERE e.valid_until IS NULL AND e.source_id IN (SELECT id FROM nodes WHERE type != 'related') AND e.target_id IN (SELECT id FROM nodes WHERE type != 'related')"
      )
      .all();
  } else if (typeFilter === "_all") {
    edgeRows = db
      .prepare(
        "SELECT e.source_id, e.target_id, e.edge_type, e.confidence FROM edges e WHERE e.valid_until IS NULL AND e.source_id IN (SELECT id FROM nodes WHERE type != 'related') AND e.target_id IN (SELECT id FROM nodes WHERE type != 'related')"
      )
      .all();
  } else {
    edgeRows = db
      .prepare(
        "SELECT e.source_id, e.target_id, e.edge_type, e.confidence FROM edges e WHERE e.valid_until IS NULL AND e.source_id IN (SELECT id FROM nodes WHERE type = ?) AND e.target_id IN (SELECT id FROM nodes WHERE type = ?)"
      )
      .all(typeFilter, typeFilter);
  }

  res.set(JSON_HEADERS).json({
    nodes: nodeRows.map((n: any) => ({ id: n.id, name: n.name, type: n.type, slug: n.slug })),
    edges: edgeRows.map((e: any) => ({
      source: e.source_id,
      target: e.target_id,
      type: e.edge_type,
      confidence: e.confidence,
    })),
  });
});

// GET /api/graph/:slug/component — full connected component reachable from :slug
router.get("/api/graph/:slug/component", (req, res) => {
  const db = getDb();
  const slug = req.params.slug;
  const maxNodes = Math.min(Math.max(parseInt((req.query.max_nodes as string) || "800", 10) || 800, 1), 5000);

  const start = db.prepare("SELECT id, name, type, slug FROM nodes WHERE slug = ?").get(slug) as any;
  if (!start) {
    res.status(404).set(JSON_HEADERS).json({ error: "not found" });
    return;
  }

  const nodeRows = db.prepare("SELECT id, name, type, slug FROM nodes").all() as any[];
  const nodeById = new Map<string, any>();
  for (const n of nodeRows) nodeById.set(n.id, n);

  const edgeRows = db
    .prepare("SELECT source_id, target_id, edge_type, confidence FROM edges WHERE valid_until IS NULL")
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
        edgesOut.push({ source: e.source_id, target: e.target_id, type: e.edge_type, confidence: e.confidence });
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
    if (n) nodes.push({ id: n.id, name: n.name, type: n.type, slug: n.slug, center: n.id === start.id });
  }

  res.set(JSON_HEADERS).json({ nodes, edges: edgesOut, truncated, start_id: start.id });
});

// GET /api/graph/:slug — ego graph (1-hop)
router.get("/api/graph/:slug", (req, res) => {
  const db = getDb();
  const slug = req.params.slug;

  const node = db.prepare("SELECT id, name, type, slug FROM nodes WHERE slug = ?").get(slug) as any;
  if (!node) {
    res.status(404).set(JSON_HEADERS).json({ error: "not found" });
    return;
  }

  const nodes: any[] = [{ id: node.id, name: node.name, type: node.type, slug: node.slug, center: true }];

  const edgeRows = db
    .prepare("SELECT source_id, target_id, edge_type, confidence FROM edges WHERE valid_until IS NULL AND (source_id = ? OR target_id = ?)")
    .all(node.id, node.id) as any[];

  const edges: any[] = [];
  for (const e of edgeRows) {
    edges.push({
      source: e.source_id,
      target: e.target_id,
      type: e.edge_type,
      confidence: e.confidence,
    });

    const neighborId = e.source_id === node.id ? e.target_id : e.source_id;
    const nb = db.prepare("SELECT id, name, type, slug FROM nodes WHERE id = ?").get(neighborId) as any;
    if (nb && !nodes.some((n) => n.id === nb.id)) {
      nodes.push({ id: nb.id, name: nb.name, type: nb.type, slug: nb.slug });
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

// POST /api/review/:id/approve
router.post("/api/review/:id/approve", (req, res) => {
  const db = getDb();
  const id = req.params.id;

  const item = db
    .prepare("SELECT id, signal_id, target_node FROM intake_queue WHERE id = ? AND status = 'pending'")
    .get(id) as any;

  if (!item) {
    res.status(404).set(JSON_HEADERS).json({ error: "not found or already reviewed" });
    return;
  }

  db.prepare(
    "UPDATE intake_queue SET status = 'approved', reviewed_by = 'curator', reviewed_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?"
  ).run(id);

  const iq = db.prepare("SELECT submitted_by FROM intake_queue WHERE id = ?").get(id) as any;
  if (iq) {
    db.prepare("UPDATE contributors SET approved_count = approved_count + 1 WHERE name = ?").run(iq.submitted_by);
  }

  res.set(HTML_HEADERS).send("<div class='msg msg-ok'>Signal approved and is now live.</div>");
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

  const item = db.prepare("SELECT id FROM intake_queue WHERE id = ? AND status = 'pending'").get(id) as any;
  if (!item) {
    res.status(404).set(JSON_HEADERS).json({ error: "not found or already reviewed" });
    return;
  }

  db.prepare(
    "UPDATE intake_queue SET status = 'rejected', rejection_reason = ?, reviewed_by = 'curator', reviewed_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?"
  ).run(reason, id);

  res.set(HTML_HEADERS).send("<div class='msg msg-err'>Signal rejected.</div>");
});

export default router;
