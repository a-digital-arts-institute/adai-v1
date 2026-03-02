#!/usr/bin/env python3
"""
concept_linker.py – Build the relational intelligence layer.
Reads concepts_cache.json, creates/matches Concepts, Practitioners,
Scenes, and Threads, then links everything back to signals.
"""

import json
import logging
import os
import sys
import time
from datetime import datetime

import requests
# ── Load environment ──────────────────────────────────────────────
def _load_env():
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    vals = {}
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip('"').strip()
            if key and key.isidentifier() and not key.startswith("cat"):
                vals[key] = val
    return vals

_ENV = _load_env()

def env(key):
    return _ENV.get(key, "")

NOTION_TOKEN       = env("NOTION_TOKEN")
DB_SIGNALS         = env("NOTION_DB_SIGNALS")
DB_CONCEPTS        = env("NOTION_DB_CONCEPTS")
DB_PRACTITIONERS   = env("NOTION_DB_PRACTITIONERS")
DB_SCENES          = env("NOTION_DB_SCENES")
DB_THREADS         = env("NOTION_DB_THREADS")

REQUIRED = {
    "NOTION_TOKEN": NOTION_TOKEN, "NOTION_DB_SIGNALS": DB_SIGNALS,
    "NOTION_DB_CONCEPTS": DB_CONCEPTS, "NOTION_DB_PRACTITIONERS": DB_PRACTITIONERS,
    "NOTION_DB_SCENES": DB_SCENES, "NOTION_DB_THREADS": DB_THREADS,
}
missing = [k for k, v in REQUIRED.items() if not v]
if missing:
    sys.exit(f"ERROR: Missing env vars: {', '.join(missing)}")

NOTION_HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}

DELAY = 0.34

# ── Logging ───────────────────────────────────────────────────────
error_logger = logging.getLogger("errors")
error_logger.setLevel(logging.ERROR)
fh = logging.FileHandler(os.path.join(os.path.dirname(__file__), "errors.log"))
fh.setFormatter(logging.Formatter("%(asctime)s %(message)s"))
error_logger.addHandler(fh)

# ── Counters ──────────────────────────────────────────────────────
stats = {
    "signals_linked": 0,
    "concepts_created": 0, "concepts_matched": 0,
    "practitioners_created": 0, "practitioners_matched": 0,
    "scenes_created": 0,
    "threads_suggested": 0,
}


# ── Notion Helpers ────────────────────────────────────────────────

def notion_post(path, body):
    url = f"https://api.notion.com/v1/{path}"
    r = requests.post(url, headers=NOTION_HEADERS, json=body)
    time.sleep(DELAY)
    if not r.ok:
        raise Exception(f"Notion POST {path}: {r.status_code} {r.text[:300]}")
    return r.json()


def notion_patch(path, body):
    url = f"https://api.notion.com/v1/{path}"
    r = requests.patch(url, headers=NOTION_HEADERS, json=body)
    time.sleep(DELAY)
    if not r.ok:
        raise Exception(f"Notion PATCH {path}: {r.status_code} {r.text[:300]}")
    return r.json()


def query_all(db_id):
    """Fetch all pages from a database."""
    results = []
    cursor = None
    while True:
        body = {}
        if cursor:
            body["start_cursor"] = cursor
        data = notion_post(f"databases/{db_id}/query", body)
        results.extend(data.get("results", []))
        if not data.get("has_more"):
            break
        cursor = data.get("next_cursor")
    return results


def get_title(page):
    """Extract title text from a Notion page."""
    props = page.get("properties", {})
    for prop in props.values():
        if prop.get("type") == "title":
            return "".join(t.get("plain_text", "") for t in prop.get("title", []))
    return ""


def add_relation(page_id, relation_property, target_ids):
    """Append relation IDs to a page's relation property."""
    # First get existing relations
    url = f"https://api.notion.com/v1/pages/{page_id}"
    r = requests.get(url, headers=NOTION_HEADERS)
    time.sleep(DELAY)
    if not r.ok:
        raise Exception(f"Get page {page_id}: {r.status_code}")

    page = r.json()
    existing = []
    prop = page.get("properties", {}).get(relation_property, {})
    if prop.get("type") == "relation":
        existing = [rel["id"] for rel in prop.get("relation", [])]

    # Merge
    all_ids = list(set(existing + target_ids))
    notion_patch(f"pages/{page_id}", {
        "properties": {
            relation_property: {
                "relation": [{"id": rid} for rid in all_ids]
            }
        }
    })


