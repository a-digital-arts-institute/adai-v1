#!/usr/bin/env python3
"""
apply_bundle.py — apply a real_source_merge bundle to a CR-SQLite db.

Reads:  ./real_source_merge_2026-04-28.json (or --bundle <path>)
Writes: <db> (default: ../adai.db)

Behavior:
  - Default is dry-run: prints counts and the delta, NO writes.
  - --apply performs the changes inside a single transaction.
  - --backup makes a timestamped copy of the db before applying.

The bundle structure (see real_source_merge_2026-04-28.summary.md):
  {
    "delete": {"edges": [...]},               # full edge records, key = id
    "insert": {"nodes": [...], "edges": [...]}
  }

Apply semantics (per bundle method_note):
  - DELETE FROM edges WHERE id IN (delete.edges[*].id)
  - INSERT OR REPLACE INTO nodes (...)        — idempotent
  - INSERT OR REPLACE INTO edges (...)        — idempotent

CR-SQLite note: the db has CR-SQLite CRR triggers attached to nodes/edges.
Plain INSERT/DELETE/UPDATE flow through them automatically; we don't need
to load the extension for a local apply.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).parent
DEFAULT_BUNDLE = HERE / "real_source_merge_2026-04-28.json"
DEFAULT_DB = HERE.parent.parent / "adai.db"

NODE_COLS = ["id", "type", "name", "slug", "metadata", "updated_by"]
EDGE_COLS = ["id", "source_id", "target_id", "edge_type",
             "signal_id", "confidence", "created_by"]


def baseline_counts(con: sqlite3.Connection) -> dict:
    out = {}
    out["nodes_total"] = con.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]
    out["edges_total"] = con.execute(
        "SELECT COUNT(*) FROM edges WHERE valid_until IS NULL"
    ).fetchone()[0]
    out["embodies"] = con.execute(
        "SELECT COUNT(*) FROM edges WHERE edge_type='EMBODIES' AND valid_until IS NULL"
    ).fetchone()[0]
    out["embodies_heuristic"] = con.execute(
        "SELECT COUNT(*) FROM edges WHERE edge_type='EMBODIES' "
        "AND signal_id='enrichment-seed-canon-v1-2026-04' AND valid_until IS NULL"
    ).fetchone()[0]
    out["artwork_with_image"] = con.execute(
        "SELECT COUNT(*) FROM nodes "
        "WHERE type='artwork' AND json_extract(metadata,'$.image_url') IS NOT NULL"
    ).fetchone()[0]
    out["artworks"] = con.execute(
        "SELECT COUNT(*) FROM nodes WHERE type='artwork'"
    ).fetchone()[0]
    out["practitioners"] = con.execute(
        "SELECT COUNT(*) FROM nodes WHERE type='practitioner'"
    ).fetchone()[0]
    out["scenes"] = con.execute(
        "SELECT COUNT(*) FROM nodes WHERE type='scene'"
    ).fetchone()[0]
    return out


def node_row(n: dict) -> tuple:
    meta = n.get("metadata")
    if isinstance(meta, (dict, list)):
        meta_text = json.dumps(meta, ensure_ascii=False)
    else:
        meta_text = meta or ""
    return (
        n["id"],
        n.get("type", ""),
        n.get("name", ""),
        n.get("slug", ""),
        meta_text,
        n.get("updated_by") or "real-source-merge-2026-04-28",
    )


def edge_row(e: dict) -> tuple:
    return (
        e["id"],
        e.get("source_id", ""),
        e.get("target_id", ""),
        e.get("edge_type", ""),
        e.get("signal_id"),
        e.get("confidence", "medium"),
        e.get("created_by", "real-source-merge-2026-04-28"),
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bundle", default=str(DEFAULT_BUNDLE))
    ap.add_argument("--db", default=str(DEFAULT_DB))
    ap.add_argument("--apply", action="store_true",
                    help="Actually write. Without this flag we dry-run.")
    ap.add_argument("--backup", action="store_true",
                    help="Copy the db to <db>.<timestamp>.bak before applying")
    args = ap.parse_args()

    bundle_path = Path(args.bundle)
    db_path = Path(args.db)

    if not bundle_path.exists():
        print(f"missing bundle: {bundle_path}", file=sys.stderr)
        sys.exit(1)
    if not db_path.exists():
        print(f"missing db: {db_path}", file=sys.stderr)
        sys.exit(1)

    bundle = json.loads(bundle_path.read_text())
    delete_ids = [e["id"] for e in bundle["delete"]["edges"]]
    insert_nodes = bundle["insert"]["nodes"]
    insert_edges = bundle["insert"]["edges"]

    print(f"Bundle:  {bundle_path}")
    print(f"DB:      {db_path}")
    print(f"  delete edges:  {len(delete_ids)}")
    print(f"  insert nodes:  {len(insert_nodes)}")
    print(f"  insert edges:  {len(insert_edges)}")
    print()

    con = sqlite3.connect(str(db_path))
    con.execute("PRAGMA foreign_keys = ON")
    before = baseline_counts(con)
    print("Baseline (before):")
    for k, v in before.items():
        print(f"  {k:<22} {v}")
    print()

    # Confirm overlaps so the user can see what will actually change
    existing_node_ids = {r[0] for r in con.execute("SELECT id FROM nodes")}
    overlap_nodes = sum(1 for n in insert_nodes if n["id"] in existing_node_ids)
    new_nodes = len(insert_nodes) - overlap_nodes
    existing_edge_ids = {r[0] for r in con.execute("SELECT id FROM edges")}
    overlap_edges = sum(1 for e in insert_edges if e["id"] in existing_edge_ids)
    new_edges = len(insert_edges) - overlap_edges
    delete_present = sum(1 for did in delete_ids if did in existing_edge_ids)

    print("Effect on db:")
    print(f"  nodes: {new_nodes} new + {overlap_nodes} replaced (INSERT OR REPLACE)")
    print(f"  edges: {new_edges} new + {overlap_edges} replaced")
    print(f"  delete: {delete_present} of {len(delete_ids)} target edges present in db "
          f"({len(delete_ids) - delete_present} already absent)")
    print()

    if not args.apply:
        print("DRY RUN — no writes performed. Re-run with --apply to commit.")
        return

    # Apply
    if args.backup:
        ts = datetime.utcnow().strftime("%Y%m%dT%H%M%S")
        backup_path = db_path.with_suffix(db_path.suffix + f".{ts}.bak")
        print(f"Backing up db → {backup_path}")
        shutil.copy2(db_path, backup_path)

    print(f"Applying...")
    cur = con.cursor()
    try:
        cur.execute("BEGIN")
        # 1) delete heuristic embodies (by id)
        cur.executemany(
            "DELETE FROM edges WHERE id = ?",
            [(did,) for did in delete_ids],
        )
        deleted = cur.rowcount
        # 2) upsert nodes
        cur.executemany(
            "INSERT OR REPLACE INTO nodes "
            "(id, type, name, slug, metadata, updated_by) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            [node_row(n) for n in insert_nodes],
        )
        nodes_written = cur.rowcount
        # 3) upsert edges
        cur.executemany(
            "INSERT OR REPLACE INTO edges "
            "(id, source_id, target_id, edge_type, signal_id, confidence, created_by) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            [edge_row(e) for e in insert_edges],
        )
        edges_written = cur.rowcount
        con.commit()
    except Exception:
        con.rollback()
        raise

    print(f"  deleted: {deleted}")
    print(f"  nodes upserted: {nodes_written}")
    print(f"  edges upserted: {edges_written}")
    print()

    after = baseline_counts(con)
    print("Final state (after):")
    for k, v in after.items():
        delta = v - before[k]
        sign = "+" if delta >= 0 else ""
        print(f"  {k:<22} {v}  ({sign}{delta})")
    print()
    con.close()
    print("Done.")


if __name__ == "__main__":
    main()
