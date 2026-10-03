// Claims: "this node is me / mine" (docs/CLAIM-SPEC.md §1–3).
//
// A claim links a contributor to a practitioner, collective or institution
// node. The approval rule (§2.2): an admin invite naming the node, or a
// claimed peer's invite, is instant; anything else waits for a curator
// (intake_queue kind='claim'). A second claim on an already-claimed
// practitioner always waits, and the existing claimants hear about it.
//
// node_claims is local. What the public sees is derived from the approved
// claims and written through the normal patch path, so every change keeps
// its before-image (recordPrior): metadata.claimed = {at, handle, by[]}.
// Emails never leave the local tables.
//
// Handles are aliases to a node: node_aliases(source='handle'). That table
// is a CRR whose PK is (source, external_id), so a handle can belong to
// one node only — the uniqueness a CRR cannot get from a UNIQUE index. A
// replaced handle keeps its row, so old /@links still resolve and nobody
// else can pick it up.

import crypto from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { AuthedContributor } from "../auth.js";
import { insertSignal, priorValues, recordPrior } from "../utils/contribution.js";

export const CLAIMABLE_TYPES = ["practitioner", "collective", "institution"] as const;
export type ClaimVia = "invite" | "request" | "peer_invite" | "post_intake";
export type ClaimStatus = "pending" | "approved" | "rejected" | "withdrawn" | "revoked";

export interface Claim {
  id: string;
  node_id: string;
  contributor_id: string;
  status: ClaimStatus;
  via: ClaimVia;
  evidence: string | null;
  public_name: boolean;
  invited_by: string | null;
  queue_id: string | null;
  signal_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reason: string | null;
  created_at: string | null;
}

export class ClaimError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "ClaimError";
  }
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function rowToClaim(r: any): Claim {
  return {
    id: r.id,
    node_id: r.node_id,
    contributor_id: r.contributor_id,
    status: r.status,
    via: r.via,
    evidence: r.evidence ?? null,
    public_name: r.public_name !== 0,
    invited_by: r.invited_by ?? null,
    queue_id: r.queue_id ?? null,
    signal_id: r.signal_id ?? null,
    reviewed_by: r.reviewed_by ?? null,
    reviewed_at: r.reviewed_at ?? null,
    reason: r.reason ?? null,
    created_at: r.created_at ?? null,
  };
}

