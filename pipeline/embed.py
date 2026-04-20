"""pipeline/embed.py — Gemini embedding pass + cross-era/cross-lens edge derivation.

Plan reference: /Users/aiio/.claude/plans/jaunty-orbiting-pie.md § Phase 4

Two passes in one script:

1. EMBED: For every node with NULL embedding, build a text representation
   from its metadata, call Gemini Embedding 001 (task_type=SEMANTIC_SIMILARITY,
   output_dimensionality=768), and store the vector as a BLOB.

2. DERIVE: For every (practitioner|artwork) pair, compute cosine similarity
   using the stored embeddings and emit edges per these rules:

     sim >= 0.80 AND |year_diff| < 15  AND same_lens   -> SEMANTIC_AFFINITY  (high)
     sim >= 0.75 AND  year_diff  >= 25 AND same_lens   -> INFLUENCES         (medium, older -> newer)
     sim >= 0.72 AND                       different_lens -> INFLUENCES      (medium)
     sim >= 0.70 AND practice_concept_overlap         -> EMERGED_FROM        (medium, newer -> older)

   All derived edges tagged `created_by='embedding-pass-v1'` so they can be
   regenerated cleanly on a model swap.

Usage:
    export GEMINI_API_KEY=...
    python3 pipeline/embed.py --db /data/adai.db [--dry-run] [--only-embed] [--only-derive]

Requires: google-generativeai, numpy
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import struct
import sys
import time
from dataclasses import dataclass
from typing import Iterable


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

EMBED_MODEL = "gemini-embedding-001"
EMBED_DIMS = 768
EMBED_TASK = "SEMANTIC_SIMILARITY"
EMBED_BATCH = 100

EDGE_CREATED_BY_PASS = "embedding-pass-v1"
EDGE_SIGNAL_ID = "embedding-2026-04-17"

# Similarity thresholds
SIM_SEMANTIC_AFFINITY = 0.80
SIM_INFLUENCES_SAME_LENS = 0.75
SIM_INFLUENCES_CROSS_LENS = 0.72
SIM_EMERGED_FROM_CONCEPT = 0.70

YEAR_DIFF_CONTEMPORARY = 15
YEAR_DIFF_CROSS_ERA = 25

NEIGHBOUR_K = 10  # top-K nearest neighbours per node


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def log(msg: str) -> None:
    print(f"[embed] {msg}", flush=True)


def encode_embedding(vec: list[float]) -> bytes:
    """Serialize a f32 vector as little-endian bytes for BLOB storage."""
    return struct.pack(f"<{len(vec)}f", *vec)


def decode_embedding(blob: bytes) -> list[float]:
    if not blob:
        return []
    count = len(blob) // 4
    return list(struct.unpack(f"<{count}f", blob))


def cosine(a: list[float], b: list[float]) -> float:
    """Plain cosine similarity — no numpy dependency. Vectors are small (768)."""
    dot = 0.0
    na = 0.0
    nb = 0.0
    for x, y in zip(a, b):
        dot += x * y
        na += x * x
        nb += y * y
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / ((na ** 0.5) * (nb ** 0.5))


YEAR_RE = re.compile(r"\b(18|19|20)\d{2}\b")


def extract_year(metadata: dict, node_type: str) -> int | None:
    """Pull the most representative year from node metadata.

    Practitioners: first year of active_years ("2004-present" -> 2004).
    Artworks: `year` field (may be "2021" or "2019-present").
    """
    if node_type == "artwork":
        y = metadata.get("year")
        if isinstance(y, (int, float)):
            return int(y)
        if isinstance(y, str):
            m = YEAR_RE.search(y)
            if m:
                return int(m.group(0))
        return None

    basic = metadata.get("basic_info") or {}
    active = basic.get("active_years") or ""
    if isinstance(active, str):
        m = YEAR_RE.search(active)
        if m:
            return int(m.group(0))
    return None


# ---------------------------------------------------------------------------
# Embedding text templates
# ---------------------------------------------------------------------------


def embed_text_for(node: dict) -> str:
    """Build the text to embed for a node. Returns '' if nothing useful."""
    node_type = node["type"]
    name = node["name"]
    try:
        meta = json.loads(node["metadata"]) if node["metadata"] else {}
    except (json.JSONDecodeError, TypeError):
        meta = {}

    if node_type == "artwork":
        # Artwork metadata is the work dict: {title, year, description, relevance}
        # (Type-A from key_works) OR the fuller Type-B schema.
        title = meta.get("title") or name
        year = meta.get("year") or ""
        desc = meta.get("description") or ""
        medium = meta.get("medium") or ""
        # Type-B artwork schema extras:
        context = meta.get("context") or ""
        if isinstance(context, dict):
            context = " ".join(str(v) for v in context.values())
        return f"{title} ({year}). {desc} {context} Medium: {medium}".strip()

    if node_type in ("artist", "collective", "practitioner"):
        basic = meta.get("basic_info") or {}
        practice = meta.get("practice_description") or {}
        network = meta.get("network_position") or {}
        summary = practice.get("practice_summary") or ""
        methodology = practice.get("methodology") or ""
        scenes = network.get("scene_affiliation") or ""
        active = basic.get("active_years") or ""
        location = basic.get("location") or ""
        return (
            f"{name}. {summary} {methodology} "
            f"Scenes: {scenes}. Active: {active}. Location: {location}."
        ).strip()

    if node_type == "concept":
        return f"Concept: {name}."

    if node_type == "scene":
        return f"Scene: {name}."

    if node_type == "classification_lens":
        desc = meta.get("description") or ""
        logic = meta.get("classification_logic") or ""
        exemplars = meta.get("exemplars") or []
        if isinstance(exemplars, list):
            ex = ", ".join(str(e) for e in exemplars[:10])
        else:
            ex = str(exemplars)
        return f"Classification lens: {name}. {desc} Logic: {logic} Exemplars: {ex}".strip()

    # Generic fallback: just the name.
    return name


# ---------------------------------------------------------------------------
# DB I/O
# ---------------------------------------------------------------------------


def open_db(path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def nodes_needing_embedding(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    cur = conn.execute(
        """
        SELECT id, type, name, slug, metadata
        FROM nodes
        WHERE embedding IS NULL OR embedding_model != ?
        """,
        (EMBED_MODEL,),
    )
    return cur.fetchall()


def all_embedded_nodes(conn: sqlite3.Connection, types: Iterable[str]) -> list[dict]:
    placeholders = ",".join("?" * len(list(types)))
    types = list(types)  # ensure list after placeholder count
    placeholders = ",".join("?" * len(types))
    cur = conn.execute(
        f"""
        SELECT id, type, name, slug, metadata, embedding
        FROM nodes
        WHERE embedding IS NOT NULL
          AND type IN ({placeholders})
        """,
        tuple(types),
    )
    rows = []
    for row in cur.fetchall():
        try:
            meta = json.loads(row["metadata"]) if row["metadata"] else {}
        except (json.JSONDecodeError, TypeError):
            meta = {}
        vec = decode_embedding(row["embedding"])
        year = extract_year(meta, row["type"])
        rows.append(
            {
                "id": row["id"],
                "type": row["type"],
                "name": row["name"],
                "meta": meta,
                "embedding": vec,
                "year": year,
            }
        )
    return rows


def lens_assignments(conn: sqlite3.Connection) -> dict[str, set[str]]:
    """Return {node_id: set(lens_id)} via existing CLASSIFIED_BY edges."""
    mapping: dict[str, set[str]] = {}
    cur = conn.execute(
        "SELECT source_id, target_id FROM edges WHERE edge_type = 'CLASSIFIED_BY'"
    )
    for source_id, target_id in cur.fetchall():
        mapping.setdefault(source_id, set()).add(target_id)
    return mapping


def concept_memberships(conn: sqlite3.Connection) -> dict[str, set[str]]:
    """{practitioner_id: set(concept_id)} via PRACTICES edges."""
    mapping: dict[str, set[str]] = {}
    cur = conn.execute(
        "SELECT source_id, target_id FROM edges WHERE edge_type = 'PRACTICES'"
    )
    for source_id, target_id in cur.fetchall():
        mapping.setdefault(source_id, set()).add(target_id)
    return mapping


# ---------------------------------------------------------------------------
# Gemini
# ---------------------------------------------------------------------------


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Call the Gemini SDK once per text (the SDK's batch API varies by version).

    We hit embed_content per item with exponential backoff. For ~1,500 nodes
    this takes a couple of minutes; acceptable at first-pass scale.
    """
    import google.generativeai as genai  # imported here so --help works without the dep

    results: list[list[float]] = []
    for text in texts:
        last_err: Exception | None = None
        for attempt in range(5):
            try:
                resp = genai.embed_content(
                    model=EMBED_MODEL,
                    content=text or " ",
                    task_type=EMBED_TASK,
                    output_dimensionality=EMBED_DIMS,
                )
                vec = resp["embedding"] if isinstance(resp, dict) else resp.embedding
                results.append(list(vec))
                break
            except Exception as err:  # noqa: BLE001 — retry on any API error
                last_err = err
                backoff = 2 ** attempt
                log(f"embed_content failed (attempt {attempt+1}/5): {err}. Sleeping {backoff}s…")
                time.sleep(backoff)
        else:
            raise RuntimeError(f"Exhausted retries embedding text: {last_err}") from last_err
    return results


