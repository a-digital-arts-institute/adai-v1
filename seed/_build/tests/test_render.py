import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import render_report, render_csvs, Finding


def test_report_includes_all_five_sections():
    findings = [
        Finding(section="A", category="schema_disagreement", severity="warning",
                subject_id="EXHIBITED_AT", subject_kind="edge",
                details={"edge_count": 10, "documents_disagree": True,
                         "claims": {
                             "skill_md": {"source_types": ["artwork"], "target_types": ["institution"],
                                          "is_invitation": False, "ref": "x"},
                             "sources_md": {"source_types": ["practitioner"], "target_types": ["institution"],
                                            "is_invitation": False, "ref": "y"},
                             "claude_md": {"source_types": ["artwork"], "target_types": ["institution"],
                                           "is_invitation": False, "ref": "z"},
                         },
                         "conformance_pct": {"skill_md": 10.0,
                                             "sources_md": 90.0,
                                             "claude_md": 10.0}}),
        Finding(section="B", category="per_document_conformance", severity="info",
                subject_id="skill_md", subject_kind="node",
                details={"conformance_pct": 50.0, "conforming_edges": 5,
                         "total_curated_edges": 10, "edges_considered": 10}),
        Finding(section="C", category="id_collision", severity="bug",
                subject_id="artwork:untitled", subject_kind="node", details={"name": "Untitled"}),
        Finding(section="D", category="section_d_skipped", severity="info",
                subject_id="(section_d)", subject_kind="node",
                details={"reason": "no key"}),
        Finding(section="E", category="invitation_honored", severity="info",
                subject_id="RESPONDS_TO", subject_kind="edge",
                details={"count": 0, "expected": 0}),
    ]
    md = render_report(findings, tier="fast", node_count=10, edge_count=20)
    for header in ("Section A", "Section B", "Section C", "Section D", "Section E"):
        assert header in md
    assert "EXHIBITED_AT" in md
    assert "artwork:untitled" in md


def test_section_a_renders_as_markdown_table():
    """Spec mandates per-edge-type comparison table for Section A."""
    findings = [Finding(
        section="A", category="schema_disagreement", severity="warning",
        subject_id="EXHIBITED_AT", subject_kind="edge",
        details={"edge_count": 305, "documents_disagree": True,
                 "claims": {
                     "skill_md": {"source_types": ["artwork"], "target_types": ["institution", "platform"],
                                  "is_invitation": False, "ref": "§1.4"},
                     "sources_md": {"source_types": ["practitioner"], "target_types": ["institution"],
                                    "is_invitation": False, "ref": "line 296"},
                     "claude_md": {"source_types": ["artwork"], "target_types": ["institution", "platform"],
                                   "is_invitation": False, "ref": "edge-type paragraph"},
                 },
                 "conformance_pct": {"skill_md": 3.6, "sources_md": 96.4, "claude_md": 3.6}}),
    ]
    md = render_report(findings, tier="fast", node_count=10, edge_count=305)
    # Section A row uses table syntax (pipes), not bullet syntax
    assert "| `EXHIBITED_AT` |" in md
    assert "src: artwork" in md
    assert "src: practitioner" in md
    assert "sources_md: 96.4%" in md


def test_section_b_renders_as_markdown_table():
    findings = [Finding(
        section="B", category="per_document_conformance", severity="info",
        subject_id="sources_md", subject_kind="node",
        details={"edges_considered": 100, "conforming_edges": 80, "conformance_pct": 80.0,
                 "total_curated_edges": 100}),
    ]
    md = render_report(findings, tier="fast", node_count=10, edge_count=100)
    assert "| sources_md | 100 | 80 | 80.0% |" in md


def test_csvs_one_per_category():
    findings = [
        Finding(section="C", category="id_collision", severity="bug",
                subject_id="artwork:untitled", subject_kind="node", details={}),
        Finding(section="C", category="self_loop", severity="bug",
                subject_id="e1", subject_kind="edge", details={}),
    ]
    csvs = render_csvs(findings)
    assert "section_c_id_collision.csv" in csvs
    assert "section_c_self_loop.csv" in csvs
    # base columns present
    assert "subject_id" in csvs["section_c_id_collision.csv"]
    assert "subject_kind" in csvs["section_c_id_collision.csv"]


def test_csvs_sorted_by_subject_id():
    findings = [
        Finding(section="C", category="self_loop", severity="bug",
                subject_id="e2", subject_kind="edge", details={}),
        Finding(section="C", category="self_loop", severity="bug",
                subject_id="e1", subject_kind="edge", details={}),
    ]
    csv = render_csvs(findings)["section_c_self_loop.csv"]
    lines = [l for l in csv.splitlines() if l]
    # data rows in order: e1, e2
    assert lines[1].startswith("e1,")
    assert lines[2].startswith("e2,")
