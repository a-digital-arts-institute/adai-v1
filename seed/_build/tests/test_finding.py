import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import Finding, SEVERITY_INFO, SEVERITY_WARNING, SEVERITY_BUG


def test_finding_constructable():
    f = Finding(
        section="C",
        category="id_collision",
        severity=SEVERITY_BUG,
        subject_id="artwork:untitled",
        subject_kind="node",
        details={"creators": ["practitioner:a", "practitioner:b"]},
        suggested_fix="split into per-creator nodes",
    )
    assert f.section == "C"
    assert f.severity == "bug"
    assert f.details["creators"] == ["practitioner:a", "practitioner:b"]


def test_finding_severity_constants():
    assert SEVERITY_INFO == "info"
    assert SEVERITY_WARNING == "warning"
    assert SEVERITY_BUG == "bug"


def test_finding_subject_kind_validates():
    """subject_kind must be 'edge' or 'node'."""
    import pytest
    with pytest.raises(ValueError, match="subject_kind"):
        Finding(section="A", category="x", severity="info",
                subject_id="x", subject_kind="other", details={}, suggested_fix="")
