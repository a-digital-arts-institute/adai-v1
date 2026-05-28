#!/usr/bin/env python3
"""
fetch_wikidata_named_anchors.py — close the named-anchor gaps surfaced in the
2026-04-28 canon review.

Same Wikidata SPARQL machinery as fetch_wikidata_v3b.py, but driven by a
hand-curated list of (canonical_id, QID, sub_type) tuples instead of by the
practitioners already in adai.db. Use case: practitioners we *know* belong
in the canon but who weren't picked up by the broader passes because they
weren't in nodes.json yet (so v3b had no QID to query against).

Coverage:
  - 10 practitioners with artworks expected
      JODI, Rafaël Rozendaal, Eva & Franco Mattes, VNS Matrix,
      Shu Lea Cheang, Coco Fusco, Rosa Menkman, Stephanie Dinkins,
      John Gerrard, Maurice Benayoun
  - 2 theorist anchor stubs (no artworks expected)
      Friedrich Kittler, Vilém Flusser

Output shape matches the merge-bundle convention so fold_merge_into_seed.py
can apply it:
  seed/_build/wikidata_named_anchors_2026-04-28.json
    { signal_id, stats, insert: { nodes: [...], edges: [...] } }

After running:
  1. Inspect the JSON.
  2. Re-run dedup_pre_commit.py (it's idempotent and will catch any
     concept-slug collisions the new run introduces).
  3. Fold into seed/nodes.json + seed/edges.json — either via a small
     wrapper that mirrors fold_merge_into_seed.py, or hand-merge.
"""
from __future__ import annotations
import json, re, sqlite3, time, unicodedata, urllib.error, urllib.request, urllib.parse
from collections import defaultdict
from pathlib import Path

from _slug import artwork_slug

HERE = Path(__file__).parent
SEED = HERE.parent
ROOT = SEED.parent
NODES_JSON = SEED / "nodes.json"
EDGES_JSON = SEED / "edges.json"
DB = ROOT / "adai.db"  # used only for scene + institution lookup if present

WD_SPARQL = "https://query.wikidata.org/sparql"
UA = "A(DAI)-knowledge-commons/3.2 (https://github.com/a-digital-arts-institute/adai-v1; non-commercial)"
SIGNAL_ID = "wikidata-named-anchors-2026-04-28"
DATE = "2026-04-28T00:00:00Z"
OUT = HERE / "wikidata_named_anchors_2026-04-28.json"

SLEEP_BETWEEN_REQUESTS = 0.5

# ──────────────────────────────────────────────────────────────────────────
# Hand-curated anchor list. QIDs verified manually 2026-04-28; if a QID turns
# out wrong the SPARQL simply returns no rows for that name and we log it.
# Each entry: (canonical_id, qid, sub_type, role)
# role ∈ {"practitioner","collective","theorist-anchor"}
# ──────────────────────────────────────────────────────────────────────────
ANCHORS = [
    # collective / duo  (QIDs verified via wbsearchentities 2026-04-28)
    ("practitioner:jodi",                    "Q2915356",  "net.art duo",                "collective"),
    ("practitioner:eva and franco mattes",   "Q5415207",  "net.art duo",                "collective"),
    ("practitioner:vns matrix",              "Q7907351",  "cyberfeminist collective",   "collective"),
    # individual practitioners
    ("practitioner:rafaël rozendaal",        "Q3417276",  "net artist",                 "practitioner"),
    ("practitioner:shu lea cheang",          "Q3482619",  "net artist / filmmaker",     "practitioner"),
    ("practitioner:coco fusco",              "Q5139737",  "performance / media artist", "practitioner"),
    ("practitioner:rosa menkman",            "Q16892461", "glitch artist / theorist",   "practitioner"),
    ("practitioner:stephanie dinkins",       "Q28869335", "ai art / black tech canon",  "practitioner"),
    ("practitioner:john gerrard",            "Q6235193",  "real-time simulation art",   "practitioner"),
    ("practitioner:maurice benayoun",        "Q3300395",  "interactive / VR art",       "practitioner"),
    # theorist anchors (no artworks expected — same pattern as Simondon)
    ("practitioner:friedrich kittler",       "Q69187",    "media theorist",             "theorist-anchor"),
    ("practitioner:vilém flusser",           "Q215623",   "media theorist",             "theorist-anchor"),
]


