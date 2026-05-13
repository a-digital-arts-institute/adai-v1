// sketch-graph.js — A(DAI) /field
// Data-driven dot field. Replaces the prototype's procedural sketch-brand.js.
// Fetches /api/graph, lays out with d3-force, renders edges + dots on canvas,
// and dispatches the five field modes (drift / orbit / weave / bloom / ripple)
// to graph-semantic actions instead of decorative-only motion.

(() => {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const { FIELD, matchesKey } = window.ADAI_SYSTEM;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // -- palette: kept in sync with src/routes/pages.ts:496-504 --
  const TYPE_COLORS = {
    practitioner: "#7eb8da",
    collective: "#da7e7e",
    platform: "#7eda98",
    theorist: "#dab87e",
    institution: "#b87eda",
    project: "#7edac4",
    artwork: "#e0b468",
    publication: "#a4c97a",
    classification_regime: "#e07676",
    concept: "#7a7a8a",
    scene: "#6b6b7a",
    related: "#444",
    artist: "#7eb8da",
  };
  const ADAI_ROOT_SLUG = "adai-seed-canon-v1-2026-04";
  const ADAI_GOLD = "#f4c261";
  const DEFAULT_DOT_COLOR = "#888";

  // edge type → hue. muted neutrals so the field reads first.
  const EDGE_COLORS = {
    EMBODIES: "#6a8aaa",
    PRACTICES: "#7a9ab8",
    CREATED_BY: "#a8915c",
    EXHIBITED_AT: "#9a7a9a",
    CLASSIFIED_BY: "#a86a6a",
    COLLABORATES_WITH: "#7aa890",
    BELONGS_TO: "#8a8aaa",
    USES_TECHNIQUE: "#aa9a6a",
    INFLUENCES: "#aaaa6a",
    RESPONDS_TO: "#aa6a8a",
  };
  const EDGE_DEFAULT = "#5a5a6a";
  const CONFIDENCE_WIDTH = { high: 1.4, medium: 0.9, low: 0.55, unverified: 0.3 };

  function radiusFor(node) {
    if (node.slug === ADAI_ROOT_SLUG) return 16;
    if (node.center) return 12;
    if (node.type === "classification_regime") return 11;
    if (node.type === "concept" || node.type === "scene") return 4;
    return 8;
  }
  function colorFor(node) {
    if (node.slug === ADAI_ROOT_SLUG) return ADAI_GOLD;
    return TYPE_COLORS[node.type] || DEFAULT_DOT_COLOR;
  }

  // ---------- canvas setup ----------

  const mopey = document.getElementById("mopey");
  const grainCanvas = document.createElement("canvas");
  const baseCanvas = document.createElement("canvas");
  const overlayCanvas = document.createElement("canvas");
  for (const c of [grainCanvas, baseCanvas, overlayCanvas]) {
    c.style.position = "absolute";
    c.style.inset = "0";
    c.style.width = "100%";
    c.style.height = "100%";
  }
  grainCanvas.id = "field-grain";
  grainCanvas.style.opacity = "0.55";
  baseCanvas.id = "field-base";
  overlayCanvas.id = "field-overlay";
  overlayCanvas.style.cursor = "crosshair";
  mopey.appendChild(grainCanvas);
  mopey.appendChild(baseCanvas);
  mopey.appendChild(overlayCanvas);

  let W = 0, H = 0, DPR = 1;
  const grainCtx = grainCanvas.getContext("2d");
  const baseCtx = baseCanvas.getContext("2d");
  const overlayCtx = overlayCanvas.getContext("2d");

  function fitCanvases() {
    DPR = window.devicePixelRatio || 1;
    W = mopey.clientWidth;
    H = mopey.clientHeight;
    for (const c of [grainCanvas, baseCanvas, overlayCanvas]) {
      c.width = Math.round(W * DPR);
      c.height = Math.round(H * DPR);
    }
    grainCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    baseCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    overlayCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  fitCanvases();

  // ---------- spiral-fill dot sprite cache (lifted from prototype sketch-brand.js) ----------
  // Cached offscreen canvases: one per (radius, color, lineWidth) combo.
  // The dot count is large but distinct radii are very few (4 / 8 / 11 / 12 / 16),
  // so the cache stays tiny and draws are just drawImage calls.
  const spiralSpriteCache = new Map();
  function getSpiralSprite(radius, strokeCol, lineWidth) {
    const key = `${radius.toFixed(2)}|${strokeCol}|${lineWidth.toFixed(2)}`;
    const cached = spiralSpriteCache.get(key);
    if (cached) return cached;

    const padding = lineWidth + 4;
    const logicalSize = Math.ceil((radius + padding) * 2);
    const sprite = document.createElement("canvas");
    sprite.width = Math.round(logicalSize * DPR);
    sprite.height = Math.round(logicalSize * DPR);
    const sctx = sprite.getContext("2d");
    sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    sctx.translate(logicalSize / 2, logicalSize / 2);

    // Outer ring
    sctx.strokeStyle = strokeCol;
    sctx.lineWidth = lineWidth;
    sctx.beginPath();
    sctx.arc(0, 0, radius, 0, TAU);
    sctx.stroke();

    // Spiral fill, clipped inside
    sctx.save();
    sctx.beginPath();
    sctx.arc(0, 0, Math.max(0.2, radius - 0.9), 0, TAU);
    sctx.clip();
    const spiralStroke = Math.max(0.55, lineWidth * 0.65);
    const targetSpacing = Math.max(spiralStroke * 1.2, radius * 0.0125);
    const b = targetSpacing / TAU;
    const edgeMargin = Math.max(0.9, radius * 0.03);
    const rMax = Math.max(0, radius - edgeMargin);
    const thetaMax = rMax / Math.max(b, 0.001);
    const desiredChord = Math.min(Math.max(radius / 24, 0.6), 3.0);
    const minStep = Math.PI / 180;
    const maxStep = Math.PI / 18;
    let theta = 0;
    let first = true;
    sctx.beginPath();
    while (theta <= thetaMax) {
      const rr = b * theta;
      const px = rr * Math.cos(theta);
      const py = rr * Math.sin(theta);
      if (first) { sctx.moveTo(px, py); first = false; }
      else sctx.lineTo(px, py);
      theta += Math.max(minStep, Math.min(maxStep, desiredChord / Math.max(rr, 1)));
    }
    sctx.strokeStyle = strokeCol;
    sctx.lineWidth = spiralStroke;
    sctx.stroke();
    sctx.restore();

    const result = { canvas: sprite, logicalSize, radius };
    spiralSpriteCache.set(key, result);
    return result;
  }

  function drawSpiralDot(ctx, x, y, radius, strokeCol, opacity = 0.78, lineWidth = 1.25, rotation = 0) {
    if (radius <= 0.35) return;
    const sprite = getSpiralSprite(radius, strokeCol, lineWidth);
    const drawSize = sprite.logicalSize;
    ctx.save();
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation);
    ctx.globalAlpha = opacity;
    ctx.drawImage(sprite.canvas, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
    ctx.restore();
  }

  // ---------- data ----------

  // graph-wide state
  let nodes = [];           // [{id, name, type, slug, x, y, radius, strokeCol, degree, dot}]
  let edges = [];           // [{source, target, type, confidence, src, tgt}]   src/tgt are node refs after resolve
  let nodeById = new Map();
  let adjacency = new Map(); // id -> [{other:nodeRef, edge}]

  // selection / mode state
  let selection = { kind: "none" };
  // selection shapes:
  //   {kind:"none"}
  //   {kind:"single", node, neighbours:Set<id>, edges:Set<edgeKey>}      — orbit/bloom/ripple
  //   {kind:"path", a, b, pathNodes:Set<id>, pathEdges:Set<edgeKey>}     — weave
  //   {kind:"weave-pending", a}                                          — first click in weave mode

  function edgeKey(e) {
    return `${e.source}|${e.target}|${e.type}`;
  }

  // ---------- vitals ----------

  const vNodes = document.getElementById("v-nodes");
  const vEdges = document.getElementById("v-edges");
  const vSignal = document.getElementById("v-signal");
  const vMode = document.getElementById("v-mode");

  let totalNodes = 0, totalEdges = 0;
  function refreshVitals() {
    if (!vNodes || !vEdges) return;
    if (selection.kind === "single") {
      vNodes.textContent = `1 + ${selection.neighbours.size}`;
      vEdges.textContent = String(selection.edges.size);
    } else if (selection.kind === "path") {
      vNodes.textContent = String(selection.pathNodes.size);
      vEdges.textContent = `${selection.pathEdges.size} hops`;
    } else if (selection.kind === "weave-pending") {
      vNodes.textContent = "pick second…";
      vEdges.textContent = "—";
    } else {
      vNodes.textContent = String(totalNodes || nodes.length);
      vEdges.textContent = String(totalEdges || edges.length);
    }
  }

  // ---------- fetch + layout ----------

  async function bootstrap() {
    drawLoading("loading graph…");
    try {
      const [graphRes, statsRes] = await Promise.all([
        fetch("/api/graph"),
        fetch("/api/stats"),
      ]);
      const graph = await graphRes.json();
      const stats = await statsRes.json();
      totalNodes = stats.total_nodes;
      totalEdges = stats.total_edges;

      ingest(graph);
      buildAdjacency(); // needed before layout — BFS uses it
      drawLoading(`composing ${nodes.length} nodes…`);
      await new Promise((r) => requestAnimationFrame(r));
      pickRandomBackground();
      runLayout();
      drawGrain();
      drawBase();
      refreshVitals();
      startInteractive();
      setupZoomAndPan();
      startAmbientDrift();
    } catch (err) {
      console.error("[field] bootstrap failed", err);
      drawLoading(`error: ${err && err.message ? err.message : err}`);
    }
  }

  // Per-load random seed + utility — drives layout variation between refreshes.
  const SEED_TAG = (Math.random() * 1e9) | 0;
  function rndAround(mean, jitter) { return mean + (Math.random() * 2 - 1) * jitter; }

  function ingest(graph) {
    nodes = graph.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      type: n.type,
      slug: n.slug,
      center: !!n.center,
      degree: 0,
      // Random initial scatter biases d3-force toward different settled
      // configurations every refresh, keeping the artistic variety.
      x: W * 0.5 + (Math.random() - 0.5) * W * 0.6,
      y: H * 0.5 + (Math.random() - 0.5) * H * 0.6,
      radius: radiusFor(n),
      strokeCol: colorFor(n),
      rotation: Math.random() * TAU,
      edgeJitter: (Math.random() - 0.5) * 0.4, // bezier midpoint deflection
    }));
    nodeById = new Map(nodes.map((n) => [n.id, n]));

    // Filter to edges whose endpoints exist (defensive — should always be true).
    edges = graph.edges
      .map((e) => ({
        source: e.source,
        target: e.target,
        type: e.type,
        confidence: e.confidence,
      }))
      .filter((e) => nodeById.has(e.source) && nodeById.has(e.target));

    for (const e of edges) {
      nodeById.get(e.source).degree++;
      nodeById.get(e.target).degree++;
    }
  }

  function buildAdjacency() {
    adjacency = new Map();
    for (const n of nodes) adjacency.set(n.id, []);
    for (const e of edges) {
      const s = nodeById.get(e.source);
      const t = nodeById.get(e.target);
      e.src = s;
      e.tgt = t;
      adjacency.get(s.id).push({ other: t, edge: e });
      adjacency.get(t.id).push({ other: s, edge: e });
    }
  }

  // ----------------------------------------------------------------
  // ARTIST'S LAYOUT — ported verbatim from sketch-brand.js
  // ----------------------------------------------------------------
  // Tables (arrangementParams, allowedArrangements, allowed-case lists, rng
  // knob generators) and the 22 case formulas in the dispatch are the artist's
  // original work.  Our additions are limited to: (a) capping the per-load dot
  // count at MAX_SAMPLE so we never lose nodes off the edge of the canvas;
  // (b) selecting WHICH nodes from our graph fill those dot positions (root
  // first, then highest-degree); (c) deriving numRows from the sampleSize so
  // the artist's growth-row pattern terminates correctly at our scale.
  // Everything geometric — case formulas, knob ranges, weighted arrangement
  // picker, baseRadius / currentY / angleSpan derivation — is the artist's.

  const MAX_SAMPLE = 900;            // user-set ceiling, scales with future data growth
  const PI = Math.PI;
  let LAYOUT_CASE_LABEL = "case 1";

  function getSpacing(rv, ranges) {
    let acc = 0;
    for (const r of ranges) {
      acc = r.probability;
      if (rv < acc) return 1 / (Math.random() * (r.max - r.min) + r.min);
    }
    const last = ranges[ranges.length - 1];
    return 1 / (Math.random() * (last.max - last.min) + last.min);
  }

  // arrangementParams 1..22 — exact port. Each yields {circleCount, spacing}.
  function buildArrangementParams() {
    const std = [
      { probability: 0.35, min: 800,  max: 1250 },
      { probability: 0.70, min: 1250, max: 1500 },
      { probability: 0.90, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 },
    ];
    const std4 = [
      { probability: 0.35, min: 1000, max: 1250 },
      { probability: 0.70, min: 1250, max: 1500 },
      { probability: 0.90, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 },
    ];
    const range = (max, base) => ((Math.random() * max) | 0) + base;
    return {
      1:  { circleCount: range(100, 25),  spacing: getSpacing(Math.random(), std) },
      2:  { circleCount: range(800, 100), spacing: getSpacing(Math.random(), std) },
      3:  { circleCount: range(5, 1),     spacing: getSpacing(Math.random(), [
              { probability: 0.0,  min: 800,  max: 1250 },
              { probability: 0.25, min: 1250, max: 1500 },
              { probability: 0.50, min: 1500, max: 1750 },
              { probability: 1.00, min: 1750, max: 2000 } ]) },
      4:  { circleCount: range(500, 1),   spacing: getSpacing(Math.random(), std4) },
      5:  { circleCount: range(100, 1),   spacing: getSpacing(Math.random(), std) },
      6:  { circleCount: range(100, 25),  spacing: getSpacing(Math.random(), std) },
      7:  { circleCount: range(100, 1),   spacing: getSpacing(Math.random(), std4) },
      8:  { circleCount: range(100, 1),   spacing: getSpacing(Math.random(), std) },
      9:  { circleCount: range(100, 25),  spacing: getSpacing(Math.random(), std) },
      10: { circleCount: range(100, 1),   spacing: getSpacing(Math.random(), std) },
      11: { circleCount: range(100, 1),   spacing: getSpacing(Math.random(), [
              { probability: 0.5, min: 800,  max: 1250 },
              { probability: 1.0, min: 1250, max: 1500 } ]) },
      12: { circleCount: range(100, 1),   spacing: getSpacing(Math.random(), std) },
      13: { circleCount: range(100, 1),   spacing: getSpacing(Math.random(), std) },
      14: { circleCount: range(100, 1),   spacing: getSpacing(Math.random(), std) },
      15: { circleCount: range(100, 1),   spacing: getSpacing(Math.random(), [
              { probability: 1.00, min: 1750, max: 2250 } ]) },
      16: { circleCount: range(100, 1),   spacing: getSpacing(Math.random(), std) },
      17: { circleCount: range(100, 1),   spacing: getSpacing(Math.random(), std) },
      18: { circleCount: range(100, 1),   spacing: getSpacing(Math.random(), std) },
      19: { circleCount: range(100, 1),   spacing: getSpacing(Math.random(), std) },
      20: { circleCount: range(100, 1),   spacing: getSpacing(Math.random(), std) },
      21: { circleCount: range(100, 1),   spacing: getSpacing(Math.random(), std) },
      22: { circleCount: range(200, 1),   spacing: getSpacing(Math.random(), [
              { probability: 1.00, min: 1500, max: 2000 } ]) },
    };
  }

  // Artist's weighted arrangement list — exact port. Arrangement 1 dominates.
  const ALLOWED_ARRANGEMENTS = [
    1,1,1,1,2,3,4,5,6,6,6,7,7,8,8,9,10,10,11,12,13,14,16,16,20,20,21,
    1,1,1,1,2,3,4,5,6,6,6,7,7,8,8,9,10,10,12,13,14,16,20,20,21,
  ];

  // Allowed `c` knob lists — drive `k = floor(|c|)` → angleSpan = π·k.
  const ALLOWED_CASES = [
    2,3,4,5,6,7,8,9,10,11,12,14,18,20,21,22,23,24,25,26,27,28,29,30,
    31,32,33,34,35,36,38,40,41,42,44,46,47,48,49,50,53,59,61,67,71,
    73,79,83,89,97,
  ];
  const ALLOWED_CASES1 = [
    2,3,4,5,6,7,8,9,10,11,12,14,18,20,21,22,23,24,25,26,27,28,29,30,
    31,32,33,34,35,36,38,40,41,42,44,46,47,48,49,50,199,211,223,227,229,
  ];
  const ALLOWED_CASES3 = [2,3,4,5,6,7,8,9,10,11,12,13,14,16,17,18,19,20,22,23,25,26,29,32,34,36,37,38,41,46,47,49];
  const ALLOWED_CASES10 = ALLOWED_CASES;
  const ALLOWED_CASES11 = [1,2,3,4,5,7,8,9,10,12,14,16];
  const ALLOWED_CASES12 = [1,2,4,8,10,14,16,22,26,32,34,38,46,50];
  const ALLOWED_CASES15 = [1,2,2,2];
  const ALLOWED_CASES16 = [1,2,3,4,2,3,4];
  const PRIMES = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509,521,523,541];
  const pickFrom = (arr) => arr[(Math.random() * arr.length) | 0];

  // Per-load RNG knob bag — exact structural port of `const rng = { ... }`.
  function buildRng(W, H) {
    const casenumber   = pickFrom(ALLOWED_CASES);
    const casenumber1  = pickFrom(ALLOWED_CASES1);
    const casenumber3  = pickFrom(ALLOWED_CASES3);
    const casenumber10 = pickFrom(ALLOWED_CASES10);
    const casenumber11 = pickFrom(ALLOWED_CASES11);
    const casenumber12 = pickFrom(ALLOWED_CASES12);
    const casenumber15 = pickFrom(ALLOWED_CASES15);
    const casenumber16 = pickFrom(ALLOWED_CASES16);
    const casenumber22 = (Math.random() < 0.5)
      ? Math.round(Math.random() * 100) + 1
      : pickFrom(PRIMES);

    return {
      case1:  { a: Math.random() < 0.75 ? Math.random() * 1 + 2 : Math.random() * 6 + 3,
                b: Math.random() * 2 + 2, c: casenumber1,
                d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2 },
      case2:  { a: Math.random() < 0.75 ? Math.random() * 1 + 1 : Math.random() * 8 + 2,
                b: Math.random() * 2.75 + 1.25, c: casenumber,
                d: (Math.random() < 0.5
                      ? [2, 1, 100][(Math.random() * 3) | 0]
                      : Math.random() * 5 + 1),
                f: Math.random(), rndA: Math.random(), rndB: Math.random() },
      case3:  { a: Math.random() < 0.75 ? Math.random() * 1 + 1.5 : Math.random() * 3 + 2,
                b: Math.random() * 2 + 2.5, c: casenumber3,
                d: (Math.random() < 0.5
                      ? [2, 1, 100][(Math.random() * 3) | 0]
                      : Math.random() * 5 + 1),
                ramp: (Math.random() < 0.75)
                        ? 0.0005 + Math.random() * (0.005 - 0.0005)
                        : 0.005 + Math.random() * (0.05 - 0.005) },
      case4:  { a: Math.random() < 0.75 ? Math.random() * 1 + 1 : Math.random() * 5 + 2,
                b: Math.random() * 2 + 2, c: casenumber, d: 2 },
      case5:  { a: Math.random() < 0.75 ? Math.random() * 1 + 1.5 : Math.random() * 7.5 + 2.5,
                b: Math.random() * 2 + 2, c: casenumber,
                d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
                f: Math.random() },
      case6:  { a: Math.random() < 0.75 ? Math.random() * 1 + 1 : Math.random() * 8 + 2,
                b: Math.random() * 2 + 2, c: casenumber,
                d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
                e: Math.random() * 0.8 + 0.1,
                drift: Math.random() < 0.5 ? 0.001 : (Math.random() * 3 + 1) / 1000 },
      case7:  { a: Math.random() < 0.75 ? Math.random() * 1 + 1.5 : Math.random() * 7.5 + 2.5,
                b: Math.random() * 2 + 2, c: casenumber,
                d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
                e: Math.random() * 0.98 + 0.01, f: Math.random(),
                rowRamp: (Math.random() < 0.75)
                          ? 0.1 + Math.random() * (0.4 - 0.1)
                          : 0.001 + Math.random() * (0.01 - 0.001) },
      case8:  { a: [0, 1][(Math.random() * 2) | 0],
                b: Math.random() < 0.5 ? Math.random() * 2 + 3 : Math.random() * 5 + 5,
                c: casenumber, d: 2 },
      case9:  { a: Math.random() < 0.75 ? Math.random() * 1 + 1.5 : Math.random() * 7.5 + 2.5,
                b: Math.random() * 2 + 2, c: casenumber,
                d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
                e: Math.random() * 0.8 + 0.1 },
      case10: { a: Math.random() < 0.75 ? Math.random() * 1 + 1 : Math.random() * 1 + 2,
                b: Math.random() * 2 + 2, c: casenumber10 / 5 + 1, d: 2 },
      case11: { a: Math.random() * 1 + 1,
                fx: [1, 2][(Math.random() * 2) | 0],
                fy: [1, 2][(Math.random() * 2) | 0],
                phase: Math.random() * PI, c: casenumber11, d: 2 },
      case12: { a: Math.random() * 2 + 2, b: Math.random() * 2 + 1, c: casenumber12,
                d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
                cxA: W * (0.05 + Math.random() * 0.4),
                cxB: W * (0.55 + Math.random() * 0.4),
                f: Math.random() },
      case13: { a: Math.random() * 2, b: Math.random() * 3 + 1, c: casenumber, d: 2,
                klog: 0.2 + Math.random() * 0.2, f: Math.random() },
      case21: { a: Math.random() * 1 - 0.1, b: Math.random() * 3 + 1,
                c: Math.random() * 39 + 1, d: 2,
                klog: 0.2 + Math.random() * 0.2, f: Math.random() },
      case14: { a: Math.random() * 1 + 1, b: Math.random() * 1.5 + 1.25,
                c: casenumber, d: 2, scale: 0.3 + Math.random() * 0.5 },
      case15: { a: Math.random() * 2 + 1, b: Math.random() * 2 + 2,
                c: casenumber15,
                d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
                wobble: 0.0025 },
      case22: { a: Math.random() * 2 + 1, b: Math.random() * 2 + 2,
                c: casenumber22,
                d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
                wobble: 0.000 },
      case16: { a: Math.random() * 2 + 1, b: Math.random() * 2 + 2,
                c: casenumber16,
                d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
                amp: H * (0.01 + Math.random() * 0.05),
                freq: 1 + ((Math.random() * 5) | 0),
                f: Math.random(), g: Math.random() },
      case17: { a: Math.random() * 2 + 2, b: Math.random() * 1.5 + 1.25,
                c: casenumber,
                d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
                krose: 0.06, f: Math.random(), j: Math.random() },
      case18: { a: Math.random() * 2 + 1, shells: 1, c: casenumber,
                d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2, gap: 2 },
      case19: { a: Math.random() * 2 + 2, b: Math.random() * 2 + 2, c: casenumber,
                d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
                phase: Math.random() * PI, offset: 0.001 },
      case20: { a: Math.random() * 2 + 1, b: Math.random() * 2 + 2, c: casenumber,
                d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
                buckets: 60 + ((Math.random() * 60) | 0) },
    };
  }

  // Faithful port of drawCirclesInRows + the 22-case dispatch.
  // Returns the placed positions in the order the artist's loop produced them.
  function placeArtistComposition(arrangement, rng, params, W, H, dotsToPlace) {
    const HEIGHT = H, WIDTH = W;
    const minCirclesInRow = Math.max(1, params.circleCount);
    const spacing = params.spacing;
    const rowSpacingOffset = H * spacing;
    const startY = H * (19 / 20);
    const endYPick = 1; // artist picks this; we hold to 1 for stable framing
    const endY = H * (endYPick / 6);
    const availableHeight = startY - endY;

    // Derive numRows so the row-growth series sums to ~dotsToPlace (so we use
    // exactly the sampled population without truncating the artist's ramp).
    //   Σ_{r=0..R-1}(minCirclesInRow + r) = R·N + R(R-1)/2 = dotsToPlace
    const N0 = minCirclesInRow;
    const aQ = 0.5, bQ = N0 - 0.5, cQ = -dotsToPlace;
    let numRows = Math.max(1,
      Math.round((-bQ + Math.sqrt(bQ * bQ - 4 * aQ * cQ)) / (2 * aQ))
    );
    // Hard guard so a tiny circleCount doesn't request thousands of rows.
    numRows = Math.min(numRows, 80);

    const baseRadius = Math.min(
      (W * 18 / 20) / (2 * minCirclesInRow),
      availableHeight / (2 * numRows)
    );

    const placements = []; // [{x, y, rad}]
    let currentY = startY;

    for (let row = 0; row < numRows; row++) {
      const circlesInRow = minCirclesInRow + row;

      switch (arrangement) {
        case 1: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case1.c)));
          const angleSpan = PI * k;
          const cX = W / rng.case1.d;
          const growth = (row / numRows) * rng.case1.a;
          const rad = baseRadius / 4 + growth * baseRadius;
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            const ang = t * angleSpan - angleSpan / 2;
            const rr = rad * circlesInRow * rng.case1.b;
            const x = cX + rr * Math.cos(ang);
            const y = currentY + rr * Math.sin(ang);
            placements.push({ x, y, rad });
          }
          break;
        }
        case 2: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case2.c)));
          const angleSpan = PI * k;
          const cX = W / rng.case2.d;
          const growth = (row / numRows) * rng.case2.a;
          const rad = baseRadius / 4 + growth * baseRadius;
          const baseY = rng.case2.rndA < 0.5
            ? rng.case2.rndB * HEIGHT
            : [HEIGHT, HEIGHT / 2, 0, HEIGHT / 2][(rng.case2.rndB * 3) | 0];
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            const ang = t * angleSpan - angleSpan / 2;
            const rr = rad * circlesInRow * rng.case2.b;
            const x = cX + rr * Math.cos(ang);
            const y = baseY + rr * Math.sin(ang) +
                      (row / Math.max(1, numRows - 1)) * (H * 0.08);
            placements.push({ x, y, rad });
          }
          break;
        }
        case 3: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case3.c)));
          const angleSpan = PI * k;
          const cX = W / rng.case3.d;
          const growth = (row / numRows) * rng.case3.a;
          const rad = baseRadius / 4 + growth * baseRadius;
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            const ang = t * angleSpan - angleSpan / 2;
            const rr = rad * circlesInRow * rng.case3.b;
            const x = cX + rr * Math.cos(ang);
            const y = HEIGHT / 2 + rr * Math.sin(ang) + (t - 0.5) * (H * rng.case3.ramp);
            placements.push({ x, y, rad });
          }
          break;
        }
        case 4: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case4.c)));
          const angleSpan = PI * k;
          const cX = W / rng.case4.d;
          const growth = (row / numRows) * rng.case4.a;
          const rad = baseRadius / 2 + growth * baseRadius;
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            const ang = t * angleSpan - angleSpan / 2;
            const rr = rad * circlesInRow * rng.case4.b;
            const x = cX + rr * Math.cos(ang);
            const safe = Math.max(-PI / 8 + 1e-3, Math.min(PI / 8 - 1e-3, ang));
            const y = HEIGHT / 2 + rr * Math.sin(Math.atan(Math.tan(1.25 * safe)));
            placements.push({ x, y, rad });
          }
          break;
        }
        case 5: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case5.c)));
          const angleSpan = PI * k;
          const cX = W / rng.case5.d;
          const growth = (row / numRows) * rng.case5.a;
          const rad = baseRadius / 4 + growth * baseRadius;
          const baseYOptions = [HEIGHT * rng.case5.f, HEIGHT, HEIGHT / 2, 0, HEIGHT / 2, HEIGHT * rng.case5.f];
          const baseY = baseYOptions[(rng.case5.f * baseYOptions.length) | 0];
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            const ang = t * angleSpan - angleSpan / 2;
            const rr = rad * circlesInRow * rng.case5.b;
            const x = cX + rr * Math.cos(ang);
            const sawLocal = (ang / PI) % 0.005;
            const sharp = 2 * sawLocal - 1;
            const y = baseY + rr * Math.sin(ang) * (0.7 + 0.3 * Math.abs(sharp));
            placements.push({ x, y, rad });
          }
          break;
        }
        case 6: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case6.c)));
          const angleSpan = PI * k;
          const cX = W / rng.case6.d;
          const growth = (row / numRows) * rng.case6.a;
          const rad = baseRadius / 4 + growth * baseRadius;
          const mult = rng.case6.b;
          const driftPerRow = H * rng.case6.drift;
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            const ang = t * angleSpan - angleSpan / 2;
            const rr = rad * circlesInRow * mult;
            const x = cX + rr * Math.cos(ang);
            const y = currentY + (row - numRows / 2) * driftPerRow + rr * Math.sin(ang);
            placements.push({ x, y, rad });
          }
          break;
        }
        case 7: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case7.c)));
          const angleSpan = PI * k;
          const growth = (row / numRows) * rng.case7.a;
          const rad = baseRadius / 4 + growth * baseRadius;
          const mult = rng.case7.b;
          const baseYOptions = [currentY, currentY, HEIGHT, HEIGHT / 2, 0];
          const baseY = baseYOptions[(rng.case7.f * baseYOptions.length) | 0];
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            const ang = t * angleSpan - angleSpan / 2;
            const rr = rad * circlesInRow * mult;
            const x = WIDTH / 2 + rr * Math.cos(ang);
            const s = Math.sin(ang);
            const epsOptions = [0.01, 0.001, 0.00001, 0.1, 1];
            const eps = epsOptions[(rng.case7.e * epsOptions.length) | 0];
            const y = baseY + rr * Math.sign(s) * Math.min(1, Math.abs(s) + eps);
            placements.push({ x, y, rad });
          }
          break;
        }
        case 8: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case8.c)));
          const angleSpan = PI * k;
          const cX = W / rng.case8.d;
          const growth = (row / numRows) * rng.case8.a;
          const rad = baseRadius / 4 + growth * baseRadius;
          const mult = rng.case8.b;
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            const ang = t * angleSpan - angleSpan / 2;
            const rr = rad * circlesInRow * mult;
            const x = cX + rr * Math.cos(ang);
            const y = currentY + rr * Math.sin(ang);
            placements.push({ x, y, rad });
          }
          break;
        }
        case 9: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case9.c)));
          const angleSpan = PI * k;
          const cX = W / rng.case9.d;
          const growth = (row / numRows) * rng.case9.a;
          const rad = baseRadius / 4 + growth * baseRadius;
          const mult = rng.case9.b;
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            const ang = t * angleSpan - angleSpan / 2;
            const rr = rad * circlesInRow * mult;
            const x = cX + rr * Math.cos(ang);
            const y = currentY + rr * Math.sin(ang);
            placements.push({ x, y, rad });
          }
          break;
        }
        case 10: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case10.c)));
          const angleSpan = PI * k;
          const cX = W / rng.case10.d;
          const growth = (row / numRows) * rng.case10.a;
          const rad = baseRadius / 4 + growth * baseRadius;
          const mult = rng.case10.b;
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            const ang = t * angleSpan - angleSpan / 2;
            const rr = (i + 1) * rad * mult;
            const x = cX + rr * Math.cos(ang);
            const y = currentY + rr * Math.sin(ang);
            placements.push({ x, y, rad });
          }
          break;
        }
        case 11: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case11.c)));
          const angleSpan = PI * k;
          const growth = (row / numRows) * rng.case11.a;
          const rad = baseRadius / 4 + growth * baseRadius;
          const fx = rng.case11.fx, fy = rng.case11.fy, ph = rng.case11.phase;
          const cx = W / rng.case11.d;
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            const ang = t * angleSpan - angleSpan / 2;
            const A = rad * circlesInRow;
            const x = cx + A * Math.sin(fx * ang + ph);
            const y = currentY + A * Math.sin(fy * ang);
            placements.push({ x, y, rad });
          }
          break;
        }
        case 12: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case12.c)));
          const angleSpan = PI * k;
          const baseYOptions = [HEIGHT / 2, currentY, HEIGHT, HEIGHT / 2, 0];
          const baseY = baseYOptions[(rng.case12.f * baseYOptions.length) | 0];
          const growth = (row / numRows) * rng.case12.a;
          const rad = baseRadius / 4 + growth * baseRadius;
          const mult = rng.case12.b;
          const cx = (row % 2 === 0) ? rng.case12.cxA : rng.case12.cxB;
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            const ang = t * angleSpan - angleSpan / 2;
            const rr = rad * circlesInRow * mult;
            const x = cx + rr * Math.cos(ang);
            const y = baseY + rr * Math.sin(ang);
            placements.push({ x, y, rad });
          }
          break;
        }
        case 13: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case13.c)));
          const angleSpan = PI * k;
          const baseY = currentY;
          const growth = (row / numRows) * rng.case13.a;
          const rad = baseRadius / 4 + growth * baseRadius;
          const mult = rng.case13.b;
          const cx = W / rng.case13.d;
          const klog = rng.case13.klog;
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            const ang = t * angleSpan - angleSpan / 2;
            const rr = rad * circlesInRow * mult * Math.exp(klog * ang);
            const x = cx + rr * Math.cos(ang);
            const y = baseY + rr * Math.sin(ang);
            placements.push({ x, y, rad });
          }
          break;
        }
        case 14: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case14.c)));
          const angleSpan = PI * k;
          const growth = (row / numRows) * rng.case14.a;
          const rad = baseRadius / 4 + growth * baseRadius;
          const mult = rng.case14.b * rng.case14.scale;
          const cx = W / rng.case14.d;
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            const ang = t * angleSpan - angleSpan / 2;
            const rr = rad * circlesInRow * mult;
            const x = cx + rr * Math.sin(ang);
            const y = HEIGHT / 2 + rr * Math.sin(ang) * Math.cos(ang) * 2;
            placements.push({ x, y, rad });
          }
          break;
        }
        case 15: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case15.c)));
          const angleSpan = PI * k;
          const growth = (row / numRows) * rng.case15.a;
          const rad = baseRadius / 4 + growth * baseRadius;
          const mult = rng.case15.b;
          const wob = rng.case15.wobble;
          const cx = W / rng.case15.d;
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            let ang = t * angleSpan - angleSpan / 2;
            ang += (Math.random() - 0.5) * wob;
            const rr = rad * circlesInRow * mult;
            const x = cx + rr * Math.cos(ang);
            const y = HEIGHT / 2 + rr * Math.sin(ang);
            placements.push({ x, y, rad });
          }
          break;
        }
        case 16: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case16.c)));
          const angleSpan = PI * k;
          const growth = (row / numRows) * rng.case16.a;
          const baseYOptions = [HEIGHT / 2, currentY, currentY, HEIGHT / 2, HEIGHT * rng.case16.g];
          const baseY = baseYOptions[(rng.case16.f * baseYOptions.length) | 0];
          const rad = baseRadius / 4 + growth * baseRadius;
          const mult = rng.case16.b;
          const cx = W / rng.case16.d;
          const amp = rng.case16.amp;
          const freq = rng.case16.freq;
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            const ang = t * angleSpan - angleSpan / 2;
            const rr = rad * circlesInRow * mult;
            const x = cx + rr * Math.cos(ang) + Math.sin(freq * t * 2 * PI) * amp;
            const y = baseY + rr * Math.sin(ang);
            placements.push({ x, y, rad });
          }
          break;
        }
        case 17: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case17.c)));
          const angleSpan = PI * k;
          const baseYOptions = [HEIGHT / 2, HEIGHT * rng.case17.j];
          const baseY = baseYOptions[(rng.case17.f * baseYOptions.length) | 0];
          const growth = (row / numRows) * rng.case17.a;
          const rad = baseRadius / 4 + growth * baseRadius;
          const mult = rng.case17.b;
          const cx = W / rng.case17.d;
          const krose = rng.case17.krose;
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            const ang = t * angleSpan - angleSpan / 2;
            const R = rad * circlesInRow * mult;
            const rr = R * Math.cos(krose * ang);
            const x = cx + rr * Math.cos(ang);
            const y = baseY + rr * Math.sin(ang);
            placements.push({ x, y, rad });
          }
          break;
        }
        case 18: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case18.c)));
          const angleSpan = PI * k;
          const growth = (row / numRows) * rng.case18.a;
          const rad = baseRadius / 4 + growth * baseRadius;
          const shells = rng.case18.shells;
          const gap = rng.case18.gap;
          const cx = W / rng.case18.d;
          for (let s = 1; s <= shells; s++) {
            for (let i = 0; i < circlesInRow; i++) {
              const t = i / Math.max(1, circlesInRow - 1);
              const ang = t * angleSpan - angleSpan / 2;
              const rr = s * rad * circlesInRow * gap;
              const x = cx + rr * Math.cos(ang);
              const y = HEIGHT / 2 + rr * Math.sin(ang);
              placements.push({ x, y, rad: rad * 0.9 });
            }
          }
          break;
        }
        case 19: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case19.c)));
          const angleSpan = PI * k;
          const growth = (row / numRows) * rng.case19.a;
          const rad = baseRadius / 4 + growth * baseRadius;
          const mult = rng.case19.b;
          const cx = W / rng.case19.d;
          const ph = rng.case19.phase;
          const off = rng.case19.offset;
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            const ang = t * angleSpan - angleSpan / 2;
            const rr = rad * circlesInRow * mult;
            const x = cx + rr * Math.cos(ang + ph * ((i & 1) ? 1 : -1));
            const y = HEIGHT / 2 + rr * Math.sin(ang) * ((i & 1) ? off : 1 - off);
            placements.push({ x, y, rad });
          }
          break;
        }
        case 20: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case20.c)));
          const angleSpan = PI * k;
          const growth = (row / numRows) * rng.case20.a;
          const rad = baseRadius / 4 + growth * baseRadius;
          const mult = rng.case20.b;
          const cx = W / rng.case20.d;
          const B = rng.case20.buckets;
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            const ang0 = t * angleSpan - angleSpan / 2;
            const idx = Math.floor(((ang0 + PI) / (2 * PI)) * B);
            const arcStart = -PI + idx * (2 * PI / B);
            const arcEnd   = -PI + (idx + 1) * (2 * PI / B);
            const ang = arcStart + (arcEnd - arcStart) * 0.5;
            const rr = rad * circlesInRow * mult;
            const x = cx + rr * Math.cos(ang);
            const y = currentY + rr * Math.sin(ang);
            placements.push({ x, y, rad });
          }
          break;
        }
        case 21: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case21.c)));
          const angleSpan = PI * k;
          const baseY = HEIGHT / 2;
          const growth = (row / numRows) * rng.case21.a;
          const rad = baseRadius / 4 + growth * baseRadius;
          const mult = rng.case21.b;
          const cx = W / rng.case21.d;
          const klog = rng.case21.klog;
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            const ang = t * angleSpan - angleSpan / 2;
            const rr = rad * circlesInRow * mult * Math.exp(klog * ang);
            const x = cx + rr * Math.cos(ang);
            const y = baseY + rr * Math.sin(ang);
            placements.push({ x, y, rad });
          }
          break;
        }
        case 22: {
          const k = Math.max(1, Math.floor(Math.abs(rng.case22.c)));
          const angleSpan = PI * k;
          const growth = (row / numRows) * rng.case22.a;
          const rad = baseRadius / 4 + growth * baseRadius;
          const mult = rng.case22.b;
          const wob = rng.case22.wobble;
          const cx = W / rng.case22.d;
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            let ang = t * angleSpan - angleSpan / 2;
            ang += (Math.random() - 0.5) * wob;
            const rr = rad * circlesInRow * mult;
            const x = cx + rr * Math.cos(ang);
            const y = HEIGHT / 2 + rr * Math.sin(ang);
            placements.push({ x, y, rad });
          }
          break;
        }
      }

      currentY -= 2 * baseRadius + (H * spacing);
    }

    return placements;
  }

  function runLayout() {
    // 1. Pick arrangement (artist's weighted list).
    const arrangement = ALLOWED_ARRANGEMENTS[(Math.random() * ALLOWED_ARRANGEMENTS.length) | 0];
    LAYOUT_CASE_LABEL = `arr ${arrangement}`;

    // 2. Per-load arrangement params (artist's table).
    const arrParams = buildArrangementParams()[arrangement] || { circleCount: 25, spacing: 1 / 1500 };

    // 3. Per-load RNG knob bag (artist's tables).
    const rng = buildRng(W, H);

    // 4. Sample size: how many of our nodes will fill the artist's composition.
    //    The artist's composition would otherwise emit ~(circleCount × numRows)
    //    sub-pixel dots; we cap at MAX_SAMPLE so the spiral-fill renders large
    //    enough to read.
    const sampleSize = Math.min(MAX_SAMPLE, nodes.length);

    // 5. Sample data — root first, then highest-degree, then alphabetic.
    //    Hidden nodes still exist in `nodes` (unsampled), they just won't be
    //    placed this load — picking up a different sample on next refresh is
    //    part of the variability.
    const sampled = [...nodes].sort((a, b) => {
      if (a.slug === ADAI_ROOT_SLUG) return -1;
      if (b.slug === ADAI_ROOT_SLUG) return 1;
      if (a.degree !== b.degree) return b.degree - a.degree;
      return a.name < b.name ? -1 : 1;
    }).slice(0, sampleSize);

    // 6. Run the artist's geometry.
    const placements = placeArtistComposition(arrangement, rng, arrParams, W, H, sampled.length);

    // 7. Bind placements → sampled nodes (in artist's emission order).
    //    Composition might emit slightly more or fewer slots than our sample
    //    (case 18 doubles via shells; growth-row sum is approximate). Match
    //    what we can; park the remainder off-canvas (so they exist but hide).
    const m = Math.min(placements.length, sampled.length);
    for (let i = 0; i < m; i++) {
      const p = placements[i];
      const n = sampled[i];
      n.baseX = p.x;
      n.baseY = p.y;
      n.x = p.x;
      n.y = p.y;
      // Override the per-node radius with the artist's per-placement rad,
      // scaled for visibility (the artist's dots can go sub-pixel; we floor).
      n.placedRadius = Math.max(2.5, p.rad);
    }
    // Park unsampled / leftover nodes far off-screen so adjacency lookups still
    // resolve but they don't render.
    for (let i = m; i < sampled.length; i++) {
      const n = sampled[i];
      n.baseX = -9999; n.baseY = -9999;
      n.x = -9999; n.y = -9999;
      n.placedRadius = 0;
    }
    const sampledIds = new Set(sampled.map((n) => n.id));
    for (const n of nodes) {
      if (!sampledIds.has(n.id)) {
        n.baseX = -9999; n.baseY = -9999;
        n.x = -9999; n.y = -9999;
        n.placedRadius = 0;
      }
    }
  }

  // ---------- background variation ----------

  function pickRandomBackground() {
    const bgs = window.ADAI_SYSTEM?.FIELD?.BACKGROUNDS || [{ hex: "#0C0C0E" }];
    const pick = bgs[(Math.random() * bgs.length) | 0];
    document.documentElement.style.setProperty("--field-bg", pick.hex);
    if (document.body) document.body.style.backgroundColor = pick.hex;
    if (mopey) mopey.style.backgroundColor = pick.hex;
    // Stash so grain/dot rendering can adapt contrast if needed later.
    window.__ADAI_FIELD_BG = pick.hex;
  }

  // ---------- view state (zoom + pan) ----------
  // Our addition: wheel-zoom around cursor + 'r' to reset.  The artist's piece
  // was a fixed composition; with data-driven content, zoom helps inspect
  // dense arcs.  Zoom/pan are applied as CANVAS DRAWING transforms (not CSS)
  // so the canvas always fills the viewport — zoom-out scales the content
  // smaller inside the same canvas rather than shrinking the canvas itself.
  // CSS drift remains separate (artist's transform).
  const view = { zoom: 1, panX: 0, panY: 0 };
  const VIEW_MIN = 0.4, VIEW_MAX = 6;

  // Apply DPR + view to a 2D context. Call before any user-coordinate drawing.
  function applyView(ctx) {
    const s = DPR * view.zoom;
    ctx.setTransform(s, 0, 0, s, DPR * view.panX, DPR * view.panY);
  }
  // Apply DPR only — for backgrounds (grain) that should stay at viewport scale.
  function applyDpr(ctx) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function setupZoomAndPan() {
    overlayCanvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const rect = overlayCanvas.getBoundingClientRect();
      // buffer pixel under cursor (accounts for CSS drift via rect)
      const bx = (e.clientX - rect.left) * (W / Math.max(rect.width, 1));
      const by = (e.clientY - rect.top) * (H / Math.max(rect.height, 1));
      // logical coord currently under cursor
      const lx = (bx - view.panX) / view.zoom;
      const ly = (by - view.panY) / view.zoom;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newZoom = Math.max(VIEW_MIN, Math.min(VIEW_MAX, view.zoom * factor));
      if (newZoom === view.zoom) return;
      // adjust pan so (lx, ly) stays under (bx, by) at the new zoom
      view.panX = bx - lx * newZoom;
      view.panY = by - ly * newZoom;
      view.zoom = newZoom;
      drawBase();      // re-render statics at new zoom
      // overlay redraws on its own RAF loop
    }, { passive: false });

    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "r" || e.key === "R" || e.key === "0") {
        view.zoom = 1; view.panX = 0; view.panY = 0;
        drawBase();
      }
    });
  }

  // ---------- canvas drift ----------
  // Faithful port of the artist's startCanvasDrift (field.js, lines 162-265),
  // commented out in the shipped build but with all tuning constants intact.
  // Constants are theirs; we apply the transform to all three canvases
  // (grain / base / overlay) so the field reads as one breathing surface.
  // 'a' toggles motion on/off; '+'/'-' adjust speed (FIELD bindings).
  // Composes with our view zoom/pan in the same transform string.
  function startAmbientDrift() {
    const OVERSCAN_SCALE = 1.045;
    const BREATH_AMOUNT  = 0.012;
    const DRIFT_X        = 20;
    const DRIFT_Y        = 14;
    const PARALLAX_X     = 6;
    const PARALLAX_Y     = 4;
    const MIN_SPEED      = FIELD.MIN_SPEED;
    const MAX_SPEED      = FIELD.MAX_SPEED;
    const SPEED_STEP     = FIELD.SPEED_STEP;

    let motionEnabled = !reducedMotion.matches;
    let motionSpeed = 1;
    let phase = 0;
    let lastNow = null;
    let mouseX = -1, mouseY = -1;
    let viewW = window.innerWidth, viewH = window.innerHeight;

    const signalEl = document.getElementById("v-signal");

    function updateMotionSignal() {
      if (!signalEl) return;
      if (reducedMotion.matches) { signalEl.textContent = "rm"; return; }
      signalEl.textContent = motionEnabled ? `${motionSpeed.toFixed(1)}x` : "off";
    }

    function composedTransform(driftX, driftY, driftScale) {
      // Drift only — zoom/pan happen at canvas-draw time, not in CSS.
      return `translate3d(${driftX.toFixed(2)}px, ${driftY.toFixed(2)}px, 0) scale(${driftScale.toFixed(4)})`;
    }

    function applyStaticTransform() {
      const t = composedTransform(0, 0, 1);
      grainCanvas.style.transform = t;
      baseCanvas.style.transform = t;
      overlayCanvas.style.transform = t;
    }

    function setMotionEnabled(next) {
      motionEnabled = next;
      if (!motionEnabled) applyStaticTransform();
      updateMotionSignal();
    }

    function adjustMotionSpeed(delta) {
      motionSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, motionSpeed + delta));
      updateMotionSignal();
    }

    updateMotionSignal();

    if (reducedMotion.matches) return;

    window.addEventListener("resize", () => { viewW = window.innerWidth; viewH = window.innerHeight; });
    document.addEventListener("mousemove", (e) => { mouseX = e.clientX; mouseY = e.clientY; });
    document.addEventListener("mouseleave", () => { mouseX = -1; mouseY = -1; });

    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (matchesKey(e, FIELD.MOTION_TOGGLE_KEY)) {
        e.preventDefault();
        setMotionEnabled(!motionEnabled);
        return;
      }
      if (FIELD.SPEED_UP_KEYS.some((k) => matchesKey(e, k))) {
        e.preventDefault();
        adjustMotionSpeed(SPEED_STEP);
        return;
      }
      if (FIELD.SPEED_DOWN_KEYS.some((k) => matchesKey(e, k))) {
        e.preventDefault();
        adjustMotionSpeed(-SPEED_STEP);
      }
    });

    const animate = (now) => {
      if (lastNow === null) lastNow = now;
      const deltaSeconds = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;

      if (!motionEnabled) {
        requestAnimationFrame(animate);
        return;
      }

      phase += deltaSeconds * motionSpeed;
      const t = phase;
      const nx = mouseX >= 0 ? (mouseX / viewW - 0.5) * 2 : 0;
      const ny = mouseY >= 0 ? (mouseY / viewH - 0.5) * 2 : 0;

      const driftX = Math.sin(t * 0.11) * DRIFT_X + nx * PARALLAX_X;
      const driftY = Math.cos(t * 0.09) * DRIFT_Y + ny * PARALLAX_Y;
      const scale  = OVERSCAN_SCALE + Math.sin(t * 0.05) * BREATH_AMOUNT;

      const xf = composedTransform(driftX, driftY, scale);
      grainCanvas.style.transform = xf;
      baseCanvas.style.transform = xf;
      overlayCanvas.style.transform = xf;
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  // ---------- base layer (edges + idle dots) ----------

  // Grain — bezier hatching at low opacity over the whole field, drawn once.
  // Cheaper, more controlled version of the prototype's addGrainGeneric.
  function drawGrain() {
    grainCtx.clearRect(0, 0, W, H);
    grainCtx.lineCap = "round";
    grainCtx.lineWidth = 0.45;
    grainCtx.strokeStyle = "rgba(255,255,255,0.05)";
    const rowStep = 4;
    const segments = 90;
    const segW = W / segments;
    const curveAmp = 6;
    for (let y = 0; y < H; y += rowStep) {
      const angle = (Math.random() - 0.5) * 0.08;
      const phase = (Math.random() * 2 - 1) * segW;
      grainCtx.beginPath();
      let px = -phase;
      let py = Math.max(0, Math.min(H, y + (-phase) * Math.tan(angle)));
      grainCtx.moveTo(px, py);
      for (let j = 1; j <= segments; j++) {
        const ex = j * segW - phase;
        const cp1x = px + (Math.random() - 0.5) * curveAmp;
        const cp1y = py + (Math.random() - 0.5) * curveAmp;
        const cp2x = ex - (Math.random() - 0.5) * curveAmp;
        const cp2y = y + (Math.random() - 0.5) * curveAmp;
        grainCtx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, y);
        px = ex; py = y;
      }
      grainCtx.stroke();
    }
  }

  function drawLoading(text) {
    overlayCtx.clearRect(0, 0, W, H);
    overlayCtx.save();
    overlayCtx.fillStyle = "#888";
    overlayCtx.font = "12px 'SF Mono', monospace";
    overlayCtx.textAlign = "center";
    overlayCtx.textBaseline = "middle";
    overlayCtx.fillText(text, W / 2, H / 2);
    overlayCtx.restore();
  }

  function edgeDimming(e) {
    // Returns {alpha, color, width} based on selection.
    const baseW = CONFIDENCE_WIDTH[e.confidence] || 0.5;
    const ek = edgeKey(e);

    if (selection.kind === "single") {
      const lit = selection.edges.has(ek);
      return {
        alpha: lit ? 0.85 : 0.04,
        color: lit ? EDGE_COLORS[e.type] || EDGE_DEFAULT : "#222",
        width: lit ? baseW + 0.6 : baseW * 0.6,
      };
    }
    if (selection.kind === "path") {
      const lit = selection.pathEdges.has(ek);
      return {
        alpha: lit ? 0.95 : 0.03,
        color: lit ? "#e8d878" : "#222",
        width: lit ? baseW + 1.0 : baseW * 0.5,
      };
    }
    // Default: edges visible but subdued — the artist's composition reads
    // first; edges layer on top quietly, and brighten on selection.
    return { alpha: 0.12, color: EDGE_DEFAULT, width: baseW * 0.65 };
  }

  function nodeDimming(n) {
    if (selection.kind === "single") {
      if (n === selection.node) return { alpha: 1, scale: 1.15 };
      if (selection.neighbours.has(n.id)) return { alpha: 1, scale: 1 };
      return { alpha: 0.08, scale: 1 };
    }
    if (selection.kind === "path") {
      if (selection.pathNodes.has(n.id)) {
        return { alpha: 1, scale: n === selection.a || n === selection.b ? 1.2 : 1 };
      }
      return { alpha: 0.06, scale: 1 };
    }
    if (selection.kind === "weave-pending") {
      if (n === selection.a) return { alpha: 1, scale: 1.2 };
      return { alpha: 0.5, scale: 1 };
    }
    return { alpha: 0.78, scale: 1 };
  }

  function drawBase() {
    // Clear the entire backing buffer in DPR space, THEN apply view transform
    // so subsequent drawing happens in logical (zoomed/panned) coords.
    applyDpr(baseCtx);
    baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
    applyView(baseCtx);

    // Edges — curved bezier with a per-edge midpoint deflection.  Skip any
    // edge whose endpoint isn't placed in this composition (sample dropped it).
    baseCtx.lineCap = "round";
    for (const e of edges) {
      const { alpha, color, width } = edgeDimming(e);
      if (alpha < 0.02) continue;
      if (!e.src.placedRadius || !e.tgt.placedRadius) continue;
      const sx = e.src.baseX, sy = e.src.baseY;
      const tx = e.tgt.baseX, ty = e.tgt.baseY;
      const dx = tx - sx, dy = ty - sy;
      const len = Math.hypot(dx, dy);
      if (len < 0.5) continue;
      const jitter = (e.src.edgeJitter + e.tgt.edgeJitter) * 0.5;
      const deflect = Math.min(40, len * 0.18) * jitter;
      const mx = (sx + tx) / 2 + (-dy / len) * deflect;
      const my = (sy + ty) / 2 + (dx / len) * deflect;
      baseCtx.globalAlpha = alpha;
      baseCtx.strokeStyle = color;
      baseCtx.lineWidth = width;
      baseCtx.beginPath();
      baseCtx.moveTo(sx, sy);
      baseCtx.quadraticCurveTo(mx, my, tx, ty);
      baseCtx.stroke();
    }

    // Dots — spiral-filled at the artist's per-placement radius.  Nodes not
    // sampled this load have placedRadius == 0 and are skipped.
    for (const n of nodes) {
      if (!n.placedRadius) continue;
      const { alpha, scale } = nodeDimming(n);
      if (alpha < 0.02) continue;
      const r = n.placedRadius * scale;
      drawSpiralDot(baseCtx, n.baseX, n.baseY, r, n.strokeCol, alpha, 1.25, n.rotation);

      if (n.slug === ADAI_ROOT_SLUG || n.center) {
        baseCtx.save();
        baseCtx.globalAlpha = alpha * 0.7;
        baseCtx.strokeStyle = "#fff";
        baseCtx.lineWidth = 1;
        baseCtx.beginPath();
        baseCtx.arc(n.baseX, n.baseY, r + 3, 0, TAU);
        baseCtx.stroke();
        baseCtx.restore();
      }
    }
    baseCtx.globalAlpha = 1;

    updateCaption();
  }

  // DOM caption — lives in the chrome layer, never clipped by the drift overscan.
  const captionEl = document.getElementById("field-caption");
  function updateCaption() {
    if (!captionEl) return;
    let title = "", sub = "";
    if (selection.kind === "single" && selection.node) {
      title = selection.node.name;
      sub = `${selection.node.type} · ${selection.neighbours.size} neighbours · double-click to open`;
    } else if (selection.kind === "path" && selection.a && selection.b) {
      title = `${selection.a.name} → ${selection.b.name}`;
      sub = `path · ${selection.pathEdges.size} hops`;
    } else if (selection.kind === "weave-pending") {
      title = selection.a.name;
      sub = "click another node to draw a path";
    }
    if (title) {
      captionEl.innerHTML =
        `<div class="caption-title"></div><div class="caption-sub"></div>`;
      captionEl.querySelector(".caption-title").textContent = title;
      captionEl.querySelector(".caption-sub").textContent = sub;
      captionEl.classList.add("is-visible");
    } else {
      captionEl.classList.remove("is-visible");
    }
  }

  // ---------- interactive overlay ----------

  // Closely follows sketch-brand.js's createInteractiveDotField (1636-2149) but
  // operates over our data-driven dot list and is mode-aware in a graph way.
  function startInteractive() {
    const MODE_CYCLE_KEY = FIELD.MODE_CYCLE_KEY;
    const DEFAULT_MODE_INDEX = Math.max(0, Math.min(FIELD.DEFAULT_MODE_INDEX || 0, FIELD.MODES.length - 1));
    const influenceRadius = reducedMotion.matches ? 110 : 165;
    const passRadius = reducedMotion.matches ? 34 : 58;
    const activeSignalThreshold = 0.014;
    const activeKeepRadius = influenceRadius * 1.22;
    const activationRadius = influenceRadius + passRadius + 26;
    const gridSize = Math.max(96, Math.round(activationRadius));
    const maxActiveDots = reducedMotion.matches ? 72 : 180;
    const modes = FIELD.MODES;

    const dots = [];
    for (const n of nodes) {
      if (!n.placedRadius) { n.dot = null; continue; }
      n.dot = {
        node: n,
        baseX: n.baseX,
        baseY: n.baseY,
        radius: n.placedRadius,
        strokeCol: n.strokeCol,
        energy: 0,
        kick: 0,
        ox: 0,
        oy: 0,
        vx: 0,
        vy: 0,
        phase: Math.random() * TAU,
      };
      dots.push(n.dot);
    }

    const dotGrid = new Map();
    for (const d of dots) {
      const cx = Math.floor(d.baseX / gridSize);
      const cy = Math.floor(d.baseY / gridSize);
      const k = `${cx},${cy}`;
      const b = dotGrid.get(k);
      if (b) b.push(d); else dotGrid.set(k, [d]);
    }

    const activeDots = new Set();
    const pointer = { x: 0, y: 0, prevX: 0, prevY: 0, dx: 0, dy: 0, speed: 0, inside: false, lastStamp: 0 };
    const trail = [];
    let activeMode = DEFAULT_MODE_INDEX;
    let lastNow = 0;
    let running = false;
    let rafId = 0;
    // ripple-mode pulse: list of {nodeId, hopsRemaining, age, intensity}
    let ripplePulses = [];

    function setMode(i) {
      activeMode = clamp(i, 0, modes.length - 1);
      if (vMode) vMode.textContent = `${modes[activeMode].name} · ${LAYOUT_CASE_LABEL} [${MODE_CYCLE_KEY}]`;
      // Reset selection on mode change so semantics don't bleed between modes.
      selection = { kind: "none" };
      ripplePulses = [];
      drawBase();
      refreshVitals();
      requestFrame();
    }

    function requestFrame() {
      if (!running) {
        running = true;
        rafId = requestAnimationFrame(frame);
      }
    }

    function clearOverlay() {
      // Clear in DPR space (whole backing buffer), then re-apply view so
      // subsequent dot rendering uses logical coords.
      applyDpr(overlayCtx);
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      applyView(overlayCtx);
    }

    function activateNear(x, y, radius) {
      const minCX = Math.floor((x - radius) / gridSize);
      const maxCX = Math.floor((x + radius) / gridSize);
      const minCY = Math.floor((y - radius) / gridSize);
      const maxCY = Math.floor((y + radius) / gridSize);
      const r2 = radius * radius;
      for (let cy = minCY; cy <= maxCY; cy++) {
        for (let cx = minCX; cx <= maxCX; cx++) {
          const b = dotGrid.get(`${cx},${cy}`);
          if (!b) continue;
          for (const d of b) {
            const dx = d.baseX - x, dy = d.baseY - y;
            if (dx * dx + dy * dy <= r2) activeDots.add(d);
          }
        }
      }
      if (activeDots.size > maxActiveDots) {
        const ranked = Array.from(activeDots).sort((a, b) => {
          return Math.hypot(a.baseX - x, a.baseY - y) - Math.hypot(b.baseX - x, b.baseY - y);
        });
        activeDots.clear();
        for (let i = 0; i < maxActiveDots; i++) activeDots.add(ranked[i]);
      }
    }

    function pointToSegmentDistance(px, py, ax, ay, bx, by) {
      const dx = bx - ax, dy = by - ay;
      const len2 = dx * dx + dy * dy;
      if (len2 < 1e-6) return Math.hypot(px - ax, py - ay);
      let t = ((px - ax) * dx + (py - ay) * dy) / len2;
      t = clamp(t, 0, 1);
      return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
    }

    function updateDot(d, dt) {
      let proximity = 0, pass = 0;
      if (pointer.inside) {
        const dx = d.baseX - pointer.x, dy = d.baseY - pointer.y;
        const dist = Math.hypot(dx, dy);
        proximity = clamp(1 - dist / influenceRadius, 0, 1);
        if (pointer.prevX !== pointer.x || pointer.prevY !== pointer.y) {
          const seg = pointToSegmentDistance(d.baseX, d.baseY, pointer.prevX, pointer.prevY, pointer.x, pointer.y);
          pass = clamp(1 - seg / passRadius, 0, 1) * clamp(pointer.speed / 3.5, 0.2, 1);
          if (pass > 0.025) {
            const inv = 1 / Math.max(dist, 0.0001);
            const impulse = pass * (reducedMotion.matches ? 11 : 16);
            d.vx += dx * inv * impulse;
            d.vy += dy * inv * impulse;
            d.kick = Math.max(d.kick, pass);
          }
        }
      }
      const wake = Math.max(proximity, pass);
      d.energy += (wake - d.energy) * Math.min(1, dt * (reducedMotion.matches ? 13 : 7.5));
      d.energy *= Math.exp(-dt * (reducedMotion.matches ? 6.5 : 2.8));
      d.kick *= Math.exp(-dt * (reducedMotion.matches ? 8 : 1.9));
      const spring = reducedMotion.matches ? 22 : 13;
      const drag = reducedMotion.matches ? 15 : 8;
      d.vx += (-d.ox * spring - d.vx * drag) * dt;
      d.vy += (-d.oy * spring - d.vy * drag) * dt;
      d.ox += d.vx * dt * 22;
      d.oy += d.vy * dt * 22;
      const off = Math.hypot(d.ox, d.oy);
      if (off > 26) {
        const s = 26 / off;
        d.ox *= s; d.oy *= s;
        d.vx *= 0.9; d.vy *= 0.9;
      }
    }

    function drawOverlayDot(x, y, r, opts = {}) {
      const { strokeCol = DEFAULT_DOT_COLOR, opacity = 0.35, lineWidth = 1, fillAlpha = 0.12 } = opts;
      overlayCtx.save();
      overlayCtx.globalAlpha = opacity;
      overlayCtx.strokeStyle = strokeCol;
      overlayCtx.lineWidth = lineWidth;
      overlayCtx.beginPath();
      overlayCtx.arc(x, y, Math.max(0.85, r), 0, TAU);
      overlayCtx.stroke();
      if (fillAlpha > 0) {
        overlayCtx.globalAlpha = opacity * fillAlpha;
        overlayCtx.fillStyle = strokeCol;
        overlayCtx.beginPath();
        overlayCtx.arc(x, y, Math.max(0.8, r * 0.4), 0, TAU);
        overlayCtx.fill();
      }
      overlayCtx.restore();
    }

    function renderDot(d, nowSec) {
      const baseAlpha = 0.3 + d.energy * 0.35 + d.kick * 0.2;
      switch (modes[activeMode].name) {
        case "ripple": {
          const ringR = d.radius + 4 + d.energy * 8 + d.kick * 18;
          drawOverlayDot(d.baseX, d.baseY, d.radius * (1 + d.energy * 0.16 + d.kick * 0.24), {
            strokeCol: d.strokeCol,
            opacity: 0.22 + d.energy * 0.24 + d.kick * 0.16,
            lineWidth: 1 + d.energy * 0.25,
            fillAlpha: 0.08 + d.energy * 0.12,
          });
          overlayCtx.save();
          overlayCtx.globalAlpha = 0.08 + d.energy * 0.12;
          overlayCtx.strokeStyle = d.strokeCol;
          overlayCtx.lineWidth = 0.9 + d.energy * 0.55;
          overlayCtx.beginPath();
          overlayCtx.arc(d.baseX, d.baseY, ringR, 0, TAU);
          overlayCtx.stroke();
          overlayCtx.restore();
          break;
        }
        case "drift": {
          const x = d.baseX + d.ox * 1.15;
          const y = d.baseY + d.oy * 1.15;
          overlayCtx.save();
          overlayCtx.globalAlpha = 0.06 + d.energy * 0.14;
          overlayCtx.strokeStyle = d.strokeCol;
          overlayCtx.lineWidth = 0.75;
          overlayCtx.beginPath();
          overlayCtx.moveTo(d.baseX, d.baseY);
          overlayCtx.lineTo(x, y);
          overlayCtx.stroke();
          overlayCtx.restore();
          drawOverlayDot(x, y, d.radius * (1 + d.energy * 0.12), {
            strokeCol: d.strokeCol,
            opacity: 0.24 + d.energy * 0.24,
            lineWidth: 1.1,
            fillAlpha: 0.18,
          });
          break;
        }
        case "orbit": {
          const orbitR = d.energy * (8 + d.radius * 0.2) + d.kick * 12;
          const theta = nowSec * (reducedMotion.matches ? 0.7 : 1.05) + d.phase;
          const x = d.baseX + Math.cos(theta) * orbitR + d.ox * 0.25;
          const y = d.baseY + Math.sin(theta) * orbitR * 0.72 + d.oy * 0.25;
          drawOverlayDot(x, y, d.radius * (0.96 + d.energy * 0.18), {
            strokeCol: d.strokeCol,
            opacity: 0.22 + d.energy * 0.24,
            lineWidth: 1.05,
            fillAlpha: 0.14,
          });
          break;
        }
        case "weave": {
          drawOverlayDot(d.baseX + d.ox, d.baseY + d.oy, d.radius * (1 + d.energy * 0.14), {
            strokeCol: d.strokeCol,
            opacity: 0.2 + d.energy * 0.26,
            lineWidth: 1,
            fillAlpha: 0.2,
          });
          break;
        }
        case "bloom": {
          const breathe = 0.5 + 0.5 * Math.sin(nowSec * 1.3 + d.phase);
          const aura = d.radius * (1.15 + d.energy * 0.85 + breathe * d.energy * 0.4);
          overlayCtx.save();
          overlayCtx.globalAlpha = 0.04 + d.energy * 0.14;
          overlayCtx.fillStyle = d.strokeCol;
          overlayCtx.beginPath();
          overlayCtx.arc(d.baseX, d.baseY, aura, 0, TAU);
          overlayCtx.fill();
          overlayCtx.restore();
          drawOverlayDot(d.baseX, d.baseY, d.radius * (1 + d.energy * 0.2), {
            strokeCol: d.strokeCol,
            opacity: 0.2 + d.energy * 0.24,
            lineWidth: 1.05,
            fillAlpha: 0.24,
          });
          break;
        }
      }
    }

    function tickRipples(dt) {
      if (!ripplePulses.length) return false;
      const speed = 5; // hops/sec
      let alive = false;
      for (const p of ripplePulses) {
        p.age += dt;
        const reachedHop = Math.floor(p.age * speed);
        if (reachedHop > p.lastReachedHop && reachedHop <= p.maxHops) {
          // emit kicks to nodes at this hop distance
          const ring = p.hopRings[reachedHop];
          if (ring) {
            for (const id of ring) {
              const n = nodeById.get(id);
              if (n && n.dot) {
                n.dot.kick = Math.min(1, n.dot.kick + p.intensity * Math.exp(-reachedHop * 0.35));
                n.dot.energy = Math.min(1, n.dot.energy + p.intensity * 0.5 * Math.exp(-reachedHop * 0.35));
                activeDots.add(n.dot);
              }
            }
          }
          p.lastReachedHop = reachedHop;
        }
        if (p.lastReachedHop < p.maxHops) alive = true;
      }
      if (!alive) ripplePulses = [];
      return alive;
    }

    function frame(now) {
      const dt = Math.min(lastNow ? (now - lastNow) / 1000 : 1 / 60, 0.05);
      const nowSec = now / 1000;
      lastNow = now;

      for (let i = trail.length - 1; i >= 0; i--) {
        trail[i].age += dt;
        if (trail[i].age > 0.45) trail.splice(i, 1);
      }

      const ripplesAlive = tickRipples(dt);

      clearOverlay();
      let maxSignal = 0;
      let residual = false;
      const snap = Array.from(activeDots);
      for (const d of snap) {
        updateDot(d, dt);
        const sig = Math.max(d.energy, d.kick * 0.85, Math.hypot(d.ox, d.oy) * 0.05);
        const nearPointer =
          pointer.inside && Math.hypot(d.baseX - pointer.x, d.baseY - pointer.y) <= activeKeepRadius;
        if (sig > activeSignalThreshold) {
          maxSignal = Math.max(maxSignal, sig);
          renderDot(d, nowSec);
          residual = true;
        } else if (!nearPointer) {
          activeDots.delete(d);
        }
      }

      if (vSignal) vSignal.textContent = clamp(maxSignal, 0, 1).toFixed(2);

      if (trail.length || residual || ripplesAlive) {
        rafId = requestAnimationFrame(frame);
        return;
      }
      running = false;
      rafId = 0;
      lastNow = 0;
      if (vSignal) vSignal.textContent = "0.00";
      clearOverlay();
    }

    // ---- pointer ----

    function eventToCanvas(e) {
      // 1. clientX → buffer pixel (accounts for CSS drift transform)
      const rect = overlayCanvas.getBoundingClientRect();
      const bx = (e.clientX - rect.left) * (W / Math.max(rect.width, 1));
      const by = (e.clientY - rect.top) * (H / Math.max(rect.height, 1));
      // 2. buffer pixel → logical coord (accounts for canvas-draw zoom/pan)
      return {
        x: (bx - view.panX) / view.zoom,
        y: (by - view.panY) / view.zoom,
      };
    }

    overlayCanvas.addEventListener("mousemove", (e) => {
      const { x, y } = eventToCanvas(e);
      if (!pointer.inside) {
        pointer.prevX = x;
        pointer.prevY = y;
      } else {
        pointer.prevX = pointer.x;
        pointer.prevY = pointer.y;
      }
      pointer.x = x;
      pointer.y = y;
      pointer.dx = x - pointer.prevX;
      pointer.dy = y - pointer.prevY;
      pointer.inside = true;
      const distance = Math.hypot(pointer.dx, pointer.dy);
      const now = performance.now();
      const deltaMs = pointer.lastStamp ? Math.max(now - pointer.lastStamp, 8) : 16;
      pointer.speed = distance / (deltaMs / 16.67);
      pointer.lastStamp = now;
      if (distance > 3) {
        trail.unshift({ x, y, age: 0 });
        if (trail.length > 18) trail.length = 18;
      }
      activateNear(x, y, activationRadius);
      requestFrame();
    });

    overlayCanvas.addEventListener("mouseleave", () => {
      pointer.inside = false;
      pointer.speed = 0;
      pointer.dx = 0;
      pointer.dy = 0;
      requestFrame();
    });

    // ---- click → semantic action per mode ----

    overlayCanvas.addEventListener("click", (e) => {
      const { x, y } = eventToCanvas(e);
      const hit = pickNode(x, y);
      const modeName = modes[activeMode].name;

      if (!hit) {
        // background click in any mode clears selection
        if (selection.kind !== "none") {
          selection = { kind: "none" };
          drawBase();
          refreshVitals();
        }
        return;
      }

      switch (modeName) {
        case "drift":
          // ambient — clicks do nothing semantic
          break;
        case "orbit":
          actOrbit(hit);
          break;
        case "weave":
          actWeave(hit);
          break;
        case "bloom":
          actBloom(hit);
          break;
        case "ripple":
          actRipple(hit);
          break;
      }
    });

    // double-click on a node → open profile
    overlayCanvas.addEventListener("dblclick", (e) => {
      const { x, y } = eventToCanvas(e);
      const hit = pickNode(x, y);
      if (hit) window.location.href = `/practitioner/${hit.slug}`;
    });

    function pickNode(x, y) {
      let best = null, bestD = Infinity;
      for (const n of nodes) {
        if (!n.placedRadius) continue;
        const dx = n.baseX - x, dy = n.baseY - y;
        const d2 = dx * dx + dy * dy;
        const hitR = n.placedRadius + 5;
        if (d2 < hitR * hitR && d2 < bestD) {
          bestD = d2;
          best = n;
        }
      }
      return best;
    }

    // ---- semantic actions ----

    function actOrbit(node) {
      const neighbours = new Set();
      const incident = new Set();
      for (const { other, edge } of adjacency.get(node.id) || []) {
        neighbours.add(other.id);
        incident.add(edgeKey(edge));
      }
      selection = { kind: "single", node, neighbours, edges: incident };
      drawBase();
      refreshVitals();
      requestFrame();
    }

    function actBloom(node) {
      // Use the API for authoritative component (handles truncation).
      fetch(`/api/graph/${encodeURIComponent(node.slug)}/component`)
        .then((r) => r.json())
        .then((comp) => {
          const compIds = new Set(comp.nodes.map((n) => n.id));
          const compEdges = new Set();
          for (const e of edges) {
            if (compIds.has(e.source) && compIds.has(e.target)) compEdges.add(edgeKey(e));
          }
          // single-selection but with the whole component lit
          const neighbours = new Set(compIds);
          neighbours.delete(node.id);
          selection = { kind: "single", node, neighbours, edges: compEdges };
          if (vNodes && vEdges) {
            vNodes.textContent = `${comp.nodes.length}${comp.truncated ? " (truncated)" : ""}`;
            vEdges.textContent = String(comp.edges.length);
          }
          drawBase();
          requestFrame();
        })
        .catch((err) => console.error("[field] bloom fetch failed", err));
    }

    function actWeave(node) {
      if (selection.kind !== "weave-pending") {
        selection = { kind: "weave-pending", a: node };
        drawBase();
        refreshVitals();
        return;
      }
      const a = selection.a;
      const path = bfsPath(a.id, node.id);
      if (!path || path.length < 2) {
        // disconnected — restart at this node
        selection = { kind: "weave-pending", a: node };
        drawBase();
        refreshVitals();
        return;
      }
      const pathNodes = new Set(path.map((p) => p.nodeId));
      const pathEdges = new Set(path.slice(1).map((p) => edgeKey(p.edge)));
      selection = { kind: "path", a, b: node, pathNodes, pathEdges };
      drawBase();
      refreshVitals();
    }

    function actRipple(node) {
      // Highlight the hub like orbit, plus emit a hop-by-hop pulse.
      actOrbit(node);
      const hopRings = bfsHopRings(node.id, 6);
      ripplePulses.push({
        nodeId: node.id,
        hopRings,
        maxHops: hopRings.length - 1,
        lastReachedHop: -1,
        age: 0,
        intensity: 1,
      });
      requestFrame();
    }

    // ---- BFS helpers ----

    function bfsPath(srcId, dstId) {
      if (srcId === dstId) return [{ nodeId: srcId, edge: null }];
      const prev = new Map(); // id -> {fromId, edge}
      const seen = new Set([srcId]);
      const q = [srcId];
      while (q.length) {
        const cur = q.shift();
        if (cur === dstId) break;
        for (const { other, edge } of adjacency.get(cur) || []) {
          if (!seen.has(other.id)) {
            seen.add(other.id);
            prev.set(other.id, { fromId: cur, edge });
            q.push(other.id);
          }
        }
      }
      if (!seen.has(dstId)) return null;
      // reconstruct
      const out = [];
      let cur = dstId;
      while (cur !== srcId) {
        const p = prev.get(cur);
        out.push({ nodeId: cur, edge: p.edge });
        cur = p.fromId;
      }
      out.push({ nodeId: srcId, edge: null });
      out.reverse();
      return out;
    }

    function bfsHopRings(srcId, maxHops) {
      const rings = [[srcId]];
      const seen = new Set([srcId]);
      for (let h = 0; h < maxHops; h++) {
        const next = [];
        for (const id of rings[h]) {
          for (const { other } of adjacency.get(id) || []) {
            if (!seen.has(other.id)) {
              seen.add(other.id);
              next.push(other.id);
            }
          }
        }
        if (!next.length) break;
        rings.push(next);
      }
      return rings;
    }

    // ---- keyboard ----

    document.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
      if (matchesKey(e, MODE_CYCLE_KEY)) {
        e.preventDefault();
        setMode((activeMode + 1) % modes.length);
      } else if (e.key === "Escape") {
        if (selection.kind !== "none") {
          selection = { kind: "none" };
          drawBase();
          refreshVitals();
        }
      }
    });

    window.addEventListener("resize", () => {
      fitCanvases();
      // re-centre layout origin around new size; keep relative positions
      const oldCx = mopey.dataset.cx ? +mopey.dataset.cx : W / 2;
      const oldCy = mopey.dataset.cy ? +mopey.dataset.cy : H / 2;
      const dx = W / 2 - oldCx, dy = H / 2 - oldCy;
      for (const n of nodes) {
        n.baseX += dx;
        n.baseY += dy;
        if (n.dot) {
          n.dot.baseX = n.baseX;
          n.dot.baseY = n.baseY;
        }
      }
      mopey.dataset.cx = W / 2;
      mopey.dataset.cy = H / 2;
      drawGrain();
      drawBase();
      requestFrame();
    });

    setMode(DEFAULT_MODE_INDEX);
  }

  bootstrap();
})();
