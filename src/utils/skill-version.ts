// Single source of truth for the contributor skill's version: the `version:`
// field in SKILL.md's frontmatter. `GET /api/v1/whoami` echoes it back as
// `skill_version`, so a Claude running an old *downloaded* copy of the skill
// can compare the two and prompt the practitioner to re-download when they
// drift (see SKILL.md §0). Read once at module load — SKILL.md is baked into
// the image and never changes at runtime.
//
// ⚠️ Bump `version:` in SKILL.md whenever you change SKILL.md in a way that
// downloaded copies must pick up (new/changed endpoints, conventions, or the
// canonical domain). Convention: an ISO date, e.g. `2026-07-07`.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_PATH = path.join(__dirname, "..", "..", "SKILL.md");

function readSkillVersion(): string | null {
  try {
    const text = fs.readFileSync(SKILL_PATH, "utf-8");
    // Only trust the leading frontmatter block (between the first two `---`),
    // so a stray "version:" in the body can't shadow it.
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const scope = fm ? fm[1] : text;
    const m = scope.match(/^version:\s*["']?([^"'\r\n]+?)["']?\s*$/m);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

const SKILL_VERSION = readSkillVersion();

/** The current canonical skill version (from SKILL.md frontmatter), or null. */
export function getSkillVersion(): string | null {
  return SKILL_VERSION;
}
