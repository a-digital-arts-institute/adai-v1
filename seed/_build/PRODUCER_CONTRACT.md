# Producer contract — what every gatherer must do

This file is the load-bearing one. Every script in `seed/_build/` that
ingests data into the seed must conform to it. The contract is enforced
in code by `validate_seed.py` (which runs in CI), in `_node_schema.py`
(which gatherers call at emit time), and culturally by `CLAUDE.md`.

If you're a new contributor — human or AI — read this before touching any
seed file. The CLAUDE.md banner ("audits target contracts, not artefacts")
is the cultural rule; this file is the engineering one.

---

## 0. The shape of a gatherer

A gatherer is a stdlib-only Python script with this shape:

```python
"""fetch_<source>.py — gather <node types> from <source>.

Source: <URL of the API/CSV/SPARQL endpoint>
Emits:  nodes (<types>), edges (<edge_types>), aliases (source ↔ external_id),
        plus one signal describing the run.
Run:    python3 seed/_build/fetch_<source>.py [--limit N] [--since YYYY-MM-DD]
"""
from __future__ import annotations
import argparse, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _http import get_json, HttpError
from _provenance import GathererSignal, now_iso, write_batch
from _node_schema import Node, Edge, Alias, validate_batch
from _slug import node_id, node_slug, slugify_url

def gather(*, limit: int | None, since: str | None) -> tuple[list[Node], list[Edge], list[Alias]]:
    # ... fetch, parse, build Node/Edge/Alias objects ...
    return nodes, edges, aliases

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--since", type=str, default=None)
    args = ap.parse_args()

    sig = GathererSignal(
        producer="<source>",
        source="<the endpoint URL or upstream identifier>",
        config={"limit": args.limit, "since": args.since},
    )
    nodes, edges, aliases = gather(limit=args.limit, since=args.since)

    # Stamp signal_id/created_by/batch_id and validate at emit time.
    node_rows = [sig.stamp(n.as_row()) for n in nodes]
    edge_rows = [sig.stamp(e.as_row()) for e in edges]
    alias_rows = [a.as_row() for a in aliases]

    errors = validate_batch(nodes=node_rows, edges=edge_rows)
    if errors:
        print(f"VALIDATION FAILED ({len(errors)} errors):", file=sys.stderr)
        for e in errors[:10]:
            print(f"  {e}", file=sys.stderr)
        return 1

    path = write_batch(sig, nodes=node_rows, edges=edge_rows, aliases=alias_rows)
    print(f"wrote {len(node_rows)} nodes, {len(edge_rows)} edges, {len(alias_rows)} aliases → {path}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

The Node/Edge/Alias classes from `_node_schema` carry validation in
`.validate()` / `.as_row()`. Gatherers should not bypass them.

---

## 1. The hard rules (validators enforce these)

### 1.1 Every row has provenance

`signal_id`, `created_by`, `batch_id` on every node, every edge, every
alias — stamped by `GathererSignal.stamp(row)`. The validator (and the
schema classes) reject rows missing any of these.

The signal itself (one per gatherer run) records:

  - Which producer ran (`producer`)
  - Against what source (`source` — endpoint URL or canonical identifier)
  - What config (`config` — filters, since-date, scope flags)
  - When (`provenance_chain.fetched_at`, ISO-8601 UTC)
  - Git sha (`processing_trace.git_sha`)

If a downstream consumer asks "where did this row come from?", they can
follow `signal_id → signals.json → processing_trace + provenance_chain`
and find the producer + the upstream + the time.

### 1.2 No editorial prose without a source URL

This is the **anti-enrichment rule**. Metadata fields `description`,
`bio`, `summary`, `notes`, `biography` are PROHIBITED unless a sibling
field is present:

  - `source_url`, `source`, `url`, `wikipedia_url`, `wikidata_url`, OR
  - `citations: [{ url: "...", ... }, ...]` / `sources: [{ url: "...", ... }, ...]`

…and the URL is an `http://` or `https://` URL.

**Why**: the prior canon was contaminated by LLM enrichment that filled
in plausible-sounding bios without citations. The validator catches this
at the row level. If MoMA's CSV doesn't carry a `description` field for
the artwork, the gatherer doesn't synthesise one — it leaves the field
absent. The graph is thinner; every row is defensible.

### 1.3 Slugs match the shared helper

Every gatherer mints ids via `_slug.node_id(type, name, source=, external_id=)`,
not by inlining its own `slugify`. The slug field on the node uses
`_slug.node_slug(type, name, ...)` (kebab-case URL-safe). This guarantees
byte-equal ids across sources for the same canonical entity.

For generic-titled artworks (`Untitled`, `Black Hole`, etc.) the helper
appends a `--<source>-<external_id>` disambiguator. Source-attested at
the producer level — no overlay corrections needed.

### 1.4 Edge types come from the curated 9

Gatherers emit only:

  EMBODIES · CREATED_BY · PRACTICES · EXHIBITED_AT · CLASSIFIED_BY ·
  BELONGS_TO · COLLABORATES_WITH · USES_TECHNIQUE · INFLUENCES · RESPONDS_TO

The auto-derived types (`STYLE_KIN`, `VISUALLY_AFFINE`,
`SUGGESTS_CREATED_BY`) are emitted by `npm run embed:derive` against the
shipped canon, never by a gatherer.

`RESPONDS_TO` (artwork → artwork) needs evidence of artist intent — a
gatherer doesn't infer it from data. Practitioner-contributed only.

