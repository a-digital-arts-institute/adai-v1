// js/landing.js — Landing page with deep generative integration

document.addEventListener('DOMContentLoaded', () => {
  // --- Hamburger menu toggle ---
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('nav__links--open');
      navToggle.textContent = navLinks.classList.contains('nav__links--open') ? 'x' : '/';
    });
    navLinks.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', () => {
        navLinks.classList.remove('nav__links--open');
        navToggle.textContent = '/';
      });
    });
  }

  // --- Init generative background (full page CA) ---
  const bgCanvas = document.getElementById('gen-bg');
  // Don't init the old noise animation — we'll render CA instead

  // --- Accent color injection ---
  const applyAccents = () => {
    const palette = Gen.palette;
    if (palette.length >= 3) {
      document.documentElement.style.setProperty('--color-accent-1', palette[0]);
      document.documentElement.style.setProperty('--color-accent-2', palette[1]);
      document.documentElement.style.setProperty('--color-accent-3', palette[2]);
    }
  };
  applyAccents();
  window.addEventListener('gen:regenerate', applyAccents);

  // =============================================
  // GENERATIVE LOGO — typographic variant + accent color
  // =============================================
  // =============================================
  // LOGO TICKER — separator cycles with fade swap
  // =============================================
  const SEPARATORS = ['/', '+', '=', '?', ':', '|', '~', '*', '·', '\\', '>', '<', '^', '#', '&'];
  const esc = (c) => c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Set up each logo element — box stays, only char inside fades
  document.querySelectorAll('.nav__logo, .footer__logo').forEach((el) => {
    el.innerHTML = 'i<span class="logo__sep"><span class="logo__sep-char">' + esc(SEPARATORS[0]) + '</span></span>f';
  });

  // Cycle: transition styles for separator swap — box never changes
  let sepIndex = 0;
  let transitionStyle = 2; // default: Slide Down

  const TRANSITION_STYLES = [
    { name: 'Fade',         out: (c) => { c.style.transition = 'opacity 0.15s'; c.style.opacity = '0'; },
                            inn: (c) => { c.style.opacity = '1'; }, delay: 150 },
    { name: 'Slide Up',     out: (c) => { c.style.transition = 'transform 0.2s, opacity 0.2s'; c.style.transform = 'translateY(-100%)'; c.style.opacity = '0'; },
                            inn: (c) => { c.style.transform = 'translateY(100%)'; c.style.opacity = '0'; setTimeout(() => { c.style.transition = 'transform 0.2s, opacity 0.2s'; c.style.transform = 'translateY(0)'; c.style.opacity = '1'; }, 20); }, delay: 220 },
    { name: 'Slide Down',   out: (c) => { c.style.transition = 'transform 0.2s, opacity 0.2s'; c.style.transform = 'translateY(100%)'; c.style.opacity = '0'; },
                            inn: (c) => { c.style.transform = 'translateY(-100%)'; c.style.opacity = '0'; setTimeout(() => { c.style.transition = 'transform 0.2s, opacity 0.2s'; c.style.transform = 'translateY(0)'; c.style.opacity = '1'; }, 20); }, delay: 220 },
    { name: 'Scale Pop',    out: (c) => { c.style.transition = 'transform 0.15s, opacity 0.15s'; c.style.transform = 'scale(0)'; c.style.opacity = '0'; },
                            inn: (c) => { c.style.transform = 'scale(1.4)'; c.style.opacity = '0'; setTimeout(() => { c.style.transition = 'transform 0.2s ease-out, opacity 0.15s'; c.style.transform = 'scale(1)'; c.style.opacity = '1'; }, 20); }, delay: 170 },
    { name: 'Spin',         out: (c) => { c.style.transition = 'transform 0.25s, opacity 0.2s'; c.style.transform = 'rotate(180deg)'; c.style.opacity = '0'; },
                            inn: (c) => { c.style.transform = 'rotate(-180deg)'; c.style.opacity = '0'; setTimeout(() => { c.style.transition = 'transform 0.25s ease-out, opacity 0.2s'; c.style.transform = 'rotate(0deg)'; c.style.opacity = '1'; }, 20); }, delay: 270 },
    { name: 'Blur',         out: (c) => { c.style.transition = 'filter 0.2s, opacity 0.2s'; c.style.filter = 'blur(8px)'; c.style.opacity = '0'; },
                            inn: (c) => { c.style.filter = 'blur(8px)'; c.style.opacity = '0'; setTimeout(() => { c.style.transition = 'filter 0.2s, opacity 0.2s'; c.style.filter = 'blur(0)'; c.style.opacity = '1'; }, 20); }, delay: 220 },
    { name: 'Flip X',       out: (c) => { c.style.transition = 'transform 0.2s, opacity 0.15s'; c.style.transform = 'scaleX(0)'; c.style.opacity = '0'; },
                            inn: (c) => { c.style.transform = 'scaleX(0)'; c.style.opacity = '0'; setTimeout(() => { c.style.transition = 'transform 0.2s ease-out, opacity 0.15s'; c.style.transform = 'scaleX(1)'; c.style.opacity = '1'; }, 20); }, delay: 220 },
    { name: 'Flip Y',       out: (c) => { c.style.transition = 'transform 0.2s, opacity 0.15s'; c.style.transform = 'scaleY(0)'; c.style.opacity = '0'; },
                            inn: (c) => { c.style.transform = 'scaleY(0)'; c.style.opacity = '0'; setTimeout(() => { c.style.transition = 'transform 0.2s ease-out, opacity 0.15s'; c.style.transform = 'scaleY(1)'; c.style.opacity = '1'; }, 20); }, delay: 220 },
    { name: 'Glitch',       out: (c) => { c.style.transition = 'none'; let count = 0; const g = setInterval(() => { c.style.opacity = Math.random() > 0.5 ? '1' : '0'; c.style.transform = `translate(${(Math.random()-0.5)*4}px, ${(Math.random()-0.5)*4}px)`; count++; if(count > 6) { clearInterval(g); c.style.opacity = '0'; c.style.transform = 'none'; } }, 30); },
                            inn: (c) => { c.style.opacity = '1'; c.style.transform = 'none'; }, delay: 220 },
    { name: 'Instant',      out: (c) => { c.style.transition = 'none'; c.style.opacity = '0'; },
                            inn: (c) => { c.style.transition = 'none'; c.style.opacity = '1'; }, delay: 50 },
  ];

  const cycleSeparator = () => {
    sepIndex = (sepIndex + 1) % SEPARATORS.length;
    const chars = document.querySelectorAll('.logo__sep-char');
    const style = TRANSITION_STYLES[transitionStyle];

    // Out transition
    chars.forEach((c) => style.out(c));

    // Swap and in transition
    setTimeout(() => {
      chars.forEach((c) => {
        c.innerHTML = esc(SEPARATORS[sepIndex]);
        style.inn(c);
      });
    }, style.delay);
  };
  setInterval(cycleSeparator, 2500);

  // =============================================
  // HERO TITLE INTERACTIVE — hover swaps letters, click triggers animations
  // =============================================
  const heroTitle = document.querySelector('.hero__title');
  if (heroTitle) {
    // Map: letter -> { streakKey, original letter }
    const HERO_MAP = [
      { letter: 'i', streakKey: 'a' },
      { letter: 'n', streakKey: 's' },
      { letter: 't', streakKey: 'd' },
      { letter: 'e', streakKey: 'f' },
      { letter: 'r', streakKey: 'g' },
    ];
    const FACE_STREAK_KEY = 'h';

    // Rebuild hero title with interactive spans
    const interSpans = HERO_MAP.map(({ letter }) => {
      return `<span class="hero__letter" data-original="${letter}">${letter}</span>`;
    }).join('');

    const accentEl = heroTitle.querySelector('.hero__accent');
    const faceLetters = ['f', 'a', 'c', 'e'];
    const faceSpans = faceLetters.map(l => {
      return `<span class="hero__letter hero__letter--face" data-original="${l}">${l}</span>`;
    }).join('');

    heroTitle.innerHTML = interSpans + `<span class="hero__accent">${faceSpans}</span>`;

    // Hover + click behavior for "inter" letters
    const interLetterEls = heroTitle.querySelectorAll('.hero__letter:not(.hero__letter--face)');
    interLetterEls.forEach((el, idx) => {
      const map = HERO_MAP[idx];

      el.style.cursor = 'pointer';
      el.style.transition = 'transform 0.15s ease';

      el.addEventListener('mouseenter', () => {
        // Pick a random separator character
        const sep = SEPARATORS[Math.floor(Math.random() * SEPARATORS.length)];
        el.textContent = sep;
        el.style.transform = 'scale(1.1)';
      });

      el.addEventListener('mouseleave', () => {
        el.textContent = map.letter;
        el.style.transform = 'scale(1)';
      });

      el.addEventListener('click', () => {
        // Trigger the corresponding streak animation
        const evt = new KeyboardEvent('keydown', { key: map.streakKey });
        document.dispatchEvent(evt);
      });
    });

    // Hover + click behavior for "face" letters
    const faceLetterEls = heroTitle.querySelectorAll('.hero__letter--face');
    faceLetterEls.forEach((el) => {
      el.style.cursor = 'pointer';
      el.style.transition = 'transform 0.15s ease';

      el.addEventListener('mouseenter', () => {
        const sep = SEPARATORS[Math.floor(Math.random() * SEPARATORS.length)];
        el.textContent = sep;
        el.style.transform = 'scale(1.1)';
      });

      el.addEventListener('mouseleave', () => {
        el.textContent = el.dataset.original;
        el.style.transform = 'scale(1)';
      });

      el.addEventListener('click', () => {
        const evt = new KeyboardEvent('keydown', { key: FACE_STREAK_KEY });
        document.dispatchEvent(evt);
      });
    });
  }

  // =============================================
  // BRAND COLOR PALETTE — press 'z' to cycle
  // =============================================
  const BRAND_COLORS = [
    { name: 'Vermillion',    hex: '#D93B2D' },
    { name: 'Amber',         hex: '#E5890A' },
    { name: 'Teal',          hex: '#589191' },
    { name: 'Periwinkle',    hex: '#5677BE' },
    { name: 'Jade',          hex: '#2A7672' },
    { name: 'Rust',          hex: '#A83A1E' },
    { name: 'Deep Teal',     hex: '#093F43' },
  ];
  let brandColorIdx = 0;
  let BRAND_COLOR = BRAND_COLORS[0].hex;

  const applyBrandColor = (color) => {
    BRAND_COLOR = color;
    // Update CSS: hero accent, divider text, logo separator
    document.documentElement.style.setProperty('--brand-color', color);
    // Hero accent background
    document.querySelectorAll('.hero__accent').forEach(el => {
      el.style.setProperty('--accent-bg', color);
    });
    // Divider text color
    document.querySelectorAll('.gen-divider-text').forEach(el => {
      el.style.color = color;
    });
    // Logo separator background
    document.querySelectorAll('.logo__sep').forEach(el => {
      el.style.background = color;
    });
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'z' || e.key === 'Z') {
      brandColorIdx = (brandColorIdx + 1) % BRAND_COLORS.length;
      const c = BRAND_COLORS[brandColorIdx];
      applyBrandColor(c.hex);
      if (typeof updateDebug === 'function') updateDebug();
    }
  });

  // Debug label — hidden by default, toggle with 'h'
  let debug = document.getElementById('color-debug');
  if (!debug) {
    debug = document.createElement('div');
    debug.id = 'color-debug';
    debug.style.cssText = 'position:fixed;bottom:1rem;right:1rem;z-index:999;font-family:monospace;font-size:11px;line-height:1.6;background:rgba(0,0,0,0.9);color:#ccc;padding:14px 18px;border-radius:4px;display:none;max-width:320px;border:1px solid #333;';
    document.body.appendChild(debug);
  }

  // =============================================
  // LOGO FONT SWITCHER — press 1-9 to try fonts
  // =============================================
  const LOGO_FONTS = [
    { key: '1', name: 'JetBrains Mono',   family: "'JetBrains Mono', monospace" },
    { key: '2', name: 'Space Mono',       family: "'Space Mono', monospace" },
    { key: '3', name: 'IBM Plex Mono',    family: "'IBM Plex Mono', monospace" },
    { key: '4', name: 'Fira Code',        family: "'Fira Code', monospace" },
    { key: '5', name: 'Source Code Pro',   family: "'Source Code Pro', monospace" },
    { key: '6', name: 'Roboto Mono',      family: "'Roboto Mono', monospace" },
    { key: '7', name: 'Ubuntu Mono',      family: "'Ubuntu Mono', monospace" },
    { key: '8', name: 'Inconsolata',      family: "'Inconsolata', monospace" },
    { key: '9', name: 'Overpass Mono',    family: "'Overpass Mono', monospace" },
  ];
  let currentFont = LOGO_FONTS[0];

  const applyLogoFont = (font) => {
    currentFont = font;
    const targets = document.querySelectorAll('.nav__logo, .footer__logo, .hero__title');
    targets.forEach((el) => { el.style.fontFamily = font.family; });
    updateDebug();
  };

  // =============================================
  // TAGLINE FONT SWITCHER — press q,w,e,r,t,y,u,i,o
  // =============================================
  const TAG_FONTS = [
    { key: 'q', name: 'JetBrains Mono (italic)', family: "'JetBrains Mono', monospace" },
    { key: 'w', name: 'Inter',                   family: "'Inter', sans-serif" },
    { key: 'e', name: 'DM Sans',                 family: "'DM Sans', sans-serif" },
    { key: 'r', name: 'Work Sans',               family: "'Work Sans', sans-serif" },
    { key: 't', name: 'Libre Baskerville',        family: "'Libre Baskerville', serif" },
    { key: 'y', name: 'Playfair Display',         family: "'Playfair Display', serif" },
    { key: 'u', name: 'Cormorant Garamond',       family: "'Cormorant Garamond', serif" },
    { key: 'i', name: 'Sora',                    family: "'Sora', sans-serif" },
    { key: 'o', name: 'Space Grotesk',           family: "'Space Grotesk', sans-serif" },
  ];
  let currentTagFont = TAG_FONTS[0];

  const applyTagFont = (font) => {
    currentTagFont = font;
    const targets = document.querySelectorAll('.hero__tagline, .section p');
    targets.forEach((el) => { el.style.fontFamily = font.family; });
    updateDebug();
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'x' || e.key === 'X') {
      debug.style.display = debug.style.display === 'none' ? 'block' : 'none';
    }
    // Animation speed: - to slow down, + to speed up
    if (e.key === '-' || e.key === '_') {
      speedIdx = Math.max(0, speedIdx - 1);
      STEP_MS = SPEED_LEVELS[speedIdx].ms;
      updateDebug();
    }
    if (e.key === '=' || e.key === '+') {
      speedIdx = Math.min(SPEED_LEVELS.length - 1, speedIdx + 1);
      STEP_MS = SPEED_LEVELS[speedIdx].ms;
      updateDebug();
    }
    // Logo transition style: v to cycle
    if (e.key === 'v' || e.key === 'V') {
      transitionStyle = (transitionStyle + 1) % TRANSITION_STYLES.length;
      // Trigger a cycle immediately to show the new style
      cycleSeparator();
      updateDebug();
    }
    // CA render mode: c to cycle squares / one glyph / all glyphs
    if (e.key === 'c' || e.key === 'C') {
      caRenderMode = (caRenderMode + 1) % CA_RENDER_MODES.length;
      updateDebug();
      // Re-render the background
      window.dispatchEvent(new Event('gen:regenerate'));
    }
    // Logo font switching: 1-9
    const fontIdx = parseInt(e.key) - 1;
    if (fontIdx >= 0 && fontIdx < LOGO_FONTS.length) {
      applyLogoFont(LOGO_FONTS[fontIdx]);
    }
    // Tagline font switching: q,w,e,r,t,y,u,i,o
    const tagFont = TAG_FONTS.find(f => f.key === e.key.toLowerCase());
    if (tagFont) {
      applyTagFont(tagFont);
    }
  });

  // =============================================
  // CA BACKGROUND VARIANT — random on each load
  // =============================================
  const CA_VARIANTS = [
    { id: 0, name: 'Default (static, 18%)' },
    { id: 1, name: 'Slow breath pulse' },
    { id: 2, name: 'Flash reveal on load' },
    { id: 3, name: 'High contrast' },
    { id: 4, name: 'Bold (35%)' },
    { id: 5, name: 'Horizontal bands' },
  ];

  const caVariantIdx = Math.floor(Math.random() * CA_VARIANTS.length);
  const caVariant = CA_VARIANTS[caVariantIdx];

  if (bgCanvas && caVariant.id > 0) {
    bgCanvas.classList.add('ca--' + caVariant.id);
  }

  // =============================================
  // CA RENDER MODE — press 'c' to cycle: squares / one glyph / all glyphs
  // =============================================
  const CA_RENDER_MODES = ['Squares', 'One Glyph', 'All Glyphs'];
  let caRenderMode = 0;

  const SPEED_LEVELS = [
    { label: '50%',  ms: 75 },
    { label: '75%',  ms: 50 },
    { label: '100%', ms: 38 },
    { label: '110%', ms: 34 },
    { label: '125%', ms: 30 },
  ];
  let speedIdx = 2;
  let STEP_MS = SPEED_LEVELS[speedIdx].ms;

  // Update debug label — called whenever font, CA, or streak mode changes
  const STREAK_MODES_REF = [
    { key: 'a', name: 'Snake' },
    { key: 's', name: 'Multi-snake' },
    { key: 'd', name: 'Rain' },
    { key: 'f', name: 'Lightning' },
    { key: 'g', name: 'Row sweep' },
    { key: 'h', name: 'Swarm' },
    { key: 'j', name: 'Off' },
  ];
  let currentStreakMode = 0;

  const updateDebug = () => {
    if (debug) {
      const sm = STREAK_MODES_REF[currentStreakMode] || STREAK_MODES_REF[0];
      const bc = BRAND_COLORS[brandColorIdx];
      debug.innerHTML = `<strong style="color:${BRAND_COLOR};font-size:14px">Interface — Design Controls</strong><br><br>`
        + `<strong>1. Brand Color</strong> [z] to cycle<br>`
        + `&nbsp;&nbsp;<span style="color:${BRAND_COLOR}">■</span> ${bc.name} <span style="opacity:0.5">${bc.hex}</span><br><br>`
        + `<strong>2. Logo Font</strong> [1-9] to switch<br>`
        + `&nbsp;&nbsp;${currentFont.name}<br><br>`
        + `<strong>3. Tagline Font</strong> [q w e r t y u i o] to switch<br>`
        + `&nbsp;&nbsp;${currentTagFont.name}<br><br>`
        + `<strong>4. Streak Animation</strong> [a s d f g h j] to switch<br>`
        + `&nbsp;&nbsp;[${sm.key}] ${sm.name}<br><br>`
        + `<strong>5. Logo Transition</strong> [v] to cycle<br>`
        + `&nbsp;&nbsp;${TRANSITION_STYLES[transitionStyle].name}<br><br>`
        + `<strong>6. CA Render</strong> [c] to cycle<br>`
        + `&nbsp;&nbsp;${CA_RENDER_MODES[caRenderMode]}<br><br>`
        + `<strong>7. Animation Speed</strong> [-] [+]<br>`
        + `&nbsp;&nbsp;${SPEED_LEVELS[speedIdx].label}<br><br>`
        + `<span style="opacity:0.4">x - toggle this panel</span>`;
    }
  };
  updateDebug();


  // =============================================
  // FULL PAGE CA BACKGROUND — runs top to bottom
  // =============================================
  let caMap = null; // stores active cell data for streak animation
  let streakCanvas = null; // overlay canvas for streak effect

  if (bgCanvas) {
    const renderFullPageCA = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      // Use full document height so CA runs through entire page
      const h = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);

      bgCanvas.width = w * dpr;
      bgCanvas.height = h * dpr;
      bgCanvas.style.width = w + 'px';
      bgCanvas.style.height = h + 'px';

      const ctx = bgCanvas.getContext('2d');
      ctx.scale(dpr, dpr);

      // Grid — ~10px per cell, return cell map for streak animation
      const cells = Math.floor(w / 10);
      caMap = Gen.renderToCanvas(bgCanvas, { cells, grain: false, seed: Gen.seed, cssWidth: w, cssHeight: h, returnMap: true });

      // Glyph overlay if in glyph mode
      if (caRenderMode > 0 && caMap && caMap.activeCells) {
        const GLYPHS = ['/', '+', '=', '?', ':', '|', '~', '*', '>', '<', '^', '#', '&'];
        const currentGlyph = SEPARATORS[sepIndex] || '/';
        const cellSize = caMap.cellW || 10;
        const fontSize = Math.max(5, Math.min(cellSize * 0.8, 12));

        // Clear the CA squares and redraw as glyphs
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        ctx.fillStyle = isDark ? '#000000' : '#F2F2F2';
        ctx.fillRect(0, 0, w, h);

        ctx.font = `700 ${fontSize}px 'JetBrains Mono', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)';

        caMap.activeCells.forEach(cell => {
          const glyph = caRenderMode === 1 ? currentGlyph : GLYPHS[(cell.col * 7 + cell.row * 13) % GLYPHS.length];
          const cx = (cell.tl.x + cell.tr.x) / 2;
          const cy = (cell.tl.y + cell.bl.y) / 2;
          ctx.fillText(glyph, cx, cy);
        });
      }

      // Create or resize streak overlay canvas
      if (!streakCanvas) {
        streakCanvas = document.createElement('canvas');
        streakCanvas.id = 'streak-overlay';
        streakCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;pointer-events:none;z-index:0;';
        bgCanvas.parentElement.insertBefore(streakCanvas, bgCanvas.nextSibling);
      }
      streakCanvas.width = w * dpr;
      streakCanvas.height = h * dpr;
      streakCanvas.style.width = w + 'px';
      streakCanvas.style.height = h + 'px';
    };

    // Render after a brief delay so the page has laid out
    setTimeout(renderFullPageCA, 100);

    window.addEventListener('resize', () => renderFullPageCA());
    window.addEventListener('gen:regenerate', () => renderFullPageCA());

    // =============================================
    // STREAK ANIMATION SYSTEM — continuous, overlapping
    // =============================================
    const getStreakColor = () => BRAND_COLOR;
    let streakMode = 0;
    let streakGeneration = 0; // bumped on key press to kill all active streaks
    let animFrameId = null;

    const STREAK_MODES = [
      { key: 'a', name: 'Snake',       desc: 'Single trail snaking top to bottom' },
      { key: 's', name: 'Multi-snake', desc: 'Three simultaneous snakes top to bottom' },
      { key: 'd', name: 'Rain',        desc: 'Many vertical streaks falling top to bottom' },
      { key: 'f', name: 'Lightning',   desc: 'Jagged bolt top to bottom with branches' },
      { key: 'g', name: 'Row sweep',   desc: 'Lights each row of CA cells top to bottom' },
      { key: 'h', name: 'Swarm',      desc: 'Multiple staggered instances of a random mode' },
      { key: 'j', name: 'Off',        desc: 'No animation' },
    ];

    // --- Shared helpers ---
    const buildLookup = () => {
      const lookup = new Map();
      if (caMap && caMap.activeCells) {
        caMap.activeCells.forEach(c => lookup.set(c.col + ',' + c.row, c));
      }
      return lookup;
    };

    const drawCell = (ctx, cell, alpha, color) => {
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.beginPath();
      ctx.moveTo(cell.tl.x, cell.tl.y);
      ctx.lineTo(cell.tr.x, cell.tr.y);
      ctx.lineTo(cell.br.x, cell.br.y);
      ctx.lineTo(cell.bl.x, cell.bl.y);
      ctx.closePath();
      ctx.fillStyle = color || getStreakColor();
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.restore();
    };

    // Trace a path — forces path to reach near the bottom row
    const tracePath = (startCell, lookup, length, dirBias) => {
      const path = [startCell];
      const visited = new Set();
      visited.add(startCell.col + ',' + startCell.row);
      let current = startCell;

      const dirs = dirBias || [
        [0, 1], [1, 1], [-1, 1], [1, 0], [-1, 0],
      ];

      for (let i = 0; i < length; i++) {
        const shuffled = [...dirs].sort(() => Math.random() - 0.5);
        let found = false;
        for (const [dx, dy] of shuffled) {
          const key = (current.col + dx) + ',' + (current.row + dy);
          if (!visited.has(key) && lookup.has(key)) {
            const next = lookup.get(key);
            path.push(next);
            visited.add(key);
            current = next;
            found = true;
            break;
          }
        }
        if (!found) {
          const ac = caMap.activeCells;
          let nearby = null;
          // Search progressively wider to always find a way down
          for (let jump = 3; jump <= 20 && !nearby; jump += 3) {
            nearby = ac.find(c => {
              const key = c.col + ',' + c.row;
              return !visited.has(key) && Math.abs(c.col - current.col) <= jump && c.row > current.row && c.row <= current.row + jump;
            });
          }
          if (nearby) {
            path.push(nearby);
            visited.add(nearby.col + ',' + nearby.row);
            current = nearby;
          } else break;
        }
      }
      return path;
    };

    const pickTopCell = (lookup, maxRow) => {
      const ac = caMap.activeCells;
      const topCells = ac.filter(c => c.row <= maxRow);
      return topCells.length > 0 ? topCells[Math.floor(Math.random() * topCells.length)] : ac[0];
    };

    // Pre-compute row data for row sweep
    const buildRowData = () => {
      if (!caMap || !caMap.activeCells.length) return null;
      const rows = new Map();
      caMap.activeCells.forEach(cell => {
        if (!rows.has(cell.row)) rows.set(cell.row, []);
        rows.get(cell.row).push(cell);
      });
      return { rows, sortedKeys: [...rows.keys()].sort((a, b) => a - b) };
    };

    // =============================================
    // CONTINUOUS ANIMATION ENGINE
    // Active streaks live in an array. A shared render loop
    // draws them all every frame. New streaks spawn at staggered
    // intervals. Finished streaks are removed automatically.
    // =============================================
    const activeStreaks = []; // list of streak objects

    // --- Streak object factories ---
    // Each returns { step, done, draw(ctx), totalSteps }

    const createSnake = (lookup) => {
      const start = pickTopCell(lookup, 5);
      const path = tracePath(start, lookup, caMap.generations * 2);
      if (path.length < 10) return null;
      const tailLen = 20;
      return {
        step: 0,
        get done() { return this.step >= path.length + tailLen; },
        get totalSteps() { return path.length + tailLen; },
        draw(ctx) {
          for (let t = 0; t < tailLen; t++) {
            const idx = this.step - t;
            if (idx >= 0 && idx < path.length) {
              drawCell(ctx, path[idx], (1 - t / tailLen) * 0.7);
            }
          }
          this.step++;
        },
      };
    };

    const createMultiSnake = (lookup) => {
      const paths = [];
      for (let n = 0; n < 3; n++) {
        const start = pickTopCell(lookup, 5);
        paths.push(tracePath(start, lookup, caMap.generations * 2));
      }
      const maxLen = Math.max(...paths.map(p => p.length));
      if (maxLen < 10) return null;
      const tailLen = 12;
      return {
        step: 0,
        get done() { return this.step >= maxLen + tailLen; },
        get totalSteps() { return maxLen + tailLen; },
        draw(ctx) {
          paths.forEach(path => {
            for (let t = 0; t < tailLen; t++) {
              const idx = this.step - t;
              if (idx >= 0 && idx < path.length) {
                drawCell(ctx, path[idx], (1 - t / tailLen) * 0.6);
              }
            }
          });
          this.step++;
        },
      };
    };

    const createRain = (lookup) => {
      const ac = caMap.activeCells;
      const topCells = ac.filter(c => c.row <= 5);
      if (topCells.length < 3) return null;
      const drops = [];
      const vertDirs = [[0, 1], [0, 1], [0, 1], [1, 1], [-1, 1]];
      for (let n = 0; n < 8; n++) {
        const start = topCells[Math.floor(Math.random() * topCells.length)];
        const path = tracePath(start, lookup, caMap.generations * 2, vertDirs);
        if (path.length > 5) drops.push({ path, delay: Math.floor(Math.random() * 80) });
      }
      if (drops.length === 0) return null;
      const maxLen = Math.max(...drops.map(d => d.path.length + d.delay));
      const tailLen = 8;
      return {
        step: 0,
        _tick: 0,
        get done() { return this.step >= maxLen + tailLen + 5; },
        get totalSteps() { return maxLen + tailLen + 5; },
        draw(ctx) {
          drops.forEach(({ path, delay }) => {
            const s = this.step - delay;
            if (s < 0) return;
            for (let t = 0; t < tailLen; t++) {
              const idx = s - t;
              if (idx >= 0 && idx < path.length) {
                drawCell(ctx, path[idx], (1 - t / tailLen) * 0.6);
              }
            }
          });
          this._tick++;
          if (this._tick % 2 === 0) this.step++; // advance every other frame
        },
      };
    };

    const createLightning = (lookup) => {
      const start = pickTopCell(lookup, 3);
      const mainPath = tracePath(start, lookup, caMap.generations * 2, [[0, 1], [1, 1], [-1, 1], [2, 1], [-2, 1]]);
      if (mainPath.length < 10) return null;
      const branches = [];
      const spacing = Math.max(15, Math.floor(mainPath.length / 8));
      for (let i = 10; i < mainPath.length; i += Math.floor(Math.random() * spacing) + 8) {
        const bs = mainPath[i];
        if (!bs) continue;
        const bDir = Math.random() > 0.5
          ? [[1, 1], [1, 0], [2, 1], [1, -1]]
          : [[-1, 1], [-1, 0], [-2, 1], [-1, -1]];
        const branch = tracePath(bs, lookup, 20, bDir);
        if (branch.length > 2) branches.push({ path: branch, startStep: i });
      }
      const tailLen = 18;
      return {
        step: 0,
        get done() { return this.step >= mainPath.length + tailLen; },
        get totalSteps() { return mainPath.length + tailLen; },
        draw(ctx) {
          for (let t = 0; t < tailLen; t++) {
            const idx = this.step - t;
            if (idx >= 0 && idx < mainPath.length) {
              drawCell(ctx, mainPath[idx], (1 - t / tailLen) * 0.85);
            }
          }
          branches.forEach(({ path, startStep }) => {
            const bs = this.step - startStep;
            if (bs < 0) return;
            for (let t = 0; t < 8; t++) {
              const idx = bs - t;
              if (idx >= 0 && idx < path.length) {
                drawCell(ctx, path[idx], (1 - t / 8) * 0.5);
              }
            }
          });
          this.step++;
        },
      };
    };

    const createRowSweep = () => {
      const rd = buildRowData();
      if (!rd || rd.sortedKeys.length < 5) return null;
      const totalRows = rd.sortedKeys.length;
      const tailRows = 6;
      return {
        step: 0,
        get done() { return this.step >= totalRows + tailRows; },
        get totalSteps() { return totalRows + tailRows; },
        draw(ctx) {
          for (let t = 0; t < tailRows; t++) {
            const rowIdx = this.step - t;
            if (rowIdx >= 0 && rowIdx < totalRows) {
              const alpha = (1 - t / tailRows) * 0.65;
              const cells = rd.rows.get(rd.sortedKeys[rowIdx]);
              if (cells) cells.forEach(cell => drawCell(ctx, cell, alpha));
            }
          }
          this.step++;
        },
      };
    };

    // Swarm: create multiple streak objects at once
    const createSwarmStreaks = (lookup) => {
      const streaks = [];
      const baseTypes = [0, 1, 2, 3]; // snake, rain, lightning, rowsweep
      const baseType = baseTypes[Math.floor(Math.random() * baseTypes.length)];
      const count = 3 + Math.floor(Math.random() * 3);
      for (let n = 0; n < count; n++) {
        let s = null;
        if (baseType === 0) s = createSnake(lookup);
        else if (baseType === 1) s = createRain(lookup);
        else if (baseType === 2) s = createLightning(lookup);
        else s = createRowSweep();
        if (s) {
          // Stagger by advancing the start negatively (delay via negative step)
          s._delay = n * (20 + Math.floor(Math.random() * 30));
          s._delayRemaining = s._delay;
          streaks.push(s);
        }
      }
      return streaks;
    };

    // Factory by mode index
    const createStreak = (modeIdx, lookup) => {
      if (modeIdx === 0) return [createSnake(lookup)].filter(Boolean);
      if (modeIdx === 1) return [createMultiSnake(lookup)].filter(Boolean);
      if (modeIdx === 2) return [createRain(lookup)].filter(Boolean);
      if (modeIdx === 3) return [createLightning(lookup)].filter(Boolean);
      if (modeIdx === 4) return [createRowSweep()].filter(Boolean);
      if (modeIdx === 5) return createSwarmStreaks(lookup);
      if (modeIdx === 6) return []; // Off — no streaks
      return [];
    };

    // --- Spawn timing: stagger new streaks so multiples overlap ---
    let spawnCounter = 0;
    const getSpawnInterval = () => {
      // Spawn a new streak every N steps — varies by mode
      if (streakMode === 5) return 60;  // swarm: less frequent (they're already multiple)
      if (streakMode === 4) return 80;  // row sweep: less frequent (wide effect)
      return 40 + Math.floor(Math.random() * 30); // others: moderate overlap
    };
    let nextSpawnIn = getSpawnInterval();

    // --- Main render loop ---
    const renderLoop = () => {
      if (!caMap || !streakCanvas) {
        animFrameId = setTimeout(renderLoop, STEP_MS);
        return;
      }

      const ctx = streakCanvas.getContext('2d');
      ctx.clearRect(0, 0, streakCanvas.width, streakCanvas.height);

      // Draw all active streaks
      for (let i = activeStreaks.length - 1; i >= 0; i--) {
        const s = activeStreaks[i];
        // Handle stagger delay
        if (s._delayRemaining && s._delayRemaining > 0) {
          s._delayRemaining--;
          continue;
        }
        if (s.done) {
          activeStreaks.splice(i, 1);
          continue;
        }
        s.draw(ctx);
      }

      // Spawn new streaks at intervals
      spawnCounter++;
      if (spawnCounter >= nextSpawnIn) {
        spawnCounter = 0;
        nextSpawnIn = getSpawnInterval();
        const lookup = buildLookup();
        const newStreaks = createStreak(streakMode, lookup);
        activeStreaks.push(...newStreaks);
      }

      animFrameId = setTimeout(renderLoop, STEP_MS);
    };

    // --- Hotkey handler for streak modes ---
    document.addEventListener('keydown', (e) => {
      const modeIdx = STREAK_MODES.findIndex(m => m.key === e.key.toLowerCase());
      if (modeIdx !== -1) {
        streakMode = modeIdx;
        currentStreakMode = modeIdx;
        streakGeneration++;
        // Clear existing streaks and spawn fresh
        activeStreaks.length = 0;
        spawnCounter = 0;
        nextSpawnIn = 0; // spawn immediately
        updateDebug();
      }
    });

    // Start the continuous render loop
    setTimeout(() => {
      nextSpawnIn = 0; // spawn first streak immediately
      renderLoop();
    }, 1500);
  }

  // =============================================
  // SECTION DIVIDERS — repeated typographic symbols
  // =============================================
  const DIV_SYMBOLS = ['/', '+', '=', ':', '|', '~', '*', '#', '^', '&', '?', '·'];
  document.querySelectorAll('.section__heading').forEach((heading, i) => {
    const sym = DIV_SYMBOLS[i % DIV_SYMBOLS.length];
    const divEl = document.createElement('span');
    divEl.className = 'gen-divider-text';
    // Fill with repeated symbol — enough to overflow and get clipped
    divEl.textContent = sym.repeat(400);
    heading.appendChild(divEl);
  });

  // Card accents removed — full-page CA provides the generative texture

  // Footer logo uses same ticker as nav (set up at line 46)

  // =============================================
  // SCROLL REVEALS
  // =============================================
  const sections = document.querySelectorAll('.section:not(.section--hero)');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('section--visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  sections.forEach((s) => {
    s.classList.add('section--hidden');
    observer.observe(s);
  });

  // =============================================
  // EMAIL FORM
  // =============================================
  const form = document.getElementById('signup-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' },
      }).then(res => {
        if (res.ok) {
          form.innerHTML = '<p style="color: var(--color-text)">Connected. We\'ll be in touch.</p>';
        } else {
          form.innerHTML = '<p style="color: var(--color-text)">Something went wrong. Try again.</p>';
        }
      }).catch(() => {
        form.innerHTML = '<p style="color: var(--color-text)">Connected. We\'ll be in touch.</p>';
      });
    });
  }
});
