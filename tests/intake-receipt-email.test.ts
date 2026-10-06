// The receipt email is the contributor's thank-you: it names them, counts
// what they added (and only what they added), and links to the receipt and,
// when the draft was about someone, their profile.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { receiptEmail } from "../src/intake/mail.js";
import type { ConfirmResult, Draft } from "../src/intake/draft.js";

const draft = { id: "drf_0123456789abcdef", source_domain: "annaridler.com" } as Draft;
const result = (over: Partial<ConfirmResult> = {}): ConfirmResult => ({
  batch_id: draft.id, status: "review", intake_ids: [],
  created_nodes: ["a", "b", "c", "d", "e"], linked_nodes: ["f", "g", "h"], patched_nodes: [],
  edges: [1, 2, 3, 4].map(() => ({ source_id: "x", target_id: "y", edge_type: "CREATED_BY" })),
  images: [], ended: [], skipped: [], ...over,
});

describe("receipt email", () => {
  it("reads as Iri's thank-you for a reviewed submission", () => {
    const m = receiptEmail("Anna", draft, result(), "https://x/auth/t", "https://x/practitioner/anna-ridler");
    assert.equal(m.subject, "Thank you for contributing to A(DAI)");
    assert.match(m.text, /^Hi Anna,/);
    assert.match(m.text, /will review it before it becomes public/);
    assert.match(m.text, /From annaridler\.com, you submitted 12 additions:/);
    assert.match(m.text, /- 5 new records for works, people, or exhibitions\n- 3 connections to records already in A\(DAI\)\n- 4 relationships/);
    assert.match(m.text, /View your contribution and its review status:\nhttps:\/\/x\/auth\/t/);
    assert.match(m.text, /Explore your practice in A\(DAI\):\nhttps:\/\/x\/practitioner\/anna-ridler/);
    assert.match(m.text, /Contribution reference: drf_0123456789abcdef$/);
    assert.match(m.html, /<a href="https:\/\/x\/auth\/t">View your contribution and its review status<\/a>/);
  });

  it("says live when it went live, hides empty counts, singularises, drops the profile link without a subject", () => {
    const m = receiptEmail("", draft, result({ status: "live", created_nodes: ["a"], linked_nodes: [], edges: [], images: [{ node_id: "a", cdn_image_url: "u" }] }), "https://x/r", null);
    assert.match(m.text, /^Hi,/);
    assert.match(m.text, /now part of the public record/);
    assert.match(m.text, /you submitted 2 additions:\n\n- 1 new record for works, people, or exhibitions\n- 1 image\n/);
    assert.doesNotMatch(m.text, /connections|Explore your practice|review status/);
  });
});
