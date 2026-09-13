// Read-only graph tools the intake worker may call through
// POST /internal/intake/tool (docs/URL-INTAKE-SPEC.md §6.3).
//
// This allowlist IS trust promise 1. Nothing here reaches materialise*,
// insertSignal or R2 — tests/intake-imports.test.ts asserts that at the
// import level. The four archivist tools are imported, not copied.

import crypto from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { SERVER_HANDLERS, type ServerHandler, type ToolDef } from "../archivist/tools.js";
import { NODE_NOT_RETIRED } from "../utils/visibility.js";
import { slugify } from "../utils/slug.js";
import { embedOnce, TASK_PREFIX } from "../embed/server.js";
import { l2normalise } from "../embed/vectors.js";
import { topKByVector, withMetadata } from "../embed/neighbours.js";
import { safeFetch, sniffImageMime, SsrfError } from "../utils/ssrf.js";

type AsyncHandler = (db: DatabaseSync, input: Record<string, unknown>) => Promise<unknown> | unknown;

function asString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}

function clampInt(v: unknown, def: number, min: number, max: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

// ---- resolve_entity ----------------------------------------------------------

export function normaliseWebUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    u.search = "";
    let host = u.hostname.toLowerCase().replace(/^www\./, "");
    let path = u.pathname.replace(/\/+$/, "").replace(/\/index\.html?$/i, "");
    return `${host}${path}`.toLowerCase();
  } catch {
    return null;
  }
}

interface ResolveHit {
  id: string;
  name: string;
  type: string;
  slug: string;
  resolution: "exact" | "alias" | "fuzzy";
  similarity?: number;
  summary?: string;
}

const NODE_COLS = "id, name, type, slug, metadata";

function project(row: any, resolution: ResolveHit["resolution"], similarity?: number): ResolveHit {
  let summary: string | undefined;
  try {
    const md = row.metadata ? JSON.parse(row.metadata) : {};
    const s = md.summary || md.description || md.bio;
    if (typeof s === "string") summary = s.slice(0, 200);
  } catch { /* ignore */ }
  const hit: ResolveHit = { id: row.id, name: row.name, type: row.type, slug: row.slug, resolution };
  if (similarity !== undefined) hit.similarity = Math.round(similarity * 1000) / 1000;
  if (summary) hit.summary = summary;
  return hit;
}

export async function resolve_entity(db: DatabaseSync, input: Record<string, unknown>): Promise<unknown> {
  const name = asString(input.name);
  const type = asString(input.type);
  const hints = (input.hints && typeof input.hints === "object" ? input.hints : {}) as Record<string, unknown>;
  if (!name) return { error: "name is required" };

  const hits: ResolveHit[] = [];
  const seen = new Set<string>();
  const push = (h: ResolveHit) => { if (!seen.has(h.id)) { seen.add(h.id); hits.push(h); } };

  // 1. exact name (NOCASE), optionally by type
  const exactRows = (type
    ? db.prepare(`SELECT ${NODE_COLS} FROM nodes WHERE name = ? COLLATE NOCASE AND type = ? AND ${NODE_NOT_RETIRED} LIMIT 5`).all(name, type)
    : db.prepare(`SELECT ${NODE_COLS} FROM nodes WHERE name = ? COLLATE NOCASE AND ${NODE_NOT_RETIRED} LIMIT 5`).all(name)) as any[];
  for (const r of exactRows) push(project(r, "exact"));

  // 1b. deterministic id — what a create would collide with
  const slug = slugify(name);
  const idRows = (type
    ? db.prepare(`SELECT ${NODE_COLS} FROM nodes WHERE (id = ? OR slug = ?) AND ${NODE_NOT_RETIRED} LIMIT 3`).all(`${type}:${slug}`, slug)
    : db.prepare(`SELECT ${NODE_COLS} FROM nodes WHERE slug = ? AND ${NODE_NOT_RETIRED} LIMIT 3`).all(slug)) as any[];
  for (const r of idRows) push(project(r, "exact"));

  // 2. web alias
  const url = asString(hints.url);
  if (url) {
    const norm = normaliseWebUrl(url);
    if (norm) {
      const rows = db
        .prepare(`SELECT ${NODE_COLS} FROM nodes WHERE id IN (SELECT node_id FROM node_aliases WHERE source = 'web' AND external_id = ?) AND ${NODE_NOT_RETIRED}`)
        .all(norm) as any[];
      for (const r of rows) push(project(r, "alias"));
    }
  }

  // 3. slug LIKE
  if (hits.length < 5) {
    const like = `%${slug}%`;
    const rows = (type
      ? db.prepare(`SELECT ${NODE_COLS} FROM nodes WHERE slug LIKE ? AND type = ? AND ${NODE_NOT_RETIRED} ORDER BY length(name) LIMIT 5`).all(like, type)
      : db.prepare(`SELECT ${NODE_COLS} FROM nodes WHERE slug LIKE ? AND ${NODE_NOT_RETIRED} ORDER BY length(name) LIMIT 5`).all(like)) as any[];
    for (const r of rows) push(project(r, "fuzzy"));
  }

  // 4. embedding top-5 (identity vectors), when a key is configured
  let embedding_note: string | undefined;
  if (hits.length < 5 && process.env.GEMINI_API_KEY) {
    try {
      const parts = [name];
      if (type) parts.unshift(type === "practitioner" ? "Practitioner:" : type === "artwork" ? "Artwork:" : `${type}:`);
      if (typeof hints.year === "string" || typeof hints.year === "number") parts.push(String(hints.year));
      if (typeof hints.country === "string") parts.push(hints.country);
      const vec = l2normalise(await embedOnce(TASK_PREFIX + parts.join(" "), null));
      const nbs = withMetadata(db, topKByVector(db, vec, { k: 5, typePrefixes: type ? [`${type}:`] : undefined, minSimilarity: 0.6 }));
      for (const n of nbs) {
        const row = db.prepare(`SELECT ${NODE_COLS} FROM nodes WHERE id = ? AND ${NODE_NOT_RETIRED}`).get(n.node_id) as any;
        if (row) push(project(row, "fuzzy", n.similarity));
      }
    } catch (e: any) {
      embedding_note = `embedding lookup skipped: ${e?.message ?? e}`;
    }
  }

  return {
    query: { name, type: type ?? null, would_create: `${type ?? "<type>"}:${slug}` },
    matches: hits.slice(0, 8),
    ...(embedding_note ? { note: embedding_note } : {}),
  };
}

