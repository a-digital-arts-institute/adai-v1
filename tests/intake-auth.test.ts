// Magic links + sessions (docs/URL-INTAKE-SPEC.md §4): single use, expiry,
// cookie round trip, invite tier applied on first login, no local-part names.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { freshDb } from "./helpers.js";
import {
  issueMagicLink,
  consumeMagicLink,
  ensureContributorForEmail,
  contributorByEmail,
  issueSession,
  readSession,
  deleteSession,
  normaliseEmail,
  cookieHeader,
  SESSION_COOKIE,
  isInvited,
  recordAccessRequest,
  revokeInvite,
} from "../src/intake/auth.js";

before(() => {
  process.env.SESSION_SECRET = "test-secret-at-least-16-chars";
});

function fakeReq(cookie?: string): any {
  return { header: (n: string) => (n.toLowerCase() === "cookie" ? cookie : undefined), socket: { remoteAddress: "127.0.0.1" } };
}

describe("magic links", () => {
  it("consume once, then 'used'", () => {
    const db = freshDb();
    const link = issueMagicLink(db, { email: "a@example.org", purpose: "login" });
    assert.match(link.url, /\/auth\//);
    const r1 = consumeMagicLink(db, link.raw);
    assert.equal(r1.ok, true);
    const r2 = consumeMagicLink(db, link.raw);
    assert.equal(r2.ok, false);
    assert.equal(!r2.ok && r2.reason, "used");
  });

  it("expired links are refused", () => {
    const db = freshDb();
    const link = issueMagicLink(db, { email: "a@example.org", purpose: "login" });
    db.prepare("UPDATE magic_links SET expires_at = '2000-01-01T00:00:00Z'").run();
    const r = consumeMagicLink(db, link.raw);
    assert.equal(!r.ok && r.reason, "expired");
  });

  it("unknown token is invalid; redirect must be a local path", () => {
    const db = freshDb();
    assert.equal(consumeMagicLink(db, "nope").ok, false);
    const l = issueMagicLink(db, { email: "a@example.org", purpose: "draft_ready", redirect: "https://evil.example/x" });
    const r = consumeMagicLink(db, l.raw);
    assert.equal(r.ok && r.redirect, null);
    const l2 = issueMagicLink(db, { email: "a@example.org", purpose: "draft_ready", redirect: "/draft/drf_1" });
    assert.equal(consumeMagicLink(db, l2.raw).redirect, "/draft/drf_1");
  });
});

describe("contributors from email", () => {
  it("invite sets tier + name; first login keeps them", () => {
    const db = freshDb();
    const inv = ensureContributorForEmail(db, { email: "artist@studio.example", name: "Artist Name", tier: "auto", self_node_id: "practitioner:artist" });
    assert.equal(inv.trust_tier, "auto");
    const again = ensureContributorForEmail(db, { email: "artist@studio.example", verified: true });
    assert.equal(again.id, inv.id);
    assert.equal(again.name, "Artist Name");
    assert.equal(again.trust_tier, "auto");
    assert.equal(again.self_node_id, "practitioner:artist");
    const row = db.prepare("SELECT verified_at FROM contributor_emails WHERE email = ?").get("artist@studio.example") as any;
    assert.ok(row.verified_at);
  });

  it("uninvited first login is probationary with an EMPTY name (never the email local part)", () => {
    const db = freshDb();
    const c = ensureContributorForEmail(db, { email: "someone@example.org", verified: true });
    assert.equal(c.trust_tier, "probationary");
    assert.equal(c.name, "");
    const row = db.prepare("SELECT name, trust_tier FROM contributors WHERE id = ?").get(c.id) as any;
    assert.equal(row.name, "");
    assert.equal(row.trust_tier, "probationary");
  });

  it("contributor ids get a collision suffix", () => {
    const db = freshDb();
    const a = ensureContributorForEmail(db, { email: "sam@one.example" });
    const b = ensureContributorForEmail(db, { email: "sam@two.example" });
    assert.equal(a.id, "contributor:sam");
    assert.equal(b.id, "contributor:sam-2");
    assert.equal(contributorByEmail(db, "sam@two.example")!.id, "contributor:sam-2");
  });

  it("normaliseEmail lowercases and validates", () => {
    assert.equal(normaliseEmail("  Foo@Example.ORG "), "foo@example.org");
    assert.equal(normaliseEmail("nope"), null);
    assert.equal(normaliseEmail(42), null);
  });
});

describe("sessions", () => {
  it("cookie round trip, tamper rejection, delete revokes", () => {
    const db = freshDb();
    const c = ensureContributorForEmail(db, { email: "a@example.org", name: "A", tier: "reviewed", verified: true, invite: true });
    const { session_id, signed } = issueSession(db, c.id);
    const cookie = cookieHeader(signed, 100, false).split(";")[0]!;
    const s = readSession(db, fakeReq(cookie));
    assert.ok(s);
    assert.equal(s!.contributor.id, c.id);
    assert.equal(s!.contributor.trust_tier, "reviewed");
    assert.equal(s!.email, "a@example.org");
    // tamper
    const bad = `${SESSION_COOKIE}=${encodeURIComponent(signed.slice(0, -2) + "00")}`;
    assert.equal(readSession(db, fakeReq(bad)), null);
    assert.equal(readSession(db, fakeReq(undefined)), null);
    deleteSession(db, session_id);
    assert.equal(readSession(db, fakeReq(cookie)), null);
  });

  it("expired sessions are dropped", () => {
    const db = freshDb();
    const c = ensureContributorForEmail(db, { email: "a@example.org", name: "A" });
    const { signed } = issueSession(db, c.id);
    db.prepare("UPDATE contributor_sessions SET expires_at = '2000-01-01T00:00:00Z'").run();
    assert.equal(readSession(db, fakeReq(`${SESSION_COOKIE}=${encodeURIComponent(signed)}`)), null);
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM contributor_sessions").get() as any).n, 0);
  });
});

describe("invite-only", () => {
  it("only invited, unrevoked addresses may hold a session; revoking ends it at once", () => {
    const db = freshDb();
    const stranger = ensureContributorForEmail(db, { email: "s@example.org", verified: true });
    assert.equal(isInvited(db, "s@example.org"), false);
    const s1 = issueSession(db, stranger.id);
    assert.equal(readSession(db, fakeReq(cookieHeader(s1.signed, 100, false).split(";")[0]!)), null, "uninvited: no session");

    const invited = ensureContributorForEmail(db, { email: "i@example.org", name: "Irina", invite: true });
    assert.equal(isInvited(db, "i@example.org"), true);
    const s2 = issueSession(db, invited.id);
    const cookie = cookieHeader(s2.signed, 100, false).split(";")[0]!;
    assert.ok(readSession(db, fakeReq(cookie)));
    assert.equal(revokeInvite(db, "i@example.org"), true);
    assert.equal(isInvited(db, "i@example.org"), false);
    assert.equal(readSession(db, fakeReq(cookie)), null, "revoked: session gone");
    // re-inviting restores access; the contributor (and their history) is the same
    const again = ensureContributorForEmail(db, { email: "i@example.org", invite: true });
    assert.equal(again.id, invited.id);
    assert.equal(isInvited(db, "i@example.org"), true);
  });

  it("an unused link dies with the invite", () => {
    const db = freshDb();
    ensureContributorForEmail(db, { email: "i@example.org", name: "I", invite: true });
    const link = issueMagicLink(db, { email: "i@example.org", purpose: "login", redirect: null, ip: null });
    revokeInvite(db, "i@example.org");
    const raw = link.url.split("/auth/")[1]!;
    assert.equal(consumeMagicLink(db, raw).ok, false);
  });

  it("access requests notify the admins at most daily, and an invite clears the request", () => {
    const db = freshDb();
    assert.equal(recordAccessRequest(db, "x@example.org"), true);
    assert.equal(recordAccessRequest(db, "x@example.org"), false);
    assert.equal((db.prepare("SELECT count FROM intake_access_requests WHERE email = 'x@example.org'").get() as any).count, 2);
    ensureContributorForEmail(db, { email: "x@example.org", name: "X", invite: true });
    assert.equal(db.prepare("SELECT 1 FROM intake_access_requests WHERE email = 'x@example.org'").get(), undefined);
  });
});
