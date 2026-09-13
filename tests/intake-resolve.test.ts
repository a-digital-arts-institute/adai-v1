// resolve_entity — the dedup gate — and find_path, without Gemini.

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { freshDb, insertNode } from "./helpers.js";
import { resolve_entity, find_path, normaliseWebUrl, isIntakeTool } from "../src/intake/tools.js";

before(() => { delete process.env.GEMINI_API_KEY; });

function seed() {
  const db = freshDb();
  insertNode(db, "practitioner:casey reas", "practitioner", "Casey Reas");
  insertNode(db, "practitioner:ben-fry", "practitioner", "Ben Fry");
  insertNode(db, "artwork:process-4", "artwork", "Process 4");
  insertNode(db, "practitioner:gone", "practitioner", "Gone Person", { retired: true });
  db.prepare("INSERT INTO node_aliases (source, external_id, node_id) VALUES ('web', 'reas.com', 'practitioner:casey reas')").run();
  db.prepare("INSERT INTO edges (id, source_id, target_id, edge_type) VALUES ('e1', 'artwork:process-4', 'practitioner:casey reas', 'CREATED_BY')").run();
  db.prepare("INSERT INTO edges (id, source_id, target_id, edge_type) VALUES ('e2', 'practitioner:casey reas', 'practitioner:ben-fry', 'COLLABORATES_WITH')").run();
  db.prepare("INSERT INTO edges (id, source_id, target_id, edge_type, valid_until) VALUES ('e3', 'artwork:process-4', 'practitioner:gone', 'CREATED_BY', '2020-01-01T00:00:00Z')").run();
  return db;
}

describe("resolve_entity", () => {
  it("exact name, NOCASE, with type", async () => {
    const r = (await resolve_entity(seed(), { name: "casey reas", type: "practitioner" })) as any;
    assert.equal(r.matches[0].id, "practitioner:casey reas");
    assert.equal(r.matches[0].resolution, "exact");
    assert.equal(r.query.would_create, "practitioner:casey-reas");
  });

  it("web alias via hints.url (normalised)", async () => {
    const r = (await resolve_entity(seed(), { name: "C. Reas", hints: { url: "https://www.reas.com/?utm=1#top" } })) as any;
    assert.ok(r.matches.some((m: any) => m.id === "practitioner:casey reas" && m.resolution === "alias"));
    assert.equal(normaliseWebUrl("https://WWW.Reas.com/index.html"), "reas.com");
  });

  it("fuzzy via slug LIKE; retired nodes never surface", async () => {
    const r = (await resolve_entity(seed(), { name: "Fry" })) as any;
    assert.ok(r.matches.some((m: any) => m.id === "practitioner:ben-fry" && m.resolution === "fuzzy"));
    const gone = (await resolve_entity(seed(), { name: "Gone Person" })) as any;
    assert.equal(gone.matches.length, 0);
  });

  it("none", async () => {
    const r = (await resolve_entity(seed(), { name: "Nobody At All", type: "artwork" })) as any;
    assert.equal(r.matches.length, 0);
    assert.equal(r.query.would_create, "artwork:nobody-at-all");
  });
});

describe("find_path", () => {
  it("walks live edges only", () => {
    const db = seed();
    const r = find_path(db, { from: "artwork:process-4", to: "practitioner:ben-fry" }) as any;
    assert.equal(r.hops, 2);
    assert.deepEqual(r.path.map((p: any) => p.id), ["artwork:process-4", "practitioner:casey reas", "practitioner:ben-fry"]);
    const none = find_path(db, { from: "artwork:process-4", to: "practitioner:gone" }) as any;
    assert.equal(none.path, null);
  });
});

describe("allowlist", () => {
  it("exposes exactly the read tools", () => {
    for (const n of ["search_nodes", "get_node", "get_neighbours", "get_component", "resolve_entity", "find_path", "image_neighbours"]) assert.equal(isIntakeTool(n), true, n);
    for (const n of ["get_stats", "list_recent_additions", "focus_node", "materialise", "insertSignal", "__proto__", "constructor"]) assert.equal(isIntakeTool(n), false, n);
  });
});
