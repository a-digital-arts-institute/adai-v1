// The archivist's tool-use loop.
//
// We use the Anthropic Messages streaming API directly (no Agent SDK
// abstraction) because we need fine control over: emitting client-tool
// dispatch events as soon as Claude requests them (so the browser starts
// the zoom *during* the model's thinking, not after the whole reply
// finishes), and over capping the iteration count so a rogue tool loop
// can't run away on us.
//
// Event shape — `(yield event)` is consumed by the SSE route in
// src/routes/archivist.ts and serialised onto the wire. Keep the shapes
// small and JSON-safe; never include raw model objects.

import Anthropic from "@anthropic-ai/sdk";

type MessageStream = ReturnType<Anthropic["messages"]["stream"]>;
import type { DatabaseSync } from "node:sqlite";
import {
  TOOL_DEFINITIONS,
  SERVER_HANDLERS,
  isClientTool,
  type ToolDef,
} from "./tools.js";
import { buildPrompt, type VisitorContext } from "./prompt.js";

export type AgentEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_use_start"; tool_use_id: string; name: string; input_preview?: Record<string, unknown> }
  | { type: "tool_use_end"; tool_use_id: string; name: string; ok: boolean }
  | { type: "client_tool"; tool_use_id: string; name: string; input: Record<string, unknown> }
  | { type: "usage"; usage: UsageReport }
  | { type: "stop"; reason: string }
  | { type: "error"; error: string };

export interface UsageReport {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
}

const MAX_TOOL_ITERATIONS = 8;
const MAX_TOKENS = 1024;

function defaultModel(): string {
  return process.env.ARCHIVIST_MODEL || "claude-haiku-4-5-20251001";
}

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

export function isConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// Attach cache_control to the last tool so the entire tools block + the
// system spine cache as one prefix.
function toolsForApi(tools: ToolDef[]): Anthropic.Messages.Tool[] {
  const out: Anthropic.Messages.Tool[] = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Messages.Tool.InputSchema,
  }));
  if (out.length > 0) {
    (out[out.length - 1] as any).cache_control = { type: "ephemeral" };
  }
  return out;
}

interface RunOpts {
  /** Visitor's full conversation so far. Caller is responsible for trimming. */
  messages: Anthropic.Messages.MessageParam[];
  /** Live DB handle — server tools execute against it. */
  db: DatabaseSync;
  /** What the visitor is currently looking at in /field. Optional and
   *  ambient — woven into the prompt head, not exposed as a tool. */
  context?: VisitorContext;
  /** Abort signal — closes the HTTP stream when the client disconnects. */
  signal?: AbortSignal;
}

/**
 * Run the archivist's tool-use loop. Yields events as Claude streams +
 * tools execute. The caller (the SSE route) serialises each event onto
 * the wire and decides when to bump session counters / record usage.
 */
export async function* runArchivist(opts: RunOpts): AsyncGenerator<AgentEvent, void, void> {
  const client = getClient();
  if (!client) {
    yield { type: "error", error: "archivist_offline: ANTHROPIC_API_KEY not configured" };
    return;
  }

  const model = defaultModel();
  const { spine, head } = buildPrompt(opts.db, opts.context);

  // System is multi-block so we can mark the static spine for caching and
  // leave the head uncached (it changes every chat).
  const system: Anthropic.Messages.TextBlockParam[] = [
    { type: "text", text: spine, cache_control: { type: "ephemeral" } } as any,
    { type: "text", text: head },
  ];
  const tools = toolsForApi(TOOL_DEFINITIONS);

  const messages: Anthropic.Messages.MessageParam[] = [...opts.messages];
  const aggregate: UsageReport = {
    model,
    input_tokens: 0,
    output_tokens: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
  };

  let iterations = 0;
  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    let stream: MessageStream;
    try {
      stream = client.messages.stream({
        model,
        max_tokens: MAX_TOKENS,
        system,
        tools,
        messages,
      });
    } catch (e: any) {
      yield { type: "error", error: `anthropic_request_failed: ${e?.message ?? String(e)}` };
      return;
    }

    // Accumulator for tool_use blocks we need to execute after the stream
    // finishes. We can't execute mid-stream because Anthropic emits the
    // input as JSON deltas; we need the final parsed message to get the
    // structured input.
    const toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];

    try {
      for await (const evt of stream) {
        if (opts.signal?.aborted) {
          yield { type: "stop", reason: "client_disconnected" };
          stream.controller.abort();
          return;
        }
        if (evt.type === "content_block_start" && evt.content_block.type === "tool_use") {
          // Emit early — the user sees "looking up …" before the JSON is
          // fully streamed. input is partial at this point so we skip it.
          yield {
            type: "tool_use_start",
            tool_use_id: evt.content_block.id,
            name: evt.content_block.name,
          };
        } else if (evt.type === "content_block_delta" && evt.delta.type === "text_delta") {
          yield { type: "text_delta", text: evt.delta.text };
        }
      }
    } catch (e: any) {
      yield { type: "error", error: `stream_error: ${e?.message ?? String(e)}` };
      return;
    }

    const final = await stream.finalMessage();

    if (final.usage) {
      const u = final.usage as any;
      aggregate.input_tokens += u.input_tokens ?? 0;
      aggregate.output_tokens += u.output_tokens ?? 0;
      aggregate.cache_read_tokens += u.cache_read_input_tokens ?? 0;
      aggregate.cache_write_tokens += u.cache_creation_input_tokens ?? 0;
    }

    // Collect tool_use blocks now that we have the parsed message.
    for (const block of final.content) {
      if (block.type === "tool_use") {
        toolCalls.push({ id: block.id, name: block.name, input: (block.input ?? {}) as Record<string, unknown> });
      }
    }

    if (toolCalls.length === 0) {
      // No tools requested → model is done.
      yield { type: "usage", usage: aggregate };
      yield { type: "stop", reason: final.stop_reason ?? "end_turn" };
      return;
    }

    // Append the assistant turn (so the next call sees what Claude said).
    messages.push({ role: "assistant", content: final.content });

    // Execute the tool calls.
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const call of toolCalls) {
      if (isClientTool(call.name)) {
        // Client tool: dispatch to the browser; the model just sees "ok".
        // Pass tool_use_id so the chat UI can refine the existing chip
        // (which only knows the name) with the full input-derived label.
        yield { type: "client_tool", tool_use_id: call.id, name: call.name, input: call.input };
      }
      const handler = SERVER_HANDLERS[call.name];
      let ok = true;
      let result: unknown;
      if (!handler) {
        ok = false;
        result = { error: "unknown_tool", name: call.name };
      } else {
        try {
          result = handler(opts.db, call.input);
        } catch (e: any) {
          ok = false;
          result = { error: "tool_execution_failed", detail: e?.message ?? String(e) };
        }
      }
      yield { type: "tool_use_end", tool_use_id: call.id, name: call.name, ok };
      toolResults.push({
        type: "tool_result",
        tool_use_id: call.id,
        content: JSON.stringify(result),
        is_error: !ok,
      });
    }

    messages.push({ role: "user", content: toolResults });
    // Loop — next iteration will send the tool_result back into Claude.
  }

  // Hit the iteration cap. Tell the caller — they can render a "the
  // archivist is taking too long, try again" message.
  yield { type: "usage", usage: aggregate };
  yield { type: "stop", reason: "max_tool_iterations" };
}
