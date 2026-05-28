#!/usr/bin/env python3
"""Image link-rot scanner for the A(DAI) seed canon.

Checks every `metadata.image_url` (upstream provenance) and
`metadata.cdn_image_url` (R2 mirror) in seed/nodes.json and reports which
ones still resolve to a real image. The whole point of the R2 mirror is that
upstream rot (MoMA signed URLs expiring, dead IPFS gateways, Wikimedia 429s)
shouldn't break rendering — so an upstream that's dead while the CDN is alive
is *fine*, not a bug. This tool makes that distinction explicit.

It is READ-ONLY against seed/*.json. It never edits the canon. For dead links
it proposes a working fallback (IPFS gateway swap, Wayback Machine) into the
report so a human / the uploader can act on it.

Classifications per node:
  ok                 cdn_image_url resolves to an image (rendering is safe)
  upstream_rotted    image_url dead but cdn_image_url alive (acceptable — the
                     mirror is doing its job; informational only)
  cdn_dead           has image_url (alive) but cdn_image_url missing/dead
                     → re-mirror: run upload_to_r2.py
  both_dead          neither resolves → needs re-sourcing (fallback proposed
                     if one was found)
  no_image           node carries no image field at all → find_missing_images.py

Healing (re-hosting to R2) is intentionally NOT done here — that needs R2
creds and already lives in upload_to_r2.py. This tool only diagnoses.

Usage:
  python3 seed/_build/sanitize_images.py                      # full scan + report
  python3 seed/_build/sanitize_images.py --limit 50           # sample
  python3 seed/_build/sanitize_images.py --types artwork      # one node type
  python3 seed/_build/sanitize_images.py --no-upstream        # check cdn only (faster)
"""
from __future__ import annotations

import argparse
import collections
import json
import pathlib
import threading
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
NODES_PATH = ROOT / "seed" / "nodes.json"
REPORT_PATH = ROOT / "seed" / "_build" / "image_sanitize_report.json"

UA = "adai-image-tools/0.1 (https://adai-basel.fly.dev; image link-rot check)"
MIN_IMAGE_BYTES = 512
PER_HOST_CONCURRENCY = 4
TIMEOUT = 15

# Dead-gateway swaps for objkt's old IPFS gateway, mirroring upload_to_r2.py.
IPFS_FALLBACK_GATEWAYS = ["https://ipfs.io", "https://nftstorage.link", "https://dweb.link"]

_IMAGE_MAGIC = (b"\xff\xd8\xff", b"\x89PNG\r\n\x1a\n", b"GIF87a", b"GIF89a")


def md(node: dict) -> dict:
    m = node.get("metadata")
    if isinstance(m, dict):
        return m
    if isinstance(m, str):
        try:
            d = json.loads(m)
            return d if isinstance(d, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


_host_sems: dict[str, threading.Semaphore] = {}
_host_lock = threading.Lock()


def host_sem(url: str) -> threading.Semaphore:
    host = urllib.parse.urlparse(url).netloc
    with _host_lock:
        if host not in _host_sems:
            _host_sems[host] = threading.Semaphore(PER_HOST_CONCURRENCY)
        return _host_sems[host]


def _looks_like_image(ctype: str, head: bytes) -> bool:
    if ctype and ctype.lower().startswith("image/"):
        return True
    return any(head.startswith(sig) for sig in _IMAGE_MAGIC) or (
        head[:4] == b"RIFF" and head[8:12] == b"WEBP"
    )


def check_url(url: str) -> dict:
    """Return {alive, status, ctype, note}. Tries HEAD, falls back to a ranged GET."""
    sem = host_sem(url)
    with sem:
        # Try HEAD first (cheap).
        try:
            req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA})
            r = urllib.request.urlopen(req, timeout=TIMEOUT)
            ctype = r.headers.get("content-type", "")
            clen = int(r.headers.get("content-length") or 0)
            if r.status == 200 and ctype.lower().startswith("image/") and (clen == 0 or clen >= MIN_IMAGE_BYTES):
                return {"alive": True, "status": 200, "ctype": ctype, "note": "head"}
        except Exception:
            pass
        # Fall back to a small ranged GET — sniff magic bytes.
        try:
            req = urllib.request.Request(
                url, headers={"User-Agent": UA, "Range": "bytes=0-2047", "Accept": "image/*,*/*"}
            )
            r = urllib.request.urlopen(req, timeout=TIMEOUT)
            head = r.read(2048)
            ctype = r.headers.get("content-type", "")
            ok = r.status in (200, 206) and _looks_like_image(ctype, head)
            return {"alive": ok, "status": r.status, "ctype": ctype,
                    "note": "get" if ok else "not-an-image"}
        except urllib.error.HTTPError as e:
            return {"alive": False, "status": e.code, "ctype": "", "note": f"http {e.code}"}
        except Exception as e:
            return {"alive": False, "status": None, "ctype": "", "note": type(e).__name__}


