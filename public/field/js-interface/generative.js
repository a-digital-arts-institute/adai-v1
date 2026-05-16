// js/generative.js — Interface Generative Engine
// Evolved from Sol: cellular automata, jittered grids, layered color, grain texture

const Gen = (() => {
  // --- Seed-based PRNG (mulberry32) ---
  const mulberry32 = (a) => {
    return () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };

  // --- Brand palette pool ---
  const PALETTE_POOL = [
    '#2563EB',  // 0 — bright blue
    '#3B82F6',  // 1 — medium blue
    '#1D4ED8',  // 2 — deep blue
    '#60A5FA',  // 3 — light blue
    '#6366F1',  // 4 — indigo
    '#8B5CF6',  // 5 — violet
    '#06B6D4',  // 6 — cyan
    '#14B8A6',  // 7 — teal
    '#F97316',  // 8 — orange
    '#EF4444',  // 9 — red
    '#EC4899',  // 10 — pink
    '#A78BFA',  // 11 — lavender
    '#22D3EE',  // 12 — sky
    '#34D399',  // 13 — emerald
    '#FBBF24',  // 14 — amber
    '#F472B6',  // 15 — rose
  ];

  // --- State ---
  let seed = Date.now();
  let rng = mulberry32(seed);
  let sessionPalette = [];
  let bgCanvas = null;
  let animFrame = null;
  let time = 0;
  let mouseX = 0, mouseY = 0;

  // --- Helpers ---
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const lerp = (a, b, t) => a + (b - a) * t;

  // --- Cellular Automaton (from Sol) ---
  const generateRule = () => {
    const num = Math.floor(rng() * 256);
    return Array.from(num.toString(2).padStart(8, '0')).map(Number);
  };

  const nextState = (state, rule) => {
    const n = state.length;
    const next = new Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) {
      const pattern = 4 * state[i - 1] + 2 * state[i] + state[i + 1];
      next[i] = rule[7 - pattern];
    }
    return next;
  };

  const generateInitialState = (cells) => {
    const half = Array.from({ length: Math.floor(cells / 2) }, () => Math.round(rng()));
    const state = [...half, ...half.slice().reverse()];
    state[Math.floor(cells / 2)] = 1;
    return state;
  };

  // --- Jittered Grid (from Sol) ---
  const createJitteredGrid = (cols, rows, cellW, cellH, jitter) => {
    const grid = [];
    for (let y = 0; y <= rows; y++) {
      grid[y] = [];
      for (let x = 0; x <= cols; x++) {
        grid[y][x] = {
          x: x * cellW + (rng() - 0.5) * cellW * jitter,
          y: y * cellH + (rng() - 0.5) * cellH * jitter,
        };
      }
    }
    return grid;
  };

  // --- Perlin-like Noise ---
  const permutation = [];
  const initNoise = () => {
    for (let i = 0; i < 256; i++) permutation[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
    }
    for (let i = 0; i < 256; i++) permutation[i + 256] = permutation[i];
  };

  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (hash, x, y) => {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  };

  const noise2D = (x, y) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = permutation[permutation[X] + Y];
    const ab = permutation[permutation[X] + Y + 1];
    const ba = permutation[permutation[X + 1] + Y];
    const bb = permutation[permutation[X + 1] + Y + 1];
    return lerp(
      lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
      lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
      v
    );
  };

  // --- Select session palette ---
  const selectPalette = () => {
    sessionPalette = shuffle(PALETTE_POOL).slice(0, 3);
  };

  // --- Get CA color from CSS variable ---
  const getCAColor = (dim = false) => {
    const prop = dim ? '--color-ca-dim' : '--color-ca';
    return getComputedStyle(document.documentElement).getPropertyValue(prop).trim() || 'rgba(255,255,255,0.85)';
  };

  // --- Render: CA composition ---
  const renderCA = (ctx, w, h, opts = {}) => {
    const cells = opts.cells || (40 + Math.floor(rng() * 40));
    const cellW = w / cells;
    // Generations fill the full height — cells are perfect squares
    const generations = Math.ceil(h / cellW);
    const cellH = cellW;
    const grid = createJitteredGrid(cells, generations, cellW, cellH, 0);

    let rule = generateRule();
    let state = generateInitialState(cells);

    // Use white on navy (dark) or navy on white (light) — monochromatic
    const strokeColor = opts.color || getCAColor(false);
    const dimColor = opts.dimColor || getCAColor(true);

    ctx.lineWidth = opts.lineWidth || Math.max(0.5, Math.min(cellW * 0.15, 1.2));
    ctx.lineCap = 'square';

    let useAlt = false;

    for (let y = 0; y < generations; y++) {
      const ruleShift = Math.floor(rng() * 25) + 5;
      if (y > 0 && y % ruleShift === 0) {
        rule = generateRule();
        useAlt = !useAlt;
      }

      for (let x = 0; x < cells; x++) {
        if (state[x] !== 1) continue;

        const tl = grid[y][x];
        const tr = grid[y][x + 1];
        const br = grid[y + 1][x + 1];
        const bl = grid[y + 1][x];

        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y);
        ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.closePath();
        ctx.strokeStyle = useAlt ? dimColor : strokeColor;
        ctx.stroke();
      }

      state = nextState(state, rule);
    }
  };

  // --- Render CA and return cell map for streak animation ---
  const renderCAWithMap = (ctx, w, h, opts = {}) => {
    const cells = opts.cells || (40 + Math.floor(rng() * 40));
    const cellW = w / cells;
    const generations = Math.ceil(h / cellW);
    const cellH = cellW;
    const grid = createJitteredGrid(cells, generations, cellW, cellH, 0);

    let rule = generateRule();
    let state = generateInitialState(cells);

    const strokeColor = opts.color || getCAColor(false);
    const dimColor = opts.dimColor || getCAColor(true);

    ctx.lineWidth = opts.lineWidth || Math.max(0.5, Math.min(cellW * 0.15, 1.2));
    ctx.lineCap = 'square';

    let useAlt = false;
    // Store active cells: { x, y, tl, tr, br, bl }
    const activeCells = [];

    for (let y = 0; y < generations; y++) {
      const ruleShift = Math.floor(rng() * 25) + 5;
      if (y > 0 && y % ruleShift === 0) {
        rule = generateRule();
        useAlt = !useAlt;
      }

      for (let x = 0; x < cells; x++) {
        if (state[x] !== 1) continue;

        const tl = grid[y][x];
        const tr = grid[y][x + 1];
        const br = grid[y + 1][x + 1];
        const bl = grid[y + 1][x];

        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y);
        ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.closePath();
        ctx.strokeStyle = useAlt ? dimColor : strokeColor;
        ctx.stroke();

        activeCells.push({ col: x, row: y, tl, tr, br, bl });
      }

      state = nextState(state, rule);
    }

    return { activeCells, cells, generations, cellW, cellH, grid };
  };

  // --- Render: Noise field (animated background, mouse-reactive) ---
  const renderNoiseField = (ctx, w, h, t) => {
    const scale = 0.003;
    const step = 20;
    ctx.lineWidth = 0.5;

    for (let x = 0; x < w; x += step) {
      for (let y = 0; y < h; y += step) {
        const n = noise2D(x * scale + t * 0.2, y * scale + t * 0.1);
        const angle = n * Math.PI * 2;
        const len = step * 0.6;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        ctx.strokeStyle = getCAColor(true);
        ctx.globalAlpha = 0.04;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  // --- Grain overlay (from Sol) ---
  const addGrain = (ctx, w, h) => {
    const grainRng = mulberry32(seed + 999);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.lineWidth = 0.05 * h / 931;

    for (let i = 0; i < h; i += 2) {
      const angle = 0.1 * grainRng() - 0.05;
      const segments = Math.floor(grainRng() * 100) + 10;
      ctx.beginPath();
      const startY = Math.min(i + w * Math.tan(angle), h);
      ctx.moveTo(0, Math.max(startY, 0));

      const segW = w / segments;
      let px = 0, py = i;

      for (let j = 1; j <= segments; j++) {
        const cp1x = px + grainRng() * 60 - 30;
        const cp1y = py + grainRng() * 60 - 30;
        const cp2x = j * segW - grainRng() * 60 + 30;
        const cp2y = Math.max(Math.min(i + grainRng() * 60 - 30, h), 0);
        const ex = j * segW;
        const ey = i;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey);
        px = ex;
        py = ey;
      }

      ctx.strokeStyle = 'black';
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  // --- Render: Thin CA strip (for dividers) ---
  const renderStrip = (ctx, w, h, opts = {}) => {
    const stripSeed = opts.seed || seed;
    const prevRngState = rng;
    rng = mulberry32(stripSeed);

    const cells = opts.cells || Math.floor(w / 8);
    const generations = Math.max(3, Math.floor(h / 8));
    const cellW = w / cells;
    const cellH = h / generations;
    const grid = createJitteredGrid(cells, generations, cellW, cellH, 0);

    const strokeColor = opts.color || getCAColor(false);

    let rule = generateRule();
    let state = generateInitialState(cells);

    ctx.lineWidth = Math.max(0.5, h / 100);
    ctx.lineCap = 'square';

    for (let y = 0; y < generations; y++) {
      const ruleShift = Math.floor(rng() * 15) + 3;
      if (y > 0 && y % ruleShift === 0) {
        rule = generateRule();
      }
      for (let x = 0; x < cells; x++) {
        if (state[x] !== 1) continue;
        const tl = grid[y][x], tr = grid[y][x + 1];
        const br = grid[y + 1][x + 1], bl = grid[y + 1][x];
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y);
        ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.closePath();
        ctx.strokeStyle = strokeColor;
        ctx.stroke();
      }
      state = nextState(state, rule);
    }
    rng = prevRngState;
  };

  // --- Render: Micro composition (small square accent) ---
  const renderMicro = (ctx, size, opts = {}) => {
    const microSeed = opts.seed || (seed + (opts.index || 0) * 777);
    const prevRngState = rng;
    rng = mulberry32(microSeed);

    const cells = opts.cells || 12;
    const generations = cells;
    const cellW = size / cells;
    const cellH = size / generations;
    const grid = createJitteredGrid(cells, generations, cellW, cellH, 0);

    const strokeColor = opts.color || getCAColor(false);
    const dimColor = opts.dimColor || getCAColor(true);

    let rule = generateRule();
    let state = generateInitialState(cells);
    let useAlt = false;

    ctx.lineWidth = Math.max(0.5, size / 200);
    ctx.lineCap = 'square';

    for (let y = 0; y < generations; y++) {
      if (y > 0 && y % (Math.floor(rng() * 8) + 3) === 0) {
        rule = generateRule();
        useAlt = !useAlt;
      }
      for (let x = 0; x < cells; x++) {
        if (state[x] !== 1) continue;
        const tl = grid[y][x], tr = grid[y][x + 1];
        const br = grid[y + 1][x + 1], bl = grid[y + 1][x];
        ctx.beginPath();
        ctx.moveTo(tl.x, tl.y);
        ctx.lineTo(tr.x, tr.y);
        ctx.lineTo(br.x, br.y);
        ctx.lineTo(bl.x, bl.y);
        ctx.closePath();
        ctx.strokeStyle = useAlt ? dimColor : strokeColor;
        ctx.stroke();
      }
      state = nextState(state, rule);
    }
    rng = prevRngState;
  };

  // --- Generative logo mark ---
  // The separator between i and f changes each visit
  const LOGO_VARIANTS = [
    'i/f', 'i+f', 'i=f', 'i?f', 'i:f', 'i|f',
    'i(f)', 'i~f', 'i*f', 'i·f',
    'i\\f', 'i>f', 'i<f', 'i^f', 'i#f', 'i&f',
  ];

  const getLogoVariant = () => {
    const idx = Math.floor(rng() * LOGO_VARIANTS.length);
    return LOGO_VARIANTS[idx];
  };

  // --- Animation loop ---
  const animate = () => {
    if (!bgCanvas) return;
    const ctx = bgCanvas.getContext('2d');
    const w = bgCanvas.width;
    const h = bgCanvas.height;

    ctx.clearRect(0, 0, w, h);
    time += 0.005;

    renderNoiseField(ctx, w, h, time);

    animFrame = requestAnimationFrame(animate);
  };

  // --- Public API ---
  return {
    get seed() { return seed; },
    get palette() { return [...sessionPalette]; },
    get accent() { return sessionPalette[0] || PALETTE_POOL[0]; },
    get PALETTE_POOL() { return [...PALETTE_POOL]; },

    init(canvas) {
      bgCanvas = canvas;
      this.regenerate();
      const resize = () => {
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;
      };
      resize();
      window.addEventListener('resize', resize);
      document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
      });
      animate();
    },

    regenerate() {
      seed = Date.now();
      rng = mulberry32(seed);
      initNoise();
      selectPalette();
      time = 0;
      window.dispatchEvent(new CustomEvent('gen:regenerate', {
        detail: { seed, palette: sessionPalette }
      }));
    },

    renderToCanvas(canvas, opts = {}) {
      const ctx = canvas.getContext('2d');
      // Use CSS dimensions if provided (for DPR-scaled canvases), else canvas buffer size
      const w = opts.cssWidth || canvas.width;
      const h = opts.cssHeight || canvas.height;

      const renderSeed = opts.seed || seed;
      const prevRng = rng;
      rng = mulberry32(renderSeed);
      initNoise();
      if (!sessionPalette.length) selectPalette();

      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      ctx.fillStyle = isDark ? '#000000' : '#F2F2F2';
      ctx.fillRect(0, 0, w, h);

      if (opts.returnMap) {
        const map = renderCAWithMap(ctx, w, h, opts);
        rng = prevRng;
        return map;
      }

      renderCA(ctx, w, h, opts);

      rng = prevRng;
    },

    exportSVG(width = 1000, height = 1000, opts = {}) {
      const prevRng = rng;
      const renderSeed = opts.seed || seed;
      rng = mulberry32(renderSeed);
      initNoise();

      const cells = opts.cells || (40 + Math.floor(rng() * 40));
      const generations = cells;
      const cellW = width / cells;
      const cellH = height / generations;
      const grid = createJitteredGrid(cells, generations, cellW, cellH, 0);
      const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
      const strokeColor = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(11,17,32,0.75)';
      const dimColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(11,17,32,0.3)';

      let paths = '';
      let rule = generateRule();
      let state = generateInitialState(cells);
      let useAlt = false;
      const sw = Math.max(1, height / 800);

      for (let y = 0; y < generations; y++) {
        const ruleShift = Math.floor(rng() * 25) + 5;
        if (y > 0 && y % ruleShift === 0) {
          rule = generateRule();
          useAlt = !useAlt;
        }
        for (let x = 0; x < cells; x++) {
          if (state[x] !== 1) continue;
          const tl = grid[y][x], tr = grid[y][x + 1], br = grid[y + 1][x + 1], bl = grid[y + 1][x];
          paths += `<path d="M${tl.x.toFixed(2)} ${tl.y.toFixed(2)}L${tr.x.toFixed(2)} ${tr.y.toFixed(2)}L${br.x.toFixed(2)} ${br.y.toFixed(2)}L${bl.x.toFixed(2)} ${bl.y.toFixed(2)}Z" fill="none" stroke="${useAlt ? dimColor : strokeColor}" stroke-width="${sw.toFixed(2)}"/>\n`;
        }
        state = nextState(state, rule);
      }

      rng = prevRng;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${isDark ? '#0B1120' : '#F2F2F2'}"/>
  ${paths}
</svg>`;
    },

    exportPNG(width = 2500, height = 2500, opts = {}) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      this.renderToCanvas(tempCanvas, { grain: true, ...opts });
      return tempCanvas.toDataURL('image/png');
    },

    renderStrip(canvas, opts = {}) {
      const ctx = canvas.getContext('2d');
      renderStrip(ctx, canvas.width, canvas.height, opts);
    },

    renderMicro(canvas, opts = {}) {
      const ctx = canvas.getContext('2d');
      const size = Math.min(canvas.width, canvas.height);
      renderMicro(ctx, size, opts);
    },

    getLogoMark() {
      return getLogoVariant();
    },

    get LOGO_VARIANTS() { return [...LOGO_VARIANTS]; },

    // Expose for brand kit demos
    _renderCA: renderCA,
    _renderNoiseField: renderNoiseField,
    _addGrain: addGrain,
  };
})();