# ──────────────────────────────────────────────────────────────────────────
# helpers (lifted from fetch_wikidata_v3b.py — same conventions)
# ──────────────────────────────────────────────────────────────────────────
def slugify(s):
    s = unicodedata.normalize("NFKD", (s or "").lower()).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9&+\- ]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def name_key(s):
    s = unicodedata.normalize("NFKD", (s or "").lower()).encode("ascii", "ignore").decode()
    return " ".join(s.split())


def sparql(query, retry=2):
    url = WD_SPARQL + "?query=" + urllib.parse.quote(query) + "&format=json"
    req = urllib.request.Request(
        url, headers={"User-Agent": UA, "Accept": "application/sparql-results+json"}
    )
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


def query_entity_labels(qids):
    """Pull canonical labels + instance-of so we can verify each QID resolves."""
    values = " ".join(f"wd:{q}" for q in qids)
    q = f"""
    SELECT ?ent ?entLabel ?descEN
           (GROUP_CONCAT(DISTINCT ?instanceLabel; separator="||") AS ?instanceList)
           (GROUP_CONCAT(DISTINCT ?countryLabel;  separator="||") AS ?countryList)
           (GROUP_CONCAT(DISTINCT ?occLabel;      separator="||") AS ?occList)
           (GROUP_CONCAT(DISTINCT ?movementLabel; separator="||") AS ?movementList)
           (GROUP_CONCAT(DISTINCT ?genreLabel;    separator="||") AS ?genreList)
           ?image ?birth ?death ?formed ?dissolved
    WHERE {{
      VALUES ?ent {{ {values} }}
      OPTIONAL {{ ?ent wdt:P31 ?instance . ?instance rdfs:label ?instanceLabel . FILTER(LANG(?instanceLabel)="en") }}
      OPTIONAL {{ ?ent wdt:P27 ?country . ?country rdfs:label ?countryLabel . FILTER(LANG(?countryLabel)="en") }}
      OPTIONAL {{ ?ent wdt:P106 ?occ .    ?occ rdfs:label ?occLabel .         FILTER(LANG(?occLabel)="en") }}
      OPTIONAL {{ ?ent wdt:P135 ?movement.?movement rdfs:label ?movementLabel.FILTER(LANG(?movementLabel)="en") }}
      OPTIONAL {{ ?ent wdt:P136 ?genre .  ?genre rdfs:label ?genreLabel .     FILTER(LANG(?genreLabel)="en") }}
      OPTIONAL {{ ?ent wdt:P18  ?image . }}
      OPTIONAL {{ ?ent wdt:P569 ?birth . }}
      OPTIONAL {{ ?ent wdt:P570 ?death . }}
      OPTIONAL {{ ?ent wdt:P571 ?formed . }}
      OPTIONAL {{ ?ent wdt:P576 ?dissolved . }}
      OPTIONAL {{ ?ent schema:description ?descEN . FILTER(LANG(?descEN)="en") }}
      ?ent rdfs:label ?entLabel . FILTER(LANG(?entLabel)="en")
    }}
    GROUP BY ?ent ?entLabel ?descEN ?image ?birth ?death ?formed ?dissolved
    """
    return sparql(q)


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


# ──────────────────────────────────────────────────────────────────────────
# Scene-name lookup. Read from seed/nodes.json (avoid coupling to adai.db
# being present, since adai.db is gitignored).
# ──────────────────────────────────────────────────────────────────────────
def load_scene_lookup_from_nodes(nodes):
    lookup = {}
    for n in nodes:
        if n.get("type") != "scene":
            continue
        sid, sn = n["id"], n["name"]
        lookup[name_key(sn)] = sid
        lookup[name_key(sn.replace("/", " "))] = sid
        lookup[name_key(sn.replace("-", " "))] = sid
        if "AI art" in sn:
            lookup["artificial intelligence art"] = sid
        if "net art" in sn:
            lookup["net.art"] = sid
            lookup["internet art"] = sid
            lookup["web art"] = sid
        if "crypto art" in sn:
            lookup["cryptoart"] = sid; lookup["nft art"] = sid; lookup["blockchain art"] = sid
        if "creative coding" in sn:
            lookup["code art"] = sid
        if "video art and moving image" in sn:
            lookup["video art"] = sid; lookup["moving image"] = sid
        if "sound art" in sn:
            lookup["sound installation"] = sid
        if "performance art" in sn:
            lookup["performance"] = sid
        if "glitch art" in sn:
            lookup["glitch"] = sid
        if "feminist digital practice" in sn:
            lookup["feminist art"] = sid; lookup["cyberfeminism"] = sid
        if "early computer art" in sn:
            lookup["computer art"] = sid; lookup["algorithmic art"] = sid
        if "tactical media" in sn:
            lookup["hacktivism"] = sid
        if "post-internet art" in sn:
            lookup["post-internet"] = sid
        if "virtual and immersive environments" in sn:
            lookup["virtual reality"] = sid; lookup["vr art"] = sid
    return lookup


