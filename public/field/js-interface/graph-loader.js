/**
 * A(DAI) — graph loader (streaming + worker + IndexedDB)
 *
 * Stage 1: /api/stats   -> window.ADAI_GRAPH_STATS, event 'adai:stats'
 * Step 1:  graph        -> window.ADAI_GRAPH,       event 'adai:graph'
 *
 * The heavy lifting (streaming fetch of /api/graph/stream, NDJSON parse,
 * index build, IndexedDB cache) runs in graph-worker.js so the main thread
 * never blocks. This file:
 *   - reads /api/stats (cheap) for the chrome vitals + the cache stamp;
 *   - hands the stamp to the worker; the worker streams or serves from cache;
 *   - wraps the worker's structured-cloned index maps with method closures
 *     (which don't survive postMessage) and emits 'adai:graph';
 *   - exposes window.ADAI_LOAD_DERIVED() so /field can lazy-load the
 *     STYLE_KIN / VISUALLY_AFFINE overlay the first time the user presses 'e'.
 *
 * The curated graph is cached in IndexedDB keyed on `${nodes}:${curated_edges}`
 * — a nightly re-derive changes only derived_edges, so it won't invalidate the
 * curated cache. Falls back to a plain /api/graph fetch where Workers are
 * unavailable.
 */
