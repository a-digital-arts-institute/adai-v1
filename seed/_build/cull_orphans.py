#!/usr/bin/env python3
"""
Cull ORPHANS — a maintenance janitor for two kinds of dangling artefact that
accumulate as canon shrinks (a cull, a disambiguation supersession, a re-run
that drops newly-minted tokens):

  A. Stale EMBEDDING vectors — rows in seed/embeddings.{json,bin} whose node_id
     is no longer in seed/nodes.json.
     The embed pipeline only ever ADDS / reuses rows keyed by (text_hash,
     image_hash); it never prunes node_ids that vanished from canon. So a node
     that left the graph keeps a vector forever. Harmless but cruft.

  B. Unreferenced Cloudflare R2 IMAGES — objects under the `images/` prefix in
     the R2 bucket that no canon image carrier points at. R2 is content-
     addressed + immutable, so a dropped artwork's image just lingers, paid-for,
     forever. We reconcile the bucket against the three committed image carriers
     (nodes.json, image_mirror.json, image_overlay.json — see CLAUDE.md "Image
     mirror — Cloudflare R2").

SAFE BY DEFAULT. With no flags this is a pure read: it lists R2, diffs against
canon, and PRINTS what it WOULD remove. It mutates nothing until you pass an
explicit destructive flag:

  --apply    rewrite seed/embeddings.{bin,json}, dropping orphan rows and
             RECOMPUTING byte offsets so the two files stay mutually consistent.
  --delete   batch-delete orphan objects from the R2 bucket.

A loud SAFETY GUARD refuses --delete if the referenced-key set came back
suspiciously small (canon failed to load → we'd otherwise nuke the bucket).

Reuses upload_to_r2.py's env-loading + boto3 client construction verbatim, and
the same content-addressed key scheme (images/<sha[:2]>/<sha>.<ext>).

Usage (from project root):
    seed/_build/.venv/bin/python3 seed/_build/cull_orphans.py            # dry-run (read-only)
    seed/_build/.venv/bin/python3 seed/_build/cull_orphans.py --apply    # rewrite embeddings
    seed/_build/.venv/bin/python3 seed/_build/cull_orphans.py --delete   # delete orphan R2 objects
    seed/_build/.venv/bin/python3 seed/_build/cull_orphans.py --apply --delete --limit 50
"""
from __future__ import annotations

import argparse
import json
import struct
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
NODES_PATH = ROOT / "seed" / "nodes.json"
MIRROR_PATH = ROOT / "seed" / "image_mirror.json"
OVERLAY_PATH = ROOT / "seed" / "image_overlay.json"
EMB_BIN_PATH = ROOT / "seed" / "embeddings.bin"
EMB_META_PATH = ROOT / "seed" / "embeddings.json"
ENV_PATH = ROOT / ".env"

# R2 object key prefix for all node images (content-addressed). Anything else
# in the bucket is out of scope for this janitor and is never touched.
IMAGE_PREFIX = "images/"

# If canon resolves to fewer than this many referenced R2 keys, we assume a
# load failure and REFUSE to delete — deleting against a near-empty reference
# set would wipe the bucket.
MIN_REFERENCED_KEYS = 100


# ----- env + client (verbatim from upload_to_r2.py) ---------------------


def load_env() -> dict:
    """Parse the project-root .env exactly like upload_to_r2.load_env()."""
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


# ----- canon loaders ----------------------------------------------------


def _load_json_any(path: Path):
    """Read a seed JSON file. nodes.json is the compact one-record-per-line
    form (merge_batches._compact_lines) but is still valid JSON, so plain
    json.loads handles both that and a pretty-printed array."""
    return json.loads(path.read_text())


def canon_node_ids() -> set[str]:
    """The set of live node ids — the `id` of every row in seed/nodes.json."""
    nodes = _load_json_any(NODES_PATH)
    return {n["id"] for n in nodes if isinstance(n, dict) and n.get("id")}


def _parse_metadata(md_raw) -> dict:
    if isinstance(md_raw, str):
        try:
            return json.loads(md_raw)
        except json.JSONDecodeError:
            return {}
    return md_raw if isinstance(md_raw, dict) else {}


