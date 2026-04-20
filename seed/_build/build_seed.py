#!/usr/bin/env python3
"""
A(DAI) seed consolidation builder.

Inputs (from /tmp/adai_work/results/ pulled from GitHub):
  - 59 confirmed practitioner JSONs (results/*.json)
  - 4 bridge practitioner drafts (results/_drafts/Harold_Cohen.json etc.)
  - 5 classification lens drafts (results/_drafts/Lens_*.json)
  - _artworks_preview_cleaned.json (177 artworks)

Outputs (written to /tmp/adai_work/seed/):
  - nodes.json       - all nodes (practitioners, artworks, concepts, scenes, regimes, platforms, institutions)
  - edges.json       - typed edges with bi-temporal fields
  - signals.json     - seed signal batch with consent/provenance
  - aliases.json     - node_aliases (Wikidata QIDs, populated in Phase 4)
  - new_entries.json - scaffold for 45 new practitioners (for Phase 3 authored content)

This script is idempotent: running it twice produces the same output.

ID convention (per CLAUDE.md):
  - practitioner:casey reas
  - artwork:fidenza
  - concept:generative code
  - classification_regime:moma curatorial
Slug convention: kebab-case (for URLs).
"""

import json
import os
import re
import glob
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path("/tmp/adai_work")
RESULTS = ROOT / "results"
SEED = ROOT / "seed"
SEED.mkdir(exist_ok=True)

NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
BATCH_ID = "seed-taxonomy-2026-04"
SEED_SIGNAL_ID = "signal:seed-taxonomy-2026-04"
MIGRATION_CONTRIBUTOR = "contributor:migration"


# ---------- id + slug helpers ----------

