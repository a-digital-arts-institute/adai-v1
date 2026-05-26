import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import detect_self_loops


def test_self_loop_is_flagged():
    edges = [{"id": "e1", "source_id": "x", "target_id": "x", "edge_type": "INFLUENCES"}]
    findings = detect_self_loops(edges)
    assert len(findings) == 1
    assert findings[0].category == "self_loop"
    assert findings[0].severity == "bug"


def test_no_self_loop_no_finding():
    edges = [{"id": "e1", "source_id": "x", "target_id": "y", "edge_type": "INFLUENCES"}]
    assert detect_self_loops(edges) == []
