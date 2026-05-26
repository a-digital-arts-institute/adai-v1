"""A(DAI) schema audit — catalogs schema-related issues in the graph.

See docs/superpowers/specs/2026-05-24-schema-audit-design.md.
"""
import argparse
import json
import pathlib
import re
import string
import sys
from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional, Tuple

from schema_contract import (
    EDGE_CLAIMS,
    AUTOMATED_WRITER_PREFIXES,
    GENERIC_TITLE_DENYLIST,
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
                "creators": list(set(creator_ids)),
                "gatherers": sorted({e["created_by"] for e in creator_edges}),
            },
            suggested_fix="split into per-creator nodes with disambiguated ids",
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
                "platform_or_institution_as_creator": "remap non-practitioner CREATED_BY to EXHIBITED_AT or PUBLISHED_ON",
                "id_collision_overlap": "split node — see Section C.1 finding for same id",
                "other": "manual review",
            }[sub_class],
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
