#!/usr/bin/env python3
"""
setup_notion.py – Create all six A(DAI) databases in Notion.
Reads NOTION_TOKEN and NOTION_PARENT_PAGE from ../.env
"""

import os
import sys
import time
from datetime import datetime
from dotenv import load_dotenv
from notion_client import Client

# ── Load environment ──────────────────────────────────────────────
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

NOTION_TOKEN = os.getenv("NOTION_TOKEN", "").strip().strip('"')
NOTION_PARENT_PAGE = os.getenv("NOTION_PARENT_PAGE", "").strip().strip('"')

if not NOTION_TOKEN or not NOTION_PARENT_PAGE:
    sys.exit("ERROR: NOTION_TOKEN and NOTION_PARENT_PAGE must be set in .env")

notion = Client(auth=NOTION_TOKEN)

parent = {"type": "page_id", "page_id": NOTION_PARENT_PAGE}

# ── Database Definitions ──────────────────────────────────────────

DATABASES = [
    {
        "title": "Signal Inbox",
        "icon": "📡",
        "properties": {
            "Name": {"title": {}},
            "url": {"url": {}},
            "source_type": {
                "select": {
                    "options": [
                        {"name": "bookmark", "color": "blue"},
                        {"name": "transcript", "color": "green"},
                        {"name": "observation", "color": "yellow"},
                        {"name": "article", "color": "orange"},
                        {"name": "conversation", "color": "purple"},
                    ]
                }
            },
            "raw_content": {"rich_text": {}},
            "submitted_by": {
                "select": {
                    "options": [
                        {"name": "Iri", "color": "pink"},
                        {"name": "JB", "color": "blue"},
                        {"name": "Piyush", "color": "green"},
                        {"name": "Gio", "color": "orange"},
                        {"name": "system", "color": "gray"},
                    ]
                }
            },
            "date_captured": {"date": {}},
            "protocol_stage": {
                "select": {
                    "options": [
                        {"name": "SENSE", "color": "blue"},
                        {"name": "QUERY", "color": "purple"},
                        {"name": "SPECULATE", "color": "yellow"},
                        {"name": "REACT", "color": "orange"},
                        {"name": "EXPERIMENT", "color": "red"},
                    ]
                }
            },
            "status": {
                "select": {
                    "options": [
                        {"name": "raw", "color": "default"},
                        {"name": "processing", "color": "yellow"},
                        {"name": "processed", "color": "green"},
                        {"name": "archived", "color": "gray"},
                    ]
                }
            },
            "summary_ai": {"rich_text": {}},
            "signal_type": {
                "select": {
                    "options": [
                        {"name": "conversation", "color": "purple"},
                        {"name": "lecture", "color": "blue"},
                        {"name": "interview", "color": "green"},
                        {"name": "meeting", "color": "yellow"},
                        {"name": "panel", "color": "orange"},
                        {"name": "field_recording", "color": "red"},
                        {"name": "other", "color": "gray"},
                    ]
                }
            },
            "key_quotes": {"rich_text": {}},
            "tags": {"multi_select": {"options": []}},
        },
    },
    {
        "title": "Concepts",
        "icon": "💡",
        "properties": {
            "Name": {"title": {}},
            "definition": {"rich_text": {}},
            "first_seen": {"date": {}},
            "status": {
                "select": {
                    "options": [
                        {"name": "emerging", "color": "green"},
                        {"name": "established", "color": "blue"},
                        {"name": "contested", "color": "orange"},
                        {"name": "dormant", "color": "gray"},
                    ]
                }
            },
            "tags": {"multi_select": {"options": []}},
        },
    },
    {
        "title": "Practitioners & Orgs",
        "icon": "🧑‍🎨",
        "properties": {
            "Name": {"title": {}},
            "type": {
                "select": {
                    "options": [
                        {"name": "artist", "color": "pink"},
                        {"name": "collective", "color": "purple"},
                        {"name": "institution", "color": "blue"},
                        {"name": "critic", "color": "yellow"},
                        {"name": "funder", "color": "green"},
                        {"name": "platform", "color": "orange"},
                        {"name": "researcher", "color": "red"},
                    ]
                }
            },
            "practice": {"rich_text": {}},
            "scene": {
                "multi_select": {
                    "options": [
                        {"name": "generative", "color": "blue"},
                        {"name": "on-chain", "color": "purple"},
                        {"name": "net-art", "color": "pink"},
                        {"name": "XR", "color": "green"},
                        {"name": "glitch", "color": "red"},
                        {"name": "creative-coding", "color": "orange"},
                        {"name": "game-art", "color": "yellow"},
                        {"name": "algorithmic", "color": "default"},
                        {"name": "ai-art", "color": "gray"},
                        {"name": "other", "color": "brown"},
                    ]
                }
            },
            "geography": {"rich_text": {}},
            "significance": {"rich_text": {}},
            "url": {"url": {}},
        },
    },
    {
        "title": "Scenes",
        "icon": "🌐",
        "properties": {
            "Name": {"title": {}},
            "description": {"rich_text": {}},
            "geography": {"rich_text": {}},
            "status": {
                "select": {
                    "options": [
                        {"name": "emerging", "color": "green"},
                        {"name": "established", "color": "blue"},
                        {"name": "fragmenting", "color": "orange"},
                        {"name": "dormant", "color": "gray"},
                    ]
                }
            },
            "tags": {"multi_select": {"options": []}},
        },
    },
    {
        "title": "Threads",
        "icon": "🧵",
        "properties": {
            "Name": {"title": {}},
            "question": {"rich_text": {}},
            "status": {
                "select": {
                    "options": [
                        {"name": "open", "color": "green"},
                        {"name": "dormant", "color": "yellow"},
                        {"name": "resolved", "color": "gray"},
                    ]
                }
            },
            "lead": {
                "select": {
                    "options": [
                        {"name": "Iri", "color": "pink"},
                        {"name": "JB", "color": "blue"},
                        {"name": "Piyush", "color": "green"},
                        {"name": "Gio", "color": "orange"},
                    ]
                }
            },
            "tags": {"multi_select": {"options": []}},
        },
    },
    {
        "title": "Sensemaking Outputs",
        "icon": "📄",
        "properties": {
            "Name": {"title": {}},
            "type": {
                "select": {
                    "options": [
                        {"name": "brief", "color": "blue"},
                        {"name": "query_response", "color": "purple"},
                        {"name": "pattern_report", "color": "green"},
                        {"name": "field_dispatch", "color": "yellow"},
                        {"name": "analysis", "color": "orange"},
                        {"name": "movement_map", "color": "red"},
                        {"name": "exhibition_proposal", "color": "pink"},
                    ]
                }
            },
            "content": {"rich_text": {}},
            "generated_by": {
                "select": {
                    "options": [
                        {"name": "Iri", "color": "pink"},
                        {"name": "JB", "color": "blue"},
                        {"name": "Piyush", "color": "green"},
                        {"name": "Gio", "color": "orange"},
                        {"name": "system", "color": "gray"},
                    ]
                }
            },
            "date": {"date": {}},
            "tags": {"multi_select": {"options": []}},
        },
    },
]

