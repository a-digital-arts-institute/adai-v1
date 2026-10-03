// What an organisation (an `institution` node) says it is: a fixed list, and
// an organisation may be several at once — interfacegallery.io calls itself
// "a project-based gallery, private art dealership and advisory". The type
// stays `institution` for all of them because in the graph they all do the
// same thing (present, host, hold art); `metadata.kind` carries the rest.
//
// Publication, platform and collective are NOT kinds: they are node types.
//
// The worker copies this file at build time (worker/scripts/prepare.mjs), so
// the prompt and the validator read the same list. No imports here.

export const ORG_KINDS = [
  "museum",
  "art centre",
  "gallery",
  "dealership",
  "advisory",
  "fair",
  "festival",
  "venue",
  "auction house",
  "archive",
  "residency",
  "lab",
  "foundation",
  "biennial",
  "prize",
] as const;
export type OrgKind = (typeof ORG_KINDS)[number];

const SPELLINGS: Record<string, OrgKind> = {
  "art center": "art centre",
  "arts centre": "art centre",
  "arts center": "art centre",
  "dealer": "dealership",
  "art dealership": "dealership",
  "art advisory": "advisory",
  "art fair": "fair",
  "auction": "auction house",
  "biennale": "biennial",
};

/**
 * Normalise a `kind` value to a de-duplicated list from ORG_KINDS. Accepts a
 * single string or an array. Returns the list, or the values it could not
 * place (so the caller can say which ones and what is allowed).
 */
export function normaliseOrgKinds(v: unknown): { ok: true; kinds: OrgKind[] } | { ok: false; unknown: string[] } {
  const raw = Array.isArray(v) ? v : [v];
  const kinds: OrgKind[] = [];
  const unknown: string[] = [];
  for (const r of raw) {
    if (typeof r !== "string") { unknown.push(JSON.stringify(r)); continue; }
    const s = r.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
    const k = (ORG_KINDS as readonly string[]).includes(s) ? (s as OrgKind) : SPELLINGS[s];
    if (!k) unknown.push(r);
    else if (!kinds.includes(k)) kinds.push(k);
  }
  if (unknown.length || !kinds.length) return { ok: false, unknown: unknown.length ? unknown : ["(empty)"] };
  return { ok: true, kinds };
}

export function orgKindsError(unknown: string[]): string {
  return `metadata.kind: ${unknown.join(", ")} not in the list (${ORG_KINDS.join(", ")}); an organisation may have several`;
}
