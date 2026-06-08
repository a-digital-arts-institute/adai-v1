// Latent "islands" — k-means over the identity vectors.
//
// The /field 30k view lays nodes out in field-flow order (type-runs along the
// Shape of Time). Islands give that layout a SEMANTIC macro-structure: each
// cluster becomes a contiguous region of the field, so the canon's latent
// geography (V&A plotter work, the crypto-art scene, the concept archipelago …)
// reads spatially without a UMAP scatterplot. Computed here from the embeddings
// we already keep — no 2D projection needed.
//
// Runs inside `embed:derive` (nightly on prod + at seed time), writes the
// local-only `node_islands` table, and is served read-only at GET /api/islands.
//
// Stability matters: a node that hops islands between runs would jump field
// regions visually. So we (1) seed the RNG deterministically and (2) match each
// run's centroids to the previous run's (persisted in `settings`) and relabel,
// keeping island ids stable as long as the clustering is stable.

import type { DatabaseSync } from "node:sqlite";
import { loadAll, l2normalise, cosine, DIMS } from "./vectors.js";

const DEFAULT_K = 16;
const MAX_ITERS = 50;
const N_INIT = 4;            // restarts; keep the lowest-inertia fit (≈ sklearn)
const SEED = 0x5eed1e;
const CENTROIDS_KEY = "island_centroids_v1";

// Deterministic PRNG so a re-run on unchanged vectors reproduces the layout.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Squared euclidean on L2-normalised vectors == 2 - 2·cosine, so it ranks the
// same as cosine distance; we use it for k-means++ weighting.
function sqdist(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i]! - b[i]!;
    s += d * d;
  }
  return s;
}

// k-means++ seeding (deterministic via the supplied rng).
function kppInit(vecs: Float32Array[], k: number, rng: () => number): Float32Array[] {
  const n = vecs.length;
  const centroids: Float32Array[] = [];
  centroids.push(vecs[Math.floor(rng() * n)]!);
  const d2 = new Float32Array(n).fill(Infinity);
  while (centroids.length < k) {
    const last = centroids[centroids.length - 1]!;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const d = sqdist(vecs[i]!, last);
      if (d < d2[i]!) d2[i] = d;
      sum += d2[i]!;
    }
    // Weighted pick proportional to D².
    let r = rng() * sum;
    let idx = n - 1;
    for (let i = 0; i < n; i++) {
      r -= d2[i]!;
      if (r <= 0) { idx = i; break; }
    }
    centroids.push(vecs[idx]!);
  }
  return centroids.map((c) => new Float32Array(c));
}

// Greedy stable relabel: match each new centroid to its nearest centroid from
// the previous run, so island id N keeps meaning roughly the same region.
function stablePermutation(next: Float32Array[], prev: Float32Array[] | null): number[] {
  const k = next.length;
  if (!prev || prev.length !== k) return next.map((_, i) => i);
  // For each previous centroid (in id order), claim the closest unused new one.
  const used = new Array(k).fill(false);
  const perm = new Array(k).fill(-1); // perm[newIdx] = stable id
  for (let prevId = 0; prevId < k; prevId++) {
    let best = -1, bestSim = -Infinity;
    for (let j = 0; j < k; j++) {
      if (used[j]) continue;
      const sim = cosine(prev[prevId]!, next[j]!);
      if (sim > bestSim) { bestSim = sim; best = j; }
    }
    if (best >= 0) { used[best] = true; perm[best] = prevId; }
  }
  // Any unmatched new centroid (shouldn't happen when k constant) gets a fresh id.
  let free = 0;
  for (let j = 0; j < k; j++) {
    if (perm[j] === -1) {
      while (used2(perm, free)) free++;
      perm[j] = free++;
    }
  }
  return perm;
}
function used2(perm: number[], id: number): boolean {
  return perm.includes(id);
}

interface LloydResult {
  assign: Int32Array;
  centroids: Float32Array[];
  inertia: number;
  iters: number;
}

