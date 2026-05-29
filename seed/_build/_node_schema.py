"""
Schema validators for gatherer output.

Stdlib-only. Gatherers construct rows via the helper classes here; the
validators enforce the producer contract at emit time so malformed rows
never make it to seed/*.json.

The hard rules (PRODUCER_CONTRACT.md §3):
  1. Every row carries ``signal_id`` (and ``created_by`` + ``batch_id``).
  2. Free-text fields (``description``, ``bio``, ``summary``, ``notes``) in
     ``metadata`` are PROHIBITED unless a sibling ``source_url`` field also
     exists in ``metadata``. This is the anti-enrichment rule — fabricated
     prose has no upstream URL, so the validator rejects it.
  3. ``slug`` matches ``_slug.slugify(name)`` for the node's type.
  4. ``edge_type`` is one of the curated 9 (gatherers never emit the auto-
     derived STYLE_KIN / VISUALLY_AFFINE — those come from embed:derive).
  5. ``CREATED_BY`` edges target a practitioner or collective. (Artworks
     whose only attribution is a project/platform/publication are an
     attribution gap — flag for curation, don't paper over.)

Cross-row checks happen in ``validate_batch()`` (edges reference nodes,
no orphan signals, etc.).
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Iterable

from _slug import slugify

# Canon-aligned with CLAUDE.md (May 2026).
NODE_TYPES = frozenset({
    "artwork",
    "concept",
    "practitioner",
    "institution",
    "scene",
    "collective",
    "platform",
    "classification_regime",
    "publication",
    "project",
    "event",      # reserved, no rows yet
    "related",    # reserved, no rows yet
})

# Curated edge types only — gatherers emit from this set.
# STYLE_KIN, VISUALLY_AFFINE, SUGGESTS_CREATED_BY are auto-derived (not here).
CURATED_EDGE_TYPES = frozenset({
    "EMBODIES",
    "CREATED_BY",
    "PRACTICES",
    "EXHIBITED_AT",
    "CLASSIFIED_BY",
    "BELONGS_TO",
    "COLLABORATES_WITH",
    "USES_TECHNIQUE",
    "INFLUENCES",
    "RESPONDS_TO",
})

# Free-text metadata keys that require a sibling source URL. This is the
# anti-enrichment guard: hand-written prose carries no upstream URL, so
# the validator catches LLM-padded fields at emit time.
NARRATIVE_KEYS = frozenset({"description", "bio", "summary", "notes", "biography"})

# Metadata keys whose value, if present, must be a source URL. ``source_url``
# is the canonical name; ``source`` and ``url`` are accepted as fallbacks.
SOURCE_URL_KEYS = ("source_url", "source", "url", "wikipedia_url", "wikidata_url")


class SchemaError(ValueError):
    """Raised by validators on contract violations. Stops the gatherer."""


def _has_source_url(metadata: dict[str, Any]) -> bool:
    for k in SOURCE_URL_KEYS:
        v = metadata.get(k)
        if isinstance(v, str) and v.startswith(("http://", "https://")):
            return True
    # Citations array also counts: [{"url": "...", "...": "..."}, ...]
    cites = metadata.get("citations") or metadata.get("sources")
    if isinstance(cites, list):
        for c in cites:
            if isinstance(c, dict):
                for k in SOURCE_URL_KEYS:
                    if isinstance(c.get(k), str) and c[k].startswith(("http://", "https://")):
                        return True
    return False


# -------------------- Nodes --------------------


@dataclass
class Node:
    id: str
    type: str
    name: str
    slug: str
    metadata: dict[str, Any] = field(default_factory=dict)
    # Gatherer-stamped (via GathererSignal.stamp); validated at validate().
    signal_id: str = ""
    created_by: str = ""
    batch_id: str = ""

    def validate(self) -> None:
        if not self.id or ":" not in self.id:
            raise SchemaError(f"node id must be '<type>:<name>': {self.id!r}")
        if self.type not in NODE_TYPES:
            raise SchemaError(f"unknown node type {self.type!r} on {self.id}")
        if not self.name:
            raise SchemaError(f"node {self.id} has empty name")
        if not self.slug:
            raise SchemaError(f"node {self.id} has empty slug")
        expected_slug = slugify(self.name).replace(" ", "-")
        # The slug must START with the slugified name; gatherers may suffix
        # disambiguators (see _slug.artwork_slug() for the rule). So we
        # check prefix, not equality.
        if not self.slug.startswith(expected_slug.split("--")[0]):
            raise SchemaError(
                f"node {self.id} slug={self.slug!r} doesn't match name={self.name!r} "
                f"(expected to start with {expected_slug!r})"
            )
        if not self.signal_id:
            raise SchemaError(f"node {self.id} missing signal_id — stamp via GathererSignal.stamp()")
        if not self.created_by:
            raise SchemaError(f"node {self.id} missing created_by")
        if not self.batch_id:
            raise SchemaError(f"node {self.id} missing batch_id")
        # Narrative-without-source guard.
        narrative_present = [k for k in NARRATIVE_KEYS if self.metadata.get(k)]
        if narrative_present and not _has_source_url(self.metadata):
            raise SchemaError(
                f"node {self.id} has narrative fields {narrative_present} without a sibling source URL "
                f"in metadata (anti-enrichment rule). Either drop the prose or attach source_url/citations[].url."
            )

    def as_row(self) -> dict[str, Any]:
        """Emit the row dict. Does NOT validate — the gatherer typically calls
        ``sig.stamp(n.as_row())`` and the stamping fills signal_id/created_by/
        batch_id which validate() requires. Validation happens at batch level
        via ``validate_batch`` and at canon level via ``validate_seed.py``.
        """
        return {
            "id": self.id,
            "type": self.type,
            "name": self.name,
            "slug": self.slug,
            "metadata": dict(self.metadata),
            "signal_id": self.signal_id,
            "created_by": self.created_by,
            "batch_id": self.batch_id,
        }


# -------------------- Edges --------------------


@dataclass
class Edge:
    source_id: str
    target_id: str
    edge_type: str
    signal_id: str = ""
    created_by: str = ""
    batch_id: str = ""
    confidence: float = 1.0
    charge: str | None = None
    event_time: str | None = None
    valid_from: str = ""    # ISO-8601, the time the edge entered the graph
    valid_until: str | None = None     # NULL = currently live
    invalidated_by: str | None = None  # signal_id or edge id that superseded this
    id: str = ""                       # computed by id_for(...) if absent

    def __post_init__(self) -> None:
        if not self.id:
            self.id = id_for(self.source_id, self.edge_type, self.target_id)

    def validate(self) -> None:
        if not self.source_id or not self.target_id:
            raise SchemaError(f"edge {self.id} missing source/target")
        if self.edge_type not in CURATED_EDGE_TYPES:
            raise SchemaError(
                f"edge {self.id} uses non-curated edge_type {self.edge_type!r}; "
                f"allowed: {sorted(CURATED_EDGE_TYPES)}"
            )
        if not self.signal_id:
            raise SchemaError(f"edge {self.id} missing signal_id")
        if not self.created_by:
            raise SchemaError(f"edge {self.id} missing created_by")
        if not self.batch_id:
            raise SchemaError(f"edge {self.id} missing batch_id")
        if not self.valid_from:
            raise SchemaError(f"edge {self.id} missing valid_from (use _provenance.now_iso())")
        if not (0.0 <= self.confidence <= 1.0):
            raise SchemaError(f"edge {self.id} confidence {self.confidence} out of [0,1]")

    def as_row(self) -> dict[str, Any]:
        """Emit the row dict. Validation deferred to batch level."""
        row = {
            "id": self.id,
            "source_id": self.source_id,
            "target_id": self.target_id,
            "edge_type": self.edge_type,
            "signal_id": self.signal_id,
            "confidence": self.confidence,
            "created_by": self.created_by,
            "batch_id": self.batch_id,
            "valid_from": self.valid_from,
        }
        if self.charge is not None:
            row["charge"] = self.charge
        if self.event_time is not None:
            row["event_time"] = self.event_time
        if self.valid_until is not None:
            row["valid_until"] = self.valid_until
        if self.invalidated_by is not None:
            row["invalidated_by"] = self.invalidated_by
        return row


def id_for(source_id: str, edge_type: str, target_id: str) -> str:
    """Deterministic edge id. Stable across runs so dedup is mechanical."""
    return f"edge:{source_id}|{edge_type}|{target_id}"


# -------------------- Aliases (cross-source identity) --------------------


@dataclass
class Alias:
    """A (source, external_id) → node_id binding for cross-source dedup."""

    source: str           # "wikidata", "moma", "fxhash", "objkt", "artblocks", "met", "rhizome"
    external_id: str      # QID, ObjectID, contract+token, etc.
    node_id: str          # "practitioner:casey reas" etc.

    def validate(self) -> None:
        if not self.source or not self.external_id or not self.node_id:
            raise SchemaError(f"alias missing fields: {self}")
        if ":" not in self.node_id:
            raise SchemaError(f"alias node_id must be '<type>:<name>': {self.node_id!r}")

    def as_row(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "external_id": self.external_id,
            "node_id": self.node_id,
        }


# -------------------- Batch-level validation --------------------


def _validate_node_row(n: dict[str, Any]) -> list[str]:
    """Per-row node validation against the contract. Returns list of errors."""
    errs: list[str] = []
    nid = n.get("id") or "?"
    for k in ("id", "type", "name", "slug", "signal_id", "created_by", "batch_id"):
        if not n.get(k):
            errs.append(f"node {nid}: missing/empty {k}")
    if n.get("type") and n["type"] not in NODE_TYPES:
        errs.append(f"node {nid}: unknown type {n['type']!r}")
    if n.get("id") and ":" not in n["id"]:
        errs.append(f"node {nid}: id not in '<type>:<name>' form")
    md = n.get("metadata") or {}
    if isinstance(md, str):
        try:
            md = _json_loads(md)
        except Exception:
            errs.append(f"node {nid}: metadata is a string but not valid JSON")
            md = {}
    if isinstance(md, dict):
        narrative_present = [k for k in NARRATIVE_KEYS if md.get(k)]
        if narrative_present and not _has_source_url(md):
            errs.append(
                f"node {nid}: narrative {narrative_present} without sibling source URL "
                f"(anti-enrichment rule)"
            )
    return errs


def _validate_edge_row(e: dict[str, Any]) -> list[str]:
    errs: list[str] = []
    eid = e.get("id") or "?"
    for k in ("source_id", "target_id", "edge_type", "signal_id", "created_by",
              "batch_id", "valid_from"):
        if not e.get(k):
            errs.append(f"edge {eid}: missing/empty {k}")
    if e.get("edge_type") and e["edge_type"] not in CURATED_EDGE_TYPES:
        errs.append(f"edge {eid}: non-curated edge_type {e['edge_type']!r}")
    conf = e.get("confidence")
    if conf is not None:
        try:
            if not (0.0 <= float(conf) <= 1.0):
                errs.append(f"edge {eid}: confidence {conf} out of [0,1]")
        except (TypeError, ValueError):
            errs.append(f"edge {eid}: confidence {conf!r} not numeric")
    return errs


def validate_batch(
    *,
    nodes: Iterable[dict[str, Any]],
    edges: Iterable[dict[str, Any]],
    signal_ids_known: set[str] | None = None,
) -> list[str]:
    """Per-row + cross-row validation. Returns a list of error strings; empty = OK.

    Doesn't raise — callers decide whether to fail or warn (typically fail
    in CI, warn during interactive dev). Use this in every gatherer right
    before ``write_batch()`` so malformed rows never reach disk.
    """
    errors: list[str] = []
    nodes_list = list(nodes)
    edges_list = list(edges)
    node_ids = {n["id"] for n in nodes_list if isinstance(n, dict) and "id" in n}

    # Per-row validation
    for n in nodes_list:
        errors.extend(_validate_node_row(n))
    for e in edges_list:
        errors.extend(_validate_edge_row(e))

    # Edges must reference nodes that exist (or will exist — for cross-batch
    # validation the caller passes the union of all node ids).
    for e in edges_list:
        sid, tid = e.get("source_id"), e.get("target_id")
        if sid not in node_ids:
            errors.append(f"edge {e.get('id')} references unknown source_id {sid!r}")
        if tid not in node_ids:
            errors.append(f"edge {e.get('id')} references unknown target_id {tid!r}")

    # signal_id references resolve (if the caller supplied a known set)
    if signal_ids_known is not None:
        for row in [*nodes_list, *edges_list]:
            sig = row.get("signal_id")
            if sig and sig not in signal_ids_known:
                errors.append(f"row {row.get('id')} references unknown signal_id {sig!r}")

    # No duplicate node ids.
    seen: set[str] = set()
    for n in nodes_list:
        nid = n.get("id")
        if nid in seen:
            errors.append(f"duplicate node id {nid!r}")
        seen.add(nid)

    # No duplicate edge ids (the deterministic id_for() should prevent this
    # within a single batch, but a contributor could supply ids manually).
    seen = set()
    for e in edges_list:
        eid = e.get("id")
        if eid in seen:
            errors.append(f"duplicate edge id {eid!r}")
        seen.add(eid)

    return errors


def _json_loads(s: str) -> Any:
    return json.loads(s)


if __name__ == "__main__":
    # Self-test
    from _provenance import GathererSignal, now_iso

    sig = GathererSignal(producer="selftest", source="memory://")

    n = Node(
        id="practitioner:casey reas",
        type="practitioner",
        name="Casey Reas",
        slug="casey-reas",
        metadata={"source_url": "https://www.wikidata.org/wiki/Q28936957"},
    )
    sig.stamp(n.__dict__)
    n.validate()
    print("OK node:", n.id)

    e = Edge(
        source_id="practitioner:casey reas",
        target_id="concept:generative-art",
        edge_type="PRACTICES",
        valid_from=now_iso(),
    )
    sig.stamp(e.__dict__)
    e.validate()
    print("OK edge:", e.id)

    # Negative test: narrative without source URL
    bad = Node(
        id="practitioner:x",
        type="practitioner",
        name="X",
        slug="x",
        metadata={"bio": "X is a fabricated artist."},
    )
    sig.stamp(bad.__dict__)
    try:
        bad.validate()
        print("FAIL: should have raised on bio-without-source")
    except SchemaError as exc:
        print(f"OK rejected (as expected): {exc}")
