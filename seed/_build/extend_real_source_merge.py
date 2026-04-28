#!/usr/bin/env python3
"""
extend_real_source_merge.py — extend the existing real_source_merge_2026-04-28
bundle with three new real-source contributions:

  1. 22 canon practitioners from Wikidata SPARQL (Paul-canon gap closure)
     Source: research/immersive-graph-viz/prototype/additions/tier_1_resolved.json

  2. 5 new scenes (definitional, paul-chapter-aligned)
     Source: research/immersive-graph-viz/prototype/additions/tier_1_api.yaml

  3. ~59 net.art works from Rhizome ArtBase SPARQL (matched by name-normalized
     equality, not substring)
     Source: research/immersive-graph-viz/prototype/additions/rhizome_works.json
             rhizome_matched_practitioners.json

Idempotent: re-running is safe. INSERT OR REPLACE handled at apply-time;
this script dedupes additions against:
  - Existing bundle (insert.nodes by id)
  - Live adai.db (skip if id already exists, unless metadata-merge desired)

Output: real_source_merge_2026-04-28.json (overwritten in place)
        real_source_merge_2026-04-28.summary.md (re-rendered)
"""

from __future__ import annotations

import json
import re
import sqlite3
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

import yaml

HERE = Path(__file__).parent
BUNDLE = HERE / "real_source_merge_2026-04-28.json"
SUMMARY = HERE / "real_source_merge_2026-04-28.summary.md"
ADAI_DB = Path("/Users/aiio/Documents/ADAI/digital-arts-institute/adai.db")

ADDITIONS = Path("/Users/aiio/Documents/ADAI/research/immersive-graph-viz/prototype/additions")
TIER1_JSON = ADDITIONS / "tier_1_resolved.json"
TIER1_YAML = ADDITIONS / "tier_1_api.yaml"
RHIZOME_WORKS = ADDITIONS / "rhizome_works.json"
RHIZOME_PRACT = ADDITIONS / "rhizome_matched_practitioners.json"

WIKIDATA_SIGNAL = "wikidata-practitioners-2026-04-28"
RHIZOME_SIGNAL = "rhizome-artbase-net-art-2026-04-28"
SCENES_SIGNAL = "paul-canon-scenes-2026-04-28"


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9]+", " ", s.lower())
    return re.sub(r"\s+", " ", s).strip()


def adai_existing_ids() -> set[str]:
    if not ADAI_DB.exists():
        return set()
    con = sqlite3.connect(ADAI_DB)
    return {row[0] for row in con.execute("SELECT id FROM nodes")}


def make_practitioner_node(rec: dict) -> dict:
    """Translate Wikidata fetcher output → bundle node shape (matches the
    moma/wikidata pass conventions)."""
    name = rec["name"]
    ntype = rec.get("type", "practitioner")
    nid = f"{ntype}:{slugify(name)}"
    return {
        "id": nid,
        "name": name,
        "type": ntype,
        "slug": slugify(name),
        "metadata": {
            "status": "confirmed",
            "source_origin": "human_secondary",
            "confidence": "medium",
            "wikidata_qid": rec["wikidata_qid"],
            "wikidata_url": rec["wikidata_url"],
            "description": rec.get("description"),
            "date_of_birth": rec.get("date_of_birth"),
            "date_of_death": rec.get("date_of_death"),
            "nationalities": rec.get("nationalities") or [],
            "occupations": rec.get("occupations") or [],
            "image_url": rec.get("image_url"),
            "image_source": "wikimedia_commons" if rec.get("image_url") else None,
            "image_license": "Wikimedia Commons (verify per file)",
            "external_ids": rec.get("external_ids") or {},
            "scenes": rec.get("scenes") or [],
            "role": rec.get("role"),
            "data_provenance": {
                "source": "wikidata-sparql-2026-04-28",
                "endpoint": "https://query.wikidata.org/sparql",
                "method": "wikidata_sparql_batch",
                "trust_tier": "human_secondary",
                "fetched_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
            },
        },
    }


