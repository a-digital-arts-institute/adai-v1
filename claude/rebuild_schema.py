#!/usr/bin/env python3
"""
rebuild_schema.py – Rebuild all properties on all 6 A(DAI) databases.
Includes original schema + intelligence tier additions + relations.
"""

import requests
import time
import sys
from datetime import datetime

TOKEN = "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"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}

DB = {
    "signals":       "e380fc07-d10f-4242-baef-ffbc58ed0e95",
    "concepts":      "1ab6bc40-63df-4a45-812f-901012edc7a7",
    "practitioners": "3c2bc39a-bef9-4499-9ff8-ee25f7417b0d",
    "scenes":        "e6691c7d-f78b-4f9e-a959-1574505bb126",
    "threads":       "cc3dec36-47b0-4d93-b0b5-7899daca6018",
    "outputs":       "51e71a4e-1e19-47dc-81b5-437c5aeb409f",
}

DELAY = 0.5
changes = []
errors = []


def patch(db_id, db_name, properties):
    """Update a database with properties. Returns True on success."""
    url = f"https://api.notion.com/v1/databases/{db_id}"
    r = requests.patch(url, headers=HEADERS, json={"properties": properties})
    if r.ok:
        names = list(properties.keys())
        for n in names:
            changes.append(f"{db_name} → {n}")
        print(f"    ✓ {', '.join(names)}")
        return True
    else:
        err = r.text[:300]
        errors.append(f"{db_name}: {err}")
        print(f"    ✗ {r.status_code}: {err}")
        return False


def sel(options):
    return {"select": {"options": [{"name": n, "color": c} for n, c in options]}}


def msel(options):
    return {"multi_select": {"options": [{"name": n, "color": c} for n, c in options]}}


# ══════════════════════════════════════════════════════════════════

