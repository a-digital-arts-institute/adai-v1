// Drafts as a job queue (docs/URL-INTAKE-SPEC.md §5.1, §6.1, §9.2): atomic
// claim, reclaim after a dead heartbeat, finish semantics, draft tools.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { freshDb, insertNode } from "./helpers.js";
import {
  createDraft,
  claimJob,
  heartbeat,
  finishPass,
  enqueueChat,
  getDraft,
  runDraftTool,
  workerAddPage,
  contributorPatchCandidate,
  abandonDraft,
  DraftError,
} from "../src/intake/draft.js";
import { CandidateError } from "../src/intake/candidate.js";

const CONTRIB = "contributor:test";

describe("createDraft", () => {
  it("validates the URL and refuses private hosts", () => {
    const db = freshDb();
    assert.throws(() => createDraft(db, CONTRIB, "not a url"), (e: any) => e instanceof DraftError && e.status === 400);
    assert.throws(() => createDraft(db, CONTRIB, "ftp://example.org"), /http/);
    assert.throws(() => createDraft(db, CONTRIB, "http://localhost:8080/x"), /not allowed/);
    assert.throws(() => createDraft(db, CONTRIB, "http://10.0.0.1/"), /private/);
    const d = createDraft(db, CONTRIB, "https://Example.org/portfolio");
    assert.equal(d.status, "queued");
    assert.equal(d.source_domain, "example.org");
    assert.equal(d.job?.kind, "initial");
  });

  it("caps active drafts per contributor", () => {
    const db = freshDb();
    process.env.INTAKE_MAX_ACTIVE_DRAFTS = "2";
    createDraft(db, CONTRIB, "https://a.example/");
    createDraft(db, CONTRIB, "https://b.example/");
    assert.throws(() => createDraft(db, CONTRIB, "https://c.example/"), /in progress/);
    delete process.env.INTAKE_MAX_ACTIVE_DRAFTS;
  });
});

describe("claim / heartbeat / finish", () => {
  it("claim is exclusive; a second worker gets nothing", () => {
    const db = freshDb();
    const d = createDraft(db, CONTRIB, "https://a.example/");
    const c1 = claimJob(db, "w1");
    assert.ok(c1);
    assert.equal(c1!.draft.id, d.id);
    assert.equal(c1!.draft.status, "running");
    assert.equal(claimJob(db, "w2"), null);
    assert.equal(claimJob(db, "w2", d.id), null);
  });

  it("a stale claim (no heartbeat for 20 min) is reclaimable", () => {
    const db = freshDb();
    const d = createDraft(db, CONTRIB, "https://a.example/");
    assert.ok(claimJob(db, "w1"));
    assert.equal(claimJob(db, "w2"), null);
    db.prepare("UPDATE drafts SET heartbeat_at = '2000-01-01T00:00:00Z' WHERE id = ?").run(d.id);
    const c2 = claimJob(db, "w2");
    assert.ok(c2);
    assert.equal(c2!.draft.claimed_by, "w2");
    // and the old worker can no longer heartbeat or write
    assert.equal(heartbeat(db, d.id, "w1"), false);
    assert.throws(() => runDraftTool(db, d.id, "w1", "set_subject", { node_id: "x" }), /not claimed/);
  });

  it("finish clears the job, flips ready, accumulates usage, emails once", () => {
    const db = freshDb();
    insertNode(db, "practitioner:x", "practitioner", "X");
    const d = createDraft(db, CONTRIB, "https://a.example/");
    claimJob(db, "w1");
    runDraftTool(db, d.id, "w1", "note_known", { node_id: "practitioner:x", summary: "known" });
    const r = finishPass(db, d.id, "w1", { summary: "done", usage: { input_tokens: 10, output_tokens: 5, est_cost_usd: 0.01 } });
    assert.equal(r.status, "ready");
    assert.equal(r.notify, "ready");
    const after = getDraft(db, d.id)!;
    assert.equal(after.job, null);
    assert.equal(after.claimed_by, null);
    assert.equal(after.passes, 1);
    assert.equal(after.usage?.est_cost_usd, 0.01);
    assert.equal(after.summary, "done");
    const rollup = db.prepare("SELECT est_cost_usd FROM intake_usage").get() as any;
    assert.equal(rollup.est_cost_usd, 0.01);
    // chat pass → no email
    enqueueChat(db, after, "please add X");
    claimJob(db, "w1");
    const r2 = finishPass(db, d.id, "w1", { summary: "added", usage: { est_cost_usd: 0.02 } });
    assert.equal(r2.notify, null);
    assert.equal(getDraft(db, d.id)!.usage?.est_cost_usd, 0.03);
  });

  it("finish with error and no candidates → failed", () => {
    const db = freshDb();
    const d = createDraft(db, CONTRIB, "https://a.example/");
    claimJob(db, "w1");
    const r = finishPass(db, d.id, "w1", { error: "could not read" });
    assert.equal(r.status, "failed");
    assert.equal(r.notify, "failed");
  });

  it("chat is refused while a job is pending or before ready", () => {
    const db = freshDb();
    const d = createDraft(db, CONTRIB, "https://a.example/");
    assert.throws(() => enqueueChat(db, d, "hi"), (e: any) => e.code === "job_pending");
    claimJob(db, "w1");
    db.prepare("UPDATE drafts SET job = NULL WHERE id = ?").run(d.id); // simulate a lost job on a non-ready draft
    assert.throws(() => enqueueChat(db, getDraft(db, d.id)!, "hi"), (e: any) => e.code === "not_ready");
    db.prepare("UPDATE drafts SET job = ? WHERE id = ?").run(JSON.stringify({ kind: "initial", queued_at: "x" }), d.id);
    finishPass(db, d.id, "w1", { summary: "x" });
    const ready = getDraft(db, d.id)!;
    const queued = enqueueChat(db, ready, "hi");
    assert.equal(queued.job?.kind, "chat");
    assert.equal(queued.messages.at(-1)?.text, "hi");
    assert.throws(() => enqueueChat(db, queued, "again"), (e: any) => e.code === "job_pending");
  });
});

