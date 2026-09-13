// One SSRF guard for every server-side fetch of a contributor-supplied URL
// (image_url transport on /api/v1/images, image_neighbours, the worker's
// fetch_page shares the same rules in worker/src/browser.ts).
//
// Rules (docs/URL-INTAKE-SPEC.md §15): http(s) only; hostname resolved and
// every address checked against loopback / private / link-local / metadata
// ranges; redirects re-checked hop by hop; byte cap; timeout.

import dns from "node:dns/promises";
import net from "node:net";

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
    const low = ip.toLowerCase();
    if (low === "::" || low === "::1") return true;
    // IPv4-mapped (::ffff:a.b.c.d)
    const m = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(low);
    if (m) return isPrivateIp(m[1]!);
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
export async function assertPublicHost(u: URL, lookup: typeof dns.lookup = dns.lookup): Promise<void> {
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new SsrfError("private address", "private_host");
    return;
  }
  let addrs: Array<{ address: string }>;
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    throw new SsrfError(`cannot resolve ${host}`, "dns_failed");
  }
  if (!addrs.length) throw new SsrfError(`no addresses for ${host}`, "dns_failed");
  for (const a of addrs) {
    if (isPrivateIp(a.address)) throw new SsrfError(`${host} resolves to a private address`, "private_host");
  }
}

export interface SafeFetchOptions {
  maxBytes?: number;      // default 20 MiB
  timeoutMs?: number;     // default 20 s
  maxRedirects?: number;  // default 5
  headers?: Record<string, string>;
  lookup?: typeof dns.lookup;
  method?: "GET" | "HEAD";
}

export interface SafeFetchResult {
  final_url: string;
  status: number;
  content_type: string | null;
  bytes: Buffer;
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
    for (let hop = 0; hop <= maxRedirects; hop++) {
      await assertPublicHost(current, opts.lookup);
      const res = await fetch(current.toString(), {
        method: opts.method ?? "GET",
        redirect: "manual",
        signal: ctl.signal,
        headers: { "user-agent": "ADAI-intake/1.0 (+https://adai-basel.fly.dev)", ...(opts.headers ?? {}) },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) throw new SsrfError("redirect without location", "bad_redirect");
        // drain
        try { await res.arrayBuffer(); } catch { /* ignore */ }
        current = checkUrlSyntax(new URL(loc, current).toString());
        continue;
      }
      const len = parseInt(res.headers.get("content-length") ?? "", 10);
      if (Number.isFinite(len) && len > maxBytes) throw new SsrfError(`body exceeds ${maxBytes} bytes`, "too_large");
      const chunks: Buffer[] = [];
      let total = 0;
      if (res.body) {
        const reader = res.body.getReader();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > maxBytes) {
            try { await reader.cancel(); } catch { /* ignore */ }
            throw new SsrfError(`body exceeds ${maxBytes} bytes`, "too_large");
          }
          chunks.push(Buffer.from(value));
        }
      }
      return {
        final_url: current.toString(),
        status: res.status,
        content_type: res.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? null,
        bytes: Buffer.concat(chunks),
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
