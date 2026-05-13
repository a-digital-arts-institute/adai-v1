// /api/v1/* — bearer-token contributor API for AI-mediated edits to the
// A(DAI) graph. Surfaces signals, nodes, edges, and image uploads. Every
// endpoint applies `requireToken` and respects the contributor's trust tier:
//   auto / reviewed  → write directly to live tables
//   probationary     → land in intake_queue as kind='human_signal' with
//                      proposed_nodes / proposed_edges populated; the curator
//                      materialises on approve via /api/review/:id/approve.
//
// See SKILL.md (and /skill.md served from src/routes/pages.ts) for the
// caller-facing description of these endpoints.

import { Router } from "express";
import multer from "multer";
import { getDb } from "../db.js";
import { JSON_HEADERS } from "../templates.js";
import { requireToken, requireAdmin, isAutoMerge } from "../auth.js";
import { mintToken, revokeTokenByPrefix, listTokens, MintError } from "../utils/token-mint.js";
import { nodeId as composeNodeId, slugify } from "../utils/slug.js";
import {
  insertSignal,
  insertIntake,
  ensureContributorRow,
  bumpApprovedCount,
  mergeMetadata,
  materialiseCreateNode,
  materialisePatchNode,
  materialiseAttachImage,
  materialiseEdge,
  type ProposedEdge,
  type ProposedNodeOp,
} from "../utils/contribution.js";
import { uploadImage, isR2Configured } from "../r2.js";

const router = Router();

// Permissive list (advisory, not enforced). Anything outside emits a warning
// in the response but is still accepted, mirroring the schema's permissive
// stance. Keep in sync with CLAUDE.md's "Node types" / "Edge types" sections.
const KNOWN_NODE_TYPES = new Set([
  "practitioner", "artwork", "concept", "scene", "institution", "collective",
  "platform", "publication", "project", "classification_regime", "event", "related",
]);
const CURATED_EDGE_TYPES = new Set([
  "EMBODIES", "CREATED_BY", "PRACTICES", "EXHIBITED_AT", "CLASSIFIED_BY",
  "BELONGS_TO", "COLLABORATES_WITH", "USES_TECHNIQUE", "INFLUENCES", "RESPONDS_TO",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 }, // 12 MB cap, matches the Python uploader
});

// CORS preflight for the API namespace. We allow Authorization here since the
// shared JSON_HEADERS in templates.ts doesn't include it (the rest of the
// site is anonymous read-only).
router.options("/api/v1/*splat", (_req, res) => {
  res
    .set({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "600",
    })
    .status(204)
    .end();
});

// ---------- GET /api/v1/whoami --------------------------------------------

router.get("/api/v1/whoami", requireToken, (req, res) => {
  res.set(JSON_HEADERS).json({
    contributor: {
      id: req.contributor!.id,
      name: req.contributor!.name,
      trust_tier: req.contributor!.trust_tier,
    },
    token_label: req.contributor!.token_label,
    token_prefix: req.contributor!.token_prefix,
    scope: req.contributor!.scope,
    r2_configured: isR2Configured(),
  });
});

// ---------- POST /api/v1/signals ------------------------------------------
// JSON: { target_node, title, content, source_url?, consent_scope?, consent_attribution? }

router.post("/api/v1/signals", requireToken, (req, res) => {
  const db = getDb();
  const { target_node, title, content, source_url, consent_scope, consent_attribution } = req.body ?? {};

  if (!target_node || typeof target_node !== "string") {
    res.status(400).set(JSON_HEADERS).json({ error: "target_node is required" });
    return;
  }
  if (!title || typeof title !== "string") {
    res.status(400).set(JSON_HEADERS).json({ error: "title is required" });
    return;
  }
  if (!content || typeof content !== "string") {
    res.status(400).set(JSON_HEADERS).json({ error: "content is required" });
    return;
  }
  const target = db.prepare("SELECT id FROM nodes WHERE id = ?").get(target_node) as any;
  if (!target) {
    res.status(400).set(JSON_HEADERS).json({ error: "target_node does not exist", target_node });
    return;
  }

  const signalId = insertSignal(db, {
    contributor: req.contributor!,
    title,
    content,
    source_url: source_url ?? null,
    source_type: "contribution",
    consent_scope,
    consent_attribution,
  });
  const { intake_id, status } = insertIntake(db, {
    contributor: req.contributor!,
    signal_id: signalId,
    target_node,
  });
  ensureContributorRow(db, req.contributor!);
  if (status === "approved") bumpApprovedCount(db, req.contributor!.id);

  res.set(JSON_HEADERS).json({ signal_id: signalId, intake_id, status, target_node });
});

