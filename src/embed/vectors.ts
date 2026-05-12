// Vector loading + math helpers for the embedding derive pipeline.
//
// All vectors live in node_embeddings (local-only table). We hold them in
// RAM during a derive pass — at ~1500 nodes × 768 dims × 4 bytes ≈ 4.6 MB,
// memory isn't the constraint. Pairwise scans run in plain JS over
// Float32Array; explicit BLAS would buy us nothing at this scale.
//
// Vectors are stored L2-normalised, so dot product == cosine similarity.

import type { DatabaseSync } from "node:sqlite";

export const DIMS = 768;

export type EmbKind = "identity" | "style_centroid";

export interface VectorRow {
  node_id: string;
  kind: EmbKind;
  model: string;
  dims: number;
  vec: Float32Array;
  has_image: boolean;
  image_hash: string | null;
  text_hash: string | null;
}

export function decodeBlob(buf: Uint8Array): Float32Array {
  // Defensive copy — node:sqlite hands us a view that may share underlying
  // memory with the SQLite blob. Detaching avoids aliasing surprises if the
  // caller mutates downstream.
  const copy = new Uint8Array(buf.byteLength);
  copy.set(buf);
  // f32 must align to 4 bytes; copy guarantees alignment from origin 0.
  return new Float32Array(copy.buffer, copy.byteOffset, copy.byteLength / 4);
}

export function encodeBlob(arr: Float32Array): Uint8Array {
  return new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
}

export function cosine(a: Float32Array, b: Float32Array): number {
  let s = 0;
  const n = a.length;
  for (let i = 0; i < n; i++) s += a[i]! * b[i]!;
  return s;
}

export function l2normalise(arr: Float32Array): Float32Array {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i]! * arr[i]!;
  if (s <= 0) return arr;
  const n = Math.sqrt(s);
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) out[i] = arr[i]! / n;
  return out;
}

export function meanAndNormalise(vectors: Float32Array[]): Float32Array {
  if (vectors.length === 0) throw new Error("meanAndNormalise: empty input");
  const dims = vectors[0]!.length;
  const sum = new Float32Array(dims);
  for (const v of vectors) {
    if (v.length !== dims) throw new Error("dim mismatch in mean");
    for (let i = 0; i < dims; i++) sum[i]! += v[i]!;
  }
  const inv = 1 / vectors.length;
  for (let i = 0; i < dims; i++) sum[i]! *= inv;
  return l2normalise(sum);
}

/**
 * Load every row from node_embeddings into memory, keyed by `${kind}:${node_id}`
 * so identity and style_centroid rows can coexist for the same node.
 */
export function loadAll(db: DatabaseSync): Map<string, VectorRow> {
  const rows = db
    .prepare(
      `SELECT node_id, kind, model, dims, vector, has_image, image_hash, text_hash
       FROM node_embeddings`
    )
    .all() as Array<{
      node_id: string;
      kind: string;
      model: string;
      dims: number;
      vector: Uint8Array;
      has_image: number;
      image_hash: string | null;
      text_hash: string | null;
    }>;

  const out = new Map<string, VectorRow>();
  for (const r of rows) {
    if (r.dims !== DIMS) continue; // Defensive: stale rows from a different model.
    out.set(keyFor(r.node_id, r.kind as EmbKind), {
      node_id: r.node_id,
      kind: r.kind as EmbKind,
      model: r.model,
      dims: r.dims,
      vec: decodeBlob(r.vector),
      has_image: !!r.has_image,
      image_hash: r.image_hash,
      text_hash: r.text_hash,
    });
  }
  return out;
}

export function keyFor(nodeId: string, kind: EmbKind): string {
  return `${kind}:${nodeId}`;
}
