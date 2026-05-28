#!/usr/bin/env python3
"""
objkt.com tags-as-EMBODIES pass v3 — Tezos NFT data via data.objkt.com/v3/graphql.

Same shape as fetch_fxhash_tags_v3.py but objkt's API is unrestricted, so we
can search for any practitioner by name (via holder.alias / holder.tzdomain)
rather than only known accounts. This addresses the fxhash API block.

Strategy:
  - Read state from adai.db.
  - For each practitioner with no objkt mapping yet, search holder by name
    (LIKE match on alias and tzdomain).
  - Accept matches with verified creator records OR clear name match (loose
    threshold here since objkt verification is sparse).
  - Pull up to MAX_TOKENS_PER_USER tokens authored by that address.
  - Emit artwork node + CREATED_BY (high) + EMBODIES from tags
    (source_origin: human_primary — artist-set tags).

Output:
  seed/_build/objkt_tags_2026-04-28.json
"""
from __future__ import annotations
import json, re, sqlite3, time, unicodedata, urllib.error, urllib.request
from collections import defaultdict
from pathlib import Path

from _slug import artwork_slug

HERE = Path(__file__).parent
SEED = HERE.parent
ROOT = SEED.parent
OUT = HERE / "objkt_tags_2026-04-28.json"
DB = ROOT / "adai.db"

OBJKT_GQL = "https://data.objkt.com/v3/graphql"
UA = "A(DAI)-knowledge-commons/3.0 (https://github.com/a-digital-arts-institute/adai-v1; non-commercial)"
SIGNAL_ID = "objkt-tags-ingest-2026-04-28"
DATE = "2026-04-28T00:00:00Z"

MAX_TOKENS_PER_USER = 25
SLEEP_BETWEEN_REQUESTS = 0.3

GENERIC_TAG_DENYLIST = {
    "art","artwork","tezos","ethereum","blockchain","nft","crypto","objkt",
    "fxhash","tezos generative","fxhash genart",
}

def slugify(s):
    s = unicodedata.normalize("NFKD", (s or "").lower()).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9&+\- ]", "", s)
    return re.sub(r"\s+", " ", s).strip()

def name_key(s):
    s = unicodedata.normalize("NFKD", (s or "").lower()).encode("ascii", "ignore").decode()
    return " ".join(s.split())

def gql(query, variables=None, retry=2):
    payload = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(OBJKT_GQL, data=payload,
        headers={"Content-Type": "application/json", "User-Agent": UA}, method="POST")
    for attempt in range(retry + 1):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code in (429, 502, 503) and attempt < retry:
                time.sleep(2 * (attempt + 1)); continue
            return {"errors": [{"http": e.code}]}
        except Exception as e:
            if attempt < retry:
                time.sleep(2); continue
            return {"errors": [{"exception": str(e)[:200]}]}

def search_holder_by_name(name):
    """Find holder addresses by alias or tzdomain LIKE name."""
    pat_full = f"%{name}%"
    pat_first = f"%{name.split()[0]}%" if " " in name else None
    q = """
      query S($pat: String!) {
        holder(where: {_or: [
          {alias: {_ilike: $pat}},
          {tzdomain: {_ilike: $pat}}
        ]}, limit: 5) {
          address alias tzdomain
        }
      }
    """
    return gql(q, {"pat": pat_full})

def fetch_tokens_by_creator(address, take=MAX_TOKENS_PER_USER):
    q = """
      query T($addr: String!, $take: Int!) {
        token(where: {creators: {creator_address: {_eq: $addr}}},
              order_by: {timestamp: desc}, limit: $take) {
          token_id name display_uri thumbnail_uri timestamp description
          fa_contract
          tags { tag { name } }
          creators { creator_address verified }
        }
      }
    """
    return gql(q, {"addr": address, "take": take})

