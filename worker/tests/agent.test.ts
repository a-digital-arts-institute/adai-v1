// The tool loop with a mocked Anthropic client and mocked tools — no network,
// no Chromium. Covers: initial pass fetches the root, dispatches tool calls,
// stops on finish_pass, respects the tool-call cap, and reports usage.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

process.env.WORKER_KEY = "test-worker-key-0123456789";
process.env.ANTHROPIC_API_KEY = "test";
process.env.INTAKE_MAX_TOOL_CALLS = "3";
process.env.INTAKE_MAX_TOOL_CALLS_CHAT = "3";

const { runPass } = await import("../src/agent.js");
const { CONFIG } = await import("../src/config.js");

const textOf = (m: any): string => (typeof m.content === "string" ? m.content : m.content.map((b: any) => b.text ?? "").join("\n"));

const draft = {
  id: "drf_test",
  source_url: "https://artist.example/",
  source_domain: "artist.example",
  subject_node_id: null,
  candidates: [],
  messages: [],
  pages: [],
  summary: null,
  passes: 0,
  contributor_id: "contributor:x",
  contributor_name: "X",
  self_node_id: null,
};

const page = {
  url: "https://artist.example/",
  final_url: "https://artist.example/",
  status: 200,
  title: "Artist",
  text: "Works by Artist. Process 4, 2005.",
  links: [{ href: "https://artist.example/works", text: "Works" }],
  images: [],
  via: "browser" as const,
  sha256: "abc",
  chars: 32,
};

function fakeClient(turns: Array<{ tools?: Array<{ name: string; input: any }>; text?: string }>) {
  let i = 0;
  const seen: any[] = [];
  return {
    seen,
    stream(params: any) {
      seen.push(JSON.parse(JSON.stringify(params))); // snapshot — messages is mutated by the loop
      const t = turns[Math.min(i++, turns.length - 1)]!;
      const content: any[] = [];
      if (t.text) content.push({ type: "text", text: t.text });
      for (const [n, c] of (t.tools ?? []).entries()) content.push({ type: "tool_use", id: `tu_${i}_${n}`, name: c.name, input: c.input });
      return {
        finalMessage: async () => ({ content, stop_reason: content.some((c) => c.type === "tool_use") ? "tool_use" : "end_turn", usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } }),
      };
    },
  };
}

