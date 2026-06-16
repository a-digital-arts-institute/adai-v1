#!/usr/bin/env python3
"""
Shrink OVERSIZED R2 images — a live R2 janitor (sibling to cull_orphans.py).

Some canon images are simply too big to serve in a graph view: 24 MiB PNGs and
animated GIFs straight off fxhash, multi-megapixel V&A IIIF masters. They render
fine but bloat the bucket (egress + storage) and stall the /field canvas. This
tool finds the worst offenders and replaces them with a sane-but-not-tiny copy.

WHAT IT DOES
  1. Lists every object under images/ in R2 (key → size).
  2. Reads the LIVE DB(s) passed via --db: maps each node's
     metadata.cdn_image_url back to its R2 key. (The live DB is the reference
     set under the canon freeze — contributor-API uploads since 2026-06-06 live
     only in /data/adai.db, never in seed/*.json, and seed/*.json is frozen.)
  3. For every REFERENCED object whose size is over the threshold (default
     5 MiB), downloads it, downsizes it so the longest edge is <= --max-edge
     (default 2048px) and re-encodes it (default quality 85), PRESERVING:
        - the original format / extension (PNG stays PNG, GIF stays GIF, …),
        - animation (animated GIF/WebP/APNG: every frame is resized),
        - the upstream provenance (metadata.image_url is NEVER touched — only
          cdn_image_url is repointed).
     It NEVER upscales and NEVER drops below the cap, so "normal, not too small"
     holds. A result that isn't meaningfully smaller (< --min-reduction) is
     discarded — the original stays.
  4. Because R2 keys are content-addressed (images/<sha[:2]>/<sha>.<ext>), the
     resized bytes hash to a NEW key. The tool uploads the new object and emits
     a PATCH file mapping {node_id: new_cdn_image_url}. It does NOT edit the DB
     and does NOT delete the old object.

WHY THE SPLIT (resize here, DB-repoint elsewhere)
  Resizing needs Pillow + R2 creds (this box). Repointing needs to write the
  live CR-SQLite DB with the crsqlite extension loaded (the Node runtime). So:
     this script  → uploads new objects + writes the patch JSON
     dist/cli/apply-image-patch.js (over SSH on prod) → applies the patch to
        /data/adai.db, guarded by an old-value match (idempotent, snapshot-safe)
  The old oversized objects become orphans the moment the DB is repointed;
  reclaim them with `cull_orphans.py --delete` (just cull-orphans-prod-delete).
  Clean separation: shrink swaps the reference, cull reaps the dead object.

SAFE BY DEFAULT.
  (no flag)   dry-run REPORT — list + DB scan only, no downloads, no writes.
  --measure   download+resize a small --sample to show REAL savings; no upload,
              no patch, no DB write.
  --apply     download+resize ALL candidates, upload the new objects, write the
              patch JSON (--out). Still does not touch the DB (that's the CLI).

Self-contained env-loading + boto3 client + the bucket's content-addressed key
scheme (images/<sha[:2]>/<sha>.<ext>).

Usage (from project root):
    seed/_build/.venv/bin/python3 seed/_build/shrink_oversized.py --db ./adai.db
    seed/_build/.venv/bin/python3 seed/_build/shrink_oversized.py --db ./adai.db --measure
    seed/_build/.venv/bin/python3 seed/_build/shrink_oversized.py --db ./adai.db --apply --out /tmp/patch.json

Against PROD, use the justfile recipes (they pull /data/adai.db off the volume):
    just shrink-oversized-prod            # dry-run report
    just shrink-oversized-prod-measure    # real savings on a sample
    just shrink-oversized-prod-apply      # resize+upload, then repoint the live DB
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import datetime as _dt
import hashlib
import io
import json
import sqlite3
import sys
import urllib.parse
from pathlib import Path

try:
    import boto3
    from botocore.client import Config
except ImportError:
    sys.stderr.write(
        "boto3 not installed — run via seed/_build/.venv/bin/python3\n"
        "  (python3 -m venv seed/_build/.venv && seed/_build/.venv/bin/pip install boto3 pillow)\n"
    )
    sys.exit(2)

try:
    from PIL import Image, ImageSequence
except ImportError:
    sys.stderr.write(
        "Pillow not installed — run via seed/_build/.venv/bin/python3\n"
        "  (seed/_build/.venv/bin/pip install pillow)\n"
    )
    sys.exit(2)

# Pillow's default ~89 MP decompression-bomb guard only WARNS up to 2× and then
# raises — which would make us silently SKIP the very largest art masters (a
# 9600×9600 V&A IIIF master is ~92 MP), the ones we most want to downscale.
# The bucket is our own curated R2, not untrusted uploads, so we raise the cap.
# It stays finite (≈300 MP) as an OOM backstop: anything above ~17k² would need
# multi-GB of RAM to decode, so we'd rather skip it (caught below) than crash.
Image.MAX_IMAGE_PIXELS = 300_000_000

ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = ROOT / ".env"
DEFAULT_OUT = ROOT / "seed" / "_build" / "shrink_patch.json"

IMAGE_PREFIX = "images/"

# Defaults (all overridable via flags).
DEFAULT_THRESHOLD_MB = 5.0     # consider objects strictly larger than this
DEFAULT_MAX_EDGE = 2048        # downscale so the longest edge <= this
DEFAULT_QUALITY = 85           # JPEG/WebP/AVIF re-encode quality
DEFAULT_MIN_REDUCTION = 0.10   # keep the resize only if it saves >= this fraction
DEFAULT_SAMPLE = 12            # --measure sample size
DEFAULT_WORKERS = 6

# ext → (PIL format, content-type). The new key reuses the original extension,
# so format is always preserved (no lossy PNG→JPEG surprises).
EXT_FORMAT = {
    "jpg": ("JPEG", "image/jpeg"),
    "jpeg": ("JPEG", "image/jpeg"),
    "png": ("PNG", "image/png"),
    "gif": ("GIF", "image/gif"),
    "webp": ("WEBP", "image/webp"),
    "avif": ("AVIF", "image/avif"),
    "tiff": ("TIFF", "image/tiff"),
    "tif": ("TIFF", "image/tiff"),
}


# ----- env + client (same pattern as cull_orphans.py) ------------------


def load_env() -> dict:
    if not ENV_PATH.exists():
        sys.exit(f"missing {ENV_PATH} — see CLAUDE.md")
    env = {}
    for line in ENV_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()
    required = ["R2_ENDPOINT", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_PUBLIC_BASE"]
    missing = [k for k in required if not env.get(k)]
    if missing:
        sys.exit(f"missing in .env: {', '.join(missing)}")
    return env


def make_s3(env: dict):
    return boto3.client(
        "s3",
        endpoint_url=env["R2_ENDPOINT"],
        aws_access_key_id=env["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=env["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def _fmt_bytes(n: int) -> str:
    f = float(n)
    for unit in ("B", "KiB", "MiB", "GiB", "TiB"):
        if f < 1024 or unit == "TiB":
            return f"{f:.1f} {unit}" if unit != "B" else f"{int(f)} B"
        f /= 1024
    return f"{n} B"


# ----- reference resolution (cdn_image_url → R2 key) --------------------


def cdn_url_to_key(cdn_url: str | None, public_base: str) -> str | None:
    """Inverse of the uploader's `f"{R2_PUBLIC_BASE}/{key}"`. Identical to
    cull_orphans.cdn_url_to_key so the two janitors agree on what a key is."""
    if not cdn_url:
        return None
    base = public_base.rstrip("/") + "/"
    if cdn_url.startswith(base):
        key = cdn_url[len(base):]
    else:
        path = urllib.parse.urlparse(cdn_url).path.lstrip("/")
        idx = path.find(IMAGE_PREFIX)
        key = path[idx:] if idx != -1 else path
    key = key.strip("/")
    return key or None


def _parse_metadata(md_raw) -> dict:
    if isinstance(md_raw, str):
        try:
            return json.loads(md_raw)
        except json.JSONDecodeError:
            return {}
    return md_raw if isinstance(md_raw, dict) else {}


def db_references(db_paths: list[Path], public_base: str) -> dict[str, list[tuple[str, str]]]:
    """key → list of (node_id, cdn_image_url) that reference it, across all
    live DBs. INCLUDES retired nodes — their image is still reachable by direct
    URL (the husk model), so it's a real reference and we may legitimately
    shrink it. Stock sqlite3 reads the base `nodes` table; opened read-write so
    a pulled copy's WAL is applied on first read (we never write)."""
    refs: dict[str, list[tuple[str, str]]] = {}
    for dbp in db_paths:
        con = sqlite3.connect(str(dbp))
        try:
            try:
                cur = con.execute("SELECT id, metadata FROM nodes")
            except sqlite3.OperationalError as e:
                sys.exit(f"--db {dbp}: cannot read `nodes` table ({e})")
            for nid, md_raw in cur:
                md = _parse_metadata(md_raw)
                cdn = md.get("cdn_image_url")
                k = cdn_url_to_key(cdn, public_base)
                if k:
                    refs.setdefault(k, []).append((nid, cdn))
        finally:
            con.close()
    return refs


