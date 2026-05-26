import sys, pathlib, json, tempfile
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import (
    canonical_edges_json,
    narrative_cache_key,
    NarrativeCache,
)


def test_canonical_edges_json_sorts_and_keeps_only_known_fields():
    edges = [
        {"source_id": "a", "target_id": "b", "edge_type": "BELONGS_TO",
         "created_by": "x", "valid_from": "2024", "extra": "ignored"},
        {"source_id": "a", "target_id": "a", "edge_type": "BELONGS_TO",
         "created_by": "x"},
    ]
    result = canonical_edges_json(edges)
    data = json.loads(result)
    # Sorted by (source_id, edge_type, target_id)
    assert data[0]["target_id"] == "a"
    assert data[1]["target_id"] == "b"
    # Only the four fields kept
    assert set(data[0].keys()) == {"source_id", "target_id", "edge_type", "created_by"}


def test_canonical_edges_json_deterministic_across_input_order():
    a = [{"source_id": "1", "target_id": "2", "edge_type": "X", "created_by": "c"},
         {"source_id": "3", "target_id": "4", "edge_type": "X", "created_by": "c"}]
    b = list(reversed(a))
    assert canonical_edges_json(a) == canonical_edges_json(b)


def test_cache_key_components_affect_key():
    base = ("practitioner:a", "prose", "edges_json", "model", 1, "1.0")
    different = list(base)
    different[3] = "model-v2"  # change model
    k1 = narrative_cache_key(*base)
    k2 = narrative_cache_key(*different)
    assert k1 != k2


def test_cache_load_save_roundtrip():
    with tempfile.TemporaryDirectory() as tmp:
        path = pathlib.Path(tmp) / "narrative_audit.json"
        cache = NarrativeCache(path)
        cache.put("key1", {"finding": "x"})
        cache.save()
        cache2 = NarrativeCache(path)
        assert cache2.get("key1") == {"finding": "x"}
        assert cache2.get("missing") is None
