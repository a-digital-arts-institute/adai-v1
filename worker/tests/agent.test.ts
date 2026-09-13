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
      runTool: async () => ({ content: "{}", is_error: false }),
    });
    assert.equal(r.summary, "Updated the year to 2005.");
    assert.match(textOf(client.seen[0].messages[0]), /fix the year/);
    assert.match(textOf(client.seen[0].messages[0]), /c_01/);
  });
});
