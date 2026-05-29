"""
Shared signal/provenance construction for gatherers.

Every gatherer constructs ONE signal at the start of its run and stamps
every node/edge it emits with that signal_id. The signal records:

  - what producer ran (gatherer module + version + git sha)
  - against what source (endpoint URL or upstream identifier)
  - what config drove the run (filters, since-date, scope flags)
  - when it ran (so re-runs can dedupe / supersede)

The signal is NOT a model-reasoning chain. ``processing_trace`` holds the
gatherer's configuration, not a justification for editorial choices —
gatherers don't make editorial choices, they faithfully reproduce sources.

Public API:
  GathererSignal(producer, source, batch_id=None, **config)  -- dataclass
    .as_row() -> dict   # the signals.json row

  new_batch_id(producer) -> str    # "{producer}-{YYYYMMDDhhmm}"
  now_iso() -> str                 # ISO-8601 UTC, second precision

Source-origin policy:
  Every gatherer that reads a public API / CSV / SPARQL endpoint is
  ``platform_api`` (the source itself is the canonical record). Web-scraped
  pages (HTML extraction) are ``webscrape``. Anything an AI added is
  ``ai_assisted`` (slug disambiguation suffix logic doesn't count — it's
  rule-based and deterministic). Nothing emitted by a gatherer is
  ``ai_generated`` — gatherers don't generate, they fetch.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

# All gatherers run under one of these contributors. The CLAUDE.md says
# ``contributor:migration`` is trust tier ``reviewed`` (auto-merge). We keep
# using it for canon-rebuild gatherer runs because the source-attested
# rule that a gatherer enforces *is* the editorial line.
DEFAULT_CONTRIBUTOR = "contributor:migration"

# Source-origin allowed by the schema. Gatherers only ever pick from this subset.
SOURCE_ORIGIN_PLATFORM_API = "platform_api"
SOURCE_ORIGIN_WEBSCRAPE = "webscrape"
SOURCE_ORIGIN_HUMAN_SECONDARY = "human_secondary"  # e.g. museum CSV authored by curators

# Consent fields for gatherer-sourced rows: source attests the structural
# facts (artwork X by practitioner Y, accessioned by Z museum), so:
DEFAULT_CONSENT = {
    "consent_scope": "structural_only",
    "consent_attribution": "attributed",
    "consent_revocable": 0,  # public source data; not revocable on our end
}


def now_iso() -> str:
    """ISO-8601 UTC, second precision. Used for signal/edge timestamps."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def new_batch_id(producer: str) -> str:
    """Deterministic-but-unique batch id: ``{producer}-{YYYYMMDDhhmm}``.

    Example: ``moma-202605291030``. Gatherer-suffixed so two gatherers running
    in the same minute don't collide.
    """
    return f"{producer}-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}"


def _git_sha() -> str:
    """Best-effort git HEAD sha (8 chars). Empty string if not in a git tree."""
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--short=8", "HEAD"],
            capture_output=True,
            text=True,
            timeout=2,
            check=True,
        )
        return out.stdout.strip()
    except (subprocess.SubprocessError, FileNotFoundError, OSError):
        return ""


