// The tool loop. One pass = one job (initial or chat). Streams each turn
// (large max_tokens without HTTP timeouts), executes tool calls, feeds
// results back, stops on finish_pass, the tool-call cap, the per-draft USD
// cap, or the hard timeout.

import Anthropic from "@anthropic-ai/sdk";
import { CONFIG, estimateUsd } from "./config.js";
import { TOOLS, runTool, type ToolContext } from "./tools.js";
import { systemPrompt, initialUserMessage, chatUserMessage, renderPage } from "./prompt.js";
import { fetchPage, FetchRefused } from "./browser.js";
import { heartbeat, addPage, type ClaimedDraft, type Job } from "./client.js";

export interface PassResult {
  summary: string | null;
  error: string | null;
  usage: { input_tokens: number; output_tokens: number; cache_read_tokens: number; cache_write_tokens: number; est_cost_usd: number; model: string; tool_calls: number };
}

export interface AgentDeps {
  client?: Pick<Anthropic["messages"], "stream">;
  runTool?: typeof runTool;
  fetchPage?: typeof fetchPage;
  addPage?: typeof addPage;
  now?: () => number;
}

function withMovingBreakpoint(messages: Anthropic.Messages.MessageParam[]): Anthropic.Messages.MessageParam[] {
  if (!messages.length) return messages;
  const out = messages.slice();
  const last = out[out.length - 1]!;
  const content = typeof last.content === "string"
    ? [{ type: "text" as const, text: last.content }]
    : last.content.map((b) => ({ ...b }));
  const blocks = content as any[];
  if (blocks.length) blocks[blocks.length - 1] = { ...blocks[blocks.length - 1], cache_control: { type: "ephemeral" } };
  out[out.length - 1] = { role: last.role, content: blocks };
  return out;
}

export async function runPass(draft: ClaimedDraft, job: Job, deps: AgentDeps = {}): Promise<PassResult> {
  const anthropic = deps.client ?? new Anthropic({ apiKey: CONFIG.anthropicKey }).messages;
  const exec = deps.runTool ?? runTool;
  const fetcher = deps.fetchPage ?? fetchPage;
  const ledger = deps.addPage ?? addPage;
  const now = deps.now ?? Date.now;
  const started = now();
  const model = CONFIG.model;
  const maxCalls = job.kind === "initial" ? CONFIG.maxToolCallsInitial : CONFIG.maxToolCallsChat;
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0, est_cost_usd: 0, model, tool_calls: 0 };

  const ctx: ToolContext = {
    draftId: draft.id,
    policy: { rootUrl: draft.source_url, pagesFetched: draft.pages.length, maxPages: Math.min(CONFIG.maxPagesSoft + draft.pages.length, CONFIG.maxPagesHard) },
  };

  // Heartbeat while we work; the claim expires 20 min after the last one.
  const hb = setInterval(() => { heartbeat(draft.id).catch(() => {}); }, CONFIG.heartbeatMs);
  hb.unref();

  try {
    // First user turn.
    let first: string;
    if (job.kind === "initial") {
      let rootRendered: string;
      try {
        const p = await fetcher(draft.source_url, ctx.policy);
        ctx.policy.pagesFetched++;
        rootRendered = renderPage(p);
        await ledger(draft.id, { url: p.url, final_url: p.final_url, title: p.title, status: p.status, chars: p.chars, sha256: p.sha256, via: p.via });
      } catch (e: any) {
        const msg = e instanceof FetchRefused ? `refused (${e.code}): ${e.message}` : `${e?.message ?? e}`;
        if (draft.candidates.length === 0) {
          return { summary: null, error: `could not read ${draft.source_url}: ${msg}`, usage };
        }
        rootRendered = `<page url="${draft.source_url}" status="0">(root fetch failed this pass: ${msg})</page>`;
      }
      first = initialUserMessage(draft, rootRendered);
    } else {
      first = chatUserMessage(draft, job);
    }

    const system: Anthropic.Messages.TextBlockParam[] = [
      { type: "text", text: systemPrompt().replace("${MAX_PAGES}", String(ctx.policy.maxPages)).replace("${MAX_CALLS}", String(maxCalls)), cache_control: { type: "ephemeral" } } as any,
    ];
    const tools: Anthropic.Messages.Tool[] = TOOLS.map((t, i) => (i === TOOLS.length - 1 ? ({ ...t, cache_control: { type: "ephemeral" } } as any) : t));
    const messages: Anthropic.Messages.MessageParam[] = [{ role: "user", content: first }];

    let finished: string | null = null;
    let stopReason = "";
    for (let turn = 0; turn < maxCalls + 2 && finished === null; turn++) {
      if (now() - started > CONFIG.hardTimeoutS * 1000) return { summary: null, error: "hard timeout", usage };
      if (usage.est_cost_usd > CONFIG.maxUsdPerDraft) {
        stopReason = "budget";
        break;
      }
      if (usage.tool_calls >= maxCalls) {
        messages.push({ role: "user", content: "Tool-call limit reached. Call finish_pass now with your summary; do not call any other tool." });
      }
      // Moving cache breakpoint on the last message: the whole conversation
      // prefix (pages read, tool results) is then served from cache on the
      // next turn instead of being re-billed at full input price. 3
      // breakpoints total (system, tools, here) — the API allows 4.
      const stream = anthropic.stream({
        model,
        max_tokens: 8000,
        thinking: { type: "adaptive" } as any,
        system,
        tools,
        messages: withMovingBreakpoint(messages),
      });
      const final = await stream.finalMessage();
      const u = final.usage as any;
      usage.input_tokens += u?.input_tokens ?? 0;
      usage.output_tokens += u?.output_tokens ?? 0;
      usage.cache_read_tokens += u?.cache_read_input_tokens ?? 0;
      usage.cache_write_tokens += u?.cache_creation_input_tokens ?? 0;
      usage.est_cost_usd = estimateUsd(model, usage);

      if (final.stop_reason === "refusal") return { summary: null, error: "model refused", usage };

      const calls = final.content.filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use");
      messages.push({ role: "assistant", content: final.content });
      if (!calls.length) {
        // Prose without finish_pass — nudge once, then treat the prose as the summary.
        const text = final.content.filter((b): b is Anthropic.Messages.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
        if (turn === 0 || !text) {
          messages.push({ role: "user", content: "Continue with the tools; when done, call finish_pass with the summary." });
          continue;
        }
        finished = text;
        break;
      }

      const results: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const call of calls) {
        usage.tool_calls++;
        const out = await exec(ctx, call.name, (call.input ?? {}) as Record<string, unknown>);
        results.push({ type: "tool_result", tool_use_id: call.id, content: out.content, is_error: out.is_error });
        if (out.finished !== undefined) finished = out.finished;
      }
      messages.push({ role: "user", content: results });
    }

    if (finished !== null) return { summary: finished, error: null, usage };
    if (stopReason === "budget") return { summary: "Stopped early: this draft reached its cost cap. What is here is usable; ask me to continue if something is missing.", error: null, usage };
    return { summary: "Stopped early: tool-call limit reached before a summary was written.", error: null, usage };
  } catch (e: any) {
    return { summary: null, error: `pass failed: ${e?.message ?? e}`, usage };
  } finally {
    clearInterval(hb);
  }
}