### 1.5 CREATED_BY targets a practitioner or collective

Attribution gaps (artworks whose `CREATED_BY` would point at a project /
platform / publication / parent-artwork) are surfaced, not papered over.
Skip the edge in the gatherer; let the curation pass attach to the right
human (the embedding derive's `SUGGESTS_CREATED_BY` flow exists for this).

### 1.6 Cross-source identity goes through aliases

Same person on MoMA / Wikidata / fxhash gets ONE node and ONE alias row
per source. `seed/aliases.json` is the resolution table. Gatherers emit
`Alias(source=, external_id=, node_id=)` rows alongside nodes; the
merger uses these to dedupe at canon-build time.

---

## 2. The soft rules (warnings, not failures)

  - Source-attested narrative fields are preferred even when allowed —
    if MoMA gives you a `Description` field, copy it verbatim, don't
    paraphrase.
  - Confidence on a gatherer-emitted edge defaults to `1.0`. Anything
    less means the source itself was ambiguous (`?` in CSV, low-confidence
    label, missing field) — document why with `metadata.confidence_note`.
  - `event_time` is the time the relationship was true in the world
    (e.g. acquisition date for `EXHIBITED_AT`); `valid_from` is when the
    edge entered the graph. Set both when the source provides the former.

---

## 3. What you must NOT do

  - **Mutate `seed/*.json` directly from a gatherer.** Gatherers write to
    `seed/_build/runs/<YYYY-MM>/<batch_id>.json`. The merge step (Task #24)
    folds batches into canon.
  - **Fabricate any field.** Source-attested or absent.
  - **Run LLMs in the gatherer's data path.** Slug disambiguation is rule-
    based and deterministic. Vocabulary normalisation is a curation step
    (Phase 3), not a gatherer step.
  - **Skip the schema classes.** Don't construct a raw dict and call
    `write_batch` — use `Node`/`Edge`/`Alias` so `validate()` runs.
  - **Bypass `_http.py`.** The retry/throttle is there for a reason; it
    keeps us out of Wikimedia's tarpit and the gatherer reliable.

---

## 4. The full pipeline

```
gatherer (fetch_<source>.py)
    ↓ writes
seed/_build/runs/<YYYY-MM>/<source>-<timestamp>.json
    ↓ each batch validated by validate_seed.py --batch <path>
    ↓
merge step (Phase 2.5 / Task #24)
    ↓ folds all batches into
seed/{nodes,edges,signals,contributors,aliases}.json
    ↓ canon validated by validate_seed.py --canon
    ↓
curation step (Phase 3)
    ↓ source-derived rules emit
seed/{nodes,edges}.json   (adds PRACTICES, EMBODIES, CLASSIFIED_BY)
    ↓ canon validated again
    ↓
embed pipeline
    ↓ embed_nodes.py + npm run embed:derive
seed/embeddings.{bin,json}   +   STYLE_KIN/VISUALLY_AFFINE
    ↓
image overlay pass
    ↓ find_missing_images.py + upload_to_r2.py --overlay
seed/image_overlay.json
    ↓
seed-consolidated.ts (npm run seed:consolidated)
    ↓ produces
seed.db   ← shipped in the Docker image
```

---

## 5. Common patterns

### 5.1 An artwork from MoMA

```python
from _slug import node_id, node_slug

artwork_id = node_id("artwork", row["Title"], source="moma", external_id=row["ObjectID"])
nodes.append(Node(
    id=artwork_id,
    type="artwork",
    name=row["Title"],
    slug=node_slug("artwork", row["Title"], source="moma", external_id=row["ObjectID"]),
    metadata={
        "moma_object_id": row["ObjectID"],
        "moma_classification": row["Classification"],
        "moma_medium": row["Medium"],
        "moma_acquisition_date": row["AcquisitionDate"],
        "image_url": row["ImageURL"] or None,
        "source_url": f"https://www.moma.org/collection/works/{row['ObjectID']}",
    },
))
aliases.append(Alias(source="moma", external_id=row["ObjectID"], node_id=artwork_id))
```

Note: no `description`, no `bio`. MoMA's CSV doesn't carry a curatorial
description — and even if it did, we'd copy it verbatim, not paraphrase.

### 5.2 An edge from a Wikidata statement

```python
practitioner_id = node_id("practitioner", label)
artwork_id     = node_id("artwork", artwork_label,
                          source="wikidata", external_id=artwork_qid)
edges.append(Edge(
    source_id=artwork_id,
    target_id=practitioner_id,
    edge_type="CREATED_BY",
    valid_from=now_iso(),
    confidence=1.0,
    event_time=inception_date,   # if Wikidata has P571 / P1191
))
```

### 5.3 An empty result is data

If `fetch_met_openaccess.py` returns zero artworks from its scoping
query, the gatherer still writes a batch (with empty `nodes` / `edges`)
and the validator passes. The signal records "the Met query returned
empty on this date". Future re-runs against an updated Met API surface
the change as a positive delta. Empty isn't failure.

---

## 6. CI hooks

`validate_seed.py --canon` runs:

  - Locally before commit (recommended; add to a pre-commit hook).
  - In GitHub Actions on every PR that touches `seed/*.json`.

Exit code 1 fails the build. Errors must be fixed; warnings can be
shipped if intentional (with a note in the PR description).

The producer contract is the editorial line of this project. Honor it.
