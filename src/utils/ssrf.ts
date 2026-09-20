// One SSRF guard for every server-side fetch of a contributor-supplied URL
// (image_url transport on /api/v1/images, image_neighbours, the worker's
// fetch_page shares the same rules in worker/src/browser.ts).
//
// Rules (docs/URL-INTAKE-SPEC.md §15): http(s) only; hostname resolved and
// every address checked against loopback / private / link-local / metadata
// ranges; redirects re-checked hop by hop; byte cap; timeout.

import dns from "node:dns/promises";
import net from "node:net";
import http from "node:http";
import https from "node:https";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";

export class SsrfError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "SsrfError";
  }
}

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal", "metadata", "instance-data"]);

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
}

function inCidr4(ip: string, cidr: string): boolean {
  const [base, bitsStr] = cidr.split("/");
  const bits = parseInt(bitsStr!, 10);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base!) & mask);
}

const PRIVATE_V4 = [
  "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16",
  "172.16.0.0/12", "192.0.0.0/24", "192.0.2.0/24", "192.168.0.0/16", "198.18.0.0/15",
  "198.51.100.0/24", "203.0.113.0/24", "224.0.0.0/4", "240.0.0.0/4", "255.255.255.255/32",
];

export function isPrivateIp(ip: string): boolean {
  const fam = net.isIP(ip);
  if (fam === 4) return PRIVATE_V4.some((c) => inCidr4(ip, c));
  if (fam === 6) {
    const low = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
    if (low === "::" || low === "::1") return true;
    // URL canonicalization also handles expanded and dotted mapped forms.
    const m = /^::ffff:([0-9a-f]+):([0-9a-f]+)$/.exec(low);
    if (m) {
      const n = (parseInt(m[1]!, 16) * 65536 + parseInt(m[2]!, 16)) >>> 0;
      return isPrivateIp([n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join("."));
    }
    if (low.startsWith("fc") || low.startsWith("fd")) return true; // fc00::/7 unique local
    if (low.startsWith("fe8") || low.startsWith("fe9") || low.startsWith("fea") || low.startsWith("feb")) return true; // fe80::/10
    if (low.startsWith("ff")) return true; // multicast
    if (low.startsWith("2001:db8")) return true; // documentation
    return false;
  }
  return true; // not an IP at all — caller passed garbage
}

/**
 * Parse + policy-check a URL without touching the network. Throws SsrfError.
 */
export function checkUrlSyntax(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new SsrfError("malformed URL", "bad_url");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new SsrfError("only http(s) URLs", "bad_scheme");
  if (u.username || u.password) throw new SsrfError("credentials in URL are not allowed", "bad_url");
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!host) throw new SsrfError("missing host", "bad_url");
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new SsrfError("host not allowed", "private_host");
  }
  if (net.isIP(host.replace(/^\[|\]$/g, "")) && isPrivateIp(host.replace(/^\[|\]$/g, ""))) {
    throw new SsrfError("private address", "private_host");
  }
  return u;
}

/**
 * Resolve the hostname and verify that EVERY address is public. Throws.
 */
export async function publicAddresses(u: URL, lookup: typeof dns.lookup = dns.lookup): Promise<Array<{ address: string; family: number }>> {
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new SsrfError("private address", "private_host");
    return [{ address: host, family: net.isIP(host) }];
  }
  let addrs: Array<{ address: string; family: number }>;
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    throw new SsrfError(`cannot resolve ${host}`, "dns_failed");
  }
  if (!addrs.length) throw new SsrfError(`no addresses for ${host}`, "dns_failed");
  for (const a of addrs) {
    if (isPrivateIp(a.address)) throw new SsrfError(`${host} resolves to a private address`, "private_host");
  }
  return addrs;
}

export async function assertPublicHost(u: URL, lookup: typeof dns.lookup = dns.lookup): Promise<void> {
  await publicAddresses(u, lookup);
}

export interface SafeFetchOptions {
  maxBytes?: number;      // default 20 MiB
  timeoutMs?: number;     // default 20 s
  maxRedirects?: number;  // default 5
  headers?: Record<string, string>;
  lookup?: typeof dns.lookup;
  method?: string;
  body?: Buffer;
  // Optional browser cookie jar, kept outside this transport.
  cookieHeader?: (url: string) => Promise<string>;
  onResponse?: (url: string, headers: http.IncomingHttpHeaders) => Promise<void>;
}

