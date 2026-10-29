// POST /api/v1/packages: nodes + the edges between them in one write.

import { it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { initDb } from "../src/db.js";
import contributorApi from "../src/routes/contributor-api.js";
import { mintToken } from "../src/utils/token-mint.js";
import { approveIntakeItem, rejectIntakeItem } from "../src/utils/review.js";

async function setup() {
  const db = initDb(":memory:");
  const prob = mintToken(db, { contributorName: "Probie", createIfMissing: true, tier: "probationary" } as any);
  const auto = mintToken(db, { contributorName: "Founder", createIfMissing: true, tier: "reviewed" } as any);
  db.prepare("INSERT INTO nodes (id, type, name, slug, metadata, updated_by) VALUES ('practitioner:patrick tresset', 'practitioner', 'Patrick Tresset', 'patrick-tresset', '{}', 'test')").run();
  const app = express();
  app.use(express.json());
  app.use(contributorApi);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const post = async (tok: { raw_token: string }, body: unknown) => {
    const r = await fetch(`${base}/api/v1/packages`, { method: "POST", headers: { authorization: `Bearer ${tok.raw_token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    return { status: r.status, json: await r.json() as any };
  };
  return { db, prob, auto, server, post };
}
const count = (db: any, t: string) => (db.prepare(`SELECT COUNT(*) c FROM ${t}`).get() as any).c;

it("probationary: one queued row; approve creates nodes then edges", async () => {
  const { db, prob, server, post } = await setup();
  try {
    const nodesBefore = count(db, "nodes"), edgesBefore = count(db, "edges");
    const r = await post(prob, {
      batch_id: "residency-2026",
      nodes: [
        { ref: "show", type: "project", name: "Residency Show" },
        { ref: "w1", type: "artwork", name: "Work One" },
      ],
      edges: [
        { source_id: "w1", target_id: "practitioner:patrick tresset", edge_type: "CREATED_BY" },
        { source_id: "practitioner:patrick tresset", target_id: "show", edge_type: "PARTICIPATED_IN" },
        { source_id: "Work One", target_id: "project:residency-show", edge_type: "EXHIBITED_AT" },
      ],
    });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.status, "pending");
    assert.deepEqual(r.json.node_ids, { show: "project:residency-show", w1: "artwork:work-one" });
    assert.equal(count(db, "nodes"), nodesBefore);
    assert.equal(count(db, "edges"), edgesBefore);
    assert.equal((db.prepare("SELECT COUNT(*) c FROM intake_queue").get() as any).c, 1);
    const sig = db.prepare("SELECT batch_id FROM signals WHERE id = ?").get(r.json.signal_id) as any;
    assert.equal(sig.batch_id, "residency-2026");

    const out = approveIntakeItem(db, r.json.intake_id, "curator");
    assert.equal(out.ok, true);
    assert.ok(db.prepare("SELECT 1 FROM nodes WHERE id='project:residency-show'").get());
    assert.ok(db.prepare("SELECT 1 FROM nodes WHERE id='artwork:work-one'").get());
    const e = db.prepare("SELECT source_id, target_id, edge_type FROM edges WHERE valid_until IS NULL ORDER BY edge_type").all() as any[];
    assert.equal(e.length, 3);
    assert.ok(e.some((x) => x.edge_type === "CREATED_BY" && x.source_id === "artwork:work-one" && x.target_id === "practitioner:patrick tresset"));
  } finally { server.close(); }
});

it("rejecting the queued item rejects nodes and edges together", async () => {
  const { db, prob, server, post } = await setup();
  try {
    const r = await post(prob, {
      nodes: [{ type: "artwork", name: "Doomed" }],
      edges: [{ source_id: "artwork:doomed", target_id: "practitioner:patrick tresset", edge_type: "CREATED_BY" }],
    });
    assert.equal(r.status, 200);
    const out = rejectIntakeItem(db, r.json.intake_id, "curator");
    assert.equal(out.ok, true);
    assert.equal(db.prepare("SELECT 1 FROM nodes WHERE id='artwork:doomed'").get(), undefined);
    assert.equal((db.prepare("SELECT COUNT(*) c FROM edges WHERE source_id='artwork:doomed'").get() as any).c, 0);
  } finally { server.close(); }
});

it("an existing node (legacy spaced id) is matched, not duplicated", async () => {
  const { db, prob, auto, server, post } = await setup();
  try {
    for (const tok of [prob, auto]) {
      const r = await post(tok, {
        nodes: [
          { ref: "pt", type: "practitioner", name: "Patrick Tresset" },
          { ref: "a", type: "artwork", name: `Piece ${tok === prob ? "P" : "A"}` },
        ],
        edges: [{ source_id: "a", target_id: "pt", edge_type: "CREATED_BY" }],
      });
      assert.equal(r.status, 200, JSON.stringify(r.json));
      assert.deepEqual(r.json.existing_nodes, ["practitioner:patrick tresset"]);
      assert.equal(r.json.node_ids.pt, "practitioner:patrick tresset");
      if (tok === prob) approveIntakeItem(db, r.json.intake_id, "curator");
    }
    assert.equal((db.prepare("SELECT COUNT(*) c FROM nodes WHERE type='practitioner'").get() as any).c, 1);
    const e = db.prepare("SELECT target_id FROM edges WHERE edge_type='CREATED_BY'").all() as any[];
    assert.equal(e.length, 2);
    assert.ok(e.every((x) => x.target_id === "practitioner:patrick tresset"));
  } finally { server.close(); }
});

it("reviewed: applied at once, one transaction, audit row approved", async () => {
  const { db, auto, server, post } = await setup();
  try {
    const r = await post(auto, {
      nodes: [{ ref: "g", type: "institution", name: "Gallery X", metadata: { kind: "gallery" } }, { ref: "c", type: "concept", name: "Plotter" }],
      edges: [{ source_id: "g", target_id: "practitioner:patrick tresset", edge_type: "REPRESENTS" }],
    });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.status, "approved");
    assert.deepEqual(r.json.created_nodes.sort(), ["concept:plotter", "institution:gallery-x"]);
    const inst = db.prepare("SELECT metadata FROM nodes WHERE id='institution:gallery-x'").get() as any;
    assert.deepEqual(JSON.parse(inst.metadata).kind, ["gallery"]);
    assert.equal(JSON.parse((db.prepare("SELECT metadata FROM nodes WHERE id='concept:plotter'").get() as any).metadata).tag_origin, "contributor");
    assert.equal((db.prepare("SELECT COUNT(*) c FROM edges WHERE source_id='institution:gallery-x' AND valid_until IS NULL").get() as any).c, 1);
    assert.equal((db.prepare("SELECT status FROM intake_queue WHERE id = ?").get(r.json.intake_id) as any).status, "approved");
  } finally { server.close(); }
});

it("bad input: 400 lists every problem and writes nothing", async () => {
  const { db, prob, auto, server, post } = await setup();
  try {
    const before = [count(db, "nodes"), count(db, "edges"), count(db, "signals"), count(db, "intake_queue")];
    for (const tok of [prob, auto]) {
      const r = await post(tok, {
        nodes: [{ ref: "a", type: "artwork", name: "Fine" }, { type: "artwork" }, { ref: "a", type: "artwork", name: "Other" }, { type: "institution", name: "Bad", metadata: { kind: "nonsense" } }],
        edges: [
          { source_id: "a", target_id: "nowhere", edge_type: "CREATED_BY" },
          { source_id: "a", target_id: "practitioner:patrick tresset" },
          { source_id: "a", target_id: "a", edge_type: "EMBODIES" },
        ],
      });
      assert.equal(r.status, 400);
      assert.equal(r.json.error, "invalid_package");
      const keys = r.json.problems.map((p: any) => `${p.item}${p.index}`).sort();
      assert.deepEqual(keys, ["edge0", "edge1", "edge2", "node1", "node2", "node3"]);
    }
    assert.deepEqual([count(db, "nodes"), count(db, "edges"), count(db, "signals"), count(db, "intake_queue")], before);
    const dup = await post(prob, { nodes: [{ type: "artwork", name: "Same" }, { type: "artwork", name: "same", slug: "same" }] });
    assert.equal(dup.status, 400);
    const bb = await post(prob, { batch_id: "bad id!", nodes: [{ type: "artwork", name: "X" }] });
    assert.equal(bb.status, 400);
    assert.equal((await post(prob, {})).status, 400);
    assert.equal((await post(prob, { nodes: "x" })).status, 400);
  } finally { server.close(); }
});

it("size cap: too many nodes or edges is refused whole", async () => {
  const { db, prob, server, post } = await setup();
  try {
    const nodes = Array.from({ length: 301 }, (_, i) => ({ type: "artwork", name: `W${i}` }));
    const r = await post(prob, { nodes });
    assert.equal(r.status, 400);
    assert.equal(r.json.error, "package_too_large");
    const edges = Array.from({ length: 601 }, () => ({ source_id: "practitioner:patrick tresset", target_id: "practitioner:patrick tresset", edge_type: "COLLABORATES_WITH" }));
    assert.equal((await post(prob, { edges })).json.error, "package_too_large");
    const ok = await post(prob, { nodes: nodes.slice(0, 300) });
    assert.equal(ok.status, 200);
    assert.equal(count(db, "intake_queue"), 1);
  } finally { server.close(); }
});

it("requires a token", async () => {
  const { server, post } = await setup();
  try {
    const r = await post({ raw_token: "adai_nope" }, { nodes: [{ type: "artwork", name: "X" }] });
    assert.equal(r.status, 401);
  } finally { server.close(); }
});
