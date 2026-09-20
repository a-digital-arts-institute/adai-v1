// fetch_page: Playwright with an SSRF guard, a readability-ish text pass,
// link + image lists, robots.txt, same-domain policy, and a plain-fetch
// fallback (docs/URL-INTAKE-SPEC.md §6.3).
//
// Guard rules mirror src/utils/ssrf.ts in the main app: http(s) only, the
// hostname is resolved before navigation and every address must be public,
// redirects are re-checked by inspecting the final URL, subresource
// requests to literal private hosts are aborted.

import dns from "node:dns/promises";
import net from "node:net";
import crypto from "node:crypto";
import { CONFIG } from "./config.js";

export interface FetchedPage {
  url: string;
  final_url: string;
  status: number;
  title: string | null;
  text: string;
  /** Same-site links plus, flagged, the off-site links the page points to. */
  links: Array<{ href: string; text: string; offsite?: boolean }>;
  images: Array<{ src: string; alt: string; w: number; h: number }>;
  via: "browser" | "fetch";
  sha256: string;
  chars: number;
}

export class FetchRefused extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "FetchRefused";
  }
}

// ---- ssrf ------------------------------------------------------------------

const PRIVATE_V4: Array<[number, number]> = [
  [0x00000000, 8], [0x0a000000, 8], [0x64400000, 10], [0x7f000000, 8], [0xa9fe0000, 16],
  [0xac100000, 12], [0xc0000000, 24], [0xc0000200, 24], [0xc0a80000, 16], [0xc6120000, 15],
  [0xc6336400, 24], [0xcb007100, 24], [0xe0000000, 4], [0xf0000000, 4],
];

function v4(ip: string): number {
  return ip.split(".").reduce((a, o) => ((a << 8) + parseInt(o, 10)) >>> 0, 0) >>> 0;
}

export function isPrivateIp(ip: string): boolean {
  const fam = net.isIP(ip);
  if (fam === 4) {
    const n = v4(ip);
    return PRIVATE_V4.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) === (base & mask);
    }) || ip === "255.255.255.255";
  }
  if (fam === 6) {
    const low = ip.toLowerCase();
    if (low === "::" || low === "::1") return true;
    const m = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(low);
    if (m) return isPrivateIp(m[1]!);
    return /^(fc|fd|fe[89ab]|ff)/.test(low) || low.startsWith("2001:db8");
  }
  return true;
}

const BLOCKED = new Set(["localhost", "metadata.google.internal", "metadata", "instance-data"]);

export function checkUrl(raw: string): URL {
  let u: URL;
  try { u = new URL(raw); } catch { throw new FetchRefused("malformed URL", "bad_url"); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new FetchRefused("only http(s)", "bad_scheme");
  if (u.username || u.password) throw new FetchRefused("credentials in URL", "bad_url");
  const host = u.hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  if (!host) throw new FetchRefused("missing host", "bad_url");
  if (BLOCKED.has(host) || /\.(localhost|internal|local)$/.test(host)) throw new FetchRefused("host not allowed", "private_host");
  if (net.isIP(host) && isPrivateIp(host)) throw new FetchRefused("private address", "private_host");
  return u;
}

export async function assertPublic(u: URL): Promise<void> {
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) { if (isPrivateIp(host)) throw new FetchRefused("private address", "private_host"); return; }
  let addrs: Array<{ address: string }>;
  try { addrs = await dns.lookup(host, { all: true }); } catch { throw new FetchRefused(`cannot resolve ${host}`, "dns_failed"); }
  if (!addrs.length) throw new FetchRefused(`no addresses for ${host}`, "dns_failed");
  for (const a of addrs) if (isPrivateIp(a.address)) throw new FetchRefused(`${host} resolves to a private address`, "private_host");
}

// ---- domain policy -----------------------------------------------------------

export function registrable(host: string): string {
  const parts = host.toLowerCase().replace(/^www\./, "").split(".");
  if (parts.length <= 2) return parts.join(".");
  // crude eTLD handling for co.uk-style suffixes
  const two = parts.slice(-2).join(".");
  if (/^(co|com|org|net|ac|gov|edu)\.[a-z]{2}$/.test(two)) return parts.slice(-3).join(".");
  return two;
}