// ---------- POST /api/v1/nodes --------------------------------------------
// JSON: { type, name, slug?, metadata?, aliases?: [{ source, external_id }] }

router.post("/api/v1/nodes", requireToken, (req, res) => {
  const db = getDb();
  const { type, name, slug: providedSlug, metadata, aliases } = req.body ?? {};

  if (!type || typeof type !== "string") {
    res.status(400).set(JSON_HEADERS).json({ error: "type is required" });
    return;
  }
  if (!name || typeof name !== "string") {
    res.status(400).set(JSON_HEADERS).json({ error: "name is required" });
    return;
  }
  if (metadata !== undefined && (metadata === null || typeof metadata !== "object" || Array.isArray(metadata))) {
    res.status(400).set(JSON_HEADERS).json({ error: "metadata must be a JSON object" });
    return;
  }
  if (aliases !== undefined && !Array.isArray(aliases)) {
    res.status(400).set(JSON_HEADERS).json({ error: "aliases must be an array" });
    return;
  }
  const aliasItems: Array<{ source: string; external_id: string }> = [];
  if (Array.isArray(aliases)) {
    for (const a of aliases) {
      if (!a || typeof a.source !== "string" || typeof a.external_id !== "string") {
        res.status(400).set(JSON_HEADERS).json({ error: "each alias needs {source, external_id}" });
        return;
      }
      aliasItems.push({ source: a.source, external_id: a.external_id });
    }
  }

  const warnings: string[] = [];
  if (!KNOWN_NODE_TYPES.has(type)) {
    warnings.push(`unknown node type "${type}" — accepted, but check CLAUDE.md`);
  }

  const slug = typeof providedSlug === "string" && providedSlug.length > 0 ? providedSlug : slugify(name);
  const computedId = composeNodeId(type, slug);

  // Signal anchors every contribution. Stash the full payload so the curator
  // can review verbatim.
  const signalId = insertSignal(db, {
    contributor: req.contributor!,
    title: `Create node: ${type}:${name}`,
    content: JSON.stringify({ type, name, slug, metadata: metadata ?? {}, aliases: aliasItems }),
    source_type: "api_node",
  });

  if (isAutoMerge(req.contributor!.trust_tier)) {
    const { created } = materialiseCreateNode(
      db,
      { op: "create_node", type, name, slug, metadata: metadata ?? {}, aliases: aliasItems },
      { signalId, createdBy: `api-${req.contributor!.name}` }
    );
    // Still write an intake row marked approved for audit symmetry.
    const { intake_id } = insertIntake(db, {
      contributor: req.contributor!,
      signal_id: signalId,
      target_node: computedId,
      proposed_nodes: [{ op: "create_node", type, name, slug, metadata: metadata ?? {}, aliases: aliasItems }],
    });
    ensureContributorRow(db, req.contributor!);
    bumpApprovedCount(db, req.contributor!.id);
    res.set(JSON_HEADERS).json({
      node_id: computedId,
      created,
      status: "approved",
      signal_id: signalId,
      intake_id,
      warnings,
    });
    return;
  }

  // Probationary — queue.
  const { intake_id, status } = insertIntake(db, {
    contributor: req.contributor!,
    signal_id: signalId,
    target_node: computedId,
    proposed_nodes: [{ op: "create_node", type, name, slug, metadata: metadata ?? {}, aliases: aliasItems }],
  });
  ensureContributorRow(db, req.contributor!);
  res.set(JSON_HEADERS).json({
    node_id: computedId,
    created: false,
    status,
    signal_id: signalId,
    intake_id,
    warnings,
  });
});

// ---------- PATCH /api/v1/nodes/:id ---------------------------------------
// JSON body is treated as a JSON-merge-patch of metadata. null values delete.

