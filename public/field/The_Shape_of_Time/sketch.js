
/**
 * Patched for Verse and p5:
 * - Deterministic RNG seeded from Verse payload hash or ?seed= query
 * - Math.random overridden to deterministic rnd()
 * - p5 random() and noise() seeded to the same SEED
 * - window.$artifact features and aspectRatio
 * - Explicit preview capture hook
 */

// -------- Verse payload and deterministic RNG --------
const __q = new URLSearchParams(window.location.search).get("payload");
const __p = JSON.parse(__q ? atob(__q) : "{}");
const HASH = __p.hash || "0";
const EDITION = __p.editionNumber || 1;

function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// -------- Resolve a robust SEED for Verse and local p5 --------
const url = new URL(window.location.href);
const qsSeed = url.searchParams.get("seed");

// For local runs without Verse payload, default to a time based seed so refreshes vary.
// If you want fixed determinism locally, pass ?seed=12345 in the URL.
const fallbackSeedSource = `${Date.now()}_${Math.random()}`; // This executes before we override Math.random

const RAW_SEED_STR =
  (__p.hash ? `${__p.hash}:${__p.editionNumber || 1}` : null) ||
  (qsSeed ? String(qsSeed) : fallbackSeedSource);

const SEED = hash32(RAW_SEED_STR);

// Build PRNG and wire Math.random
let __rnd = mulberry32(SEED >>> 0);
const rnd   = () => __rnd();
const randint = (n) => (rnd() * n) | 0;
Math.random = rnd;

console.log("[SEED]", SEED, "from", RAW_SEED_STR);

// -------- Align p5 once available --------
function seedP5OnceAvailable() {
  // Works both in instance and global mode once p5 is available
  if (window.p5 && window.p5.prototype) {
    if (typeof window.randomSeed === "function") window.randomSeed(SEED);
    if (typeof window.noiseSeed  === "function") window.noiseSeed(SEED);

    // Replace p5.prototype.random so calls use our mulberry32 sequence
    const p = window.p5.prototype;
    p.random = function() {
      const a = arguments;
      const r = rnd();
      if (a.length === 0) return r;
      if (a.length === 1) {
        const v = a[0];
        if (Array.isArray(v)) return v[(r * v.length) | 0];
        return r * v;
      }
      const min = a[0], max = a[1];
      return min + r * (max - min);
    };
    console.log("[p5] random() and seeds aligned");
    return true;
  }
  return false;
}
if (!seedP5OnceAvailable()) {
  const t = setInterval(() => {
    if (seedP5OnceAvailable()) clearInterval(t);
  }, 10);
}

// Optional flag Verse uses on its capture machine
const isMachine = new URLSearchParams(window.location.search).get("machine") === "true";

// Explicit preview capture marker for Verse
function capturePreview() {
  console.info("###verse-preview-capture");
}

// ----------------------------------------------------

const ASPECT = 3/4; 
let HEIGHT = window.innerHeight;
let WIDTH  = Math.round(HEIGHT * ASPECT);

const w = WIDTH, h = HEIGHT, pi = Math.PI, nsSvg = "http://www.w3.org/2000/svg";

let originalSvgString = null;

const THEME_WEIGHTS = {
  classic:   0.5,
  alt_black: 0.2,
  alt_accent: 0.30
};

function pickWeightedTheme(weights) {
  const r = Math.random();
  let acc = 0;
  for (const [key, weight] of Object.entries(weights)) {
    acc += weight;
    if (r < acc) return key;
  }
  return "classic";
}

const THEME = pickWeightedTheme(THEME_WEIGHTS);

const backgroundsClassic = ["#f0e4d7", "#e5d3c8", "#e8e3d3", "#f7efdb"];
const strokesClassic     = ["#26211B", "#282F12", "#11151D", "#152740", "#0D0E0F"];

const backgroundsAccent = [
  "#006CD9",
  "#0B3D91",
  "#102542",
  "#002147",
  "#038975",
  "#003B28",
  "#6A1B1B",
  "#4A1414"
];

function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

let chosenBackground;
let defaultStrokeColor;

if (THEME === "classic") {
  chosenBackground   = pick(backgroundsClassic);
  defaultStrokeColor = pick(strokesClassic);
} else if (THEME === "alt_black") {
  chosenBackground   = "#000000";
  defaultStrokeColor = "#FFFFFF";
} else {
  chosenBackground   = pick(backgroundsAccent);
  defaultStrokeColor = "#FFFFFF";
}

const USE_WHITE_STROKE = THEME !== "classic";
console.log("[THEME]", THEME, "BG:", chosenBackground, "stroke:", defaultStrokeColor);

const punk = (tag, ns) => {
  const el = document.createElementNS(ns || nsSvg, tag);
  if (ns) el.setAttribute("xmlns", ns);
  return el;
};
const goth = (p, n, v) => p.setAttributeNS(null, n, v);
const emo  = (p, c) => p.appendChild(c);

function createHud() {
  const el = document.createElement("pre");
  el.id = "run-hud";
  el.style.cssText = [
    "position:fixed",
    "top:12px",
    "left:12px",
    "margin:0",
    "padding:10px 12px",
    "background:rgba(0,0,0,0.6)",
    "color:#EDEDED",
    "font:12px/1.4 monospace",
    "border-radius:8px",
    "max-width:46vw",
    "max-height:70vh",
    "overflow:auto",
    "z-index:99999",
    "pointer-events:none",
    "white-space:pre-wrap"
  ].join(";");
  document.body.appendChild(el);
  const set = (lines) => { el.textContent = Array.isArray(lines) ? lines.join("\n") : String(lines); };
  const add = (line) => { el.textContent += (el.textContent ? "\n" : "") + line; };
  return { set, add, el };
}
const HUD = createHud();

const createBackground = (svg) => {
  const bg = punk("rect");
  goth(bg, "width", "100%");
  goth(bg, "height", "100%");
  goth(bg, "fill", chosenBackground);
  emo(svg, bg);
};

function ensureDefs(svg) {
  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = punk("defs");
    emo(svg, defs);
  }
  return defs;
}

function getSpacing(rv, ranges) {
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    if (rv < r.probability) return 1 / (Math.random() * (r.max - r.min) + r.min);
  }
  const last = ranges[ranges.length - 1];
  return 1 / (Math.random() * (last.max - last.min) + last.min);
}

