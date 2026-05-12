#!/usr/bin/env python3
"""
Image fetcher + normaliser for the Gemini Embedding 2 multimodal pipeline.

Used by `embed_nodes.py`: given a node's `cdn_image_url` (or `image_url`
fallback), fetch the bytes, validate the MIME, optionally downsample to
1024px long-edge via Pillow, and cache the result.

Cache lives at seed/_build/.image_cache.sqlite (gitignored by *.db). Keyed by
source URL — re-runs are free. We cache the *prepared* (post-Pillow,
post-recompression) bytes because Pillow is deterministic and saving raw
+ reprocessing every run buys us nothing.

This module is import-only — it doesn't have a CLI. See `embed_nodes.py`.
"""
from __future__ import annotations

import hashlib
import io
import sqlite3
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Optional

try:
    from PIL import Image
except ImportError as e:
    raise ImportError(
        "Pillow not installed — from project root:\n"
        "  python3 -m venv seed/_build/.venv && "
        "seed/_build/.venv/bin/pip install Pillow google-genai python-dotenv\n"
        "and re-run via seed/_build/.venv/bin/python3"
    ) from e


ROOT = Path(__file__).resolve().parents[2]
CACHE_PATH = ROOT / "seed" / "_build" / ".image_cache.sqlite"

UA = "adai-embed-pipeline/1.0 (+https://adai-basel.fly.dev)"
FETCH_TIMEOUT = 30
RAW_FETCH_CAP = 25 * 1024 * 1024            # 25 MB hard cap on raw download
LONG_EDGE_PX = 1024                          # downsample target
JPEG_QUALITY = 85

# MIME whitelist for *raw* (pre-Pillow) inputs. Anything else falls back to
# text-only embedding upstream. Pillow can read more formats than this but
# we want to be conservative — animated GIFs, multi-page TIFFs, SVGs etc.
# don't have a single canonical "still" frame to embed.
ACCEPT_MIMES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/bmp",
    # HEIC/HEIF/AVIF require pillow-heif / pillow-avif — leave off the
    # whitelist for v1 to avoid silent decode failures. Add later if needed.
}

# Per-host concurrency limits (mirrored from upload_to_r2.py — Wikimedia
# 429s aggressively under high parallelism).
HOST_LIMITS = {"commons.wikimedia.org": 2}
DEFAULT_HOST_LIMIT = 8

# gateway.objkt.com no longer resolves; map to public IPFS gateways.
IPFS_FALLBACK_GATEWAYS = ["https://ipfs.io", "https://nftstorage.link", "https://dweb.link"]
DEAD_IPFS_HOSTS = {"gateway.objkt.com"}


# ----- cache --------------------------------------------------------------


_cache_lock = threading.Lock()


