import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { getDb } from "../db.js";
import { htmlPage, htmlEscape, CSS, HTML_HEADERS } from "../templates.js";
import { topKByNodeId, withMetadata, type Neighbour } from "../embed/neighbours.js";
import { buildEmbeddingSections } from "../embed/sections.js";
import { formatArtworkYearFromMetadata, formatArtworkYear, YEAR_SQL_FRAGMENT } from "../utils/year.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..", "..");

const router = Router();

// GET /skill.md — serve SKILL.md verbatim as text/markdown so a Claude can
// `curl $ADAI_BASE/skill.md` and bootstrap itself into the contributor API.
// File is read on every request (small, ~6 KB) so editing it doesn't require
// a server restart in dev.
router.get("/skill.md", (_req, res) => {
  const skillPath = path.join(PROJECT_ROOT, "SKILL.md");
  if (!fs.existsSync(skillPath)) {
    res.status(404).type("text/plain").send("SKILL.md not found");
    return;
  }
  res
    .set({
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    })
    .send(fs.readFileSync(skillPath, "utf-8"));
});

const ENTITY_TYPES_EXCLUDE = "('related', 'concept', 'scene', 'classification_regime')";

const EDGE_TYPE_LABEL: Record<string, string> = {
  PRACTICES: "practices",
  BELONGS_TO: "belongs to",
  RELATED_TO: "related to",
  COLLABORATES_WITH: "collaborates with",
  CREATED_BY: "created by",
  EXHIBITED_AT: "exhibited at",
  CLASSIFIED_BY: "classified by",
  LEGIBLE_TO: "legible to",
};

const ALIAS_SOURCE_LABEL: Record<string, string> = {
  wikidata: "Wikidata",
  moma: "MoMA",
  met: "Met",
  artblocks: "Art Blocks",
  fxhash: "fxhash",
};

function aliasLink(source: string, externalId: string): string {
  if (source === "wikidata") return `https://www.wikidata.org/wiki/${encodeURIComponent(externalId)}`;
  return "";
}

// GET / — home page
router.get("/", (_req, res) => {
  const db = getDb();
  const { count: entityCount } = db
    .prepare(`SELECT COUNT(*) as count FROM nodes WHERE type NOT IN ${ENTITY_TYPES_EXCLUDE}`)
    .get() as any;
  const { count: regimeCount } = db
    .prepare("SELECT COUNT(*) as count FROM nodes WHERE type = 'classification_regime'")
    .get() as any;
  const { count: edgeCount } = db
    .prepare("SELECT COUNT(*) as count FROM edges WHERE valid_until IS NULL")
    .get() as any;
  const { count: typeCount } = db.prepare("SELECT COUNT(DISTINCT type) as count FROM nodes").get() as any;

  let body = `<h2>Digital Arts Knowledge Commons</h2>
<p>A(DAI) maps practitioners, artworks, concepts, scenes, and their relationships across the digital arts landscape. A living graph built through collective contribution — and up-front about the lenses that shaped it.</p>
<div class='stats-grid'>
<div class='stat-box'><div class='num'>${entityCount}</div><div class='label'>entities</div></div>
<div class='stat-box'><div class='num'>${edgeCount}</div><div class='label'>live edges</div></div>
<div class='stat-box'><div class='num'>${regimeCount}</div><div class='label'>classification regimes</div></div>
<div class='stat-box'><div class='num'>${typeCount}</div><div class='label'>node types</div></div>
</div>
<h2>Recent Additions</h2>`;

  const recent = db
    .prepare(`SELECT id, name, type, slug FROM nodes WHERE type NOT IN ${ENTITY_TYPES_EXCLUDE} ORDER BY created_at DESC LIMIT 10`)
    .all() as any[];

  for (const r of recent) {
    body += `<div class='card'><h3><a href='/practitioner/${r.slug}'>${r.name}</a></h3><span class='tag'>${r.type}</span></div>`;
  }

  body += `<h2>Classification Regimes</h2>
<p class='meta'>Every entity in the graph was seen through one or more lenses. A <em>classification regime</em> is a first-class node representing one such lens — a body of research, an institution's collection, a platform's taxonomy. The <code>CLASSIFIED_BY</code> edge records which lens saw which entity. This makes the provenance of the canon legible instead of hidden. A(DAI) sits at the root: every other regime, and every first-class entity, declares <code>CLASSIFIED_BY</code> A(DAI).</p>`;

  const regimes = db
    .prepare("SELECT id, name, slug FROM nodes WHERE type = 'classification_regime' ORDER BY CASE WHEN slug = 'adai-seed-canon-v1-2026-04' THEN 0 ELSE 1 END, name")
    .all() as any[];
  for (const r of regimes) {
    const rootTag = r.slug === "adai-seed-canon-v1-2026-04" ? `<span class='tag' style='background:#3a2e16;color:#f4c261'>absolute root</span>` : `<span class='tag'>classification_regime</span>`;
    body += `<div class='card'><h3><a href='/practitioner/${r.slug}'>${r.name}</a></h3>${rootTag}</div>`;
  }

  res.set(HTML_HEADERS).send(htmlPage("Home", body));
});