export function sameSite(a: string, b: string): boolean {
  try { return registrable(new URL(a).hostname) === registrable(new URL(b).hostname); } catch { return false; }
}

// ---- robots.txt --------------------------------------------------------------

const robotsCache = new Map<string, string[]>(); // origin → disallow prefixes for *

async function disallowed(u: URL): Promise<boolean> {
  const origin = u.origin;
  let rules = robotsCache.get(origin);
  if (!rules) {
    rules = [];
    try {
      const res = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(8000), redirect: "follow", headers: { "user-agent": userAgent, ...NAV_HEADERS } });
      if (res.ok) {
        let applies = false;
        for (const line of (await res.text()).split(/\r?\n/)) {
          const l = line.replace(/#.*$/, "").trim();
          if (!l) continue;
          const [k, ...rest] = l.split(":");
          const v = rest.join(":").trim();
          const key = (k ?? "").trim().toLowerCase();
          if (key === "user-agent") applies = v === "*" || v.toLowerCase().includes("adai");
          else if (applies && key === "disallow" && v) rules.push(v);
        }
      }
    } catch { /* no robots → allowed */ }
    robotsCache.set(origin, rules);
  }
  return rules.some((p) => u.pathname.startsWith(p));
}

// ---- site outline (sitemap) ---------------------------------------------------
//
// What a person sees in a site's navigation, the sitemap states outright:
// how many artist pages, how many exhibitions, where the index pages are.
// Read once per pass by the harness, BEFORE the model spends a call, so a
// gallery's programme is surveyed instead of discovered link by link. Costs
// no page-cap budget and a few hundred tokens.

const SITEMAP_MAX_FILES = 14;
const SITEMAP_MAX_URLS = 6000;

async function robotsSitemaps(origin: string): Promise<string[]> {
  try {
    const res = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(8000), redirect: "follow", headers: { "user-agent": userAgent, ...NAV_HEADERS } });
    if (!res.ok) return [];
    return [...(await res.text()).matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]!);
  } catch { return []; }
}

async function sitemapLocs(url: string, rootUrl: string): Promise<string[]> {
  const u = checkUrl(url);
  if (!sameSite(u.toString(), rootUrl)) return [];
  await assertPublic(u);
  const res = await fetch(u.toString(), { signal: AbortSignal.timeout(12_000), redirect: "follow", headers: { "user-agent": userAgent, ...NAV_HEADERS, accept: "application/xml,text/xml,*/*;q=0.5" } });
  if (!res.ok) return [];
  const final = checkUrl(res.url || u.toString());
  if (!sameSite(final.toString(), rootUrl)) return [];
  await assertPublic(final);
  const xml = (await res.text()).slice(0, 5_000_000);
  return [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)/gi)].map((m) => m[1]!.replace(/&amp;/g, "&"));
}

/** Group URLs by first path segment. Pure — exported for tests. */
export function outlineFromUrls(urls: string[], rootUrl: string): string | null {
  const sections = new Map<string, string[]>();
  const top: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    let u: URL;
    try { u = new URL(raw); } catch { continue; }
    if (!sameSite(u.toString(), rootUrl)) continue;
    const key = u.origin + u.pathname.replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    const segs = u.pathname.split("/").filter(Boolean);
    if (segs.length === 0) continue;
    if (segs.length === 1) { top.push(u.toString()); continue; }
    const k = `${u.hostname}/${segs[0]}/`;
    const arr = sections.get(k) ?? [];
    arr.push(u.toString());
    sections.set(k, arr);
  }
  if (!sections.size && top.length < 3) return null;
  const lines = [...sections.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 30)
    .map(([k, list]) => `${k} — ${list.length} pages, e.g. ${list.slice(0, 3).join(" , ")}`);
  const tops = top.slice(0, 40).join("\n");
  return `<site_outline source="sitemap" urls="${seen.size}">\nSections (by first path segment):\n${lines.join("\n")}\n\nTop-level pages (index pages live here — roster, exhibitions, archive, about):\n${tops}\n</site_outline>`;
}

