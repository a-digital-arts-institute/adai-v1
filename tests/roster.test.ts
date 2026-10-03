// A gallery / platform page leads with its artists, read off live edges
// one step behind the gallery's own (works and shows). Derived, never stored.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { freshDb, insertNode } from "./helpers.js";
import { rosterFor } from "../src/utils/roster.js";
import { SERVER_HANDLERS } from "../src/archivist/tools.js";

function edge(db: ReturnType<typeof freshDb>, s: string, t: string, type: string, live = true) {
  db.prepare(
    `INSERT INTO edges (id, source_id, target_id, edge_type, created_by, valid_from, valid_until)
     VALUES (?, ?, ?, ?, 'test', '2026-01-01T00:00:00Z', ?)`
  ).run(`${s}--${type}--${t}`, s, t, type, live ? null : "2026-06-01T00:00:00Z");
}

describe("rosterFor", () => {
  it("represented first, then by shows + works; old edges, retired artists and non-artists drop out", () => {
    const db = freshDb();
    insertNode(db, "institution:interface", "institution", "Interface");
    for (const [id, name] of [["molnar", "Vera Molnár"], ["nake", "Frieder Nake"], ["nees", "Georg Nees"], ["franke", "Herbert W. Franke"], ["gone", "Left Artist"]]) {
      insertNode(db, `practitioner:${id}`, "practitioner", name!);
    }
    insertNode(db, "practitioner:retired", "practitioner", "Retired", { retired: true });
    insertNode(db, "project:a-legacy", "project", "A Legacy");
    insertNode(db, "project:dots", "project", "From Dots to Pixels");
    insertNode(db, "artwork:w1", "artwork", "Untitled 1");
    insertNode(db, "artwork:w2", "artwork", "Untitled 2");

    edge(db, "institution:interface", "practitioner:franke", "REPRESENTS");
    edge(db, "project:a-legacy", "institution:interface", "PRESENTED_BY");
    edge(db, "project:dots", "institution:interface", "PRESENTED_BY");
    for (const p of ["molnar", "nake", "nees"]) edge(db, `practitioner:${p}`, "project:a-legacy", "PARTICIPATED_IN");
    for (const p of ["molnar", "nake"]) edge(db, `practitioner:${p}`, "project:dots", "PARTICIPATED_IN");
    edge(db, "artwork:w1", "institution:interface", "EXHIBITED_AT");      // shown at the gallery
    edge(db, "artwork:w1", "practitioner:nees", "CREATED_BY");
    edge(db, "artwork:w2", "project:dots", "EXHIBITED_AT");               // shown in a show it presented
    edge(db, "artwork:w2", "practitioner:molnar", "CREATED_BY");
    edge(db, "practitioner:gone", "project:dots", "PARTICIPATED_IN", false); // superseded
    edge(db, "practitioner:retired", "project:dots", "PARTICIPATED_IN");

    const r = rosterFor(db, "institution:interface");
    assert.deepEqual(r.map((a) => [a.name, a.represented, a.shows, a.works]), [
      ["Herbert W. Franke", true, 0, 0],
      ["Vera Molnár", false, 2, 1],
      ["Frieder Nake", false, 2, 0],
      ["Georg Nees", false, 1, 1],
    ]);
  });

  it("the archivist's get_node carries the roster for an institution (the field and /data read the same helper)", () => {
    const db = freshDb();
    insertNode(db, "institution:fellowship", "institution", "Fellowship");
    insertNode(db, "practitioner:harold-cohen", "practitioner", "Harold Cohen");
    insertNode(db, "project:aaron", "project", "AARON");
    edge(db, "project:aaron", "institution:fellowship", "PRESENTED_BY");
    edge(db, "practitioner:harold-cohen", "project:aaron", "PARTICIPATED_IN");
    const r = (SERVER_HANDLERS as any).get_node(db, { id: "institution:fellowship" });
    assert.equal(r.roster_count, 1);
    assert.deepEqual(r.roster[0], { id: "practitioner:harold-cohen", name: "Harold Cohen", slug: insertedSlug("Harold Cohen"), represented: false, shows: 1, works: 0 });
    const p = (SERVER_HANDLERS as any).get_node(db, { id: "practitioner:harold-cohen" });
    assert.equal(p.roster, undefined);
  });

  it("an estate named by the evidence is labelled, read from the quote", () => {
    const db = freshDb();
    insertNode(db, "institution:fellowship", "institution", "Fellowship");
    insertNode(db, "practitioner:august-sander", "practitioner", "August Sander");
    insertNode(db, "practitioner:sougwen-chung", "practitioner", "Sougwen Chung");
    db.prepare("INSERT INTO signals (id, title, content, status) VALUES ('s1', 't', 'Gallery Artists › August Sander (Estate)', 'active')").run();
    db.prepare("INSERT INTO signals (id, title, content, status) VALUES ('s2', 't', 'Fellowship Artists › Sougwen Chung', 'active')").run();
    db.prepare("INSERT INTO edges (id, source_id, target_id, edge_type, signal_id, created_by, valid_from) VALUES ('r1', 'institution:fellowship', 'practitioner:august-sander', 'REPRESENTS', 's1', 't', '2026-01-01T00:00:00Z')").run();
    db.prepare("INSERT INTO edges (id, source_id, target_id, edge_type, signal_id, created_by, valid_from) VALUES ('r2', 'institution:fellowship', 'practitioner:sougwen-chung', 'REPRESENTS', 's2', 't', '2026-01-01T00:00:00Z')").run();
    const r = rosterFor(db, "institution:fellowship");
    assert.deepEqual(r.map((a) => [a.name, a.estate]), [["August Sander", true], ["Sougwen Chung", false]]);
  });
});

function insertedSlug(name: string): string {
  return name.toLowerCase().replace(/ /g, "-");
}
