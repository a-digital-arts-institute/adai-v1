// IDs computed at contribution-time must match IDs computed at seed-time
// for the same name (see comment at top of src/utils/slug.ts). Lock the
// transformation rules so a stray .replace() doesn't desync the contributor
// API from the seed.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { slugify, nodeId } from "../src/utils/slug.js";

describe("slugify", () => {
  it("lowercases and dash-separates", () => {
    assert.equal(slugify("Casey Reas"), "casey-reas");
    assert.equal(slugify("HOLLY HERNDON"), "holly-herndon");
  });

  it("strips punctuation the seed treats as decorative", () => {
    assert.equal(slugify("Forensic Architecture (Studio)"), "forensic-architecture-studio");
    assert.equal(slugify("R.U.R."), "rur");
    assert.equal(slugify("don't"), "dont");
  });

  it("expands & to 'and' (mirrors the seed convention)", () => {
    assert.equal(slugify("Holly Herndon & Mat Dryhurst"), "holly-herndon-and-mat-dryhurst");
  });

  it("collapses double dashes", () => {
    assert.equal(slugify("foo  bar"), "foo-bar");
    assert.equal(slugify("foo_-bar"), "foo-bar");
  });
});

describe("nodeId", () => {
  it("composes type:slug", () => {
    assert.equal(nodeId("practitioner", "Casey Reas"), "practitioner:casey-reas");
    assert.equal(nodeId("artwork", "Fidenza"), "artwork:fidenza");
  });
});
