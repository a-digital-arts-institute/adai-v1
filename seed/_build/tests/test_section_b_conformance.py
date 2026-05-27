import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import check_per_document_conformance, Finding
from schema_contract import EDGE_CLAIMS, EdgeClaim


# Synthetic contract used by tests that need a sources_md/skill_md divergence.
# Live EDGE_CLAIMS no longer has this divergence (sources_md aligned with SKILL.md
# in the May 2026 cleanup), but the audit's differential-conformance logic still
# needs testing.
_SYNTHETIC_EDGE_CLAIMS = {
    "EXHIBITED_AT": {
        "skill_md": EdgeClaim(
            source_types=("artwork",), target_types=("institution",),
            description="(synthetic) artwork-source", ref="(synthetic)",
        ),
        "sources_md": EdgeClaim(
            source_types=("practitioner",), target_types=("institution",),
            description="(synthetic) practitioner-source", ref="(synthetic)",
        ),
        "claude_md": EdgeClaim(
            source_types=("artwork",), target_types=("institution",),
            description="(synthetic) artwork-source", ref="(synthetic)",
        ),
    },
}


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
    """Uses synthetic contract to exercise differential conformance logic.
    Live contract no longer has this sources_md/skill_md divergence (cleaned
    up May 2026), but the audit's per-doc conformance math still needs testing."""
    findings = check_per_document_conformance(
        nodes_by_id={"practitioner:p1": {"type": "practitioner"},
                     "institution:moma": {"type": "institution"}},
        edges=[{"source_id": "practitioner:p1", "target_id": "institution:moma",
                "edge_type": "EXHIBITED_AT", "created_by": "contributor:migration"}],
        contract=_SYNTHETIC_EDGE_CLAIMS,
    )
    sources = next(f for f in findings if f.subject_id == "sources_md")
    skill = next(f for f in findings if f.subject_id == "skill_md")
    assert sources.details["conforming_edges"] == 1
    assert sources.details["total_curated_edges"] == 1
    assert sources.details["conformance_pct"] == 100.0
    assert skill.details["conforming_edges"] == 0
    assert skill.details["conformance_pct"] == 0.0