def cdn_url_to_key(cdn_url: str, public_base: str) -> str | None:
    """Map an R2 public CDN url back to its bucket object key.

    Mirrors upload_to_r2.py's forward mapping
        cdn_url = f"{R2_PUBLIC_BASE.rstrip('/')}/{key}"
    so the inverse is "strip the public base prefix". We also tolerate a cdn
    that was stored against a different public host (e.g. a custom domain in
    front of the same bucket) by falling back to the URL path, since the key
    scheme `images/<sha[:2]>/<sha>.<ext>` is the tail of the path either way."""
    if not cdn_url:
        return None
    base = public_base.rstrip("/") + "/"
    if cdn_url.startswith(base):
        key = cdn_url[len(base):]
    else:
        # Fallback: take the path and find the images/ segment.
        path = urllib.parse.urlparse(cdn_url).path.lstrip("/")
        idx = path.find(IMAGE_PREFIX)
        key = path[idx:] if idx != -1 else path
    key = key.strip("/")
    return key or None


def referenced_keys(public_base: str) -> set[str]:
    """Every R2 object key that some canon image carrier points at, drawn from
    all three carriers (see CLAUDE.md "Three image carriers, three jobs"):

      - nodes.json metadata.cdn_image_url  (images that arrived with a batch)
      - image_mirror.json cdn_image_url    (R2 cdn for already-imaged nodes)
      - image_overlay.json cdn_image_url   (gap-fill for imageless nodes)
    """
    keys: set[str] = set()

    # 1. nodes.json — cdn_image_url lives inside the (stringified) metadata blob.
    for n in _load_json_any(NODES_PATH):
        if not isinstance(n, dict):
            continue
        md = _parse_metadata(n.get("metadata"))
        k = cdn_url_to_key(md.get("cdn_image_url"), public_base)
        if k:
            keys.add(k)

    # 2 + 3. mirror + overlay — flat lists of {node_id, ..., cdn_image_url}.
    for path in (MIRROR_PATH, OVERLAY_PATH):
        if not path.exists():
            continue
        try:
            entries = _load_json_any(path)
        except (json.JSONDecodeError, OSError):
            continue
        for e in entries:
            if not isinstance(e, dict):
                continue
            k = cdn_url_to_key(e.get("cdn_image_url"), public_base)
            if k:
                keys.add(k)

    return keys


# ----- A. orphan embeddings ---------------------------------------------


def cull_embeddings(canon_ids: set[str], apply: bool) -> None:
    print("\n=== A. ORPHAN EMBEDDINGS ===")
    if not EMB_META_PATH.exists():
        print(f"no {EMB_META_PATH.name} — skipping")
        return

    meta = json.loads(EMB_META_PATH.read_text())
    total = len(meta)
    orphans = [m for m in meta if m.get("node_id") not in canon_ids]
    survivors = [m for m in meta if m.get("node_id") in canon_ids]

    # Tally by kind for both the whole set and orphans.
    def by_kind(rows: list[dict]) -> dict[str, int]:
        out: dict[str, int] = {}
        for r in rows:
            out[r.get("kind", "?")] = out.get(r.get("kind", "?"), 0) + 1
        return out

    print(f"embedding rows total: {total}")
    print(f"  by kind: {by_kind(meta)}")
    print(f"orphan rows (node_id not in canon): {len(orphans)}")
    if orphans:
        print(f"  by kind: {by_kind(orphans)}")
        for m in orphans[:10]:
            print(f"    [orphan] {m.get('node_id')}  (kind={m.get('kind')})")
        if len(orphans) > 10:
            print(f"    ... +{len(orphans) - 10} more")

    if not apply:
        if orphans:
            print("dry-run: embeddings untouched — pass --apply to rewrite")
        return
    if not orphans:
        print("nothing to prune — embeddings untouched")
        return

    # --- rewrite, recomputing offsets ---
    # Read each survivor's vector bytes from the OLD .bin at its OLD offset,
    # then repack in survivor order with fresh contiguous offsets. dims*4 bytes
    # per vector; if a survivor's slice is the wrong length the .bin is corrupt
    # and we bail rather than ship an inconsistent sidecar.
    if not EMB_BIN_PATH.exists():
        sys.exit(f"{EMB_META_PATH.name} present but {EMB_BIN_PATH.name} missing — refusing to rewrite")

    old_bytes = EMB_BIN_PATH.read_bytes()
    new_meta: list[dict] = []
    bin_buf = bytearray()
    for m in survivors:
        dims = int(m["dims"])
        old_off = int(m["offset"])
        vec = old_bytes[old_off: old_off + dims * 4]
        if len(vec) != dims * 4:
            sys.exit(
                f"corrupt .bin: {m['node_id']} wanted {dims * 4} bytes at offset "
                f"{old_off}, got {len(vec)} — aborting, no files written"
            )
        new_meta.append({**m, "offset": len(bin_buf)})
        bin_buf.extend(vec)

    # Sanity: the new bin must be exactly survivors × dims × 4 (assuming a
    # uniform dims, which the seed always uses).
    expected = sum(int(m["dims"]) * 4 for m in survivors)
    if len(bin_buf) != expected:
        sys.exit(f"internal: repacked bin {len(bin_buf)}B != expected {expected}B — aborting")

    # Atomic writes (.tmp → replace), matching embed_nodes.py's pattern.
    tmp_bin = EMB_BIN_PATH.with_suffix(".bin.tmp")
    tmp_meta = EMB_META_PATH.with_suffix(".json.tmp")
    tmp_bin.write_bytes(bytes(bin_buf))
    tmp_meta.write_text(json.dumps(new_meta, indent=2) + "\n")
    tmp_bin.replace(EMB_BIN_PATH)
    tmp_meta.replace(EMB_META_PATH)
    print(f"rewrote {EMB_BIN_PATH.name} + {EMB_META_PATH.name}: "
          f"{len(new_meta)} rows kept, {len(orphans)} dropped")


