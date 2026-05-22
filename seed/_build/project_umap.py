#!/usr/bin/env python3
"""
Project the embedding sidecar (seed/embeddings.{bin,json}) to 2D via UMAP
and write seed/embeddings.umap2d.json — a small flat array the server
loads and serves from /embed-space.

The 768-d → 2D projection preserves local neighbourhoods (cosine metric,
which matches how the rest of the pipeline reasons about similarity).
Deterministic given the same input + random_state.

Usage:
  seed/_build/.venv/bin/python3 seed/_build/project_umap.py [--neighbours N] [--min-dist D]

Output JSON shape:
  {
    "model": "gemini-embedding-2",
    "method": "umap",
    "params": {"n_neighbors": 15, "min_dist": 0.1, "metric": "cosine"},
    "items": [
      {"node_id": "...", "kind": "identity"|"style_centroid", "x": 0.32, "y": -0.78},
      ...
    ]
  }
"""
from __future__ import annotations

import argparse
import json
import struct
import sys
from pathlib import Path

import numpy as np

try:
    import umap
except ImportError as e:
    raise ImportError(
        "umap-learn not installed — run:\n"
        "  seed/_build/.venv/bin/pip install umap-learn\n"
    ) from e

ROOT = Path(__file__).resolve().parents[2]
EMB_BIN = ROOT / "seed" / "embeddings.bin"
EMB_META = ROOT / "seed" / "embeddings.json"
OUT_PATH = ROOT / "seed" / "embeddings.umap2d.json"

DIMS = 768


def load_vectors_from_sidecar() -> tuple[list[dict], np.ndarray]:
    if not EMB_BIN.exists() or not EMB_META.exists():
        sys.exit("seed/embeddings.{bin,json} missing — run embed_nodes.py first")
    meta = json.loads(EMB_META.read_text())
    raw = EMB_BIN.read_bytes()
    n = len(meta)
    arr = np.zeros((n, DIMS), dtype=np.float32)
    keep_meta: list[dict] = []
    for i, e in enumerate(meta):
        if e.get("dims", DIMS) != DIMS:
            continue
        off = e["offset"]
        chunk = raw[off:off + DIMS * 4]
        if len(chunk) != DIMS * 4:
            continue
        arr[i] = struct.unpack(f"<{DIMS}f", chunk)
        keep_meta.append(e)
    if len(keep_meta) != n:
        # Compact arr to match keep_meta (drop bad rows).
        arr = arr[:len(keep_meta)]
    return keep_meta, arr


def load_vectors_from_db(db_path: Path) -> tuple[list[dict], np.ndarray]:
    """
    Read vectors directly from a node_embeddings table. Used by the daily
    Fly cron so contributor-added nodes (which never touch
    seed/embeddings.bin) make it into the UMAP projection.
    """
    import sqlite3

    if not db_path.exists():
        sys.exit(f"DB not found: {db_path}")
    con = sqlite3.connect(str(db_path))
    rows = con.execute(
        "SELECT node_id, kind, model, dims, vector "
        "FROM node_embeddings WHERE dims = ? ORDER BY node_id, kind",
        (DIMS,),
    ).fetchall()
    con.close()
    if not rows:
        sys.exit(f"no embeddings in {db_path} (table node_embeddings empty?)")
    arr = np.zeros((len(rows), DIMS), dtype=np.float32)
    meta: list[dict] = []
    for i, (node_id, kind, model, dims, vec_blob) in enumerate(rows):
        if dims != DIMS or len(vec_blob) != DIMS * 4:
            continue
        arr[i] = struct.unpack(f"<{DIMS}f", vec_blob)
        meta.append({"node_id": node_id, "kind": kind, "model": model, "dims": dims})
    return meta, arr[: len(meta)]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--neighbours", type=int, default=15,
                    help="UMAP n_neighbors — higher = more global structure")
    ap.add_argument("--min-dist", type=float, default=0.1,
                    help="UMAP min_dist — lower = tighter clusters")
    ap.add_argument("--random-state", type=int, default=42)
    ap.add_argument("--from-db", type=str, default="",
                    help="Read vectors from this SQLite DB's node_embeddings "
                         "table instead of seed/embeddings.{bin,json}. Used by "
                         "the daily Fly cron.")
    ap.add_argument("--out", type=str, default="",
                    help="Write output to this path instead of "
                         "seed/embeddings.umap2d.json (used with --from-db to "
                         "land on the Fly volume at /data/embeddings.umap2d.json).")
    args = ap.parse_args()

    out_path = Path(args.out) if args.out else OUT_PATH

    if args.from_db:
        meta, vecs = load_vectors_from_db(Path(args.from_db))
        print(f"loaded {len(meta)} vectors × {DIMS} dims from {args.from_db}")
    else:
        meta, vecs = load_vectors_from_sidecar()
        print(f"loaded {len(meta)} vectors × {DIMS} dims from sidecar")

    reducer = umap.UMAP(
        n_components=2,
        n_neighbors=args.neighbours,
        min_dist=args.min_dist,
        metric="cosine",
        random_state=args.random_state,
        verbose=True,
    )
    coords = reducer.fit_transform(vecs)
    print(f"UMAP coords: {coords.shape}")

    # Normalise to [-1, 1] for easy client-side rendering.
    mins = coords.min(axis=0)
    maxs = coords.max(axis=0)
    ranges = np.maximum(maxs - mins, 1e-9)
    norm = (coords - mins) / ranges * 2 - 1

    items = []
    for entry, xy in zip(meta, norm):
        items.append({
            "node_id": entry["node_id"],
            "kind": entry["kind"],
            "x": float(xy[0]),
            "y": float(xy[1]),
        })

    out = {
        "model": meta[0].get("model", "gemini-embedding-2") if meta else "gemini-embedding-2",
        "method": "umap",
        "params": {
            "n_neighbors": args.neighbours,
            "min_dist": args.min_dist,
            "metric": "cosine",
            "random_state": args.random_state,
        },
        "n_items": len(items),
        "items": items,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_path.with_suffix(out_path.suffix + ".tmp")
    tmp.write_text(json.dumps(out, indent=2) + "\n")
    tmp.replace(out_path)
    print(f"wrote {len(items)} points → {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