# ── Create Databases ──────────────────────────────────────────────

def create_databases():
    created = {}
    env_keys = [
        "NOTION_DB_SIGNALS",
        "NOTION_DB_CONCEPTS",
        "NOTION_DB_PRACTITIONERS",
        "NOTION_DB_SCENES",
        "NOTION_DB_THREADS",
        "NOTION_DB_OUTPUTS",
    ]

    print(f"\n{'='*60}")
    print(f"  A(DAI) Notion Workspace Setup")
    print(f"  Parent page: {NOTION_PARENT_PAGE}")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    for i, db_def in enumerate(DATABASES):
        title = db_def["title"]
        icon = db_def["icon"]
        print(f"[{i+1}/6] Creating '{title}' ...", end=" ", flush=True)

        try:
            response = notion.databases.create(
                parent=parent,
                title=[{"type": "text", "text": {"content": title}}],
                icon={"type": "emoji", "emoji": icon},
                properties=db_def["properties"],
            )
            db_id = response["id"]
            created[env_keys[i]] = db_id
            print(f"✓  {db_id}")

        except Exception as e:
            print(f"✗  FAILED")
            print(f"    Error: {e}")
            created[env_keys[i]] = None

        if i < len(DATABASES) - 1:
            time.sleep(0.5)

    # ── Wire Relations ────────────────────────────────────────────
    # Relations are added via database update (second pass) so all
    # IDs are available. Using dual_property for two-way relations.

    signals = created.get("NOTION_DB_SIGNALS")
    concepts = created.get("NOTION_DB_CONCEPTS")
    practitioners = created.get("NOTION_DB_PRACTITIONERS")
    scenes = created.get("NOTION_DB_SCENES")
    threads = created.get("NOTION_DB_THREADS")
    outputs = created.get("NOTION_DB_OUTPUTS")

    # (source_db_id, property_name, target_db_id)
    RELATIONS = [
        # Signal Inbox links
        (signals, "Concepts", concepts),
        (signals, "Practitioners", practitioners),
        (signals, "Scenes", scenes),
        (signals, "Threads", threads),
        # Concepts links
        (concepts, "Practitioners", practitioners),
        (concepts, "Scenes", scenes),
        # Practitioners links
        (practitioners, "Scenes", scenes),
        # Threads links
        (threads, "Concepts", concepts),
        # Sensemaking Outputs links
        (outputs, "Signals", signals),
        (outputs, "Threads", threads),
        (outputs, "Concepts", concepts),
    ]

    print(f"\n{'─'*60}")
    print(f"  Wiring relations ({len(RELATIONS)} total)")
    print(f"{'─'*60}\n")

    relation_count = 0
    for source_id, prop_name, target_id in RELATIONS:
        if not source_id or not target_id:
            print(f"  ⊘  Skipping '{prop_name}' — missing database")
            continue

        print(f"  → {prop_name} ...", end=" ", flush=True)
        try:
            notion.databases.update(
                database_id=source_id,
                properties={
                    prop_name: {
                        "relation": {
                            "database_id": target_id,
                            "type": "dual_property",
                            "dual_property": {},
                        }
                    }
                },
            )
            relation_count += 1
            print("✓")
        except Exception as e:
            print(f"✗  FAILED")
            print(f"    Error: {e}")

        time.sleep(0.5)

    # ── Write notion_ids.txt ──────────────────────────────────────
    output_path = os.path.join(os.path.dirname(__file__), "notion_ids.txt")
    with open(output_path, "w") as f:
        f.write(f"# A(DAI) Notion Database IDs\n")
        f.write(f"# Generated {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        for key, db_id in created.items():
            line = f"{key}={db_id if db_id else 'FAILED'}"
            f.write(line + "\n")

    # ── Summary ───────────────────────────────────────────────────
    success = sum(1 for v in created.values() if v)
    failed = sum(1 for v in created.values() if v is None)

    print(f"\n{'='*60}")
    print(f"  Done: {success} databases created, {failed} failed")
    print(f"  Relations wired: {relation_count}/{len(RELATIONS)}")
    print(f"  IDs written to: {output_path}")
    print(f"{'='*60}\n")

    return created


if __name__ == "__main__":
    create_databases()