def list_r2_images(s3, bucket: str) -> dict[str, int]:
    """key → size for every object under images/. Paginated."""
    out: dict[str, int] = {}
    token = None
    while True:
        kw = {"Bucket": bucket, "Prefix": IMAGE_PREFIX, "MaxKeys": 1000}
        if token:
            kw["ContinuationToken"] = token
        resp = s3.list_objects_v2(**kw)
        for obj in resp.get("Contents", []):
            out[obj["Key"]] = obj.get("Size", 0)
        if resp.get("IsTruncated"):
            token = resp.get("NextContinuationToken")
        else:
            break
    return out


# ----- the actual resize -------------------------------------------------


def _ext_of(key: str) -> str:
    tail = key.rsplit("/", 1)[-1]
    return tail.rsplit(".", 1)[-1].lower() if "." in tail else ""


def _scale_for(w: int, h: int, max_edge: int) -> float:
    longest = max(w, h)
    return min(1.0, max_edge / longest) if longest > 0 else 1.0


def _resize_static(img: "Image.Image", fmt: str, scale: float, quality: int) -> bytes:
    if scale < 1.0:
        nw = max(1, round(img.width * scale))
        nh = max(1, round(img.height * scale))
        img = img.resize((nw, nh), Image.LANCZOS)
    buf = io.BytesIO()
    if fmt == "JPEG":
        # JPEG has no alpha — flatten onto white if needed. Preserve ICC so
        # colour-managed art doesn't shift; drop bulky EXIF.
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGBA")
            bg = Image.new("RGB", img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[-1])
            img = bg
        elif img.mode != "RGB":
            img = img.convert("RGB")
        img.save(buf, format="JPEG", quality=quality, optimize=True, progressive=True,
                 icc_profile=img.info.get("icc_profile"))
    elif fmt == "PNG":
        img.save(buf, format="PNG", optimize=True)
    elif fmt == "WEBP":
        img.save(buf, format="WEBP", quality=quality, method=6)
    elif fmt == "AVIF":
        img.save(buf, format="AVIF", quality=quality)
    elif fmt == "TIFF":
        img.save(buf, format="TIFF", compression="tiff_lzw")
    else:
        img.save(buf, format=fmt)
    return buf.getvalue()


