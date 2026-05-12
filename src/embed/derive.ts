// Pairwise derive pass over the embedding vector space.
//
// Emits two edge types directly into `edges` (CRR, syncs via CR-SQLite):
//   - STYLE_KIN          practitioner ↔ practitioner   (stored bidirectionally)
//   - VISUALLY_AFFINE    artwork    ↔ artwork          (stored bidirectionally)
//
// Plus one queue-only proposal type (not an edge):
//   - SUGGESTS_CREATED_BY  →  intake_queue row with kind='ai_suggestion'
//     and proposed_edges JSON describing a candidate `CREATED_BY` edge
//     (artwork → practitioner). Curator approves to create the real edge.
//
// First action is `computeCentroids()` — derive must never score against
// stale centroids after a curator approves new CREATED_BY edges.
//
// Idempotency: every run starts with
//   DELETE FROM edges WHERE created_by='embedding-multimodal-v1'
//   DELETE FROM intake_queue WHERE submitted_by='contributor:embedding-pipeline'
//                                AND status='pending'
// so partial runs and threshold tweaks produce clean output.
//
// Rejected pairs (curator pressed Reject on a SUGGESTS_CREATED_BY proposal)
// are skipped via the `rejected_ai_suggestions` table so we don't keep
// re-proposing the same attribution every run.

