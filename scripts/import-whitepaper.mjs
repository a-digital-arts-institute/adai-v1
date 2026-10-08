#!/usr/bin/env node
// Import a whitepaper release from the Google Doc (File → Download → .docx)
// into public/whitepaper/v<version>/ — markdown + WebP figures — for review
// in a PR. Host-only: needs `pandoc` and `cwebp`/`webpinfo` (brew install
// pandoc webp). Never runs in the image.
//
//   node scripts/import-whitepaper.mjs <file.docx> <version> [--stop "<line>"] [--force]
//
// A .docx export flattens EVERY tab of the doc into one file. The paper is
// taken from its title (the first `# ` heading — the Philosophy tab has none)
// up to, not including, the first line that equals --stop (default: the
// "A(DAI) Data Commons Brief" title that follows the appendices in v1.7).
// Read the result before committing: anything after the paper that the stop
// line didn't catch (briefs, drafts, call notes) must not ship.
//
// Mechanical only — the prose is copied verbatim. Figures become
// <figure><img><figcaption>, with an adjacent "Figure N: …" paragraph folded
// in as the caption. Diagrams drawn as text in the doc (v1.7's Figure 8) are
// left as text: hand-convert them (see v1.7 for the `figure.flow` markup).

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_WIDTH = 1600;

function usage(msg) {
  if (msg) console.error(`error: ${msg}\n`);
  console.error('usage: node scripts/import-whitepaper.mjs <file.docx> <version> [--stop "<line>"] [--force]');
  process.exit(2);
}

const args = process.argv.slice(2);
const pos = [];
let stop = "**A(DAI) Data Commons Brief**";
let force = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--stop") stop = args[++i] ?? usage("--stop needs a value");
  else if (args[i] === "--force") force = true;
  else if (args[i].startsWith("--")) usage(`unknown flag ${args[i]}`);
  else pos.push(args[i]);
}
const [docx, version] = pos;
if (!docx || !version) usage();
if (!/^\d+(?:\.\d+)*$/.test(version)) usage(`version must look like 1.8, got "${version}"`);
if (!fs.existsSync(docx)) usage(`no such file: ${docx}`);

const outDir = path.join(ROOT, "public", "whitepaper", `v${version}`);
if (fs.existsSync(outDir) && !force) usage(`${path.relative(ROOT, outDir)} exists (pass --force to overwrite)`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "adai-whitepaper-"));
const run = (cmd, argv) => execFileSync(cmd, argv, { encoding: "utf-8", stdio: ["ignore", "pipe", "inherit"] });

run("pandoc", [path.resolve(docx), "-t", "gfm", "--wrap=none", `--extract-media=${tmp}`, "-o", path.join(tmp, "raw.md")]);
const lines = fs.readFileSync(path.join(tmp, "raw.md"), "utf-8").split("\n");

