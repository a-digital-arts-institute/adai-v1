#!/usr/bin/env python3
"""Find images for A(DAI) nodes that have none — as reviewable *candidates*.

~650 nodes in the seed render as blank dots (every institution, platform and
scene; ~half the artworks; ~60% of practitioners). That, not bad edges, is why
the graph looks unfinished. This tool proposes images for them.

Design rules (so this stays additive and rights-aware):
  * It writes CANDIDATES to a staging file, not the canon. nodes.json is NEVER
    mutated — `--apply` stages approved images into seed/image_overlay.json (a
    build-time DB patch that seed-consolidated.ts applies after the node INSERT
    loop), and only for candidates a human approved (or whose confidence clears
    an explicit threshold). The R2 mirror (upload_to_r2.py --overlay) + embedding
    refresh are separate, documented steps. We are a producer; we propose,
    curators dispose.
  * Every candidate carries provenance (Wikidata QID + property + label) so the
    `image_url` is anchored, exactly like the existing Commons-sourced rows.
  * Artworks are NOT name-searched (generic titles collide — see the
    artwork:untitled id-collision). Artwork images only come from an explicit
    QID alias or the experimental agentic tier, always needs_review.

Tier 1 — Wikidata (deterministic, free, provenance-clean): QID from
  seed/aliases.json or a verified name search; P18 (image) / P154 (logo).
Tier 2 — agentic web search (--agentic, EXPERIMENTAL, needs ANTHROPIC_API_KEY):
  for the long tail Wikidata can't cover. Proposal-only, low confidence.

Usage:
  python3 seed/_build/find_missing_images.py                         # tier-1, all imageless
  python3 seed/_build/find_missing_images.py --types institution platform
  python3 seed/_build/find_missing_images.py --limit 30
  python3 seed/_build/find_missing_images.py --apply --accept-confidence high
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import time
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
NODES_PATH = ROOT / "seed" / "nodes.json"
ALIASES_PATH = ROOT / "seed" / "aliases.json"
CANDIDATES_PATH = ROOT / "seed" / "_build" / "image_candidates.json"
# Approved candidates are staged into a build-time OVERLAY, never written back
# into nodes.json (which is pristine build output). seed-consolidated.ts applies
# the overlay as metadata UPDATEs after the node INSERT loop; upload_to_r2.py
# --overlay fills in cdn_image_url; embed_nodes.py reads it so artwork images
# still reach the multimodal vectors.
OVERLAY_PATH = ROOT / "seed" / "image_overlay.json"

UA = "adai-image-tools/0.1 (https://adai-basel.fly.dev; missing-image finder)"
WD_API = "https://www.wikidata.org/w/api.php"
COMMONS_FILEPATH = "https://commons.wikimedia.org/wiki/Special:FilePath/"
SLEEP = 0.15  # polite rate limit between Wikidata calls

# Image property priority per node type.
IMAGE_PROPS = {
    "practitioner": ["P18"],
    "collective": ["P154", "P18"],
    "institution": ["P154", "P18"],
    "platform": ["P154", "P18"],
    "scene": ["P18"],
    "artwork": ["P18"],
}

# P31 (instance-of) allowlists to sanity-check a name search before trusting it.
# 'human' for people; organisation-ish for venues; loose/empty = take top hit
# but mark low confidence.
TYPE_P31 = {
    "practitioner": {"Q5"},
    "institution": {"Q33506", "Q207694", "Q1007870", "Q43229", "Q1530022",
                    "Q157031", "Q3918", "Q2087181", "Q31855"},
    "collective": {"Q6005118", "Q43229", "Q215380", "Q7278"},
}

DEFAULT_PRIORITY = ["institution", "platform", "scene", "collective", "practitioner"]


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


def _api(params: dict) -> dict:
    url = WD_API + "?" + urllib.parse.urlencode({**params, "format": "json"})
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    time.sleep(SLEEP)
    return json.load(urllib.request.urlopen(req, timeout=20))


def wb_search(name: str, limit: int = 5) -> list[dict]:
    try:
        d = _api({"action": "wbsearchentities", "search": name, "language": "en",
                  "type": "item", "limit": limit})
        return d.get("search", [])
    except Exception:
        return []


def wb_entity(qid: str) -> dict | None:
    try:
        d = _api({"action": "wbgetentities", "ids": qid, "props": "claims|labels"})
        return d.get("entities", {}).get(qid)
    except Exception:
        return None


def _claim_str(entity: dict, prop: str) -> str | None:
    for c in entity.get("claims", {}).get(prop, []):
        try:
            return c["mainsnak"]["datavalue"]["value"]
        except (KeyError, TypeError):
            continue
    return None


def _instance_of(entity: dict) -> list[str]:
    out = []
    for c in entity.get("claims", {}).get("P31", []):
        try:
            out.append(c["mainsnak"]["datavalue"]["value"]["id"])
        except (KeyError, TypeError):
            continue
    return out


def commons_url(filename: str) -> str:
    return COMMONS_FILEPATH + urllib.parse.quote(filename.replace(" ", "_"))


def resolves_to_image(url: str) -> bool:
    """HEAD/GET-sniff so we never stage a candidate URL that 404s or isn't an image."""
    try:
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": UA})
        r = urllib.request.urlopen(req, timeout=15)
        if r.status == 200 and r.headers.get("content-type", "").lower().startswith("image/"):
            return True
    except Exception:
        pass
    try:
        req = urllib.request.Request(
            url, headers={"User-Agent": UA, "Range": "bytes=0-2047", "Accept": "image/*,*/*"})
        r = urllib.request.urlopen(req, timeout=15)
        head = r.read(2048)
        ct = r.headers.get("content-type", "").lower()
        return r.status in (200, 206) and (
            ct.startswith("image/") or head.startswith((b"\xff\xd8\xff", b"\x89PNG", b"GIF8"))
            or head[:5] == b"<?xml" or head[:4] == b"<svg")
    except Exception:
        return False


