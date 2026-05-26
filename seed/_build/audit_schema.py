"""A(DAI) schema audit — catalogs schema-related issues in the graph.

See docs/superpowers/specs/2026-05-24-schema-audit-design.md.
"""
import argparse
import json
import pathlib
import sys
from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional, Tuple

from schema_contract import (
    EDGE_CLAIMS,
    AUTOMATED_WRITER_PREFIXES,
)

SEVERITY_INFO = "info"
SEVERITY_WARNING = "warning"
SEVERITY_BUG = "bug"

_VALID_SUBJECT_KINDS = frozenset({"edge", "node"})


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


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="A(DAI) schema audit — catalog schema issues in the graph."
    )
    parser.add_argument("--tier", choices=["fast", "full"], default="fast",
                        help="fast = mechanical + heuristic; full = adds LLM narrative pass")
    parser.add_argument("--live", action="store_true",
                        help="Pull graph from production API instead of local seed files")
    parser.add_argument("--out-dir", default="docs",
                        help="Where to write the report and CSV directory (default: docs)")
    args = parser.parse_args(argv)

    print(f"[audit] tier={args.tier} live={args.live} out_dir={args.out_dir}",
          file=sys.stderr)
    try:
        nodes_by_id, edges, contributors_by_id, signals_by_id = load_graph(
            live_url=DEFAULT_API_URL if args.live else None,
        )
    except FileNotFoundError as e:
        print(f"[audit] ERROR: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"[audit] ERROR loading graph: {e}", file=sys.stderr)
        return 1

    print(f"[audit] loaded {len(nodes_by_id)} nodes, {len(edges)} edges",
          file=sys.stderr)

    # Findings pipeline lands in Chunks 3-8. For now this is a no-op.
    print("[audit] check_* pipeline not yet implemented — no findings produced.",
          file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