# ── Step 1: Load cache ───────────────────────────────────────────

def load_cache():
    cache_path = os.path.join(os.path.dirname(__file__), "concepts_cache.json")
    if not os.path.exists(cache_path):
        sys.exit("ERROR: concepts_cache.json not found. Run signal_processor.py first.")
    with open(cache_path) as f:
        return json.load(f)


# ── Step 2: Build indexes ────────────────────────────────────────

def build_index(db_id, label):
    """Fetch all pages and build {lowercase_name: page_id} index."""
    print(f"    Indexing {label}...")
    pages = query_all(db_id)
    index = {}
    for page in pages:
        name = get_title(page).strip()
        if name:
            index[name.lower()] = page["id"]
    print(f"    Found {len(index)} existing {label}")
    return index


# ── Step 3: Process concepts ─────────────────────────────────────

def match_concept(name, index):
    """Match a concept name against the index. Returns (page_id, match_type) or (None, None)."""
    lower = name.lower().strip()

    # Exact match
    if lower in index:
        return index[lower], "exact"

    # Substring match
    for existing_name, page_id in index.items():
        if lower in existing_name or existing_name in lower:
            return page_id, f"substring (matched '{existing_name}')"

    return None, None


def process_concepts(signal_id, signal_data, concept_index):
    concepts = signal_data.get("concepts", [])
    scene_tags = signal_data.get("scene_tags", [])
    date = signal_data.get("date_captured") or datetime.now().strftime("%Y-%m-%d")
    new_count = 0
    matched_count = 0

    for concept_name in concepts:
        if not concept_name or not concept_name.strip():
            continue

        try:
            page_id, match_type = match_concept(concept_name, concept_index)

            if page_id:
                matched_count += 1
                stats["concepts_matched"] += 1
            else:
                # Create new concept
                tag_props = [{"name": t} for t in scene_tags[:5]]
                result = notion_post("pages", {
                    "parent": {"database_id": DB_CONCEPTS},
                    "properties": {
                        "Name": {"title": [{"text": {"content": concept_name.title()}}]},
                        "first_seen": {"date": {"start": date}},
                        "status": {"select": {"name": "emerging"}},
                        "tags": {"multi_select": tag_props},
                    }
                })
                page_id = result["id"]
                concept_index[concept_name.lower().strip()] = page_id
                new_count += 1
                stats["concepts_created"] += 1

            # Link signal → concept
            try:
                add_relation(signal_id, "Concepts", [page_id])
            except Exception:
                pass  # Relation property may not exist

        except Exception as e:
            error_logger.error(f"Concept '{concept_name}': {e}")

    return new_count, matched_count


# ── Step 4: Process practitioners ─────────────────────────────────

def match_practitioner(name, index):
    lower = name.lower().strip()

    # Exact match
    if lower in index:
        return index[lower], "exact"

    # Last name match
    parts = lower.split()
    if len(parts) > 1:
        last = parts[-1]
        for existing_name, page_id in index.items():
            existing_parts = existing_name.split()
            if existing_parts and existing_parts[-1] == last:
                return page_id, f"last-name (matched '{existing_name}')"

    return None, None


def process_practitioners(signal_id, signal_data, practitioner_index):
    practitioners = signal_data.get("practitioners", [])
    new_count = 0
    matched_count = 0

    for name in practitioners:
        if not name or not name.strip():
            continue

        try:
            page_id, match_type = match_practitioner(name, practitioner_index)

            if page_id:
                matched_count += 1
                stats["practitioners_matched"] += 1
            else:
                result = notion_post("pages", {
                    "parent": {"database_id": DB_PRACTITIONERS},
                    "properties": {
                        "Name": {"title": [{"text": {"content": name}}]},
                        "type": {"select": {"name": "artist"}},
                        "first_mentioned_in": {"select": {"name": "primary"}},
                    }
                })
                page_id = result["id"]
                practitioner_index[name.lower().strip()] = page_id
                new_count += 1
                stats["practitioners_created"] += 1

            # Link signal → practitioner
            try:
                add_relation(signal_id, "Practitioners", [page_id])
            except Exception:
                pass

        except Exception as e:
            error_logger.error(f"Practitioner '{name}': {e}")

    return new_count, matched_count


# ── Step 5: Process scenes ────────────────────────────────────────

