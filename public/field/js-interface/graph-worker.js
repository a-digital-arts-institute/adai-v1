/**
 * A(DAI) — graph worker
 *
 * Owns every expensive part of loading the /field graph so the main thread
 * never blocks: streaming fetch, NDJSON parse, index build, and the
 * IndexedDB cache all run in here. The main thread (graph-loader.js) only
 * receives the finished, structured-cloned index and wraps it with method
 * closures before handing it to the renderer.
 *
 * Why this exists: the graph grew 1.5k -> 8.6k nodes / 5k -> 27k curated
 * edges. The old path (one 9 MB /api/graph blob, JSON.parse + index on the
 * main thread, cached to localStorage) froze the tab on load and silently
 * overflowed localStorage's ~5 MB quota so the cache never persisted. Here:
 *   - /api/graph/stream is NDJSON, parsed incrementally as bytes arrive
 *     (network + parse overlap, no single giant parse);
 *   - the index is built off the main thread;
 *   - the raw arrays are cached in IndexedDB (hundreds of MB quota), keyed on
 *     a (nodes:curated_edges) stamp, so repeat visits skip the network and
 *     the parse entirely.
 *
 * Protocol (main -> worker):
 *   { type:'load',    stamp, streamUrl }   request the curated graph
 *   { type:'derived', url }                fetch the lazy STYLE_KIN/VISUALLY_AFFINE layer
 * Protocol (worker -> main):
 *   { type:'progress', phase, nodes, edges }
 *   { type:'ready',    fromCache, payload:{nodes,edges,byId,byType,neighbors,edgesOf,edgeTypeCount,intention} }
 *   { type:'derived',  edges }
 *   { type:'error',    message, fatal }
 */

'use strict';

const IDB_NAME = 'adai-field';
const IDB_STORE = 'graph';
const IDB_KEY = 'current';

// ---- IndexedDB (promise wrappers) ---------------------------------------
// IDB is a best-effort cache only. On Safari, indexedDB.open() intermittently
// never fires any callback on reload (the prior page's connection is slow to
// release), which would hang the whole load. So this open() races a timeout and
// also handles onblocked — any failure rejects, and the callers degrade to a
// plain network load. The 3s budget is generous for a local DB open.
function idbOpen() {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn, arg) => { if (settled) return; settled = true; clearTimeout(timer); fn(arg); };
    const timer = setTimeout(() => finish(reject, new Error('idb open timeout')), 3000);
    let req;
    try {
      req = indexedDB.open(IDB_NAME, 1);
    } catch (err) {
      finish(reject, err);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => finish(resolve, req.result);
    req.onerror = () => finish(reject, req.error || new Error('idb open error'));
    req.onblocked = () => finish(reject, new Error('idb open blocked'));
  });
}

function idbGet(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Best-effort cache read; any IndexedDB failure (private mode, quota, etc.)
// degrades silently to a network load.
async function readCache(stamp) {
  try {
    const db = await idbOpen();
    const rec = await idbGet(db, IDB_KEY);
    db.close();
    if (rec && rec.stamp === stamp && rec.nodes && rec.edges) return rec;
    return null;
  } catch {
    return null;
  }
}

async function writeCache(stamp, nodes, edges) {
  try {
    const db = await idbOpen();
    await idbPut(db, IDB_KEY, { stamp, nodes, edges, savedAt: Date.now() });
    db.close();
  } catch {
    /* cache is an optimisation; never fatal */
  }
}

// ---- NDJSON streaming fetch ---------------------------------------------
// Reads the response body as it arrives, splitting on newlines and parsing
// each complete line. Carries a partial trailing line across chunk
// boundaries. Returns { nodes, edges, meta }.
async function streamGraph(url, onNodesReady) {
  // Stall guard: Safari can leave a Worker fetch's reader.read() pending forever
  // on reload. Re-arm a timer on every chunk; if no bytes arrive for STALL_MS,
  // abort so this surfaces as an error (→ main-thread fallback) instead of a
  // permanent hang. Armed before the fetch so a stalled connect is covered too.
  const STALL_MS = 8000;
  const ctrl = new AbortController();
  let stallTimer = null;
  const arm = () => { if (stallTimer) clearTimeout(stallTimer); stallTimer = setTimeout(() => ctrl.abort(), STALL_MS); };
  const disarm = () => { if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; } };
  arm();
  let res;
  try {
    res = await fetch(url, { cache: 'no-cache', signal: ctrl.signal });
  } catch (err) {
    disarm();
    throw err;
  }
  if (!res.ok) { disarm(); throw new Error(`HTTP ${res.status}`); }
  const nodes = [];
  const edges = [];
  let meta = null;
  let nodesFlushed = false;
  // The server emits the meta line, then every node, then every edge. The
  // first edge line means all nodes are in — flush them so the field can paint
  // the constellation while the edges (only needed on zoom) keep streaming.
  const handle = (line) => {
    if (!line) return;
    let obj;
    try { obj = JSON.parse(line); } catch { return; }
    if (obj.n) nodes.push(obj.n);
    else if (obj.e) {
      if (!nodesFlushed) { nodesFlushed = true; onNodesReady(nodes); }
      edges.push(obj.e);
    } else if (obj.meta) meta = obj.meta;
  };

  if (!res.body || !res.body.getReader) {
    // No streaming support — fall back to a single text read (still stall-timed).
    const text = await res.text();
    disarm();
    for (const line of text.split('\n')) handle(line);
    if (!nodesFlushed) onNodesReady(nodes);
    return { nodes, edges, meta };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let carry = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    arm();   // got bytes — reset the stall window
    carry += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = carry.indexOf('\n')) >= 0) {
      handle(carry.slice(0, nl));
      carry = carry.slice(nl + 1);
    }
  }
  disarm();
  carry += decoder.decode();
  if (carry) {
    for (const line of carry.split('\n')) handle(line);
  }
  // Edge-free graph: nodes never got flushed via a first-edge line.
  if (!nodesFlushed) onNodesReady(nodes);
  return { nodes, edges, meta };
}

