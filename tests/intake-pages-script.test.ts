// The intake pages ship their JavaScript inside TypeScript template literals,
// where an escape like \' collapses to a bare quote in the served script.
// One such slip left every /draft/:id stuck on "loading draft…" while every
// other test passed — so parse every inline script the pages serve.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { contributePage, draftPage, batchPage } from "../src/intake/pages.js";

function scriptsOf(html: string): string[] {
  return [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((m) => m[1]!).filter((s) => s.trim());
}

describe("intake page scripts parse", () => {
  const pages: Array<[string, string]> = [
    ["/contribute", contributePage()],
    ["/draft/:id", draftPage("drf_0123456789abcdef")],
    ["/batch/:id", batchPage({ batch_id: "drf_x", signals: [], edges: [], ended: [], intake: [], pages: [], review_state: "live" }, true, ["a@b.c"])],
  ];
  for (const [name, html] of pages) {
    it(name, () => {
      for (const s of scriptsOf(html)) assert.doesNotThrow(() => new Function(s), `${name}: inline script does not parse`);
    });
  }
  it("the draft page actually has a script", () => assert.ok(scriptsOf(draftPage("drf_x")).length > 0));
});