def configure_gemini() -> None:
    import google.generativeai as genai

    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        log("ERROR: GEMINI_API_KEY is not set. Aborting embed pass.")
        sys.exit(2)
    genai.configure(api_key=key)


# ---------------------------------------------------------------------------
# Pass 1 — embed
# ---------------------------------------------------------------------------


def run_embed_pass(conn: sqlite3.Connection, dry_run: bool = False) -> int:
    rows = nodes_needing_embedding(conn)
    log(f"Nodes needing embedding: {len(rows)}")
    if not rows:
        return 0

    # Build text per node
    items: list[tuple[str, str]] = []  # (node_id, text)
    for row in rows:
        node = {
            "id": row["id"],
            "type": row["type"],
            "name": row["name"],
            "slug": row["slug"],
            "metadata": row["metadata"],
        }
        text = embed_text_for(node)
        if not text or len(text.strip()) < 3:
            text = node["name"] or node["id"]
        items.append((row["id"], text))

    if dry_run:
        log("[dry-run] Skipping Gemini calls. Showing first 3 texts:")
        for nid, text in items[:3]:
            log(f"  {nid} -> {text[:120]}...")
        return 0

    configure_gemini()

    # Embed in batches (the SDK call itself is sequential but we batch for logging)
    embedded = 0
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    for i in range(0, len(items), EMBED_BATCH):
        batch = items[i : i + EMBED_BATCH]
        texts = [t for _, t in batch]
        log(f"Embedding batch {i // EMBED_BATCH + 1}/{(len(items) + EMBED_BATCH - 1) // EMBED_BATCH} ({len(batch)} items)")
        vectors = embed_batch(texts)
        for (nid, _), vec in zip(batch, vectors):
            blob = encode_embedding(vec)
            conn.execute(
                "UPDATE nodes SET embedding = ?, embedding_model = ?, embedding_updated_at = ? WHERE id = ?",
                (blob, EMBED_MODEL, now, nid),
            )
        conn.commit()
        embedded += len(batch)

    log(f"Embedded {embedded} nodes.")
    return embedded


