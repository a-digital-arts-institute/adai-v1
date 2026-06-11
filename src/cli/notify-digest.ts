// CLI: email a digest of the review queue to the admin notify list.
//
// Run by .github/workflows/notify-digest.yml against the live Fly volume:
//   flyctl ssh console --app adai-basel -C "node /app/dist/cli/notify-digest.js"
//
// Local preview (reads .env via process.loadEnvFile in src/index.ts? — no:
// this CLI loads .env itself below so RESEND_* / ADMIN_NOTIFY_EMAILS resolve):
//   npm run notify:digest -- --dry-run
//
// Flags:
//   --dry-run            build + render the digest, print it, do NOT send.
//   --force              send even when nothing is new (full backlog digest).
//   --limit <n>          max sample rows per kind in the email (default 10).
//   --base-url <url>     base for the "open the review queue" link
//                        (default https://adai-basel.fly.dev, or $ADAI_BASE_URL).
//
// Exit codes: 0 success / nothing-to-send · 1 send failure · 2 missing config.

import fs from "node:fs";
import { initDb, getDb } from "../db.js";
import { resolveCliDbPath } from "../utils/db-path.js";
import { runReviewDigest, ConfigError } from "../notify/digest.js";

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

async function main(): Promise<void> {
  // Load project-root .env for local runs (RESEND_API_KEY, ADMIN_NOTIFY_EMAILS,
  // RESEND_FROM). On Fly these come from the machine env (flyctl secrets), so
  // the file won't exist and we skip silently.
  try {
    if (fs.existsSync(".env")) process.loadEnvFile();
  } catch {
    /* no .env — fine */
  }

  const args = parseArgs(process.argv.slice(2));
  const dryRun = args["dry-run"] === true;
  const force = args.force === true;
  const limit =
    typeof args.limit === "string" ? Math.max(1, parseInt(args.limit, 10) || 10) : 10;
  const baseUrl = typeof args["base-url"] === "string" ? args["base-url"] : undefined;

  const dbPath = resolveCliDbPath();
  console.error(`[notify:digest] using DB ${dbPath}`);
  initDb(dbPath);
  const db = getDb();

  try {
    const r = await runReviewDigest(db, { dryRun, force, perKindLimit: limit, baseUrl });

    if (dryRun) {
      console.error(
        `[notify:digest] DRY RUN — would send to: ${r.recipients.join(", ") || "(no recipients configured)"}`
      );
      console.error(`[notify:digest] Subject: ${r.rendered!.subject}`);
      console.log("\n" + r.rendered!.text + "\n");
      console.error(
        `[notify:digest] pending total=${r.digest.totalPending} fresh=${r.digest.freshPending} since=${r.digest.since || "(never)"}`
      );
      return;
    }

    if (r.sent) {
      console.error(
        `[notify:digest] sent (${r.digest.freshPending} new, ${r.digest.totalPending} pending) to ${r.recipients.join(", ")} id=${r.messageId || "?"}`
      );
    } else {
      console.error(
        `[notify:digest] nothing to send (reason=${r.reason}, pending=${r.digest.totalPending}). Use --force to send a full-backlog digest.`
      );
    }
  } catch (e) {
    if (e instanceof ConfigError) {
      console.error(`[notify:digest] ${e.message}`);
      console.error(
        "Set these (Fly secrets in prod, .env locally): RESEND_API_KEY, ADMIN_NOTIFY_EMAILS (comma-separated), optional RESEND_FROM."
      );
      process.exit(2);
    }
    console.error(`[notify:digest] send failed: ${(e as Error).message}`);
    process.exit(1);
  }
}

main();
