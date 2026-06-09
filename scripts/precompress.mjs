#!/usr/bin/env node
// Pre-compress static text assets (.js/.css/.svg) into .br + .gz siblings so the
// server can ship them with ZERO per-request CPU — src/index.ts negotiates
// Content-Encoding and streams the matching sibling when the client accepts it.
//
// Run at Docker build time (see Dockerfile) and runnable locally via
// `npm run precompress`. Stdlib only (node:zlib) — no dependency, no new binary,
// matching the project's "bake artefacts at build, frugal at runtime" posture.
//
// Idempotent: re-running overwrites the siblings. The dev server works fine
// without them (the middleware falls through to uncompressed express.static).
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import { gzipSync, brotliCompressSync, constants } from "node:zlib";

const root = process.argv[2] || "public/field";
// Text assets worth compressing. Fonts (.woff2) are already compressed; images
// (png/jpg/avif) are too — skip both, gz/br would only inflate them.
const EXT = new Set([".js", ".css", ".svg"]);
const MIN_BYTES = 1024; // below this the encoding overhead isn't worth a 2nd file

let count = 0;
let rawTotal = 0;
let bestTotal = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      walk(p);
      continue;
    }
    if (name.endsWith(".br") || name.endsWith(".gz")) continue;
    const ext = extname(name).toLowerCase();
    if (!EXT.has(ext)) continue;
    if (st.size < MIN_BYTES) continue;

    const buf = readFileSync(p);
    const br = brotliCompressSync(buf, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 11,
        [constants.BROTLI_PARAM_SIZE_HINT]: buf.length,
      },
    });
    const gz = gzipSync(buf, { level: 9 });
    writeFileSync(p + ".br", br);
    writeFileSync(p + ".gz", gz);

    count++;
    rawTotal += buf.length;
    bestTotal += Math.min(br.length, gz.length);
    console.log(
      `  ${p}  ${buf.length}B → br ${br.length}B / gz ${gz.length}B`
    );
  }
}

walk(root);
const pct = rawTotal ? (100 * (1 - bestTotal / rawTotal)).toFixed(0) : "0";
console.log(
  `[precompress] ${count} files, ${(rawTotal / 1024).toFixed(0)} KiB → ${(bestTotal / 1024).toFixed(0)} KiB best-encoding (${pct}% smaller)`
);
