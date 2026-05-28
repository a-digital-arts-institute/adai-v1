#!/usr/bin/env python3
"""
Wikidata SPARQL pass v3 — pull source-attested artworks + EMBODIES + images
for all 60 seed practitioners with Wikidata QIDs.

This addresses editorial:heuristic-embodies-scaffolding by emitting EMBODIES
edges grounded in Wikidata's `depicts` (P180), `genre` (P136), and `movement`
(P135) — all human-curated, source-attested, replacing the heuristic keyword
matches.

For each practitioner with a QID, query for all items where P170 (creator) =
practitioner QID. Per artwork, capture:
  - label (rdfs:label, English) → artwork name
  - inception (P571) → year
  - image (P18) → CC-licensed Wikimedia image URL
  - depicts (P180, multiple) → real source-attested EMBODIES targets
  - genre (P136, multiple) → EMBODIES (formal/aesthetic genre)
  - movement (P135, multiple) → BELONGS_TO scenes (mapped to scene nodes)
  - location (P276) → EXHIBITED_AT (institution where currently held)
  - instance of (P31) → filter (only emit if instance is artwork-like)

Output:
  seed/_build/wikidata_artworks_2026-04-28.json
"""
from __future__ import annotations
import json, re, time, unicodedata, urllib.error, urllib.request, urllib.parse
from collections import defaultdict
from pathlib import Path

from _slug import artwork_slug

HERE = Path(__file__).parent
SEED = HERE.parent
OUT = HERE / "wikidata_artworks_2026-04-28.json"

WD_SPARQL = "https://query.wikidata.org/sparql"
UA = "A(DAI)-knowledge-commons/3.0 (https://github.com/a-digital-arts-institute/adai-v1; non-commercial)"
SIGNAL_ID = "wikidata-artworks-ingest-2026-04-28"
DATE = "2026-04-28T00:00:00Z"

SLEEP_BETWEEN_REQUESTS = 0.5  # respect WDQS rate limits
BATCH_SIZE = 5  # practitioner QIDs per SPARQL query

# Artwork-like instance-of QIDs (broad — let editorial review prune later)
ARTWORK_INSTANCES = {
    "Q838948",   # work of art
    "Q3305213",  # painting
    "Q15401930", # installation
    "Q11635",    # performance art
    "Q1133595",  # video art
    "Q860861",   # sculpture
    "Q11060274", # printmaking
    "Q166713",   # multimedia work
    "Q1129821",  # photograph
    "Q11424",    # film
    "Q7397",     # software
    "Q341",      # free software (rare but possible)
    "Q15326342", # computer program
    "Q1191305",  # generative art
    "Q193292",   # performance
    "Q4502142",  # visual artwork
    "Q11629",    # art genre (sometimes used)
    "Q41298",    # magazine (some artist projects)
    "Q26736281", # internet art
    "Q874958",   # net art
    "Q108277123",# AI art
    "Q1497375",  # series of artworks
}

def slugify(s):
    s = unicodedata.normalize("NFKD", (s or "").lower()).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9&+\- ]", "", s)
    return re.sub(r"\s+", " ", s).strip()

def name_key(s):
    s = unicodedata.normalize("NFKD", (s or "").lower()).encode("ascii", "ignore").decode()
    return " ".join(s.split())

def parse_meta(n):
    m = n.get("metadata")
    if isinstance(m, str):
        try: return json.loads(m)
        except: return {}
    return m or {}

def sparql(query, retry=2):
    url = WD_SPARQL + "?query=" + urllib.parse.quote(query) + "&format=json"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
    for attempt in range(retry + 1):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < retry:
                time.sleep(5 * (attempt + 1))
                continue
            return {"error": f"HTTP {e.code}"}
        except Exception as e:
            if attempt < retry:
                time.sleep(3)
                continue
            return {"error": str(e)[:200]}
    return {"error": "max retries"}

def query_artworks_for_qids(qids):
    """SPARQL for artworks created by any of `qids`. Returns flattened binding rows."""
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

