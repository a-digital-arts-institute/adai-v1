// Admin-side correction primitives for the /api/v1 surface: revoke a signal,
// retire a node, retire a whole batch, list batches.
//
// NONE of these delete anything. The schema's correction model is:
//   edges   → bi-temporal supersession (valid_until + invalidated_by)
//   signals → status flip ('active' → 'revoked')
//   nodes   → metadata.retired flag (listing surfaces filter it — see
//             src/utils/visibility.ts) + supersession of every live edge
//             touching the node
//
// Every action is anchored by an ADMIN SIGNAL (source_type='api_admin',
// submitted_by=<admin contributor>) whose content records what was corrected
// and why; superseded edges point at it via invalidated_by. So the
// provenance chain answers "who retired this, when, and for what reason"
// the same way it answers every other question about the graph.
//
// Shared between the HTTP endpoints in src/routes/contributor-api.ts and any
// future operator CLI, so the two paths can't drift (the token-mint.ts
// pattern).

import crypto from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { mergeMetadata } from "./contribution.js";

export class AdminActionError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "AdminActionError";
  }
}

const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%SZ','now')";

function isoNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function withTx<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch { /* already rolled back */ }
    throw e;
  }
}

// The audit anchor for every admin correction. Confidence 'high' (it's a
// first-person operator statement), consent full/attributed, origin
// human_primary — the admin is a contributor like anyone else.
function insertAdminSignal(
  db: DatabaseSync,
  args: { by: string; title: string; content: unknown }
): string {
  const id = `signal-${crypto.randomBytes(8).toString("hex")}`;
  db.prepare(
    `INSERT INTO signals (
       id, title, source_url, source_type, cla_layer, summary, content,
       submitted_by, confidence, lived_experience,
       consent_scope, consent_attribution, source_origin, batch_id
     ) VALUES (?, ?, NULL, 'api_admin', NULL, NULL, ?,
               ?, 'high', 0,
               'full_commons', 'attributed', 'human_primary', NULL)`
  ).run(id, args.title, JSON.stringify(args.content), args.by);
  return id;
}

// ---------- revoke a signal -------------------------------------------------

export interface RevokeSignalResult {
  signal_id: string;
  already_revoked: boolean;
  edges_superseded: number;
  admin_signal_id: string | null;
}

/**
 * Flip a signal to status='revoked' and (by default) supersede every live
 * edge anchored to it. Idempotent: revoking an already-revoked signal is a
 * no-op that reports already_revoked.
 */
export function revokeSignal(
  db: DatabaseSync,
  signalId: string,
  opts: { reason: string; by: string; cascade?: boolean }
): RevokeSignalResult {
  const sig = db.prepare("SELECT id, status FROM signals WHERE id = ?").get(signalId) as any;
  if (!sig) throw new AdminActionError(404, "signal_not_found", `no signal with id ${signalId}`);
  if (sig.status === "revoked") {
    return { signal_id: signalId, already_revoked: true, edges_superseded: 0, admin_signal_id: null };
  }
  return withTx(db, () => {
    const anchor = insertAdminSignal(db, {
      by: opts.by,
      title: `Revoke signal: ${signalId}`,
      content: { action: "revoke_signal", signal_id: signalId, reason: opts.reason },
    });
    db.prepare("UPDATE signals SET status = 'revoked' WHERE id = ?").run(signalId);
    let edges = 0;
    if (opts.cascade !== false) {
      const r = db
        .prepare(
          `UPDATE edges SET valid_until = ${NOW_SQL}, invalidated_by = ? WHERE signal_id = ? AND valid_until IS NULL`
        )
        .run(anchor, signalId);
      edges = Number(r.changes);
    }
    return { signal_id: signalId, already_revoked: false, edges_superseded: edges, admin_signal_id: anchor };
  });
}

// ---------- retire a node ---------------------------------------------------

export interface RetireNodeResult {
  node_id: string;
  already_retired: boolean;
  dry_run?: boolean;
  edges_superseded: number;
  admin_signal_id: string | null;
}

