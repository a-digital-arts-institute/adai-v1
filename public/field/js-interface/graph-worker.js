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
function idbOpen() {
  return new Promise((resolve, reject) => {
    let req;
    try {
      req = indexedDB.open(IDB_NAME, 1);
    } catch (err) {
      reject(err);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
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
async function streamGraph(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!res.body || !res.body.getReader) {
    // No streaming support — fall back to a single text read.
    const text = await res.text();
    return parseLines(text.split('\n'));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const nodes = [];
  const edges = [];
  let meta = null;
  let carry = '';
  let lastPing = 0;

  const handle = (line) => {
    if (!line) return;
    let obj;
    try { obj = JSON.parse(line); } catch { return; }
    if (obj.n) nodes.push(obj.n);
    else if (obj.e) edges.push(obj.e);
    else if (obj.meta) meta = obj.meta;
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    carry += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = carry.indexOf('\n')) >= 0) {
      handle(carry.slice(0, nl));
      carry = carry.slice(nl + 1);
    }
    // Throttle progress pings (~10/s) so we don't flood postMessage.
    const now = Date.now();
    if (now - lastPing > 100) {
      lastPing = now;
      self.postMessage({ type: 'progress', phase: 'stream', nodes: nodes.length, edges: edges.length });
    }
  }
  carry += decoder.decode();
  if (carry) {
    for (const line of carry.split('\n')) handle(line);
  }
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

  const intention = new Map();
  for (const [id, m] of edgeTypeCount) intention.set(id, m.size);

  return { nodes, edges, byId, byType, neighbors, edgesOf, edgeTypeCount, intention };
}

// ---- message handlers ----------------------------------------------------
async function handleLoad(stamp, streamUrl) {
  // 1. Cache hit?
  const cached = await readCache(stamp);
  if (cached) {
    const payload = buildIndex(cached.nodes, cached.edges);
    self.postMessage({ type: 'ready', fromCache: true, payload });
    return;
  }
  // 2. Stream from the network.
  const { nodes, edges } = await streamGraph(streamUrl);
  if (!nodes.length) throw new Error('stream returned no nodes');
  const payload = buildIndex(nodes, edges);
  self.postMessage({ type: 'ready', fromCache: false, payload });
  // 3. Persist for next time (after posting, so render isn't delayed).
  await writeCache(stamp, nodes, edges);
}

async function handleDerived(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  self.postMessage({ type: 'derived', edges: data.edges || [] });
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
