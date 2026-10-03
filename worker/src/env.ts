// Local dev convenience: load the repo-root .env (ANTHROPIC_API_KEY,
// WORKER_KEY) BEFORE any module reads process.env. Imported first by
// main.ts — ES imports are hoisted, so this must be its own module.
// Never present in the Fly image.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
for (const candidate of [path.join(here, "..", ".env"), path.join(here, "..", "..", ".env")]) {
  if (fs.existsSync(candidate)) {
    try { process.loadEnvFile(candidate); } catch { /* ignore */ }
    break;
  }
}
