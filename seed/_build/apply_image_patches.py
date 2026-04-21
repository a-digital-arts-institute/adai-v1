#!/usr/bin/env python3
"""
Merge image patches from image_patches/*.json into seed/nodes.json.

Priority (when multiple sources claim an artwork):
  1. wikidata   (standard license visible on Commons)
  2. met        (Open Access CC0 — clear reuse rights)
  3. moma       (collection thumbnail, license varies)
  4. artblocks  (media.artblocks.io thumbnail, per-project license)

Only touches artwork nodes that don't already have an image_url. Nodes with
an existing image_url are left alone (idempotent).

Run:
  python3 apply_image_patches.py           # dry-run: show summary
  python3 apply_image_patches.py --write   # rewrite seed/nodes.json in place

A backup is written to seed/nodes.json.bak before any rewrite.
"""
import json
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).parent
SEED = HERE.parent
PATCHES_DIR = HERE / "image_patches"
NODES_PATH = SEED / "nodes.json"

SOURCE_PRIORITY = {"wikidata": 1, "met": 2, "moma": 3, "artblocks": 4}

EXTERNAL_ID_KEYS = (
    "moma_object_id",
    "met_object_id",
    "wikidata_qid",
    "artblocks_contract",
    "artblocks_project_id",
    "artblocks_token_id",
)


def main():
    write_mode = "--write" in sys.argv

    # Load all patches, collect by node_id, resolve by priority
    all_patches = {}  # node_id -> (priority, patch)
    sources_seen = {}  # source -> count
    for patch_file in sorted(PATCHES_DIR.glob("*.json")):
        try:
            patches = json.load(open(patch_file))
        except Exception as ex:
            print(f"  ! could not parse {patch_file.name}: {ex}")
            continue
        sources_seen[patch_file.stem] = len(patches)
        for p in patches:
            nid = p.get("node_id")
            src = p.get("image_source", patch_file.stem)
            prio = SOURCE_PRIORITY.get(src, 99)
            existing = all_patches.get(nid)
            if existing is None or prio < existing[0]:
                all_patches[nid] = (prio, p)

    print(f"Patch files scanned:")
    for src, n in sources_seen.items():
        print(f"  {src}: {n} patches")

    # Load nodes
    nodes = json.load(open(NODES_PATH))
    applied = 0
    skipped_has_image = 0
    skipped_missing_node = 0
    node_by_id = {n["id"]: n for n in nodes}

    for nid, (prio, patch) in all_patches.items():
        if nid not in node_by_id:
            skipped_missing_node += 1
            continue
        n = node_by_id[nid]
        md = json.loads(n["metadata"])
        if md.get("image_url"):
            skipped_has_image += 1
            continue
        md["image_url"] = patch["image_url"]
        md["image_license"] = patch.get("image_license", "unknown")
        md["image_source"] = patch.get("image_source", "unknown")
        # Store per-source external IDs in metadata so they survive round-trip
        for k, v in patch.items():
            if k in EXTERNAL_ID_KEYS and v:
                md[k] = v
        n["metadata"] = json.dumps(md, ensure_ascii=False)
        applied += 1

    print(f"\nApplied:             {applied}")
    print(f"Skipped (has image): {skipped_has_image}")
    print(f"Skipped (no node):   {skipped_missing_node}")

    if write_mode:
        backup = NODES_PATH.with_suffix(".json.bak")
        shutil.copy(NODES_PATH, backup)
        NODES_PATH.write_text(json.dumps(nodes, indent=2, ensure_ascii=False))
        print(f"\nWrote: {NODES_PATH}")
        print(f"Backup: {backup}")
    else:
        print(f"\n(dry-run) Would rewrite {NODES_PATH} with {applied} new image URLs.")
        print("Run with --write to persist.")


if __name__ == "__main__":
    main()