def process_scenes(signal_id, signal_data, scene_index):
    scene_tags = signal_data.get("scene_tags", [])
    linked = []

    for scene_name in scene_tags:
        if not scene_name or not scene_name.strip():
            continue

        try:
            lower = scene_name.lower().strip()

            if lower in scene_index:
                page_id = scene_index[lower]
            else:
                result = notion_post("pages", {
                    "parent": {"database_id": DB_SCENES},
                    "properties": {
                        "Name": {"title": [{"text": {"content": scene_name}}]},
                        "status": {"select": {"name": "emerging"}},
                    }
                })
                page_id = result["id"]
                scene_index[lower] = page_id
                stats["scenes_created"] += 1

            # Link signal → scene
            try:
                add_relation(signal_id, "Scenes", [page_id])
            except Exception:
                pass

            linked.append(scene_name)

        except Exception as e:
            error_logger.error(f"Scene '{scene_name}': {e}")

    return linked


# ── Step 6: Suggested threads ─────────────────────────────────────

def process_thread(signal_data, thread_index):
    suggested = signal_data.get("suggested_thread")
    if not suggested:
        return None

    lower = suggested.lower().strip()

    # Check for similar existing thread
    for existing_name, page_id in thread_index.items():
        # Simple similarity: check if significant words overlap
        existing_words = set(existing_name.split())
        new_words = set(lower.split())
        # Remove common words
        stop = {"is", "the", "a", "an", "of", "in", "to", "and", "or", "for", "how", "what", "why", "does"}
        existing_sig = existing_words - stop
        new_sig = new_words - stop
        if existing_sig and new_sig and len(existing_sig & new_sig) >= 2:
            print(f"      Existing thread matched: {existing_name}")
            return existing_name

    # Create new thread
    try:
        result = notion_post("pages", {
            "parent": {"database_id": DB_THREADS},
            "properties": {
                "Name": {"title": [{"text": {"content": suggested}}]},
                "question": {"rich_text": [{"text": {"content": suggested}}]},
                "status": {"select": {"name": "open"}},
            }
        })
        thread_index[lower] = result["id"]
        stats["threads_suggested"] += 1
        print(f"      New thread suggested: {suggested}")
        return suggested
    except Exception as e:
        error_logger.error(f"Thread '{suggested}': {e}")
        return None


# ── Main ──────────────────────────────────────────────────────────

def main():
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n{'='*60}")
    print(f"  A(DAI) Concept Linker")
    print(f"  {ts}")
    print(f"{'='*60}\n")

    # Step 1: Load cache
    cache = load_cache()
    print(f"  {len(cache)} signals to link\n")

    if not cache:
        print("  Nothing to link.")
        return

    # Step 2: Build indexes
    print("  Building indexes...")
    concept_index = build_index(DB_CONCEPTS, "concepts")
    practitioner_index = build_index(DB_PRACTITIONERS, "practitioners")
    scene_index = build_index(DB_SCENES, "scenes")
    thread_index = build_index(DB_THREADS, "threads")
    print()

    # Steps 3-6: Process each signal
    for signal_id, signal_data in cache.items():
        title = signal_data.get("title", "(untitled)")
        print(f"  \u2192 {title}")

        try:
            # Concepts
            c_new, c_matched = process_concepts(signal_id, signal_data, concept_index)
            print(f"    concepts linked: {c_new + c_matched} ({c_new} new, {c_matched} matched)")

            # Practitioners
            p_new, p_matched = process_practitioners(signal_id, signal_data, practitioner_index)
            print(f"    practitioners linked: {p_new + p_matched} ({p_new} new, {p_matched} matched)")

            # Scenes
            scenes_linked = process_scenes(signal_id, signal_data, scene_index)
            print(f"    scenes: {', '.join(scenes_linked) if scenes_linked else 'none'}")

            # Thread
            thread = process_thread(signal_data, thread_index)
            print(f"    thread: {thread or 'none'}")
            print()

            stats["signals_linked"] += 1

        except Exception as e:
            error_logger.error(f"Signal '{title}': {e}")
            print(f"    \u2717 ERROR: {str(e)[:100]}")
            print()

    # Summary
    print(f"\n{'='*60}")
    print(f"  SUMMARY")
    print(f"{'='*60}")
    print(f"  Signals linked:         {stats['signals_linked']}")
    print(f"  Concepts created:       {stats['concepts_created']}")
    print(f"  Concepts matched:       {stats['concepts_matched']}")
    print(f"  Practitioners created:  {stats['practitioners_created']}")
    print(f"  Practitioners matched:  {stats['practitioners_matched']}")
    print(f"  Scenes created:         {stats['scenes_created']}")
    print(f"  Threads suggested:      {stats['threads_suggested']}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
