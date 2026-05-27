"""Cleanup step 2b: move the 38 residual non-conforming CREATED_BY edges to artwork metadata.

These edges remain after step 1 (which moved the 27 platform/institution targets
to EXHIBITED_AT) and step 2a (which deleted 5 spurious id-collision edges):

  - 20 with collective targets (teamLab, JODI, Forensic Architecture, etc.)
  - 6 with project targets (Holly+, Interdependence)
  - 6 with publication targets (Serpentine FAE4, alignDRAW)
  - 6 with artwork targets (Starmirror/The Call sibling works)

All are written by contributor:migration (with one gatherer-enrichment exception).
None of them fit CREATED_BY under locked SKILL.md (which requires practitioner target).

Movement:
  - 20 + 6 + 6 = 32 organisation-target edges  → artwork.metadata.produced_by_org
  - 6 artwork-target edges                     → artwork.metadata.companion_works

Both fields are JSON arrays of {id, name, [type]} entries.

Idempotent: re-running detects entries already present by target id and skips them.

Usage:
  seed/_build/.venv/bin/python3 seed/_build/cleanup_step2b_org_attribution.py            # dry-run
  seed/_build/.venv/bin/python3 seed/_build/cleanup_step2b_org_attribution.py --apply    # write
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys
from collections import Counter

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
EDGES_PATH = REPO_ROOT / "seed" / "edges.json"
NODES_PATH = REPO_ROOT / "seed" / "nodes.json"

ORG_TARGET_TYPES = {"collective", "project", "publication"}


def _parse_metadata(node: dict) -> dict:
    """Match audit_schema._parse_metadata semantics."""
    raw = node.get("metadata")
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            decoded = json.loads(raw)
        except json.JSONDecodeError:
            return {}
        return decoded if isinstance(decoded, dict) else {}
    return {}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true",
                        help="Write changes. Without this flag, dry-run only.")
    args = parser.parse_args()

    nodes_list = json.loads(NODES_PATH.read_text())
    edges = json.loads(EDGES_PATH.read_text())
    nodes_by_id = {n["id"]: n for n in nodes_list}

    def ntype(nid: str) -> str:
        return nodes_by_id.get(nid, {}).get("type", "?")

    def nname(nid: str) -> str:
        return nodes_by_id.get(nid, {}).get("name", nid)

    # Identify the 38 target edges
    targets: list[dict] = []
    for e in edges:
        if e["edge_type"] != "CREATED_BY":
            continue
        src_type = ntype(e["source_id"])
        tgt_type = ntype(e["target_id"])
        if src_type != "artwork":
            continue
        if tgt_type == "practitioner":
            continue  # conforming
        targets.append({
            "edge_id": e.get("id"),
            "source_id": e["source_id"],
            "source_name": nname(e["source_id"]),
            "target_id": e["target_id"],
            "target_name": nname(e["target_id"]),
            "target_type": tgt_type,
            "created_by": e["created_by"],
        })

    by_tgt = Counter(t["target_type"] for t in targets)
    print(f"=== Cleanup step 2b — {'APPLY' if args.apply else 'DRY-RUN'} ===")
    print(f"Edges to move: {len(targets)}")
    for tt, count in sorted(by_tgt.items()):
        print(f"  → {tt}: {count}")
    print()

    # Plan the metadata additions
    # Group by source artwork id, then by destination field
    plan_by_artwork: dict[str, dict] = {}
    for t in targets:
        artwork_id = t["source_id"]
        field = "produced_by_org" if t["target_type"] in ORG_TARGET_TYPES else "companion_works"
        plan_by_artwork.setdefault(artwork_id, {}).setdefault(field, []).append(t)

    print(f"Affects {len(plan_by_artwork)} artwork nodes.")
    print()
    print("--- sample of planned metadata additions (first 5 artworks) ---")
    for artwork_id, fields in list(plan_by_artwork.items())[:5]:
        artwork_name = nname(artwork_id)
        print(f"  {artwork_name!r} ({artwork_id})")
        for field, entries in fields.items():
            print(f"    + metadata.{field}:")
            for t in entries:
                if t["target_type"] in ORG_TARGET_TYPES:
                    print(f"        {{id: {t['target_id']!r}, name: {t['target_name']!r}, type: {t['target_type']!r}}}")
                else:
                    print(f"        {{id: {t['target_id']!r}, name: {t['target_name']!r}}}")
    print()

    # Sanity: confirm no double-attribution would happen (i.e. an edge isn't already in metadata)
    skipped_already_present = 0
    for artwork_id, fields in plan_by_artwork.items():
        md = _parse_metadata(nodes_by_id.get(artwork_id, {}))
        for field, entries in list(fields.items()):
            existing = md.get(field) or []
            existing_ids = {x.get("id") for x in existing if isinstance(x, dict)}
            remaining = [t for t in entries if t["target_id"] not in existing_ids]
            if len(remaining) != len(entries):
                skipped_already_present += len(entries) - len(remaining)
            fields[field] = remaining

    if skipped_already_present:
        print(f"Note: {skipped_already_present} entries already present in metadata; will be skipped.")
        print()

    if not args.apply:
        print("Dry-run complete. Re-run with --apply to write changes.")
        return 0

    # APPLY
    # Step 1: update nodes
    edge_ids_to_delete = {t["edge_id"] for t in targets}
    nodes_modified = 0
    entries_added = 0
    for n in nodes_list:
        if n["id"] not in plan_by_artwork:
            continue
        # Ensure metadata is a dict in-place
        md_raw = n.get("metadata")
        if md_raw is None:
            n["metadata"] = {}
        elif isinstance(md_raw, str):
            try:
                decoded = json.loads(md_raw)
                n["metadata"] = decoded if isinstance(decoded, dict) else {}
            except json.JSONDecodeError:
                n["metadata"] = {}
        elif not isinstance(md_raw, dict):
            n["metadata"] = {}
        md = n["metadata"]

        node_changed = False
        for field, entries in plan_by_artwork[n["id"]].items():
            if not entries:
                continue
            existing = md.get(field) or []
            if not isinstance(existing, list):
                existing = []
            for t in entries:
                entry = {"id": t["target_id"], "name": t["target_name"]}
                if t["target_type"] in ORG_TARGET_TYPES:
                    entry["type"] = t["target_type"]
                existing.append(entry)
                entries_added += 1
                node_changed = True
            md[field] = existing
        if node_changed:
            nodes_modified += 1

    # Step 2: delete edges
    new_edges = [e for e in edges if e.get("id") not in edge_ids_to_delete]
    edges_deleted = len(edges) - len(new_edges)

    if edges_deleted != len(targets):
        print(f"ERROR: planned to delete {len(targets)} edges but actually deleted {edges_deleted}. Aborting.",
              file=sys.stderr)
        return 1

    NODES_PATH.write_text(json.dumps(nodes_list, indent=2, ensure_ascii=False))
    EDGES_PATH.write_text(json.dumps(new_edges, indent=2, ensure_ascii=False))

    print(f"Wrote {NODES_PATH} ({nodes_modified} artwork nodes modified, {entries_added} metadata entries added).")
    print(f"Wrote {EDGES_PATH} ({edges_deleted} edges deleted).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
