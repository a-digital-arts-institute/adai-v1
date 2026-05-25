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