# ----- B. orphan R2 images ----------------------------------------------


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


def cull_r2(env: dict, s3, delete: bool, limit: int) -> None:
    print("\n=== B. ORPHAN R2 IMAGES ===")
    public_base = env["R2_PUBLIC_BASE"]
    bucket = env["R2_BUCKET"]

    refs = referenced_keys(public_base)
    print(f"referenced keys (nodes.json + image_mirror.json + image_overlay.json): {len(refs)}")

    objects = list_r2_images(s3, bucket)
    print(f"R2 objects under '{IMAGE_PREFIX}': {len(objects)}")

    orphans = [o for o in objects if o["Key"] not in refs]
    orphan_bytes = sum(o["Size"] for o in orphans)
    print(f"orphan objects (in bucket, not referenced): {len(orphans)}  "
          f"({_fmt_bytes(orphan_bytes)})")
    for o in orphans[:10]:
        print(f"    [orphan] {o['Key']}  ({_fmt_bytes(o['Size'])})")
    if len(orphans) > 10:
        print(f"    ... +{len(orphans) - 10} more")

    if not delete:
        if orphans:
            print("dry-run: bucket untouched — pass --delete to remove orphans")
        return
    if not orphans:
        print("nothing to delete — bucket untouched")
        return

    # SAFETY GUARD — refuse to delete if canon barely resolved any references.
    # A near-empty ref set means nodes.json / the sidecars failed to load, and
    # deleting against it would wipe the whole bucket.
    if len(refs) < MIN_REFERENCED_KEYS:
        print("\n" + "!" * 70)
        print(f"REFUSING TO DELETE: only {len(refs)} referenced keys "
              f"(threshold {MIN_REFERENCED_KEYS}).")
        print("Canon almost certainly failed to load — deleting now would wipe")
        print("the bucket. Fix the canon read first, then re-run with --delete.")
        print("!" * 70)
        sys.exit(3)

    to_delete = orphans[:limit] if limit else orphans
    if limit:
        print(f"--limit {limit}: deleting first {len(to_delete)} of {len(orphans)} orphans")

    freed = 0
    deleted = 0
    # delete_objects takes up to 1000 keys per call.
    for i in range(0, len(to_delete), 1000):
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


# ----- main -------------------------------------------------------------


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Cull orphan embeddings + unreferenced R2 images. Dry-run by default."
    )
    ap.add_argument("--apply", action="store_true",
                    help="rewrite seed/embeddings.{bin,json} (destructive)")
    ap.add_argument("--delete", action="store_true",
                    help="delete orphan objects from the R2 bucket (destructive)")
    ap.add_argument("--limit", type=int, default=0,
                    help="cap the R2 deletion to the first N orphans (for testing)")
    args = ap.parse_args()

    canon_ids = canon_node_ids()
    print(f"canon nodes (seed/nodes.json): {len(canon_ids)}")

    # A. Embeddings — purely local files, no creds needed.
    cull_embeddings(canon_ids, args.apply)

    # B. R2 — needs creds + a client. The list is read-only; deletion is gated
    # by --delete and the safety guard.
    env = load_env()
    s3 = make_s3(env)
    cull_r2(env, s3, args.delete, args.limit)

    print("\n=== SUMMARY ===")
    if not args.apply and not args.delete:
        print("dry-run only — no files or objects were modified.")
        print("  --apply   to rewrite embeddings  ·  --delete   to remove R2 orphans")
    else:
        print(f"apply={args.apply}  delete={args.delete}  (changes above are live)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
