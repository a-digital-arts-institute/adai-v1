#!/usr/bin/env python3
"""
Validate seed/*.json against db.sql schema and referential integrity.

Checks:
  1. Every row has the expected columns for its table.
  2. Every edge source_id / target_id exists in nodes.
  3. Every alias node_id exists in nodes.
  4. Every edge signal_id exists in signals.
  5. No duplicate IDs within nodes, within edges, within aliases (by composite).
  6. No duplicate node names (case-insensitive) across non-auto-generated primary entries.
"""
import json
import sys
from pathlib import Path

SEED = Path(__file__).parent.parent

errors = []
warnings = []

def err(msg): errors.append(msg)
def warn(msg): warnings.append(msg)


# Load
nodes = json.load(open(SEED/"nodes.json"))
edges = json.load(open(SEED/"edges.json"))
signals = json.load(open(SEED/"signals.json"))
aliases = json.load(open(SEED/"aliases.json"))
contributors = json.load(open(SEED/"contributors.json"))

node_ids = set()
NODE_COLUMNS = {"id","type","name","slug","metadata","created_at","updated_by"}
for n in nodes:
    extra = set(n.keys()) - NODE_COLUMNS
    missing = NODE_COLUMNS - set(n.keys())
    if missing: err(f"nodes: {n.get('id','?')} missing columns: {missing}")
    if extra: warn(f"nodes: {n.get('id','?')} has extra columns: {extra}")
    if n["id"] in node_ids: err(f"nodes: duplicate id {n['id']}")
    node_ids.add(n["id"])
    # metadata should parse as JSON
    try: json.loads(n["metadata"])
    except Exception as e: err(f"nodes: {n['id']} metadata not valid JSON: {e}")

signal_ids = {s["id"] for s in signals}
EDGE_COLUMNS = {"id","source_id","target_id","edge_type","signal_id","confidence","charge","created_at","created_by","event_time","valid_from","valid_until","invalidated_by"}
edge_ids = set()
for e in edges:
    extra = set(e.keys()) - EDGE_COLUMNS
    missing = EDGE_COLUMNS - set(e.keys())
    if missing: err(f"edges: {e.get('id','?')} missing columns: {missing}")
    if extra: warn(f"edges: {e.get('id','?')} extra columns: {extra}")
    if e["id"] in edge_ids: err(f"edges: duplicate id {e['id']}")
    edge_ids.add(e["id"])
    if e["source_id"] not in node_ids:
        err(f"edges: source_id missing from nodes: {e['source_id']} (edge {e['id']})")
    if e["target_id"] not in node_ids:
        err(f"edges: target_id missing from nodes: {e['target_id']} (edge {e['id']})")
    if e["signal_id"] and e["signal_id"] not in signal_ids:
        err(f"edges: signal_id missing from signals: {e['signal_id']} (edge {e['id']})")

ALIAS_COLUMNS = {"source","external_id","node_id","created_at"}
alias_keys = set()
for a in aliases:
    extra = set(a.keys()) - ALIAS_COLUMNS
    missing = ALIAS_COLUMNS - set(a.keys())
    if missing: err(f"aliases: entry {a} missing columns: {missing}")
    if extra: warn(f"aliases: entry {a} extra columns: {extra}")
    key = (a["source"], a["external_id"])
    if key in alias_keys:
        err(f"aliases: duplicate (source, external_id): {key}")
    alias_keys.add(key)
    if a["node_id"] not in node_ids:
        err(f"aliases: node_id missing from nodes: {a['node_id']}")

SIGNAL_COLUMNS = {"id","title","source_url","source_type","cla_layer","summary","content","submitted_by","confidence","lived_experience","created_at","consent_scope","consent_attribution","consent_revocable","processing_trace","source_origin","batch_id","status","provenance_chain"}
for s in signals:
    extra = set(s.keys()) - SIGNAL_COLUMNS
    missing = SIGNAL_COLUMNS - set(s.keys())
    if missing: err(f"signals: {s.get('id','?')} missing columns: {missing}")
    if extra: warn(f"signals: {s.get('id','?')} extra columns: {extra}")

CONTRIB_COLUMNS = {"id","name","type","trust_tier","contributions","approved_count","created_at"}
for c in contributors:
    missing = CONTRIB_COLUMNS - set(c.keys())
    if missing: err(f"contributors: {c.get('id','?')} missing columns: {missing}")

# Duplicate name check across canonical practitioners
names_seen = {}
for n in nodes:
    md = json.loads(n["metadata"])
    if md.get("auto_generated"):
        continue
    if n["type"] not in ("practitioner","collective","project","platform","artwork"):
        continue
    key = (n["type"], n["name"].strip().lower())
    if key in names_seen:
        err(f"duplicate name in canonical entries: type={n['type']}, name={n['name']} (ids: {names_seen[key]}, {n['id']})")
    else:
        names_seen[key] = n["id"]

print(f"nodes:        {len(nodes)}")
print(f"edges:        {len(edges)}")
print(f"signals:      {len(signals)}")
print(f"aliases:      {len(aliases)}")
print(f"contributors: {len(contributors)}")
print()
print(f"ERRORS:   {len(errors)}")
for e in errors[:20]: print(f"  ✗ {e}")
if len(errors) > 20: print(f"  ... +{len(errors)-20} more")
print(f"WARNINGS: {len(warnings)}")
for w in warnings[:10]: print(f"  ⚠ {w}")
if len(warnings) > 10: print(f"  ... +{len(warnings)-10} more")

sys.exit(1 if errors else 0)
