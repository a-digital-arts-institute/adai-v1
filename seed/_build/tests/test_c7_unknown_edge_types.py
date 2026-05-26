import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import detect_unknown_edge_types
from schema_contract import EDGE_CLAIMS


def test_known_edge_type_no_finding():
    edges = [{"id": "e1", "source_id": "x", "target_id": "y", "edge_type": "EMBODIES",
              "created_by": "x"}]
    assert detect_unknown_edge_types(edges, EDGE_CLAIMS) == []


def test_related_to_flagged_as_legacy_leak():
    edges = [{"id": "e1", "source_id": "x", "target_id": "y", "edge_type": "RELATED_TO",
              "created_by": "x"}]
    findings = detect_unknown_edge_types(edges, EDGE_CLAIMS)
    assert len(findings) == 1
    assert findings[0].details["annotation"] == "legacy_path_leak"


def test_truly_unknown_edge_type_flagged_generically():
    edges = [{"id": "e1", "source_id": "x", "target_id": "y", "edge_type": "MAKES_FRIENDS_WITH",
              "created_by": "x"}]
    findings = detect_unknown_edge_types(edges, EDGE_CLAIMS)
    assert len(findings) == 1
    assert findings[0].details["annotation"] == "unknown"
