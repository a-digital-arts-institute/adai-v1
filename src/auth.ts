// Bearer-token auth for the /api/v1/* contributor API.
//
// Tokens are minted out-of-band via `npm run token:issue` (see src/cli/
// issue-token.ts) and never round-tripped through the HTTP surface. We store
// only the sha256 hash; the raw token is shown to the operator once and then
// forgotten by the server. A `revoked_at` timestamp soft-deletes a token
// without disturbing audit history.
//
// On a successful authentication we attach `req.contributor` to the request
// so downstream handlers can read the trust tier and contributor id without
// re-querying. The trust tier is the existing field on `contributors` — we
// reuse the same auto/reviewed/probationary semantics as the legacy web
// form (see src/routes/api.ts → POST /api/contribute).

import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { getDb } from "./db.js";

export interface AuthedContributor {
  id: string;
  name: string;
  trust_tier: string;
  token_label: string | null;
  token_prefix: string;
  scope: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      contributor?: AuthedContributor;
    }
  }
}

function extractBearer(req: Request): string | null {
  const h = req.header("authorization") || req.header("Authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : null;
}

export function requireToken(req: Request, res: Response, next: NextFunction): void {
  const raw = extractBearer(req);
  if (!raw) {
    res.status(401).json({ error: "missing_token", hint: "send Authorization: Bearer <token>" });
    return;
  }
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const db = getDb();
  const row = db
    .prepare(
      `SELECT t.token_hash, t.token_prefix, t.label, t.scope, t.revoked_at,
              c.id AS contributor_id, c.name AS contributor_name, c.trust_tier
         FROM contributor_tokens t
         JOIN contributors c ON t.contributor_id = c.id
        WHERE t.token_hash = ?`
    )
    .get(hash) as any;

  if (!row) {
    res.status(401).json({ error: "invalid_token" });
    return;
  }
  if (row.revoked_at) {
    res.status(401).json({ error: "revoked_token", revoked_at: row.revoked_at });
    return;
  }

  // Fire-and-forget last_used_at update. Not awaited (sync API anyway) and
  // not wrapped in a transaction — slightly racy but only audit metadata.
  try {
    db.prepare("UPDATE contributor_tokens SET last_used_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE token_hash = ?")
      .run(hash);
  } catch {
    // Don't fail a request because we couldn't update an audit timestamp.
  }

  req.contributor = {
    id: row.contributor_id,
    name: row.contributor_name,
    trust_tier: row.trust_tier ?? "probationary",
    token_label: row.label ?? null,
    token_prefix: row.token_prefix,
    scope: row.scope ?? "write",
  };
  next();
}

// Convenience predicate: callers checking the trust gate.
export function isAutoMerge(trustTier: string): boolean {
  return trustTier === "auto" || trustTier === "reviewed";
}

// Stricter middleware that requires the bearer token to carry scope='admin'.
// Use it on token-management endpoints. Order matters — chain after
// requireToken so req.contributor is populated.
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireToken(req, res, () => {
    if (req.contributor?.scope !== "admin") {
      res.status(403).json({ error: "admin_scope_required" });
      return;
    }
    next();
  });
}