// Inner worker — no transaction, no anchor creation. Used by retireNode
// (which wraps it in a tx) and retireBatch (which runs many inside one tx,
// sharing a single anchor).
function retireNodeInner(
  db: DatabaseSync,
  nodeId: string,
  opts: { reason: string; by: string; anchor: string }
): { edges_superseded: number } {
  const r = db
    .prepare(
      `UPDATE edges SET valid_until = ${NOW_SQL}, invalidated_by = ?
        WHERE (source_id = ? OR target_id = ?) AND valid_until IS NULL`
    )
    .run(opts.anchor, nodeId, nodeId);
  const row = db.prepare("SELECT metadata FROM nodes WHERE id = ?").get(nodeId) as any;
  let base: any = {};
  if (row?.metadata) {
    try { base = JSON.parse(row.metadata); } catch { base = {}; }
  }
  const merged = mergeMetadata(base, {
    retired: true,
    retired_at: isoNow(),
    retired_by: opts.by,
    retired_reason: opts.reason,
  });
  db.prepare("UPDATE nodes SET metadata = ?, updated_by = ? WHERE id = ?")
    .run(JSON.stringify(merged), `api-${opts.by}`, nodeId);
  return { edges_superseded: Number(r.changes) };
}

/**
 * Retire a node: supersede every live edge touching it (either direction)
 * and set metadata.retired so listing surfaces drop it. The row itself
 * stays. Reversal is deliberate manual work: PATCH the metadata
 * ({"retired": null}) and re-attest the edges you want back.
 */
export function retireNode(
  db: DatabaseSync,
  nodeId: string,
  opts: { reason: string; by: string; dryRun?: boolean }
): RetireNodeResult {
  const node = db.prepare("SELECT id, metadata FROM nodes WHERE id = ?").get(nodeId) as any;
  if (!node) throw new AdminActionError(404, "node_not_found", `no node with id ${nodeId}`);
  let meta: any = {};
  if (node.metadata) {
    try { meta = JSON.parse(node.metadata); } catch { meta = {}; }
  }
  if (meta.retired === true) {
    return { node_id: nodeId, already_retired: true, edges_superseded: 0, admin_signal_id: null };
  }
  const { count: liveEdges } = db
    .prepare(
      "SELECT COUNT(*) AS count FROM edges WHERE (source_id = ? OR target_id = ?) AND valid_until IS NULL"
    )
    .get(nodeId, nodeId) as any;

  if (opts.dryRun) {
    return { node_id: nodeId, already_retired: false, dry_run: true, edges_superseded: Number(liveEdges), admin_signal_id: null };
  }

  return withTx(db, () => {
    const anchor = insertAdminSignal(db, {
      by: opts.by,
      title: `Retire node: ${nodeId}`,
      content: { action: "retire_node", node_id: nodeId, reason: opts.reason },
    });
    const { edges_superseded } = retireNodeInner(db, nodeId, { reason: opts.reason, by: opts.by, anchor });
    return { node_id: nodeId, already_retired: false, edges_superseded, admin_signal_id: anchor };
  });
}

// ---------- retire a batch ---------------------------------------------------

export interface BatchRetirePlan {
  batch_id: string;
  signals_total: number;
  signals_active: number;
  edges_to_supersede: number;
  nodes_to_retire: string[];
  nodes_skipped_preexisting: string[];
  patches_to_review: Array<{ op: string; node_id: string; signal_id: string | null }>;
  pending_intake_to_reject: number;
}

export interface RetireBatchResult extends BatchRetirePlan {
  dry_run?: boolean;
  retired?: boolean;
  admin_signal_id?: string;
  signals_revoked?: number;
  edges_superseded?: number;
  nodes_retired?: number;
  pending_rejected?: number;
}

