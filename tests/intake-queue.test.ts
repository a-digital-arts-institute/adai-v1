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
  enqueueContinue,
  priorContext,
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

  it("page ledger stores hashes only", () => {
    const db = freshDb();
    const d = createDraft(db, CONTRIB, "https://a.example/");
    claimJob(db, "w1");
    workerAddPage(db, d.id, "w1", { url: "https://a.example/", final_url: "https://a.example/", title: "Home", status: 200, chars: 1200, sha256: "ab".repeat(32), via: "browser" });
    const p = getDraft(db, d.id)!.pages[0]!;
    assert.equal(p.sha256, "ab".repeat(32));
    assert.equal((p as any).text, undefined);
  });

  it("contributor-touched cards cannot be changed or removed by the worker", () => {
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
    // A new pass must not silently change already approved content.
    enqueueChat(db, getDraft(db, d.id)!, "add the year");
    claimJob(db, "w1");
    assert.throws(() => runDraftTool(db, d.id, "w1", "update_candidate", { cid: "c_01", patch: { node: { metadata: { year: "2021" } }, state: "rejected" } }), /touched by the contributor/);
    const after = getDraft(db, d.id)!.candidates[0]!;
    assert.equal(after.state, "accepted");
    assert.equal(after.kind === "node" && after.node.metadata.year, undefined);
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

describe("passes that build on each other", () => {
  const evid = { page_url: "https://gallery.example/artists", quote: "Auriea Harvey" };

  it("abandoning a running draft takes the claim away from the worker", () => {
    const db = freshDb();
    const d = createDraft(db, CONTRIB, "https://gallery.example/");
    claimJob(db, "w1");
    abandonDraft(db, getDraft(db, d.id)!);
    assert.equal(heartbeat(db, d.id, "w1"), false);
    assert.throws(() => runDraftTool(db, d.id, "w1", "propose_node", { type: "practitioner", name: "X", ...evid }), (e: any) => e.code === "not_claimed");
    assert.throws(() => finishPass(db, d.id, "w1", { summary: "late" }), (e: any) => e.code === "not_claimed");
    assert.equal(getDraft(db, d.id)!.status, "abandoned");
    // and it no longer counts as active
    process.env.INTAKE_MAX_ACTIVE_DRAFTS = "1";
    createDraft(db, CONTRIB, "https://other.example/");
    delete process.env.INTAKE_MAX_ACTIVE_DRAFTS;
  });

  it("note_survey merges; the owner sees it", () => {
    const db = freshDb();
    const d = createDraft(db, CONTRIB, "https://gallery.example/");
    claimJob(db, "w1");
    assert.throws(() => runDraftTool(db, d.id, "w1", "note_survey", { site_kind: "shop" }), CandidateError);
    runDraftTool(db, d.id, "w1", "note_survey", { site_kind: "gallery", inventory: [{ label: "artists", count: 34, url: "https://gallery.example/artists" }, { label: "exhibitions", count: 52 }], plan: "roster first, then 3 shows per year" });
    runDraftTool(db, d.id, "w1", "note_survey", { covered: "roster 34 of 34; exhibitions 9 of 52", remaining: "exhibitions before 2021" });
    const sv = getDraft(db, d.id)!.survey!;
    assert.equal(sv.site_kind, "gallery");
    assert.equal(sv.inventory.length, 2);
    assert.equal(sv.inventory[0]!.count, 34);
    assert.match(sv.plan!, /roster first/);
    assert.match(sv.remaining!, /before 2021/);
  });

  it("continue: queued as its own job kind, with the contributor's steer; same gates as chat", () => {
    const db = freshDb();
    const d = createDraft(db, CONTRIB, "https://gallery.example/");
    assert.throws(() => enqueueContinue(db, d), (e: any) => e.code === "job_pending");
    claimJob(db, "w1");
    finishPass(db, d.id, "w1", { summary: "x" });
    const q = enqueueContinue(db, getDraft(db, d.id)!, "  Auriea Harvey  ");
    assert.equal(q.status, "queued");
    assert.deepEqual({ kind: q.job?.kind, message: q.job?.message }, { kind: "continue", message: "Auriea Harvey" });
    assert.match(q.messages.at(-1)!.text, /Auriea Harvey/);
    const c = claimJob(db, "w2");
    assert.equal(c?.job.kind, "continue");
    // a continue pass never re-sends the "draft ready" email
    db.prepare("UPDATE drafts SET notified_ready_at = 'x' WHERE id = ?").run(d.id);
    assert.equal(finishPass(db, d.id, "w2", { summary: "more" }).notify, null);
    process.env.INTAKE_MAX_PASSES = "2";
    assert.throws(() => enqueueContinue(db, getDraft(db, d.id)!), (e: any) => e.code === "pass_limit");
    delete process.env.INTAKE_MAX_PASSES;
  });

  it("a rejected card cannot be proposed again; same-titled artworks still can", () => {
    const db = freshDb();
    insertNode(db, "institution:gallery", "institution", "Gallery");
    const d = createDraft(db, CONTRIB, "https://gallery.example/");
    claimJob(db, "w1");
    runDraftTool(db, d.id, "w1", "propose_node", { type: "practitioner", name: "Auriea Harvey", ...evid }); // c_01
    runDraftTool(db, d.id, "w1", "propose_edge", { source: "institution:gallery", target: "cid:c_01", edge_type: "REPRESENTS", confidence: "high", page_url: evid.page_url, quote: "Represented artists: Auriea Harvey" }); // c_02
    runDraftTool(db, d.id, "w1", "propose_node", { type: "institution", name: "Some Fair", ...evid }); // c_03
    runDraftTool(db, d.id, "w1", "propose_node", { type: "artwork", name: "Untitled", ...evid }); // c_04
    finishPass(db, d.id, "w1", { summary: "x" });
    for (const cid of ["c_02", "c_03", "c_04"]) contributorPatchCandidate(db, getDraft(db, d.id)!, cid, { state: "rejected" });
    enqueueContinue(db, getDraft(db, d.id)!);
    claimJob(db, "w1");
    assert.throws(() => runDraftTool(db, d.id, "w1", "propose_edge", { source: "institution:gallery", target: "cid:c_01", edge_type: "REPRESENTS", confidence: "medium", page_url: "https://gallery.example/about", quote: "we represent Auriea Harvey" }), /already said no/);
    assert.throws(() => runDraftTool(db, d.id, "w1", "propose_node", { type: "institution", name: "some  fair", ...evid }), /already said no/);
    // another work that happens to share the title is a different work
    const again = runDraftTool(db, d.id, "w1", "propose_node", { type: "artwork", name: "Untitled", ...evid }) as any;
    assert.equal(again.cid, "c_05");
  });

  it("REPRESENTS from the agent needs representation language, not a bare name on a roster", () => {
    const db = freshDb();
    insertNode(db, "institution:gallery", "institution", "Gallery");
    insertNode(db, "practitioner:lucio-fontana", "practitioner", "Lucio Fontana");
    const d = createDraft(db, CONTRIB, "https://gallery.example/");
    claimJob(db, "w1");
    runDraftTool(db, d.id, "w1", "propose_node", { type: "practitioner", name: "Auriea Harvey", ...evid }); // c_01
    const rep = (target: string, quote: string) => runDraftTool(db, d.id, "w1", "propose_edge", { source: "institution:gallery", target, edge_type: "REPRESENTS", confidence: "medium", page_url: evid.page_url, quote });
    assert.throws(() => rep("cid:c_01", "Auriea Harvey"), /bare name on a roster/);
    assert.throws(() => rep("practitioner:lucio-fontana", "Lucio Fontana"), /bare name on a roster/);
    assert.throws(() => rep("practitioner:lucio-fontana", "— Lucio FONTANA."), /bare name on a roster/);
    assert.equal((rep("cid:c_01", "Gallery represents Auriea Harvey worldwide.") as any).cid, "c_02");
    // other relations may quote the name as listed (a show's artist list)
    insertNode(db, "project:some-show", "project", "Some Show");
    runDraftTool(db, d.id, "w1", "propose_edge", { source: "practitioner:lucio-fontana", target: "project:some-show", edge_type: "PARTICIPATED_IN", confidence: "high", page_url: evid.page_url, quote: "Lucio Fontana" });
    // the contributor may attest it themselves by editing the edge type
    finishPass(db, d.id, "w1", { summary: "x" });
    const edited = contributorPatchCandidate(db, getDraft(db, d.id)!, "c_03", { patch: { edge_type: "PARTICIPATED_IN" } });
    assert.equal(edited.edited, true);
  });

  it("a relation about a person must quote their name — a roster-wide sentence supports no one (Fellowship)", () => {
    const db = freshDb();
    insertNode(db, "institution:fellowship", "institution", "Fellowship");
    insertNode(db, "practitioner:sofia-crespo", "practitioner", "Sofia Crespo");
    insertNode(db, "practitioner:sougwen-chung", "practitioner", "Sougwen Chung");
    insertNode(db, "practitioner:laszlo-moholy-nagy", "practitioner", "László Moholy-Nagy");
    insertNode(db, "project:show", "project", "Show");
    const d = createDraft(db, CONTRIB, "https://fellowship.xyz/");
    claimJob(db, "w1");
    const about = { page_url: "https://fellowship.xyz/about-us", quote: "Our roster spans the field, from pioneers who have shaped it for decades to emerging voices defining its future." };
    const rep = (target: string, ev: { page_url: string; quote: string }) =>
      runDraftTool(db, d.id, "w1", "propose_edge", { source: "institution:fellowship", target, edge_type: "REPRESENTS", confidence: "high", ...ev });
    assert.throws(() => rep("practitioner:sofia-crespo", about), /must name Sofia Crespo/);
    assert.equal((rep("practitioner:sougwen-chung", { page_url: "https://fellowship.xyz/artists", quote: "Fellowship Artists › Sougwen Chung" }) as any).ok, true);
    // diacritics and hyphens fold; the estate qualifier stays in the quote
    assert.equal((rep("practitioner:laszlo-moholy-nagy", { page_url: "https://fellowship.xyz/artists", quote: "Fellowship Artists › Laszlo Moholy Nagy (Estate)" }) as any).ok, true);
    // same rule for show participation
    assert.throws(() => runDraftTool(db, d.id, "w1", "propose_edge", { source: "practitioner:sofia-crespo", target: "project:show", edge_type: "PARTICIPATED_IN", confidence: "high", page_url: "https://fellowship.xyz/show", quote: "A group show of twelve artists." }), /must name Sofia Crespo/);
  });

  it("priorContext: a dated page ledger from every submitted read; decisions stay the contributor's own", () => {
    const db = freshDb();
    const first = createDraft(db, CONTRIB, "https://gallery.example/");
    claimJob(db, "w1");
    workerAddPage(db, first.id, "w1", { url: "https://gallery.example/artists", final_url: "https://gallery.example/artists", title: "Artists", status: 200, chars: 10, sha256: "ab".repeat(32), via: "browser" });
    runDraftTool(db, first.id, "w1", "propose_node", { type: "practitioner", name: "Auriea Harvey", ...evid });
    runDraftTool(db, first.id, "w1", "propose_node", { type: "institution", name: "Some Fair", ...evid });
    finishPass(db, first.id, "w1", { summary: "x" });
    contributorPatchCandidate(db, getDraft(db, first.id)!, "c_01", { state: "accepted" });
    contributorPatchCandidate(db, getDraft(db, first.id)!, "c_02", { state: "rejected" });
    db.prepare("UPDATE drafts SET status = 'submitted' WHERE id = ?").run(first.id);
    const other = createDraft(db, "contributor:someone-else", "https://gallery.example/");
    const second = createDraft(db, CONTRIB, "https://www.gallery.example/exhibitions");
    const pc = priorContext(db, getDraft(db, second.id)!);
    assert.equal(pc.drafts, 1); // the other contributor's draft is neither ours nor submitted
    assert.deepEqual(pc.pages.map((p) => [p.url, p.sha256]), [["https://gallery.example/artists", "ab".repeat(32)]]);
    assert.match(pc.pages[0]!.fetched_at, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(pc.last_read, pc.pages[0]!.fetched_at);
    assert.deepEqual(pc.rejected, ['institution "Some Fair"']);
    assert.deepEqual(pc.submitted, ['practitioner "Auriea Harvey"']);
    // Someone else reading the same site sees WHEN it was read and what the
    // pages hashed to — but none of the first contributor's decisions.
    const theirs = priorContext(db, getDraft(db, other.id)!);
    assert.equal(theirs.pages.length, 1);
    assert.deepEqual(theirs.rejected, []);
    assert.deepEqual(theirs.submitted, []);
    // A fresh site has no history.
    const fresh = createDraft(db, CONTRIB, "https://elsewhere.example/");
    assert.equal(priorContext(db, getDraft(db, fresh.id)!).last_read, null);
  });
});