@dataclass
class GathererSignal:
    """One signal per gatherer run. Stamps every node/edge the run emits.

    Required:
      producer: short name, e.g. ``"moma"``, ``"wikidata"``, ``"fxhash"``
      source: human-readable upstream identifier (endpoint URL, CSV URL, etc.)

    Optional:
      batch_id: defaults to ``new_batch_id(producer)``
      source_origin: defaults to ``platform_api``
      config: dict of gatherer config that drove the run (filters, since-date)
      query: the SPARQL / GraphQL / SQL query text if applicable (truncated)
    """

    producer: str
    source: str
    batch_id: str = ""
    source_origin: str = SOURCE_ORIGIN_PLATFORM_API
    config: dict[str, Any] = field(default_factory=dict)
    query: str = ""
    contributor: str = DEFAULT_CONTRIBUTOR

    def __post_init__(self) -> None:
        if not self.batch_id:
            self.batch_id = new_batch_id(self.producer)

    @property
    def signal_id(self) -> str:
        """``signal:{producer}-{YYYY-MM}`` — stable per-month, so re-runs in
        the same month land under the same signal_id. The batch_id is the
        finer-grained re-run identifier.
        """
        ym = datetime.now(timezone.utc).strftime("%Y-%m")
        return f"signal:{self.producer}-{ym}"

    def as_row(self) -> dict[str, Any]:
        """The ``signals.json`` row this gatherer emits. Fields aligned with
        ``db.sql`` so the seeder binds cleanly (better-sqlite3 rejects
        ``undefined``; null is fine)."""
        return {
            "id": self.signal_id,
            "title": f"{self.producer} gatherer run",
            "source_url": self.source,
            "source_type": "api",
            "cla_layer": None,
            "summary": None,
            "content": None,
            "submitted_by": self.contributor,
            "confidence": 1.0,
            "claim_text": f"{self.producer} gatherer run against {self.source}",
            "source_origin": self.source_origin,
            "batch_id": self.batch_id,
            "status": "active",
            "lived_experience": 0,
            "processing_trace": json.dumps(
                {
                    "producer": self.producer,
                    "git_sha": _git_sha(),
                    "config": self.config,
                    "query": self.query[:2000] if self.query else "",
                    "python": sys.version.split()[0],
                    "argv": sys.argv,
                }
            ),
            "provenance_chain": json.dumps(
                {
                    "source": self.source,
                    "fetched_at": now_iso(),
                    "batch_id": self.batch_id,
                }
            ),
            "created_by": self.contributor,
            "created_at": now_iso(),
            **DEFAULT_CONSENT,
        }

    def stamp(self, row: dict[str, Any]) -> dict[str, Any]:
        """Stamp ``signal_id`` + ``created_by`` + ``batch_id`` onto a node/edge row.

        Returns the row (mutated in place AND returned, for one-liner use).
        Overwrites empty/missing fields; preserves anything the caller already set
        (e.g. a contributor stamping a specific signal_id for a corrections pass).
        """
        if not row.get("signal_id"):
            row["signal_id"] = self.signal_id
        if not row.get("created_by"):
            row["created_by"] = self.contributor
        if not row.get("batch_id"):
            row["batch_id"] = self.batch_id
        return row


def write_batch(
    sig: GathererSignal,
    *,
    nodes: list[dict[str, Any]] | None = None,
    edges: list[dict[str, Any]] | None = None,
    aliases: list[dict[str, Any]] | None = None,
    out_dir: str = "seed/_build/runs",
) -> str:
    """Write a per-gatherer batch to ``<out_dir>/<YYYY-MM>/<batch_id>.json``.

    The merger (Task #24) reads every batch in ``runs/`` and folds them into
    ``seed/{nodes,edges,signals,contributors,aliases}.json``. Per-batch files
    are gitignored (ephemeral) by default — see ``seed/_build/.gitignore``.
    """
    ym = datetime.now(timezone.utc).strftime("%Y-%m")
    target_dir = os.path.join(out_dir, ym)
    os.makedirs(target_dir, exist_ok=True)
    payload = {
        "signal": sig.as_row(),
        "nodes": [sig.stamp(dict(n)) for n in (nodes or [])],
        "edges": [sig.stamp(dict(e)) for e in (edges or [])],
        "aliases": list(aliases or []),
    }
    path = os.path.join(target_dir, f"{sig.batch_id}.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2, sort_keys=False)
    return path


if __name__ == "__main__":
    sig = GathererSignal(
        producer="example",
        source="https://example.com/api/v1",
        config={"since": "2026-01-01", "limit": 100},
    )
    print(json.dumps(sig.as_row(), indent=2))
    print()
    print("Stamp example:")
    print(json.dumps(sig.stamp({"id": "artwork:test"}), indent=2))
