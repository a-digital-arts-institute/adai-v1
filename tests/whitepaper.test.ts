// /whitepaper (src/routes/whitepaper.ts): the committed markdown renders with
// section anchors + a contents list, figures resolve inside their version's
// directory, and the raw markdown + figures are served next to the page.

import { it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import whitepaper, { renderWhitepaper, headingId, WHITEPAPER_DIR } from "../src/routes/whitepaper.js";

it("whitepaper: headings get stable, unique ids; relative figures resolve into the version dir", () => {
  const r = renderWhitepaper(
    [
      "# Title",
      "## 5 · The threshold: vouched-for",
      "## Notes",
      "## Notes",
      "### Sub *part*",
      '<figure><img src="fig-1.webp" alt="a"><img src="https://x.example/y.png" alt="b"><img src="/abs.png" alt="c"></figure>',
      "| a | b |\n|---|---|\n| 1 | 2 |",
    ].join("\n\n"),
    "/whitepaper/v1.7/"
  );
  assert.equal(r.title, "Title");
  assert.deepEqual(r.toc.map((t) => t.id), ["5-the-threshold-vouched-for", "notes", "notes-2"]);
  assert.match(r.html, /<h3 id="sub-part">/);
  assert.match(r.html, /src="\/whitepaper\/v1\.7\/fig-1\.webp"/);
  assert.match(r.html, /src="https:\/\/x\.example\/y\.png"/);
  assert.match(r.html, /src="\/abs\.png"/);
  assert.match(r.html, /<div class="tbl"><table>[\s\S]*<\/table><\/div>/);
  assert.equal(headingId("Appendix A · Governance questions"), "appendix-a-governance-questions");
});

it("whitepaper: every version in versions.json has its markdown, and every figure it references exists", () => {
  const versions = JSON.parse(fs.readFileSync(path.join(WHITEPAPER_DIR, "versions.json"), "utf-8"));
  assert.ok(versions.length >= 1);
  for (const { version } of versions) {
    const dir = path.join(WHITEPAPER_DIR, `v${version}`);
    const md = fs.readFileSync(path.join(dir, "whitepaper.md"), "utf-8");
    const srcs = [...md.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
    for (const s of srcs) assert.ok(fs.existsSync(path.join(dir, s)), `v${version}: missing figure ${s}`);
  }
});

it("whitepaper: /whitepaper serves the current version; versioned URL, markdown and figures resolve; unknown versions 404", async () => {
  const versions = JSON.parse(fs.readFileSync(path.join(WHITEPAPER_DIR, "versions.json"), "utf-8"));
  const cur = versions[0].version as string;
  const app = express();
  app.use(whitepaper);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const page = await fetch(base + "/whitepaper");
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, new RegExp(`<link rel="canonical" href="/whitepaper/v${cur.replace(".", "\\.")}">`));
    assert.match(html, /<details class="wp-toc" open>/);
    assert.match(html, /<h2 id="1-the-problem">/);

    const pinned = await fetch(base + `/whitepaper/v${cur}`);
    assert.equal(pinned.status, 200);

    const md = await fetch(base + `/whitepaper/v${cur}/whitepaper.md`);
    assert.equal(md.status, 200);
    assert.match(md.headers.get("content-type") ?? "", /^text\/markdown/);

    const firstFig = /src="(\/whitepaper\/v[^"]+\.webp)"/.exec(html)?.[1];
    assert.ok(firstFig, "page references a figure");
    const fig = await fetch(base + firstFig);
    assert.equal(fig.status, 200);
    assert.equal(fig.headers.get("content-type"), "image/webp");

    assert.equal((await fetch(base + "/whitepaper/v0.0")).status, 404);
    assert.equal((await fetch(base + "/whitepaper/versions.json")).status, 200);
    assert.equal((await fetch(base + "/whitepaper/../package.json")).status, 404);
  } finally {
    server.close();
  }
});