// One k-means run (k-means++ init + Lloyd iterations). Returns the assignment,
// centroids and inertia (Σ squared-distance to assigned centroid) so the caller
// can keep the best of several restarts.
function runLloyd(vecs: Float32Array[], k: number, rng: () => number): LloydResult {
  const n = vecs.length;
  let centroids = kppInit(vecs, k, rng);
  const assign = new Int32Array(n).fill(-1);
  let iters = 0;
  for (; iters < MAX_ITERS; iters++) {
    let changed = 0;
    for (let i = 0; i < n; i++) {
      let best = 0, bestSim = -Infinity;
      for (let c = 0; c < k; c++) {
        const sim = cosine(vecs[i]!, centroids[c]!);
        if (sim > bestSim) { bestSim = sim; best = c; }
      }
      if (assign[i] !== best) { assign[i] = best; changed++; }
    }
    const sums: Float32Array[] = Array.from({ length: k }, () => new Float32Array(DIMS));
    const counts = new Int32Array(k);
    for (let i = 0; i < n; i++) {
      const c = assign[i]!;
      counts[c]!++;
      const v = vecs[i]!, s = sums[c]!;
      for (let d = 0; d < DIMS; d++) s[d]! += v[d]!;
    }
    for (let c = 0; c < k; c++) {
      if (counts[c]! === 0) {
        // Empty cluster — reseed onto the point farthest from its centroid.
        let far = 0, farD = -Infinity;
        for (let i = 0; i < n; i++) {
          const d = sqdist(vecs[i]!, centroids[assign[i]!]!);
          if (d > farD) { farD = d; far = i; }
        }
        centroids[c] = new Float32Array(vecs[far]!);
      } else {
        centroids[c] = l2normalise(sums[c]!);
      }
    }
    if (changed === 0 && iters > 0) { iters++; break; }
  }
  let inertia = 0;
  for (let i = 0; i < n; i++) inertia += sqdist(vecs[i]!, centroids[assign[i]!]!);
  return { assign, centroids, inertia, iters };
}

export interface IslandStats {
  k: number;
  n: number;
  iters: number;
  sizes: number[];
}

/**
 * Cluster the identity vectors into `k` islands and rewrite node_islands.
 * Idempotent and deterministic on unchanged vectors.
 */
export function computeIslands(
  db: DatabaseSync,
  opts: { k?: number; dryRun?: boolean } = {}
): IslandStats {
  const k = Math.max(2, opts.k ?? DEFAULT_K);

  // Identity vectors only — one per node (style_centroid rows are derived).
  const all = loadAll(db);
  const ids: string[] = [];
  const vecs: Float32Array[] = [];
  for (const row of all.values()) {
    if (row.kind !== "identity") continue;
    if (row.vec.length !== DIMS) continue;
    ids.push(row.node_id);
    vecs.push(l2normalise(row.vec)); // defensive — stored normalised already
  }
  const n = ids.length;
  if (n < k) {
    // Degenerate: fewer vectors than clusters. One island, no crash.
    if (!opts.dryRun) {
      db.exec("DELETE FROM node_islands");
      const ins = db.prepare("INSERT INTO node_islands (node_id, island) VALUES (?, 0)");
      db.exec("BEGIN");
      for (const id of ids) ins.run(id);
      db.exec("COMMIT");
    }
    return { k: 1, n, iters: 0, sizes: [n] };
  }

  // Several restarts off one deterministic rng; keep the lowest-inertia fit.
  // This is what stops a single unlucky k-means++ seed from leaving degenerate
  // 4–5 node clusters (sklearn does the same via n_init).
  const rng = mulberry32(SEED);
  let bestRun: LloydResult | null = null;
  let totalIters = 0;
  for (let r = 0; r < N_INIT; r++) {
    const run = runLloyd(vecs, k, rng);
    totalIters += run.iters;
    if (!bestRun || run.inertia < bestRun.inertia) bestRun = run;
  }
  const { assign } = bestRun!;
  const centroids = bestRun!.centroids;
  const iters = totalIters;

  // Stable relabel against the previous run's centroids.
  let prev: Float32Array[] | null = null;
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(CENTROIDS_KEY) as
      | { value: string }
      | undefined;
    if (row) {
      const arr = JSON.parse(row.value) as number[][];
      if (Array.isArray(arr) && arr.length === k) {
        prev = arr.map((a) => Float32Array.from(a));
      }
    }
  } catch { /* first run / corrupt — fall through to identity perm */ }

  const perm = stablePermutation(centroids, prev); // perm[rawCluster] = stableId
  const sizes = new Array(k).fill(0);
  for (let i = 0; i < n; i++) sizes[perm[assign[i]!]!]++;

  if (!opts.dryRun) {
    db.exec("DELETE FROM node_islands");
    const ins = db.prepare("INSERT INTO node_islands (node_id, island) VALUES (?, ?)");
    db.exec("BEGIN");
    for (let i = 0; i < n; i++) ins.run(ids[i]!, perm[assign[i]!]!);
    db.exec("COMMIT");

    // Persist centroids in stable-id order for next run's relabel.
    const ordered: number[][] = new Array(k);
    for (let c = 0; c < k; c++) ordered[perm[c]!] = Array.from(centroids[c]!);
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(
      CENTROIDS_KEY,
      JSON.stringify(ordered)
    );
  }

  return { k, n, iters, sizes };
}
