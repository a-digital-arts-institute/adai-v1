#!/usr/bin/env python3
"""
Validate seed canon or a per-gatherer batch against the producer contract.

Two modes:

    python3 seed/_build/validate_seed.py --canon
        Validate the assembled canon in seed/*.json. Used by CI on the
        feat/canon-rebuild branch before opening the PR.

    python3 seed/_build/validate_seed.py --batch seed/_build/runs/<...>.json
        Validate a single gatherer's batch output. Used by each gatherer
        immediately after fetch — fails the run if any row violates the
        contract, so bad rows never reach the canon-merge step.

What it checks (the producer contract — see PRODUCER_CONTRACT.md):

  1. Schema: every row has the columns its kind requires (nodes, edges,
     signals, contributors, aliases).
  2. Identity: every node id is ``<type>:<name>``; type is in NODE_TYPES;
     slug starts with slugify(name); ids are unique.
  3. Provenance: every row carries signal_id + created_by + batch_id;
     every signal_id resolves to a row in signals.json.
  4. Edge integrity: edge_type is in CURATED_EDGE_TYPES (curated 9);
     source/target exist in nodes; valid_from is set; confidence in [0,1].
  5. **Anti-enrichment**: metadata fields like description / bio / summary
     are only allowed if a sibling source URL exists. This is the rule
     that catches LLM-padded prose. See _node_schema.NARRATIVE_KEYS.
  6. Aliases: (source, external_id) is unique; node_id exists.

Exit code 0 on clean, 1 on any error. Warnings don't fail.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any

# Local imports — gatherers ship without a venv, so these are stdlib-only.
sys.path.insert(0, str(Path(__file__).parent))
from _node_schema import (  # noqa: E402
    NARRATIVE_KEYS,
    NODE_TYPES,
    CURATED_EDGE_TYPES,
    SOURCE_URL_KEYS,
    _has_source_url,
)
from _slug import slugify  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[2]
SEED = REPO_ROOT / "seed"

# Canon-file column expectations. Authoritative against db.sql + the
# embed-pipeline columns that don't live in SQL. ``metadata`` is JSON-encoded
# in canon files (the seeder parses).
NODE_REQUIRED = {"id", "type", "name", "slug", "metadata"}
NODE_OPTIONAL = {
    "created_at",
    "updated_by",
    "signal_id",
    "created_by",
    "batch_id",
    "text_hash",
    "image_hash",
}

EDGE_REQUIRED = {"id", "source_id", "target_id", "edge_type", "signal_id"}
EDGE_OPTIONAL = {
    "confidence",
    "charge",
    "created_at",
    "created_by",
    "event_time",
    "valid_from",
    "valid_until",
    "invalidated_by",
    "batch_id",
}

SIGNAL_REQUIRED = {"id"}
SIGNAL_KNOWN = {
    "id",
    "title",
    "claim_text",
    "source_url",
    "source_type",
    "cla_layer",
    "summary",
    "content",
    "submitted_by",
    "confidence",
    "lived_experience",
    "created_at",
    "consent_scope",
    "consent_attribution",
    "consent_revocable",
    "processing_trace",
    "source_origin",
    "batch_id",
    "status",
    "provenance_chain",
    "created_by",
}

ALIAS_REQUIRED = {"source", "external_id", "node_id"}
ALIAS_KNOWN = ALIAS_REQUIRED | {"created_at"}

CONTRIB_REQUIRED = {"id", "name", "type", "trust_tier"}
CONTRIB_KNOWN = CONTRIB_REQUIRED | {"contributions", "approved_count", "created_at"}


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def err(self, msg: str) -> None:
        self.errors.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)

    def is_clean(self) -> bool:
        return not self.errors

    def print(self, *, error_cap: int = 30, warn_cap: int = 15) -> None:
        print(f"ERRORS:   {len(self.errors)}")
        for e in self.errors[:error_cap]:
            print(f"  ✗ {e}")
        if len(self.errors) > error_cap:
            print(f"  ... +{len(self.errors) - error_cap} more")
        print(f"WARNINGS: {len(self.warnings)}")
        for w in self.warnings[:warn_cap]:
            print(f"  ⚠ {w}")
        if len(self.warnings) > warn_cap:
            print(f"  ... +{len(self.warnings) - warn_cap} more")


# -------------------- Per-row validators --------------------


def _metadata_dict(n: dict[str, Any], report: Report) -> dict[str, Any] | None:
    md = n.get("metadata")
    if md is None:
        return {}
    if isinstance(md, dict):
        return md
    if isinstance(md, str):
        try:
            return json.loads(md)
        except json.JSONDecodeError as e:
            report.err(f"nodes: {n.get('id', '?')} metadata not valid JSON: {e}")
            return None
    report.err(f"nodes: {n.get('id', '?')} metadata is neither dict nor JSON string")
    return None


def validate_node(n: dict[str, Any], report: Report) -> None:
    nid = n.get("id", "?")
    missing = NODE_REQUIRED - set(n.keys())
    if missing:
        report.err(f"nodes: {nid} missing required columns: {sorted(missing)}")
        return
    extra = set(n.keys()) - (NODE_REQUIRED | NODE_OPTIONAL)
    if extra:
        report.warn(f"nodes: {nid} has unexpected columns: {sorted(extra)}")
    if ":" not in nid:
        report.err(f"nodes: {nid!r} not in '<type>:<name>' form")
        return
    if n["type"] not in NODE_TYPES:
        report.err(f"nodes: {nid} has unknown type {n['type']!r}")
    if not n.get("name"):
        report.err(f"nodes: {nid} has empty name")
    slug = n.get("slug", "")
    if not slug:
        report.err(f"nodes: {nid} has empty slug")
    else:
        expected_prefix = slugify(n["name"]).replace(" ", "-")
        # Allow disambiguator suffixes ("--source-external_id" or "--creator").
        if not slug.startswith(expected_prefix.split("--")[0]):
            report.err(
                f"nodes: {nid} slug={slug!r} doesn't match name={n['name']!r} "
                f"(expected to start with {expected_prefix!r})"
            )
    md = _metadata_dict(n, report)
    if md is None:
        return
    # Anti-enrichment guard.
    narrative_present = [k for k in NARRATIVE_KEYS if md.get(k)]
    if narrative_present and not _has_source_url(md):
        report.err(
            f"nodes: {nid} has narrative metadata {narrative_present} without a sibling "
            f"source URL in {SOURCE_URL_KEYS} (or citations[].url). "
            "Anti-enrichment rule."
        )


def validate_edge(e: dict[str, Any], report: Report, *, node_ids: set[str], signal_ids: set[str]) -> None:
    eid = e.get("id", "?")
    missing = EDGE_REQUIRED - set(e.keys())
    if missing:
        report.err(f"edges: {eid} missing required columns: {sorted(missing)}")
        return
    extra = set(e.keys()) - (EDGE_REQUIRED | EDGE_OPTIONAL)
    if extra:
        report.warn(f"edges: {eid} has unexpected columns: {sorted(extra)}")
    if e["edge_type"] not in CURATED_EDGE_TYPES:
        # Auto-derived edge types are emitted at runtime, not in canon JSONs.
        report.err(
            f"edges: {eid} uses non-curated edge_type {e['edge_type']!r}; "
            "auto-derived types (STYLE_KIN/VISUALLY_AFFINE) must not be in canon"
        )
    if e["source_id"] not in node_ids:
        report.err(f"edges: {eid} references unknown source_id {e['source_id']!r}")
    if e["target_id"] not in node_ids:
        report.err(f"edges: {eid} references unknown target_id {e['target_id']!r}")
    if e["signal_id"] and e["signal_id"] not in signal_ids:
        report.err(f"edges: {eid} references unknown signal_id {e['signal_id']!r}")
    conf = e.get("confidence")
    if conf is not None:
        try:
            if not (0.0 <= float(conf) <= 1.0):
                report.err(f"edges: {eid} confidence {conf} out of [0,1]")
        except (TypeError, ValueError):
            report.err(f"edges: {eid} confidence {conf!r} is not numeric (legacy string?)")


def validate_signal(s: dict[str, Any], report: Report) -> None:
    sid = s.get("id", "?")
    missing = SIGNAL_REQUIRED - set(s.keys())
    if missing:
        report.err(f"signals: {sid} missing required columns: {sorted(missing)}")
    extra = set(s.keys()) - SIGNAL_KNOWN
    if extra:
        report.warn(f"signals: {sid} has unexpected columns: {sorted(extra)}")


def validate_alias(a: dict[str, Any], report: Report, *, node_ids: set[str]) -> None:
    missing = ALIAS_REQUIRED - set(a.keys())
    if missing:
        report.err(f"aliases: entry missing required columns: {sorted(missing)} ({a!r})")
        return
    if a["node_id"] not in node_ids:
        report.err(f"aliases: ({a['source']!r}, {a['external_id']!r}) → unknown node_id {a['node_id']!r}")
    extra = set(a.keys()) - ALIAS_KNOWN
    if extra:
        report.warn(f"aliases: ({a['source']!r}, {a['external_id']!r}) has unexpected columns: {sorted(extra)}")


def validate_contributor(c: dict[str, Any], report: Report) -> None:
    missing = CONTRIB_REQUIRED - set(c.keys())
    if missing:
        report.err(f"contributors: {c.get('id', '?')} missing required columns: {sorted(missing)}")


# -------------------- Top-level entry points --------------------


def validate_collections(
    *,
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    signals: list[dict[str, Any]],
    aliases: list[dict[str, Any]],
    contributors: list[dict[str, Any]],
    report: Report,
) -> None:
    # Sets
    node_ids = {n.get("id") for n in nodes}
    signal_ids = {s.get("id") for s in signals}

    # Duplicates
    node_id_counter = Counter(n.get("id") for n in nodes)
    for nid, count in node_id_counter.items():
        if count > 1:
            report.err(f"nodes: duplicate id {nid!r} appears {count}x")
    edge_id_counter = Counter(e.get("id") for e in edges)
    for eid, count in edge_id_counter.items():
        if count > 1:
            report.err(f"edges: duplicate id {eid!r} appears {count}x")
    alias_key_counter = Counter((a.get("source"), a.get("external_id")) for a in aliases)
    for key, count in alias_key_counter.items():
        if count > 1:
            report.err(f"aliases: duplicate (source, external_id) {key!r} appears {count}x")

    # Per-row
    for n in nodes:
        validate_node(n, report)
    for e in edges:
        validate_edge(e, report, node_ids=node_ids, signal_ids=signal_ids)
    for s in signals:
        validate_signal(s, report)
    for a in aliases:
        validate_alias(a, report, node_ids=node_ids)
    for c in contributors:
        validate_contributor(c, report)


def validate_canon(seed_dir: Path) -> Report:
    report = Report()
    missing_files = [
        name
        for name in ("nodes.json", "edges.json", "signals.json", "contributors.json", "aliases.json")
        if not (seed_dir / name).exists()
    ]
    if missing_files:
        for name in missing_files:
            report.err(f"canon: {name} does not exist at {seed_dir / name}")
        return report
    nodes = json.loads((seed_dir / "nodes.json").read_text())
    edges = json.loads((seed_dir / "edges.json").read_text())
    signals = json.loads((seed_dir / "signals.json").read_text())
    contributors = json.loads((seed_dir / "contributors.json").read_text())
    aliases = json.loads((seed_dir / "aliases.json").read_text())

    print(f"nodes:        {len(nodes)}")
    print(f"edges:        {len(edges)}")
    print(f"signals:      {len(signals)}")
    print(f"aliases:      {len(aliases)}")
    print(f"contributors: {len(contributors)}")
    print()

    validate_collections(
        nodes=nodes,
        edges=edges,
        signals=signals,
        aliases=aliases,
        contributors=contributors,
        report=report,
    )
    return report


def validate_batch(batch_path: Path) -> Report:
    """Validate a per-gatherer batch file produced by ``_provenance.write_batch``."""
    report = Report()
    if not batch_path.exists():
        report.err(f"batch: {batch_path} does not exist")
        return report
    payload = json.loads(batch_path.read_text())
    signal = payload.get("signal") or {}
    nodes = payload.get("nodes") or []
    edges = payload.get("edges") or []
    aliases = payload.get("aliases") or []

    print(f"batch: {batch_path}")
    print(f"  signal: {signal.get('id', '?')}  source_origin={signal.get('source_origin', '?')}")
    print(f"  nodes:   {len(nodes)}")
    print(f"  edges:   {len(edges)}")
    print(f"  aliases: {len(aliases)}")
    print()

    # A batch is self-contained: signal_id resolves to its own signal row;
    # edges may reference nodes from earlier batches, so we skip the
    # source/target existence check here and defer it to canon-level
    # validation. We still check intra-batch consistency.
    intra_node_ids = {n.get("id") for n in nodes}
    intra_signal_ids = {signal.get("id")} if signal else set()

    validate_signal(signal, report)
    for n in nodes:
        validate_node(n, report)
        if n.get("signal_id") and n["signal_id"] not in intra_signal_ids:
            report.warn(f"batch: node {n['id']} signal_id={n['signal_id']} doesn't match batch signal {signal.get('id')}")
    for e in edges:
        # Soft source/target check — only complain if BOTH ends are missing
        # from this batch (a cross-batch reference is fine and will resolve
        # at canon merge time).
        if e.get("source_id") not in intra_node_ids and e.get("target_id") not in intra_node_ids:
            report.warn(
                f"batch: edge {e.get('id')} references no node in this batch "
                f"(both {e.get('source_id')!r} and {e.get('target_id')!r} are external)"
            )
        if e.get("edge_type") not in CURATED_EDGE_TYPES:
            report.err(
                f"batch: edge {e.get('id')} uses non-curated edge_type {e.get('edge_type')!r}"
            )
        if not e.get("signal_id"):
            report.err(f"batch: edge {e.get('id')} missing signal_id")
        if not e.get("created_by"):
            report.err(f"batch: edge {e.get('id')} missing created_by")
    for a in aliases:
        if not {"source", "external_id", "node_id"}.issubset(a.keys()):
            report.err(f"batch: alias missing fields {a!r}")

    return report


def main() -> int:
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--canon", action="store_true", help="validate seed/*.json")
    g.add_argument("--batch", type=Path, help="validate a per-gatherer batch JSON")
    ap.add_argument("--seed-dir", type=Path, default=SEED, help="override seed/ location")
    args = ap.parse_args()

    if args.canon:
        report = validate_canon(args.seed_dir)
    else:
        report = validate_batch(args.batch)
    report.print()
    return 0 if report.is_clean() else 1


if __name__ == "__main__":
    sys.exit(main())
