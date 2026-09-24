// Evidence is held to the page. A quote must be on the page it cites, and a
// "Heading › Item" quote must match the page's structure: the item really
// sits under that heading. Fellowship (Sept 2026): with no "Exhibited
// Artists" heading on /artists/v2, the agent wrote "Fellowship Artists ›
// Kim Asendorf" for 58 artists who are not in that section. The worker has
// every page it read this pass in memory; this check runs before a card is
// proposed, and its message tells the agent what the page actually says.

const fold = (x: string) =>
  x.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[‘’“”"'`]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

interface Line { text: string; folded: string; level: number } // level 0 = not a heading

function lines(page: string): Line[] {
  return page.split("\n").map((raw) => {
    const m = /^(#{1,6})\s+(.*)$/.exec(raw.trim());
    const text = m ? m[2]! : raw.trim();
    return { text, folded: fold(text), level: m ? m[1]!.length : 0 };
  });
}

/** The heading an item line sits under: for a heading line, the nearest heading above it of a higher rank (siblings skipped); otherwise the nearest heading above. */
function parentOf(ls: Line[], k: number): Line | null {
  const own = ls[k]!.level;
  for (let i = k - 1; i >= 0; i--) {
    const l = ls[i]!;
    if (!l.level) continue;
    if (own && l.level >= own) continue;
    return l;
  }
  return null;
}

/** null when the quote is supported by the page text; otherwise a message for the agent. */
export function checkQuote(page: string, quote: string, pageUrl: string): string | null {
  const q = quote.trim();
  if (!q) return null;
  const ls = lines(page);
  const whole = ` ${fold(page)} `;
  const sep = /\s*[›>]\s*/;
  if (sep.test(q) && q.split(sep).length === 2) {
    const [h, item] = q.split(sep).map((x) => fold(x)) as [string, string];
    if (!h || !item) return null;
    const heads = ls.filter((l) => l.level && l.folded.includes(h));
    if (!heads.length) return `"${q}": there is no heading "${q.split(sep)[0]}" on ${pageUrl}. Quote a heading the page has, or the sentence itself.`;
    const where: string[] = [];
    for (let k = 0; k < ls.length; k++) {
      if (!ls[k]!.folded.includes(item)) continue;
      const p = parentOf(ls, k);
      if (p && p.folded.includes(h)) return null;
      where.push(p ? `"${p.text}"` : "no heading");
    }
    if (!where.length) return `"${q}": "${q.split(sep)[1]}" is not on ${pageUrl}.`;
    return `"${q}": on ${pageUrl}, "${q.split(sep)[1]}" is not under the heading "${q.split(sep)[0]}" — it sits under ${[...new Set(where)].slice(0, 3).join(", ")}. The heading a name sits under is the claim; propose the relation that heading supports, or none.`;
  }
  // Plain quote; "…" / "..." join fragments that must each be on the page, in order.
  let at = 0;
  for (const frag of q.split(/\s*(?:\.\.\.|…)\s*/).map(fold).filter(Boolean)) {
    const i = whole.indexOf(` ${frag} `, at) >= 0 ? whole.indexOf(` ${frag} `, at) : whole.indexOf(frag, at);
    if (i < 0) return `"${q.slice(0, 120)}" is not on ${pageUrl} as quoted. Quote the page verbatim.`;
    at = i + frag.length;
  }
  return null;
}
