import { Router } from "express";
import { getDb } from "../db.js";
import { htmlPage, htmlEscape, CSS, HTML_HEADERS } from "../templates.js";

const router = Router();

// GET / — home page
router.get("/", (_req, res) => {
  const db = getDb();
  const { count: practitionerCount } = db
    .prepare("SELECT COUNT(*) as count FROM nodes WHERE type NOT IN ('related', 'concept', 'scene')")
    .get() as any;
  const { count: edgeCount } = db.prepare("SELECT COUNT(*) as count FROM edges").get() as any;
  const { count: typeCount } = db.prepare("SELECT COUNT(DISTINCT type) as count FROM nodes").get() as any;

  let body = `<h2>Digital Arts Knowledge Commons</h2>
<p>A(DAI) maps practitioners, concepts, scenes, and their relationships across the digital arts landscape. A living graph built through collective contribution.</p>
<div class='stats-grid'>
<div class='stat-box'><div class='num'>${practitionerCount}</div><div class='label'>practitioners</div></div>
<div class='stat-box'><div class='num'>${edgeCount}</div><div class='label'>connections</div></div>
<div class='stat-box'><div class='num'>${typeCount}</div><div class='label'>node types</div></div>
</div>
<h2>Recent Additions</h2>`;

  const recent = db
    .prepare("SELECT id, name, type, slug FROM nodes WHERE type NOT IN ('related', 'concept', 'scene') ORDER BY created_at DESC LIMIT 10")
    .all() as any[];

  for (const r of recent) {
    body += `<div class='card'><h3><a href='/practitioner/${r.slug}'>${r.name}</a></h3><span class='tag'>${r.type}</span></div>`;
  }

  res.set(HTML_HEADERS).send(htmlPage("Home", body));
});

