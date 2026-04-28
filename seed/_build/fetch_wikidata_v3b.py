#!/usr/bin/env python3
"""
Wikidata SPARQL pass v3b — adai.db edition.

Successor to fetch_wikidata_v3.py. Reads canonical state from adai.db (the
live db, includes 25 scene nodes that nodes.json.bak lacked) so that P135
movement values can be mapped to BELONGS_TO scene edges.

Behavioural diff from v3:
  - Read practitioners, scenes, institutions, existing artworks from adai.db.
  - Build a movement-name → scene-id lookup from db.
  - Emit BELONGS_TO (practitioner → scene) when an artwork's P135 movement
    matches a known scene name (case-insensitive). Aggregated per practitioner —
    one BELONGS_TO per (practitioner, scene) pair, even if multiple artworks
    share the movement.
  - Also pull P135/P136 directly on the practitioner QID (not just artworks).

Output:
  seed/_build/wikidata_artworks_2026-04-28b.json
"""
from __future__ import annotations
import json, re, sqlite3, time, unicodedata, urllib.error, urllib.request, urllib.parse
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).parent
SEED = HERE.parent
ROOT = SEED.parent
OUT = HERE / "wikidata_artworks_2026-04-28b.json"

DB = ROOT / "adai.db"
WD_SPARQL = "https://query.wikidata.org/sparql"
UA = "A(DAI)-knowledge-commons/3.1 (https://github.com/a-digital-arts-institute/adai-v1; non-commercial)"
SIGNAL_ID = "wikidata-artworks-ingest-2026-04-28b"
DATE = "2026-04-28T00:00:00Z"

SLEEP_BETWEEN_REQUESTS = 0.5
BATCH_SIZE = 5

def slugify(s):
    s = unicodedata.normalize("NFKD", (s or "").lower()).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9&+\- ]", "", s)
    return re.sub(r"\s+", " ", s).strip()

def name_key(s):
    s = unicodedata.normalize("NFKD", (s or "").lower()).encode("ascii", "ignore").decode()
    return " ".join(s.split())

def jget(j, *path, default=None):
    cur = j
    for p in path:
        if cur is None: return default
        cur = cur.get(p) if isinstance(cur, dict) else None
    return cur if cur is not None else default

def sparql(query, retry=2):
    url = WD_SPARQL + "?query=" + urllib.parse.quote(query) + "&format=json"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
    for attempt in range(retry + 1):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retry:
                time.sleep(5 * (attempt + 1)); continue
            return {"error": f"HTTP {e.code}"}
        except Exception as e:
            if attempt < retry:
                time.sleep(3); continue
            return {"error": str(e)[:200]}
    return {"error": "max retries"}

def query_artworks_for_qids(qids):
    values = " ".join(f"wd:{q}" for q in qids)
    q = f"""
    SELECT ?artwork ?artworkLabel ?creator ?inception ?image
           (GROUP_CONCAT(DISTINCT ?depictsLabel; separator="||") AS ?depictsList)
           (GROUP_CONCAT(DISTINCT ?genreLabel;   separator="||") AS ?genreList)
           (GROUP_CONCAT(DISTINCT ?movementLabel;separator="||") AS ?movementList)
           (GROUP_CONCAT(DISTINCT ?instanceLabel;separator="||") AS ?instanceList)
           ?location ?locationLabel
    WHERE {{
      VALUES ?creator {{ {values} }}
      ?artwork wdt:P170 ?creator .
      ?artwork wdt:P31 ?instance .
      OPTIONAL {{ ?artwork wdt:P571 ?inception . }}
      OPTIONAL {{ ?artwork wdt:P18  ?image . }}
      OPTIONAL {{ ?artwork wdt:P276 ?location . ?location rdfs:label ?locationLabel . FILTER(LANG(?locationLabel)="en") }}
      OPTIONAL {{ ?artwork wdt:P180 ?depicts . ?depicts  rdfs:label ?depictsLabel  . FILTER(LANG(?depictsLabel)="en") }}
      OPTIONAL {{ ?artwork wdt:P136 ?genre   . ?genre    rdfs:label ?genreLabel    . FILTER(LANG(?genreLabel)="en") }}
      OPTIONAL {{ ?artwork wdt:P135 ?movement. ?movement rdfs:label ?movementLabel . FILTER(LANG(?movementLabel)="en") }}
      ?instance rdfs:label ?instanceLabel . FILTER(LANG(?instanceLabel)="en")
      ?artwork rdfs:label ?artworkLabel . FILTER(LANG(?artworkLabel)="en")
    }}
    GROUP BY ?artwork ?artworkLabel ?creator ?inception ?image ?location ?locationLabel
    LIMIT 500
    """
    return sparql(q)

