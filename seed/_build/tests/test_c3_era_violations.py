import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from audit_schema import detect_era_violations


def _nodes(year_start_for_a1=None, include_active_years=False):
    md = {}
    if year_start_for_a1 is not None:
        md["year_start"] = year_start_for_a1
    if include_active_years:
        md["full_profile"] = {"basic_info": {"active_years": "1968"}}
    return {
        "artwork:a1": {"id": "artwork:a1", "type": "artwork", "name": "X", "metadata": md},
        "concept:on-chain-generative-art": {"type": "concept", "slug": "on-chain-generative-art"},
        "concept:plotter-drawing": {"type": "concept", "slug": "plotter-drawing"},
    }


def _violations(findings):
    """Helper — filter out the era_check_coverage summary finding."""
    return [f for f in findings if f.category == "era_violation"]


def test_pre_2009_artwork_to_crypto_concept_is_flagged():
    edges = [
        {"source_id": "artwork:a1", "target_id": "concept:on-chain-generative-art",
         "edge_type": "EMBODIES", "created_by": "gatherer-enrichment"},
    ]
    findings = detect_era_violations(_nodes(year_start_for_a1=1968), edges)
    vs = _violations(findings)
    assert len(vs) == 1
    assert vs[0].section == "C"
    assert vs[0].category == "era_violation"


def test_pre_2009_artwork_to_non_crypto_concept_is_not_flagged():
    edges = [
        {"source_id": "artwork:a1", "target_id": "concept:plotter-drawing",
         "edge_type": "EMBODIES", "created_by": "gatherer-enrichment"},
    ]
    assert _violations(detect_era_violations(_nodes(year_start_for_a1=1968), edges)) == []


def test_post_2009_artwork_to_crypto_concept_is_not_flagged():
    edges = [
        {"source_id": "artwork:a1", "target_id": "concept:on-chain-generative-art",
         "edge_type": "EMBODIES", "created_by": "x"},
    ]
    assert _violations(detect_era_violations(_nodes(year_start_for_a1=2021), edges)) == []


def test_coverage_summary_finding_is_emitted():
    """Spec C.3 — emit one summary Finding reporting coverage %, not per-artwork skip rows."""
    # 1 artwork with year_start, 2 without
    nodes = {
        "artwork:has-year": {"id": "artwork:has-year", "type": "artwork", "name": "X",
                             "metadata": {"year_start": 1968}},
        "artwork:has-year-raw": {"id": "artwork:has-year-raw", "type": "artwork", "name": "Y",
                                 "metadata": {"year_raw": "c. 1970"}},
        "artwork:bare": {"id": "artwork:bare", "type": "artwork", "name": "Z",
                         "metadata": {}},
        "concept:on-chain-generative-art": {"type": "concept", "slug": "on-chain-generative-art"},
    }
    findings = detect_era_violations(nodes, [])
    summaries = [f for f in findings if f.category == "era_check_coverage"]
    assert len(summaries) == 1
    d = summaries[0].details
    assert d["total"] == 3
    assert d["covered"] == 1
    assert d["coverage_pct"] == 33.3
    assert d["excluded_with_year_raw"] == 1
    assert d["excluded_no_year_info"] == 1
    # Per-artwork "era_check_skipped" rows must NOT be emitted (replaced by summary)
    assert not any(f.category == "era_check_skipped" for f in findings)
