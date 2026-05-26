import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import detect_forked_created_by


def test_legitimate_co_authorship_is_not_flagged():
    nodes = {
        "artwork:starmirror": {"type": "artwork", "name": "Starmirror"},
        "practitioner:hh": {"type": "practitioner"},
        "practitioner:md": {"type": "practitioner"},
    }
    edges = [
        {"source_id": "artwork:starmirror", "target_id": "practitioner:hh",
         "edge_type": "CREATED_BY", "created_by": "x"},
        {"source_id": "artwork:starmirror", "target_id": "practitioner:md",
         "edge_type": "CREATED_BY", "created_by": "x"},
        {"source_id": "practitioner:hh", "target_id": "practitioner:md",
         "edge_type": "COLLABORATES_WITH", "created_by": "contributor:migration"},
    ]
    assert detect_forked_created_by(nodes, edges) == []


def test_platform_as_creator_is_flagged_with_sub_a():
    nodes = {
        "artwork:fidenza": {"type": "artwork", "name": "Fidenza"},
        "platform:art blocks": {"type": "platform"},
        "practitioner:tyler": {"type": "practitioner"},
    }
    edges = [
        {"source_id": "artwork:fidenza", "target_id": "platform:art blocks",
         "edge_type": "CREATED_BY", "created_by": "contributor:migration"},
        {"source_id": "artwork:fidenza", "target_id": "practitioner:tyler",
         "edge_type": "CREATED_BY", "created_by": "contributor:migration"},
    ]
    findings = detect_forked_created_by(nodes, edges)
    assert len(findings) == 1
    assert findings[0].details["sub_class"] == "platform_or_institution_as_creator"


def test_two_unrelated_practitioners_is_flagged_sub_c():
    nodes = {
        "artwork:black hole": {"type": "artwork", "name": "Black Hole"},
        "practitioner:treister": {"type": "practitioner"},
        "practitioner:wagenknecht": {"type": "practitioner"},
    }
    edges = [
        {"source_id": "artwork:black hole", "target_id": "practitioner:treister",
         "edge_type": "CREATED_BY", "created_by": "x"},
        {"source_id": "artwork:black hole", "target_id": "practitioner:wagenknecht",
         "edge_type": "CREATED_BY", "created_by": "y"},
    ]
    findings = detect_forked_created_by(nodes, edges)
    assert len(findings) == 1
    # "Black Hole" is in the C.1 denylist too — sub-class should flag this overlap
    assert findings[0].details["sub_class"] in ("id_collision_overlap", "other")