// GET /explore — list all practitioners
router.get("/explore", (_req, res) => {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, type, slug, ${YEAR_SQL_FRAGMENT}
         FROM nodes WHERE type NOT IN ${ENTITY_TYPES_EXCLUDE} ORDER BY name`
    )
    .all() as any[];

  let body = `<h2>Explore</h2><p class='meta'>${rows.length} entities — practitioners, artworks, collectives, platforms, institutions, and projects</p>`;

  for (const r of rows) {
    const yr = r.type === "artwork" ? formatArtworkYear(r) : null;
    const yrTag = yr ? ` <span class='meta'>(${htmlEscape(yr)})</span>` : "";
    body += `<div class='card'><h3><a href='/${r.type}/${r.slug}'>${r.name}</a>${yrTag}</h3><span class='tag'>${r.type}</span></div>`;
  }

  res.set(HTML_HEADERS).send(htmlPage("Explore", body));
});

// GET /:type/:slug — polymorphic profile page (slug-only lookup, type ignored for resolution)
function profileHandler(req: any, res: any) {
  const db = getDb();
  const slug = req.params.slug;

  const node = db.prepare("SELECT id, name, type, slug, metadata FROM nodes WHERE slug = ?").get(slug) as any;
  if (!node) {
    res.status(404).set(HTML_HEADERS).send(htmlPage("Not Found", "<h2>Not Found</h2><p>No node with that slug.</p>"));
    return;
  }

  const escName = htmlEscape(String(node.name));
  const escType = htmlEscape(String(node.type));
  let body = `<h2>${escName}</h2><span class='tag'>${escType}</span>`;

  // For artworks, surface the year prominently right under the title.
  // The same display string is exposed by the API on artwork nodes, so
  // graph/field/embed-space hovers stay consistent.
  if (node.type === "artwork" && node.metadata) {
    try {
      const yearMeta = JSON.parse(node.metadata);
      const yr = formatArtworkYearFromMetadata(yearMeta);
      if (yr) body += ` <span class='tag'>${htmlEscape(yr)}</span>`;
    } catch { /* metadata not JSON, skip */ }
  }

  if (node.type === "classification_regime") {
    const { count: classifiedCount } = db
      .prepare("SELECT COUNT(*) as count FROM edges WHERE target_id = ? AND edge_type = 'CLASSIFIED_BY' AND valid_until IS NULL")
      .get(node.id) as any;
    body += `<p class='meta' style='margin-top:0.5rem'>A lens — a body of research, an institution's collection, a platform's taxonomy, or a self-report framework — through which other entities were seen. ${classifiedCount} entities declare <code>CLASSIFIED_BY</code> this regime.</p>`;
  }

  const aliases = db
    .prepare("SELECT source, external_id FROM node_aliases WHERE node_id = ? ORDER BY source")
    .all(node.id) as any[];
  if (aliases.length > 0) {
    body += `<div style='margin:0.6rem 0'>`;
    for (const a of aliases) {
      const label = ALIAS_SOURCE_LABEL[a.source] ?? a.source;
      const url = aliasLink(a.source, a.external_id);
      const idTxt = htmlEscape(String(a.external_id));
      body += url
        ? `<span class='tag'>${htmlEscape(label)}: <a href='${htmlEscape(url)}' target='_blank' rel='noopener'>${idTxt}</a></span>`
        : `<span class='tag'>${htmlEscape(label)}: ${idTxt}</span>`;
    }
    body += `</div>`;
  }

  if (node.metadata) {
    try {
      const meta = JSON.parse(node.metadata);
      const profile = meta.full_profile ?? meta;

      const imgSrc = meta.cdn_image_url || meta.image_url;
      if (imgSrc) {
        const isPortrait = node.type === "practitioner" || node.type === "collective";
        const maxW = isPortrait ? "240px" : "480px";
        const altText = htmlEscape(`${node.name} — ${node.type}`);
        body += `<figure style='margin:1rem 0;max-width:${maxW}'>` +
          `<img src='${htmlEscape(String(imgSrc))}' alt='${altText}' ` +
          `style='width:100%;height:auto;border-radius:6px;display:block' loading='lazy' />`;
        if (meta.image_source || meta.image_license) {
          const parts: string[] = [];
          if (meta.image_source) parts.push(`source: ${htmlEscape(String(meta.image_source))}`);
          if (meta.image_license) parts.push(htmlEscape(String(meta.image_license)));
          body += `<figcaption class='meta' style='font-size:0.8rem;margin-top:0.3rem'>${parts.join(" · ")}</figcaption>`;
        }
        body += `</figure>`;
      }

      if (meta.status) {
        body += `<p class='meta'>Status: <span class='tag'>${htmlEscape(String(meta.status))}</span></p>`;
      }

      if (node.type === "classification_regime" && meta.description) {
        body += `<p style='margin-top:0.5rem'>${htmlEscape(String(meta.description))}</p>`;
      }

      if (profile.basic_info) {
        const info = profile.basic_info;
        body += `<div style='margin:1rem 0'>`;
        if (info.location) body += `<p class='meta'>Location: ${htmlEscape(String(info.location))}</p>`;
        if (info.active_years) body += `<p class='meta'>Active: ${htmlEscape(String(info.active_years))}</p>`;
        if (info.url) body += `<p class='meta'>Web: <a href='${htmlEscape(String(info.url))}' target='_blank' rel='noopener'>${htmlEscape(String(info.url))}</a></p>`;
        body += `</div>`;
      }

      if (profile.practice_description) {
        const practice = profile.practice_description;
        if (practice.practice_summary) {
          body += `<h3>practice</h3><p>${htmlEscape(String(practice.practice_summary))}</p>`;
        }
        if (practice.medium) {
          body += `<div style='margin:0.5rem 0'>`;
          for (const m of String(practice.medium).split(",")) {
            body += `<span class='tag'>${htmlEscape(m.trim())}</span>`;
          }
          body += `</div>`;
        }
        if (practice.methodology) {
          body += `<h3>methodology</h3><p>${htmlEscape(String(practice.methodology))}</p>`;
        }
      }

      if (profile.key_works?.works) {
        body += `<h3>key works</h3>`;
        for (const work of profile.key_works.works) {
          body += `<div class='card'><strong>${htmlEscape(String(work.title ?? ""))}</strong>`;
          if (work.year != null) body += ` <span class='meta'>(${htmlEscape(String(work.year))})</span>`;
          if (work.description) body += `<p style='margin-top:0.4rem'>${htmlEscape(String(work.description))}</p>`;
          body += `</div>`;
        }
      }

      if (profile.commons_orientation?.commons_summary) {
        body += `<h3>commons orientation</h3><p>${htmlEscape(String(profile.commons_orientation.commons_summary))}</p>`;
      }

      if (profile.governance_model?.governance_detail) {
        body += `<h3>governance</h3><p>${htmlEscape(String(profile.governance_model.governance_detail))}</p>`;
      }
    } catch {
      // metadata not valid JSON, skip
    }
  }

  // Honor consent_scope='structural_only': the contributor was promised
  // "only the edge counts, not the content" — so we hide title/summary/
  // content for those signals here too. Their edges are still rendered
  // from the edges table below; this only suppresses the narrative body.
  // NULL/other consent_scope values pass through (allow-by-default).
  const contribs = db
    .prepare(
      "SELECT s.title, s.summary, s.content, s.source_url, s.submitted_by, s.created_at, s.consent_attribution FROM signals s JOIN intake_queue iq ON iq.signal_id = s.id WHERE iq.target_node = ? AND iq.status = 'approved' AND (s.consent_scope IS NULL OR s.consent_scope != 'structural_only') ORDER BY s.created_at DESC"
    )
    .all(node.id) as any[];

  if (contribs.length > 0) {
    body += `<h3>community contributions (${contribs.length})</h3>`;
    for (const c of contribs) {
      const attributable = c.consent_attribution !== "anonymous";
      body += `<div class='card'>`;
      if (c.title) body += `<strong>${htmlEscape(String(c.title))}</strong>`;
      if (c.content) body += `<p>${htmlEscape(String(c.content))}</p>`;
      if (c.source_url) body += `<p class='meta'>Source: <a href='${htmlEscape(String(c.source_url))}' target='_blank' rel='noopener'>${htmlEscape(String(c.source_url))}</a></p>`;
      if (c.submitted_by && attributable) body += `<p class='meta'>Contributed by: ${htmlEscape(String(c.submitted_by))}</p>`;
      else if (!attributable) body += `<p class='meta'>Contributed anonymously</p>`;
      body += `</div>`;
    }
  }

  const edges = db
    .prepare(
      "SELECT e.id, e.source_id, e.target_id, e.edge_type, e.confidence, n1.name as source_name, n1.slug as source_slug, n2.name as target_name, n2.slug as target_slug FROM edges e LEFT JOIN nodes n1 ON e.source_id = n1.id LEFT JOIN nodes n2 ON e.target_id = n2.id WHERE e.valid_until IS NULL AND (e.source_id = ? OR e.target_id = ?)"
    )
    .all(node.id, node.id) as any[];

  if (edges.length > 0) {
    const grouped = new Map<string, any[]>();
    for (const e of edges) {
      const key = e.edge_type || "";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(e);
    }
    body += `<h3>connections (${edges.length})</h3>`;
    for (const [etype, list] of grouped) {
      const label = EDGE_TYPE_LABEL[etype] ?? etype.toLowerCase().replace(/_/g, " ");
      body += `<div style='margin-top:0.8rem'><span class='edge-type'>${htmlEscape(etype)}</span> <span class='meta'>— ${htmlEscape(label)} (${list.length})</span><ul class='edge-list'>`;
      for (const e of list) {
        const otherName = e.source_id === node.id ? e.target_name : e.source_name;
        const otherSlug = e.source_id === node.id ? e.target_slug : e.source_slug;
        if (!otherSlug) continue;
        body += `<li><a href='/practitioner/${encodeURIComponent(otherSlug)}'>${htmlEscape(String(otherName ?? otherSlug))}</a></li>`;
      }
      body += `</ul></div>`;
    }
  }

  const provenance = db
    .prepare(
      `SELECT DISTINCT s.id, s.title, s.source_origin, s.batch_id, s.consent_scope, s.status
       FROM signals s
       JOIN edges e ON e.signal_id = s.id
       WHERE e.valid_until IS NULL AND (e.source_id = ? OR e.target_id = ?)`
    )
    .all(node.id, node.id) as any[];

  if (provenance.length > 0) {
    body += `<h3>provenance</h3><p class='meta'>Signal(s) whose live edges touch this node — source, consent, status.</p><ul class='edge-list'>`;
    for (const p of provenance) {
      const parts = [
        `<strong>${htmlEscape(String(p.title ?? p.id))}</strong>`,
        p.source_origin ? `<span class='tag'>${htmlEscape(String(p.source_origin))}</span>` : "",
        p.consent_scope ? `<span class='tag'>consent: ${htmlEscape(String(p.consent_scope))}</span>` : "",
        p.status ? `<span class='tag'>${htmlEscape(String(p.status))}</span>` : "",
        p.batch_id ? `<span class='meta'>batch: ${htmlEscape(String(p.batch_id))}</span>` : "",
      ].filter(Boolean);
      body += `<li>${parts.join(" ")}</li>`;
    }
    body += `</ul>`;
  }

  // ----- Embedding-derived sections ------------------------------------
  // Each section is gated on the node having an appropriate vector; nodes
  // with no embedding (e.g. institution, publication, regime) get nothing
  // here, no errors.
  body += renderEmbeddingSections(db, node);

  body += `<p style='margin-top:2rem'><a href='/${encodeURIComponent(node.type)}/${encodeURIComponent(slug)}/data' class='btn'>Export JSON</a></p>`;

  // Direct deep-link into the similarity browser for any node with an
  // embedding. Cheap to add — it's a query-param page, no per-node cost.
  body += ` <a href='/neighbours/${encodeURIComponent(node.type)}/${encodeURIComponent(slug)}' class='btn'>Find neighbours</a>`;

  res.set(HTML_HEADERS).send(htmlPage(node.name, body));
}

// Render the "Style kin", "Visually affine", and "AI-suggested attributions"
// sections that hang off a profile page. The section selection + neighbour
// computation lives in `src/embed/sections.ts` and is shared with the JSON
// endpoint `/api/neighbours/:type/:slug` consumed by the /field overlays,
// so the HTML and JSON surfaces can never drift apart.
function renderEmbeddingSections(db: any, node: any): string {
  const sections = buildEmbeddingSections(db, node);
  let html = "";
  for (const s of sections) {
    if (s.key === "ai_attributions") {
      // Slightly different chrome for the attribution proposals — the count
      // is the headline and the blurb links into /review.
      html += `<h3 style='margin-top:2rem'>${htmlEscape(s.title)} <span class='tag'>${s.neighbours.length}</span></h3>`;
      html += `<p class='meta'>Unattributed artworks the embedding pipeline thinks may be by ${htmlEscape(String(node.name))}. Review at <a href='/review?kind=ai_suggestion'>/review</a>.</p>`;
      html += renderNeighbourList(s.neighbours);
      continue;
    }
    html += renderNeighbourSection(s.title, s.blurb, s.neighbours);
  }
  return html;
}

function renderNeighbourSection(title: string, blurb: string, neighbours: Neighbour[]): string {
  let s = `<h3 style='margin-top:2rem'>${htmlEscape(title)} <span class='tag'>${neighbours.length}</span></h3>`;
  s += `<p class='meta'>${htmlEscape(blurb)}</p>`;
  s += renderNeighbourList(neighbours);
  return s;
}

function renderNeighbourList(neighbours: Neighbour[]): string {
  // Compact grid: thumbnail (for artworks) + name + type tag + similarity.
  let s = `<div style='display:flex;flex-wrap:wrap;gap:0.8rem;margin-top:0.5rem'>`;
  for (const n of neighbours) {
    const url = n.slug && n.type ? `/${encodeURIComponent(n.type)}/${encodeURIComponent(n.slug)}` : "#";
    const img = n.cdn_image_url || n.image_url;
    const sim = n.similarity.toFixed(3);
    const nameEsc = htmlEscape(String(n.name ?? n.node_id));
    const typeEsc = htmlEscape(String(n.type ?? "?"));
    const thumb = img
      ? `<img src='${htmlEscape(String(img))}' alt='${nameEsc}' style='width:96px;height:96px;object-fit:cover;border-radius:4px;display:block' loading='lazy' />`
      : `<div style='width:96px;height:96px;background:#181818;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:#666;text-align:center;padding:0.4rem;box-sizing:border-box'>${nameEsc.slice(0, 40)}</div>`;
    const yearTag = n.year ? ` <span class='meta'>(${htmlEscape(String(n.year))})</span>` : "";
    s += `<a href='${url}' style='display:block;width:108px;text-decoration:none;color:inherit'>
${thumb}
<div style='font-size:0.78rem;margin-top:0.3rem;line-height:1.2'>${nameEsc}${yearTag}</div>
<div class='meta' style='font-size:0.7rem;margin-top:0.15rem'>${typeEsc} · <span class='tag'>${sim}</span></div>
</a>`;
  }
  s += `</div>`;
  return s;
}

router.get("/practitioner/:slug", profileHandler);
router.get("/artwork/:slug", profileHandler);
router.get("/concept/:slug", profileHandler);
router.get("/scene/:slug", profileHandler);
router.get("/collective/:slug", profileHandler);
router.get("/institution/:slug", profileHandler);
router.get("/platform/:slug", profileHandler);
router.get("/publication/:slug", profileHandler);
router.get("/project/:slug", profileHandler);
router.get("/classification_regime/:slug", profileHandler);

// JSON data export — polymorphic over node type, slug-only resolution.
function dataHandler(req: any, res: any) {
  const db = getDb();
  const slug = req.params.slug;

  const node = db
    .prepare("SELECT id, name, type, slug, metadata, created_at, updated_by FROM nodes WHERE slug = ?")
    .get(slug) as any;
  if (!node) {
    res.status(404).json({ error: "not found" });
    return;
  }

  let parsedMetadata = null;
  if (node.metadata) {
    try {
      parsedMetadata = JSON.parse(node.metadata);
    } catch {
      parsedMetadata = null;
    }
  }

  const edgeRows = db
    .prepare("SELECT id, source_id, target_id, edge_type, confidence FROM edges WHERE source_id = ? OR target_id = ?")
    .all(node.id, node.id) as any[];

  // Same consent_scope filter as the HTML profile path above — don't
  // expose structural_only contributors' titles through the data API.
  const signalRows = db
    .prepare(
      "SELECT s.id, s.title, s.submitted_by FROM signals s JOIN intake_queue iq ON iq.signal_id = s.id WHERE iq.target_node = ? AND iq.status = 'approved' AND (s.consent_scope IS NULL OR s.consent_scope != 'structural_only')"
    )
    .all(node.id) as any[];

  res.json({
    node: {
      id: node.id,
      name: node.name,
      type: node.type,
      slug: node.slug,
      created_at: node.created_at,
      updated_by: node.updated_by,
      metadata: parsedMetadata,
    },
    edges: edgeRows.map((e: any) => ({
      id: e.id,
      source_id: e.source_id,
      target_id: e.target_id,
      edge_type: e.edge_type,
      confidence: e.confidence,
    })),
    signals: signalRows.map((s: any) => ({
      id: s.id,
      title: s.title,
      submitted_by: s.submitted_by,
    })),
  });
}

router.get("/practitioner/:slug/data", dataHandler);
router.get("/artwork/:slug/data", dataHandler);
router.get("/concept/:slug/data", dataHandler);
router.get("/scene/:slug/data", dataHandler);
router.get("/collective/:slug/data", dataHandler);
router.get("/institution/:slug/data", dataHandler);
router.get("/platform/:slug/data", dataHandler);
router.get("/publication/:slug/data", dataHandler);
router.get("/project/:slug/data", dataHandler);
router.get("/classification_regime/:slug/data", dataHandler);

// GET /neighbours/:type/:slug — similarity browser. Shows the top-K cosine
// neighbours of a node across any kind+candidate combination. Useful for
// curators evaluating AI suggestions and for general "what does this thing
// sit next to in embedding space" exploration.
router.get("/neighbours/:type/:slug", (req, res) => {
  const db = getDb();
  const slug = req.params.slug;
  const node = db.prepare("SELECT id, name, type, slug, metadata FROM nodes WHERE slug = ?").get(slug) as any;
  if (!node) {
    res.status(404).set(HTML_HEADERS).send(htmlPage("not found", "<p>node not found</p>"));
    return;
  }

  // Query knobs (URL-overridable) — sensible defaults pick the most useful
  // comparison for each node type.
  const defaultsByType: Record<string, { queryKind: string; candidateKind: string; prefixes: string }> = {
    practitioner: { queryKind: "style_centroid", candidateKind: "style_centroid", prefixes: "practitioner:,collective:" },
    collective: { queryKind: "style_centroid", candidateKind: "style_centroid", prefixes: "practitioner:,collective:" },
    artwork: { queryKind: "identity", candidateKind: "identity", prefixes: "artwork:" },
    concept: { queryKind: "identity", candidateKind: "identity", prefixes: "artwork:,concept:" },
    scene: { queryKind: "identity", candidateKind: "identity", prefixes: "artwork:,practitioner:" },
  };
  const def = defaultsByType[node.type] ?? { queryKind: "identity", candidateKind: "identity", prefixes: "" };

  const queryKind = String(req.query.qkind ?? def.queryKind);
  const candidateKind = String(req.query.ckind ?? def.candidateKind);
  const prefixesRaw = String(req.query.prefixes ?? def.prefixes);
  const k = Math.min(Math.max(parseInt(String(req.query.k ?? "20"), 10) || 20, 1), 100);
  const prefixes = prefixesRaw ? prefixesRaw.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

  const neighbours = withMetadata(
    db,
    topKByNodeId(db, node.id, {
      queryKind: queryKind as any,
      candidateKind: candidateKind as any,
      typePrefixes: prefixes,
      k,
    })
  );

  // Render the page.
  const escName = htmlEscape(String(node.name));
  const escType = htmlEscape(String(node.type));
  let body = `<h2>Neighbours of <a href='/${encodeURIComponent(node.type)}/${encodeURIComponent(node.slug)}'>${escName}</a></h2>`;
  body += `<p class='meta'><span class='tag'>${escType}</span>
 · query vector: <span class='tag'>${htmlEscape(queryKind)}</span>
 · candidates: <span class='tag'>${htmlEscape(candidateKind)}</span>
 · filter: <span class='tag'>${htmlEscape(prefixesRaw || "(any)")}</span>
 · k=${k}</p>`;

  // Filter chips — let the curator swap query/candidate kind in one click.
  // The "switch" form lives at the top, GET-based so URLs are shareable.
  body += `<form method='get' style='margin:1rem 0;padding:0.75rem;background:#111;border:1px solid #2a2a2a;border-radius:6px;font-size:0.85rem'>
  <label style='margin-right:1rem'>query kind:
    <select name='qkind' style='background:#1a1a1a;color:#d4d4d4;border:1px solid #333;padding:0.2rem'>
      <option value='identity'${queryKind === "identity" ? " selected" : ""}>identity (this node's own vector)</option>
      <option value='style_centroid'${queryKind === "style_centroid" ? " selected" : ""}>style_centroid (practitioner mean)</option>
    </select>
  </label>
  <label style='margin-right:1rem'>candidate kind:
    <select name='ckind' style='background:#1a1a1a;color:#d4d4d4;border:1px solid #333;padding:0.2rem'>
      <option value='identity'${candidateKind === "identity" ? " selected" : ""}>identity</option>
      <option value='style_centroid'${candidateKind === "style_centroid" ? " selected" : ""}>style_centroid</option>
    </select>
  </label>
  <label style='margin-right:1rem'>prefixes:
    <input type='text' name='prefixes' value='${htmlEscape(prefixesRaw)}'
           style='background:#1a1a1a;color:#d4d4d4;border:1px solid #333;padding:0.2rem;width:14rem'
           placeholder='e.g. artwork: or practitioner:,collective:' />
  </label>
  <label style='margin-right:1rem'>k:
    <input type='number' name='k' min='1' max='100' value='${k}'
           style='background:#1a1a1a;color:#d4d4d4;border:1px solid #333;padding:0.2rem;width:4rem' />
  </label>
  <button type='submit' class='btn'>refresh</button>
</form>`;

  if (!neighbours.length) {
    body += `<p>No neighbours — this node has no vector of kind <span class='tag'>${htmlEscape(queryKind)}</span> (likely a node without an embedding, or a practitioner with no <code>CREATED_BY</code> artworks for the centroid).</p>`;
  } else {
    body += renderNeighbourTable(neighbours);
  }

  res.set(HTML_HEADERS).send(htmlPage(`Neighbours of ${node.name}`, body));
});

// Larger table variant for /neighbours/: shows name + type + similarity
// + thumbnail in a denser layout than the profile-page card grid.
function renderNeighbourTable(neighbours: Neighbour[]): string {
  let s = `<table style='width:100%;border-collapse:collapse;margin-top:1rem;font-size:0.88rem'>`;
  s += `<thead><tr style='border-bottom:1px solid #2a2a2a;text-align:left'>
    <th style='padding:0.4rem 0.6rem;width:88px'></th>
    <th style='padding:0.4rem 0.6rem'>name</th>
    <th style='padding:0.4rem 0.6rem;width:90px'>type</th>
    <th style='padding:0.4rem 0.6rem;width:80px;text-align:right'>cosine</th>
  </tr></thead><tbody>`;
  for (const n of neighbours) {
    const url = n.slug && n.type ? `/${encodeURIComponent(n.type)}/${encodeURIComponent(n.slug)}` : "#";
    const img = n.cdn_image_url || n.image_url;
    const sim = n.similarity.toFixed(4);
    const nameEsc = htmlEscape(String(n.name ?? n.node_id));
    const typeEsc = htmlEscape(String(n.type ?? "?"));
    const thumb = img
      ? `<img src='${htmlEscape(String(img))}' alt='' style='width:72px;height:72px;object-fit:cover;border-radius:3px;display:block' loading='lazy' />`
      : `<div style='width:72px;height:72px;background:#181818;border-radius:3px'></div>`;
    s += `<tr style='border-bottom:1px solid #1a1a1a'>
  <td style='padding:0.4rem 0.6rem'>${thumb}</td>
  <td style='padding:0.4rem 0.6rem'><a href='${url}'>${nameEsc}</a></td>
  <td style='padding:0.4rem 0.6rem'><span class='tag'>${typeEsc}</span></td>
  <td style='padding:0.4rem 0.6rem;text-align:right;font-variant-numeric:tabular-nums'>${sim}</td>
</tr>`;
  }
  s += `</tbody></table>`;
  return s;
}

// GET /contribute — contribution form
router.get("/contribute", (_req, res) => {
  const db = getDb();
  const entities = db
    .prepare(`SELECT id, name, slug FROM nodes WHERE type NOT IN ${ENTITY_TYPES_EXCLUDE} ORDER BY name`)
    .all() as any[];

  let options = "";
  for (const p of entities) {
    options += `<option value='${htmlEscape(String(p.id))}'>${htmlEscape(String(p.name))}</option>`;
  }

  const formBody = `<h2>Contribute a Signal</h2>
<p>Submit information about an entity in the graph. Contributions from new contributors go to the review queue.</p>
<form id='contribute-form'>
<label>About which entity</label>
<select name='target_node' required>${options}</select>
<label>Signal title</label>
<input type='text' name='title' placeholder='e.g. New exhibition at Serpentine' required>
<label>Content</label>
<textarea name='content' placeholder='Describe the signal...' required></textarea>
<label>Source URL (optional)</label>
<input type='text' name='source_url' placeholder='https://...'>
<label>Your name</label>
<input type='text' name='contributor_name' placeholder='Your name or handle' required>
<label>Consent scope — how much of your contribution enters the commons</label>
<select name='consent_scope'>
<option value='full_commons'>full_commons — content + structure are public</option>
<option value='structural_only'>structural_only — only the edge counts, not the content</option>
</select>
<label>Attribution</label>
<select name='consent_attribution'>
<option value='attributed'>attributed — my name is public</option>
<option value='anonymous'>anonymous — don't show my name</option>
<option value='attributed_with_notification'>attributed_with_notification — tell me if I'm quoted</option>
</select>
<button type='submit' class='btn' style='margin-top:1rem'>Submit Signal</button>
</form>
<div id='result'></div>
<script>
document.getElementById('contribute-form').addEventListener('submit',function(e){
e.preventDefault();
var fd=new FormData(this);
var d={};
fd.forEach(function(v,k){d[k]=v;});
fetch('/api/contribute',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)})
.then(function(r){return r.text();})
.then(function(h){document.getElementById('result').innerHTML=h;document.getElementById('contribute-form').reset();});
});
</script>`;

  res.set(HTML_HEADERS).send(htmlPage("Contribute", formBody));
});

// GET /review — review queue. The default tab shows human-signal contributions
// (intake_queue.kind='human_signal'). The AI tab shows ai_suggestion rows
// from the embedding derive pipeline; mixing them in one feed swamped the
// curator's attention so we keep them separate by URL.
router.get("/review", (req, res) => {
  const db = getDb();
  const tab = String(req.query.kind ?? "human_signal");
  const tabKind = tab === "ai_suggestion" ? "ai_suggestion" : "human_signal";

  const countHuman = (db
    .prepare("SELECT COUNT(*) as count FROM intake_queue WHERE status='pending' AND kind='human_signal'")
    .get() as any).count;
  const countAI = (db
    .prepare("SELECT COUNT(*) as count FROM intake_queue WHERE status='pending' AND kind='ai_suggestion'")
    .get() as any).count;
  const { count: qCount } = db
    .prepare("SELECT COUNT(*) as count FROM intake_queue WHERE status='pending' AND kind=?")
    .get(tabKind) as any;

  const tabLink = (k: string, label: string, n: number, active: boolean): string =>
    `<a href='/review?kind=${k}' class='tag'${active ? " style='background:#444;color:#fff'" : ""}>${label} (${n})</a>`;

  let body = `<h2>Review Queue</h2>
<p class='meta'>
  ${tabLink("human_signal", "Human signals", countHuman, tabKind === "human_signal")}
  &nbsp;
  ${tabLink("ai_suggestion", "AI suggestions", countAI, tabKind === "ai_suggestion")}
</p>
<p class='meta'>${qCount} pending in this tab.</p>`;

  if (qCount === 0) {
    body += `<p>Nothing to review here.</p>`;
  } else if (tabKind === "ai_suggestion") {
    // AI suggestion rows: target_node is the *artwork*; proposed_edges
    // carries the proposed CREATED_BY pointing to a practitioner. We show
    // both ends + the cosine similarity so the curator can rank quickly.
    const items = db
      .prepare(
        `SELECT iq.id, iq.target_node, iq.submitted_by, iq.created_at, iq.proposed_edges,
                n.name as target_name
           FROM intake_queue iq
           LEFT JOIN nodes n ON iq.target_node = n.id
          WHERE iq.status='pending' AND iq.kind='ai_suggestion'
          ORDER BY iq.created_at DESC`
      )
      .all() as any[];
    for (const item of items) {
      let proposals: any[] = [];
      try { proposals = JSON.parse(item.proposed_edges || "[]"); } catch { /* leave empty */ }
      const p = proposals[0] || {};
      const candidate = db.prepare("SELECT name, slug FROM nodes WHERE id = ?").get(p.target_id) as any;
      const candName = htmlEscape(String(candidate?.name ?? p.target_id ?? "?"));
      const candSlug = String(candidate?.slug ?? "");
      const sim = typeof p.similarity === "number" ? p.similarity.toFixed(4) : "?";
      const artName = htmlEscape(String(item.target_name ?? item.target_node));
      const artSlug = String(item.target_node ?? "").split(":").slice(1).join(":");
      body += `<div class='card' id='item-${item.id}'>
<h3>${artName}</h3>
<p class='meta'>Proposed creator: <strong><a href='/practitioner/${encodeURIComponent(candSlug)}'>${candName}</a></strong>
 · cosine: <span class='tag'>${sim}</span>
 · ${String(item.created_at ?? "")}</p>
<p class='meta'>Artwork: <a href='/artwork/${encodeURIComponent(artSlug)}'>${artName}</a></p>
<div style='margin-top:0.5rem'>
<button class='btn btn-approve' onclick="reviewAction('${item.id}','approve')">Approve attribution</button>
<button class='btn btn-reject' onclick="reviewAction('${item.id}','reject')">Reject</button>
<input type='text' id='reason-${item.id}' placeholder='Rejection reason...' style='width:auto;display:inline-block;margin-left:0.5rem;padding:0.4rem'>
</div></div>`;
    }
  } else {
    const items = db
      .prepare(
        "SELECT iq.id, iq.signal_id, iq.target_node, iq.submitted_by, iq.trust_tier, iq.created_at, iq.proposed_nodes, iq.proposed_edges, s.title, s.content, s.source_url, s.source_type, n.name as target_name FROM intake_queue iq LEFT JOIN signals s ON iq.signal_id = s.id LEFT JOIN nodes n ON iq.target_node = n.id WHERE iq.status='pending' AND iq.kind='human_signal' ORDER BY iq.created_at DESC"
      )
      .all() as any[];

    for (const item of items) {
      const qtitle = htmlEscape(String(item.title ?? ""));
      const qurl = htmlEscape(String(item.source_url ?? ""));
      const qauthor = htmlEscape(String(item.submitted_by ?? ""));
      const qtier = htmlEscape(String(item.trust_tier ?? ""));
      const qtarget = htmlEscape(String(item.target_name ?? item.target_node ?? ""));
      const qdate = String(item.created_at ?? "");
      const qsource = String(item.source_type ?? "");

      body += `<div class='card' id='item-${item.id}'>
<h3>${qtitle}</h3>
<p class='meta'>About: <strong>${qtarget}</strong> · By: ${qauthor} · Trust: <span class='tag'>${qtier}</span> · ${qdate}${qsource ? ` · <span class='tag'>${htmlEscape(qsource)}</span>` : ""}</p>`;

      // For API-submitted contributions (source_type like 'api_*'), preview
      // the structured proposed_nodes / proposed_edges payload instead of
      // dumping the raw JSON in `content`. For legacy web-form signals,
      // fall back to rendering the content body as before.
      const isApiContribution = qsource.startsWith("api_");
      if (isApiContribution) {
        let ops: any[] = [];
        let edges: any[] = [];
        try { ops = JSON.parse(item.proposed_nodes || "[]"); } catch { /* empty */ }
        try { edges = JSON.parse(item.proposed_edges || "[]"); } catch { /* empty */ }
        if (ops.length) {
          body += `<p class='meta'>Proposed node operations:</p><ul class='meta'>`;
          for (const op of ops) {
            if (op?.op === "create_node") {
              body += `<li>create <span class='tag'>${htmlEscape(String(op.type))}</span> "${htmlEscape(String(op.name))}" (id: <code>${htmlEscape(`${op.type}:${op.slug}`)}</code>)</li>`;
            } else if (op?.op === "patch_node") {
              const keys = Object.keys(op.metadata || {}).join(", ");
              body += `<li>patch metadata of <code>${htmlEscape(String(op.node_id))}</code> — keys: ${htmlEscape(keys)}</li>`;
            } else if (op?.op === "attach_image") {
              body += `<li>attach image to <code>${htmlEscape(String(op.node_id))}</code> — <a href='${htmlEscape(String(op.cdn_image_url))}' target='_blank'>preview</a> (sha256: <code>${htmlEscape(String(op.sha256).slice(0, 12))}…</code>)</li>`;
            } else {
              body += `<li>${htmlEscape(JSON.stringify(op))}</li>`;
            }
          }
          body += `</ul>`;
        }
        if (edges.length) {
          body += `<p class='meta'>Proposed edges:</p><ul class='meta'>`;
          for (const e of edges) {
            const sup = e.supersedes_edge_id ? ` <em>supersedes</em> <code>${htmlEscape(String(e.supersedes_edge_id))}</code>` : "";
            body += `<li><code>${htmlEscape(String(e.source_id))}</code> — <strong>${htmlEscape(String(e.edge_type))}</strong> → <code>${htmlEscape(String(e.target_id))}</code>${sup}</li>`;
          }
          body += `</ul>`;
        }
      } else {
        body += `<p>${htmlEscape(String(item.content ?? ""))}</p>`;
      }

      if (qurl) {
        body += `<p class='meta'>Source: <a href='${qurl}'>${qurl}</a></p>`;
      }

      body += `<div style='margin-top:0.5rem'>
<button class='btn btn-approve' onclick="reviewAction('${item.id}','approve')">Approve</button>
<button class='btn btn-reject' onclick="reviewAction('${item.id}','reject')">Reject</button>
<input type='text' id='reason-${item.id}' placeholder='Rejection reason...' style='width:auto;display:inline-block;margin-left:0.5rem;padding:0.4rem'>
</div></div>`;
    }
  }

  // recent decisions
  const recentDecisions = db
    .prepare(
      "SELECT iq.id, iq.status, iq.reviewed_at, s.title, n.name as target_name FROM intake_queue iq LEFT JOIN signals s ON iq.signal_id = s.id LEFT JOIN nodes n ON iq.target_node = n.id WHERE iq.status != 'pending' ORDER BY iq.reviewed_at DESC LIMIT 10"
    )
    .all() as any[];

  if (recentDecisions.length > 0) {
    body += `<h3>recent decisions</h3>`;
    for (const r of recentDecisions) {
      body += `<div class='card'><span class='status-${r.status}'>${r.status}</span> ${r.title} — ${r.target_name}</div>`;
    }
  }

  // review action JS
  body += `<script>
function reviewAction(id,action){
var body={};
if(action==='reject'){
var r=document.getElementById('reason-'+id).value;
if(!r){alert('Please enter a rejection reason');return;}
body.reason=r;}
fetch('/api/review/'+id+'/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
.then(function(r){return r.text();})
.then(function(){var el=document.getElementById('item-'+id);if(el){el.style.opacity='0.3';el.innerHTML+='<p class="meta">'+action+'d</p>';}});
}
</script>`;

  res.set(HTML_HEADERS).send(htmlPage("Review Queue", body));
});

// GET /graph — D3 force-directed visualization
router.get("/graph", (_req, res) => {
  const graphBody = `<div id='graph-container' style='position:relative'>
<div id='controls' style='position:absolute;top:0;left:0;z-index:10;padding:0.5rem'>
<select id='type-filter' style='background:#111;color:#d4d4d4;border:1px solid #333;padding:0.3rem;border-radius:3px;font-size:0.8rem'>
<option value=''>Entities + Concepts (default)</option>
<option value='practitioner'>Practitioners only</option>
<option value='artwork'>Artworks only</option>
<option value='collective'>Collectives only</option>
<option value='platform'>Platforms only</option>
<option value='institution'>Institutions only</option>
<option value='classification_regime'>Classification regimes only</option>
<option value='_all'>Everything</option>
</select>
<label style='margin-left:0.5rem;font-size:0.8rem;color:#666'><input type='checkbox' id='show-scenes'> + Scenes</label>
<label style='margin-left:0.5rem;font-size:0.8rem;color:#666'><input type='checkbox' id='walk-mode' checked> Walk component on click</label>
<button id='reset-view' style='margin-left:0.5rem;background:#111;color:#888;border:1px solid #333;padding:0.25rem 0.5rem;border-radius:3px;font-size:0.75rem;cursor:pointer'>Reset view</button>
<span id='node-count' style='margin-left:1rem;font-size:0.75rem;color:#555'></span>
<div style='margin-top:0.4rem;font-size:0.7rem;color:#555'>gold hub = A(DAI), the absolute root. red hubs = sub-regimes (the lens a node was seen through). click any node to walk its connected component. <a href='/field' style='color:#7eb8da;margin-left:0.5rem'>→ field view</a></div>
</div>
<svg id='graph-svg'></svg>
<div id='detail-panel' style='display:none;position:absolute;top:0;right:0;width:280px;background:#0f0f0f;border:1px solid #222;border-radius:4px;padding:1rem;max-height:80vh;overflow-y:auto;z-index:10'>
<button onclick='closePanel()' style='float:right;background:none;border:none;color:#666;cursor:pointer;font-size:1.2rem'>×</button>
<h3 id='detail-name' style='margin:0 0 0.3rem;color:#e8e8e8'></h3>
<span id='detail-type' class='tag'></span>
<div id='detail-connections' style='margin-top:0.8rem'></div>
<a id='detail-link' href='#' style='display:block;margin-top:0.8rem;font-size:0.85rem'>View full profile →</a>
</div>
</div>
<script src='https://d3js.org/d3.v7.min.js'></script>
<script>
var typeColors={
  practitioner:'#7eb8da',collective:'#da7e7e',platform:'#7eda98',
  theorist:'#dab87e',institution:'#b87eda',project:'#7edac4',
  artwork:'#e0b468',publication:'#a4c97a',
  classification_regime:'#e07676',
  concept:'#555',scene:'#444',related:'#333',
  artist:'#7eb8da'
};
var confidenceWidth={high:2.5,medium:1.5,low:0.8,unverified:0.4};
var svg=d3.select('#graph-svg');
var width,height;
var simulation,link,node,label;
var currentData={nodes:[],edges:[]};
var selectedNode=null;

function resize(){
  width=window.innerWidth;
  height=window.innerHeight-120;
  svg.attr('width',width).attr('height',height);
  if(simulation)simulation.force('center',d3.forceCenter(width/2,height/2)).alpha(0.3).restart();
}
resize();
window.addEventListener('resize',resize);

function loadGraph(url){
  fetch(url).then(function(r){return r.json();}).then(function(data){
    currentData=data;
    document.getElementById('node-count').textContent=data.nodes.length+' nodes, '+data.edges.length+' edges';
    render(data);
  });
}

function render(data){
  svg.selectAll('*').remove();
  var g=svg.append('g');

  svg.call(d3.zoom().scaleExtent([0.1,8]).on('zoom',function(e){g.attr('transform',e.transform);}));

  var nodeMap={};
  data.nodes.forEach(function(n){nodeMap[n.id]=n;});
  var validEdges=data.edges.filter(function(e){return nodeMap[e.source||e.source.id]&&nodeMap[e.target||e.target.id];});

  simulation=d3.forceSimulation(data.nodes)
    .force('link',d3.forceLink(validEdges).id(function(d){return d.id;}).distance(80))
    .force('charge',d3.forceManyBody().strength(-120))
    .force('center',d3.forceCenter(width/2,height/2))
    .force('collision',d3.forceCollide(20));

  link=g.append('g').selectAll('line').data(validEdges).enter().append('line')
    .attr('stroke','#222')
    .attr('stroke-width',function(d){return confidenceWidth[d.confidence]||1;})
    .attr('stroke-opacity',0.6);

  node=g.append('g').selectAll('circle').data(data.nodes).enter().append('circle')
    .attr('r',function(d){return d.slug==='adai-seed-canon-v1-2026-04'?16:d.center?12:d.type==='classification_regime'?11:(d.type==='concept'||d.type==='scene')?4:8;})
    .attr('fill',function(d){return d.slug==='adai-seed-canon-v1-2026-04'?'#f4c261':(typeColors[d.type]||'#555');})
    .attr('stroke',function(d){return d.center?'#fff':'none';})
    .attr('stroke-width',function(d){return d.center?2:0;})
    .attr('cursor','pointer')
    .call(d3.drag().on('start',dragStart).on('drag',dragging).on('end',dragEnd))
    .on('click',function(e,d){onNodeClick(d);});

  node.append('title').text(function(d){return d.name+(d.year?' ('+d.year+')':'')+' — '+d.type;});

  label=g.append('g').selectAll('text').data(data.nodes).enter().append('text')
    .text(function(d){return d.name;})
    .attr('font-size','9px')
    .attr('fill','#888')
    .attr('dx',12)
    .attr('dy',3)
    .style('pointer-events','none');

  simulation.on('tick',function(){
    link.attr('x1',function(d){return d.source.x;}).attr('y1',function(d){return d.source.y;})
        .attr('x2',function(d){return d.target.x;}).attr('y2',function(d){return d.target.y;});
    node.attr('cx',function(d){return d.x;}).attr('cy',function(d){return d.y;});
    label.attr('x',function(d){return d.x;}).attr('y',function(d){return d.y;});
  });
}

function selectNode(d){
  selectedNode=d;
  node.attr('opacity',function(n){
    if(n.id===d.id)return 1;
    var connected=currentData.edges.some(function(e){
      var s=e.source.id||e.source,t=e.target.id||e.target;
      return(s===d.id&&t===n.id)||(t===d.id&&s===n.id);
    });
    return connected?1:0.15;
  });
  link.attr('stroke',function(e){
    var s=e.source.id||e.source,t=e.target.id||e.target;
    return(s===d.id||t===d.id)?typeColors[d.type]||'#7eb8da':'#222';
  }).attr('stroke-opacity',function(e){
    var s=e.source.id||e.source,t=e.target.id||e.target;
    return(s===d.id||t===d.id)?0.9:0.15;
  });
  label.attr('opacity',function(n){
    if(n.id===d.id)return 1;
    var connected=currentData.edges.some(function(e){
      var s=e.source.id||e.source,t=e.target.id||e.target;
      return(s===d.id&&t===n.id)||(t===d.id&&s===n.id);
    });
    return connected?0.8:0.05;
  });

  var panel=document.getElementById('detail-panel');
  document.getElementById('detail-name').textContent=d.name+(d.year?' ('+d.year+')':'');
  document.getElementById('detail-type').textContent=d.type;
  document.getElementById('detail-link').href='/practitioner/'+d.slug;

  var conns=currentData.edges.filter(function(e){
    var s=e.source.id||e.source,t=e.target.id||e.target;
    return s===d.id||t===d.id;
  });
  var html='<p style="font-size:0.8rem;color:#666">'+conns.length+' connections</p><ul style="list-style:none;padding:0">';
  conns.forEach(function(e){
    var s=e.source.id||e.source,t=e.target.id||e.target;
    var otherId=(s===d.id)?t:s;
    var other=currentData.nodes.find(function(n){return n.id===otherId;});
    if(other)html+='<li style="padding:0.2rem 0;font-size:0.8rem;border-bottom:1px solid #111"><span style="color:#555;font-family:monospace;font-size:0.7rem">'+e.type+'</span> '+other.name+'</li>';
  });
  html+='</ul>';
  document.getElementById('detail-connections').innerHTML=html;
  panel.style.display='block';
}

function closePanel(){
  document.getElementById('detail-panel').style.display='none';
  if(node){node.attr('opacity',1);link.attr('stroke','#222').attr('stroke-opacity',0.6);label.attr('opacity',1);}
  selectedNode=null;
}

var inWalkView=false;
function onNodeClick(d){
  var walk=document.getElementById('walk-mode').checked;
  if(walk){walkComponent(d);}else{selectNode(d);}
}
function walkComponent(d){
  fetch('/api/graph/'+encodeURIComponent(d.slug)+'/component').then(function(r){return r.json();}).then(function(data){
    inWalkView=true;
    currentData=data;
    var suffix=data.truncated?' (truncated)':'';
    document.getElementById('node-count').textContent='walked from '+d.name+' — '+data.nodes.length+' nodes, '+data.edges.length+' edges'+suffix;
    render(data);
    var start=data.nodes.find(function(n){return n.center;})||d;
    selectNode(start);
  });
}
function resetView(){inWalkView=false;closePanel();reloadGraph();}

function dragStart(e,d){if(!e.active)simulation.alphaTarget(0.3).restart();d.fx=d.x;d.fy=d.y;}
function dragging(e,d){d.fx=e.x;d.fy=e.y;}
function dragEnd(e,d){if(!e.active)simulation.alphaTarget(0);d.fx=null;d.fy=null;}

function reloadGraph(){
  var v=document.getElementById('type-filter').value;
  var scenes=document.getElementById('show-scenes').checked;
  var url='/api/graph';
  if(v)url+='?type='+v;
  fetch(url).then(function(r){return r.json();}).then(function(data){
    if(scenes){
      fetch('/api/graph?type=scene').then(function(r){return r.json();}).then(function(sc){
        data.nodes=data.nodes.concat(sc.nodes);
        fetch('/api/graph?type=_all').then(function(r){return r.json();}).then(function(all){
          var ids=new Set(data.nodes.map(function(n){return n.id;}));
          all.edges.forEach(function(e){
            if(ids.has(e.source)&&ids.has(e.target)){
              var dup=data.edges.some(function(x){return x.source===e.source&&x.target===e.target&&x.type===e.type;});
              if(!dup)data.edges.push(e);
            }
          });
          currentData=data;
          document.getElementById('node-count').textContent=data.nodes.length+' nodes, '+data.edges.length+' edges';
          render(data);
        });
      });
    } else {
      currentData=data;
      document.getElementById('node-count').textContent=data.nodes.length+' nodes, '+data.edges.length+' edges';
      render(data);
    }
  });
}
document.getElementById('type-filter').addEventListener('change',resetView);
document.getElementById('show-scenes').addEventListener('change',resetView);
document.getElementById('reset-view').addEventListener('click',resetView);

loadGraph('/api/graph');

svg.on('click',function(e){if(e.target.tagName==='svg')closePanel();});
</script>`;

  // graph page uses full-width override
  const page = `<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Graph — A(DAI)</title><style>${CSS}#graph-container{margin:-2rem -1.5rem}#graph-svg{background:#0a0a0a;display:block}</style></head><body><div class='wrap'><header><h1>A<span>(DAI)</span></h1><nav><a href='/'>Home</a><a href='/explore'>Explore</a><a href='/graph'>Graph</a><a href='/contribute'>Contribute</a><a href='/review'>Review</a><a href='/api/stats'>Stats</a></nav></header>${graphBody}<footer>A(DAI) — digital arts knowledge commons</footer></div></body></html>`;

  res.set(HTML_HEADERS).send(page);
});

