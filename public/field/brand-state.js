// brand-state.js — Shared brand state across all A(DAI) pages
// Persists font and logo choices in localStorage

window.ADAI_BRAND = (() => {
  const { BRAND, matchesKey } = window.ADAI_SYSTEM;
  const {
    LOGO_VARIANTS,
    FONTS,
    ACCENT_COLORS,
    LOGO_CYCLE_KEY,
    ACCENT_CYCLE_KEY,
  } = BRAND;
  const ACCENT_STORAGE_VERSION = 'cobalt-default';
  const DEFAULT_ACCENT_INDEX = Math.max(0, ACCENT_COLORS.findIndex((accent) => accent.name === 'Cobalt'));
  const storedAccentRaw = localStorage.getItem('adai-accent');
  const storedAccentVersion = localStorage.getItem('adai-accent-version');

  // Load from localStorage or defaults
  let logoIdx = parseInt(localStorage.getItem('adai-logo') || '0');
  let fontIdx = parseInt(localStorage.getItem('adai-font') || '0');
  let accentIdx = parseInt(storedAccentRaw || String(DEFAULT_ACCENT_INDEX), 10);
  let faviconFrameIndex = 0;
  let faviconTimerId = null;
  const FAVICON_CURSOR_COLOR = '#F2F2F2';
  const FAVICON_FRAME_DELAY = 980;
  if (logoIdx >= LOGO_VARIANTS.length) logoIdx = 0;
  if (fontIdx >= FONTS.length) fontIdx = 0;
  if (!Number.isFinite(accentIdx) || accentIdx < 0 || accentIdx >= ACCENT_COLORS.length) {
    accentIdx = DEFAULT_ACCENT_INDEX;
  }
  if (storedAccentVersion !== ACCENT_STORAGE_VERSION && (storedAccentRaw === null || storedAccentRaw === '0')) {
    accentIdx = DEFAULT_ACCENT_INDEX;
  }

  function save() {
    localStorage.setItem('adai-logo', String(logoIdx));
    localStorage.setItem('adai-font', String(fontIdx));
    localStorage.setItem('adai-accent', String(accentIdx));
    localStorage.setItem('adai-accent-version', ACCENT_STORAGE_VERSION);
  }

  function hexToRgb(hex) {
    const value = String(hex || '').trim().replace('#', '');
    const normalized = value.length === 3
      ? value.split('').map((char) => char + char).join('')
      : value;

    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return '65, 105, 176';

    const int = parseInt(normalized, 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `${r}, ${g}, ${b}`;
  }

  function ensureFaviconLink() {
    let icon = document.querySelector('link[rel="icon"]');
    if (!icon) {
      icon = document.createElement('link');
      icon.rel = 'icon';
      document.head.appendChild(icon);
    }
    icon.type = 'image/svg+xml';
    return icon;
  }

  function buildFaviconCursorMarkup(frameIndex) {
    const frame = frameIndex % 7;
    switch (frame) {
      case 0:
        return `<rect x="8.4" y="5" width="7.2" height="14" rx="0.8" fill="${FAVICON_CURSOR_COLOR}"/>`;
      case 1:
        return `<rect x="6.2" y="16.2" width="11.6" height="2.1" rx="0.9" fill="${FAVICON_CURSOR_COLOR}"/>`;
      case 2:
        return `<rect x="10.75" y="4.4" width="2.5" height="15.2" rx="1.1" fill="${FAVICON_CURSOR_COLOR}"/>`;
      case 3:
        return `<rect x="8.2" y="5" width="7.6" height="14" rx="0.9" fill="none" stroke="${FAVICON_CURSOR_COLOR}" stroke-width="1.6"/>`;
      case 4:
        return `<rect x="10.95" y="4.3" width="2.1" height="15.4" rx="1.05" fill="${FAVICON_CURSOR_COLOR}"/>`;
      case 5:
        return `
          <rect x="11.05" y="5.4" width="1.9" height="13.2" rx="0.95" fill="${FAVICON_CURSOR_COLOR}"/>
          <rect x="8.1" y="5.1" width="7.8" height="1.55" rx="0.75" fill="${FAVICON_CURSOR_COLOR}"/>
          <rect x="8.1" y="17.35" width="7.8" height="1.55" rx="0.75" fill="${FAVICON_CURSOR_COLOR}"/>
        `;
      default:
        return `
          <rect x="9.55" y="4.6" width="1.55" height="14.8" rx="0.78" fill="${FAVICON_CURSOR_COLOR}"/>
          <rect x="12.9" y="4.6" width="1.55" height="14.8" rx="0.78" fill="${FAVICON_CURSOR_COLOR}"/>
        `;
    }
  }

  function buildFaviconDataUrl(accentHex, frameIndex) {
    const fieldDots = [
      [4.1, 5.1], [7.2, 3.9], [16.8, 4.3], [19.2, 6.1],
      [4.8, 18.3], [7.5, 20.1], [16.2, 19.5], [19.1, 17.4],
      [3.3, 11.8], [20.7, 11.3]
    ].map(([cx, cy], index) => {
      const opacity = ((index + frameIndex) % 3 === 0) ? 0.26 : 0.14;
      const radius = ((index + frameIndex) % 4 === 0) ? 0.9 : 0.65;
      return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${FAVICON_CURSOR_COLOR}" opacity="${opacity}"/>`;
    }).join('');

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <rect width="24" height="24" rx="4" fill="${accentHex}"/>
        <g>${fieldDots}</g>
        <g>${buildFaviconCursorMarkup(frameIndex)}</g>
      </svg>
    `.trim();

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  function stopFaviconAnimation() {
    window.clearInterval(faviconTimerId);
    faviconTimerId = null;
  }

  function renderFaviconFrame(accentHex) {
    const icon = ensureFaviconLink();
    icon.href = buildFaviconDataUrl(accentHex, faviconFrameIndex);
    faviconFrameIndex = (faviconFrameIndex + 1) % 7;
  }

  function applyFavicon(accentHex) {
    faviconFrameIndex = 0;
    stopFaviconAnimation();
    renderFaviconFrame(accentHex);
    faviconTimerId = window.setInterval(() => {
      renderFaviconFrame(accentHex);
    }, FAVICON_FRAME_DELAY);
  }

  function applyAccent() {
    const accent = ACCENT_COLORS[accentIdx];
    const rgb = hexToRgb(accent.hex);
    document.documentElement.style.setProperty('--brand-color', accent.hex);
    document.documentElement.style.setProperty('--brand-color-rgb', rgb);
    document.documentElement.style.setProperty('--signal', accent.hex);
    document.documentElement.style.setProperty('--signal-rgb', rgb);
    document.documentElement.style.setProperty('--color-accent-1', accent.hex);
    document.documentElement.style.setProperty('--color-accent-2', accent.hex);
    document.documentElement.style.setProperty('--color-accent-3', accent.hex);
    document.documentElement.style.setProperty('--accent-name', `"${accent.name}"`);
    applyFavicon(accent.hex);
  }

  function applyFont() {
    const f = FONTS[fontIdx];
    document.body.style.fontFamily = f.family;
    document.documentElement.style.setProperty('--font-mono', f.family);
    document.documentElement.style.setProperty('--font-body', f.family);
    document.documentElement.style.setProperty('--mono', f.family);
  }

  function applyLogo() {
    const v = LOGO_VARIANTS[logoIdx];
    const f = FONTS[fontIdx];
    document.querySelectorAll('[data-adai-logo]').forEach(el => {
      el.textContent = v.text;
      el.style.fontFamily = f.family;
      el.style.fontWeight = v.weight;
      el.style.letterSpacing = v.tracking;
    });
  }

  function setFont(idx) {
    fontIdx = idx;
    save();
    applyFont();
    applyLogo();
    window.dispatchEvent(new CustomEvent('adai:brand-change'));
  }

  function setLogo(idx) {
    logoIdx = idx;
    save();
    applyLogo();
    window.dispatchEvent(new CustomEvent('adai:brand-change'));
  }

  function cycleLogo() {
    setLogo((logoIdx + 1) % LOGO_VARIANTS.length);
  }

  function setAccent(idx) {
    accentIdx = idx;
    save();
    applyAccent();
    window.dispatchEvent(new CustomEvent('adai:color-change'));
  }

  function cycleAccent() {
    setAccent((accentIdx + 1) % ACCENT_COLORS.length);
  }

  // Key handlers — L cycles logo, Z cycles accent, 1-9 switch font
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (matchesKey(e, LOGO_CYCLE_KEY)) {
      cycleLogo();
      return;
    }
    if (matchesKey(e, ACCENT_CYCLE_KEY)) {
      cycleAccent();
      return;
    }
    let idx = -1;
    if (e.key >= '1' && e.key <= '9') idx = parseInt(e.key) - 1;
    if (idx >= 0 && idx < FONTS.length) {
      setFont(idx);
    }
  });

  function applyMode() {
    localStorage.removeItem('adai-mode');
    document.documentElement.setAttribute('data-mode', 'dark');
  }

  // Apply on load
  applyAccent();
  applyFont();
  applyMode();
  // Defer logo apply slightly so DOM elements with data-adai-logo exist
  requestAnimationFrame(applyLogo);

  return {
    ACCENT_COLORS,
    LOGO_VARIANTS,
    FONTS,
    get accentIdx() { return accentIdx; },
    get logoIdx() { return logoIdx; },
    get fontIdx() { return fontIdx; },
    get currentAccent() { return ACCENT_COLORS[accentIdx]; },
    get currentLogo() { return LOGO_VARIANTS[logoIdx]; },
    get currentFont() { return FONTS[fontIdx]; },
    setAccent,
    setFont,
    setLogo,
    cycleAccent,
    cycleLogo,
    applyAccent,
    applyFont,
    applyLogo,
  };
})();
