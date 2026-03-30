/**
 * Vercel Serverless Function — Drop a Link intake.
 *
 * Accepts a URL + optional note from the public web form.
 * Validates, fetches page metadata, posts to Notion Signal Inbox as "raw".
 * The existing signal_processor.py pipeline then picks it up for full analysis.
 *
 * Environment variables (set in Vercel dashboard):
 *   NOTION_TOKEN        — internal integration token
 *   NOTION_DB_SIGNALS   — Signal Inbox database ID
 */

// ── Simple in-memory rate limiter (per cold-start window) ───
const ipCounts = new Map();
const IP_LIMIT = 10;          // max requests per IP per window
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRate(ip) {
  const now = Date.now();
  if (!ipCounts.has(ip)) {
    ipCounts.set(ip, { count: 1, start: now });
    return true;
  }
  const entry = ipCounts.get(ip);
  if (now - entry.start > WINDOW_MS) {
    entry.count = 1;
    entry.start = now;
    return true;
  }
  entry.count++;
  return entry.count <= IP_LIMIT;
}

// ── URL validation ──────────────────────────────────────────
function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// ── Fetch page metadata ─────────────────────────────────────
async function fetchMeta(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "ADAI-LinkDrop/1.0 (collective intelligence intake)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) return { title: "", description: "" };

    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:title["']/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:description["']/i);

    return {
      title: (ogTitleMatch?.[1] || titleMatch?.[1] || "").trim().slice(0, 200),
      description: (ogDescMatch?.[1] || descMatch?.[1] || "").trim().slice(0, 500),
    };
  } catch {
    return { title: "", description: "" };
  }
}

// ── Handler ─────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ── Validate env ──
  const NOTION_TOKEN = process.env.NOTION_TOKEN;
  const DB_ID = process.env.NOTION_DB_SIGNALS;
  if (!NOTION_TOKEN || !DB_ID) {
    return res.status(500).json({ error: "Server misconfigured" });
  }

  // ── Rate limit by IP ──
  const ip = req.headers["x-real-ip"] || req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (!checkRate(ip)) {
    return res.status(429).json({ error: "Too many submissions. Please try again later." });
  }

  // ── Parse body ──
  const { url, note, submitted_by, _hp } = req.body || {};

  // Honeypot check (hidden field — bots fill it, humans don't)
  if (_hp) {
    return res.status(200).json({ ok: true, title: "Submitted" }); // silent success for bots
  }

  // ── Validate URL ──
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL is required" });
  }

  const cleanUrl = url.trim();
  if (cleanUrl.length > 2000) {
    return res.status(400).json({ error: "URL too long" });
  }
  if (!isValidUrl(cleanUrl)) {
    return res.status(400).json({ error: "Invalid URL format. Must start with http:// or https://" });
  }

  // ── Validate note ──
  const cleanNote = (note || "").trim().slice(0, 1000);
  const submitter = (submitted_by || "").trim().slice(0, 50) || "community";

  // ── Fetch page metadata ──
  const meta = await fetchMeta(cleanUrl);
  const signalTitle = meta.title || cleanUrl.slice(0, 100);

  // Build raw_content from metadata + user note
  const rawParts = [];
  if (meta.title) rawParts.push("Title: " + meta.title);
  if (meta.description) rawParts.push("Description: " + meta.description);
  rawParts.push("URL: " + cleanUrl);
  if (cleanNote) rawParts.push("Contributor note: " + cleanNote);
  const rawContent = rawParts.join("\n\n").slice(0, 2000);

  // ── Create Notion page ──
  const today = new Date().toISOString().slice(0, 10);

  const notionBody = {
    parent: { database_id: DB_ID },
    properties: {
      Name: { title: [{ text: { content: signalTitle } }] },
      source_type: { select: { name: "link_drop" } },
      raw_content: { rich_text: [{ text: { content: rawContent } }] },
      submitted_by: { select: { name: submitter } },
      date_captured: { date: { start: today } },
      protocol_stage: { select: { name: "SENSE" } },
      status: { select: { name: "raw" } },
      url: { url: cleanUrl },
      intelligence_tier: { select: { name: "secondary" } },
      signal_confidence: { select: { name: "unverified" } },
    },
  };

  try {
    const notionRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + NOTION_TOKEN,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(notionBody),
    });

    if (!notionRes.ok) {
      const err = await notionRes.json().catch(() => ({}));
      console.error("Notion error:", notionRes.status, err);
      return res.status(502).json({ error: "Failed to save signal. Please try again." });
    }

    const result = await notionRes.json();
    return res.status(200).json({
      ok: true,
      title: signalTitle,
      id: result.id,
    });
  } catch (err) {
    console.error("Notion request failed:", err);
    return res.status(500).json({ error: "Connection error. Please try again." });
  }
}