const arrangementParams = {
  1:  {
    circleCount: ((Math.random() * 100) | 0) + 25,
    spacing: getSpacing(Math.random(), [
      { probability: 0.35, min: 800, max: 1250 },
      { probability: 0.70, min: 1250, max: 1500 },
      { probability: 0.90, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 }
    ])
  },
  2:  {
    circleCount: ((Math.random() * 800) | 0) + 100,
    spacing: getSpacing(Math.random(), [
      { probability: 0.35, min: 800, max: 1250 },
      { probability: 0.70, min: 1250, max: 1500 },
      { probability: 0.90, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 }
    ])
  },
  3:  {
    circleCount: ((Math.random() * 5) | 0) + 1,
    spacing: getSpacing(Math.random(), [
      { probability: 0.0, min: 800, max: 1250 },
      { probability: 0.25, min: 1250, max: 1500 },
      { probability: 0.50, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 }
    ])
  },
  4:  {
    circleCount: ((Math.random() * 500) | 0) + 1,
    spacing: getSpacing(Math.random(), [
      { probability: 0.35, min: 1000, max: 1250 },
      { probability: 0.70, min: 1250, max: 1500 },
      { probability: 0.90, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 }
    ])
  },
  5:  {
    circleCount: ((Math.random() * 100) | 0) + 1,
    spacing: getSpacing(Math.random(), [
      { probability: 0.35, min: 800, max: 1250 },
      { probability: 0.70, min: 1250, max: 1500 },
      { probability: 0.90, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 }
    ])
  },
  6:  {
    circleCount: ((Math.random() * 100) | 0) + 25,
    spacing: getSpacing(Math.random(), [
      { probability: 0.35, min: 800, max: 1250 },
      { probability: 0.70, min: 1250, max: 1500 },
      { probability: 0.90, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 }
    ])
  },
  7:  {
    circleCount: ((Math.random() * 100) | 0) + 1,
    spacing: getSpacing(Math.random(), [
      { probability: 0.35, min: 1000, max: 1250 },
      { probability: 0.70, min: 1250, max: 1500 },
      { probability: 0.90, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 }
    ])
  },
  8:  {
    circleCount: ((Math.random() * 100) | 0) + 1,
    spacing: getSpacing(Math.random(), [
      { probability: 0.35, min: 800, max: 1250 },
      { probability: 0.70, min: 1250, max: 1500 },
      { probability: 0.90, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 }
    ])
  },
  9:  {
    circleCount: ((Math.random() * 100) | 0) + 25,
    spacing: getSpacing(Math.random(), [
      { probability: 0.35, min: 800, max: 1250 },
      { probability: 0.70, min: 1250, max: 1500 },
      { probability: 0.90, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 }
    ])
  },
  10: {
    circleCount: ((Math.random() * 100) | 0) + 1,
    spacing: getSpacing(Math.random(), [
      { probability: 0.35, min: 800, max: 1250 },
      { probability: 0.70, min: 1250, max: 1500 },
      { probability: 0.90, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 }
    ])
  },
  11: { 
    circleCount: ((Math.random() * 100) | 0) + 1,
    spacing: getSpacing(Math.random(), [
      { probability: 0.5, min: 800, max: 1250 },
      { probability: 1.0, min: 1250, max: 1500 },
      { probability: 0.00, min: 1500, max: 1750 },
      { probability: 0.00, min: 1750, max: 2000 }
    ])
  },
  12: {
    circleCount: ((Math.random() * 100) | 0) + 1,
    spacing: getSpacing(Math.random(), [
      { probability: 0.35, min: 800, max: 1250 },
      { probability: 0.70, min: 1250, max: 1500 },
      { probability: 0.90, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 }
    ])
  },
  13: {
    circleCount: ((Math.random() * 100) | 0) + 1,
    spacing: getSpacing(Math.random(), [
      { probability: 0.35, min: 800, max: 1250 },
      { probability: 0.70, min: 1250, max: 1500 },
      { probability: 0.90, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 }
    ])
  },
  21: {
    circleCount: ((Math.random() * 100) | 0) + 1,
    spacing: getSpacing(Math.random(), [
      { probability: 0.35, min: 800, max: 1250 },
      { probability: 0.70, min: 1250, max: 1500 },
      { probability: 0.90, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 }
    ])
  },
  14: { 
    circleCount: ((Math.random() * 100) | 0) + 1,
    spacing: getSpacing(Math.random(), [
      { probability: 0.35, min: 800, max: 1250 },
      { probability: 0.70, min: 1250, max: 1500 },
      { probability: 0.90, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 }
    ])
  },
  15: { 
    circleCount: ((Math.random() * 100) | 0) + 1,
    spacing: getSpacing(Math.random(), [
     
      { probability: 1.00, min: 1750, max: 2250 }
    ])
  },
  
    22: { 
    circleCount: ((Math.random() * 200) | 0) + 1,
    spacing: getSpacing(Math.random(), [
     
      { probability: 1.00, min: 1500, max: 2000 }
    ])
  },
  16: { 
    circleCount: ((Math.random() * 100) | 0) + 1,
    spacing: getSpacing(Math.random(), [
      { probability: 0.35, min: 800, max: 1250 },
      { probability: 0.70, min: 1250, max: 1500 },
      { probability: 0.90, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 }
    ])
  },
  17: { 
    circleCount: ((Math.random() * 100) | 0) + 1,
    spacing: getSpacing(Math.random(), [
      { probability: 0.35, min: 800, max: 1250 },
      { probability: 0.70, min: 1250, max: 1500 },
      { probability: 0.90, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 }
    ])
  },
  18: { 
    circleCount: ((Math.random() * 100) | 0) + 1,
    spacing: getSpacing(Math.random(), [
      { probability: 0.35, min: 800, max: 1250 },
      { probability: 0.70, min: 1250, max: 1500 },
      { probability: 0.90, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 }
    ])
  },
  19: {
    circleCount: ((Math.random() * 100) | 0) + 1,
    spacing: getSpacing(Math.random(), [
      { probability: 0.35, min: 800, max: 1250 },
      { probability: 0.70, min: 1250, max: 1500 },
      { probability: 0.90, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 }
    ])
  },
  20: { 
    circleCount: ((Math.random() * 100) | 0) + 1,
    spacing: getSpacing(Math.random(), [
      { probability: 0.35, min: 800, max: 1250 },
      { probability: 0.70, min: 1250, max: 1500 },
      { probability: 0.90, min: 1500, max: 1750 },
      { probability: 1.00, min: 1750, max: 2000 }
    ])
  }
};
const allowedCases = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14,
  18, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 38, 40, 41, 42, 44, 46, 47, 48, 49, 50,53, 59, 61, 67, 71,
  73, 79, 83, 89, 97,
];

const casenumber = allowedCases[(Math.random() * allowedCases.length) | 0];

const allowedCases10 = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14,
  18, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 38, 40, 41, 42, 44, 46, 47, 48, 49, 50,
];

const casenumber10 = allowedCases[(Math.random() * allowedCases.length) | 0];

const allowedCases1 = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14,
  18, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 38, 40, 41, 42, 44, 46, 47, 48, 49, 50, 199, 211, 223, 227, 229,
];

const casenumber1 = allowedCases1[(Math.random() * allowedCases1.length) | 0];

const allowedCases3 = [
 2,3,4,5,6,7,8,9,10,11,12,13,14,16,17,
 18,19,20,22,23,25,26,29,32,34,
 36,37,38,41,46,47,49,
];
const casenumber3 = allowedCases3[(Math.random() * allowedCases3.length) | 0];

const allowedCases11 = [
  1,2,3,4,5,7,8,9,10,12,14,16
];
const casenumber11 = allowedCases11[(Math.random() * allowedCases11.length) | 0];

const allowedCases15 = [
 1,2,2,2
];
const casenumber15 = allowedCases15[(Math.random() * allowedCases15.length) | 0];

const primeNumbers = [
  2, 3, 5, 7, 11, 13, 17, 19, 23, 29,
  31, 37, 41, 43, 47, 53, 59, 61, 67, 71,
  73, 79, 83, 89, 97, 101, 103, 107, 109, 113,
  127, 131, 137, 139, 149, 151, 157, 163, 167, 173,
  179, 181, 191, 193, 197, 199, 211, 223, 227, 229,
  233, 239, 241, 251, 257, 263, 269, 271, 277, 281,
  283, 293, 307, 311, 313, 317, 331, 337, 347, 349,
  353, 359, 367, 373, 379, 383, 389, 397, 401, 409,
  419, 421, 431, 433, 439, 443, 449, 457, 461, 463,
  467, 479, 487, 491, 499, 503, 509, 521, 523, 541
];