# ---------------------------------------------------------------------------
# Pass 2 — derive edges
# ---------------------------------------------------------------------------


@dataclass
class EdgeSpec:
    source: str
    target: str
    edge_type: str
    confidence: str


def run_derive_pass(conn: sqlite3.Connection, dry_run: bool = False) -> int:
    # Remove previously-derived edges from this pass so we regenerate cleanly
    if not dry_run:
        cur = conn.execute(
            "DELETE FROM edges WHERE created_by = ?",
            (EDGE_CREATED_BY_PASS,),
        )
        log(f"Cleared {cur.rowcount} prior '{EDGE_CREATED_BY_PASS}' edges.")

    rows = all_embedded_nodes(conn, types=["artist", "collective", "practitioner", "artwork"])
    log(f"Nodes eligible for edge derivation: {len(rows)}")
    if len(rows) < 2:
        return 0

    lens_map = lens_assignments(conn)
    concept_map = concept_memberships(conn)

    edges: list[EdgeSpec] = []
    for i, a in enumerate(rows):
        # Score every pair (i, j) with j > i to avoid double-counting
        scored: list[tuple[float, dict]] = []
        for j, b in enumerate(rows):
            if j == i:
                continue
            sim = cosine(a["embedding"], b["embedding"])
            scored.append((sim, b))
        scored.sort(key=lambda x: -x[0])
        # Keep top-K neighbours
        for sim, b in scored[:NEIGHBOUR_K]:
            # De-dup: only emit when a["id"] < b["id"] lex-wise
            if a["id"] >= b["id"]:
                continue
            year_diff = None
            if a["year"] is not None and b["year"] is not None:
                year_diff = abs(a["year"] - b["year"])
            a_lenses = lens_map.get(a["id"], set())
            b_lenses = lens_map.get(b["id"], set())
            same_lens = bool(a_lenses & b_lenses)
            a_concepts = concept_map.get(a["id"], set())
            b_concepts = concept_map.get(b["id"], set())
            shared_concept = bool(a_concepts & b_concepts)

            if sim >= SIM_SEMANTIC_AFFINITY and year_diff is not None and year_diff < YEAR_DIFF_CONTEMPORARY and same_lens:
                edges.append(EdgeSpec(a["id"], b["id"], "SEMANTIC_AFFINITY", "high"))
            elif sim >= SIM_INFLUENCES_SAME_LENS and year_diff is not None and year_diff >= YEAR_DIFF_CROSS_ERA and same_lens:
                older, newer = (a, b) if (a["year"] or 0) <= (b["year"] or 0) else (b, a)
                edges.append(EdgeSpec(older["id"], newer["id"], "INFLUENCES", "medium"))
            elif sim >= SIM_INFLUENCES_CROSS_LENS and not same_lens and a_lenses and b_lenses:
                # Cross-lens — direction is older→newer when we have years, else lex order.
                if a["year"] is not None and b["year"] is not None:
                    older, newer = (a, b) if a["year"] <= b["year"] else (b, a)
                else:
                    older, newer = (a, b)
                edges.append(EdgeSpec(older["id"], newer["id"], "INFLUENCES", "medium"))
            elif sim >= SIM_EMERGED_FROM_CONCEPT and shared_concept:
                if a["year"] is not None and b["year"] is not None:
                    newer, older = (a, b) if a["year"] >= b["year"] else (b, a)
                else:
                    newer, older = (a, b)
                edges.append(EdgeSpec(newer["id"], older["id"], "EMERGED_FROM", "medium"))

    log(f"Derived {len(edges)} edges.")
    # Breakdown
    from collections import Counter
    breakdown = Counter(e.edge_type for e in edges)
    for et, c in breakdown.most_common():
        log(f"  {et}: {c}")

    if dry_run:
        log("[dry-run] Not writing edges.")
        return len(edges)

    for e in edges:
        edge_id = f"{e.source}--{e.edge_type}--{e.target}--{EDGE_CREATED_BY_PASS}"
        conn.execute(
            """
            INSERT OR IGNORE INTO edges
              (id, source_id, target_id, edge_type, signal_id, confidence, charge, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (edge_id, e.source, e.target, e.edge_type, EDGE_SIGNAL_ID, e.confidence, None, EDGE_CREATED_BY_PASS),
        )
    conn.commit()
    log(f"Wrote {len(edges)} edges.")
    return len(edges)


# ---------------------------------------------------------------------------
# Entry
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(description="Gemini embedding + edge derivation pass")
    parser.add_argument("--db", required=True, help="Path to adai.db")
    parser.add_argument("--dry-run", action="store_true", help="Don't call Gemini or write edges")
    parser.add_argument("--only-embed", action="store_true", help="Skip the derive pass")
    parser.add_argument("--only-derive", action="store_true", help="Skip the embed pass")
    args = parser.parse_args()

    conn = open_db(args.db)

    if not args.only_derive:
        run_embed_pass(conn, dry_run=args.dry_run)

    if not args.only_embed:
        run_derive_pass(conn, dry_run=args.dry_run)

    conn.close()
    log("Done.")


if __name__ == "__main__":
    main()