router.patch("/api/v1/nodes/:id", requireToken, (req, res) => {
  const db = getDb();
  const nodeId = String(req.params.id);
  const patch = req.body;

  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    res.status(400).set(JSON_HEADERS).json({ error: "request body must be a JSON object (merge-patch on metadata)" });
    return;
  }
  const existing = db.prepare("SELECT id FROM nodes WHERE id = ?").get(nodeId) as any;
  if (!existing) {
    res.status(404).set(JSON_HEADERS).json({ error: "node not found", node_id: nodeId });
    return;
  }

  const signalId = insertSignal(db, {
    contributor: req.contributor!,
    title: `Patch node metadata: ${nodeId}`,
    content: JSON.stringify({ node_id: nodeId, patch }),
    source_type: "api_node",
  });

  if (isAutoMerge(req.contributor!.trust_tier)) {
    materialisePatchNode(db, { op: "patch_node", node_id: nodeId, metadata: patch }, { createdBy: `api-${req.contributor!.name}` });
    const { intake_id } = insertIntake(db, {
      contributor: req.contributor!,
      signal_id: signalId,
      target_node: nodeId,
      proposed_nodes: [{ op: "patch_node", node_id: nodeId, metadata: patch }],
    });
    ensureContributorRow(db, req.contributor!);
    bumpApprovedCount(db, req.contributor!.id);
    res.set(JSON_HEADERS).json({ node_id: nodeId, status: "approved", signal_id: signalId, intake_id });
    return;
  }

  const { intake_id, status } = insertIntake(db, {
    contributor: req.contributor!,
    signal_id: signalId,
    target_node: nodeId,
    proposed_nodes: [{ op: "patch_node", node_id: nodeId, metadata: patch }],
  });
  ensureContributorRow(db, req.contributor!);
  res.set(JSON_HEADERS).json({ node_id: nodeId, status, signal_id: signalId, intake_id });
});

// ---------- POST /api/v1/edges --------------------------------------------
// JSON: { source_id, target_id, edge_type, confidence?, event_time?, supersedes_edge_id? }

router.post("/api/v1/edges", requireToken, (req, res) => {
  const db = getDb();
  const { source_id, target_id, edge_type, confidence, event_time, supersedes_edge_id } = req.body ?? {};

  for (const [k, v] of [["source_id", source_id], ["target_id", target_id], ["edge_type", edge_type]] as const) {
    if (!v || typeof v !== "string") {
      res.status(400).set(JSON_HEADERS).json({ error: `${k} is required` });
      return;
    }
  }
  // Existence checks — net new for the contributor API (legacy /api/contribute
  // doesn't validate FKs). Surfacing 400 here catches hallucinated IDs early.
  const src = db.prepare("SELECT id FROM nodes WHERE id = ?").get(source_id) as any;
  if (!src) {
    res.status(400).set(JSON_HEADERS).json({ error: "source_id does not exist", source_id });
    return;
  }
  const dst = db.prepare("SELECT id FROM nodes WHERE id = ?").get(target_id) as any;
  if (!dst) {
    res.status(400).set(JSON_HEADERS).json({ error: "target_id does not exist", target_id });
    return;
  }
  if (supersedes_edge_id) {
    const old = db.prepare("SELECT id FROM edges WHERE id = ?").get(supersedes_edge_id) as any;
    if (!old) {
      res.status(400).set(JSON_HEADERS).json({ error: "supersedes_edge_id does not exist", supersedes_edge_id });
      return;
    }
  }

  const warnings: string[] = [];
  if (!CURATED_EDGE_TYPES.has(edge_type)) {
    warnings.push(`uncurated edge type "${edge_type}" — accepted, but prefer one of: EMBODIES, CREATED_BY, PRACTICES, EXHIBITED_AT, CLASSIFIED_BY, BELONGS_TO, COLLABORATES_WITH, USES_TECHNIQUE, INFLUENCES, RESPONDS_TO`);
  }
  if (edge_type === "INFLUENCES" || edge_type === "RESPONDS_TO") {
    // Soft policy: these require human-attested intent (see CLAUDE.md).
    warnings.push(`${edge_type} edges should reflect attested artist intent — make sure source_url anchors a statement, interview, or first-person attestation.`);
  }

  const proposed: ProposedEdge = {
    source_id,
    target_id,
    edge_type,
    confidence: typeof confidence === "string" ? confidence : "medium",
    event_time: typeof event_time === "string" ? event_time : null,
    supersedes_edge_id: typeof supersedes_edge_id === "string" ? supersedes_edge_id : null,
  };

  const signalId = insertSignal(db, {
    contributor: req.contributor!,
    title: `Add edge ${edge_type}: ${source_id} → ${target_id}`,
    content: JSON.stringify(proposed),
    source_type: "api_edge",
  });

  if (isAutoMerge(req.contributor!.trust_tier)) {
    const { edge_id, superseded } = materialiseEdge(
      db,
      { ...proposed, signal_id: signalId },
      { signalId, createdBy: `api-${req.contributor!.name}` }
    );
    const { intake_id } = insertIntake(db, {
      contributor: req.contributor!,
      signal_id: signalId,
      target_node: target_id,
      proposed_edges: [proposed],
    });
    ensureContributorRow(db, req.contributor!);
    bumpApprovedCount(db, req.contributor!.id);
    res.set(JSON_HEADERS).json({ edge_id, superseded, status: "approved", signal_id: signalId, intake_id, warnings });
    return;
  }

  const { intake_id, status } = insertIntake(db, {
    contributor: req.contributor!,
    signal_id: signalId,
    target_node: target_id,
    proposed_edges: [proposed],
  });
  ensureContributorRow(db, req.contributor!);
  res.set(JSON_HEADERS).json({ status, signal_id: signalId, intake_id, warnings });
});

