#!/usr/bin/env python3
"""
Calibrate similarity thresholds (τ_attribute, τ_kin, τ_visual) against the
embedded vectors in seed/embeddings.{bin,json} using the hand-picked pairs
in seed/_build/calibration_pairs.json.

Print-only; does NOT write to the DB or rewrite thresholds anywhere. Use
the output to choose τ values, then plug them into src/embed/derive.ts.

Usage (from project root):
  seed/_build/.venv/bin/python3 seed/_build/calibrate.py
"""
from __future__ import annotations

import json
import struct
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EMB_BIN = ROOT / "seed" / "embeddings.bin"
EMB_META = ROOT / "seed" / "embeddings.json"
EDGES = ROOT / "seed" / "edges.json"
PAIRS = ROOT / "seed" / "_build" / "calibration_pairs.json"

DIMS = 768


def load_vectors() -> dict[tuple[str, str], list[float]]:
    """Returns {(node_id, kind) → vector}."""
    if not EMB_BIN.exists() or not EMB_META.exists():
        sys.exit("seed/embeddings.{bin,json} missing — run embed_nodes.py first")
    meta = json.loads(EMB_META.read_text())
    raw = EMB_BIN.read_bytes()
    out: dict[tuple[str, str], list[float]] = {}
    for e in meta:
        off = e["offset"]
        dims = e["dims"]
        if dims != DIMS:
            continue
        chunk = raw[off:off + dims * 4]
        vec = list(struct.unpack(f"<{dims}f", chunk))
        out[(e["node_id"], e["kind"])] = vec
    return out


def l2_normalise(v: list[float]) -> list[float]:
    s = sum(x * x for x in v)
    if s <= 0:
        return v
    n = s ** 0.5
    return [x / n for x in v]


def cosine(a: list[float], b: list[float]) -> float:
    # vectors are stored L2-normalised, so dot product == cosine.
    return sum(x * y for x, y in zip(a, b))


def compute_style_centroids(vectors: dict[tuple[str, str], list[float]]) -> dict[str, list[float]]:
    """
    For each practitioner P, mean the artwork vectors where the edge
    artwork → P with edge_type CREATED_BY exists. L2-normalise. Skip
    practitioners with zero qualifying artworks.
    """
    edges = json.loads(EDGES.read_text())
    by_pract: dict[str, list[list[float]]] = defaultdict(list)
    for e in edges:
        if e.get("edge_type") != "CREATED_BY":
            continue
        src, tgt = e["source_id"], e["target_id"]
        # Canonical direction in seed: artwork → practitioner
        if not (src.startswith("artwork:") and tgt.startswith("practitioner:")):
            continue
        # Filter to live edges
        if e.get("valid_until") not in (None, ""):
            continue
        v = vectors.get((src, "identity"))
        if v is None:
            continue
        by_pract[tgt].append(v)

    out: dict[str, list[float]] = {}
    for p, vs in by_pract.items():
        if not vs:
            continue
        mean = [sum(col) / len(vs) for col in zip(*vs)]
        out[p] = l2_normalise(mean)
    return out


def percentiles(vals: list[float], ps=(0, 10, 25, 50, 75, 90, 100)) -> dict[int, float]:
    if not vals:
        return {p: float("nan") for p in ps}
    sv = sorted(vals)
    out = {}
    for p in ps:
        if p == 0:
            out[p] = sv[0]
        elif p == 100:
            out[p] = sv[-1]
        else:
            idx = (len(sv) - 1) * p / 100
            lo, hi = int(idx), min(int(idx) + 1, len(sv) - 1)
            frac = idx - lo
            out[p] = sv[lo] * (1 - frac) + sv[hi] * frac
    return out


def histogram_line(vals: list[float], lo: float = 0.0, hi: float = 1.0, bins: int = 30) -> str:
    if not vals:
        return "(no data)"
    counts = [0] * bins
    for v in vals:
        clipped = max(lo, min(hi - 1e-9, v))
        idx = int((clipped - lo) / (hi - lo) * bins)
        counts[idx] += 1
    peak = max(counts)
    if peak == 0:
        return "(no data)"
    cols = []
    for c in counts:
        h = c / peak
        cols.append("█" if h >= 0.85 else "▇" if h >= 0.7 else "▆" if h >= 0.55
                    else "▅" if h >= 0.4 else "▄" if h >= 0.25 else "▃" if h >= 0.15
                    else "▂" if h > 0 else " ")
    return "".join(cols)


def report_distribution(name: str, vals: list[float]) -> None:
    p = percentiles(vals)
    print(f"\n{name}  (n={len(vals)})")
    if not vals:
        print("  (empty — fix the calibration set or check IDs)")
        return
    print(f"  min={p[0]:.4f}  p10={p[10]:.4f}  p25={p[25]:.4f}  "
          f"med={p[50]:.4f}  p75={p[75]:.4f}  p90={p[90]:.4f}  max={p[100]:.4f}")
    print(f"  [0.0 ─────────────────────────── 1.0]")
    print(f"   {histogram_line(vals)}")


