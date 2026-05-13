// Canonical slugifier for A(DAI) node IDs. The transformation must stay
// identical to what `src/seed.ts` historically used so that an IDs computed
// at contribution-time match IDs computed at seed-time for the same name.
// Don't add new replacements without thinking about historical collisions.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/ /g, "-")
    .replace(/\(/g, "")
    .replace(/\)/g, "")
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/&/g, "and")
    .replace(/--/g, "-");
}

// Compose a canonical node id from (type, name|slug). The seed convention is
// `<type>:<slug-or-spaced-name>` — note that legacy ids in seed/nodes.json
// preserve spaces (e.g. "practitioner:casey reas") while newer ids tend to
// use the slug. The contributor API uses the slug form, which is unambiguous.
export function nodeId(type: string, nameOrSlug: string): string {
  return `${type}:${slugify(nameOrSlug)}`;
}