function buildBatchPlan(db: DatabaseSync, batchId: string): BatchRetirePlan & { signalIds: string[] } {
  const signals = db
    .prepare(
      "SELECT id, submitted_by, created_at, status FROM signals WHERE batch_id = ? ORDER BY created_at ASC"
    )
    .all(batchId) as Array<{ id: string; submitted_by: string; created_at: string; status: string }>;
  if (signals.length === 0) {
    throw new AdminActionError(404, "batch_not_found", `no signals carry batch_id ${batchId}`);
  }
  const signalIds = signals.map((s) => s.id);
  const batchStart = signals[0]!.created_at;
  const placeholders = signalIds.map(() => "?").join(",");

  const { count: liveEdges } = db
    .prepare(
      `SELECT COUNT(*) AS count FROM edges WHERE valid_until IS NULL AND signal_id IN (${placeholders})`
    )
    .get(...signalIds) as any;

  const intakeRows = db
    .prepare(
      `SELECT id, signal_id, status, proposed_nodes FROM intake_queue WHERE signal_id IN (${placeholders})`
    )
    .all(...signalIds) as Array<{ id: string; signal_id: string | null; status: string; proposed_nodes: string | null }>;

  // Candidate nodes created by this batch: parse create_node ops out of the
  // intake rows (every /api/v1 write leaves one, including auto-merged ones —
  // audit symmetry). Guard against retiring PRE-EXISTING nodes the batch
  // merely collided with (materialiseCreateNode is first-write-wins, so a
  // create on an existing id was a no-op): only retire a node whose
  // created_at is >= the batch's first signal (ISO strings compare
  // lexicographically).
  const createCandidates = new Map<string, string | null>(); // node_id → signal_id
  const patchesToReview: Array<{ op: string; node_id: string; signal_id: string | null }> = [];
  for (const row of intakeRows) {
    if (!row.proposed_nodes) continue;
    let ops: any[] = [];
    try { ops = JSON.parse(row.proposed_nodes); } catch { ops = []; }
    for (const op of ops) {
      if (op?.op === "create_node" && op.type && op.slug) {
        createCandidates.set(`${op.type}:${op.slug}`, row.signal_id);
      } else if ((op?.op === "patch_node" || op?.op === "attach_image") && op.node_id) {
        patchesToReview.push({ op: op.op, node_id: op.node_id, signal_id: row.signal_id });
      }
    }
  }

  const nodesToRetire: string[] = [];
  const nodesSkipped: string[] = [];
  for (const [nodeId] of createCandidates) {
    const node = db.prepare("SELECT id, created_at, metadata FROM nodes WHERE id = ?").get(nodeId) as any;
    if (!node) continue; // never materialised (rejected / still pending)
    let meta: any = {};
    if (node.metadata) {
      try { meta = JSON.parse(node.metadata); } catch { meta = {}; }
    }
    if (meta.retired === true) continue; // already retired
    if (typeof node.created_at === "string" && node.created_at >= batchStart) {
      nodesToRetire.push(nodeId);
    } else {
      nodesSkipped.push(nodeId); // pre-existing — the batch's create was a no-op
    }
  }

  // Patches that target nodes this plan retires anyway don't need manual
  // review — retirement hides the node wholesale.
  const retireSet = new Set(nodesToRetire);
  const patchesFiltered = patchesToReview.filter((p) => !retireSet.has(p.node_id));

  return {
    batch_id: batchId,
    signals_total: signals.length,
    signals_active: signals.filter((s) => s.status === "active").length,
    edges_to_supersede: Number(liveEdges),
    nodes_to_retire: nodesToRetire.sort(),
    nodes_skipped_preexisting: nodesSkipped.sort(),
    patches_to_review: patchesFiltered,
    pending_intake_to_reject: intakeRows.filter((r) => r.status === "pending").length,
    signalIds,
  };
}

/**
 * Retire an entire contribution batch — "delete and start again", the
 * provenance-preserving way:
 *   1. revoke every active signal carrying the batch_id
 *   2. supersede every live edge anchored to those signals
 *   3. retire every node the batch CREATED (guarded so pre-existing nodes
 *      the batch merely touched are never retired)
 *   4. reject every still-pending intake row from the batch
 *
 * Metadata patches / image attachments the batch applied to PRE-EXISTING
 * nodes cannot be auto-reverted (no before-image is stored) — they're
 * returned in patches_to_review for manual follow-up; each signal's content
 * records the exact patch that was applied.
 *
 * Always run with dryRun first.
 */
