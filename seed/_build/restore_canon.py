#!/usr/bin/env python3
"""restore_canon.py — restore Irina's v1 editorial canon, contract-cleaned.

The v1 canon (commit 163ffa0) is the OUTPUT of a sound editorial process
(SOURCES.md Steps 1-5: 12 categories, six selection criteria, 146
practitioners chosen for field-structural significance). Its ONE problem
was Step 6 — LLM-generated practitioner prose (practice_summary,
methodology, etc.) and a now-deleted heuristic-EMBODIES pass.

This producer restores her node/edge SET (146 practitioners, ~728
artworks, scenes, institutions, her artwork picks) and removes only the
contamination, by mechanically applying the producer contract's
anti-enrichment rule to the legacy data:

  - Strip narrative metadata fields (description/bio/summary/methodology/
    practice_summary/commons_summary/governance_summary/full_profile/…)
    that carry no sibling source URL. These are the Step-6 fabrications.
  - Normalise legacy string confidence ('high'/'medium'/'low') → float.
  - Ensure every row carries signal_id / created_by / batch_id /
    valid_from (stamping the restore signal where v1 lacked them).
  - Flag every practitioner canon_tier=primary (this IS the curated canon).

Keeps: her selection, her artwork curation (key_works), her scenes &
institutions, her source-attested edges, her 12 provenance signals (as
history), her aliases.

Reads:  v1 canon blobs (default: from git via the caller, staged in
        --v1-dir; or pass an explicit dir).
Writes: <out>/{nodes,edges,signals,contributors,aliases}.json
        (default out = seed/, i.e. this becomes the shipped canon).

Run:
    # stage v1 blobs first:
    mkdir -p /tmp/v1canon
    for f in nodes edges signals contributors aliases; do
      git show 163ffa0:seed/$f.json > /tmp/v1canon/$f.json; done
    python3 seed/_build/restore_canon.py --v1-dir /tmp/v1canon --out /tmp/restored
    python3 seed/_build/validate_seed.py --canon --seed-dir /tmp/restored
    # if clean:
    python3 seed/_build/restore_canon.py --v1-dir /tmp/v1canon --out seed
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent))
from _node_schema import NARRATIVE_KEYS, SOURCE_URL_KEYS, _has_source_url  # noqa: E402
from _provenance import GathererSignal, now_iso  # noqa: E402
from _slug import slugify  # noqa: E402

PRODUCER = "restore-canon"

CONFIDENCE_MAP = {"high": 1.0, "medium": 0.6, "low": 0.3}

# Extra narrative keys specific to the v1 practitioner schema (Step-6 prose).
V1_PROSE_KEYS = {
    "practice_summary", "methodology", "commons_summary", "governance_summary",
    "full_profile", "description", "bio", "biography", "summary", "notes",
    "commons_orientation", "governance_model",
}
STRIP_KEYS = set(NARRATIVE_KEYS) | V1_PROSE_KEYS


def _parse_md(n: dict[str, Any]) -> dict[str, Any]:
    m = n.get("metadata")
    if isinstance(m, str):
        try:
            return json.loads(m)
        except json.JSONDecodeError:
            return {}
    return m or {}


def _conf(v: Any) -> float:
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str) and v.lower() in CONFIDENCE_MAP:
        return CONFIDENCE_MAP[v.lower()]
    return 1.0


def restore(v1_dir: Path) -> dict[str, list[dict[str, Any]]]:
    v1_nodes = json.loads((v1_dir / "nodes.json").read_text())
    v1_edges = json.loads((v1_dir / "edges.json").read_text())
    v1_signals = json.loads((v1_dir / "signals.json").read_text())
    v1_contribs = json.loads((v1_dir / "contributors.json").read_text())
    v1_aliases = json.loads((v1_dir / "aliases.json").read_text())

    sig = GathererSignal(
        producer=PRODUCER,
        source="seed canon v1 (commit 163ffa0), contract-cleaned",
        config={"stripped_keys": sorted(STRIP_KEYS), "confidence_map": CONFIDENCE_MAP},
    )
    restore_sig_row = sig.as_row()
    now = now_iso()

    stats = {"nodes": 0, "prose_fields_stripped": 0, "edges": 0, "conf_normalised": 0}

    # ---- nodes ----
    out_nodes = []
    for n in v1_nodes:
        md = dict(_parse_md(n))
        # Strip Step-6 LLM prose UNCONDITIONALLY. A practitioner's homepage
        # `url` doesn't make a generated bio true — the prose's provenance is
        # ai_assisted (Step 6), not the homepage. So unlike the generic
        # anti-enrichment rule (prose allowed if a sibling source URL exists),
        # these specific known-fabricated fields always go.
        for k in list(md.keys()):
            if k in STRIP_KEYS:
                md.pop(k, None)
                stats["prose_fields_stripped"] += 1
        # ensure a source_url exists where we can derive one (QID)
        if not _has_source_url(md):
            qid = md.get("wikidata_qid") or md.get("qid")
            if qid:
                md["source_url"] = f"https://www.wikidata.org/wiki/{qid}"
        # flag practitioners as primary (this is the curated canon)
        if n["type"] == "practitioner":
            md["canon_tier"] = "primary"
        # Regenerate slug from name with the v2 slugify so it's consistent with
        # the contract (validator checks slug startswith slugify(name)). v1's
        # legacy slug scheme differed on +/&/. characters.
        regen_slug = slugify(n["name"]).replace(" ", "-") or n.get("slug") or n["id"].split(":", 1)[1]
        row = {
            "id": n["id"], "type": n["type"], "name": n["name"], "slug": regen_slug,
            "metadata": json.dumps(md, ensure_ascii=False, sort_keys=True),
            "signal_id": n.get("signal_id") or restore_sig_row["id"],
            "created_by": n.get("updated_by") or "contributor:migration",
            "batch_id": sig.batch_id,
        }
        out_nodes.append(row)
        stats["nodes"] += 1

    # ---- edges ----
    out_edges = []
    for e in v1_edges:
        conf = e.get("confidence")
        if isinstance(conf, str):
            stats["conf_normalised"] += 1
        row = {
            "id": e["id"],
            "source_id": e["source_id"],
            "target_id": e["target_id"],
            "edge_type": e["edge_type"],
            "signal_id": e.get("signal_id") or restore_sig_row["id"],
            "confidence": _conf(conf),
            "created_by": e.get("created_by") or "contributor:migration",
            "batch_id": sig.batch_id,
            "valid_from": e.get("valid_from") or e.get("created_at") or now,
        }
        if e.get("charge") is not None:
            row["charge"] = e["charge"]
        if e.get("event_time") is not None:
            row["event_time"] = e["event_time"]
        if e.get("valid_until") is not None:
            row["valid_until"] = e["valid_until"]
        if e.get("invalidated_by") is not None:
            row["invalidated_by"] = e["invalidated_by"]
        out_edges.append(row)
        stats["edges"] += 1

    # ---- signals: keep v1's (history) + add restore signal ----
    out_signals = list(v1_signals)
    out_signals.append(restore_sig_row)
    # backfill schema-required fields the seeder binds positionally
    for s in out_signals:
        s.setdefault("title", s.get("claim_text") or s.get("id"))
        s.setdefault("source_url", None)
        s.setdefault("source_type", s.get("source_origin") or "api")
        s.setdefault("cla_layer", None)
        s.setdefault("summary", None)
        s.setdefault("content", None)
        s.setdefault("submitted_by", s.get("created_by") or "contributor:migration")
        s.setdefault("confidence", 1.0)
        s.setdefault("lived_experience", 0)
        s.setdefault("consent_scope", "structural_only")
        s.setdefault("consent_attribution", "attributed")
        s.setdefault("consent_revocable", 0)
        s.setdefault("processing_trace", None)
        s.setdefault("provenance_chain", None)
        s.setdefault("batch_id", None)
        s.setdefault("status", "active")
        s.setdefault("created_at", now)
        s.setdefault("created_by", "contributor:migration")

    # ---- contributors: keep v1's, ensure created_at ----
    out_contribs = list(v1_contribs)
    for c in out_contribs:
        c.setdefault("created_at", now)
        c.setdefault("contributions", 0)
        c.setdefault("approved_count", 0)

    # ---- aliases: keep, ensure created_at ----
    out_aliases = []
    for a in v1_aliases:
        a = dict(a)
        a.setdefault("created_at", now)
        out_aliases.append(a)

    return {
        "nodes": out_nodes, "edges": out_edges, "signals": out_signals,
        "contributors": out_contribs, "aliases": out_aliases, "_stats": stats,
    }


def _compact_lines(rows: list[dict[str, Any]]) -> str:
    if not rows:
        return "[]\n"
    body = ",\n".join("  " + json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in rows)
    return f"[\n{body}\n]\n"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--v1-dir", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    args = ap.parse_args()

    result = restore(args.v1_dir)
    stats = result.pop("_stats")
    args.out.mkdir(parents=True, exist_ok=True)
    for name in ("nodes", "edges", "signals", "contributors", "aliases"):
        (args.out / f"{name}.json").write_text(_compact_lines(result[name]))

    from collections import Counter
    by_type = Counter(json.loads(n["metadata"]).get("__t", n["type"]) if False else n["type"] for n in result["nodes"])
    by_etype = Counter(e["edge_type"] for e in result["edges"])
    print(f"Restored → {args.out}")
    print(f"  nodes: {len(result['nodes'])}  edges: {len(result['edges'])}  "
          f"signals: {len(result['signals'])}  aliases: {len(result['aliases'])}")
    print(f"  prose fields stripped: {stats['prose_fields_stripped']}")
    print(f"  confidence normalised: {stats['conf_normalised']}")
    print("  nodes by type:", dict(by_type))
    print("  edges by type:", dict(by_etype))
    return 0


if __name__ == "__main__":
    sys.exit(main())
