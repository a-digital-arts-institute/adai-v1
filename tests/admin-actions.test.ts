// Tests for the admin correction primitives (src/utils/admin-actions.ts) and
// the shared review actions (src/utils/review.ts) that back the /api/v1
// admin endpoints: revoke a signal, retire a node, retire a batch, bulk
// approve/reject. The invariant under test everywhere: NOTHING is deleted —
// signals flip status, edges gain valid_until/invalidated_by, nodes gain
// metadata.retired.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { freshDb, insertNode } from "./helpers.js";
import {
  AdminActionError,
  revokeSignal,
  retireNode,
  retireBatch,
  listBatches,
} from "../src/utils/admin-actions.js";
import { approveIntakeItem, rejectIntakeItem } from "../src/utils/review.js";
import { insertSignal, insertIntake } from "../src/utils/contribution.js";
import type { AuthedContributor } from "../src/auth.js";

const GALLERY: AuthedContributor = {
  id: "contributor-gallery",
  name: "Test Gallery",
  trust_tier: "reviewed", // auto-merge
  token_label: "test",
  token_prefix: "adai_test",
  scope: "write",
};

const PROBIE: AuthedContributor = {
  ...GALLERY,
  id: "contributor-probie",
  name: "Probie",
  trust_tier: "probationary",
};

function seedContributor(db: any, c: AuthedContributor) {
  db.prepare(
    "INSERT INTO contributors (id, name, type, trust_tier, contributions, approved_count) VALUES (?, ?, 'contributor', ?, 0, 0)"
  ).run(c.id, c.name, c.trust_tier);
}

function insertEdge(db: any, id: string, source: string, target: string, signalId: string | null) {
  db.prepare(
    `INSERT INTO edges (id, source_id, target_id, edge_type, signal_id, confidence, charge,
                        created_at, created_by, event_time, valid_from, valid_until, invalidated_by)
     VALUES (?, ?, ?, 'CREATED_BY', ?, 'medium', NULL,
             strftime('%Y-%m-%dT%H:%M:%SZ','now'), 'test', NULL,
             strftime('%Y-%m-%dT%H:%M:%SZ','now'), NULL, NULL)`
  ).run(id, source, target, signalId);
}

describe("revokeSignal", () => {
  it("flips status, cascades anchored edges, anchors an admin signal", () => {
    const db = freshDb();
    seedContributor(db, GALLERY);
    insertNode(db, "artwork:x", "artwork", "X");
    insertNode(db, "practitioner:y", "practitioner", "Y");
    const sigId = insertSignal(db, { contributor: GALLERY, title: "t", content: "c" });
    insertEdge(db, "e1", "artwork:x", "practitioner:y", sigId);

    const r = revokeSignal(db, sigId, { reason: "wrong upload", by: "admin" });
    assert.equal(r.already_revoked, false);
    assert.equal(r.edges_superseded, 1);
    assert.ok(r.admin_signal_id);

    const sig = db.prepare("SELECT status FROM signals WHERE id = ?").get(sigId) as any;
    assert.equal(sig.status, "revoked");
    const edge = db.prepare("SELECT valid_until, invalidated_by FROM edges WHERE id = 'e1'").get() as any;
    assert.ok(edge.valid_until, "edge superseded");
    assert.equal(edge.invalidated_by, r.admin_signal_id);
    const anchor = db.prepare("SELECT source_type, submitted_by FROM signals WHERE id = ?").get(r.admin_signal_id) as any;
    assert.equal(anchor.source_type, "api_admin");
    assert.equal(anchor.submitted_by, "admin");
  });

  it("is idempotent and 404s on unknown ids", () => {
    const db = freshDb();
    seedContributor(db, GALLERY);
    const sigId = insertSignal(db, { contributor: GALLERY, title: "t", content: "c" });
    revokeSignal(db, sigId, { reason: "r", by: "admin" });
    const again = revokeSignal(db, sigId, { reason: "r", by: "admin" });
    assert.equal(again.already_revoked, true);
    assert.throws(() => revokeSignal(db, "signal-nope", { reason: "r", by: "admin" }), AdminActionError);
  });

  it("cascade:false leaves edges alone", () => {
    const db = freshDb();
    seedContributor(db, GALLERY);
    insertNode(db, "artwork:x", "artwork", "X");
    const sigId = insertSignal(db, { contributor: GALLERY, title: "t", content: "c" });
    insertEdge(db, "e1", "artwork:x", "artwork:x", sigId);
    const r = revokeSignal(db, sigId, { reason: "r", by: "admin", cascade: false });
    assert.equal(r.edges_superseded, 0);
    const edge = db.prepare("SELECT valid_until FROM edges WHERE id = 'e1'").get() as any;
    assert.equal(edge.valid_until, null);
  });
});

