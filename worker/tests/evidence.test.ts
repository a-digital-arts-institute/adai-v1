// Quotes are held to the page they cite, and "Heading › Item" to the page's
// structure. Fixture: the two shapes of fellowship.xyz's artists page.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkQuote } from "../src/evidence.js";

const artists = `## Fellowship Artists

### Sougwen Chung
Sougwen 愫君 Chung is a Chinese-Canadian artist and researcher.
### john gerrard
john gerrard is widely regarded as a pivotal figure.

### Exhibited Artists

Guy Bourdin (Estate)
Kim Asendorf
john gerrard

### Projects
Daily.xyz`;

// v2: same page, no "Exhibited Artists" heading; the full list lands after Projects.
const v2 = artists.replace("### Exhibited Artists\n\nGuy Bourdin (Estate)\nKim Asendorf\njohn gerrard\n\n", "") + "\n\nGuy Bourdin (Estate)\nKim Asendorf\njohn gerrard";

describe("checkQuote", () => {
  it("a heading › item quote must match where the item sits", () => {
    assert.equal(checkQuote(artists, "Fellowship Artists › john gerrard", "u"), null);
    assert.equal(checkQuote(artists, "Exhibited Artists › Kim Asendorf", "u"), null);
    assert.equal(checkQuote(artists, "Exhibited Artists › Guy Bourdin (Estate)", "u"), null);
    assert.match(checkQuote(artists, "Fellowship Artists › Kim Asendorf", "u")!, /sits under "Exhibited Artists"/);
    assert.match(checkQuote(v2, "Fellowship Artists › Kim Asendorf", "u")!, /sits under "Projects"/);
    assert.match(checkQuote(v2, "Exhibited Artists › Kim Asendorf", "u")!, /no heading "Exhibited Artists"/);
    assert.match(checkQuote(artists, "Fellowship Artists › Nobody Here", "u")!, /is not on u/);
  });
  it("a plain quote must be on the page (case, spacing and diacritics folded; … joins fragments)", () => {
    assert.equal(checkQuote(artists, "Sougwen 愫君 Chung is a Chinese-Canadian artist", "u"), null);
    assert.equal(checkQuote(artists, "JOHN GERRARD is widely regarded … a pivotal figure", "u"), null);
    assert.match(checkQuote(artists, "Our roster spans the field", "u")!, /not on u as quoted/);
  });
});
