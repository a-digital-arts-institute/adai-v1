// Magic-link login + contributor sessions for the URL intake
// (docs/URL-INTAKE-SPEC.md §4).
//
// No passwords, no token paste. A contributor types an email, gets a
// single-use link (15 min), and lands with an HMAC-signed session cookie
// (30 days, sliding). Notification emails carry 7-day links with a
// redirect so a phone tap logs in and lands on the right page.
//
// All tables here are local-only. `contributors` (a CRR) is only ever
// INSERTed into with the same shape token-mint.ts uses; per-contributor
// intake data (email, self node) lives on contributor_emails.

import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { getDb } from "../db.js";
import { requireToken, type AuthedContributor } from "../auth.js";
import { slugify } from "../utils/slug.js";

export const SESSION_COOKIE = "adai_session";
const SESSION_DAYS = 30;
const LOGIN_LINK_MINUTES = 15;
const NOTIFY_LINK_DAYS = 7;

export type LinkPurpose = "login" | "draft_ready" | "receipt";

export interface ContributorSession {
  session_id: string;
  contributor: AuthedContributor;
  email: string;
  self_node_id: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      intakeSession?: ContributorSession;
    }
  }
}

// ---- config ----------------------------------------------------------

function secret(): string | null {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) return null;
  return s;
}

export function isSessionConfigured(): boolean {
  return !!secret();
}

export function baseUrl(): string {
  return (process.env.ADAI_BASE_URL || "https://adai-basel.fly.dev").replace(/\/+$/, "");
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function plusIso(ms: number): string {
  return new Date(Date.now() + ms).toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

// ---- email -------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normaliseEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  if (e.length > 254 || !EMAIL_RE.test(e)) return null;
  return e;
}

// ---- rate limiting (in-memory, per process) -----------------------------

const loginHits = new Map<string, number[]>();
function hit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (loginHits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) { loginHits.set(key, arr); return false; }
  arr.push(now);
  loginHits.set(key, arr);
  return true;
}

export function loginRateOk(email: string, ip: string | null): boolean {
  const hour = 60 * 60 * 1000;
  const okEmail = hit(`e:${email}`, 5, hour);
  const okIp = ip ? hit(`ip:${ip}`, 30, hour) : true;
  return okEmail && okIp;
}

export function clientIp(req: Request): string | null {
  return req.header("x-forwarded-for")?.split(",")[0]?.trim() || req.socket.remoteAddress || null;
}

// ---- magic links ---------------------------------------------------------

export interface IssuedLink {
  raw: string;
  url: string;
  expires_at: string;
}

