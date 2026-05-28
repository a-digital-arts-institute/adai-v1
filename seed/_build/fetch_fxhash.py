#!/usr/bin/env python3
"""
Fetch fxhash generative-token data for practitioners in seed/nodes.json.

Two outputs:
  1. seed/_build/image_patches/fxhash.json    — image_url patches for existing artworks
  2. seed/_build/image_patches/fxhash_new_artworks.json — NEW artwork nodes + CREATED_BY edges
     for fxhash tokens by known creators not already in the graph

Strategy
--------
For each practitioner in seed/nodes.json, search fxhash GraphQL for users matching
the name. For each matched user, fetch their authored generative tokens. For each
token, try to match against existing artwork nodes by fuzzy title; if matched, emit
an image patch. If unmatched (creator is in graph but work is not), emit a
candidate new-artwork entry.

fxhash GraphQL endpoint: https://api.fxhash.xyz/graphql  (v2 era; see
https://www.fxhash.xyz/doc/fxhash/integration-guide for schema).

Thumbnail URL pattern: the API returns a `displayUri` field like `ipfs://<CID>`.
We convert to https://gateway.fxhash2.xyz/ipfs/<CID> for direct HTTP loading.

Dry-run by default.
"""
from __future__ import annotations
import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request

from _slug import artwork_slug
from pathlib import Path

HERE = Path(__file__).parent
SEED = HERE.parent
PATCHES_DIR = HERE / "image_patches"
PATCHES_DIR.mkdir(exist_ok=True)

OUT_PATCHES = PATCHES_DIR / "fxhash.json"
OUT_NEW = PATCHES_DIR / "fxhash_new_artworks.json"

FXHASH_GQL = "https://api.fxhash.xyz/graphql"
UA = "A(DAI)-seed-consolidation/1.0 (https://github.com/a-digital-arts-institute/adai-v1)"
SIGNAL_ID = "fxhash-api-ingest-2026-04-22"


