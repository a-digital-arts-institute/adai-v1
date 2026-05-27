"""A(DAI) schema audit — catalogs schema-related issues in the graph.

See docs/superpowers/specs/2026-05-24-schema-audit-design.md.
"""
import argparse
import csv
import datetime as dt
from datetime import timezone
import hashlib
import io
import json
import os
import pathlib
import re
import string
import sys
from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional, Tuple

from schema_contract import (
    CONTRACT_SCHEMA_VERSION,
    EDGE_CLAIMS,
    AUTOMATED_WRITER_PREFIXES,
    GENERIC_TITLE_DENYLIST,
    CRYPTO_ERA_SLUG_TOKENS,
    ERA_VIOLATION_WHITELIST,
    KNOWN_LEGACY_EDGE_TYPES,
    INVITATION_STATUS_SET,
)

SEVERITY_INFO = "info"
SEVERITY_WARNING = "warning"
SEVERITY_BUG = "bug"

_VALID_SUBJECT_KINDS = frozenset({"edge", "node"})

_PUNCT_STRIP = str.maketrans("", "", string.punctuation)


@dataclass
class Finding:
    section: Literal["A", "B", "C", "D", "E"]
    category: str
    severity: str
    subject_id: str
    subject_kind: str
    details: Dict[str, Any] = field(default_factory=dict)
    suggested_fix: str = ""

    def __post_init__(self) -> None:
        if self.subject_kind not in _VALID_SUBJECT_KINDS:
            raise ValueError(
                f"subject_kind must be 'edge' or 'node', got {self.subject_kind!r}"
            )


REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
DEFAULT_SEED_DIR = REPO_ROOT / "seed"
DEFAULT_API_URL = "https://adai-basel.fly.dev/api/graph?type=_all"


def _parse_metadata(node: dict) -> dict:
    """The seed has a bug where some metadata is stored as JSON string instead of dict.

    Spec §E mentions 513 affected nodes. This helper unwraps both forms.
    """
    raw = node.get("metadata")
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            decoded = json.loads(raw)
        except json.JSONDecodeError:
            return {}
        return decoded if isinstance(decoded, dict) else {}
    return {}


def _load_optional_json_list(path: pathlib.Path, name: str) -> List[dict]:
    """Load a JSON-array seed file that's non-essential to the audit.

    Per spec error-handling: missing or malformed contributors/signals files
    should degrade with a stderr warning rather than hard-fail. The audit can
    still run, just with degraded C.5 coverage for the affected check.
    """
    if not path.exists():
        print(f"[audit] WARNING: {name} not found at {path} — "
              f"continuing with empty registry; C.5 checks degraded",
              file=sys.stderr)
        return []
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError as e:
        print(f"[audit] WARNING: {name} at {path} is malformed JSON ({e}) — "
              f"continuing with empty registry; C.5 checks degraded",
              file=sys.stderr)
        return []


def load_graph(
    seed_dir: Optional[pathlib.Path] = None,
    live_url: Optional[str] = None,
) -> Tuple[Dict[str, dict], List[dict], Dict[str, dict], Dict[str, dict]]:
    """Return (nodes_by_id, edges, contributors_by_id, signals_by_id).

    Hard-fail (FileNotFoundError) if nodes.json or edges.json missing — audit
    can't run without them. Soft-fail (warning + empty registry) for
    contributors.json and signals.json — C.5 checks degrade gracefully.

    If live_url is given, fetch nodes+edges from the live API. Caveats:
    - Edge field names are normalised from {source, target, type} (API) to
      {source_id, target_id, edge_type} (seed schema) so downstream checks work.
    - The public API does not expose node metadata, signal_id, valid_until, or
      the contributors/signals registries. As a result, --live mode degrades:
      Sections B/C.1/C.3/D/E (metadata-dependent), C.4 (bi-temporal), and C.5
      (signal/contributor provenance) cannot produce findings.
    - --live is most useful for spot-checking node counts and edge-type
      distributions against production after a deploy.
    """
    if live_url is not None:
        import requests  # local import — only required for --live
        resp = requests.get(live_url, timeout=30)
        resp.raise_for_status()
        payload = resp.json()
        nodes = payload.get("nodes", [])
        # Live API serialises edges as {source, target, type, ...}; seed schema uses
        # {source_id, target_id, edge_type, ...}. Normalise so downstream checks work.
        edges = [
            {
                "id": e.get("id", ""),
                "source_id": e.get("source"),
                "target_id": e.get("target"),
                "edge_type": e.get("type"),
                "confidence": e.get("confidence"),
                "created_by": e.get("created_by"),
                "valid_until": None,  # API only returns current edges
            }
            for e in payload.get("edges", [])
        ]
        contributors: List[dict] = []
        signals: List[dict] = []
    else:
        sd = seed_dir if seed_dir is not None else DEFAULT_SEED_DIR
        # Hard-fail for essential files
        nodes = json.loads((sd / "nodes.json").read_text())  # FileNotFoundError if missing
        edges = json.loads((sd / "edges.json").read_text())  # FileNotFoundError if missing
        # Soft-fail for non-essential files
        contributors = _load_optional_json_list(sd / "contributors.json", "contributors.json")
        signals = _load_optional_json_list(sd / "signals.json", "signals.json")

    nodes_by_id = {n["id"]: n for n in nodes}
    contributors_by_id = {c["id"]: c for c in contributors}
    signals_by_id = {s["id"]: s for s in signals}
    return nodes_by_id, edges, contributors_by_id, signals_by_id


def _is_embedding_edge(edge: dict) -> bool:
    """Embedding-derived edges live in their own row, not folded into curated conformance.

    Uses a literal "embedding-" prefix rather than AUTOMATED_WRITER_PREFIXES because
    the spec excludes embedding-derived edges specifically; gatherer- enrichment edges
    are still part of the curated set.
    """
    cb = edge.get("created_by", "") or ""
    return cb.startswith("embedding-")


