#!/usr/bin/env python3
"""
update_notion_schema.py – Update A(DAI) Notion databases with intelligence tier schema.
Reads all keys from ../.env
"""

import os
import sys
import time
import logging
from datetime import datetime
from dotenv import load_dotenv
from notion_client import Client

# ── Load environment ──────────────────────────────────────────────
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

def env(key):
    return os.getenv(key, "").strip().strip('"')

NOTION_TOKEN       = env("NOTION_TOKEN")
DB_SIGNALS         = env("NOTION_DB_SIGNALS")
DB_CONCEPTS        = env("NOTION_DB_CONCEPTS")
DB_PRACTITIONERS   = env("NOTION_DB_PRACTITIONERS")
DB_SCENES          = env("NOTION_DB_SCENES")
DB_THREADS         = env("NOTION_DB_THREADS")
DB_OUTPUTS         = env("NOTION_DB_OUTPUTS")

REQUIRED = {
    "NOTION_TOKEN": NOTION_TOKEN,
    "NOTION_DB_SIGNALS": DB_SIGNALS,
    "NOTION_DB_CONCEPTS": DB_CONCEPTS,
    "NOTION_DB_PRACTITIONERS": DB_PRACTITIONERS,
    "NOTION_DB_SCENES": DB_SCENES,
    "NOTION_DB_THREADS": DB_THREADS,
    "NOTION_DB_OUTPUTS": DB_OUTPUTS,
}

missing = [k for k, v in REQUIRED.items() if not v]
if missing:
    sys.exit(f"ERROR: Missing env vars: {', '.join(missing)}")

notion = Client(auth=NOTION_TOKEN)

# ── Logging ───────────────────────────────────────────────────────
error_logger = logging.getLogger("errors")
error_logger.setLevel(logging.ERROR)
fh = logging.FileHandler(os.path.join(os.path.dirname(__file__), "errors.log"))
fh.setFormatter(logging.Formatter("%(asctime)s %(message)s"))
error_logger.addHandler(fh)

# ── Tracking ──────────────────────────────────────────────────────
changes_made = []
skipped = []
errors_list = []

DELAY = 0.34


def get_existing_properties(db_id):
    """Fetch current property names for a database."""
    try:
        db = notion.databases.retrieve(database_id=db_id)
        time.sleep(DELAY)
        return set(db["properties"].keys())
    except Exception as e:
        error_logger.error(f"Failed to retrieve DB {db_id}: {e}")
        errors_list.append(f"Retrieve {db_id}: {e}")
        return set()


def update_database(db_id, db_name, properties, skip_existing=True):
    """
    Update a database with new properties.
    If skip_existing=True, only add properties that don't already exist.
    If skip_existing=False, overwrite the property (used for modifying source_type).
    """
    existing = get_existing_properties(db_id)

    props_to_send = {}
    for prop_name, prop_def in properties.items():
        if skip_existing and prop_name in existing:
            skipped.append(f"  {db_name} → '{prop_name}' already exists, skipped")
            print(f"    ⊘ '{prop_name}' already exists — skipped")
            continue
        props_to_send[prop_name] = prop_def

    if not props_to_send:
        print(f"    (nothing to update)")
        return

    try:
        notion.databases.update(
            database_id=db_id,
            properties=props_to_send,
        )
        for prop_name in props_to_send:
            action = "modified" if prop_name in existing else "added"
            changes_made.append(f"  {db_name} → '{prop_name}' ({action})")
            print(f"    ✓ '{prop_name}' {action}")
        time.sleep(DELAY)
    except Exception as e:
        error_logger.error(f"Failed to update {db_name}: {e}")
        errors_list.append(f"Update {db_name}: {e}")
        print(f"    ✗ FAILED: {e}")


# ══════════════════════════════════════════════════════════════════
# PART 1 — UPDATE SIGNAL INBOX
# ══════════════════════════════════════════════════════════════════

def part1_update_signal_inbox():
    print(f"\n{'='*60}")
    print(f"  PART 1: Update Signal Inbox")
    print(f"{'='*60}\n")

    # ── Modify source_type (overwrite existing options) ───────────
    print("  Modifying source_type options...")
    try:
        notion.databases.update(
            database_id=DB_SIGNALS,
            properties={
                "source_type": {
                    "select": {
                        "options": [
                            # PRIMARY tier
                            {"name": "transcript", "color": "green"},
                            {"name": "observation", "color": "yellow"},
                            {"name": "conversation", "color": "purple"},
                            {"name": "meeting_notes", "color": "blue"},
                            # SECONDARY tier
                            {"name": "article", "color": "orange"},
                            {"name": "bookmark", "color": "default"},
                            {"name": "web_scan", "color": "gray"},
                            {"name": "publication", "color": "red"},
                        ]
                    }
                },
            },
        )
        changes_made.append("  Signal Inbox → 'source_type' options replaced (8 new values)")
        print("    ✓ source_type options replaced")
        time.sleep(DELAY)
    except Exception as e:
        error_logger.error(f"source_type update: {e}")
        errors_list.append(f"source_type update: {e}")
        print(f"    ✗ FAILED: {e}")

    # ── Add new properties ────────────────────────────────────────
    print("  Adding new properties...")
    new_props = {
        "intelligence_tier": {
            "select": {
                "options": [
                    {"name": "primary", "color": "green"},
                    {"name": "secondary", "color": "blue"},
                ]
            }
        },
        "signal_confidence": {
            "select": {
                "options": [
                    {"name": "verified", "color": "green"},
                    {"name": "unverified", "color": "yellow"},
                    {"name": "speculative", "color": "red"},
                ]
            }
        },
        "corroborated": {"checkbox": {}},
    }
    update_database(DB_SIGNALS, "Signal Inbox", new_props, skip_existing=True)