function parseLines(lines) {
  const nodes = [];
  const edges = [];
  let meta = null;
  for (const line of lines) {
    if (!line) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (obj.n) nodes.push(obj.n);
    else if (obj.e) edges.push(obj.e);
    else if (obj.meta) meta = obj.meta;
  }
  return { nodes, edges, meta };
}

// ---- Index build (data maps only — methods are attached on the main side) -
// Mirror of graph-loader's legacy indexGraph(), minus the closures (which
// don't survive structured clone). Builds the lookup maps the renderer needs.
function buildIndex(nodes, edges) {
  const byId = new Map();
  const byType = new Map();
  for (const n of nodes) {
    byId.set(n.id, n);
    let list = byType.get(n.type);
    if (!list) { list = []; byType.set(n.type, list); }
    list.push(n);
  }

  const neighbors = new Map();
  const edgesOf = new Map();
  const edgeTypeCount = new Map();

  for (const e of edges) {
    const { source, target, type } = e;
    if (!byId.has(source) || !byId.has(target)) continue;

    let nS = neighbors.get(source); if (!nS) { nS = new Set(); neighbors.set(source, nS); }
    let nT = neighbors.get(target); if (!nT) { nT = new Set(); neighbors.set(target, nT); }
    nS.add(target);
    nT.add(source);

    let eS = edgesOf.get(source); if (!eS) { eS = []; edgesOf.set(source, eS); }
    let eT = edgesOf.get(target); if (!eT) { eT = []; edgesOf.set(target, eT); }
    eS.push(e);
    eT.push(e);

    let mS = edgeTypeCount.get(source); if (!mS) { mS = new Map(); edgeTypeCount.set(source, mS); }
    let mT = edgeTypeCount.get(target); if (!mT) { mT = new Map(); edgeTypeCount.set(target, mT); }
    mS.set(type, (mS.get(type) || 0) + 1);
    mT.set(type, (mT.get(type) || 0) + 1);
  }

  // Seed intention from the server-provided per-node value (n.int) so the
  // node-only first paint can order the layout correctly before edges exist;
  // once edges are indexed, the computed count overrides it (identical value
  // for the curated graph, richer once the derived overlay merges).
  const intention = new Map();
  for (const n of nodes) if (typeof n.int === 'number') intention.set(n.id, n.int);
  for (const [id, m] of edgeTypeCount) intention.set(id, m.size);

  return { nodes, edges, byId, byType, neighbors, edgesOf, edgeTypeCount, intention };
}

// ---- message handlers ----------------------------------------------------
async function handleLoad(stamp, streamUrl) {
  // 1. Cache hit? Repeat visits are instant — no need to stage, post the full
  //    index in one go.
  const cached = await readCache(stamp);
  if (cached) {
    const payload = buildIndex(cached.nodes, cached.edges);
    self.postMessage({ type: 'ready', fromCache: true, payload });
    return;
  }
  // 2. Stream. Post the node-only index the moment all nodes are in (the field
  //    paints the constellation), then post the edges for the main thread to
  //    merge once the rest of the stream lands.
  const { nodes, edges } = await streamGraph(streamUrl, (nodesSoFar) => {
    if (!nodesSoFar.length) return;
    self.postMessage({ type: 'nodes', payload: buildIndex(nodesSoFar, []) });
  });
  if (!nodes.length) throw new Error('stream returned no nodes');
  self.postMessage({ type: 'edges', edges });
  // 3. Persist for next time (after posting, so render isn't delayed).
  await writeCache(stamp, nodes, edges);
}

async function handleDerived(url) {
  // Timeout so a stalled Safari fetch can't leave embeddings-mode hanging — on
  // abort this throws → onmessage posts a non-fatal error → loader resolves(0).
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { cache: 'no-cache', signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    self.postMessage({ type: 'derived', edges: data.edges || [] });
  } finally {
    clearTimeout(timer);
  }
}

self.onmessage = (ev) => {
  const msg = ev.data || {};
  if (msg.type === 'load') {
    handleLoad(msg.stamp, msg.streamUrl).catch((err) =>
      self.postMessage({ type: 'error', message: String(err && err.message || err), fatal: true })
    );
  } else if (msg.type === 'derived') {
    handleDerived(msg.url).catch((err) =>
      self.postMessage({ type: 'error', message: String(err && err.message || err), fatal: false })
    );
  }
};