describe("runPass", () => {
  before(() => { CONFIG.heartbeatMs = 60_000; });

  it("initial pass: root fetched, tools dispatched, finish_pass ends it", async () => {
    const calls: string[] = [];
    const client = fakeClient([
      { tools: [{ name: "resolve_entity", input: { name: "Artist" } }, { name: "propose_node", input: { type: "practitioner", name: "Artist" } }] },
      { tools: [{ name: "finish_pass", input: { summary: "Found 1 person." } }] },
    ]);
    const r = await runPass(draft as any, { kind: "initial", queued_at: "x" }, {
      client: client as any,
      siteOutline: async () => null,
      heartbeat: async () => "ok" as const,
      fetchPage: async () => page,
      addPage: async () => {},
      runTool: async (_ctx, name, input) => {
        calls.push(name);
        if (name === "finish_pass") return { content: "{}", is_error: false, finished: input.summary as string };
        return { content: JSON.stringify({ ok: true, name }), is_error: false };
      },
    });
    assert.equal(r.error, null);
    assert.equal(r.summary, "Found 1 person.");
    assert.deepEqual(calls, ["resolve_entity", "propose_node", "finish_pass"]);
    assert.equal(r.usage.tool_calls, 3);
    assert.equal(r.usage.input_tokens, 200);
    assert.ok(r.usage.est_cost_usd > 0);
    // first user message carries the rendered root page as untrusted content
    const firstMsg = textOf(client.seen[0].messages[0]);
    // moving cache breakpoint sits on the last block of the last message
    assert.equal(client.seen[1].messages.at(-1).content.at(-1).cache_control.type, "ephemeral");
    assert.match(firstMsg, /<page url="https:\/\/artist.example\/"/);
    assert.match(firstMsg, /Process 4, 2005/);
    // tool results were fed back
    assert.equal(client.seen[1].messages.length, 3);
    assert.equal(client.seen[1].messages[2].content[0].type, "tool_result");
    // caching markers present on system + last tool
    assert.equal(client.seen[0].system[0].cache_control.type, "ephemeral");
    assert.equal(client.seen[0].tools.at(-1).cache_control.type, "ephemeral");
  });

  it("root fetch failure on a fresh draft → error, no model call", async () => {
    const client = fakeClient([{ text: "unused" }]);
    const r = await runPass(draft as any, { kind: "initial", queued_at: "x" }, {
      client: client as any,
      siteOutline: async () => null,
      heartbeat: async () => "ok" as const,
      fetchPage: async () => { throw new Error("ECONNREFUSED"); },
      addPage: async () => {},
      runTool: async () => ({ content: "", is_error: false }),
    });
    assert.match(r.error!, /could not read/);
    assert.equal(client.seen.length, 0);
  });

  it("tool-call cap: after the cap the model is told to finish", async () => {
    const client = fakeClient([
      { tools: [{ name: "get_node", input: {} }, { name: "get_node", input: {} }, { name: "get_node", input: {} }] },
      { tools: [{ name: "get_node", input: {} }] }, // ignored? no — executed, but next turn gets the nudge
      { tools: [{ name: "finish_pass", input: { summary: "done" } }] },
    ]);
    const r = await runPass(draft as any, { kind: "chat", message: "hi", queued_at: "x" }, {
      client: client as any,
      siteOutline: async () => null,
      heartbeat: async () => "ok" as const,
      runTool: async (_c, name, input) => (name === "finish_pass" ? { content: "{}", is_error: false, finished: String(input.summary) } : { content: "{}", is_error: false }),
    });
    assert.equal(r.summary, "done");
    const nudged = client.seen.some((p: any) => p.messages.some((m: any) => /Tool-call limit reached/.test(textOf(m))));
    assert.equal(nudged, true);
  });

  it("chat pass: transcript + candidates in the first message; prose reply accepted as summary", async () => {
    const client = fakeClient([
      { tools: [{ name: "update_candidate", input: { cid: "c_01", patch: {} } }] },
      { text: "Updated the year to 2005." },
    ]);
    const d = { ...draft, candidates: [{ cid: "c_01", kind: "node", state: "proposed" }], messages: [{ role: "user", text: "fix the year", at: "x" }] };
    const r = await runPass(d as any, { kind: "chat", message: "fix the year", queued_at: "x" }, {
      client: client as any,
      siteOutline: async () => null,
      heartbeat: async () => "ok" as const,
      runTool: async () => ({ content: "{}", is_error: false }),
    });
    assert.equal(r.summary, "Updated the year to 2005.");
    assert.match(textOf(client.seen[0].messages[0]), /fix the year/);
    assert.match(textOf(client.seen[0].messages[0]), /c_01/);
  });

  it("initial pass: the sitemap outline rides in the first message", async () => {
    const client = fakeClient([{ tools: [{ name: "finish_pass", input: { summary: "ok" } }] }]);
    await runPass(draft as any, { kind: "initial", queued_at: "x" }, {
      client: client as any,
      heartbeat: async () => "ok" as const,
      siteOutline: async () => '<site_outline source="sitemap" urls="54">gallery.example/artist/ — 34 pages</site_outline>',
      fetchPage: async () => page,
      addPage: async () => {},
      runTool: async (_c, name, input) => ({ content: "{}", is_error: false, ...(name === "finish_pass" ? { finished: String(input.summary) } : {}) }),
    });
    const first = textOf(client.seen[0].messages[0]);
    assert.match(first, /artist\/ — 34 pages/);
    assert.match(first, /SURVEY the site/);
    assert.match(client.seen[0].system[0].text, /SURVEY FIRST/);
  });

  it("continue pass: no root fetch; memory carries pages read, the survey, rejections and earlier drafts", async () => {
    const client = fakeClient([{ tools: [{ name: "finish_pass", input: { summary: "added 3 shows" } }] }]);
    let fetched = 0;
    const d = {
      ...draft,
      passes: 1,
      subject_node_id: "institution:gallery",
      pages: [{ url: "https://artist.example/artists", final_url: "https://artist.example/artists", title: "Artists", status: 200 }],
      survey: { site_kind: "gallery", inventory: [{ label: "artists", count: 34 }], remaining: "exhibitions before 2021" },
      candidates: [
        { cid: "c_01", kind: "node", state: "accepted", edited: false, node: { type: "practitioner", name: "Auriea Harvey" }, resolves_to: null },
        { cid: "c_02", kind: "edge", state: "rejected", edited: false, edge: { source: "cid:c_01", target: "concept:net-art", edge_type: "EMBODIES" } },
      ],
      prior: { drafts: 1, pages: [{ url: "https://artist.example/about", fetched_at: "2026-09-12T10:00:00Z", sha256: "x" }], last_read: "2026-09-12T10:00:00Z", rejected: ['institution "Some Fair"'], submitted: ['practitioner "Vera Molnar"'] },
    };
    const r = await runPass(d as any, { kind: "continue", message: "the 2019–2021 exhibitions", queued_at: "x" }, {
      client: client as any,
      heartbeat: async () => "ok" as const,
      siteOutline: async () => null,
      fetchPage: async () => { fetched++; return page; },
      runTool: async (_c, name, input) => ({ content: "{}", is_error: false, ...(name === "finish_pass" ? { finished: String(input.summary) } : {}) }),
    });
    assert.equal(r.summary, "added 3 shows");
    assert.equal(fetched, 0);
    const first = textOf(client.seen[0].messages[0]);
    assert.match(first, /CONTINUE pass 2/);
    assert.match(first, /the 2019–2021 exhibitions/);
    assert.match(first, /Pages already read in this draft \(1\)/);
    assert.match(first, /exhibitions before 2021/);
    assert.match(first, /\[rejected\] c_02: cid:c_01 \(practitioner "Auriea Harvey"\) EMBODIES concept:net-art/);
    assert.match(first, /c_01 \[accepted\] practitioner "Auriea Harvey" \(new\)/);
    assert.match(first, /Some Fair/);
    assert.match(first, /possibly still in review/);
    assert.match(first, /https:\/\/artist\.example\/about \(read 2026-09-12\)/);
  });

  it("a dropped connection mid-pass is retried, not fatal; a 400 is not retried", async () => {
    CONFIG.apiRetryBaseMs = 1;
    const ok = fakeClient([{ tools: [{ name: "finish_pass", input: { summary: "survived" } }] }]);
    let n = 0;
    const flaky = { stream(params: any) { if (n++ < 2) return { finalMessage: async () => { throw new Error("Connection error."); } }; return ok.stream(params); } };
    const run = (client: any) => runPass(draft as any, { kind: "chat", message: "hi", queued_at: "x" }, {
      client, heartbeat: async () => "ok" as const, siteOutline: async () => null,
      runTool: async (_c, name, input) => ({ content: "{}", is_error: false, ...(name === "finish_pass" ? { finished: String(input.summary) } : {}) }),
    });
    const r = await run(flaky);
    assert.equal(r.error, null);
    assert.equal(r.summary, "survived");
    assert.equal(n, 3);
    let bad = 0;
    const r2 = await run({ stream() { bad++; return { finalMessage: async () => { throw Object.assign(new Error("invalid request"), { status: 400 }); } }; } });
    assert.match(r2.error!, /invalid request/);
    assert.equal(bad, 1);
  });

  it("a lost claim (draft abandoned mid-pass) stops the loop", async () => {
    CONFIG.heartbeatMs = 5;
    const client = fakeClient([{ tools: [{ name: "get_node", input: {} }] }]);
    const r = await runPass(draft as any, { kind: "chat", message: "hi", queued_at: "x" }, {
      client: client as any,
      heartbeat: async () => "lost" as const,
      siteOutline: async () => null,
      runTool: async () => { await new Promise((res) => setTimeout(res, 20)); return { content: "{}", is_error: false }; },
    });
    CONFIG.heartbeatMs = 60_000;
    assert.match(r.error!, /claim lost/);
    assert.ok(client.seen.length <= 2);
  });
});