describe("retireNode", () => {
  it("supersedes edges in both directions and sets metadata.retired", () => {
    const db = freshDb();
    insertNode(db, "artwork:bad", "artwork", "Bad", { image_url: "https://x/y.jpg" });
    insertNode(db, "practitioner:p", "practitioner", "P");
    insertEdge(db, "e-out", "artwork:bad", "practitioner:p", null);
    insertEdge(db, "e-in", "practitioner:p", "artwork:bad", null);
    insertEdge(db, "e-other", "practitioner:p", "practitioner:p", null);

    const r = retireNode(db, "artwork:bad", { reason: "junk", by: "admin" });
    assert.equal(r.edges_superseded, 2);

    const meta = JSON.parse(
      (db.prepare("SELECT metadata FROM nodes WHERE id = 'artwork:bad'").get() as any).metadata
    );
    assert.equal(meta.retired, true);
    assert.equal(meta.retired_by, "admin");
    assert.equal(meta.retired_reason, "junk");
    assert.equal(meta.image_url, "https://x/y.jpg", "existing metadata preserved");

    const untouched = db.prepare("SELECT valid_until FROM edges WHERE id = 'e-other'").get() as any;
    assert.equal(untouched.valid_until, null);
  });

  it("dry_run reports without mutating; idempotent on retired nodes", () => {
    const db = freshDb();
    insertNode(db, "artwork:bad", "artwork", "Bad");
    insertEdge(db, "e1", "artwork:bad", "artwork:bad", null);
    const plan = retireNode(db, "artwork:bad", { reason: "r", by: "admin", dryRun: true });
    assert.equal(plan.dry_run, true);
    assert.equal(plan.edges_superseded, 1);
    const edge = db.prepare("SELECT valid_until FROM edges WHERE id = 'e1'").get() as any;
    assert.equal(edge.valid_until, null, "dry run mutated nothing");

    retireNode(db, "artwork:bad", { reason: "r", by: "admin" });
    const again = retireNode(db, "artwork:bad", { reason: "r", by: "admin" });
    assert.equal(again.already_retired, true);
  });
});

