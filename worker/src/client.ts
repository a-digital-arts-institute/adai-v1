// HTTP client for the main app's /internal/intake/* surface. This is the
// worker's ONLY way to read the graph or touch a draft; there is no DB
// handle in this process.

import { CONFIG } from "./config.js";

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly body: any) {
    super(message);
    this.name = "ApiError";
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<{ status: number; json: T }> {
  const res = await fetch(`${CONFIG.adaiUrl}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-worker-key": CONFIG.workerKey },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return { status: 204, json: undefined as T };
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  if (!res.ok) throw new ApiError(`${method} ${path} → ${res.status}: ${json?.message ?? json?.error ?? text.slice(0, 200)}`, res.status, json);
  return { status: res.status, json: json as T };
}

export interface ClaimedDraft {
  id: string;
  source_url: string;
  source_domain: string;
  subject_node_id: string | null;
  candidates: any[];
  messages: Array<{ role: "user" | "assistant"; text: string; at: string }>;
  pages: any[];
  summary: string | null;
  passes: number;
  contributor_id: string;
  contributor_name: string;
  self_node_id: string | null;
}

export interface Job {
  kind: "initial" | "chat";
  message?: string;
  queued_at: string;
}

export async function claim(draftId?: string | null): Promise<{ draft: ClaimedDraft; job: Job } | null> {
  const body: Record<string, unknown> = { worker_id: CONFIG.workerId };
  if (draftId) body.draft_id = draftId;
  try {
    const r = await call<{ draft: ClaimedDraft; job: Job }>("POST", "/internal/intake/claim", body);
    if (r.status === 204) return null;
    return r.json;
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) return null;
    throw e;
  }
}

export async function heartbeat(draftId: string): Promise<boolean> {
  try {
    const r = await call<{ ok: boolean }>("POST", `/internal/intake/drafts/${draftId}/heartbeat`, { worker_id: CONFIG.workerId });
    return !!r.json?.ok;
  } catch {
    return false;
  }
}

/** Graph read tool via the allowlist. Errors come back as {error} so the model can react. */
export async function graphTool(name: string, input: unknown): Promise<unknown> {
  try {
    const r = await call<{ result: unknown }>("POST", "/internal/intake/tool", { name, input });
    return r.json.result;
  } catch (e: any) {
    return { error: e?.message ?? String(e) };
  }
}

/** Draft write tool — validation errors are returned as {error} for the model. */
export async function draftTool(draftId: string, tool: string, input: unknown): Promise<{ ok: boolean; result: unknown }> {
  try {
    const r = await call<{ result: unknown }>("POST", `/internal/intake/drafts/${draftId}/candidates`, { worker_id: CONFIG.workerId, tool, input });
    return { ok: true, result: r.json.result };
  } catch (e: any) {
    if (e instanceof ApiError && (e.status === 422 || e.status === 400 || e.status === 409 || e.status === 429)) {
      return { ok: false, result: { error: e.body?.error ?? "invalid", message: e.body?.message ?? e.message, field: e.body?.field ?? null } };
    }
    throw e;
  }
}

export async function addPage(draftId: string, page: Record<string, unknown>): Promise<void> {
  try {
    await call("POST", `/internal/intake/drafts/${draftId}/pages`, { worker_id: CONFIG.workerId, page });
  } catch (e: any) {
    console.warn(`[worker] page ledger: ${e?.message ?? e}`);
  }
}

export async function addMessage(draftId: string, text: string): Promise<void> {
  await call("POST", `/internal/intake/drafts/${draftId}/messages`, { worker_id: CONFIG.workerId, text });
}

export async function getDraft(draftId: string): Promise<{ candidates: any[]; subject_node_id: string | null; pages: any[]; messages: any[] }> {
  const r = await call<{ draft: any }>("GET", `/internal/intake/drafts/${draftId}`);
  return r.json.draft;
}

export async function finish(draftId: string, args: { summary?: string | null; usage?: Record<string, unknown>; error?: string | null }): Promise<void> {
  await call("POST", `/internal/intake/drafts/${draftId}/finish`, { worker_id: CONFIG.workerId, ...args });
}