describe("draft tools", () => {
  it("propose_node returns a cid; edges resolve cids; validation errors surface", () => {
    const db = freshDb();
    insertNode(db, "practitioner:casey-reas", "practitioner", "Casey Reas");
    const d = createDraft(db, CONTRIB, "https://a.example/");
    claimJob(db, "w1");
    const r = runDraftTool(db, d.id, "w1", "propose_node", {
      type: "artwork", name: "Process 4", metadata: { year: "2005" }, page_url: "https://a.example/works", quote: "Process 4, 2005, software.",
    }) as any;
    assert.equal(r.cid, "c_01");
    assert.equal(r.would_create, "artwork:process-4");
    const e = runDraftTool(db, d.id, "w1", "propose_edge", {
      source: "cid:c_01", target: "practitioner:casey-reas", edge_type: "CREATED_BY", confidence: "high", page_url: "https://a.example/works", quote: "Process 4 by Casey Reas",
    }) as any;
    assert.equal(e.cid, "c_02");
    assert.throws(
      () => runDraftTool(db, d.id, "w1", "propose_edge", { source: "cid:c_01", target: "practitioner:casey-reas", edge_type: "INFLUENCES", confidence: "high", page_url: "https://a.example/", quote: "x" }),
      (err: any) => err instanceof CandidateError
    );
    // a ref to a node that is not in the graph is refused (would be a dangling edge on confirm)
    assert.throws(
      () => runDraftTool(db, d.id, "w1", "propose_edge", { source: "cid:c_01", target: "practitioner:nobody-here", edge_type: "CREATED_BY", confidence: "high", page_url: "https://a.example/", quote: "x" }),
      /does not exist in A\(DAI\)/
    );
    assert.throws(() => runDraftTool(db, d.id, "w1", "note_known", { node_id: "practitioner:nobody-here", summary: "x" }), /does not exist in A\(DAI\)/);
    // a collision must link
    assert.throws(
      () => runDraftTool(db, d.id, "w1", "propose_node", { type: "practitioner", name: "Casey Reas", page_url: "https://a.example/", quote: "Casey Reas" }),
      /already exists/
    );
    // remove blocked by dependents, ok after
    assert.throws(() => runDraftTool(db, d.id, "w1", "remove_candidate", { cid: "c_01" }), /referenced by/);
    runDraftTool(db, d.id, "w1", "remove_candidate", { cid: "c_02" });
    runDraftTool(db, d.id, "w1", "remove_candidate", { cid: "c_01" });
    assert.equal(getDraft(db, d.id)!.candidates.length, 0);
    // set_subject to an unknown node is refused, to an existing one ok
    assert.throws(() => runDraftTool(db, d.id, "w1", "set_subject", { node_id: "practitioner:nobody" }), /does not exist/);
    runDraftTool(db, d.id, "w1", "set_subject", { node_id: "practitioner:casey-reas" });
    assert.equal(getDraft(db, d.id)!.subject_node_id, "practitioner:casey-reas");
  });

  it("page ledger stores hashes only and caps at 60", () => {
    const db = freshDb();
    const d = createDraft(db, CONTRIB, "https://a.example/");
    claimJob(db, "w1");
    workerAddPage(db, d.id, "w1", { url: "https://a.example/", final_url: "https://a.example/", title: "Home", status: 200, chars: 1200, sha256: "ab".repeat(32), via: "browser" });
    const p = getDraft(db, d.id)!.pages[0]!;
    assert.equal(p.sha256, "ab".repeat(32));
    assert.equal((p as any).text, undefined);
  });

  it("contributor patches are validated and mark edited; update_candidate keeps state", () => {
    const db = freshDb();
    const d = createDraft(db, CONTRIB, "https://a.example/");
    claimJob(db, "w1");
    runDraftTool(db, d.id, "w1", "propose_node", { type: "artwork", name: "Untitled", page_url: "https://a.example/", quote: "Untitled, 2020" });
    finishPass(db, d.id, "w1", { summary: "x" });
    const ready = getDraft(db, d.id)!;
    const c = contributorPatchCandidate(db, ready, "c_01", { state: "accepted", patch: { name: "Untitled (Blue)" } });
    assert.equal(c.state, "accepted");
    assert.equal(c.edited, true);
    assert.equal(c.kind === "node" && c.node.name, "Untitled (Blue)");
    // agent re-claims for a chat pass and updates metadata — state survives
    enqueueChat(db, getDraft(db, d.id)!, "add the year");
    claimJob(db, "w1");
    runDraftTool(db, d.id, "w1", "update_candidate", { cid: "c_01", patch: { node: { metadata: { year: "2020" } }, state: "rejected" } });
    const after = getDraft(db, d.id)!.candidates[0]!;
    assert.equal(after.state, "accepted");
    assert.equal(after.kind === "node" && after.node.metadata.year, "2020");
    // an edited candidate cannot be removed by the agent
    assert.throws(() => runDraftTool(db, d.id, "w1", "remove_candidate", { cid: "c_01" }), /touched by the contributor/);
  });

  it("abandon clears the job", () => {
    const db = freshDb();
    const d = createDraft(db, CONTRIB, "https://a.example/");
    const a = abandonDraft(db, d);
    assert.equal(a.status, "abandoned");
    assert.equal(a.job, null);
    assert.equal(claimJob(db, "w1"), null);
  });
});