export function issueMagicLink(
  db: DatabaseSync,
  args: { email: string; purpose: LinkPurpose; redirect?: string | null; ip?: string | null }
): IssuedLink {
  const raw = crypto.randomBytes(24).toString("base64url");
  const ttl = args.purpose === "login" ? LOGIN_LINK_MINUTES * 60_000 : NOTIFY_LINK_DAYS * 86_400_000;
  const expires_at = plusIso(ttl);
  const redirect = args.redirect && args.redirect.startsWith("/") && !args.redirect.startsWith("//") ? args.redirect : null;
  db.prepare(
    "INSERT INTO magic_links (token_hash, email, purpose, redirect, expires_at, ip) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(sha256(raw), args.email, args.purpose, redirect, expires_at, args.ip ?? null);
  return { raw, url: `${baseUrl()}/auth/${raw}`, expires_at };
}

export type ConsumeResult =
  | { ok: true; email: string; purpose: LinkPurpose; redirect: string | null }
  | { ok: false; reason: "invalid" | "expired" | "used"; redirect: string | null };

export function consumeMagicLink(db: DatabaseSync, raw: string): ConsumeResult {
  if (!raw || raw.length > 128) return { ok: false, reason: "invalid", redirect: null };
  const row = db
    .prepare("SELECT email, purpose, redirect, expires_at, used_at FROM magic_links WHERE token_hash = ?")
    .get(sha256(raw)) as any;
  if (!row) return { ok: false, reason: "invalid", redirect: null };
  if (row.used_at) return { ok: false, reason: "used", redirect: row.redirect ?? null };
  if (row.expires_at < nowIso()) return { ok: false, reason: "expired", redirect: row.redirect ?? null };
  db.prepare("UPDATE magic_links SET used_at = ? WHERE token_hash = ?").run(nowIso(), sha256(raw));
  return { ok: true, email: row.email, purpose: row.purpose, redirect: row.redirect ?? null };
}

// ---- contributors ---------------------------------------------------------

export interface ContributorRecord {
  id: string;
  name: string;
  trust_tier: string;
  email: string;
  self_node_id: string | null;
}

function contributorIdForEmail(db: DatabaseSync, email: string): string {
  const local = email.split("@")[0] ?? "contributor";
  const base = `contributor:${slugify(local).replace(/[^a-z0-9-]/g, "") || "contributor"}`;
  let id = base;
  for (let n = 2; n < 1000; n++) {
    const exists = db.prepare("SELECT 1 FROM contributors WHERE id = ?").get(id);
    if (!exists) return id;
    id = `${base}-${n}`;
  }
  return `${base}-${crypto.randomBytes(3).toString("hex")}`;
}

/** Look up the contributor behind an email (invited or previously logged in). */
export function contributorByEmail(db: DatabaseSync, email: string): ContributorRecord | null {
  const row = db
    .prepare(
      `SELECT c.id, c.name, c.trust_tier, e.email, e.self_node_id
         FROM contributor_emails e JOIN contributors c ON c.id = e.contributor_id
        WHERE e.email = ?`
    )
    .get(email) as any;
  if (!row) return null;
  return { id: row.id, name: row.name ?? "", trust_tier: row.trust_tier ?? "probationary", email: row.email, self_node_id: row.self_node_id ?? null };
}

/**
 * Invite (CLI) or first-login: make sure a contributor + email row exists.
 * The display name is intentionally EMPTY for uninvited first logins — the
 * email local part must never become a public attribution (§4.2); the UI
 * asks for a name before a URL can be submitted.
 */
export function ensureContributorForEmail(
  db: DatabaseSync,
  args: { email: string; name?: string | null; tier?: string | null; self_node_id?: string | null; verified?: boolean }
): ContributorRecord {
  const existing = contributorByEmail(db, args.email);
  if (existing) {
    const updates: string[] = [];
    const params: unknown[] = [];
    if (args.self_node_id !== undefined) { updates.push("self_node_id = ?"); params.push(args.self_node_id); }
    if (args.verified) { updates.push("verified_at = COALESCE(verified_at, ?)"); params.push(nowIso()); }
    if (updates.length) {
      params.push(args.email);
      db.prepare(`UPDATE contributor_emails SET ${updates.join(", ")} WHERE email = ?`).run(...(params as any[]));
    }
    if (args.name && args.name !== existing.name) {
      db.prepare("UPDATE contributors SET name = ? WHERE id = ?").run(args.name, existing.id);
    }
    if (args.tier && args.tier !== existing.trust_tier) {
      db.prepare("UPDATE contributors SET trust_tier = ? WHERE id = ?").run(args.tier, existing.id);
    }
    return contributorByEmail(db, args.email)!;
  }
  const id = contributorIdForEmail(db, args.email);
  const tier = args.tier || "probationary";
  const name = args.name?.trim() || "";
  db.prepare(
    "INSERT INTO contributors (id, name, type, trust_tier, contributions, approved_count) VALUES (?, ?, 'human', ?, 0, 0)"
  ).run(id, name, tier);
  db.prepare(
    "INSERT INTO contributor_emails (email, contributor_id, self_node_id, verified_at) VALUES (?, ?, ?, ?)"
  ).run(args.email, id, args.self_node_id ?? null, args.verified ? nowIso() : null);
  return { id, name, trust_tier: tier, email: args.email, self_node_id: args.self_node_id ?? null };
}

export function setContributorName(db: DatabaseSync, contributorId: string, name: string): void {
  db.prepare("UPDATE contributors SET name = ? WHERE id = ?").run(name, contributorId);
}

// ---- sessions ---------------------------------------------------------------

function sign(sessionId: string, key: string): string {
  return crypto.createHmac("sha256", key).update(sessionId).digest("hex");
}

function parseCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    const val = part.slice(eq + 1).trim();
    try { return decodeURIComponent(val); } catch { return val; }
  }
  return null;
}

function verifySigned(signed: string, key: string): string | null {
  const dot = signed.lastIndexOf(".");
  if (dot < 0) return null;
  const id = signed.slice(0, dot);
  const sig = signed.slice(dot + 1);
  if (!id || !sig || !/^[0-9a-f]+$/i.test(sig)) return null;
  const expected = sign(id, key);
  if (sig.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;
  } catch {
    return null;
  }
  return id;
}