def _resize_animated(img: "Image.Image", fmt: str, scale: float, quality: int) -> bytes:
    """Resize EVERY frame, keeping the animation. Pillow composites each frame
    to a full image on seek for the common (full-frame / restore-to-bg) GIFs we
    see; diff-encoded GIFs with exotic disposal can shift slightly — acceptable
    for a size-reduction pass, and the --min-reduction guard + --skip-gifs valve
    cover the rest."""
    frames: list[Image.Image] = []
    durations: list[int] = []
    default_dur = int(img.info.get("duration", 100) or 100)
    for frame in ImageSequence.Iterator(img):
        durations.append(int(frame.info.get("duration", default_dur) or default_dur))
        fr = frame.convert("RGBA")
        if scale < 1.0:
            nw = max(1, round(fr.width * scale))
            nh = max(1, round(fr.height * scale))
            fr = fr.resize((nw, nh), Image.LANCZOS)
        frames.append(fr)
    if not frames:
        raise ValueError("no frames")

    loop = int(img.info.get("loop", 0) or 0)
    buf = io.BytesIO()
    if fmt == "WEBP":
        frames[0].save(buf, format="WEBP", save_all=True, append_images=frames[1:],
                       duration=durations, loop=loop, quality=quality, method=6)
    else:  # GIF (and APNG-as-PNG falls back to GIF-style save_all below)
        save_fmt = "GIF" if fmt not in ("PNG",) else "PNG"
        frames[0].save(buf, format=save_fmt, save_all=True, append_images=frames[1:],
                       duration=durations, loop=loop, disposal=2, optimize=True)
    return buf.getvalue()


