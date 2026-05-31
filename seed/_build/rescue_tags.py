#!/usr/bin/env python3
"""rescue_tags.py — embedding-coherence rescue of sub-threshold tags.

Tags below ``derive_curation.py``'s raw frequency gate (``TAG_MIN_ARTWORKS``)
are normally dropped. But many are real aesthetic categories — ``pixelart``,
``minimalism``, ``lineart``, ``mathart`` — that just narrowly missed the count,
while genuine noise (``random``, ``city``, ``square``) sits in the same bucket.

This rescues the ones whose tagged works are **visually coherent** in the
embedding space, using the SAME mean-centred coherence metric as the Tier-2
concept propagation (``src/embed/concept-edges.ts``):

  - centre all artwork vectors (subtract global mean, renormalise) — removes the
    "everything-is-colourful-abstract" common component that makes raw cosine
    match everything-to-everything;
  - a tag is RESCUED if its centred members' mean→centroid cosine ≥ τ_coh AND
    they span ≥ N distinct creators (kills single-artist tag-series that look
    coherent but aren't a shared category).

Reads:  seed/nodes.json, seed/edges.json, seed/embeddings.{json,bin}
Writes: seed/_build/rescued_tags.json  (committed, reviewable):
          { "params", "rescued": [{tag,count,coherence,creators}], "rejected": [...] }
        derive_curation.py reads the "rescued" list and mints those concepts IN
        ADDITION to the ones clearing the raw frequency gate. Pure vector math on
        the committed embeddings — no Gemini.

Run:  seed/_build/.venv/bin/python3 seed/_build/rescue_tags.py
Env:  TAG_RESCUE_MIN (10) · TAG_RESCUE_COH (0.15) · TAG_RESCUE_MIN_CREATORS (4)
"""
from __future__ import annotations

import json
import os
import struct
import sys
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
from derive_curation import TAG_MIN_ARTWORKS, TAG_STOPLIST  # keep gate + stoplist consistent

REPO = Path(__file__).resolve().parents[2]
SEED = REPO / "seed"
OUT = Path(__file__).parent / "rescued_tags.json"

# Candidate floor: tags with this many artworks (up to the auto-admit gate) are
# coherence-tested. Below it, too little signal to trust even with embeddings.
RESCUE_MIN = int(os.environ.get("TAG_RESCUE_MIN", "10"))
# Coherence threshold — same metric + default as Tier-2 (TAU_CONCEPT_COH).
RESCUE_COH = float(os.environ.get("TAG_RESCUE_COH", "0.15"))
# Distinct-creator floor — kills single-artist tag-series masquerading as a category.
RESCUE_MIN_CREATORS = int(os.environ.get("TAG_RESCUE_MIN_CREATORS", "4"))


def _parse_md(n: dict) -> dict:
    md = n.get("metadata")
    if isinstance(md, str):
        try:
            return json.loads(md)
        except json.JSONDecodeError:
            return {}
    return md or {}


def _load_rows(name: str) -> list:
    txt = (SEED / name).read_text().strip()
    if not txt:
        return []
    return json.loads(txt) if txt.startswith("[") else [json.loads(l) for l in txt.splitlines() if l.strip()]


def _load_artwork_vectors(artwork_ids: set[str]) -> dict[str, np.ndarray]:
    meta = json.loads((SEED / "embeddings.json").read_text())
    raw = (SEED / "embeddings.bin").read_bytes()
    vecs: dict[str, np.ndarray] = {}
    for e in meta:
        if e.get("kind") != "identity" or e["node_id"] not in artwork_ids:
            continue
        d = e["dims"]; off = e["offset"]  # byte offset
        v = np.frombuffer(raw[off:off + d * 4], dtype="<f4").astype(np.float64)
        vecs[e["node_id"]] = v
    return vecs


def main() -> int:
    nodes = _load_rows("nodes.json")
    edges = _load_rows("edges.json")
    artworks = {n["id"]: _parse_md(n) for n in nodes if n["type"] == "artwork"}

    # artwork -> creator (CREATED_BY target), for the creator-diversity gate
    creator_of: dict[str, str] = {}
    for e in edges:
        if e.get("edge_type") == "CREATED_BY" and e.get("source_id") in artworks:
            creator_of.setdefault(e["source_id"], e.get("target_id"))

    # tag -> [artwork_ids]
    tag_arts: dict[str, list[str]] = defaultdict(list)
    for aid, md in artworks.items():
        for t in md.get("tags", []) or []:
            if isinstance(t, str) and t.strip():
                tag_arts[t.strip().lower()].append(aid)

    vecs = _load_artwork_vectors(set(artworks))
    if not vecs:
        print("no artwork vectors found — embeddings.{json,bin} missing/empty", file=sys.stderr)
        return 1

    # Mean-centre + renormalise (matches concept-edges.ts).
    mat = np.vstack(list(vecs.values()))
    mean = mat.mean(axis=0)
    centred: dict[str, np.ndarray] = {}
    for aid, v in vecs.items():
        c = v - mean
        n = np.linalg.norm(c) or 1.0
        centred[aid] = c / n

    rescued, rejected = [], []
    for tag, arts in tag_arts.items():
        cnt = len(arts)
        if cnt >= TAG_MIN_ARTWORKS or cnt < RESCUE_MIN:
            continue  # auto-admitted, or too rare to test
        if tag in TAG_STOPLIST:
            continue
        members = [a for a in arts if a in centred]
        if len(members) < RESCUE_MIN:
            continue
        M = np.vstack([centred[a] for a in members])
        centroid = M.mean(axis=0)
        cn = np.linalg.norm(centroid) or 1.0
        centroid = centroid / cn
        coherence = float((M @ centroid).mean())
        creators = len({creator_of.get(a) for a in members} - {None})
        rec = {"tag": tag, "count": cnt, "coherence": round(coherence, 4), "creators": creators}
        if coherence >= RESCUE_COH and creators >= RESCUE_MIN_CREATORS:
            rescued.append(rec)
        else:
            rec["why"] = ("low_coherence" if coherence < RESCUE_COH else "few_creators")
            rejected.append(rec)

    rescued.sort(key=lambda r: -r["coherence"])
    rejected.sort(key=lambda r: -r["coherence"])
    payload = {
        "params": {"rescue_min": RESCUE_MIN, "auto_admit_min": TAG_MIN_ARTWORKS,
                   "coherence_threshold": RESCUE_COH, "min_creators": RESCUE_MIN_CREATORS},
        "rescued_count": len(rescued),
        "rejected_count": len(rejected),
        "rescued": rescued,
        "rejected": rejected,
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote {OUT.relative_to(REPO)}")
    print(f"  candidates {len(rescued)+len(rejected)}  →  RESCUED {len(rescued)}  rejected {len(rejected)}")
    print(f"  params: count∈[{RESCUE_MIN},{TAG_MIN_ARTWORKS}), coherence≥{RESCUE_COH}, creators≥{RESCUE_MIN_CREATORS}")
    print("\n  top rescued:")
    for r in rescued[:30]:
        print(f"    ✓ {r['tag']:<18} n={r['count']:>2} coh={r['coherence']:.3f} creators={r['creators']}")
    print("\n  notable rejected (would-be by frequency, killed by coherence/creators):")
    for r in rejected[:12]:
        print(f"    ✗ {r['tag']:<18} n={r['count']:>2} coh={r['coherence']:.3f} creators={r['creators']} [{r['why']}]")
    return 0


if __name__ == "__main__":
    sys.exit(main())
