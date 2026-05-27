import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import normalize_output


def test_strips_generated_timestamp():
    md = "# Title\n\nGenerated: 2026-05-24T12:34:56Z\nMore content"
    norm = normalize_output(md)
    assert "Generated:" not in norm
    assert "Title" in norm
    assert "More content" in norm


def test_strips_graph_snapshot_line():
    md = "# Title\n\nGraph snapshot: 1234 nodes, 5678 edges\nMore"
    norm = normalize_output(md)
    assert "Graph snapshot:" not in norm
    assert "More" in norm


def test_normalises_line_endings():
    norm = normalize_output("a\r\nb\r\n")
    assert "\r" not in norm
