// A read is a dated snapshot: later reads mark pages changed / unchanged,
// the site's own subject must end up connected, and the prompt carries the
// rules the verse.works / interfacegallery.io runs showed were missing.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

process.env.WORKER_KEY = "test-worker-key-0123456789";
process.env.ANTHROPIC_API_KEY = "test";

const { renderPage, systemPrompt, initialUserMessage } = await import("../src/prompt.js");
const { runTool, subjectLinks } = await import("../src/tools.js");
const { newPolicy } = await import("../src/browser.js");

const page = { final_url: "https://g.example/artists", status: 200, title: "Artists", text: "Artists", links: [], images: [], sha256: "aa" };

describe("snapshots", () => {
  it("a page read before says when, and whether it changed", () => {
    assert.match(renderPage(page, { url: page.final_url, fetched_at: "2026-09-12T10:00:00Z", sha256: "aa" }), /previously_read="2026-09-12" changed="no"/);
    assert.match(renderPage(page, { url: page.final_url, fetched_at: "2026-09-12T10:00:00Z", sha256: "bb" }), /changed="yes"/);
    assert.doesNotMatch(renderPage(page), /previously_read/);
  });

  it("an update read is announced, with site_claims for the domain", () => {
    const d: any = { id: "drf_x", source_url: "https://www.g.example/", source_domain: "www.g.example", subject_node_id: null, candidates: [], messages: [], pages: [], summary: null, passes: 0, contributor_id: "c", contributor_name: "C", self_node_id: null, prior: { drafts: 1, pages: [{ url: "https://g.example/artists", fetched_at: "2026-09-12T10:00:00Z", sha256: "aa" }], last_read: "2026-09-12T10:00:00Z", rejected: [], submitted: [] } };
    const m = initialUserMessage(d, "<page/>");
    assert.match(m, /read before \(last 2026-09-12\).*UPDATE/);
    assert.match(m, /site_claims for g\.example/);
    assert.doesNotMatch(initialUserMessage({ ...d, prior: null }, "<page/>"), /UPDATE/);
  });
});

describe("the subject must end up connected", () => {
  const base = { subject_node_id: "platform:verse", candidates: [] as any[] };
  it("counts live edges and questions touching the subject, directly or through a card that resolves to it", () => {
    assert.equal(subjectLinks(base), 0);
    assert.equal(subjectLinks({ ...base, subject_node_id: null }), 0);
    const cands = [
      { cid: "c_01", kind: "node", state: "proposed", node: { type: "platform", name: "Verse" }, resolves_to: "platform:verse" },
      { cid: "c_02", kind: "edge", state: "proposed", edge: { source: "project:series", target: "cid:c_01", edge_type: "PRESENTED_BY" } },
      { cid: "c_03", kind: "edge", state: "rejected", edge: { source: "artwork:w", target: "platform:verse", edge_type: "EXHIBITED_AT" } },
    ];
    assert.equal(subjectLinks({ ...base, candidates: cands }), 1);
    assert.equal(subjectLinks({ subject_node_id: "cid:c_01", candidates: cands }), 1);
  });

  it("finish_pass is sent back once when the subject is unconnected, then accepted", async () => {
    const ctx: any = { draftId: "drf_x", policy: newPolicy("https://verse.example/", { maxPages: 10 }), checkSubject: true, getDraft: async () => base };
    const first = await runTool(ctx, "finish_pass", { summary: "done" });
    assert.equal(first.is_error, true);
    assert.match(first.content, /subject_unconnected/);
    assert.equal(first.finished, undefined);
    const second = await runTool(ctx, "finish_pass", { summary: "No relation to Verse is evidenced." });
    assert.equal(second.finished, "No relation to Verse is evidenced.");
    // chat passes are not checked
    const chat = await runTool({ draftId: "d", policy: newPolicy("https://verse.example/", { maxPages: 10 }) } as any, "finish_pass", { summary: "ok" });
    assert.equal(chat.finished, "ok");
  });
});

describe("prompt rules", () => {
  const p = systemPrompt();
  it("platforms can be exhibited at and present shows", () => {
    assert.match(p, /EXHIBITED_AT\s+\| artwork -> institution\/project\/platform/);
    assert.match(p, /PRESENTED_BY\s+\| project -> institution\/platform/);
  });
  it("no image cap; works by known artists first", () => {
    assert.doesNotMatch(p, /Cap ~12/);
    assert.match(p, /There is no image cap/);
  });
  it("co-exhibited pairs from this draft's shows become questions, up to 10", () => {
    assert.match(p, /from the shows in THIS draft/);
    assert.match(p, /at most 10 questions per draft/);
  });
  it("organisation kinds come from the fixed list with the organisation's own words", () => {
    assert.match(p, /museum, art centre, gallery, dealership, advisory, fair, festival/);
    assert.match(p, /kind_source/);
  });
  it("only present-tense relations can end", () => {
    assert.match(p, /propose_ended/);
    assert.match(p, /Never end something because a page failed to load/);
  });
  it("reading a page: structure, names in quotes, qualifiers — principles, not per-site rules", () => {
    assert.match(p, /READING A PAGE/);
    assert.match(p, /'#', '##', '###' lines are headings/);
    assert.match(p, /Heading|Gallery Artists › Jane Doe/);
    assert.match(p, /\(Estate\)/);
    assert.doesNotMatch(p, /Artists \(project\)|Fontana and Hockney/);
  });
});