def _gql(query: str, variables: dict | None = None) -> dict:
    payload = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(
        FXHASH_GQL,
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": UA},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"errors": [{"http": e.code, "body": e.read().decode(errors="replace")[:400]}]}
    except Exception as e:
        return {"errors": [{"exception": str(e)}]}


def _normalize(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def _uri_to_https(uri: str) -> str | None:
    if not uri:
        return None
    if uri.startswith("https://") or uri.startswith("http://"):
        return uri
    if uri.startswith("ipfs://"):
        cid = uri[len("ipfs://") :]
        return f"https://gateway.fxhash2.xyz/ipfs/{cid}"
    return None


def search_users(name: str) -> list[dict]:
    """Search fxhash users by name. Returns list of {id, name, description, flag}."""
    query = """
      query SearchUsers($name: String!) {
        users(filters: { searchQuery_eq: $name }, take: 10) {
          id
          name
          flag
          description
        }
      }
    """
    r = _gql(query, {"name": name})
    if "errors" in r:
        return []
    return (r.get("data") or {}).get("users") or []


def user_tokens(user_id: str) -> list[dict]:
    """Get generative tokens authored by a user."""
    query = """
      query UserTokens($id: String!) {
        user(id: $id) {
          id
          name
          generativeTokens(take: 50) {
            id
            name
            supply
            displayUri
            thumbnailUri
            mintOpensAt
            flag
          }
        }
      }
    """
    r = _gql(query, {"id": user_id})
    if "errors" in r:
        return []
    user = (r.get("data") or {}).get("user") or {}
    return user.get("generativeTokens") or []


def main() -> int:
    write_mode = "--write" in sys.argv
    nodes = json.loads((SEED / "nodes.json").read_text())
    edges = json.loads((SEED / "edges.json").read_text())
    by_id = {n["id"]: n for n in nodes}

    def _m(n):
        m = n.get("metadata")
        if isinstance(m, str):
            try: return json.loads(m)
            except: return {}
        return m or {}

    # Existing artwork index per creator
    creator_map: dict[str, list[str]] = {}
    for e in edges:
        if e.get("edge_type") == "CREATED_BY":
            creator_map.setdefault(e["target_id"], []).append(e["source_id"])

    # Practitioners to query on fxhash — those whose scene or medium suggests generative/tezos practice
    candidates = []
    for n in nodes:
        if n.get("type") != "practitioner":
            continue
        md = _m(n)
        scenes = md.get("scene_affiliation") or []
        medium = md.get("medium") or []
        scene_blob = " ".join(s.lower() for s in scenes if isinstance(s, str))
        medium_blob = " ".join(m.lower() for m in medium if isinstance(m, str))
        blob = scene_blob + " " + medium_blob
        if any(
            k in blob
            for k in (
                "on-chain generative",
                "generative art",
                "crypto art",
                "blockchain",
                "fxhash",
                "tezos",
                "creative coding",
                "glitch",
            )
        ):
            candidates.append(n)

    print(f"Candidate practitioners to query fxhash: {len(candidates)}")

    image_patches: list[dict] = []
    new_artworks: list[dict] = []
    new_edges: list[dict] = []
    queried = 0
    matched_users = 0
    total_tokens_seen = 0

    existing_artwork_ids = {n["id"] for n in nodes if n.get("type") == "artwork"}

    for p in candidates:
        pid = p["id"]
        name = p["name"]
        queried += 1
        users = search_users(name)
        time.sleep(0.4)
        # Pick the best match (exact name if any; otherwise first returned)
        chosen = None
        norm_target = _normalize(name)
        for u in users:
            if _normalize(u.get("name") or "") == norm_target:
                chosen = u
                break
        if not chosen and users:
            # permit partial-match only if practitioner name is distinctive
            if len(norm_target) >= 8:
                for u in users:
                    un = _normalize(u.get("name") or "")
                    if norm_target in un or un in norm_target:
                        chosen = u
                        break
        if not chosen:
            continue
        # fxhash flags user accounts MALICIOUS when they're impersonator/scam accounts.
        # Only trust VERIFIED users for ingestion (CC0/licensed-data constraint).
        if chosen.get("flag") != "VERIFIED":
            continue
        matched_users += 1

        tokens = user_tokens(chosen["id"])
        time.sleep(0.4)
        # Filter out tokens flagged MALICIOUS or HIDDEN
        tokens = [tk for tk in tokens if tk.get("flag") in (None, "NONE", "CLEAN")]
        total_tokens_seen += len(tokens)

        # Known artwork titles for this practitioner
        existing_titles = {}
        for aid in creator_map.get(pid, []):
            anode = by_id.get(aid)
            if not anode:
                continue
            existing_titles[_normalize(anode.get("name") or "")] = aid

        for tk in tokens:
            tk_name = tk.get("name") or ""
            tk_norm = _normalize(tk_name)
            thumb = _uri_to_https(tk.get("thumbnailUri") or tk.get("displayUri"))
            if not thumb:
                continue

            # existing artwork match?
            matched_aid = None
            for existing_norm, aid in existing_titles.items():
                if existing_norm == tk_norm or existing_norm in tk_norm or tk_norm in existing_norm:
                    matched_aid = aid
                    break

            if matched_aid:
                image_patches.append({
                    "node_id": matched_aid,
                    "image_url": thumb,
                    "image_license": "fxhash / per-project (see token page)",
                    "image_source": "fxhash",
                    "fxhash_token_id": tk.get("id"),
                    "fxhash_display_name": tk_name,
                    "fxhash_user_id": chosen["id"],
                    "match_method": "exact" if existing_norm == tk_norm else "fuzzy",
                })
            else:
                # net-new artwork for this creator
                art_slug = re.sub(r"[^a-z0-9&+\- ]", "", tk_name.lower()).strip()
                art_slug = re.sub(r"\s+", " ", art_slug)
                if not art_slug:
                    continue
                art_id = artwork_slug(tk_name, source="fxhash", external_id=tk.get("id"))
                if art_id in existing_artwork_ids:
                    continue  # collision — skip
                existing_artwork_ids.add(art_id)
                new_artworks.append({
                    "id": art_id,
                    "name": tk_name,
                    "type": "artwork",
                    "slug": art_slug,
                    "metadata": {
                        "status": "confirmed",
                        "source_origin": "human_secondary",
                        "description": (tk.get("description") or tk_name),
                        "creator_id": pid,
                        "image_url": thumb,
                        "image_license": "fxhash / per-project (see token page)",
                        "image_source": "fxhash",
                        "fxhash_token_id": tk.get("id"),
                        "fxhash_user_id": chosen["id"],
                        "signal_id": SIGNAL_ID,
                        "generated_by": SIGNAL_ID,
                        "auto_generated": True,
                    },
                })
                new_edges.append({
                    "id": f"{art_id}--created_by--{pid}",
                    "source_id": art_id,
                    "target_id": pid,
                    "edge_type": "CREATED_BY",
                    "confidence": "high",
                    "signal_id": SIGNAL_ID,
                    "created_by": "gatherer-enrichment",
                    "source_evidence": "fxhash API: authoredGenerativeTokens (user → token)",
                    "charge": None,
                })

    print(f"Queried:              {queried} practitioners")
    print(f"Matched users:        {matched_users}")
    print(f"Tokens seen:          {total_tokens_seen}")
    print(f"Image patches:        {len(image_patches)}")
    print(f"New artwork entries:  {len(new_artworks)}")
    print(f"New CREATED_BY edges: {len(new_edges)}")

    if write_mode:
        OUT_PATCHES.write_text(json.dumps(image_patches, indent=2, ensure_ascii=False))
        OUT_NEW.write_text(json.dumps(
            {"nodes": new_artworks, "edges": new_edges},
            indent=2, ensure_ascii=False,
        ))
        print(f"\nWrote: {OUT_PATCHES}")
        print(f"Wrote: {OUT_NEW}")
    else:
        print(f"\n(dry-run) Would write {len(image_patches)} image patches + "
               f"{len(new_artworks)} new artworks. Pass --write to persist.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