export async function siteOutline(rootUrl: string): Promise<string | null> {
  try {
    const root = checkUrl(rootUrl);
    const declared = await robotsSitemaps(root.origin);
    const starts = declared.length ? declared : ["/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml"].map((p) => root.origin + p);
    const urls: string[] = [];
    let queue = starts.slice(0, 4);
    let files = 0;
    while (queue.length && files < SITEMAP_MAX_FILES && urls.length < SITEMAP_MAX_URLS) {
      const next = queue.shift()!;
      files++;
      let locs: string[] = [];
      try { locs = await sitemapLocs(next, rootUrl); } catch { continue; }
      for (const l of locs) {
        if (/\.xml(\.gz)?(\?|$)/i.test(l)) { if (!l.endsWith(".gz")) queue.push(l); }
        else if (urls.length < SITEMAP_MAX_URLS) urls.push(l);
      }
      // Guessing (no Sitemap: line in robots.txt): the first guess that
      // answers is the sitemap; drop the other guesses.
      if (!declared.length && locs.length && starts.includes(next)) queue = queue.filter((q) => !starts.includes(q));
    }
    return outlineFromUrls(urls, rootUrl);
  } catch {
    return null;
  }
}

// ---- text extraction (plain fetch fallback) ------------------------------------

export function htmlToText(html: string): { title: string | null; text: string; links: Array<{ href: string; text: string }>; images: Array<{ src: string; alt: string; w: number; h: number }> } {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.replace(/\s+/g, " ").trim() ?? null;
  const links: Array<{ href: string; text: string }> = [];
  for (const m of html.matchAll(/<a\s[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    links.push({ href: m[1]!, text: m[2]!.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 120) });
  }
  const images: Array<{ src: string; alt: string; w: number; h: number }> = [];
  for (const m of html.matchAll(/<img\s[^>]*>/gi)) {
    const tag = m[0];
    const src = /\ssrc=["']([^"']+)["']/i.exec(tag)?.[1] ?? /\sdata-src=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!src) continue;
    const alt = /\salt=["']([^"']*)["']/i.exec(tag)?.[1] ?? "";
    const w = parseInt(/\swidth=["']?(\d+)/i.exec(tag)?.[1] ?? "0", 10);
    const h = parseInt(/\sheight=["']?(\d+)/i.exec(tag)?.[1] ?? "0", 10);
    images.push({ src, alt, w, h });
  }
  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(br|p|div|li|h[1-6]|tr|section|article|header|footer)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
  return { title, text: body, links, images };
}

// ---- the browser ------------------------------------------------------------------

// Runs inside the page. Walks light DOM + every open shadow root: site
// builders (Cargo's <media-item>, Squarespace blocks, Lit components) keep
// the real <img> in a shadow root where document.querySelectorAll never
// looks. Prefers the largest srcset candidate. Plain ES2020, no helpers.
const EXTRACT_SCRIPT = `(() => {
  const collect = (sel) => {
    const out = [];
    const walk = (root) => {
      root.querySelectorAll(sel).forEach((n) => out.push(n));
      root.querySelectorAll("*").forEach((el) => { if (el.shadowRoot) walk(el.shadowRoot); });
    };
    walk(document);
    return out;
  };
  // Site chrome goes; content headers stay. Inside <main>/<article> a
  // <header> is the entry title block (WordPress, most gallery themes) —
  // on a roster page it is ALL the text there is.
  const readable = (root) => {
    const kill = ["script", "style", "noscript", "svg", "nav", "form", "iframe", "aside"];
    if (root === document.body) kill.push(":scope > header", ":scope > footer", "[role=banner]", "[role=contentinfo]");
    const clone = root.cloneNode(true);
    for (const sel of kill) clone.querySelectorAll(sel).forEach((n) => n.remove());
    // A detached clone has no layout, so innerText degrades to textContent
    // and block boundaries vanish; mark them before reading.
    clone.querySelectorAll("br, p, div, li, h1, h2, h3, h4, h5, h6, tr, section, article, header, footer, figcaption, dt, dd").forEach((n) => n.append("\\n"));
    return (clone.textContent || "").replace(/[ \\t]+/g, " ").replace(/ ?\\n ?/g, "\\n").replace(/\\n{3,}/g, "\\n\\n").trim();
  };
  const main = document.querySelector("main, article, [role=main]");
  let text = readable(main || document.body);
  if (main && text.length < 200) { const whole = readable(document.body); if (whole.length > text.length) text = whole; }
  const links = collect("a[href]").map((a) => ({
    href: a.href,
    text: (a.innerText || a.getAttribute("aria-label") || a.getAttribute("title") || "").replace(/\\s+/g, " ").trim().slice(0, 120),
  }));
  const pickSrcset = (ss) => {
    if (!ss) return "";
    let best = ""; let bestW = -1;
    for (const part of ss.split(",")) {
      const bits = part.trim().split(/\\s+/);
      const u = bits[0]; const d = bits[1];
      const w = d && d.endsWith("w") ? parseInt(d, 10) : 0;
      if (u && w >= bestW) { best = u; bestW = w; }
    }
    return best;
  };
  const images = collect("img").map((i) => {
    const src = i.currentSrc || pickSrcset(i.getAttribute("srcset")) || i.src || i.getAttribute("data-src") || "";
    const w = i.naturalWidth || parseInt(i.getAttribute("width") || "0", 10) || 0;
    const h = i.naturalHeight || parseInt(i.getAttribute("height") || "0", 10) || 0;
    return { src, alt: (i.alt || "").trim().slice(0, 200), w, h };
  });
  return { title: document.title || null, text, links, images };
})()`;

// We read a site the way the contributor would: as a person's browser.
// A real Chrome UA for the platform we actually run on (so UA, client hints
// and navigator agree), new-headless Chromium when the image has it, one
// context per pass so cookies persist across pages (a JS challenge passed
// once stays passed), a referer and a human pause between same-host pages.
// robots.txt, the page caps and the SSRF guard still apply — we browse like
// a person, we do not crawl like one can't.
type Browser = import("playwright").Browser;
type BrowserContext = import("playwright").BrowserContext;
let browser: Browser | null = null;
let session: { ctx: BrowserContext; lastUrl: string | null; lastAt: number } | null = null;

const LAUNCH_ARGS = ["--disable-dev-shm-usage", "--no-sandbox", "--disable-blink-features=AutomationControlled"];

export function chromeUa(version: string, platform: string = process.platform): string {
  const major = /^(\d+)/.exec(version)?.[1] ?? "140";
  const os = platform === "darwin" ? "Macintosh; Intel Mac OS X 10_15_7" : platform === "win32" ? "Windows NT 10.0; Win64; x64" : "X11; Linux x86_64";
  return `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`;
}

let userAgent = chromeUa("140");
const NAV_HEADERS = { accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8", "accept-language": "en-US,en;q=0.9" };

async function getBrowser(): Promise<Browser> {
  if (browser) return browser;
  const { chromium } = await import("playwright");
  try {
    // The full Chromium build in new-headless mode: same code path as a
    // headed browser (no "HeadlessChrome" in UA or client hints).
    browser = await chromium.launch({ headless: true, channel: "chromium", args: LAUNCH_ARGS });
  } catch {
    browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
  }
  userAgent = chromeUa(browser.version());
  return browser;
}

const BLOCK_TYPES = new Set(["font", "media", "websocket", "manifest", "texttrack", "eventsource"]);
const ANALYTICS = /google-analytics|googletagmanager|doubleclick|facebook\.net|hotjar|segment\.io|mixpanel|plausible|matomo|clarity\.ms|sentry/i;

async function getSession(): Promise<NonNullable<typeof session>> {
  if (session) return session;
  const b = await getBrowser();
  const ctx = await b.newContext({
    userAgent,
    locale: "en-US",
    viewport: { width: 1440, height: 900 },
    javaScriptEnabled: true,
    ignoreHTTPSErrors: false,
  });
  await ctx.route("**/*", (route) => {
    const req = route.request();
    const url = req.url();
    if (!/^https?:/i.test(url)) return route.abort();
    try {
      const h = new URL(url).hostname.replace(/^\[|\]$/g, "");
      if (BLOCKED.has(h) || (net.isIP(h) && isPrivateIp(h)) || /\.(localhost|internal|local)$/.test(h)) return route.abort();
    } catch { return route.abort(); }
    if (BLOCK_TYPES.has(req.resourceType()) || ANALYTICS.test(url)) return route.abort();
    return route.continue();
  });
  session = { ctx, lastUrl: null, lastAt: 0 };
  return session;
}

/** End the pass's browsing session (cookies, referer chain). The browser stays warm. */
export async function endSession(): Promise<void> {
  const s = session;
  session = null;
  if (s) await s.ctx.close().catch(() => {});
}

export async function closeBrowser(): Promise<void> {
  await endSession();
  if (browser) { try { await browser.close(); } catch { /* ignore */ } browser = null; }
}

// ---- blocked pages ----------------------------------------------------------------

const BLOCK_STATUS = new Set([401, 403, 407, 429, 503]);
const CHALLENGE = /just a moment|checking your browser|verif(y|ying) (that )?you are (a )?human|attention required|access denied|are you a robot|enable javascript and cookies|sgcaptcha|cf-chl|captcha/i;

/** A refusal or an interstitial instead of the page. Exported for tests. */
export function looksBlocked(status: number, title: string | null, text: string): boolean {
  if (BLOCK_STATUS.has(status)) return true;
  return text.length < 1500 && CHALLENGE.test(`${title ?? ""}\n${text}`);
}

class Blocked extends Error {
  constructor(public readonly status: number, public readonly title: string | null) {
    super(`blocked (HTTP ${status}${title ? `, "${title}"` : ""})`);
    this.name = "Blocked";
  }
}

function blockedRefusal(u: URL, status: number, title: string | null): FetchRefused {
  const why = status === 401 || status === 407
    ? "it is behind a login"
    : status === 429
      ? "the site is rate-limiting us"
      : "the site's bot protection refused us, even reading as a regular browser";
  return new FetchRefused(`${u.hostname} would not serve this page (HTTP ${status}${title ? `, "${title}"` : ""}): ${why}. It cannot be read from here.`, "blocked");
}

async function withBrowser(u: URL): Promise<Omit<FetchedPage, "via" | "sha256" | "chars" | "url">> {
  const s = await getSession();
  // A person does not open the next page of the same site within
  // milliseconds; neither do we.
  const sameHostAsLast = !!s.lastUrl && new URL(s.lastUrl).hostname === u.hostname;
  if (sameHostAsLast) {
    const wait = 500 + Math.random() * 1000 - (Date.now() - s.lastAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
  const page = await s.ctx.newPage();
  try {
    let status = 0;
    page.on("response", (r) => {
      if (r.request().isNavigationRequest() && r.frame() === page.mainFrame()) status = r.status();
    });
    const referer = s.lastUrl && sameSite(s.lastUrl, u.toString()) ? s.lastUrl : undefined;
    const resp = await page.goto(u.toString(), { waitUntil: "domcontentloaded", timeout: 20_000, referer });
    status = status || (resp?.status() ?? 0);
    try { await page.waitForLoadState("networkidle", { timeout: 8_000 }); } catch { /* keep going */ }
    // A JS challenge (Cloudflare, SiteGround …) clears itself in a real
    // browser and reloads the page; give it a few beats before giving up.
    const peek = () => page.evaluate("({ title: document.title || null, text: (document.body && document.body.innerText || '').slice(0, 2000) })") as Promise<{ title: string | null; text: string }>;
    let seen = await peek().catch(() => ({ title: null, text: "" }));
    for (let i = 0; i < 4 && looksBlocked(status, seen.title, seen.text); i++) {
      await page.waitForTimeout(3_000);
      seen = await peek().catch(() => seen);
    }
    if (looksBlocked(status, seen.title, seen.text)) throw new Blocked(status, seen.title);
    // Scroll the whole page (capped) so IntersectionObserver-driven lazy
    // loaders (Cargo, Squarespace, most galleries) swap their 1×1
    // placeholders for real URLs, then give them a moment to settle.
    try {
      await page.evaluate(async () => {
        const step = Math.max(500, Math.floor(window.innerHeight * 0.8));
        const max = Math.min(document.documentElement.scrollHeight, 40_000);
        for (let y = 0; y <= max; y += step) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 150));
        }
        window.scrollTo(0, 0);
      });
      try { await page.waitForLoadState("networkidle", { timeout: 4_000 }); } catch { /* fine */ }
      await page.waitForTimeout(600);
    } catch { /* ignore */ }
    const finalUrl = page.url();
    const finalParsed = checkUrl(finalUrl);
    await assertPublic(finalParsed);

    // The extractor is a STRING, not a function: tsx/esbuild decorate
    // function bodies with a `__name` helper that does not exist inside
    // the page, so a serialised closure throws ReferenceError there.
    const extracted = (await page.evaluate(EXTRACT_SCRIPT)) as {
      title: string | null;
      text: string;
      links: Array<{ href: string; text: string }>;
      images: Array<{ src: string; alt: string; w: number; h: number }>;
    };
    s.lastUrl = finalUrl;
    return { final_url: finalUrl, status, title: extracted.title, text: extracted.text, links: extracted.links, images: extracted.images };
  } finally {
    s.lastAt = Date.now();
    await page.close().catch(() => {});
  }
}

async function withFetch(u: URL): Promise<Omit<FetchedPage, "via" | "sha256" | "chars" | "url">> {
  const res = await fetch(u.toString(), {
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
    headers: { "user-agent": userAgent, ...NAV_HEADERS },
  });
  const final = checkUrl(res.url || u.toString());
  await assertPublic(final);
  const ct = res.headers.get("content-type") ?? "";
  if (!/html|xml|text/i.test(ct)) throw new FetchRefused(`not a page (${ct})`, "not_html");
  const html = (await res.text()).slice(0, 3_000_000);
  const x = htmlToText(html);
  const abs = (h: string) => { try { return new URL(h, final).toString(); } catch { return ""; } };
  return {
    final_url: final.toString(),
    status: res.status,
    title: x.title,
    text: x.text,
    links: x.links.map((l) => ({ ...l, href: abs(l.href) })).filter((l) => l.href),
    images: x.images.map((i) => ({ ...i, src: abs(i.src) })).filter((i) => i.src),
  };
}

export interface FetchPolicy {
  rootUrl: string;
  pagesFetched: number;
  maxPages: number;
  /**
   * Off-site URLs the SITE ITSELF linked to (objkt, fxhash, Art Blocks,
   * gallery show pages, press). One hop only: links found on an off-site
   * page never extend this set. Filled by fetchPage from same-site pages.
   */
  offsiteAllowed: Set<string>;
  offsiteFetched: number;
  maxOffsite: number;
}

export function newPolicy(rootUrl: string, opts: { pagesFetched?: number; maxPages: number; maxOffsite?: number }): FetchPolicy {
  return {
    rootUrl,
    pagesFetched: opts.pagesFetched ?? 0,
    maxPages: opts.maxPages,
    offsiteAllowed: new Set(),
    offsiteFetched: 0,
    maxOffsite: opts.maxOffsite ?? 10,
  };
}

function normKey(u: string): string {
  try { const x = new URL(u); x.hash = ""; return x.toString().replace(/\/$/, ""); } catch { return u; }
}

/** Policy check only — no network. Exported so tests can cover it without Chromium. */
export function checkPolicy(u: URL, policy: FetchPolicy): { offsite: boolean } {
  const onSite = sameSite(u.toString(), policy.rootUrl);
  if (onSite) {
    if (policy.pagesFetched >= policy.maxPages) throw new FetchRefused(`page cap (${policy.maxPages}) reached`, "page_cap");
    return { offsite: false };
  }
  if (!policy.offsiteAllowed.has(normKey(u.toString()))) {
    throw new FetchRefused(`off-site: ${u.hostname} is not linked from ${new URL(policy.rootUrl).hostname} — only pages the site itself points to can be read`, "off_site");
  }
  if (policy.offsiteFetched >= policy.maxOffsite) throw new FetchRefused(`off-site page cap (${policy.maxOffsite}) reached`, "offsite_cap");
  return { offsite: true };
}

export async function fetchPage(rawUrl: string, policy: FetchPolicy): Promise<FetchedPage> {
  const u = checkUrl(rawUrl);
  const { offsite } = checkPolicy(u, policy);
  await assertPublic(u);
  if (await disallowed(u)) throw new FetchRefused("robots.txt disallows this path", "robots");

  let core: Omit<FetchedPage, "via" | "sha256" | "chars" | "url">;
  let via: "browser" | "fetch" = "browser";
  try {
    core = await withBrowser(u);
  } catch (e: any) {
    if (e instanceof FetchRefused) throw e;
    console.warn(`[worker] browser failed for ${u} (${e?.message ?? e}); falling back to fetch`);
    via = "fetch";
    try {
      core = await withFetch(u);
    } catch (e2) {
      if (e instanceof Blocked && !(e2 instanceof FetchRefused)) throw blockedRefusal(u, e.status, e.title);
      throw e2;
    }
  }
  // A refusal page is not evidence; never hand it to the model as content.
  if (looksBlocked(core.status, core.title, core.text)) throw blockedRefusal(u, core.status, core.title);
  const text = core.text.slice(0, CONFIG.pageTextChars);
  const same = (h: string) => sameSite(h, policy.rootUrl);
  const seen = new Set<string>();
  const all = core.links
    .filter((l) => /^https?:/i.test(l.href))
    .map((l) => ({ href: l.href.replace(/#.*$/, ""), text: l.text }))
    .filter((l) => { if (seen.has(l.href)) return false; seen.add(l.href); return true; });
  const onsiteLinks = all.filter((l) => same(l.href)).slice(0, 150);
  // Off-site links are surfaced (flagged) so the model can decide to follow
  // "view on objkt" / "exhibition page" — and, from a SAME-SITE page only,
  // they enter the allowlist. Boring hosts are dropped to keep the list useful.
  const BORING = /(^|\.)(facebook|instagram|twitter|x|linkedin|youtube|vimeo|tiktok|threads|mastodon\.social|bsky\.app|google|apple|spotify|soundcloud|patreon|paypal|substack|medium|discord|t)\.(com|net|org|app|social|me|co|io)$/i;
  const offsiteLinks = all
    .filter((l) => !same(l.href))
    .filter((l) => { try { return !BORING.test(new URL(l.href).hostname); } catch { return false; } })
    .slice(0, 40)
    .map((l) => ({ ...l, offsite: true as const }));
  if (!offsite) for (const l of offsiteLinks) policy.offsiteAllowed.add(normKey(l.href));
  const links = [...onsiteLinks, ...(offsite ? [] : offsiteLinks)];
  const iseen = new Set<string>();
  const images = core.images
    .filter((i) => /^https?:/i.test(i.src) && !/\.svg(\?|$)/i.test(i.src) && (i.w === 0 || i.w >= 200) && (i.h === 0 || i.h >= 200))
    .filter((i) => { if (iseen.has(i.src)) return false; iseen.add(i.src); return true; })
    .slice(0, 60);
  if (offsite) policy.offsiteFetched++;
  return {
    url: rawUrl,
    final_url: core.final_url,
    status: core.status,
    title: core.title,
    text,
    links,
    images,
    via,
    sha256: crypto.createHash("sha256").update(text).digest("hex"),
    chars: text.length,
  };
}
