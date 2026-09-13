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
  links: Array<{ href: string; text: string }>;
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
      const res = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(8000), redirect: "follow" });
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
  const kill = ["script", "style", "noscript", "svg", "nav", "footer", "header", "form", "iframe", "aside"];
  const root = document.querySelector("main, article, [role=main]") || document.body;
  const clone = root.cloneNode(true);
  for (const sel of kill) clone.querySelectorAll(sel).forEach((n) => n.remove());
  const text = (clone.innerText || clone.textContent || "").replace(/[ \\t]+/g, " ").replace(/\\n\\s*\\n+/g, "\\n\\n").trim();
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

type Browser = import("playwright").Browser;
let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browser) return browser;
  const { chromium } = await import("playwright");
  browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage", "--no-sandbox"] });
  return browser;
}

export async function closeBrowser(): Promise<void> {
  if (browser) { try { await browser.close(); } catch { /* ignore */ } browser = null; }
}

const BLOCK_TYPES = new Set(["font", "media", "websocket", "manifest", "texttrack", "eventsource"]);
const ANALYTICS = /google-analytics|googletagmanager|doubleclick|facebook\.net|hotjar|segment\.io|mixpanel|plausible|matomo|clarity\.ms|sentry/i;

async function withBrowser(u: URL): Promise<Omit<FetchedPage, "via" | "sha256" | "chars" | "url">> {
  const b = await getBrowser();
  const ctx = await b.newContext({
    userAgent: "Mozilla/5.0 (compatible; ADAI-intake/1.0; +https://adai-basel.fly.dev)",
    viewport: { width: 1280, height: 900 },
    javaScriptEnabled: true,
    ignoreHTTPSErrors: false,
  });
  try {
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
    const page = await ctx.newPage();
    let status = 0;
    let resp = await page.goto(u.toString(), { waitUntil: "domcontentloaded", timeout: 20_000 });
    status = resp?.status() ?? 0;
    try { await page.waitForLoadState("networkidle", { timeout: 8_000 }); } catch { /* keep going */ }
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
    return { final_url: finalUrl, status, title: extracted.title, text: extracted.text, links: extracted.links, images: extracted.images };
  } finally {
    await ctx.close().catch(() => {});
  }
}

async function withFetch(u: URL): Promise<Omit<FetchedPage, "via" | "sha256" | "chars" | "url">> {
  const res = await fetch(u.toString(), {
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
    headers: { "user-agent": "Mozilla/5.0 (compatible; ADAI-intake/1.0; +https://adai-basel.fly.dev)", accept: "text/html,*/*;q=0.5" },
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
}

export async function fetchPage(rawUrl: string, policy: FetchPolicy): Promise<FetchedPage> {
  const u = checkUrl(rawUrl);
  if (!sameSite(u.toString(), policy.rootUrl)) throw new FetchRefused(`off-site: ${u.hostname} is not ${new URL(policy.rootUrl).hostname}`, "off_site");
  if (policy.pagesFetched >= policy.maxPages) throw new FetchRefused(`page cap (${policy.maxPages}) reached`, "page_cap");
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
    core = await withFetch(u);
  }
  const text = core.text.slice(0, CONFIG.pageTextChars);
  const same = (h: string) => sameSite(h, policy.rootUrl);
  const seen = new Set<string>();
  const links = core.links
    .filter((l) => /^https?:/i.test(l.href) && same(l.href))
    .map((l) => ({ href: l.href.replace(/#.*$/, ""), text: l.text }))
    .filter((l) => { if (seen.has(l.href)) return false; seen.add(l.href); return true; })
    .slice(0, 150);
  const iseen = new Set<string>();
  const images = core.images
    .filter((i) => /^https?:/i.test(i.src) && !/\.svg(\?|$)/i.test(i.src) && (i.w === 0 || i.w >= 200) && (i.h === 0 || i.h >= 200))
    .filter((i) => { if (iseen.has(i.src)) return false; iseen.add(i.src); return true; })
    .slice(0, 60);
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