def open_cache(path: Path = CACHE_PATH) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), check_same_thread=False, timeout=30.0)
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS image_cache (
            url        TEXT PRIMARY KEY NOT NULL,
            sha256     TEXT,
            mime_type  TEXT,
            bytes      BLOB,
            fetched_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            status     TEXT NOT NULL    -- 'ok' | 'http_error' | 'too_large' | 'bad_mime' | 'fetch_failed' | 'pillow_failed'
        )
        """
    )
    conn.commit()
    return conn


def cache_get(conn: sqlite3.Connection, url: str) -> Optional[dict]:
    with _cache_lock:
        row = conn.execute(
            "SELECT sha256, mime_type, bytes, status FROM image_cache WHERE url = ?",
            (url,),
        ).fetchone()
    if row is None:
        return None
    sha, mime, blob, status = row
    return {"sha256": sha, "mime_type": mime, "bytes": blob, "status": status}


def cache_put(conn: sqlite3.Connection, url: str, status: str,
              sha256: Optional[str] = None, mime_type: Optional[str] = None,
              data: Optional[bytes] = None) -> None:
    with _cache_lock:
        conn.execute(
            "INSERT OR REPLACE INTO image_cache (url, sha256, mime_type, bytes, status) VALUES (?, ?, ?, ?, ?)",
            (url, sha256, mime_type, data, status),
        )
        conn.commit()


# ----- network ------------------------------------------------------------


_host_sems: dict[str, threading.Semaphore] = {}
_host_sems_lock = threading.Lock()


def _host_sem(host: str) -> threading.Semaphore:
    with _host_sems_lock:
        sem = _host_sems.get(host)
        if sem is None:
            sem = threading.Semaphore(HOST_LIMITS.get(host, DEFAULT_HOST_LIMIT))
            _host_sems[host] = sem
        return sem


def _candidate_urls(url: str) -> list[str]:
    parsed = urllib.parse.urlparse(url)
    if parsed.netloc in DEAD_IPFS_HOSTS and parsed.path.startswith("/ipfs/"):
        return [gw + parsed.path for gw in IPFS_FALLBACK_GATEWAYS]
    return [url]


def _fetch_once(url: str) -> tuple[bytes, str]:
    parsed = urllib.parse.urlparse(url)
    with _host_sem(parsed.netloc):
        delay = 1.0
        last_err: Optional[Exception] = None
        for attempt in range(4):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=FETCH_TIMEOUT) as r:
                    ct = (r.headers.get("Content-Type") or "").split(";")[0].strip().lower()
                    data = r.read(RAW_FETCH_CAP + 1)
                    if len(data) > RAW_FETCH_CAP:
                        raise ValueError(f"image > {RAW_FETCH_CAP} bytes")
                    return data, ct
            except urllib.error.HTTPError as e:
                last_err = e
                if e.code == 429 and attempt < 3:
                    time.sleep(delay)
                    delay *= 2
                    continue
                raise
            except Exception as e:
                last_err = e
                raise
        raise last_err  # type: ignore[misc]


def _fetch_raw(url: str) -> tuple[bytes, str]:
    last_err: Optional[Exception] = None
    for candidate in _candidate_urls(url):
        try:
            return _fetch_once(candidate)
        except Exception as e:
            last_err = e
            continue
    raise last_err if last_err else RuntimeError("no candidate URLs")


# ----- pipeline -----------------------------------------------------------


def _normalise(raw: bytes) -> tuple[bytes, str]:
    """
    Decode with Pillow, downsample if either edge exceeds LONG_EDGE_PX,
    and re-encode as JPEG (RGB) for a stable single output format.
    Returns (bytes, mime_type). Raises on decode failure.
    """
    with Image.open(io.BytesIO(raw)) as im:
        im.load()
        # Convert away from palette / alpha modes so JPEG encoding is safe.
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        w, h = im.size
        long_edge = max(w, h)
        if long_edge > LONG_EDGE_PX:
            scale = LONG_EDGE_PX / long_edge
            im = im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
        return buf.getvalue(), "image/jpeg"


def fetch_and_prepare(url: str, cache: sqlite3.Connection) -> Optional[dict]:
    """
    Public entrypoint. Returns:
      {"bytes": b"...", "mime": "image/jpeg", "sha256": "hex", "from_cache": bool}
    or None if the URL cannot produce a usable image (logged in cache as a
    non-'ok' status so we don't retry every run).
    """
    hit = cache_get(cache, url)
    if hit is not None:
        if hit["status"] == "ok" and hit["bytes"] is not None:
            return {
                "bytes": bytes(hit["bytes"]),
                "mime": hit["mime_type"],
                "sha256": hit["sha256"],
                "from_cache": True,
            }
        # Negative cache — don't retry.
        return None

    # Fetch.
    try:
        raw, ct = _fetch_raw(url)
    except Exception as e:  # noqa: BLE001
        cache_put(cache, url, status=f"fetch_failed: {type(e).__name__}: {str(e)[:200]}")
        return None

    if ct and ct not in ACCEPT_MIMES:
        cache_put(cache, url, status=f"bad_mime: {ct}")
        return None

    # Normalise.
    try:
        out, mime = _normalise(raw)
    except Exception as e:  # noqa: BLE001
        cache_put(cache, url, status=f"pillow_failed: {type(e).__name__}: {str(e)[:200]}")
        return None

    sha = hashlib.sha256(out).hexdigest()
    cache_put(cache, url, status="ok", sha256=sha, mime_type=mime, data=out)
    return {"bytes": out, "mime": mime, "sha256": sha, "from_cache": False}


def pick_image_url(metadata: dict) -> Optional[str]:
    """
    Prefer R2 cdn_image_url (stable) over image_url (rotting). Returns None
    if the node has no image.
    """
    cdn = metadata.get("cdn_image_url")
    if isinstance(cdn, str) and cdn:
        return cdn
    src = metadata.get("image_url")
    if isinstance(src, str) and src:
        return src
    return None


if __name__ == "__main__":
    # Manual smoke test: pass a URL on argv and print the result summary.
    import sys
    if len(sys.argv) < 2:
        sys.exit("usage: image_fetch.py <url>")
    cache = open_cache()
    res = fetch_and_prepare(sys.argv[1], cache)
    if res is None:
        print("FAIL (see cache for status)")
        row = cache_get(cache, sys.argv[1])
        if row:
            print(f"  status={row['status']}")
        sys.exit(1)
    print(f"OK  mime={res['mime']}  bytes={len(res['bytes'])}  sha={res['sha256'][:16]}  cached={res['from_cache']}")