function parse(s: unknown): any {
  if (typeof s !== "string" || !s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

/** The contributor as the signal writers expect it (no token context). */
export function contributorById(db: DatabaseSync, id: string): AuthedContributor | null {
  const r = db.prepare("SELECT id, name, trust_tier FROM contributors WHERE id = ?").get(id) as any;
  if (!r) return null;
  return { id: r.id, name: r.name ?? "", trust_tier: r.trust_tier ?? "probationary", token_label: null, token_prefix: "claim", scope: "write" };
}

export function getClaim(db: DatabaseSync, id: string): Claim | null {
  const r = db.prepare("SELECT * FROM node_claims WHERE id = ?").get(id);
  return r ? rowToClaim(r) : null;
}

export function claimByQueueId(db: DatabaseSync, queueId: string): Claim | null {
  const r = db.prepare("SELECT * FROM node_claims WHERE queue_id = ?").get(queueId);
  return r ? rowToClaim(r) : null;
}

export function claimsOf(db: DatabaseSync, contributorId: string, statuses: ClaimStatus[] = ["approved", "pending"]): Claim[] {
  const ph = statuses.map(() => "?").join(",");
  return (db
    .prepare(`SELECT * FROM node_claims WHERE contributor_id = ? AND status IN (${ph}) ORDER BY created_at ASC, id ASC`)
    .all(contributorId, ...statuses) as any[]).map(rowToClaim);
}

export function approvedClaimsFor(db: DatabaseSync, nodeId: string): Claim[] {
  return (db
    .prepare("SELECT * FROM node_claims WHERE node_id = ? AND status = 'approved' ORDER BY reviewed_at ASC, created_at ASC")
    .all(nodeId) as any[]).map(rowToClaim);
}

export function hasApprovedClaim(db: DatabaseSync, contributorId: string, nodeId: string): boolean {
  return !!db
    .prepare("SELECT 1 FROM node_claims WHERE contributor_id = ? AND node_id = ? AND status = 'approved'")
    .get(contributorId, nodeId);
}

/** Node ids the contributor has an approved claim on, oldest first. */
export function claimedNodeIds(db: DatabaseSync, contributorId: string): string[] {
  return claimsOf(db, contributorId, ["approved"]).map((c) => c.node_id);
}

function claimableNode(db: DatabaseSync, nodeId: string): { id: string; type: string; name: string; slug: string; metadata: any } {
  const n = db.prepare("SELECT id, type, name, slug, metadata FROM nodes WHERE id = ?").get(nodeId) as any;
  if (!n) throw new ClaimError(404, "node_not_found", `no node with id ${nodeId}`);
  if (!(CLAIMABLE_TYPES as readonly string[]).includes(n.type)) {
    throw new ClaimError(400, "not_claimable", `only ${CLAIMABLE_TYPES.join(", ")} pages can be claimed`);
  }
  const meta = parse(n.metadata) ?? {};
  if (meta.retired === true) throw new ClaimError(400, "node_retired", "this page is retired");
  return { ...n, metadata: meta };
}

function selfNodeOf(db: DatabaseSync, contributorId: string): string | null {
  const r = db
    .prepare("SELECT self_node_id FROM contributor_emails WHERE contributor_id = ? AND self_node_id IS NOT NULL ORDER BY created_at ASC LIMIT 1")
    .get(contributorId) as any;
  return r?.self_node_id ?? null;
}

// ---- the public face ---------------------------------------------------------

/**
 * Rewrite metadata.claimed from the approved claims (or remove it when none
 * is left), anchored to `signalId` so the before-image is kept.
 */
export function publishClaimed(db: DatabaseSync, nodeId: string, signalId: string | null, opts: { handle?: string | null } = {}): void {
  const node = db.prepare("SELECT metadata, updated_by FROM nodes WHERE id = ?").get(nodeId) as any;
  if (!node) return;
  const prev = (parse(node.metadata) ?? {}).claimed ?? null;
  const approved = approvedClaimsFor(db, nodeId);
  let next: any = null;
  if (approved.length) {
    const names: string[] = [];
    for (const c of approved) {
      if (!c.public_name) continue;
      const r = db.prepare("SELECT name FROM contributors WHERE id = ?").get(c.contributor_id) as any;
      if (r?.name && !names.includes(r.name)) names.push(r.name);
    }
    const handle = opts.handle !== undefined ? opts.handle : prev?.handle ?? null;
    next = {
      at: prev?.at ?? approved[0]!.reviewed_at ?? nowIso(),
      by: names,
      ...(handle ? { handle } : {}),
      ...(prev?.handle_set_at && opts.handle === undefined ? { handle_set_at: prev.handle_set_at } : {}),
      ...(opts.handle ? { handle_set_at: nowIso() } : {}),
    };
  }
  if (JSON.stringify(prev) === JSON.stringify(next)) return;
  // The key is replaced whole (a merge-patch would keep stale nested names).
  const base = parse(node.metadata) ?? {};
  recordPrior(db, signalId, { op: "patch_node", node_id: nodeId, updated_by: node.updated_by ?? null, before: priorValues(base, ["claimed"]) });
  if (next) base.claimed = next;
  else delete base.claimed;
  db.prepare("UPDATE nodes SET metadata = ?, updated_by = 'claim' WHERE id = ?").run(JSON.stringify(base), nodeId);
}

function claimSignal(
  db: DatabaseSync,
  actor: AuthedContributor,
  title: string,
  content: Record<string, unknown>,
  sourceType = "claim"
): string {
  return insertSignal(db, {
    contributor: actor,
    title,
    content: JSON.stringify(content),
    source_type: sourceType,
    source_origin: "human_primary",
  });
}

// ---- lifecycle ------------------------------------------------------------------

export interface RequestClaimArgs {
  contributor: AuthedContributor;
  node_id: string;
  via?: ClaimVia;
  evidence?: string | null;
  handle?: string | null;
  public_name?: boolean;
  invited_by?: string | null;
}

export interface RequestClaimResult {
  claim: Claim;
  created: boolean;
  /** Other approved claimants of a practitioner this claim now contends with (§9 Q5). */
  conflicts_with: string[];
}

/**
 * Create a claim. Instant when the contributor's invite named this node
 * (`self_node_id`) or a claimed peer invited them to it; otherwise pending
 * with a curator queue row. Idempotent per (contributor, node) while a
 * claim is pending or approved.
 */
export function requestClaim(db: DatabaseSync, args: RequestClaimArgs): RequestClaimResult {
  const node = claimableNode(db, args.node_id);
  const existing = db
    .prepare("SELECT * FROM node_claims WHERE contributor_id = ? AND node_id = ? AND status IN ('pending','approved')")
    .get(args.contributor.id, node.id);
  if (existing) return { claim: rowToClaim(existing), created: false, conflicts_with: [] };

  const evidence = typeof args.evidence === "string" ? args.evidence.trim().slice(0, 4000) || null : null;
  const handle = args.handle ? normaliseHandle(args.handle) : null;
  if (args.handle && !handle) throw new ClaimError(400, "bad_handle", HANDLE_RULE);
  if (handle) {
    const a = handleAvailability(db, handle, node.id);
    if (!a.ok) throw new ClaimError(409, "handle_unavailable", a.reason);
  }

  const others = approvedClaimsFor(db, node.id).filter((c) => c.contributor_id !== args.contributor.id);
  const conflicts = node.type === "practitioner" ? others.map((c) => c.contributor_id) : [];
  const vouched = args.via === "peer_invite" || selfNodeOf(db, args.contributor.id) === node.id || args.via === "invite";
  // One person, one practitioner: a second claimant always goes to a curator.
  const instant = vouched && conflicts.length === 0;
  const via: ClaimVia = args.via ?? (selfNodeOf(db, args.contributor.id) === node.id ? "invite" : "request");

  const id = `clm_${crypto.randomBytes(8).toString("hex")}`;
  db.exec("BEGIN");
  try {
    db.prepare(
      "INSERT INTO node_claims (id, node_id, contributor_id, status, via, evidence, public_name, invited_by) VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)"
    ).run(id, node.id, args.contributor.id, via, evidence, args.public_name === false ? 0 : 1, args.invited_by ?? null);
    if (instant) {
      approveClaimInner(db, id, { by: via === "peer_invite" ? `peer:${args.invited_by ?? "?"}` : "invite", handle });
    } else {
      const queueId = `intake-${crypto.randomBytes(8).toString("hex")}`;
      db.prepare(
        "INSERT INTO intake_queue (id, signal_id, target_node, submitted_by, trust_tier, status, kind, proposed_nodes) VALUES (?, NULL, ?, ?, ?, 'pending', 'claim', ?)"
      ).run(queueId, node.id, args.contributor.name, args.contributor.trust_tier, JSON.stringify([{ op: "claim", claim_id: id, node_id: node.id, handle }]));
      db.prepare("UPDATE node_claims SET queue_id = ? WHERE id = ?").run(queueId, id);
    }
    db.exec("COMMIT");
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch { /* already rolled back */ }
    throw e;
  }
  return { claim: getClaim(db, id)!, created: true, conflicts_with: conflicts };
}

function approveClaimInner(db: DatabaseSync, claimId: string, opts: { by: string; handle?: string | null }): Claim {
  const c = getClaim(db, claimId);
  if (!c) throw new ClaimError(404, "claim_not_found", `no claim ${claimId}`);
  if (c.status !== "pending") throw new ClaimError(409, "claim_not_pending", `claim is ${c.status}`);
  const claimant = contributorById(db, c.contributor_id);
  if (!claimant) throw new ClaimError(404, "contributor_not_found", c.contributor_id);
  const at = nowIso();
  db.prepare("UPDATE node_claims SET status = 'approved', reviewed_by = ?, reviewed_at = ? WHERE id = ?").run(opts.by, at, claimId);
  const signalId = claimSignal(db, claimant, `Claim: ${c.node_id}`, { action: "claim", node_id: c.node_id, via: c.via, approved_by: opts.by, claim_id: c.id });
  db.prepare("UPDATE signals SET lived_experience = 1 WHERE id = ?").run(signalId);
  db.prepare("UPDATE node_claims SET signal_id = ? WHERE id = ?").run(signalId, claimId);
  let handle = opts.handle ?? null;
  if (handle) {
    const a = handleAvailability(db, handle, c.node_id);
    if (a.ok) insertHandleAlias(db, handle, c.node_id);
    else handle = null; // taken meanwhile: the claim still stands, pick another later
  }
  publishClaimed(db, c.node_id, signalId, handle ? { handle } : {});
  return getClaim(db, claimId)!;
}

/** Curator approval (review queue) — also the path for an approved access request. */
export function approveClaim(db: DatabaseSync, claimId: string, opts: { by: string }): Claim {
  const c = getClaim(db, claimId);
  if (!c) throw new ClaimError(404, "claim_not_found", `no claim ${claimId}`);
  let handle: string | null = null;
  if (c.queue_id) {
    const q = db.prepare("SELECT proposed_nodes FROM intake_queue WHERE id = ?").get(c.queue_id) as any;
    handle = (parse(q?.proposed_nodes) ?? [])[0]?.handle ?? null;
  }
  db.exec("BEGIN");
  try {
    const out = approveClaimInner(db, claimId, { by: opts.by, handle });
    if (c.queue_id) {
      db.prepare("UPDATE intake_queue SET status = 'approved', reviewed_by = ?, reviewed_at = ?, signal_id = ? WHERE id = ? AND status = 'pending'")
        .run(opts.by, nowIso(), out.signal_id, c.queue_id);
    }
    db.exec("COMMIT");
    return out;
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch { /* already rolled back */ }
    throw e;
  }
}

export function rejectClaim(db: DatabaseSync, claimId: string, opts: { by: string; reason: string }): Claim {
  const c = getClaim(db, claimId);
  if (!c) throw new ClaimError(404, "claim_not_found", `no claim ${claimId}`);
  if (c.status !== "pending") throw new ClaimError(409, "claim_not_pending", `claim is ${c.status}`);
  db.prepare("UPDATE node_claims SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, reason = ? WHERE id = ?")
    .run(opts.by, nowIso(), opts.reason, claimId);
  if (c.queue_id) {
    db.prepare("UPDATE intake_queue SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ? AND status = 'pending'")
      .run(opts.reason, opts.by, nowIso(), c.queue_id);
  }
  return getClaim(db, claimId)!;
}

/**
 * End a claim: the claimant withdraws it, or an admin revokes it. Both
 * leave a signal and rewrite metadata.claimed (before-image kept). The
 * handle stays with the node.
 */
export function endClaim(
  db: DatabaseSync,
  claimId: string,
  opts: { actor: AuthedContributor; mode: "withdrawn" | "revoked"; reason?: string | null }
): Claim {
  const c = getClaim(db, claimId);
  if (!c) throw new ClaimError(404, "claim_not_found", `no claim ${claimId}`);
  if (opts.mode === "withdrawn" && c.contributor_id !== opts.actor.id) throw new ClaimError(403, "not_your_claim", "only the claimant can withdraw a claim");
  if (c.status === "pending") {
    db.prepare("UPDATE node_claims SET status = ?, reviewed_by = ?, reviewed_at = ?, reason = ? WHERE id = ?")
      .run(opts.mode, opts.actor.name, nowIso(), opts.reason ?? null, claimId);
    if (c.queue_id) {
      db.prepare("UPDATE intake_queue SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ? AND status = 'pending'")
        .run(`claim ${opts.mode}`, opts.actor.name, nowIso(), c.queue_id);
    }
    return getClaim(db, claimId)!;
  }
  if (c.status !== "approved") throw new ClaimError(409, "claim_not_active", `claim is ${c.status}`);
  db.exec("BEGIN");
  try {
    db.prepare("UPDATE node_claims SET status = ?, reason = ? WHERE id = ?").run(opts.mode, opts.reason ?? null, claimId);
    const signalId = claimSignal(
      db,
      opts.actor,
      `${opts.mode === "withdrawn" ? "Claim withdrawn" : "Claim revoked"}: ${c.node_id}`,
      { action: opts.mode === "withdrawn" ? "withdraw_claim" : "revoke_claim", node_id: c.node_id, claim_id: c.id, reason: opts.reason ?? null },
      opts.mode === "revoked" ? "api_admin" : "claim"
    );
    publishClaimed(db, c.node_id, signalId);
    db.exec("COMMIT");
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch { /* already rolled back */ }
    throw e;
  }
  return getClaim(db, claimId)!;
}

/**
 * Every invite that named a node (contributor_emails.self_node_id) is an
 * approved claim. Idempotent; run at boot and by the invite paths.
 */
export function backfillInviteClaims(db: DatabaseSync): number {
  const rows = db
    .prepare(
      `SELECT e.contributor_id, e.self_node_id FROM contributor_emails e
        WHERE e.self_node_id IS NOT NULL AND e.invited_at IS NOT NULL AND e.revoked_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM node_claims c WHERE c.contributor_id = e.contributor_id AND c.node_id = e.self_node_id)`
    )
    .all() as Array<{ contributor_id: string; self_node_id: string }>;
  let n = 0;
  for (const r of rows) {
    const who = contributorById(db, r.contributor_id);
    if (!who) continue;
    try {
      requestClaim(db, { contributor: who, node_id: r.self_node_id, via: "invite" });
      n++;
    } catch (e) {
      if (!(e instanceof ClaimError)) throw e; // a node that is not claimable / gone: skip
    }
  }
  return n;
}

// ---- handles ---------------------------------------------------------------------

export const HANDLE_RULE = "a handle is 3–30 characters: a–z, 0–9, '.', '_' or '-', starting and ending with a letter or digit";
const HANDLE_RE = /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])$/;
const RESERVED = new Set([
  "adai", "a-dai", "admin", "administrator", "api", "auth", "batch", "claim", "claims", "contribute", "curator", "draft",
  "field", "graph", "help", "history", "home", "internal", "invite", "login", "logout", "me", "moderator", "neighbours",
  "review", "root", "skill", "staff", "support", "system", "www", "artwork", "practitioner", "concept", "collective",
  "institution", "platform", "project", "publication", "scene", "classification_regime", "event", "related", "explore",
]);