def load_institution_lookup_from_nodes(nodes):
    return {name_key(n["name"]): n["id"] for n in nodes if n.get("type") == "institution"}


# ──────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────
def main():
    nodes = json.loads(NODES_JSON.read_text())
    edges = json.loads(EDGES_JSON.read_text())
    existing_ids = {n["id"] for n in nodes}
    existing_concept_ids = {n["id"] for n in nodes if n.get("type") == "concept"}
    existing_artwork_qids = set()
    existing_titles_per_prac = defaultdict(set)
    for n in nodes:
        if n.get("type") != "artwork":
            continue
        m = n.get("metadata") or {}
        if isinstance(m, str):
            try: m = json.loads(m)
            except json.JSONDecodeError: m = {}
        if m.get("wikidata_qid"):
            existing_artwork_qids.add(m["wikidata_qid"])
        cid = m.get("creator_id")
        if cid:
            existing_titles_per_prac[cid].add(name_key(n["name"]))

    scene_lookup = load_scene_lookup_from_nodes(nodes)
    institution_lookup = load_institution_lookup_from_nodes(nodes)
    print(f"Loaded {len(nodes)} nodes, {len(edges)} edges from seed.")
    print(f"  scene-name keys: {len(scene_lookup)}, institutions: {len(institution_lookup)}")

    qid_to_canon = {qid: cid for (cid, qid, _, _) in ANCHORS}
    qid_to_role  = {qid: role for (_, qid, _, role) in ANCHORS}
    qid_to_sub   = {qid: sub  for (_, qid, sub, _)  in ANCHORS}
    canon_to_qid = {cid: qid for (cid, qid, _, _) in ANCHORS}

    # 1. Verify QIDs + pull entity-level metadata.
    qids = sorted(qid_to_canon)
    print(f"\nVerifying {len(qids)} anchor QIDs...")
    label_result = query_entity_labels(qids)
    if "error" in label_result:
        print(f"  ! verification SPARQL failed: {label_result['error']}")
        return
    entity_meta = {}
    for row in label_result.get("results", {}).get("bindings", []):
        qid = row["ent"]["value"].rsplit("/", 1)[-1]
        entity_meta[qid] = {
            "label":      row.get("entLabel", {}).get("value"),
            "desc":       row.get("descEN",   {}).get("value"),
            "instance":   [s for s in (row.get("instanceList", {}).get("value") or "").split("||") if s],
            "country":    [s for s in (row.get("countryList",  {}).get("value") or "").split("||") if s],
            "occupation": [s for s in (row.get("occList",      {}).get("value") or "").split("||") if s],
            "movements":  [s for s in (row.get("movementList", {}).get("value") or "").split("||") if s],
            "genres":     [s for s in (row.get("genreList",    {}).get("value") or "").split("||") if s],
            "image":      row.get("image", {}).get("value"),
            "birth":      (row.get("birth", {}).get("value") or "")[:10] or None,
            "death":      (row.get("death", {}).get("value") or "")[:10] or None,
            "formed":     (row.get("formed", {}).get("value") or "")[:10] or None,
            "dissolved":  (row.get("dissolved", {}).get("value") or "")[:10] or None,
        }
    missing = sorted(set(qids) - set(entity_meta))
    if missing:
        print(f"  ! {len(missing)} QIDs failed to resolve: {missing}")

    # 2. Build practitioner nodes.
    new_nodes, new_edges = [], []
    new_concepts_made = set()
    seen_artwork_ids = set()
    practitioner_movements = defaultdict(set)
    belongs_to_emitted = set()
    skipped_already_present = []
    stats = defaultdict(int)

    for canon_id, qid, sub_type, role in ANCHORS:
        if canon_id in existing_ids:
            skipped_already_present.append(canon_id)
            stats["skipped_already_present"] += 1
            continue
        meta = entity_meta.get(qid)
        if not meta or not meta.get("label"):
            stats["skipped_qid_unresolved"] += 1
            continue
        canon_name = canon_id.split(":", 1)[1]
        node_meta = {
            "status": "confirmed",
            "source_origin": "human_secondary",
            "sub_type": sub_type,
            "role_in_seed": role,
            "wikidata_qid": qid,
            "wikidata_url": f"https://www.wikidata.org/wiki/{qid}",
            "wikidata_label": meta["label"],
            "wikidata_description": meta["desc"],
            "instance_of": meta["instance"],
            "country": meta["country"],
            "occupation": meta["occupation"],
            "wd_movement": meta["movements"],
            "wd_genre": meta["genres"],
            "image_url": meta["image"],
            "image_license": "Wikimedia Commons — see file page" if meta["image"] else None,
            "image_source": "wikidata" if meta["image"] else None,
            "active_years": (
                f"{meta['formed'] or meta['birth'] or '?'}–{meta['dissolved'] or meta['death'] or 'present'}"
            ),
            "signal_id": SIGNAL_ID,
            "generated_by": SIGNAL_ID,
            "auto_generated": True,
            "data_provenance": {
                "source": "wikidata-named-anchors",
                "confidence": "high",
                "trust_tier": "reviewed",
            },
        }
        if role == "theorist-anchor":
            node_meta["note"] = (
                "Preserved as anchor node for INFLUENCES edges; not a digital-arts "
                "practitioner. Same pattern as Simondon, de Campos, LeWitt."
            )
            node_meta["status"] = "anchor"

        new_nodes.append({
            "id": canon_id,
            "type": "practitioner",
            "name": meta["label"],
            "slug": slugify(meta["label"]),
            "metadata": node_meta,
            "created_at": DATE,
            "updated_by": "contributor:migration",
        })
        existing_ids.add(canon_id)
        stats["new_practitioners"] += 1

        # Seed BELONGS_TO from practitioner-level P135/P136 immediately.
        for mv in list(meta["movements"]) + list(meta["genres"]):
            scene_id = scene_lookup.get(name_key(mv))
            if scene_id and (canon_id, scene_id) not in belongs_to_emitted:
                belongs_to_emitted.add((canon_id, scene_id))
                new_edges.append({
                    "id": f"{canon_id}--belongs_to--{scene_id}",
                    "source_id": canon_id, "target_id": scene_id,
                    "edge_type": "BELONGS_TO", "confidence": "high",
                    "signal_id": SIGNAL_ID, "created_by": "gatherer-wikidata-named-anchors",
                    "source_evidence": f"Wikidata {qid} P135/P136 → '{mv}' matched scene",
                    "charge": None, "created_at": DATE, "valid_from": DATE,
                    "valid_until": None, "invalidated_by": None, "event_time": None,
                })
                stats["belongs_to_from_practitioner_props"] += 1

    # 3. Query artworks for non-theorist roles only.
    artwork_qids = [
        qid for (cid, qid, _, role) in ANCHORS
        if role != "theorist-anchor" and qid in entity_meta
    ]
    print(f"\nQuerying artworks for {len(artwork_qids)} non-theorist QIDs...")
    if artwork_qids:
        time.sleep(SLEEP_BETWEEN_REQUESTS)
        result = query_artworks_for_qids(artwork_qids)
        if "error" in result:
            print(f"  ! artworks SPARQL failed: {result['error']}")
        else:
            bindings = result.get("results", {}).get("bindings", [])
            stats["artworks_returned"] = len(bindings)
            for row in bindings:
                artwork_qid = row["artwork"]["value"].rsplit("/", 1)[-1]
                creator_qid = row["creator"]["value"].rsplit("/", 1)[-1]
                prac_id = qid_to_canon.get(creator_qid)
                if not prac_id:
                    continue

                instance_list = (row.get("instanceList", {}).get("value") or "").split("||")
                instance_text = " ".join(instance_list).lower()
                if not any(k in instance_text for k in [
                    "art","work","painting","sculpture","installation","video","film",
                    "photograph","performance","software","program","series","drawing",
                    "print","collage","website","net.art","game"
                ]):
                    stats["skipped_non_artwork"] += 1
                    continue

                title = (row.get("artworkLabel", {}).get("value") or "").strip()
                if not title:
                    continue

                depicts_list  = [s for s in (row.get("depictsList", {}).get("value") or "").split("||") if s]
                genre_list    = [s for s in (row.get("genreList", {}).get("value") or "").split("||") if s]
                movement_list = [s for s in (row.get("movementList", {}).get("value") or "").split("||") if s]
                for mv in movement_list:
                    practitioner_movements[prac_id].add(mv)

                if artwork_qid in existing_artwork_qids:
                    stats["skipped_duplicate_qid"] += 1
                    continue
                if name_key(title) in existing_titles_per_prac.get(prac_id, set()):
                    stats["skipped_duplicate_name"] += 1
                    continue

                artwork_id = artwork_slug(title, source="wikidata", external_id=artwork_qid)
                if artwork_id in seen_artwork_ids or artwork_id in existing_ids:
                    continue
                seen_artwork_ids.add(artwork_id)
                existing_titles_per_prac[prac_id].add(name_key(title))

                year = (row.get("inception", {}).get("value") or "")[:10] or None
                image = row.get("image", {}).get("value")
                location_qid = (row.get("location", {}).get("value") or "").rsplit("/", 1)[-1] if "location" in row else None
                location_label = row.get("locationLabel", {}).get("value") if "locationLabel" in row else None
                if image: stats["with_image"] += 1

                new_nodes.append({
                    "id": artwork_id,
                    "type": "artwork",
                    "name": title,
                    "slug": slugify(title),
                    "metadata": {
                        "status": "confirmed",
                        "source_origin": "human_secondary",
                        "year": year,
                        "creator_id": prac_id,
                        "image_url": image,
                        "image_license": "Wikimedia Commons — see file page" if image else None,
                        "image_source": "wikidata" if image else None,
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
                    "created_at": DATE,
                    "updated_by": "contributor:migration",
                })
                stats["new_artworks"] += 1

                new_edges.append({
                    "id": f"{artwork_id}--created_by--{prac_id}",
                    "source_id": artwork_id, "target_id": prac_id,
                    "edge_type": "CREATED_BY", "confidence": "high",
                    "signal_id": SIGNAL_ID, "created_by": "gatherer-wikidata-named-anchors",
                    "source_evidence": f"Wikidata {artwork_qid} P170 (creator) = {creator_qid}",
                    "charge": None, "created_at": DATE, "valid_from": DATE,
                    "valid_until": None, "invalidated_by": None, "event_time": None,
                })

                for d in depicts_list:
                    cid = f"concept:{d.lower().strip()}"
                    if cid not in existing_concept_ids and cid not in new_concepts_made:
                        new_concepts_made.add(cid)
                        new_nodes.append({
                            "id": cid, "name": d.lower().strip(),
                            "type": "concept", "slug": slugify(d),
                            "metadata": {
                                "status": "confirmed", "source_origin": "human_secondary",
                                "first_surfaced_by": prac_id, "signal_id": SIGNAL_ID,
                                "generated_by": SIGNAL_ID, "derivation": "wikidata-P180-depicts",
                                "auto_generated": True,
                            },
                            "created_at": DATE, "updated_by": "contributor:migration",
                        })
                    new_edges.append({
                        "id": f"{artwork_id}--embodies--{cid}",
                        "source_id": artwork_id, "target_id": cid,
                        "edge_type": "EMBODIES", "confidence": "high",
                        "signal_id": SIGNAL_ID, "created_by": "gatherer-wikidata-named-anchors",
                        "source_evidence": f"Wikidata {artwork_qid} P180 (depicts) → '{d}'",
                        "charge": None, "created_at": DATE, "valid_from": DATE,
                        "valid_until": None, "invalidated_by": None, "event_time": None,
                    })
                    stats["embodies_from_depicts"] += 1

                for g in genre_list:
                    cid = f"concept:{g.lower().strip()}"
                    if cid not in existing_concept_ids and cid not in new_concepts_made:
                        new_concepts_made.add(cid)
                        new_nodes.append({
                            "id": cid, "name": g.lower().strip(),
                            "type": "concept", "slug": slugify(g),
                            "metadata": {
                                "status": "confirmed", "source_origin": "human_secondary",
                                "first_surfaced_by": prac_id, "signal_id": SIGNAL_ID,
                                "generated_by": SIGNAL_ID, "derivation": "wikidata-P136-genre",
                                "auto_generated": True,
                            },
                            "created_at": DATE, "updated_by": "contributor:migration",
                        })
                    new_edges.append({
                        "id": f"{artwork_id}--embodies--{cid}",
                        "source_id": artwork_id, "target_id": cid,
                        "edge_type": "EMBODIES", "confidence": "high",
                        "signal_id": SIGNAL_ID, "created_by": "gatherer-wikidata-named-anchors",
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
                            "signal_id": SIGNAL_ID, "created_by": "gatherer-wikidata-named-anchors",
                            "source_evidence": f"Wikidata {artwork_qid} P276 → {location_qid} ({location_label})",
                            "charge": None, "created_at": DATE, "valid_from": DATE,
                            "valid_until": None, "invalidated_by": None, "event_time": None,
                        })
                        stats["exhibited_at_emitted"] += 1

    # 4. Add accumulated artwork-side movements as practitioner BELONGS_TO too.
    for prac_id, movements in practitioner_movements.items():
        for mv in movements:
            scene_id = scene_lookup.get(name_key(mv))
            if not scene_id:
                continue
            if (prac_id, scene_id) in belongs_to_emitted:
                continue
            belongs_to_emitted.add((prac_id, scene_id))
            new_edges.append({
                "id": f"{prac_id}--belongs_to--{scene_id}",
                "source_id": prac_id, "target_id": scene_id,
                "edge_type": "BELONGS_TO", "confidence": "high",
                "signal_id": SIGNAL_ID, "created_by": "gatherer-wikidata-named-anchors",
                "source_evidence": f"Wikidata movement on artwork → '{mv}' matched scene",
                "charge": None, "created_at": DATE, "valid_from": DATE,
                "valid_until": None, "invalidated_by": None, "event_time": None,
            })
            stats["belongs_to_from_artworks"] += 1

    # 5. CLASSIFIED_BY → A(DAI) seed canon for each new practitioner (matches
    # the convention used by the prior passes; keeps these visible at the root).
    canon_regime_id = "classification_regime:a(dai) seed canon v1 (april 2026)"
    if any(n["id"] == canon_regime_id for n in nodes):
        for n in new_nodes:
            if n["type"] != "practitioner":
                continue
            edge_id = f"{n['id']}--classified_by--{canon_regime_id}"
            new_edges.append({
                "id": edge_id,
                "source_id": n["id"], "target_id": canon_regime_id,
                "edge_type": "CLASSIFIED_BY", "confidence": "high",
                "signal_id": SIGNAL_ID, "created_by": "gatherer-wikidata-named-anchors",
                "source_evidence": "Editorial: named-anchor inclusion in A(DAI) seed canon v1",
                "charge": None, "created_at": DATE, "valid_from": DATE,
                "valid_until": None, "invalidated_by": None, "event_time": None,
            })
            stats["classified_by_emitted"] += 1

    stats["new_concepts"] = len(new_concepts_made)
    stats["total_new_nodes"] = len(new_nodes)
    stats["total_new_edges"] = len(new_edges)

    output = {
        "signal_id": SIGNAL_ID,
        "generated_at": DATE,
        "method_note": (
            "Wikidata named-anchor pass — driven by a hand-curated 12-entry "
            "list of canonical figures missing from the seed (10 practitioners "
            "+ 2 theorist-anchor stubs). Same SPARQL machinery as v3b. "
            "Verifies QIDs first, then queries artworks via P170 + practitioner-"
            "level P135/P136. Output is a merge bundle that fold_merge_into_seed "
            "can apply, after which dedup_pre_commit should be re-run."
        ),
        "endpoint": WD_SPARQL,
        "anchors_attempted": [{"id": cid, "qid": qid, "sub_type": sub, "role": role}
                              for (cid, qid, sub, role) in ANCHORS],
        "skipped_already_present": skipped_already_present,
        "qids_unresolved": missing,
        "stats": dict(stats),
        "insert": {"nodes": new_nodes, "edges": new_edges},
    }
    OUT.write_text(json.dumps(output, indent=2, ensure_ascii=False))
    print(f"\nWrote {OUT.name}")
    for k, v in stats.items():
        print(f"  {k}: {v}")
    if skipped_already_present:
        print(f"  already-present (skipped): {skipped_already_present}")
    if missing:
        print(f"  ! QIDs unresolved: {missing}")


if __name__ == "__main__":
    main()
