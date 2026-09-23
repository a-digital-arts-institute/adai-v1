// The tool loop. One pass = one job (initial or chat). Streams each turn
// (large max_tokens without HTTP timeouts), executes tool calls, feeds
// results back, stops on finish_pass, the tool-call cap, the per-draft USD
// cap, or the hard timeout.

import Anthropic from "@anthropic-ai/sdk";
import { CONFIG, estimateUsd } from "./config.js";
import { TOOLS, runTool, type ToolContext } from "./tools.js";
import { systemPrompt, initialUserMessage, continueUserMessage, chatUserMessage, renderPage } from "./prompt.js";
import { fetchPage, newPolicy, FetchRefused, siteOutline, endSession } from "./browser.js";
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
  siteOutline?: typeof siteOutline;
  heartbeat?: typeof heartbeat;
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

/** Dropped connections, timeouts, 408/409/429 and 5xx (incl. 529 overloaded). Not 4xx request errors. */
export function isTransient(e: any): boolean {
  const status = typeof e?.status === "number" ? e.status : null;
  if (status !== null) return status === 408 || status === 409 || status === 429 || status >= 500;
  return /connection|network|timeout|timed out|socket|ECONNRESET|ETIMEDOUT|EAI_AGAIN|terminated|overloaded|fetch failed/i.test(String(e?.name ?? "") + " " + String(e?.message ?? e));
}

export async function runPass(draft: ClaimedDraft, job: Job, deps: AgentDeps = {}): Promise<PassResult> {
  const anthropic = deps.client ?? new Anthropic({ apiKey: CONFIG.anthropicKey }).messages;
  const exec = deps.runTool ?? runTool;
  const fetcher = deps.fetchPage ?? fetchPage;
  const ledger = deps.addPage ?? addPage;
  const now = deps.now ?? Date.now;
  const started = now();
  const model = CONFIG.model;
  const outlineOf = deps.siteOutline ?? siteOutline;
  const beat = deps.heartbeat ?? heartbeat;
  const maxCalls = job.kind === "initial" ? CONFIG.maxToolCallsInitial : job.kind === "continue" ? CONFIG.maxToolCallsContinue : CONFIG.maxToolCallsChat;
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0, est_cost_usd: 0, model, tool_calls: 0 };

  const ctx: ToolContext = {
    draftId: draft.id,
    policy: newPolicy(draft.source_url, {
      pagesFetched: draft.pages.length,
      maxPages: Math.min(CONFIG.maxPagesSoft + draft.pages.length, CONFIG.maxPagesHard),
      maxOffsite: CONFIG.maxOffsitePages,
    }),
    prior: new Map((draft.prior?.pages ?? []).map((p) => [p.url, p])),
    checkSubject: job.kind !== "chat",
  };

  // Heartbeat while we work; the claim expires 20 min after the last one.
  // A "lost" claim means the contributor abandoned the draft (or it was
  // reclaimed): stop at the next turn instead of burning the budget on
  // tool calls the server will refuse.
  let lost = false;
  const hb = setInterval(() => { beat(draft.id).then((r) => { if (r === "lost") lost = true; }).catch(() => {}); }, CONFIG.heartbeatMs);
  hb.unref();

  try {
    // First user turn.
    let first: string;
    if (job.kind === "initial") {
      let rootRendered: string;
      try {
        const p = await fetcher(draft.source_url, ctx.policy);
        ctx.policy.pagesFetched++; // root is always on-site
        rootRendered = renderPage(p, ctx.prior?.get(p.final_url) ?? ctx.prior?.get(p.url));
        await ledger(draft.id, { url: p.url, final_url: p.final_url, title: p.title, status: p.status, chars: p.chars, sha256: p.sha256, via: p.via });
      } catch (e: any) {
        const msg = e instanceof FetchRefused ? `refused (${e.code}): ${e.message}` : `${e?.message ?? e}`;
        if (draft.candidates.length === 0) {
          return { summary: null, error: `could not read ${draft.source_url}: ${msg}`, usage };
        }
        rootRendered = `<page url="${draft.source_url}" status="0">(root fetch failed this pass: ${msg})</page>`;
      }
      first = initialUserMessage(draft, rootRendered, await outlineOf(draft.source_url).catch(() => null));
    } else if (job.kind === "continue") {
      first = continueUserMessage(draft, job, await outlineOf(draft.source_url).catch(() => null));
    } else {
      first = chatUserMessage(draft, job);
    }

    const system: Anthropic.Messages.TextBlockParam[] = [
      { type: "text", text: systemPrompt().replace("${MAX_PAGES}", String(ctx.policy.maxPages)).replace("${MAX_CALLS}", String(maxCalls)).replace("${MAX_OFFSITE}", String(ctx.policy.maxOffsite)), cache_control: { type: "ephemeral" } } as any,
    ];
    const tools: Anthropic.Messages.Tool[] = TOOLS.map((t, i) => (i === TOOLS.length - 1 ? ({ ...t, cache_control: { type: "ephemeral" } } as any) : t));
    const messages: Anthropic.Messages.MessageParam[] = [{ role: "user", content: first }];

    let finished: string | null = null;
    let stopReason = "";
    for (let turn = 0; turn < maxCalls + 2 && finished === null; turn++) {
      if (now() - started > CONFIG.hardTimeoutS * 1000) return { summary: null, error: "hard timeout", usage };
      if (lost) return { summary: null, error: "claim lost (draft abandoned or reclaimed)", usage };
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
      // A long pass makes hundreds of API calls; one dropped connection or
      // overloaded/5xx reply must not end it. `messages` is only appended
      // after a turn completes, so re-sending the same turn is safe (and
      // the prefix is served from cache).
      let final: Anthropic.Messages.Message | undefined;
      for (let attempt = 0; ; attempt++) {
        try {
          final = await anthropic.stream({
            model,
            max_tokens: 8000,
            thinking: { type: "adaptive" } as any,
            system,
            tools,
            messages: withMovingBreakpoint(messages),
          }).finalMessage();
          break;
        } catch (e: any) {
          if (attempt >= CONFIG.apiRetries || !isTransient(e)) throw e;
          const waitMs = CONFIG.apiRetryBaseMs * 2 ** attempt;
          console.warn(`[worker] model call failed (${e?.message ?? e}); retry ${attempt + 1}/${CONFIG.apiRetries} in ${waitMs}ms`);
          await new Promise((r) => setTimeout(r, waitMs));
        }
      }
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
    await endSession();
  }
}
