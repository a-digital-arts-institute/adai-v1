// Cosine-neighbour lookups over the live embedding space.
//
// Used by:
//   - profile pages (`practitioner:X` → style-kin top-N; `artwork:Y` →
//     visually-affine top-N)
//   - /neighbours/:slug similarity browser
//   - any future embedding-aware UI
//
// Vectors are loaded once per request from `node_embeddings` (cached at the
// server level would be cheap to add later, but ~5 MB and ~5ms cold-read
// don't warrant it yet).

import type { DatabaseSync } from "node:sqlite";
import { cosine, loadAll, type VectorRow, type EmbKind } from "./vectors.js";
import { YEAR_SQL_FRAGMENT, formatArtworkYear } from "../utils/year.js";

export interface Neighbour {
  node_id: string;
  similarity: number;
  // Optional payload — populated by withMetadata() below.
  name?: string;
  type?: string;
  slug?: string;
  cdn_image_url?: string;
  image_url?: string;
  /** Display-ready year for artworks (e.g. "2024", "2019–2024"). Omitted for other node types or when unknown. */
  year?: string;
}

export interface TopKOptions {
  /** How many neighbours to return. Default 10. */
  k?: number;
  /**
   * Restrict candidates by node-id prefix (e.g. ["practitioner:", "collective:"]).
   * Useful to ask "show me style-kin practitioners only".
   */
  typePrefixes?: string[];
  /**
   * Vector kind to query against. Default "identity"; pass "style_centroid"
   * to compare against practitioner centroids.
   */
  candidateKind?: EmbKind;
  /**
   * Node IDs to exclude (typically: the query node itself, plus any
   * already-known edges you don't want to surface as "new").
   */
  exclude?: Set<string>;
  /** Optional minimum similarity. Default 0 (return whatever top-K is). */
  minSimilarity?: number;
}

/**
 * Top-K nearest neighbours of a given query vector by cosine similarity.
 *
 * The query vector itself does NOT have to live in node_embeddings — pass
 * any Float32Array (e.g. a freshly-computed practitioner centroid, or a
 * mean of multiple node vectors for "group neighbours").
 */
export function topKByVector(
  db: DatabaseSync,
  query: Float32Array,
  opts: TopKOptions = {}
): Neighbour[] {
  const k = opts.k ?? 10;
  const candidateKind = opts.candidateKind ?? "identity";
  const exclude = opts.exclude ?? new Set<string>();
  const minSim = opts.minSimilarity ?? -1;
  const prefixes = opts.typePrefixes;

  const all = loadAll(db);
  // Use a simple top-K via insertion into a sorted array — k is small (<=50
  // for any reasonable UI) so this beats a heap, and the constant factor is
  // tiny next to the cosine inner loop.
  const top: Neighbour[] = [];
  for (const [, row] of all) {
    if (row.kind !== candidateKind) continue;
    if (exclude.has(row.node_id)) continue;
    if (prefixes && !prefixes.some((p) => row.node_id.startsWith(p))) continue;
    const s = cosine(query, row.vec);
    if (s < minSim) continue;
    if (top.length < k) {
      top.push({ node_id: row.node_id, similarity: s });
      top.sort((a, b) => b.similarity - a.similarity);
    } else if (s > top[top.length - 1]!.similarity) {
      top[top.length - 1] = { node_id: row.node_id, similarity: s };
      top.sort((a, b) => b.similarity - a.similarity);
    }
  }
  return top;
}

/**
 * Top-K neighbours of a node already stored in node_embeddings, by id.
 * Returns [] if the node has no row of the requested query kind.
 *
 * Common usage:
 *   topKByNodeId(db, "practitioner:casey reas", { queryKind: "style_centroid",
 *                                                 candidateKind: "style_centroid",
 *                                                 typePrefixes: ["practitioner:"] })
 *     → top STYLE_KIN-equivalent practitioners
 *   topKByNodeId(db, "artwork:fidenza",        { queryKind: "identity",
 *                                                 candidateKind: "identity",
 *                                                 typePrefixes: ["artwork:"] })
 *     → top visually-affine artworks
 */
export function topKByNodeId(
  db: DatabaseSync,
  nodeId: string,
  opts: TopKOptions & { queryKind?: EmbKind } = {}
): Neighbour[] {
  const queryKind = opts.queryKind ?? "identity";
  const all = loadAll(db);
  const query: VectorRow | undefined = all.get(`${queryKind}:${nodeId}`);
  if (!query) return [];
  const exclude = new Set(opts.exclude ?? []);
  exclude.add(nodeId); // never propose the node as its own neighbour
  return topKByVector(db, query.vec, { ...opts, exclude });
}

/**
 * Decorate a list of neighbours with node metadata (name, type, slug,
 * image URLs). One DB hop per call regardless of N — uses an IN-clause.
 */
export function withMetadata(db: DatabaseSync, neighbours: Neighbour[]): Neighbour[] {
  if (neighbours.length === 0) return neighbours;
  const ids = neighbours.map((n) => n.node_id);
  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT id, name, type, slug,
              json_extract(metadata,'$.cdn_image_url') AS cdn_image_url,
              json_extract(metadata,'$.image_url')     AS image_url,
              ${YEAR_SQL_FRAGMENT}
         FROM nodes WHERE id IN (${placeholders})`
    )
    .all(...ids) as Array<{
      id: string;
      name: string;
      type: string;
      slug: string;
      cdn_image_url: string | null;
      image_url: string | null;
      year_raw: string | null;
      year_start: number | null;
      year_end: number | null;
      year_ongoing: number | null;
      active_years_1: string | null;
      active_years_2: string | null;
    }>;
  const byId = new Map(rows.map((r) => [r.id, r]));
  return neighbours.map((n) => {
    const meta = byId.get(n.node_id);
    if (!meta) return n;
    const year = meta.type === "artwork" ? formatArtworkYear(meta) : null;
    return {
      ...n,
      name: meta.name,
      type: meta.type,
      slug: meta.slug,
      ...(year ? { year } : {}),
      ...(meta.cdn_image_url ? { cdn_image_url: meta.cdn_image_url } : {}),
      ...(meta.image_url ? { image_url: meta.image_url } : {}),
    };
  });
}
