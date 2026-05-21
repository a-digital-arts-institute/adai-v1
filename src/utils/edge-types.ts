// Edge-type vocabulary + rule guards.
//
// Three kinds of rule the audit found violated in seed/edges.json:
//
//   1. Direction. EMBODIES is artwork→concept, USES_TECHNIQUE is
//      practitioner→concept, BELONGS_TO is practitioner→(scene|collective),
//      etc. Producers routinely got direction wrong (75 USES_TECHNIQUE
//      with artwork sources in the May 2026 audit).
//
//   2. Attestation. INFLUENCES and RESPONDS_TO require evidence of
//      artist intent — a statement, interview, catalogue text — not a
//      heuristic. SKILL.md §1.4 + seed/README.md both say so. The
//      guard requires a source_url for those edge types.
//
//   3. Era. Pre-2009 artworks can't EMBODIES / USES_TECHNIQUE a
//      crypto-native concept (smart contract, on-chain generative art,
//      NFT, etc.) because the substrate didn't exist. The audit didn't
//      surface any current violations, but the guard prevents future
//      ad-hoc gatherers from minting anachronisms.
//
// Used by:
//   - src/seed-consolidated.ts (filters seed/edges.json on load)
//   - src/routes/contributor-api.ts (rejects POST /api/v1/edges)
//
// Keep CURATED_EDGE_TYPES, EDGE_DIRECTION, and CRYPTO_CONCEPTS in sync
// with CLAUDE.md's "Edge types" section and the seed canon.

export const CURATED_EDGE_TYPES = new Set<string>([
  "EMBODIES",
  "CREATED_BY",
  "PRACTICES",
  "EXHIBITED_AT",
  "CLASSIFIED_BY",
  "BELONGS_TO",
  "COLLABORATES_WITH",
  "USES_TECHNIQUE",
  "INFLUENCES",
  "RESPONDS_TO",
]);

// Empty array means "any node type accepted on this side".
type DirectionRule = { source: readonly string[]; target: readonly string[] };

export const EDGE_DIRECTION: Record<string, DirectionRule> = {
  EMBODIES:          { source: ["artwork"],                       target: ["concept"] },
  CREATED_BY:        { source: ["artwork"],                       target: ["practitioner", "collective"] },
  PRACTICES:         { source: ["practitioner", "collective"],    target: ["concept"] },
  EXHIBITED_AT:      { source: ["artwork", "practitioner"],       target: ["institution", "platform", "scene"] },
  CLASSIFIED_BY:     { source: [],                                target: ["classification_regime"] },
  BELONGS_TO:        { source: ["practitioner"],                  target: ["collective", "scene"] },
  COLLABORATES_WITH: { source: ["practitioner", "collective"],    target: ["practitioner", "collective"] },
  USES_TECHNIQUE:    { source: ["practitioner", "collective"],    target: ["concept"] },
  INFLUENCES:        { source: ["practitioner"],                  target: ["practitioner"] },
  RESPONDS_TO:       { source: ["artwork"],                       target: ["artwork"] },
};

// Concepts whose referent didn't exist before Bitcoin (2009-01) /
// Ethereum (2015-07). An artwork dated earlier can't be about, embody,
// or use these — it's anachronism.
export const CRYPTO_CONCEPTS = new Set<string>([
  "concept:on-chain generative art",
  "concept:nft",
  "concept:dao",
  "concept:blockchain",
  "concept:smart contract",
  "concept:tezos",
  "concept:ethereum",
  "concept:web3",
]);

export const CRYPTO_ERA_START_YEAR = 2009;

export type EdgeViolation =
  | { kind: "direction"; message: string }
  | { kind: "influences_needs_url"; message: string }
  | { kind: "era_pre_crypto"; message: string };

export function violatesDirection(
  srcType: string,
  dstType: string,
  edgeType: string,
): EdgeViolation | null {
  const rule = EDGE_DIRECTION[edgeType];
  if (!rule) return null; // uncurated edge type — caller decides
  if (rule.source.length && !rule.source.includes(srcType)) {
    return {
      kind: "direction",
      message: `${edgeType} requires source type in [${rule.source.join(", ")}], got ${srcType}`,
    };
  }
  if (rule.target.length && !rule.target.includes(dstType)) {
    return {
      kind: "direction",
      message: `${edgeType} requires target type in [${rule.target.join(", ")}], got ${dstType}`,
    };
  }
  return null;
}

export function violatesInfluencesUrl(
  edgeType: string,
  sourceUrl: string | null | undefined,
): EdgeViolation | null {
  if (edgeType !== "INFLUENCES" && edgeType !== "RESPONDS_TO") return null;
  const trimmed = typeof sourceUrl === "string" ? sourceUrl.trim() : "";
  if (trimmed) return null;
  return {
    kind: "influences_needs_url",
    message: `${edgeType} requires source_url anchoring artist intent (statement, interview, catalogue). Heuristic ${edgeType} is forbidden by SKILL.md §1.4.`,
  };
}

// Parse a metadata blob (string or object) and return the earliest plausible year. Null if absent.
function parseEarliestYear(meta: unknown): number | null {
  if (meta == null) return null;
  let obj: any = meta;
  if (typeof meta === "string") {
    try { obj = JSON.parse(meta); } catch { return null; }
  }
  if (!obj || typeof obj !== "object") return null;
  const ys = obj.year_start;
  if (typeof ys === "number" && Number.isFinite(ys)) return ys;
  const raw = typeof obj.year_raw === "string" ? obj.year_raw : (typeof obj.year === "string" ? obj.year : null);
  if (raw) {
    const m = /\b(\d{4})\b/.exec(raw);
    if (m) {
      const n = parseInt(m[1]!, 10);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

export function violatesEra(
  src: { type: string; metadata: unknown },
  targetId: string,
): EdgeViolation | null {
  if (!CRYPTO_CONCEPTS.has(targetId)) return null;
  if (src.type !== "artwork") return null;
  const year = parseEarliestYear(src.metadata);
  if (year == null) return null;
  if (year >= CRYPTO_ERA_START_YEAR) return null;
  return {
    kind: "era_pre_crypto",
    message: `Pre-${CRYPTO_ERA_START_YEAR} artwork (year=${year}) can't connect to crypto-era concept ${targetId} — the substrate didn't exist.`,
  };
}

export interface ValidateEdgeOptions {
  /**
   * URL-attestation check for INFLUENCES / RESPONDS_TO. Enable for *new*
   * writes (POST /api/v1/edges). Disable for seed-loader validation: the
   * seed JSON doesn't carry per-edge source_url, attestation lives in the
   * linked signal record or source-node metadata, so flagging URL-less
   * canon entries would be noisy and not actionable from the loader.
   * Default true.
   */
  checkUrlAttestation?: boolean;
}

// Run all guards. Returns the first violation, or null when clean.
export function validateEdge(
  src: { id: string; type: string; metadata: unknown },
  dst: { id: string; type: string },
  edgeType: string,
  sourceUrl: string | null | undefined,
  opts: ValidateEdgeOptions = {},
): EdgeViolation | null {
  const checkUrl = opts.checkUrlAttestation ?? true;
  return (
    violatesDirection(src.type, dst.type, edgeType)
    ?? (checkUrl ? violatesInfluencesUrl(edgeType, sourceUrl) : null)
    ?? violatesEra(src, dst.id)
  );
}