describe("retireBatch", () => {
  function setupBatch(db: any) {
    seedContributor(db, GALLERY);
    // Pre-existing node the batch collides with (created LONG before).
    db.prepare(
      "INSERT INTO nodes (id, type, name, slug, metadata, created_at, updated_by) VALUES ('artwork:existing', 'artwork', 'Existing', 'existing', NULL, '2020-01-01T00:00:00Z', 'seed')"
    ).run();
    insertNode(db, "practitioner:target", "practitioner", "Target");

    // Write 1: create a node (lands live — reviewed tier).
    const sig1 = insertSignal(db, {
      contributor: GALLERY, title: "Create node", content: "{}",
      source_type: "api_node", batch_id: "gallery-batch-1",
    });
    insertNode(db, "artwork:new-piece", "artwork", "New Piece");
    insertIntake(db, {
      contributor: GALLERY, signal_id: sig1, target_node: "artwork:new-piece",
      proposed_nodes: [{ op: "create_node", type: "artwork", name: "New Piece", slug: "new-piece" }],
    });

    // Write 2: a create that collided with the pre-existing node (no-op create).
    const sig2 = insertSignal(db, {
      contributor: GALLERY, title: "Create node", content: "{}",
      source_type: "api_node", batch_id: "gallery-batch-1",
    });
    insertIntake(db, {
      contributor: GALLERY, signal_id: sig2, target_node: "artwork:existing",
      proposed_nodes: [{ op: "create_node", type: "artwork", name: "Existing", slug: "existing" }],
    });

    // Write 3: an edge anchored to a batch signal.
    const sig3 = insertSignal(db, {
      contributor: GALLERY, title: "Add edge", content: "{}",
      source_type: "api_edge", batch_id: "gallery-batch-1",
    });
    insertEdge(db, "e-batch", "artwork:new-piece", "practitioner:target", sig3);
    insertIntake(db, { contributor: GALLERY, signal_id: sig3, target_node: "practitioner:target" });

    // Write 4: a metadata patch on a pre-existing node (unrevertable → report).
    const sig4 = insertSignal(db, {
      contributor: GALLERY, title: "Patch node", content: "{}",
      source_type: "api_node", batch_id: "gallery-batch-1",
    });
    insertIntake(db, {
      contributor: GALLERY, signal_id: sig4, target_node: "artwork:existing",
      proposed_nodes: [{ op: "patch_node", node_id: "artwork:existing", metadata: { foo: 1 } }],
    });

    // Write 5: a still-pending probationary item in the same batch.
    seedContributor(db, PROBIE);
    const sig5 = insertSignal(db, {
      contributor: PROBIE, title: "Pending thing", content: "{}",
      source_type: "api_node", batch_id: "gallery-batch-1",
    });
    insertIntake(db, {
      contributor: PROBIE, signal_id: sig5, target_node: "artwork:queued",
      proposed_nodes: [{ op: "create_node", type: "artwork", name: "Queued", slug: "queued" }],
    });
  }

  it("dry run reports the full plan without touching anything", () => {
    const db = freshDb();
    setupBatch(db);
    const plan = retireBatch(db, "gallery-batch-1", { reason: "wrong archive", by: "admin", dryRun: true });
    assert.equal(plan.dry_run, true);
    assert.equal(plan.signals_total, 5);
    assert.deepEqual(plan.nodes_to_retire, ["artwork:new-piece"]);
    assert.deepEqual(plan.nodes_skipped_preexisting, ["artwork:existing"]);
    assert.equal(plan.patches_to_review.length, 1);
    assert.equal(plan.patches_to_review[0]!.node_id, "artwork:existing");
    assert.equal(plan.pending_intake_to_reject, 1);
    // nothing mutated
    const sig = db.prepare("SELECT COUNT(*) AS n FROM signals WHERE batch_id = 'gallery-batch-1' AND status = 'active'").get() as any;
    assert.equal(sig.n, 5);
  });

  it("retires the batch: revokes signals, supersedes edges, retires created nodes, rejects pending", () => {
    const db = freshDb();
    setupBatch(db);
    const r = retireBatch(db, "gallery-batch-1", { reason: "wrong archive", by: "admin" });
    assert.equal(r.retired, true);
    assert.equal(r.signals_revoked, 5);
    assert.equal(r.nodes_retired, 1);
    assert.equal(r.pending_rejected, 1);
    assert.ok(r.edges_superseded! >= 1);

    // Signals revoked, anchor signal active.
    const active = db.prepare("SELECT COUNT(*) AS n FROM signals WHERE batch_id = 'gallery-batch-1' AND status = 'active'").get() as any;
    assert.equal(active.n, 0);
    const anchor = db.prepare("SELECT status, source_type FROM signals WHERE id = ?").get(r.admin_signal_id) as any;
    assert.equal(anchor.status, "active");
    assert.equal(anchor.source_type, "api_admin");

    // Created node retired; pre-existing node untouched.
    const created = JSON.parse((db.prepare("SELECT metadata FROM nodes WHERE id = 'artwork:new-piece'").get() as any).metadata);
    assert.equal(created.retired, true);
    const existing = (db.prepare("SELECT metadata FROM nodes WHERE id = 'artwork:existing'").get() as any).metadata;
    assert.equal(existing, null);

    // Batch edge superseded.
    const edge = db.prepare("SELECT valid_until, invalidated_by FROM edges WHERE id = 'e-batch'").get() as any;
    assert.ok(edge.valid_until);
    assert.equal(edge.invalidated_by, r.admin_signal_id);

    // Pending intake rejected with the reason recorded.
    const rejected = db.prepare("SELECT status, rejection_reason FROM intake_queue WHERE submitted_by = 'Probie'").get() as any;
    assert.equal(rejected.status, "rejected");
    assert.match(rejected.rejection_reason, /batch retired/);

    // Idempotent-ish: a second retire finds no active signals, retires nothing new.
    const again = retireBatch(db, "gallery-batch-1", { reason: "again", by: "admin" });
    assert.equal(again.signals_revoked, 0);
    assert.equal(again.nodes_retired, 0);
  });

  it("404s on an unknown batch", () => {
    const db = freshDb();
    assert.throws(() => retireBatch(db, "nope", { reason: "r", by: "admin" }), AdminActionError);
  });
});