import type { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { cosine, loadAll } from "./vectors.js";
import { computeCentroids } from "./centroids.js";

const SIGNAL_ID = "signal:embedding-multimodal-2026-05";
const CONTRIBUTOR_ID = "contributor:embedding-pipeline";
const CREATED_BY_TAG = "embedding-multimodal-v1";

// Thresholds calibrated from seed/_build/calibration_pairs.json against the
// initial embed pass (n=29 positives, n=29 negatives — see
// `npm run embed:calibrate` for histograms). Override at runtime via env.
//
// τ_attribute: median of positives, rounded up. Optimises for precision
//   (high-quality intake_queue proposals) over recall — false positives
//   waste curator time.
// τ_kin / τ_visual: percentile-based; no ground truth, tune by inspection.
const DEFAULTS = {
  tauAttribute: 0.88,
  tauKin: 0.91,
  tauVisual: 0.84,
};

export interface DeriveOptions {
  tauAttribute?: number;
  tauKin?: number;
  tauVisual?: number;
  dryRun?: boolean;
  // Skip computing centroids — useful for cheap re-tunes when nothing
  // about CREATED_BY edges changed. Default false (chained from CLI).
  skipCentroids?: boolean;
}

export interface DeriveStats {
  thresholds: { tau_attribute: number; tau_kin: number; tau_visual: number };
  style_kin: { pairs: number; rows_written: number };
  visually_affine: { pairs: number; rows_written: number };
  suggests_created_by: { proposals: number; rejected_skipped: number };
  unattributed_artworks_scored: number;
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function edgeId(source: string, edgeType: string, target: string): string {
  return `${source}--${edgeType}--${target}--${CREATED_BY_TAG}`;
}

function pairHash(source: string, edgeType: string, target: string): string {
  return createHash("sha256").update(`${source}|${edgeType}|${target}`).digest("hex");
}

export function derive(db: DatabaseSync, opts: DeriveOptions = {}): DeriveStats {
  const tauA = opts.tauAttribute ?? DEFAULTS.tauAttribute;
  const tauK = opts.tauKin ?? DEFAULTS.tauKin;
  const tauV = opts.tauVisual ?? DEFAULTS.tauVisual;
  const dry = !!opts.dryRun;

  // 1. Refresh centroids unless explicitly skipped.
  if (!opts.skipCentroids) {
    const cs = computeCentroids(db);
    console.log(
      `centroids: ${cs.practitioners_with_centroid} written, ` +
        `${cs.practitioners_skipped_no_artworks} skipped (zero artworks), ` +
        `${cs.artworks_missing_vectors} CREATED_BY targets lacked an artwork vector`
    );
  }

  // 2. Clean slate (unless dry).
  if (!dry) {
    db.exec(
      `DELETE FROM edges WHERE created_by = '${CREATED_BY_TAG}';
       DELETE FROM intake_queue WHERE submitted_by = '${CONTRIBUTOR_ID}' AND status = 'pending';`
    );
  }

  // 3. Load vectors + auxiliary lookups.
  const all = loadAll(db);
  const centroidByPract = new Map<string, Float32Array>();
  const identityByNode = new Map<string, Float32Array>();
  for (const [, v] of all) {
    if (v.kind === "style_centroid") centroidByPract.set(v.node_id, v.vec);
    else if (v.kind === "identity") identityByNode.set(v.node_id, v.vec);
  }

  // Map artwork → set of known creators (for VISUALLY_AFFINE filter and
  // SUGGESTS_CREATED_BY "unattributed?" check).
  const creatorsByArtwork = new Map<string, Set<string>>();
  {
    const rows = db
      .prepare(
        `SELECT source_id, target_id FROM edges
         WHERE edge_type = 'CREATED_BY'
           AND valid_until IS NULL
           AND source_id LIKE 'artwork:%'
           AND target_id LIKE 'practitioner:%'`
      )
      .all() as Array<{ source_id: string; target_id: string }>;
    for (const r of rows) {
      if (!creatorsByArtwork.has(r.source_id)) creatorsByArtwork.set(r.source_id, new Set());
      creatorsByArtwork.get(r.source_id)!.add(r.target_id);
    }
  }

  // Rejection cache — skip any proposal whose pair_hash is already rejected.
  const rejected = new Set(
    (
      db.prepare("SELECT pair_hash FROM rejected_ai_suggestions").all() as Array<{ pair_hash: string }>
    ).map((r) => r.pair_hash)
  );

  // 4. Compute three passes.
  const stats: DeriveStats = {
    thresholds: { tau_attribute: tauA, tau_kin: tauK, tau_visual: tauV },
    style_kin: { pairs: 0, rows_written: 0 },
    visually_affine: { pairs: 0, rows_written: 0 },
    suggests_created_by: { proposals: 0, rejected_skipped: 0 },
    unattributed_artworks_scored: 0,
  };

  const now = nowIso();

  const insertEdge = db.prepare(
    `INSERT INTO edges (
       id, source_id, target_id, edge_type, signal_id,
       confidence, charge, created_at, created_by,
       event_time, valid_from, valid_until, invalidated_by
     ) VALUES (?, ?, ?, ?, ?, 'low', NULL, ?, ?, NULL, ?, NULL, NULL)`
  );

  const insertIntake = db.prepare(
    `INSERT INTO intake_queue (
       id, signal_id, target_node, submitted_by, trust_tier,
       status, kind, proposed_edges, created_at
     ) VALUES (?, ?, ?, ?, 'probationary', 'pending', 'ai_suggestion', ?, ?)`
  );

  // ----- STYLE_KIN ---------------------------------------------------------
  // Practitioner ↔ practitioner over style centroids. Bidirectional rows so
  // BFS / profile-page edge lists don't need to know which types are symmetric.
  const pracs = [...centroidByPract.keys()].sort();
  if (!dry) db.exec("BEGIN");
  try {
    for (let i = 0; i < pracs.length; i++) {
      const a = pracs[i]!;
      const va = centroidByPract.get(a)!;
      for (let j = i + 1; j < pracs.length; j++) {
        const b = pracs[j]!;
        const vb = centroidByPract.get(b)!;
        const sim = cosine(va, vb);
        if (sim < tauK) continue;
        stats.style_kin.pairs++;
        if (dry) continue;
        // Two rows, one per direction.
        insertEdge.run(edgeId(a, "STYLE_KIN", b), a, b, "STYLE_KIN", SIGNAL_ID, now, CREATED_BY_TAG, now);
        insertEdge.run(edgeId(b, "STYLE_KIN", a), b, a, "STYLE_KIN", SIGNAL_ID, now, CREATED_BY_TAG, now);
        stats.style_kin.rows_written += 2;
      }
    }

    // ----- VISUALLY_AFFINE ------------------------------------------------
    // Artwork ↔ artwork. Skip same-creator pairs (they'd surface "the artist
    // makes their own work" which is uninformative). Pairs where both
    // artworks lack a known creator ARE emitted — those are exactly the
    // attribution-candidate use case.
    const arts = [...identityByNode.keys()].filter((id) => id.startsWith("artwork:")).sort();
    for (let i = 0; i < arts.length; i++) {
      const a = arts[i]!;
      const va = identityByNode.get(a)!;
      const ca = creatorsByArtwork.get(a) ?? new Set<string>();
      for (let j = i + 1; j < arts.length; j++) {
        const b = arts[j]!;
        const vb = identityByNode.get(b)!;
        const sim = cosine(va, vb);
        if (sim < tauV) continue;
        // Skip same-creator pairs (intersection non-empty).
        if (ca.size > 0) {
          const cb = creatorsByArtwork.get(b);
          if (cb) {
            let shared = false;
            for (const x of ca) if (cb.has(x)) { shared = true; break; }
            if (shared) continue;
          }
        }
        stats.visually_affine.pairs++;
        if (dry) continue;
        insertEdge.run(edgeId(a, "VISUALLY_AFFINE", b), a, b, "VISUALLY_AFFINE", SIGNAL_ID, now, CREATED_BY_TAG, now);
        insertEdge.run(edgeId(b, "VISUALLY_AFFINE", a), b, a, "VISUALLY_AFFINE", SIGNAL_ID, now, CREATED_BY_TAG, now);
        stats.visually_affine.rows_written += 2;
      }
    }

    // ----- SUGGESTS_CREATED_BY (intake_queue) ----------------------------
    // For each unattributed artwork A (no live CREATED_BY edge), score
    // against every practitioner's style_centroid. If sim ≥ τ_attribute,
    // enqueue an ai_suggestion row with the proposed CREATED_BY edge
    // (direction: artwork → practitioner, matching seed convention).
    let suggestionCounter = 0;
    for (const a of arts) {
      const known = creatorsByArtwork.get(a);
      if (known && known.size > 0) continue; // already attributed
      const va = identityByNode.get(a)!;
      stats.unattributed_artworks_scored++;
      // Find the best-matching practitioner above threshold.
      let best: { practitioner: string; sim: number } | null = null;
      for (const [p, vc] of centroidByPract) {
        const sim = cosine(va, vc);
        if (sim < tauA) continue;
        if (!best || sim > best.sim) best = { practitioner: p, sim };
      }
      if (!best) continue;
      // Skip if curator has already rejected this exact attribution.
      const hash = pairHash(a, "CREATED_BY", best.practitioner);
      if (rejected.has(hash)) {
        stats.suggests_created_by.rejected_skipped++;
        continue;
      }
      stats.suggests_created_by.proposals++;
      if (dry) continue;
      // URL-safe id: a deterministic short hash over (artwork, practitioner).
      // The intake_queue id ends up in /api/review/:id/{approve,reject} paths
      // and reviewAction()'s JS string-concatenation; spaces/colons in the
      // node ids would break both.
      const idHash = createHash("sha1").update(`${a}|${best.practitioner}`).digest("hex").slice(0, 12);
      const id = `intake-ai-${idHash}`;
      suggestionCounter++;
      const proposed = JSON.stringify([
        {
          source_id: a,
          target_id: best.practitioner,
          edge_type: "CREATED_BY",
          // Carry the similarity through so the review UI can sort / show it.
          similarity: Number(best.sim.toFixed(4)),
        },
      ]);
      insertIntake.run(id, SIGNAL_ID, a, CONTRIBUTOR_ID, proposed, now);
    }

    if (!dry) db.exec("COMMIT");
  } catch (e) {
    if (!dry) db.exec("ROLLBACK");
    throw e;
  }

  return stats;
}
