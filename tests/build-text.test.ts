// Per-type text construction. Ported from embed_nodes.py — divergence
// between the two implementations is exactly what would silently re-embed
// every node on every backfill run, so lock in the structural rules:
// task prefix, type-specific framing prose, graceful handling of missing
// metadata. Snapshots avoid asserting exact whitespace; just the tokens
// that signal each path was taken.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildText } from "../src/embed/server.js";

describe("buildText", () => {
  it("emits the canonical TASK_PREFIX", () => {
    const out = buildText({
      type: "concept",
      name: "Generative art",
      metadata: { description: "Art produced by autonomous systems." },
    });
    assert.ok(out, "expected non-null text");
    assert.match(out!, /^task: sentence similarity \| query: /);
  });

  it("prefixes concept and scene with their type label", () => {
    const concept = buildText({
      type: "concept",
      name: "Net art",
      metadata: { description: "Practice native to the web." },
    });
    const scene = buildText({
      type: "scene",
      name: "Demoscene",
      metadata: { description: "Real-time coded audiovisuals." },
    });
    assert.match(concept!, /Concept: Net art/);
    assert.match(scene!, /Scene: Demoscene/);
  });

  it("includes year + medium for flat artworks", () => {
    const out = buildText({
      type: "artwork",
      name: "Fidenza",
      metadata: {
        year_start: 2021,
        medium: "generative algorithm",
        description: "Curvature studies.",
      },
    });
    assert.match(out!, /Fidenza \(2021\)/);
    assert.match(out!, /generative algorithm/);
    assert.match(out!, /Curvature studies\./);
  });

  it("falls back through full_profile vs flat metadata for practitioners", () => {
    const fullProfile = buildText({
      type: "practitioner",
      name: "Casey Reas",
      metadata: {
        full_profile: {
          practice_description: {
            practice_summary: "Co-creator of Processing.",
            methodology: "Software as medium.",
            medium: "code",
          },
          sensory_register: {},
        },
      },
    });
    assert.match(fullProfile!, /Casey Reas/);
    assert.match(fullProfile!, /Co-creator of Processing\./);

    const flat = buildText({
      type: "practitioner",
      name: "Net New Artist",
      metadata: {
        occupations: "artist",
        nationalities: "British",
        description: "Wikidata stub.",
      },
    });
    assert.match(flat!, /Net New Artist/);
    assert.match(flat!, /Wikidata stub\./);
    assert.match(flat!, /British/);
  });

  it("handles collectives via the practitioner branch (shared structure)", () => {
    const out = buildText({
      type: "collective",
      name: "Forensic Architecture",
      metadata: {
        description: "Investigative agency at Goldsmiths.",
        medium: "spatial analysis",
      },
    });
    assert.match(out!, /Forensic Architecture/);
    assert.match(out!, /Investigative agency/);
  });

  it("returns null for non-embeddable types", () => {
    assert.equal(
      buildText({ type: "institution", name: "Whatever", metadata: {} }),
      null
    );
    assert.equal(
      buildText({ type: "publication", name: "Whatever", metadata: {} }),
      null
    );
  });

  it("returns null only when the resulting text has zero content (not even the type label)", () => {
    // Note: a concept with an empty name still produces "Concept:" — matches
    // embed_nodes.py's behavior intentionally so hashes stay stable. The
    // null path is reserved for branches that produce no parts at all
    // (e.g. an unknown type, see the test above).
    assert.equal(
      buildText({ type: "artwork", name: "", metadata: {} }),
      null,
      "an artwork with no name, year, or description produces no text"
    );
  });
});
