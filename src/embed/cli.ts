// CLI entry for the embedding derive pipeline.
//
//   npm run embed:derive       — chained centroids → derive (canonical)
//   npm run embed:centroids    — diagnostics only (embed:derive already runs it)
//   npm run embed:calibrate    — print similarity histograms against
//                                seed/_build/calibration_pairs.json
//
// All commands read/write `adai.db` (override via DB_PATH env). No network
// I/O: the actual API-bound work is in seed/_build/embed_nodes.py.

import { initDb } from "../db.js";
import { computeCentroids } from "./centroids.js";
import { derive } from "./derive.js";
import { loadAll, cosine } from "./vectors.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const dbPath = process.env.DB_PATH || join(PROJECT_ROOT, "adai.db");

function parseEnvFloat(name: string, def?: number): number | undefined {
  const v = process.env[name];
  if (!v) return def;
  const n = Number(v);
  if (Number.isNaN(n)) {
    console.error(`bad ${name}=${v} — must be a number`);
    process.exit(2);
  }
  return n;
}

function cmdCentroids() {
  const db = initDb(dbPath);
  const s = computeCentroids(db);
  console.log(JSON.stringify(s, null, 2));
}

function cmdDerive() {
  const db = initDb(dbPath);
  const tauAttribute = parseEnvFloat("TAU_ATTRIBUTE");
  const tauKin = parseEnvFloat("TAU_KIN");
  const tauVisual = parseEnvFloat("TAU_VISUAL");
  const dryRun = process.argv.includes("--dry-run");
  const t0 = Date.now();
  const stats = derive(db, { tauAttribute, tauKin, tauVisual, dryRun });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`derive complete in ${dt}s${dryRun ? " (dry-run)" : ""}:`);
  console.log(JSON.stringify(stats, null, 2));
  db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
}

interface CalibPair {
  positives: [string, string][];
  negatives: [string, string][];
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return NaN;
  if (p <= 0) return sorted[0]!;
  if (p >= 100) return sorted[sorted.length - 1]!;
  const idx = ((sorted.length - 1) * p) / 100;
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, sorted.length - 1);
  const frac = idx - lo;
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}

function cmdCalibrate() {
  const db = initDb(dbPath);
  computeCentroids(db); // refresh first — same logic as derive
  const all = loadAll(db);
  const centroids = new Map<string, Float32Array>();
  const identities = new Map<string, Float32Array>();
  for (const [, v] of all) {
    if (v.kind === "style_centroid") centroids.set(v.node_id, v.vec);
    else if (v.kind === "identity") identities.set(v.node_id, v.vec);
  }
  console.log(`loaded ${identities.size} identity vectors, ${centroids.size} centroids`);

  const pairs: CalibPair = JSON.parse(
    readFileSync(join(PROJECT_ROOT, "seed", "_build", "calibration_pairs.json"), "utf-8")
  );

  function score(art: string, prac: string): number | null {
    const av = identities.get(art);
    const cv = centroids.get(prac);
    if (!av || !cv) return null;
    return cosine(av, cv);
  }

  const pos: number[] = [];
  const neg: number[] = [];
  for (const [a, p] of pairs.positives) {
    const s = score(a, p);
    if (s !== null) pos.push(s);
  }
  for (const [a, p] of pairs.negatives) {
    const s = score(a, p);
    if (s !== null) neg.push(s);
  }
  pos.sort((x, y) => x - y);
  neg.sort((x, y) => x - y);

  function summary(label: string, vals: number[]) {
    if (!vals.length) {
      console.log(`${label}: (empty)`);
      return;
    }
    console.log(
      `${label}  n=${vals.length}  min=${vals[0]!.toFixed(4)} ` +
        `med=${percentile(vals, 50).toFixed(4)} max=${vals[vals.length - 1]!.toFixed(4)}`
    );
  }

  console.log("\nτ_attribute — artwork ↔ practitioner style_centroid");
  summary("  POSITIVES", pos);
  summary("  NEGATIVES", neg);
  if (pos.length && neg.length) {
    const gapLo = neg[neg.length - 1]!;
    const gapHi = pos[0]!;
    if (gapHi > gapLo) {
      console.log(`  CLEAN GAP: τ_attribute ≈ ${((gapLo + gapHi) / 2).toFixed(4)}`);
    } else {
      console.log(
        `  OVERLAP: max(neg)=${gapLo.toFixed(4)} ≥ min(pos)=${gapHi.toFixed(4)}; ` +
          `τ_attribute ≈ ${percentile(pos, 50).toFixed(4)} (median of positives — precision-biased)`
      );
    }
  }

  // τ_kin: pairwise centroid distribution.
  const pracs = [...centroids.keys()];
  const kinSims: number[] = [];
  for (let i = 0; i < pracs.length; i++) {
    const a = centroids.get(pracs[i]!)!;
    for (let j = i + 1; j < pracs.length; j++) {
      kinSims.push(cosine(a, centroids.get(pracs[j]!)!));
    }
  }
  kinSims.sort((x, y) => x - y);
  console.log(`\nτ_kin — practitioner pairs (n=${kinSims.length})`);
  if (kinSims.length) {
    console.log(
      `  p50=${percentile(kinSims, 50).toFixed(4)}  p95=${percentile(kinSims, 95).toFixed(4)}  p99=${percentile(kinSims, 99).toFixed(4)}`
    );
    console.log(`  RECOMMEND τ_kin ≈ ${percentile(kinSims, 95).toFixed(4)} (top 5%)`);
  }

  // τ_visual: sampled artwork pairs (full pairwise is ~200K pairs, fine in JS).
  const arts = [...identities.keys()].filter((k) => k.startsWith("artwork:"));
  const sample = arts.slice(0, 200);
  const visSims: number[] = [];
  for (let i = 0; i < sample.length; i++) {
    const a = identities.get(sample[i]!)!;
    for (let j = i + 1; j < sample.length; j++) {
      visSims.push(cosine(a, identities.get(sample[j]!)!));
    }
  }
  visSims.sort((x, y) => x - y);
  console.log(`\nτ_visual — artwork pairs (sampled ${sample.length} → ${visSims.length} pairs)`);
  if (visSims.length) {
    console.log(
      `  p50=${percentile(visSims, 50).toFixed(4)}  p95=${percentile(visSims, 95).toFixed(4)}  p99=${percentile(visSims, 99).toFixed(4)}`
    );
    console.log(`  RECOMMEND τ_visual ≈ ${percentile(visSims, 99).toFixed(4)} (top 1%)`);
  }
}

function main(): void {
  const cmd = process.argv[2];
  switch (cmd) {
    case "derive":
      cmdDerive();
      break;
    case "centroids":
      cmdCentroids();
      break;
    case "calibrate":
      cmdCalibrate();
      break;
    default:
      console.error(
        "usage: tsx src/embed/cli.ts {derive|centroids|calibrate} [--dry-run]\n" +
          "  derive runs centroids first by default."
      );
      process.exit(2);
  }
}

main();
