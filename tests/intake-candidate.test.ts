// The candidate validator is the code-level enforcement of the relation
// policy (docs/URL-INTAKE-SPEC.md §7). If it regresses, the prompt is the
// only thing standing between a web page and INFLUENCES edges.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateCandidate,
  applyContributorPatch,
  nextCid,
  CandidateError,
  type Candidate,
} from "../src/intake/candidate.js";

const ev = { page_url: "https://example.org/works", quote: "Fidenza was created by Tyler Hobbs in 2021." };

function node(cid: string, name: string, type = "practitioner"): Candidate {
  return validateCandidate(
    { cid, kind: "node", origin: "site", evidence: ev, node: { type, name, metadata: {}, aliases: [] }, resolves_to: null, resolution: "none" },
    []
  );
}

describe("candidate validator", () => {
  it("rejects INFLUENCES and RESPONDS_TO as edges", () => {
    for (const t of ["INFLUENCES", "RESPONDS_TO", "STYLE_KIN", "CLASSIFIED_BY"]) {
      assert.throws(
        () => validateCandidate({ cid: "c_01", kind: "edge", origin: "site", evidence: ev, edge: { source: "artwork:a", target: "practitioner:b", edge_type: t, confidence: "high" } }, []),
        (e: any) => e instanceof CandidateError && /not suggestable/.test(e.message)
      );
    }
  });

  it("allows INFLUENCES only through a question", () => {
    const q = validateCandidate(
      { cid: "c_01", kind: "question", origin: "graph", question: { text: "Did X influence you?", if_yes: { source: "practitioner:a", target: "practitioner:b", edge_type: "INFLUENCES", confidence: "medium" } } },
      []
    );
    assert.equal(q.kind, "question");
  });

  it("rejects COLLABORATES_WITH whose quote does not name the other party", () => {
    const a = node("c_01", "Alice Example");
    const b = node("c_02", "Bob Sample");
    assert.throws(
      () => validateCandidate(
        { cid: "c_03", kind: "edge", origin: "site", evidence: { page_url: ev.page_url, quote: "We worked together on many things." }, edge: { source: "cid:c_01", target: "cid:c_02", edge_type: "COLLABORATES_WITH", confidence: "high" } },
        [a, b]
      ),
      /names the other party/
    );
    const ok = validateCandidate(
      { cid: "c_03", kind: "edge", origin: "site", evidence: { page_url: ev.page_url, quote: "Alice and Bob co-authored the installation." }, edge: { source: "cid:c_01", target: "cid:c_02", edge_type: "COLLABORATES_WITH", confidence: "high" } },
      [a, b]
    );
    assert.equal(ok.kind, "edge");
  });

  it("rejects dangling cid refs", () => {
    assert.throws(
      () => validateCandidate({ cid: "c_02", kind: "edge", origin: "site", evidence: ev, edge: { source: "cid:c_09", target: "practitioner:b", edge_type: "CREATED_BY", confidence: "high" } }, []),
      /does not exist in this draft/
    );
  });

  it("site-origin node/edge/patch need evidence; graph-origin known does not", () => {
    assert.throws(() => validateCandidate({ cid: "c_01", kind: "node", origin: "site", node: { type: "artwork", name: "X", metadata: {}, aliases: [] } }, []), /needs evidence/);
    const k = validateCandidate({ cid: "c_01", kind: "known", origin: "graph", known: { node_id: "practitioner:a", summary: "already there" } }, []);
    assert.equal(k.kind, "known");
  });

  it("known can never be accepted, questions are answered not accepted", () => {
    assert.throws(() => validateCandidate({ cid: "c_01", kind: "known", origin: "graph", state: "accepted", known: { node_id: "practitioner:a", summary: "x" } }, []), /cannot be accepted/);
    const k = validateCandidate({ cid: "c_01", kind: "known", origin: "graph", known: { node_id: "practitioner:a", summary: "x" } }, []);
    assert.throws(() => applyContributorPatch(k, { state: "accepted" }), /cannot be accepted/);
    const q = validateCandidate({ cid: "c_02", kind: "question", origin: "graph", question: { text: "?", if_yes: { source: "practitioner:a", target: "practitioner:b", edge_type: "INFLUENCES" } } }, []);
    assert.throws(() => applyContributorPatch(q, { state: "accepted" }), /answer the question/);
    const answered = applyContributorPatch(q, { answered_yes: true, answer: "Yes, deeply." });
    assert.equal(answered.state, "answered");
    assert.equal(answered.edited, true);
  });

  it("sensed (embedding) relations cannot be edges", () => {
    assert.throws(
      () => validateCandidate({ cid: "c_01", kind: "edge", origin: "embedding", edge: { source: "artwork:a", target: "artwork:b", edge_type: "EMBODIES", confidence: "low" } }, []),
      /sensed/
    );
  });

  it("a new node whose deterministic id already exists must carry resolves_to", () => {
    const nodeExists = (id: string) => id === "practitioner:casey-reas";
    const slugify = (s: string) => s.toLowerCase().replace(/ /g, "-");
    assert.throws(
      () => validateCandidate({ cid: "c_01", kind: "node", origin: "site", evidence: ev, node: { type: "practitioner", name: "Casey Reas", metadata: {}, aliases: [] }, resolves_to: null, resolution: "none" }, [], { nodeExists, slugify }),
      /already exists/
    );
    const linked = validateCandidate({ cid: "c_01", kind: "node", origin: "site", evidence: ev, node: { type: "practitioner", name: "Casey Reas", metadata: {}, aliases: [] }, resolves_to: "practitioner:casey-reas", resolution: "exact" }, [], { nodeExists, slugify });
    assert.equal(linked.kind === "node" && linked.resolves_to, "practitioner:casey-reas");
  });

  it("caps questions at 10 per draft", () => {
    const qs: Candidate[] = [];
    const q = (i: number) => ({ cid: `c_${String(i).padStart(2, "0")}`, kind: "question", origin: "graph", question: { text: "?", if_yes: { source: "practitioner:a", target: "practitioner:b", edge_type: "COLLABORATES_WITH" } } });
    for (let i = 1; i <= 10; i++) qs.push(validateCandidate(q(i), qs));
    assert.throws(() => validateCandidate(q(11), qs), /at most 10/);
  });

  it("institution kinds: fixed list, several allowed, normalised, and the organisation's own words when from a site", () => {
    const node = (metadata: Record<string, unknown>, origin = "site") =>
      validateCandidate({ cid: "c_01", kind: "node", origin, evidence: ev, node: { type: "institution", name: "Interface", metadata } }, []);
    const n = node({ kind: ["Gallery", "art-dealership", "advisory"], kind_source: { page_url: "https://interface.example/about", quote: "a project-based gallery, private art dealership and advisory" } });
    assert.deepEqual(n.kind === "node" && n.node.metadata.kind, ["gallery", "dealership", "advisory"]);
    assert.deepEqual((node({ kind: "Art Center", kind_source: ev }) as any).node.metadata.kind, ["art centre"]);
    assert.throws(() => node({ kind: ["gallery", "shop"], kind_source: ev }), /shop not in the list/);
    assert.throws(() => node({ kind: ["publication"], kind_source: ev }), /not in the list/);
    assert.throws(() => node({ kind: ["gallery"] }), /kind_source/);
    // a contributor-origin card needs no quote: the contributor attests it
    assert.doesNotThrow(() => node({ kind: ["museum"] }, "contributor"));
    // kind on other node types is not ours to police
    assert.doesNotThrow(() => validateCandidate({ cid: "c_01", kind: "node", origin: "site", evidence: ev, node: { type: "artwork", name: "X", metadata: { kind: "print" } } }, []));
    // a correction to an existing institution's kind is checked too
    const p = validateCandidate({ cid: "c_02", kind: "patch", origin: "site", evidence: ev, patch: { node_id: "institution:v-a", key: "kind", proposed: "Museum" } }, []);
    assert.deepEqual(p.kind === "patch" && p.patch.proposed, ["museum"]);
    assert.throws(() => validateCandidate({ cid: "c_02", kind: "patch", origin: "site", evidence: ev, patch: { node_id: "institution:v-a", key: "kind", proposed: "national museum of art and design" } }, []), /not in the list/);
  });

  it("ended: present-tense relations only, from the site, with the page as it reads now", () => {
    const ended = (over: Record<string, unknown> = {}) =>
      validateCandidate({ cid: "c_01", kind: "ended", origin: "site", evidence: ev, ended: { edge_id: "e1", edge_type: "REPRESENTS", source_id: "institution:g", target_id: "practitioner:a", summary: "no longer on the roster" }, ...over }, []);
    assert.equal(ended().kind, "ended");
    assert.throws(() => ended({ ended: { edge_id: "e1", edge_type: "EXHIBITED_AT", source_id: "artwork:w", target_id: "institution:g", summary: "x" } }), /event and stays true/);
    assert.throws(() => ended({ evidence: undefined }), /evidence/);
    assert.throws(() => ended({ origin: "graph" }), /origin 'site'/);
  });

  it("contributor edits stay inside the policy and mark edited", () => {
    const e = validateCandidate({ cid: "c_01", kind: "edge", origin: "site", evidence: ev, edge: { source: "artwork:a", target: "practitioner:b", edge_type: "CREATED_BY", confidence: "high" } }, []);
    assert.throws(() => applyContributorPatch(e, { patch: { edge_type: "INFLUENCES" } }), /outside policy/);
    const p = applyContributorPatch(e, { patch: { edge_type: "EXHIBITED_AT", event_time: "2021" } });
    assert.equal(p.kind === "edge" && p.edge.edge_type, "EXHIBITED_AT");
    assert.equal(p.edited, true);
  });

  it("nextCid increments", () => {
    assert.equal(nextCid([]), "c_01");
    assert.equal(nextCid([node("c_07", "x")]), "c_08");
  });
});
