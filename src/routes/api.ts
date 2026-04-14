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
    nodeRows = db
      .prepare("SELECT id, name, type, slug FROM nodes WHERE type NOT IN ('related', 'scene') ORDER BY name")
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
        "SELECT e.source_id, e.target_id, e.edge_type, e.confidence FROM edges e WHERE e.source_id IN (SELECT id FROM nodes WHERE type NOT IN ('related','scene')) AND e.target_id IN (SELECT id FROM nodes WHERE type NOT IN ('related','scene'))"
      )
      .all();
  } else if (typeFilter === "_all") {
    edgeRows = db
      .prepare(
        "SELECT e.source_id, e.target_id, e.edge_type, e.confidence FROM edges e WHERE e.source_id IN (SELECT id FROM nodes WHERE type != 'related') AND e.target_id IN (SELECT id FROM nodes WHERE type != 'related')"
      )
      .all();
  } else {
    edgeRows = db
      .prepare(
        "SELECT e.source_id, e.target_id, e.edge_type, e.confidence FROM edges e WHERE e.source_id IN (SELECT id FROM nodes WHERE type = ?) AND e.target_id IN (SELECT id FROM nodes WHERE type = ?)"
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
    .prepare("SELECT source_id, target_id, edge_type, confidence FROM edges WHERE source_id = ? OR target_id = ?")
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
  const { target_node, title, content, source_url, contributor_name } = req.body;

  const signalId = `signal-${crypto.randomBytes(8).toString("hex")}`;
  const intakeId = `intake-${crypto.randomBytes(8).toString("hex")}`;

  // look up contributor trust tier
  let trustTier = "low";
  const contrib = db.prepare("SELECT trust_tier FROM contributors WHERE name = ?").get(contributor_name) as any;
  if (contrib) trustTier = contrib.trust_tier;

  // insert signal
  db.prepare(
    "INSERT INTO signals (id, title, source_url, source_type, cla_layer, summary, content, submitted_by, confidence, lived_experience) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(signalId, title, source_url || null, "contribution", null, null, content, contributor_name, trustTier, 0);

  // determine intake status
  const intakeStatus = trustTier === "high" ? "approved" : "pending";

  // insert intake queue entry
  db.prepare(
    "INSERT INTO intake_queue (id, signal_id, target_node, submitted_by, trust_tier, status) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(intakeId, signalId, target_node, contributor_name, trustTier, intakeStatus);

  // update or create contributor
  const existing = db.prepare("SELECT id FROM contributors WHERE name = ?").get(contributor_name) as any;
  if (!existing) {
    const contribId = `contributor-${crypto.randomBytes(8).toString("hex")}`;
    db.prepare(
      "INSERT INTO contributors (id, name, type, trust_tier, contributions, approved_count) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(contribId, contributor_name, "contributor", "low", 1, 0);
  } else {
    db.prepare("UPDATE contributors SET contributions = contributions + 1 WHERE name = ?").run(contributor_name);
  }

  const responseHtml =
    intakeStatus === "approved"
      ? "<div class='msg msg-ok'>Signal submitted and auto-approved (high trust). It is now live.</div>"
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