def shrink_bytes(data: bytes, ext: str, max_edge: int, quality: int,
                 skip_gifs: bool) -> tuple[bytes, dict] | tuple[None, dict]:
    """Return (new_bytes, info) or (None, info-with-reason). info always carries
    orig_dims / animated / frames / reason for reporting."""
    fmt = EXT_FORMAT.get(ext, (None, None))[0]
    info: dict = {"ext": ext, "fmt": fmt}
    if fmt is None:
        info["reason"] = f"unsupported ext '{ext}'"
        return None, info
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception as e:  # noqa: BLE001
        info["reason"] = f"open failed: {type(e).__name__}: {e}"
        return None, info

    w, h = img.size
    info["orig_dims"] = [w, h]
    animated = bool(getattr(img, "is_animated", False)) and int(getattr(img, "n_frames", 1)) > 1
    info["animated"] = animated
    info["frames"] = int(getattr(img, "n_frames", 1))

    if animated and ext in ("gif",) and skip_gifs:
        info["reason"] = "animated GIF skipped (--skip-gifs)"
        return None, info

    scale = _scale_for(w, h, max_edge)
    info["scale"] = round(scale, 4)

    try:
        if animated:
            new = _resize_animated(img, fmt, scale, quality)
        else:
            new = _resize_static(img, fmt, scale, quality)
    except Exception as e:  # noqa: BLE001
        info["reason"] = f"resize failed: {type(e).__name__}: {e}"
        return None, info

    info["new_bytes"] = len(new)
    # Re-open to record the new dims (cheap; from the encoded buffer).
    try:
        info["new_dims"] = list(Image.open(io.BytesIO(new)).size)
    except Exception:  # noqa: BLE001
        info["new_dims"] = None
    return new, info


# ----- candidate discovery + processing ----------------------------------


def find_candidates(sizes: dict[str, int], refs: dict[str, list],
                    threshold: int) -> list[tuple[str, int, list]]:
    """Referenced keys whose object size exceeds the threshold, biggest first."""
    out = []
    for key, nodes in refs.items():
        size = sizes.get(key)
        if size is None:
            continue  # referenced but not in bucket (dead/already-culled) — skip
        if size > threshold:
            out.append((key, size, nodes))
    out.sort(key=lambda t: -t[1])
    return out


def process_one(s3, bucket: str, key: str, size: int, args) -> dict:
    """Download → resize → (in --apply) upload new object. Returns a result row
    with new_key / new_bytes / kept / reason populated."""
    ext = _ext_of(key)
    row: dict = {"key": key, "orig_bytes": size, "ext": ext}
    try:
        body = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
    except Exception as e:  # noqa: BLE001
        row.update(kept=False, reason=f"download failed: {type(e).__name__}: {e}")
        return row

    new, info = shrink_bytes(body, ext, args.max_edge, args.quality, args.skip_gifs)
    row.update({k: info[k] for k in ("orig_dims", "new_dims", "animated", "frames", "scale") if k in info})
    if new is None:
        row.update(kept=False, reason=info.get("reason", "no output"))
        return row

    reduction = 1.0 - (len(new) / size) if size else 0.0
    row["new_bytes"] = len(new)
    row["reduction"] = round(reduction, 4)
    if reduction < args.min_reduction:
        row.update(kept=False, reason=f"only {reduction*100:.1f}% smaller (< {args.min_reduction*100:.0f}%)")
        return row

    sha = hashlib.sha256(new).hexdigest()
    new_key = f"{IMAGE_PREFIX}{sha[:2]}/{sha}.{ext}"
    row["new_key"] = new_key
    row["new_cdn"] = f"{args.public_base.rstrip('/')}/{new_key}"
    ct = EXT_FORMAT.get(ext, (None, "application/octet-stream"))[1]

    if new_key == key:
        # Astronomically unlikely (resize produced identical bytes) — nothing to do.
        row.update(kept=False, reason="identical key after resize")
        return row

    if args.apply:
        try:
            # HEAD first — content-addressed, so a prior run may have uploaded it.
            try:
                s3.head_object(Bucket=bucket, Key=new_key)
                row["uploaded"] = False  # already present
            except Exception:  # noqa: BLE001 — treat any miss as "needs upload"
                s3.put_object(Bucket=bucket, Key=new_key, Body=new, ContentType=ct,
                              CacheControl="public, max-age=31536000, immutable")
                row["uploaded"] = True
        except Exception as e:  # noqa: BLE001
            row.update(kept=False, reason=f"upload failed: {type(e).__name__}: {e}")
            return row

    row["kept"] = True
    return row


