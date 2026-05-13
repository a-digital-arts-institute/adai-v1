// Cloudflare R2 client for runtime image uploads. R2 speaks S3 over SigV4 with
// path-style addressing — same configuration the Python uploader in
// seed/_build/upload_to_r2.py uses (see comments there). Keys are computed as
// `images/{sha256[:2]}/{sha256}.{ext}` so the runtime path and the offline
// path produce identical, deduped keys for the same bytes.
//
// Env vars (loaded in src/utils/env.ts):
//   R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BASE
//
// We HEAD before PUT so re-uploading an image we already own is a no-op.

import crypto from "node:crypto";
import { S3Client, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const CT_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/tiff": "tiff",
};

export interface R2UploadResult {
  key: string;
  url: string;
  sha256: string;
  bytes: number;
  content_type: string;
  already_existed: boolean;
}

interface R2Env {
  endpoint: string;
  bucket: string;
  access_key_id: string;
  secret_access_key: string;
  public_base: string;
}

function readEnv(): R2Env | null {
  const e = process.env;
  const missing: string[] = [];
  for (const k of ["R2_ENDPOINT", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_PUBLIC_BASE"]) {
    if (!e[k]) missing.push(k);
  }
  if (missing.length) {
    console.warn(`[r2] disabled — missing env: ${missing.join(", ")}`);
    return null;
  }
  return {
    endpoint: e.R2_ENDPOINT!,
    bucket: e.R2_BUCKET!,
    access_key_id: e.R2_ACCESS_KEY_ID!,
    secret_access_key: e.R2_SECRET_ACCESS_KEY!,
    public_base: e.R2_PUBLIC_BASE!.replace(/\/+$/, ""),
  };
}

let _client: S3Client | null = null;
let _env: R2Env | null | undefined;  // undefined = not-yet-read, null = unconfigured

function client(): { s3: S3Client; env: R2Env } | null {
  if (_env === undefined) _env = readEnv();
  if (_env === null) return null;
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: _env.endpoint,
      credentials: {
        accessKeyId: _env.access_key_id,
        secretAccessKey: _env.secret_access_key,
      },
      forcePathStyle: true,
    });
  }
  return { s3: _client, env: _env };
}

export function isR2Configured(): boolean {
  if (_env === undefined) _env = readEnv();
  return _env !== null;
}

function extFor(contentType: string): string {
  const ct = (contentType || "").split(";")[0].trim().toLowerCase();
  return CT_EXT[ct] ?? "bin";
}

async function headExists(s3: S3Client, bucket: string, key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (e: any) {
    // The S3 SDK throws errors with different shapes depending on whether the
    // service returned 404 or 403. R2's HEAD on a missing object returns 404,
    // and aws-sdk surfaces that as either `NotFound` or `NoSuchKey`. Treat any
    // 404-ish response as "doesn't exist"; re-throw anything else.
    const code = e?.name || e?.Code || e?.$metadata?.httpStatusCode;
    if (code === "NotFound" || code === "NoSuchKey" || code === 404 || e?.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw e;
  }
}

export async function uploadImage(buf: Buffer, mimeType: string): Promise<R2UploadResult> {
  const c = client();
  if (!c) {
    throw new Error("R2 is not configured (missing R2_* env vars)");
  }
  const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
  const ext = extFor(mimeType);
  const key = `images/${sha256.slice(0, 2)}/${sha256}.${ext}`;
  const url = `${c.env.public_base}/${key}`;

  const exists = await headExists(c.s3, c.env.bucket, key);
  if (exists) {
    return { key, url, sha256, bytes: buf.length, content_type: mimeType, already_existed: true };
  }

  await c.s3.send(
    new PutObjectCommand({
      Bucket: c.env.bucket,
      Key: key,
      Body: buf,
      ContentType: mimeType || "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return { key, url, sha256, bytes: buf.length, content_type: mimeType, already_existed: false };
}
