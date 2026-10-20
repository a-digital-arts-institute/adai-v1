// "Posted as you" (#70, point 4): once a page is claimed, what a token linked
// to it contributed shows on the claimant's /me. The bylines stay the
// token's; the claimant can ask to withdraw a contribution or a whole batch,
// and a curator decides (uphold = unlink: signals revoked, their relations
// ended; no page is retired).

import { it } from "node:test";
import assert from "node:assert/strict";
import express from "express";

process.env.SESSION_SECRET = "test-secret-at-least-16-chars";
process.env.MAIL_TRANSPORT = "stdout";
process.env.ADMIN_EMAILS = "curator@adai.test";
delete process.env.ADMIN_NOTIFY_EMAILS;
delete process.env.INTAKE_OPEN;

const { initDb } = await import("../src/db.js");
const { default: intake } = await import("../src/routes/intake.js");
const { default: claim } = await import("../src/routes/claim.js");
const { default: pages } = await import("../src/routes/pages.js");
const { default: api } = await import("../src/routes/api.js");
const { default: contributorApi } = await import("../src/routes/contributor-api.js");
const { ensureContributorForEmail, issueSession, cookieHeader } = await import("../src/intake/auth.js");
const { mintToken } = await import("../src/utils/token-mint.js");

it("posted as you: listed on /me, withdrawal asked by the claimant, decided by a curator", async () => {
  const db = initDb(":memory:");
  const admin = mintToken(db, { contributorName: "Op", createIfMissing: true, tier: "auto", scope: "admin" });
  const outlier = mintToken(db, { contributorName: "Outlier Collection", createIfMissing: true, tier: "auto" });
  const other = mintToken(db, { contributorName: "Someone Else", createIfMissing: true, tier: "auto" });
  db.prepare("INSERT INTO nodes (id, type, name, slug, metadata) VALUES ('practitioner:ben-laposky', 'practitioner', 'Ben Laposky', 'ben-laposky', '{}')").run();

  const app = express(); app.use(express.json()); app.use(intake); app.use(claim); app.use(contributorApi); app.use(pages); app.use(api);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const v1 = async (method: string, path: string, token: string, body?: unknown) => {
    const r = await fetch(base + path, { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, json: await r.json() as any };
  };
  const call = async (method: string, path: string, who: { cookie: string } | null, body?: unknown) => {
    const r = await fetch(base + path, { method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(who ? { cookie: who.cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const text = await r.text();
    let json: any = null; try { json = JSON.parse(text); } catch { /* html */ }
    return { status: r.status, json, text };
  };
  const session = (email: string, name: string, extra: any = {}) => {
    const c = ensureContributorForEmail(db, { email, name, invite: true, ...extra });
    const { signed } = issueSession(db, c.id);
    return { id: c.id, cookie: cookieHeader(signed, 100, false).split(";")[0]! };
  };

  try {
    // The Outlier token posts its institution and two works in one batch …
    const inst = await v1("POST", "/api/v1/nodes", outlier.raw_token, { type: "institution", name: "The Outlier Collection", batch_id: "outlier-1" });
    assert.equal(inst.status, 200);
    const instId = inst.json.node_id as string;
    const works: string[] = [];
    for (const name of ["Oscillon 1184", "Oscillation 4"]) {
      const w = await v1("POST", "/api/v1/nodes", outlier.raw_token, { type: "artwork", name, batch_id: "outlier-1" });
      works.push(w.json.node_id);
      assert.equal((await v1("POST", "/api/v1/edges", outlier.raw_token, { source_id: w.json.node_id, target_id: instId, edge_type: "HELD_BY", batch_id: "outlier-1" })).status, 200);
    }
    // … a batch someone else shares with it …
    const mixedOwn = await v1("POST", "/api/v1/edges", outlier.raw_token, { source_id: works[0], target_id: "practitioner:ben-laposky", edge_type: "CREATED_BY", batch_id: "mixed" });
    await v1("POST", "/api/v1/edges", other.raw_token, { source_id: works[1], target_id: "practitioner:ben-laposky", edge_type: "CREATED_BY", batch_id: "mixed" });
    // … and someone else's contribution of their own.
    const theirs = await v1("POST", "/api/v1/edges", other.raw_token, { source_id: works[1], target_id: instId, edge_type: "EXHIBITED_AT", batch_id: "elsewhere" });
    assert.equal((await v1("PATCH", `/api/v1/tokens/${outlier.token_prefix}`, admin.raw_token, { node: instId })).status, 200);

    // The institution's person claims the page (invited for it: instant).
    const ada = session("ada@outlier.art", "Ada", { self_node_id: instId });
    const curator = session("curator@adai.test", "Cura");
    const claimed = await call("POST", "/api/claims", ada, { node_id: instId });
    assert.equal(claimed.json.claim.status, "approved");

    // /me lists what was posted as the page, by batch, with the token's byline
    let log = (await call("GET", `/api/me/log?node=${encodeURIComponent(instId)}`, ada)).json;
    assert.deepEqual(log.posted_as.as, ["Outlier Collection"]);
    const b1 = log.posted_as.batches.find((b: any) => b.batch_id === "outlier-1");
    const mixed = log.posted_as.batches.find((b: any) => b.batch_id === "mixed");
    assert.equal(b1.contributions.length, 5);
    assert.equal(b1.can_withdraw_batch, true);
    assert.equal(mixed.contributions.length, 1, "only the token's own part of a shared batch");
    assert.equal(mixed.can_withdraw_batch, true);
    assert.equal(mixed.batch_signals, 1);
    assert.equal(mixed.batch_others, 1);
    assert.ok(log.posted_as.batches.every((b: any) => b.contributions.every((c: any) => c.by === "Outlier Collection")));
    // someone without the claim has no posted_as on their log
    const eve = session("eve@x.org", "Eve");
    assert.equal((await call("GET", "/api/me/log", eve)).json.node, null);

    // what they cannot ask
    let r = await call("POST", "/api/me/contest", ada, { node_id: instId, withdraw: { signal_id: theirs.json.signal_id }, note: "not ours" });
    assert.equal(r.status, 403, "someone else's contribution");
    r = await call("POST", "/api/me/contest", ada, { node_id: instId, withdraw: { batch_id: "elsewhere" }, note: "all of it" });
    assert.equal(r.status, 403, "a batch with nothing posted as the page");
    r = await call("POST", "/api/me/contest", eve, { node_id: instId, withdraw: { batch_id: "outlier-1" }, note: "x" });
    assert.equal(r.status, 403, "not the claimant");

    // a single one in the shared batch, then dismissed: nothing changes
    r = await call("POST", "/api/me/contest", ada, { node_id: instId, withdraw: { signal_id: mixedOwn.json.signal_id }, note: "we never said who made it" });
    assert.equal(r.status, 201);
    assert.deepEqual(r.json.note.withdraw, { signal_id: mixedOwn.json.signal_id, batch_id: null });
    assert.equal((await call("POST", "/api/me/contest", ada, { node_id: instId, withdraw: { signal_id: mixedOwn.json.signal_id }, note: "again" })).status, 409);
    assert.match((await call("GET", `/institution/the-outlier-collection/contributions`, null)).text, /the subject asked to withdraw this/);
    assert.equal((await call("POST", `/api/review/${r.json.note.queue_id}/reject`, curator, { reason: "the catalogue says so" })).status, 200);
    assert.equal((db.prepare("SELECT status FROM signals WHERE id = ?").get(mixedOwn.json.signal_id) as any).status, "active");

    // a shared batch: the request covers only what was posted as the page
    r = await call("POST", "/api/me/contest", ada, { node_id: instId, withdraw: { batch_id: "mixed" }, note: "our part of it" });
    assert.equal(r.status, 201);
    assert.match((await call("GET", "/review?kind=contest", curator)).text, /1 contribution by others in the batch stays/);
    assert.equal((await call("POST", `/api/review/${r.json.note.queue_id}/approve`, curator, {})).status, 200);
    const mixedRows = db.prepare("SELECT submitted_by, status FROM signals WHERE batch_id = 'mixed' ORDER BY submitted_by").all() as any[];
    assert.deepEqual(mixedRows.map((x) => x.status), ["revoked", "active"], "Outlier's part revoked, Someone Else's kept");

    // the whole first batch; the review card says what upholding does
    r = await call("POST", "/api/me/contest", ada, { node_id: instId, withdraw: { batch_id: "outlier-1" }, note: "posted on our behalf before we checked it" });
    assert.equal(r.status, 201);
    const queueId = r.json.note.queue_id;
    const one = log.posted_as.batches.find((b: any) => b.batch_id === "outlier-1").contributions[0].signal_id;
    assert.equal((await call("POST", "/api/me/contest", ada, { node_id: instId, withdraw: { signal_id: one }, note: "x" })).status, 409, "already covered by the batch request");
    log = (await call("GET", `/api/me/log?node=${encodeURIComponent(instId)}`, ada)).json;
    assert.ok(log.posted_as.batches.find((b: any) => b.batch_id === "outlier-1").requested);
    const card = (await call("GET", "/review?kind=contest", curator)).text;
    assert.match(card, /Uphold — withdraw it/);
    assert.match(card, /No page is retired/);
    assert.doesNotMatch(card, /retires \d/);

    assert.equal((await call("POST", `/api/review/${queueId}/approve`, curator, {})).status, 200);
    const signals = db.prepare("SELECT status, submitted_by FROM signals WHERE batch_id = 'outlier-1'").all() as any[];
    assert.ok(signals.length >= 5 && signals.every((s) => s.status === "revoked"), "signals revoked");
    assert.ok(signals.every((s) => s.submitted_by === "Outlier Collection" || s.submitted_by === outlier.contributor_id), "bylines unchanged");
    for (const id of [...works, instId]) {
      assert.notEqual(JSON.parse((db.prepare("SELECT metadata FROM nodes WHERE id = ?").get(id) as any).metadata).retired, true, `${id} stays: a withdrawal unlinks, it hides nothing`);
    }
    // what others said about the works stays live
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM edges WHERE edge_type = 'EXHIBITED_AT' AND valid_until IS NULL").get() as any).n, 1);
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM edges WHERE edge_type = 'HELD_BY' AND valid_until IS NULL").get() as any).n, 0);
    const note = db.prepare("SELECT state FROM relation_notes WHERE queue_id = ?").get(queueId) as any;
    assert.equal(note.state, "upheld");
    log = (await call("GET", `/api/me/log?node=${encodeURIComponent(instId)}`, ada)).json;
    assert.equal(log.posted_as.batches.find((b: any) => b.batch_id === "outlier-1"), undefined);
    assert.ok(log.my_notes.some((n: any) => n.withdraw?.batch_id === "outlier-1" && n.state === "upheld"));
  } finally {
    server.close();
  }
});
