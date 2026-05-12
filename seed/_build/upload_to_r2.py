#!/usr/bin/env python3
"""
Mirror every `metadata.image_url` in seed/nodes.json into Cloudflare R2 and
record the public CDN URL back into the same node's metadata as `cdn_image_url`.

Idempotent — nodes that already carry a `cdn_image_url` are skipped, and
content-addressable keys mean re-running on the same image is a no-op.

Reads R2 credentials from the project-root .env (R2_ENDPOINT, R2_BUCKET,
R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_BASE).

Usage:
    seed/_build/.venv/bin/python3 seed/_build/upload_to_r2.py [--dry-run] [--limit N] [--workers N]
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import hashlib
import json
import mimetypes
import os
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

try:
    import boto3
    from botocore.client import Config
    from botocore.exceptions import ClientError
except ImportError:
    sys.stderr.write(
        "boto3 not installed — run:\n"
        "  python3 -m venv seed/_build/.venv && seed/_build/.venv/bin/pip install boto3\n"
        "and re-run via seed/_build/.venv/bin/python3\n"
    )
    sys.exit(2)

ROOT = Path(__file__).resolve().parents[2]
NODES_PATH = ROOT / "seed" / "nodes.json"
ENV_PATH = ROOT / ".env"

UA = "adai-seed-uploader/1.0 (+https://adai-basel.fly.dev)"
FETCH_TIMEOUT = 30
MAX_BYTES = 25 * 1024 * 1024  # 25 MB hard cap per image

# gateway.objkt.com no longer resolves — try public IPFS gateways instead.
# Order matters: ipfs.io serves 200 directly; the others redirect to CID
# subdomains, which urllib follows automatically.
IPFS_FALLBACK_GATEWAYS = [
    "https://ipfs.io",
    "https://nftstorage.link",
    "https://dweb.link",
]
DEAD_IPFS_HOSTS = {"gateway.objkt.com"}

# Per-host concurrency limits — Wikimedia 429s heavily under high parallelism.
HOST_LIMITS = {
    "commons.wikimedia.org": 2,
}
DEFAULT_HOST_LIMIT = 8

# Map content-type → extension; falls back to URL parsing.
CT_EXT = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/avif": "avif",
    "image/tiff": "tiff",
}


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
    # Cloudflare R2 requires path-style addressing and signature v4 with the
    # virtual-hosted endpoint scoped to the account.
    return boto3.client(
        "s3",
        endpoint_url=env["R2_ENDPOINT"],
        aws_access_key_id=env["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=env["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


_host_sems: dict[str, threading.Semaphore] = {}
_host_sems_lock = threading.Lock()


def host_sem(host: str) -> threading.Semaphore:
    with _host_sems_lock:
        sem = _host_sems.get(host)
        if sem is None:
            sem = threading.Semaphore(HOST_LIMITS.get(host, DEFAULT_HOST_LIMIT))
            _host_sems[host] = sem
        return sem


def candidate_urls(url: str) -> list[str]:
    """Original URL plus fallbacks. For dead IPFS gateways, swap the host."""
    out = [url]
    parsed = urllib.parse.urlparse(url)
    if parsed.netloc in DEAD_IPFS_HOSTS and parsed.path.startswith("/ipfs/"):
        for gw in IPFS_FALLBACK_GATEWAYS:
            out.append(gw + parsed.path)
        # Drop the original — it can't resolve, no point trying.
        out = out[1:]
    return out


def _fetch_one(url: str) -> tuple[bytes, str]:
    parsed = urllib.parse.urlparse(url)
    sem = host_sem(parsed.netloc)
    with sem:
        # Retry on 429 with exponential backoff. urllib raises HTTPError for
        # non-2xx; we catch it for the retry loop, otherwise propagate.
        delay = 1.0
        last_err: Exception | None = None
        for attempt in range(4):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=FETCH_TIMEOUT) as r:
                    ct = (r.headers.get("Content-Type") or "").split(";")[0].strip().lower()
                    data = r.read(MAX_BYTES + 1)
                    if len(data) > MAX_BYTES:
                        raise ValueError(f"image > {MAX_BYTES} bytes")
                    return data, ct
            except urllib.error.HTTPError as e:
                last_err = e
                if e.code == 429 and attempt < 3:
                    time.sleep(delay)
                    delay *= 2
                    continue
                raise
            except Exception as e:  # noqa: BLE001 — network errors propagate after final attempt
                last_err = e
                raise
        raise last_err  # type: ignore[misc]


def fetch(url: str) -> tuple[bytes, str]:
    """Fetch with IPFS-gateway fallback. Raises the last error if every candidate fails."""
    last_err: Exception | None = None
    for candidate in candidate_urls(url):
        try:
            return _fetch_one(candidate)
        except Exception as e:  # noqa: BLE001
            last_err = e
            continue
    if last_err is None:
        raise RuntimeError("no candidate URLs")
    raise last_err


def ext_for(ct: str, url: str) -> str:
    if ct in CT_EXT:
        return CT_EXT[ct]
    if ct:
        guessed = mimetypes.guess_extension(ct)
        if guessed:
            return guessed.lstrip(".")
    # Last resort: trust the URL path
    path = urllib.parse.urlparse(url).path
    if "." in path:
        suffix = path.rsplit(".", 1)[-1].lower()
        if 2 <= len(suffix) <= 5 and suffix.isalnum():
            return suffix
    return "bin"


def r2_has(s3, bucket: str, key: str) -> bool:
    try:
        s3.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
            return False
        raise


def process_node(node: dict, s3, env: dict, dry_run: bool, lock: threading.Lock,
                 stats: dict) -> tuple[str, str | None, str | None]:
    """Returns (node_id, cdn_url_or_None, error_or_None)."""
    nid = node["id"]
    md_raw = node.get("metadata")
    if isinstance(md_raw, str):
        try:
            md = json.loads(md_raw)
        except json.JSONDecodeError:
            return nid, None, "metadata not valid JSON"
    elif isinstance(md_raw, dict):
        md = md_raw
    else:
        return nid, None, "no metadata"

    if md.get("cdn_image_url"):
        with lock:
            stats["already"] += 1
        return nid, md["cdn_image_url"], None

    src = md.get("image_url")
    if not src:
        return nid, None, None

    try:
        data, ct = fetch(src)
    except Exception as e:  # noqa: BLE001 — log and move on
        return nid, None, f"fetch failed: {e}"

    sha = hashlib.sha256(data).hexdigest()
    ext = ext_for(ct, src)
    key = f"images/{sha[:2]}/{sha}.{ext}"
    cdn_url = f"{env['R2_PUBLIC_BASE'].rstrip('/')}/{key}"

    if dry_run:
        with lock:
            stats["would_upload"] += 1
        return nid, cdn_url, None

    if not r2_has(s3, env["R2_BUCKET"], key):
        try:
            s3.put_object(
                Bucket=env["R2_BUCKET"],
                Key=key,
                Body=data,
                ContentType=ct or "application/octet-stream",
                CacheControl="public, max-age=31536000, immutable",
            )
        except Exception as e:  # noqa: BLE001
            return nid, None, f"upload failed: {e}"
        with lock:
            stats["uploaded"] += 1
    else:
        with lock:
            stats["existed"] += 1

    return nid, cdn_url, None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true",
                    help="fetch + hash + plan keys, but neither upload nor write nodes.json")
    ap.add_argument("--limit", type=int, default=0, help="process at most N nodes (0 = all)")
    ap.add_argument("--workers", type=int, default=8)
    args = ap.parse_args()

    env = load_env()
    s3 = make_s3(env) if not args.dry_run else None

    nodes = json.loads(NODES_PATH.read_text())

    # Build the work list — only nodes with image_url and no cdn_image_url yet.
    work = []
    for n in nodes:
        md = n.get("metadata")
        if isinstance(md, str):
            try:
                md = json.loads(md)
            except json.JSONDecodeError:
                continue
        if not isinstance(md, dict):
            continue
        if md.get("image_url") and not md.get("cdn_image_url"):
            work.append(n)
    if args.limit:
        work = work[: args.limit]

    print(f"nodes total: {len(nodes)}, with image_url & no cdn_image_url: {len(work)}")
    if not work:
        print("nothing to do")
        return 0

    stats = {"uploaded": 0, "existed": 0, "already": 0, "would_upload": 0, "errors": 0}
    results: dict[str, str] = {}
    errors: list[tuple[str, str]] = []
    lock = threading.Lock()
    t0 = time.time()

    with cf.ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(process_node, n, s3, env, args.dry_run, lock, stats): n["id"] for n in work}
        done = 0
        for fut in cf.as_completed(futs):
            nid, cdn, err = fut.result()
            done += 1
            if err:
                errors.append((nid, err))
                stats["errors"] += 1
                # Print immediately so a hung run is visible
                print(f"  [err] {nid}: {err}")
            elif cdn:
                results[nid] = cdn
            if done % 25 == 0 or done == len(work):
                print(f"  [{done}/{len(work)}] up={stats['uploaded']} "
                      f"exist={stats['existed']} err={stats['errors']}")

    dt = time.time() - t0
    print(f"\ndone in {dt:.1f}s — uploaded={stats['uploaded']} existed={stats['existed']} "
          f"errors={stats['errors']}"
          + (f" would_upload={stats['would_upload']}" if args.dry_run else ""))

    if args.dry_run:
        print("dry-run: nodes.json untouched")
        return 0

    if not results:
        print("no successful uploads — nodes.json untouched")
        return 0 if not errors else 1

    # Patch metadata back. The seeder JSON stores metadata as a string blob.
    patched = 0
    for n in nodes:
        cdn = results.get(n["id"])
        if not cdn:
            continue
        md_raw = n["metadata"]
        md = json.loads(md_raw) if isinstance(md_raw, str) else md_raw
        md["cdn_image_url"] = cdn
        n["metadata"] = json.dumps(md, ensure_ascii=False) if isinstance(md_raw, str) else md
        patched += 1

    tmp = NODES_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(nodes, indent=2, ensure_ascii=False) + "\n")
    tmp.replace(NODES_PATH)
    print(f"wrote {patched} cdn_image_url entries → {NODES_PATH}")

    if errors:
        print(f"\n{len(errors)} errors:")
        for nid, err in errors[:20]:
            print(f"  {nid}: {err}")
        if len(errors) > 20:
            print(f"  ... +{len(errors) - 20} more")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