def make_scene_node(scene: dict) -> dict:
    return {
        "id": scene["id"],
        "name": scene["name"],
        "type": "scene",
        "slug": slugify(scene["name"]),
        "metadata": {
            "status": "confirmed",
            "source_origin": "human_secondary",
            "confidence": "high",
            "description": scene.get("description"),
            "paul_chapter": scene.get("paul_chapter"),
            "data_provenance": {
                "source": "paul-canon-2026-04-28",
                "method": "editorial_definition",
                "trust_tier": "human_secondary",
                "reference": "Christiane Paul, Digital Art (Thames & Hudson, 4th ed. 2023)",
            },
        },
    }


def make_belongs_to_edge(practitioner_id: str, scene_id: str, signal: str) -> dict:
    return {
        "id": f"{practitioner_id}--belongs_to--{scene_id}",
        "source_id": practitioner_id,
        "target_id": scene_id,
        "edge_type": "BELONGS_TO",
        "confidence": "high",
        "signal_id": signal,
        "created_by": "gatherer-paul-canon-v1",
        "source_evidence": "Scene assignment from tier_1_api.yaml (Paul chapter mapping)",
    }


def make_rhizome_artwork_node(work: dict) -> dict:
    title = work["name"]
    aid = f"artwork:{slugify(title)}"
    return {
        "id": aid,
        "name": title,
        "type": "artwork",
        "slug": slugify(title),
        "metadata": {
            "status": "confirmed",
            "source_origin": "human_secondary",
            "confidence": "medium",
            "year": work.get("year"),
            "year_start": work.get("year"),
            "creator_id": work.get("creator_adai_id"),
            "image_url": work.get("image_url"),
            "image_source": "rhizome_artbase",
            "image_license": "Rhizome ArtBase preserved file — verify per work",
            "rhizome_artbase_uri": work["rhizome_artbase_uri"],
            "data_provenance": {
                "source": "rhizome-artbase-sparql-2026-04-28",
                "endpoint": "https://query.artbase.rhizome.org/proxy/wdqs/bigdata/namespace/wdq/sparql",
                "method": "rhizome_sparql_name_match",
                "match_method": "name_normalized_exact",
                "trust_tier": "human_secondary",
            },
        },
    }


def make_created_by_edge(artwork_id: str, practitioner_id: str, signal: str, evidence: str) -> dict:
    return {
        "id": f"{artwork_id}--created_by--{practitioner_id}",
        "source_id": artwork_id,
        "target_id": practitioner_id,
        "edge_type": "CREATED_BY",
        "confidence": "high",
        "signal_id": signal,
        "created_by": "gatherer-rhizome-artbase-v1",
        "source_evidence": evidence,
    }


