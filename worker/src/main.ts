// Entry point (docs/URL-INTAKE-SPEC.md §6.1).
//
//   one-shot (DRAFT_ID set — a Fly machine spawned for one job):
//     claim that draft → run pass → finish → exit 0
//   poll (DRAFT_ID unset — local dev):
//     loop: claim any → run pass → finish; sleep when idle
//
// The process never opens the SQLite file. Everything goes through
// /internal/intake/* with WORKER_KEY.

import "./env.js";
import { CONFIG } from "./config.js";
import { claim, finish, ApiError } from "./client.js";
import { runPass } from "./agent.js";
import { closeBrowser } from "./browser.js";

function log(msg: string): void {
  console.log(`[worker ${CONFIG.workerId}] ${new Date().toISOString()} ${msg}`);
}

async function handle(draftId?: string | null): Promise<boolean> {
  const claimed = await claim(draftId);
  if (!claimed) return false;
  const { draft, job } = claimed;
  log(`claimed ${draft.id} (${job.kind}) ${draft.source_url}`);
  const r = await runPass(draft, job);
  log(`pass done ${draft.id}: ${r.error ? `ERROR ${r.error}` : "ok"} · $${r.usage.est_cost_usd.toFixed(4)} · ${r.usage.tool_calls} tool calls`);
  try {
    await finish(draft.id, { summary: r.summary, usage: r.usage, error: r.error });
  } catch (e: any) {
    // 409 = the claim is gone (abandoned mid-pass); nothing to report to.
    if (!(e instanceof ApiError && e.status === 409)) throw e;
    log(`finish skipped for ${draft.id}: claim gone`);
  }
  return true;
}

async function main(): Promise<void> {
  if (!CONFIG.workerKey) { console.error("WORKER_KEY is required"); process.exit(2); }
  if (!CONFIG.anthropicKey) { console.error("ANTHROPIC_API_KEY is required"); process.exit(2); }
  log(`adai=${CONFIG.adaiUrl} model=${CONFIG.model} mode=${CONFIG.draftId ? "one-shot" : "poll"}`);

  if (CONFIG.draftId) {
    const timer = setTimeout(async () => {
      log("hard timeout — reporting and exiting");
      try { await finish(CONFIG.draftId!, { error: "hard timeout", usage: {} }); } catch { /* best effort */ }
      process.exit(1);
    }, (CONFIG.hardTimeoutS + 60) * 1000);
    timer.unref();
    try {
      const did = await handle(CONFIG.draftId);
      if (!did) log(`nothing to do for ${CONFIG.draftId} (already claimed or no job)`);
    } finally {
      await closeBrowser();
    }
    process.exit(0);
  }

  let stopping = false;
  process.on("SIGINT", () => { stopping = true; log("stopping after current job"); });
  process.on("SIGTERM", () => { stopping = true; });
  while (!stopping) {
    let did = false;
    try {
      did = await handle();
    } catch (e: any) {
      log(`error: ${e?.message ?? e}`);
    }
    if (!did) await new Promise((r) => setTimeout(r, CONFIG.pollSleepMs));
  }
  await closeBrowser();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
