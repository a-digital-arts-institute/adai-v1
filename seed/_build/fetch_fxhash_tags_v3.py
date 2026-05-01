#!/usr/bin/env python3
"""
fxhash tags-as-EMBODIES pass v3 — successor to fetch_fxhash.py.

This pass captures `tags` from fxhash generative tokens as EMBODIES edges with
`source_origin: human_primary` (artist self-description at mint).

Constraint discovered 2026-04-28: fxhash has restricted their public GraphQL.
All `users(filters:...)` and `generativeTokens(filters:...)` queries return
HTTP 403 "application blocked". Direct ID lookups (`user(id:...)`,
`generativeToken(id:...)`) still work. The original v2 script's name-search
expansion is therefore unavailable until fxhash unblocks the application.

Scope (degraded from original plan):
  - Read existing fxhash users + tokens from seed/nodes.json (or .bak fallback).
  - For each known fxhash user, pull their generative tokens via direct
    user(id:...) query (allowed).
  - For each token (existing-in-seed or new):
      * if matches existing artwork: emit tag-based EMBODIES edges only
      * if new: emit artwork node + CREATED_BY + EMBODIES from tags

Output:
  seed/_build/fxhash_tags_2026-04-28.json
  seed/_build/fxhash_api_block_finding.json  (one-line stub for editorial trail)
"""
from __future__ import annotations
import json, re, time, unicodedata, urllib.error, urllib.request
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).parent
SEED = HERE.parent
OUT = HERE / "fxhash_tags_2026-04-28.json"
BLOCK_FINDING_OUT = HERE / "fxhash_api_block_finding.json"

FXHASH_GQL = "https://api.fxhash.xyz/graphql"
UA = "A(DAI)-seed-consolidation/3.0 (https://github.com/a-digital-arts-institute/adai-v1)"
SIGNAL_ID = "fxhash-tags-ingest-2026-04-28"
DATE = "2026-04-28T00:00:00Z"

MAX_TOKENS_PER_USER = 25
SLEEP_BETWEEN_REQUESTS = 0.3

GENERIC_TAG_DENYLIST = {
    "art","artwork","fxhash","tezos","ethereum","blockchain","nft","crypto",
    "tezos generative","fxhash genart",
}

def gql(query, variables=None):
    payload = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(FXHASH_GQL, data=payload,
        headers={"Content-Type": "application/json", "User-Agent": UA}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"errors": [{"http": e.code, "body": e.read().decode(errors='replace')[:300]}]}
    except Exception as e:
        return {"errors": [{"exception": str(e)}]}

def name_key(s):
    s = unicodedata.normalize("NFKD", (s or "").lower()).encode("ascii", "ignore").decode()
    return " ".join(s.split())

def slugify(s):
    s = unicodedata.normalize("NFKD", (s or "").lower()).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9&+\- ]", "", s)
    return re.sub(r"\s+", " ", s).strip()

def parse_meta(n):
    m = n.get("metadata")
    if isinstance(m, str):
        try: return json.loads(m)
        except: return {}
    return m or {}

def uri_to_https(uri):
    if not uri: return None
    if uri.startswith(("http://","https://")): return uri
    if uri.startswith("ipfs://"): return f"https://gateway.fxhash2.xyz/ipfs/{uri[7:]}"
    return None

def fetch_user_tokens(user_id, take=MAX_TOKENS_PER_USER):
    """Pull generative tokens for a user by direct ID lookup (allowed by fxhash)."""
    q = """
      query U($id: String!, $take: Int!) {
        user(id: $id) {
          id name flag
          generativeTokens(take: $take) {
            id name tags createdAt
            displayUri thumbnailUri
          }
        }
      }
    """
    r = gql(q, {"id": user_id, "take": take})
    if "errors" in r:
        return None, r["errors"]
    u = (r.get("data") or {}).get("user")
    return u, None