def main():
    if not BUNDLE.exists():
        print(f"missing bundle: {BUNDLE}", file=sys.stderr)
        sys.exit(1)

    bundle = json.loads(BUNDLE.read_text())
    existing_node_ids = {n["id"] for n in bundle["insert"]["nodes"]}
    existing_edge_ids = {e["id"] for e in bundle["insert"]["edges"]}
    db_node_ids = adai_existing_ids()
    print(f"Bundle currently has {len(existing_node_ids)} insert.nodes, "
          f"{len(existing_edge_ids)} insert.edges, "
          f"{len(bundle['delete']['edges'])} delete.edges")
    print(f"Live db has {len(db_node_ids)} nodes\n")

    new_nodes: list[dict] = []
    new_edges: list[dict] = []
    skipped = []

    # ---------- 1. New scenes ----------
    print("Adding scenes...")
    spec = yaml.safe_load(TIER1_YAML.read_text())
    for s in spec.get("scenes", []):
        node = make_scene_node(s)
        if node["id"] in existing_node_ids or node["id"] in db_node_ids:
            skipped.append(("scene", node["id"], "already present"))
            continue
        new_nodes.append(node)
        existing_node_ids.add(node["id"])
        print(f"  + {node['id']}")

    # ---------- 2. Wikidata practitioners ----------
    print("\nAdding Wikidata practitioners...")
    pract_records = json.loads(TIER1_JSON.read_text())
    # bring scenes from the YAML (linked by q_id) onto each record
    by_qid = {p["q_id"]: p for p in spec.get("practitioners", []) if isinstance(p, dict) and p.get("q_id")}
    for rec in pract_records:
        meta_spec = by_qid.get(rec["wikidata_qid"], {})
        rec["scenes"] = meta_spec.get("scenes") or []
        rec["role"] = meta_spec.get("role")
        rec["type"] = meta_spec.get("type", "practitioner")
        node = make_practitioner_node(rec)
        if node["id"] in existing_node_ids or node["id"] in db_node_ids:
            skipped.append(("practitioner", node["id"], "already present"))
            continue
        new_nodes.append(node)
        existing_node_ids.add(node["id"])
        print(f"  + {node['id']}  ({rec['wikidata_qid']})")

        for scene_name in rec["scenes"]:
            scene_id = f"scene:{scene_name}"
            edge = make_belongs_to_edge(node["id"], scene_id, WIKIDATA_SIGNAL)
            if edge["id"] in existing_edge_ids:
                continue
            new_edges.append(edge)
            existing_edge_ids.add(edge["id"])

    # ---------- 3. Rhizome works ----------
    print("\nAdding Rhizome ArtBase works...")
    works = json.loads(RHIZOME_WORKS.read_text())
    matched = json.loads(RHIZOME_PRACT.read_text())
    matched_lookup = {m["artbase_uri"]: m["adai_id"] for m in matched.get("matched", [])}

    rhizome_works_added = 0
    rhizome_edges_added = 0
    for w in works:
        creator_adai_id = w.get("creator_adai_id") or matched_lookup.get(w.get("creator_artbase_uri"))
        if not creator_adai_id:
            skipped.append(("artwork", w["name"], "no creator_adai_id"))
            continue
        node = make_rhizome_artwork_node(w)
        node["metadata"]["creator_id"] = creator_adai_id
        if node["id"] in existing_node_ids:
            skipped.append(("artwork", node["id"], "already in bundle"))
            continue
        if node["id"] in db_node_ids:
            skipped.append(("artwork", node["id"], "already in adai.db"))
            continue
        new_nodes.append(node)
        existing_node_ids.add(node["id"])
        rhizome_works_added += 1

        edge = make_created_by_edge(
            node["id"],
            creator_adai_id,
            RHIZOME_SIGNAL,
            f"Rhizome ArtBase {w['rhizome_artbase_uri']} P29 (artist) → {creator_adai_id}",
        )
        if edge["id"] not in existing_edge_ids:
            new_edges.append(edge)
            existing_edge_ids.add(edge["id"])
            rhizome_edges_added += 1

    print(f"  added {rhizome_works_added} works, {rhizome_edges_added} CREATED_BY edges")

    # ---------- Merge into bundle ----------
    bundle["insert"]["nodes"].extend(new_nodes)
    bundle["insert"]["edges"].extend(new_edges)

    # Update stats
    bundle["stats"]["per_source"][WIKIDATA_SIGNAL] = {
        "nodes": sum(1 for n in new_nodes if n["type"] in ("practitioner", "collective")),
        "edges": sum(1 for e in new_edges if e["signal_id"] == WIKIDATA_SIGNAL),
    }
    bundle["stats"]["per_source"][SCENES_SIGNAL] = {
        "nodes": sum(1 for n in new_nodes if n["type"] == "scene"),
        "edges": 0,
    }
    bundle["stats"]["per_source"][RHIZOME_SIGNAL] = {
        "nodes": sum(1 for n in new_nodes if n["type"] == "artwork" and "rhizome_artbase_uri" in n.get("metadata", {})),
        "edges": rhizome_edges_added,
    }
    bundle["stats"]["insert_total_edges"] = len(bundle["insert"]["edges"])
    bundle["stats"]["insert_artworks"] = sum(1 for n in bundle["insert"]["nodes"] if n["type"] == "artwork")
    bundle["stats"]["insert_artworks_with_images"] = sum(
        1 for n in bundle["insert"]["nodes"]
        if n["type"] == "artwork" and (n.get("metadata") or {}).get("image_url")
    )
    bundle["stats"]["insert_practitioners"] = sum(1 for n in bundle["insert"]["nodes"] if n["type"] in ("practitioner", "collective"))
    bundle["stats"]["insert_scenes"] = sum(1 for n in bundle["insert"]["nodes"] if n["type"] == "scene")
    bundle["stats"]["insert_belongs_to"] = sum(1 for e in bundle["insert"]["edges"] if e["edge_type"] == "BELONGS_TO")
    bundle["stats"]["insert_created_by"] = sum(1 for e in bundle["insert"]["edges"] if e["edge_type"] == "CREATED_BY")

    bundle["method_note"] = (
        bundle.get("method_note", "")
        + " Extended 2026-04-28 with Wikidata practitioner canon (22 names, "
          "Paul-canon gap closure), 5 new scenes (Paul chapters), and "
          "Rhizome ArtBase net.art works (name-normalized exact match)."
    )
    bundle["generated_at"] = datetime.utcnow().isoformat(timespec="seconds") + "Z"

    BUNDLE.write_text(json.dumps(bundle, indent=2, ensure_ascii=False))
    print(f"\nBundle now: {len(bundle['insert']['nodes'])} insert.nodes, "
          f"{len(bundle['insert']['edges'])} insert.edges")
    print(f"Skipped (already present): {len(skipped)}")
    for kind, ident, reason in skipped[:10]:
        print(f"  - {kind} {ident} — {reason}")
    if len(skipped) > 10:
        print(f"  - … {len(skipped) - 10} more")
    print(f"\nWrote {BUNDLE}")

    # Re-render summary
    s = bundle["stats"]
    summary_lines = [
        f"# Real-source merge — {bundle['generated_at'][:10]}",
        "",
        f"Bundle: `{BUNDLE.name}`. Idempotent.",
        "",
        "## Inserts",
        "",
        f"- **{s.get('insert_practitioners', 0)}** new practitioners/collectives "
        f"(of which {sum(1 for n in bundle['insert']['nodes'] if n['type'] in ('practitioner','collective') and (n.get('metadata') or {}).get('image_url'))} carry image URLs)",
        f"- **{s.get('insert_scenes', 0)}** new scenes (Paul-chapter-aligned)",
        f"- **{s.get('insert_artworks', 0)}** new artworks "
        f"({s.get('insert_artworks_with_images', 0)} with image URLs)",
        f"- **{s.get('insert_concepts', 0)}** new concepts",
        f"- **{s.get('insert_total_edges', 0)}** new edges total",
        f"  - {s.get('insert_created_by', 0)} CREATED_BY",
        f"  - {s.get('insert_embodies', 0)} EMBODIES",
        f"  - {s.get('insert_belongs_to', 0)} BELONGS_TO",
        f"  - {s.get('insert_uses_technique', 0)} USES_TECHNIQUE",
        f"  - {s.get('insert_exhibited_at', 0)} EXHIBITED_AT",
        "",
        "## Deletes",
        "",
        f"- **{s.get('delete_heuristic_embodies', 0)}** heuristic-keyword EMBODIES edges "
        f"(per editorial:heuristic-embodies-scaffolding)",
        "",
        "## Per-source contributions",
        "",
    ]
    for src, counts in s.get("per_source", {}).items():
        summary_lines.append(f"- `{src}`: {counts['nodes']} nodes, {counts['edges']} edges")
    summary_lines.append("")
    summary_lines.append("## Apply")
    summary_lines.append("")
    summary_lines.append("`python3 apply_real_source_merge.py` (or run via seed-consolidated.ts deploy path).")
    summary_lines.append("")
    SUMMARY.write_text("\n".join(summary_lines))
    print(f"Wrote {SUMMARY}")


if __name__ == "__main__":
    main()
