// One relation, several claims: counted by distinct evidence ORIGINS, not
// contributors (three people reading fellowship.xyz are one source), shown
// as one line — and /api/stats must count relations exactly as the stream
// ships them, or the /field IndexedDB cache never validates.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import express from "express";
import { initDb } from "../src/db.js";
import api from "../src/routes/api.js";
import { originOf, collapseClaims } from "../src/utils/claims.js";

describe("evidence origins", () => {
  const t = { source_id: "institution:pace", target_id: "practitioner:john-gerrard", edge_type: "REPRESENTS" };
  it("a web page is its host; a person without a page is the person; else the writer", () => {
    assert.equal(originOf({ ...t, source_url: "https://www.fellowship.xyz/artists/john-gerrard", submitted_by: "Irina" }).label, "fellowship.xyz");
    assert.equal(originOf({ ...t, submitted_by: "Irina" }).key, "person:Irina");
    assert.equal(originOf({ ...t, submitted_by: "Irina", consent_attribution: "anonymous" }).label, "anonymous");
    assert.equal(originOf({ ...t, created_by: "contributor:migration" }).label, "A(DAI) canon");
    assert.equal(originOf({ ...t, source_url: "https://pace.com/x", consent_scope: "structural_only" }).label, "withheld source");
  });
  it("three readers of one site are one source; a second site makes two", () => {
    const rows = [
      { ...t, source_url: "https://fellowship.xyz/a", submitted_by: "A", created_by: "api-A" },
      { ...t, source_url: "https://www.fellowship.xyz/b", submitted_by: "B", created_by: "api-B" },
      { ...t, source_url: "https://fellowship.xyz/c", submitted_by: "C", created_by: "api-C" },
    ];
    assert.deepEqual(collapseClaims(rows).map((r) => r.origins.map((o) => o.label)), [["fellowship.xyz"]]);
    const two = collapseClaims([...rows, { ...t, source_url: "https://www.pacegallery.com/artists/john-gerrard", submitted_by: "Pace", created_by: "api-Pace" }]);
    assert.equal(two.length, 1);
    assert.deepEqual(two[0]!.origins.map((o) => o.label), ["fellowship.xyz", "pacegallery.com"]);
  });
});

describe("graph surfaces", () => {
  it("stream ships one edge per relation with src; stats count matches; attribution lists every source", async () => {
    const db = initDb(":memory:");
    const node = (id: string, type: string, name: string) =>
      db.prepare("INSERT INTO nodes (id, type, name, slug, updated_by) VALUES (?, ?, ?, ?, 't')").run(id, type, name, id.split(":")[1]!);
    node("institution:pace", "institution", "Pace");
    node("practitioner:john-gerrard", "practitioner", "John Gerrard");
    node("artwork:x", "artwork", "X");
    const sig = (id: string, url: string | null, who: string) =>
      db.prepare("INSERT INTO signals (id, title, content, source_url, submitted_by, status) VALUES (?, 't', 'q', ?, ?, 'active')").run(id, url, who);
    sig("s1", "https://fellowship.xyz/artists/john-gerrard", "Irina");
    sig("s2", "https://fellowship.xyz/about", "Gio");
    sig("s3", "https://www.pacegallery.com/artists/john-gerrard", "Pace");
    const edge = (id: string, s: string, t: string, type: string, signal: string | null, by: string) =>
      db.prepare("INSERT INTO edges (id, source_id, target_id, edge_type, signal_id, created_by, valid_from) VALUES (?, ?, ?, ?, ?, ?, '2026-09-01T00:00:00Z')").run(id, s, t, type, signal, by);
    edge("e1", "institution:pace", "practitioner:john-gerrard", "REPRESENTS", "s1", "api-Irina");
    edge("e2", "institution:pace", "practitioner:john-gerrard", "REPRESENTS", "s2", "api-Gio");
    edge("e3", "institution:pace", "practitioner:john-gerrard", "REPRESENTS", "s3", "api-Pace");
    edge("e4", "artwork:x", "practitioner:john-gerrard", "CREATED_BY", null, "contributor:migration");

    const app = express(); app.use(api);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((r) => server.once("listening", r));
    const base = `http://127.0.0.1:${(server.address() as any).port}`;
    try {
      const stats = await (await fetch(`${base}/api/stats`)).json();
      assert.equal(stats.curated_edges, 2, "relations, not claim rows");
      const raw = Buffer.from(await (await fetch(`${base}/api/graph/stream`, { headers: { "accept-encoding": "identity" } })).arrayBuffer());
      const lines = (raw[0] === 0x1f ? gunzipSync(raw) : raw).toString().trim().split("\n").map((l) => JSON.parse(l));
      const meta = lines[0].meta;
      assert.equal(meta.stamp, `${stats.total_nodes}:${stats.curated_edges}`, "cache stamp parity");
      const edges = lines.filter((l) => l.e).map((l) => l.e);
      assert.equal(edges.length, 2);
      assert.equal(edges.find((e) => e.type === "REPRESENTS").src, 2, "fellowship.xyz twice + pacegallery.com = 2 sources");
      assert.equal(edges.find((e) => e.type === "CREATED_BY").src, undefined);
      const g = await (await fetch(`${base}/api/graph`)).json();
      assert.equal(g.edges.length, 2);
      const at = await (await fetch(`${base}/api/edge/attribution?source=institution:pace&target=practitioner:john-gerrard&type=REPRESENTS`)).json();
      assert.deepEqual(at.sources.map((s: any) => s.label), ["fellowship.xyz", "pacegallery.com"]);
    } finally {
      await new Promise<void>((r, j) => server.close((e) => (e ? j(e) : r())));
      db.close();
    }
  });
});
