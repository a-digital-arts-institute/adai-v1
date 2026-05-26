import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import detect_id_collisions


def test_untitled_with_unrelated_creators_is_collision():
    nodes = {
        "artwork:untitled": {"id": "artwork:untitled", "type": "artwork", "name": "Untitled"},
        "practitioner:a": {"type": "practitioner"},
        "practitioner:b": {"type": "practitioner"},
    }
    edges = [
        {"source_id": "artwork:untitled", "target_id": "practitioner:a",
         "edge_type": "CREATED_BY", "created_by": "gatherer-x"},
        {"source_id": "artwork:untitled", "target_id": "practitioner:b",
         "edge_type": "CREATED_BY", "created_by": "gatherer-y"},
    ]
    findings = detect_id_collisions(nodes, edges)
    assert len(findings) == 1
    assert findings[0].subject_id == "artwork:untitled"
    assert findings[0].section == "C"
    assert findings[0].category == "id_collision"


def test_untitled_with_collaborators_is_not_collision():
    """Two creators who collaborate are legitimate co-authors, not a collision."""
    nodes = {
        "artwork:untitled": {"id": "artwork:untitled", "type": "artwork", "name": "Untitled"},
        "practitioner:a": {"type": "practitioner"},
        "practitioner:b": {"type": "practitioner"},
    }
    edges = [
        {"source_id": "artwork:untitled", "target_id": "practitioner:a",
         "edge_type": "CREATED_BY", "created_by": "gatherer-x"},
        {"source_id": "artwork:untitled", "target_id": "practitioner:b",
         "edge_type": "CREATED_BY", "created_by": "gatherer-x"},
        {"source_id": "practitioner:a", "target_id": "practitioner:b",
         "edge_type": "COLLABORATES_WITH", "created_by": "contributor:migration"},
    ]
    findings = detect_id_collisions(nodes, edges)
    assert findings == []


def test_non_generic_name_is_not_collision_candidate():
    nodes = {
        "artwork:fidenza": {"id": "artwork:fidenza", "type": "artwork", "name": "Fidenza"},
        "practitioner:a": {"type": "practitioner"},
        "practitioner:b": {"type": "practitioner"},
    }
    edges = [
        {"source_id": "artwork:fidenza", "target_id": "practitioner:a",
         "edge_type": "CREATED_BY", "created_by": "x"},
        {"source_id": "artwork:fidenza", "target_id": "practitioner:b",
         "edge_type": "CREATED_BY", "created_by": "y"},
    ]
    # "Fidenza" is not in the denylist — even with 2 creators, not C.1 (this is C.2)
    assert detect_id_collisions(nodes, edges) == []


def test_punctuation_and_case_normalised_against_denylist():
    nodes = {
        "artwork:untitled-punct": {"id": "artwork:untitled-punct", "type": "artwork",
                                   "name": "UNTITLED!"},
        "practitioner:a": {"type": "practitioner"},
        "practitioner:b": {"type": "practitioner"},
    }
    edges = [
        {"source_id": "artwork:untitled-punct", "target_id": "practitioner:a",
         "edge_type": "CREATED_BY", "created_by": "x"},
        {"source_id": "artwork:untitled-punct", "target_id": "practitioner:b",
         "edge_type": "CREATED_BY", "created_by": "y"},
    ]
    findings = detect_id_collisions(nodes, edges)
    assert len(findings) == 1
