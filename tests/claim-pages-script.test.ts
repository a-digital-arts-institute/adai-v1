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

import { freshDb, insertNode } from "./helpers.js";
import { postIntakeCandidates, postIntakeClaimPrompt } from "../src/claim/screens.js";
import { ensureContributorForEmail } from "../src/intake/auth.js";
import { backfillInviteClaims } from "../src/claim/store.js";

describe("post-intake claim prompt", () => {
  it("offers the subject first, claimable types only, skips what is taken", () => {
    const db = freshDb();
    insertNode(db, "practitioner:ada", "practitioner", "Ada </script><b>");
    insertNode(db, "collective:k", "collective", "K");
    insertNode(db, "artwork:w", "artwork", "W");
    insertNode(db, "practitioner:bob", "practitioner", "Bob");
    const me = ensureContributorForEmail(db, { email: "a@x.org", name: "A", invite: true });
    ensureContributorForEmail(db, { email: "b@x.org", name: "B", invite: true, self_node_id: "practitioner:bob" });
    backfillInviteClaims(db);
    const receipt = { subject_node_id: "practitioner:ada", source_url: "https://ada.art", edges: [
      { source_id: "artwork:w", target_id: "practitioner:ada" },
      { source_id: "practitioner:ada", target_id: "collective:k" },
      { source_id: "practitioner:ada", target_id: "practitioner:bob" },
    ] };
    assert.deepEqual(postIntakeCandidates(db, me.id, receipt).map((c) => c.id), ["practitioner:ada", "collective:k"]);
    const html = postIntakeClaimPrompt(db, me.id, "drf_0123456789abcdef", receipt);
    assert.match(html, /Is one of these you\?/);
    for (const s of scriptsOf(html)) assert.doesNotThrow(() => new Function(s));
  });
});
