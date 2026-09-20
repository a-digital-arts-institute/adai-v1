// confirmDraft (docs/URL-INTAKE-SPEC.md §10): cid ordering, auto tier
// materialises, probationary queues ONE row that approveIntakeItem replays,
// everything rolls back on a throw, and nothing leaves the draft unaccepted.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { freshDb, insertNode } from "./helpers.js";
import { createDraft, claimJob, finishPass, getDraft, runDraftTool, contributorPatchCandidate, confirmDraft, batchReceipt, enqueueChat, DraftError } from "../src/intake/draft.js";
import { approveIntakeItem } from "../src/utils/review.js";
import { revokeSignal } from "../src/utils/admin-actions.js";
import type { AuthedContributor } from "../src/auth.js";

function contributor(db: ReturnType<typeof freshDb>, tier: string): AuthedContributor {
  const id = `contributor:${tier}-tester`;
  db.prepare("INSERT INTO contributors (id, name, type, trust_tier, contributions, approved_count) VALUES (?, ?, 'human', ?, 0, 0)").run(id, `${tier} tester`, tier);
  return { id, name: `${tier} tester`, trust_tier: tier, token_label: null, token_prefix: "t", scope: "write" };
}

const mirror = async (url: string) => ({
  upload: { key: "images/ab/abcd.jpg", url: "https://cdn.example/images/ab/abcd.jpg", sha256: "abcd", bytes: 10, content_type: "image/jpeg", already_existed: false },
  mime: "image/jpeg",
  source_url: url,
  final_url: url,
});

function buildDraft(db: ReturnType<typeof freshDb>, c: AuthedContributor) {
  insertNode(db, "practitioner:casey-reas", "practitioner", "Casey Reas");
  insertNode(db, "institution:bitforms", "institution", "bitforms gallery");
  insertNode(db, "practitioner:ben-fry", "practitioner", "Ben Fry");
  const d = createDraft(db, c.id, "https://reas.example/");
  claimJob(db, "w1");
  const W = "w1";
  const pg = { page_url: "https://reas.example/works", quote: "Process 4 (2005) by Casey Reas was shown at bitforms." };
  runDraftTool(db, d.id, W, "propose_node", { type: "artwork", name: "Process 4", metadata: { year: "2005" }, ...pg }); // c_01 new
  runDraftTool(db, d.id, W, "propose_node", { type: "practitioner", name: "Casey Reas", resolves_to: "practitioner:casey-reas", resolution: "exact", ...pg }); // c_02 link
  runDraftTool(db, d.id, W, "propose_edge", { source: "cid:c_01", target: "cid:c_02", edge_type: "CREATED_BY", confidence: "high", ...pg }); // c_03
  runDraftTool(db, d.id, W, "propose_edge", { source: "cid:c_01", target: "institution:bitforms", edge_type: "EXHIBITED_AT", event_time: "2005", confidence: "medium", ...pg }); // c_04
  runDraftTool(db, d.id, W, "propose_image", { for: "cid:c_01", image_url: "https://reas.example/p4.jpg", page_url: pg.page_url }); // c_05
  runDraftTool(db, d.id, W, "ask_contributor", { text: "Did Ben Fry influence this work?", if_yes: { source: "practitioner:ben-fry", target: "cid:c_01", edge_type: "INFLUENCES" } }); // c_06
  runDraftTool(db, d.id, W, "note_known", { node_id: "practitioner:casey-reas", summary: "already here" }); // c_07
  runDraftTool(db, d.id, W, "propose_node", { type: "artwork", name: "Rejected Work", ...pg }); // c_08 stays proposed
  runDraftTool(db, d.id, W, "set_subject", { node_id: "practitioner:casey-reas" });
  finishPass(db, d.id, W, { summary: "s" });
  let dr = getDraft(db, d.id)!;
  for (const cid of ["c_01", "c_02", "c_03", "c_04", "c_05"]) contributorPatchCandidate(db, dr, cid, { state: "accepted" });
  contributorPatchCandidate(db, dr, "c_06", { answered_yes: true, answer: "Yes — Ben's early sketches shaped Process 4." });
  return getDraft(db, d.id)!;
}

