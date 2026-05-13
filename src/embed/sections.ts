// Shared "embedding-derived sections" builder.
//
// The same logic that drives the HTML "Style kin / Visually affine / Style
// proximity / Closest artworks / AI-suggested attributions" sections on the
// profile pages (`src/routes/pages.ts`) is also what the /field entity-view
// (1k overlay) and the /field 10k zoom layer fetch over the wire. Keeping
// the section computation in one place means the JSON endpoint and the HTML
// page can never drift.

import type { DatabaseSync } from "node:sqlite";
import { topKByNodeId, withMetadata, type Neighbour } from "./neighbours.js";

export interface EmbeddingSection {
  /** Stable machine key — used by the client to colour/route a section. */
  key:
    | "style_kin"
    | "visually_affine"
    | "style_proximity"
    | "closest_artworks"
    | "ai_attributions";
  /** Human-readable section heading. */
  title: string;
  /** Short prose blurb shown below the heading. */
  blurb: string;
  /** Decorated neighbours (with name/type/slug/image where available). */
  neighbours: Neighbour[];
}

export interface SectionsNode {
  id: string;
  type: string;
  name: string;
  slug?: string;
}

/**
 * Compute every embedding-derived section that applies to `node`. Nodes
 * without a relevant vector (institution, publication, classification_regime,
 * etc.) get an empty array — the caller can then render nothing rather than
 * an empty heading.
 *
 * Mirrors the same thresholds and K values used by the original
 * `renderEmbeddingSections` in `src/routes/pages.ts`.
 */
export function buildEmbeddingSections(
  db: DatabaseSync,
  node: SectionsNode
): EmbeddingSection[] {
  const sections: EmbeddingSection[] = [];

  if (node.type === "practitioner" || node.type === "collective") {
    // Style kin: practitioners / collectives closest to this one in
    // style-centroid space. Empty when this practitioner has no centroid
    // (no live CREATED_BY edges).
    const styleKin = withMetadata(
      db,
      topKByNodeId(db, node.id, {
        queryKind: "style_centroid",
        candidateKind: "style_centroid",
        typePrefixes: ["practitioner:", "collective:"],
        k: 8,
      })
    );
    if (styleKin.length) {
      sections.push({
        key: "style_kin",
        title: "Style kin",
        blurb:
          "Practitioners closest in style-centroid space (cosine over the mean of their attributed artworks).",
        neighbours: styleKin,
      });
    }

    // AI-suggested attributions: any pending intake_queue ai_suggestion rows
    // that name this practitioner as the candidate creator.
    const proposals = db
      .prepare(
        `SELECT id, target_node, proposed_edges
           FROM intake_queue
          WHERE kind = 'ai_suggestion' AND status = 'pending'`
      )
      .all() as Array<{ id: string; target_node: string; proposed_edges: string }>;
    const matchingProposals: Array<{ artwork_id: string; sim: number }> = [];
    for (const p of proposals) {
      let arr: any[] = [];
      try {
        arr = JSON.parse(p.proposed_edges || "[]");
      } catch {
        /* ignore */
      }
      for (const spec of arr) {
        if (spec.target_id === node.id && spec.edge_type === "CREATED_BY") {
          matchingProposals.push({
            artwork_id: spec.source_id,
            sim: spec.similarity ?? 0,
          });
        }
      }
    }
    if (matchingProposals.length) {
      matchingProposals.sort((a, b) => b.sim - a.sim);
      const decorated = withMetadata(
        db,
        matchingProposals.map((m) => ({
          node_id: m.artwork_id,
          similarity: m.sim,
        }))
      );
      sections.push({
        key: "ai_attributions",
        title: "AI-suggested attributions",
        blurb: `Unattributed artworks the embedding pipeline thinks may be by ${node.name}. Review at /review?kind=ai_suggestion.`,
        neighbours: decorated,
      });
    }
  }

  if (node.type === "artwork") {
    const affine = withMetadata(
      db,
      topKByNodeId(db, node.id, {
        queryKind: "identity",
        candidateKind: "identity",
        typePrefixes: ["artwork:"],
        k: 8,
      })
    );
    if (affine.length) {
      sections.push({
        key: "visually_affine",
        title: "Visually affine",
        blurb:
          "Artworks closest in the embedding space (image + text fused via Gemini Embedding 2).",
        neighbours: affine,
      });
    }

    const candidates = withMetadata(
      db,
      topKByNodeId(db, node.id, {
        queryKind: "identity",
        candidateKind: "style_centroid",
        typePrefixes: ["practitioner:", "collective:"],
        k: 5,
        minSimilarity: 0.75,
      })
    );
    if (candidates.length) {
      sections.push({
        key: "style_proximity",
        title: "Style proximity",
        blurb:
          "Practitioners whose style-centroid sits closest to this artwork.",
        neighbours: candidates,
      });
    }
  }

  if (node.type === "concept" || node.type === "scene") {
    const closest = withMetadata(
      db,
      topKByNodeId(db, node.id, {
        queryKind: "identity",
        candidateKind: "identity",
        typePrefixes: ["artwork:"],
        k: 8,
      })
    );
    if (closest.length) {
      sections.push({
        key: "closest_artworks",
        title: "Closest artworks in embedding space",
        blurb: `Artworks whose fused text+image vector sits closest to this ${node.type}'s text embedding.`,
        neighbours: closest,
      });
    }
  }

  return sections;
}