def main() -> int:
    vectors = load_vectors()
    print(f"loaded {len(vectors)} vectors from {EMB_META.name}")

    centroids = compute_style_centroids(vectors)
    print(f"computed {len(centroids)} practitioner style centroids")

    pairs = json.loads(PAIRS.read_text())
    positives = pairs.get("positives", [])
    negatives = pairs.get("negatives", [])

    # ----- τ_attribute: artwork vec ↔ practitioner style_centroid -----
    pos_attr: list[float] = []
    neg_attr: list[float] = []
    missing_centroid = set()
    missing_artwork = set()

    def score_pair(art_id: str, prac_id: str) -> float | None:
        av = vectors.get((art_id, "identity"))
        cv = centroids.get(prac_id)
        if av is None:
            missing_artwork.add(art_id)
            return None
        if cv is None:
            missing_centroid.add(prac_id)
            return None
        return cosine(av, cv)

    for art_id, prac_id in positives:
        s = score_pair(art_id, prac_id)
        if s is not None:
            pos_attr.append(s)
    for art_id, prac_id in negatives:
        s = score_pair(art_id, prac_id)
        if s is not None:
            neg_attr.append(s)

    print("\n=" * 1 + "=" * 78)
    print("τ_attribute — artwork ↔ practitioner style_centroid")
    print("=" * 79)
    report_distribution("POSITIVES (real CREATED_BY pairs)", pos_attr)
    report_distribution("NEGATIVES (cross-scene pairs)", neg_attr)

    if pos_attr and neg_attr:
        gap_lo = max(neg_attr)
        gap_hi = min(pos_attr)
        if gap_hi > gap_lo:
            recommended = (gap_hi + gap_lo) / 2
            print(f"\nclean gap: max(neg)={gap_lo:.4f} < min(pos)={gap_hi:.4f}")
            print(f"  RECOMMEND τ_attribute = {recommended:.4f}")
        else:
            # Overlap — pick a threshold that prioritises precision (few false-positives).
            from statistics import median
            recommended = median(pos_attr)  # ~50% recall, hopefully high precision
            overlap = sum(1 for n in neg_attr if n >= gap_hi)
            print(f"\nOVERLAP: max(neg)={gap_lo:.4f} >= min(pos)={gap_hi:.4f}")
            print(f"  {overlap} negatives sit at or above the lowest positive.")
            print(f"  RECOMMEND τ_attribute ≈ {recommended:.4f}  "
                  f"(median of positives — tune for precision)")

    if missing_centroid:
        print(f"\nmissing centroids: {len(missing_centroid)}")
        for p in sorted(missing_centroid)[:10]:
            print(f"  - {p}")
    if missing_artwork:
        print(f"\nmissing artwork vectors: {len(missing_artwork)}")
        for a in sorted(missing_artwork)[:10]:
            print(f"  - {a}")

    # ----- τ_kin: practitioner centroid ↔ practitioner centroid -----
    print("\n" + "=" * 79)
    print("τ_kin — practitioner ↔ practitioner style_centroid (informational)")
    print("=" * 79)
    # We don't have hand-labelled kin pairs; compute the pairwise distribution
    # so the human can pick a τ by tail thickness. Should be a one-tailed
    # distribution with a small bump on the high end (genuine kin).
    pairs_kin: list[float] = []
    pracs = sorted(centroids.keys())
    for i in range(len(pracs)):
        for j in range(i + 1, len(pracs)):
            pairs_kin.append(cosine(centroids[pracs[i]], centroids[pracs[j]]))
    report_distribution("all practitioner-pair similarities", pairs_kin)
    if pairs_kin:
        p95 = percentiles(pairs_kin, (95, 99))
        print(f"\n  p95={p95[95]:.4f}  p99={p95[99]:.4f}")
        print(f"  RECOMMEND τ_kin ≈ {p95[95]:.4f}  (top 5% of pairs — tune to taste)")

    # ----- τ_visual: artwork identity ↔ artwork identity -----
    print("\n" + "=" * 79)
    print("τ_visual — artwork ↔ artwork (informational; sampled)")
    print("=" * 79)
    art_ids = [k[0] for k in vectors if k[1] == "identity" and k[0].startswith("artwork:")]
    # Cap sample to keep this fast on the dev box.
    SAMPLE = 200
    sample = art_ids[:SAMPLE]
    pairs_v: list[float] = []
    for i in range(len(sample)):
        for j in range(i + 1, len(sample)):
            pairs_v.append(cosine(vectors[(sample[i], "identity")],
                                  vectors[(sample[j], "identity")]))
    report_distribution(f"artwork pairs (sampled {len(sample)} artworks → {len(pairs_v)} pairs)",
                        pairs_v)
    if pairs_v:
        p99 = percentiles(pairs_v, (95, 99))
        print(f"\n  p99={p99[99]:.4f}")
        print(f"  RECOMMEND τ_visual ≈ {p99[99]:.4f}  (top 1% — visual rhymes are rarer than style kin)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
