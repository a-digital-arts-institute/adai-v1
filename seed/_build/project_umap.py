#!/usr/bin/env python3
"""
Project a 768-d embedding set to 2D via UMAP and write a small flat JSON
array the server loads and serves from /embed-space.

Three input modes, mutually exclusive:
  * default            — read seed/embeddings.{bin,json} (committed sidecar)
  * --from-db PATH     — read node_embeddings from a SQLite DB (used when
                         running inside the Fly machine over /data/adai.db)
  * --from-binary PATH — read the AEVB binary stream produced by
                         `node dist/embed/cli.js export-vectors` (used by
                         the GH Action cron — runner-side UMAP fit so the
                         512MB Fly machine doesn't run out of headroom)

The 768-d → 2D projection preserves local neighbourhoods (cosine metric,
which matches how the rest of the pipeline reasons about similarity).
Deterministic given the same input + random_state.

Usage:
  seed/_build/.venv/bin/python3 seed/_build/project_umap.py \\
    [--neighbours N] [--min-dist D] [--random-state R] \\
    [--from-db PATH | --from-binary PATH] [--out PATH]

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


def load_vectors_from_binary(bin_path: Path) -> tuple[list[dict], np.ndarray]:
    """
    Read vectors from the AEVB binary stream produced by
    `node /app/dist/embed/cli.js export-vectors`. Used by the GH Action cron
    so UMAP runs on the runner (multi-core, GBs of RAM) instead of the 512MB
    Fly machine. Wire format documented in src/embed/cli.ts cmdExportVectors.
    """
    if not bin_path.exists():
        sys.exit(f"binary export not found: {bin_path}")
    raw = bin_path.read_bytes()
    if len(raw) < 16 or raw[:4] != b"AEVB":
        sys.exit(f"bad magic: {bin_path} is not an AEVB stream")
    version, dims, n = struct.unpack_from("<III", raw, 4)
    if version != 1:
        sys.exit(f"unsupported AEVB version {version} (expected 1)")
    if dims != DIMS:
        sys.exit(f"dims mismatch: stream={dims} expected={DIMS}")
    # Mirror load_vectors_from_db: bail with a clear message rather than let
    # UMAP's fit_transform crash on an empty array deeper in the pipeline.
    if n == 0:
        sys.exit(f"no vectors in {bin_path} (AEVB n_items=0 — did export-vectors run before any backfill?)")
    arr = np.zeros((n, DIMS), dtype=np.float32)
    meta: list[dict] = []
    cur = 16
    for i in range(n):
        if cur + 4 > len(raw):
            sys.exit(f"AEVB truncated at item {i}: missing meta length")
        meta_len, = struct.unpack_from("<I", raw, cur)
        cur += 4
        if cur + meta_len + DIMS * 4 > len(raw):
            sys.exit(f"AEVB truncated at item {i}: short body")
        meta_obj = json.loads(raw[cur:cur + meta_len].decode("utf-8"))
        cur += meta_len
        arr[i] = struct.unpack(f"<{DIMS}f", raw[cur:cur + DIMS * 4])
        cur += DIMS * 4
        meta.append({**meta_obj, "dims": DIMS})
    return meta, arr


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
    ap.add_argument("--from-binary", type=str, default="",
                    help="Read vectors from this AEVB binary stream (produced "
                         "by `node dist/embed/cli.js export-vectors`). Used by "
                         "the GH Action cron so UMAP runs on the runner.")
    ap.add_argument("--out", type=str, default="",
                    help="Write output to this path instead of "
                         "seed/embeddings.umap2d.json (used with --from-db to "
                         "land on the Fly volume at /data/embeddings.umap2d.json).")
    args = ap.parse_args()

    out_path = Path(args.out) if args.out else OUT_PATH

    if args.from_binary and args.from_db:
        sys.exit("pass either --from-binary or --from-db, not both")
    if args.from_binary:
        meta, vecs = load_vectors_from_binary(Path(args.from_binary))
        print(f"loaded {len(meta)} vectors × {DIMS} dims from {args.from_binary}")
    elif args.from_db:
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