export function normaliseHandle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const h = raw.trim().replace(/^@/, "").toLowerCase();
  return HANDLE_RE.test(h) ? h : null;
}

export function handleAvailability(db: DatabaseSync, handle: string, forNode?: string | null): { ok: true } | { ok: false; reason: string } {
  const h = normaliseHandle(handle);
  if (!h) return { ok: false, reason: HANDLE_RULE };
  if (RESERVED.has(h)) return { ok: false, reason: "that handle is reserved" };
  const row = db.prepare("SELECT node_id FROM node_aliases WHERE source = 'handle' AND external_id = ?").get(h) as any;
  if (row && row.node_id !== forNode) return { ok: false, reason: "that handle is taken" };
  return { ok: true };
}

function insertHandleAlias(db: DatabaseSync, handle: string, nodeId: string): void {
  db.prepare(
    "INSERT OR IGNORE INTO node_aliases (source, external_id, node_id, created_at) VALUES ('handle', ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))"
  ).run(handle, nodeId);
}

export const HANDLE_CHANGE_DAYS = 30;

/** Set or change a claimed node's handle. Approved claimants only; one change per 30 days. */
export function setHandle(db: DatabaseSync, args: { contributor: AuthedContributor; node_id: string; handle: string }): { handle: string; node_id: string } {
  if (!hasApprovedClaim(db, args.contributor.id, args.node_id)) throw new ClaimError(403, "not_claimant", "only an approved claimant can set this page's handle");
  const h = normaliseHandle(args.handle);
  if (!h) throw new ClaimError(400, "bad_handle", HANDLE_RULE);
  const a = handleAvailability(db, h, args.node_id);
  if (!a.ok) throw new ClaimError(409, "handle_unavailable", a.reason);
  const node = db.prepare("SELECT metadata FROM nodes WHERE id = ?").get(args.node_id) as any;
  const claimed = (parse(node?.metadata) ?? {}).claimed ?? {};
  if (claimed.handle === h) return { handle: h, node_id: args.node_id };
  if (claimed.handle && claimed.handle_set_at) {
    const since = Date.now() - Date.parse(claimed.handle_set_at);
    if (since < HANDLE_CHANGE_DAYS * 86_400_000) {
      throw new ClaimError(429, "handle_change_too_soon", `a handle can change once every ${HANDLE_CHANGE_DAYS} days`);
    }
  }
  db.exec("BEGIN");
  try {
    insertHandleAlias(db, h, args.node_id);
    const signalId = claimSignal(db, args.contributor, `Handle @${h}: ${args.node_id}`, { action: "set_handle", node_id: args.node_id, handle: h, previous: claimed.handle ?? null });
    publishClaimed(db, args.node_id, signalId, { handle: h });
    db.exec("COMMIT");
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch { /* already rolled back */ }
    throw e;
  }
  return { handle: h, node_id: args.node_id };
}