// GET /explore — list all practitioners
router.get("/explore", (_req, res) => {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, name, type, slug FROM nodes WHERE type NOT IN ('related', 'concept', 'scene') ORDER BY name")
    .all() as any[];

  let body = `<h2>Explore</h2><p class='meta'>${rows.length} practitioners, collectives, platforms, and projects</p>`;

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
    res.status(404).set(HTML_HEADERS).send(htmlPage("Not Found", "<h2>Not Found</h2><p>No practitioner with that slug.</p>"));
    return;
  }

  let body = `<h2>${node.name}</h2><span class='tag'>${node.type}</span>`;

  // parse metadata JSON if present
  if (node.metadata) {
    try {
      const meta = JSON.parse(node.metadata);

      if (meta.basic_info) {
        const info = meta.basic_info;
        body += `<div style='margin:1rem 0'>`;
        if (info.location) body += `<p class='meta'>Location: ${info.location}</p>`;
        if (info.active_years) body += `<p class='meta'>Active: ${info.active_years}</p>`;
        if (info.url) body += `<p class='meta'>Web: <a href='${info.url}'>${info.url}</a></p>`;
        body += `</div>`;
      }

      if (meta.practice_description) {
        const practice = meta.practice_description;
        if (practice.practice_summary) {
          body += `<h3>practice</h3><p>${practice.practice_summary}</p>`;
        }
        if (practice.medium) {
          body += `<div style='margin:0.5rem 0'>`;
          for (const m of practice.medium.split(",")) {
            body += `<span class='tag'>${m.trim()}</span>`;
          }
          body += `</div>`;
        }
        if (practice.methodology) {
          body += `<h3>methodology</h3><p>${practice.methodology}</p>`;
        }
      }

      if (meta.key_works?.works) {
        body += `<h3>key works</h3>`;
        for (const work of meta.key_works.works) {
          body += `<div class='card'><strong>${work.title}</strong>`;
          if (work.year != null) body += ` <span class='meta'>(${work.year})</span>`;
          if (work.description) body += `<p style='margin-top:0.4rem'>${work.description}</p>`;
          body += `</div>`;
        }
      }

      if (meta.commons_orientation?.commons_summary) {
        body += `<h3>commons orientation</h3><p>${meta.commons_orientation.commons_summary}</p>`;
      }

      if (meta.governance_model?.governance_detail) {
        body += `<h3>governance</h3><p>${meta.governance_model.governance_detail}</p>`;
      }
    } catch {
      // metadata not valid JSON, skip
    }
  }

  // approved community contributions
  const contribs = db
    .prepare(
      "SELECT s.title, s.summary, s.content, s.source_url, s.submitted_by, s.created_at FROM signals s JOIN intake_queue iq ON iq.signal_id = s.id WHERE iq.target_node = ? AND iq.status = 'approved' ORDER BY s.created_at DESC"
    )
    .all(node.id) as any[];

  if (contribs.length > 0) {
    body += `<h3>community contributions (${contribs.length})</h3>`;
    for (const c of contribs) {
      body += `<div class='card'>`;
      if (c.title) body += `<strong>${htmlEscape(String(c.title))}</strong>`;
      if (c.content) body += `<p>${htmlEscape(String(c.content))}</p>`;
      if (c.source_url) body += `<p class='meta'>Source: <a href='${htmlEscape(String(c.source_url))}'>${htmlEscape(String(c.source_url))}</a></p>`;
      if (c.submitted_by) body += `<p class='meta'>Contributed by: ${htmlEscape(String(c.submitted_by))}</p>`;
      body += `</div>`;
    }
  }

  // edges
  const edges = db
    .prepare(
      "SELECT e.id, e.source_id, e.target_id, e.edge_type, n1.name as source_name, n1.slug as source_slug, n2.name as target_name, n2.slug as target_slug FROM edges e LEFT JOIN nodes n1 ON e.source_id = n1.id LEFT JOIN nodes n2 ON e.target_id = n2.id WHERE e.source_id = ? OR e.target_id = ?"
    )
    .all(node.id, node.id) as any[];

  if (edges.length > 0) {
    body += `<h3>connections (${edges.length})</h3><ul class='edge-list'>`;
    for (const e of edges) {
      const otherName = e.source_id === node.id ? e.target_name : e.source_name;
      const otherSlug = e.source_id === node.id ? e.target_slug : e.source_slug;
      body += `<li><span class='edge-type'>${e.edge_type}</span> <a href='/practitioner/${otherSlug}'>${otherName}</a></li>`;
    }
    body += `</ul>`;
  }

  // data export link
  body += `<p style='margin-top:2rem'><a href='/practitioner/${slug}/data' class='btn'>Export JSON</a></p>`;

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
  const practitioners = db
    .prepare("SELECT id, name, slug FROM nodes WHERE type NOT IN ('related', 'concept', 'scene') ORDER BY name")
    .all() as any[];

  let options = "";
  for (const p of practitioners) {
    options += `<option value='${p.id}'>${p.name}</option>`;
  }

  const formBody = `<h2>Contribute a Signal</h2>
<p>Submit information about a practitioner. Contributions from new contributors go to the review queue.</p>
<form id='contribute-form'>
<label>About which practitioner</label>
<select name='target_node' required>${options}</select>
<label>Signal title</label>
<input type='text' name='title' placeholder='e.g. New exhibition at Serpentine' required>
<label>Content</label>
<textarea name='content' placeholder='Describe the signal...' required></textarea>
<label>Source URL (optional)</label>
<input type='text' name='source_url' placeholder='https://...'>
<label>Your name</label>
<input type='text' name='contributor_name' placeholder='Your name or handle' required>
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
<option value=''>Practitioners + Concepts</option>
<option value='artist'>Artists only</option>
<option value='collective'>Collectives only</option>
<option value='platform'>Platforms only</option>
<option value='theorist'>Theorists only</option>
<option value='_all'>Everything</option>
</select>
<label style='margin-left:0.5rem;font-size:0.8rem;color:#666'><input type='checkbox' id='show-scenes'> + Scenes</label>
<span id='node-count' style='margin-left:1rem;font-size:0.75rem;color:#555'></span>
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
  artist:'#7eb8da',collective:'#da7e7e',platform:'#7eda98',
  theorist:'#dab87e',institution:'#b87eda',project:'#7edac4',
  concept:'#555',scene:'#444',related:'#333',
  'artist-collective':'#da7e7e','artist-project':'#7edac4',
  'artist-writer':'#dab87e',artwork:'#b87eda',
  'exhibition-publication':'#7eda98',gallery:'#da7e7e',
  report:'#555',theoretical:'#dab87e'
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
    .attr('r',function(d){return d.center?12:(d.type==='concept'||d.type==='scene')?4:8;})
    .attr('fill',function(d){return typeColors[d.type]||'#555';})
    .attr('stroke',function(d){return d.center?'#fff':'none';})
    .attr('stroke-width',function(d){return d.center?2:0;})
    .attr('cursor','pointer')
    .call(d3.drag().on('start',dragStart).on('drag',dragging).on('end',dragEnd))
    .on('click',function(e,d){selectNode(d);});

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
document.getElementById('type-filter').addEventListener('change',reloadGraph);
document.getElementById('show-scenes').addEventListener('change',reloadGraph);

loadGraph('/api/graph');

svg.on('click',function(e){if(e.target.tagName==='svg')closePanel();});
</script>`;

  // graph page uses full-width override
  const page = `<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Graph — A(DAI)</title><style>${CSS}#graph-container{margin:-2rem -1.5rem}#graph-svg{background:#0a0a0a;display:block}</style></head><body><div class='wrap'><header><h1>A<span>(DAI)</span></h1><nav><a href='/'>Home</a><a href='/explore'>Explore</a><a href='/graph'>Graph</a><a href='/contribute'>Contribute</a><a href='/review'>Review</a><a href='/api/stats'>Stats</a></nav></header>${graphBody}<footer>A(DAI) — digital arts knowledge commons</footer></div></body></html>`;

  res.set(HTML_HEADERS).send(page);
});

export default router;