// ---- find_path --------------------------------------------------------------------

export function find_path(db: DatabaseSync, input: Record<string, unknown>): unknown {
  const from = asString(input.from);
  const to = asString(input.to);
  const maxDepth = clampInt(input.max_depth, 4, 1, 6);
  if (!from || !to) return { error: "from and to are required (node ids)" };
  if (from === to) return { path: [from], edges: [] };

  const rows = db.prepare("SELECT source_id, target_id, edge_type FROM edges WHERE valid_until IS NULL").all() as any[];
  const adj = new Map<string, Array<{ other: string; edge_type: string; dir: "out" | "in" }>>();
  for (const e of rows) {
    if (!adj.has(e.source_id)) adj.set(e.source_id, []);
    if (!adj.has(e.target_id)) adj.set(e.target_id, []);
    adj.get(e.source_id)!.push({ other: e.target_id, edge_type: e.edge_type, dir: "out" });
    adj.get(e.target_id)!.push({ other: e.source_id, edge_type: e.edge_type, dir: "in" });
  }
  const prev = new Map<string, { from: string; edge_type: string; dir: "out" | "in" }>();
  const depth = new Map<string, number>([[from, 0]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    const d = depth.get(cur)!;
    if (cur === to) break;
    if (d >= maxDepth) continue;
    for (const n of adj.get(cur) ?? []) {
      if (depth.has(n.other)) continue;
      depth.set(n.other, d + 1);
      prev.set(n.other, { from: cur, edge_type: n.edge_type, dir: n.dir });
      queue.push(n.other);
    }
  }
  if (!depth.has(to)) return { path: null, note: `no path within ${maxDepth} hops` };
  const path: string[] = [to];
  const edges: Array<{ from: string; to: string; edge_type: string }> = [];
  let cur = to;
  while (cur !== from) {
    const p = prev.get(cur)!;
    edges.unshift(p.dir === "out" ? { from: p.from, to: cur, edge_type: p.edge_type } : { from: cur, to: p.from, edge_type: p.edge_type });
    cur = p.from;
    path.unshift(cur);
  }
  const names = new Map<string, string>();
  const ph = path.map(() => "?").join(",");
  for (const r of db.prepare(`SELECT id, name FROM nodes WHERE id IN (${ph})`).all(...path) as any[]) names.set(r.id, r.name);
  return { path: path.map((id) => ({ id, name: names.get(id) ?? null })), edges, hops: edges.length };
}

// ---- image_neighbours ---------------------------------------------------------------

export async function image_neighbours(db: DatabaseSync, input: Record<string, unknown>): Promise<unknown> {
  const url = asString(input.image_url);
  const k = clampInt(input.k, 5, 1, 10);
  if (!url) return { error: "image_url is required" };
  if (!process.env.GEMINI_API_KEY) return { error: "embedding unavailable (GEMINI_API_KEY unset)" };
  let bytes: Buffer;
  try {
    const r = await safeFetch(url, { maxBytes: 10 * 1024 * 1024, timeoutMs: 15_000, headers: { accept: "image/*" } });
    if (r.status < 200 || r.status >= 300) return { error: `image fetch returned ${r.status}` };
    bytes = r.bytes;
  } catch (e: any) {
    return { error: e instanceof SsrfError ? `image fetch refused: ${e.message}` : `image fetch failed: ${e?.message ?? e}` };
  }
  const mime = sniffImageMime(bytes);
  if (!mime) return { error: "not an image" };
  let vec: Float32Array;
  try {
    vec = l2normalise(await embedOnce(TASK_PREFIX + "Artwork", { bytes, mime }));
  } catch (e: any) {
    return { error: `embedding failed: ${e?.message ?? e}` };
  }
  const nbs = withMetadata(db, topKByVector(db, vec, { k, typePrefixes: ["artwork:"] }));
  return {
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
    neighbours: nbs.map((n) => ({ id: n.node_id, name: n.name, slug: n.slug, similarity: Math.round(n.similarity * 1000) / 1000, ...(n.year ? { year: n.year } : {}) })),
    note: "similarity ≥ 0.84 is the VISUALLY_AFFINE threshold; ≥ 0.95 usually means the same image",
  };
}

// ---- registry -------------------------------------------------------------------------

const ARCHIVIST_READ_TOOLS = ["search_nodes", "get_node", "get_neighbours", "get_component"] as const;

export const INTAKE_TOOL_HANDLERS: Record<string, AsyncHandler> = {
  ...Object.fromEntries(ARCHIVIST_READ_TOOLS.map((n) => [n, SERVER_HANDLERS[n] as ServerHandler])),
  resolve_entity,
  find_path,
  image_neighbours,
};

export function isIntakeTool(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(INTAKE_TOOL_HANDLERS, name);
}

export async function runIntakeTool(db: DatabaseSync, name: string, input: unknown): Promise<unknown> {
  const h = INTAKE_TOOL_HANDLERS[name];
  if (!h) return { error: "unknown_tool", name };
  return h(db, (input && typeof input === "object" ? input : {}) as Record<string, unknown>);
}

/** Tool schemas for the three intake-only tools (the worker owns the prompt; this keeps schemas next to handlers). */
export const INTAKE_TOOL_DEFINITIONS: ToolDef[] = [
  {
    name: "resolve_entity",
    description:
      "The dedup gate. Before proposing ANY named entity (person, work, show, venue, collective, concept), resolve it against A(DAI). Returns exact / alias / fuzzy matches with the node ids to link, plus `would_create`, the id a new node would get. Prefer linking to an existing node; when two matches are plausible, ask_contributor instead of guessing.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Entity name as written on the page." },
        type: { type: "string", description: "practitioner | artwork | project | institution | collective | concept | platform" },
        hints: {
          type: "object",
          description: "Optional disambiguation: {year, url, country}. `url` is matched against web aliases of existing nodes.",
          properties: { year: { type: "string" }, url: { type: "string" }, country: { type: "string" } },
        },
      },
      required: ["name"],
    },
  },
  {
    name: "find_path",
    description: "Shortest path between two existing nodes over live edges (max 4 hops by default). Use it to see how the subject already connects to someone or something the page mentions.",
    input_schema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Node id." },
        to: { type: "string", description: "Node id." },
        max_depth: { type: "integer", minimum: 1, maximum: 6 },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "image_neighbours",
    description: "Visually nearest artworks in A(DAI) for an image URL from the page (multimodal embedding, nothing persisted). Use it on up to 10 proposed images to find works A(DAI) may already hold. Close matches become `known` or a fuzzy `node` candidate — never an edge.",
    input_schema: {
      type: "object",
      properties: {
        image_url: { type: "string" },
        k: { type: "integer", minimum: 1, maximum: 10 },
      },
      required: ["image_url"],
    },
  },
];
