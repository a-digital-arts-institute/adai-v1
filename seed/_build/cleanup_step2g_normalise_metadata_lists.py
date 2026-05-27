"""Cleanup step 2g: normalise pre-existing string-only metadata list entries to dicts.

Some node metadata fields (exhibitions, scenes, focus_areas, etc.) had pre-existing
prose-derived string entries before the cleanup pass added structured dict entries.
This produced mixed-shape lists like:
    [
      "Serpentine", "MoMA PS", "Centre Pompidou",      # pre-existing strings
      {id: institution:serpentine-arts-technologies, name: "Serpentine Arts Technologies"},
      {id: institution:moma-ps1, ...},                  # dict entries from earlier cleanup steps
      ...
    ]

This step walks each affected list and:
  1. Drops string entries that are duplicates of existing dict entries
     (matched by Unicode-normalised lowercase name).
  2. For remaining strings, tries to find a node in the seed whose name matches
     within the field's candidate target types. If found, replaces the string with
     a structured dict {id, name, type}.
  3. For unmatched strings, wraps as {id: null, name: <original>} so the list
     becomes uniformly dict-shaped.

Result: every entry in every targeted field is dict-shaped.

Fields handled (with candidate node types for name-matching):
  - exhibitions       → institution, platform, publication
  - scenes            → scene
  - focus_areas       → concept
  - collaborators     → practitioner, collective, institution, platform, project, publication
  - produced_by_org   → collective, project, publication, institution, platform
  - companion_works   → artwork

Idempotent: re-running has no effect (all entries already dicts).

Usage:
  seed/_build/.venv/bin/python3 seed/_build/cleanup_step2g_normalise_metadata_lists.py            # dry-run
  seed/_build/.venv/bin/python3 seed/_build/cleanup_step2g_normalise_metadata_lists.py --apply    # write
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys
import unicodedata
from collections import Counter, defaultdict

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
NODES_PATH = REPO_ROOT / "seed" / "nodes.json"

FIELD_TARGETS = {
    "exhibitions": {"institution", "platform", "publication"},
    "scenes": {"scene"},
    "focus_areas": {"concept"},
    "collaborators": {"practitioner", "collective", "institution", "platform", "project", "publication"},
    "produced_by_org": {"collective", "project", "publication", "institution", "platform"},
    "companion_works": {"artwork"},
}


def normalise_name(s: str) -> str:
    """Lowercase + strip accents/diacritics for fuzzy name matching."""
    s = s.strip().lower()
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if unicodedata.category(c) != "Mn")


def _ensure_dict_metadata(node: dict) -> dict:
    raw = node.get("metadata")
    if raw is None:
        node["metadata"] = {}
    elif isinstance(raw, dict):
        pass
    elif isinstance(raw, str):
        try:
            decoded = json.loads(raw)
        except json.JSONDecodeError:
            decoded = {}
        node["metadata"] = decoded if isinstance(decoded, dict) else {}
    else:
        node["metadata"] = {}
    return node["metadata"]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    nodes_list = json.loads(NODES_PATH.read_text())

    # Index nodes by normalised name within each type for fast matching
    by_type_name: dict[str, dict[str, dict]] = defaultdict(dict)
    for n in nodes_list:
        by_type_name[n.get("type", "?")][normalise_name(n.get("name", ""))] = n

    # Stats
    stats = {
        "strings_dropped_as_duplicate": 0,
        "strings_matched_to_node": 0,
        "strings_wrapped_no_match": 0,
        "lists_touched": 0,
        "nodes_touched": 0,
    }

    changes_log: list[str] = []

    for n in nodes_list:
        md = n.get("metadata")
        if md is None or isinstance(md, str):
            md_dict = {}
            if isinstance(md, str):
                try:
                    decoded = json.loads(md)
                    if isinstance(decoded, dict):
                        md_dict = decoded
                except json.JSONDecodeError:
                    pass
            if not md_dict:
                continue
            # We won't write back the dict-converted form unless this node has touched fields
            md = md_dict

        if not isinstance(md, dict):
            continue

        node_changed = False
        for field, target_types in FIELD_TARGETS.items():
            entries = md.get(field)
            if not isinstance(entries, list):
                continue
            if not any(isinstance(e, str) for e in entries):
                continue  # already all-dict

            # Pre-compute existing dict-name set in this list
            existing_dict_names = set()
            for e in entries:
                if isinstance(e, dict) and e.get("name"):
                    existing_dict_names.add(normalise_name(e["name"]))

            new_entries: list = []
            for e in entries:
                if isinstance(e, dict):
                    new_entries.append(e)
                    continue
                if not isinstance(e, str):
                    new_entries.append(e)  # passthrough unexpected types
                    continue
                e_norm = normalise_name(e)
                # 1) drop if duplicate of an existing dict entry (by normalised name)
                if e_norm in existing_dict_names:
                    stats["strings_dropped_as_duplicate"] += 1
                    changes_log.append(f"  {n['id']}.{field}: dropped {e!r} (dup of existing dict)")
                    continue
                # 2) prefix match — handles "MoMA PS" vs "MoMA PS1"
                matched_by_prefix = None
                for existing_norm in existing_dict_names:
                    if (len(e_norm) >= 4 and len(existing_norm) >= 4
                            and (e_norm.startswith(existing_norm) or existing_norm.startswith(e_norm))):
                        matched_by_prefix = existing_norm
                        break
                if matched_by_prefix:
                    stats["strings_dropped_as_duplicate"] += 1
                    changes_log.append(
                        f"  {n['id']}.{field}: dropped {e!r} (prefix-match of existing dict)"
                    )
                    continue
                # 3) try to match to a node in the seed
                matched_node = None
                for tt in target_types:
                    cand = by_type_name.get(tt, {}).get(e_norm)
                    if cand:
                        matched_node = cand
                        break
                if not matched_node:
                    # prefix match within nodes-of-target-type
                    for tt in target_types:
                        for cand_norm, cand_node in by_type_name.get(tt, {}).items():
                            if (len(e_norm) >= 4 and len(cand_norm) >= 4
                                    and (e_norm.startswith(cand_norm) or cand_norm.startswith(e_norm))):
                                matched_node = cand_node
                                break
                        if matched_node:
                            break
                if matched_node:
                    entry = {
                        "id": matched_node["id"],
                        "name": matched_node.get("name", e),
                        "type": matched_node.get("type"),
                    }
                    # Skip if we just promoted it to a dup of an entry already kept (post-dedup invariant)
                    if normalise_name(entry["name"]) in existing_dict_names:
                        stats["strings_dropped_as_duplicate"] += 1
                        changes_log.append(
                            f"  {n['id']}.{field}: dropped {e!r} (node-match was already a dict entry)"
                        )
                        continue
                    new_entries.append(entry)
                    existing_dict_names.add(normalise_name(entry["name"]))
                    stats["strings_matched_to_node"] += 1
                    changes_log.append(
                        f"  {n['id']}.{field}: {e!r} → matched node {matched_node['id']!r}"
                    )
                else:
                    new_entries.append({"id": None, "name": e})
                    stats["strings_wrapped_no_match"] += 1
                    changes_log.append(
                        f"  {n['id']}.{field}: {e!r} → wrapped as {{id: null, name: ...}}"
                    )

            if new_entries != entries:
                md[field] = new_entries
                node_changed = True
                stats["lists_touched"] += 1

        if node_changed:
            stats["nodes_touched"] += 1
            # Ensure node's actual metadata is the dict version (in case it was a string before)
            _ensure_dict_metadata(n)
            n["metadata"] = md

    print(f"=== Cleanup step 2g — {'APPLY' if args.apply else 'DRY-RUN'} ===")
    print(f"Nodes touched: {stats['nodes_touched']}")
    print(f"Lists touched: {stats['lists_touched']}")
    print(f"Strings dropped as duplicate: {stats['strings_dropped_as_duplicate']}")
    print(f"Strings matched to a node:    {stats['strings_matched_to_node']}")
    print(f"Strings wrapped (no match):   {stats['strings_wrapped_no_match']}")
    print()
    print("--- first 25 changes ---")
    for line in changes_log[:25]:
        print(line)
    if len(changes_log) > 25:
        print(f"  ...and {len(changes_log) - 25} more")
    print()

    if not args.apply:
        print("Dry-run complete. Re-run with --apply to write changes.")
        return 0

    NODES_PATH.write_text(json.dumps(nodes_list, indent=2, ensure_ascii=False))
    print(f"Wrote {NODES_PATH}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