const start = lines.findIndex((l) => /^# \S/.test(l));
if (start === -1) usage("no `# ` title heading found in the export");
let end = lines.findIndex((l, i) => i > start && l.trim() === stop);
if (end === -1) {
  console.warn(`warning: stop line ${JSON.stringify(stop)} not found — taking everything after the title`);
  end = lines.length;
}
let t = lines.slice(start, end).join("\n");

// --- structural cleanup (the docx → gfm artefacts) ---------------------------
t = t.replace(/[-​﻿]/g, "");
t = t.replace(/^(#+) \*\*(.+?)\*\*\s*$/gm, "$1 $2");
t = t.replace(/\[<u>(.+?)<\/u>\]/g, "[$1]");
t = t.replace(/<span class="mark">(.*?)<\/span>/g, "$1");
t = t.replace(/\\\n(\\\n)?/g, "\n\n");
// Google Docs tables export with an empty header row and the real (bold)
// header as the first body row.
t = t.replace(/^\|[ |]*\|\n\|[-:| ]+\|\n((?:\|.*\|\n?)+)/gm, (_m, body) => {
  const [first, ...rest] = body.replace(/\n$/, "").split("\n");
  const cells = first.replace(/^\||\|$/g, "").split("|").map((c) => c.trim().replace(/^\*\*(.*)\*\*$/, "$1"));
  return [`| ${cells.join(" | ")} |`, `|${cells.map(() => "---").join("|")}|`, ...rest].join("\n") + "\n";
});
t = t.replace(/^· /gm, "- ");

// --- figures ----------------------------------------------------------------
fs.mkdirSync(outDir, { recursive: true });
const IMG = /<img src="([^"]+)"[^>]*\/>/g;
const CAPTION = /^(?:Figure \d+:\s*)?\*?(?:Figure (\d+):\s*)(.+?)\*?$/;
const paras = t.split(/\n{2,}/);
const used = new Set();
let seq = 0;
for (let i = 0; i < paras.length; i++) {
  const p = paras[i];
  // A caption sometimes sits on the image's own line (`*Figure 1: …*<img …/>`).
  const inline = p.replace(IMG, "").trim();
  const srcs = [...p.matchAll(IMG)].map((m) => m[1]);
  if (!srcs.length) continue;
  let num = null, caption = null;
  const tryCaption = (s, at) => {
    const m = CAPTION.exec((s ?? "").trim());
    if (!m || caption) return;
    num = m[1]; caption = m[2].trim();
    if (at !== null) used.add(at);
  };
  if (inline) tryCaption(inline, null);
  tryCaption(paras[i - 1], i - 1);
  tryCaption(paras[i + 1], i + 1);
  const n = num ?? String(++seq);
  if (num) seq = Math.max(seq, Number(num));
  const imgs = srcs.map((src, k) => {
    const name = `fig-${n}${srcs.length > 1 ? String.fromCharCode(97 + k) : ""}.webp`;
    const abs = path.isAbsolute(src) ? src : path.join(tmp, src);
    const out = path.join(outDir, name);
    const webp = (resize) => {
      run("cwebp", ["-quiet", "-q", "84", "-m", "6", ...(resize ? ["-resize", String(MAX_WIDTH), "0"] : []), abs, "-o", out]);
      const info = run("webpinfo", [out]);
      return [Number(/Width: (\d+)/.exec(info)[1]), Number(/Height: (\d+)/.exec(info)[1])];
    };
    // Downscale to MAX_WIDTH, never up: -resize would also enlarge a small image.
    let [w, h] = webp(false);
    if (w > MAX_WIDTH) [w, h] = webp(true);
    const alt = (caption ?? `Figure ${n}`).replace(/"/g, "&quot;");
    return `<img src="${name}" width="${w}" height="${h}" alt="${alt}" loading="lazy">`;
  });
  paras[i] =
    `<figure id="figure-${n}">\n${imgs.join("\n")}\n` +
    (caption ? `<figcaption>Figure ${n}: ${caption}</figcaption>\n` : "") +
    `</figure>`;
}
t = paras.filter((_, i) => !used.has(i)).join("\n\n");

// --- lists: pandoc spaces every item as its own paragraph ---------------------
for (let k = 0; k < 2; k++) {
  t = t.replace(/^(- .+)\n\n(?=- )/gm, "$1\n");
  t = t.replace(/^(\d+\.\s+.+)\n\n(?=\d+\.\s)/gm, "$1\n");
}
t = t.replace(/^(\d+)\.\s+/gm, "$1. ");
t = t.replace(/^(#+ .+)\n(?!\n)/gm, "$1\n\n");
t = t.replace(/\n{3,}/g, "\n\n").trim() + "\n";

fs.writeFileSync(path.join(outDir, "whitepaper.md"), t);
fs.rmSync(tmp, { recursive: true, force: true });

const rel = path.relative(ROOT, outDir);
const leftover = (t.match(/<img src="(?!fig-)/g) ?? []).length;
console.log(`wrote ${rel}/whitepaper.md + ${fs.readdirSync(outDir).filter((f) => f.endsWith(".webp")).length} figures`);
if (leftover) console.warn(`warning: ${leftover} image(s) not converted`);
console.log(`
next:
  1. read ${rel}/whitepaper.md end to end — it must hold the paper and nothing else
  2. hand-convert any text-drawn diagrams (v1.7 Figure 8 → <figure class="flow">)
  3. add { "version": "${version}", "published": "<Month YYYY>" } at the TOP of public/whitepaper/versions.json
  4. npm test, then open http://localhost:8080/whitepaper`);
