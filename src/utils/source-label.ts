/**
 * sourceLabel — derive a human-readable provenance label for a node from its
 * metadata, for the field's entity-view footer ("source: …") and the archivist
 * focused-entity context. It reads the REAL provenance the gatherers stamped,
 * so the field never has to claim "graph-stub · awaiting enrichment" for a node
 * that in fact has a known origin:
 *
 *   - metadata.source_url host — every canon artwork / concept / platform /
 *     institution / regime carries one (fxhash, V&A, SuperRare, Art Blocks, …);
 *   - va_maker_name — the 1960s–70s V&A makers and collectives carry no
 *     source_url (they're makers, not accessioned objects) but are
 *     unambiguously Victoria & Albert.
 *
 * Returns null only when nothing is derivable — in practice a live
 * contributor-API node with no upstream source. The caller decides that
 * fallback's wording (the footer says "community contribution").
 *
 * Deliberately tiny + host-substring matched: node IDs and source_urls ARE the
 * producer contract (CLAUDE.md — "node IDs embed the source's external id"), so
 * these hosts are stable. A new source adds one line here, not a downstream
 * heuristic.
 */
export interface SourceMeta {
  source_url?: string | null;
  va_maker_name?: string | null;
}

export function sourceLabel(meta: SourceMeta | null | undefined): string | null {
  if (!meta) return null;

  const su = meta.source_url;
  if (su) {
    if (su.includes("fxhash.xyz")) return "fxhash";
    if (su.includes("vam.ac.uk")) return "Victoria & Albert Museum";
    if (su.includes("superrare.com")) return "SuperRare";
    if (su.includes("artblocks.io")) return "Art Blocks";
    if (su.includes("wikidata.org")) return "Wikidata";
    // The classification regimes point source_url at the institute's own repo —
    // they ARE A(DAI)'s editorial construct, so name the institute, not github.
    if (su.includes("github.com/a-digital-arts-institute")) return "A(DAI)";
    // A real but unmapped source — surface the bare host (e.g. github.com)
    // rather than dropping the attribution.
    try {
      return new URL(su).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }

  // V&A makers / collectives carry no source_url but are V&A by construction.
  if (meta.va_maker_name != null) return "Victoria & Albert Museum";

  return null;
}
