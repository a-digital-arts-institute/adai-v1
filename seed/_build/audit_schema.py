"""A(DAI) schema audit — catalogs schema-related issues in the graph.

See docs/superpowers/specs/2026-05-24-schema-audit-design.md.
"""
from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal

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


if __name__ == "__main__":
    raise SystemExit("audit_schema.py not yet implemented")