// GET /field — data-driven p5-derived dot-field view (assets in public/field)
router.get("/field", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "..", "public", "field", "index.html"));
});

// GET /embed-space — scatter plot of the multimodal embedding space, UMAP
// projected to 2D. Sees the *vectors* directly rather than the derived
// edges. Practitioners cluster by aesthetic, artworks by visual similarity.
router.get("/embed-space", (_req, res) => {
  const body = `<h2>Embedding space <span class='tag'>UMAP 2D</span></h2>
<p class='meta'>Each dot is a node embedded by Gemini Embedding 2 (768-d, fused text+image for artworks). Projected to 2D via UMAP with cosine metric. Locally faithful — adjacency on the page implies adjacency in vector space. Globally indicative, not metric. Hover for details, click to open a profile.</p>

<div id='embed-controls' style='display:flex;flex-wrap:wrap;gap:0.6rem;align-items:center;margin:0.6rem 0;font-size:0.85rem'>
  <span class='meta'>show:</span>
  <label><input type='checkbox' class='filter' value='artwork' checked> <span class='tag' style='background:#a8915c'>artwork</span></label>
  <label><input type='checkbox' class='filter' value='practitioner' checked> <span class='tag' style='background:#6a8aaa'>practitioner</span></label>
  <label><input type='checkbox' class='filter' value='collective' checked> <span class='tag' style='background:#7aa890'>collective</span></label>
  <label><input type='checkbox' class='filter' value='concept' checked> <span class='tag' style='background:#aa9a6a'>concept</span></label>
  <label><input type='checkbox' class='filter' value='scene' checked> <span class='tag' style='background:#aa6a8a'>scene</span></label>
  &nbsp;<span class='meta'>·</span>
  <input id='search' type='text' placeholder='search by name…' style='background:#1a1a1a;color:#d4d4d4;border:1px solid #333;padding:0.3rem;width:14rem'>
  <span class='meta' id='count-readout'></span>
</div>

<div id='embed-wrap' style='position:relative;background:#0a0a0a;border:1px solid #1f1f1f;border-radius:4px;margin:0 -1.5rem'>
  <canvas id='embed-canvas' style='display:block;width:100%;height:78vh;cursor:crosshair'></canvas>
  <div id='embed-tip' style='position:absolute;pointer-events:none;background:#000;border:1px solid #2a2a2a;padding:0.4rem 0.6rem;font-size:0.78rem;color:#d4d4d4;border-radius:4px;display:none;max-width:280px;line-height:1.3;z-index:10'></div>
  <div style='position:absolute;bottom:0.4rem;right:0.6rem;font-size:0.7rem;color:#666'>scroll: zoom · drag: pan · 'r': reset</div>
</div>

<script>
(async () => {
  const tip = document.getElementById('embed-tip');
  const wrap = document.getElementById('embed-wrap');
  const canvas = document.getElementById('embed-canvas');
  const countReadout = document.getElementById('count-readout');
  const ctx = canvas.getContext('2d');
  let dpr = Math.max(1, window.devicePixelRatio || 1);

  const colors = {
    artwork:      '#d4b06a',
    practitioner: '#7aa8d4',
    collective:   '#8acab0',
    concept:      '#ccb87a',
    scene:        '#d48aac',
    institution:  '#8a8a8a',
  };
  const centroidColor = '#888';

  const filters = new Set(['artwork','practitioner','collective','concept','scene']);
  let searchTerm = '';

  // View state — model coords are in [-1, 1]; we map to canvas via these.
  let zoom = 1;
  let panX = 0, panY = 0;

  function resize() {
    const r = wrap.getBoundingClientRect();
    canvas.width = Math.floor(r.width * dpr);
    canvas.height = Math.floor(r.height * dpr);
    canvas.style.width = r.width + 'px';
    canvas.style.height = r.height + 'px';
    draw();
  }
  window.addEventListener('resize', resize);

  let items = [];
  let visible = [];
  try {
    const resp = await fetch('/api/embed-space');
    if (!resp.ok) throw new Error('embed-space endpoint returned ' + resp.status);
    const data = await resp.json();
    items = data.items;
  } catch (err) {
    canvas.replaceWith(Object.assign(document.createElement('p'), {
      textContent: 'UMAP projection not available. Run seed/_build/.venv/bin/python3 seed/_build/project_umap.py first.',
      className: 'meta',
    }));
    return;
  }

  function projectX(mx) { return canvas.width * (mx * 0.4 * zoom + 0.5 + panX); }
  function projectY(my) { return canvas.height * (my * 0.4 * zoom + 0.5 + panY); }
  function unprojectX(cx) { return (cx / canvas.width - 0.5 - panX) / (0.4 * zoom); }
  function unprojectY(cy) { return (cy / canvas.height - 0.5 - panY) / (0.4 * zoom); }

  function rebuildVisible() {
    const term = searchTerm.trim().toLowerCase();
    visible = items.filter(it => {
      if (!filters.has(it.type)) return false;
      if (term && !(it.name || it.id).toLowerCase().includes(term)) return false;
      return true;
    });
    if (countReadout) countReadout.textContent = visible.length + ' / ' + items.length + ' shown';
  }

  function draw() {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    rebuildVisible();
    // Highlight matched search term in brighter render.
    const term = searchTerm.trim().toLowerCase();
    for (const it of visible) {
      const x = projectX(it.x);
      const y = projectY(it.y);
      if (x < -10 || x > canvas.width + 10 || y < -10 || y > canvas.height + 10) continue;
      const r = 2 * dpr;
      ctx.fillStyle = colors[it.type] || '#888';
      ctx.globalAlpha = term && (it.name||it.id).toLowerCase().includes(term) ? 1.0 : 0.65;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function hitTest(cxCss, cyCss) {
    const cx = cxCss * dpr;
    const cy = cyCss * dpr;
    let best = null, bestD2 = Infinity;
    const r2 = (6 * dpr) ** 2;
    for (const it of visible) {
      const dx = projectX(it.x) - cx;
      const dy = projectY(it.y) - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2 && d2 < r2) { best = it; bestD2 = d2; }
    }
    return best;
  }

  // Hover
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    const cxCss = e.clientX - r.left;
    const cyCss = e.clientY - r.top;
    const hit = hitTest(cxCss, cyCss);
    if (hit) {
      const img = hit.cdn_image_url || hit.image_url;
      const thumb = img ? '<img src="' + img + '" alt="" style="width:120px;height:120px;object-fit:cover;border-radius:3px;display:block;margin-bottom:0.3rem">' : '';
      const yearBit = hit.year ? ' <span class="meta">(' + hit.year + ')</span>' : '';
      tip.innerHTML = thumb +
        '<div><strong>' + (hit.name || hit.id) + '</strong>' + yearBit + '</div>' +
        '<div class="meta"><span class="tag">' + hit.type + '</span> · ' + hit.kind + '</div>';
      tip.style.display = 'block';
      // Position with offset so the tip doesn't sit under the cursor.
      const wrapRect = wrap.getBoundingClientRect();
      const tipX = Math.min(cxCss + 12, wrapRect.width - 300);
      const tipY = Math.min(cyCss + 12, wrapRect.height - 200);
      tip.style.left = tipX + 'px';
      tip.style.top = tipY + 'px';
    } else {
      tip.style.display = 'none';
    }
  });
  canvas.addEventListener('mouseleave', () => { tip.style.display = 'none'; });

  // Click to open profile
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    const hit = hitTest(e.clientX - r.left, e.clientY - r.top);
    if (hit && hit.type && hit.slug) {
      window.open('/' + encodeURIComponent(hit.type) + '/' + encodeURIComponent(hit.slug), '_blank');
    }
  });

  // Pan via drag
  let dragging = false, dragLast = null;
  canvas.addEventListener('mousedown', (e) => {
    dragging = true;
    dragLast = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = 'grabbing';
  });
  window.addEventListener('mouseup', () => { dragging = false; canvas.style.cursor = 'crosshair'; });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragLast.x;
    const dy = e.clientY - dragLast.y;
    dragLast = { x: e.clientX, y: e.clientY };
    panX += dx / canvas.clientWidth;
    panY += dy / canvas.clientHeight;
    draw();
  });

  // Wheel zoom around cursor
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const cxCss = e.clientX - r.left;
    const cyCss = e.clientY - r.top;
    const mxBefore = unprojectX(cxCss * dpr);
    const myBefore = unprojectY(cyCss * dpr);
    const factor = e.deltaY > 0 ? 1 / 1.15 : 1.15;
    zoom = Math.max(0.4, Math.min(40, zoom * factor));
    const mxAfter = unprojectX(cxCss * dpr);
    const myAfter = unprojectY(cyCss * dpr);
    panX += (mxAfter - mxBefore) * 0.4 * zoom;
    panY += (myAfter - myBefore) * 0.4 * zoom;
    draw();
  }, { passive: false });

  // Keyboard: 'r' resets the view
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'r' || e.key === 'R') {
      zoom = 1; panX = 0; panY = 0; draw();
    }
  });

  // Filter / search wiring
  document.querySelectorAll('input.filter').forEach((el) => {
    el.addEventListener('change', () => {
      filters.clear();
      document.querySelectorAll('input.filter:checked').forEach((c) => filters.add(c.value));
      draw();
    });
  });
  document.getElementById('search').addEventListener('input', (e) => {
    searchTerm = e.target.value;
    draw();
  });

  resize();
})();
</script>`;
  const page = `<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Embedding space — A(DAI)</title><style>${CSS}#embed-wrap canvas{background:#0a0a0a}</style></head><body><div class='wrap'><header><h1>A<span>(DAI)</span></h1><nav><a href='/'>Home</a><a href='/explore'>Explore</a><a href='/graph'>Graph</a><a href='/field'>Field</a><a href='/embed-space'>Embed space</a><a href='/contribute'>Contribute</a><a href='/review'>Review</a></nav></header>${body}<footer>A(DAI) — digital arts knowledge commons</footer></div></body></html>`;
  res.set(HTML_HEADERS).send(page);
});

export default router;
