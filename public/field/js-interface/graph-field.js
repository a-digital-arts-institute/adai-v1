/**
 * A(DAI) — graph-field (30k view: UMAP semantics snapped onto Shape of Time)
 *
 * The brand sketch (sketch-brand.js) renders the Shape of Time and exposes
 * window.__adaiDotRegistry — the canonical (x, y, radius) of every dot it
 * draws, in brand logical coords (window.__adaiBrandSize = { w, h }).
 *
 * Layout = best of both worlds:
 *   1. Fetch /api/embed-space (Gemini 2 multimodal UMAP, 768-d → 2-d).
 *   2. Normalize each UMAP coord into a 15%-padded brand-space "target".
 *   3. Stride-pick a pool of distinct brand-dot positions from the spiral.
 *   4. Greedy nearest-snap: for each embedded node (in order of edge-type
 *      intention), claim the closest remaining brand dot. Position is the
 *      spiral's; cluster is the semantics'.
 *   5. Nodes without an embedding land on the outermost remaining dots
 *      (shuffled), so the spiral edges show the unembedded periphery.
 *
 * Result: bundle.sim[i].(bx,by) coincides exactly with a Shape-of-Time
 * dot — bound aesthetically — while the *which dot* is decided by UMAP.
 *
 * Zoom layer (10k/5k rose/bucket petal layouts, zoomToVirtualFocus,
 * breadcrumb, replays) is unchanged and animates from these snapped
 * baseX/baseY coordinates.
 */
