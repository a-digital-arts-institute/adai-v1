"""
Apply key_works_promotions.json to nodes-final.json and edges-final.json:
 - overlay key_works arrays onto the 29 promoted practitioners
 - create corresponding artwork nodes (type: artwork)
 - create CREATED_BY edges: artwork -> practitioner
 - retype Interdependence (podcast/framework) from practitioner -> project

Idempotent-ish: if an artwork with the computed id already exists, skip.
"""
from __future__ import annotations
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "seed"

SIGNAL_ID = "enrichment-seed-canon-v1-2026-04"


def slugify(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9&+\- ]", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def main():
    nodes = json.loads((SEED / "nodes-final.json").read_text())
    edges = json.loads((SEED / "edges-final.json").read_text())
    key_works_map = json.loads((SEED / "_build" / "key_works_promotions.json").read_text())

    nodes_by_id = {n["id"]: n for n in nodes}
    edges_seen_keys = {(e.get("source_id"), e.get("target_id"), e.get("edge_type")) for e in edges}

    # Existing artwork ids (to detect collisions)
    existing_artwork_ids = {n["id"] for n in nodes if n.get("type") == "artwork"}

    added_artworks = []
    added_edges = []
    practitioners_updated = []

    for slug, works in key_works_map.items():
        pid = f"practitioner:{slug}"
        p = nodes_by_id.get(pid)
        if not p:
            print(f"⚠ Practitioner not found: {pid}")
            continue

        # Overlay key_works onto practitioner metadata
        md = p.setdefault("metadata", {})
        md["key_works"] = works
        practitioners_updated.append(pid)

        # For each work, create artwork node + CREATED_BY edge (if not already there)
        for w in works:
            title = (w.get("title") or "").strip()
            if not title:
                continue
            title_slug = slugify(title)
            pract_suffix = slug  # disambiguate with creator slug
            art_id = f"artwork:{title_slug}"
            # Collision check: if the existing artwork node would collide with an unrelated one,
            # disambiguate with practitioner slug
            if art_id in existing_artwork_ids and art_id not in {n["id"] for n in added_artworks}:
                # Check: is the existing node's CREATED_BY pointing to this same practitioner?
                existing_created_by = None
                for e in edges:
                    if e.get("edge_type") == "CREATED_BY" and e.get("source_id") == art_id:
                        existing_created_by = e.get("target_id")
                        break
                if existing_created_by == pid:
                    # same artwork already exists for same practitioner — skip creation,
                    # but still register the CREATED_BY is in place.
                    continue
                # Otherwise disambiguate
                art_id = f"artwork:{title_slug} ({pract_suffix})"

            if art_id in existing_artwork_ids:
                # Already have an artwork with this ID; skip
                continue

            artwork_node = {
                "id": art_id,
                "name": title,
                "type": "artwork",
                "slug": title_slug,
                "metadata": {
                    "status": "confirmed",
                    "source_origin": "ai_assisted",
                    "year": w.get("year"),
                    "description": w.get("description"),
                    "creator_id": pid,
                    "auto_generated": True,
                    "generated_by": SIGNAL_ID,
                    "signal_id": SIGNAL_ID,
                },
            }
            added_artworks.append(artwork_node)
            existing_artwork_ids.add(art_id)

            # CREATED_BY edge: artwork -> practitioner
            edge_key = (art_id, pid, "CREATED_BY")
            if edge_key not in edges_seen_keys:
                new_edge = {
                    "id": f"{art_id}--created_by--{pid}",
                    "source_id": art_id,
                    "target_id": pid,
                    "edge_type": "CREATED_BY",
                    "confidence": "high",
                    "signal_id": SIGNAL_ID,
                    "created_by": "gatherer-enrichment",
                    "source_evidence": "metadata.key_works (promotion deepening)",
                    "charge": None,
                }
                added_edges.append(new_edge)
                edges_seen_keys.add(edge_key)

    # Append newly created artwork nodes + edges
    nodes_out = nodes + added_artworks
    edges_out = edges + added_edges

    # Retype Interdependence (podcast/framework) from practitioner to project
    retyped_name = None
    for n in nodes_out:
        if (n.get("name") or "").strip().lower().startswith("interdependence") and n.get("type") == "practitioner":
            retyped_name = n.get("name")
            old_id = n["id"]
            new_id = old_id.replace("practitioner:", "project:", 1)
            n["type"] = "project"
            n["id"] = new_id
            # Rewrite any edges that pointed to old id
            for e in edges_out:
                if e.get("source_id") == old_id:
                    e["source_id"] = new_id
                    e["id"] = f"{new_id}--{(e.get('edge_type') or '').lower()}--{e.get('target_id')}"
                if e.get("target_id") == old_id:
                    e["target_id"] = new_id
                    e["id"] = f"{e.get('source_id')}--{(e.get('edge_type') or '').lower()}--{new_id}"
            break

    # Save
    (SEED / "nodes-final.json").write_text(json.dumps(nodes_out, indent=2, ensure_ascii=False))
    (SEED / "edges-final.json").write_text(json.dumps(edges_out, indent=2, ensure_ascii=False))

    # Report
    print(f"Practitioners updated with key_works: {len(practitioners_updated)}")
    print(f"New artwork nodes created:            {len(added_artworks)}")
    print(f"New CREATED_BY edges created:         {len(added_edges)}")
    if retyped_name:
        print(f"Retyped to project: {retyped_name}")
    else:
        print("No Interdependence node found to retype.")

    # Show per-practitioner work counts
    print("\nPer-practitioner artwork counts added:")
    for slug, works in key_works_map.items():
        print(f"  {slug:<30} {len(works)} works")

    # Final totals
    print(f"\nFinal totals: {len(nodes_out)} nodes, {len(edges_out)} edges")
    from collections import Counter
    ntypes = Counter(n.get("type") for n in nodes_out)
    etypes = Counter(e.get("edge_type") for e in edges_out)
    print(f"Node types: {dict(ntypes)}")
    print(f"Edge types: {dict(etypes)}")


if __name__ == "__main__":
    main()
