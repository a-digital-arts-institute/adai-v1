import { Router } from "express";
import { getDb } from "../db.js";
import { htmlPage, htmlEscape, CSS, HTML_HEADERS } from "../templates.js";

const router = Router();

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
    .prepare("SELECT id, name, slug FROM nodes WHERE type = 'classification_regime' ORDER BY CASE WHEN slug = 'adai' THEN 0 ELSE 1 END, name")
    .all() as any[];
  for (const r of regimes) {
    const rootTag = r.slug === "adai" ? `<span class='tag' style='background:#3a2e16;color:#f4c261'>absolute root</span>` : `<span class='tag'>classification_regime</span>`;
    body += `<div class='card'><h3><a href='/practitioner/${r.slug}'>${r.name}</a></h3>${rootTag}</div>`;
  }

  res.set(HTML_HEADERS).send(htmlPage("Home", body));
});

// GET /explore — list all practitioners
router.get("/explore", (_req, res) => {
  const db = getDb();
  const rows = db
    .prepare(`SELECT id, name, type, slug FROM nodes WHERE type NOT IN ${ENTITY_TYPES_EXCLUDE} ORDER BY name`)
    .all() as any[];

  let body = `<h2>Explore</h2><p class='meta'>${rows.length} entities — practitioners, artworks, collectives, platforms, institutions, and projects</p>`;

  for (const r of rows) {
    body += `<div class='card'><h3><a href='/practitioner/${r.slug}'>${r.name}</a></h3><span class='tag'>${r.type}</span></div>`;
  }

  res.set(HTML_HEADERS).send(htmlPage("Explore", body));
});

// GET /practitioner/:slug — profile page
router.get("/practitioner/:slug", (req, res) => {
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

  const contribs = db
    .prepare(
      "SELECT s.title, s.summary, s.content, s.source_url, s.submitted_by, s.created_at, s.consent_attribution FROM signals s JOIN intake_queue iq ON iq.signal_id = s.id WHERE iq.target_node = ? AND iq.status = 'approved' ORDER BY s.created_at DESC"
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

  body += `<p style='margin-top:2rem'><a href='/practitioner/${encodeURIComponent(slug)}/data' class='btn'>Export JSON</a></p>`;

  res.set(HTML_HEADERS).send(htmlPage(node.name, body));
});

// GET /practitioner/:slug/data — JSON data export
router.get("/practitioner/:slug/data", (req, res) => {
  const db = getDb();
  const slug = req.params.slug;

  const node = db.prepare("SELECT id, name, type, slug, metadata, created_at, updated_by FROM nodes WHERE slug = ?").get(slug) as any;
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

  const signalRows = db
    .prepare(
      "SELECT s.id, s.title, s.submitted_by FROM signals s JOIN intake_queue iq ON iq.signal_id = s.id WHERE iq.target_node = ? AND iq.status = 'approved'"
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
});

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

// GET /review — review queue
router.get("/review", (_req, res) => {
  const db = getDb();
  const { count: qCount } = db
    .prepare("SELECT COUNT(*) as count FROM intake_queue WHERE status = 'pending'")
    .get() as any;

  let body = `<h2>Review Queue</h2><p class='meta'>${qCount} pending signals</p>`;

  if (qCount === 0) {
    body += `<p>No pending signals to review.</p>`;
  } else {
    const items = db
      .prepare(
        "SELECT iq.id, iq.signal_id, iq.target_node, iq.submitted_by, iq.trust_tier, iq.created_at, s.title, s.content, s.source_url, n.name as target_name FROM intake_queue iq LEFT JOIN signals s ON iq.signal_id = s.id LEFT JOIN nodes n ON iq.target_node = n.id WHERE iq.status = 'pending' ORDER BY iq.created_at DESC"
      )
      .all() as any[];

    for (const item of items) {
      const qtitle = htmlEscape(String(item.title ?? ""));
      const qcontent = htmlEscape(String(item.content ?? ""));
      const qurl = htmlEscape(String(item.source_url ?? ""));
      const qauthor = htmlEscape(String(item.submitted_by ?? ""));
      const qtier = htmlEscape(String(item.trust_tier ?? ""));
      const qtarget = htmlEscape(String(item.target_name ?? ""));
      const qdate = String(item.created_at ?? "");

      body += `<div class='card' id='item-${item.id}'>
<h3>${qtitle}</h3>
<p class='meta'>About: <strong>${qtarget}</strong> · By: ${qauthor} · Trust: <span class='tag'>${qtier}</span> · ${qdate}</p>
<p>${qcontent}</p>`;

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
<div style='margin-top:0.4rem;font-size:0.7rem;color:#555'>gold hub = A(DAI), the absolute root. red hubs = sub-regimes (the lens a node was seen through). click any node to walk its connected component.</div>
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
    .attr('r',function(d){return d.slug==='adai'?16:d.center?12:d.type==='classification_regime'?11:(d.type==='concept'||d.type==='scene')?4:8;})
    .attr('fill',function(d){return d.slug==='adai'?'#f4c261':(typeColors[d.type]||'#555');})
    .attr('stroke',function(d){return d.center?'#fff':'none';})
    .attr('stroke-width',function(d){return d.center?2:0;})
    .attr('cursor','pointer')
    .call(d3.drag().on('start',dragStart).on('drag',dragging).on('end',dragEnd))
    .on('click',function(e,d){onNodeClick(d);});

  node.append('title').text(function(d){return d.name+' ('+d.type+')';});

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
  document.getElementById('detail-name').textContent=d.name;
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

export default router;