def resolve_qid(node: dict, alias_qid: str | None) -> tuple[str | None, str, list[str], dict | None]:
    """Return (qid, match_kind, instance_of, entity). Aliases are authoritative.

    Returns the fetched entity so callers don't have to re-fetch it.
    """
    if alias_qid:
        ent = wb_entity(alias_qid)
        return alias_qid, "alias", _instance_of(ent) if ent else [], ent
    if node["type"] == "artwork":
        return None, "skipped_artwork", [], None  # never name-search artworks
    allow = TYPE_P31.get(node["type"])
    for hit in wb_search(node.get("name", "")):
        qid = hit["id"]
        ent = wb_entity(qid)
        if not ent:
            continue
        p31 = _instance_of(ent)
        if allow is None or any(x in allow for x in p31):
            return qid, "search_verified", p31, ent
        # take first hit even if unverified, but caller will mark low confidence
        return qid, "search_unverified", p31, ent
    return None, "no_hit", [], None


def find_wikidata(node: dict, alias_qid: str | None) -> dict | None:
    qid, match, p31, ent = resolve_qid(node, alias_qid)
    if not qid or not ent:
        return None
    for prop in IMAGE_PROPS.get(node["type"], ["P18"]):
        fname = _claim_str(ent, prop)
        if fname:
            if match == "alias":
                conf = "high"
            elif match == "search_verified":
                conf = "medium"
            else:
                conf = "low"
            return {
                "node_id": node["id"], "type": node["type"], "name": node.get("name"),
                "image_url": commons_url(fname),
                "confidence": conf, "approved": False,
                "provenance": {"source": "wikidata", "qid": qid, "property": prop,
                               "commons_file": fname, "match": match, "instance_of": p31},
            }
    return None


# ── Tier 2: agentic web search (EXPERIMENTAL — needs ANTHROPIC_API_KEY) ──
def find_agentic(node: dict) -> dict | None:
    """Ask an LLM with web search to locate an authoritative image URL.

    Proposal-only, always low confidence + needs_review. Not exercised in CI;
    requires ANTHROPIC_API_KEY and the `anthropic` package. Prefers the
    practitioner's own site / institution collection page / Wikimedia.
    """
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return None
    try:
        import anthropic
    except ImportError:
        return None
    client = anthropic.Anthropic()
    prompt = (
        f"Find ONE authoritative, hotlinkable image URL for the {node['type']} "
        f"\"{node.get('name')}\" (digital/new-media art context). Prefer the "
        f"subject's official site, the holding institution, or Wikimedia Commons. "
        f"Respond with ONLY JSON: {{\"image_url\":\"…\",\"source_page\":\"…\"}} "
        f"or {{\"image_url\":null}} if you can't verify one."
    )
    try:
        msg = client.messages.create(
            model="claude-haiku-4-5", max_tokens=400,
            tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 4}],
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
        start, end = text.find("{"), text.rfind("}")
        data = json.loads(text[start:end + 1]) if start >= 0 else {}
    except Exception:
        return None
    if not data.get("image_url"):
        return None
    return {
        "node_id": node["id"], "type": node["type"], "name": node.get("name"),
        "image_url": data["image_url"], "confidence": "low", "approved": False,
        "provenance": {"source": "agentic-websearch", "source_page": data.get("source_page")},
    }


