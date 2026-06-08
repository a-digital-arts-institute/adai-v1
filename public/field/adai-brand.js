// adai-brand.js — A(DAI) brand page (uses shared brand-state.js)

document.addEventListener('DOMContentLoaded', () => {
  const B = window.ADAI_BRAND;
  const SYSTEM = window.ADAI_SYSTEM;
  if (!B) return;
  let currentLogoAnimator = null;
  let generativeResizeTimer = null;
  const BRAND_ASSET_VERSION = '20260408l';
  const reserveLogoCharCount = B.LOGO_VARIANTS.reduce(
    (max, variant) => Math.max(max, Array.from(variant.text).length),
    0
  );
  const GENERATIVE_RATIO_PRESETS = [
    { key: '1:1', label: 'Square', width: 1, height: 1 },
    { key: '3:4', label: 'Portrait', width: 3, height: 4 },
    { key: '4:5', label: 'Poster', width: 4, height: 5 },
    { key: '16:9', label: 'Landscape', width: 16, height: 9 },
    { key: '2:3', label: 'Tall', width: 2, height: 3 },
    { key: '9:16', label: 'Story', width: 9, height: 16 },
    { key: '2:1', label: 'Banner', width: 2, height: 1 },
  ];
  const GENERATIVE_EXPORT_SIZES = [
    { value: '1200', label: 'Web preview / 1200px long edge' },
    { value: '1800', label: 'Small print / 1800px long edge' },
    { value: '2400', label: 'Medium print / 2400px long edge' },
    { value: '3000', label: 'Studio print / 3000px long edge' },
    { value: '4000', label: 'Archive / 4000px long edge' },
  ];
  const generativeState = {
    seed: typeof Gen !== 'undefined' ? Gen.seed : Date.now(),
    width: 16,
    height: 9,
    presetKey: '16:9',
    exportLongEdge: 3000,
    previewReady: false,
  };

  function computeAspectLabel() {
    const preset = GENERATIVE_RATIO_PRESETS.find((item) => item.key === generativeState.presetKey);
    if (preset) return `${preset.label} / ${generativeState.width}:${generativeState.height}`;
    return `Custom / ${generativeState.width}:${generativeState.height}`;
  }

  function computeExportDimensions() {
    const longEdge = generativeState.exportLongEdge;
    const { width, height } = generativeState;

    if (width >= height) {
      return {
        width: longEdge,
        height: Math.max(1, Math.round(longEdge * (height / width))),
      };
    }

    return {
      width: Math.max(1, Math.round(longEdge * (width / height))),
      height: longEdge,
    };
  }

  function computePreviewDimensions(longEdge = 1200) {
    const { width, height } = generativeState;

    if (width >= height) {
      return {
        width: longEdge,
        height: Math.max(1, Math.round(longEdge * (height / width))),
      };
    }

    return {
      width: Math.max(1, Math.round(longEdge * (width / height))),
      height: longEdge,
    };
  }

  function updateGenerativeMeta() {
    const metaAspect = document.getElementById('adai-gen-meta-aspect');
    const metaSize = document.getElementById('adai-gen-meta-size');
    const exportDims = computeExportDimensions();
    if (metaAspect) metaAspect.textContent = computeAspectLabel();
    if (metaSize) metaSize.textContent = `Export ${exportDims.width} x ${exportDims.height}`;
  }

  function getGenerativePreviewUrl() {
    const previewDims = computePreviewDimensions();
    const params = new URLSearchParams({
      v: BRAND_ASSET_VERSION,
      seed: String(generativeState.seed),
      width: String(previewDims.width),
      height: String(previewDims.height),
    });
    return `brand-generator-preview.html?${params.toString()}`;
  }

  function getGenerativePreviewFrame() {
    return document.getElementById('adai-home-gen-frame');
  }

  function getGenerativePreviewApi() {
    const frame = getGenerativePreviewFrame();
    return frame?.contentWindow?.BrandBackgroundGenerator || null;
  }

  function setGenerativeButtonsEnabled(enabled) {
    document.querySelectorAll('[data-gen-export]').forEach((button) => {
      button.disabled = !enabled;
    });
  }

  function attachGenerativePreviewLifecycle(frame) {
    if (!frame) return;

    generativeState.previewReady = false;
    setGenerativeButtonsEnabled(false);

    frame.addEventListener('load', () => {
      const frameWindow = frame.contentWindow;
      if (!frameWindow) return;

      const markReady = () => {
        generativeState.previewReady = true;
        setGenerativeButtonsEnabled(true);
        updateGenerativeMeta();
      };

      if (frameWindow.BrandBackgroundGenerator) {
        markReady();
        return;
      }

      const onReady = () => markReady();
      frameWindow.addEventListener('adai:brand-generator-ready', onReady, { once: true });
    }, { once: true });
  }

  function exportGenerativePNG() {
    const api = getGenerativePreviewApi();
    if (!api || typeof api.savePng !== 'function') return;
    api.savePng(generativeState.exportLongEdge, 'adai-field', {
      width: generativeState.width,
      height: generativeState.height,
    }).catch((error) => {
      console.error('ADAI PNG export failed', error);
    });
  }

  function exportGenerativeSVG() {
    const api = getGenerativePreviewApi();
    if (!api || typeof api.saveSvg !== 'function') return;
    api.saveSvg(generativeState.exportLongEdge, 'adai-field', {
      width: generativeState.width,
      height: generativeState.height,
    });
  }

  function bindGenerativeSection(genDemos) {
    genDemos.querySelectorAll('[data-ratio-key]').forEach((button) => {
      button.addEventListener('click', () => {
        const preset = GENERATIVE_RATIO_PRESETS.find((item) => item.key === button.dataset.ratioKey);
        if (!preset) return;
        generativeState.width = preset.width;
        generativeState.height = preset.height;
        generativeState.presetKey = preset.key;
        renderGenerativeSection();
      });
    });

    const customWidth = genDemos.querySelector('#adai-gen-custom-w');
    const customHeight = genDemos.querySelector('#adai-gen-custom-h');
    const applyCustom = () => {
      const nextWidth = Number.parseFloat(customWidth.value);
      const nextHeight = Number.parseFloat(customHeight.value);
      if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight) || nextWidth <= 0 || nextHeight <= 0) return;
      generativeState.width = nextWidth;
      generativeState.height = nextHeight;
      generativeState.presetKey = 'custom';
      renderGenerativeSection();
    };

    genDemos.querySelector('#adai-gen-apply-custom')?.addEventListener('click', applyCustom);
    [customWidth, customHeight].forEach((input) => {
      input?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          applyCustom();
        }
      });
    });

    genDemos.querySelector('#adai-gen-size')?.addEventListener('change', (event) => {
      generativeState.exportLongEdge = Number.parseInt(event.target.value, 10) || 3000;
      updateGenerativeMeta();
    });

    genDemos.querySelector('#adai-gen-refresh')?.addEventListener('click', () => {
      generativeState.seed = Date.now();
      renderGenerativeSection();
    });

    genDemos.querySelector('#adai-gen-save-png')?.addEventListener('click', exportGenerativePNG);
    genDemos.querySelector('#adai-gen-save-svg')?.addEventListener('click', exportGenerativeSVG);
    attachGenerativePreviewLifecycle(genDemos.querySelector('#adai-home-gen-frame'));
    updateGenerativeMeta();
  }

  function renderGenerativeSection() {
    const genDemos = document.getElementById('gen-demos');
    if (!genDemos) return;
    const previewUrl = getGenerativePreviewUrl();
    const exportDims = computeExportDimensions();
    generativeState.previewReady = false;

    genDemos.innerHTML = `
      <div class="gen-tool">
        <p class="gen-tool__intro">This uses the same topological field engine as the homepage background. It opens in a wide 16:9 field by default, then lets you move through the preset ratios or enter your own before exporting the live composition as PNG or SVG.</p>

        <div class="gen-tool__layout">
          <div class="gen-tool__preview-stage">
            <div class="gen-tool__preview-shell" id="adai-gen-preview-shell" style="--gen-preview-aspect:${generativeState.width} / ${generativeState.height};">
              <iframe
                id="adai-home-gen-frame"
                class="gen-tool__preview-frame"
                title="Homepage topological field preview"
                src="${previewUrl}"
                loading="eager"
              ></iframe>
            </div>
            <div class="gen-tool__meta">
              <span id="adai-gen-meta-aspect">${computeAspectLabel()}</span>
              <span id="adai-gen-meta-size">Export ${exportDims.width} x ${exportDims.height}</span>
            </div>
          </div>

          <div class="gen-tool__controls">
            <div class="gen-tool__panel gen-tool__panel--ratios">
              <div class="type-scale__label">Aspect ratio</div>
              <div class="gen-tool__ratio-grid">
                ${GENERATIVE_RATIO_PRESETS.map((preset) => `
                  <button
                    class="btn gen-tool__ratio-btn${generativeState.presetKey === preset.key ? ' is-active' : ''}"
                    data-ratio-key="${preset.key}"
                  >${preset.label} ${preset.width}:${preset.height}</button>
                `).join('')}
              </div>
              <div class="gen-tool__custom">
                <input id="adai-gen-custom-w" type="number" min="0.25" step="0.25" value="${generativeState.width}">
                <span>:</span>
                <input id="adai-gen-custom-h" type="number" min="0.25" step="0.25" value="${generativeState.height}">
                <button class="btn" id="adai-gen-apply-custom">Apply custom</button>
              </div>
            </div>

            <div class="gen-tool__panel gen-tool__panel--export">
              <div class="type-scale__label">Export size</div>
              <select class="gen-tool__select" id="adai-gen-size">
                ${GENERATIVE_EXPORT_SIZES.map((size) => `
                  <option value="${size.value}"${Number(size.value) === generativeState.exportLongEdge ? ' selected' : ''}>${size.label}</option>
                `).join('')}
              </select>
              <div class="gen-tool__actions">
                <button class="btn" id="adai-gen-refresh">New field</button>
                <button class="btn" id="adai-gen-save-png" data-gen-export disabled>Save PNG</button>
                <button class="btn" id="adai-gen-save-svg" data-gen-export disabled>Save SVG</button>
              </div>
              <div class="gen-tool__note">PNG and SVG exports both use the selected long-edge size and the current aspect ratio from the homepage topological field engine.</div>
            </div>
          </div>
        </div>
      </div>
    `;

    bindGenerativeSection(genDemos);
  }

  function mountAnimatedLogotype(root, options = {}) {
    const { listenForBrandChange = false, reserveCharCount = null } = options;
    const textEl = root?.querySelector('#logotype-text, [data-logotype-text], .live-logotype__text');
    if (!root || !textEl) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const CURSOR_CASES = ['0', '1', '2', '3', '4', '5', '6'];
    const TYPE_DELAY = 150;
    const DELETE_SELECT_DELAY = 125;
    const DELETE_SETTLE_DELAY = 70;
    const HOLD_FULL_DELAY = 900;
    const HOLD_EMPTY_DELAY = 425;
    const INITIAL_DELAY = 320;
    let timerId = null;
    let word = 'adai';
    let index = 0;
    let deleting = false;
    let selectingDelete = false;
    let cursorCaseIndex = 0;
    let brandChangeHandler = null;

    const esc = (value) => value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    function getBrandWord() {
      return window.ADAI_BRAND?.currentLogo?.text || 'adai';
    }

    function applyCursorCase() {
      root.dataset.cursorCase = CURSOR_CASES[cursorCaseIndex];
    }

    function advanceCursorCase() {
      cursorCaseIndex = (cursorCaseIndex + 1) % CURSOR_CASES.length;
      applyCursorCase();
    }

    function applyBrandStyle() {
      const brand = window.ADAI_BRAND;
      const logo = brand?.currentLogo;
      const font = brand?.currentFont;
      word = getBrandWord();
      applyCursorCase();
      root.setAttribute('aria-label', word);
      const charCount = Math.max(Array.from(word).length, reserveCharCount || 0, 6);
      root.style.setProperty('--logotype-char-count', String(charCount));

      if (!logo || !font) return;

      root.style.fontFamily = font.family;
      root.style.fontWeight = String(logo.weight);
      root.style.letterSpacing = logo.tracking;
    }

    function render() {
      const visibleChars = Array.from(word).slice(0, index);
      textEl.innerHTML = visibleChars.map((char, charIndex) => {
        const selected = deleting && selectingDelete && charIndex === index - 1;
        return `<span class="logotype__char${selected ? ' is-selected' : ''}">${esc(char)}</span>`;
      }).join('');
      root.classList.toggle('logotype--deleting', deleting && selectingDelete);
    }

    function queue(next, delay) {
      window.clearTimeout(timerId);
      timerId = window.setTimeout(next, delay);
    }

    function beginTyping() {
      deleting = false;
      selectingDelete = false;
      if (index >= Array.from(word).length) {
        queue(beginDeleteSelection, HOLD_FULL_DELAY);
        return;
      }

      index += 1;
      render();
      queue(beginTyping, TYPE_DELAY);
    }

    function beginDeleteSelection() {
      if (index <= 0) {
        deleting = false;
        selectingDelete = false;
        render();
        queue(beginTyping, HOLD_EMPTY_DELAY);
        return;
      }

      deleting = true;
      selectingDelete = true;
      render();
      queue(removeSelectedCharacter, DELETE_SELECT_DELAY);
    }

    function removeSelectedCharacter() {
      index = Math.max(0, index - 1);
      deleting = false;
      selectingDelete = false;
      render();

      if (index <= 0) {
        advanceCursorCase();
        queue(beginTyping, HOLD_EMPTY_DELAY);
        return;
      }

      queue(beginDeleteSelection, DELETE_SETTLE_DELAY);
    }

    function restart() {
      window.clearTimeout(timerId);
      applyBrandStyle();
      index = 0;
      deleting = false;
      selectingDelete = false;
      render();
      if (document.fonts && typeof document.fonts.load === 'function' && window.ADAI_BRAND?.currentFont) {
        document.fonts.load(`400 18px ${window.ADAI_BRAND.currentFont.family}`)
          .then(() => render())
          .catch(() => {});
      }
      if (!reducedMotion.matches) queue(beginTyping, INITIAL_DELAY);
    }

    function destroy() {
      window.clearTimeout(timerId);
      if (brandChangeHandler) window.removeEventListener('adai:brand-change', brandChangeHandler);
    }

    applyBrandStyle();
    if (listenForBrandChange) {
      brandChangeHandler = restart;
      window.addEventListener('adai:brand-change', brandChangeHandler);
    }

    if (reducedMotion.matches) {
      index = Array.from(word).length;
      render();
      return { destroy, restart };
    }
    restart();
    return { destroy, restart };
  }

  function startLogotypeTypewriter() {
    return mountAnimatedLogotype(document.getElementById('logotype'), {
      listenForBrandChange: true,
      reserveCharCount: reserveLogoCharCount
    });
  }

  function startFooterLogotype() {
    return mountAnimatedLogotype(document.getElementById('adai-footer-logo'), {
      listenForBrandChange: true,
      reserveCharCount: reserveLogoCharCount
    });
  }

  // ---- Init generative background ----
  const bgCanvas = document.getElementById('gen-bg');
  if (bgCanvas && typeof Gen !== 'undefined') Gen.init(bgCanvas);

  // ---- Section dividers ----
  // Mathematical sequences decide which dots are HOLLOW (sparse — always majority filled)
  const sequences = [
    (i) => [0,1,2,3,5,8,13,21,34,55,89].includes(i),      // fibonacci positions (~17% hollow)
    (i) => { const s = Math.sqrt(i); return s === Math.floor(s); }, // perfect squares (~15% hollow)
    (i) => [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53].includes(i), // primes (~30% hollow)
    (i) => i > 0 && (i & (i - 1)) === 0,                  // powers of 2: 1,2,4,8,16,32 (~11% hollow)
    (i) => i > 0 && i % 7 === 0,                           // multiples of 7 (~13% hollow)
    (i) => i % 5 === 0,                                    // multiples of 5 (~20% hollow)
    (i) => { const n = Math.round((-1 + Math.sqrt(1 + 8*i)) / 2); return n*(n+1)/2 === i && i > 0; }, // triangular numbers: 1,3,6,10,15,21,28,36,45 (~17% hollow)
    (i) => i > 0 && i % 11 === 0,                          // multiples of 11 (~9% hollow)
  ];

  document.querySelectorAll('.section__heading').forEach((heading, idx) => {
    const seq = sequences[idx % sequences.length];
    const divEl = document.createElement('div');
    divEl.className = 'gen-divider-dots';
    divEl.style.cssText = 'display:flex;gap:3px;overflow:hidden;margin-top:6px;';
    const count = Math.ceil(window.innerWidth / 8);
    for (let i = 0; i < count; i++) {
      const isHollow = seq(i);
      const dot = document.createElement('span');
      dot.style.cssText = `display:inline-block;width:4px;height:4px;min-width:4px;border-radius:50;${isHollow ? 'border:1px solid var(--brand-color,#D93B2D);background:transparent;' : 'background:var(--brand-color,#D93B2D);'}border-radius:50%;`;
      divEl.appendChild(dot);
    }
    heading.appendChild(divEl);
  });

  const esc = (c) => c.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const DEFAULT_SIGNAL_COLOR = '#D93B2D';

  function getSignalColor() {
    return B.currentAccent?.hex || DEFAULT_SIGNAL_COLOR;
  }

  function glyphName(glyph) {
    switch (glyph) {
      case '(': case ')': return 'parenthesis';
      case '{': case '}': return 'brace';
      case '[': case ']': return 'bracket';
      case '|': return 'bar';
      case '/': return 'slash';
      case '~': return 'tilde';
      case '>': case '<': return 'chevron';
      case '.': return 'dot';
      case ':': return 'colon';
      default: return 'signal glyph';
    }
  }

  function parseTrackingEm(tracking) {
    return Number.parseFloat(String(tracking).replace('em', '')) || 0.08;
  }

  function analyzeLogoGeometry(logo, font) {
    const text = logo.text;
    const signalColor = getSignalColor();
    const trackingEm = parseTrackingEm(logo.tracking);
    const letterCount = (text.match(/[A-Za-z]/g) || []).length;
    const distributedMatch = /^[A-Za-z](\.[A-Za-z])+$/.test(text);
    const bridgeMatch = text.match(/^([A-Za-z])(::)([A-Za-z]+)$/);
    const enclosureMatch = distributedMatch ? null : text.match(/^([A-Za-z])([^\w\s])([A-Za-z]+)([^\w\s])$/);

    const baseRows = [
      ['Active mark', text],
      ['Typeface', `${font.name} / ${logo.weight}`],
      ['Clear space', '1x unit on all sides'],
      ['Minimum size', '11px (below this, collapse to shorthand/favicon)'],
    ];

    if (distributedMatch) {
      const chars = [...text];
      const separators = [];
      const segments = chars.map((ch, index) => {
        if (ch === '.') separators.push(index);
        return {
          text: ch,
          fill: ch === '.' ? signalColor : 'var(--color-text)',
        };
      });

      return {
        text,
        trackingEm,
        gridUnits: 11,
        segments,
        highlights: separators.map((segmentIndex, index) => ({
          segmentIndices: [segmentIndex],
          label: index === 0 ? 'signal' : '',
        })),
        rows: [
          ...baseRows,
          ['System', 'Distributed punctuation'],
          ['Grid', '11 x 6 units (landscape)'],
          ['Signal glyphs', `${separators.length} dot separators distributed between all four letters`],
          ['Tracking', logo.tracking],
          ['Case logic', 'Lowercase node rhythm with separators carrying the signal'],
          ['Signal behavior', 'Rhythm comes from repeated punctuation rather than enclosure'],
        ],
      };
    }

    if (bridgeMatch) {
      const [, lead, bridge, core] = bridgeMatch;
      return {
        text,
        trackingEm,
        gridUnits: 10,
        segments: [
          { text: lead, fill: 'var(--color-text)' },
          { text: bridge, fill: signalColor },
          { text: core, fill: 'var(--color-text)' },
        ],
        highlights: [{ segmentIndices: [1], label: 'bridge' }],
        rows: [
          ...baseRows,
          ['System', 'Bridge token'],
          ['Grid', '10 x 6 units (landscape)'],
          ['Signal glyphs', 'Double colon bridge between lead node and institute core'],
          ['Tracking', logo.tracking],
          ['Case logic', text === text.toUpperCase() ? 'Uppercase system mode' : 'Lowercase default mode'],
          ['Signal behavior', 'The bridge token carries the signal while the letters remain neutral'],
        ],
      };
    }

    if (enclosureMatch) {
      const [, lead, open, core, close] = enclosureMatch;
      const glyph = glyphName(open) === glyphName(close)
        ? `${glyphName(open)} pair`
        : `${glyphName(open)} / ${glyphName(close)} pair`;

      return {
        text,
        trackingEm,
        gridUnits: text.length > 5 ? 10 : 9,
        segments: [
          { text: lead, fill: 'var(--color-text)' },
          { text: open, fill: signalColor },
          { text: core, fill: signalColor },
          { text: close, fill: signalColor },
        ],
        highlights: [
          { segmentIndices: [1], label: 'signal' },
          { segmentIndices: [3], label: '' },
        ],
        rows: [
          ...baseRows,
          ['System', 'Enclosed core'],
          ['Grid', `${text.length > 5 ? 10 : 9} x 6 units (landscape)`],
          ['Signal glyphs', `${glyph} wrapped around the institute core`],
          ['Tracking', logo.tracking],
          ['Case logic', text === text.toUpperCase() ? 'Uppercase system mode' : 'Lowercase default mode'],
          ['Signal behavior', 'The enclosure and enclosed core hold the live signal channel'],
        ],
      };
    }

    return {
      text,
      trackingEm,
      gridUnits: Math.max(9, Math.min(11, letterCount + 5)),
      segments: [{ text, fill: 'var(--color-text)' }],
      highlights: [],
      rows: [
        ...baseRows,
        ['System', 'Wordmark'],
        ['Grid', `${Math.max(9, Math.min(11, letterCount + 5))} x 6 units (landscape)`],
        ['Signal glyphs', 'No isolated signal token in this configuration'],
        ['Tracking', logo.tracking],
        ['Case logic', text === text.toUpperCase() ? 'Uppercase system mode' : 'Lowercase default mode'],
        ['Signal behavior', 'Weight and spacing do the work without additional punctuation'],
      ],
    };
  }

  function buildGeometrySvg(geometry, font) {
    const svgW = 700;
    const svgH = 400;
    const outer = { x: 50, y: 50, w: 600, h: 300 };
    const inner = { x: 110, y: 110, w: 480, h: 180 };
    const centerX = 350;
    const textY = 235;
    const fontSize = geometry.text.length >= 7 ? 64 : geometry.text.length >= 6 ? 68 : 72;
    const trackingPx = fontSize * geometry.trackingEm;
    const boxY = textY - fontSize * 0.9;
    const boxH = fontSize * 1.15;

    const tspans = geometry.segments.map((segment, index) => (
      `<tspan data-geo-segment="${index}" style="fill:${segment.fill}">${esc(segment.text)}</tspan>`
    )).join('');

    const topRuler = Array.from({ length: geometry.gridUnits + 1 }, (_, i) => {
      const x = outer.x + (outer.w / geometry.gridUnits) * i;
      return `<text x="${x.toFixed(1)}" y="42">${i}</text>`;
    }).join('');

    const leftRuler = Array.from({ length: 6 }, (_, i) => {
      const y = outer.y + (outer.h / 5) * i + 4;
      return `<text x="44" y="${y.toFixed(1)}">${i}</text>`;
    }).join('');

    return `
      <svg viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;" data-geo-box-y="${boxY.toFixed(1)}" data-geo-box-h="${boxH.toFixed(1)}" data-geo-font-size="${fontSize}">
        <rect width="${svgW}" height="${svgH}" style="fill:var(--color-surface, #0A0A0A)"/>

        <g style="stroke:var(--color-border, #222);stroke-width:0.5">
          <line x1="${outer.x}" y1="${outer.y}" x2="${outer.x + outer.w}" y2="${outer.y}"/>
          <line x1="${outer.x}" y1="${inner.y}" x2="${outer.x + outer.w}" y2="${inner.y}"/>
          <line x1="${outer.x}" y1="${inner.y + inner.h}" x2="${outer.x + outer.w}" y2="${inner.y + inner.h}"/>
          <line x1="${outer.x}" y1="${outer.y + outer.h}" x2="${outer.x + outer.w}" y2="${outer.y + outer.h}"/>
          <line x1="${outer.x}" y1="${outer.y}" x2="${outer.x}" y2="${outer.y + outer.h}"/>
          <line x1="${outer.x + outer.w}" y1="${outer.y}" x2="${outer.x + outer.w}" y2="${outer.y + outer.h}"/>
        </g>

        <rect x="${outer.x}" y="${outer.y}" width="${outer.w}" height="${outer.h}" fill="none" style="stroke:var(--brand-color, #D93B2D);stroke-width:0.8;stroke-dasharray:4 4;opacity:0.5"/>
        <rect x="${inner.x}" y="${inner.y}" width="${inner.w}" height="${inner.h}" fill="none" style="stroke:var(--color-border, #333);stroke-width:0.5;stroke-dasharray:2 2"/>

        <line x1="${inner.x}" y1="175" x2="${inner.x + inner.w}" y2="175" style="stroke:var(--color-text-muted, #666);stroke-width:0.5;stroke-dasharray:1 3;opacity:0.45"/>
        <line x1="${inner.x}" y1="245" x2="${inner.x + inner.w}" y2="245" style="stroke:var(--color-text-muted, #666);stroke-width:0.5;stroke-dasharray:1 3;opacity:0.45"/>
        <text x="${inner.x + inner.w + 10}" y="178" font-family="${font.family}" font-size="8" style="fill:var(--color-text-muted, #666);letter-spacing:0.08em;">cap</text>
        <text x="${inner.x + inner.w + 10}" y="248" font-family="${font.family}" font-size="8" style="fill:var(--color-text-muted, #666);letter-spacing:0.08em;">base</text>

        <line x1="${centerX}" y1="130" x2="${centerX}" y2="270" style="stroke:var(--color-border, #333);stroke-width:0.5;stroke-dasharray:2 4"/>

        <text x="${centerX}" y="${textY}" text-anchor="middle" font-family="${font.family}" font-size="${fontSize}" font-weight="${geometry.weight || 400}" letter-spacing="${trackingPx.toFixed(2)}">
          ${tspans}
        </text>

        <g data-geo-highlights></g>

        <line x1="30" y1="${outer.y}" x2="30" y2="${inner.y}" style="stroke:var(--brand-color, #D93B2D);stroke-width:0.8"/>
        <line x1="25" y1="${outer.y}" x2="35" y2="${outer.y}" style="stroke:var(--brand-color, #D93B2D);stroke-width:0.8"/>
        <line x1="25" y1="${inner.y}" x2="35" y2="${inner.y}" style="stroke:var(--brand-color, #D93B2D);stroke-width:0.8"/>
        <text x="18" y="84" text-anchor="middle" font-family="${font.family}" font-size="8" style="fill:var(--brand-color, #D93B2D);letter-spacing:0.08em;" transform="rotate(-90, 18, 84)">1x clear</text>

        <line x1="${outer.x}" y1="370" x2="${outer.x + outer.w}" y2="370" style="stroke:var(--brand-color, #D93B2D);stroke-width:0.8"/>
        <line x1="${outer.x}" y1="365" x2="${outer.x}" y2="375" style="stroke:var(--brand-color, #D93B2D);stroke-width:0.8"/>
        <line x1="${outer.x + outer.w}" y1="365" x2="${outer.x + outer.w}" y2="375" style="stroke:var(--brand-color, #D93B2D);stroke-width:0.8"/>
        <text x="${outer.x + outer.w + 10}" y="373" font-family="${font.family}" font-size="9" style="fill:var(--brand-color, #D93B2D);letter-spacing:0.08em;">${geometry.gridUnits}x</text>

        <line x1="670" y1="${outer.y}" x2="670" y2="${outer.y + outer.h}" style="stroke:var(--brand-color, #D93B2D);stroke-width:0.8"/>
        <line x1="665" y1="${outer.y}" x2="675" y2="${outer.y}" style="stroke:var(--brand-color, #D93B2D);stroke-width:0.8"/>
        <line x1="665" y1="${outer.y + outer.h}" x2="675" y2="${outer.y + outer.h}" style="stroke:var(--brand-color, #D93B2D);stroke-width:0.8"/>
        <text x="685" y="204" font-family="${font.family}" font-size="9" style="fill:var(--brand-color, #D93B2D);letter-spacing:0.08em;">6x</text>

        <g font-family="${font.family}" font-size="8" style="fill:var(--color-text-muted, #555)" text-anchor="middle">
          ${topRuler}
        </g>
        <g font-family="${font.family}" font-size="8" style="fill:var(--color-text-muted, #555)" text-anchor="end">
          ${leftRuler}
        </g>
      </svg>
    `;
  }

  function positionGeometryHighlights(svg, geometry, font) {
    if (!svg) return;

    const signalColor = getSignalColor();
    const boxY = Number.parseFloat(svg.getAttribute('data-geo-box-y') || '170');
    const boxH = Number.parseFloat(svg.getAttribute('data-geo-box-h') || '80');
    const fontSize = Number.parseFloat(svg.getAttribute('data-geo-font-size') || '72');
    const highlightLayer = svg.querySelector('[data-geo-highlights]');
    const segmentNodes = [...svg.querySelectorAll('[data-geo-segment]')];
    if (!highlightLayer || !segmentNodes.length) return;

    highlightLayer.innerHTML = geometry.highlights.map((highlight) => {
      const boxes = highlight.segmentIndices
        .map((index) => segmentNodes[index])
        .filter(Boolean)
        .map((node) => node.getBBox());

      if (!boxes.length) return '';

      const minX = Math.min(...boxes.map((box) => box.x));
      const maxX = Math.max(...boxes.map((box) => box.x + box.width));
      const centerX = (minX + maxX) / 2;
      const boxWidth = Math.max(28, (maxX - minX) + fontSize * 0.18);
      const rectX = centerX - boxWidth / 2;
      const label = highlight.label ? `
        <line x1="${centerX.toFixed(1)}" y1="${(boxY + boxH + 14).toFixed(1)}" x2="${centerX.toFixed(1)}" y2="${(boxY + boxH + 26).toFixed(1)}" style="stroke:${signalColor};stroke-width:0.8"/>
        <text x="${centerX.toFixed(1)}" y="${(boxY + boxH + 42).toFixed(1)}" text-anchor="middle" font-family="${font.family}" font-size="9" fill="${signalColor}" style="letter-spacing:0.08em;text-transform:uppercase;">${esc(highlight.label)}</text>
      ` : '';

      return `
        <rect x="${rectX.toFixed(1)}" y="${boxY.toFixed(1)}" width="${boxWidth.toFixed(1)}" height="${boxH.toFixed(1)}" fill="none" stroke="${signalColor}" stroke-width="1" stroke-dasharray="3,3" opacity="0.72"/>
        ${label}
      `;
    }).join('');
  }

  function renderGeometrySection() {
    const geometryDemo = document.getElementById('logo-geometry-demo');
    const geometrySpecs = document.getElementById('logo-geometry-specs');
    if (!geometryDemo || !geometrySpecs) return;

    const geometry = analyzeLogoGeometry(B.currentLogo, B.currentFont);
    geometry.weight = B.currentLogo.weight;

    geometryDemo.innerHTML = buildGeometrySvg(geometry, B.currentFont);
    const svg = geometryDemo.querySelector('svg');
    const positionHighlights = () => {
      requestAnimationFrame(() => {
        positionGeometryHighlights(svg, geometry, B.currentFont);
      });
    };

    positionHighlights();
    if (document.fonts && typeof document.fonts.load === 'function' && svg) {
      const fontSize = svg.getAttribute('data-geo-font-size') || '72';
      document.fonts.load(`${geometry.weight || 400} ${fontSize}px ${B.currentFont.family}`)
        .then(positionHighlights)
        .catch(() => {});
    }

    geometrySpecs.innerHTML = geometry.rows.map(([label, value]) => (
      `<tr><td>${esc(label)}</td><td>${esc(value)}</td></tr>`
    )).join('');
  }

  function renderHotkeyLabels(labels) {
    return labels.map((label) => `<kbd>${esc(label)}</kbd>`).join(' ');
  }

  function renderControlsSection() {
    const rows = document.getElementById('interactive-controls-rows');
    if (!rows || !window.ADAI_SYSTEM?.getInteractiveControls) return;

    rows.innerHTML = window.ADAI_SYSTEM.getInteractiveControls().map((control) => `
      <tr>
        <td>${renderHotkeyLabels(control.labels || [])}</td>
        <td>${esc(control.action)}</td>
        <td>${esc(control.options)}</td>
      </tr>
    `).join('');
  }

  // ---- Render logo section ----
  function renderLogoSection() {
    const logoDemos = document.getElementById('logo-demos');
    if (!logoDemos) return;
    if (currentLogoAnimator) {
      currentLogoAnimator.destroy();
      currentLogoAnimator = null;
    }

    const v = B.currentLogo;
    const f = B.currentFont;

    const allVariants = B.LOGO_VARIANTS.map((lv, i) => {
      const active = i === B.logoIdx ? 'opacity:1;' : 'opacity:0.4;';
      return `<span style="font-size:1.8rem;font-family:${f.family};font-weight:${lv.weight};letter-spacing:${lv.tracking};cursor:pointer;${active}transition:opacity 0.3s;" data-logo-idx="${i}">${esc(lv.text)}</span>`;
    }).join('');

    logoDemos.innerHTML = `
      <div style="margin-bottom: var(--space-xl);">
        <div class="type-scale__label" style="margin-bottom: var(--space-md);">Generative - Cycle with [L]</div>
        <div class="logo-display" style="margin-bottom: var(--space-lg);align-items:flex-start;">
          <div>
            <div class="type-scale__label">Current</div>
            <div class="logo-display__live-stage">
              <div class="logo-display__monogram live-logotype logo-display__live-reserve" aria-hidden="true" style="font-family:${f.family};font-weight:${v.weight};letter-spacing:${v.tracking};">
                <span class="live-logotype__text">${esc(v.text)}</span><span class="logotype__cursor" aria-hidden="true"></span>
              </div>
              <div class="logo-display__monogram live-logotype" data-live-logotype aria-label="${esc(v.text)}" style="font-family:${f.family};font-weight:${v.weight};letter-spacing:${v.tracking};">
                <span class="live-logotype__text" data-logotype-text></span><span class="logotype__cursor" aria-hidden="true"></span>
              </div>
            </div>
          </div>
          <div>
            <div class="type-scale__label">Wordmark</div>
            <div class="logo-display__wordmark" style="font-family:${f.family};font-weight:300;">a digital arts institute</div>
          </div>
        </div>
        <div class="type-scale__label">All logo variants</div>
        <div class="logo-display" style="align-items:center;gap:var(--space-md);flex-wrap:wrap;margin-top:var(--space-sm);">
          ${allVariants}
        </div>
      </div>

      <div>
        <div class="type-scale__label" style="margin-bottom: var(--space-md);">Static - For print, decks, and non-web use</div>
        <div class="logo-display" style="margin-bottom: var(--space-lg);">
          <div>
            <div class="type-scale__label">Monogram</div>
            <div class="logo-display__monogram" style="font-family:${f.family};font-weight:${v.weight};letter-spacing:${v.tracking};">${esc(v.text)}</div>
          </div>
          <div>
            <div class="type-scale__label">Wordmark</div>
            <div class="logo-display__wordmark" style="font-family:${f.family};font-weight:300;">a digital arts institute</div>
          </div>
        </div>
        <div class="type-scale__label">Sizes</div>
        <div class="logo-display" style="align-items:center;gap:var(--space-md);margin-top:var(--space-sm);">
          <span style="font-size:3rem;font-family:${f.family};font-weight:${v.weight};letter-spacing:${v.tracking};">${esc(v.text)}</span>
          <span style="font-size:2rem;font-family:${f.family};font-weight:${v.weight};letter-spacing:${v.tracking};">${esc(v.text)}</span>
          <span style="font-size:1.5rem;font-family:${f.family};font-weight:${v.weight};letter-spacing:${v.tracking};">${esc(v.text)}</span>
          <span style="font-size:1rem;font-family:${f.family};font-weight:${v.weight};letter-spacing:${v.tracking};">${esc(v.text)}</span>
          <span style="font-size:0.75rem;font-family:${f.family};font-weight:${v.weight};letter-spacing:${v.tracking};">${esc(v.text)}</span>
        </div>
        <div style="margin-top: var(--space-lg);">
          <div class="type-scale__label">Clear space = height of the parentheses</div>
          <div style="display:inline-block;border:1px dashed var(--color-text-muted);padding:2rem;">
            <span style="font-size:4rem;font-family:${f.family};font-weight:${v.weight};letter-spacing:${v.tracking};">${esc(v.text)}</span>
          </div>
        </div>
      </div>
    `;

    logoDemos.querySelectorAll('[data-logo-idx]').forEach(el => {
      el.addEventListener('click', () => {
        B.setLogo(parseInt(el.dataset.logoIdx));
      });
    });

    currentLogoAnimator = mountAnimatedLogotype(
      logoDemos.querySelector('[data-live-logotype]'),
      {
        reserveCharCount: reserveLogoCharCount
      }
    );
  }

  // ---- Render color section ----
  function getReadableTextColor(hex) {
    const value = String(hex || '').replace('#', '');
    const normalized = value.length === 3
      ? value.split('').map((char) => char + char).join('')
      : value;
    const int = parseInt(normalized, 16);
    if (!Number.isFinite(int)) return '#F2F2F2';

    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.58 ? '#0A0A0A' : '#F2F2F2';
  }

  function renderColorSection() {
    const colorDemos = document.getElementById('color-demos');
    if (!colorDemos) return;

    const current = B.currentAccent;
    const neutralBase = [
      { name: 'Field Black', hex: '#000000', note: 'Primary ground for depth and contrast.' },
      { name: 'Surface Black', hex: '#0A0A0A', note: 'Cards, modules, and restrained structure.' },
      { name: 'Paper White', hex: '#F2F2F2', note: 'Text, type specimens, and luminous edges.' },
      { name: 'Mute Grey', hex: '#888888', note: 'Secondary information and quiet metadata.' },
    ];
    const colorIdeas = {
      Vermillion: 'Public-facing, catalytic, and immediate.',
      Rust: 'Warmer, older, and slightly archival.',
      Amber: 'Optimistic signal for open calls and prompts.',
      Ochre: 'Scholarly warmth with a museum-catalog feel.',
      Olive: 'Institutional, ecological, and quietly serious.',
      Jade: 'Technical but human, good for systems language.',
      'Deep Teal': 'Dense, cerebral, and more nocturnal.',
      Cobalt: 'Cool, infrastructural, and graph-forward.',
      Oxblood: 'Most solemn and editorial of the cycle.',
    };

    colorDemos.innerHTML = `
      <div style="display:grid;gap:var(--space-lg);">
        <div class="grid grid--2" style="align-items:start;gap:var(--space-lg);">
          <div class="card" style="padding:var(--space-lg);">
            <div class="type-scale__label">System rule</div>
            <p style="font-family:var(--font-body);font-size:var(--fs-sm);color:var(--color-text-muted);max-width:58ch;line-height:1.8;">
              A(DAI) stays monochrome plus one live signal color. Black and white carry structure; one accent carries energy. Press <kbd>z</kbd> to move the signal across the full palette, and that same color should govern logo punctuation, geometry marks, active selections, dividers, and interface emphasis.
            </p>
          </div>
          <div class="card" style="padding:var(--space-lg);border-color:var(--brand-color);">
            <div class="type-scale__label">Current live signal</div>
            <div style="display:grid;grid-template-columns:92px 1fr;gap:var(--space-md);align-items:center;">
              <div style="width:92px;height:92px;border:1px solid rgba(255,255,255,0.14);background:${current.hex};"></div>
              <div>
                <div style="font-size:var(--fs-lg);line-height:1;font-weight:500;color:var(--color-text);">${esc(current.name)}</div>
                <div class="type-scale__label" style="margin-top:8px;color:var(--brand-color);">${esc(current.hex)} / active now</div>
                <div style="margin-top:10px;font-family:var(--font-body);font-size:var(--fs-xs);color:var(--color-text-muted);line-height:1.7;">
                  ${esc(colorIdeas[current.name] || 'A restrained signal tone for the field and interface.')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div class="type-scale__label" style="margin-bottom:var(--space-sm);">Signal palette / all colors cycled with [z]</div>
          <div class="swatch-grid swatch-grid--palette">
            ${B.ACCENT_COLORS.map((color, index) => {
              const isActive = index === B.accentIdx;
              const textColor = getReadableTextColor(color.hex);
              const borderColor = isActive ? 'var(--color-text)' : 'var(--color-border)';
              const boxShadow = isActive ? 'inset 0 0 0 1px var(--color-text), inset 0 0 0 5px rgba(12, 12, 14, 0.16)' : 'none';
              return `
                <div class="swatch swatch--static swatch--palette" style="background:${color.hex};border-color:${borderColor};box-shadow:${boxShadow};cursor:default;min-height:168px;" aria-label="${esc(color.name)} ${esc(color.hex)}">
                  <div style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${textColor};opacity:0.74;">[z ${index + 1}]</div>
                  <div style="margin-top:auto;color:${textColor};">
                    <div style="font-size:var(--fs-sm);font-weight:500;line-height:1.2;">${esc(color.name)}</div>
                    <div class="swatch__label" style="margin-top:6px;color:${textColor};">${esc(color.hex)}</div>
                    <div class="swatch__note" style="color:${textColor};">${esc(colorIdeas[color.name] || 'Signal accent for live states and emphasis.')}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div>
          <div class="type-scale__label" style="margin-bottom:var(--space-sm);">Foundation neutrals</div>
          <div class="swatch-grid swatch-grid--neutrals">
            ${neutralBase.map((color) => {
              const textColor = getReadableTextColor(color.hex);
              return `
                <div class="swatch swatch--static swatch--neutral" style="background:${color.hex};border-color:var(--color-border);cursor:default;min-height:140px;">
                  <div style="margin-top:auto;color:${textColor};">
                    <div style="font-size:var(--fs-sm);font-weight:500;line-height:1.2;">${esc(color.name)}</div>
                    <div class="swatch__label" style="margin-top:6px;color:${textColor};">${esc(color.hex)}</div>
                    <div class="swatch__note" style="color:${textColor};">${esc(color.note)}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  }

  // ---- Render typography section ----
  function renderTypeSection() {
    const typeDemos = document.getElementById('type-demos');
    if (!typeDemos) return;

    const scales = [
      { name: '--fs-hero',  label: 'Hero',   sample: B.currentLogo.text,                                    weight: B.currentLogo.weight },
      { name: '--fs-xl',    label: 'XL',     sample: 'A Digital Arts Institute',                           weight: 400 },
      { name: '--fs-lg',    label: 'Large',  sample: 'The Field',                                          weight: 400 },
      { name: '--fs-md',    label: 'Medium', sample: 'A living knowledge graph of the digital arts.',      weight: 300 },
      { name: '--fs-base',  label: 'Base',   sample: 'The digital arts, finding its shared language.',     weight: 300 },
      { name: '--fs-sm',    label: 'Small',  sample: 'SENSE / QUERY / CONTRIBUTE / CONNECT',              weight: 500 },
      { name: '--fs-xs',    label: 'XS',     sample: '2026 A(DAI) / NODES 774 / EDGES 929',               weight: 400 },
    ];

    const f = B.currentFont;

    typeDemos.innerHTML = `
      <div class="type-scale__label" style="margin-bottom:var(--space-sm);">Select font [1-9] to preview</div>
      <div id="adai-type-font-selector" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:var(--space-md);">
        ${B.FONTS.map((font, i) => `<button class="btn adai-font-btn" data-font-idx="${i}" style="font-family:${font.family};font-size:12px;${i === B.fontIdx ? 'opacity:1;border-color:var(--brand-color);box-shadow:inset 0 0 0 1px var(--brand-color);' : 'opacity:0.5;'}">[${font.key}] ${font.name}</button>`).join('')}
      </div>
      <div style="margin-top:var(--space-lg);">
        <div class="type-scale__label" style="margin-bottom:var(--space-md);">
          ${f.name} / Weights: 300, 400, 500, 700
        </div>
        ${scales.map(s => `
          <div class="type-scale__item">
            <div class="type-scale__label">${s.label} / ${s.name}</div>
            <div style="font-family:${f.family};font-size:var(${s.name});font-weight:${s.weight};">${s.sample}</div>
          </div>
        `).join('')}
        <div style="margin-top:var(--space-lg);">
          <div class="type-scale__label">Uppercase headers</div>
          <div style="font-family:${f.family};font-size:var(--fs-xs);font-weight:500;text-transform:uppercase;letter-spacing:0.15em;color:var(--color-text-muted);padding-bottom:var(--space-xs);border-bottom:1px solid var(--color-border);">
            Section Heading Style
          </div>
        </div>
        <div class="brand-credit" aria-label="Brand identity credit">
          <div class="brand-credit__ruler" aria-hidden="true"></div>
          <div class="brand-credit__text">
            Brand Identity by
            <a href="https://x.com/pixel0symphony" target="_blank" rel="noopener">Pixel Symphony</a>
          </div>
        </div>
      </div>
    `;

    typeDemos.querySelectorAll('.adai-font-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        B.setFont(parseInt(btn.dataset.fontIdx));
      });
    });
  }

  // ---- Listen for brand changes (from brand-state.js key handlers) ----
  window.addEventListener('adai:brand-change', () => {
    renderLogoSection();
    renderGeometrySection();
    renderTypeSection();
  });

  window.addEventListener('adai:color-change', () => {
    renderColorSection();
    renderGeometrySection();
  });

  window.addEventListener('resize', () => {
    if (!document.getElementById('adai-home-gen-frame')) return;
    window.clearTimeout(generativeResizeTimer);
    generativeResizeTimer = window.setTimeout(() => {
      renderGenerativeSection();
    }, 180);
  });

  // ---- Initial render ----
  startLogotypeTypewriter();
  startFooterLogotype();
  renderControlsSection();
  renderLogoSection();
  renderGeometrySection();
  renderColorSection();
  renderTypeSection();
});
