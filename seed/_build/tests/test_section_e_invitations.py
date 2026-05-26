import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import check_invitations_honored


def test_invitation_edges_with_zero_count_reported_info():
    findings = check_invitations_honored({}, [])
    cats = {f.category for f in findings}
    assert "invitation_honored" in cats
    # RESPONDS_TO, CONTESTS, TENSION_WITH at minimum
    honored_subjects = {f.subject_id for f in findings if f.category == "invitation_honored"}
    assert {"RESPONDS_TO", "CONTESTS", "TENSION_WITH"}.issubset(honored_subjects)


def test_invitation_edge_with_non_zero_count_is_violated():
    edges = [{"id": "e1", "source_id": "a", "target_id": "b",
              "edge_type": "RESPONDS_TO", "created_by": "x"}]
    findings = check_invitations_honored({}, edges)
    violated = [f for f in findings if f.category == "invitation_violated"]
    assert len(violated) == 1
    assert violated[0].subject_id == "RESPONDS_TO"
    assert violated[0].severity == "bug"


def test_empty_stubs_counted_as_info():
    nodes = {
        "scene:empty": {"id": "scene:empty", "type": "scene",
                        "metadata": {"status": "placeholder"}},
        "scene:filled": {"id": "scene:filled", "type": "scene",
                         "metadata": {"status": "confirmed"}},
    }
    edges = [{"source_id": "x", "target_id": "scene:filled",
              "edge_type": "BELONGS_TO", "created_by": "x"}]
    findings = check_invitations_honored(nodes, edges)
    stubs = [f for f in findings if f.category == "empty_stub_count"]
    assert len(stubs) == 1
    assert stubs[0].details["count"] == 1