# ══════════════════════════════════════════════════════════════════
# PART 2 — PRINT VIEW INSTRUCTIONS
# ══════════════════════════════════════════════════════════════════

def part2_print_view_instructions():
    print(f"\n{'='*60}")
    print(f"  PART 2: Manual View Instructions")
    print(f"{'='*60}\n")

    instructions = """In your Signal Inbox database in Notion, create two filtered views:

VIEW 1 — Field Intelligence
Filter: intelligence_tier = primary
This shows only what your team generates directly —
transcripts, observations, conversations, meeting notes.

VIEW 2 — Web Intelligence
Filter: intelligence_tier = secondary
This shows only external signals —
articles, bookmarks, web scans, publications."""

    print(instructions)
    return instructions


# ══════════════════════════════════════════════════════════════════
# PART 3 — UPDATE THE OTHER FIVE DATABASES
# ══════════════════════════════════════════════════════════════════

def part3_update_other_databases():
    print(f"\n{'='*60}")
    print(f"  PART 3: Update Other Databases")
    print(f"{'='*60}")

    # ── Concepts ──────────────────────────────────────────────────
    print(f"\n  Concepts DB:")
    update_database(DB_CONCEPTS, "Concepts", {
        "primary_signal_count": {"number": {"format": "number"}},
        "secondary_signal_count": {"number": {"format": "number"}},
    })

    # ── Practitioners & Orgs ──────────────────────────────────────
    print(f"\n  Practitioners & Orgs DB:")
    update_database(DB_PRACTITIONERS, "Practitioners & Orgs", {
        "first_mentioned_in": {
            "select": {
                "options": [
                    {"name": "primary", "color": "green"},
                    {"name": "secondary", "color": "blue"},
                ]
            }
        },
    })

    # ── Scenes ────────────────────────────────────────────────────
    print(f"\n  Scenes DB:")
    update_database(DB_SCENES, "Scenes", {
        "intelligence_coverage": {
            "select": {
                "options": [
                    {"name": "primary_only", "color": "green"},
                    {"name": "secondary_only", "color": "blue"},
                    {"name": "both", "color": "purple"},
                    {"name": "none", "color": "gray"},
                ]
            }
        },
    })

    # ── Threads ───────────────────────────────────────────────────
    print(f"\n  Threads DB:")
    update_database(DB_THREADS, "Threads", {
        "primary_signal_count": {"number": {"format": "number"}},
        "secondary_signal_count": {"number": {"format": "number"}},
    })

    # ── Sensemaking Outputs ───────────────────────────────────────
    print(f"\n  Sensemaking Outputs DB:")
    update_database(DB_OUTPUTS, "Sensemaking Outputs", {
        "primary_sources": {"number": {"format": "number"}},
        "secondary_sources": {"number": {"format": "number"}},
        "intelligence_basis": {
            "select": {
                "options": [
                    {"name": "primary_led", "color": "green"},
                    {"name": "secondary_led", "color": "blue"},
                    {"name": "mixed", "color": "purple"},
                ]
            }
        },
    })


# ══════════════════════════════════════════════════════════════════
# PART 4 — SUMMARY & LOG
# ══════════════════════════════════════════════════════════════════

def part4_summary(view_instructions):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    print(f"\n{'='*60}")
    print(f"  SUMMARY")
    print(f"{'='*60}")

    print(f"\n  Changes made ({len(changes_made)}):")
    for c in changes_made:
        print(c)

    if skipped:
        print(f"\n  Skipped ({len(skipped)}):")
        for s in skipped:
            print(s)

    if errors_list:
        print(f"\n  Errors ({len(errors_list)}):")
        for e in errors_list:
            print(f"  ✗ {e}")

    # ── Write log file ────────────────────────────────────────────
    log_path = os.path.join(os.path.dirname(__file__), "schema_update_log.txt")
    with open(log_path, "w") as f:
        f.write(f"# A(DAI) Schema Update Log\n")
        f.write(f"# {ts}\n\n")

        f.write(f"## Changes Made ({len(changes_made)})\n")
        for c in changes_made:
            f.write(c + "\n")

        f.write(f"\n## Skipped ({len(skipped)})\n")
        for s in skipped:
            f.write(s + "\n")

        if errors_list:
            f.write(f"\n## Errors ({len(errors_list)})\n")
            for e in errors_list:
                f.write(f"  {e}\n")

        f.write(f"\n## Manual Steps Required\n")
        f.write(view_instructions + "\n")

    print(f"\n  Log written to: {log_path}")
    print(f"  Errors logged to: errors.log")
    print(f"{'='*60}\n")


# ── Main ──────────────────────────────────────────────────────────

def main():
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n{'='*60}")
    print(f"  A(DAI) Schema Update")
    print(f"  {ts}")
    print(f"{'='*60}")

    part1_update_signal_inbox()
    view_instructions = part2_print_view_instructions()
    part3_update_other_databases()
    part4_summary(view_instructions)


if __name__ == "__main__":
    main()