(() => {
  // ---- config ----
  // 30k snapshot: only PRACTITIONERS render. The other 1,345 nodes (artworks,
  // concepts, institutions, etc.) stay accessible via window.ADAI_GRAPH for
  // the agent skills, but they don't appear at 30k. The reading is "a" canon
  // of practitioners, not "the" graph — `editorial:two-readings` in force.
  const CFG = {
    // 30k snapshot draws every graph node onto a Shape-of-Time dot. Embedded
    // nodes (1,338 today) snap to the spiral position closest to their UMAP
    // target; unembedded nodes (~150) take outer-edge dots. Semantics cluster
    // through the spiral's geometry without overriding it.
    DOT_HEX: '#FFFFFF',
    BASE_ALPHA: 0.92,
    NEUTRAL_ALPHA: 0.55,
    DOT_RADIUS_MIN: 2.4,
    DOT_RADIUS_MAX: 3.6,
    HALO_RADIUS_MULT: 2.6,
    HALO_ALPHA: 0.26,
    HOVER_HALO_ALPHA: 0.55,
    SELECTED_HALO_ALPHA: 0.85,
    DRIFT: 0.06,
    BG_BLEND: 'screen',
    BRAND_OPACITY_WHEN_ACTIVE: '1',
    BRAND_OPACITY_AT_ZOOM: '0.55',   // keep the field present while zoomed in

    CLICK_TOLERANCE: 16,

    // Brand-registry polling — sketch-brand.js fills __adaiDotRegistry on
    // first draw; we wait for it before doing layout.
    REGISTRY_POLL_MS: 80,
    REGISTRY_TIMEOUT_MS: 4000,

    // UMAP → brand-space normalisation. 15% inset on each axis so the
    // semantic cluster sits inside the spiral, not against its edges.
    UMAP_PADDING: 0.15,

    // Type-driven palette so the snapped constellation reads as semantic
    // clusters. Brand-accent set, complementary to the white spiral.
    TYPE_COLORS: {
      practitioner:           '#7EB8DA',  // pale cobalt — the spine of the canon
      artwork:                '#D9A33B',  // amber-gold — works as the warm cluster
      concept:                '#9BA67A',  // muted olive — semantic field
      institution:            '#3E8B85',  // jade-teal — structural actor
      scene:                  '#C77A4A',  // rust — gatherings
      collective:             '#B8542F',  // deeper rust — collective bodies
      platform:               '#2A7672',  // jade — distribution layer
      publication:            '#B88A1B',  // ochre — print/text
      classification_regime:  '#C9A227',  // gold — the lens itself
      project:                '#8F8A78',
      event:                  '#7B6F8F',
      related:                '#5A5A5C',
    },
    TYPE_COLOR_FALLBACK: '#E8E6E1',

    // Edge types we don't render at zoom views.
    // CLASSIFIED_BY is hidden because there's only one regime today (the
    // seed canon) — every node points to it, so the petal/wedge is noise.
    // When more regimes exist (or when we rename to LENS), revisit.
    // Pending: Gio to expose signal provenance, then we add RECEIVED_VIA
    // as a new edge type. See vault: boards/notes-for-gio.md.
    HIDDEN_EDGE_TYPES: ['CLASSIFIED_BY'],

    // ---- Step 3a: 10k zoom ----
    ZOOM_TRANSITION_MS: 950,
    REPLAY_DWELL_MS: 1200,        // pause at each node during URL/bookmark replay
    ZOOM_FOCUS_RADIUS: 6.5,
    ZOOM_NEIGHBOR_RADIUS: 3.2,
    ZOOM_NEIGHBOR_RING_R: 0.34,      // fraction of min(w, h)
    ZOOM_NEIGHBOR_RING_R2: 0.46,     // outer ring if too many for one
    ZOOM_RING_THRESHOLD: 18,         // > this neighbors → split into two rings
    ZOOM_OFFSCREEN_ALPHA: 0.28,      // 30k practitioners stay as a faint constellation when zoomed
    EDGE_THREAD_ALPHA: 0.45,
    EDGE_THREAD_WIDTH_BY_CONFIDENCE: {
      high:       2.2,
      medium:     1.4,
      low:        0.8,
      unverified: 0.5,
    },
    EDGE_THREAD_WIDTH_DEFAULT: 1.2,
    NAME_TEXT_ALPHA: 1.0,            // text needs to read clearly over the brand
    NAME_TEXT_SIZE: 11,

    // Label legibility model. The dots are always all drawn (density is
    // signal); only NAMES are managed, since per-frame text is what floods
    // the GPU and the eye.
    //   - LABEL_MAX_SHOWN doubles as the few-vs-many switch AND the per-frame
    //     cap. If a focused node has <= this many neighbours, every name shows
    //     always (sparse nodes read like a plain labelled graph). Above it,
    //     names reveal only near the cursor (the "reading lens") so you sweep
    //     to read a dense node without a thousand-label flood.
    //   - LABEL_LENS_RADIUS: reveal radius around the cursor in many-mode.
    //   - Collision avoidance + a dark backing pill keep names readable even
    //     where the layout packs dots tightly (the real legibility problem).
    LABEL_MAX_SHOWN: 60,
    LABEL_LENS_RADIUS: 170,
    LABEL_BACKING_ALPHA: 0.55,       // dark pill behind each name for contrast

    // Editorial: practitioners stay as halos/dots (the constellation); only
    // artworks render with their image. Some practitioners carry portrait
    // URLs in the API — we ignore them on purpose. See memory:
    // feedback_images_artworks_only.md.
    THUMB_TYPES: ['artwork'],
    THUMB_PETAL_RADIUS_MAX: 16,      // px — circle clip radius at low artwork-density
    THUMB_PETAL_RADIUS_MIN: 7,       // px — floor; below this it stops being readable
    THUMB_PETAL_DENSITY_KNEE: 6,     // up to this many artworks per petal stay at MAX
    THUMB_PETAL_DENSITY_SLOPE: 0.42, // px shrink per extra artwork past the knee
    THUMB_HERO_RADIUS: 58,           // px — hero thumbnail radius when an artwork is the focus
    THUMB_RING_WIDTH: 1,             // subtle white ring around thumbnails for legibility
  };

  // Density-aware thumbnail radius. Practitioners like Robert Hodgin have 29
  // artworks on a single CREATED_BY petal — at fixed 16px they overlap badly.
  // Shrink linearly past a knee, clamp to a legible floor.
  function thumbPetalRadiusFor(artworkCountInGroup) {
    const knee = CFG.THUMB_PETAL_DENSITY_KNEE;
    const max = CFG.THUMB_PETAL_RADIUS_MAX;
    const min = CFG.THUMB_PETAL_RADIUS_MIN;
    if (artworkCountInGroup <= knee) return max;
    return Math.max(min, max - (artworkCountInGroup - knee) * CFG.THUMB_PETAL_DENSITY_SLOPE);
  }

  // ---- Image helpers (artwork thumbnails) ----------------------------------
  // Backend returns `cdn_image_url` (R2 hot CDN, preferred) and `image_url`
  // on nodes. ~393/1491 carry one. Some `cdn_image_url`s are .html mirrors
  // (Rhizome wiki etc.) — those return 200 with text/html and won't render.
  // Filter strictly to known image extensions (incl. avif — SuperRare's imgix
  // serves fm=avif, which R2 keys as .avif; browsers render it natively).
  const IMG_EXT_RE = /\.(jpe?g|png|gif|webp|avif)(\?|$)/i;
  function isRenderableImageUrl(url) {
    return typeof url === 'string' && IMG_EXT_RE.test(url);
  }
  function pickImageUrl(node) {
    if (!node) return null;
    if (isRenderableImageUrl(node.cdn_image_url)) return node.cdn_image_url;
    if (isRenderableImageUrl(node.image_url)) return node.image_url;
    return null;
  }
  // Cache by URL. R2 sends `Access-Control-Allow-Origin: *`, so crossOrigin
  // works and we can drawImage onto canvas without tainting it.
  const __imgCache = new Map();
  function getImageFor(node) {
    if (!node || !CFG.THUMB_TYPES.includes(node.type)) return null;
    const url = pickImageUrl(node);
    if (!url) return null;
    let entry = __imgCache.get(url);
    if (!entry) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      entry = { img, status: 'loading' };
      img.addEventListener('load', () => { entry.status = 'ready'; });
      img.addEventListener('error', () => { entry.status = 'error'; });
      img.src = url;
      __imgCache.set(url, entry);
    }
    return entry.status === 'ready' ? entry.img : null;
  }
  // Batched dot draw. Drawing N dots as N separate beginPath/arc/fill calls
  // (with a fillStyle + globalAlpha change each) is the dominant per-frame
  // cost at 8k+ nodes — it saturates the main thread and makes mousemove lag.
  // Here we bucket dots by (colour, quantised alpha) and emit ONE path + ONE
  // fill per bucket, so ~17k fill() calls collapse to a few dozen. The
  // moveTo before each arc prevents the subpaths joining with stray lines.
  // `dots` is an array of {x, y, r, color, alpha}; alpha < 0.005 is skipped.
  function drawDotsBatched(ctx, dots) {
    const TWO_PI = Math.PI * 2;
    const buckets = new Map();
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      if (d.alpha < 0.005) continue;
      const aQ = Math.round(d.alpha * 40) / 40; // 0.025 alpha buckets
      const key = d.color + '|' + aQ;
      let b = buckets.get(key);
      if (!b) { b = { color: d.color, alpha: aQ, pts: [] }; buckets.set(key, b); }
      b.pts.push(d.x, d.y, d.r);
    }
    for (const b of buckets.values()) {
      ctx.fillStyle = b.color;
      ctx.globalAlpha = b.alpha;
      ctx.beginPath();
      const p = b.pts;
      for (let i = 0; i < p.length; i += 3) {
        const x = p[i], y = p[i + 1], r = p[i + 2];
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, TWO_PI);
      }
      ctx.fill();
    }
  }

  // Pre-rendered circular thumbnail sprites. The clip + cover-fit + ring is
  // expensive (ctx.clip() especially) and was being paid PER thumbnail PER
  // frame — the dominant cost once artworks render as images. We do it ONCE
  // per (image, radius) into an offscreen canvas and then just blit that
  // sprite each frame (a single drawImage, no clip/save/restore). Built at
  // devicePixelRatio resolution so it stays crisp on retina.
  const _thumbSpriteCache = new Map();
  const _THUMB_CACHE_MAX = 600;
  function getThumbSprite(img, r) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return null;
    const rr = Math.round(r);
    const key = (img.currentSrc || img.src || '') + '|' + rr;
    let sprite = _thumbSpriteCache.get(key);
    if (sprite) return sprite;

    const dpr = window.devicePixelRatio || 1;
    const sizePx = Math.max(2, Math.ceil(2 * rr * dpr));
    const off = document.createElement('canvas');
    off.width = sizePx;
    off.height = sizePx;
    const octx = off.getContext('2d');
    octx.scale(dpr, dpr);
    const c = rr; // logical centre
    // cover-fit
    const scale = (2 * rr) / Math.min(iw, ih);
    const dw = iw * scale, dh = ih * scale;
    octx.beginPath();
    octx.arc(c, c, rr, 0, Math.PI * 2);
    octx.closePath();
    octx.clip();
    octx.drawImage(img, c - dw / 2, c - dh / 2, dw, dh);
    // ring (drawn inside the clip so it never bleeds past the circle edge)
    octx.lineWidth = CFG.THUMB_RING_WIDTH * 2; // half is clipped away → hairline
    octx.strokeStyle = 'rgba(255,255,255,0.85)';
    octx.beginPath();
    octx.arc(c, c, rr, 0, Math.PI * 2);
    octx.stroke();

    if (_thumbSpriteCache.size >= _THUMB_CACHE_MAX) {
      // simple FIFO evict — keeps memory bounded under lots of radii/images
      _thumbSpriteCache.delete(_thumbSpriteCache.keys().next().value);
    }
    sprite = { canvas: off, r: rr };
    _thumbSpriteCache.set(key, sprite);
    return sprite;
  }

  // Blit a circular thumbnail sprite. ctx.globalAlpha is honoured (caller sets
  // it). Falls back to a direct clipped draw only if the sprite can't build.
  function drawCircleImage(ctx, img, cx, cy, r) {
    const sprite = getThumbSprite(img, r);
    if (sprite) {
      const rr = sprite.r;
      ctx.drawImage(sprite.canvas, cx - rr, cy - rr, 2 * rr, 2 * rr);
      return;
    }
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const scale = (2 * r) / Math.min(iw, ih);
    const dw = iw * scale, dh = ih * scale;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
    ctx.restore();
  }

  // ---- DOM setup ----
  function ensureCanvas() {
    let canvas = document.getElementById('graph-canvas');
    if (canvas) return canvas;
    canvas = document.createElement('canvas');
    canvas.id = 'graph-canvas';
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'auto',     // hover + click on practitioner dots
      zIndex: '2',
      mixBlendMode: CFG.BG_BLEND,
    });
    document.body.appendChild(canvas);
    return canvas;
  }

  function sizeCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  // ---- read Shape of Time positions (restored) -------------------------
  function readBrandPositions() {
    const reg = window.__adaiDotRegistry;
    if (!Array.isArray(reg) || reg.length === 0) return null;
    const size = window.__adaiBrandSize || { w: 1600, h: 900 };
    return { positions: reg.slice(), brandW: size.w, brandH: size.h };
  }

  function waitForRegistry() {
    return new Promise((resolve) => {
      const tStart = Date.now();
      (function poll() {
        const r = readBrandPositions();
        if (r) return resolve(r);
        if (Date.now() - tStart > CFG.REGISTRY_TIMEOUT_MS) return resolve(null);
        setTimeout(poll, CFG.REGISTRY_POLL_MS);
      })();
    });
  }

  // Stride-pick visually distinct brand positions (dedup by coarse grid,
  // then evenly subsample to `want`). The registry has tens of thousands
  // of dots; dedup spreads picks across the full composition.
  function pickDistinctPositions(brand, want) {
    const GRID = 14;
    const seen = new Map();
    for (const p of brand.positions) {
      const key = `${(p.x / GRID) | 0},${(p.y / GRID) | 0}`;
      if (!seen.has(key)) seen.set(key, p);
    }
    const distinct = Array.from(seen.values());
    if (distinct.length <= want) return distinct;
    const stride = distinct.length / want;
    const picked = new Array(want);
    for (let i = 0; i < want; i++) picked[i] = distinct[(i * stride) | 0];
    return picked;
  }

  // ---- UMAP layout source ----------------------------------------------
  // /api/embed-space returns a precomputed UMAP projection of every node's
  // multimodal embedding (Gemini Embedding 2, 768-d → 2-d via UMAP, cosine,
  // n_neighbors=15, min_dist=0.1, seed=42). 1,338/1,491 nodes are covered.
  async function fetchEmbedSpace() {
    try {
      const res = await fetch('/api/embed-space', { cache: 'no-cache' });
      if (!res.ok) {
        console.warn('[adai] /api/embed-space →', res.status);
        return null;
      }
      const data = await res.json();
      if (!data || !Array.isArray(data.items)) return null;
      return data;
    } catch (err) {
      console.warn('[adai] /api/embed-space failed:', err.message || err);
      return null;
    }
  }

  // Z-priority: smaller = drawn first (= behind). Practitioners + artworks
  // paint on top so they stay readable in dense snapped clusters.
  const Z_BY_TYPE = {
    classification_regime: 0, project: 1, related: 1, event: 1,
    publication: 2, platform: 2, collective: 2,
    concept: 3, scene: 3, institution: 3,
    artwork: 4, practitioner: 5,
  };
  function zForType(t) { return Z_BY_TYPE[t] != null ? Z_BY_TYPE[t] : 3; }

  // Look up the brand-accent colour for a node type. Used by frame() to
  // give the 30k constellation a readable type structure.
  function colorForType(type) {
    return CFG.TYPE_COLORS[type] || CFG.TYPE_COLOR_FALLBACK;
  }

  // ---- semantic snapping -----------------------------------------------
  // The heart of the field: UMAP says where in semantic space a node
  // belongs; the Shape of Time provides the dot grid. We greedily pair
  // each embedded node to the *closest available* spiral dot to its
  // UMAP-target. Position is the spiral's; cluster is UMAP's.
  function pairNodesToPositions(graph, brand, embedSpace) {
    // 1. Pool of available brand dots (one slot per graph node).
    const wanted = graph.nodes.length;
    const pool = pickDistinctPositions(brand, wanted);
    const available = pool.map(p => ({
      x: p.x, y: p.y, radius: p.radius, used: false,
    }));

    // 2. Partition graph nodes by whether they have an embedding.
    const embedById = new Map();
    if (embedSpace && Array.isArray(embedSpace.items)) {
      for (const it of embedSpace.items) embedById.set(it.id, it);
    }
    const embedded = [];
    const unembedded = [];
    for (const n of graph.nodes) {
      if (embedById.has(n.id)) embedded.push(n);
      else unembedded.push(n);
    }

    // 3. UMAP bbox → 15%-padded brand-space target per embedded node.
    let minX =  Infinity, minY =  Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    for (const n of embedded) {
      const e = embedById.get(n.id);
      if (typeof e.x !== 'number' || typeof e.y !== 'number') continue;
      if (e.x < minX) minX = e.x;
      if (e.x > maxX) maxX = e.x;
      if (e.y < minY) minY = e.y;
      if (e.y > maxY) maxY = e.y;
    }
    if (!isFinite(minX) || maxX === minX || maxY === minY) {
      minX = -1; maxX = 1; minY = -1; maxY = 1;
    }
    const pad = CFG.UMAP_PADDING;
    const innerW = brand.brandW * (1 - 2 * pad);
    const innerH = brand.brandH * (1 - 2 * pad);
    
    // Preserve aspect ratio: find the max range across both axes
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const maxRange = Math.max(rangeX, rangeY);
    
    // Calculate scale factor to fit within the padded area
    const scale = Math.min(innerW, innerH) / maxRange;
    
    // Center the cluster in the brand space
    const cx = brand.brandW / 2;
    const cy = brand.brandH / 2;
    const umapCx = minX + rangeX / 2;
    const umapCy = minY + rangeY / 2;

    const targets = new Map();
    for (const n of embedded) {
      const e = embedById.get(n.id);
      // Scale and translate relative to the center
      const tx = cx + (e.x - umapCx) * scale;
      const ty = cy + (e.y - umapCy) * scale;
      targets.set(n.id, { tx, ty });
    }

    // 4. Greedy nearest-snap. Sort embedded by intention first so the
    //    most relationally-rich nodes claim their preferred spot before
    //    less-connected nodes squat the same brand dot.
    embedded.sort((a, b) => {
      const ia = graph.intentionOf(a.id);
      const ib = graph.intentionOf(b.id);
      if (ib !== ia) return ib - ia;
      return (a.name || a.id).localeCompare(b.name || b.id);
    });

    const sim = [];
    for (const n of embedded) {
      const t = targets.get(n.id);
      let bestI = -1, bestD2 = Infinity;
      // Brute-force over the available pool. ~1,300 embedded × ~1,500
      // candidate dots ≈ 2M ops, runs in a few ms once at start time.
      for (let i = 0; i < available.length; i++) {
        if (available[i].used) continue;
        const dx = available[i].x - t.tx;
        const dy = available[i].y - t.ty;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; bestI = i; }
      }
      if (bestI === -1) break;          // pool exhausted; remainder will fallback
      const p = available[bestI];
      p.used = true;
      sim.push({
        id: n.id, name: n.name, type: n.type,
        bx: p.x, by: p.y, bRad: p.radius,
        x: 0, y: 0,
        _z: zForType(n.type),
      });
    }

    // 5. Fallback for unembedded nodes — drop them on the outermost
    //    remaining dots (closest to the spiral periphery), shuffled so
    //    the placement feels random rather than alphabetised.
    if (unembedded.length) {
      const cxBrand = brand.brandW / 2;
      const cyBrand = brand.brandH / 2;
      const remaining = available
        .filter(p => !p.used)
        .sort((a, b) => {
          const da = (a.x - cxBrand) ** 2 + (a.y - cyBrand) ** 2;
          const db = (b.x - cxBrand) ** 2 + (b.y - cyBrand) ** 2;
          return db - da; // farthest from centre first
        });
      // Take the outer slice we actually need (or as much of the pool as
      // we have if it's smaller).
      const slice = remaining.slice(0, unembedded.length);
      // Fisher–Yates shuffle inside the slice so the placement is random.
      for (let i = slice.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const tmp = slice[i]; slice[i] = slice[j]; slice[j] = tmp;
      }
      for (let k = 0; k < unembedded.length && k < slice.length; k++) {
        const n = unembedded[k];
        const p = slice[k];
        p.used = true;
        sim.push({
          id: n.id, name: n.name, type: n.type,
          bx: p.x, by: p.y, bRad: p.radius,
          x: 0, y: 0,
          _z: zForType(n.type),
        });
      }
    }

    // 6. Z-sort so the high-priority types render on top of overlapping
    //    low-priority ones in the snapped constellation.
    sim.sort((a, b) => a._z - b._z);

    return {
      sim,
      brandW: brand.brandW,
      brandH: brand.brandH,
      snapshotType: 'umap-snapped',
      snapshotSize: sim.length,
      totalGraph: graph.nodes.length,
      distinctCount: pool.length,
      embeddedCount: embedded.length,
      unembeddedCount: unembedded.length,
      embedModel: (embedSpace && embedSpace.model) || null,
    };
  }

  // Project brand-space (0..brandW, 0..brandH) into the screen rect occupied
  // by the brand canvas. This is what aligns our dots with the visible
  // Shape of Time.
  function reproject(simBundle) {
    const { sim, brandW, brandH } = simBundle;
    const myCanvas = document.getElementById('myCanvas') || document.querySelector('#mopey canvas');
    let rect;
    if (myCanvas) {
      rect = myCanvas.getBoundingClientRect();
    } else {
      rect = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    }
    const sx = rect.width / brandW;
    const sy = rect.height / brandH;
    const minScale = Math.min(sx, sy);
    const atRest = !simBundle.viewLevel || simBundle.viewLevel === '30k';
    for (const s of sim) {
      // baseX/baseY/baseR = 30k "home" position. Stable across resize.
      s.baseX = rect.left + s.bx * sx;
      s.baseY = rect.top + s.by * sy;
      s.baseR = Math.max(CFG.DOT_RADIUS_MIN, Math.min(CFG.DOT_RADIUS_MAX, s.bRad * minScale * 0.45));
      // x/y/r = current animated position. Snap to base only when at 30k rest.
      if (atRest) {
        s.x = s.baseX;
        s.y = s.baseY;
        s.r = s.baseR;
      }
    }
    simBundle.canvasRect = rect;
  }

  // ---- entity panel (interim Step 3 preview) ----
  // Click a practitioner -> a side panel surfaces their real graph data
  // (name, id, edge count, intention, sample edges). Not the full zoom yet —
  // just proof that what you see is bound to what's in /api/graph.
  function createEntityPanel() {
    const el = document.createElement('div');
    el.id = 'entity-panel';
    Object.assign(el.style, {
      position: 'fixed',
      top: '50%',
      right: '24px',
      transform: 'translateY(-50%)',
      width: '320px',
      maxHeight: '78vh',
      overflowY: 'auto',
      background: 'rgba(12,12,14,0.92)',
      border: '1px solid #2a2a30',
      borderRadius: '4px',
      padding: '16px 18px',
      color: '#E8E6E1',
      fontFamily: "'SF Mono', 'Menlo', 'Consolas', monospace",
      fontSize: '11px',
      lineHeight: '1.55',
      zIndex: '50',
      display: 'none',
      backdropFilter: 'blur(6px)',
      webkitBackdropFilter: 'blur(6px)',
    });
    document.body.appendChild(el);
    return el;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function showEntityPanel(panelEl, graph, sim) {
    const node = graph.byId.get(sim.id);
    if (!node) return;
    const types = graph.edgeTypeCount.get(sim.id);
    const allEdges = graph.edgesFor(sim.id);
    const sampleEdges = allEdges.slice(0, 10);
    const typesHtml = types
      ? Array.from(types).sort((a, b) => b[1] - a[1])
          .map(([t, n]) => `<span style="color:#7eb8da">${escapeHtml(t)}</span>&nbsp;${n}`).join('&nbsp;·&nbsp;')
      : '<span style="color:#666">none</span>';
    const edgesHtml = sampleEdges.map(e => {
      const dir = e.source === sim.id ? '→' : '←';
      const otherId = e.source === sim.id ? e.target : e.source;
      const other = graph.byId.get(otherId);
      const otherName = other ? other.name : (otherId.split(':')[1] || otherId);
      const conf = e.confidence || 'unknown';
      return `<div style="padding:3px 0;color:#c8c8c8"><span style="color:#666">${dir}</span> ${escapeHtml(otherName)} <span style="color:#555;float:right;font-size:10px">${escapeHtml(e.type)}&nbsp;·&nbsp;${escapeHtml(conf)}</span></div>`;
    }).join('');
    const moreCount = allEdges.length - sampleEdges.length;
    const moreHtml = moreCount > 0
      ? `<div style="color:#555;padding-top:6px;font-size:10px">+ ${moreCount} more · agent skill will surface them at zoom</div>`
      : '';
    panelEl.innerHTML = `
      <button class="adai-close" aria-label="close" style="float:right;background:none;border:none;color:#666;cursor:pointer;font-size:16px;line-height:1;padding:0;margin-left:8px">×</button>
      <div style="color:#666;font-size:9px;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px">${escapeHtml(node.type)}${node.year ? ` · ${escapeHtml(node.year)}` : ''}</div>
      <div style="font-size:15px;color:#fff;margin-bottom:4px;line-height:1.25">${escapeHtml(node.name)}</div>
      <div style="color:#555;font-size:10px;margin-bottom:14px;word-break:break-all">${escapeHtml(node.id)}</div>
      <div style="border-top:1px solid #2a2a30;padding-top:12px">
        <div style="color:#888;margin-bottom:4px">edges <span style="color:#fff">${allEdges.length}</span> &nbsp;·&nbsp; types <span style="color:#fff">${graph.intentionOf(sim.id)}</span></div>
        <div style="font-size:10px;margin-bottom:14px">${typesHtml}</div>
        <div style="color:#888;margin-bottom:6px">connections</div>
        ${edgesHtml}
        ${moreHtml}
      </div>
    `;
    panelEl.querySelector('.adai-close').addEventListener('click', () => {
      panelEl.style.display = 'none';
    }, { once: true });
    panelEl.style.display = 'block';
  }

  function nearestSim(bundle, x, y, tolerance) {
    let best = null;
    let bestD2 = tolerance * tolerance;
    for (const s of bundle.sim) {
      const dx = s.x - x;
      const dy = s.y - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) { bestD2 = d2; best = s; }
    }
    return best;
  }

  // ---- Step 3: zoom (10k practitioner view) ----
  // View state lives on bundle so it's reachable from the render loop.
  // Levels: '30k' (Shape of Time + practitioner snapshot)
  //         '10k' (one practitioner centred + 1-hop neighbours around)
  //         '5k'  (Step 3b: scene at centre, members around)
  function easeInOutCubic(t) {
    // Smoother quartic ease: gentler ramp-in and decel-out than cubic.
    // Name kept for call-site stability; behavior is now in/out quart.
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  // Pull the per-edge accent color from edge-type-colors.js.
  function colorForEdge(type) {
    const lib = window.ADAI_EDGE_COLORS;
    if (!lib) return '#888';
    return (lib.colorFor(type) || lib.NEUTRAL).hex;
  }

  // ---- Layouts (case 17 rose + case 20 bucketed wedges) ----
  // Both produce the same shape: { cx, cy, neighbors: [...] }
  // where each neighbor has { id, name, type, edgeType, edgeConfidence,
  // edgeColor, x, y, r, startX, startY, startR, alpha }.

  // Group edges by type, dedup by other-node-id, return:
  //   [{ edgeType, items: [{ id, name, type, edgeType, edgeConfidence, edgeColor, edge }] }, ...]
  // sorted by edge type name so the visual ordering is stable.
  function gatherNeighborsByType(graph, focusedId) {
    const edges = graph.edgesFor(focusedId);
    const seen = new Set();
    const byType = new Map();
    const hiddenTypes = new Set(CFG.HIDDEN_EDGE_TYPES || []);
    for (const e of edges) {
      if (hiddenTypes.has(e.type)) continue;
      const otherId = e.source === focusedId ? e.target : e.source;
      if (seen.has(otherId)) continue;
      seen.add(otherId);
      const node = graph.byId.get(otherId);
      if (!node) continue;
      const item = {
        id: otherId,
        name: node.name,
        type: node.type,
        edgeType: e.type,
        edgeConfidence: e.confidence,
        edgeColor: colorForEdge(e.type),
        edge: e,
      };
      if (!byType.has(e.type)) byType.set(e.type, []);
      byType.get(e.type).push(item);
    }
    // Sort each group's items alphabetically by name for stability
    for (const arr of byType.values()) {
      arr.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
    }
    // Sort groups by edge-type name (stable across visits)
    const ordered = Array.from(byType.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return ordered.map(([edgeType, items]) => ({ edgeType, items }));
  }

  // Rose / petal layout (case 17 in sketch-brand.js).
  // k petals = number of distinct edge types. Each petal carries the
  // neighbours of one edge type along the rose curve r = R·cos(k·θ).
  // The shape itself encodes the focused node's intention (edge-type
  // diversity): a high-intention node blooms with many petals.
  function computeRoseLayout(graph, focusedId, w, h) {
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) * 0.42;
    const groups = gatherNeighborsByType(graph, focusedId);
    const k = groups.length;
    if (k === 0) return { cx, cy, neighbors: [], layout: 'rose', petalCount: 0 };

    const out = [];
    groups.forEach((group, gi) => {
      // petal center direction; first petal points up so layout reads top-first
      const petalCenter = (gi / k) * Math.PI * 2 - Math.PI / 2;
      const N = group.items.length;
      // Count artworks in this petal so the renderer can shrink thumbs when
      // the petal is dense (e.g., a practitioner's CREATED_BY edges).
      const artworkCount = group.items.filter(it => {
        const node = graph.byId.get(it.id);
        return node && CFG.THUMB_TYPES.includes(node.type);
      }).length;
      group.items.forEach((it, n) => {
        // u in [0.18, 0.82] avoids collapsing at petal base (r=0)
        const u = N === 1 ? 0.5 : 0.18 + (n / (N - 1)) * 0.64;
        const thetaRel = (u - 0.5) * Math.PI / k;
        // r = R · cos(k · θ)  — the rose math
        const r = R * Math.cos(k * thetaRel);
        const thetaAbs = petalCenter + thetaRel;
        out.push({
          ...it,
          x: cx + r * Math.cos(thetaAbs),
          y: cy + r * Math.sin(thetaAbs),
          r: CFG.ZOOM_NEIGHBOR_RADIUS,
          groupArtworkCount: artworkCount,
          startX: cx, startY: cy, startR: 0,
          alpha: 0,
        });
      });
    });
    return { cx, cy, neighbors: out, layout: 'rose', petalCount: k };
  }

  // Bucketed-wedges layout (case 20 in sketch-brand.js, generalised).
  // Each edge type gets one angular wedge of equal width (2π/k). Inside
  // each wedge, neighbours pack in a small grid (rows × cols) so dense
  // edge types stay legible.
  function computeBucketedLayout(graph, focusedId, w, h) {
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) * 0.44;
    const groups = gatherNeighborsByType(graph, focusedId);
    const k = groups.length;
    if (k === 0) return { cx, cy, neighbors: [], layout: 'bucketed', wedgeCount: 0 };

    const out = [];
    const wedgeWidth = (Math.PI * 2) / k;
    groups.forEach((group, gi) => {
      const wedgeCenter = (gi / k) * Math.PI * 2 - Math.PI / 2;
      const items = group.items;
      const N = items.length;
      const artworkCount = items.filter(it => {
        const node = graph.byId.get(it.id);
        return node && CFG.THUMB_TYPES.includes(node.type);
      }).length;
      // Grid the wedge: rowsCount rows of dots, dotsPerRow per row
      const rowsCount = Math.max(1, Math.ceil(Math.sqrt(N * 0.7)));
      const dotsPerRow = Math.max(1, Math.ceil(N / rowsCount));
      const innerR = R * 0.32;
      const outerR = R;
      items.forEach((it, idx) => {
        const row = Math.floor(idx / dotsPerRow);
        const col = idx % dotsPerRow;
        const inThisRow = Math.min(dotsPerRow, N - row * dotsPerRow);
        const rNorm = rowsCount === 1 ? 0.5 : row / (rowsCount - 1);
        const r = innerR + rNorm * (outerR - innerR);
        const angSpread = wedgeWidth * 0.78;
        const angOffset = inThisRow === 1
          ? 0
          : (col - (inThisRow - 1) / 2) / (inThisRow - 1) * angSpread;
        const ang = wedgeCenter + angOffset;
        out.push({
          ...it,
          x: cx + Math.cos(ang) * r,
          y: cy + Math.sin(ang) * r,
          r: CFG.ZOOM_NEIGHBOR_RADIUS,
          groupArtworkCount: artworkCount,
          startX: cx, startY: cy, startR: 0,
          alpha: 0,
        });
      });
    });
    return { cx, cy, neighbors: out, layout: 'bucketed', wedgeCount: k };
  }

  // Pick rose for practitioner+scene (their bloom IS who they are).
  // Pick bucketed wedges for everything else (concepts, artworks,
  // institutions, regimes — high-degree, denser packing needed).
  function computeLayoutFor(graph, focusedId, w, h) {
    const node = graph.byId.get(focusedId);
    const t = node ? node.type : null;
    if (t === 'practitioner' || t === 'scene') return computeRoseLayout(graph, focusedId, w, h);
    return computeBucketedLayout(graph, focusedId, w, h);
  }

  // Legacy alias — every old caller now goes through the dispatcher.
  function compute10kLayout(graph, focusedId, w, h) {
    return computeLayoutFor(graph, focusedId, w, h);
  }

  // Generic position tween. Mutates targets each frame, calls onDone at end.
  function runTween(durationMs, onTick, onDone) {
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / durationMs);
      const e = easeInOutCubic(t);
      onTick(e);
      if (t < 1) requestAnimationFrame(step);
      else if (onDone) onDone();
    }
    requestAnimationFrame(step);
  }

  // Field-mode default filters. Both zoom-to handlers wipe activeFilters
  // (intentionally — a fresh zoom shouldn't inherit hand-toggled chips
  // from the previous focus), and setMode also calls this so the
  // curatorial/embeddings split has one source of truth. Keeping it
  // module-scoped so zoomToNode (top-level) and bundle.setMode (inside
  // the IIFE init) can both reach it.
  function applyDefaultFiltersForMode(bundle) {
    if (bundle.fieldMode === 'embeddings') {
      bundle.activeFilters = new Set(['STYLE_KIN', 'VISUALLY_AFFINE']);
    } else {
      bundle.activeFilters = new Set();
    }
  }

  // Dim the brand viz while we're zoomed in (focus the graph layer).
  function setBrandOpacityForZoom(zoomedIn) {
    const targets = [
      document.getElementById('mopey'),
      document.getElementById('myCanvas'),
      document.querySelector('#mopey canvas'),
    ].filter(Boolean);
    const target = zoomedIn ? CFG.BRAND_OPACITY_AT_ZOOM : CFG.BRAND_OPACITY_WHEN_ACTIVE;
    for (const el of targets) {
      el.style.transition = `opacity ${CFG.ZOOM_TRANSITION_MS}ms ease`;
      el.style.opacity = target;
    }
  }

  // ---- Breadcrumb chrome ----
  // field › Vera Molnár ›PRACTICES› algorithmic art ›EMBODIES› [artwork]
  // Each segment is clickable. The edge-type word between segments is in
  // the edge type's accent colour.
  function createBreadcrumb() {
    let el = document.getElementById('adai-breadcrumb');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'adai-breadcrumb';
    Object.assign(el.style, {
      position: 'fixed',
      top: '54px',          // sits below the logotype
      left: '24px',
      zIndex: '40',
      fontFamily: "'SF Mono', 'Menlo', 'Consolas', monospace",
      fontSize: '11px',
      lineHeight: '1.4',
      color: '#aaa',
      maxWidth: 'calc(100vw - 240px)',
      pointerEvents: 'auto',
      userSelect: 'none',
      letterSpacing: '0.02em',
      // single line + horizontal scroll for long paths.
      // Mask fades out the left edge so older segments hint at more history.
      whiteSpace: 'nowrap',
      overflowX: 'auto',
      overflowY: 'hidden',
      scrollbarWidth: 'thin',
      paddingBottom: '4px',
      maskImage: 'linear-gradient(to right, transparent 0, black 24px, black 100%)',
      webkitMaskImage: 'linear-gradient(to right, transparent 0, black 24px, black 100%)',
    });
    document.body.appendChild(el);
    return el;
  }

  function findEdgeBetween(graph, idA, idB) {
    if (!idA || !idB) return null;
    const edges = graph.edgesFor(idA);
    for (const e of edges) {
      if ((e.source === idA && e.target === idB) ||
          (e.target === idA && e.source === idB)) return e;
    }
    return null;
  }

  function escapeForBreadcrumb(s) {
    return String(s).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function renderBreadcrumb(bundle, graph) {
    const el = createBreadcrumb();
    const history = bundle.history || [];
    // Build path: field, then each historical focus, then current focus.
    const path = [{ id: null, label: 'field' }];
    for (const h of history) {
      if (h.focusedId) path.push({ id: h.focusedId });
    }
    if (bundle.focusedId) path.push({ id: bundle.focusedId });

    let html = '';
    for (let i = 0; i < path.length; i++) {
      const seg = path[i];
      if (i > 0) {
        // field -> first-node has no edge in the graph; just a separator chevron.
        if (!path[i - 1].id || !seg.id) {
          html += `&nbsp;<span style="color:#444;font-weight:500">›</span>&nbsp;`;
        } else {
          const edge = findEdgeBetween(graph, path[i - 1].id, seg.id);
          const hidden = edge && (CFG.HIDDEN_EDGE_TYPES || []).indexOf(edge.type) >= 0;
          if (!edge || hidden) {
            html += `&nbsp;<span style="color:#444;font-weight:500">›</span>&nbsp;`;
          } else {
            const lib = window.ADAI_EDGE_COLORS;
            const edgeColor = (lib && lib.colorFor(edge.type).hex) || '#444';
            html += `&nbsp;<span style="color:${edgeColor};font-size:9px;letter-spacing:0.08em;font-weight:500">›&nbsp;${escapeForBreadcrumb(edge.type)}&nbsp;›</span>&nbsp;`;
          }
        }
      }
      const node = seg.id ? graph.byId.get(seg.id) : null;
      const name = node ? node.name : seg.label;
      const type = node ? node.type : null;
      const isCurrent = i === path.length - 1;
      const segColor = isCurrent ? '#fff' : '#aaa';
      const cursor = isCurrent ? 'default' : 'pointer';
      const decoration = isCurrent ? 'none' : 'none';
      const typeTag = type ? `<span style="color:#555;font-size:9px;margin-right:3px">${escapeForBreadcrumb(type)}/</span>` : '';
      html += `<span class="adai-bcrumb-seg" data-idx="${i}" data-id="${escapeForBreadcrumb(seg.id || '')}" style="color:${segColor};cursor:${cursor};text-decoration:${decoration}">${typeTag}${escapeForBreadcrumb(name)}</span>`;
    }
    // Action buttons at the end of the breadcrumb (only when there's
    // actually a path beyond field). ★ saves a bookmark, ↗ copies a
    // shareable URL with the path encoded in ?reading=.
    if (path.length > 1) {
      html += '&nbsp;&nbsp;<span class="adai-bcrumb-actions" style="display:inline-flex;gap:4px;align-items:center">';
      html += `<button class="adai-profile-btn" title="Open full profile (i)" style="background:transparent;border:1px solid #2a2a30;color:#888;cursor:pointer;font-size:11px;line-height:1;padding:2px 8px;border-radius:2px;font-family:inherit">profile ⓘ</button>`;
      html += `<button class="adai-bookmark-btn" title="Save this reading" style="background:transparent;border:1px solid #2a2a30;color:#888;cursor:pointer;font-size:11px;line-height:1;padding:2px 6px;border-radius:2px;font-family:inherit">★</button>`;
      html += `<button class="adai-share-btn" title="Copy shareable URL" style="background:transparent;border:1px solid #2a2a30;color:#888;cursor:pointer;font-size:11px;line-height:1;padding:2px 6px;border-radius:2px;font-family:inherit">↗</button>`;
      html += '</span>';
    }
    el.innerHTML = html;
    const profileBtn = el.querySelector('.adai-profile-btn');
    const bookmarkBtn = el.querySelector('.adai-bookmark-btn');
    const shareBtn = el.querySelector('.adai-share-btn');
    if (profileBtn) {
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (bundle.focusedId && window.ADAI_ENTITY_VIEW) {
          window.ADAI_ENTITY_VIEW.open(bundle.focusedId);
        }
      });
    }
    if (bookmarkBtn) {
      bookmarkBtn.addEventListener('click', () => {
        const saved = saveBookmark(bundle, graph);
        if (saved) flashChromeFeedback(bookmarkBtn, '✓');
        else flashChromeFeedback(bookmarkBtn, 'dup');
        renderBookmarksStrip(bundle, graph);
      }, { once: true });
    }
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const path2 = pathFromBundle(bundle);
        if (path2.length === 0) return;
        const url = buildShareUrl(path2);
        try {
          await navigator.clipboard.writeText(url);
          flashChromeFeedback(shareBtn, 'copied');
        } catch (err) {
          // Clipboard API may be blocked — fall back to prompt
          window.prompt('Copy this URL', url);
        }
      }, { once: true });
    }

    // Auto-scroll the breadcrumb so the latest (current) segment is always
    // visible at the right edge. Older segments scroll off-screen left,
    // softened by the mask gradient. Use rAF so layout has finished.
    requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth;
    });

    // Wire click teleport-back per segment
    el.querySelectorAll('.adai-bcrumb-seg').forEach(seg => {
      const idx = parseInt(seg.dataset.idx, 10);
      if (idx === path.length - 1) return;  // current segment is not clickable
      seg.addEventListener('click', () => {
        bcrumbTeleport(bundle, graph, idx, path);
      }, { once: true });
    });
  }

  // Teleport-back: pop history entries beyond targetIdx, then navigate.
  // Path indices: 0 = field; 1..N = history.focusedId; N+1 = current.
  function bcrumbTeleport(bundle, graph, targetIdx, path) {
    if (bundle.transitioning) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (targetIdx === 0) {
      // Click "field" -> back to 30k. Wipe history, run 30k restore.
      bundle.history = [];
      // Re-use zoomBack's 30k logic by faking it: directly call internal path
      // by pushing a dummy and popping. Simpler: just call zoomBack repeatedly
      // by setting history to one [30k] item and letting zoomBack pop it.
      bundle.history = [{ level: '30k', focusedId: null }];
      zoomBack(graph, bundle, w, h);
      return;
    }
    // Otherwise: target a historical state. Trim history so that after the
    // navigation, history.length === targetIdx (path index 1 corresponds to
    // history[0], so history length after should be targetIdx — minus the
    // one we'll re-push by zoomToNode? No: we use noPush.).
    // Path[0]=field=history-pre[start]. Path[1] = history[0]. Path[i] = history[i-1].
    // After teleport to path[k], history should have entries [0..k-2] (those
    // older than k), so history.length = k - 1.
    const targetId = path[targetIdx].id;
    bundle.history = bundle.history.slice(0, targetIdx - 1);
    zoomToNode(graph, bundle, targetId, w, h, { noPush: true });
  }

  // ---- Tier 1+2: bookmarks (localStorage) + shareable URL ----
  // A "reading" is the path through the graph: an ordered list of node IDs.
  // Tier 1: save paths to localStorage, list them, click to replay.
  // Tier 2: encode path in URL (?reading=id1,id2,...), copy to clipboard,
  //         auto-replay on load if the param is present.
  // Auth (Tier 3+) is deferred; only readers with a skill key can mutate
  // the graph. For now the public "save" is private-to-device.

  const BOOKMARK_STORAGE_KEY = 'adai.bookmarks.v1';
  const INTRO_SEEN_KEY = 'adai.intro.seen.v1';

  // Onboarding overlay shown to first-time visitors. Fades on first user
  // click anywhere, on ESC, or after a timeout. Hidden on subsequent
  // visits via a localStorage flag.
  function renderIntro() {
    if (localStorage.getItem(INTRO_SEEN_KEY)) return;
    const el = document.createElement('div');
    el.id = 'adai-intro';
    Object.assign(el.style, {
      position: 'fixed',
      left: '50%',
      bottom: '120px',
      transform: 'translateX(-50%)',
      zIndex: '60',
      fontFamily: "'SF Mono', 'Menlo', monospace",
      color: '#E8E6E1',
      background: 'rgba(12,12,14,0.85)',
      border: '1px solid #2a2a30',
      borderRadius: '4px',
      padding: '16px 22px 14px',
      maxWidth: '440px',
      textAlign: 'center',
      pointerEvents: 'auto',           // accept the close-button click
      backdropFilter: 'blur(6px)',
      webkitBackdropFilter: 'blur(6px)',
      transition: 'opacity 800ms ease',
      opacity: '0',
    });
    el.innerHTML = `
      <button class="adai-intro-close" aria-label="dismiss" style="position:absolute;top:6px;right:8px;background:transparent;border:none;color:#666;cursor:pointer;font-size:14px;line-height:1;padding:2px 6px;font-family:inherit">×</button>
      <div style="font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#7eb8da;margin-bottom:8px">how to read</div>
      <div style="font-size:13px;color:#fff;margin-bottom:10px">click any bright dot to enter</div>
      <div style="font-size:10px;color:#aaa;line-height:1.7">
        click a neighbour to walk the graph<br>
        <span style="color:#888">esc</span> or click empty to step back<br>
        <span style="color:#888">★</span> save your reading &nbsp;·&nbsp; <span style="color:#888">↗</span> share it
      </div>
    `;
    document.body.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = '1'; });

    let dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      localStorage.setItem(INTRO_SEEN_KEY, '1');
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 900);
      document.removeEventListener('keydown', escDismiss, true);
    }
    function escDismiss(e) { if (e.key === 'Escape') dismiss(); }
    el.querySelector('.adai-intro-close').addEventListener('click', dismiss);
    document.addEventListener('keydown', escDismiss, true);
    // Auto-dismiss after a longer beat — the viewer needs time to read.
    setTimeout(dismiss, 14000);
  }

  function pathFromBundle(bundle) {
    const ids = [];
    for (const h of (bundle.history || [])) {
      if (h.focusedId) ids.push(h.focusedId);
    }
    if (bundle.focusedId) ids.push(bundle.focusedId);
    return ids;
  }

  function readBookmarks() {
    try { return JSON.parse(localStorage.getItem(BOOKMARK_STORAGE_KEY) || '[]'); }
    catch { return []; }
  }

  function writeBookmarks(list) {
    try { localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(list)); }
    catch (err) { console.warn('[adai] bookmark write failed:', err.message); }
  }

  function saveBookmark(bundle, graph) {
    const path = pathFromBundle(bundle);
    if (path.length === 0) return null;
    const lastId = path[path.length - 1];
    const lastNode = graph.byId.get(lastId);
    const list = readBookmarks();
    // Dedup: if a bookmark with the exact same path exists, do nothing.
    const key = path.join('|');
    if (list.some(b => b.path.join('|') === key)) return null;
    const entry = {
      id: 'b' + Date.now().toString(36),
      path,
      label: lastNode ? lastNode.name : lastId,
      type: lastNode ? lastNode.type : null,
      savedAt: Date.now(),
    };
    list.push(entry);
    writeBookmarks(list);
    return entry;
  }

  function deleteBookmark(bookmarkId) {
    const list = readBookmarks().filter(b => b.id !== bookmarkId);
    writeBookmarks(list);
  }

  function buildShareUrl(path) {
    // searchParams.set already URL-encodes the value, so just join — don't
    // pre-encode (would produce %25-doubled escaping).
    const url = new URL(window.location.href);
    url.searchParams.set('reading', path.join(','));
    return url.href;
  }

  function readingFromUrl() {
    try {
      const v = new URL(window.location.href).searchParams.get('reading');
      if (!v) return null;
      // searchParams.get already decodes; just split.
      return v.split(',').filter(Boolean);
    } catch { return null; }
  }

  // Replay a path: walk node-by-node with zoomToNode + a tiny pause between
  // hops so each transition can finish. Snapshot mode skips the chain and
  // just jumps to the endpoint.
  async function replayPath(graph, bundle, path, opts = {}) {
    if (!Array.isArray(path) || path.length === 0) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (opts.snapshot) {
      // Build history with everything up to last; jump to last.
      const target = path[path.length - 1];
      bundle.history = path.slice(0, -1).map(id => ({ level: 'node', focusedId: id }));
      // First entry should be the 30k root
      bundle.history.unshift({ level: '30k', focusedId: null });
      zoomToNode(graph, bundle, target, w, h, { noPush: true });
      return;
    }
    // Replay: step-by-step. Transition each hop, then dwell so the viewer
    // can read where they've landed before the next move. Skip the dwell
    // on the very last hop — they've arrived.
    for (let i = 0; i < path.length; i++) {
      const id = path[i];
      const isLast = i === path.length - 1;
      while (bundle.transitioning) {
        await new Promise(r => setTimeout(r, 60));
      }
      zoomToNode(graph, bundle, id, w, h);
      // wait the transition itself
      await new Promise(r => setTimeout(r, CFG.ZOOM_TRANSITION_MS + 60));
      // then a longer dwell so the viewer can read this node
      if (!isLast) await new Promise(r => setTimeout(r, CFG.REPLAY_DWELL_MS));
    }
  }

  function flashChromeFeedback(el, text) {
    const orig = el.innerHTML;
    el.innerHTML = `<span style="color:#7eb8da">${text}</span>`;
    setTimeout(() => { el.innerHTML = orig; }, 1100);
  }

  function renderBookmarksStrip(bundle, graph) {
    let el = document.getElementById('adai-bookmarks');
    if (!el) {
      el = document.createElement('div');
      el.id = 'adai-bookmarks';
      Object.assign(el.style, {
        position: 'fixed',
        top: '88px',
        left: '24px',
        zIndex: '40',
        fontFamily: "'SF Mono', 'Menlo', monospace",
        fontSize: '10px',
        color: '#888',
        pointerEvents: 'auto',
        userSelect: 'none',
        display: 'flex',
        flexWrap: 'nowrap',
        gap: '6px',
        maxWidth: 'calc(100vw - 48px)',
        whiteSpace: 'nowrap',
        overflowX: 'auto',
        overflowY: 'hidden',
        scrollbarWidth: 'thin',
        paddingBottom: '4px',
      });
      document.body.appendChild(el);
    }
    const list = readBookmarks();
    if (list.length === 0) { el.innerHTML = ''; return; }
    const recent = list.slice().reverse().slice(0, 8);
    el.innerHTML = '<span style="color:#555;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;align-self:center;margin-right:4px">readings</span>' +
      recent.map(b => {
        const len = b.path.length;
        return `<span class="adai-bookmark-chip" data-id="${b.id}" title="${escapeForBreadcrumb(b.label)} · ${len} hop${len === 1 ? '' : 's'} · click to replay, shift+click to snapshot" style="background:transparent;border:1px solid #2a2a30;color:#aaa;padding:2px 4px 2px 8px;border-radius:2px;cursor:pointer;font-size:9px;letter-spacing:0.04em;display:inline-flex;align-items:center;gap:4px">${b.type ? `<span style="color:#555">${escapeForBreadcrumb(b.type)}/</span>` : ''}${escapeForBreadcrumb(b.label)}<span style="color:#555">·${len}</span><span class="adai-bookmark-del" data-id="${b.id}" title="delete" style="color:#444;cursor:pointer;padding:0 2px;font-size:11px;line-height:1;margin-left:2px">×</span></span>`;
      }).join('');
    el.querySelectorAll('.adai-bookmark-chip').forEach(chip => {
      chip.addEventListener('click', (ev) => {
        // × delete sub-element: delete bookmark and stop here.
        if (ev.target && ev.target.classList && ev.target.classList.contains('adai-bookmark-del')) {
          ev.stopPropagation();
          deleteBookmark(ev.target.dataset.id);
          renderBookmarksStrip(bundle, graph);
          return;
        }
        const id = chip.dataset.id;
        const list2 = readBookmarks();
        const b = list2.find(x => x.id === id);
        if (!b) return;
        replayPath(graph, bundle, b.path, { snapshot: ev.shiftKey });
      }, { once: true });
    });
  }

  // ---- Edge-type filter chrome ----
  // Chips showing the edge types in the current view. Click to toggle —
  // active chip = only that type's neighbours are foregrounded, others
  // fade to a faint alpha. Multi-select OR (multiple active chips show
  // their union). Filters reset on every zoom-to.
  function createEdgeFilter() {
    let el = document.getElementById('adai-edge-filter');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'adai-edge-filter';
    Object.assign(el.style, {
      position: 'fixed',
      top: '54px',
      right: '24px',
      zIndex: '40',
      fontFamily: "'SF Mono', 'Menlo', monospace",
      fontSize: '10px',
      color: '#aaa',
      pointerEvents: 'auto',
      userSelect: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '4px',
      maxWidth: '240px',
    });
    document.body.appendChild(el);
    return el;
  }

  function renderEdgeFilter(bundle, graph) {
    const el = createEdgeFilter();
    const ns = bundle.zoomNeighbors || [];
    if (!bundle.viewLevel || bundle.viewLevel === '30k' || ns.length === 0) {
      el.innerHTML = '';
      return;
    }
    const counts = new Map();
    for (const n of ns) counts.set(n.edgeType, (counts.get(n.edgeType) || 0) + 1);
    bundle.activeFilters = bundle.activeFilters || new Set();
    const sorted = Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    let html = '';
    for (const [type, count] of sorted) {
      const lib = window.ADAI_EDGE_COLORS;
      const color = (lib && lib.colorFor(type).hex) || '#666';
      const active = bundle.activeFilters.has(type);
      const bg = active ? color : 'transparent';
      const fg = active ? '#fff' : color;
      html += `<span class="adai-filter-chip" data-type="${escapeForBreadcrumb(type)}" style="background:${bg};border:1px solid ${color};color:${fg};padding:2px 8px;border-radius:2px;cursor:pointer;font-size:9px;letter-spacing:0.06em;font-weight:500;transition:background 200ms,color 200ms">${escapeForBreadcrumb(type)}&nbsp;<span style="opacity:0.7">${count}</span></span>`;
    }
    el.innerHTML = html;
    el.querySelectorAll('.adai-filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const t = chip.dataset.type;
        if (bundle.activeFilters.has(t)) bundle.activeFilters.delete(t);
        else bundle.activeFilters.add(t);
        renderEdgeFilter(bundle, graph);
      }, { once: true });
    });
  }

  // ---- Embedding-neighbours strip (Step 3 zoom companion) ----
  // Compact list of cosine neighbours sourced from /api/neighbours/:type/:slug:
  //   - practitioner / collective  → style kin + AI-suggested attributions
  //   - artwork                    → visually affine + style proximity
  //   - concept / scene            → closest artworks
  // Renders below the edge-filter chip cluster; each row is a clickable chip
  // that delegates to bundle.zoomTo so the strip becomes a navigation surface.
  // Fetched per zoom-to and cached in bundle._embedCache keyed by node id so
  // re-visits don't re-hit the network.
  function createEmbedStrip() {
    let el = document.getElementById('adai-embed-strip');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'adai-embed-strip';
    Object.assign(el.style, {
      position: 'fixed',
      // Sit below the edge-filter chips. The filter cluster is at top:54
      // and is variable-height; 96px clears a couple of chip rows. The
      // strip is scrollable so it never collides with the bookmark dock.
      top: '120px',
      right: '24px',
      zIndex: '40',
      fontFamily: "'SF Mono', 'Menlo', monospace",
      fontSize: '10px',
      color: '#aaa',
      pointerEvents: 'auto',
      userSelect: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '6px',
      maxWidth: '260px',
      maxHeight: 'calc(100vh - 240px)',
      overflowY: 'auto',
    });
    document.body.appendChild(el);
    return el;
  }

  function renderEmbedStripPayload(el, payload, bundle, graph) {
    const sections = payload?.sections || [];
    if (!sections.length) {
      el.innerHTML = '<div style="color:#555;font-size:9px;letter-spacing:0.06em">no embedding neighbours</div>';
      return;
    }
    let html = '<div style="color:#888;font-size:9px;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:2px">embedding</div>';
    for (const s of sections) {
      const items = s.neighbours || [];
      if (!items.length) continue;
      const top = items.slice(0, 5);  // strip is space-constrained
      const title = String(s.title || s.key || '').toLowerCase();
      html += `<div class="adai-embed-section" data-key="${escapeForBreadcrumb(s.key || '')}" style="display:flex;flex-direction:column;gap:3px;align-items:flex-end;width:100%">`;
      html += `<div style="color:#888;font-size:9px;letter-spacing:0.04em">${escapeForBreadcrumb(title)} <span style="opacity:0.55">${items.length}</span></div>`;
      for (const n of top) {
        const sim = (typeof n.similarity === 'number') ? n.similarity.toFixed(3) : '—';
        const name = n.name || n.node_id;
        const typeTag = n.type ? `<span style="color:#555;font-size:9px;margin-right:4px">${escapeForBreadcrumb(n.type)}</span>` : '';
        html += `<span class="adai-embed-chip" data-node-id="${escapeForBreadcrumb(n.node_id)}" title="${escapeForBreadcrumb(name)} · cosine ${sim}" style="background:transparent;border:1px solid #2a2a30;color:#c8c8c8;padding:2px 8px;border-radius:2px;cursor:pointer;font-size:9px;line-height:1.4;max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:inline-block">${typeTag}${escapeForBreadcrumb(name)}<span style="opacity:0.5;margin-left:6px;font-variant-numeric:tabular-nums">${sim}</span></span>`;
      }
      html += '</div>';
    }
    el.innerHTML = html;
    el.querySelectorAll('.adai-embed-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const id = chip.dataset.nodeId;
        if (id && typeof bundle.zoomTo === 'function') {
          bundle.zoomTo(id);
        }
      }, { once: true });
    });
  }

  function renderEmbedStrip(bundle, graph) {
    const el = createEmbedStrip();
    const focusedId = bundle.focusedId;
    if (!bundle.viewLevel || bundle.viewLevel === '30k' || !focusedId) {
      el.innerHTML = '';
      return;
    }
    const node = graph.byId.get(focusedId);
    if (!node || !node.slug) { el.innerHTML = ''; return; }

    bundle._embedCache = bundle._embedCache || new Map();
    if (bundle._embedCache.has(focusedId)) {
      const payload = bundle._embedCache.get(focusedId);
      renderEmbedStripPayload(el, payload, bundle, graph);
      return;
    }

    // Show "computing" placeholder, then fetch.
    el.innerHTML = '<div style="color:#555;font-size:9px;letter-spacing:0.06em">embedding · computing…</div>';
    const url = `/api/neighbours/${encodeURIComponent(node.type)}/${encodeURIComponent(node.slug)}`;
    fetch(url, { headers: { 'accept': 'application/json' } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`)))
      .then(payload => {
        bundle._embedCache.set(focusedId, payload);
        // Bail out if the user has navigated away while we were fetching.
        if (bundle.focusedId !== focusedId) return;
        renderEmbedStripPayload(el, payload, bundle, graph);
      })
      .catch(err => {
        console.warn('[adai] /api/neighbours fetch failed', err);
        if (bundle.focusedId !== focusedId) return;
        el.innerHTML = '<div style="color:#555;font-size:9px;letter-spacing:0.06em">embedding · unavailable</div>';
      });
  }

  function pushHistory(bundle) {
    bundle.history = bundle.history || [];
    bundle.history.push({
      level: bundle.viewLevel || '30k',
      focusedId: bundle.focusedId,
    });
  }

  function zoomToPractitioner(graph, bundle, focusedId, canvasW, canvasH, opts = {}) {
    if (bundle.transitioning) return;
    if (bundle.viewLevel !== '30k' && bundle.focusedId === focusedId) return;
    if (!opts.noPush) pushHistory(bundle);
    bundle.transitioning = true;

    const previousFocusId = bundle.focusedId;
    const wasZoomedIn = (bundle.viewLevel && bundle.viewLevel !== '30k');
    const oldNeighbors = bundle.zoomNeighbors || [];
    const oldVirtualFocus = bundle.zoomFocus;

    // Old neighbours fade out via outgoingNeighbors (they keep rendering during
    // the transition, then drop after). New neighbours start at centre.
    if (wasZoomedIn) {
      bundle.outgoingNeighbors = oldNeighbors.map(n => ({
        ...n,
        fromAlpha: n.alpha != null ? n.alpha : 1,
        fromX: n.tx ?? n.x, fromY: n.ty ?? n.y, fromR: n.tr ?? n.r,
      }));
    } else {
      bundle.outgoingNeighbors = [];
    }

    bundle.viewLevel = '10k';
    bundle.focusedId = focusedId;
    bundle.zoomFocus = null;
    applyDefaultFiltersForMode(bundle);  // reset + reapply current mode's defaults

    const layout = compute10kLayout(graph, focusedId, canvasW, canvasH);
    bundle.zoomCenter = { x: layout.cx, y: layout.cy };
    bundle.zoomNeighbors = layout.neighbors;

    // Sim tween targets:
    // - new focus -> centre, full alpha
    // - previous focus -> back to base position, dim
    // - everyone else -> stay where they are, dim
    for (const s of bundle.sim) {
      s.tweenFromX = s.x; s.tweenFromY = s.y; s.tweenFromR = s.r;
      s.tweenFromAlpha = s.alpha != null ? s.alpha : 1;
      if (s.id === focusedId) {
        s.tweenToX = layout.cx; s.tweenToY = layout.cy;
        s.tweenToR = CFG.ZOOM_FOCUS_RADIUS;
        s.tweenToAlpha = 1;
      } else if (s.id === previousFocusId) {
        s.tweenToX = s.baseX; s.tweenToY = s.baseY;
        s.tweenToR = s.baseR;
        s.tweenToAlpha = CFG.ZOOM_OFFSCREEN_ALPHA;
      } else {
        s.tweenToX = s.x; s.tweenToY = s.y; s.tweenToR = s.r;
        s.tweenToAlpha = CFG.ZOOM_OFFSCREEN_ALPHA;
      }
    }

    // If there was a virtual focus (e.g., we were at 5k looking at a scene),
    // shrink it out.
    const oldFocusFromAlpha = oldVirtualFocus ? oldVirtualFocus.alpha : 0;
    const oldFocusFromR = oldVirtualFocus ? oldVirtualFocus.r : 0;

    setBrandOpacityForZoom(true);

    runTween(CFG.ZOOM_TRANSITION_MS, (e) => {
      for (const s of bundle.sim) {
        s.x = s.tweenFromX + (s.tweenToX - s.tweenFromX) * e;
        s.y = s.tweenFromY + (s.tweenToY - s.tweenFromY) * e;
        s.r = s.tweenFromR + (s.tweenToR - s.tweenFromR) * e;
        s.alpha = s.tweenFromAlpha + (s.tweenToAlpha - s.tweenFromAlpha) * e;
      }
      for (const n of bundle.outgoingNeighbors) {
        n.alpha = n.fromAlpha * (1 - e);
      }
      if (oldVirtualFocus) {
        oldVirtualFocus.alpha = oldFocusFromAlpha * (1 - e);
        oldVirtualFocus.r = oldFocusFromR * (1 - e);
      }
      for (const n of bundle.zoomNeighbors) {
        n.tx = n.startX + (n.x - n.startX) * e;
        n.ty = n.startY + (n.y - n.startY) * e;
        n.tr = n.startR + (n.r - n.startR) * e;
        n.alpha = e;
      }
    }, () => {
      bundle.transitioning = false;
      bundle.outgoingNeighbors = [];
      // If we were at 5k and transitioning back, the virtual focus is now gone
      if (bundle.zoomFocus === oldVirtualFocus) bundle.zoomFocus = null;
      renderBreadcrumb(bundle, graph);
      renderEdgeFilter(bundle, graph);
      renderEmbedStrip(bundle, graph);
      renderBookmarksStrip(bundle, graph);
    });
  }

  // Zoom to a non-practitioner entity (currently used for scenes; works for
  // any node type that's not in bundle.sim). The entity becomes a virtual
  // focus (bundle.zoomFocus) drawn at canvas centre, animated in from its
  // position in the previous 10k neighbour ring.
  function zoomToVirtualFocus(graph, bundle, focusedId, canvasW, canvasH, level, opts = {}) {
    if (bundle.transitioning) return;
    if (bundle.focusedId === focusedId) return;
    if (!opts.noPush) pushHistory(bundle);
    bundle.transitioning = true;

    const node = graph.byId.get(focusedId);
    if (!node) { bundle.transitioning = false; return; }

    // Capture outgoing 10k state for crossfade
    const prevNeighbors = bundle.zoomNeighbors || [];
    const prevFocusEntry = bundle.sim.find(s => s.id === bundle.focusedId);
    const sceneInPrev = prevNeighbors.find(n => n.id === focusedId);
    bundle.outgoingNeighbors = prevNeighbors
      .filter(n => n.id !== focusedId)
      .map(n => ({ ...n, fromAlpha: n.alpha != null ? n.alpha : 1, fromX: n.tx ?? n.x, fromY: n.ty ?? n.y, fromR: n.tr ?? n.r }));
    bundle.outgoingFocusSimId = bundle.focusedId;  // the 10k practitioner that's leaving focus

    // Compute new layout (centre + neighbours of the new focus)
    const layout = compute10kLayout(graph, focusedId, canvasW, canvasH);
    bundle.zoomCenter = { x: layout.cx, y: layout.cy };
    bundle.zoomNeighbors = layout.neighbors;

    // The new focus is a virtual entity (not in sim). It animates from where
    // it sat in the previous 10k neighbour ring to the new centre.
    const startX = sceneInPrev ? (sceneInPrev.tx ?? sceneInPrev.x) : layout.cx;
    const startY = sceneInPrev ? (sceneInPrev.ty ?? sceneInPrev.y) : layout.cy;
    const startR = sceneInPrev ? (sceneInPrev.tr ?? sceneInPrev.r) : 0;
    bundle.zoomFocus = {
      id: focusedId,
      name: node.name,
      type: node.type,
      fromX: startX, fromY: startY, fromR: startR, fromAlpha: 1,
      toX: layout.cx, toY: layout.cy, toR: CFG.ZOOM_FOCUS_RADIUS, toAlpha: 1,
      x: startX, y: startY, r: startR, alpha: 1,
    };

    // Outgoing 10k focus practitioner (in sim) returns to dimmed state
    if (prevFocusEntry) {
      prevFocusEntry.tweenFromX = prevFocusEntry.x;
      prevFocusEntry.tweenFromY = prevFocusEntry.y;
      prevFocusEntry.tweenFromR = prevFocusEntry.r;
      prevFocusEntry.tweenFromAlpha = prevFocusEntry.alpha != null ? prevFocusEntry.alpha : 1;
      prevFocusEntry.tweenToX = prevFocusEntry.x;
      prevFocusEntry.tweenToY = prevFocusEntry.y;
      prevFocusEntry.tweenToR = prevFocusEntry.r;
      prevFocusEntry.tweenToAlpha = CFG.ZOOM_OFFSCREEN_ALPHA;
    }

    bundle.viewLevel = level;
    bundle.focusedId = focusedId;
    applyDefaultFiltersForMode(bundle);  // reset + reapply current mode's defaults
    setBrandOpacityForZoom(true);

    runTween(CFG.ZOOM_TRANSITION_MS, (e) => {
      // Outgoing focus practitioner fades down
      if (prevFocusEntry) {
        prevFocusEntry.alpha = prevFocusEntry.tweenFromAlpha + (prevFocusEntry.tweenToAlpha - prevFocusEntry.tweenFromAlpha) * e;
      }
      // Outgoing neighbours fade out toward centre
      for (const n of bundle.outgoingNeighbors) {
        n.alpha = n.fromAlpha * (1 - e);
        n.tx = n.fromX + (layout.cx - n.fromX) * e * 0.4;
        n.ty = n.fromY + (layout.cy - n.fromY) * e * 0.4;
      }
      // Virtual focus moves from old neighbour position to centre
      const f = bundle.zoomFocus;
      f.x = f.fromX + (f.toX - f.fromX) * e;
      f.y = f.fromY + (f.toY - f.fromY) * e;
      f.r = f.fromR + (f.toR - f.fromR) * e;
      f.alpha = f.fromAlpha + (f.toAlpha - f.fromAlpha) * e;
      // Incoming neighbours fade in from centre to ring positions
      for (const n of bundle.zoomNeighbors) {
        n.tx = n.startX + (n.x - n.startX) * e;
        n.ty = n.startY + (n.y - n.startY) * e;
        n.tr = n.startR + (n.r - n.startR) * e;
        n.alpha = e;
      }
    }, () => {
      bundle.transitioning = false;
      bundle.outgoingNeighbors = [];
      renderBreadcrumb(bundle, graph);
      renderEdgeFilter(bundle, graph);
      renderEmbedStrip(bundle, graph);
      renderBookmarksStrip(bundle, graph);
    });
  }

  function zoomToScene(graph, bundle, sceneId, canvasW, canvasH) {
    zoomToVirtualFocus(graph, bundle, sceneId, canvasW, canvasH, '5k');
  }

  // Universal click-into-node dispatcher. Practitioners use the sim-entry
  // pathway (their dot is already at 30k home, so the zoom moves it to
  // centre). Everything else uses the virtual-focus pathway.
  function zoomToNode(graph, bundle, nodeId, canvasW, canvasH, opts = {}) {
    const node = graph.byId.get(nodeId);
    if (!node) return;
    // Focus change clears archivist highlights — the rings were context
    // for "what we just talked about", not a sticky overlay. The
    // highlight_nodes tool description documents this contract. Optional
    // chain in case the public API hasn't been wired up yet (zoomToNode
    // is module-scoped; bundle.clearHighlights is attached inside start()).
    bundle.clearHighlights?.();
    if (node.type === 'practitioner') {
      zoomToPractitioner(graph, bundle, nodeId, canvasW, canvasH, opts);
    } else {
      // 'node' is a generic non-30k zoom-level marker. The exact tag doesn't
      // matter for navigation — the history stack tracks focusedId, not level.
      zoomToVirtualFocus(graph, bundle, nodeId, canvasW, canvasH, 'node', opts);
    }
  }

  function zoomBack(graph, bundle, canvasW, canvasH) {
    if (bundle.transitioning) return;
    if (!bundle.viewLevel || bundle.viewLevel === '30k') return;
    // Same contract as zoomToNode: focus change drops archivist highlights.
    bundle.clearHighlights?.();
    bundle.history = bundle.history || [];
    const prev = bundle.history.pop() || { level: '30k', focusedId: null };

    // Going back to 30k: full reset
    if (prev.level === '30k') {
      bundle.transitioning = true;
      const neighbors = bundle.zoomNeighbors || [];
      const focusObj = bundle.zoomFocus;
      // Save start states
      for (const s of bundle.sim) {
        s.tweenFromX = s.x; s.tweenFromY = s.y; s.tweenFromR = s.r;
        s.tweenFromAlpha = s.alpha != null ? s.alpha : 1;
        s.tweenToX = s.baseX; s.tweenToY = s.baseY; s.tweenToR = s.baseR;
        s.tweenToAlpha = 1;
      }
      for (const n of neighbors) {
        n.fadeFrom = n.alpha;
        n.fadeFromX = n.tx; n.fadeFromY = n.ty; n.fadeFromR = n.tr;
      }
      const focusFromAlpha = focusObj ? focusObj.alpha : 0;
      const focusFromX = focusObj ? focusObj.x : 0;
      const focusFromY = focusObj ? focusObj.y : 0;
      const focusFromR = focusObj ? focusObj.r : 0;
      const cx = bundle.zoomCenter ? bundle.zoomCenter.x : canvasW / 2;
      const cy = bundle.zoomCenter ? bundle.zoomCenter.y : canvasH / 2;

      setBrandOpacityForZoom(false);

      runTween(CFG.ZOOM_TRANSITION_MS, (e) => {
        for (const s of bundle.sim) {
          s.x = s.tweenFromX + (s.tweenToX - s.tweenFromX) * e;
          s.y = s.tweenFromY + (s.tweenToY - s.tweenFromY) * e;
          s.r = s.tweenFromR + (s.tweenToR - s.tweenFromR) * e;
          s.alpha = s.tweenFromAlpha + (s.tweenToAlpha - s.tweenFromAlpha) * e;
        }
        for (const n of neighbors) {
          n.tx = n.fadeFromX + (cx - n.fadeFromX) * e;
          n.ty = n.fadeFromY + (cy - n.fadeFromY) * e;
          n.tr = n.fadeFromR * (1 - e);
          n.alpha = n.fadeFrom * (1 - e);
        }
        if (focusObj) {
          focusObj.x = focusFromX + (cx - focusFromX) * e * 0.5;
          focusObj.y = focusFromY + (cy - focusFromY) * e * 0.5;
          focusObj.r = focusFromR * (1 - e);
          focusObj.alpha = focusFromAlpha * (1 - e);
        }
      }, () => {
        bundle.transitioning = false;
        bundle.viewLevel = '30k';
        bundle.focusedId = null;
        bundle.zoomNeighbors = [];
        bundle.zoomFocus = null;
        renderBreadcrumb(bundle, graph);
        renderEmbedStrip(bundle, graph);
      });
      return;
    }

    // Going back to a previous focused node (any type). Delegate to the
    // unified dispatcher with noPush so we don't re-add this state to history.
    if (prev.focusedId) {
      zoomToNode(graph, bundle, prev.focusedId, canvasW, canvasH, { noPush: true });
    }
  }

  function restoreBrandOpacity() {
    const targets = [
      document.getElementById('mopey'),
      document.getElementById('myCanvas'),
      document.querySelector('#mopey canvas'),
    ].filter(Boolean);
    for (const el of targets) {
      el.style.transition = `opacity ${CFG.ZOOM_TRANSITION_MS}ms ease`;
      el.style.opacity = CFG.BRAND_OPACITY_WHEN_ACTIVE;
    }
  }

  // ---- render loop ----
  async function start(graph) {
    const canvas = ensureCanvas();
    let { ctx, w, h } = sizeCanvas(canvas);

    // Wait for the spiral registry and the UMAP projection in parallel.
    const [brand, embedSpace] = await Promise.all([
      waitForRegistry(),
      fetchEmbedSpace(),
    ]);
    if (!brand) {
      console.warn('[adai] dotRegistry unavailable — skipping graph layer');
      return;
    }
    console.log(`[adai] dotRegistry: ${brand.positions.length} brand positions; graph: ${graph.nodes.length} nodes`);
    if (embedSpace) {
      console.log(`[adai] embed-space: ${embedSpace.items.length} UMAP points (model=${embedSpace.model || '?'})`);
    } else {
      console.warn('[adai] /api/embed-space unavailable — falling back to fully random distribution');
    }

    const bundle = pairNodesToPositions(graph, brand, embedSpace);
    reproject(bundle);
    console.log(`[adai] snapshot: ${bundle.snapshotSize} nodes snapped (embedded=${bundle.embeddedCount}, fallback=${bundle.unembeddedCount}) over ${bundle.distinctCount} distinct brand positions`);
    restoreBrandOpacity();

    window.ADAI_GRAPH_FIELD = bundle;
    // Public navigation API — used by the search palette and other surfaces
    // to zoom into a specific node without synthesising a canvas click.
    bundle.zoomTo = (id, opts = {}) => {
      if (!id || !graph.byId.has(id)) return;
      zoomToNode(graph, bundle, id, w, h, opts);
    };

    // ---- Public API for the archivist chat (and any other driver) ----
    // Single side-effect contract: every method mutates bundle state, never
    // touches DOM directly. The frame loop reads bundle.highlightedIds /
    // bundle.fieldMode and renders accordingly.
    bundle.highlightedIds = new Set();
    let highlightTimer = null;
    bundle.highlightNodes = (ids, ttlMs = 30000) => {
      if (!Array.isArray(ids)) return;
      bundle.highlightedIds = new Set(ids.filter(id => graph.byId.has(id)));
      if (highlightTimer) clearTimeout(highlightTimer);
      if (ttlMs > 0) highlightTimer = setTimeout(() => {
        bundle.highlightedIds = new Set();
        highlightTimer = null;
      }, ttlMs);
    };
    bundle.clearHighlights = () => {
      if (highlightTimer) { clearTimeout(highlightTimer); highlightTimer = null; }
      bundle.highlightedIds = new Set();
    };
    bundle.zoomToHome = () => {
      if (!bundle.viewLevel || bundle.viewLevel === '30k') return;
      // Same trick the empty-space click uses: collapse history so a single
      // zoomBack walks all the way out.
      bundle.history = [{ level: '30k', focusedId: null }];
      zoomBack(graph, bundle, w, h);
    };
    // Field mode: 'curatorial' (default) or 'embeddings'. Sets activeFilters
    // so when the user (or the archivist) zooms into a node, the right edge
    // types are foregrounded. The filter chip cluster still lets the user
    // override per-zoom.
    //
    // The mode is sticky: applyDefaultFiltersForMode (called from both
    // zoom-to handlers) re-applies the right filter set after every
    // zoom-to so e.g. set_field_mode('embeddings') followed by
    // focus_node(...) doesn't silently lose the embeddings foregrounding.
    bundle.fieldMode = 'curatorial';
    bundle.setMode = (mode) => {
      if (mode !== 'curatorial' && mode !== 'embeddings') return;
      bundle.fieldMode = mode;
      // STYLE_KIN / VISUALLY_AFFINE are excluded from the initial streamed
      // payload (they're ~10k edges only ever shown here) and lazy-loaded the
      // first time we enter embeddings mode. Once the loader merges them into
      // the live index, re-apply filters so the chips + edge rendering pick
      // them up. The frame loop reads edgesFor() live, so no explicit redraw.
      if (mode === 'embeddings' && !bundle.derivedRequested
          && typeof window.ADAI_LOAD_DERIVED === 'function') {
        bundle.derivedRequested = true;
        window.ADAI_LOAD_DERIVED().then(() => {
          applyDefaultFiltersForMode(bundle);
          renderEdgeFilter(bundle, graph);
        }).catch(() => {});
      }
      applyDefaultFiltersForMode(bundle);
      renderEdgeFilter(bundle, graph);
    };

    // ---- chrome ----
    renderIntro();
    renderBreadcrumb(bundle, graph);
    renderEdgeFilter(bundle, graph);
    renderEmbedStrip(bundle, graph);
    renderBookmarksStrip(bundle, graph);

    // Curated edges stream in just after the constellation paints (the loader
    // posts nodes first). Re-render the edge-dependent chrome once they land so
    // the filter chip counts reflect the real graph. The frame loop reads
    // edgesFor() live, so the field itself needs no nudge. once:true — a fresh
    // page load only streams once (repeat visits arrive complete from cache).
    window.addEventListener('adai:graph-edges', () => {
      renderEdgeFilter(bundle, graph);
      renderBreadcrumb(bundle, graph);
    }, { once: true });

    // If the URL has ?reading=..., auto-replay it on load.
    const urlPath = readingFromUrl();
    if (urlPath && urlPath.length > 0) {
      // Clear the param so reload doesn't replay again, but keep the URL clean.
      const u = new URL(window.location.href);
      u.searchParams.delete('reading');
      window.history.replaceState({}, '', u.href);
      // Replay after a short beat so the brand viz finishes its first paint.
      setTimeout(() => replayPath(graph, bundle, urlPath, { snapshot: false }), 400);
    }

    // ---- interaction state ----
    const panel = createEntityPanel();
    let hoveredId = null;
    let selectedId = null;
    // Live cursor position (canvas space) for the label "reading lens" —
    // labels reveal only near the cursor so the full constellation can stay
    // dense without flooding the GPU with thousands of text draws. null when
    // the pointer is off-canvas.
    let cursorX = null, cursorY = null;

    function onResize() {
      const next = sizeCanvas(canvas);
      ctx = next.ctx; w = next.w; h = next.h;
      reproject(bundle);
    }
    window.addEventListener('resize', onResize, { passive: true });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cursorX = x; cursorY = y;
      let hit = null;
      if (!bundle.viewLevel || bundle.viewLevel === '30k') {
        hit = nearestSim(bundle, x, y, CFG.CLICK_TOLERANCE);
      } else {
        // Only dot proximity counts — labels are not clickable.
        const ns = bundle.zoomNeighbors || [];
        let bestD2 = CFG.CLICK_TOLERANCE * CFG.CLICK_TOLERANCE;
        for (const n of ns) {
          const dx = (n.tx ?? n.x) - x;
          const dy = (n.ty ?? n.y) - y;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD2) { bestD2 = d2; hit = n; }
        }
      }
      const newId = hit ? hit.id : null;
      if (newId !== hoveredId) {
        hoveredId = newId;
        canvas.style.cursor = hit ? 'pointer' : 'default';
      }
    }, { passive: true });

    canvas.addEventListener('mouseleave', () => {
      cursorX = null; cursorY = null;
      if (hoveredId) {
        hoveredId = null;
        canvas.style.cursor = 'default';
      }
    });

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // At 30k: click a practitioner -> step into it. Click empty -> nothing.
      if (!bundle.viewLevel || bundle.viewLevel === '30k') {
        const hit = nearestSim(bundle, x, y, CFG.CLICK_TOLERANCE);
        if (hit) zoomToNode(graph, bundle, hit.id, w, h);
        return;
      }

      // Zoomed in: clicking the focused node itself opens its full profile
      // (the entity view). Most intuitive: "click on who you're looking at
      // = see them." Falls through to neighbor / empty-space handling if the
      // click misses the centered dot.
      const focusedId = bundle.focusedId;
      if (focusedId) {
        const simFocus = bundle.sim.find(s => s.id === focusedId);
        const focus = simFocus || bundle.zoomFocus;
        if (focus) {
          const dxF = focus.x - x;
          const dyF = focus.y - y;
          const focusR = focus.r || CFG.ZOOM_FOCUS_RADIUS;
          // Generous halo-sized hit area — feels natural at 10k where the
          // focused dot is rendered with a halo at ~3.5× its radius.
          const hitRadius = Math.max(focusR * 3.5, CFG.CLICK_TOLERANCE);
          if (dxF * dxF + dyF * dyF <= hitRadius * hitRadius) {
            if (window.ADAI_ENTITY_VIEW) window.ADAI_ENTITY_VIEW.open(focusedId);
            return;
          }
        }
      }

      // Otherwise: dot click -> navigate. Label click -> no-op
      // (so a misclick on a name doesn't accidentally jump home).
      // Empty space click -> jump back to 30k home. ESC still walks
      // back one step, breadcrumb segments handle granular jumps.
      const neighbors = bundle.zoomNeighbors || [];
      let hitN = null;
      let bestD2 = CFG.CLICK_TOLERANCE * CFG.CLICK_TOLERANCE;
      for (const n of neighbors) {
        const dx = (n.tx ?? n.x) - x;
        const dy = (n.ty ?? n.y) - y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestD2) { bestD2 = d2; hitN = n; }
      }
      if (hitN) {
        zoomToNode(graph, bundle, hitN.id, w, h);
        return;
      }
      // No dot hit. If we're on a label, do nothing (avoid accidental home).
      for (const n of neighbors) {
        const b = n.labelBBox;
        if (b && x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return;
      }
      // True empty space: home to 30k.
      bundle.history = [{ level: '30k', focusedId: null }];
      zoomBack(graph, bundle, w, h);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && bundle.viewLevel && bundle.viewLevel !== '30k') {
        zoomBack(graph, bundle, w, h);
      }
    });

    // expose ids for the render loop to highlight
    bundle.getHoveredId = () => hoveredId;
    bundle.getSelectedId = () => selectedId;

    function frame() {
      ctx.clearRect(0, 0, w, h);
      const driftAt30k = (!bundle.viewLevel || bundle.viewLevel === '30k')
        && !bundle.transitioning;
      const drift = driftAt30k ? CFG.DRIFT : 0;
      const hovId = bundle.getHoveredId();
      const selId = bundle.getSelectedId();
      const zoomed = (bundle.viewLevel && bundle.viewLevel !== '30k');
      const focusedId = bundle.focusedId;

      // ---- 30k snapshot layer (always draws, alpha modulated by zoom) ----
      // Two passes: halos first (so cores draw over them), each per-type so
      // the constellation reads as semantic clusters against the spiral.
      // Apply drift once, then batch both passes by colour+alpha (see
      // drawDotsBatched). Halos first (larger, fainter), cores over them.
      const halos = [];
      const cores = [];
      for (let i = 0; i < bundle.sim.length; i++) {
        const s = bundle.sim[i];
        if (drift) {
          s.x += (Math.random() - 0.5) * drift;
          s.y += (Math.random() - 0.5) * drift;
        }
        const base = (s.alpha != null ? s.alpha : 1);
        const color = colorForType(s.type);
        halos.push({ x: s.x, y: s.y, r: s.r * CFG.HALO_RADIUS_MULT, color, alpha: base * CFG.HALO_ALPHA });
        cores.push({ x: s.x, y: s.y, r: s.r, color, alpha: base * CFG.BASE_ALPHA });
      }
      drawDotsBatched(ctx, halos);
      drawDotsBatched(ctx, cores);
      // Reset fillStyle for any non-snapshot draw paths below that still
      // assume DOT_HEX is current.
      ctx.fillStyle = CFG.DOT_HEX;

      // Hover halo (only meaningful at 30k).
      if (hovId && !zoomed) {
        const s = bundle.sim.find(x => x.id === hovId);
        if (s) {
          ctx.fillStyle = colorForType(s.type);
          ctx.globalAlpha = CFG.HOVER_HALO_ALPHA;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * CFG.HALO_RADIUS_MULT * 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Selected halo (also only at 30k — at 10k the focused IS the centre).
      if (selId && !zoomed) {
        const s = bundle.sim.find(x => x.id === selId);
        if (s) {
          const col = colorForType(s.type);
          ctx.fillStyle = col;
          ctx.globalAlpha = CFG.SELECTED_HALO_ALPHA;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * CFG.HALO_RADIUS_MULT * 1.25, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 1.15, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Archivist-driven highlights — a soft pulsing ring on each highlighted
      // sim dot. Auto-cleared after the TTL set when the set was installed.
      // Drawn only at 30k where the field actually has sim dots; at zoomed
      // levels the focused/neighbour rendering already foregrounds the relevant
      // nodes, so the ring would just be visual noise.
      if (bundle.highlightedIds && bundle.highlightedIds.size > 0 && !zoomed) {
        const pulse = 0.55 + 0.35 * Math.sin(Date.now() / 380);
        for (const s of bundle.sim) {
          if (!bundle.highlightedIds.has(s.id)) continue;
          ctx.strokeStyle = '#E8E6E1';
          ctx.globalAlpha = pulse;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 3.5, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.lineWidth = 1;
      }
      ctx.fillStyle = CFG.DOT_HEX;

      // ---- 10k / 5k zoom layer ----
      const inTransition = bundle.transitioning;
      const showZoom = zoomed || (inTransition && bundle.zoomNeighbors && bundle.zoomNeighbors.length);
      const filters = bundle.activeFilters;
      const filtersActive = filters && filters.size > 0;
      const filterMatch = (n) => !filtersActive || filters.has(n.edgeType);
      const dimmedAlpha = 0.12;  // for filtered-out neighbours
      if (showZoom && bundle.zoomCenter) {
        // Focus position: if practitioner (in sim) use that; else use zoomFocus
        const simFocus = bundle.sim.find(x => x.id === focusedId);
        const virtualFocus = bundle.zoomFocus;
        const focus = simFocus || virtualFocus;
        const cx = focus ? focus.x : bundle.zoomCenter.x;
        const cy = focus ? focus.y : bundle.zoomCenter.y;

        // Outgoing neighbours fade out (drawn faintly during transitions only).
        const outgoing = bundle.outgoingNeighbors || [];
        if (outgoing.length) {
          ctx.lineWidth = CFG.EDGE_THREAD_WIDTH;
          for (const n of outgoing) {
            const a = (n.alpha ?? 0) * CFG.EDGE_THREAD_ALPHA;
            if (a < 0.005) continue;
            ctx.strokeStyle = n.edgeColor || '#888';
            ctx.globalAlpha = a;
            // No edge thread to draw (from where to where?). Skip.
          }
          ctx.fillStyle = CFG.DOT_HEX;
          for (const n of outgoing) {
            const a = (n.alpha ?? 0) * CFG.BASE_ALPHA;
            if (a < 0.005) continue;
            ctx.globalAlpha = a;
            ctx.beginPath();
            ctx.arc(n.tx ?? n.fromX, n.ty ?? n.fromY, n.tr ?? n.fromR, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Edge threads first — thickness encodes confidence (high = thick,
        // unverified = barely there). Drawn under dots so dots stay crisp.
        for (const n of bundle.zoomNeighbors) {
          const baseA = (n.alpha != null ? n.alpha : 1) * CFG.EDGE_THREAD_ALPHA;
          const a = filterMatch(n) ? baseA : baseA * dimmedAlpha;
          if (a < 0.01) continue;
          ctx.lineWidth = CFG.EDGE_THREAD_WIDTH_BY_CONFIDENCE[n.edgeConfidence] || CFG.EDGE_THREAD_WIDTH_DEFAULT;
          ctx.strokeStyle = n.edgeColor;
          ctx.globalAlpha = a;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(n.tx ?? n.x, n.ty ?? n.y);
          ctx.stroke();
        }

        // Neighbour halos — batched (one fill per alpha bucket instead of one
        // per neighbour; matters when a high-degree node has thousands).
        const nHalos = [];
        for (const n of bundle.zoomNeighbors) {
          const baseA = (n.alpha != null ? n.alpha : 1) * CFG.HALO_ALPHA * 1.4;
          const a = filterMatch(n) ? baseA : baseA * dimmedAlpha;
          if (a < 0.005) continue;
          nHalos.push({ x: n.tx ?? n.x, y: n.ty ?? n.y, r: (n.tr ?? n.r) * CFG.HALO_RADIUS_MULT, color: CFG.DOT_HEX, alpha: a });
        }
        drawDotsBatched(ctx, nHalos);
        // Neighbour cores. Artwork neighbours with a ready CDN image render as
        // a thumbnail (drawImage — can't batch); non-image neighbours batch as
        // dots. Two passes: collect dot-cores, then blit thumbnails over them.
        const nCores = [];
        const thumbs = [];
        for (const n of bundle.zoomNeighbors) {
          const baseA = (n.alpha != null ? n.alpha : 1) * CFG.BASE_ALPHA;
          const a = filterMatch(n) ? baseA : baseA * dimmedAlpha;
          if (a < 0.005) continue;
          const node = graph.byId.get(n.id);
          const img = getImageFor(node);
          if (img) {
            thumbs.push({ img, x: n.tx ?? n.x, y: n.ty ?? n.y, tr: thumbPetalRadiusFor(n.groupArtworkCount || 1), a });
          } else {
            nCores.push({ x: n.tx ?? n.x, y: n.ty ?? n.y, r: n.tr ?? n.r, color: CFG.DOT_HEX, alpha: a });
          }
        }
        drawDotsBatched(ctx, nCores);
        for (const t of thumbs) {
          ctx.globalAlpha = t.a;
          drawCircleImage(ctx, t.img, t.x, t.y, t.tr);
        }
        ctx.fillStyle = CFG.DOT_HEX;
        // Neighbour labels (only after transition done, to keep motion clean).
        // Cache each label's hit-rect on the neighbour so the click handler
        // can treat the label as part of the click target.
        if (!bundle.transitioning) {
          const all = bundle.zoomNeighbors;
          const many = all.length > CFG.LABEL_MAX_SHOWN;
          const lensR = CFG.LABEL_LENS_RADIUS;
          const lensR2 = lensR * lensR;
          const haveCursor = cursorX != null && cursorY != null;

          // Build candidate labels with a priority score.
          //   sparse node (<= LABEL_MAX_SHOWN): EVERY name is a candidate at
          //     full strength — reads like a normal labelled graph.
          //   dense node: only the hovered name + names within the cursor lens
          //     are candidates (priority by proximity) — sweep to read.
          const candidates = [];
          for (const n of all) {
            const baseA = (n.alpha != null ? n.alpha : 1) * CFG.NAME_TEXT_ALPHA;
            const a = filterMatch(n) ? baseA : baseA * dimmedAlpha;
            if (a < 0.05) { n.labelBBox = null; continue; }
            const nx = n.tx ?? n.x, ny = n.ty ?? n.y;
            const isHovered = n.id === hoveredId;
            let prio;
            if (isHovered) {
              prio = 2;                       // hovered always wins
            } else if (!many) {
              prio = 1;                       // sparse → always show
            } else if (haveCursor) {
              const cdx = nx - cursorX, cdy = ny - cursorY;
              const cd2 = cdx * cdx + cdy * cdy;
              if (cd2 > lensR2) { n.labelBBox = null; continue; }
              prio = 1 - Math.sqrt(cd2) / lensR;   // nearer cursor = higher
            } else {
              n.labelBBox = null; continue;   // dense + no cursor → no labels
            }
            candidates.push({ n, nx, ny, a, prio, isHovered });
          }
          candidates.sort((p, q) => q.prio - p.prio);

          // Draw highest-priority first, skipping any name whose box collides
          // with one already drawn. This thins clutter where dots pack tight
          // (the "can't read it" problem) — the most relevant names win the
          // space. A dark backing pill lifts each name off the busy field.
          ctx.font = `${CFG.NAME_TEXT_SIZE}px 'SF Mono', monospace`;
          ctx.textBaseline = 'middle';
          const half = CFG.NAME_TEXT_SIZE * 0.7;
          const drawn = [];
          let count = 0;
          for (const c of candidates) {
            const { n, nx, ny } = c;
            if (count >= CFG.LABEL_MAX_SHOWN) { n.labelBBox = null; continue; }
            const dx = nx - cx, dy = ny - cy;
            const d = Math.hypot(dx, dy) || 1;
            const nNode = graph.byId.get(n.id);
            const labelOff = (nNode && getImageFor(nNode))
              ? thumbPetalRadiusFor(n.groupArtworkCount || 1) + 6
              : 10;
            const lx = nx + (dx / d) * labelOff;
            const ly = ny + (dy / d) * labelOff;
            const align = dx >= 0 ? 'left' : 'right';
            const name = n.name || (n.id || '').split(':')[1] || n.id;
            ctx.textAlign = align;
            const wText = ctx.measureText(name).width;
            const x0 = align === 'left' ? lx : lx - wText;
            const x1 = align === 'left' ? lx + wText : lx;
            const box = { x0, y0: ly - half, x1, y1: ly + half };
            // collision check (3px padding) against already-drawn labels
            let collides = false;
            for (const b of drawn) {
              if (box.x0 < b.x1 + 3 && box.x1 + 3 > b.x0 &&
                  box.y0 < b.y1 + 3 && box.y1 + 3 > b.y0) { collides = true; break; }
            }
            if (collides) { n.labelBBox = null; continue; }
            // backing pill
            ctx.globalAlpha = c.a * CFG.LABEL_BACKING_ALPHA;
            ctx.fillStyle = '#0a0a0c';
            ctx.fillRect(x0 - 3, box.y0 - 1, (x1 - x0) + 6, (box.y1 - box.y0) + 2);
            // name
            ctx.globalAlpha = c.a;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(name, lx, ly);
            n.labelBBox = box;
            drawn.push(box);
            count++;
          }
        } else {
          for (const n of bundle.zoomNeighbors) n.labelBBox = null;
        }

        // Focus halo + name (works for both sim focus and virtual focus).
        // If the focus is an artwork with a ready image, the white core dot
        // is replaced by a hero thumbnail. The soft halo behind it stays —
        // it reads as a glow around the work.
        if (focus) {
          const fa = focus.alpha != null ? focus.alpha : 1;
          const focusNode = graph.byId.get(focusedId);
          const focusImg = getImageFor(focusNode);
          const heroR = focusImg ? CFG.THUMB_HERO_RADIUS : (focus.r || 0);
          ctx.fillStyle = CFG.DOT_HEX;
          ctx.globalAlpha = 0.18 * fa;
          ctx.beginPath();
          ctx.arc(focus.x, focus.y, heroR * (focusImg ? 1.4 : 3.5), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = fa;
          if (focusImg) {
            drawCircleImage(ctx, focusImg, focus.x, focus.y, heroR);
          } else {
            ctx.beginPath();
            ctx.arc(focus.x, focus.y, focus.r || 0, 0, Math.PI * 2);
            ctx.fill();
          }
          if (!bundle.transitioning) {
            ctx.font = `13px 'SF Mono', monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#fff';
            const name = focusNode?.name || focus.name || focusedId;
            const labelTop = focus.y + heroR + (focusImg ? 10 : 0);
            // Type tag above name for non-practitioner focuses (eg scenes)
            if (focusNode && focusNode.type !== 'practitioner') {
              ctx.font = `10px 'SF Mono', monospace`;
              ctx.fillStyle = '#7eb8da';
              ctx.fillText(focusNode.type.toUpperCase(), focus.x, labelTop + 10);
              ctx.font = `13px 'SF Mono', monospace`;
              ctx.fillStyle = '#fff';
              ctx.fillText(name, focus.x, labelTop + 26);
            } else {
              ctx.fillText(name, focus.x, labelTop + 12);
            }
          }
        }
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function init() {
    if (window.ADAI_GRAPH && window.ADAI_GRAPH.nodes && window.ADAI_GRAPH.nodes.length) {
      start(window.ADAI_GRAPH);
      return;
    }
    window.addEventListener('adai:graph', (ev) => {
      const g = ev.detail;
      if (g && g.nodes && g.nodes.length) start(g);
    }, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