export function cookieHeader(signed: string, maxAgeS: number, secure: boolean): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(signed)}; Path=/; Max-Age=${maxAgeS}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function issueSession(
  db: DatabaseSync,
  contributorId: string,
  meta: { ip?: string | null; user_agent?: string | null } = {}
): { session_id: string; signed: string } {
  const key = secret();
  if (!key) throw new Error("SESSION_SECRET is not set (>=16 chars)");
  const session_id = crypto.randomBytes(16).toString("hex");
  db.prepare(
    "INSERT INTO contributor_sessions (session_id, contributor_id, expires_at, last_seen_at, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(session_id, contributorId, plusIso(SESSION_DAYS * 86_400_000), nowIso(), meta.ip ?? null, meta.user_agent ?? null);
  return { session_id, signed: `${session_id}.${sign(session_id, key)}` };
}

export function readSession(db: DatabaseSync, req: Request): ContributorSession | null {
  const key = secret();
  if (!key) return null;
  const cookie = parseCookie(req.header("cookie"), SESSION_COOKIE);
  if (!cookie) return null;
  const sessionId = verifySigned(cookie, key);
  if (!sessionId) return null;
  const row = db
    .prepare(
      `SELECT s.session_id, s.expires_at, c.id, c.name, c.trust_tier, e.email, e.self_node_id
         FROM contributor_sessions s
         JOIN contributors c ON c.id = s.contributor_id
         LEFT JOIN contributor_emails e ON e.contributor_id = c.id
        WHERE s.session_id = ?
        ORDER BY e.created_at ASC LIMIT 1`
    )
    .get(sessionId) as any;
  if (!row) return null;
  if (row.expires_at < nowIso()) {
    db.prepare("DELETE FROM contributor_sessions WHERE session_id = ?").run(sessionId);
    return null;
  }
  // Sliding window: bump expiry + last_seen (cheap, one UPDATE per request).
  db.prepare("UPDATE contributor_sessions SET last_seen_at = ?, expires_at = ? WHERE session_id = ?")
    .run(nowIso(), plusIso(SESSION_DAYS * 86_400_000), sessionId);
  return {
    session_id: row.session_id,
    email: row.email ?? "",
    self_node_id: row.self_node_id ?? null,
    contributor: {
      id: row.id,
      name: row.name ?? "",
      trust_tier: row.trust_tier ?? "probationary",
      token_label: "session",
      token_prefix: "session",
      scope: "write",
    },
  };
}

export function deleteSession(db: DatabaseSync, sessionId: string): void {
  db.prepare("DELETE FROM contributor_sessions WHERE session_id = ?").run(sessionId);
}

export function setSessionCookie(res: Response, signed: string): void {
  const secure = process.env.NODE_ENV === "production" || baseUrl().startsWith("https://");
  res.append("Set-Cookie", cookieHeader(signed, SESSION_DAYS * 86_400, secure));
}

export function clearSessionCookie(res: Response): void {
  res.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
}

// ---- middleware ------------------------------------------------------------------

/** Session cookie only. Populates req.intakeSession + req.contributor. */
export function requireSession(req: Request, res: Response, next: NextFunction): void {
  const s = readSession(getDb(), req);
  if (!s) {
    res.status(401).json({ error: "login_required" });
    return;
  }
  req.intakeSession = s;
  req.contributor = s.contributor;
  next();
}

/**
 * Session cookie OR bearer token — the draft JSON is usable from an external
 * assistant holding a /api/v1 token too. Populates req.contributor either way.
 */
export function requireContributor(req: Request, res: Response, next: NextFunction): void {
  const s = readSession(getDb(), req);
  if (s) {
    req.intakeSession = s;
    req.contributor = s.contributor;
    next();
    return;
  }
  const h = req.header("authorization");
  if (h && /^Bearer\s+/i.test(h)) {
    requireToken(req, res, next);
    return;
  }
  res.status(401).json({ error: "login_required", hint: "sign in at /contribute or send Authorization: Bearer <token>" });
}

/** Self node for the request's contributor when authenticated by token (no session row). */
export function selfNodeFor(db: DatabaseSync, contributorId: string): string | null {
  const row = db
    .prepare("SELECT self_node_id FROM contributor_emails WHERE contributor_id = ? AND self_node_id IS NOT NULL LIMIT 1")
    .get(contributorId) as any;
  return row?.self_node_id ?? null;
}

/** Primary email for a contributor (for notifications). */
export function emailFor(db: DatabaseSync, contributorId: string): string | null {
  const row = db
    .prepare("SELECT email FROM contributor_emails WHERE contributor_id = ? ORDER BY created_at ASC LIMIT 1")
    .get(contributorId) as any;
  return row?.email ?? null;
}

/** Housekeeping: drop expired links + sessions. Called opportunistically. */
export function sweepAuth(db: DatabaseSync): void {
  const now = nowIso();
  db.prepare("DELETE FROM magic_links WHERE expires_at < ? OR (used_at IS NOT NULL AND used_at < ?)").run(now, plusIso(-30 * 86_400_000));
  db.prepare("DELETE FROM contributor_sessions WHERE expires_at < ?").run(now);
}
