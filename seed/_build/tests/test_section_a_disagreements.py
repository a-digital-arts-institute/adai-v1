import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import check_schema_disagreements, Finding
from schema_contract import EDGE_CLAIMS


def _curated_edges():
    """Build minimal curated-edge fixture excluding embedding-derived."""
    return [
        # EXHIBITED_AT — 9 practitioner-source, 1 artwork-source
        *[{"source_id": f"practitioner:p{i}", "target_id": "institution:moma",
           "edge_type": "EXHIBITED_AT", "created_by": "contributor:migration"} for i in range(9)],
        {"source_id": "artwork:a1", "target_id": "institution:moma",
         "edge_type": "EXHIBITED_AT", "created_by": "contributor:migration"},
    ]


def _nodes_by_id():
    by = {}
    for i in range(9):
        by[f"practitioner:p{i}"] = {"id": f"practitioner:p{i}", "type": "practitioner"}
    by["artwork:a1"] = {"id": "artwork:a1", "type": "artwork"}
    by["institution:moma"] = {"id": "institution:moma", "type": "institution"}
    return by


def test_produces_one_finding_per_edge_type_in_contract():
    findings = check_schema_disagreements(_nodes_by_id(), _curated_edges(), EDGE_CLAIMS)
    section_a_ids = {f.subject_id for f in findings if f.section == "A"}
    # one Finding per edge type — subject_id is the edge type name
    assert "EXHIBITED_AT" in section_a_ids
    assert len(section_a_ids) == len(EDGE_CLAIMS)


def test_exhibited_at_finding_records_per_document_conformance():
    findings = check_schema_disagreements(_nodes_by_id(), _curated_edges(), EDGE_CLAIMS)
    ea = next(f for f in findings if f.subject_id == "EXHIBITED_AT")
    # SOURCES.md says practitioner-source — 9 of 10 conform = 90%
    # SKILL.md and CLAUDE.md say artwork-source — 1 of 10 conform = 10%
    conformance = ea.details["conformance_pct"]
    assert conformance["sources_md"] == 90.0
    assert conformance["skill_md"] == 10.0
    assert conformance["claude_md"] == 10.0


def test_disagreement_severity():
    findings = check_schema_disagreements(_nodes_by_id(), _curated_edges(), EDGE_CLAIMS)
    ea = next(f for f in findings if f.subject_id == "EXHIBITED_AT")
    # documents disagree → severity is warning
    assert ea.severity == "warning"


def test_embedding_edges_excluded_from_conformance():
    """Spec — embedding-derived edges must not be counted in per-edge-type conformance."""
    edges = _curated_edges() + [
        {"source_id": "practitioner:p0", "target_id": "practitioner:p1",
         "edge_type": "EXHIBITED_AT", "created_by": "embedding-multimodal-v1"},
    ]
    findings = check_schema_disagreements(_nodes_by_id(), edges, EDGE_CLAIMS)
    ea = next(f for f in findings if f.subject_id == "EXHIBITED_AT")
    # the embedding edge must NOT bump the practitioner-source count to 10
    assert ea.details["edge_count"] == 10


def test_any_wildcard_treated_as_match():
    """CLASSIFIED_BY's three claims all use source_types=("any",); the audit must
    treat "any" as a wildcard. A claim of `('any',) -> ('classification_regime',)`
    should produce 100% conformance over any artwork→classification_regime,
    practitioner→classification_regime, etc."""
    nodes = {
        "artwork:a1": {"id": "artwork:a1", "type": "artwork"},
        "practitioner:p1": {"id": "practitioner:p1", "type": "practitioner"},
        "institution:i1": {"id": "institution:i1", "type": "institution"},
        "classification_regime:r1": {"id": "classification_regime:r1", "type": "classification_regime"},
    }
    edges = [
        {"source_id": "artwork:a1", "target_id": "classification_regime:r1",
         "edge_type": "CLASSIFIED_BY", "created_by": "contributor:migration"},
        {"source_id": "practitioner:p1", "target_id": "classification_regime:r1",
         "edge_type": "CLASSIFIED_BY", "created_by": "contributor:migration"},
        {"source_id": "institution:i1", "target_id": "classification_regime:r1",
         "edge_type": "CLASSIFIED_BY", "created_by": "contributor:migration"},
    ]
    findings = check_schema_disagreements(nodes, edges, EDGE_CLAIMS)
    cb = next(f for f in findings if f.subject_id == "CLASSIFIED_BY")
    # All three documents say ("any",) -> ("classification_regime",); every fixture
    # edge satisfies that → 100% conformance for all three documents.
    conf = cb.details["conformance_pct"]
    assert conf["skill_md"] == 100.0, f"skill_md conformance: {conf['skill_md']}"
    assert conf["sources_md"] == 100.0, f"sources_md conformance: {conf['sources_md']}"
    assert conf["claude_md"] == 100.0, f"claude_md conformance: {conf['claude_md']}"
    # All three agree → not a disagreement → severity is info
    assert cb.severity == "info"