const allowedCases22 = [
  Math.random() < 0.5
    ? Math.round(Math.random() * 100) + 1
    : primeNumbers[(Math.random() * primeNumbers.length) | 0]
];
const casenumber22 = allowedCases22[(Math.random() * allowedCases22.length) | 0];

const allowedCases16 = [
 1,2,3,4,2,3,4
];
const casenumber16 = allowedCases16[(Math.random() * allowedCases16.length) | 0];

const allowedCases12 = [
 1,2,4,8,10,14,16,22,26,32,34,38,46,50
];
const casenumber12 = allowedCases12[(Math.random() * allowedCases12.length) | 0];

const allowedArrangements = [1,1,1,1,2,3,4,5,6,6,6,7,7,8,8,9,10,10,11,12,13,14,15,16,16,18,20,20,21,22, 1,1,1,1,2,3,4,5,6,6,6,7,7,8,8,9,10,10,12,13,14,15,16,18,20,20,21,22,];
const selectedArrangement = allowedArrangements[(Math.random() * allowedArrangements.length) | 0];

const rng = {
  case1:  { a: Math.random() < 0.75 ? Math.random() * 1 + 2 : Math.random() * 6 + 3,
            b: Math.random() * 2 + 2,
            c: casenumber1,
            d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2 },
  case2: {
    a: Math.random() < 0.75 ? Math.random() * 1 + 1 : Math.random() * 8 + 2,
    b: Math.random() * 2.75 + 1.25,
    c: casenumber,
    d: (Math.random() < 0.5
          ? [2, 1, 100][(Math.random() * 3) | 0]
          : Math.random() * 5 + 1),
    f: Math.random(),
    rndA: Math.random(),
    rndB: Math.random(),
  },
  case3:  { a: Math.random() < 0.75 ? Math.random() * 1 + 1.5 : Math.random() * 3 + 2,
            b: Math.random() * 2 + 2.5,
            c: casenumber3,
            d: (Math.random() < 0.5
        ? [2, 1, 100][(Math.random() * 3) | 0]
        : Math.random() * 5 + 1),
            ramp: (() => {
              const r = Math.random();
              if (r < 0.75) return 0.0005 + Math.random() * (0.005 - 0.0005);
              return 0.005 + Math.random() * (0.05 - 0.005);
            })()
          },
  case4:  { a: Math.random() < 0.75 ? Math.random() * 1 + 1 : Math.random() * 5 + 2,
            b: Math.random() * 2 + 2,
            c: casenumber,
            d: (Math.random() < 1
        ? [2,2,2][(Math.random() * 3) | 0]
        : Math.random() * 5 + 1),},
  case5:  { a: Math.random() < 0.75 ? Math.random() * 1 + 1.5 : Math.random() * 7.5 + 2.5,
            b: Math.random() * 2 + 2,
            c: casenumber,
            d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
            f: Math.random()},
  case6:  { a: Math.random() < 0.75 ? Math.random() * 1 + 1 : Math.random() * 8 + 2,
            b: Math.random() * 2 + 2,
            c: casenumber,
            d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
            e: Math.random()*0.8+0.1,
            drift: Math.random() < 0.5 ? 0.001 : (Math.random() * 3 + 1) / 1000 },
  case7:  { a: Math.random() < 0.75 ? Math.random() * 1 + 1.5 : Math.random() * 7.5 + 2.5,
            b: Math.random() * 2 + 2,
            c: casenumber,
            d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
            e: Math.random()*0.98+0.01,
            f: Math.random(),
            rowRamp: (() => {
              const r = Math.random();
              if (r < 0.75) return 0.1 + Math.random() * (0.4 - 0.1);
              return 0.001 + Math.random() * (0.01 - 0.001);
            })()
          },
  case8:  { a: [0, 1][(Math.random() * 2) | 0],
            b: Math.random() < 0.5 ? Math.random() * 2 + 3 : Math.random() * 5 + 5,
            c: casenumber,
            d: 2 },
  case9:  { a: Math.random() < 0.75 ? Math.random() * 1 + 1.5 : Math.random() * 7.5 + 2.5,
            b: Math.random() * 2 + 2,
            c: casenumber,
            d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
            e: Math.random() * 0.8 + 0.1 },
  case10: { a: Math.random() < 0.75 ? Math.random() * 1 + 1 : Math.random() * 1 + 2,
            b: Math.random() * 2 + 2,
            c: casenumber10/5+1,
            d: 2 },
  case11: {
    a: Math.random() * 1 + 1,
    fx: [1,2][(Math.random()*2)|0],
    fy: [1,2][(Math.random()*2)|0],
    phase: Math.random() * Math.PI,
    c: casenumber11,
    d: 2
  },
  case12: {
    a: Math.random() * 2 + 2,
    b: Math.random() * 2 + 1,
    c: casenumber12,
    d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
    cxA: w * (0.05 + Math.random() * 0.4),
    cxB: w * (0.55 + Math.random() * 0.4),
    f: Math.random(),
  },
  case13: {
    a: Math.random() * 2,
    b: Math.random() * 3 + 1,
    c: casenumber,
    d: 2,
    klog: 0.2 + Math.random() * 0.2,
    f: Math.random(),
  },
  case21: {
    a: Math.random() * 1-0.1,
    b: Math.random() * 3 + 1,
    c: Math.random() * 39 + 1,
    d: 2,
    klog: 0.2 + Math.random() * 0.2,
    f: Math.random(),
  },
  case14: {
    a: Math.random() * 1 + 1,
    b: Math.random() * 1.5 + 1.25,
    c: casenumber,
    d: 2,
    scale: 0.3 + Math.random() * 0.5
  },
  case15: {
    a: Math.random() * 2 + 1,
    b: Math.random() * 2 + 2,
    c: casenumber15,
    d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
    wobble: 0.0025
  },
  
  case22: {
    a: Math.random() * 2 + 1,
    b: Math.random() * 2 + 2,
    c: casenumber22,
    d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
    wobble: 0.000
  },
  
  case16: {
    a: Math.random() * 2 + 1,
    b: Math.random() * 2 + 2,
    c: casenumber16,
    d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
    amp: h * (0.01 + Math.random() * 0.05),
    freq: 1 + ((Math.random() * 5) | 0),
    f: Math.random(),
    g: Math.random()
  },
  case17: {
    a: Math.random() * 2 + 2,
    b: Math.random() * 1.5 + 1.25,
    c: casenumber,
    d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
    krose: 0.06,
    f: Math.random(),
    j: Math.random(),
  },
  case18: {
    a: Math.random() * 2 + 1,
    shells: 1,
    c: casenumber,
    d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
    gap: 2
  },
  case19: {
    a: Math.random() * 2 + 2,
    b: Math.random() * 2 + 2,
    c: casenumber,
    d: Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
    phase: Math.random() * Math.PI,
    offset: 0.001
  },
  case20: {
    a: Math.random() * 2 + 1,
    b: Math.random() * 2 + 2,
    c: casenumber,
    d:  Math.random() < 0.5 ? 2 : Math.random() * 6 + 2,
    buckets: 60 + ((Math.random() * 60) | 0)
  },
};

console.log("[RNG] selectedArrangement:", selectedArrangement);
console.log("[RNG] arrangementParams.selected:", JSON.stringify(arrangementParams[selectedArrangement], null, 2));
console.log("[RNG] circleCount:", arrangementParams[selectedArrangement].circleCount, "spacing:", arrangementParams[selectedArrangement].spacing);
console.log("[RNG] knobs:", JSON.stringify(rng, null, 2));
console.log("[RNG] chosenBackground:", chosenBackground, "defaultStrokeColor:", defaultStrokeColor);

