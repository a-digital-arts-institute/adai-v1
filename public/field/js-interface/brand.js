// js/brand.js — Brand identity kit interactive demos

document.addEventListener('DOMContentLoaded', () => {
  // --- Custom dropdown builder ---
  const createDropdown = (container, options, initialIdx, onChange) => {
    const el = document.createElement('div');
    el.className = 'custom-select';
    let selectedIdx = initialIdx;

    const render = () => {
      el.innerHTML = `
        <button class="custom-select__trigger">${options[selectedIdx].label}</button>
        <div class="custom-select__options">
          ${options.map((o, i) => `<div class="custom-select__option ${i === selectedIdx ? 'active' : ''}" data-idx="${i}">${o.label}</div>`).join('')}
        </div>
      `;

      el.querySelector('.custom-select__trigger').addEventListener('click', (e) => {
        e.stopPropagation();
        // Close all other dropdowns first
        document.querySelectorAll('.custom-select.open').forEach(d => { if (d !== el) d.classList.remove('open'); });
        el.classList.toggle('open');
      });

      el.querySelectorAll('.custom-select__option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          selectedIdx = parseInt(e.target.dataset.idx);
          el.classList.remove('open');
          render();
          onChange(selectedIdx);
        });
      });
    };

    render();
    container.appendChild(el);

    // Close on outside click
    document.addEventListener('click', () => el.classList.remove('open'));

    return {
      get value() { return selectedIdx; },
      set value(idx) { selectedIdx = idx; render(); },
    };
  };

  // --- Hamburger menu toggle ---
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('nav__links--open');
      navToggle.textContent = navLinks.classList.contains('nav__links--open') ? 'x' : '/';
    });
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navLinks.classList.remove('nav__links--open');
        navToggle.textContent = '/';
      });
    });
  }

  // --- Init generative background ---
  const bgCanvas = document.getElementById('gen-bg');
  if (bgCanvas) Gen.init(bgCanvas);

  // --- Apply accents ---
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

  // --- Logo ticker — same cycling as landing page ---
  const SEPARATORS = ['/', '+', '=', '?', ':', '|', '~', '*', '\u00B7', '\\', '>', '<', '^', '#', '&'];
  const esc = (c) => c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  document.querySelectorAll('.nav__logo, .footer__logo').forEach((el) => {
    el.innerHTML = 'i<span class="logo__sep"><span class="logo__sep-char">' + esc(SEPARATORS[0]) + '</span></span>f';
  });

  let sepIndex = 0;
  const cycleSeparator = () => {
    sepIndex = (sepIndex + 1) % SEPARATORS.length;
    const chars = document.querySelectorAll('.logo__sep-char');
    // Slide down out
    chars.forEach((c) => {
      c.style.transition = 'transform 0.2s, opacity 0.2s';
      c.style.transform = 'translateY(100%)';
      c.style.opacity = '0';
    });
    // Slide down in
    setTimeout(() => {
      chars.forEach((c) => {
        c.style.transition = 'none';
        c.style.transform = 'translateY(-100%)';
        c.style.opacity = '0';
        c.innerHTML = esc(SEPARATORS[sepIndex]);
        setTimeout(() => {
          c.style.transition = 'transform 0.2s, opacity 0.2s';
          c.style.transform = 'translateY(0)';
          c.style.opacity = '1';
        }, 20);
      });
    }, 220);
  };
  setInterval(cycleSeparator, 2500);

  const setLogo = () => {
    // Re-init ticker after regeneration
    document.querySelectorAll('.nav__logo, .footer__logo').forEach((el) => {
      el.innerHTML = 'i<span class="logo__sep"><span class="logo__sep-char">' + esc(SEPARATORS[sepIndex]) + '</span></span>f';
    });
  };

  // --- Typographic section dividers (same as landing page) ---
  const DIV_SYMBOLS = ['/', '+', '=', ':', '|', '~', '*', '#', '^', '&', '?', '\u00B7'];
  document.querySelectorAll('.section__heading').forEach((heading, i) => {
    const sym = DIV_SYMBOLS[i % DIV_SYMBOLS.length];
    const divEl = document.createElement('span');
    divEl.className = 'gen-divider-text';
    divEl.textContent = sym.repeat(400);
    heading.appendChild(divEl);
  });

  // --- Logo section ---
  const logoDemos = document.getElementById('logo-demos');
  if (logoDemos) {
    // Build the "all separators" display using the same set as the ticker
    const sepDisplay = SEPARATORS.map(s => {
      const escaped = esc(s);
      return `<span style="font-size: 2rem; font-weight: 700; opacity: 0.6;">i<span class="logo__sep">${escaped}</span>f</span>`;
    }).join('');

    logoDemos.innerHTML = `
      <div style="margin-bottom: var(--space-xl);">
        <div class="type-scale__label" style="margin-bottom: var(--space-md);">Generative - Live on web (cycles every visit)</div>
        <div class="logo-display" style="margin-bottom: var(--space-lg);">
          <div>
            <div class="type-scale__label">Current</div>
            <div class="logo-display__monogram" id="logo-current">i<span class="logo__sep"><span class="logo__sep-char">${esc(SEPARATORS[sepIndex])}</span></span>f</div>
          </div>
          <div>
            <div class="type-scale__label">Wordmark</div>
            <div class="logo-display__wordmark">interface</div>
          </div>
        </div>
        <div class="type-scale__label">All separator variants</div>
        <div class="logo-display" style="align-items: center; gap: var(--space-md); flex-wrap: wrap; margin-top: var(--space-sm);">
          ${sepDisplay}
        </div>
      </div>

      <div>
        <div class="type-scale__label" style="margin-bottom: var(--space-md);">Static - For print, decks, and non-web use</div>
        <div class="logo-display" style="margin-bottom: var(--space-lg);">
          <div>
            <div class="type-scale__label">Monogram</div>
            <div class="logo-display__monogram">i<span class="logo__sep">/</span>f</div>
          </div>
          <div>
            <div class="type-scale__label">Wordmark</div>
            <div class="logo-display__wordmark">interface</div>
          </div>
        </div>
        <div class="type-scale__label">Sizes</div>
        <div class="logo-display" style="align-items: center; gap: var(--space-md); margin-top: var(--space-sm);">
          <span style="font-size: 3rem; font-weight: 700;">i<span class="logo__sep">/</span>f</span>
          <span style="font-size: 2rem; font-weight: 700;">i<span class="logo__sep">/</span>f</span>
          <span style="font-size: 1.5rem; font-weight: 700;">i<span class="logo__sep">/</span>f</span>
          <span style="font-size: 1rem; font-weight: 700;">i<span class="logo__sep">/</span>f</span>
          <span style="font-size: 0.75rem; font-weight: 700;">i<span class="logo__sep">/</span>f</span>
        </div>
        <div style="margin-top: var(--space-lg);">
          <div class="type-scale__label">Clear space = height of the separator</div>
          <div style="display: inline-block; border: 1px dashed var(--color-text-muted); padding: 2rem;">
            <span style="font-size: 4rem; font-weight: 700;">i<span class="logo__sep">/</span>f</span>
          </div>
        </div>
      </div>
    `;
  }

  // --- Color section ---
  const colorDemos = document.getElementById('color-demos');
  if (colorDemos) {
    const BRAND_COLORS = [
      { name: 'Vermillion',    hex: '#D93B2D' },
      { name: 'Amber',         hex: '#E5890A' },
      { name: 'Teal',          hex: '#589191' },
      { name: 'Periwinkle',    hex: '#5677BE' },
      { name: 'Jade',          hex: '#2A7672' },
      { name: 'Rust',          hex: '#A83A1E' },
      { name: 'Deep Teal',     hex: '#093F43' },
    ];

    const BASE_COLORS = [
      { hex: '#000000', name: 'Background' },
      { hex: '#0A0A0A', name: 'Surface' },
      { hex: '#141414', name: 'Surface 2' },
      { hex: '#222222', name: 'Border' },
      { hex: '#F2F2F2', name: 'Text' },
      { hex: '#888888', name: 'Text Muted' },
    ];

    colorDemos.innerHTML = `
      <div class="type-scale__label">Brand palette - cycle with [z]</div>
      <p style="font-family: var(--font-body); font-size: var(--fs-xs); color: var(--color-text-muted); margin-bottom: var(--space-md); line-height: 1.7;">One color active at a time. Applied to the logo separator, section dividers, card hover states, streak animations, and all accent elements across the site.</p>
      <div class="swatch-grid" style="margin-bottom: var(--space-lg);">
        ${BRAND_COLORS.map(c => `
          <div class="swatch" style="background: ${c.hex};" onclick="navigator.clipboard.writeText('${c.hex}').then(() => this.querySelector('.swatch__label').textContent = 'Copied!')">
            <span class="swatch__label" style="color: #F2F2F2;">${c.name}<br>${c.hex}</span>
          </div>
        `).join('')}
      </div>
      <div style="margin-top: var(--space-lg);">
        <div class="type-scale__label">Base tones</div>
        <div class="swatch-grid">
          ${BASE_COLORS.map(c => `
            <div class="swatch" style="background: ${c.hex}; border-color: #333;" onclick="navigator.clipboard.writeText('${c.hex}').then(() => this.querySelector('.swatch__label').textContent = 'Copied!')">
              <span class="swatch__label" style="color: ${c.hex === '#F2F2F2' || c.hex === '#888888' ? '#0A0A0A' : '#F2F2F2'}">${c.name}<br>${c.hex}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // --- Typography section - dropdown for each font ---
  const typeDemos = document.getElementById('type-demos');
  if (typeDemos) {
    const FONTS = [
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

    const scales = [
      { name: '--fs-hero', label: 'Hero', sample: 'interface', weight: 300 },
      { name: '--fs-xl', label: 'XL', sample: 'Interface Radio', weight: 400 },
      { name: '--fs-lg', label: 'Large', sample: 'What We Do', weight: 400 },
      { name: '--fs-md', label: 'Medium', sample: 'A living platform for sound, culture, and community.', weight: 300 },
      { name: '--fs-base', label: 'Base', sample: 'Independent broadcasting. Live shows, resident DJs.', weight: 300 },
      { name: '--fs-sm', label: 'Small', sample: 'SECTION HEADING / NAVIGATION / LABELS', weight: 500 },
      { name: '--fs-xs', label: 'XS', sample: '2026 INTERFACE / MONOSPACE', weight: 400 },
    ];

    const renderPreview = (idx) => {
      const font = FONTS[idx];
      const preview = document.getElementById('type-preview');
      if (!preview) return;
      preview.innerHTML = `
        <div class="type-scale__label" style="margin-bottom: var(--space-md);">
          ${font.name} / Weights: 300, 400, 500, 700
        </div>
        ${scales.map(s => `
          <div class="type-scale__item">
            <div class="type-scale__label">${s.label} / ${s.name}</div>
            <div style="font-family: ${font.family}; font-size: var(${s.name}); font-weight: ${s.weight};">${s.sample}</div>
          </div>
        `).join('')}
        <div style="margin-top: var(--space-lg);">
          <div class="type-scale__label">Uppercase headers</div>
          <div style="font-family: ${font.family}; font-size: var(--fs-xs); font-weight: 500; text-transform: uppercase; letter-spacing: 0.15em; color: var(--color-text-muted); padding-bottom: var(--space-xs); border-bottom: 1px solid var(--color-border);">
            Section Heading Style
          </div>
        </div>
      `;
    };

    typeDemos.innerHTML = `
      <div class="type-scale__label" style="margin-bottom: var(--space-sm);">Select font [1-9] to preview</div>
      <div id="type-font-dropdown"></div>
      <div id="type-preview" style="margin-top: var(--space-lg);"></div>
    `;

    const fontDropdownOptions = FONTS.map(f => ({ label: '[' + f.key + '] ' + f.name }));
    const fontDropdown = createDropdown(document.getElementById('type-font-dropdown'), fontDropdownOptions, 0, (idx) => renderPreview(idx));

    renderPreview(0);

    // Sync 1-9 keys with dropdown
    document.addEventListener('keydown', (e) => {
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < FONTS.length) {
        fontDropdown.value = idx;
        renderPreview(idx);
      }
    });
  }

  // --- Generative system demos ---
  const genDemos = document.getElementById('gen-demos');

  const ASPECT_RATIOS = [
    { label: '1:1 Square', w: 1, h: 1 },
    { label: '16:9 Landscape', w: 16, h: 9 },
    { label: '9:16 Portrait', w: 9, h: 16 },
    { label: '4:3 Standard', w: 4, h: 3 },
    { label: '3:4 Portrait', w: 3, h: 4 },
    { label: '2:1 Banner', w: 2, h: 1 },
    { label: 'A4 Portrait', w: 210, h: 297 },
    { label: 'A4 Landscape', w: 297, h: 210 },
  ];

  const DENSITY_OPTIONS = [
    { label: 'Dense (80 cells)', cells: 80 },
    { label: 'Medium (60 cells)', cells: 60 },
    { label: 'Sparse (40 cells)', cells: 40 },
    { label: 'Ultra-fine (120 cells)', cells: 120 },
  ];

  if (genDemos) {
    let currentAspect = 0;
    let currentDensity = 0;
    let currentSeed = Date.now();
    let animating = false;
    let animFrameId = null;
    let glyphMode = 0; // 0=squares, 1=one glyph, 2=all glyphs

    const renderGenSection = () => {
      genDemos.innerHTML = `
        <div style="display: flex; gap: var(--space-sm); flex-wrap: wrap; margin-bottom: var(--space-md); justify-content: center;">
          <div>
            <div class="type-scale__label" style="margin-bottom: var(--space-xs);">Aspect ratio</div>
            <div id="gen-aspect-dropdown"></div>
          </div>
          <div>
            <div class="type-scale__label" style="margin-bottom: var(--space-xs);">Density</div>
            <div id="gen-density-dropdown"></div>
          </div>
        </div>
        <div class="gen-demo" id="gen-demo-container">
          <canvas id="gen-demo-canvas"></canvas>
        </div>
        <div class="gen-demo__controls" style="margin-top: var(--space-sm);">
          <button class="btn" id="gen-regen">Regenerate</button>
          <button class="btn" id="gen-animate">Animate</button>
          <button class="btn" id="gen-glyph-one">One Glyph</button>
          <button class="btn" id="gen-glyph-all">All Glyphs</button>
          <button class="btn" id="gen-save-png">Save PNG</button>
          <button class="btn" id="gen-save-svg">Save SVG</button>
        </div>
        <div class="type-scale__label" style="margin-top: var(--space-xs); text-align: center;" id="gen-seed-label">Seed: ${currentSeed}</div>
      `;

      const renderCanvas = () => {
        const canvas = document.getElementById('gen-demo-canvas');
        const container = document.getElementById('gen-demo-container');
        if (!canvas || !container) return;

        const aspect = ASPECT_RATIOS[currentAspect];
        const ratio = aspect.w / aspect.h;

        // Container max width 700px, compute height from aspect
        const maxW = Math.min(800, window.innerWidth - 40);
        let cssW, cssH;
        if (ratio >= 1) {
          cssW = maxW;
          cssH = Math.round(maxW / ratio);
        } else {
          cssH = Math.min(maxW, 600);
          cssW = Math.round(cssH * ratio);
        }

        container.style.width = cssW + 'px';
        container.style.height = cssH + 'px';
        container.style.aspectRatio = 'unset';

        // 10% margin
        const margin = 0.1;
        const innerW = Math.round(cssW * (1 - margin * 2));
        const innerH = Math.round(cssH * (1 - margin * 2));
        const offsetX = Math.round(cssW * margin);
        const offsetY = Math.round(cssH * margin);

        const dpr = window.devicePixelRatio || 1;
        const density = DENSITY_OPTIONS[currentDensity];

        // Render CA at full DPR resolution for crisp lines
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = innerW * dpr;
        tmpCanvas.height = innerH * dpr;
        const tmpCtx = tmpCanvas.getContext('2d');
        tmpCtx.scale(dpr, dpr);

        // Get map for glyph mode (also renders CA)
        const caMap = Gen.renderToCanvas(tmpCanvas, {
          cells: density.cells,
          seed: currentSeed,
          cssWidth: innerW,
          cssHeight: innerH,
          returnMap: true,
        });

        // Main canvas at DPR resolution
        canvas.width = cssW * dpr;
        canvas.height = cssH * dpr;
        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';

        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Margin border
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(offsetX, offsetY, innerW, innerH);
        ctx.restore();

        if (glyphMode > 0 && caMap && caMap.activeCells) {
          // Glyph mode: draw separator characters instead of CA squares
          const GLYPHS = ['/', '+', '=', '?', ':', '|', '~', '*', '>', '<', '^', '#', '&'];
          // One Glyph mode uses the current logo separator
          const currentGlyph = SEPARATORS[sepIndex] || '/';
          ctx.save();
          ctx.scale(dpr, dpr);
          const cellSize = caMap.cellW || (innerW / (caMap.cells || 60));
          const fontSize = Math.max(6, Math.min(cellSize * 0.9, 16));
          ctx.font = `700 ${fontSize}px 'JetBrains Mono', monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#FFFFFF';

          caMap.activeCells.forEach(cell => {
            const glyph = glyphMode === 1 ? currentGlyph : GLYPHS[(cell.col * 7 + cell.row * 13) % GLYPHS.length];
            const cx = (cell.tl.x + cell.tr.x) / 2 + offsetX;
            const cy = (cell.tl.y + cell.bl.y) / 2 + offsetY;
            ctx.globalAlpha = 0.9;
            ctx.fillText(glyph, cx, cy);
          });
          ctx.restore();
        } else {
          // Normal mode: draw CA squares
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tmpCanvas, 0, 0, tmpCanvas.width, tmpCanvas.height, offsetX * dpr, offsetY * dpr, innerW * dpr, innerH * dpr);
        }

        document.getElementById('gen-seed-label').textContent = 'Seed: ' + currentSeed;
      };

      renderCanvas();

      // Custom dropdowns for aspect and density
      createDropdown(
        document.getElementById('gen-aspect-dropdown'),
        ASPECT_RATIOS.map(a => ({ label: a.label })),
        currentAspect,
        (idx) => { currentAspect = idx; renderCanvas(); }
      );
      createDropdown(
        document.getElementById('gen-density-dropdown'),
        DENSITY_OPTIONS.map(d => ({ label: d.label })),
        currentDensity,
        (idx) => { currentDensity = idx; renderCanvas(); }
      );
      document.getElementById('gen-regen').addEventListener('click', () => {
        currentSeed = Date.now();
        renderCanvas();
      });

      // Glyph mode toggles
      const glyphOneBtn = document.getElementById('gen-glyph-one');
      const glyphAllBtn = document.getElementById('gen-glyph-all');
      const updateGlyphBtns = () => {
        glyphOneBtn.textContent = glyphMode === 1 ? 'Squares' : 'One Glyph';
        glyphAllBtn.textContent = glyphMode === 2 ? 'Squares' : 'All Glyphs';
      };
      glyphOneBtn.addEventListener('click', () => {
        glyphMode = glyphMode === 1 ? 0 : 1;
        updateGlyphBtns();
        renderCanvas();
      });
      glyphAllBtn.addEventListener('click', () => {
        glyphMode = glyphMode === 2 ? 0 : 2;
        updateGlyphBtns();
        renderCanvas();
      });

      // Animate toggle - plays streak animations (snake, rain, lightning etc.) in the generator window
      let streakOverlay = null; // overlay canvas for streaks
      let streakCaMap = null;   // cell map from last render
      let streakAnimId = null;
      const STREAK_COLOR = '#D93B2D';
      const STREAK_STEP = 30;

      // Render CA and capture the cell map
      const renderCanvasWithMap = () => {
        const canvas = document.getElementById('gen-demo-canvas');
        const container = document.getElementById('gen-demo-container');
        if (!canvas || !container) return;

        const aspect = ASPECT_RATIOS[currentAspect];
        const ratio = aspect.w / aspect.h;
        const maxW = Math.min(800, window.innerWidth - 40);
        let cssW, cssH;
        if (ratio >= 1) { cssW = maxW; cssH = Math.round(maxW / ratio); }
        else { cssH = Math.min(maxW, 600); cssW = Math.round(cssH * ratio); }

        const margin = 0.1;
        const innerW = Math.round(cssW * (1 - margin * 2));
        const innerH = Math.round(cssH * (1 - margin * 2));
        const offX = Math.round(cssW * margin);
        const offY = Math.round(cssH * margin);

        const density = DENSITY_OPTIONS[currentDensity];
        const dpr = window.devicePixelRatio || 1;

        // Render CA with map
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = innerW * dpr;
        tmpCanvas.height = innerH * dpr;
        const tmpCtx = tmpCanvas.getContext('2d');
        tmpCtx.scale(dpr, dpr);
        streakCaMap = Gen.renderToCanvas(tmpCanvas, {
          cells: density.cells,
          seed: currentSeed,
          cssWidth: innerW,
          cssHeight: innerH,
          returnMap: true,
        });

        // Create/resize overlay canvas
        if (!streakOverlay) {
          streakOverlay = document.createElement('canvas');
          streakOverlay.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
          container.style.position = 'relative';
          container.appendChild(streakOverlay);
        }
        streakOverlay.width = cssW * dpr;
        streakOverlay.height = cssH * dpr;
        streakOverlay.style.width = cssW + 'px';
        streakOverlay.style.height = cssH + 'px';

        // Store offset for drawing streaks (cells are relative to inner area)
        streakCaMap._offX = offX;
        streakCaMap._offY = offY;
        streakCaMap._dpr = dpr;

        return { cssW, cssH };
      };

      // Draw a cell on the streak overlay
      const drawStreakCell = (ctx, cell, alpha, dpr, offX, offY) => {
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = STREAK_COLOR;
        ctx.beginPath();
        ctx.moveTo(cell.tl.x + offX, cell.tl.y + offY);
        ctx.lineTo(cell.tr.x + offX, cell.tr.y + offY);
        ctx.lineTo(cell.br.x + offX, cell.br.y + offY);
        ctx.lineTo(cell.bl.x + offX, cell.bl.y + offY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };

      // Trace path through active cells
      const traceStreakPath = (startCell, length) => {
        if (!streakCaMap) return [];
        const lookup = new Map();
        streakCaMap.activeCells.forEach(c => lookup.set(c.col + ',' + c.row, c));
        const path = [startCell];
        const visited = new Set([startCell.col + ',' + startCell.row]);
        let current = startCell;
        const dirs = [[0, 1], [1, 1], [-1, 1], [1, 0], [-1, 0]];
        for (let i = 0; i < length; i++) {
          const shuffled = [...dirs].sort(() => Math.random() - 0.5);
          let found = false;
          for (const [dx, dy] of shuffled) {
            const key = (current.col + dx) + ',' + (current.row + dy);
            if (!visited.has(key) && lookup.has(key)) {
              current = lookup.get(key);
              path.push(current);
              visited.add(key);
              found = true;
              break;
            }
          }
          if (!found) {
            const nearby = streakCaMap.activeCells.find(c => {
              const key = c.col + ',' + c.row;
              return !visited.has(key) && Math.abs(c.col - current.col) <= 8 && c.row > current.row && c.row <= current.row + 8;
            });
            if (nearby) { path.push(nearby); visited.add(nearby.col + ',' + nearby.row); current = nearby; }
            else break;
          }
        }
        return path;
      };

      // Streak mode runners
      const streakModes = [
        // Snake
        () => {
          const ac = streakCaMap.activeCells;
          const top = ac.filter(c => c.row <= 5);
          if (!top.length) return [];
          const start = top[Math.floor(Math.random() * top.length)];
          return [{ path: traceStreakPath(start, streakCaMap.generations), tailLen: 20 }];
        },
        // Multi-snake
        () => {
          const ac = streakCaMap.activeCells;
          const top = ac.filter(c => c.row <= 5);
          if (!top.length) return [];
          const trails = [];
          for (let n = 0; n < 3; n++) {
            const s = top[Math.floor(Math.random() * top.length)];
            trails.push({ path: traceStreakPath(s, streakCaMap.generations), tailLen: 12, delay: n * 20 });
          }
          return trails;
        },
        // Rain
        () => {
          const ac = streakCaMap.activeCells;
          const top = ac.filter(c => c.row <= 5);
          if (!top.length) return [];
          const drops = [];
          for (let n = 0; n < 6; n++) {
            const s = top[Math.floor(Math.random() * top.length)];
            drops.push({ path: traceStreakPath(s, streakCaMap.generations), tailLen: 6, delay: Math.floor(Math.random() * 40) });
          }
          return drops;
        },
        // Lightning
        () => {
          const ac = streakCaMap.activeCells;
          const top = ac.filter(c => c.row <= 3);
          if (!top.length) return [];
          const s = top[Math.floor(Math.random() * top.length)];
          const main = traceStreakPath(s, streakCaMap.generations);
          const trails = [{ path: main, tailLen: 18 }];
          // Branches
          for (let i = 15; i < main.length; i += 15 + Math.floor(Math.random() * 20)) {
            if (!main[i]) continue;
            const branch = traceStreakPath(main[i], 15);
            if (branch.length > 2) trails.push({ path: branch, tailLen: 6, delay: i });
          }
          return trails;
        },
        // Row sweep
        () => {
          const ac = streakCaMap.activeCells;
          const rows = new Map();
          ac.forEach(c => { if (!rows.has(c.row)) rows.set(c.row, []); rows.get(c.row).push(c); });
          const sorted = [...rows.keys()].sort((a, b) => a - b);
          return [{ type: 'rows', rows, sorted, tailRows: 6 }];
        },
      ];

      // Main animation loop for streaks in generator
      let activeGenStreaks = [];
      let genStreakStep = 0;
      let genStreakModeIdx = 0;
      let genStreakSpawnCounter = 0;

      const runGenStreaks = () => {
        if (!animating || !streakOverlay || !streakCaMap) return;
        const ctx = streakOverlay.getContext('2d');
        const { _dpr: dpr, _offX: offX, _offY: offY } = streakCaMap;

        ctx.clearRect(0, 0, streakOverlay.width, streakOverlay.height);

        // Draw active streaks
        for (let i = activeGenStreaks.length - 1; i >= 0; i--) {
          const s = activeGenStreaks[i];
          if (s._wait && s._wait > 0) { s._wait--; continue; }

          if (s.type === 'rows') {
            // Row sweep
            let done = s._step >= s.sorted.length + s.tailRows;
            if (done) { activeGenStreaks.splice(i, 1); continue; }
            for (let t = 0; t < s.tailRows; t++) {
              const ri = s._step - t;
              if (ri >= 0 && ri < s.sorted.length) {
                const alpha = (1 - t / s.tailRows) * 0.65;
                const cells = s.rows.get(s.sorted[ri]);
                if (cells) cells.forEach(c => drawStreakCell(ctx, c, alpha, dpr, offX, offY));
              }
            }
            if (!s._tick) s._tick = 0;
            s._tick++;
            if (s._tick % 2 === 0) { if (!s._step) s._step = 0; s._step++; }
          } else {
            // Path-based
            let done = s._step >= s.path.length + s.tailLen;
            if (done) { activeGenStreaks.splice(i, 1); continue; }
            for (let t = 0; t < s.tailLen; t++) {
              const idx = s._step - t;
              if (idx >= 0 && idx < s.path.length) {
                drawStreakCell(ctx, s.path[idx], (1 - t / s.tailLen) * 0.7, dpr, offX, offY);
              }
            }
            s._step++;
          }
        }

        // Spawn new streaks
        genStreakSpawnCounter++;
        if (genStreakSpawnCounter >= 50) {
          genStreakSpawnCounter = 0;
          genStreakModeIdx = (genStreakModeIdx + 1) % streakModes.length;
          const newTrails = streakModes[genStreakModeIdx]();
          newTrails.forEach(t => { t._step = 0; t._wait = t.delay || 0; });
          activeGenStreaks.push(...newTrails);
        }

        streakAnimId = setTimeout(runGenStreaks, STREAK_STEP);
      };

      document.getElementById('gen-animate').addEventListener('click', (e) => {
        animating = !animating;
        e.target.textContent = animating ? 'Stop' : 'Animate';
        if (animating) {
          // Render CA and capture cell map
          renderCanvasWithMap();
          renderCanvas();
          activeGenStreaks = [];
          genStreakSpawnCounter = 0;
          genStreakModeIdx = 0;
          // Spawn first set immediately
          const firstTrails = streakModes[0]();
          firstTrails.forEach(t => { t._step = 0; t._wait = t.delay || 0; });
          activeGenStreaks.push(...firstTrails);
          runGenStreaks();
        } else {
          if (streakAnimId) clearTimeout(streakAnimId);
          if (streakOverlay) {
            const ctx = streakOverlay.getContext('2d');
            ctx.clearRect(0, 0, streakOverlay.width, streakOverlay.height);
          }
        }
      });

      // Save PNG - 3000px on the short side
      document.getElementById('gen-save-png').addEventListener('click', () => {
        const canvas = document.getElementById('gen-demo-canvas');
        if (!canvas) return;

        // If animating, composite the main canvas + streak overlay into one image
        if (animating && streakOverlay) {
          const exportCanvas = document.createElement('canvas');
          exportCanvas.width = canvas.width;
          exportCanvas.height = canvas.height;
          const ectx = exportCanvas.getContext('2d');
          // Draw the CA base
          ectx.drawImage(canvas, 0, 0);
          // Draw the streak overlay on top
          ectx.drawImage(streakOverlay, 0, 0);

          const a = document.createElement('a');
          a.download = `interface-${currentSeed}-animated.png`;
          a.href = exportCanvas.toDataURL('image/png');
          a.click();
          return;
        }

        // Static export at 3000px short side
        const aspect = ASPECT_RATIOS[currentAspect];
        const ratio = aspect.w / aspect.h;
        const shortSide = 3000;
        let exportW, exportH;
        if (ratio >= 1) {
          exportH = shortSide;
          exportW = Math.round(shortSide * ratio);
        } else {
          exportW = shortSide;
          exportH = Math.round(shortSide / ratio);
        }

        const margin = 0.1;
        const innerW = Math.round(exportW * (1 - margin * 2));
        const innerH = Math.round(exportH * (1 - margin * 2));
        const offX = Math.round(exportW * margin);
        const offY = Math.round(exportH * margin);

        const density = DENSITY_OPTIONS[currentDensity];

        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = exportW;
        exportCanvas.height = exportH;
        const ectx = exportCanvas.getContext('2d');
        ectx.fillStyle = '#000000';
        ectx.fillRect(0, 0, exportW, exportH);

        if (glyphMode > 0) {
          const tmpCA = document.createElement('canvas');
          tmpCA.width = innerW;
          tmpCA.height = innerH;
          const caMap = Gen.renderToCanvas(tmpCA, {
            cells: density.cells,
            seed: currentSeed,
            returnMap: true,
          });
          if (caMap && caMap.activeCells) {
            const GLYPHS = ['/', '+', '=', '?', ':', '|', '~', '*', '>', '<', '^', '#', '&'];
            const currentGlyph = SEPARATORS[sepIndex] || '/';
            const cellSize = caMap.cellW || (innerW / (caMap.cells || 60));
            const scale = innerW > 0 ? (exportW * 0.8) / innerW : 1;
            const fontSize = Math.max(8, Math.round(cellSize * scale * 0.9));
            ectx.font = `700 ${fontSize}px 'JetBrains Mono', monospace`;
            ectx.textAlign = 'center';
            ectx.textBaseline = 'middle';
            ectx.fillStyle = '#FFFFFF';
            ectx.globalAlpha = 0.9;
            caMap.activeCells.forEach(cell => {
              const glyph = glyphMode === 1 ? currentGlyph : GLYPHS[(cell.col * 7 + cell.row * 13) % GLYPHS.length];
              const cx = ((cell.tl.x + cell.tr.x) / 2) * scale + offX;
              const cy = ((cell.tl.y + cell.bl.y) / 2) * scale + offY;
              ectx.fillText(glyph, cx, cy);
            });
          }
        } else {
          const tmpCA = document.createElement('canvas');
          tmpCA.width = innerW;
          tmpCA.height = innerH;
          Gen.renderToCanvas(tmpCA, {
            cells: density.cells,
            seed: currentSeed,
          });
          ectx.imageSmoothingEnabled = false;
          ectx.drawImage(tmpCA, 0, 0, tmpCA.width, tmpCA.height, offX, offY, innerW, innerH);
        }

        const a = document.createElement('a');
        a.download = `interface-${currentSeed}-${exportW}x${exportH}.png`;
        a.href = exportCanvas.toDataURL('image/png');
        a.click();
      });

      // Save SVG - 3000px on the short side
      document.getElementById('gen-save-svg').addEventListener('click', () => {
        const aspect = ASPECT_RATIOS[currentAspect];
        const ratio = aspect.w / aspect.h;
        const shortSide = 3000;
        let svgW, svgH;
        if (ratio >= 1) {
          svgH = shortSide;
          svgW = Math.round(shortSide * ratio);
        } else {
          svgW = shortSide;
          svgH = Math.round(shortSide / ratio);
        }
        const svg = Gen.exportSVG(svgW, svgH, { seed: currentSeed, cells: DENSITY_OPTIONS[currentDensity].cells });
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = `interface-${currentSeed}-${svgW}x${svgH}.svg`;
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);
      });
    };

    renderGenSection();
  }

  // --- Scroll reveals (same as landing) ---
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
});
