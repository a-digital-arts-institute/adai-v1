// Round-trip the operator credential primitives. The mint helper is also
// what the admin HTTP surface calls, so a regression here breaks both the
// CLI (npm run token:issue) and the /api/v1/tokens endpoint at once.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { freshDb } from "./helpers.js";
import {
  mintToken,
  revokeTokenByPrefix,
  listTokens,
  MintError,
} from "../src/utils/token-mint.js";

describe("mintToken / revokeTokenByPrefix", () => {
  it("creates the contributor on demand and emits a hashed token row", () => {
    const db = freshDb();
    const result = mintToken(db, {
      contributorName: "Test Contributor",
      label: "ci-token",
      createIfMissing: true,
      tier: "reviewed",
    });
    assert.match(result.raw_token, /^adai_[0-9a-f]{48}$/);
    assert.equal(result.token_prefix.length, 13); // 'adai_' + 8 hex
    assert.ok(result.raw_token.startsWith(result.token_prefix));
    assert.equal(result.contributor_created, true);
    assert.equal(result.contributor_trust_tier, "reviewed");

    // The store keeps only sha256(token), not the raw value.
    const hash = crypto.createHash("sha256").update(result.raw_token).digest("hex");
    const row = db
      .prepare("SELECT token_hash, token_prefix, scope, revoked_at FROM contributor_tokens WHERE token_prefix = ?")
      .get(result.token_prefix) as any;
    assert.ok(row, "token row should exist");
    assert.equal(row.token_hash, hash);
    assert.equal(row.scope, "write");
    assert.equal(row.revoked_at, null);
  });

  it("refuses to mint without createIfMissing when contributor doesn't exist", () => {
    const db = freshDb();
    assert.throws(
      () => mintToken(db, { contributorName: "Nobody" }),
      (err: unknown) => err instanceof MintError && err.code === "no_such_contributor"
    );
  });

  it("revoke is a soft-delete: the row stays, just marked", () => {
    const db = freshDb();
    const r = mintToken(db, {
      contributorName: "RevokeMe",
      createIfMissing: true,
    });
    const before = revokeTokenByPrefix(db, r.token_prefix);
    assert.equal(before.was_already_revoked, false);
    assert.ok(before.revoked_at);

    // Idempotent — a second revoke is a no-op that flags was_already_revoked.
    const again = revokeTokenByPrefix(db, r.token_prefix);
    assert.equal(again.was_already_revoked, true);
    assert.equal(again.revoked_at, before.revoked_at);

    // listTokens with activeOnly excludes the revoked one; without it sees both.
    const active = listTokens(db, { contributorName: "RevokeMe", activeOnly: true });
    assert.equal(active.length, 0);
    const all = listTokens(db, { contributorName: "RevokeMe", activeOnly: false });
    assert.equal(all.length, 1);
  });

  it("each mint produces a fresh token hash even for the same contributor", () => {
    const db = freshDb();
    mintToken(db, { contributorName: "Multi", createIfMissing: true });
    const a = mintToken(db, { contributorName: "Multi" });
    const b = mintToken(db, { contributorName: "Multi" });
    assert.notEqual(a.raw_token, b.raw_token);
    assert.notEqual(a.token_prefix, b.token_prefix);
  });
});