const { circleCount, spacing } = arrangementParams[selectedArrangement];

const endYPick = ((Math.random() * 3) | 0) + 1;
let globalOpacity;
if (USE_WHITE_STROKE) {
  globalOpacity = 0.5;
} else {
  globalOpacity = Math.random() < 0.5
    ? 0.75 + Math.random() * 0.25 
    : 1;                       
}

let dotSeq = 0;

// Expose features to Verse
window.$artifact = window.$artifact || {};
window.$artifact.features = Object.assign({}, window.$artifact.features, {
  Case: String(selectedArrangement),
  CircleCount: String(circleCount),
  Spacing: spacing.toFixed(6),
  Theme: THEME
});
window.$artifact.aspectRatio = ASPECT;

HUD.set([
  `Case: ${selectedArrangement}`,
  `circleCount=${circleCount}  spacing=${spacing.toFixed(6)}`
]);

function drawCircleWithSpiralFill(parent, cx, cy, radius, strokeCol = defaultStrokeColor) {
  if (USE_WHITE_STROKE) strokeCol = "#FFFFFF";
  const svg  = parent.ownerSVGElement;
  const defs = ensureDefs(svg);

  const circle = punk("circle");
  goth(circle, "cx", cx);
  goth(circle, "cy", cy);
  goth(circle, "r",  radius);
  goth(circle, "stroke", strokeCol);
  goth(circle, "stroke-width", "2");
  goth(circle, "opacity", globalOpacity);
  goth(circle, "stroke-linecap", "round");
  goth(circle, "stroke-linejoin", "round");
  goth(circle, "fill", "none");
  emo(parent, circle);

  const clipId = `clip-dot-${dotSeq++}`;
  const cp = punk("clipPath");
  goth(cp, "id", clipId);
  const clipC = punk("circle");
  goth(clipC, "cx", cx);
  goth(clipC, "cy", cy);
  goth(clipC, "r", Math.max(0, radius - 0.9));
  emo(cp, clipC);
  emo(defs, cp);

  const spiral = punk("path");
  let d = "", theta = 0, first = true;

  const spiralStroke = 1;
  const targetSpacing = Math.max(spiralStroke * 1.25, radius * 0.0125);
  const b = targetSpacing / (2 * Math.PI), a = 0;
  const edgeMargin = Math.max(0.9, radius * 0.03);
  const rMax = Math.max(0, radius - edgeMargin);
  const thetaMax = (rMax - a) / b;

  const desiredChord = Math.min(Math.max(radius / 24, 0.6), 3.0);
  const minThetaStep = Math.PI / 180;
  const maxThetaStep = Math.PI / 18;

  while (theta <= thetaMax) {
    const r = a + b * theta;
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    d += (first ? "M " : "L ") + x + "," + y + " ";
    first = false;
    const step = Math.max(minThetaStep, Math.min(maxThetaStep, desiredChord / Math.max(r, 1)));
    theta += step;
  }

  goth(spiral, "d", d);
  goth(spiral, "stroke", strokeCol);
  goth(spiral, "stroke-width", String(spiralStroke));
  goth(spiral, "opacity", globalOpacity);
  goth(spiral, "fill", "none");
  goth(spiral, "stroke-linecap", "round");
  goth(spiral, "stroke-linejoin", "round");
  goth(spiral, "stroke-miterlimit", "1");
  goth(spiral, "clip-path", `url(#${clipId})`);
  emo(parent, spiral);
}