export interface SafeFetchResult {
  final_url: string;
  status: number;
  content_type: string | null;
  bytes: Buffer;
  headers: Record<string, string>;
}

/**
 * Fetch a public URL with the guard applied on every hop. Never follows a
 * redirect into a private range, never reads more than maxBytes.
 */
export async function safeFetch(raw: string, opts: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const maxBytes = opts.maxBytes ?? 20 * 1024 * 1024;
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const maxRedirects = opts.maxRedirects ?? 5;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    let current = checkUrlSyntax(raw);
    let method = opts.method ?? "GET";
    let body = opts.body;
    const headers = Object.fromEntries(Object.entries(opts.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
    delete headers.host;
    for (let hop = 0; hop <= maxRedirects; hop++) {
      const addresses = await publicAddresses(current, opts.lookup);
      ctl.signal.throwIfAborted();
      if (opts.cookieHeader) headers.cookie = await opts.cookieHeader(current.toString());
      // Pin the socket lookup to the checked addresses. The URL hostname
      // remains intact for Host and TLS verification; no second DNS lookup.
      const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
        const request = (current.protocol === "https:" ? https : http).request(current, {
          method,
          signal: ctl.signal,
          agent: false,
          lookup: (_host, options, callback) => {
            if (options.all) callback(null, addresses);
            else callback(null, addresses[0]!.address, addresses[0]!.family);
          },
          headers: { "user-agent": "ADAI-intake/1.0 (+https://adai-basel.fly.dev)", ...headers, "accept-encoding": "identity" },
        }, resolve);
        request.on("error", reject);
        request.end(body);
      });
      if (opts.onResponse) {
        try { await opts.onResponse(current.toString(), response.headers); }
        catch (e) { response.destroy(); throw e; }
      }
      const status = response.statusCode ?? 502;
      const redirect = [301, 302, 303, 307, 308].includes(status);
      if (redirect) {
        response.destroy();
        const loc = response.headers.location;
        if (!loc) throw new SsrfError("redirect without location", "bad_redirect");
        const next = checkUrlSyntax(new URL(loc, current).toString());
        if (next.origin !== current.origin) {
          delete headers.authorization;
          delete headers.cookie;
        }
        if ((status === 303 && method !== "HEAD") || ((status === 301 || status === 302) && method === "POST")) {
          method = "GET"; body = undefined;
          delete headers["content-length"];
          delete headers["content-type"];
        }
        current = next;
        continue;
      }
      const responseHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(response.headers)) {
        if (value !== undefined) responseHeaders[key] = Array.isArray(value) ? value.join("\n") : value;
      }
      const len = Number(response.headers["content-length"]);
      if (len > maxBytes) { response.destroy(); throw new SsrfError(`body exceeds ${maxBytes} bytes`, "too_large"); }
      const encoding = response.headers["content-encoding"];
      const decoder = encoding === "gzip" ? createGunzip() : encoding === "br" ? createBrotliDecompress() : encoding === "deflate" ? createInflate() : null;
      const stream = decoder ? response.pipe(decoder) : response;
      if (decoder) response.on("error", (e) => decoder.destroy(e));
      const chunks: Buffer[] = [];
      let total = 0;
      try {
        for await (const chunk of stream) {
          total += chunk.length;
          if (total > maxBytes) throw new SsrfError(`body exceeds ${maxBytes} bytes`, "too_large");
          chunks.push(Buffer.from(chunk));
        }
      } finally { stream.destroy(); response.destroy(); }
      // Bodies are decoded and re-sized; these wire headers no longer apply.
      if (decoder) delete responseHeaders["content-encoding"];
      delete responseHeaders["content-length"];
      delete responseHeaders["transfer-encoding"];
      delete responseHeaders.connection;
      return {
        final_url: current.toString(), status,
        content_type: response.headers["content-type"]?.split(";")[0]?.trim().toLowerCase() ?? null,
        bytes: Buffer.concat(chunks), headers: responseHeaders,
      };
    }
    throw new SsrfError("too many redirects", "too_many_redirects");
  } catch (e: any) {
    if (e instanceof SsrfError) throw e;
    if (e?.name === "AbortError") throw new SsrfError("timeout", "timeout");
    throw new SsrfError(e?.message ?? String(e), "fetch_failed");
  } finally {
    clearTimeout(timer);
  }
}

/** Sniff an image MIME type from magic bytes; null when it isn't an image we accept. */
export function sniffImageMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "image/gif";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buf.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("ascii");
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "image/avif";
  }
  return null;
}
