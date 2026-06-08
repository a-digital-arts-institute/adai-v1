// Single source of truth for the "retired node" visibility rule.
//
// Retirement is the admin-side correction primitive for NODES — the sibling
// of edge supersession (valid_until/invalidated_by) and signal revocation
// (status='revoked'). POST /api/v1/nodes/:id/retire (admin scope) sets
// metadata.retired = true (plus retired_at / retired_by / retired_reason)
// and supersedes every live edge touching the node. Nothing is deleted: the
// row stays in the CRR with full provenance, but every LISTING surface
// filters it out, so a retired node behaves like the historical husks the
// canon overlay leaves behind — reachable by direct URL (profile page,
// /:type/:slug/data) for audit, invisible everywhere else.
//
// json_extract on NULL metadata returns NULL, and `NULL IS NOT 1` is true,
// so nodes without metadata pass the filter without a COALESCE dance.
//
// ⚠️ STAMP COUPLING: /api/stats total_nodes, /api/graph/stream's node and
// edge queries, and /api/stats curated_edges together form the /field
// IndexedDB cache stamp (`${total_nodes}:${curated_edges}` must equal the
// stream's `${nodes}:${edges}`). If you change one of those WHERE clauses,
// change them all — see the stamp comments in src/routes/api.ts.

export const NODE_NOT_RETIRED = "json_extract(metadata,'$.retired') IS NOT 1";

/** Table-alias-qualified variant for joins: notRetired("n") → json_extract(n.metadata, ...) */
export function notRetired(alias: string): string {
  return `json_extract(${alias}.metadata,'$.retired') IS NOT 1`;
}