(() => {
  const STATS_URL   = '/api/stats';
  const STREAM_URL  = '/api/graph/stream';
  const DERIVED_URL = '/api/graph/derived';
  const GRAPH_URL   = '/api/graph';            // legacy, fallback only
  const STATS_TIMEOUT_MS = 6000;
  const GRAPH_TIMEOUT_MS = 20000;

  window.ADAI_GRAPH_STATS = window.ADAI_GRAPH_STATS || null;
  window.ADAI_GRAPH = window.ADAI_GRAPH || null;

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  // --- Loading indicator (unchanged behaviour from the legacy loader) ------
  const MIN_VISIBLE_MS = 600;
  const loadingEl = typeof document !== 'undefined'
    ? document.getElementById('field-loading')
    : null;
  const loadingShownAt = (typeof performance !== 'undefined' && performance.now)
    ? performance.now()
    : Date.now();
  let loadingDotsTimer = null;
  let loadingReadyTimer = null;
  function startLoadingDotsAnim() {
    if (!loadingEl || loadingDotsTimer) return;
    const dotsEl = loadingEl.querySelector('.field-loading__dots');
    if (!dotsEl) return;
    const frames = ['', '.', '..', '...'];
    let i = 0;
    dotsEl.textContent = frames[0];
    loadingDotsTimer = setInterval(() => {
      i = (i + 1) % frames.length;
      dotsEl.textContent = frames[i];
    }, 380);
  }
  function applyLoadingState(state, message) {
    if (!loadingEl) return;
    loadingEl.dataset.state = state;
    if (loadingDotsTimer) { clearInterval(loadingDotsTimer); loadingDotsTimer = null; }
    if (state === 'error') {
      const textEl = loadingEl.querySelector('.field-loading__text');
      const dotsEl = loadingEl.querySelector('.field-loading__dots');
      if (dotsEl) dotsEl.textContent = '';
      if (textEl && textEl.firstChild) textEl.firstChild.nodeValue = message || 'field unreachable';
    }
  }
  function setLoadingState(state, message) {
    if (!loadingEl) return;
    if (loadingReadyTimer) { clearTimeout(loadingReadyTimer); loadingReadyTimer = null; }
    if (state === 'ready') {
      const now = (typeof performance !== 'undefined' && performance.now)
        ? performance.now()
        : Date.now();
      const remaining = MIN_VISIBLE_MS - (now - loadingShownAt);
      if (remaining > 0) {
        loadingReadyTimer = setTimeout(() => applyLoadingState('ready'), remaining);
        return;
      }
    }
    applyLoadingState(state, message);
  }
  if (loadingEl) startLoadingDotsAnim();

  function writeVitals(stats) {
    const nodesEl = document.getElementById('v-nodes');
    const edgesEl = document.getElementById('v-edges');
    if (nodesEl) nodesEl.textContent = String(stats.nodes);
    if (edgesEl) edgesEl.textContent = String(stats.edges);
  }

  async function fetchJSON(url, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  // Attach the method closures the renderer expects onto the worker's
  // structured-cloned maps. Also wires mergeEdges() for the lazy derived layer.
  function wrapIndex(p, meta) {
    const { nodes, edges, byId, byType, neighbors, edgesOf, edgeTypeCount, intention } = p;

    function mergeEdges(newEdges) {
      for (const e of newEdges) {
        const { source, target, type } = e;
        if (!byId.has(source) || !byId.has(target)) continue;
        edges.push(e);

        let nS = neighbors.get(source); if (!nS) { nS = new Set(); neighbors.set(source, nS); }
        let nT = neighbors.get(target); if (!nT) { nT = new Set(); neighbors.set(target, nT); }
        nS.add(target); nT.add(source);

        let eS = edgesOf.get(source); if (!eS) { eS = []; edgesOf.set(source, eS); }
        let eT = edgesOf.get(target); if (!eT) { eT = []; edgesOf.set(target, eT); }
        eS.push(e); eT.push(e);

        let mS = edgeTypeCount.get(source); if (!mS) { mS = new Map(); edgeTypeCount.set(source, mS); }
        let mT = edgeTypeCount.get(target); if (!mT) { mT = new Map(); edgeTypeCount.set(target, mT); }
        mS.set(type, (mS.get(type) || 0) + 1);
        mT.set(type, (mT.get(type) || 0) + 1);
        intention.set(source, mS.size);
        intention.set(target, mT.size);
      }
    }

    return {
      nodes, edges,
      byId, byType,
      neighbors, edgesOf, edgeTypeCount, intention,
      intentionOf(id) { return intention.get(id) || 0; },
      neighborsOf(id) { return neighbors.get(id) || new Set(); },
      edgesFor(id) { return edgesOf.get(id) || []; },
      mergeEdges,
      meta: meta || null,
      fetchedAt: Date.now(),
    };
  }

  async function loadStats() {
    try {
      const raw = await fetchJSON(STATS_URL, STATS_TIMEOUT_MS);
      const stats = {
        nodes: Number(raw.total_nodes) || 0,
        edges: Number(raw.total_edges) || 0,
        curatedEdges: Number(raw.curated_edges) || 0,
        derivedEdges: Number(raw.derived_edges) || 0,
        signals: Number(raw.total_signals) || 0,
        pending: Number(raw.pending_reviews) || 0,
        fetchedAt: Date.now(),
      };
      window.ADAI_GRAPH_STATS = stats;
      writeVitals(stats);
      emit('adai:stats', stats);
      return stats;
    } catch (err) {
      console.warn('[adai] stats fetch failed:', err.message);
      emit('adai:stats', { error: err.message });
      return null;
    }
  }

  // --- Lazy derived layer (STYLE_KIN / VISUALLY_AFFINE) --------------------
  // /field calls this the first time it enters embeddings mode. Resolves once
  // (cached promise) and merges the overlay into the live index in place.
  let derivedPromise = null;
  function loadDerived() {
    if (derivedPromise) return derivedPromise;
    derivedPromise = new Promise((resolve) => {
      const graph = window.ADAI_GRAPH;
      if (!graph || typeof graph.mergeEdges !== 'function') { resolve(0); return; }

      const merge = (edges) => {
        graph.mergeEdges(edges);
        emit('adai:graph-derived', { count: edges.length });
        resolve(edges.length);
      };

      if (worker) {
        const onMsg = (ev) => {
          const m = ev.data || {};
          if (m.type === 'derived') { worker.removeEventListener('message', onMsg); merge(m.edges || []); }
          else if (m.type === 'error' && !m.fatal) { worker.removeEventListener('message', onMsg); resolve(0); }
        };
        worker.addEventListener('message', onMsg);
        worker.postMessage({ type: 'derived', url: DERIVED_URL });
      } else {
        fetchJSON(DERIVED_URL, GRAPH_TIMEOUT_MS)
          .then((d) => merge(d.edges || []))
          .catch((err) => { console.warn('[adai] derived fetch failed:', err.message); resolve(0); });
      }
    });
    return derivedPromise;
  }
  window.ADAI_LOAD_DERIVED = loadDerived;

  // --- Worker-driven load --------------------------------------------------
  let worker = null;

  function publish(payload, meta) {
    const indexed = wrapIndex(payload, meta);
    window.ADAI_GRAPH = indexed;
    setLoadingState('ready');
    emit('adai:graph', indexed);
  }

  function loadViaWorker(stats) {
    const stamp = `${stats.nodes}:${stats.curatedEdges}`;
    try {
      worker = new Worker('/field-static/js-interface/graph-worker.js?v=20260530a');
    } catch (err) {
      console.warn('[adai] worker spawn failed, falling back:', err.message);
      return loadFallback(stats);
    }
    worker.addEventListener('message', (ev) => {
      const m = ev.data || {};
      if (m.type === 'ready') {
        // Cache hit — full index in one shot.
        publish(m.payload, { stamp, fromCache: m.fromCache });
      } else if (m.type === 'nodes') {
        // Progressive: nodes are in, paint the constellation now. Edges follow.
        publish(m.payload, { stamp, fromCache: false, progressive: true });
      } else if (m.type === 'edges') {
        // Edges arrived — merge into the live index (curated edges are only
        // needed for zoom interactions, which happen well after first paint).
        const g = window.ADAI_GRAPH;
        if (g && typeof g.mergeEdges === 'function') {
          g.mergeEdges(m.edges);
          emit('adai:graph-edges', { count: m.edges.length });
        }
      } else if (m.type === 'error' && m.fatal) {
        console.warn('[adai] worker load failed, falling back:', m.message);
        loadFallback(stats);
      }
    });
    worker.addEventListener('error', (e) => {
      console.warn('[adai] worker error, falling back:', e.message);
      loadFallback(stats);
    });
    worker.postMessage({ type: 'load', stamp, streamUrl: STREAM_URL });
  }

  // Fallback: plain /api/graph fetch + main-thread index. No cache, no
  // streaming — only used where Workers are unavailable or the worker died.
  async function loadFallback(stats) {
    try {
      const raw = await fetchJSON(GRAPH_URL, GRAPH_TIMEOUT_MS);
      // Build the same maps buildIndex() would, inline.
      const nodes = raw.nodes || [];
      const edges = raw.edges || [];
      const byId = new Map(), byType = new Map();
      for (const n of nodes) {
        byId.set(n.id, n);
        let l = byType.get(n.type); if (!l) { l = []; byType.set(n.type, l); }
        l.push(n);
      }
      const neighbors = new Map(), edgesOf = new Map(), edgeTypeCount = new Map();
      for (const e of edges) {
        if (!byId.has(e.source) || !byId.has(e.target)) continue;
        let nS = neighbors.get(e.source); if (!nS) { nS = new Set(); neighbors.set(e.source, nS); }
        let nT = neighbors.get(e.target); if (!nT) { nT = new Set(); neighbors.set(e.target, nT); }
        nS.add(e.target); nT.add(e.source);
        let eS = edgesOf.get(e.source); if (!eS) { eS = []; edgesOf.set(e.source, eS); }
        let eT = edgesOf.get(e.target); if (!eT) { eT = []; edgesOf.set(e.target, eT); }
        eS.push(e); eT.push(e);
        let mS = edgeTypeCount.get(e.source); if (!mS) { mS = new Map(); edgeTypeCount.set(e.source, mS); }
        let mT = edgeTypeCount.get(e.target); if (!mT) { mT = new Map(); edgeTypeCount.set(e.target, mT); }
        mS.set(e.type, (mS.get(e.type) || 0) + 1);
        mT.set(e.type, (mT.get(e.type) || 0) + 1);
      }
      const intention = new Map();
      for (const [id, m] of edgeTypeCount) intention.set(id, m.size);
      // The legacy /api/graph already includes derived edges, so mark loaded.
      derivedPromise = Promise.resolve(edges.length);
      publish({ nodes, edges, byId, byType, neighbors, edgesOf, edgeTypeCount, intention }, { fallback: true });
    } catch (err) {
      console.warn('[adai] fallback graph fetch failed:', err.message);
      setLoadingState('error', 'field unreachable — retry');
      emit('adai:graph', { error: err.message });
    }
  }

  async function load() {
    const stats = await loadStats();
    if (!stats) { loadFallback({ nodes: 0, curatedEdges: 0 }); return; }
    if (typeof Worker !== 'undefined') loadViaWorker(stats);
    else loadFallback(stats);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load, { once: true });
  } else {
    load();
  }
})();
