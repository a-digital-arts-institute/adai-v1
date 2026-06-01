#!/usr/bin/env python3
"""
Embed every embeddable node in seed/nodes.json into a single multimodal
vector space using Google's Gemini Embedding 2.

╔══════════════════════════════════════════════════════════════════════════╗
║  ⚠️  ALWAYS RUN `upload_to_r2.py --mirror` BEFORE THIS SCRIPT.  ⚠️          ║
║                                                                            ║
║  ARTWORK EMBEDDINGS ARE MULTIMODAL — THE IMAGE IS PART OF THE VECTOR.      ║
║  THIS SCRIPT READS ARTWORK IMAGES FROM THE R2 MIRROR (image_mirror.json).  ║
║  IF AN IMAGE HASN'T BEEN MIRRORED YET, THE EMBEDDER SILENTLY FALLS BACK    ║
║  TO TEXT-ONLY — A WRONG VECTOR THAT LOOKS FINE. ORDER IS ALWAYS:           ║
║      1. upload_to_r2.py --mirror   (images → R2, cdn → image_mirror.json)  ║
║      2. embed_nodes.py             (this script)                           ║
║      3. project_umap.py                                                    ║
║  THE RUNNER materialize_wikidata_embeddings.sh ENFORCES THIS ORDER.        ║
╚══════════════════════════════════════════════════════════════════════════╝

Inputs:
  - seed/nodes.json
  - .env: GEMINI_API_KEY (required), optionally EMBED_MODEL (defaults to
    'gemini-embedding-2'; override only if Google renames the model)
  - existing seed/embeddings.{bin,json} (optional — used for idempotency:
    rows whose (text_hash, image_hash) match are skipped)

Outputs:
  - seed/embeddings.bin   raw f32 little-endian, N×768 packed, no header
  - seed/embeddings.json  metadata array (one entry per row in .bin), shape:
      [{ node_id, kind, model, dims, has_image, image_hash, text_hash, offset }]
    offset = byte index into .bin (always a multiple of dims*4)

Per-type embedding strategy (see gemini-embeddings2.md § 3):
  artwork                          text + image (if any)
  practitioner | collective        text only (NO portraits — see § 3.1)
  concept | scene                  text only
  institution | publication |
    project | classification_regime  skipped in v1

Practitioner style_centroid rows are computed downstream by the TypeScript
derive pass (src/embed/centroids.ts) from the artwork vectors — not here.

Usage (from project root):
  seed/_build/.venv/bin/python3 seed/_build/embed_nodes.py [flags]

Flags:
  --dry-run        compute candidate list + hashes, no API calls, no writes
  --limit N        embed at most N nodes (handy for cost checks)
  --workers N      parallel API calls (default 4 — embedding endpoint is
                   per-account rate-limited, don't over-do it)
  --types T1,T2    restrict to a subset of node types (comma-separated)
  --force          re-embed even when hashes match cache
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import hashlib
import json
import os
import struct
import sys
import threading
import time
from pathlib import Path
from typing import Optional

try:
    from dotenv import dotenv_values
except ImportError as e:
    raise ImportError("python-dotenv not installed — see image_fetch.py header") from e

# Local module — must sit next to this script.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from image_fetch import open_cache, fetch_and_prepare, pick_image_url  # noqa: E402


ROOT = Path(__file__).resolve().parents[2]
NODES_PATH = ROOT / "seed" / "nodes.json"
OVERLAY_PATH = ROOT / "seed" / "image_overlay.json"
# Mirror sidecar (upload_to_r2.py --mirror): cdn_image_url for nodes that
# already carry image_url in nodes.json. We prefer the stable R2 cdn over the
# rotting upstream url so the multimodal embedder doesn't fall back to text-only
# whenever fxhash/artblocks/MoMA rate-limit or rot. See CLAUDE.md.
MIRROR_PATH = ROOT / "seed" / "image_mirror.json"
EMB_BIN_PATH = ROOT / "seed" / "embeddings.bin"
EMB_META_PATH = ROOT / "seed" / "embeddings.json"
ENV_PATH = ROOT / ".env"

DIMS = 768
DEFAULT_MODEL = "gemini-embedding-2"
TASK_PREFIX = "task: sentence similarity | query: "

EMBEDDABLE_TYPES = {"artwork", "practitioner", "collective", "concept", "scene"}

# Practitioner portraits intentionally NOT folded in — see design doc § 3.1.
# A practitioner's visual signal comes from the style_centroid row computed
# downstream from their CREATED_BY artworks.
TYPES_WITH_IMAGE = {"artwork"}


# ----- text building -----------------------------------------------------


def _coerce_str(v) -> str:
    if v is None:
        return ""
    if isinstance(v, str):
        return v
    if isinstance(v, (int, float)):
        return str(v)
    # Pull text fields out of dicts (e.g. practice_description in some shapes).
    if isinstance(v, dict):
        return " ".join(_coerce_str(x) for x in v.values() if x)
    if isinstance(v, list):
        return " ".join(_coerce_str(x) for x in v if x)
    return ""


def _parse_metadata(md_raw) -> dict:
    if isinstance(md_raw, str):
        try:
            return json.loads(md_raw)
        except json.JSONDecodeError:
            return {}
    return md_raw or {}


def load_overlay_images() -> dict[str, dict]:
    """Build-time image overlay (seed/image_overlay.json): image_url/cdn_image_url
    for nodes that carry no image in nodes.json. Folded into image selection so an
    artwork image supplied via the overlay still reaches the multimodal embedder
    (matching seed-consolidated.ts's gap-fill apply rule). Empty when absent."""
    if not OVERLAY_PATH.exists():
        return {}
    try:
        entries = json.loads(OVERLAY_PATH.read_text())
    except (json.JSONDecodeError, OSError):
        return {}
    return {e["node_id"]: e for e in entries if isinstance(e, dict) and e.get("node_id")}


def load_mirror_images() -> dict[str, str]:
    """Build-time R2 mirror (seed/image_mirror.json): node_id -> cdn_image_url
    for nodes that ALREADY carry image_url in nodes.json. Folded into image
    selection so the embedder fetches the stable R2 copy instead of the rotting
    upstream url. Empty when absent (embedder falls back to upstream image_url)."""
    if not MIRROR_PATH.exists():
        return {}
    try:
        entries = json.loads(MIRROR_PATH.read_text())
    except (json.JSONDecodeError, OSError):
        return {}
    return {
        e["node_id"]: e["cdn_image_url"]
        for e in entries
        if isinstance(e, dict) and e.get("node_id") and e.get("cdn_image_url")
    }


def build_text(node: dict) -> Optional[str]:
    """
    Returns the embeddable text for a node, or None if the node has no
    usable textual content (in which case we still embed if there's an
    image — caller decides).
    """
    typ = node["type"]
    name = node.get("name") or ""
    md = _parse_metadata(node.get("metadata"))
    fp = md.get("full_profile")

    parts: list[str] = []

    if typ == "artwork":
        if fp:
            bi = fp.get("basic_info") or {}
            pd = fp.get("practice_description")
            year = _coerce_str(bi.get("active_years"))
            location = _coerce_str(bi.get("location"))
            summary = ""
            methodology = ""
            medium = ""
            if isinstance(pd, dict):
                summary = _coerce_str(pd.get("practice_summary"))
                methodology = _coerce_str(pd.get("methodology"))
                medium = _coerce_str(pd.get("medium"))
            elif isinstance(pd, str):
                summary = pd
            head = f"{name}" + (f" ({year})" if year else "")
            parts = [head, medium, summary, methodology, location]
        else:
            # Flat artwork (most of them — Art Blocks / MoMA / fxhash imports).
            year = _coerce_str(md.get("year_start") or md.get("year_raw") or md.get("active_years"))
            desc = _coerce_str(md.get("description"))
            relevance = _coerce_str(md.get("relevance"))
            medium = _coerce_str(md.get("medium") or md.get("work_type"))
            head = f"{name}" + (f" ({year})" if year else "")
            parts = [head, medium, desc, relevance]

    elif typ in ("practitioner", "collective"):
        if fp:
            pd = fp.get("practice_description")
            summary = methodology = medium = ""
            if isinstance(pd, dict):
                summary = _coerce_str(pd.get("practice_summary"))
                methodology = _coerce_str(pd.get("methodology"))
                medium = _coerce_str(pd.get("medium"))
            elif isinstance(pd, str):
                summary = pd
            sensory = _coerce_str((fp.get("sensory_register") or {}))
            parts = [name, medium, summary, methodology, sensory]
        else:
            # Wikidata-imported practitioner stubs — thin but better than nothing.
            occupations = _coerce_str(md.get("occupations"))
            nationalities = _coerce_str(md.get("nationalities"))
            desc = _coerce_str(md.get("description") or md.get("practice_summary") or md.get("commons_summary"))
            methodology = _coerce_str(md.get("methodology"))
            medium = _coerce_str(md.get("medium"))
            parts = [name, occupations, nationalities, medium, desc, methodology]

    elif typ == "concept":
        desc = _coerce_str(md.get("description") or md.get("summary"))
        kind = _coerce_str(md.get("concept_kind"))
        # Concepts are mostly auto-generated stubs with just a name. Prefix
        # makes the embedding space more cohesive.
        parts = [f"Concept: {name}", kind, desc]

    elif typ == "scene":
        desc = _coerce_str(md.get("description") or md.get("grounding_note"))
        parts = [f"Scene: {name}", desc]

    else:
        return None

    cleaned = " ".join(p.strip() for p in parts if p and p.strip())
    if not cleaned:
        return None
    return TASK_PREFIX + cleaned


# ----- candidate selection ----------------------------------------------


def _is_embeddable(node: dict, types: set[str]) -> bool:
    if node["type"] not in types:
        return False
    text = build_text(node)
    if text:
        return True
    # Last chance: artwork with image but no text → still embed the image.
    if node["type"] in TYPES_WITH_IMAGE:
        md = _parse_metadata(node.get("metadata"))
        if pick_image_url(md):
            return True
    return False


# ----- L2 normalise ----------------------------------------------------


def _l2_normalise(vec: list[float]) -> list[float]:
    s = sum(x * x for x in vec)
    if s <= 0:
        return vec
    n = s ** 0.5
    return [x / n for x in vec]


# ----- existing-embeddings cache ----------------------------------------


def load_existing() -> dict[tuple[str, str], dict]:
    """
    Returns {(node_id, kind) → meta_entry}. Used for idempotency: if a
    node's (text_hash, image_hash) match the existing entry, we skip the
    API call and reuse the bytes from the existing .bin.
    """
    if not EMB_META_PATH.exists() or not EMB_BIN_PATH.exists():
        return {}
    meta = json.loads(EMB_META_PATH.read_text())
    out: dict[tuple[str, str], dict] = {}
    for entry in meta:
        out[(entry["node_id"], entry["kind"])] = entry
    return out


def read_vector(path: Path, offset: int, dims: int) -> bytes:
    """Read dims*4 bytes from the .bin starting at offset."""
    with path.open("rb") as f:
        f.seek(offset)
        return f.read(dims * 4)


# ----- Gemini client ----------------------------------------------------


def _make_client(env: dict):
    try:
        from google import genai  # noqa: F401
        from google.genai import types  # noqa: F401
    except ImportError as e:
        raise ImportError(
            "google-genai not installed — from project root:\n"
            "  seed/_build/.venv/bin/pip install google-genai\n"
        ) from e
    from google import genai
    api_key = env.get("GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise SystemExit("GEMINI_API_KEY missing — set it in .env (gitignored)")
    return genai.Client(api_key=api_key)


def _embed_once(client, model: str, text: str, image_bytes: Optional[bytes],
                image_mime: Optional[str]) -> list[float]:
    """
    Single embedding call. Interleaves [text, image] into one `contents`
    list per design doc § 4. Returns a list of `DIMS` floats (un-normalised
    — caller normalises).
    """
    from google.genai import types
    parts: list = [text]
    if image_bytes is not None and image_mime is not None:
        parts.append(types.Part.from_bytes(data=image_bytes, mime_type=image_mime))

    cfg = types.EmbedContentConfig(output_dimensionality=DIMS)
    res = client.models.embed_content(model=model, contents=parts, config=cfg)

    # SDK shape: res.embeddings is a list (one entry per content item — but
    # multimodal interleaved input collapses to ONE fused embedding).
    if not res.embeddings:
        raise RuntimeError("empty embeddings response")
    values = res.embeddings[0].values
    if values is None or len(values) != DIMS:
        raise RuntimeError(f"embedding wrong shape: got {len(values) if values else 'None'}")
    return list(values)


def embed_with_retry(client, model: str, text: str, image_bytes: Optional[bytes],
                     image_mime: Optional[str], max_attempts: int = 4) -> list[float]:
    delay = 2.0
    last_err: Optional[Exception] = None
    for attempt in range(max_attempts):
        try:
            return _embed_once(client, model, text, image_bytes, image_mime)
        except Exception as e:  # noqa: BLE001
            last_err = e
            # Rate-limit / transient: backoff and retry.
            msg = str(e).lower()
            transient = any(s in msg for s in ("429", "rate", "deadline", "unavailable", "timeout", "500", "503"))
            if not transient or attempt == max_attempts - 1:
                raise
            time.sleep(delay)
            delay *= 2
    raise last_err  # type: ignore[misc]


# ----- main -------------------------------------------------------------


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true",
                    help="hash + select candidates, no API calls, no writes")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=4,
                    help="parallel API workers; keep low — embed endpoint is rate-limited")
    ap.add_argument("--types", type=str, default="",
                    help="comma-separated subset of " + ",".join(sorted(EMBEDDABLE_TYPES)))
    ap.add_argument("--force", action="store_true",
                    help="re-embed even when hashes match existing cache")
    args = ap.parse_args()

    env = {**dotenv_values(ENV_PATH), **os.environ} if ENV_PATH.exists() else dict(os.environ)
    model = env.get("EMBED_MODEL", DEFAULT_MODEL)

    types_filter = set([t.strip() for t in args.types.split(",") if t.strip()]) if args.types else EMBEDDABLE_TYPES
    bad = types_filter - EMBEDDABLE_TYPES
    if bad:
        sys.exit(f"unknown --types: {bad}; allowed: {EMBEDDABLE_TYPES}")

    nodes = json.loads(NODES_PATH.read_text())
    candidates = [n for n in nodes if _is_embeddable(n, types_filter)]
    if args.limit:
        candidates = candidates[: args.limit]
    print(f"nodes total={len(nodes)}, candidates={len(candidates)}, model={model}, types={sorted(types_filter)}")

    existing = load_existing()
    img_cache = open_cache()
    overlay_images = load_overlay_images()
    if overlay_images:
        print(f"image overlay: {len(overlay_images)} entries (gap-fill image source)")
    mirror_images = load_mirror_images()
    if mirror_images:
        print(f"image mirror: {len(mirror_images)} entries (R2 cdn source, preferred over upstream)")

    # Plan each row up-front: compute text+image+hashes. This lets us skip
    # hashed-match rows without spinning up the Gemini client.
    @dataclass_lite
    class Plan:
        node_id: str
        kind: str
        text: str
        text_hash: str
        image_bytes: Optional[bytes]
        image_mime: Optional[str]
        image_hash: Optional[str]
        # If the existing entry matches, we'll copy these bytes through.
        reuse_bytes: Optional[bytes] = None

    plans: list[Plan] = []
    n_reused = n_textonly = n_with_image = 0

    for node in candidates:
        nid = node["id"]
        kind = "identity"
        text = build_text(node) or ""
        text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest() if text else ""

        image_bytes = image_mime = image_hash = None
        if node["type"] in TYPES_WITH_IMAGE:
            md = _parse_metadata(node.get("metadata"))
            if not md.get("image_url") and not md.get("cdn_image_url"):
                ov = overlay_images.get(nid)
                if ov:  # gap-fill from the build-time overlay (artwork images only)
                    md = {**md, **{k: ov[k] for k in ("image_url", "cdn_image_url") if ov.get(k)}}
            # Prefer the stable R2 cdn (mirror sidecar) over rotting upstream for
            # nodes that already have image_url. pick_image_url() then returns the
            # cdn, so fetch_and_prepare hits R2 instead of fxhash/artblocks/MoMA.
            if not md.get("cdn_image_url"):
                cdn = mirror_images.get(nid)
                if cdn:
                    md = {**md, "cdn_image_url": cdn}
            url = pick_image_url(md)
            if url:
                got = fetch_and_prepare(url, img_cache)
                if got is not None:
                    image_bytes = got["bytes"]
                    image_mime = got["mime"]
                    image_hash = got["sha256"]

        # Skip rows with no text AND no image (shouldn't happen post-filter
        # but be defensive).
        if not text and image_bytes is None:
            continue

        # Idempotency check.
        prev = existing.get((nid, kind))
        reuse = None
        if prev and not args.force:
            if (prev.get("text_hash") == text_hash and
                    (prev.get("image_hash") or None) == image_hash):
                # Hashes match — reuse the existing vector bytes.
                reuse = read_vector(EMB_BIN_PATH, prev["offset"], prev["dims"])
                if len(reuse) != DIMS * 4:
                    reuse = None  # corrupt — re-embed

        plans.append(Plan(nid, kind, text, text_hash,
                          image_bytes, image_mime, image_hash, reuse))
        if reuse is not None:
            n_reused += 1
        elif image_bytes is not None:
            n_with_image += 1
        else:
            n_textonly += 1

    print(f"plan: reuse_existing={n_reused}, fresh_textonly={n_textonly}, fresh_with_image={n_with_image}")

    if args.dry_run:
        # Rough cost estimate: image ≈ 258 tokens, text ≈ 50 tokens average.
        text_tokens = (n_textonly + n_with_image) * 50
        img_tokens = n_with_image * 258
        total = text_tokens + img_tokens
        print(f"estimated tokens: {total:,} (${total*0.20/1_000_000:.4f} interactive / "
              f"${total*0.10/1_000_000:.4f} batch)")
        print("dry-run: no API calls, no writes")
        return 0

    fresh = [p for p in plans if p.reuse_bytes is None]
    print(f"will call API for {len(fresh)} rows; reusing {n_reused} from cache")

    if fresh:
        client = _make_client(env)
    else:
        client = None

    # Embed.
    out_lock = threading.Lock()
    vectors: dict[str, bytes] = {}  # node_id → 4*DIMS bytes
    errors: list[tuple[str, str]] = []
    t0 = time.time()

    def _do_one(p: Plan):
        if p.reuse_bytes is not None:
            with out_lock:
                vectors[p.node_id] = p.reuse_bytes
            return
        try:
            raw_vec = embed_with_retry(client, model, p.text, p.image_bytes, p.image_mime)
            normed = _l2_normalise(raw_vec)
            blob = struct.pack(f"<{DIMS}f", *normed)
            with out_lock:
                vectors[p.node_id] = blob
        except Exception as e:  # noqa: BLE001
            with out_lock:
                errors.append((p.node_id, f"{type(e).__name__}: {str(e)[:200]}"))

    if fresh and client is not None:
        with cf.ThreadPoolExecutor(max_workers=args.workers) as ex:
            futs = {ex.submit(_do_one, p): p for p in fresh}
            done = 0
            for fut in cf.as_completed(futs):
                done += 1
                if done % 25 == 0 or done == len(fresh):
                    print(f"  [{done}/{len(fresh)}] errs={len(errors)} t={time.time()-t0:.1f}s")
                fut.result()  # surface any unhandled

    # Reuse-only plans still need to be inserted into `vectors`.
    for p in plans:
        if p.reuse_bytes is not None and p.node_id not in vectors:
            vectors[p.node_id] = p.reuse_bytes

    print(f"done in {time.time()-t0:.1f}s. embedded={len(vectors)} errors={len(errors)}")
    if errors:
        for nid, err in errors[:20]:
            print(f"  [err] {nid}: {err}")
        if len(errors) > 20:
            print(f"  ... +{len(errors)-20} more")

    if not vectors:
        print("no vectors produced; .bin/.json untouched")
        return 1 if errors else 0

    # Write sidecar atomically.
    meta_out: list[dict] = []
    bin_buf = bytearray()
    for p in plans:
        blob = vectors.get(p.node_id)
        if blob is None:
            continue
        offset = len(bin_buf)
        bin_buf.extend(blob)
        meta_out.append({
            "node_id": p.node_id,
            "kind": p.kind,
            "model": model,
            "dims": DIMS,
            "has_image": 1 if p.image_bytes is not None else 0,
            "image_hash": p.image_hash,
            "text_hash": p.text_hash,
            "offset": offset,
        })

    EMB_BIN_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp_bin = EMB_BIN_PATH.with_suffix(".bin.tmp")
    tmp_meta = EMB_META_PATH.with_suffix(".json.tmp")
    tmp_bin.write_bytes(bytes(bin_buf))
    tmp_meta.write_text(json.dumps(meta_out, indent=2) + "\n")
    tmp_bin.replace(EMB_BIN_PATH)
    tmp_meta.replace(EMB_META_PATH)
    print(f"wrote {len(meta_out)} embeddings → {EMB_BIN_PATH.name} + {EMB_META_PATH.name}")

    return 1 if errors else 0


# Minimal "dataclass" — avoids pulling in dataclasses just for one local struct.
def dataclass_lite(cls):
    fields = [k for k, v in cls.__annotations__.items()]
    def __init__(self, *args, **kw):
        # Positional first, then keyword.
        for k, v in zip(fields, args):
            setattr(self, k, v)
        for k in fields[len(args):]:
            setattr(self, k, kw.get(k, getattr(cls, k, None)))
    cls.__init__ = __init__
    return cls


if __name__ == "__main__":
    sys.exit(main())