def ipfs_fallbacks(url: str) -> list[str]:
    p = urllib.parse.urlparse(url)
    if "/ipfs/" not in p.path and not p.path.startswith("/ipfs"):
        return []
    idx = url.find("/ipfs/")
    tail = url[idx:]
    return [gw + tail for gw in IPFS_FALLBACK_GATEWAYS if not url.startswith(gw)]


def wayback(url: str) -> str | None:
    try:
        api = "https://archive.org/wayback/available?url=" + urllib.parse.quote(url, safe="")
        req = urllib.request.Request(api, headers={"User-Agent": UA})
        d = json.load(urllib.request.urlopen(req, timeout=TIMEOUT))
        snap = d.get("archived_snapshots", {}).get("closest", {})
        return snap.get("url") if snap.get("available") else None
    except Exception:
        return None


def classify(node: dict, check_upstream: bool) -> dict:
    m = md(node)
    up, cdn = m.get("image_url"), m.get("cdn_image_url")
    out = {"id": node["id"], "type": node["type"], "name": node.get("name")}

    if not up and not cdn:
        out["class"] = "no_image"
        return out

    cdn_res = check_url(cdn) if cdn else {"alive": False, "note": "absent"}
    up_res = check_url(up) if (up and check_upstream) else {"alive": False, "note": "skipped" if up else "absent"}

    if cdn_res["alive"]:
        out["class"] = "ok" if (up_res["alive"] or not check_upstream or not up) else "upstream_rotted"
    elif up_res["alive"]:
        out["class"] = "cdn_dead"  # upstream fine, mirror missing/broken → re-run upload_to_r2
    else:
        out["class"] = "both_dead"
        # Try to find a working fallback so re-sourcing is cheap.
        fallback = None
        for cand in ipfs_fallbacks(up or cdn or ""):
            if check_url(cand)["alive"]:
                fallback = cand
                break
        if not fallback and up:
            wb = wayback(up)
            if wb and check_url(wb)["alive"]:
                fallback = wb
        out["proposed_fallback"] = fallback

    out["upstream"] = {"url": up, **up_res} if up else None
    out["cdn"] = {"url": cdn, **cdn_res} if cdn else None
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--limit", type=int, default=0, help="check at most N nodes (0 = all)")
    ap.add_argument("--types", nargs="*", help="restrict to these node types")
    ap.add_argument("--no-upstream", action="store_true", help="check cdn_image_url only (faster)")
    ap.add_argument("--workers", type=int, default=12)
    args = ap.parse_args()

    nodes = json.loads(NODES_PATH.read_text())
    work = [n for n in nodes if (not args.types or n["type"] in args.types)]
    work = [n for n in work if md(n).get("image_url") or md(n).get("cdn_image_url")]
    if args.limit:
        work = work[: args.limit]

    print(f"scanning {len(work)} nodes with image fields "
          f"(upstream check: {'off' if args.no_upstream else 'on'})…")

    results = []
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(classify, n, not args.no_upstream): n for n in work}
        for i, fut in enumerate(as_completed(futs), 1):
            results.append(fut.result())
            if i % 50 == 0:
                print(f"  …{i}/{len(work)}")

    buckets = collections.Counter(r["class"] for r in results)
    report = {
        "scanned": len(results),
        "summary": dict(buckets),
        "cdn_dead": [r for r in results if r["class"] == "cdn_dead"],
        "both_dead": [r for r in results if r["class"] == "both_dead"],
        "upstream_rotted": [{"id": r["id"]} for r in results if r["class"] == "upstream_rotted"],
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False))

    print("\n=== image sanitize summary ===")
    for k in ("ok", "upstream_rotted", "cdn_dead", "both_dead"):
        print(f"  {k:16} {buckets.get(k, 0)}")
    healable = buckets.get("cdn_dead", 0)
    if healable:
        print(f"\n→ {healable} cdn_dead: re-mirror with `python3 seed/_build/upload_to_r2.py`")
    if buckets.get("both_dead"):
        n_fb = sum(1 for r in report["both_dead"] if r.get("proposed_fallback"))
        print(f"→ {buckets['both_dead']} both_dead ({n_fb} have a proposed working fallback in the report)")
    print(f"\nfull report → {REPORT_PATH.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