def _types_match(node_type: Optional[str], claim_types: tuple) -> bool:
    """True if node_type satisfies claim_types.

    Treats the sentinel "any" in claim_types as a wildcard (matches any node type).
    Used for CLASSIFIED_BY, which all three schema documents encode as
    `any -> classification_regime`. Empty claim_types tuple matches nothing.
    """
    if "any" in claim_types:
        return node_type is not None
    return node_type in claim_types


def check_schema_disagreements(
    nodes_by_id: Dict[str, dict],
    edges: List[dict],
    contract: Dict[str, Any],
) -> List[Finding]:
    """Section A: for each edge type, compare source/target types across documents.

    Excludes embedding-derived edges from the conformance numerator.
    """
    findings: List[Finding] = []

    # Group curated edges by type
    curated = [e for e in edges if not _is_embedding_edge(e)]
    by_type: Dict[str, List[dict]] = {}
    for e in curated:
        by_type.setdefault(e["edge_type"], []).append(e)

    for edge_type, doc_map in contract.items():
        live_edges = by_type.get(edge_type, [])
        n = len(live_edges)

        # Documents disagree if non-None claims differ in source_types or target_types
        non_none = {d: c for d, c in doc_map.items() if c is not None}
        documents_disagree = False
        if len(non_none) > 1:
            first = next(iter(non_none.values()))
            for c in non_none.values():
                if c.source_types != first.source_types or c.target_types != first.target_types:
                    documents_disagree = True
                    break

        # Per-document conformance
        conformance_pct: Dict[str, Optional[float]] = {}
        for doc_name, claim in doc_map.items():
            if claim is None:
                conformance_pct[doc_name] = None
                continue
            if n == 0:
                conformance_pct[doc_name] = 100.0 if claim.is_invitation else None
                continue
            ok = sum(
                1 for e in live_edges
                if _types_match(nodes_by_id.get(e["source_id"], {}).get("type"), claim.source_types)
                and _types_match(nodes_by_id.get(e["target_id"], {}).get("type"), claim.target_types)
            )
            conformance_pct[doc_name] = round(100.0 * ok / n, 1)

        severity = SEVERITY_WARNING if documents_disagree else SEVERITY_INFO
        findings.append(Finding(
            section="A",
            category="schema_disagreement" if documents_disagree else "schema_agreement",
            severity=severity,
            subject_id=edge_type,
            subject_kind="edge",
            details={
                "edge_count": n,
                "documents_disagree": documents_disagree,
                "claims": {
                    doc_name: None if c is None else {
                        "source_types": list(c.source_types),
                        "target_types": list(c.target_types),
                        "is_invitation": c.is_invitation,
                        "ref": c.ref,
                    }
                    for doc_name, c in doc_map.items()
                },
                "conformance_pct": conformance_pct,
            },
        ))
    return findings


def check_per_document_conformance(
    nodes_by_id: Dict[str, dict],
    edges: List[dict],
    contract: Dict[str, Dict[str, Any]],
) -> List[Finding]:
    """Section B: roll-up of conformance per document across all curated edges.

    Excludes embedding-derived edges (their disciplined types are reported separately).
    Edges whose edge_type isn't in the contract at all are not counted in any
    document's denominator — they show up in Section C.7 instead.

    Uses `_types_match()` so the 'any' sentinel in claim_types (CLASSIFIED_BY) is
    honoured as a wildcard.
    """
    findings: List[Finding] = []
    curated = [e for e in edges if not _is_embedding_edge(e) and e["edge_type"] in contract]
    total = len(curated)

    for doc_name in ("skill_md", "sources_md", "claude_md"):
        conforming = 0
        considered = 0
        for e in curated:
            claim = contract[e["edge_type"]].get(doc_name)
            if claim is None:
                # this document does not document this edge type; skip
                continue
            considered += 1
            src_type = nodes_by_id.get(e["source_id"], {}).get("type")
            tgt_type = nodes_by_id.get(e["target_id"], {}).get("type")
            if _types_match(src_type, claim.source_types) and _types_match(tgt_type, claim.target_types):
                conforming += 1
        pct = round(100.0 * conforming / considered, 1) if considered else None
        findings.append(Finding(
            section="B",
            category="per_document_conformance",
            severity=SEVERITY_INFO,
            subject_id=doc_name,
            subject_kind="node",  # arbitrary — Section B subject is a document, not a graph object
            details={
                "total_curated_edges": total,
                "edges_considered": considered,
                "conforming_edges": conforming,
                "conformance_pct": pct,
            },
        ))
    return findings


def _normalise_title(name: str) -> str:
    """Lowercase + strip ASCII punctuation. Non-ASCII (e.g. é, ü) preserved."""
    return name.lower().translate(_PUNCT_STRIP).strip()