def main():
    nodes_path = SEED / "nodes.json"
    if not nodes_path.exists():
        nodes_path = SEED / "nodes.json.bak"
    nodes = json.loads(nodes_path.read_text())
    aliases = json.loads((SEED / "aliases.json").read_text())

    # QID → practitioner_id (from aliases.json — wikidata-only)
    qid_to_prac = {}
    for a in aliases:
        if a.get("source") == "wikidata" and a.get("external_id") and a.get("node_id"):
            qid_to_prac[a["external_id"]] = a["node_id"]

    existing_concepts = {n["id"] for n in nodes if n["type"] == "concept"}
    existing_scenes   = {n["id"] for n in nodes if n["type"] == "scene"}
    existing_institutions = {n["id"]: n["name"] for n in nodes if n["type"] == "institution"}

    existing_titles_per_prac = defaultdict(set)
    for n in nodes:
        if n["type"] == "artwork":
            m = parse_meta(n)
            cid = m.get("creator_id")
            if cid:
                existing_titles_per_prac[cid].add(name_key(n["name"]))

    institution_name_lookup = {name_key(v): k for k, v in existing_institutions.items()}

    new_nodes, new_edges = [], []
    new_concepts_made = set()
    seen_artwork_ids = set()
    stats = {
        "qids_processed": 0,
        "artworks_returned": 0,
        "skipped_non_artwork": 0,
        "skipped_duplicate": 0,
        "new_artworks": 0,
        "new_concepts": 0,
        "embodies_from_depicts": 0,
        "embodies_from_genre": 0,
        "exhibited_at_emitted": 0,
        "with_image": 0,
    }

    qids = list(qid_to_prac.keys())
    print(f"Querying Wikidata for artworks of {len(qids)} practitioner QIDs in batches of {BATCH_SIZE}...")

    for i in range(0, len(qids), BATCH_SIZE):
        batch = qids[i:i+BATCH_SIZE]
        result = query_artworks_for_qids(batch)
        time.sleep(SLEEP_BETWEEN_REQUESTS)
        if "error" in result:
            print(f"  ! batch {i}-{i+BATCH_SIZE}: {result['error']}")
            continue
        bindings = result.get("results", {}).get("bindings", [])
        stats["qids_processed"] += len(batch)
        stats["artworks_returned"] += len(bindings)

        for row in bindings:
            artwork_uri = row["artwork"]["value"]
            artwork_qid = artwork_uri.rsplit("/", 1)[-1]
            creator_uri = row["creator"]["value"]
            creator_qid = creator_uri.rsplit("/", 1)[-1]
            prac_id = qid_to_prac.get(creator_qid)
            if not prac_id:
                continue

            instance_list = (row.get("instanceList", {}).get("value") or "").split("||")
            # Loose filter — if any instance label suggests artwork-like, include
            instance_text = " ".join(instance_list).lower()
            artwork_keywords = ["art","work","painting","sculpture","installation","video","film","photograph","performance","software","program","series","drawing","print","collage"]
            if not any(k in instance_text for k in artwork_keywords):
                stats["skipped_non_artwork"] += 1
                continue

            title = (row.get("artworkLabel", {}).get("value") or "").strip()
            if not title:
                continue
            if name_key(title) in existing_titles_per_prac.get(prac_id, set()):
                stats["skipped_duplicate"] += 1
                continue

            artwork_id = artwork_slug(title, source="wikidata", external_id=artwork_qid)
            if artwork_id in seen_artwork_ids:
                continue
            seen_artwork_ids.add(artwork_id)
            existing_titles_per_prac[prac_id].add(name_key(title))

            year = row.get("inception", {}).get("value", "")[:10] if "inception" in row else None
            image = row.get("image", {}).get("value")
            if image: stats["with_image"] += 1

            depicts_list  = [s for s in (row.get("depictsList", {}).get("value") or "").split("||") if s]
            genre_list    = [s for s in (row.get("genreList", {}).get("value") or "").split("||") if s]
            movement_list = [s for s in (row.get("movementList", {}).get("value") or "").split("||") if s]
            location_qid  = (row.get("location", {}).get("value") or "").rsplit("/", 1)[-1] if "location" in row else None
            location_label = row.get("locationLabel", {}).get("value") if "locationLabel" in row else None

            new_nodes.append({
                "id": artwork_id,
                "name": title,
                "type": "artwork",
                "slug": slugify(title),
                "metadata": {
                    "status": "confirmed",
                    "source_origin": "human_secondary",
                    "year": year,
                    "creator_id": prac_id,
                    "image_url": image,
                    "image_license": "Wikimedia Commons — see file page for license",
                    "image_source": "wikidata",
                    "wikidata_qid": artwork_qid,
                    "wikidata_url": f"https://www.wikidata.org/wiki/{artwork_qid}",
                    "wd_depicts": depicts_list,
                    "wd_genre": genre_list,
                    "wd_movement": movement_list,
                    "wd_instance_of": instance_list,
                    "signal_id": SIGNAL_ID,
                    "generated_by": SIGNAL_ID,
                    "auto_generated": True,
                },
            })
            stats["new_artworks"] += 1

            # CREATED_BY edge
            new_edges.append({
                "id": f"{artwork_id}--created_by--{prac_id}",
                "source_id": artwork_id,
                "target_id": prac_id,
                "edge_type": "CREATED_BY",
                "confidence": "high",
                "signal_id": SIGNAL_ID,
                "created_by": "gatherer-wikidata-v3",
                "source_evidence": f"Wikidata {artwork_qid} P170 (creator) = {creator_qid}",
                "charge": None,
                "created_at": DATE,
                "valid_from": DATE,
                "valid_until": None,
                "invalidated_by": None,
                "event_time": None,
            })

            # EMBODIES from P180 (depicts) — real source-attested
            for d in depicts_list:
                concept_id = f"concept:{d.lower().strip()}"
                if concept_id not in existing_concepts and concept_id not in new_concepts_made:
                    new_concepts_made.add(concept_id)
                    new_nodes.append({
                        "id": concept_id,
                        "name": d.lower().strip(),
                        "type": "concept",
                        "slug": slugify(d),
                        "metadata": {
                            "status": "confirmed",
                            "source_origin": "human_secondary",
                            "first_surfaced_by": prac_id,
                            "signal_id": SIGNAL_ID,
                            "generated_by": SIGNAL_ID,
                            "derivation": "wikidata-P180-depicts",
                            "auto_generated": True,
                        },
                    })
                new_edges.append({
                    "id": f"{artwork_id}--embodies--{concept_id}",
                    "source_id": artwork_id, "target_id": concept_id,
                    "edge_type": "EMBODIES", "confidence": "high",
                    "signal_id": SIGNAL_ID, "created_by": "gatherer-wikidata-v3",
                    "source_evidence": f"Wikidata {artwork_qid} P180 (depicts) → '{d}'",
                    "charge": None, "created_at": DATE, "valid_from": DATE,
                    "valid_until": None, "invalidated_by": None, "event_time": None,
                })
                stats["embodies_from_depicts"] += 1

            # EMBODIES from P136 (genre)
            for g in genre_list:
                concept_id = f"concept:{g.lower().strip()}"
                if concept_id not in existing_concepts and concept_id not in new_concepts_made:
                    new_concepts_made.add(concept_id)
                    new_nodes.append({
                        "id": concept_id,
                        "name": g.lower().strip(),
                        "type": "concept",
                        "slug": slugify(g),
                        "metadata": {
                            "status": "confirmed",
                            "source_origin": "human_secondary",
                            "first_surfaced_by": prac_id,
                            "signal_id": SIGNAL_ID,
                            "generated_by": SIGNAL_ID,
                            "derivation": "wikidata-P136-genre",
                            "auto_generated": True,
                        },
                    })
                new_edges.append({
                    "id": f"{artwork_id}--embodies--{concept_id}",
                    "source_id": artwork_id, "target_id": concept_id,
                    "edge_type": "EMBODIES", "confidence": "high",
                    "signal_id": SIGNAL_ID, "created_by": "gatherer-wikidata-v3",
                    "source_evidence": f"Wikidata {artwork_qid} P136 (genre) → '{g}'",
                    "charge": None, "created_at": DATE, "valid_from": DATE,
                    "valid_until": None, "invalidated_by": None, "event_time": None,
                })
                stats["embodies_from_genre"] += 1

            # EXHIBITED_AT from P276 (location) — only if institution already in seed
            if location_label:
                inst_id = institution_name_lookup.get(name_key(location_label))
                if inst_id:
                    new_edges.append({
                        "id": f"{artwork_id}--exhibited_at--{inst_id}",
                        "source_id": artwork_id, "target_id": inst_id,
                        "edge_type": "EXHIBITED_AT", "confidence": "high",
                        "signal_id": SIGNAL_ID, "created_by": "gatherer-wikidata-v3",
                        "source_evidence": f"Wikidata {artwork_qid} P276 (location) = {location_qid} ({location_label})",
                        "charge": None, "created_at": DATE, "valid_from": DATE,
                        "valid_until": None, "invalidated_by": None, "event_time": None,
                    })
                    stats["exhibited_at_emitted"] += 1

        print(f"  batch {i+1}-{i+len(batch)}: {len(bindings)} artworks (running total new: {stats['new_artworks']})")

    stats["new_concepts"] = len(new_concepts_made)
    stats["total_new_edges"] = len(new_edges)

    output = {
        "signal_id": SIGNAL_ID,
        "generated_at": DATE,
        "method_note": (
            "Wikidata SPARQL pulled 2026-04-28. For each of 60 seed practitioners "
            "with QID, queried artworks where P170 (creator) = practitioner QID. "
            "Captured P180 depicts → EMBODIES (source-attested), P136 genre → "
            "EMBODIES, P135 movement → recorded but not emitted as edges (movement "
            "→ scene mapping is editorial), P276 location → EXHIBITED_AT (only when "
            "the institution is already in seed), P18 image → CC-licensed image URL. "
            "All EMBODIES are confidence: high, source_origin: human_secondary, "
            "directly addressing editorial:heuristic-embodies-scaffolding."
        ),
        "endpoint": WD_SPARQL,
        "stats": stats,
        "nodes": new_nodes,
        "edges": new_edges,
    }
    OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False))
    print(f"\nWrote {OUT.name}")
    for k, v in stats.items():
        print(f"  {k}: {v}")

if __name__ == "__main__":
    main()