def main():
    nodes_path = SEED / "nodes.json"
    if not nodes_path.exists():
        nodes_path = SEED / "nodes.json.bak"
    nodes = json.loads(nodes_path.read_text())

    existing_concepts = {n["id"] for n in nodes if n["type"] == "concept"}
    # token_id → existing artwork id, plus user_id → practitioner_id
    artwork_by_token = {}
    user_to_prac = {}
    existing_titles_per_prac = defaultdict(set)
    for n in nodes:
        if n["type"] == "artwork":
            m = parse_meta(n)
            tid = m.get("fxhash_token_id")
            if tid is not None:
                artwork_by_token[int(tid)] = n["id"]
            cid = m.get("creator_id")
            if cid:
                existing_titles_per_prac[cid].add(name_key(n["name"]))
            uid = m.get("fxhash_user_id")
            if uid and cid:
                user_to_prac[uid] = cid

    print(f"Known fxhash users in seed: {len(user_to_prac)}")
    for uid, pid in user_to_prac.items():
        print(f"  {uid}  →  {pid}")

    new_nodes, new_edges = [], []
    new_concepts_made = set()
    seen_artwork_ids = set()
    embodies_for_existing = 0
    embodies_for_new = 0
    new_artwork_count = 0
    api_errors = []

    for uid, pid in user_to_prac.items():
        u, err = fetch_user_tokens(uid)
        time.sleep(SLEEP_BETWEEN_REQUESTS)
        if err:
            api_errors.append({"user_id": uid, "errors": err})
            print(f"  ! error for {uid}: {err}")
            continue
        if not u:
            continue
        toks = u.get("generativeTokens") or []
        print(f"  {pid}: {len(toks)} tokens fetched")

        for tok in toks:
            token_id = tok.get("id")
            title = (tok.get("name") or "").strip()
            tags = [t.strip() for t in (tok.get("tags") or []) if t and t.strip()]
            if not title or not tags:
                continue

            existing_id = artwork_by_token.get(int(token_id)) if token_id is not None else None

            if existing_id:
                # EMBODIES-only pass for existing artwork
                artwork_id = existing_id
            else:
                # New artwork
                if name_key(title) in existing_titles_per_prac.get(pid, set()):
                    continue  # duplicate by name with this practitioner
                artwork_id = f"artwork:{slugify(title)}"
                if artwork_id in seen_artwork_ids:
                    continue
                seen_artwork_ids.add(artwork_id)
                new_nodes.append({
                    "id": artwork_id,
                    "name": title,
                    "type": "artwork",
                    "slug": slugify(title),
                    "metadata": {
                        "status": "confirmed",
                        "source_origin": "human_primary",
                        "creator_id": pid,
                        "image_url": uri_to_https(tok.get("displayUri") or tok.get("thumbnailUri")),
                        "image_license": "fxhash / per-project (see token page)",
                        "image_source": "fxhash",
                        "fxhash_token_id": token_id,
                        "fxhash_user_id": uid,
                        "fxhash_token_url": f"https://www.fxhash.xyz/generative/{token_id}",
                        "tags": tags,
                        "signal_id": SIGNAL_ID,
                        "generated_by": SIGNAL_ID,
                        "auto_generated": True,
                        "created_at_fxhash": tok.get("createdAt"),
                    },
                })
                new_artwork_count += 1
                # CREATED_BY edge — source-attested
                new_edges.append({
                    "id": f"{artwork_id}--created_by--{pid}",
                    "source_id": artwork_id,
                    "target_id": pid,
                    "edge_type": "CREATED_BY",
                    "confidence": "high",
                    "signal_id": SIGNAL_ID,
                    "created_by": "gatherer-fxhash-tags-v3",
                    "source_evidence": f"fxhash GraphQL user(id={uid}) generativeTokens entry id={token_id}",
                    "charge": None,
                    "created_at": DATE,
                    "valid_from": DATE,
                    "valid_until": None,
                    "invalidated_by": None,
                    "event_time": tok.get("createdAt"),
                })

            # EMBODIES edges from tags
            for tag in tags:
                tag_norm = tag.lower().strip()
                if tag_norm in GENERIC_TAG_DENYLIST:
                    continue
                concept_id = f"concept:{tag_norm}"
                if concept_id not in existing_concepts and concept_id not in new_concepts_made:
                    new_concepts_made.add(concept_id)
                    new_nodes.append({
                        "id": concept_id,
                        "name": tag_norm,
                        "type": "concept",
                        "slug": slugify(tag_norm),
                        "metadata": {
                            "status": "confirmed",
                            "source_origin": "human_primary",
                            "first_surfaced_by": pid,
                            "first_surfaced_at_token": token_id,
                            "signal_id": SIGNAL_ID,
                            "generated_by": SIGNAL_ID,
                            "derivation": "practitioner-tagged-on-fxhash",
                            "auto_generated": True,
                        },
                    })
                new_edges.append({
                    "id": f"{artwork_id}--embodies--{concept_id}",
                    "source_id": artwork_id,
                    "target_id": concept_id,
                    "edge_type": "EMBODIES",
                    "confidence": "high",
                    "signal_id": SIGNAL_ID,
                    "created_by": "gatherer-fxhash-tags-v3",
                    "source_evidence": f"fxhash token id={token_id} tag '{tag}' set by artist at mint (source_origin: human_primary)",
                    "charge": None,
                    "created_at": DATE,
                    "valid_from": DATE,
                    "valid_until": None,
                    "invalidated_by": None,
                    "event_time": tok.get("createdAt"),
                })
                if existing_id:
                    embodies_for_existing += 1
                else:
                    embodies_for_new += 1

    output = {
        "signal_id": SIGNAL_ID,
        "generated_at": DATE,
        "method_note": (
            "fxhash GraphQL pulled 2026-04-28 via direct user(id:...) lookups. "
            "fxhash has blocked filtered queries since the April 22 pass — see "
            "fxhash_api_block_finding.json. Scope is therefore limited to the 2 "
            "fxhash users already in seed. For each, pulled up to "
            f"{MAX_TOKENS_PER_USER} of their generative tokens. Tags become "
            "EMBODIES with source_origin: human_primary (artist self-description "
            "at mint). Existing artworks gain tag-based EMBODIES; new tokens "
            "produce new artwork nodes + CREATED_BY + EMBODIES."
        ),
        "stats": {
            "fxhash_users_processed": len(user_to_prac),
            "new_artworks": new_artwork_count,
            "new_concepts": len(new_concepts_made),
            "embodies_added_to_existing_artworks": embodies_for_existing,
            "embodies_added_to_new_artworks": embodies_for_new,
            "total_new_edges": len(new_edges),
            "api_errors": len(api_errors),
        },
        "api_errors": api_errors,
        "nodes": new_nodes,
        "edges": new_edges,
    }
    OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False))
    s = output["stats"]
    print(f"\nWrote {OUT.name}")
    print(f"  users processed:                       {s['fxhash_users_processed']}")
    print(f"  new artworks:                          {s['new_artworks']}")
    print(f"  new concepts (from artist tags):       {s['new_concepts']}")
    print(f"  EMBODIES added to existing artworks:   {s['embodies_added_to_existing_artworks']}")
    print(f"  EMBODIES added to new artworks:        {s['embodies_added_to_new_artworks']}")
    print(f"  total new edges:                       {s['total_new_edges']}")

    BLOCK_FINDING_OUT.write_text(json.dumps({
        "signal_id": "fxhash-api-block-finding-2026-04-28",
        "generated_at": DATE,
        "finding": (
            "fxhash GraphQL has blocked filtered queries (users(filters:...), "
            "generativeTokens(filters:...)) for our application — HTTP 403 "
            "with message 'This operation cannot be processed, the application "
            "is blocked. Contact us to unblock it.'"
        ),
        "verified_working": [
            "user(id: <tz address>) — direct lookup",
            "generativeToken(id: <int>) — direct lookup",
        ],
        "verified_blocked": [
            "users(filters: { searchQuery_eq: ... })",
            "generativeTokens(filters: { ... })",
        ],
        "impact": (
            "Cannot expand fxhash coverage to new practitioners by name search. "
            "Limited to 2 verified accounts already in seed (Jonas Lund, Kim "
            "Asendorf). To deepen, contact fxhash to unblock the application or "
            "obtain an API key."
        ),
        "next_action": "Iri or JB to email fxhash team requesting unblock for A(DAI) at https://www.fxhash.xyz/contact (non-commercial knowledge commons use case).",
    }, indent=2, ensure_ascii=False))
    print(f"Wrote {BLOCK_FINDING_OUT.name}")

if __name__ == "__main__":
    main()
