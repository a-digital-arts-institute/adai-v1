import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import detect_provenance_broken


def _ctx(contribs=None, signals=None):
    return (contribs or {"contributor:migration": {"id": "contributor:migration"}},
            signals or {})


def test_known_gatherer_is_ok():
    edges = [{"id": "e1", "created_by": "gatherer-objkt-tags-v3", "signal_id": None}]
    assert detect_provenance_broken(edges, *_ctx()) == []


def test_known_embedding_is_ok():
    edges = [{"id": "e1", "created_by": "embedding-multimodal-v1", "signal_id": None}]
    assert detect_provenance_broken(edges, *_ctx()) == []


def test_known_contributor_is_ok():
    edges = [{"id": "e1", "created_by": "contributor:migration", "signal_id": None}]
    assert detect_provenance_broken(edges, *_ctx()) == []


def test_unknown_contributor_is_flagged():
    edges = [{"id": "e1", "created_by": "contributor:ghost", "signal_id": None}]
    findings = detect_provenance_broken(edges, *_ctx())
    assert len(findings) == 1
    assert findings[0].category == "unknown_contributor"


def test_missing_created_by_is_flagged():
    edges = [{"id": "e1", "created_by": None, "signal_id": None}]
    findings = detect_provenance_broken(edges, *_ctx())
    assert findings[0].category == "created_by_missing"


def test_dangling_signal_id_is_flagged():
    edges = [{"id": "e1", "created_by": "contributor:migration", "signal_id": "signal:nope"}]
    findings = detect_provenance_broken(edges, *_ctx())
    assert findings[0].category == "dangling_signal_id"