// ---------- POST /api/v1/images -------------------------------------------
// multipart/form-data { image, node_id }   — or
// application/json    { node_id, image_base64, mime_type }
//
// Bytes are content-addressed and immutable on R2, so the upload runs even
// for probationary contributors (cheap, deduped). The metadata patch that
// attaches the URL to the node respects the trust tier.

router.post(
  "/api/v1/images",
  requireToken,
  upload.single("image"),
  async (req, res) => {
    if (!isR2Configured()) {
      res.status(503).set(JSON_HEADERS).json({ error: "r2_not_configured", hint: "set R2_* env vars (see CLAUDE.md)" });
      return;
    }
    const db = getDb();

    // Two transports: multipart (preferred) or base64-in-JSON.
    let buf: Buffer | null = null;
    let mime = "application/octet-stream";
    let nodeId: string | null = null;

    if (req.file) {
      buf = req.file.buffer;
      mime = req.file.mimetype || mime;
      nodeId = typeof req.body.node_id === "string" ? req.body.node_id : null;
    } else if (req.is("application/json")) {
      const body = req.body ?? {};
      const b64 = typeof body.image_base64 === "string" ? body.image_base64 : null;
      if (b64) {
        try { buf = Buffer.from(b64, "base64"); } catch { /* handled below */ }
      }
      mime = typeof body.mime_type === "string" ? body.mime_type : mime;
      nodeId = typeof body.node_id === "string" ? body.node_id : null;
    }

    if (!buf || buf.length === 0) {
      res.status(400).set(JSON_HEADERS).json({ error: "no image bytes — send multipart 'image' field or JSON {image_base64}" });
      return;
    }
    if (!nodeId) {
      res.status(400).set(JSON_HEADERS).json({ error: "node_id is required" });
      return;
    }
    const node = db.prepare("SELECT id, metadata FROM nodes WHERE id = ?").get(nodeId) as any;
    if (!node) {
      res.status(404).set(JSON_HEADERS).json({ error: "node not found", node_id: nodeId });
      return;
    }

    let upresult: Awaited<ReturnType<typeof uploadImage>>;
    try {
      upresult = await uploadImage(buf, mime);
    } catch (e: any) {
      res.status(502).set(JSON_HEADERS).json({ error: "r2_upload_failed", detail: String(e?.message ?? e) });
      return;
    }

    const signalId = insertSignal(db, {
      contributor: req.contributor!,
      title: `Upload image to ${nodeId}`,
      content: JSON.stringify({ node_id: nodeId, key: upresult.key, sha256: upresult.sha256, bytes: upresult.bytes, content_type: upresult.content_type }),
      source_type: "api_image",
    });

    const op: ProposedNodeOp = {
      op: "attach_image",
      node_id: nodeId,
      image_url: upresult.url,
      cdn_image_url: upresult.url,
      sha256: upresult.sha256,
    };

    if (isAutoMerge(req.contributor!.trust_tier)) {
      materialiseAttachImage(db, op as Extract<ProposedNodeOp, { op: "attach_image" }>, { createdBy: `api-${req.contributor!.name}` });
      const { intake_id } = insertIntake(db, {
        contributor: req.contributor!,
        signal_id: signalId,
        target_node: nodeId,
        proposed_nodes: [op],
      });
      ensureContributorRow(db, req.contributor!);
      bumpApprovedCount(db, req.contributor!.id);
      res.set(JSON_HEADERS).json({
        node_id: nodeId,
        upload: upresult,
        status: "approved",
        signal_id: signalId,
        intake_id,
      });
      return;
    }

    const { intake_id, status } = insertIntake(db, {
      contributor: req.contributor!,
      signal_id: signalId,
      target_node: nodeId,
      proposed_nodes: [op],
    });
    ensureContributorRow(db, req.contributor!);
    res.set(JSON_HEADERS).json({
      node_id: nodeId,
      upload: upresult,
      status,
      signal_id: signalId,
      intake_id,
      note: "image bytes are live on R2 but metadata attachment is queued for curator approval",
    });
  }
);

