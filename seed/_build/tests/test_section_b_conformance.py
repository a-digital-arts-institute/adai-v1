import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import check_per_document_conformance, Finding
from schema_contract import EDGE_CLAIMS


def test_returns_one_finding_per_document():
    findings = check_per_document_conformance(
        nodes_by_id={"practitioner:p1": {"type": "practitioner"},
                     "institution:moma": {"type": "institution"}},
        edges=[{"source_id": "practitioner:p1", "target_id": "institution:moma",
                "edge_type": "EXHIBITED_AT", "created_by": "contributor:migration"}],
        contract=EDGE_CLAIMS,
    )
    doc_names = {f.subject_id for f in findings if f.section == "B"}
    assert doc_names == {"skill_md", "sources_md", "claude_md"}


def test_overall_conformance_per_doc():
    """1 edge total, conforms to SOURCES (practitioner-source), not to SKILL/CLAUDE (artwork-source)."""
    findings = check_per_document_conformance(
        nodes_by_id={"practitioner:p1": {"type": "practitioner"},
                     "institution:moma": {"type": "institution"}},
        edges=[{"source_id": "practitioner:p1", "target_id": "institution:moma",
                "edge_type": "EXHIBITED_AT", "created_by": "contributor:migration"}],
        contract=EDGE_CLAIMS,
    )
    sources = next(f for f in findings if f.subject_id == "sources_md")
    skill = next(f for f in findings if f.subject_id == "skill_md")
    assert sources.details["conforming_edges"] == 1
    assert sources.details["total_curated_edges"] == 1
    assert sources.details["conformance_pct"] == 100.0
    assert skill.details["conforming_edges"] == 0
    assert skill.details["conformance_pct"] == 0.0
