"""A(DAI) schema audit — catalogs schema-related issues in the graph.

See docs/superpowers/specs/2026-05-24-schema-audit-design.md.
"""
import argparse
import json
import pathlib
import sys
from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional, Tuple

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
