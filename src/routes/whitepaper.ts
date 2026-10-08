// /whitepaper — the A(DAI) whitepaper, served from markdown committed under
// public/whitepaper/v<version>/whitepaper.md. Each version is a release: its
// own directory, its own figures, its own permanent URL (/whitepaper/v1.7),
// so a citation of "v1.7 §5" never moves. /whitepaper is the newest entry in
// versions.json. The raw markdown and the figures are served from the same
// directory (/whitepaper/v1.7/whitepaper.md, …/fig-1.webp).
//
// The markdown is trusted repo content (raw HTML passes through: <figure>).
// Rendered once per version in production; re-read on every request in dev
// so edits show up without a restart.

import { Router } from "express";
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Marked } from "marked";
import { htmlPage, htmlEscape, HTML_HEADERS } from "../templates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const WHITEPAPER_DIR = path.join(__dirname, "..", "..", "public", "whitepaper");

const VERSION_RE = /^\d+(?:\.\d+)*$/;
const DEV = process.env.NODE_ENV !== "production";

interface Version { version: string; published: string }
interface Rendered { title: string; toc: { id: string; label: string }[]; html: string }

function readVersions(): Version[] {
  const list = JSON.parse(fs.readFileSync(path.join(WHITEPAPER_DIR, "versions.json"), "utf-8")) as Version[];
  return list.filter((v) => VERSION_RE.test(v.version));
}

