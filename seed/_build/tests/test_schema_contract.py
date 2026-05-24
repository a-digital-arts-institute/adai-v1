"""Structural tests for schema_contract.py.

These assert the shape of EDGE_CLAIMS without prescribing the per-edge content.
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

from schema_contract import (
    EDGE_CLAIMS,
    EdgeClaim,
    CONTRACT_SCHEMA_VERSION,
    GENERIC_TITLE_DENYLIST,
    CRYPTO_ERA_SLUG_TOKENS,
    KNOWN_LEGACY_EDGE_TYPES,
    INVITATION_STATUS_SET,
    AUTOMATED_WRITER_PREFIXES,
)


EXPECTED_EDGE_TYPES = {
    "CREATED_BY", "EMBODIES", "PRACTICES", "USES_TECHNIQUE", "BELONGS_TO",
    "EXHIBITED_AT", "CLASSIFIED_BY", "COLLABORATES_WITH", "INFLUENCES",
    "RESPONDS_TO", "CONTESTS", "TENSION_WITH",
    "STYLE_KIN", "VISUALLY_AFFINE",
}
EXPECTED_DOCS = {"skill_md", "sources_md", "claude_md"}


def test_edge_claims_has_14_entries():
    """Spec acceptance criterion #7."""
    assert len(EDGE_CLAIMS) == 14, f"expected 14 entries, got {len(EDGE_CLAIMS)}"


def test_edge_claims_covers_expected_edge_types():
    assert set(EDGE_CLAIMS.keys()) == EXPECTED_EDGE_TYPES


def test_each_entry_has_three_document_keys():
    for edge_type, doc_map in EDGE_CLAIMS.items():
        assert set(doc_map.keys()) == EXPECTED_DOCS, (
            f"{edge_type} missing or has extra document keys: {set(doc_map.keys())}"
        )


def test_each_documented_claim_is_edgeclaim_or_none():
    for edge_type, doc_map in EDGE_CLAIMS.items():
        for doc_name, claim in doc_map.items():
            assert claim is None or isinstance(claim, EdgeClaim), (
                f"{edge_type}.{doc_name} must be EdgeClaim or None, got {type(claim)}"
            )


def test_at_least_one_document_per_edge_type():
    """Spec §C.7 — every edge type in EDGE_CLAIMS must be documented somewhere."""
    for edge_type, doc_map in EDGE_CLAIMS.items():
        if not any(v is not None for v in doc_map.values()):
            raise AssertionError(f"{edge_type} is in EDGE_CLAIMS but no document declares it")


def test_every_edgeclaim_has_non_empty_ref():
    """Spec acceptance criterion #7."""
    for edge_type, doc_map in EDGE_CLAIMS.items():
        for doc_name, claim in doc_map.items():
            if claim is not None:
                assert claim.ref.strip(), (
                    f"{edge_type}.{doc_name}.ref is empty — every EdgeClaim needs a citation"
                )


def test_no_ellipsis_sentinels_remain():
    """Catches the Task 3 'remaining 11 entries' placeholder if not filled in."""
    for edge_type, doc_map in EDGE_CLAIMS.items():
        for doc_name, claim in doc_map.items():
            assert claim is not Ellipsis, (
                f"{edge_type}.{doc_name} still has the Ellipsis sentinel from the implementation TODO"
            )


def test_invitation_edges_are_flagged():
    """RESPONDS_TO, CONTESTS, TENSION_WITH must have is_invitation=True wherever documented."""
    for edge_type in ("RESPONDS_TO", "CONTESTS", "TENSION_WITH"):
        for doc_name, claim in EDGE_CLAIMS[edge_type].items():
            if claim is not None:
                assert claim.is_invitation, (
                    f"{edge_type}.{doc_name}.is_invitation should be True (invitation edge per SOURCES.md)"
                )


def test_contract_schema_version_is_string():
    assert isinstance(CONTRACT_SCHEMA_VERSION, str)
    assert CONTRACT_SCHEMA_VERSION.strip()


def test_denylist_constants_are_frozensets():
    assert isinstance(GENERIC_TITLE_DENYLIST, frozenset)
    assert isinstance(CRYPTO_ERA_SLUG_TOKENS, frozenset)
    assert isinstance(KNOWN_LEGACY_EDGE_TYPES, frozenset)
    assert isinstance(INVITATION_STATUS_SET, frozenset)


def test_known_legacy_includes_related_to():
    """CLAUDE.md flags RELATED_TO specifically."""
    assert "RELATED_TO" in KNOWN_LEGACY_EDGE_TYPES


def test_automated_writer_prefixes_complete():
    assert "gatherer-" in AUTOMATED_WRITER_PREFIXES
    assert "embedding-" in AUTOMATED_WRITER_PREFIXES