# ----- main --------------------------------------------------------------


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Downsize oversized R2 images referenced by the live DB. Dry-run by default."
    )
    ap.add_argument("--db", action="append", default=[], metavar="PATH", required=True,
                    help="live adai.db whose node cdn_image_urls are the reference set (repeatable)")
    ap.add_argument("--threshold-mb", type=float, default=DEFAULT_THRESHOLD_MB,
                    help=f"shrink objects larger than this many MiB (default {DEFAULT_THRESHOLD_MB})")
    ap.add_argument("--max-edge", type=int, default=DEFAULT_MAX_EDGE,
                    help=f"downscale so the longest edge <= this many px (default {DEFAULT_MAX_EDGE})")
    ap.add_argument("--quality", type=int, default=DEFAULT_QUALITY,
                    help=f"JPEG/WebP/AVIF re-encode quality (default {DEFAULT_QUALITY})")
    ap.add_argument("--min-reduction", type=float, default=DEFAULT_MIN_REDUCTION,
                    help=f"discard a resize that saves less than this fraction (default {DEFAULT_MIN_REDUCTION})")
    ap.add_argument("--skip-gifs", action="store_true",
                    help="leave animated GIFs untouched (only shrink static + animated WebP)")
    ap.add_argument("--measure", action="store_true",
                    help="download+resize a --sample to report REAL savings; no upload, no patch")
    ap.add_argument("--sample", type=int, default=DEFAULT_SAMPLE,
                    help=f"how many candidates --measure processes (default {DEFAULT_SAMPLE})")
    ap.add_argument("--apply", action="store_true",
                    help="download+resize ALL candidates, upload new objects, write the patch (destructive to R2)")
    ap.add_argument("--limit", type=int, default=0, help="cap candidates processed (0 = all)")
    ap.add_argument("--workers", type=int, default=DEFAULT_WORKERS)
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="patch JSON output path (--apply)")
    args = ap.parse_args()

    db_paths = [Path(p) for p in args.db]
    for dbp in db_paths:
        if not dbp.exists():
            sys.exit(f"--db path not found: {dbp}")

    threshold = int(args.threshold_mb * 1024 * 1024)
    env = load_env()
    s3 = make_s3(env)
    args.public_base = env["R2_PUBLIC_BASE"]
    bucket = env["R2_BUCKET"]

    print(f"threshold: > {_fmt_bytes(threshold)}   max-edge: {args.max_edge}px   "
          f"quality: {args.quality}   min-reduction: {args.min_reduction*100:.0f}%"
          + ("   [skip-gifs]" if args.skip_gifs else ""))

    refs = db_references(db_paths, args.public_base)
    print(f"live-DB references: {sum(len(v) for v in refs.values())} node refs over {len(refs)} distinct keys "
          f"(from {', '.join(str(p) for p in db_paths)})")

    sizes = list_r2_images(s3, bucket)
    print(f"R2 objects under '{IMAGE_PREFIX}': {len(sizes)} ({_fmt_bytes(sum(sizes.values()))})")

    cands = find_candidates(sizes, refs, threshold)
    cand_bytes = sum(s for _, s, _ in cands)
    print(f"\noversized + referenced candidates: {len(cands)} ({_fmt_bytes(cand_bytes)})")
    if not cands:
        print("nothing over the threshold is referenced — done.")
        return 0
    for key, size, nodes in cands[:15]:
        print(f"    {_fmt_bytes(size):>10}  {key.split('/')[-1]:<70}  ×{len(nodes)} node(s)")
    if len(cands) > 15:
        print(f"    ... +{len(cands) - 15} more")

    # ---- dry-run (default): cheap report, stop here ----
    if not args.measure and not args.apply:
        print("\ndry-run: no downloads, no writes.")
        print("  --measure   download+resize a sample to see real savings")
        print("  --apply     resize+upload all, write the repoint patch (then apply it to the live DB)")
        return 0

    work = cands
    if args.measure:
        work = cands[: max(0, args.sample)]
        print(f"\n--measure: resizing a sample of {len(work)} (no upload, no patch)…")
    else:
        if args.limit:
            work = cands[: args.limit]
            print(f"\n--apply --limit {args.limit}: processing {len(work)} of {len(cands)} candidates…")
        else:
            print(f"\n--apply: processing all {len(work)} candidates…")

    results: list[dict] = []
    with cf.ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(process_one, s3, bucket, key, size, args): key for key, size, _ in work}
        done = 0
        for fut in cf.as_completed(futs):
            results.append(fut.result())
            done += 1
            if done % 10 == 0 or done == len(work):
                kept = sum(1 for r in results if r.get("kept"))
                print(f"  [{done}/{len(work)}] kept={kept}")

    # attach the node list back to each kept result (by key) for the patch.
    nodes_by_key = {key: nodes for key, _, nodes in cands}

    kept = [r for r in results if r.get("kept")]
    skipped = [r for r in results if not r.get("kept")]
    saved = sum(r["orig_bytes"] - r["new_bytes"] for r in kept)
    orig_sum = sum(r["orig_bytes"] for r in kept)

    print("\n=== RESULT ===")
    print(f"kept (would shrink): {len(kept)}   skipped: {len(skipped)}")
    if kept:
        print(f"bytes: {_fmt_bytes(orig_sum)} → {_fmt_bytes(orig_sum - saved)}  "
              f"(saved {_fmt_bytes(saved)}, {saved/orig_sum*100:.1f}%)")
        for r in sorted(kept, key=lambda r: -(r['orig_bytes'] - r['new_bytes']))[:12]:
            dims = f"{r.get('orig_dims')}→{r.get('new_dims')}"
            anim = " [anim]" if r.get("animated") else ""
            print(f"    {_fmt_bytes(r['orig_bytes']):>10} → {_fmt_bytes(r['new_bytes']):>10}  "
                  f"{dims}{anim}  {r['key'].split('/')[-1][:24]}")
    if skipped:
        # group skip reasons
        from collections import Counter
        reasons = Counter(r.get("reason", "?").split(" (")[0].split(":")[0] for r in skipped)
        print("skip reasons:", dict(reasons))

    if args.measure:
        print("\n--measure: nothing uploaded, no patch written. Re-run with --apply to do it.")
        return 0

    # ---- --apply: write the patch ----
    entries = []
    now = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    for r in kept:
        for nid, old_cdn in nodes_by_key.get(r["key"], []):
            entries.append({
                "node_id": nid,
                "old_cdn_image_url": old_cdn,
                "new_cdn_image_url": r["new_cdn"],
                "old_key": r["key"],
                "new_key": r["new_key"],
                "orig_bytes": r["orig_bytes"],
                "new_bytes": r["new_bytes"],
            })
    patch = {
        "generated_at": now,
        "params": {"threshold_mb": args.threshold_mb, "max_edge": args.max_edge,
                   "quality": args.quality, "min_reduction": args.min_reduction},
        "public_base": args.public_base,
        "entries": entries,
    }
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_path.with_suffix(out_path.suffix + ".tmp")
    tmp.write_text(json.dumps(patch, indent=2, ensure_ascii=False) + "\n")
    tmp.replace(out_path)
    print(f"\nwrote patch: {len(entries)} node repoints over {len(kept)} new objects → {out_path}")
    print("next: apply it to the LIVE DB —")
    print(f"    node dist/cli/apply-image-patch.js --from {out_path}")
    print("then reclaim the now-orphaned originals — `just cull-orphans-prod-delete`")
    return 0


if __name__ == "__main__":
    sys.exit(main())
