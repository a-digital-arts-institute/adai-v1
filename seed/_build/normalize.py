"""
Task 0: Profile normalisation + cleanup.

Reads:
  seed/nodes.json
  seed/edges.json
  seed/_build/deepening.json   -- editorial content for 71 practitioners

Produces:
  seed/nodes-final.json
  seed/edges-final.json
  seed/normalisation-report.json
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "seed"

# --- Retarget map: stub_id -> canonical_id_to_retarget_to ---
RETARGET = {
    "practitioner:serpentine galleries": "institution:serpentine arts technologies",
    "practitioner:rhizome": "institution:rhizome artbase",
    "practitioner:hackatao": "collective:hackatao",
    "practitioner:sofia crespo": "collective:sofia crespo entangled others",
    "practitioner:casey reas / processing": "practitioner:casey reas",
    "practitioner:holly herndon & mat dryhurst": "practitioner:holly herndon",
    "practitioner:holly herndon mat dryhurst": "practitioner:holly herndon",
    "practitioner:holly herndon holly+": "practitioner:holly herndon",
    "practitioner:random international": "collective:random international",
    "practitioner:rhizome / artbase": "institution:rhizome artbase",
    "practitioner:rhizome / new museum": "institution:rhizome artbase",
    "practitioner:serpentine arts technologies": "institution:serpentine arts technologies",
    "practitioner:serpentine galleries r&d platform": "institution:serpentine arts technologies",
    "practitioner:spawning have i been trained": "platform:spawning ai sourceplus",
    "practitioner:spawning/have i been trained": "platform:spawning ai sourceplus",
    "practitioner:feral file": "platform:feral file",
    "practitioner:metalabel": "platform:metalabel",
    "practitioner:trust berlin": "collective:trust berlin",
    # Forensic Architecture ref
    "practitioner:eyal weizman / forensic architecture": "collective:forensic architecture",
}

# Stubs to KEEP as status="stub" (no profile, preserved for graph structure, esp. INFLUENCES targets)
KEEP_AS_STUB = {
    "practitioner:sol lewitt",
    "practitioner:gilbert simondon",
    "practitioner:augusto de campos",
}

# Bogus / misingested nodes to DROP entirely (not a practitioner at all)
DROP_NODES = {
    "practitioner:audit",  # _audit.json metadata file misingested as practitioner
}

# Regime merge
REGIME_OLD_IDS = {
    "classification_regime:seed research 2025",
    "classification_regime:seed taxonomy april 2026",
    "classification_regime:seed taxonomy (april 2026)",
    "classification_regime:seed-research-2025",
    "classification_regime:seed-taxonomy-2026-04",
}
NEW_SEED_REGIME_ID = "classification_regime:a(dai) seed canon v1 (april 2026)"
NEW_SEED_REGIME_NODE = {
    "id": NEW_SEED_REGIME_ID,
    "name": "A(DAI) Seed Canon v1 (April 2026)",
    "type": "classification_regime",
    "slug": "adai-seed-canon-v1-2026-04",
    "metadata": {
        "description": (
            "The A(DAI) founding team's initial research pass. Combines the original 45 practitioners "
            "(Pass 1-2, human editorial research) and the 71 practitioners added through cross-referenced "
            "sources and AI-assisted deepening (Pass 3). This is *a* canon, not *the* canon — a starting "
            "point, declared-bias, open to revision as practitioners enter and contest their profiles. "
            "See SOURCES.md for methodology and COVERAGE.md for known gaps."
        ),
        "version": "v1",
        "created_at": "2026-04-22",
        "status": "active",
    },
}

# Empty placeholder regimes — keep but mark
PLACEHOLDER_REGIMES = {
    "classification_regime:academic media-art history",
    "classification_regime:asia-pacific institutional",
    "classification_regime:crypto market-native",
    "classification_regime:euro-american institutional",
    "classification_regime:practitioner self-report",
}


def load_meta(n):
    m = n.get("metadata")
    if isinstance(m, str):
        try:
            return json.loads(m)
        except json.JSONDecodeError:
            return {}
    return m or {}


def parse_list_field(v) -> list[str]:
    """Accepts list or comma/semicolon-delimited string, returns clean list of strings."""
    if v is None:
        return []
    if isinstance(v, list):
        return [str(x).strip() for x in v if str(x).strip()]
    if isinstance(v, str):
        parts = re.split(r"[,;]", v)
        return [p.strip() for p in parts if p.strip()]
    return []


_STOPWORDS = {
    "the", "and", "of", "with", "for", "to", "in", "on", "at", "by", "an", "or",
    "this", "that", "these", "those", "is", "are", "was", "were", "be", "been",
    "has", "had", "have", "her", "his", "their", "its", "they", "she", "he", "it",
    "as", "not", "but", "also", "work", "works", "from", "into", "than", "more",
    "most", "some", "all", "any", "other", "one", "two", "three", "often", "where",
    "which", "whose", "such", "both", "who", "whom", "s",
}


def extract_institutions_from_text(text: str) -> list[str]:
    """Best-effort: pull institution names from prose. Heuristic, imperfect — user reviews at checkpoint."""
    if not text or not isinstance(text, str):
        return []
    found: list[str] = []
    # Look for "Exhibited at X, Y, and Z" or "shown at X" or "venues include X"
    # More robust: grab sequences of 1-5 TitleCased words
    # But filter against stopwords, people-name heuristics, and known non-institutions
    matches = re.findall(r"(?:[A-Z][a-zA-ZÀ-ÿ&'.]*(?:[ -][A-Z][a-zA-ZÀ-ÿ&'.]*){0,5})", text)
    seen = set()
    institution_markers = (
        "museum", "gallery", "galerie", "galleries", "foundation", "center", "centre",
        "institut", "academy", "biennale", "triennale", "festival", "kunsthal",
        "kunsthalle", "ica", "moma", "lacma", "sfmoma", "pompidou", "tate", "whitney",
        "v&a", "v & a", "victoria and albert", "guggenheim", "pérez", "perez",
        "hirshhorn", "serpentine", "haus", "zkm", "ars electronica", "new museum",
        "art basel", "artbase", "rhizome", "stedelijk", "barbican", "fondation",
        "palais", "louvre", "british library",
    )
    # Very simple: grab any proper-noun group with an institution marker
    # OR any proper-noun group of 2+ words that look like org names
    for m in matches:
        low = m.lower()
        if any(mk in low for mk in institution_markers) and m not in seen:
            seen.add(m)
            found.append(m.strip())
    return found


def extract_scenes_from_text(text: str) -> list[str]:
    if not text or not isinstance(text, str):
        return []
    # Take the first sentence of scene_affiliation and split on commas
    first = text.split(".")[0]
    parts = [p.strip() for p in re.split(r"[,;]", first)]
    # Filter stopwords and too-short fragments
    out = []
    for p in parts:
        pl = p.lower().strip()
        if 3 < len(p) < 80 and pl not in _STOPWORDS:
            out.append(p)
    return out[:10]


def parse_connections_typed(text: str, known_people_ids: dict[str, str]) -> list[dict]:
    """
    Parse network_position.connections free text into typed collaborators.
    known_people_ids: {lowercase-name: node_id} for all practitioner/collective nodes, used to match.
    Returns list of {"name": str, "type": "COLLABORATES_WITH"|"INFLUENCES"|"EXHIBITED_AT"|"BELONGS_TO"|"RELATED_TO"}
    """
    if not text or not isinstance(text, str):
        return []

    influence_markers = [
        "inspired by", "influenced by", "lineage", "predecessor", "forebear",
        "in the tradition of", "following", "extending", "response to",
    ]
    collab_markers = [
        "collaborat", "co-found", "co-creat", "co-auth", "joint", "together with",
        "worked with", "partner", "co-led", "co-director", "co-director",
    ]
    exhib_markers = ["exhibited at", "shown at", "commissioned by", "presented at", "residency at"]
    belong_markers = ["teaches at", "professor at", "studied at", "graduate of", "phd at",
                      "fellow at", "based at", "director of", "affiliated with"]

    # Rough sentence split
    sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z])", text.strip())

    out: list[dict] = []
    seen_names: set[str] = set()
    for s in sentences:
        sl = s.lower()
        # Extract candidate proper-noun names at start of sentence
        m = re.match(r"\s*([A-Z][A-Za-z'\-\.]+(?:[ -][A-Z][A-Za-z'\-\.]+){0,3})", s)
        if not m:
            continue
        name = m.group(1).strip().rstrip(",.;")
        if name in seen_names:
            continue
        seen_names.add(name)
        # Classify
        if any(mk in sl for mk in influence_markers):
            t = "INFLUENCES"
        elif any(mk in sl for mk in collab_markers):
            t = "COLLABORATES_WITH"
        elif any(mk in sl for mk in exhib_markers):
            t = "EXHIBITED_AT"
        elif any(mk in sl for mk in belong_markers):
            t = "BELONGS_TO"
        else:
            # Check if name matches a known institution/gallery by heuristic
            if any(w in name.lower() for w in ("museum", "gallery", "foundation", "biennale", "festival", "university", "institute")):
                t = "EXHIBITED_AT" if any(w in name.lower() for w in ("museum", "gallery", "foundation", "biennale", "festival")) else "BELONGS_TO"
            else:
                t = "COLLABORATES_WITH"  # default for connections text
        out.append({"name": name, "type": t})
    return out


def normalise_confirmed(node, all_nodes) -> dict:
    """Normalize a confirmed/bridge/intentional-draft practitioner from its full_profile."""
    m = load_meta(node)
    fp = m.get("full_profile") or {}
    if not isinstance(fp, dict):
        fp = {}

    basic = fp.get("basic_info") or {}
    pd = fp.get("practice_description") or {}
    kw = fp.get("key_works") or {}
    exh = fp.get("exhibition_modality") or {}
    np_ = fp.get("network_position") or {}
    co = fp.get("commons_orientation") or {}
    gov = fp.get("governance_model") or {}

    practice_summary = pd.get("practice_summary") or pd.get("summary")
    methodology = pd.get("methodology")
    medium = parse_list_field(pd.get("medium"))
    key_works = kw.get("works") if isinstance(kw, dict) else None
    if key_works and isinstance(key_works, list):
        key_works = [dict(w) for w in key_works]
    else:
        key_works = []

    # Exhibitions from spatial_description
    spatial = exh.get("spatial_description") if isinstance(exh, dict) else None
    exhibitions = extract_institutions_from_text(spatial or "")

    scene_text = np_.get("scene_affiliation") if isinstance(np_, dict) else None
    scene_affiliation = extract_scenes_from_text(scene_text or "")

    connections_text = np_.get("connections") if isinstance(np_, dict) else None
    # known_people_ids: lowercase name -> id (for matching). Build once, cheap.
    # This is passed at caller level to avoid N^2; but simple inline for now.
    known: dict[str, str] = {}
    for n in all_nodes:
        t = n.get("type")
        if t in ("practitioner", "collective", "institution", "platform"):
            known[(n.get("name") or "").lower()] = n["id"]
    collaborators = parse_connections_typed(connections_text or "", known)

    commons_summary = co.get("commons_summary") if isinstance(co, dict) else None
    governance_summary = gov.get("governance_detail") if isinstance(gov, dict) else None
    sub_type = basic.get("type") or m.get("original_type")

    # Determine source_origin: confirmed/bridge profiles from Pass 1+2 are human_secondary
    status = m.get("status")
    if status in ("confirmed", "bridge"):
        source_origin = "human_secondary"
    else:
        # intentional drafts (Pass 3) - will be overridden by deepening if present
        source_origin = "ai_assisted"

    out = {
        "status": "confirmed",  # everyone who reaches this function becomes confirmed
        "source_origin": source_origin,
        "sub_type": sub_type,
        "active_years": basic.get("active_years"),
        "location": None,
        "wikidata_qid": m.get("wikidata_qid"),
        "url": basic.get("url"),
        "practice_summary": practice_summary,
        "methodology": methodology,
        "medium": medium,
        "key_works": key_works,
        "exhibitions": exhibitions,
        "scene_affiliation": scene_affiliation,
        "collaborators": collaborators,
        "commons_summary": commons_summary,
        "governance_summary": governance_summary,
        "image_url": m.get("image_url"),
        "image_license": m.get("image_license"),
        "image_source": m.get("image_source"),
        # archival
        "full_profile": fp,
        "data_provenance": m.get("data_provenance"),
        "original_type": m.get("original_type"),
        "source_file": m.get("source_file"),
        "seed_category": m.get("seed_category"),
    }
    return out


def apply_deepening(norm_meta: dict, deepening_entry: dict) -> dict:
    """Overlay deepening fields onto normalized meta. Deepening values WIN when non-empty/non-None."""
    out = dict(norm_meta)
    for k, v in deepening_entry.items():
        if v is None:
            continue
        # For arrays: replace if deepening provides non-empty array
        if isinstance(v, list) and len(v) == 0:
            continue
        out[k] = v
    return out


VENUE_MARKERS = (
    "museum", "gallery", "galerie", "galleries", "foundation", "center", "centre",
    "biennale", "triennale", "festival", "kunsthal", "kunsthalle", "haus",
    "moma", "lacma", "sfmoma", "pompidou", "tate", "whitney", "v&a", "v & a",
    "guggenheim", "hirshhorn", "serpentine", "zkm", "new museum", "stedelijk",
    "barbican", "fondation", "palais", "louvre", "british library", "pérez", "perez",
    "k21", "ucca", "spruth", "goodman", "feldman", "team",
    "kunstsammlung", "kunsthalle", "kunsthaus", "stedelijk", "moderna",
)
UNIVERSITY_MARKERS = ("university", "college", "ucla", "mit ", "nyu ", "harvard", "goldsmiths",
                     "king's college", "king s college", "design media arts", "school of",
                     "institute of technology", "rca", "royal college", "bauhaus",
                     "ens ", "écoles des beaux-arts", "cal arts", "parsons", "rhode island school")


def looks_like_venue(name: str) -> bool:
    if not name:
        return False
    low = name.lower()
    if any(mk in low for mk in UNIVERSITY_MARKERS):
        return False  # not a venue; it's a school
    return any(mk in low for mk in VENUE_MARKERS)


def looks_like_school(name: str) -> bool:
    if not name:
        return False
    low = name.lower()
    return any(mk in low for mk in UNIVERSITY_MARKERS)


def main():
    nodes = json.loads((SEED / "nodes.json").read_text())
    edges = json.loads((SEED / "edges.json").read_text())
    deepening = json.loads((SEED / "_build" / "deepening.json").read_text())

    print(f"Loaded {len(nodes)} nodes, {len(edges)} edges, {len(deepening)} deepening entries")

    # Build indexes
    node_by_id = {n["id"]: n for n in nodes}
    metas = {n["id"]: load_meta(n) for n in nodes}

    # Classify practitioners
    practs = [n for n in nodes if n.get("type") == "practitioner"]
    full_profile_ids = {p["id"] for p in practs if metas[p["id"]].get("full_profile")}
    auto_ids = {p["id"] for p in practs if metas[p["id"]].get("auto_generated")}

    # Inbound-from-canonical analysis (for stub keep/remove decision)
    inbound = defaultdict(set)
    for e in edges:
        s, t = e.get("source_id"), e.get("target_id")
        if t in auto_ids and s in full_profile_ids:
            inbound[t].add(s)

    # Stubs to promote (via deepening.json — these are the 3 earlier + 25 new + 1 Constant = 29)
    # We identify them by: stub in auto_ids AND key is present in deepening.json (mapped by slug)
    def id_to_slug(nid: str) -> str:
        return nid.split(":", 1)[1] if ":" in nid else nid

    deepening_keys = set(deepening.keys())

    # Decide each stub: promoted / kept_as_stub / retargeted / removed
    stubs_promoted: set[str] = set()
    stubs_retargeted: dict[str, str] = dict(RETARGET)  # merge-in default map
    stubs_kept: set[str] = set(KEEP_AS_STUB)
    stubs_removed: set[str] = set()

    for stub_id in auto_ids:
        slug = id_to_slug(stub_id)
        if slug in deepening_keys:
            stubs_promoted.add(stub_id)
        elif stub_id in RETARGET:
            pass  # retarget
        elif stub_id in KEEP_AS_STUB:
            pass  # keep
        else:
            stubs_removed.add(stub_id)

    print()
    print(f"Stub disposition:")
    print(f"  promoted:   {len(stubs_promoted)}")
    print(f"  retargeted: {len(stubs_retargeted)}")
    print(f"  kept:       {len(stubs_kept)}")
    print(f"  removed:    {len(stubs_removed)}")

    # Salvage: before removing venue/school stubs, add their names to source-practitioner
    # `exhibitions` or `scene_affiliation` arrays.
    salvaged_exhibitions: dict[str, list[str]] = defaultdict(list)
    salvaged_affiliations: dict[str, list[str]] = defaultdict(list)
    for stub_id in stubs_removed:
        stub_node = node_by_id.get(stub_id)
        if not stub_node:
            continue
        stub_name = (stub_node.get("name") or "").strip()
        if looks_like_venue(stub_name):
            for source in inbound.get(stub_id, set()):
                salvaged_exhibitions[source].append(stub_name)
        elif looks_like_school(stub_name):
            for source in inbound.get(stub_id, set()):
                salvaged_affiliations[source].append(stub_name)

    print(f"  salvaged venues (to exhibitions):  "
          f"{sum(len(v) for v in salvaged_exhibitions.values())} adds across "
          f"{len(salvaged_exhibitions)} practitioners")
    print(f"  salvaged schools (to affiliations): "
          f"{sum(len(v) for v in salvaged_affiliations.values())} adds across "
          f"{len(salvaged_affiliations)} practitioners")

    # --- BUILD NEW NODES ARRAY ---
    new_nodes: list[dict] = []
    profiles_deepened = 0
    flagged_low_conf: list[str] = []
    fields_pass12 = Counter()
    fields_pass3 = Counter()  # "pass 3" here = all deepened (drafts + promotions)

    for n in nodes:
        nid = n["id"]
        t = n.get("type")
        m = metas[nid]

        # Drop known-bogus nodes
        if nid in DROP_NODES:
            continue

        # Skip retargeted stubs — they're dropped from nodes
        if nid in stubs_retargeted:
            continue
        # Skip removed stubs
        if nid in stubs_removed:
            continue

        # Classification regimes: merge old seed regimes, mark placeholders
        if t == "classification_regime":
            if nid in REGIME_OLD_IDS:
                continue  # drop; will add the new single canon regime below
            if nid in PLACEHOLDER_REGIMES:
                new_meta = dict(m)
                new_meta["status"] = "placeholder"
                new_n = dict(n)
                new_n["metadata"] = new_meta
                new_nodes.append(new_n)
                continue
            # any other regime (shouldn't be any): keep as-is
            new_nodes.append(n)
            continue

        # Practitioner handling
        if t == "practitioner":
            # Kept stubs
            if nid in stubs_kept:
                new_meta = {
                    "status": "stub",
                    "source_origin": None,
                    "sub_type": (m.get("original_type") or None),
                    "note": "Preserved as anchor node for INFLUENCES edges; not a digital-arts practitioner.",
                }
                new_n = {
                    "id": nid,
                    "name": n.get("name"),
                    "type": "practitioner",
                    "slug": n.get("slug"),
                    "metadata": new_meta,
                }
                new_nodes.append(new_n)
                continue

            # Promoted stubs (auto_generated, slug in deepening) OR canonical (has full_profile)
            has_fp = m.get("full_profile")
            is_promoted = nid in stubs_promoted
            slug = id_to_slug(nid)
            d_entry = deepening.get(slug)

            if has_fp or is_promoted:
                if has_fp:
                    norm = normalise_confirmed(n, nodes)
                    # Track pass-12 field population (for report)
                    for fname in ("practice_summary", "methodology", "exhibitions",
                                  "scene_affiliation", "medium", "key_works",
                                  "commons_summary", "governance_summary"):
                        v = norm.get(fname)
                        if v:
                            if (isinstance(v, list) and len(v) > 0) or (isinstance(v, str) and v.strip()):
                                fields_pass12[fname] += 1
                else:
                    # Pure promotion: no existing full_profile, everything from deepening
                    norm = {
                        "status": "confirmed",
                        "source_origin": "ai_assisted",
                        "sub_type": None,
                        "active_years": None, "location": None, "wikidata_qid": None, "url": None,
                        "practice_summary": None, "methodology": None,
                        "medium": [], "key_works": [],
                        "exhibitions": [], "scene_affiliation": [],
                        "collaborators": [],
                        "commons_summary": None, "governance_summary": None,
                        "image_url": None, "image_license": None, "image_source": None,
                        "full_profile": None,
                        "data_provenance": None, "original_type": None,
                        "source_file": "stub-promoted", "seed_category": None,
                    }

                # Apply salvaged exhibitions/affiliations BEFORE deepening overlays
                if nid in salvaged_exhibitions:
                    existing = set(norm.get("exhibitions") or [])
                    for ven in salvaged_exhibitions[nid]:
                        if ven not in existing:
                            (norm.setdefault("exhibitions", [])).append(ven)
                            existing.add(ven)
                if nid in salvaged_affiliations:
                    norm["affiliations"] = sorted(set(salvaged_affiliations[nid]))

                if d_entry:
                    norm = apply_deepening(norm, d_entry)
                    if "source_origin" not in d_entry:
                        norm["source_origin"] = "ai_assisted"
                    profiles_deepened += 1
                    # Track pass-3 field population
                    for fname in ("practice_summary", "methodology", "exhibitions",
                                  "scene_affiliation", "medium", "key_works",
                                  "commons_summary", "governance_summary"):
                        v = d_entry.get(fname)
                        if v:
                            if (isinstance(v, list) and len(v) > 0) or (isinstance(v, str) and v.strip()):
                                fields_pass3[fname] += 1
                    if d_entry.get("confidence_note"):
                        flagged_low_conf.append(f"{n.get('name')}: {d_entry['confidence_note']}")

                # Mark status as confirmed
                norm["status"] = "confirmed"

                new_n = {
                    "id": nid,
                    "name": n.get("name"),
                    "type": "practitioner",
                    "slug": n.get("slug"),
                    "metadata": norm,
                }
                new_nodes.append(new_n)
                continue

            # Other auto-generated stub that's not in stubs_promoted/kept/retargeted/removed — shouldn't happen
            # Defensive: skip
            continue

        # Non-practitioner: passthrough as-is
        new_nodes.append(n)

    # Add the new single seed regime
    new_nodes.append(NEW_SEED_REGIME_NODE)

    # --- BUILD NEW EDGES ARRAY ---
    new_edges: list[dict] = []
    root_edges_removed = 0
    regime_edges_retargeted = 0
    stub_edges_removed = 0
    stub_edges_retargeted = 0

    for e in edges:
        s, t = e.get("source_id"), e.get("target_id")
        et = e.get("edge_type")

        # Drop edges touching dropped-bogus nodes
        if s in DROP_NODES or t in DROP_NODES:
            continue

        # Drop A(DAI) root regime edges entirely (root shouldn't be in data but defensive)
        if t == "classification_regime:a(dai)" or s == "classification_regime:a(dai)":
            root_edges_removed += 1
            continue

        # Retarget CLASSIFIED_BY edges from old seed regimes to new single canon regime
        if et == "CLASSIFIED_BY" and t in REGIME_OLD_IDS:
            new_e = dict(e)
            new_e["target_id"] = NEW_SEED_REGIME_ID
            # Update edge id
            new_e["id"] = f"{s}--classified_by--{NEW_SEED_REGIME_ID}"
            new_edges.append(new_e)
            regime_edges_retargeted += 1
            continue

        # Retarget edges touching retargeted stubs
        new_s, new_t = s, t
        if s in stubs_retargeted:
            new_s = stubs_retargeted[s]
            stub_edges_retargeted += 1
        if t in stubs_retargeted:
            new_t = stubs_retargeted[t]
            stub_edges_retargeted += 1

        # Drop edges touching removed stubs
        if new_s in stubs_removed or new_t in stubs_removed:
            stub_edges_removed += 1
            continue

        if (new_s, new_t, et) != (s, t, et):
            new_e = dict(e)
            new_e["source_id"] = new_s
            new_e["target_id"] = new_t
            new_e["id"] = f"{new_s}--{(et or '').lower()}--{new_t}"
            new_edges.append(new_e)
        else:
            new_edges.append(e)

    # Dedupe (same source+target+type)
    seen_keys: set[tuple] = set()
    deduped = []
    dups = 0
    for e in new_edges:
        k = (e.get("source_id"), e.get("target_id"), e.get("edge_type"))
        if k in seen_keys:
            dups += 1
            continue
        seen_keys.add(k)
        deduped.append(e)
    new_edges = deduped

    # --- WRITE OUTPUTS ---
    nodes_out = SEED / "nodes-final.json"
    edges_out = SEED / "edges-final.json"
    nodes_out.write_text(json.dumps(new_nodes, indent=2, ensure_ascii=False))
    edges_out.write_text(json.dumps(new_edges, indent=2, ensure_ascii=False))

    # Count final status
    confirmed_count = sum(1 for n in new_nodes if n.get("type") == "practitioner"
                         and (n.get("metadata") or {}).get("status") == "confirmed")
    stub_count = sum(1 for n in new_nodes if n.get("type") == "practitioner"
                     and (n.get("metadata") or {}).get("status") == "stub")

    # Count node types out
    types_out = Counter(n.get("type") for n in new_nodes)
    edges_out_types = Counter(e.get("edge_type") for e in new_edges)

    report = {
        "generated_at": "2026-04-22",
        "input_files": ["seed/nodes.json", "seed/edges.json"],
        "output_files": ["seed/nodes-final.json", "seed/edges-final.json"],
        "totals": {
            "input_nodes": len(nodes),
            "input_edges": len(edges),
            "output_nodes": len(new_nodes),
            "output_edges": len(new_edges),
        },
        "nodes_by_type_output": dict(types_out),
        "edges_by_type_output": dict(edges_out_types),
        "status_counts": {
            "confirmed": confirmed_count,
            "stub_kept": stub_count,
            "stub_removed_count": len(stubs_removed),
            "stub_retargeted_count": len(stubs_retargeted),
            "stub_promoted_count": len(stubs_promoted),
        },
        "profiles_deepened": {
            "total_deepened": profiles_deepened,
            "flagged_low_confidence": flagged_low_conf,
        },
        "stubs_kept_names": sorted([node_by_id[s].get("name") for s in KEEP_AS_STUB if s in node_by_id]),
        "stubs_promoted_names": sorted([node_by_id[s].get("name") for s in stubs_promoted]),
        "stubs_retargeted": {node_by_id[s].get("name", s): stubs_retargeted[s]
                             for s in stubs_retargeted if s in node_by_id},
        "stubs_removed_names": sorted([node_by_id[s].get("name") for s in stubs_removed]),
        "classification_regimes_merged": {
            "old_regimes_removed": list(REGIME_OLD_IDS),
            "new_single_regime": NEW_SEED_REGIME_ID,
            "regime_edges_retargeted": regime_edges_retargeted,
            "root_edges_removed": root_edges_removed,
            "placeholder_regimes": list(PLACEHOLDER_REGIMES),
        },
        "fields_populated": {
            "pass_1_2_confirmed": dict(fields_pass12),
            "deepened_pass_3_plus_promotions": dict(fields_pass3),
        },
        "edge_processing": {
            "stub_edges_retargeted": stub_edges_retargeted,
            "stub_edges_removed": stub_edges_removed,
            "duplicates_merged_during_normalise": dups,
        },
    }
    (SEED / "normalisation-report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))

    print()
    print("=== Summary ===")
    print(json.dumps(report, indent=2, ensure_ascii=False)[:3000])
    print("...")
    print()
    print(f"Wrote: {nodes_out}")
    print(f"Wrote: {edges_out}")
    print(f"Wrote: {SEED / 'normalisation-report.json'}")


if __name__ == "__main__":
    main()