def detect_id_collisions(
    nodes_by_id: Dict[str, dict],
    edges: List[dict],
) -> List[Finding]:
    """C.1: nodes with generic names whose CREATED_BY edges suggest multiple distinct works."""
    findings: List[Finding] = []

    # Index CREATED_BY edges by source artwork
    creators_by_artwork: Dict[str, List[dict]] = {}
    for e in edges:
        if e["edge_type"] == "CREATED_BY":
            creators_by_artwork.setdefault(e["source_id"], []).append(e)

    # Index COLLABORATES_WITH (symmetric — store both directions)
    collab_pairs: set = set()
    for e in edges:
        if e["edge_type"] == "COLLABORATES_WITH":
            s, t = e["source_id"], e["target_id"]
            collab_pairs.add((s, t))
            collab_pairs.add((t, s))

    for artwork_id, creator_edges in creators_by_artwork.items():
        node = nodes_by_id.get(artwork_id)
        if not node or node.get("type") != "artwork":
            continue
        norm = _normalise_title(node.get("name", ""))
        if norm not in GENERIC_TITLE_DENYLIST:
            continue
        # Must have >= 2 distinct practitioner creators
        creator_ids = [
            e["target_id"] for e in creator_edges
            if nodes_by_id.get(e["target_id"], {}).get("type") == "practitioner"
        ]
        if len(set(creator_ids)) < 2:
            continue
        # If every pair of creators is in collab_pairs, it's legitimate co-authorship
        all_pairs_collaborate = all(
            (creator_ids[i], creator_ids[j]) in collab_pairs
            for i in range(len(creator_ids)) for j in range(i + 1, len(creator_ids))
        )
        if all_pairs_collaborate:
            continue
        findings.append(Finding(
            section="C", category="id_collision", severity=SEVERITY_BUG,
            subject_id=artwork_id, subject_kind="node",
            details={
                "name": node.get("name"),
                "creators": sorted(set(creator_ids)),
                "gatherers": sorted({e["created_by"] for e in creator_edges}),
            },
            suggested_fix=(
                "investigate the producers (gatherers in `seed/_build/`) that hit this slug — "
                "their slug rule is probably too generic. Fix the producer's slug-disambiguation "
                "and regenerate. Do not hand-edit `seed/*.json`."
            ),
        ))
    return findings