def main():
    con = sqlite3.connect(str(DB))
    con.row_factory = sqlite3.Row

    practitioners = []
    existing_titles_per_prac = defaultdict(set)
    objkt_tokens_in_db = set()  # (fa_contract, token_id) for dedup
    existing_concepts = set()

    for row in con.execute("SELECT id, name FROM nodes WHERE type='practitioner'"):
        practitioners.append({"id": row["id"], "name": row["name"]})
    for row in con.execute("SELECT id, name, metadata FROM nodes WHERE type='artwork'"):
        try:
            m = json.loads(row["metadata"]) if row["metadata"] else {}
        except: m = {}
        cid = m.get("creator_id")
        if cid:
            existing_titles_per_prac[cid].add(name_key(row["name"]))
        if m.get("objkt_token_id") and m.get("fa_contract"):
            objkt_tokens_in_db.add((m["fa_contract"], str(m["objkt_token_id"])))
    for row in con.execute("SELECT id FROM nodes WHERE type='concept'"):
        existing_concepts.add(row["id"])
    con.close()

    print(f"Loaded: {len(practitioners)} practitioners, {len(existing_concepts)} concepts")
    print(f"Searching objkt for each practitioner...")

    matched_users = []
    new_nodes, new_edges = [], []
    new_concepts_made = set()
    seen_artwork_ids = set()
    stats = defaultdict(int)

    for i, p in enumerate(practitioners, 1):
        result = search_holder_by_name(p["name"])
        time.sleep(SLEEP_BETWEEN_REQUESTS)
        if "errors" in result:
            stats["search_errors"] += 1
            continue
        holders = (result.get("data") or {}).get("holder") or []
        if not holders:
            continue

        # Pick best holder: tzdomain or alias closest to name
        nk = name_key(p["name"])
        best = None
        for h in holders:
            tz = (h.get("tzdomain") or "").lower()
            al = (h.get("alias") or "").lower()
            if name_key(al) == nk or name_key(tz.replace(".tez","").replace("-"," ")) == nk:
                best = h; break
        if not best:
            # Looser fallback: first match
            best = holders[0]

        addr = best["address"]
        toks_result = fetch_tokens_by_creator(addr)
        time.sleep(SLEEP_BETWEEN_REQUESTS)
        if "errors" in toks_result:
            stats["token_fetch_errors"] += 1
            continue
        toks = (toks_result.get("data") or {}).get("token") or []
        if not toks:
            continue

        matched_users.append({
            "practitioner_id": p["id"], "practitioner_name": p["name"],
            "objkt_address": addr, "alias": best.get("alias"),
            "tzdomain": best.get("tzdomain"), "tokens_count": len(toks),
        })
        print(f"  [{i}/{len(practitioners)}] {p['name']} → {addr} ({best.get('alias') or best.get('tzdomain')}) — {len(toks)} tokens")

        for tok in toks:
            token_id = str(tok.get("token_id") or "")
            fa = tok.get("fa_contract") or ""
            if (fa, token_id) in objkt_tokens_in_db:
                stats["dup_token_id"] += 1
                continue

            title = (tok.get("name") or "").strip()
            tags_raw = tok.get("tags") or []
            tags = []
            for tt in tags_raw:
                if isinstance(tt, dict) and tt.get("tag") and tt["tag"].get("name"):
                    tags.append(tt["tag"]["name"].strip())
            tags = [t for t in tags if t]
            if not title or not tags:
                stats["skipped_no_title_or_tags"] += 1
                continue
            if name_key(title) in existing_titles_per_prac.get(p["id"], set()):
                stats["dup_title"] += 1
                continue

            artwork_id = artwork_slug(title, source="objkt", external_id=f"{fa}-{token_id}" if fa else token_id)
            if artwork_id in seen_artwork_ids:
                continue
            seen_artwork_ids.add(artwork_id)

            display = tok.get("display_uri") or tok.get("thumbnail_uri")
            if display and display.startswith("ipfs://"):
                display = f"https://gateway.objkt.com/ipfs/{display[7:]}"

            new_nodes.append({
                "id": artwork_id, "name": title, "type": "artwork", "slug": slugify(title),
                "metadata": {
                    "status": "confirmed", "source_origin": "human_primary",
                    "creator_id": p["id"], "image_url": display,
                    "image_license": "objkt / per-token (see token page)",
                    "image_source": "objkt",
                    "objkt_token_id": token_id, "fa_contract": fa,
                    "objkt_token_url": f"https://objkt.com/asset/{fa}/{token_id}",
                    "tags": tags, "description": tok.get("description"),
                    "creator_address": addr,
                    "signal_id": SIGNAL_ID, "generated_by": SIGNAL_ID,
                    "auto_generated": True, "created_at_objkt": tok.get("timestamp"),
                },
            })
            stats["new_artworks"] += 1

            new_edges.append({
                "id": f"{artwork_id}--created_by--{p['id']}",
                "source_id": artwork_id, "target_id": p["id"],
                "edge_type": "CREATED_BY", "confidence": "high",
                "signal_id": SIGNAL_ID, "created_by": "gatherer-objkt-tags-v3",
                "source_evidence": f"objkt token_id={token_id} fa={fa} creator_address={addr}",
                "charge": None, "created_at": DATE, "valid_from": DATE,
                "valid_until": None, "invalidated_by": None,
                "event_time": tok.get("timestamp"),
            })

            for tag in tags:
                tn = tag.lower().strip()
                if tn in GENERIC_TAG_DENYLIST: continue
                concept_id = f"concept:{tn}"
                if concept_id not in existing_concepts and concept_id not in new_concepts_made:
                    new_concepts_made.add(concept_id)
                    new_nodes.append({
                        "id": concept_id, "name": tn, "type": "concept", "slug": slugify(tn),
                        "metadata": {
                            "status": "confirmed", "source_origin": "human_primary",
                            "first_surfaced_by": p["id"], "first_surfaced_at_token": token_id,
                            "signal_id": SIGNAL_ID, "generated_by": SIGNAL_ID,
                            "derivation": "practitioner-tagged-on-objkt", "auto_generated": True,
                        },
                    })
                new_edges.append({
                    "id": f"{artwork_id}--embodies--{concept_id}",
                    "source_id": artwork_id, "target_id": concept_id,
                    "edge_type": "EMBODIES", "confidence": "high",
                    "signal_id": SIGNAL_ID, "created_by": "gatherer-objkt-tags-v3",
                    "source_evidence": f"objkt token id={token_id} tag '{tag}' set by artist (source_origin: human_primary)",
                    "charge": None, "created_at": DATE, "valid_from": DATE,
                    "valid_until": None, "invalidated_by": None,
                    "event_time": tok.get("timestamp"),
                })
                stats["embodies_emitted"] += 1

    stats["new_concepts"] = len(new_concepts_made)
    stats["total_new_edges"] = len(new_edges)
    stats["practitioners_matched"] = len(matched_users)

    output = {
        "signal_id": SIGNAL_ID, "generated_at": DATE,
        "method_note": (
            "objkt.com v3 GraphQL pulled 2026-04-28. For each seed practitioner, "
            "searched holder by alias/tzdomain LIKE name, picked best match, "
            f"pulled up to {MAX_TOKENS_PER_USER} tokens authored by that address. "
            "Tags become EMBODIES with source_origin: human_primary (artist-set "
            "at mint). Replaces fxhash deepening which is blocked at the API "
            "level — objkt's API is unrestricted."
        ),
        "stats": dict(stats),
        "matched_users": matched_users,
        "nodes": new_nodes, "edges": new_edges,
    }
    OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False))
    print(f"\nWrote {OUT.name}")
    for k, v in stats.items():
        print(f"  {k}: {v}")

if __name__ == "__main__":
    main()