def cmd_find(args) -> int:
    nodes = json.loads(NODES_PATH.read_text())
    aliases = {a["node_id"]: a["external_id"]
               for a in json.loads(ALIASES_PATH.read_text())
               if str(a.get("source", "")).lower() == "wikidata"}

    imageless = [n for n in nodes
                 if not md(n).get("image_url") and not md(n).get("cdn_image_url")]
    types = args.types or DEFAULT_PRIORITY + (["artwork"] if args.include_artworks else [])
    order = {t: i for i, t in enumerate(types)}
    work = [n for n in imageless if n["type"] in order]
    work.sort(key=lambda n: order[n["type"]])
    if args.limit:
        work = work[: args.limit]

    print(f"{len(imageless)} imageless nodes; searching {len(work)} "
          f"(types={types}, agentic={'on' if args.agentic else 'off'})…")

    candidates, misses = [], []
    for i, n in enumerate(work, 1):
        cand = find_wikidata(n, aliases.get(n["id"]))
        if not cand and args.agentic:
            cand = find_agentic(n)
        # Never stage a URL that 404s or isn't an image (e.g. renamed Commons files).
        if cand and not resolves_to_image(cand["image_url"]):
            cand = None
        (candidates if cand else misses).append(cand or {"node_id": n["id"], "type": n["type"]})
        if i % 25 == 0:
            print(f"  …{i}/{len(work)}  found={len(candidates)}")

    by_conf = {c: sum(1 for x in candidates if x["confidence"] == c)
               for c in ("high", "medium", "low")}
    CANDIDATES_PATH.write_text(json.dumps(
        {"generated": len(candidates), "by_confidence": by_conf,
         "candidates": candidates}, indent=2, ensure_ascii=False))

    print(f"\n=== found {len(candidates)} candidates "
          f"(high={by_conf['high']} medium={by_conf['medium']} low={by_conf['low']}); "
          f"{len(misses)} still missing ===")
    print(f"staged → {CANDIDATES_PATH.relative_to(ROOT)}")
    print("review it, set \"approved\": true on the keepers, then:")
    print("  python3 seed/_build/find_missing_images.py --apply")
    return 0


def cmd_apply(args) -> int:
    """Merge approved candidates into seed/image_overlay.json — NOT nodes.json.

    nodes.json is build output we keep pristine. Images for previously-imageless
    nodes live in the overlay; seed-consolidated.ts applies them as metadata
    UPDATEs after the node INSERT loop (image-only, gap-fill). This producer only
    stages image_url + provenance — cdn_image_url is filled later by
    `upload_to_r2.py --overlay`. Idempotent: merges by node_id, never overwrites a
    node that already carries an image (in canon or the overlay).
    """
    staged = json.loads(CANDIDATES_PATH.read_text())["candidates"]
    accept = {"high", "medium", "low"}
    if args.accept_confidence:
        order = ["high", "medium", "low"]
        accept = set(order[: order.index(args.accept_confidence) + 1])

    # nodes.json is read-only here: only consulted to skip nodes that already
    # carry an image (never propose over an existing one).
    nodes = json.loads(NODES_PATH.read_text())
    by_id = {n["id"]: n for n in nodes}

    # Merge into any existing overlay, keyed by node_id (idempotent re-runs).
    overlay = json.loads(OVERLAY_PATH.read_text()) if OVERLAY_PATH.exists() else []
    overlay_by_id = {e["node_id"]: e for e in overlay}

    added = 0
    for c in staged:
        if not (c.get("approved") or c.get("confidence") in accept):
            continue
        node = by_id.get(c["node_id"])
        if not node:
            continue
        m = md(node)
        if m.get("image_url") or m.get("cdn_image_url"):
            continue  # node already has an image in canon — leave it
        prev = overlay_by_id.get(c["node_id"])
        if prev and (prev.get("image_url") or prev.get("cdn_image_url")):
            continue  # already staged in the overlay
        overlay_by_id[c["node_id"]] = {
            "node_id": c["node_id"],
            "type": c.get("type"),
            "name": c.get("name"),
            "image_url": c["image_url"],
            "image_provenance": c.get("provenance"),
        }
        added += 1

    if not args.write:
        print(f"[dry-run] would stage {added} new image(s) into "
              f"{OVERLAY_PATH.relative_to(ROOT)} (overlay total would be "
              f"{len(overlay_by_id)}). Re-run with --write.")
        return 0
    merged = sorted(overlay_by_id.values(), key=lambda e: e["node_id"])
    OVERLAY_PATH.write_text(json.dumps(merged, indent=2, ensure_ascii=False) + "\n")
    print(f"staged {added} new image(s) → {OVERLAY_PATH.relative_to(ROOT)} ({len(merged)} total)")
    print("next: seed/_build/.venv/bin/python3 seed/_build/upload_to_r2.py --overlay   (mirror + write cdn_image_url)")
    print("then: npm run seed:consolidated   (overlay applies after the node INSERT loop)")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--apply", action="store_true", help="write approved candidates into nodes.json")
    ap.add_argument("--write", action="store_true", help="with --apply: actually write (else dry-run)")
    ap.add_argument("--accept-confidence", choices=["high", "medium", "low"],
                    help="with --apply: auto-accept candidates at or above this confidence")
    ap.add_argument("--types", nargs="*", help="restrict to these node types")
    ap.add_argument("--include-artworks", action="store_true", help="also try artworks (QID-alias only)")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--agentic", action="store_true", help="tier-2 LLM web search for the long tail")
    args = ap.parse_args()
    return cmd_apply(args) if args.apply else cmd_find(args)


if __name__ == "__main__":
    raise SystemExit(main())
