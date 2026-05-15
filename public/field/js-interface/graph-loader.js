/**
 * A(DAI) — graph loader
 *
 * Stage 1: stats     -> window.ADAI_GRAPH_STATS, event 'adai:stats'
 * Step 1:  graph     -> window.ADAI_GRAPH,       event 'adai:graph'
 *
 * /api/graph is ~561 KB. Cached to localStorage and keyed on the live
 * total_edges count (cheap version stamp — invalidates on any graph update).
 * Stats arrive first and write the chrome vitals; graph loads in the
 * background and indexes itself for fast lookup.
 */
(() => {
  const STATS_URL  = '/api/stats';
  const GRAPH_URL  = '/api/graph';
  const STATS_TIMEOUT_MS = 6000;
  const GRAPH_TIMEOUT_MS = 15000;
  // v2: bumped 2026-05-03 when backend started returning cdn_image_url / image_url.
  //     v1 cached payloads predate the image fields and would suppress thumbnails.
  // v3: bumped 2026-05-16 when backend started projecting `year` onto artwork nodes.
  //     v2 cached payloads have no year, so the field panel / entity view title
  //     / CREATED_BY work stubs would silently render without dates.
  const CACHE_KEY = 'adai.graph.v3';

  window.ADAI_GRAPH_STATS = window.ADAI_GRAPH_STATS || null;
  window.ADAI_GRAPH = window.ADAI_GRAPH || null;

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

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

  function indexGraph(raw) {
    const nodes = raw.nodes || [];
    const edges = raw.edges || [];

    const byId = new Map();
    const byType = new Map();
    for (const n of nodes) {
      byId.set(n.id, n);
      const list = byType.get(n.type) || [];
      list.push(n);
      byType.set(n.type, list);
    }

    const neighbors = new Map();   // id -> Set<id>
    const edgesOf = new Map();     // id -> edge[]
    const edgeTypeCount = new Map(); // id -> Map<edgeType, int>

    function bumpType(id, type) {
      let m = edgeTypeCount.get(id);
      if (!m) { m = new Map(); edgeTypeCount.set(id, m); }
      m.set(type, (m.get(type) || 0) + 1);
    }

    for (const e of edges) {
      const { source, target, type } = e;
      // skip dangling edges (defensive)
      if (!byId.has(source) || !byId.has(target)) continue;

      let nS = neighbors.get(source); if (!nS) { nS = new Set(); neighbors.set(source, nS); }
      let nT = neighbors.get(target); if (!nT) { nT = new Set(); neighbors.set(target, nT); }
      nS.add(target);
      nT.add(source);

      let eS = edgesOf.get(source); if (!eS) { eS = []; edgesOf.set(source, eS); }
      let eT = edgesOf.get(target); if (!eT) { eT = []; edgesOf.set(target, eT); }
      eS.push(e);
      eT.push(e);

      bumpType(source, type);
      bumpType(target, type);
    }

    // intention metric: count of distinct edge types per node
    const intention = new Map();
    for (const [id, m] of edgeTypeCount) intention.set(id, m.size);

    return {
      nodes, edges,
      byId, byType,
      neighbors, edgesOf,
      edgeTypeCount,
      intention,
      intentionOf(id) { return intention.get(id) || 0; },
      neighborsOf(id) { return neighbors.get(id) || new Set(); },
      edgesFor(id) { return edgesOf.get(id) || []; },
    };
  }

  function readCache(versionStamp) {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.versionStamp === versionStamp && parsed.data) return parsed.data;
      return null;
    } catch { return null; }
  }

  function writeCache(versionStamp, data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ versionStamp, fetchedAt: Date.now(), data }));
    } catch (err) {
      console.warn('[adai] cache write failed:', err.message);
    }
  }

  async function loadStats() {
    try {
      const raw = await fetchJSON(STATS_URL, STATS_TIMEOUT_MS);
      const stats = {
        nodes: Number(raw.total_nodes) || 0,
        edges: Number(raw.total_edges) || 0,
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

  async function loadGraph(stats) {
    const versionStamp = stats ? `${stats.nodes}:${stats.edges}` : 'unknown';

    // Try cache first
    const cached = readCache(versionStamp);
    if (cached) {
      const indexed = indexGraph(cached);
      indexed.fetchedAt = Date.now();
      indexed.fromCache = true;
      indexed.versionStamp = versionStamp;
      window.ADAI_GRAPH = indexed;
      emit('adai:graph', indexed);
      return indexed;
    }

    try {
      const raw = await fetchJSON(GRAPH_URL, GRAPH_TIMEOUT_MS);
      writeCache(versionStamp, raw);
      const indexed = indexGraph(raw);
      indexed.fetchedAt = Date.now();
      indexed.fromCache = false;
      indexed.versionStamp = versionStamp;
      window.ADAI_GRAPH = indexed;
      emit('adai:graph', indexed);
      return indexed;
    } catch (err) {
      console.warn('[adai] graph fetch failed:', err.message);
      emit('adai:graph', { error: err.message });
      return null;
    }
  }

  async function load() {
    const stats = await loadStats();
    // Don't block on graph; fire and forget.
    loadGraph(stats);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load, { once: true });
  } else {
    load();
  }
})();
