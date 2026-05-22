// Rate-limit + global budget gate for the archivist chat surface.
//
// Two layers:
//   1. Per-session rolling window — N messages per H hours per session_id.
//      Enforced before we open the SSE stream so an offender doesn't get
//      to spend any tokens at all.
//   2. Global daily budget — sum today's est_cost_usd from archivist_usage
//      and refuse new chats once we cross ARCHIVIST_DAILY_BUDGET_USD. The
//      archivist still says hello via a "resting" sentinel so it doesn't
//      look broken; tomorrow at 00:00 UTC the budget rolls.
//
// Cost estimates use Anthropic's public list prices for haiku-4-5 (and
// sonnet-4-6 / opus-4-7 if you override via env). They are estimates —
// the SDK returns exact usage tokens but Anthropic could of course change
// pricing. Treat the gate as protection against runaway loops, not as
// accounting.

import type { DatabaseSync } from "node:sqlite";

// Per-session quota (rolling window). Generous default — most casual
// visitors will never hit it; a stuck script will.
const SESSION_QUOTA = parseInt(process.env.ARCHIVIST_SESSION_QUOTA || "30", 10);
const SESSION_WINDOW_S = parseInt(process.env.ARCHIVIST_SESSION_WINDOW_S || "3600", 10);

// Global daily cap in USD. Default $5/day — enough for thousands of
// haiku messages, low enough that a single bad day costs less than a
// coffee.
function dailyBudgetUsd(): number {
  const raw = process.env.ARCHIVIST_DAILY_BUDGET_USD;
  if (!raw) return 5;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : 5;
}

// Anthropic list prices ($/MTok). Update when Anthropic changes them; we
// only need rough numbers because the gate is a safety rail, not billing.
// As of Jan 2026: haiku 4.5 = $1/$5; sonnet 4.6 = $3/$15; opus 4.7 = $15/$75.
// Cache reads are 10% of input; cache writes are 1.25× input (5min ephemeral).
interface ModelPrice {
  input: number;       // $/MTok
  output: number;      // $/MTok
  cache_read: number;  // $/MTok
  cache_write: number; // $/MTok
}

const PRICES: Record<string, ModelPrice> = {
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0, cache_read: 0.10, cache_write: 1.25 },
  "claude-sonnet-4-6":         { input: 3.0, output: 15.0, cache_read: 0.30, cache_write: 3.75 },
  "claude-opus-4-7":           { input: 15.0, output: 75.0, cache_read: 1.50, cache_write: 18.75 },
};

function priceFor(model: string): ModelPrice {
  return PRICES[model] ?? PRICES["claude-haiku-4-5-20251001"]!;
}

export interface UsageTally {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
}

export function estimateCostUsd(u: UsageTally): number {
  const p = priceFor(u.model);
  return (
    (u.input_tokens / 1_000_000) * p.input +
    (u.output_tokens / 1_000_000) * p.output +
    (u.cache_read_tokens / 1_000_000) * p.cache_read +
    (u.cache_write_tokens / 1_000_000) * p.cache_write
  );
}

function todayUtc(): string {
  // YYYY-MM-DD in UTC. The day rolls at 00:00 UTC regardless of where the
  // user is — keeps a single source of truth and avoids edge cases.
  return new Date().toISOString().slice(0, 10);
}

export interface RateLimitDecision {
  ok: boolean;
  reason?: string;
  retry_after_s?: number;
}

/**
 * Per-session check. Caller passes in the session row that
 * src/archivist/session.ts already loaded — no extra DB round-trip needed.
 */
export function checkSessionLimit(session: { message_count: number; last_message_at: number | null }): RateLimitDecision {
  // Rolling window — if the last message was within the window, count
  // towards quota; otherwise reset implicitly. (We don't actually mutate
  // the row here; bumpSession does that after a successful call. The
  // "reset" is purely a read-side decision: if you've been quiet for an
  // hour, your full quota is available again.)
  if (!session.last_message_at) return { ok: true };
  const ageS = Math.floor((Date.now() - session.last_message_at) / 1000);
  if (ageS >= SESSION_WINDOW_S) return { ok: true };
  if (session.message_count < SESSION_QUOTA) return { ok: true };
  return {
    ok: false,
    reason: "session_rate_limited",
    retry_after_s: SESSION_WINDOW_S - ageS,
  };
}

/**
 * Global budget check. Sums today's est_cost_usd from archivist_usage and
 * compares to the daily cap.
 */
export function checkGlobalBudget(db: DatabaseSync): RateLimitDecision {
  const cap = dailyBudgetUsd();
  if (cap <= 0) return { ok: true }; // 0 / negative disables the gate.
  const row = db
    .prepare("SELECT est_cost_usd FROM archivist_usage WHERE date = ?")
    .get(todayUtc()) as { est_cost_usd: number } | undefined;
  const spent = row?.est_cost_usd ?? 0;
  if (spent < cap) return { ok: true };
  return { ok: false, reason: "daily_budget_exceeded" };
}

/**
 * Record a chat's usage into today's rollup. Idempotency note: we use
 * INSERT … ON CONFLICT to fold a new tally into the existing row so two
 * concurrent chats can't clobber each other.
 */
export function recordUsage(db: DatabaseSync, u: UsageTally): void {
  const cost = estimateCostUsd(u);
  db.prepare(
    `INSERT INTO archivist_usage (date, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, est_cost_usd)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         input_tokens       = input_tokens       + excluded.input_tokens,
         output_tokens      = output_tokens      + excluded.output_tokens,
         cache_read_tokens  = cache_read_tokens  + excluded.cache_read_tokens,
         cache_write_tokens = cache_write_tokens + excluded.cache_write_tokens,
         est_cost_usd       = est_cost_usd       + excluded.est_cost_usd`
  ).run(
    todayUtc(),
    u.input_tokens,
    u.output_tokens,
    u.cache_read_tokens,
    u.cache_write_tokens,
    cost
  );
}

export const SESSION_QUOTA_VALUE = SESSION_QUOTA;