export function retireBatch(
  db: DatabaseSync,
  batchId: string,
  opts: { reason: string; by: string; dryRun?: boolean }
): RetireBatchResult {
  const { signalIds, ...plan } = buildBatchPlan(db, batchId);

  if (opts.dryRun) {
    return { dry_run: true, ...plan };
  }

  const placeholders = signalIds.map(() => "?").join(",");
  return withTx(db, () => {
    const anchor = insertAdminSignal(db, {
      by: opts.by,
      title: `Retire batch: ${batchId}`,
      content: {
        action: "retire_batch",
        batch_id: batchId,
        reason: opts.reason,
        signals: plan.signals_total,
        nodes_retired: plan.nodes_to_retire,
        nodes_skipped_preexisting: plan.nodes_skipped_preexisting,
        patches_to_review: plan.patches_to_review,
      },
    });

    const revoked = db
      .prepare("UPDATE signals SET status = 'revoked' WHERE batch_id = ? AND status = 'active'")
      .run(batchId);

    const superseded = db
      .prepare(
        `UPDATE edges SET valid_until = ${NOW_SQL}, invalidated_by = ?
          WHERE valid_until IS NULL AND signal_id IN (${placeholders})`
      )
      .run(anchor, ...signalIds);

    let nodeEdgeCount = 0;
    for (const nodeId of plan.nodes_to_retire) {
      const r = retireNodeInner(db, nodeId, { reason: opts.reason, by: opts.by, anchor });
      nodeEdgeCount += r.edges_superseded;
    }

    const rejected = db
      .prepare(
        `UPDATE intake_queue
            SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = ${NOW_SQL}
          WHERE status = 'pending' AND signal_id IN (${placeholders})`
      )
      .run(`batch retired: ${opts.reason}`, `api-${opts.by}`, ...signalIds);

    return {
      ...plan,
      retired: true,
      admin_signal_id: anchor,
      signals_revoked: Number(revoked.changes),
      edges_superseded: Number(superseded.changes) + nodeEdgeCount,
      nodes_retired: plan.nodes_to_retire.length,
      pending_rejected: Number(rejected.changes),
    };
  });
}

// ---------- list batches ------------------------------------------------------

export interface BatchSummary {
  batch_id: string;
  signals: number;
  active_signals: number;
  revoked_signals: number;
  contributors: string[];
  first_at: string | null;
  last_at: string | null;
  intake: Record<string, number>; // pending / approved / rejected counts
}

export function listBatches(
  db: DatabaseSync,
  opts: { contributor?: string | null; limit?: number } = {}
): BatchSummary[] {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 500);
  const where = ["batch_id IS NOT NULL"];
  const params: Array<string | number> = [];
  if (opts.contributor) {
    where.push("submitted_by = ?");
    params.push(opts.contributor);
  }
  const rows = db
    .prepare(
      `SELECT batch_id,
              COUNT(*) AS signals,
              SUM(CASE WHEN status = 'active'  THEN 1 ELSE 0 END) AS active_signals,
              SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) AS revoked_signals,
              GROUP_CONCAT(DISTINCT submitted_by) AS contributors,
              MIN(created_at) AS first_at,
              MAX(created_at) AS last_at
         FROM signals
        WHERE ${where.join(" AND ")}
        GROUP BY batch_id
        ORDER BY last_at DESC
        LIMIT ?`
    )
    .all(...params, limit) as any[];

  const intakeRows = db
    .prepare(
      `SELECT s.batch_id AS batch_id, q.status AS status, COUNT(*) AS n
         FROM intake_queue q
         JOIN signals s ON s.id = q.signal_id
        WHERE s.batch_id IS NOT NULL
        GROUP BY s.batch_id, q.status`
    )
    .all() as Array<{ batch_id: string; status: string; n: number }>;
  const intakeByBatch = new Map<string, Record<string, number>>();
  for (const r of intakeRows) {
    let m = intakeByBatch.get(r.batch_id);
    if (!m) { m = {}; intakeByBatch.set(r.batch_id, m); }
    m[r.status] = Number(r.n);
  }

  return rows.map((r) => ({
    batch_id: r.batch_id,
    signals: Number(r.signals),
    active_signals: Number(r.active_signals),
    revoked_signals: Number(r.revoked_signals),
    contributors: typeof r.contributors === "string" ? r.contributors.split(",") : [],
    first_at: r.first_at ?? null,
    last_at: r.last_at ?? null,
    intake: intakeByBatch.get(r.batch_id) ?? {},
  }));
}
