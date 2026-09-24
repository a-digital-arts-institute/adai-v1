// Scores the URL intake against sites whose right answers we know
// (eval/intake-sites.json). Each site becomes a real draft on the target
// instance — it costs model money (~$1–2 per site) — and is never confirmed.
//
//   ADAI_URL=http://localhost:8080 ADAI_TOKEN=adai_… npx tsx scripts/intake-eval.ts [substring…]
//   … scripts/intake-eval.ts drf_…   (score a draft that already ran / is running; no new spend)
//
// ADAI_TOKEN is any contributor bearer token on that instance (/api/intake/*
// accepts /api/v1 tokens). Run against a local `just intake-dev`, not prod:
// drafts are local tables, but they still count against the daily budget.
// A report lands in eval/results/<timestamp>.json (gitignored).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const BASE = (process.env.ADAI_URL || "http://localhost:8080").replace(/\/+$/, "");
const TOKEN = process.env.ADAI_TOKEN || "";
if (!TOKEN) { console.error("ADAI_TOKEN is required"); process.exit(2); }
const POLL_MS = 10_000;
const TIMEOUT_MS = 55 * 60_000;

interface Expect {
  represents?: string[];
  represents_exact?: boolean;
  min_image_ratio?: number;
  min_works?: number;
  min_questions?: number;
  kinds?: string[];
  subject_connected?: boolean;
}

const fold = (x: string) => x.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