/** The node behind a handle (current or former), or null. */
export function resolveHandle(db: DatabaseSync, raw: string): { id: string; type: string; slug: string } | null {
  const h = typeof raw === "string" ? raw.trim().replace(/^@/, "").toLowerCase() : "";
  if (!h) return null;
  return (db
    .prepare("SELECT n.id, n.type, n.slug FROM node_aliases a JOIN nodes n ON n.id = a.node_id WHERE a.source = 'handle' AND a.external_id = ?")
    .get(h) as any) ?? null;
}

/** Suggested handle for a node: its slug, shortened and de-duplicated. */
export function suggestHandle(db: DatabaseSync, nodeId: string): string | null {
  const n = db.prepare("SELECT slug, metadata FROM nodes WHERE id = ?").get(nodeId) as any;
  if (!n) return null;
  const current = (parse(n.metadata) ?? {}).claimed?.handle;
  if (current) return current;
  let base = String(n.slug ?? "").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "").slice(0, 30);
  if (base.length < 3) base = (base + "-page").slice(0, 30);
  if (handleAvailability(db, base, nodeId).ok) return base;
  for (let i = 2; i < 100; i++) {
    const cand = `${base.slice(0, 27)}-${i}`;
    if (handleAvailability(db, cand, nodeId).ok) return cand;
  }
  return null;
}
