#!/usr/bin/env python3
"""
Cull ORPHAN R2 images — reconcile the Cloudflare R2 image bucket against the
LIVE database and delete objects no live node references.

┌──────────────────────────────────────────────────────────────────────────┐
│  THE LIVE DB IS THE ONLY SOURCE OF TRUTH.                                   │
│                                                                            │
│  The genesis seed pipeline (seed/*.json + the offline build) was RETIRED   │
│  June 2026. This tool does NOT read any seed file. An object under         │
│  `images/` is an ORPHAN iff no row in the live `nodes` table points at it  │
│  via metadata.cdn_image_url. R2 is content-addressed + immutable, so a     │
│  dropped/replaced image otherwise lingers, paid-for, forever.              │
└──────────────────────────────────────────────────────────────────────────┘

The live DB reference set includes RETIRED nodes (metadata.retired == 1): a
retired node drops out of listings but stays reachable by direct URL (the husk
model), so its image is still legitimately referenced and must NOT be culled.

SAFE BY DEFAULT. With no destructive flag this is a pure read: it lists R2,
diffs against the DB, and PRINTS what it WOULD remove. It mutates nothing until
you pass --delete. A loud SAFETY GUARD refuses --delete if the DB resolved
suspiciously few references (a load failure would otherwise nuke the bucket).

Reuses the same env-loading + boto3 client + content-addressed key scheme as
the rest of the image tooling (images/<sha[:2]>/<sha>.<ext>).

Usage (from project root):
    seed/_build/.venv/bin/python3 seed/_build/cull_orphans.py --db ./adai.db
    seed/_build/.venv/bin/python3 seed/_build/cull_orphans.py --db ./adai.db --delete

Against PROD, use the justfile recipes (they pull /data/adai.db + WAL first):
    just cull-orphans-prod            # dry-run against the live DB
    just cull-orphans-prod-delete     # actually delete orphan R2 objects
"""
from __future__ import annotations

import argparse
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
        "  (python3 -m venv seed/_build/.venv && seed/_build/.venv/bin/pip install boto3)\n"
    )
    sys.exit(2)

ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = ROOT / ".env"

# R2 object key prefix for all node images (content-addressed). Anything else
# in the bucket is out of scope and is never touched.
IMAGE_PREFIX = "images/"

# If the DB resolves fewer than this many referenced keys, assume a load failure
# and REFUSE to delete — deleting against a near-empty reference set would wipe
# the bucket.
MIN_REFERENCED_KEYS = 100


# ----- env + client -----------------------------------------------------


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


# ----- live-DB reference resolution -------------------------------------


def cdn_url_to_key(cdn_url: str | None, public_base: str) -> str | None:
    """Map an R2 public CDN url back to its bucket object key (inverse of the
    uploader's `f"{R2_PUBLIC_BASE}/{key}"`)."""
    if not cdn_url:
        return None
    base = public_base.rstrip("/") + "/"
    if cdn_url.startswith(base):
        key = cdn_url[len(base):]
    else:
        # Tolerate a different public host in front of the same bucket: the key
        # scheme images/<sha[:2]>/<sha>.<ext> is the tail of the path either way.
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


def db_referenced_keys(db_paths: list[Path], public_base: str) -> set[str]:
    """Every R2 object key referenced by metadata.cdn_image_url across all live
    DB(s) — INCLUDING retired nodes. Stock sqlite3 reads the base `nodes` table
    fine (CR-SQLite's CRR machinery lives in shadow tables). Opened read-write so
    a pulled copy's WAL is applied on first read; we never write."""
    keys: set[str] = set()
    for dbp in db_paths:
        con = sqlite3.connect(str(dbp))
        try:
            try:
                cur = con.execute("SELECT metadata FROM nodes")
            except sqlite3.OperationalError as e:
                sys.exit(f"--db {dbp}: cannot read `nodes` table ({e})")
            for (md_raw,) in cur:
                k = cdn_url_to_key(_parse_metadata(md_raw).get("cdn_image_url"), public_base)
                if k:
                    keys.add(k)
        finally:
            con.close()
    return keys


# ----- R2 listing + delete ----------------------------------------------


def list_r2_images(s3, bucket: str) -> list[dict]:
    """Every object under images/ — list of {Key, Size}. Paginated."""
    out: list[dict] = []
    token = None
    while True:
        kw = {"Bucket": bucket, "Prefix": IMAGE_PREFIX, "MaxKeys": 1000}
        if token:
            kw["ContinuationToken"] = token
        resp = s3.list_objects_v2(**kw)
        for obj in resp.get("Contents", []):
            out.append({"Key": obj["Key"], "Size": obj.get("Size", 0)})
        if resp.get("IsTruncated"):
            token = resp.get("NextContinuationToken")
        else:
            break
    return out


