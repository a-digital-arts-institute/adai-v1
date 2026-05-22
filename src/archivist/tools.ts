// Tool definitions for the archivist agent.
//
// Two kinds of tools live here:
//   - Server tools: small wrappers around the existing read-only graph
//     queries. The agent loop executes them in-process and returns the
//     JSON result back into Claude's tool-use loop.
//   - Client tools: NO server-side work; the agent loop returns a stub
//     `{ ok: true, dispatched: true }` to satisfy the tool-use contract
//     and the SSE layer forwards the call to the browser, which acts on
//     it via window.ADAI_GRAPH_FIELD / window.ADAI_ARCHIVIST.
//
// Adding a tool: pick a name, write the JSON schema in TOOL_DEFINITIONS,
// and either add a server handler to SERVER_HANDLERS or list the name in
// CLIENT_TOOL_NAMES. The agent loop will pick it up automatically.

import type { DatabaseSync } from "node:sqlite";
import { topKByNodeId, topKByVector, withMetadata, type Neighbour } from "../embed/neighbours.js";
import { loadAll } from "../embed/vectors.js";
import { YEAR_SQL_FRAGMENT, formatArtworkYear } from "../utils/year.js";

// ---- types ------------------------------------------------------------

export interface ToolDef {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export type ServerHandler = (db: DatabaseSync, input: Record<string, unknown>) => unknown;

// ---- helpers ----------------------------------------------------------

function clampInt(v: unknown, def: number, min: number, max: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function asString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function safeJson(s: string | null | undefined): any {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

function projectNode(n: any): Record<string, unknown> {
  const md = safeJson(n.metadata) ?? {};
  const year = n.type === "artwork" ? formatArtworkYear(n) : null;
  const out: Record<string, unknown> = {
    id: n.id,
    name: n.name,
    type: n.type,
    slug: n.slug,
  };
  if (year) out.year = year;
  if (md.status) out.status = md.status;
  if (md.summary) out.summary = md.summary;
  if (md.description && !md.summary) out.description = String(md.description).slice(0, 600);
  if (md.country) out.country = md.country;
  if (md.cdn_image_url) out.cdn_image_url = md.cdn_image_url;
  else if (md.image_url) out.image_url = md.image_url;
  return out;
}

// ---- server handlers --------------------------------------------------

function search_nodes(db: DatabaseSync, input: Record<string, unknown>): unknown {
  const query = asString(input.query);
  const typeFilter = asString(input.type);
  const limit = clampInt(input.limit, 8, 1, 25);
  if (!query) return { error: "query is required" };

  const NODE_COLS =
    "id, name, type, slug, metadata, " + YEAR_SQL_FRAGMENT;
  const like = `%${query}%`;
  let rows: any[];
  if (typeFilter) {
    rows = db
      .prepare(
        `SELECT ${NODE_COLS} FROM nodes
          WHERE type = ? AND (name LIKE ? COLLATE NOCASE OR slug LIKE ? COLLATE NOCASE)
          ORDER BY
            CASE WHEN name = ? COLLATE NOCASE THEN 0
                 WHEN name LIKE ? COLLATE NOCASE THEN 1
                 ELSE 2 END,
            length(name) ASC
          LIMIT ?`
      )
      .all(typeFilter, like, like, query, `${query}%`, limit);
  } else {
    rows = db
      .prepare(
        `SELECT ${NODE_COLS} FROM nodes
          WHERE name LIKE ? COLLATE NOCASE OR slug LIKE ? COLLATE NOCASE
          ORDER BY
            CASE WHEN name = ? COLLATE NOCASE THEN 0
                 WHEN name LIKE ? COLLATE NOCASE THEN 1
                 ELSE 2 END,
            length(name) ASC
          LIMIT ?`
      )
      .all(like, like, query, `${query}%`, limit);
  }
  return { results: rows.map(projectNode), count: rows.length };
}

function get_node(db: DatabaseSync, input: Record<string, unknown>): unknown {
  const slug = asString(input.slug);
  const id = asString(input.id);
  if (!slug && !id) return { error: "slug or id is required" };

  const NODE_COLS = "id, name, type, slug, metadata";
  const node = id
    ? (db.prepare(`SELECT ${NODE_COLS} FROM nodes WHERE id = ?`).get(id) as any)
    : (db.prepare(`SELECT ${NODE_COLS} FROM nodes WHERE slug = ?`).get(slug) as any);
  if (!node) return { error: "not_found" };

  const md = safeJson(node.metadata) ?? {};
  const edgeRows = db
    .prepare(
      `SELECT source_id, target_id, edge_type, confidence
         FROM edges
        WHERE valid_until IS NULL AND (source_id = ? OR target_id = ?)
        LIMIT 80`
    )
    .all(node.id, node.id) as any[];

  // Look up the names of the connected nodes in a single round-trip so the
  // agent gets human-readable peers instead of bare colon-ids.
  const peerIds = new Set<string>();
  for (const e of edgeRows) {
    if (e.source_id !== node.id) peerIds.add(e.source_id);
    if (e.target_id !== node.id) peerIds.add(e.target_id);
  }
  let peers: Map<string, { name: string; slug: string; type: string }> = new Map();
  if (peerIds.size > 0) {
    const arr = [...peerIds];
    const placeholders = arr.map(() => "?").join(",");
    const rows = db
      .prepare(`SELECT id, name, slug, type FROM nodes WHERE id IN (${placeholders})`)
      .all(...arr) as any[];
    peers = new Map(rows.map((r) => [r.id, { name: r.name, slug: r.slug, type: r.type }]));
  }

  const edges = edgeRows.map((e) => {
    const otherId = e.source_id === node.id ? e.target_id : e.source_id;
    const direction = e.source_id === node.id ? "out" : "in";
    const peer = peers.get(otherId);
    return {
      edge_type: e.edge_type,
      direction,
      other: peer ? { id: otherId, name: peer.name, slug: peer.slug, type: peer.type } : { id: otherId },
      confidence: e.confidence,
    };
  });

  const signals = db
    .prepare(
      `SELECT s.id, s.title, s.summary, s.source_url, s.source_origin, s.created_at
         FROM signals s
         JOIN intake_queue q ON q.signal_id = s.id
        WHERE q.target_node = ? AND q.status = 'approved'
        ORDER BY s.created_at DESC
        LIMIT 5`
    )
    .all(node.id) as any[];

  return {
    node: {
      ...projectNode(node),
      metadata: md,
    },
    edges,
    edge_count: edges.length,
    signals,
  };
}

function get_neighbours(db: DatabaseSync, input: Record<string, unknown>): unknown {
  const slug = asString(input.slug);
  const id = asString(input.id);
  const kind = asString(input.kind) || "auto";
  const k = clampInt(input.k, 8, 1, 20);
  if (!slug && !id) return { error: "slug or id is required" };

  const lookupNode = id
    ? (db.prepare("SELECT id, name, type, slug FROM nodes WHERE id = ?").get(id) as any)
    : (db.prepare("SELECT id, name, type, slug FROM nodes WHERE slug = ?").get(slug) as any);
  if (!lookupNode) return { error: "not_found" };

  // Translate the high-level "kind" into the right query/candidate kinds for
  // topKByNodeId. Defaults: practitioners → style_kin; artworks → visually_affine;
  // concepts → semantic identity neighbours.
  let queryKind: "identity" | "style_centroid" = "identity";
  let candidateKind: "identity" | "style_centroid" = "identity";
  let typePrefixes: string[] | undefined;

  if (kind === "style_kin" || (kind === "auto" && (lookupNode.type === "practitioner" || lookupNode.type === "collective"))) {
    queryKind = "style_centroid";
    candidateKind = "style_centroid";
    typePrefixes = ["practitioner:", "collective:"];
  } else if (kind === "visually_affine" || (kind === "auto" && lookupNode.type === "artwork")) {
    queryKind = "identity";
    candidateKind = "identity";
    typePrefixes = ["artwork:"];
  }
  // "semantic" or default-auto for other types just runs identity-vs-identity
  // with no prefix filter.

  let nbs: Neighbour[] = topKByNodeId(db, lookupNode.id, {
    queryKind,
    candidateKind,
    typePrefixes,
    k,
  });

  // If the node has no embedding (likely for never-embedded contributor adds),
  // fall back gracefully — better to say "no embedding" than 500.
  if (nbs.length === 0) {
    return {
      node: { id: lookupNode.id, name: lookupNode.name, type: lookupNode.type, slug: lookupNode.slug },
      kind_used: kind,
      neighbours: [],
      note: "no embedding-derived neighbours for this node (yet)",
    };
  }

  nbs = withMetadata(db, nbs);
  return {
    node: { id: lookupNode.id, name: lookupNode.name, type: lookupNode.type, slug: lookupNode.slug },
    kind_used: kind === "auto" ? (queryKind === "style_centroid" ? "style_kin" : "visually_affine_or_semantic") : kind,
    neighbours: nbs.map((n) => ({
      id: n.node_id,
      similarity: Math.round(n.similarity * 1000) / 1000,
      name: n.name,
      type: n.type,
      slug: n.slug,
      ...(n.year ? { year: n.year } : {}),
    })),
  };
}

function get_component(db: DatabaseSync, input: Record<string, unknown>): unknown {
  const slug = asString(input.slug);
  if (!slug) return { error: "slug is required" };
  const maxNodes = clampInt(input.max_nodes, 80, 5, 200);

  const start = db.prepare("SELECT id, name, type, slug FROM nodes WHERE slug = ?").get(slug) as any;
  if (!start) return { error: "not_found" };

  const edgeRows = db
    .prepare("SELECT source_id, target_id, edge_type FROM edges WHERE valid_until IS NULL")
    .all() as any[];

  const adj = new Map<string, Array<{ other: string; edge_type: string }>>();
  for (const e of edgeRows) {
    if (!adj.has(e.source_id)) adj.set(e.source_id, []);
    if (!adj.has(e.target_id)) adj.set(e.target_id, []);
    adj.get(e.source_id)!.push({ other: e.target_id, edge_type: e.edge_type });
    adj.get(e.target_id)!.push({ other: e.source_id, edge_type: e.edge_type });
  }

  const visited = new Set<string>([start.id]);
  const queue: string[] = [start.id];
  let truncated = false;
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const { other } of adj.get(cur) || []) {
      if (visited.has(other)) continue;
      if (visited.size >= maxNodes) { truncated = true; continue; }
      visited.add(other);
      queue.push(other);
    }
  }

  const ids = [...visited];
  const placeholders = ids.map(() => "?").join(",");
  const nodes = db
    .prepare(`SELECT id, name, type, slug FROM nodes WHERE id IN (${placeholders})`)
    .all(...ids) as any[];
  return {
    start: { id: start.id, name: start.name, slug: start.slug, type: start.type },
    node_count: nodes.length,
    truncated,
    nodes: nodes.map((n) => ({ id: n.id, name: n.name, type: n.type, slug: n.slug })),
  };
}

function get_stats(db: DatabaseSync, _input: Record<string, unknown>): unknown {
  const { count: totalNodes } = db.prepare("SELECT COUNT(*) as count FROM nodes").get() as any;
  const { count: totalEdges } = db
    .prepare("SELECT COUNT(*) as count FROM edges WHERE valid_until IS NULL")
    .get() as any;
  const { count: totalSignals } = db.prepare("SELECT COUNT(*) as count FROM signals").get() as any;

  const typeRows = db
    .prepare("SELECT type, COUNT(*) as count FROM nodes GROUP BY type ORDER BY count DESC")
    .all() as any[];
  const edgeRows = db
    .prepare("SELECT edge_type, COUNT(*) as count FROM edges WHERE valid_until IS NULL GROUP BY edge_type ORDER BY count DESC")
    .all() as any[];

  return {
    total_nodes: totalNodes,
    total_edges: totalEdges,
    total_signals: totalSignals,
    nodes_by_type: Object.fromEntries(typeRows.map((r) => [r.type, r.count])),
    edges_by_type: Object.fromEntries(edgeRows.map((r) => [r.edge_type, r.count])),
  };
}

function list_recent_additions(db: DatabaseSync, input: Record<string, unknown>): unknown {
  const limit = clampInt(input.limit, 10, 1, 25);
  const typeFilter = asString(input.type);
  // nodes.created_at is filled by the schema default, so we can sort by it.
  // Fall back to rowid for older rows where created_at might be NULL.
  const NODE_COLS = "id, name, type, slug, metadata, created_at, " + YEAR_SQL_FRAGMENT;
  let rows: any[];
  if (typeFilter) {
    rows = db
      .prepare(
        `SELECT ${NODE_COLS} FROM nodes WHERE type = ? ORDER BY COALESCE(created_at, '') DESC, rowid DESC LIMIT ?`
      )
      .all(typeFilter, limit);
  } else {
    rows = db
      .prepare(
        `SELECT ${NODE_COLS} FROM nodes WHERE type != 'related' ORDER BY COALESCE(created_at, '') DESC, rowid DESC LIMIT ?`
      )
      .all(limit);
  }
  return { items: rows.map((n) => ({ ...projectNode(n), created_at: n.created_at })) };
}

// ---- client tools (no-op handlers) ------------------------------------
// These return a stub so the agent loop has something to feed back into
// Claude. The SSE layer pulls the tool_use call out and forwards it to
// the browser separately.

const CLIENT_TOOL_NAMES = new Set<string>([
  "focus_node",
  "highlight_nodes",
  "set_field_mode",
  "clear_focus",
]);

export function isClientTool(name: string): boolean {
  return CLIENT_TOOL_NAMES.has(name);
}

const clientStub: ServerHandler = (_db, _input) => ({ ok: true, dispatched: true });

// ---- registry ---------------------------------------------------------

export const SERVER_HANDLERS: Record<string, ServerHandler> = {
  search_nodes,
  get_node,
  get_neighbours,
  get_component,
  get_stats,
  list_recent_additions,
  focus_node: clientStub,
  highlight_nodes: clientStub,
  set_field_mode: clientStub,
  clear_focus: clientStub,
};

export const TOOL_DEFINITIONS: ToolDef[] = [
  {
    name: "search_nodes",
    description:
      "Search the graph for nodes whose name or slug matches a substring. Use this as the first step whenever the user names a practitioner, artwork, scene, or concept and you're not sure of the exact slug. Returns up to `limit` matches with type and slug — pick the right one before calling get_node.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Substring to match against node name / slug (case-insensitive)." },
        type: {
          type: "string",
          description: "Optional node type filter, one of: practitioner, artwork, concept, scene, collective, institution, platform, publication, project, classification_regime.",
        },
        limit: { type: "integer", description: "Max results (1-25). Default 8.", minimum: 1, maximum: 25 },
      },
      required: ["query"],
    },
  },
  {
    name: "get_node",
    description:
      "Fetch a single node's full metadata, its current edges (bi-temporal filter applied — valid_until IS NULL), the names of its peers, and its approved signals. Use slug OR id; slug is preferred. This is the workhorse for any 'tell me about X' question.",
    input_schema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Node slug, e.g. 'casey-reas' or 'fidenza'." },
        id: { type: "string", description: "Full colon-id, e.g. 'practitioner:casey reas'. Use slug when possible." },
      },
    },
  },
  {
    name: "get_neighbours",
    description:
      "Embedding-derived nearest neighbours of a node by cosine similarity. For a practitioner this returns style-kin (other practitioners with similar aesthetics); for an artwork, visually-affine other artworks; for a concept, semantically close nodes. Use kind='auto' (default) unless the user explicitly asks for style_kin / visually_affine / semantic.",
    input_schema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Node slug. Either slug or id is required." },
        id: { type: "string", description: "Node colon-id." },
        kind: {
          type: "string",
          enum: ["auto", "style_kin", "visually_affine", "semantic"],
          description: "Default 'auto' picks the right kind from the node's type.",
        },
        k: { type: "integer", description: "Number of neighbours to return (1-20). Default 8.", minimum: 1, maximum: 20 },
      },
    },
  },
  {
    name: "get_component",
    description:
      "BFS over live edges from a node — returns every node reachable through the curated graph, capped at `max_nodes`. Useful when the user asks 'what is X connected to?' or 'who's in X's scene?'. Cheaper than fetching the full graph; respects the bi-temporal valid_until filter.",
    input_schema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Starting node slug." },
        max_nodes: { type: "integer", description: "Cap (5-200). Default 80.", minimum: 5, maximum: 200 },
      },
      required: ["slug"],
    },
  },
  {
    name: "get_stats",
    description:
      "Overview of the canon — total nodes/edges/signals plus per-type and per-edge-type counts. Use this when the user asks 'what's in the graph?', 'how big is it?', or anything about the shape of the canon.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_recent_additions",
    description:
      "Most-recently-created nodes (descending). Optionally filter by type. Useful when the user asks 'what's new?' or 'what's been added lately?'.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", description: "Max items (1-25). Default 10.", minimum: 1, maximum: 25 },
        type: { type: "string", description: "Optional type filter." },
      },
    },
  },
  // ---- Client tools — the browser acts on these. ----
  {
    name: "focus_node",
    description:
      "Zoom the /field view to a specific node so the user can see what you're talking about. Call this whenever you reference a node by slug and it would help to point at it on the visualization. Prefer focusing one node per turn — don't churn the view.",
    input_schema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Slug of the node to zoom to." },
      },
      required: ["slug"],
    },
  },
  {
    name: "highlight_nodes",
    description:
      "Highlight a small set of nodes in the field view (e.g. the top neighbours you just retrieved). Pass up to 12 slugs. Highlights auto-clear when the user changes focus or after ~30 seconds.",
    input_schema: {
      type: "object",
      properties: {
        slugs: { type: "array", items: { type: "string" }, description: "Slugs to highlight." },
      },
      required: ["slugs"],
    },
  },
  {
    name: "set_field_mode",
    description:
      "Toggle the /field view between 'curatorial' (the default — curated edges foregrounded) and 'embeddings' (style-kin / visually-affine edges foregrounded, curated edges dimmed). Use sparingly; only when the user asks to see one or the other.",
    input_schema: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["curatorial", "embeddings"] },
      },
      required: ["mode"],
    },
  },
  {
    name: "clear_focus",
    description: "Zoom back out from a focused node to the full field view.",
    input_schema: { type: "object", properties: {} },
  },
];

// Mark the tail of the tool definitions for prompt-caching purposes —
// callers can pass cache_control: { type: 'ephemeral' } on the *last*
// tool's input_schema to cache the entire tool block for 5 min.
export const TOOL_DEFINITIONS_LAST_NAME = TOOL_DEFINITIONS[TOOL_DEFINITIONS.length - 1]!.name;

void loadAll; // (kept import for future neighbour helpers; tsc would whine if unused)
void topKByVector;