def detect_forked_created_by(
    nodes_by_id: Dict[str, dict],
    edges: List[dict],
) -> List[Finding]:
    """C.2: artworks with > 1 CREATED_BY edge where creators are NOT collaborators.

    Sub-classes:
      (a) "platform_or_institution_as_creator": at least one target is not a practitioner
      (b) "id_collision_overlap": the artwork name is in GENERIC_TITLE_DENYLIST (also caught by C.1)
      (c) "other": forked but no obvious cause
    """
    findings: List[Finding] = []

    creators_by_artwork: Dict[str, List[dict]] = {}
    for e in edges:
        if e["edge_type"] == "CREATED_BY":
            creators_by_artwork.setdefault(e["source_id"], []).append(e)

    collab_pairs: set = set()
    for e in edges:
        if e["edge_type"] == "COLLABORATES_WITH":
            s, t = e["source_id"], e["target_id"]
            collab_pairs.add((s, t))
            collab_pairs.add((t, s))

    for artwork_id, creator_edges in creators_by_artwork.items():
        if len(creator_edges) < 2:
            continue
        target_ids = [e["target_id"] for e in creator_edges]
        # All-practitioner co-authorship?
        all_practitioner = all(
            nodes_by_id.get(t, {}).get("type") == "practitioner" for t in target_ids
        )
        if all_practitioner:
            all_pairs_collaborate = all(
                (target_ids[i], target_ids[j]) in collab_pairs
                for i in range(len(target_ids)) for j in range(i + 1, len(target_ids))
            )
            if all_pairs_collaborate:
                continue

        # Sub-class
        if not all_practitioner:
            sub_class = "platform_or_institution_as_creator"
        else:
            artwork_name = nodes_by_id.get(artwork_id, {}).get("name", "")
            if _normalise_title(artwork_name) in GENERIC_TITLE_DENYLIST:
                sub_class = "id_collision_overlap"
            else:
                sub_class = "other"

        findings.append(Finding(
            section="C", category="forked_created_by", severity=SEVERITY_BUG,
            subject_id=artwork_id, subject_kind="node",
            details={
                "sub_class": sub_class,
                "creators": target_ids,
                "creator_types": [nodes_by_id.get(t, {}).get("type") for t in target_ids],
                "gatherers": sorted({e["created_by"] for e in creator_edges}),
            },
            suggested_fix={
                "platform_or_institution_as_creator": (
                    "investigate the producer that emitted this shape (see `gatherers` in details). "
                    "EITHER widen SKILL.md to allow this target type (CLAUDE.md already documents "
                    "20 collective CREATED_BY edges that embed:derive depends on) OR fix the "
                    "producer to emit a different edge type."
                ),
                "id_collision_overlap": (
                    "investigate the producers that hit this slug (Section C.1 has the same finding). "
                    "Fix the slug rule at the producer, then regenerate."
                ),
                "other": (
                    "manual review of the producer that emitted these creators. Do not hand-edit `seed/*.json`."
                ),
            }[sub_class],
        ))
    return findings


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="A(DAI) schema audit — catalog schema issues in the graph."
    )
    parser.add_argument("--tier", choices=["fast", "full"], default="fast")
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--out-dir", default="docs")
    parser.add_argument("--seed-dir", default=None,
                        help="Override seed directory (for testing)")
    args = parser.parse_args(argv)

    print(f"[audit] tier={args.tier} live={args.live} out_dir={args.out_dir}",
          file=sys.stderr)

    try:
        nodes_by_id, edges, contributors_by_id, signals_by_id = load_graph(
            seed_dir=pathlib.Path(args.seed_dir) if args.seed_dir else None,
            live_url=DEFAULT_API_URL if args.live else None,
        )
    except FileNotFoundError as e:
        print(f"[audit] ERROR: {e}", file=sys.stderr)
        return 1

    print(f"[audit] loaded {len(nodes_by_id)} nodes, {len(edges)} edges", file=sys.stderr)

    findings: List[Finding] = []
    findings.extend(check_schema_disagreements(nodes_by_id, edges, EDGE_CLAIMS))
    print(f"[audit] A schema disagreements: {sum(1 for f in findings if f.section == 'A')}",
          file=sys.stderr)
    findings.extend(check_per_document_conformance(nodes_by_id, edges, EDGE_CLAIMS))
    findings.extend(detect_id_collisions(nodes_by_id, edges))
    findings.extend(detect_forked_created_by(nodes_by_id, edges))
    findings.extend(detect_era_violations(nodes_by_id, edges))
    findings.extend(detect_bitemporal_integrity(edges))
    findings.extend(detect_provenance_broken(edges, contributors_by_id, signals_by_id))
    findings.extend(detect_self_loops(edges))
    findings.extend(detect_unknown_edge_types(edges, EDGE_CLAIMS))
    section_c = sum(1 for f in findings if f.section == "C")
    print(f"[audit] C genuine bugs: {section_c}", file=sys.stderr)

    if args.tier == "full":
        client = None
        if os.environ.get("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
            except Exception as e:
                print(f"[audit] WARN: failed to construct anthropic client: {e}",
                      file=sys.stderr)
        cache_path = REPO_ROOT / "seed" / "_build" / ".cache" / "narrative_audit.json"
        cache = NarrativeCache(cache_path)
        findings.extend(check_narrative_mismatches(
            nodes_by_id, edges, client=client, cache=cache,
        ))
        section_d = sum(1 for f in findings if f.section == "D")
        print(f"[audit] D narrative mismatches: {section_d}", file=sys.stderr)

    findings.extend(check_invitations_honored(nodes_by_id, edges))

    # Write outputs
    today = dt.date.today().isoformat()
    out_dir = pathlib.Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    md_path = out_dir / f"SCHEMA_AUDIT_{today}.md"
    suffix = 2
    while md_path.exists():
        md_path = out_dir / f"SCHEMA_AUDIT_{today}-{suffix}.md"
        suffix += 1

    md = render_report(findings, tier=args.tier,
                       node_count=len(nodes_by_id), edge_count=len(edges))
    md_path.write_text(md)
    print(f"[audit] wrote {md_path}", file=sys.stderr)

    # Rename: docs/SCHEMA_AUDIT_2026-05-24.md → docs/schema_audit_2026-05-24/
    csv_dir = out_dir / md_path.name.replace("SCHEMA_AUDIT_", "schema_audit_").replace(".md", "")
    csv_dir.mkdir(parents=True, exist_ok=True)
    csvs = render_csvs(findings)
    for fname, content in csvs.items():
        (csv_dir / fname).write_text(content)
    print(f"[audit] wrote {len(csvs)} CSVs to {csv_dir}/", file=sys.stderr)

    return 0


def detect_era_violations(
    nodes_by_id: Dict[str, dict],
    edges: List[dict],
) -> List[Finding]:
    """C.3: pre-2009 artworks linked to crypto-era concepts.

    Strict: only checks artworks with a structured `metadata.year_start` int.
    Emits ONE summary Finding showing coverage % so the gap is visible in the
    report (we don't emit per-artwork skip rows — would dominate Section C
    without adding information).
    """
    findings: List[Finding] = []

    # Index concept slugs once
    concept_slugs = {nid: n.get("slug", "") for nid, n in nodes_by_id.items()
                     if n.get("type") == "concept"}

    # Classify artworks for the coverage summary
    total_artworks = 0
    covered = 0
    excluded_with_year_raw = 0
    excluded_with_active_years_string = 0
    excluded_no_year_info = 0
    for nid, n in nodes_by_id.items():
        if n.get("type") != "artwork":
            continue
        total_artworks += 1
        md = _parse_metadata(n)
        if isinstance(md.get("year_start"), int):
            covered += 1
        elif isinstance(md.get("year_raw"), str):
            excluded_with_year_raw += 1
        elif isinstance(md.get("full_profile", {}).get("basic_info", {}).get("active_years"), str):
            excluded_with_active_years_string += 1
        else:
            excluded_no_year_info += 1
    coverage_pct = round(100.0 * covered / total_artworks, 1) if total_artworks else 0.0

    findings.append(Finding(
        section="C", category="era_check_coverage", severity=SEVERITY_INFO,
        subject_id="(era_check_coverage)", subject_kind="node",
        details={
            "total": total_artworks,
            "covered": covered,
            "coverage_pct": coverage_pct,
            "excluded_with_year_raw": excluded_with_year_raw,
            "excluded_with_active_years_string": excluded_with_active_years_string,
            "excluded_no_year_info": excluded_no_year_info,
        },
        suggested_fix=(f"strict mode covers {covered} of {total_artworks} artworks ({coverage_pct}%); "
                       f"add metadata.year_start to remaining {total_artworks - covered} to expand"),
    ))

    # Walk edges and emit era_violation findings
    for e in edges:
        src_id = e["source_id"]
        tgt_id = e["target_id"]
        src = nodes_by_id.get(src_id, {})
        if src.get("type") != "artwork":
            continue
        if tgt_id not in concept_slugs:
            continue
        slug = concept_slugs[tgt_id]
        if not any(token in slug for token in CRYPTO_ERA_SLUG_TOKENS):
            continue
        if (src_id, tgt_id) in ERA_VIOLATION_WHITELIST:
            continue

        md = _parse_metadata(src)
        year_start = md.get("year_start")
        if not isinstance(year_start, int):
            continue  # captured in the coverage summary above
        if year_start >= 2009:
            continue

        findings.append(Finding(
            section="C", category="era_violation", severity=SEVERITY_BUG,
            subject_id=f"{src_id}--{e['edge_type']}--{tgt_id}",
            subject_kind="edge",
            details={
                "artwork": src_id,
                "year_start": year_start,
                "concept": tgt_id,
                "concept_slug": slug,
                "edge_type": e["edge_type"],
                "created_by": e["created_by"],
            },
            suggested_fix=(
                "investigate the producer (see `created_by` in details) — it's emitting an artwork-to-"
                "crypto-concept edge for a pre-2009 artwork. EITHER the producer's date heuristic is "
                "wrong, OR the row is correct in which case add to ERA_VIOLATION_WHITELIST at the "
                "producer level."
            ),
        ))

    return findings


def detect_bitemporal_integrity(edges: List[dict]) -> List[Finding]:
    """C.4: integrity of bi-temporal fields. Audits ALL edges including superseded.

    Categories:
      - valid_until_before_valid_from
      - dangling_invalidated_by (invalidated_by → nonexistent edge id)
      - superseded_without_invalidator (valid_until set but invalidated_by is null)
      - supersession_loop (chain of invalidated_by loops back to self)
    """
    findings: List[Finding] = []
    edge_ids = {e.get("id") for e in edges if e.get("id")}

    for e in edges:
        eid = e.get("id", "<no-id>")
        vf = e.get("valid_from")
        vu = e.get("valid_until")
        invby = e.get("invalidated_by")

        if vu is not None and vf is not None and vu < vf:
            findings.append(Finding(
                section="C", category="valid_until_before_valid_from", severity=SEVERITY_BUG,
                subject_id=eid, subject_kind="edge",
                details={"valid_from": vf, "valid_until": vu},
                suggested_fix="investigate the producer that wrote this temporally-invalid range — likely a bug in its supersession handling",
            ))

        if invby and invby not in edge_ids:
            findings.append(Finding(
                section="C", category="dangling_invalidated_by", severity=SEVERITY_BUG,
                subject_id=eid, subject_kind="edge",
                details={"invalidated_by": invby},
                suggested_fix="investigate the producer that emitted this dangling invalidated_by reference",
            ))

        if vu is not None and not invby:
            findings.append(Finding(
                section="C", category="superseded_without_invalidator", severity=SEVERITY_BUG,
                subject_id=eid, subject_kind="edge",
                details={"valid_until": vu},
                suggested_fix="investigate the producer that emitted this — it set valid_until without naming a successor; supersession bookkeeping bug in that producer",
            ))

    # Detect supersession loops: follow invalidated_by from each edge,
    # raise if we revisit the start.
    invalidator_map = {e.get("id"): e.get("invalidated_by") for e in edges if e.get("id")}
    for start, _ in invalidator_map.items():
        seen = set()
        cur = invalidator_map.get(start)
        steps = 0
        while cur and cur in invalidator_map and steps < 100:
            if cur == start:
                findings.append(Finding(
                    section="C", category="supersession_loop", severity=SEVERITY_BUG,
                    subject_id=start, subject_kind="edge",
                    details={"loop_through": sorted(seen)},
                    suggested_fix="investigate the producers in this supersession chain — one of them wrote a cycle",
                ))
                break
            if cur in seen:
                break
            seen.add(cur)
            cur = invalidator_map.get(cur)
            steps += 1
    return findings


def detect_provenance_broken(
    edges: List[dict],
    contributors_by_id: Dict[str, dict],
    signals_by_id: Dict[str, dict],
) -> List[Finding]:
    """C.5: integrity of edge.created_by + edge.signal_id."""
    findings: List[Finding] = []
    for e in edges:
        eid = e.get("id", "<no-id>")
        cb = e.get("created_by")
        if cb is None or (isinstance(cb, str) and not cb.strip()):
            findings.append(Finding(
                section="C", category="created_by_missing", severity=SEVERITY_BUG,
                subject_id=eid, subject_kind="edge",
                details={}, suggested_fix="every edge must have a created_by value",
            ))
        elif cb.startswith(AUTOMATED_WRITER_PREFIXES):
            pass  # known automated writer
        elif cb.startswith("contributor:"):
            if cb not in contributors_by_id:
                findings.append(Finding(
                    section="C", category="unknown_contributor", severity=SEVERITY_BUG,
                    subject_id=eid, subject_kind="edge",
                    details={"created_by": cb},
                    suggested_fix="add contributor row or repair edge",
                ))
        else:
            findings.append(Finding(
                section="C", category="unrecognised_created_by_format", severity=SEVERITY_BUG,
                subject_id=eid, subject_kind="edge",
                details={"created_by": cb},
                suggested_fix="created_by must match gatherer-*, embedding-*, or contributor:<id>",
            ))

        sig = e.get("signal_id")
        if sig and sig not in signals_by_id:
            findings.append(Finding(
                section="C", category="dangling_signal_id", severity=SEVERITY_BUG,
                subject_id=eid, subject_kind="edge",
                details={"signal_id": sig},
                suggested_fix="add signals.json row or null out signal_id on edge",
            ))
    return findings


def detect_self_loops(edges: List[dict]) -> List[Finding]:
    """C.6: source == target. Should always be zero."""
    findings: List[Finding] = []
    for e in edges:
        if e["source_id"] == e["target_id"]:
            findings.append(Finding(
                section="C", category="self_loop", severity=SEVERITY_BUG,
                subject_id=e.get("id", f"{e['source_id']}--{e['edge_type']}--{e['target_id']}"),
                subject_kind="edge",
                details={"source_id": e["source_id"], "edge_type": e["edge_type"]},
                suggested_fix="investigate the producer that emitted this self-loop — should never occur",
            ))
    return findings


def detect_unknown_edge_types(
    edges: List[dict],
    contract: Dict[str, Any],
) -> List[Finding]:
    """C.7: edges whose edge_type isn't in EDGE_CLAIMS at all."""
    findings: List[Finding] = []
    known = set(contract.keys())
    for e in edges:
        et = e["edge_type"]
        if et in known:
            continue
        annotation = "legacy_path_leak" if et in KNOWN_LEGACY_EDGE_TYPES else "unknown"
        findings.append(Finding(
            section="C", category="unknown_edge_type", severity=SEVERITY_BUG,
            subject_id=e.get("id", f"{e['source_id']}--{et}--{e['target_id']}"),
            subject_kind="edge",
            details={"edge_type": et, "annotation": annotation,
                     "created_by": e.get("created_by")},
            suggested_fix=(
                "investigate which producer emitted this legacy edge type (the canonical seeder shouldn't be emitting RELATED_TO; check `seed.ts` vs `seed-consolidated.ts` path)"
                if annotation == "legacy_path_leak"
                else "investigate the producer (see `created_by` in details); EITHER it's emitting an undocumented edge type that should be added to EDGE_CLAIMS, OR it's a bug in the producer"
            ),
        ))
    return findings


def canonical_edges_json(edges: List[dict]) -> str:
    """Canonicalised JSON of an edge list for cache-key hashing.

    Keeps only source_id, edge_type, target_id, created_by. Sorts by tuple of those.
    """
    KEEP = ("source_id", "target_id", "edge_type", "created_by")
    minimal = [{k: e.get(k) for k in KEEP} for e in edges]
    minimal.sort(key=lambda e: (e["source_id"], e["edge_type"], e["target_id"]))
    return json.dumps(minimal, sort_keys=True)


def narrative_cache_key(
    practitioner_id: str,
    prose_text: str,
    canonical_edges: str,
    model_id: str,
    prompt_version: int,
    contract_schema_version: str,
) -> str:
    """SHA-256 over the six cache-key components."""
    payload = json.dumps([
        practitioner_id,
        hashlib.sha256(prose_text.encode()).hexdigest(),
        hashlib.sha256(canonical_edges.encode()).hexdigest(),
        model_id,
        prompt_version,
        contract_schema_version,
    ], sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


class NarrativeCache:
    """JSON-file-backed cache for Section D LLM results.

    Single-writer assumption (the audit script). Load reads if file exists;
    save atomically replaces the file.
    """

    def __init__(self, path: pathlib.Path):
        self.path = path
        self._data: Dict[str, Any] = {}
        if path.exists():
            try:
                self._data = json.loads(path.read_text())
            except json.JSONDecodeError:
                self._data = {}

    def get(self, key: str) -> Optional[Any]:
        return self._data.get(key)

    def put(self, key: str, value: Any) -> None:
        self._data[key] = value

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(self.path.suffix + ".tmp")
        tmp.write_text(json.dumps(self._data, sort_keys=True, indent=2))
        tmp.replace(self.path)


NARRATIVE_MODEL_ID = "claude-haiku-4-5"  # implementer-verify; participates in cache key
NARRATIVE_PROMPT_VERSION = 1


def _extract_json(text: str) -> str:
    """Extract a JSON object from an LLM response that may be wrapped in
    markdown code fences (```json ... ``` or ``` ... ```) or contain extra
    prose. Returns the substring from the first `{` to the matching `}`.
    Falls back to the stripped original text if no braces are found.
    """
    s = text.strip()
    # Strip leading code-fence
    if s.startswith("```"):
        # Drop the opening fence line (possibly ```json)
        nl = s.find("\n")
        if nl != -1:
            s = s[nl + 1:]
        # Drop trailing fence
        if s.rstrip().endswith("```"):
            s = s.rstrip()[:-3]
        s = s.strip()
    # Bracket-match the first JSON object
    start = s.find("{")
    if start == -1:
        return s
    depth = 0
    for i in range(start, len(s)):
        if s[i] == "{":
            depth += 1
        elif s[i] == "}":
            depth -= 1
            if depth == 0:
                return s[start:i + 1]
    return s[start:]

NARRATIVE_PROMPT_TEMPLATE = """\
You are comparing two views of one practitioner's place in the digital arts field.

The PROSE below comes from the practitioner's profile metadata (free-text scene_affiliation).
The EDGES below are the structured BELONGS_TO and CLASSIFIED_BY edges actually in the graph.

Compare them. Produce JSON with two fields:
  - "claimed_but_unlinked": list of scenes/platforms/institutions the prose names that are NOT present as edges
  - "linked_but_unclaimed": list of edges whose target is contradicted by or absent from the prose

Be strict. If everything aligns, both lists should be empty. Do not invent claims.

PROSE:
{prose}

EDGES:
{edges_json}

Respond with ONLY the JSON object, nothing else.
"""


def check_narrative_mismatches(
    nodes_by_id: Dict[str, dict],
    edges: List[dict],
    client: Optional[Any] = None,
    cache: Optional[NarrativeCache] = None,
) -> List[Finding]:
    """Section D: per-practitioner narrative-vs-edge comparison via LLM.

    If client is None (no ANTHROPIC_API_KEY), returns one info finding marking skip.
    """
    if cache is None:
        cache = NarrativeCache(pathlib.Path("seed/_build/.cache/narrative_audit.json"))

    if client is None:
        return [Finding(
            section="D", category="section_d_skipped", severity=SEVERITY_INFO,
            subject_id="(section_d)", subject_kind="node",
            details={"reason": "no Anthropic client (ANTHROPIC_API_KEY unset)"},
        )]

    findings: List[Finding] = []
    # Index practitioner edges (BELONGS_TO + CLASSIFIED_BY, current state only)
    edges_for: Dict[str, List[dict]] = {}
    for e in edges:
        if e["edge_type"] not in ("BELONGS_TO", "CLASSIFIED_BY"):
            continue
        if e.get("valid_until") is not None:
            continue
        edges_for.setdefault(e["source_id"], []).append(e)

    for pid, p in sorted(nodes_by_id.items()):
        if p.get("type") != "practitioner":
            continue
        md = _parse_metadata(p)
        # Some practitioners have full_profile or network_position explicitly null
        # (the field exists but is None); guard against that with `or {}` between
        # each level rather than the default-on-missing of dict.get.
        full_profile = md.get("full_profile") or {}
        network_position = full_profile.get("network_position") or {}
        prose = network_position.get("scene_affiliation") or ""
        if not prose.strip():
            continue

        prac_edges = edges_for.get(pid, [])
        canon = canonical_edges_json(prac_edges)
        key = narrative_cache_key(
            pid, prose, canon, NARRATIVE_MODEL_ID, NARRATIVE_PROMPT_VERSION,
            CONTRACT_SCHEMA_VERSION,
        )
        cached = cache.get(key)
        if cached is None:
            try:
                prompt = NARRATIVE_PROMPT_TEMPLATE.format(prose=prose, edges_json=canon)
                resp = client.messages.create(
                    model=NARRATIVE_MODEL_ID,
                    max_tokens=1024,
                    messages=[{"role": "user", "content": prompt}],
                )
                text = resp.content[0].text
                cached = json.loads(_extract_json(text))
                cache.put(key, cached)
            except Exception as e:
                findings.append(Finding(
                    section="D", category="section_d_incomplete", severity=SEVERITY_WARNING,
                    subject_id=pid, subject_kind="node",
                    details={"reason": str(e)},
                ))
                continue

        for claim in cached.get("claimed_but_unlinked", []):
            findings.append(Finding(
                section="D", category="claimed_but_unlinked", severity=SEVERITY_WARNING,
                subject_id=pid, subject_kind="node",
                details={"prose_claim": claim, "model_id": NARRATIVE_MODEL_ID,
                         "prompt_version": NARRATIVE_PROMPT_VERSION},
                suggested_fix="add edge OR remove claim from prose",
            ))
        for edge_desc in cached.get("linked_but_unclaimed", []):
            findings.append(Finding(
                section="D", category="linked_but_unclaimed", severity=SEVERITY_WARNING,
                subject_id=pid, subject_kind="node",
                details={"edge_description": edge_desc, "model_id": NARRATIVE_MODEL_ID,
                         "prompt_version": NARRATIVE_PROMPT_VERSION},
                suggested_fix="add to prose OR remove edge",
            ))

    cache.save()
    return findings


def check_invitations_honored(
    nodes_by_id: Dict[str, dict],
    edges: List[dict],
) -> List[Finding]:
    """Section E: confirms invitation edges are still empty and counts empty stubs.

    Per spec — informational, not bugs (except invitation_violated, which IS a bug
    because it means the design contract was breached).
    """
    findings: List[Finding] = []
    # Edge counts per invitation type
    invitation_types = {
        et for et, doc_map in EDGE_CLAIMS.items()
        if any(c is not None and c.is_invitation for c in doc_map.values())
    }
    edge_counts: Dict[str, int] = {et: 0 for et in invitation_types}
    for e in edges:
        if e["edge_type"] in invitation_types:
            edge_counts[e["edge_type"]] += 1

    for et, count in sorted(edge_counts.items()):
        if count == 0:
            findings.append(Finding(
                section="E", category="invitation_honored", severity=SEVERITY_INFO,
                subject_id=et, subject_kind="edge",
                details={"count": 0, "expected": 0,
                         "rationale": "invitation edge reserved for practitioner voice"},
            ))
        else:
            findings.append(Finding(
                section="E", category="invitation_violated", severity=SEVERITY_BUG,
                subject_id=et, subject_kind="edge",
                details={"count": count, "expected": 0,
                         "rationale": "invitation edge has non-zero edges — contract breach"},
                suggested_fix="audit how these edges entered the graph; remove or attest",
            ))

    # Empty-stub count (0 in-degree AND 0 out-degree AND status in INVITATION_STATUS_SET)
    in_degree: Dict[str, int] = {}
    out_degree: Dict[str, int] = {}
    for e in edges:
        out_degree[e["source_id"]] = out_degree.get(e["source_id"], 0) + 1
        in_degree[e["target_id"]] = in_degree.get(e["target_id"], 0) + 1

    stub_count = 0
    for nid, n in nodes_by_id.items():
        if in_degree.get(nid, 0) > 0 or out_degree.get(nid, 0) > 0:
            continue
        md = _parse_metadata(n)
        status = md.get("status")
        if status in INVITATION_STATUS_SET or status is None:
            stub_count += 1

    findings.append(Finding(
        section="E", category="empty_stub_count", severity=SEVERITY_INFO,
        subject_id="(empty_stubs)", subject_kind="node",
        details={"count": stub_count,
                 "status_set": sorted(INVITATION_STATUS_SET),
                 "rationale": "0-degree nodes with stub-like status — invitations awaiting contribution"},
    ))
    return findings


_SECTION_TITLES = {
    "A": "Schema-doc disagreements (diagnostic, not a delete-list)",
    "B": "Per-document conformance (diagnostic; lower = doc and producer disagree)",
    "C": "Producer findings — shapes worth investigating",
    "D": "Narrative-vs-edge mismatches (candidates for curator triage)",
    "E": "Invitations honored",
}


def _render_section_a_table(findings: List[Finding]) -> List[str]:
    """Section A as a per-edge-type comparison table (spec-mandated format)."""
    lines = [
        "| Edge type | SKILL.md | SOURCES.md | CLAUDE.md | Data conforms to | Edges |",
        "|---|---|---|---|---|---:|",
    ]
    for f in sorted(findings, key=lambda f: f.subject_id):
        claims = f.details.get("claims", {})
        conf = f.details.get("conformance_pct", {})
        edge_count = f.details.get("edge_count", 0)

        def claim_cell(doc: str) -> str:
            c = claims.get(doc)
            if c is None:
                return "_not documented_"
            inv = " · invitation" if c.get("is_invitation") else ""
            return f"src: {', '.join(c['source_types'])}; tgt: {', '.join(c['target_types'])}{inv}"

        def conf_cell() -> str:
            parts = []
            for doc in ("skill_md", "sources_md", "claude_md"):
                pct = conf.get(doc)
                if pct is None:
                    parts.append(f"{doc}: –")
                else:
                    parts.append(f"{doc}: {pct}%")
            return "; ".join(parts)

        lines.append(
            f"| `{f.subject_id}` | {claim_cell('skill_md')} | {claim_cell('sources_md')} | "
            f"{claim_cell('claude_md')} | {conf_cell()} | {edge_count} |"
        )
    return lines


def _render_section_b_table(findings: List[Finding]) -> List[str]:
    """Section B as a document-conformance roll-up table."""
    lines = [
        "| Document | Edges considered | Conforming | Conformance % |",
        "|---|---:|---:|---:|",
    ]
    for f in sorted(findings, key=lambda f: f.subject_id):
        d = f.details
        pct = d.get("conformance_pct")
        pct_str = f"{pct}%" if pct is not None else "–"
        lines.append(
            f"| {f.subject_id} | {d.get('edges_considered', 0)} | "
            f"{d.get('conforming_edges', 0)} | {pct_str} |"
        )
    return lines


def _render_section_findings_as_bullets(findings: List[Finding]) -> List[str]:
    """Sections C/D/E render as one bullet per finding with structured detail."""
    lines: List[str] = []
    # Group by category for readability
    by_category: Dict[str, List[Finding]] = {}
    for f in findings:
        by_category.setdefault(f.category, []).append(f)
    for category in sorted(by_category):
        items = sorted(by_category[category], key=lambda f: f.subject_id)
        lines.append(f"### `{category}` ({len(items)})")
        lines.append("")
        for f in items:
            details_compact = json.dumps(f.details, sort_keys=True)
            fix = f" — _fix:_ {f.suggested_fix}" if f.suggested_fix else ""
            lines.append(f"- **{f.subject_id}** [{f.severity}] — `{details_compact}`{fix}")
        lines.append("")
    return lines


def render_report(
    findings: List[Finding],
    tier: str,
    node_count: int,
    edge_count: int,
) -> str:
    """Markdown report. Sections A and B render as spec-mandated tables;
    Sections C, D, E render as grouped-by-category bullets. All within-group
    ordering is by subject_id for deterministic golden-file comparison.
    """
    lines: List[str] = []
    lines.append(f"# A(DAI) Schema Audit — {dt.date.today().isoformat()} ({tier.upper()})")
    lines.append("")
    lines.append(f"Generated: {dt.datetime.now(timezone.utc).isoformat()}")
    lines.append(f"Graph snapshot: {node_count} nodes, {edge_count} edges")
    lines.append("")
    lines.append("## How to read this report")
    lines.append("")
    lines.append(
        "This audit is a **diagnostic**. It reports where shapes in the seed "
        "diverge from one of the schema documents (`SKILL.md`, `seed/SOURCES.md`, "
        "`CLAUDE.md`). Divergence is a signal to **investigate the producer** "
        "(the script in `seed/_build/` or the contributor that emitted the shape) "
        "and / or the document — it is **not** a list of rows to delete or rewrite. "
        "`seed/*.json` is build output, not source. Fix the producer; the artefact "
        "follows."
    )
    lines.append("")
    lines.append(
        "Per `CLAUDE.md`: *if many producers \"violate\" the same documented rule, "
        "the rule is probably too narrow. Update the doc / validator, not the rows.*"
    )
    lines.append("")

    # Headline table
    lines.append("## Headline counts")
    lines.append("")
    lines.append("| Section | Findings | Highest severity |")
    lines.append("|---|---:|---|")
    by_section: Dict[str, List[Finding]] = {}
    for f in findings:
        by_section.setdefault(f.section, []).append(f)
    SEVERITY_RANK = {SEVERITY_INFO: 0, SEVERITY_WARNING: 1, SEVERITY_BUG: 2}
    for section in ("A", "B", "C", "D", "E"):
        sf = by_section.get(section, [])
        if not sf:
            lines.append(f"| {section}. {_SECTION_TITLES[section]} | 0 | – |")
        else:
            max_sev = max(sf, key=lambda f: SEVERITY_RANK[f.severity]).severity
            lines.append(f"| {section}. {_SECTION_TITLES[section]} | {len(sf)} | {max_sev} |")
    lines.append("")

    # Per-section detail — Section A and B as tables, C/D/E as grouped bullets
    for section in ("A", "B", "C", "D", "E"):
        lines.append(f"## Section {section}: {_SECTION_TITLES[section]}")
        lines.append("")
        sf = by_section.get(section, [])
        if not sf:
            lines.append("_No findings._")
            lines.append("")
            continue
        if section == "A":
            lines.extend(_render_section_a_table(sf))
        elif section == "B":
            lines.extend(_render_section_b_table(sf))
        else:
            lines.extend(_render_section_findings_as_bullets(sf))
        lines.append("")

    lines.append("## Reproducing this audit")
    lines.append("")
    lines.append(f"```bash\nnpm run audit:schema:{tier}\n```")
    lines.append("")
    return "\n".join(lines)


def render_csvs(findings: List[Finding]) -> Dict[str, str]:
    """One CSV per (section, category). Filename: section_<section>_<category>.csv (lowercase)."""
    by_key: Dict[str, List[Finding]] = {}
    for f in findings:
        fname = f"section_{f.section.lower()}_{f.category}.csv"
        by_key.setdefault(fname, []).append(f)

    out: Dict[str, str] = {}
    for fname, items in by_key.items():
        items_sorted = sorted(items, key=lambda f: f.subject_id)
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["subject_id", "subject_kind", "severity", "category",
                    "details_json", "suggested_fix"])
        for f in items_sorted:
            w.writerow([f.subject_id, f.subject_kind, f.severity, f.category,
                        json.dumps(f.details, sort_keys=True), f.suggested_fix])
        out[fname] = buf.getvalue()
    return out


def normalize_output(text: str) -> str:
    """Strip volatile lines from a rendered report for golden-file comparison."""
    out_lines: List[str] = []
    for line in text.replace("\r\n", "\n").splitlines():
        if line.startswith("Generated:"):
            continue
        if line.startswith("Graph snapshot:"):
            continue
        out_lines.append(line)
    return "\n".join(out_lines)


if __name__ == "__main__":
    sys.exit(main())