describe("confirmDraft", () => {
  it("auto tier: materialises nodes, edges, image; one batch; receipt", async () => {
    const db = freshDb();
    const c = contributor(db, "auto");
    const d = buildDraft(db, c);
    const r = await confirmDraft(db, d, c, { mirror });
    assert.equal(r.status, "live");
    assert.equal(r.batch_id, d.id);
    assert.deepEqual(r.created_nodes, ["artwork:process-4"]);
    assert.deepEqual(r.linked_nodes, ["practitioner:casey-reas"]);
    assert.equal(r.edges.length, 3);
    assert.equal(r.images.length, 1);
    assert.equal(r.skipped.length, 0);

    const node = db.prepare("SELECT id, metadata FROM nodes WHERE id = 'artwork:process-4'").get() as any;
    assert.ok(node);
    const md = JSON.parse(node.metadata);
    assert.equal(md.year, "2005");
    assert.equal(md.cdn_image_url, "https://cdn.example/images/ab/abcd.jpg");
    assert.equal(md.image_url, "https://reas.example/p4.jpg");
    const alias = db.prepare("SELECT node_id FROM node_aliases WHERE source = 'web' AND external_id = ?").get("https://reas.example/works") as any;
    assert.equal(alias.node_id, "artwork:process-4");

    const edges = db.prepare("SELECT source_id, target_id, edge_type, event_time FROM edges WHERE valid_until IS NULL ORDER BY edge_type").all() as any[];
    assert.deepEqual(edges.map((e) => [e.source_id, e.edge_type, e.target_id]), [
      ["artwork:process-4", "CREATED_BY", "practitioner:casey-reas"],
      ["artwork:process-4", "EXHIBITED_AT", "institution:bitforms"],
      ["practitioner:ben-fry", "INFLUENCES", "artwork:process-4"],
    ]);
    assert.equal(edges[1].event_time, "2005");

    const sigs = db.prepare("SELECT source_type, source_origin, batch_id, content, provenance_chain FROM signals WHERE batch_id = ?").all(d.id) as any[];
    assert.equal(sigs.length, 6); // anchor + 5 ops
    assert.ok(sigs.every((s) => s.source_origin === "url_intake"));
    const attested = sigs.find((s) => s.source_type === "contributor_attested");
    assert.match(attested.content, /Ben's early sketches/);
    const opSig = sigs.find((s) => s.source_type === "api_url_intake" && /^Process 4 \(2005\)/.test(s.content));
    assert.equal(JSON.parse(opSig.provenance_chain).draft_id, d.id);

    const intake = db.prepare("SELECT status FROM intake_queue").all() as any[];
    assert.equal(intake.length, 5);
    assert.ok(intake.every((i) => i.status === "approved"));

    const after = getDraft(db, d.id)!;
    assert.equal(after.status, "submitted");
    assert.deepEqual(after.intake_ids, r.intake_ids);
    // rejected/proposed/known never leave the draft
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM nodes WHERE id = 'artwork:rejected-work'").get()!.n, 0);

    const receipt = batchReceipt(db, d.id)!;
    assert.equal(receipt.review_state, "live");
    assert.equal((receipt.edges as any[]).length, 3);
    assert.equal(receipt.contributor, "auto tester");
  });

  it("probationary: one pending row that approveIntakeItem replays", async () => {
    const db = freshDb();
    const c = contributor(db, "probationary");
    const d = buildDraft(db, c);
    const r = await confirmDraft(db, d, c, { mirror });
    assert.equal(r.status, "review");
    assert.equal(r.intake_ids.length, 1);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM nodes WHERE id = 'artwork:process-4'").get()!.n, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM edges").get()!.n, 0);
    const row = db.prepare("SELECT status, kind, proposed_nodes, proposed_edges, target_node FROM intake_queue").get() as any;
    assert.equal(row.status, "pending");
    assert.equal(row.kind, "human_signal");
    assert.equal(row.target_node, "practitioner:casey-reas");
    const nodesOps = JSON.parse(row.proposed_nodes);
    assert.deepEqual(nodesOps.map((o: any) => o.op), ["create_node", "attach_image"]);
    assert.equal(JSON.parse(row.proposed_edges).length, 3);
    assert.equal(batchReceipt(db, d.id)!.review_state, "pending");

    const ok = approveIntakeItem(db, r.intake_ids[0]!, "curator");
    assert.equal(ok.ok, true);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM nodes WHERE id = 'artwork:process-4'").get()!.n, 1);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM edges WHERE valid_until IS NULL").get()!.n, 3);
    const md = JSON.parse((db.prepare("SELECT metadata FROM nodes WHERE id = 'artwork:process-4'").get() as any).metadata);
    assert.equal(md.cdn_image_url, "https://cdn.example/images/ab/abcd.jpg");
    assert.equal(batchReceipt(db, d.id)!.review_state, "live");
  });

  it("preserves reviewed question provenance and individual revocation", async () => {
    const db = freshDb();
    const c = contributor(db, "probationary");
    const d = buildDraft(db, c);
    const r = await confirmDraft(db, d, c, { mirror });
    approveIntakeItem(db, r.intake_ids[0]!);
    const edge = db.prepare(`SELECT e.signal_id, s.source_type, s.content FROM edges e
      JOIN signals s ON s.id=e.signal_id WHERE e.edge_type='INFLUENCES'`).get() as any;
    assert.equal(edge.source_type, "contributor_attested");
    assert.match(edge.content, /Ben's early sketches/);
    revokeSignal(db, edge.signal_id, { by: "curator", reason: "correction" });
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM edges WHERE edge_type='INFLUENCES' AND valid_until IS NULL").get()!.n, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM edges WHERE valid_until IS NULL").get()!.n, 2);
  });

  it("rejects a confirmation if a card is rejected during image mirroring", async () => {
    const db = freshDb();
    const c = contributor(db, "auto");
    const d = buildDraft(db, c);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const pending = confirmDraft(db, d, c, { mirror: async (url) => { await gate; return mirror(url); } });
    contributorPatchCandidate(db, getDraft(db, d.id)!, "c_03", { state: "rejected" });
    release();
    await assert.rejects(pending, (e: any) => e.code === "conflict");
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM signals").get()!.n, 0);
    assert.equal(getDraft(db, d.id)!.status, "ready");
  });

  it("does not expose a receipt before submission", () => {
    const db = freshDb();
    const c = contributor(db, "auto");
    const d = buildDraft(db, c);
    assert.equal(batchReceipt(db, d.id), null);
  });

  it("does not let the worker rewrite an answered question or supply an answer", () => {
    const db = freshDb();
    const c = contributor(db, "auto");
    const d = buildDraft(db, c);
    enqueueChat(db, d, "Read more");
    claimJob(db, "w2", d.id);
    assert.throws(() => runDraftTool(db, d.id, "w2", "update_candidate", {
      cid: "c_06", patch: { question: { answered_yes: false, answer: "No" } },
    }), /touched by the contributor/);
    runDraftTool(db, d.id, "w2", "ask_contributor", { text: "Another question?", if_yes: {
      source: "practitioner:casey-reas", target: "practitioner:ben-fry", edge_type: "INFLUENCES",
    } });
    assert.throws(() => runDraftTool(db, d.id, "w2", "update_candidate", {
      cid: "c_09", patch: { question: { answered_yes: true, answer: "Yes" } },
    }), /only the contributor/);
  });

  it("rolls back everything when a write throws; draft stays ready", async () => {
    const db = freshDb();
    const c = contributor(db, "auto");
    const d = buildDraft(db, c);
    const broken = { ...c, name: undefined as any }; // node:sqlite refuses to bind undefined → throws mid-transaction
    await assert.rejects(confirmDraft(db, d, broken, { mirror }));
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM signals").get()!.n, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM nodes WHERE id = 'artwork:process-4'").get()!.n, 0);
    assert.equal(getDraft(db, d.id)!.status, "ready");
  });

  it("refuses when nothing is accepted, when a job is pending, or for someone else's draft", async () => {
    const db = freshDb();
    const c = contributor(db, "auto");
    const other = contributor(db, "reviewed");
    insertNode(db, "practitioner:x", "practitioner", "X");
    const d = createDraft(db, c.id, "https://a.example/");
    claimJob(db, "w1");
    runDraftTool(db, d.id, "w1", "note_known", { node_id: "practitioner:x", summary: "known" });
    finishPass(db, d.id, "w1", { summary: "s" });
    const ready = getDraft(db, d.id)!;
    await assert.rejects(confirmDraft(db, ready, c, { mirror }), (e: any) => e instanceof DraftError && e.code === "nothing_to_submit");
    await assert.rejects(confirmDraft(db, ready, other, { mirror }), (e: any) => e.code === "forbidden");
  });

  it("skips dependents of un-accepted nodes and reports them", async () => {
    const db = freshDb();
    const c = contributor(db, "auto");
    insertNode(db, "practitioner:p", "practitioner", "P");
    const d = createDraft(db, c.id, "https://a.example/");
    claimJob(db, "w1");
    const pg = { page_url: "https://a.example/", quote: "Work W by P" };
    runDraftTool(db, d.id, "w1", "propose_node", { type: "artwork", name: "W", ...pg });
    runDraftTool(db, d.id, "w1", "propose_edge", { source: "cid:c_01", target: "practitioner:p", edge_type: "CREATED_BY", confidence: "high", ...pg });
    finishPass(db, d.id, "w1", { summary: "s" });
    contributorPatchCandidate(db, getDraft(db, d.id)!, "c_02", { state: "accepted" }); // edge accepted, node not
    await assert.rejects(confirmDraft(db, getDraft(db, d.id)!, c, { mirror }), (e: any) => e.code === "nothing_to_submit" && /not accepted/.test(e.message));
  });
});
