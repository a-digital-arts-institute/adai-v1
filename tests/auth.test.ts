// Trust-tier gating. The whole intake_queue exists because probationary
// contributions MUST queue and auto/reviewed MUST land live. Regressing
// this predicate is a silent correctness bug — probationary writes would
// slip into the live graph.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isAutoMerge } from "../src/auth.js";

describe("isAutoMerge", () => {
  it("auto-merges the trusted tiers", () => {
    assert.equal(isAutoMerge("auto"), true);
    assert.equal(isAutoMerge("reviewed"), true);
  });

  it("queues probationary and anything unknown", () => {
    assert.equal(isAutoMerge("probationary"), false);
    assert.equal(isAutoMerge(""), false);
    assert.equal(isAutoMerge("admin"), false); // scope != trust tier
    assert.equal(isAutoMerge("nonsense"), false);
  });
});
