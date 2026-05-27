import json, sys, pathlib, tempfile

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import load_graph, _parse_metadata


def _write_temp_seed(tmpdir, nodes, edges, contributors=None, signals=None):
    """Helper — writes seed files into tmpdir and returns the dir path."""
    seed_dir = pathlib.Path(tmpdir) / "seed"
    seed_dir.mkdir()
    (seed_dir / "nodes.json").write_text(json.dumps(nodes))
    (seed_dir / "edges.json").write_text(json.dumps(edges))
    (seed_dir / "contributors.json").write_text(json.dumps(contributors or []))
    (seed_dir / "signals.json").write_text(json.dumps(signals or []))
    return seed_dir


def test_load_graph_reads_local_seed_files():
    with tempfile.TemporaryDirectory() as tmp:
        seed_dir = _write_temp_seed(
            tmp,
            nodes=[{"id": "practitioner:a", "type": "practitioner", "name": "A",
                    "slug": "a", "metadata": {"status": "confirmed"}}],
            edges=[{"id": "e1", "source_id": "practitioner:a", "target_id": "concept:x",
                    "edge_type": "PRACTICES", "created_by": "contributor:migration",
                    "valid_until": None}],
        )
        nodes_by_id, edges, contributors_by_id, signals_by_id = load_graph(seed_dir=seed_dir)
        assert "practitioner:a" in nodes_by_id
        assert len(edges) == 1
        assert edges[0]["edge_type"] == "PRACTICES"


def test_parse_metadata_handles_dict():
    node = {"metadata": {"status": "confirmed"}}
    assert _parse_metadata(node) == {"status": "confirmed"}


def test_parse_metadata_handles_string():
    """Spec §E mentions 513 nodes have metadata serialised as a JSON string."""
    node = {"metadata": '{"status": "confirmed"}'}
    assert _parse_metadata(node) == {"status": "confirmed"}


def test_parse_metadata_handles_none():
    node = {"metadata": None}
    assert _parse_metadata(node) == {}


def test_parse_metadata_handles_missing():
    node = {}
    assert _parse_metadata(node) == {}


def test_load_graph_missing_nodes_or_edges_hard_fails():
    """nodes.json or edges.json missing → audit can't run; FileNotFoundError."""
    import pytest
    with tempfile.TemporaryDirectory() as tmp:
        # Empty dir — nodes.json missing.
        with pytest.raises(FileNotFoundError):
            load_graph(seed_dir=pathlib.Path(tmp))


def test_load_graph_missing_contributors_warns_returns_empty(capsys):
    """contributors.json missing → degrade gracefully, return empty dict, warn to stderr.

    Per spec error-handling table: contributors/signals are non-essential — C.5
    can still run, just with degraded coverage of unknown_contributor / dangling_signal_id checks.
    """
    with tempfile.TemporaryDirectory() as tmp:
        seed_dir = pathlib.Path(tmp) / "seed"
        seed_dir.mkdir()
        (seed_dir / "nodes.json").write_text("[]")
        (seed_dir / "edges.json").write_text("[]")
        (seed_dir / "signals.json").write_text("[]")
        # contributors.json deliberately absent

        nodes_by_id, edges, contribs, signals = load_graph(seed_dir=seed_dir)
        assert contribs == {}  # degraded gracefully
        captured = capsys.readouterr()
        assert "contributors.json" in captured.err
        assert "warning" in captured.err.lower() or "warn" in captured.err.lower()


def test_load_graph_malformed_contributors_warns_returns_empty(capsys):
    """contributors.json present but malformed JSON → same degrade-with-warning behavior."""
    with tempfile.TemporaryDirectory() as tmp:
        seed_dir = pathlib.Path(tmp) / "seed"
        seed_dir.mkdir()
        (seed_dir / "nodes.json").write_text("[]")
        (seed_dir / "edges.json").write_text("[]")
        (seed_dir / "signals.json").write_text("[]")
        (seed_dir / "contributors.json").write_text("{not valid json")

        nodes_by_id, edges, contribs, signals = load_graph(seed_dir=seed_dir)
        assert contribs == {}
        captured = capsys.readouterr()
        assert "contributors.json" in captured.err


def test_load_graph_missing_signals_warns_returns_empty(capsys):
    """signals.json missing → same as contributors: degrade, warn, continue."""
    with tempfile.TemporaryDirectory() as tmp:
        seed_dir = pathlib.Path(tmp) / "seed"
        seed_dir.mkdir()
        (seed_dir / "nodes.json").write_text("[]")
        (seed_dir / "edges.json").write_text("[]")
        (seed_dir / "contributors.json").write_text("[]")
        # signals.json deliberately absent

        nodes_by_id, edges, contribs, signals = load_graph(seed_dir=seed_dir)
        assert signals == {}
        captured = capsys.readouterr()
        assert "signals.json" in captured.err


def test_parse_metadata_handles_json_string_of_non_dict():
    """A JSON string that decodes to a non-dict (str/int/list/bool/null) must
    fall back to {} so downstream checks can safely call md.get(...)."""
    for raw in ['"a string"', '42', 'true', 'null', '[1, 2]']:
        result = _parse_metadata({"metadata": raw})
        assert result == {}, f"_parse_metadata({raw!r}) should be {{}}, got {result!r}"


def test_load_graph_live_mode_normalises_edge_fields(monkeypatch):
    """The live API serialises edges as {source, target, type}; load_graph
    must normalise to seed schema {source_id, target_id, edge_type}."""
    class _MockResponse:
        def __init__(self, payload):
            self._payload = payload
        def raise_for_status(self): pass
        def json(self): return self._payload

    payload = {
        "nodes": [{"id": "practitioner:a", "name": "A", "type": "practitioner", "slug": "a"}],
        "edges": [{"source": "practitioner:a", "target": "concept:x",
                   "type": "PRACTICES", "confidence": 1.0, "created_by": "contributor:migration"}],
    }
    import requests
    monkeypatch.setattr(requests, "get", lambda url, timeout: _MockResponse(payload))

    nodes_by_id, edges, contribs, signals = load_graph(live_url="https://example/api/graph")
    assert "practitioner:a" in nodes_by_id
    assert len(edges) == 1
    e = edges[0]
    assert e["source_id"] == "practitioner:a"
    assert e["target_id"] == "concept:x"
    assert e["edge_type"] == "PRACTICES"
    assert e["valid_until"] is None  # API only returns current edges
    assert contribs == {}  # API doesn't expose contributors
    assert signals == {}   # API doesn't expose signals