def query_practitioner_props(qids):
    """P135 (movement) and P136 (genre) directly on the practitioner entity."""
    values = " ".join(f"wd:{q}" for q in qids)
    q = f"""
    SELECT ?prac
           (GROUP_CONCAT(DISTINCT ?movementLabel; separator="||") AS ?movementList)
           (GROUP_CONCAT(DISTINCT ?genreLabel;    separator="||") AS ?genreList)
    WHERE {{
      VALUES ?prac {{ {values} }}
      OPTIONAL {{ ?prac wdt:P135 ?movement. ?movement rdfs:label ?movementLabel . FILTER(LANG(?movementLabel)="en") }}
      OPTIONAL {{ ?prac wdt:P136 ?genre.    ?genre    rdfs:label ?genreLabel    . FILTER(LANG(?genreLabel)="en") }}
    }}
    GROUP BY ?prac
    """
    return sparql(q)

def main():
    # Load canonical state from db
    con = sqlite3.connect(str(DB))
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    qid_to_prac = {}
    name_to_prac = {}
    for row in cur.execute("SELECT id, name, metadata FROM nodes WHERE type='practitioner'"):
        try:
            m = json.loads(row["metadata"]) if row["metadata"] else {}
        except Exception:
            m = {}
        qid = m.get("wikidata_qid") or m.get("qid")
        if qid:
            qid_to_prac[qid] = row["id"]
        name_to_prac[name_key(row["name"])] = row["id"]
    # Aliases table for richer QID mapping
    try:
        for row in cur.execute("SELECT external_id, node_id, source FROM node_aliases WHERE source='wikidata'"):
            qid_to_prac.setdefault(row["external_id"], row["node_id"])
    except sqlite3.OperationalError:
        pass

    scene_lookup = {}
    for row in cur.execute("SELECT id, name FROM nodes WHERE type='scene'"):
        sid, sn = row["id"], row["name"]
        scene_lookup[name_key(sn)] = sid
        scene_lookup[name_key(sn.replace("/", " "))] = sid
        scene_lookup[name_key(sn.replace("-", " "))] = sid
        # Hand-curated aliases for common Wikidata vocabulary
        if "AI art" in sn:
            scene_lookup["artificial intelligence art"] = sid
        if "net art" in sn:
            scene_lookup["net.art"] = sid; scene_lookup["internet art"] = sid; scene_lookup["web art"] = sid
        if "crypto art" in sn:
            scene_lookup["cryptoart"] = sid; scene_lookup["nft art"] = sid; scene_lookup["blockchain art"] = sid
        if "creative coding" in sn:
            scene_lookup["code art"] = sid
        if "video art and moving image" in sn:
            scene_lookup["video art"] = sid; scene_lookup["moving image"] = sid
        if "sound art" in sn:
            scene_lookup["sound installation"] = sid
        if "performance art" in sn:
            scene_lookup["performance"] = sid
        if "glitch art" in sn:
            scene_lookup["glitch"] = sid
        if "feminist digital practice" in sn:
            scene_lookup["feminist art"] = sid
        if "early computer art" in sn:
            scene_lookup["computer art"] = sid; scene_lookup["algorithmic art"] = sid
        if "tactical media" in sn:
            scene_lookup["hacktivism"] = sid
        if "post-internet art" in sn:
            scene_lookup["post-internet"] = sid

    institution_lookup = {}
    for row in cur.execute("SELECT id, name FROM nodes WHERE type='institution'"):
        institution_lookup[name_key(row["name"])] = row["id"]

    existing_concepts = {row["id"] for row in cur.execute("SELECT id FROM nodes WHERE type='concept'")}

    existing_titles_per_prac = defaultdict(set)
    artwork_qids_in_db = set()
    for row in cur.execute("SELECT id, name, metadata FROM nodes WHERE type='artwork'"):
        try:
            m = json.loads(row["metadata"]) if row["metadata"] else {}
        except Exception:
            m = {}
        cid = m.get("creator_id")
        if cid:
            existing_titles_per_prac[cid].add(name_key(row["name"]))
        wq = m.get("wikidata_qid")
        if wq:
            artwork_qids_in_db.add(wq)

    con.close()

    print(f"Loaded from db: {len(qid_to_prac)} practitioner QIDs, {len(scene_lookup)} scene-name keys, {len(institution_lookup)} institutions")

    new_nodes, new_edges = [], []
    new_concepts_made = set()
    seen_artwork_ids = set()
    practitioner_movements = defaultdict(set)  # collect across artworks
    belongs_to_emitted = set()  # (prac_id, scene_id)

    stats = defaultdict(int)
    qids = sorted(qid_to_prac.keys())
    print(f"Querying {len(qids)} practitioner QIDs in batches of {BATCH_SIZE}...")

    # Pass 1: artworks
    for i in range(0, len(qids), BATCH_SIZE):
        batch = qids[i:i+BATCH_SIZE]
        result = query_artworks_for_qids(batch)
        time.sleep(SLEEP_BETWEEN_REQUESTS)
        if "error" in result:
            print(f"  ! batch {i+1}-{i+len(batch)}: {result['error']}")
            continue
        bindings = result.get("results", {}).get("bindings", [])
        stats["artworks_returned"] += len(bindings)

        for row in bindings:
            artwork_qid = row["artwork"]["value"].rsplit("/", 1)[-1]
            creator_qid = row["creator"]["value"].rsplit("/", 1)[-1]
            prac_id = qid_to_prac.get(creator_qid)
            if not prac_id:
                continue

            instance_list = (row.get("instanceList", {}).get("value") or "").split("||")
            instance_text = " ".join(instance_list).lower()
            if not any(k in instance_text for k in ["art","work","painting","sculpture","installation","video","film","photograph","performance","software","program","series","drawing","print","collage"]):
                stats["skipped_non_artwork"] += 1
                continue

            title = (row.get("artworkLabel", {}).get("value") or "").strip()
            if not title:
                continue

            depicts_list  = [s for s in (row.get("depictsList", {}).get("value") or "").split("||") if s]
            genre_list    = [s for s in (row.get("genreList", {}).get("value") or "").split("||") if s]
            movement_list = [s for s in (row.get("movementList", {}).get("value") or "").split("||") if s]

            # accumulate movements for practitioner-level BELONGS_TO regardless of whether artwork is new
            for mv in movement_list:
                practitioner_movements[prac_id].add(mv)

            # dedup by (a) wikidata QID against db artworks, (b) name within practitioner
            if artwork_qid in artwork_qids_in_db:
                stats["skipped_duplicate_qid"] += 1
                continue
            if name_key(title) in existing_titles_per_prac.get(prac_id, set()):
                stats["skipped_duplicate_name"] += 1
                continue

            artwork_id = f"artwork:{slugify(title)}"
            if artwork_id in seen_artwork_ids:
                continue
            seen_artwork_ids.add(artwork_id)
            existing_titles_per_prac[prac_id].add(name_key(title))

            year = row.get("inception", {}).get("value", "")[:10] if "inception" in row else None
            image = row.get("image", {}).get("value")
            location_qid  = (row.get("location", {}).get("value") or "").rsplit("/", 1)[-1] if "location" in row else None
            location_label = row.get("locationLabel", {}).get("value") if "locationLabel" in row else None
            if image: stats["with_image"] += 1

            new_nodes.append({
                "id": artwork_id, "name": title, "type": "artwork", "slug": slugify(title),
                "metadata": {
                    "status": "confirmed", "source_origin": "human_secondary",
                    "year": year, "creator_id": prac_id,
                    "image_url": image,
                    "image_license": "Wikimedia Commons — see file page for license",
                    "image_source": "wikidata",
                    "wikidata_qid": artwork_qid,
                    "wikidata_url": f"https://www.wikidata.org/wiki/{artwork_qid}",
                    "wd_depicts": depicts_list, "wd_genre": genre_list,
                    "wd_movement": movement_list, "wd_instance_of": instance_list,
                    "signal_id": SIGNAL_ID, "generated_by": SIGNAL_ID, "auto_generated": True,
                },
            })
            stats["new_artworks"] += 1

            # CREATED_BY
            new_edges.append({
                "id": f"{artwork_id}--created_by--{prac_id}",
                "source_id": artwork_id, "target_id": prac_id,
                "edge_type": "CREATED_BY", "confidence": "high",
                "signal_id": SIGNAL_ID, "created_by": "gatherer-wikidata-v3b",
                "source_evidence": f"Wikidata {artwork_qid} P170 (creator) = {creator_qid}",
                "charge": None, "created_at": DATE, "valid_from": DATE,
                "valid_until": None, "invalidated_by": None, "event_time": None,
            })

            # EMBODIES from depicts
            for d in depicts_list:
                concept_id = f"concept:{d.lower().strip()}"
                if concept_id not in existing_concepts and concept_id not in new_concepts_made:
                    new_concepts_made.add(concept_id)
                    new_nodes.append({
                        "id": concept_id, "name": d.lower().strip(),
                        "type": "concept", "slug": slugify(d),
                        "metadata": {"status": "confirmed", "source_origin": "human_secondary",
                                     "first_surfaced_by": prac_id, "signal_id": SIGNAL_ID,
                                     "generated_by": SIGNAL_ID, "derivation": "wikidata-P180-depicts",
                                     "auto_generated": True},
                    })
                new_edges.append({
                    "id": f"{artwork_id}--embodies--{concept_id}",
                    "source_id": artwork_id, "target_id": concept_id,
                    "edge_type": "EMBODIES", "confidence": "high",
                    "signal_id": SIGNAL_ID, "created_by": "gatherer-wikidata-v3b",
                    "source_evidence": f"Wikidata {artwork_qid} P180 (depicts) → '{d}'",
                    "charge": None, "created_at": DATE, "valid_from": DATE,
                    "valid_until": None, "invalidated_by": None, "event_time": None,
                })
                stats["embodies_from_depicts"] += 1

            for g in genre_list:
                concept_id = f"concept:{g.lower().strip()}"
                if concept_id not in existing_concepts and concept_id not in new_concepts_made:
                    new_concepts_made.add(concept_id)
                    new_nodes.append({
                        "id": concept_id, "name": g.lower().strip(),
                        "type": "concept", "slug": slugify(g),
                        "metadata": {"status": "confirmed", "source_origin": "human_secondary",
                                     "first_surfaced_by": prac_id, "signal_id": SIGNAL_ID,
                                     "generated_by": SIGNAL_ID, "derivation": "wikidata-P136-genre",
                                     "auto_generated": True},
                    })
                new_edges.append({
                    "id": f"{artwork_id}--embodies--{concept_id}",
                    "source_id": artwork_id, "target_id": concept_id,
                    "edge_type": "EMBODIES", "confidence": "high",
                    "signal_id": SIGNAL_ID, "created_by": "gatherer-wikidata-v3b",
                    "source_evidence": f"Wikidata {artwork_qid} P136 (genre) → '{g}'",
                    "charge": None, "created_at": DATE, "valid_from": DATE,
                    "valid_until": None, "invalidated_by": None, "event_time": None,
                })
                stats["embodies_from_genre"] += 1

            if location_label:
                inst_id = institution_lookup.get(name_key(location_label))
                if inst_id:
                    new_edges.append({
                        "id": f"{artwork_id}--exhibited_at--{inst_id}",
                        "source_id": artwork_id, "target_id": inst_id,
                        "edge_type": "EXHIBITED_AT", "confidence": "high",
                        "signal_id": SIGNAL_ID, "created_by": "gatherer-wikidata-v3b",
                        "source_evidence": f"Wikidata {artwork_qid} P276 → {location_qid} ({location_label})",
                        "charge": None, "created_at": DATE, "valid_from": DATE,
                        "valid_until": None, "invalidated_by": None, "event_time": None,
                    })
                    stats["exhibited_at_emitted"] += 1

        print(f"  artworks batch {i+1}-{i+len(batch)}: {len(bindings)} returned (cumulative new: {stats['new_artworks']})")

    # Pass 2: practitioner-level P135 / P136
    print(f"\nQuerying practitioner-level P135/P136 for {len(qids)} QIDs...")
    for i in range(0, len(qids), BATCH_SIZE):
        batch = qids[i:i+BATCH_SIZE]
        result = query_practitioner_props(batch)
        time.sleep(SLEEP_BETWEEN_REQUESTS)
        if "error" in result:
            continue
        for row in result.get("results", {}).get("bindings", []):
            prac_qid = row["prac"]["value"].rsplit("/", 1)[-1]
            prac_id = qid_to_prac.get(prac_qid)
            if not prac_id:
                continue
            for mv in [s for s in (row.get("movementList", {}).get("value") or "").split("||") if s]:
                practitioner_movements[prac_id].add(mv)
            for g in [s for s in (row.get("genreList", {}).get("value") or "").split("||") if s]:
                practitioner_movements[prac_id].add(g)

    # Pass 3: emit BELONGS_TO from accumulated movements → scenes
    for prac_id, movements in practitioner_movements.items():
        for mv in movements:
            scene_id = scene_lookup.get(name_key(mv))
            if not scene_id:
                continue
            key = (prac_id, scene_id)
            if key in belongs_to_emitted:
                continue
            belongs_to_emitted.add(key)
            new_edges.append({
                "id": f"{prac_id}--belongs_to--{scene_id}",
                "source_id": prac_id, "target_id": scene_id,
                "edge_type": "BELONGS_TO", "confidence": "high",
                "signal_id": SIGNAL_ID, "created_by": "gatherer-wikidata-v3b",
                "source_evidence": f"Wikidata P135 (movement) on practitioner or their artworks → '{mv}' matched scene",
                "charge": None, "created_at": DATE, "valid_from": DATE,
                "valid_until": None, "invalidated_by": None, "event_time": None,
            })
            stats["belongs_to_emitted"] += 1

    stats["new_concepts"] = len(new_concepts_made)
    stats["total_new_edges"] = len(new_edges)
    stats["practitioners_with_movements"] = len(practitioner_movements)

    output = {
        "signal_id": SIGNAL_ID, "generated_at": DATE,
        "method_note": (
            "Wikidata SPARQL pass v3b. Reads canonical state from adai.db "
            "(includes 25 scene nodes). Pass 1: artworks via P170 (creator). "
            "Pass 2: practitioner-level P135/P136. Pass 3: emit BELONGS_TO "
            "(practitioner → scene) when movement labels match scene names. "
            "All EMBODIES from P180 depicts and P136 genre, all source-attested, "
            "all confidence: high. BELONGS_TO addresses the gap left by v3a "
            "which lacked scene visibility."
        ),
        "endpoint": WD_SPARQL,
        "stats": dict(stats),
        "nodes": new_nodes, "edges": new_edges,
    }
    OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False))
    print(f"\nWrote {OUT.name}")
    for k, v in stats.items():
        print(f"  {k}: {v}")

if __name__ == "__main__":
    main()
