// The claim pages ship JavaScript inside template literals (see
// intake-pages-script.test.ts for why this matters): parse every inline script.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { claimPage, mePage } from "../src/claim/screens.js";
import { curatorSignIn } from "../src/claim/pages.js";

function scriptsOf(html: string): string[] {
  return [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((m) => m[1]!).filter((s) => s.trim());
}

describe("claim page scripts parse", () => {
  const pages: Array<[string, string]> = [
    ["/claim/:type/:slug", claimPage({ id: "practitioner:o'neil", type: "practitioner", name: "O'Neil </script>", slug: "o-neil", suggested: "o-neil" })],
    ["/me", mePage()],
    ["/review (signed out)", curatorSignIn(false)],
  ];
  for (const [name, html] of pages) {
    it(name, () => {
      const scripts = scriptsOf(html);
      assert.ok(scripts.length > 0);
      for (const s of scripts) assert.doesNotThrow(() => new Function(s), `${name}: inline script does not parse`);
    });
  }
});