// Multer error handler (must follow the route).
router.use("/api/v1/images", (err: any, _req: any, res: any, next: any) => {
  if (err) {
    res.status(400).set(JSON_HEADERS).json({ error: "upload_error", detail: String(err?.message ?? err) });
    return;
  }
  next();
});

// ---------- Admin endpoints (scope='admin' required) ----------------------
//
// Admins can mint contributor (write-scope) tokens, revoke any token, and
// list every token. They CANNOT mint other admin tokens via this surface —
// that's deliberately reserved for the operator CLI (`npm run token:issue
// -- --admin`) so the bootstrap door stays narrow. Admin contributors are
// still ordinary contributors; their writes (signal/node/edge/image) attribute
// to them just like anyone else's, and trust_tier still governs auto-merge
// vs queue. Scope and trust_tier are deliberately decoupled.

router.get("/api/v1/tokens", requireAdmin, (req, res) => {
  const db = getDb();
  const contributorName = typeof req.query.contributor === "string" ? req.query.contributor : null;
  const activeOnly = String(req.query.active ?? "") === "1" || String(req.query.active ?? "") === "true";
  const rows = listTokens(db, { contributorName, activeOnly });
  res.set(JSON_HEADERS).json({ tokens: rows });
});

router.post("/api/v1/tokens", requireAdmin, (req, res) => {
  const db = getDb();
  const body = req.body ?? {};
  const contributor_name = typeof body.contributor_name === "string" ? body.contributor_name : null;
  const label = typeof body.label === "string" ? body.label : null;
  const tier = typeof body.tier === "string" ? body.tier : undefined;
  const create_if_missing = body.create_if_missing === true;
  const requested_scope = typeof body.scope === "string" ? body.scope : "write";

  if (!contributor_name) {
    res.status(400).set(JSON_HEADERS).json({ error: "contributor_name is required" });
    return;
  }
  // Admin endpoint refuses to mint another admin — only the operator CLI can.
  if (requested_scope !== "write") {
    res.status(403).set(JSON_HEADERS).json({
      error: "admin_mint_forbidden",
      hint: "API admins can only mint write-scope tokens. Use `npm run token:issue -- --admin` on the host to mint another admin.",
    });
    return;
  }

  try {
    const result = mintToken(db, {
      contributorName: contributor_name,
      label,
      scope: "write",
      tier: tier as any,
      createIfMissing: create_if_missing,
    });
    res.set(JSON_HEADERS).json({
      // The raw token is returned ONCE. The admin client is responsible for
      // delivering it to the contributor over a side channel (the practitioner's
      // chat with their own Claude, a password manager, etc.).
      raw_token: result.raw_token,
      token_prefix: result.token_prefix,
      contributor: {
        id: result.contributor_id,
        name: result.contributor_name,
        trust_tier: result.contributor_trust_tier,
      },
      scope: result.scope,
      label: result.label,
      contributor_created: result.contributor_created,
      minted_by: { id: req.contributor!.id, name: req.contributor!.name, token_prefix: req.contributor!.token_prefix },
    });
  } catch (e: any) {
    if (e instanceof MintError) {
      res.status(e.status).set(JSON_HEADERS).json({ error: e.code, detail: e.message });
      return;
    }
    throw e;
  }
});

router.post("/api/v1/tokens/:prefix/revoke", requireAdmin, (req, res) => {
  const db = getDb();
  const prefix = String(req.params.prefix);
  try {
    const r = revokeTokenByPrefix(db, prefix);
    res.set(JSON_HEADERS).json({
      token_prefix: r.token_prefix,
      contributor: { id: r.contributor_id, name: r.contributor_name },
      was_already_revoked: r.was_already_revoked,
      revoked_at: r.revoked_at,
      revoked_by: { id: req.contributor!.id, name: req.contributor!.name, token_prefix: req.contributor!.token_prefix },
    });
  } catch (e: any) {
    if (e instanceof MintError) {
      res.status(e.status).set(JSON_HEADERS).json({ error: e.code, detail: e.message });
      return;
    }
    throw e;
  }
});

export default router;
