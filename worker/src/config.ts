// Env → config, in one place. Every knob in docs/URL-INTAKE-SPEC.md §6.

function int(name: string, def: number): number {
  const n = parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}
function num(name: string, def: number): number {
  const n = parseFloat(process.env[name] ?? "");
  return Number.isFinite(n) && n >= 0 ? n : def;
}

export const CONFIG = {
  adaiUrl: (process.env.ADAI_URL || "http://localhost:8080").replace(/\/+$/, ""),
  workerKey: process.env.WORKER_KEY || "",
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  model: process.env.INTAKE_MODEL || "claude-sonnet-5",
  draftId: process.env.DRAFT_ID || null,
  jobKind: process.env.JOB_KIND || null,
  // Beta defaults (Sept 2026). The old 80-call cap was the real page limit:
  // ~7 calls per page (fetch + resolves + proposals) ended a gallery pass at
  // 12 of 30 pages. The USD cap is the safety rail; the call cap only stops
  // a loop that has lost the plot. The USD cap is checked per PASS.
  maxUsdPerDraft: num("INTAKE_MAX_USD_PER_DRAFT", 6),
  hardTimeoutS: int("INTAKE_HARD_TIMEOUT_S", 2700),
  maxToolCallsInitial: int("INTAKE_MAX_TOOL_CALLS", 240),
  maxToolCallsContinue: int("INTAKE_MAX_TOOL_CALLS_CONTINUE", 200),
  maxToolCallsChat: int("INTAKE_MAX_TOOL_CALLS_CHAT", 40),
  maxPagesSoft: int("INTAKE_MAX_PAGES", 60),
  maxPagesHard: 240,
  maxOffsitePages: int("INTAKE_MAX_OFFSITE_PAGES", 20),
  apiRetries: int("INTAKE_API_RETRIES", 4),
  apiRetryBaseMs: int("INTAKE_API_RETRY_BASE_MS", 2000),
  pollSleepMs: int("INTAKE_POLL_SLEEP_MS", 5000),
  heartbeatMs: 30_000,
  pageTextChars: int("INTAKE_PAGE_TEXT_CHARS", 24_000),
  workerId: `${process.env.FLY_MACHINE_ID || "local"}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`,
};

// Anthropic list prices, $/MTok, keyed by model family prefix. Estimates only
// — the per-draft cap is a safety rail, not billing.
const PRICES: Array<[string, { input: number; output: number; cache_read: number; cache_write: number }]> = [
  ["claude-sonnet-5", { input: 2, output: 10, cache_read: 0.2, cache_write: 2.5 }],
  ["claude-sonnet-4-6", { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 }],
  ["claude-haiku-4-5", { input: 1, output: 5, cache_read: 0.1, cache_write: 1.25 }],
  ["claude-opus-5", { input: 5, output: 25, cache_read: 0.5, cache_write: 6.25 }],
  ["claude-opus-4", { input: 5, output: 25, cache_read: 0.5, cache_write: 6.25 }],
];

export function estimateUsd(model: string, u: { input_tokens: number; output_tokens: number; cache_read_tokens: number; cache_write_tokens: number }): number {
  const p = PRICES.find(([k]) => model.startsWith(k))?.[1] ?? PRICES[0]![1];
  return (
    (u.input_tokens * p.input + u.output_tokens * p.output + u.cache_read_tokens * p.cache_read + u.cache_write_tokens * p.cache_write) / 1e6
  );
}
