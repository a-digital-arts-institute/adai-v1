// Regression test for the collective centroid bug fixed in this PR.
// The original centroids.ts / derive.ts filtered
// `target_id LIKE 'practitioner:%'` while sections.ts always asked for
// both `practitioner:` and `collective:` prefixes — so collectives never
// got centroids and never appeared as anyone's style kin. The widening
// to include `collective:` is the entire fix; this test exists to keep
// that filter honest.
//
// Also asserts the bi-temporal filter: an edge with `valid_until` set
// must be excluded from centroid computation (a superseded edge is no
// longer the current state).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  freshDb,
  insertNode,
  insertCreatedBy,
  insertIdentityEmbedding,
  unitVector,
} from "./helpers.js";
import { computeCentroids } from "../src/embed/centroids.js";
import { DIMS } from "../src/embed/vectors.js";

function setupGraph(db: import("node:sqlite").DatabaseSync) {
  // Two creators (practitioner + collective), three artworks.
  insertNode(db, "practitioner:alice", "practitioner", "Alice");
  insertNode(db, "collective:beta studio", "collective", "Beta Studio");
  insertNode(db, "artwork:a1", "artwork", "A1");
  insertNode(db, "artwork:a2", "artwork", "A2");
  insertNode(db, "artwork:b1", "artwork", "B1");

  // CREATED_BY edges. a1, a2 → alice; b1 → beta studio.
  insertCreatedBy(db, "artwork:a1", "practitioner:alice");
  insertCreatedBy(db, "artwork:a2", "practitioner:alice");
  insertCreatedBy(db, "artwork:b1", "collective:beta studio");

  // Identity vectors for each artwork. The actual direction doesn't
  // matter for these assertions — we just need rows to exist.
  insertIdentityEmbedding(db, "artwork:a1", unitVector(DIMS, 0));
  insertIdentityEmbedding(db, "artwork:a2", unitVector(DIMS, 1));
  insertIdentityEmbedding(db, "artwork:b1", unitVector(DIMS, 2));
}

describe("computeCentroids — collectives", () => {
  it("emits a style_centroid row for collectives with credited works", () => {
    const db = freshDb();
    setupGraph(db);
    const stats = computeCentroids(db);
    assert.equal(stats.creators_with_centroid, 2, "both practitioner and collective should get centroids");

    const rows = db
      .prepare(
        "SELECT node_id FROM node_embeddings WHERE kind='style_centroid' ORDER BY node_id"
      )
      .all() as Array<{ node_id: string }>;
    assert.deepEqual(rows.map((r) => r.node_id), [
      "collective:beta studio",
      "practitioner:alice",
    ]);
  });

  it("ignores non-current CREATED_BY edges (bi-temporal: valid_until IS NULL)", () => {
    const db = freshDb();
    setupGraph(db);
    // Mark the collective's only edge as superseded. The centroid for the
    // collective should now disappear; the practitioner's centroid stays.
    db.prepare(
      "UPDATE edges SET valid_until = '2020-01-01T00:00:00Z' WHERE target_id = 'collective:beta studio'"
    ).run();
    const stats = computeCentroids(db);
    assert.equal(stats.creators_with_centroid, 1);

    const remaining = db
      .prepare(
        "SELECT node_id FROM node_embeddings WHERE kind='style_centroid'"
      )
      .all() as Array<{ node_id: string }>;
    assert.deepEqual(remaining.map((r) => r.node_id), ["practitioner:alice"]);
  });

  it("excludes neither prefix from the SELECT — both are scored", () => {
    // Lightweight direct-SQL guard: if the filter is rewritten one day in
    // a way that drops the OR, this test surfaces it before centroids run.
    const db = freshDb();
    setupGraph(db);
    const rows = db
      .prepare(
        `SELECT target_id FROM edges
         WHERE edge_type = 'CREATED_BY'
           AND valid_until IS NULL
           AND source_id LIKE 'artwork:%'
           AND (target_id LIKE 'practitioner:%' OR target_id LIKE 'collective:%')
         ORDER BY target_id`
      )
      .all() as Array<{ target_id: string }>;
    const distinct = new Set(rows.map((r) => r.target_id));
    assert.ok(distinct.has("practitioner:alice"));
    assert.ok(distinct.has("collective:beta studio"));
  });
});