def main():
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n{'='*60}")
    print(f"  A(DAI) Full Schema Rebuild")
    print(f"  {ts}")
    print(f"{'='*60}")

    # ── SIGNAL INBOX ──────────────────────────────────────────────
    print(f"\n  [1/6] Signal Inbox")

    patch(DB["signals"], "Signal Inbox", {
        "url": {"url": {}},
        "source_type": sel([
            ("transcript", "green"), ("observation", "yellow"),
            ("conversation", "purple"), ("meeting_notes", "blue"),
            ("article", "orange"), ("bookmark", "default"),
            ("web_scan", "gray"), ("publication", "red"),
        ]),
        "raw_content": {"rich_text": {}},
        "submitted_by": sel([
            ("Iri", "pink"), ("JB", "blue"), ("Piyush", "green"),
            ("Gio", "orange"), ("system", "gray"),
        ]),
    })
    time.sleep(DELAY)

    patch(DB["signals"], "Signal Inbox", {
        "date_captured": {"date": {}},
        "protocol_stage": sel([
            ("SENSE", "blue"), ("QUERY", "purple"), ("SPECULATE", "yellow"),
            ("REACT", "orange"), ("EXPERIMENT", "red"),
        ]),
        "status": sel([
            ("raw", "default"), ("processing", "yellow"),
            ("processed", "green"), ("archived", "gray"),
        ]),
        "summary_ai": {"rich_text": {}},
    })
    time.sleep(DELAY)

    patch(DB["signals"], "Signal Inbox", {
        "signal_type": sel([
            ("conversation", "purple"), ("lecture", "blue"),
            ("interview", "green"), ("meeting", "yellow"),
            ("panel", "orange"), ("field_recording", "red"), ("other", "gray"),
        ]),
        "key_quotes": {"rich_text": {}},
        "tags": msel([]),
    })
    time.sleep(DELAY)

    # Intelligence tier additions
    patch(DB["signals"], "Signal Inbox", {
        "intelligence_tier": sel([("primary", "green"), ("secondary", "blue")]),
        "signal_confidence": sel([
            ("verified", "green"), ("unverified", "yellow"), ("speculative", "red"),
        ]),
        "corroborated": {"checkbox": {}},
    })
    time.sleep(DELAY)

    # ── CONCEPTS ──────────────────────────────────────────────────
    print(f"\n  [2/6] Concepts")

    patch(DB["concepts"], "Concepts", {
        "definition": {"rich_text": {}},
        "first_seen": {"date": {}},
        "status": sel([
            ("emerging", "green"), ("established", "blue"),
            ("contested", "orange"), ("dormant", "gray"),
        ]),
        "tags": msel([]),
        "primary_signal_count": {"number": {"format": "number"}},
        "secondary_signal_count": {"number": {"format": "number"}},
    })
    time.sleep(DELAY)

    # ── PRACTITIONERS & ORGS ──────────────────────────────────────
    print(f"\n  [3/6] Practitioners & Orgs")

    patch(DB["practitioners"], "Practitioners & Orgs", {
        "type": sel([
            ("artist", "pink"), ("collective", "purple"),
            ("institution", "blue"), ("critic", "yellow"),
            ("funder", "green"), ("platform", "orange"), ("researcher", "red"),
        ]),
        "practice": {"rich_text": {}},
        "scene": msel([
            ("generative", "blue"), ("on-chain", "purple"), ("net-art", "pink"),
            ("XR", "green"), ("glitch", "red"), ("creative-coding", "orange"),
            ("game-art", "yellow"), ("algorithmic", "default"),
            ("ai-art", "gray"), ("other", "brown"),
        ]),
    })
    time.sleep(DELAY)

    patch(DB["practitioners"], "Practitioners & Orgs", {
        "geography": {"rich_text": {}},
        "significance": {"rich_text": {}},
        "url": {"url": {}},
        "first_mentioned_in": sel([("primary", "green"), ("secondary", "blue")]),
    })
    time.sleep(DELAY)

    # ── SCENES ────────────────────────────────────────────────────
    print(f"\n  [4/6] Scenes")

    patch(DB["scenes"], "Scenes", {
        "description": {"rich_text": {}},
        "geography": {"rich_text": {}},
        "status": sel([
            ("emerging", "green"), ("established", "blue"),
            ("fragmenting", "orange"), ("dormant", "gray"),
        ]),
        "tags": msel([]),
        "intelligence_coverage": sel([
            ("primary_only", "green"), ("secondary_only", "blue"),
            ("both", "purple"), ("none", "gray"),
        ]),
    })
    time.sleep(DELAY)

    # ── THREADS ───────────────────────────────────────────────────
    print(f"\n  [5/6] Threads")

    patch(DB["threads"], "Threads", {
        "question": {"rich_text": {}},
        "status": sel([
            ("open", "green"), ("dormant", "yellow"), ("resolved", "gray"),
        ]),
        "lead": sel([
            ("Iri", "pink"), ("JB", "blue"), ("Piyush", "green"), ("Gio", "orange"),
        ]),
        "tags": msel([]),
        "primary_signal_count": {"number": {"format": "number"}},
        "secondary_signal_count": {"number": {"format": "number"}},
    })
    time.sleep(DELAY)

    # ── SENSEMAKING OUTPUTS ───────────────────────────────────────
    print(f"\n  [6/6] Sensemaking Outputs")

    patch(DB["outputs"], "Sensemaking Outputs", {
        "type": sel([
            ("brief", "blue"), ("query_response", "purple"),
            ("pattern_report", "green"), ("field_dispatch", "yellow"),
            ("analysis", "orange"), ("movement_map", "red"),
            ("exhibition_proposal", "pink"),
        ]),
        "content": {"rich_text": {}},
        "generated_by": sel([
            ("Iri", "pink"), ("JB", "blue"), ("Piyush", "green"),
            ("Gio", "orange"), ("system", "gray"),
        ]),
    })
    time.sleep(DELAY)

    patch(DB["outputs"], "Sensemaking Outputs", {
        "date": {"date": {}},
        "tags": msel([]),
        "primary_sources": {"number": {"format": "number"}},
        "secondary_sources": {"number": {"format": "number"}},
        "intelligence_basis": sel([
            ("primary_led", "green"), ("secondary_led", "blue"), ("mixed", "purple"),
        ]),
    })
    time.sleep(DELAY)

    # ── RELATIONS ─────────────────────────────────────────────────
    print(f"\n  Wiring relations...")

    RELATIONS = [
        (DB["signals"], "Signal Inbox", "Concepts", DB["concepts"]),
        (DB["signals"], "Signal Inbox", "Practitioners", DB["practitioners"]),
        (DB["signals"], "Signal Inbox", "Scenes", DB["scenes"]),
        (DB["signals"], "Signal Inbox", "Threads", DB["threads"]),
        (DB["concepts"], "Concepts", "Practitioners", DB["practitioners"]),
        (DB["concepts"], "Concepts", "Scenes", DB["scenes"]),
        (DB["practitioners"], "Practitioners", "Scenes", DB["scenes"]),
        (DB["threads"], "Threads", "Concepts", DB["concepts"]),
        (DB["outputs"], "Outputs", "Signals", DB["signals"]),
        (DB["outputs"], "Outputs", "Threads", DB["threads"]),
        (DB["outputs"], "Outputs", "Concepts", DB["concepts"]),
    ]

    for src_id, src_name, prop_name, target_id in RELATIONS:
        url = f"https://api.notion.com/v1/databases/{src_id}"
        body = {
            "properties": {
                prop_name: {
                    "relation": {
                        "database_id": target_id,
                        "type": "dual_property",
                        "dual_property": {},
                    }
                }
            }
        }
        r = requests.patch(url, headers=HEADERS, json=body)
        if r.ok:
            changes.append(f"{src_name} → {prop_name} (relation)")
            print(f"    ✓ {src_name} → {prop_name}")
        else:
            err = r.text[:200]
            errors.append(f"Relation {src_name}.{prop_name}: {err}")
            print(f"    ✗ {src_name} → {prop_name}: {err}")
        time.sleep(DELAY)

    # ── SUMMARY ───────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"  Done: {len(changes)} changes, {len(errors)} errors")
    print(f"{'='*60}\n")

    if errors:
        print("  Errors:")
        for e in errors:
            print(f"    ✗ {e[:120]}")


if __name__ == "__main__":
    main()