describe("listBatches", () => {
  it("rolls up signals + intake by batch", () => {
    const db = freshDb();
    seedContributor(db, GALLERY);
    const s1 = insertSignal(db, { contributor: GALLERY, title: "a", content: "{}", batch_id: "b1" });
    insertSignal(db, { contributor: GALLERY, title: "b", content: "{}", batch_id: "b1" });
    insertSignal(db, { contributor: GALLERY, title: "c", content: "{}", batch_id: "b2" });
    insertSignal(db, { contributor: GALLERY, title: "d", content: "{}" }); // no batch
    insertIntake(db, { contributor: GALLERY, signal_id: s1, target_node: null });

    const batches = listBatches(db);
    assert.equal(batches.length, 2);
    const b1 = batches.find((b) => b.batch_id === "b1")!;
    assert.equal(b1.signals, 2);
    assert.equal(b1.active_signals, 2);
    assert.deepEqual(b1.contributors, ["Test Gallery"]);
    assert.equal(b1.intake.approved, 1); // reviewed tier → intake row approved
  });
});

describe("review actions (shared approve/reject)", () => {
  it("approve materialises a queued create_node and flips the row", () => {
    const db = freshDb();
    seedContributor(db, PROBIE);
    const sig = insertSignal(db, {
      contributor: PROBIE, title: "Create node", content: "{}", source_type: "api_node",
    });
    const { intake_id, status } = insertIntake(db, {
      contributor: PROBIE, signal_id: sig, target_node: "scene:test-scene",
      proposed_nodes: [{ op: "create_node", type: "scene", name: "Test Scene", slug: "test-scene" }],
    });
    assert.equal(status, "pending");

    const outcome = approveIntakeItem(db, intake_id, "api-admin");
    assert.equal(outcome.ok, true);
    const node = db.prepare("SELECT id, updated_by FROM nodes WHERE id = 'scene:test-scene'").get() as any;
    assert.ok(node, "node materialised");
    const row = db.prepare("SELECT status, reviewed_by FROM intake_queue WHERE id = ?").get(intake_id) as any;
    assert.equal(row.status, "approved");
    assert.equal(row.reviewed_by, "api-admin");
  });

  it("reject records the reason; double-review 404s", () => {
    const db = freshDb();
    seedContributor(db, PROBIE);
    const sig = insertSignal(db, { contributor: PROBIE, title: "t", content: "c" });
    const { intake_id } = insertIntake(db, { contributor: PROBIE, signal_id: sig, target_node: null });

    const outcome = rejectIntakeItem(db, intake_id, "not a fit", "api-admin");
    assert.equal(outcome.ok, true);
    const row = db.prepare("SELECT status, rejection_reason FROM intake_queue WHERE id = ?").get(intake_id) as any;
    assert.equal(row.status, "rejected");
    assert.equal(row.rejection_reason, "not a fit");

    const again = approveIntakeItem(db, intake_id, "api-admin");
    assert.equal(again.ok, false);
  });
});