export function headingId(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&[a-z]+;|&#\d+;/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const stripTags = (s: string) => s.replace(/<[^>]+>/g, "");

export function renderWhitepaper(markdown: string, assetBase: string): Rendered {
  const toc: Rendered["toc"] = [];
  const seen = new Map<string, number>();
  let title = "";
  const md = new Marked({ gfm: true });
  md.use({
    renderer: {
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const label = stripTags(inner);
        if (depth === 1) {
          if (!title) title = label;
          return `<h1>${inner}</h1>\n`;
        }
        let id = headingId(label) || "section";
        const n = seen.get(id) ?? 0;
        seen.set(id, n + 1);
        if (n) id = `${id}-${n + 1}`;
        if (depth === 2) toc.push({ id, label });
        return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true">§</a>${inner}</h${depth}>\n`;
      },
    },
  });
  let html = md.parse(markdown, { async: false }) as string;
  // Tables scroll sideways inside their own box on a phone, not the page.
  html = html.replace(/<table>/g, '<div class="tbl"><table>').replace(/<\/table>/g, "</table></div>");
  // Figure paths in the markdown are relative to its own directory.
  html = html.replace(/(<img\b[^>]*\bsrc=")(?![a-z][a-z0-9+.-]*:|\/)([^"]+)"/gi, `$1${assetBase}$2"`);
  return { title, toc, html };
}

const cache = new Map<string, Rendered>();

function rendered(version: string): Rendered | null {
  if (!DEV && cache.has(version)) return cache.get(version)!;
  const file = path.join(WHITEPAPER_DIR, `v${version}`, "whitepaper.md");
  if (!fs.existsSync(file)) return null;
  const r = renderWhitepaper(fs.readFileSync(file, "utf-8"), `/whitepaper/v${version}/`);
  if (!DEV) cache.set(version, r);
  return r;
}

const CSS = `
#whitepaper {
  --bg:#ffffff; --ink:#161513; --dim:#8d8a82; --faint:#d9d6cd; --box:#fbfaf7; --accent:#4169B0;
  font-family: 'SF Mono','SFMono-Regular',Menlo,'DejaVu Sans Mono','Liberation Mono',Consolas,monospace;
  background: var(--bg); color: var(--ink); border: 1px solid var(--faint);
  margin: 8px 0 24px; padding: 34px 40px 44px;
}
#whitepaper * { box-sizing: border-box; }
#whitepaper a { color: var(--ink); text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--faint); }
#whitepaper a:hover { text-decoration-color: var(--ink); }
#whitepaper .wp-meta { display: flex; flex-wrap: wrap; gap: 6px 18px; color: var(--dim); font-size: 12px; letter-spacing: .04em; margin: 0 0 22px; }
#whitepaper .wp-meta a { color: var(--dim); }
#whitepaper .wp-meta b { color: var(--ink); font-weight: 700; }
#whitepaper h1 { font-size: 23px; line-height: 1.3; margin: 0 0 14px; color: var(--ink); }
#whitepaper h2 { font-size: 18px; line-height: 1.35; margin: 46px 0 14px; padding-top: 22px; border-top: 1px solid var(--faint); color: var(--ink); font-family: inherit; }
#whitepaper h3 { font-size: 14.5px; margin: 28px 0 10px; color: var(--ink); font-family: inherit; }
#whitepaper h2, #whitepaper h3 { position: relative; scroll-margin-top: 16px; }
#whitepaper .anchor { position: absolute; left: -1.3em; color: var(--faint); text-decoration: none; opacity: 0; }
#whitepaper h2:hover .anchor, #whitepaper h3:hover .anchor, #whitepaper .anchor:focus { opacity: 1; }
#whitepaper p, #whitepaper li { font-size: 14.5px; line-height: 1.75; color: var(--ink); }
#whitepaper p { margin: 0 0 15px; }
#whitepaper ul, #whitepaper ol { margin: 0 0 16px; padding-left: 1.5em; }
#whitepaper li { margin: 0 0 6px; }
#whitepaper strong { font-weight: 700; }
#whitepaper .wp-toc { border: 1px solid var(--faint); background: var(--box); padding: 12px 16px; margin: 26px 0 8px; }
#whitepaper .wp-toc summary { cursor: pointer; color: var(--dim); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
#whitepaper .wp-toc ol { list-style: none; padding: 0; margin: 12px 0 2px; columns: 2 260px; column-gap: 28px; }
#whitepaper .wp-toc li { font-size: 13px; line-height: 1.5; margin: 0 0 6px; break-inside: avoid; }
#whitepaper .tbl { overflow-x: auto; margin: 6px 0 22px; border: 1px solid var(--faint); }
#whitepaper table { border-collapse: collapse; width: 100%; font-size: 13px; line-height: 1.6; }
#whitepaper th, #whitepaper td { text-align: left; vertical-align: top; padding: 9px 12px; border-bottom: 1px solid var(--faint); }
#whitepaper tr:last-child td { border-bottom: 0; }
#whitepaper th { background: var(--box); font-weight: 700; white-space: nowrap; }
#whitepaper td:first-child { font-weight: 700; min-width: 11em; }
#whitepaper figure { margin: 22px 0 30px; }
#whitepaper figure img { display: block; width: 100%; height: auto; border: 1px solid var(--faint); background: #0c0c0e; }
#whitepaper figure img + img { margin-top: 10px; }
#whitepaper figcaption { color: var(--dim); font-size: 12.5px; line-height: 1.6; margin-top: 9px; }
#whitepaper figure.flow ol { list-style: none; padding: 0; margin: 0; }
#whitepaper figure.flow li { border: 1px solid var(--faint); background: var(--box); padding: 12px 16px; margin: 0; text-align: center; }
#whitepaper figure.flow li + li { margin-top: 30px; position: relative; }
#whitepaper figure.flow li + li::before { content: "↓"; position: absolute; left: 0; right: 0; top: -26px; color: var(--dim); }
#whitepaper figure.flow li strong { display: block; font-size: 14px; }
#whitepaper figure.flow li span { display: block; color: var(--dim); font-size: 12.5px; margin-top: 4px; }
#whitepaper .wp-foot { margin-top: 44px; padding-top: 16px; border-top: 1px solid var(--faint); color: var(--dim); font-size: 12px; line-height: 1.7; }
#whitepaper .wp-foot a { color: var(--dim); }
@media (max-width: 640px) {
  #whitepaper { padding: 22px 16px 32px; margin-left: -8px; margin-right: -8px; }
  #whitepaper h1 { font-size: 19px; }
  #whitepaper p, #whitepaper li { font-size: 13.5px; }
  #whitepaper .anchor { display: none; }
  #whitepaper table { font-size: 12px; }
  #whitepaper td:first-child { min-width: 8em; }
}
@media print {
  body { background: #fff !important; }
  .wrap > header, .wrap > footer, #whitepaper .wp-toc, #whitepaper .anchor { display: none !important; }
  #whitepaper { border: 0; padding: 0; margin: 0; }
  #whitepaper figure, #whitepaper .tbl, #whitepaper tr { break-inside: avoid; }
}
`;

export function whitepaperPage(v: Version, versions: Version[], r: Rendered, isLatest: boolean): string {
  const base = `/whitepaper/v${v.version}`;
  const others = versions
    .filter((o) => o.version !== v.version)
    .map((o) => `<a href="/whitepaper/v${htmlEscape(o.version)}">v${htmlEscape(o.version)}</a>`)
    .join(" ");
  const meta = [
    `<span><b>v${htmlEscape(v.version)}</b> · ${htmlEscape(v.published)}${isLatest ? " · current" : ""}</span>`,
    isLatest ? "" : `<a href="/whitepaper">read the current version →</a>`,
    others ? `<span>other versions: ${others}</span>` : "",
    `<a href="${base}">permalink</a>`,
    `<a href="${base}/whitepaper.md">markdown source</a>`,
  ].filter(Boolean).join("");
  const toc = r.toc.length
    ? `<details class="wp-toc" open><summary>Contents</summary><ol>${r.toc
        .map((t) => `<li><a href="#${t.id}">${t.label}</a></li>`)
        .join("")}</ol></details>`
    : "";
  // The TOC goes right after the paper's opening block (title + status lines),
  // i.e. before the first section heading.
  const firstH2 = r.html.indexOf("<h2");
  const body = firstH2 === -1 ? r.html + toc : r.html.slice(0, firstH2) + toc + r.html.slice(firstH2);
  const head = `<link rel="canonical" href="${base}">`;
  return htmlPage(
    `Whitepaper v${htmlEscape(v.version)}`,
    `<style>${CSS}</style><article id="whitepaper"><div class="wp-meta">${meta}</div>${body}` +
      `<div class="wp-foot"><a href="/contribute">Contribute to the commons →</a></div></article>`,
    head
  );
}

const router = Router();

function send(res: express.Response, version: string | null) {
  const versions = readVersions();
  const v = version === null ? versions[0] : versions.find((x) => x.version === version);
  const r = v ? rendered(v.version) : null;
  if (!v || !r) {
    res.status(404).set(HTML_HEADERS).send(htmlPage("Whitepaper", `<h2>No such whitepaper version</h2><p><a href="/whitepaper">Read the current whitepaper →</a></p>`));
    return;
  }
  res
    .set({ ...HTML_HEADERS, "Cache-Control": DEV ? "no-cache" : "public, max-age=300" })
    .send(whitepaperPage(v, versions, r, v.version === versions[0].version));
}

router.get("/whitepaper", (_req, res) => send(res, null));

router.get("/whitepaper/:ver", (req, res, next) => {
  const m = /^v(\d+(?:\.\d+)*)$/.exec(String(req.params.ver));
  if (!m) return next();
  send(res, m[1]);
});

// Figures + the raw markdown. A version's files can still get a typo fix, so
// they revalidate daily rather than being cached immutably.
router.use(
  "/whitepaper",
  express.static(WHITEPAPER_DIR, {
    index: false,
    redirect: false,
    dotfiles: "ignore",
    setHeaders(res, filePath) {
      res.setHeader("Cache-Control", DEV ? "no-cache" : "public, max-age=86400");
      if (filePath.endsWith(".md")) res.setHeader("Content-Type", "text/markdown; charset=utf-8");
    },
  })
);

export default router;
