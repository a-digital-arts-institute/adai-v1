// Trust promise 1 at the import level (docs/URL-INTAKE-SPEC.md §6.3, §15):
// the worker-facing modules must not be able to reach the graph write path
// or R2. Checked on source text so a refactor that adds the import fails CI.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FORBIDDEN = [/materialise/i, /insertSignal/, /insertIntake/, /\/r2\.js/, /utils\/images\.js/, /utils\/contribution\.js/, /admin-actions\.js/];
const WORKER_FACING = ["src/routes/internal.ts", "src/intake/tools.ts"];

describe("worker surface cannot write the graph", () => {
  for (const f of WORKER_FACING) {
    it(`${f} imports nothing from the write path`, () => {
      const src = readFileSync(join(ROOT, f), "utf-8");
      const imports = src.split("\n").filter((l) => /^\s*import\b/.test(l)).join("\n");
      for (const re of FORBIDDEN) assert.doesNotMatch(imports, re, `${f} imports ${re}`);
    });
  }

  it("the worker package has no sqlite and no main-app imports", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "worker/package.json"), "utf-8"));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    assert.ok(!deps.some((d) => /sqlite|crsqlite|aws-sdk|genai/.test(d)), deps.join(","));
    for (const f of ["main", "agent", "tools", "client", "browser", "prompt", "config"]) {
      const src = readFileSync(join(ROOT, `worker/src/${f}.ts`), "utf-8");
      assert.doesNotMatch(src, /from "\.\.\/\.\.\/src\//, `${f}.ts reaches into src/`);
      assert.doesNotMatch(src, /node:sqlite/, `${f}.ts opens sqlite`);
    }
  });
});
