import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import detect_bitemporal_integrity


def test_valid_until_before_valid_from_is_flagged():
    edges = [{
        "id": "e1", "source_id": "x", "target_id": "y", "edge_type": "EMBODIES",
        "valid_from": "2024-01-01", "valid_until": "2023-01-01",
        "invalidated_by": "e2", "created_by": "x",
    }, {
        "id": "e2", "source_id": "x", "target_id": "y", "edge_type": "EMBODIES",
        "valid_from": "2024-02-01", "valid_until": None, "created_by": "x",
    }]
    findings = detect_bitemporal_integrity(edges)
    inv = [f for f in findings if f.category == "valid_until_before_valid_from"]
    assert len(inv) == 1


def test_dangling_invalidated_by_is_flagged():
    edges = [{
        "id": "e1", "source_id": "x", "target_id": "y", "edge_type": "EMBODIES",
        "valid_from": "2024-01-01", "valid_until": "2024-06-01",
        "invalidated_by": "nonexistent", "created_by": "x",
    }]
    findings = detect_bitemporal_integrity(edges)
    dang = [f for f in findings if f.category == "dangling_invalidated_by"]
    assert len(dang) == 1


def test_superseded_without_invalidator_is_flagged():
    edges = [{
        "id": "e1", "source_id": "x", "target_id": "y", "edge_type": "EMBODIES",
        "valid_from": "2024-01-01", "valid_until": "2024-06-01",
        "invalidated_by": None, "created_by": "x",
    }]
    findings = detect_bitemporal_integrity(edges)
    orph = [f for f in findings if f.category == "superseded_without_invalidator"]
    assert len(orph) == 1


def test_clean_edges_produce_no_findings():
    edges = [{
        "id": "e1", "source_id": "x", "target_id": "y", "edge_type": "EMBODIES",
        "valid_from": "2024-01-01", "valid_until": None,
        "invalidated_by": None, "created_by": "x",
    }]
    assert detect_bitemporal_integrity(edges) == []


def test_supersession_loop_is_flagged():
    """e1 → invalidated_by → e2 → invalidated_by → e1 (cycle)."""
    edges = [
        {"id": "e1", "source_id": "x", "target_id": "y", "edge_type": "EMBODIES",
         "valid_from": "2024-01-01", "valid_until": "2024-06-01",
         "invalidated_by": "e2", "created_by": "z"},
        {"id": "e2", "source_id": "x", "target_id": "y", "edge_type": "EMBODIES",
         "valid_from": "2024-06-01", "valid_until": "2024-12-01",
         "invalidated_by": "e1", "created_by": "z"},
    ]
    findings = detect_bitemporal_integrity(edges)
    loops = [f for f in findings if f.category == "supersession_loop"]
    assert len(loops) >= 1