function drawCirclesInRows(inkLayer) {
  const minCirclesInRow = circleCount;
  const rowSpacingOffset = h * spacing;

  const startY = h * (19 / 20);
  const endY   = h * (endYPick / 6);
  const numRows = Math.max(1, ((startY - endY) / (2 * rowSpacingOffset)) | 0);
  const availableHeight = startY - endY;
  const baseRadius = Math.min((w * 18 / 20) / (2 * minCirclesInRow), availableHeight / (2 * numRows));

  let currentY = startY;
  const hudOnce = { done: false };

  for (let row = 0; row < numRows; row++) {
    const circlesInRow = minCirclesInRow + row;

    switch (selectedArrangement) {
      case 1: {
        const k = Math.max(1, Math.floor(Math.abs(rng.case1.c)));
        const angleSpan = pi * k;
        const cX = w / rng.case1.d;
        const growth = (row / numRows) * rng.case1.a;
        const rad = baseRadius / 4 + growth * baseRadius;

        if (!hudOnce.done) {
          hudOnce.done = true;
          const knobs = rng.case1;
          HUD.add([
            "",
            `— Case 1 RNG —`,
            `a=${knobs.a.toFixed(3)} b=${knobs.b.toFixed(3)} c=${knobs.c.toFixed(3)} d=${knobs.d.toFixed(3)}`,
            `k=${k}  angleSpan=${angleSpan.toFixed(3)}  rad≈${rad.toFixed(2)}`
          ].join("\n"));
        }

        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          const ang = t * angleSpan - angleSpan / 2;
          const rr = rad * circlesInRow * rng.case1.b;
          const x = cX + rr * Math.cos(ang);
          const y = currentY + rr * Math.sin(ang);

          if (x >= 0 && x <= w && y >= 0 && y <= h)
            drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;

      case 2: {
        const k = Math.max(1, Math.floor(Math.abs(rng.case2.c)));
        const angleSpan = pi * k;
        const cX = w / rng.case2.d;
        const growth = (row / numRows) * rng.case2.a;
        const rad = baseRadius / 4 + growth * baseRadius;

        const randForCase2 = (typeof rng?.case2?.f === "number")
          ? rng.case2.f
          : (typeof rng?.next === "function")
            ? rng.next()
            : Math.random();

        const baseY =
          rng.case2.rndA < 0.5
            ? rng.case2.rndB * HEIGHT
            : [HEIGHT, HEIGHT / 2, 0, HEIGHT / 2][(rng.case2.rndB * 3) | 0];

        if (!hudOnce.done) {
          hudOnce.done = true;
          const knobs = rng.case2;
          HUD.add([
            "",
            `— Case 2 RNG —`,
            `a=${knobs.a.toFixed(3)} b=${knobs.b.toFixed(3)} c=${knobs.c.toFixed(3)} d=${knobs.d.toFixed(3)}`,
            `k=${k}  angleSpan=${angleSpan.toFixed(3)}  rad≈${rad.toFixed(2)}`,
            `baseY picked via Case2 RNG`
          ].join("\n"));
        }

        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          const ang = t * angleSpan - angleSpan / 2;
          const rr = rad * circlesInRow * rng.case2.b;
          const x = cX + rr * Math.cos(ang);

          const y =
            baseY +
            rr * Math.sin(ang) +
            (row / Math.max(1, numRows - 1)) * (h * 0.08);

          if (x >= 0 && x <= w && y >= 0 && y <= h)
            drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;

      case 3: {
        const k = Math.max(1, Math.floor(Math.abs(rng.case3.c)));
        const angleSpan = pi * k;
        const cX = w / rng.case3.d;
        const growth = (row / numRows) * rng.case3.a;
        const rad = baseRadius / 4 + growth * baseRadius;

        if (!hudOnce.done) {
          hudOnce.done = true;
          const knobs = rng.case3;
          HUD.add([
            "",
            `— Case 3 RNG —`,
            `a=${knobs.a.toFixed(3)} b=${knobs.b.toFixed(3)} c=${knobs.c.toFixed(3)} d=${knobs.d.toFixed(3)} ramp=${knobs.ramp.toFixed(6)}`,
            `k=${k}  angleSpan=${angleSpan.toFixed(3)}  rad≈${rad.toFixed(2)}`
          ].join("\n"));
        }

        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          const ang = t * angleSpan - angleSpan / 2;
          const rr = rad * circlesInRow * rng.case3.b;
          const x = cX + rr * Math.cos(ang);
          const y = HEIGHT / 2 + rr * Math.sin(ang) + (t - 0.5) * (h * rng.case3.ramp);

          if (x >= 0 && x <= w && y >= 0 && y <= h)
            drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;

      case 4: {
        const k = Math.max(1, Math.floor(Math.abs(rng.case4.c)));
        const angleSpan = pi * k;
        const cX = w / rng.case4.d;
        const growth = (row / numRows) * rng.case4.a;
        const rad = baseRadius / 2 + growth * baseRadius;

        if (!hudOnce.done) {
          hudOnce.done = true;
          const knobs = rng.case4;
          HUD.add([
            "",
            `— Case 4 RNG —`,
            `a=${knobs.a.toFixed(3)} b=${knobs.b.toFixed(3)} c=${knobs.c.toFixed(3)} d=${knobs.d.toFixed(3)}`,
            `k=${k}  angleSpan=${angleSpan.toFixed(3)}  rad≈${rad.toFixed(2)}`
          ].join("\n"));
        }

        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          const ang = t * angleSpan - angleSpan / 2;
          const rr = rad * circlesInRow * rng.case4.b;
          const x = cX + rr * Math.cos(ang);
          const safe = Math.max(-Math.PI / 8 + 1e-3, Math.min(Math.PI / 8 - 1e-3, ang));
          const y = HEIGHT / 2 + rr * Math.sin(Math.atan(Math.tan(1.25 * safe)));

          if (x >= 0 && x <= w && y >= 0 && y <= h)
            drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;

      case 5: {
        const k = Math.max(1, Math.floor(Math.abs(rng.case5.c)));
        const angleSpan = pi * k;
        const cX = w / rng.case5.d;
        const growth = (row / numRows) * rng.case5.a;
        const rad = baseRadius / 4 + growth * baseRadius;
        const baseYOptions = [HEIGHT *rng.case5.f,HEIGHT, HEIGHT / 2, 0,HEIGHT / 2,HEIGHT *rng.case5.f];
        const baseY = baseYOptions[(rng.case5.f * baseYOptions.length) | 0];

        if (!hudOnce.done) {
          hudOnce.done = true;
          const knobs = rng.case5;
          HUD.add([
            "",
            `— Case 5 RNG —`,
            `a=${knobs.a.toFixed(3)} b=${knobs.b.toFixed(3)} c=${knobs.c.toFixed(3)} d=${knobs.d.toFixed(3)}`,
            `k=${k}  angleSpan=${angleSpan.toFixed(3)}  rad≈${rad.toFixed(2)}`
          ].join("\n"));
        }

        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          const ang = t * angleSpan - angleSpan / 2;
          const rr = rad * circlesInRow * rng.case5.b;
          const x = cX + rr * Math.cos(ang);
          const sawLocal = (ang / Math.PI) % 0.005;
          const sharp = 2 * sawLocal - 1;
          const y = baseY + rr * Math.sin(ang) * (0.7 + 0.3 * Math.abs(sharp));

          if (x >= 0 && x <= w && y >= 0 && y <= h)
            drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;

      case 6: {
        const k = Math.max(1, Math.floor(Math.abs(rng.case6.c)));
        const angleSpan = pi * k;
        const cX = w / rng.case6.d;
        const growth = (row / numRows) * rng.case6.a;
        const rad = baseRadius / 4 + growth * baseRadius;
        const mult = rng.case6.b;
        const driftPerRow = h * rng.case6.drift;

        if (!hudOnce.done) {
          hudOnce.done = true;
          const knobs = rng.case6;
          HUD.add([
            "",
            `— Case 6 RNG —`,
            `a=${knobs.a.toFixed(3)} b=${knobs.b.toFixed(3)} c=${knobs.c.toFixed(3)} d=${knobs.d.toFixed(3)}`,
            `mult=${mult.toFixed(3)} driftPerRow=${driftPerRow.toFixed(3)}  rad≈${rad.toFixed(2)}`,
            `k=${k}  angleSpan=${angleSpan.toFixed(3)}`
          ].join("\n"));
        }

        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          const ang = t * angleSpan - angleSpan / 2;
          const rr = rad * circlesInRow * mult;
          const x = cX + rr * Math.cos(ang);
          const y = currentY + (row - numRows / 2) * driftPerRow + rr * Math.sin(ang);

          if (x >= 0 && x <= w && y >= 0 && y <= h)
            drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;

      case 7: {
        const k = Math.max(1, Math.floor(Math.abs(rng.case7.c)));
        const angleSpan = pi * k;
        const growth = (row / numRows) * rng.case7.a;
        const rad = baseRadius / 4 + growth * baseRadius;
        const mult = rng.case7.b;
        const baseYOptions = [currentY, currentY, HEIGHT, HEIGHT / 2, 0];
        const baseY = baseYOptions[(rng.case7.f * baseYOptions.length) | 0];

        if (!hudOnce.done) {
          hudOnce.done = true;
          const knobs = rng.case7;
          HUD.add([
            "",
            `— Case 7 RNG —`,
            `a=${knobs.a.toFixed(3)} b=${knobs.b.toFixed(3)} c=${knobs.c.toFixed(3)} d=${knobs.d.toFixed(3)}`,
            `mult=${mult.toFixed(3)} baseY=${Math.round(baseY)}  rad≈${rad.toFixed(2)}`,
            `k=${k}  angleSpan=${angleSpan.toFixed(3)}`
          ].join("\n"));
        }

        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          const ang = t * angleSpan - angleSpan / 2;
          const rr = rad * circlesInRow * mult;
          const x = WIDTH / 2 + rr * Math.cos(ang);
          const s = Math.sin(ang);
          const epsOptions = [0.01, 0.001, 0.00001, 0.1, 1];
          const eps = epsOptions[(rng.case7.e * epsOptions.length) | 0];
          const y = baseY + rr * Math.sign(s) * Math.min(1, Math.abs(s) + eps);

          if (x >= 0 && x <= w && y >= 0 && y <= h)
            drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;

      case 8: {
        const k = Math.max(1, Math.floor(Math.abs(rng.case8.c)));
        const angleSpan = pi * k;
        const cX = w / rng.case8.d;
        const growth = (row / numRows) * rng.case8.a;
        const rad = baseRadius / 4 + growth * baseRadius;
        const mult = rng.case8.b;

        if (!hudOnce.done) {
          hudOnce.done = true;
          const knobs = rng.case8;
          HUD.add([
            "",
            `— Case 8 RNG —`,
            `a=${knobs.a} b=${knobs.b.toFixed(3)} c=${knobs.c.toFixed(3)} d=${knobs.d.toFixed(3)}`,
            `k=${k}  angleSpan=${angleSpan.toFixed(3)}  rad≈${rad.toFixed(2)} mult=${mult.toFixed(2)}`
          ].join("\n"));
        }

        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          const ang = t * angleSpan - angleSpan / 2;
          const rr = rad * circlesInRow * mult;
          const x = cX + rr * Math.cos(ang);
          const y = currentY + rr * Math.sin(ang);

          if (x >= 0 && x <= w && y >= 0 && y <= h)
            drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;

      case 9: {
        const k = Math.max(1, Math.floor(Math.abs(rng.case9.c)));
        const angleSpan = pi * k;
        const cX = w / rng.case9.d;
        const growth = (row / numRows) * rng.case9.a;
        const rad = baseRadius / 4 + growth * baseRadius;
        const mult = rng.case9.b;

        if (!hudOnce.done) {
          hudOnce.done = true;
          const knobs = rng.case9;
          HUD.add([
            "",
            `— Case 9 RNG —`,
            `a=${knobs.a.toFixed(3)} b=${knobs.b.toFixed(3)} c=${knobs.c.toFixed(3)} d=${knobs.d.toFixed(3)} e=${knobs.e.toFixed(3)}`,
            `k=${k}  angleSpan=${angleSpan.toFixed(3)}  rad≈${rad.toFixed(2)} mult=${mult.toFixed(2)}`
          ].join("\n"));
        }

        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          const ang = t * angleSpan - angleSpan / 2;
          const rr = rad * circlesInRow * mult;
          const x = cX + rr * Math.cos(ang);
          const y = h * rng.case9.e + rr * Math.sin(ang);

          if (x >= 0 && x <= w && y >= 0 && y <= h)
            drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;

      case 10: {
        const k = Math.max(1, Math.floor(Math.abs(rng.case10.c)));
        const angleSpan = pi * k;
        const cX = w / rng.case10.d;
        const growth = (row / numRows) * rng.case10.a;
        const rad = baseRadius / 4 + growth * baseRadius;
        const mult = rng.case10.b;

        if (!hudOnce.done) {
          hudOnce.done = true;
          const knobs = rng.case10;
          HUD.add([
            "",
            `— Case 10 RNG —`,
            `a=${knobs.a.toFixed(3)} b=${knobs.b.toFixed(3)} c=${knobs.c.toFixed(3)} d=${knobs.d.toFixed(3)}`,
            `k=${k}  angleSpan=${angleSpan.toFixed(3)}  rad≈${rad.toFixed(2)} mult=${mult.toFixed(2)}`
          ].join("\n"));
        }

        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          const ang = t * angleSpan - angleSpan / 2;
          const rr = (i + 1) * rad * mult;
          const x = cX + rr * Math.cos(ang);
          const y = currentY + rr * Math.sin(ang);

          if (x >= 0 && x <= w && y >= 0 && y <= h)
            drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;

      case 11: {
        const k = Math.max(1, Math.floor(Math.abs(rng.case11.c)));
        const angleSpan = pi * k;
        const growth = (row / numRows) * rng.case11.a;
        const rad = baseRadius / 4 + growth * baseRadius;
        const fx = rng.case11.fx, fy = rng.case11.fy, ph = rng.case11.phase;
        const cx = w / rng.case11.d;
        if (!hudOnce.done) {
          hudOnce.done = true;
          HUD.add(["","— Case 11 —", JSON.stringify({fx,fy,ph:ph.toFixed(2)})].join("\n"));
        }
        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          const ang = t * angleSpan - angleSpan / 2;
          const A = rad * circlesInRow;
          const x = cx + A * Math.sin(fx * ang + ph);
          const y = currentY + A * Math.sin(fy * ang);
          if (x>=0 && x<=w && y>=0 && y<=h) drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;

      case 12: {
        const k = Math.max(1, Math.floor(Math.abs(rng.case12.c)));
        const angleSpan = pi * k;
        const baseYOptions = [HEIGHT / 2, currentY, HEIGHT, HEIGHT / 2, 0];
        const baseY = baseYOptions[(rng.case12.f * baseYOptions.length) | 0];
        const growth = (row / numRows) * rng.case12.a;
        const rad = baseRadius / 4 + growth * baseRadius;
        const mult = rng.case12.b;
        const cxA = rng.case12.cxA, cxB = rng.case12.cxB;
        const useA = (row % 2 === 0);
        const cx = useA ? cxA : cxB;
        if (!hudOnce.done) {
          hudOnce.done = true;
          HUD.add(["","— Case 12 —", JSON.stringify({cxA:Math.round(cxA),cxB:Math.round(cxB)})].join("\n"));
        }
        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          const ang = t * angleSpan - angleSpan / 2;
          const rr = rad * circlesInRow * mult;
          const x = cx + rr * Math.cos(ang);
          const y = baseY + rr * Math.sin(ang);
          if (x>=0 && x<=w && y>=0 && y<=h) drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;

      case 13: { 
        const k = Math.max(1, Math.floor(Math.abs(rng.case13.c)));
        const angleSpan = pi * k;
        const baseYOptions = [currentY];
        const baseY = baseYOptions[(rng.case13.f * baseYOptions.length) | 0];
        const growth = (row / numRows) * rng.case13.a;
        const rad = baseRadius / 4 + growth * baseRadius;
        const mult = rng.case13.b;
        const cx = w / rng.case13.d;
        const klog = rng.case13.klog;
        if (!hudOnce.done) {
          hudOnce.done = true;
          HUD.add(["","— Case 13 —", JSON.stringify({klog:klog.toFixed(3)})].join("\n"));
        }
        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          const ang0 = t * angleSpan - angleSpan / 2;
          const ang = ang0;
          const rr = rad * circlesInRow * mult * Math.exp(klog * ang);
          const x = cx + rr * Math.cos(ang);
          const y = baseY + rr * Math.sin(ang);
          if (x>=0 && x<=w && y>=0 && y<=h) drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;

      case 21: { 
        const k = Math.max(1, Math.floor(Math.abs(rng.case21.c)));
        const angleSpan = pi * k;
        const baseYOptions = [HEIGHT / 2];
        const baseY = baseYOptions[(rng.case21.f * baseYOptions.length) | 0];
        const growth = (row / numRows) * rng.case21.a;
        const rad = baseRadius / 4 + growth * baseRadius;
        const mult = rng.case21.b;
        const cx = w / rng.case21.d;
        const klog = rng.case21.klog;
        if (!hudOnce.done) {
          hudOnce.done = true;
          HUD.add(["","— Case 21 —", JSON.stringify({klog:klog.toFixed(3)})].join("\n"));
        }
        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          const ang0 = t * angleSpan - angleSpan / 2;
          const ang = ang0;
          const rr = rad * circlesInRow * mult * Math.exp(klog * ang);
          const x = cx + rr * Math.cos(ang);
          const y = baseY + rr * Math.sin(ang);
          if (x>=0 && x<=w && y>=0 && y<=h) drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;

      case 14: { 
        const k = Math.max(1, Math.floor(Math.abs(rng.case14.c)));
        const angleSpan = pi * k;
        const growth = (row / numRows) * rng.case14.a;
        const rad = baseRadius / 4 + growth * baseRadius;
        const mult = rng.case14.b * rng.case14.scale;
        const cx = w / rng.case14.d;
        if (!hudOnce.done) {
          hudOnce.done = true;
          HUD.add(["","— Case 14 —", JSON.stringify({scale:rng.case14.scale.toFixed(2)})].join("\n"));
        }
        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          const ang = t * angleSpan - angleSpan / 2;
          const rr = rad * circlesInRow * mult;
          const x = cx + rr * Math.sin(ang);
          const y = HEIGHT/2 + rr * Math.sin(ang) * Math.cos(ang) * 2;
          if (x>=0 && x<=w && y>=0 && y<=h) drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;

      case 15: {
        const k = Math.max(1, Math.floor(Math.abs(rng.case15.c)));
        const angleSpan = pi * k;
        const growth = (row / numRows) * rng.case15.a;
        const rad = baseRadius / 4 + growth * baseRadius;
        const mult = rng.case15.b;
        const wob = rng.case15.wobble;
        const cx = w / rng.case15.d;
        if (!hudOnce.done) {
          hudOnce.done = true;
          HUD.add(["","— Case 15 —", JSON.stringify({wob:wob.toFixed(3)})].join("\n"));
        }
        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          let ang = t * angleSpan - angleSpan / 2;
          ang += (Math.random() - 0.5) * wob;
          const rr = rad * circlesInRow * mult;
          const x = cx + rr * Math.cos(ang);
          const y = HEIGHT/2 + rr * Math.sin(ang);
          if (x>=0 && x<=w && y>=0 && y<=h) drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;
      
      case 22: {
        const k = Math.max(1, Math.floor(Math.abs(rng.case22.c)));
        const angleSpan = pi * k;
        const growth = (row / numRows) * rng.case22.a;
        const rad = baseRadius / 4 + growth * baseRadius;
        const mult = rng.case22.b;
        const wob = rng.case22.wobble;
        const cx = w / rng.case22.d;
        if (!hudOnce.done) {
          hudOnce.done = true;
          HUD.add(["","— Case 15 —", JSON.stringify({wob:wob.toFixed(3)})].join("\n"));
        }
        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          let ang = t * angleSpan - angleSpan / 2;
          ang += (Math.random() - 0.5) * wob;
          const rr = rad * circlesInRow * mult;
          const x = cx + rr * Math.cos(ang);
          const y = HEIGHT/2 + rr * Math.sin(ang);
          if (x>=0 && x<=w && y>=0 && y<=h) drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;

      case 16: {
        const k = Math.max(1, Math.floor(Math.abs(rng.case16.c)));
        const angleSpan = pi * k;
        const growth = (row / numRows) * rng.case16.a;
        const baseYOptions = [HEIGHT / 2, currentY, currentY, HEIGHT / 2, HEIGHT*rng.case16.g];
        const baseY = baseYOptions[(rng.case16.f * baseYOptions.length) | 0];
        const rad = baseRadius / 4 + growth * baseRadius;
        const mult = rng.case16.b;
        const cx = w / rng.case16.d;
        const amp = rng.case16.amp;
        const freq = rng.case16.freq;
        if (!hudOnce.done) {
          hudOnce.done = true;
          HUD.add(["","— Case 16 —", JSON.stringify({amp:Math.round(amp),freq})].join("\n"));
        }
        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          const ang = t * angleSpan - angleSpan / 2;
          const rr = rad * circlesInRow * mult;
          const x = cx + rr * Math.cos(ang) + Math.sin(freq * t * 2 * Math.PI) * amp;
          const y = baseY + rr * Math.sin(ang);
          if (x>=0 && x<=w && y>=0 && y<=h) drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;

      case 17: {
        const k = Math.max(1, Math.floor(Math.abs(rng.case17.c)));
        const angleSpan = pi * k;
        const baseYOptions = [HEIGHT/2,HEIGHT*rng.case17.j];
        const baseY = baseYOptions[(rng.case17.f * baseYOptions.length) | 0];
        const growth = (row / numRows) * rng.case17.a;
        const rad = baseRadius / 4 + growth * baseRadius;
        const mult = rng.case17.b;
        const cx = w / rng.case17.d;
        const krose = rng.case17.krose;
        if (!hudOnce.done) {
          hudOnce.done = true;
          HUD.add(["","— Case 17 —", JSON.stringify({krose})].join("\n"));
        }
        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          const ang = t * angleSpan - angleSpan / 2;
          const R = rad * circlesInRow * mult;
          const rr = R * Math.cos(krose * ang);
          const x = cx + rr * Math.cos(ang);
          const y = baseY + rr * Math.sin(ang);
          if (x>=0 && x<=w && y>=0 && y<=h) drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;

      case 18: {
        const k = Math.max(1, Math.floor(Math.abs(rng.case18.c)));
        const angleSpan = pi * k;
        const growth = (row / numRows) * rng.case18.a;
        const rad = baseRadius / 4 + growth * baseRadius;
        const shells = rng.case18.shells;
        const gap = rng.case18.gap;
        const cx = w / rng.case18.d;
        if (!hudOnce.done) {
          hudOnce.done = true;
          HUD.add(["","— Case 18 —", JSON.stringify({shells,gap:gap.toFixed(2)})].join("\n"));
        }
        for (let s = 1; s <= shells; s++) {
          for (let i = 0; i < circlesInRow; i++) {
            const t = i / Math.max(1, circlesInRow - 1);
            const ang = t * angleSpan - angleSpan / 2;
            const rr = s * rad * circlesInRow * gap;
            const x = cx + rr * Math.cos(ang);
            const y = HEIGHT/2 + rr * Math.sin(ang);
            if (x>=0 && x<=w && y>=0 && y<=h) drawCircleWithSpiralFill(inkLayer, x, y, rad * 0.9);
          }
        }
      } break;

      case 19: {
        const k = Math.max(1, Math.floor(Math.abs(rng.case19.c)));
        const angleSpan = pi * k;
        const growth = (row / numRows) * rng.case19.a;
        const rad = baseRadius / 4 + growth * baseRadius;
        const mult = rng.case19.b;
        const cx = w / rng.case19.d;
        const ph = rng.case19.phase;
        const off = rng.case19.offset;
        if (!hudOnce.done) {
          hudOnce.done = true;
          HUD.add(["","— Case 19 —", JSON.stringify({off:off.toFixed(2)})].join("\n"));
        }
        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          const ang = t * angleSpan - angleSpan / 2;
          const rr = rad * circlesInRow * mult;
          const x = cx + rr * Math.cos(ang + ph * ((i & 1) ? 1 : -1));
          const y = HEIGHT/2 +  rr * Math.sin(ang) * ((i & 1) ? off : 1 - off);
          if (x>=0 && x<=w && y>=0 && y<=h) drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;

      case 20: {
        const k = Math.max(1, Math.floor(Math.abs(rng.case20.c)));
        const angleSpan = pi * k;
        const growth = (row / numRows) * rng.case20.a;
        const rad = baseRadius / 4 + growth * baseRadius;
        const mult = rng.case20.b;
        const cx = w / rng.case20.d;
        const B = rng.case20.buckets;
        if (!hudOnce.done) {
          hudOnce.done = true;
          HUD.add(["","— Case 20 —", JSON.stringify({B})].join("\n"));
        }
        for (let i = 0; i < circlesInRow; i++) {
          const t = i / Math.max(1, circlesInRow - 1);
          const ang0 = t * angleSpan - angleSpan / 2;
          const idx = Math.floor(((ang0 + pi) / (2 * pi)) * B);
          const arcStart = -pi + (idx    ) * (2 * pi / B);
          const arcEnd   = -pi + (idx + 1) * (2 * pi / B);
          const ang = arcStart + (arcEnd - arcStart) * 0.5;
          const rr = rad * circlesInRow * mult;
          const x = cx + rr * Math.cos(ang);
          const y = currentY + rr * Math.sin(ang);
          if (x>=0 && x<=w && y>=0 && y<=h) drawCircleWithSpiralFill(inkLayer, x, y, rad);
        }
      } break;

    }

    currentY -= 2 * baseRadius + (h * spacing);
  }
}

const serializer = new XMLSerializer();

const makeSvg = () => {
  const svg = punk("svg", nsSvg);
  goth(svg, "version", "1.1");
  goth(svg, "viewBox", `0 0 ${w} ${h}`);
  goth(svg, "width",  w);
  goth(svg, "height", h);

  createBackground(svg);
  ensureDefs(svg);
  const inkLayer = punk("g"); goth(inkLayer, "id", "ink-layer");
  emo(svg, inkLayer);
  drawCirclesInRows(inkLayer);

  svg.style.display = "block";
  svg.style.margin  = "0 auto";
  return svg;
};

function createTempCanvas(image) {
  const temp = document.createElement("canvas");
  temp.width = w; temp.height = h;
  const ctx = temp.getContext("2d");
  ctx.drawImage(image, 0, 0, w, h);
  return ctx;
}

function luminance(r, g, b) { return 0.2126 * r + 0.7152 * g + 0.0722 * b; }

function addGrainGeneric(context, tempContext, W, H, opts) {
  const {
    lineWidth,
    grainDensity,
    curveIntensity,
    angleVar = 0.1,
    lumThreshold = 128,
    darkAlpha = 0.05,
    lightAlpha = 0.10,
    sampleOffset = 0.75
  } = opts;

  const data = tempContext.getImageData(0, 0, W, H).data;
  const stride = W * 4;

  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v|0));
  const getLum = (x, y) => {
    const ix = clamp(x, 0, W - 1);
    const iy = clamp(y, 0, H - 1);
    const idx = iy * stride + (ix << 2);
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.globalCompositeOperation = "source-over";

  for (let y = 0; y < H; y += grainDensity) {
    const angle = angleVar * Math.random() - angleVar / 2;
    const segments = 60 + ((Math.random() * 60) | 0);
    const segW = W / segments;

    const rowPhase = (Math.random() * 2 - 1) * segW;

    context.save();
    context.translate(W / 2, 0);

    let px = -W / 2 - rowPhase;
    let py = Math.max(Math.min(y + (W / 2 + rowPhase) * Math.tan(angle), H), 0);

    for (let j = 1; j <= segments; j++) {
      const ex = -W / 2 + j * segW - rowPhase;
      const ey = y;

      const cp1x = px + Math.random() * curveIntensity - curveIntensity / 2;
      const cp1y = py + Math.random() * curveIntensity - curveIntensity / 2;
      const cp2x = ex - Math.random() * curveIntensity + curveIntensity / 2;
      const dy   = Math.random() * curveIntensity - curveIntensity / 2;
      const cp2y = Math.max(Math.min(y + dy, H), 0);

      const L = getLum(ex + W / 2, ey + sampleOffset);

      const color = (L >= lumThreshold)
        ? `rgba(0,0,0,${darkAlpha})`
        : `rgba(255,255,255,${lightAlpha})`;

      context.beginPath();
      context.moveTo(px, py);
      context.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, ex, ey);
      context.strokeStyle = color;
      context.stroke();

      px = ex; py = ey;
    }

    context.restore();
  }
}

function addGrain(context, tempContext) {
  const lineWidth      = (0.05 * h) / 931;
  const grainDensity   = Math.max(1, (0.2  * h) / 931);
  const curveIntensity = (7    * h) / 931;

  addGrainGeneric(context, tempContext, w, h, {
    lineWidth,
    grainDensity,
    curveIntensity,
    angleVar: 0.1,
    lumThreshold: 128,
    darkAlpha: 0.05,
    lightAlpha: 0.10
  });
}

function addGrainHighRes(context, tempContext, bigW, bigH, lineWidth, grainDensity, curveIntensity) {
  addGrainGeneric(context, tempContext, bigW, bigH, {
    lineWidth,
    grainDensity: Math.max(1, grainDensity),
    curveIntensity,
    angleVar: 0.1,
    lumThreshold: 128,
    darkAlpha: 0.05,
    lightAlpha: 0.10
  });
}

function saveSvg() {
  const svgElement = document.getElementById("myFinalSVG");
  if (!svgElement) return;
  const svgString = new XMLSerializer().serializeToString(svgElement);
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = "SpaceTime.svg";
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
}

function savePngHighResWithGrain(longSidePx = 8000) {
  if (!originalSvgString) {
    const temp = makeSvg();
    originalSvgString = temp.outerHTML;
  }
  const portrait = ASPECT < 1;
  const bigH = portrait ? longSidePx : Math.round(longSidePx / ASPECT);
  const bigW = portrait ? Math.round(longSidePx * ASPECT) : longSidePx;

  downloadHighResWithGrain(originalSvgString, bigW, bigH).then((pngUrl) => {
    const link = document.createElement("a");
    link.download = `SpaceTime_${bigW}x${bigH}.png`;
    link.href = pngUrl;
    link.click();
  });
}

async function downloadHighResWithGrain(svgString, bigW, bigH) {
  const updatedSvgString = svgString
    .replace(`width="${w}"`,  `width="${bigW}"`)
    .replace(`height="${h}"`, `height="${bigH}"`)
    .replace(`viewBox="0 0 ${w} ${h}"`, `viewBox="0 0 ${w} ${h}"`);

  const blob = new Blob([updatedSvgString], { type: "image/svg+xml;charset=utf-8" });
  const url  = URL.createObjectURL(blob);

  const highResCanvas = document.createElement("canvas");
  highResCanvas.width = bigW; highResCanvas.height = bigH;
  const ctx = highResCanvas.getContext("2d");

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, bigW, bigH);
      ctx.drawImage(img, 0, 0, bigW, bigH);

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = bigW; tempCanvas.height = bigH;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.drawImage(img, 0, 0, bigW, bigH);

      const lineWidth      = (0.05 * bigH) / 931;
      const grainDensity   = (0.2  * bigH) / 931;
      const curveIntensity = (7    * bigH) / 931;

      addGrainHighRes(ctx, tempCtx, bigW, bigH, lineWidth, grainDensity, curveIntensity);

      const pngUrl = highResCanvas.toDataURL("image/png");
      URL.revokeObjectURL(url);
      resolve(pngUrl);
    };
    img.src = url;
  });
}

window.addEventListener("load", function () {
  const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));

  const canvas = document.createElement("canvas");
  canvas.id = "myCanvas";
  canvas.style.width  = w + "px";
  canvas.style.height = h + "px";
  canvas.width  = Math.round(w * DPR);
  canvas.height = Math.round(h * DPR);

  let wrap = document.getElementById("mopey");
  if (!wrap) { wrap = document.body; }
  emo(wrap, canvas);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.imageSmoothingEnabled = true;

  const svg = makeSvg();
  svg.id = "myFinalSVG";
  document.body.appendChild(svg);
  originalSvgString = svg.outerHTML;

  const outerHTML = new XMLSerializer().serializeToString(svg);
  svg.style.display = "none";
  const blob = new Blob([outerHTML], { type: "image/svg+xml" });
  const blobURL = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const tempCtx = createTempCanvas(img);
    if (!isMachine) {
      addGrain(ctx, tempCtx);
    }
    URL.revokeObjectURL(blobURL);

    // signal preview capture ready
    capturePreview();
  };
  img.src = blobURL;

  document.body.addEventListener("keypress", (e) => {
    if (e.key === "s") saveSvg();
    if (e.key === "p") savePngHighResWithGrain(8000);
  });

  // If p5 is present in global mode, set its seeds explicitly as well
  if (typeof window.randomSeed === "function") window.randomSeed(SEED);
  if (typeof window.noiseSeed  === "function") window.noiseSeed(SEED);
});