def _fmt_bytes(n: int) -> str:
    f = float(n)
    for unit in ("B", "KiB", "MiB", "GiB", "TiB"):
        if f < 1024 or unit == "TiB":
            return f"{f:.1f} {unit}" if unit != "B" else f"{int(f)} B"
        f /= 1024
    return f"{n} B"


def cull_r2(env: dict, s3, delete: bool, limit: int, db_paths: list[Path]) -> int:
    print("=== ORPHAN R2 IMAGES (reconciled against the LIVE DB only) ===")
    public_base = env["R2_PUBLIC_BASE"]
    bucket = env["R2_BUCKET"]

    refs: set[str] = set()
    for dbp in db_paths:
        keys_db = db_referenced_keys([dbp], public_base)
        print(f"referenced keys — live DB {dbp}: {len(keys_db)}")
        refs |= keys_db
    print(f"referenced keys — LIVE DB total: {len(refs)}")

    objects = list_r2_images(s3, bucket)
    print(f"R2 objects under '{IMAGE_PREFIX}': {len(objects)} ({_fmt_bytes(sum(o['Size'] for o in objects))})")

    orphans = [o for o in objects if o["Key"] not in refs]
    orphan_bytes = sum(o["Size"] for o in orphans)
    print(f"orphan objects (in bucket, not referenced by a live node): {len(orphans)}  "
          f"({_fmt_bytes(orphan_bytes)})")
    for o in orphans[:10]:
        print(f"    [orphan] {o['Key']}  ({_fmt_bytes(o['Size'])})")
    if len(orphans) > 10:
        print(f"    ... +{len(orphans) - 10} more")

    if not delete:
        if orphans:
            print("\ndry-run: bucket untouched — pass --delete to remove orphans")
        else:
            print("\nnothing to delete — bucket already matches the live DB")
        return 0
    if not orphans:
        print("nothing to delete — bucket untouched")
        return 0

    # SAFETY GUARD — refuse to delete if the DB barely resolved any references.
    if len(refs) < MIN_REFERENCED_KEYS:
        print("\n" + "!" * 70)
        print(f"REFUSING TO DELETE: only {len(refs)} referenced keys (threshold {MIN_REFERENCED_KEYS}).")
        print("The live DB almost certainly failed to load — deleting now would wipe")
        print("the bucket. Fix the --db read first, then re-run with --delete.")
        print("!" * 70)
        sys.exit(3)

    to_delete = orphans[:limit] if limit else orphans
    if limit:
        print(f"--limit {limit}: deleting first {len(to_delete)} of {len(orphans)} orphans")

    freed = 0
    deleted = 0
    for i in range(0, len(to_delete), 1000):  # delete_objects takes up to 1000 keys
        batch = to_delete[i: i + 1000]
        resp = s3.delete_objects(
            Bucket=bucket,
            Delete={"Objects": [{"Key": o["Key"]} for o in batch], "Quiet": True},
        )
        errs = resp.get("Errors") or []
        for e in errs:
            print(f"    [err] {e.get('Key')}: {e.get('Code')} {e.get('Message')}")
        ok_keys = {o["Key"] for o in batch} - {e.get("Key") for e in errs}
        deleted += len(ok_keys)
        freed += sum(o["Size"] for o in batch if o["Key"] in ok_keys)
        print(f"  deleted {deleted}/{len(to_delete)} (freed {_fmt_bytes(freed)})")

    print(f"deleted {deleted} orphan objects, freed {_fmt_bytes(freed)}")
    return deleted


# ----- main -------------------------------------------------------------


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Delete R2 images no live node references. Dry-run by default."
    )
    ap.add_argument("--db", action="append", default=[], metavar="PATH", required=True,
                    help="path to a live adai.db whose node cdn_image_urls are the "
                         "reference set (repeatable)")
    ap.add_argument("--delete", action="store_true",
                    help="delete orphan objects from the R2 bucket (destructive)")
    ap.add_argument("--limit", type=int, default=0,
                    help="cap the deletion to the first N orphans (for testing)")
    args = ap.parse_args()

    db_paths = [Path(p) for p in args.db]
    for dbp in db_paths:
        if not dbp.exists():
            sys.exit(f"--db path not found: {dbp}")

    env = load_env()
    s3 = make_s3(env)
    cull_r2(env, s3, args.delete, args.limit, db_paths)

    print("\n=== SUMMARY ===")
    print("dry-run only — no objects modified." if not args.delete
          else f"delete=True  db={[str(p) for p in db_paths]}  (changes above are live)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
