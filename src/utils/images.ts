// Server-side "fetch an image by URL and mirror it to R2" — the `image_url`
// transport on POST /api/v1/images (docs/URL-INTAKE-SPEC.md §9.3) and the
// image step of confirmDraft share this so the SSRF guard, sniffing and
// size cap live in exactly one place.

import { safeFetch, sniffImageMime, SsrfError } from "./ssrf.js";
import { uploadImage, isR2Configured, type R2UploadResult } from "../r2.js";

export const IMAGE_MAX_BYTES = 20 * 1024 * 1024;

export class ImageFetchError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 400) {
    super(message);
    this.name = "ImageFetchError";
  }
}

export interface MirroredImage {
  upload: R2UploadResult;
  mime: string;
  source_url: string;
  final_url: string;
}

/**
 * Fetch `url` (public hosts only), verify it is an image by magic bytes, and
 * upload it to R2. Content-addressed, so repeat calls are idempotent.
 */
export async function mirrorImageFromUrl(url: string): Promise<MirroredImage> {
  if (!isR2Configured()) throw new ImageFetchError("R2 is not configured", "r2_not_configured", 503);
  let fetched;
  try {
    fetched = await safeFetch(url, { maxBytes: IMAGE_MAX_BYTES, timeoutMs: 20_000, headers: { accept: "image/*,*/*;q=0.5" } });
  } catch (e: any) {
    if (e instanceof SsrfError) throw new ImageFetchError(e.message, e.code, e.code === "too_large" ? 413 : 400);
    throw new ImageFetchError(e?.message ?? String(e), "fetch_failed", 502);
  }
  if (fetched.status < 200 || fetched.status >= 300) {
    throw new ImageFetchError(`upstream responded ${fetched.status}`, "upstream_status", 502);
  }
  const mime = sniffImageMime(fetched.bytes);
  if (!mime) throw new ImageFetchError("URL does not point at a JPEG/PNG/GIF/WebP/AVIF image", "not_an_image", 415);
  let upload: R2UploadResult;
  try {
    upload = await uploadImage(fetched.bytes, mime);
  } catch (e: any) {
    throw new ImageFetchError(e?.message ?? String(e), "r2_upload_failed", 502);
  }
  return { upload, mime, source_url: url, final_url: fetched.final_url };
}
