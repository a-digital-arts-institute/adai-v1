// The entity-view footer states a node's real provenance ("source: fxhash")
// from this mapping instead of the old "graph-stub · awaiting enrichment"
// placeholder. The host→label map IS the producer contract surfaced to the UI;
// lock it so a new source (or a stray edit) can't silently change what the
// graph attributes a node to.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sourceLabel } from "../src/utils/source-label.js";

describe("sourceLabel", () => {
  it("maps each canon source host to its display label", () => {
    assert.equal(sourceLabel({ source_url: "https://www.fxhash.xyz/generative/1" }), "fxhash");
    assert.equal(sourceLabel({ source_url: "https://collections.vam.ac.uk/item/O1034089" }), "Victoria & Albert Museum");
    assert.equal(sourceLabel({ source_url: "https://www.vam.ac.uk/anything" }), "Victoria & Albert Museum");
    assert.equal(sourceLabel({ source_url: "https://superrare.com/0xabc/1" }), "SuperRare");
    assert.equal(sourceLabel({ source_url: "https://www.artblocks.io/project/0" }), "Art Blocks");
    assert.equal(sourceLabel({ source_url: "https://www.wikidata.org/wiki/Q860372" }), "Wikidata");
  });

  it("names the institute for its own classification-regime source_urls", () => {
    assert.equal(
      sourceLabel({ source_url: "https://github.com/a-digital-arts-institute/adai-v1" }),
      "A(DAI)"
    );
  });

  it("falls back to the bare host for a real but unmapped source", () => {
    assert.equal(sourceLabel({ source_url: "https://example.com/x" }), "example.com");
    // generic github (not the institute repo) stays a bare host, not A(DAI)
    assert.equal(sourceLabel({ source_url: "https://github.com/someone/repo" }), "github.com");
  });

  it("recognises V&A makers/collectives that carry no source_url", () => {
    assert.equal(sourceLabel({ va_maker_name: "Frieder Nake" }), "Victoria & Albert Museum");
    // source_url wins when both are present
    assert.equal(
      sourceLabel({ source_url: "https://www.fxhash.xyz/generative/2", va_maker_name: "x" }),
      "fxhash"
    );
  });

  it("returns null when nothing is derivable (a live contributor node)", () => {
    assert.equal(sourceLabel(null), null);
    assert.equal(sourceLabel(undefined), null);
    assert.equal(sourceLabel({}), null);
    assert.equal(sourceLabel({ source_url: null, va_maker_name: null }), null);
    // a malformed URL with no usable host yields null, not a throw
    assert.equal(sourceLabel({ source_url: "not a url" }), null);
  });
});