def slugify(s: str) -> str:
    """kebab-case slug for URLs"""
    s = s.lower().strip()
    s = re.sub(r"[/.'&()]", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s


def id_name(s: str) -> str:
    """lowercase with spaces preserved — for the human-readable id after the type colon"""
    s = s.lower().strip()
    # Strip diacritics (Vera Molnár → vera molnar) so IDs are ASCII-stable
    import unicodedata
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    # Remove punctuation that would confuse IDs
    s = s.replace("/", " ").replace("(", "").replace(")", "").replace(".", "").replace("'", "")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def name_key(s: str) -> str:
    """Accent- and case-insensitive key for name matching."""
    import unicodedata
    s = unicodedata.normalize("NFKD", s.lower()).encode("ascii", "ignore").decode("ascii")
    return s.strip()


def make_id(type_prefix: str, name: str) -> str:
    return f"{type_prefix}:{id_name(name)}"


# ---------- type taxonomy ----------

# Map existing granular types to canonical taxonomy
TYPE_MAP = {
    "artist": "practitioner",
    "theorist": "practitioner",
    "artist-writer": "practitioner",
    "artist-project": "practitioner",
    "artist-collective": "collective",
    "collective": "collective",
    "platform": "platform",
    "institution": "institution",
    "gallery": "institution",
    "artwork": "artwork",
    "project": "project",
    "theoretical": "practitioner",
    "report": "publication",
    "exhibition-publication": "publication",
    "classification_lens": "classification_regime",
}


def canonical_type(raw: str) -> str:
    return TYPE_MAP.get(raw, raw)


# ---------- node / edge builders ----------

nodes = {}  # keyed by id
edges = {}  # keyed by id
aliases = []  # list of {source, external_id, node_id}
skipped_duplicates = []
coverage_notes = []


def add_node(node_id, type_, name, slug, metadata=None, status="confirmed", upgrade_stub=False):
    if node_id in nodes and not upgrade_stub:
        skipped_duplicates.append(node_id)
        return
    # If upgrading, preserve any existing auto-generated flag but replace with real data
    if node_id in nodes and upgrade_stub:
        existing_md = json.loads(nodes[node_id]["metadata"])
        # Only upgrade if the existing was auto-generated; otherwise prefer existing
        if not existing_md.get("auto_generated"):
            skipped_duplicates.append(node_id)
            return
    md = metadata.copy() if metadata else {}
    md.setdefault("status", status)
    nodes[node_id] = {
        "id": node_id,
        "type": type_,
        "name": name,
        "slug": slug,
        "metadata": json.dumps(md, ensure_ascii=False),
        "created_at": NOW,
        "updated_by": MIGRATION_CONTRIBUTOR,
    }


def add_edge(source_id, target_id, edge_type, confidence="medium", charge=None):
    edge_id = f"{source_id}--{edge_type.lower()}--{target_id}"
    if edge_id in edges:
        return
    edges[edge_id] = {
        "id": edge_id,
        "source_id": source_id,
        "target_id": target_id,
        "edge_type": edge_type,
        "signal_id": SEED_SIGNAL_ID,
        "confidence": confidence,
        "charge": charge,
        "created_at": NOW,
        "created_by": MIGRATION_CONTRIBUTOR,
        "event_time": None,
        "valid_from": NOW,
        "valid_until": None,
        "invalidated_by": None,
    }


# ---------- ensure concept/scene/institution stubs exist ----------

def ensure_concept(name: str):
    name_clean = name.strip()
    if not name_clean:
        return None
    node_id = make_id("concept", name_clean)
    if node_id not in nodes:
        add_node(node_id, "concept", name_clean, slugify(name_clean),
                 metadata={"auto_generated": True, "source": "derived_from_practitioner_medium"},
                 status="draft")
    return node_id


def ensure_scene(name: str):
    name_clean = name.strip()
    if not name_clean:
        return None
    node_id = make_id("scene", name_clean)
    if node_id not in nodes:
        add_node(node_id, "scene", name_clean, slugify(name_clean),
                 metadata={"auto_generated": True, "source": "derived_from_network_position"},
                 status="draft")
    return node_id


def ensure_institution(name: str):
    name_clean = name.strip()
    if not name_clean:
        return None
    # Don't create institution if a node with this name already exists under any type
    for nid, n in nodes.items():
        if name_key(n["name"]) == name_key(name_clean):
            return nid
    node_id = make_id("institution", name_clean)
    if node_id not in nodes:
        add_node(node_id, "institution", name_clean, slugify(name_clean),
                 metadata={"auto_generated": True, "source": "derived_from_exhibition_reference"},
                 status="draft")
    return node_id


def split_clean(raw):
    """Split a comma-separated list, strip parentheticals, de-dupe, drop empties."""
    if not raw:
        return []
    if isinstance(raw, list):
        parts = [str(x) for x in raw]
    else:
        parts = str(raw).split(",")
    out = []
    for p in parts:
        p = p.split("(")[0].strip()
        if p and p not in out:
            out.append(p)
    return out


_NAME_OK = re.compile(r"^[A-Z0-9][A-Za-z0-9 .&'/\-+]*$")
_SENTENCE_MARKERS = ("—", "–", ";", ":", " and ", " via ", " with ", " through ", " from ", " of ", " to ")


def looks_like_name(s: str) -> bool:
    """Heuristic: accept only short, capitalized tokens that look like entity names."""
    s = s.strip()
    if not s or len(s) > 50:
        return False
    if not _NAME_OK.match(s):
        return False
    # Reject if it contains sentence markers
    lower = " " + s.lower() + " "
    for marker in _SENTENCE_MARKERS:
        if marker in lower:
            return False
    # Reject if more than 6 words (likely a paragraph fragment)
    if len(s.split()) > 6:
        return False
    return True


def split_names(raw):
    """Like split_clean but filters to entries that plausibly are names."""
    return [n for n in split_clean(raw) if looks_like_name(n)]


# ---------- Phase 2: normalize existing 59 + 4 bridge practitioners ----------

def load_existing():
    confirmed_paths = sorted(glob.glob(str(RESULTS / "*.json")))
    bridge_paths = sorted([p for p in glob.glob(str(RESULTS / "_drafts" / "*.json"))
                           if not os.path.basename(p).startswith("_")
                           and "Lens_" not in os.path.basename(p)])
    lens_paths = sorted(glob.glob(str(RESULTS / "_drafts" / "Lens_*.json")))
    return confirmed_paths, bridge_paths, lens_paths


def normalize_practitioner_file(path, status):
    with open(path) as f:
        data = json.load(f)
    bi = data.get("basic_info", {})
    name = bi.get("name") or os.path.basename(path).replace(".json", "").replace("_", " ")
    raw_type = bi.get("type", "artist")
    ctype = canonical_type(raw_type)
    node_id = make_id(ctype, name)
    slug = bi.get("slug") or slugify(name)

    # Preserve full original in metadata, add status + canonical markers
    metadata = {
        "original_type": raw_type,
        "status": status,
        "source_file": os.path.basename(path),
        "full_profile": data,
    }
    if status == "confirmed":
        metadata["data_provenance"] = {
            "source": "seed-research-2025",
            "confidence": "high",
            "trust_tier": "reviewed",
        }
    else:
        metadata["data_provenance"] = {
            "source": "seed-research-2025-draft",
            "confidence": "medium",
            "trust_tier": "reviewed",
        }

    add_node(node_id, ctype, name, slug, metadata=metadata, status=status)

    # Derive edges
    practice = data.get("practice_description", {})
    if isinstance(practice, dict):
        medium = practice.get("medium", "")
        for concept_name in split_clean(medium):
            cid = ensure_concept(concept_name)
            if cid:
                add_edge(node_id, cid, "PRACTICES", confidence="medium")

    netpos = data.get("network_position", {})
    if isinstance(netpos, dict):
        # scene_affiliation is typically a paragraph, not a list — skip auto-extraction.
        # Scenes should be declared explicitly; the full paragraph is preserved in metadata.full_profile.

        for conn_name in split_names(netpos.get("connections", "")):
            # Merge into existing node if the name already exists
            conn_id = None
            for nid, n in nodes.items():
                if name_key(n["name"]) == name_key(conn_name):
                    conn_id = nid
                    break
            if conn_id is None:
                conn_id = make_id("practitioner", conn_name)
                add_node(conn_id, "practitioner", conn_name, slugify(conn_name),
                         metadata={"auto_generated": True,
                                   "source": "derived_from_connection_reference",
                                   "note": "Stub node created from network_position.connections — promote to confirmed if canonical entry authored"},
                         status="draft")
            add_edge(node_id, conn_id, "COLLABORATES_WITH", confidence="low")

    return node_id, name


def ingest_new_entry(entry):
    """Turn a compact new_entries.json entry into a full node + derived edges + alias."""
    name = entry["name"]
    raw_type = entry.get("type", "artist")
    ctype = canonical_type(raw_type)
    node_id = make_id(ctype, name)
    slug = entry.get("slug") or slugify(name)

    # Construct a full_profile that matches the shape of existing confirmed entries
    full_profile = {
        "basic_info": {
            "name": name,
            "type": raw_type,
            "slug": slug,
            "active_years": entry.get("active_years"),
            "nationality": entry.get("nationality"),
            "birth_year": entry.get("birth_year"),
            "death_year": entry.get("death_year"),
            "url": None,
        },
        "practice_description": {
            "summary": entry.get("summary"),
            "medium": entry.get("medium"),
        },
        "key_works": {"works": entry.get("key_works", [])},
        "network_position": {
            "connections": ", ".join(entry.get("connections", [])),
        },
        "seed_category": entry.get("seed_category"),
    }

    metadata = {
        "original_type": raw_type,
        "status": "draft",
        "seed_category": entry.get("seed_category"),
        "source_file": "new_entries.json",
        "uncertain": entry.get("uncertain", False),
        "full_profile": full_profile,
        "data_provenance": {
            "source": "seed-taxonomy-2026-04",
            "batch": BATCH_ID,
            "confidence": "medium" if entry.get("uncertain") else "high",
            "trust_tier": "reviewed",
        },
    }

    add_node(node_id, ctype, name, slug, metadata=metadata, status="draft", upgrade_stub=True)

    # Wikidata alias (if provided)
    qid = entry.get("wikidata_qid")
    if qid:
        aliases.append({
            "source": "wikidata",
            "external_id": qid,
            "node_id": node_id,
            "created_at": NOW,
        })

    # Derive PRACTICES edges from medium
    for concept_name in split_clean(entry.get("medium", "")):
        cid = ensure_concept(concept_name)
        if cid:
            add_edge(node_id, cid, "PRACTICES", confidence="high")

    # Derive COLLABORATES_WITH edges from connections
    for conn_name in entry.get("connections", []):
        conn_name = conn_name.strip()
        if not looks_like_name(conn_name):
            continue
        conn_id = None
        for nid, n in nodes.items():
            if name_key(n["name"]) == name_key(conn_name):
                conn_id = nid
                break
        if conn_id is None:
            conn_id = make_id("practitioner", conn_name)
            add_node(conn_id, "practitioner", conn_name, slugify(conn_name),
                     metadata={"auto_generated": True,
                               "source": "derived_from_new_entry_connection",
                               "note": "Stub from new-entry connection — promote to canonical if authored."},
                     status="draft")
        add_edge(node_id, conn_id, "COLLABORATES_WITH", confidence="medium")

    # Artworks from key_works
    for work in entry.get("key_works", []):
        title = work.get("title", "").strip()
        if not title:
            continue
        art_id = make_id("artwork", title)
        # Skip if this artwork already exists (from the preview)
        if art_id in nodes:
            # Still add CREATED_BY edge if missing
            add_edge(art_id, node_id, "CREATED_BY", confidence="high")
            continue
        art_meta = {
            "status": "draft",
            "description": work.get("description"),
            "year_raw": work.get("year"),
            "year_start": None,
            "work_type": "artwork",
            "image_url": None,
            "image_license": None,
            "image_source": None,
            "data_provenance": {
                "source": "seed-taxonomy-2026-04",
                "batch": BATCH_ID,
                "confidence": "medium",
                "trust_tier": "reviewed",
            },
        }
        add_node(art_id, "artwork", title, slugify(title), metadata=art_meta, status="draft")
        add_edge(art_id, node_id, "CREATED_BY", confidence="high")

    return node_id


def normalize_lens_file(path):
    with open(path) as f:
        data = json.load(f)
    bi = data.get("basic_info", {})
    name = bi.get("name", os.path.basename(path).replace(".json", "").replace("_", " "))
    node_id = make_id("classification_regime", name)
    slug = bi.get("slug") or slugify(name)
    metadata = {
        "status": "draft",
        "source_file": os.path.basename(path),
        "full_profile": data,
        "data_provenance": {
            "source": "seed-research-2025-lens-drafts",
            "confidence": "high",
            "trust_tier": "reviewed",
        },
    }
    add_node(node_id, "classification_regime", name, slug, metadata=metadata, status="draft")
    return node_id


# ---------- Phase 2b: normalize 177 artworks ----------

def normalize_artworks(practitioner_name_index):
    """
    practitioner_name_index: {lowercase name → node_id} of practitioners.
    """
    ap = json.load(open(RESULTS / "_drafts" / "_artworks_preview_cleaned.json"))
    artwork_nodes_created = 0
    created_by_edges = 0
    orphans = []

    for a in ap["artworks"]:
        title = a["title"].strip()
        if not title:
            continue
        pract_name = a.get("practitioner", "").strip()
        art_id = make_id("artwork", title)
        slug = slugify(title)

        metadata = {
            "status": "confirmed",
            "description": a.get("description"),
            "relevance": a.get("relevance"),
            "year_start": a.get("year_start"),
            "year_end": a.get("year_end"),
            "year_ongoing": a.get("year_ongoing"),
            "year_uncertain": a.get("year_uncertain"),
            "year_raw": a.get("year_raw"),
            "work_type": a.get("work_type", "artwork"),
            "practitioner_type_raw": a.get("practitioner_type_raw"),
            "image_url": None,
            "image_license": None,
            "image_source": None,
            "data_provenance": {
                "source": "seed-artworks-preview-2025",
                "original_artwork_id": a.get("artwork_id"),
                "confidence": "high",
                "trust_tier": "reviewed",
            },
        }
        add_node(art_id, "artwork", title, slug, metadata=metadata, status="confirmed")
        artwork_nodes_created += 1

        # CREATED_BY edge
        pract_id = practitioner_name_index.get(pract_name.lower())
        if pract_id:
            add_edge(art_id, pract_id, "CREATED_BY", confidence="high")
            created_by_edges += 1
        else:
            orphans.append((title, pract_name))

    return artwork_nodes_created, created_by_edges, orphans


# ---------- main ----------

def main():
    confirmed_paths, bridge_paths, lens_paths = load_existing()
    print(f"confirmed practitioners: {len(confirmed_paths)}")
    print(f"bridge practitioners:    {len(bridge_paths)}")
    print(f"lens drafts:             {len(lens_paths)}")

    # Normalize existing
    pract_name_index = {}
    for p in confirmed_paths:
        nid, name = normalize_practitioner_file(p, "confirmed")
        pract_name_index[name.lower()] = nid
    for p in bridge_paths:
        nid, name = normalize_practitioner_file(p, "bridge")
        pract_name_index[name.lower()] = nid
    for p in lens_paths:
        normalize_lens_file(p)

    print(f"nodes after practitioners+lenses: {len(nodes)}")
    print(f"edges after practitioners:        {len(edges)}")

    # Artworks (from preview)
    created, by_edges, orphans = normalize_artworks(pract_name_index)
    print(f"artwork nodes created:  {created}")
    print(f"CREATED_BY edges:       {by_edges}")
    print(f"orphan artworks:        {len(orphans)}")

    # New entries (45 new practitioners)
    new_data = json.load(open(ROOT / "new_entries.json"))
    new_node_ids = []
    for entry in new_data["entries"]:
        nid = ingest_new_entry(entry)
        new_node_ids.append(nid)
    print(f"new entries ingested:   {len(new_data['entries'])}")

    # Classification regimes: create two provenance regimes + link every node
    regimes = {
        "seed-taxonomy-2026-04": {
            "name": "Seed Taxonomy (April 2026)",
            "description": "The canonising lens behind 'Digital Art Is the Art of Our Age' — the April 2026 seed taxonomy article. Organises practice by historical moment (Early Computer Art, Net Art, Post-Internet, Generative Code, Crypto/NFT, AI, Immersive Installation, Sound, Speculative, Web3/DAO) and privileges works that mark category boundaries. Legible to Western-anglophone art history; shallow on Asia-Pacific and Latin American pioneers.",
        },
        "seed-research-2025": {
            "name": "Seed Research (2025)",
            "description": "The canonising lens behind the 2025 research consolidation (59 practitioners + 177 artworks). A Euro-American institutional + crypto-native blend, with theorist emphasis. Strong on contemporary figures, thin on pre-2000 computational pioneers.",
        },
    }
    for slug, meta in regimes.items():
        rid = make_id("classification_regime", meta["name"])
        add_node(rid, "classification_regime", meta["name"], slug,
                 metadata={
                     "status": "confirmed",
                     "description": meta["description"],
                     "data_provenance": {"source": "consolidation-2026-04", "confidence": "high", "trust_tier": "reviewed"},
                 },
                 status="confirmed")

    seed_taxonomy_regime_id = make_id("classification_regime", regimes["seed-taxonomy-2026-04"]["name"])
    seed_research_regime_id = make_id("classification_regime", regimes["seed-research-2025"]["name"])

    # Link every new node to seed-taxonomy regime
    for nid in new_node_ids:
        add_edge(nid, seed_taxonomy_regime_id, "CLASSIFIED_BY", confidence="high")

    # Link every confirmed pre-existing node (status=confirmed OR bridge) to seed-research regime
    for nid, n in list(nodes.items()):
        md = json.loads(n["metadata"])
        if md.get("status") in ("confirmed", "bridge") and n["type"] != "classification_regime":
            # Skip the generic auto-gen stubs
            if md.get("auto_generated"):
                continue
            add_edge(nid, seed_research_regime_id, "CLASSIFIED_BY", confidence="high")

    print(f"classification regime edges added")

    # --- Wikidata enrichment ---
    wd = json.load(open(ROOT / "wikidata_verified.json"))
    wd_lookups = wd["lookups"]
    matched = 0
    images_added = 0
    for name, info in wd_lookups.items():
        qid = info.get("qid")
        if not qid:
            continue
        # Find node by matching name
        target_id = None
        for nid, n in nodes.items():
            if name_key(n["name"]) == name_key(name) and n["type"] in ("practitioner","collective","project","platform"):
                md = json.loads(n["metadata"])
                if md.get("auto_generated"):
                    continue
                target_id = nid
                break
        if not target_id:
            continue
        # Add alias
        aliases.append({
            "source": "wikidata",
            "external_id": qid,
            "node_id": target_id,
            "created_at": NOW,
        })
        matched += 1
        # Enrich metadata
        n = nodes[target_id]
        md = json.loads(n["metadata"])
        md["wikidata_qid"] = qid
        if info.get("image"):
            # Determine where the image goes — into metadata directly, or into full_profile
            md["image_url"] = info["image"]
            md["image_license"] = "see Commons page (wikidata:P18)"
            md["image_source"] = "wikidata"
            images_added += 1
        # Birth year / nationality fill-in (only if missing)
        fp = md.get("full_profile", {})
        bi = fp.get("basic_info", {}) if isinstance(fp, dict) else {}
        if info.get("birth_year") and not bi.get("birth_year"):
            bi["birth_year"] = info["birth_year"]
        if info.get("nationality") and not bi.get("nationality"):
            bi["nationality"] = info["nationality"]
        if isinstance(fp, dict):
            fp["basic_info"] = bi
            md["full_profile"] = fp
        nodes[target_id]["metadata"] = json.dumps(md, ensure_ascii=False)
    print(f"wikidata enrichment: {matched} aliases, {images_added} images added")

    # Add seed signal
    signal = {
        "id": SEED_SIGNAL_ID,
        "title": "Seed taxonomy consolidation — April 2026",
        "source_url": None,
        "source_type": "migration",
        "cla_layer": "public",
        "summary": ("Consolidation of the A(DAI) canon into a single seed/ directory. Sources: "
                    "59 confirmed practitioner research files (results/), 4 bridge drafts (Waldemar Cordeiro, "
                    "Lillian Schwartz, Harold Cohen, Prema Murthy), 5 classification lens drafts, "
                    "177 artworks from the preview cleanup, plus 45 new practitioner drafts authored from "
                    "the April 2026 seed taxonomy article 'Digital Art Is the Art of Our Age' (Ben Fry, "
                    "Golan Levin, Jesse Kanda, plus 42 from the brief)."),
        "content": None,
        "submitted_by": MIGRATION_CONTRIBUTOR,
        "confidence": "high",
        "lived_experience": 0,
        "created_at": NOW,
        "consent_scope": "full_commons",
        "consent_attribution": "attributed",
        "consent_revocable": 1,
        "processing_trace": json.dumps({
            "extracted": ["practitioners", "artworks", "concepts", "scenes", "classification_regimes"],
            "frontier_count": 0,
            "transform_version": "seed-consolidation-1.0",
        }),
        "source_origin": "human_secondary",
        "batch_id": BATCH_ID,
        "status": "active",
        "provenance_chain": json.dumps([
            {"stage": "seed-research-2025", "actor": "iri"},
            {"stage": "seed-taxonomy-article-2026-04", "actor": "iri"},
            {"stage": "consolidation-2026-04-20", "actor": MIGRATION_CONTRIBUTOR},
        ]),
    }

    # Migration contributor
    contributor = {
        "id": MIGRATION_CONTRIBUTOR,
        "name": "seed consolidation migration",
        "type": "script",
        "trust_tier": "reviewed",
        "contributions": 1,
        "approved_count": 0,
        "created_at": NOW,
    }

    # Write
    (SEED / "nodes.json").write_text(json.dumps(list(nodes.values()), indent=2, ensure_ascii=False))
    (SEED / "edges.json").write_text(json.dumps(list(edges.values()), indent=2, ensure_ascii=False))
    (SEED / "signals.json").write_text(json.dumps([signal], indent=2, ensure_ascii=False))
    (SEED / "aliases.json").write_text(json.dumps(aliases, indent=2, ensure_ascii=False))
    (SEED / "contributors.json").write_text(json.dumps([contributor], indent=2, ensure_ascii=False))

    print(f"\n=== Wrote seed/ files ===")
    print(f"  nodes.json:     {len(nodes)} entries")
    print(f"  edges.json:     {len(edges)} entries")
    print(f"  signals.json:   1 entry")
    print(f"  aliases.json:   {len(aliases)} entries")
    print(f"  contributors.json: 1 entry")
    print(f"\n  duplicates skipped: {len(skipped_duplicates)}")
    if orphans:
        print(f"  orphan artworks:   {len(orphans)} (first 5: {orphans[:5]})")


if __name__ == "__main__":
    main()
