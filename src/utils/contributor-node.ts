// A contributor that is also a node (issue #70): an institution or a
// collection posting its own works through a token. The token's node_id
// (contributor_tokens, set at mint or by PATCH /api/v1/tokens/:prefix)
// joins the two, so "contributed by Outlier Collection" links to
// /institution/the-outlier-collection, and that page says it contributes.
//
// A revoked token still says who its contributor stood for: rotating a
// credential does not change whose contributions they were.

import type { DatabaseSync } from "node:sqlite";

export interface StandsFor {
  id: string;
  type: string;
  slug: string;
  name: string;
}

/**
 * The node a contributor stands for, from `signals.submitted_by` (a
 * contributor's name, or its id). The most recently minted token that names
 * a live node wins.
 */
export function contributorNode(db: DatabaseSync, submittedBy: string | null | undefined): StandsFor | null {
  if (!submittedBy) return null;
  const row = db.prepare(
    `SELECT n.id, n.type, n.slug, n.name
       FROM contributors c
       JOIN contributor_tokens t ON t.contributor_id = c.id AND t.node_id IS NOT NULL
       JOIN nodes n ON n.id = t.node_id AND json_extract(n.metadata, '$.retired') IS NOT 1
      WHERE c.id = ? OR c.name = ?
      ORDER BY t.created_at DESC
      LIMIT 1`
  ).get(submittedBy, submittedBy) as StandsFor | undefined;
  return row ?? null;
}

/** Does the contributor behind `submittedBy` stand for `nodeId` now? */
export function standsFor(db: DatabaseSync, submittedBy: string | null | undefined, nodeId: string): boolean {
  return contributorNode(db, submittedBy)?.id === nodeId;
}

export interface PostedAsRow {
  id: string;
  title: string | null;
  content: string | null;
  source_url: string | null;
  source_type: string | null;
  submitted_by: string | null;
  created_at: string | null;
  consent_attribution: string | null;
  batch_id: string | null;
  proposed_nodes: string | null;
  proposed_edges: string | null;
}

/**
 * What the contributors standing for `nodeId` put in the commons, newest
 * first: live, attributed, not structural-only, not waiting in (or turned
 * down by) review. One list for /<type>/<slug>/contributions and the
 * claimant's "Posted as you" on /me.
 */
export function postedAs(db: DatabaseSync, nodeId: string, limit = 500): PostedAsRow[] {
  const as = contributorsAs(db, nodeId);
  if (!as.length) return [];
  const keys = as.flatMap((c) => [c.id, c.name]);
  return db.prepare(
    `SELECT s.id, s.title, s.content, s.source_url, s.source_type, s.submitted_by, s.created_at, s.consent_attribution, s.batch_id, iq.proposed_nodes, iq.proposed_edges
       FROM signals s LEFT JOIN intake_queue iq ON iq.signal_id = s.id
      WHERE s.submitted_by IN (${keys.map(() => "?").join(", ")}) AND s.status = 'active'
        AND (iq.id IS NULL OR iq.status = 'approved')
        AND (s.consent_attribution IS NULL OR s.consent_attribution != 'anonymous')
        AND (s.consent_scope IS NULL OR s.consent_scope != 'structural_only')
      ORDER BY s.created_at DESC, s.rowid DESC
      LIMIT ?`
  ).all(...keys, limit) as unknown as PostedAsRow[];
}

/** The contributors that stand for a node, with how many active signals each has. */
export function contributorsAs(db: DatabaseSync, nodeId: string): Array<{ id: string; name: string; signals: number }> {
  const rows = db.prepare(
    `SELECT DISTINCT c.id, c.name
       FROM contributor_tokens t JOIN contributors c ON c.id = t.contributor_id
      WHERE t.node_id = ?
      ORDER BY c.name`
  ).all(nodeId) as Array<{ id: string; name: string }>;
  // Keep only those for whom this node is the one they stand for now.
  // Counted as /<type>/<slug>/contributions lists them: live, attributed,
  // not structural-only, and not waiting in (or turned down by) review.
  const count = db.prepare(
    `SELECT COUNT(*) AS n FROM signals s LEFT JOIN intake_queue iq ON iq.signal_id = s.id
      WHERE (s.submitted_by = ? OR s.submitted_by = ?) AND s.status = 'active'
        AND (iq.id IS NULL OR iq.status = 'approved')
        AND (s.consent_attribution IS NULL OR s.consent_attribution != 'anonymous')
        AND (s.consent_scope IS NULL OR s.consent_scope != 'structural_only')`
  );
  return rows
    .filter((c) => contributorNode(db, c.id)?.id === nodeId)
    .map((c) => ({ id: c.id, name: c.name, signals: Number((count.get(c.name, c.id) as any)?.n ?? 0) }));
}
