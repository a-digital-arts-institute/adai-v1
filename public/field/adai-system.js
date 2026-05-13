// adai-system.js — Shared ADAI controls, options, and keyboard metadata

window.ADAI_SYSTEM = (() => {
  const BRAND = {
    LOGO_CYCLE_KEY: 'l',
    ACCENT_CYCLE_KEY: 'z',
    LOGO_VARIANTS: [
      { text: 'a(dai)', weight: 400, tracking: '0.08em' },
      { text: 'A(DAI)', weight: 700, tracking: '0.12em' },
      { text: 'a.d.a.i', weight: 300, tracking: '0.2em' },
      { text: 'a|dai|', weight: 400, tracking: '0.06em' },
      { text: 'a{dai}', weight: 400, tracking: '0.08em' },
      { text: 'a/dai/', weight: 300, tracking: '0.1em' },
      { text: 'a[dai]', weight: 500, tracking: '0.06em' },
      { text: 'a~dai~', weight: 300, tracking: '0.15em' },
      { text: 'a::dai', weight: 400, tracking: '0.1em' },
      { text: 'a>dai<', weight: 500, tracking: '0.08em' },
    ],
    FONTS: [
      { key: '1', name: 'Courier Prime', family: "'Courier Prime', monospace" },
      { key: '2', name: 'Cutive Mono', family: "'Cutive Mono', monospace" },
      { key: '3', name: 'Anonymous Pro', family: "'Anonymous Pro', monospace" },
      { key: '4', name: 'Xanh Mono', family: "'Xanh Mono', monospace" },
      { key: '5', name: 'Space Mono', family: "'Space Mono', monospace" },
      { key: '6', name: 'IBM Plex Mono', family: "'IBM Plex Mono', monospace" },
      { key: '7', name: 'Roboto Mono', family: "'Roboto Mono', monospace" },
      { key: '8', name: 'Inconsolata', family: "'Inconsolata', monospace" },
      { key: '9', name: 'Source Code Pro', family: "'Source Code Pro', monospace" },
    ],
    ACCENT_COLORS: [
      { key: 'z', name: 'Vermillion', hex: '#D93B2D' },
      { key: 'z', name: 'Rust', hex: '#A83A1E' },
      { key: 'z', name: 'Amber', hex: '#E5890A' },
      { key: 'z', name: 'Ochre', hex: '#B88A1B' },
      { key: 'z', name: 'Olive', hex: '#6E7B2C' },
      { key: 'z', name: 'Jade', hex: '#2A7672' },
      { key: 'z', name: 'Deep Teal', hex: '#093F43' },
      { key: 'z', name: 'Cobalt', hex: '#4169B0' },
      { key: 'z', name: 'Oxblood', hex: '#8F2D2D' },
    ],
  };

  const FIELD = {
    MODE_CYCLE_KEY: 'm',
    DEFAULT_MODE_INDEX: 2,
    DEFAULT_BACKGROUND_INDEX: 0,
    MODES: [
      { name: 'ripple' },
      { name: 'drift' },
      { name: 'orbit' },
      { name: 'weave' },
      { name: 'bloom' },
    ],
    BACKGROUNDS: [
      { name: 'Black', hex: '#0C0C0E' },
      { name: 'Pine', hex: '#0E4433' },
      { name: 'Oxblood', hex: '#572525' },
      { name: 'Cobalt', hex: '#5074B0' },
      { name: 'Midnight', hex: '#123154' },
      { name: 'Lagoon', hex: '#199381' },
    ],
    MOTION_TOGGLE_KEY: 'a',
    SPEED_UP_KEYS: ['+', '='],
    SPEED_DOWN_KEYS: ['-', '_'],
    MIN_SPEED: 0.4,
    MAX_SPEED: 3.0,
    SPEED_STEP: 0.2,
  };

  const EXPORT = {
    SAVE_SVG_KEY: 's',
    SAVE_PNG_KEY: 'p',
    PNG_LONG_SIDE: 8000,
  };

  function normalizeKey(value) {
    return String(value || '').toLowerCase();
  }

  function matchesKey(event, key) {
    return normalizeKey(event?.key) === normalizeKey(key);
  }

  function matchesAnyKey(event, keys) {
    return keys.some((key) => matchesKey(event, key));
  }

  function listNames(items) {
    return items.map((item) => item.name).join(', ');
  }

  function formatSequentialKeys(keys) {
    if (!Array.isArray(keys) || keys.length === 0) return '';
    if (keys.every((key) => /^\d$/.test(key))) {
      return `${keys[0]}-${keys[keys.length - 1]}`;
    }
    return keys.join(' ');
  }

  let fieldBackgroundIdx = Math.max(
    0,
    Math.min(FIELD.DEFAULT_BACKGROUND_INDEX || 0, FIELD.BACKGROUNDS.length - 1)
  );

  function getFieldBackground(index = fieldBackgroundIdx) {
    if (!FIELD.BACKGROUNDS.length) return null;
    const normalized = ((index % FIELD.BACKGROUNDS.length) + FIELD.BACKGROUNDS.length) % FIELD.BACKGROUNDS.length;
    return { ...FIELD.BACKGROUNDS[normalized], index: normalized };
  }

  function applyFieldBackgroundCss(background) {
    if (!background?.hex) return;

    document.documentElement?.style.setProperty('--field-bg', background.hex);

    if (document.body) {
      document.body.style.backgroundColor = background.hex;
    }

    const mopey = document.getElementById('mopey');
    if (mopey) {
      mopey.style.backgroundColor = background.hex;
    }
  }

  function dispatchFieldBackgroundChange(background) {
    window.dispatchEvent(new CustomEvent('adai:field-background-change', {
      detail: background,
    }));
  }

  function setFieldBackground(index, options = {}) {
    const { silent = false } = options;
    const background = getFieldBackground(index);
    if (!background) return null;

    fieldBackgroundIdx = background.index;
    applyFieldBackgroundCss(background);

    if (!silent) dispatchFieldBackgroundChange(background);
    return background;
  }

  function cycleFieldBackground() {
    return setFieldBackground(fieldBackgroundIdx + 1);
  }

  function initializeFieldBackgroundSupport() {
    if (!document.getElementById('mopey')) return;
    setFieldBackground(fieldBackgroundIdx, { silent: true });
  }

  function getInteractiveControls() {
    return [
      {
        labels: [BRAND.ACCENT_CYCLE_KEY],
        action: 'Cycle signal color',
        options: listNames(BRAND.ACCENT_COLORS),
      },
      {
        labels: [BRAND.LOGO_CYCLE_KEY],
        action: 'Cycle logo variant',
        options: BRAND.LOGO_VARIANTS.map((variant) => variant.text).join(', '),
      },
      {
        labels: [formatSequentialKeys(BRAND.FONTS.map((font) => font.key))],
        action: 'Switch brand font',
        options: listNames(BRAND.FONTS),
      },
      {
        labels: [FIELD.MODE_CYCLE_KEY],
        action: 'Cycle field mode (field canvas)',
        options: FIELD.MODES.map((mode) => mode.name).join(', '),
      },
      {
        labels: [FIELD.MOTION_TOGGLE_KEY],
        action: 'Toggle field motion (field canvas)',
        options: 'On / Off',
      },
      {
        labels: ['-', '+'],
        action: 'Adjust field drift speed (field canvas)',
        options: `${FIELD.MIN_SPEED.toFixed(1)}x to ${FIELD.MAX_SPEED.toFixed(1)}x in ${FIELD.SPEED_STEP.toFixed(1)}x steps`,
      },
      {
        labels: [EXPORT.SAVE_SVG_KEY],
        action: 'Save SVG snapshot (field canvas)',
        options: 'Vector export of the current field',
      },
      {
        labels: [EXPORT.SAVE_PNG_KEY],
        action: 'Save PNG snapshot (field canvas)',
        options: `${EXPORT.PNG_LONG_SIDE}px long edge`,
      },
    ];
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFieldBackgroundSupport, { once: true });
  } else {
    initializeFieldBackgroundSupport();
  }

  return {
    BRAND,
    FIELD,
    EXPORT,
    matchesKey,
    matchesAnyKey,
    getCurrentFieldBackground: () => getFieldBackground(fieldBackgroundIdx),
    setFieldBackground,
    cycleFieldBackground,
    getInteractiveControls,
  };
})();