async function api(method: string, path: string, body?: unknown): Promise<any> {
  const r = await fetch(BASE + path, { method, headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${path} → ${r.status} ${j?.message ?? j?.error ?? ""}`);
  return j;
}

function score(d: any, ex: Expect) {
  const cands: any[] = d.candidates.filter((c: any) => c.state !== "rejected" && c.state !== "context_only");
  const byCid = new Map(d.candidates.map((c: any) => [`cid:${c.cid}`, c]));
  const label = (ref: string): string => {
    const c: any = byCid.get(ref);
    if (c?.kind === "node") return c.node.name;
    return ref.slice(ref.indexOf(":") + 1).replace(/-/g, " ");
  };
  const reps = cands.filter((c) => c.kind === "edge" && c.edge.edge_type === "REPRESENTS").map((c) => label(c.edge.target));
  const works = cands.filter((c) => c.kind === "node" && c.node.type === "artwork");
  const imaged = new Set(cands.filter((c) => c.kind === "image").map((c) => c.image.for));
  const workImages = works.filter((w) => imaged.has(`cid:${w.cid}`) || (w.resolves_to && imaged.has(w.resolves_to))).length;
  const subject = d.subject_node_id as string | null;
  const subjectRefs = new Set<string>(subject ? [subject] : []);
  for (const c of cands) if (c.kind === "node" && c.resolves_to && subjectRefs.has(c.resolves_to)) subjectRefs.add(`cid:${c.cid}`);
  const subjectLinks = cands.filter((c) => c.kind === "edge" && (subjectRefs.has(c.edge.source) || subjectRefs.has(c.edge.target))).length;
  const quotes = cands.filter((c) => c.kind === "edge" && c.edge.edge_type === "REPRESENTS").map((c) => c.evidence?.quote ?? "");
  const kinds: string[] = [];
  for (const c of cands) if (c.kind === "node" && c.node.type === "institution" && (c.resolves_to === subject || `cid:${c.cid}` === subject) && Array.isArray(c.node.metadata?.kind)) kinds.push(...c.node.metadata.kind);
  for (const c of cands) if (c.kind === "patch" && c.patch.key === "kind" && c.patch.node_id === subject && Array.isArray(c.patch.proposed)) kinds.push(...c.patch.proposed);

  const checks: Array<{ check: string; ok: boolean; detail: string }> = [];
  if (ex.represents) {
    const want = ex.represents.map(fold);
    const got = reps.map(fold);
    const hit = (w: string) => got.some((g) => g.includes(w.split(" ").pop()!) );
    const found = want.filter(hit);
    const extra = got.filter((g) => !want.some((w) => g.includes(w.split(" ").pop()!)));
    checks.push({ check: "represents recall", ok: found.length === want.length, detail: `${found.length}/${want.length}${want.length > found.length ? ` missing: ${want.filter((w) => !hit(w)).join(", ")}` : ""}` });
    if (ex.represents_exact) checks.push({ check: "represents precision", ok: extra.length === 0, detail: `${reps.length} proposed, ${extra.length} not expected${extra.length ? `: ${extra.slice(0, 8).join(", ")}${extra.length > 8 ? " …" : ""}` : ""}` });
    const distinctQuotes = new Set(quotes).size;
    if (quotes.length > 1) checks.push({ check: "represents quotes distinct", ok: distinctQuotes >= Math.ceil(quotes.length / 2), detail: `${distinctQuotes} distinct quotes for ${quotes.length} cards` });
  }
  if (ex.min_works !== undefined) checks.push({ check: "works proposed", ok: works.length >= ex.min_works, detail: `${works.length} (min ${ex.min_works})` });
  if (ex.min_image_ratio !== undefined) {
    const ratio = works.length ? workImages / works.length : 1;
    checks.push({ check: "images per work", ok: ratio >= ex.min_image_ratio, detail: `${workImages}/${works.length}` });
  }
  if (ex.min_questions !== undefined) {
    const q = cands.filter((c) => c.kind === "question").length;
    checks.push({ check: "questions", ok: q >= ex.min_questions, detail: String(q) });
  }
  if (ex.kinds) {
    const missing = ex.kinds.filter((k) => !kinds.includes(k));
    checks.push({ check: "org kinds", ok: missing.length === 0, detail: kinds.length ? kinds.join(", ") + (missing.length ? ` (missing ${missing.join(", ")})` : "") : "none" });
  }
  if (ex.subject_connected) checks.push({ check: "subject connected", ok: subjectLinks > 0, detail: `${subject ?? "no subject"} · ${subjectLinks} relations` });
  return {
    cards: d.candidates.length,
    pages: d.pages.length,
    usd: d.usage?.est_cost_usd ?? null,
    site_kind: d.survey?.site_kind ?? null,
    status: d.status,
    error: d.error ?? null,
    checks,
  };
}

async function runSite(site: { url: string; expect: Expect }, existing?: string) {
  const started = Date.now();
  const id = existing ?? (await api("POST", "/api/intake/drafts", { source_url: site.url })).draft_id;
  process.stdout.write(`${site.url} → ${BASE}/draft/${id} `);
  for (;;) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const { draft } = await api("GET", `/api/intake/drafts/${id}`);
    process.stdout.write(".");
    if (!draft.job_pending && (draft.status === "ready" || draft.status === "failed")) {
      process.stdout.write(` ${Math.round((Date.now() - started) / 1000)}s\n`);
      return { url: site.url, draft_id: id, ...score(draft, site.expect) };
    }
    if (Date.now() - started > TIMEOUT_MS) return { url: site.url, draft_id: id, status: "timeout", checks: [] };
  }
}

const file = JSON.parse(readFileSync(new URL("../eval/intake-sites.json", import.meta.url), "utf8"));
const args = process.argv.slice(2);
const drafts = args.filter((a) => a.startsWith("drf_"));
const only = args.filter((a) => !a.startsWith("drf_"));
const bare = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
const jobs: Array<{ site: any; draft?: string }> = [];
for (const id of drafts) {
  const { draft } = await api("GET", `/api/intake/drafts/${id}`);
  const site = (file.sites as any[]).find((s) => bare(s.url) === bare(draft.source_url));
  if (!site) { console.error(`${id}: ${draft.source_url} is not in eval/intake-sites.json`); continue; }
  jobs.push({ site, draft: id });
}
if (!drafts.length) for (const s of file.sites as any[]) if (!only.length || only.some((o) => s.url.includes(o))) jobs.push({ site: s });
const results: any[] = [];
for (const { site: s, draft } of jobs) {
  try {
    results.push(await runSite(s, draft));
  } catch (e: any) {
    results.push({ url: s.url, status: "error", error: e?.message ?? String(e), checks: [] });
    console.log(`\n${s.url}: ${e?.message ?? e}`);
  }
}

console.log("");
let pass = 0, total = 0;
for (const r of results) {
  console.log(`${r.url}  [${r.status}${r.site_kind ? ` · ${r.site_kind}` : ""}${r.cards !== undefined ? ` · ${r.cards} cards · ${r.pages} pages` : ""}${r.usd != null ? ` · $${r.usd.toFixed(2)}` : ""}]${r.error ? `  ${r.error}` : ""}`);
  for (const c of r.checks) {
    total++; if (c.ok) pass++;
    console.log(`  ${c.ok ? "✔" : "✖"} ${c.check}: ${c.detail}`);
  }
}
console.log(`\n${pass}/${total} checks`);
mkdirSync(new URL("../eval/results/", import.meta.url), { recursive: true });
const out = new URL(`../eval/results/${new Date().toISOString().replace(/[:.]/g, "-")}.json`, import.meta.url);
writeFileSync(out, JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2));
console.log(`report: ${out.pathname}`);
