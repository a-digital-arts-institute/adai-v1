#!/usr/bin/env python3
"""
Notion Workspace Migration Script
Migrates databases, properties, records, and relations from one Notion account to another.

Usage:
    python notion_migrate.py

Requirements:
    pip install requests
"""

import json
import sys
import time
from typing import Any

try:
    import requests
except ImportError:
    print("Installing requests...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests

# ── Configuration ────────────────────────────────────────────────────────────

OLD_TOKEN = "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"
NEW_TOKEN = "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"
NEW_PARENT_PAGE_ID = "3167b5c870208081848adfdd448fadbf"

# ── Notion API helpers ────────────────────────────────────────────────────────

NOTION_VERSION = "2022-06-28"


def headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def notion_get(token: str, path: str) -> dict:
    url = f"https://api.notion.com/v1/{path}"
    r = requests.get(url, headers=headers(token))
    r.raise_for_status()
    return r.json()


def notion_post(token: str, path: str, body: dict) -> dict:
    url = f"https://api.notion.com/v1/{path}"
    r = requests.post(url, headers=headers(token), json=body)
    if not r.ok:
        print(f"  ERROR {r.status_code}: {r.text}")
    r.raise_for_status()
    return r.json()


def notion_patch(token: str, path: str, body: dict) -> dict:
    url = f"https://api.notion.com/v1/{path}"
    r = requests.patch(url, headers=headers(token), json=body)
    if not r.ok:
        print(f"  ERROR {r.status_code}: {r.text}")
    r.raise_for_status()
    return r.json()


def paginate(token: str, path: str, body: dict | None = None) -> list[dict]:
    """Collect all pages from a paginated Notion endpoint."""
    results = []
    cursor = None
    while True:
        payload = body.copy() if body else {}
        if cursor:
            payload["start_cursor"] = cursor
        if body is None:
            # GET with query params
            url = f"https://api.notion.com/v1/{path}"
            params = {"start_cursor": cursor} if cursor else {}
            r = requests.get(url, headers=headers(token), params=params)
        else:
            url = f"https://api.notion.com/v1/{path}"
            r = requests.post(url, headers=headers(token), json=payload)
        r.raise_for_status()
        data = r.json()
        results.extend(data.get("results", []))
        if not data.get("has_more"):
            break
        cursor = data.get("next_cursor")
        time.sleep(0.35)  # respect rate limits
    return results


def confirm(prompt: str) -> bool:
    answer = input(f"\n{prompt} [y/N] ").strip().lower()
    return answer in ("y", "yes")


# ── Step 1: Read all databases from old workspace ─────────────────────────────

def step1_read_databases() -> list[dict]:
    print("\n" + "="*60)
    print("STEP 1: Reading databases from old workspace")
    print("="*60)

    results = paginate(OLD_TOKEN, "search", {
        "filter": {"value": "database", "property": "object"},
        "sort": {"direction": "ascending", "timestamp": "last_edited_time"},
    })

    databases = [r for r in results if r["object"] == "database"]
    print(f"\nFound {len(databases)} database(s):")
    for db in databases:
        title = "".join(t["plain_text"] for t in db.get("title", []))
        print(f"  • {title or '(untitled)'} — {db['id']}")

    return databases


# ── Step 2: Recreate databases in new workspace ───────────────────────────────

SKIP_PROPERTY_TYPES = {"created_time", "last_edited_time", "created_by", "last_edited_by"}
RELATION_PLACEHOLDER = "__relation_placeholder__"


def clean_properties(properties: dict) -> dict:
    """
    Strip read-only fields and mark relation properties for later rewiring.
    Returns a properties dict safe to POST to the new workspace.
    """
    cleaned = {}
    for name, prop in properties.items():
        ptype = prop["type"]

        # Skip auto-managed properties
        if ptype in SKIP_PROPERTY_TYPES:
            continue
        # Skip rollup for now (depends on relations)
        if ptype == "rollup":
            continue
        # Title is always required — keep as-is
        if ptype == "title":
            cleaned[name] = {"title": {}}
            continue
        # Relations need to be wired after all DBs exist
        if ptype == "relation":
            cleaned[name] = {
                "relation": {
                    "database_id": RELATION_PLACEHOLDER,
                    "type": "single_property",
                    "single_property": {},
                }
            }
            continue
        # Formula — keep expression
        if ptype == "formula":
            cleaned[name] = {"formula": {"expression": prop["formula"]["expression"]}}
            continue
        # Select / multi-select — keep options (drop IDs so Notion auto-generates)
        if ptype in ("select", "multi_select", "status"):
            key = ptype
            options = [
                {"name": o["name"], "color": o.get("color", "default")}
                for o in prop.get(ptype, {}).get("options", [])
            ]
            groups = []
            if ptype == "status":
                groups = [
                    {
                        "name": g["name"],
                        "color": g.get("color", "default"),
                        "option_ids": [],  # will be auto-filled
                    }
                    for g in prop.get("status", {}).get("groups", [])
                ]
                cleaned[name] = {"status": {"options": options, "groups": groups}}
            else:
                cleaned[name] = {key: {"options": options}}
            continue
        # Number — keep format
        if ptype == "number":
            cleaned[name] = {"number": {"format": prop["number"].get("format", "number")}}
            continue
        # Everything else (url, email, phone, date, checkbox, people, files, rich_text)
        cleaned[name] = {ptype: {}}

    return cleaned


def step2_recreate_databases(
    databases: list[dict],
    new_parent_id: str,
) -> dict[str, str]:
    """
    Returns old_db_id -> new_db_id mapping.
    """
    print("\n" + "="*60)
    print("STEP 2: Recreating databases in new workspace")
    print("="*60)

    id_map: dict[str, str] = {}

    for db in databases:
        old_id = db["id"]
        title = "".join(t["plain_text"] for t in db.get("title", []))
        print(f"\n  Creating: {title or '(untitled)'}")

        props = clean_properties(db.get("properties", {}))

        # Remove relation properties temporarily (can't point to non-existent DBs)
        relation_props = {
            k: v for k, v in props.items()
            if v.get("relation", {}).get("database_id") == RELATION_PLACEHOLDER
        }
        safe_props = {k: v for k, v in props.items() if k not in relation_props}

        body = {
            "parent": {"page_id": new_parent_id},
            "title": db.get("title", []),
            "properties": safe_props,
            "is_inline": db.get("is_inline", False),
        }
        if db.get("icon"):
            body["icon"] = db["icon"]
        if db.get("cover"):
            body["cover"] = db["cover"]
        if db.get("description"):
            body["description"] = db["description"]

        new_db = notion_post(NEW_TOKEN, "databases", body)
        new_id = new_db["id"]
        id_map[old_id] = new_id
        print(f"    ✓ Created as {new_id}")
        time.sleep(0.35)

    return id_map


# ── Step 3: Migrate all records ───────────────────────────────────────────────

SKIP_PAGE_PROPS = {
    "created_time", "last_edited_time", "created_by", "last_edited_by",
    "rollup", "relation",
}


def convert_property_value(prop: dict) -> dict | None:
    """Convert an old page property value to a new one (omit unsupported types)."""
    ptype = prop["type"]
    if ptype in SKIP_PAGE_PROPS:
        return None
    if ptype == "title":
        return {"title": prop.get("title", [])}
    if ptype == "rich_text":
        return {"rich_text": prop.get("rich_text", [])}
    if ptype == "number":
        return {"number": prop.get("number")}
    if ptype == "select":
        sel = prop.get("select")
        return {"select": {"name": sel["name"]} if sel else None}
    if ptype == "multi_select":
        return {"multi_select": [{"name": o["name"]} for o in prop.get("multi_select", [])]}
    if ptype == "status":
        s = prop.get("status")
        return {"status": {"name": s["name"]} if s else None}
    if ptype == "date":
        return {"date": prop.get("date")}
    if ptype == "checkbox":
        return {"checkbox": prop.get("checkbox", False)}
    if ptype == "url":
        return {"url": prop.get("url")}
    if ptype == "email":
        return {"email": prop.get("email")}
    if ptype == "phone_number":
        return {"phone_number": prop.get("phone_number")}
    if ptype == "files":
        # External files only — uploaded files can't be migrated via API
        files = [
            f for f in prop.get("files", [])
            if f.get("type") == "external"
        ]
        return {"files": files}
    # formula, people, etc. — read-only or cross-account, skip
    return None


def step3_migrate_records(
    databases: list[dict],
    id_map: dict[str, str],
) -> dict[str, str]:
    """
    Migrate all page records. Returns old_page_id -> new_page_id mapping.
    """
    print("\n" + "="*60)
    print("STEP 3: Migrating records")
    print("="*60)

    page_id_map: dict[str, str] = {}

    for db in databases:
        old_db_id = db["id"]
        new_db_id = id_map[old_db_id]
        title = "".join(t["plain_text"] for t in db.get("title", []))
        print(f"\n  Database: {title or '(untitled)'}")

        pages = paginate(OLD_TOKEN, f"databases/{old_db_id}/query", {})
        print(f"    {len(pages)} record(s) to migrate")

        for page in pages:
            props_in = page.get("properties", {})
            props_out: dict[str, Any] = {}
            for pname, pval in props_in.items():
                converted = convert_property_value(pval)
                if converted is not None:
                    props_out[pname] = converted

            body: dict[str, Any] = {
                "parent": {"database_id": new_db_id},
                "properties": props_out,
            }
            if page.get("icon"):
                body["icon"] = page["icon"]
            if page.get("cover"):
                body["cover"] = page["cover"]

            new_page = notion_post(NEW_TOKEN, "pages", body)
            page_id_map[page["id"]] = new_page["id"]
            time.sleep(0.35)

        print(f"    ✓ Done")

    return page_id_map


# ── Step 4: Rewire relations ──────────────────────────────────────────────────

def step4_rewire_relations(
    databases: list[dict],
    id_map: dict[str, str],
    page_id_map: dict[str, str],
) -> None:
    print("\n" + "="*60)
    print("STEP 4: Rewiring relations between databases")
    print("="*60)

    for db in databases:
        old_db_id = db["id"]
        new_db_id = id_map[old_db_id]
        title = "".join(t["plain_text"] for t in db.get("title", []))

        # Find relation properties in the old schema
        relation_props = {
            pname: pval
            for pname, pval in db.get("properties", {}).items()
            if pval["type"] == "relation"
        }

        if not relation_props:
            continue

        print(f"\n  Database: {title or '(untitled)'}")

        # 1. Add relation properties to the new database schema
        for pname, pval in relation_props.items():
            old_target = pval["relation"]["database_id"]
            new_target = id_map.get(old_target)
            if not new_target:
                print(f"    ⚠ Skipping '{pname}': target DB {old_target} not in migration set")
                continue

            print(f"    Adding relation property '{pname}' → {new_target}")
            try:
                notion_patch(NEW_TOKEN, f"databases/{new_db_id}", {
                    "properties": {
                        pname: {
                            "relation": {
                                "database_id": new_target,
                                "type": "single_property",
                                "single_property": {},
                            }
                        }
                    }
                })
            except Exception as e:
                print(f"    ⚠ Could not add '{pname}': {e}")
            time.sleep(0.35)

        # 2. Re-query old pages and copy relation values to new pages
        pages = paginate(OLD_TOKEN, f"databases/{old_db_id}/query", {})
        for page in pages:
            old_page_id = page["id"]
            new_page_id = page_id_map.get(old_page_id)
            if not new_page_id:
                continue

            rel_updates: dict[str, Any] = {}
            for pname in relation_props:
                old_val = page.get("properties", {}).get(pname, {})
                if old_val.get("type") != "relation":
                    continue
                new_relations = []
                for rel in old_val.get("relation", []):
                    mapped = page_id_map.get(rel["id"])
                    if mapped:
                        new_relations.append({"id": mapped})
                if new_relations:
                    rel_updates[pname] = {"relation": new_relations}

            if rel_updates:
                try:
                    notion_patch(NEW_TOKEN, f"pages/{new_page_id}", {
                        "properties": rel_updates
                    })
                except Exception as e:
                    print(f"    ⚠ Could not update relations for page {new_page_id}: {e}")
                time.sleep(0.35)

    print("\n  ✓ Relations rewired")


# ── Main ──────────────────────────────────────────────────────────────────────

def validate_config() -> None:
    errors = []
    if not NEW_TOKEN:
        errors.append("NEW_TOKEN is not set. Edit the script and paste your new workspace token.")
    if not NEW_PARENT_PAGE_ID:
        errors.append("NEW_PARENT_PAGE_ID is not set. Edit the script and paste the parent page ID.")
    if errors:
        print("\nConfiguration errors:")
        for e in errors:
            print(f"  • {e}")
        sys.exit(1)


STATE_FILE = "migration_state.json"


def save_state(data: dict) -> None:
    with open(STATE_FILE, "w") as f:
        json.dump(data, f, indent=2)


def load_state() -> dict:
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def main() -> None:
    validate_config()

    state = load_state()
    resuming = bool(state)

    print("\nNotion Workspace Migration")
    print("─" * 60)

    if resuming:
        print("Resuming from saved state (migration_state.json).")
        print("  Steps 1 & 2 will be skipped — using existing database IDs.")
        print("  Duplicate databases from the previous run remain in the new")
        print("  workspace; you can delete them manually after verifying results.")
        if not confirm("Resume from Step 3 (migrate records)?"):
            print("Aborted.")
            sys.exit(0)

        databases = state["databases_meta"]
        id_map = state["id_map"]
    else:
        print("This script will:")
        print("  1. Read all databases from the OLD workspace")
        print("  2. Recreate them under the specified page in the NEW workspace")
        print("  3. Migrate all records (text, numbers, selects, dates, etc.)")
        print("  4. Rewire relation properties between databases")
        print("\nNote: Uploaded files, people fields, and rollups cannot be")
        print("migrated via the Notion API and will be skipped.")

        if not confirm("Ready to start?"):
            print("Aborted.")
            sys.exit(0)

        # ── Step 1 ──
        databases = step1_read_databases()
        if not databases:
            print("\nNo databases found in the old workspace. Exiting.")
            sys.exit(0)

        if not confirm(f"Found {len(databases)} database(s). Proceed to recreate them in the new workspace?"):
            print("Aborted.")
            sys.exit(0)

        # ── Step 2 ──
        id_map = step2_recreate_databases(databases, NEW_PARENT_PAGE_ID)
        save_state({"id_map": id_map, "databases_meta": databases})
        print(f"\n  State saved to {STATE_FILE}")

        if not confirm("Databases created. Proceed to migrate records?"):
            print("Aborted. Run the script again to resume from Step 3.")
            sys.exit(0)

    # ── Step 3 ──
    page_id_map = step3_migrate_records(databases, id_map)

    if not confirm("Records migrated. Proceed to rewire relations?"):
        print("Aborted. Relations not wired.")
        sys.exit(0)

    # ── Step 4 ──
    step4_rewire_relations(databases, id_map, page_id_map)

    # ── Summary ──
    print("\n" + "="*60)
    print("MIGRATION COMPLETE")
    print("="*60)
    print(f"  Databases migrated : {len(id_map)}")
    print(f"  Records migrated   : {len(page_id_map)}")
    print("\nDatabase ID map (old → new):")
    for old, new in id_map.items():
        print(f"  {old} → {new}")

    mapping = {"databases": id_map, "pages": page_id_map}
    with open("migration_mapping.json", "w") as f:
        json.dump(mapping, f, indent=2)
    print("\nFull mapping saved to migration_mapping.json")

    # Clean up state file on success
    import os
    if os.path.exists(STATE_FILE):
        os.remove(STATE_FILE)

    print("\n⚠  Remember to rotate your old Notion token after verifying the migration.")


if __name__ == "__main__":
    main()
