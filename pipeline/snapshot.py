"""pipeline/snapshot.py — Random-walk graph snapshot with lens diversity.

Plan reference: /Users/aiio/.claude/plans/jaunty-orbiting-pie.md § Phase 5

Produces a subgraph of ~60 nodes for the generative landing page. Every
request returns a different subgraph — "plurality as an architectural
property", not via curation.

The scoring algorithm (inside `pick_next`) biases expansion toward:
  +3  unseen classification_lens   (HIGHEST — plurality)
  +2  unseen era
  +2  unseen category/type
  +1  cross-lens edge reaching the candidate
  +1  embedding-derived edge (SEMANTIC_AFFINITY / INFLUENCES / EMERGED_FROM)
  -2  same lens as the last 3 picks

After building the subgraph, a diversity check runs:
  distinct_lenses     >= 3
  distinct_eras       >= 3
  distinct_categories >= 4
  distinct_edge_types >= 5

If the check fails, the algorithm restarts with a new seed (max 3 attempts,
then returns best-effort with a warning flag).

Usage
-----
    # One snapshot to stdout:
    python3 pipeline/snapshot.py --db /data/adai.db

    # Specific seed:
    python3 pipeline/snapshot.py --db /data/adai.db --seed artist-casey-reas

    # Bulk pre-compute (stores in snapshots table — requires migration 002):
    python3 pipeline/snapshot.py --db /data/adai.db --store --count 500
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sqlite3
import sys
import time
from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Optional


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

TARGET_SIZE = 60
MIN_EDGE_COUNT_SEED = 3
MAX_RESTART_ATTEMPTS = 3

DIVERSITY_MIN_LENSES = 3
DIVERSITY_MIN_ERAS = 3
DIVERSITY_MIN_CATEGORIES = 4
DIVERSITY_MIN_EDGE_TYPES = 5

EMBEDDING_DERIVED_EDGE_TYPES = {
    "SEMANTIC_AFFINITY",
    "INFLUENCES",
    "EMERGED_FROM",
}

ERA_BUCKETS = [
    (1950, 1970, "60s-pioneer"),
    (1970, 1990, "70s-80s"),
    (1990, 2005, "90s-net"),
    (2005, 2015, "00s-10s"),
    (2015, 2030, "recent"),
]

YEAR_RE = re.compile(r"\b(18|19|20)\d{2}\b")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def log(msg: str) -> None:
    print(f"[snapshot] {msg}", file=sys.stderr, flush=True)


def extract_year(meta: dict, node_type: str) -> Optional[int]:
    if node_type == "artwork":
        y = meta.get("year")
        if isinstance(y, (int, float)):
            return int(y)
        if isinstance(y, str):
            m = YEAR_RE.search(y)
            if m:
                return int(m.group(0))
        return None
    basic = meta.get("basic_info") or {}
    active = basic.get("active_years") or ""
    if isinstance(active, str):
        m = YEAR_RE.search(active)
        if m:
            return int(m.group(0))
    return None


def era_bucket(year: Optional[int]) -> str:
    if year is None:
        return "unknown-era"
    for lo, hi, label in ERA_BUCKETS:
        if lo <= year < hi:
            return label
    return "unknown-era"


# ---------------------------------------------------------------------------
# Graph loading
# ---------------------------------------------------------------------------


@dataclass
class Node:
    id: str
    type: str
    name: str
    slug: str
    year: Optional[int]
    era: str
    lenses: set[str]


def load_graph(conn: sqlite3.Connection) -> tuple[dict[str, Node], dict[str, list[tuple[str, str]]], dict[str, int]]:
    """Return (nodes, adj, edge_counts).

    adj[node_id] -> list of (neighbour_id, edge_type)
    edge_counts[node_id] -> total edge count
    """
    nodes: dict[str, Node] = {}
    cur = conn.execute("SELECT id, type, name, slug, metadata FROM nodes")
    for row in cur.fetchall():
        try:
            meta = json.loads(row["metadata"]) if row["metadata"] else {}
        except (json.JSONDecodeError, TypeError):
            meta = {}
        year = extract_year(meta, row["type"])
        nodes[row["id"]] = Node(
            id=row["id"],
            type=row["type"],
            name=row["name"],
            slug=row["slug"] or "",
            year=year,
            era=era_bucket(year),
            lenses=set(),
        )

    # Attach lens assignments via CLASSIFIED_BY edges
    cur = conn.execute("SELECT source_id, target_id FROM edges WHERE edge_type = 'CLASSIFIED_BY'")
    for source_id, target_id in cur.fetchall():
        if source_id in nodes and target_id in nodes:
            nodes[source_id].lenses.add(target_id)

    adj: dict[str, list[tuple[str, str]]] = defaultdict(list)
    edge_counts: dict[str, int] = Counter()
    cur = conn.execute("SELECT source_id, target_id, edge_type FROM edges")
    for source_id, target_id, edge_type in cur.fetchall():
        if source_id not in nodes or target_id not in nodes:
            continue
        # CLASSIFIED_BY edges don't count for traversal — they're metadata
        if edge_type == "CLASSIFIED_BY":
            continue
        adj[source_id].append((target_id, edge_type))
        adj[target_id].append((source_id, edge_type))
        edge_counts[source_id] += 1
        edge_counts[target_id] += 1

    return nodes, adj, edge_counts


# ---------------------------------------------------------------------------
# Snapshot walk
# ---------------------------------------------------------------------------


def pick_next(
    frontier: list[tuple[str, str]],  # (candidate_id, edge_type_reaching_it)
    visited: set[str],
    nodes: dict[str, Node],
    recent_lenses: list[frozenset[str]],
    seen_lenses: set[str],
    seen_eras: set[str],
    seen_categories: set[str],
    seen_edge_types: set[str],
    rng: random.Random,
) -> Optional[tuple[str, str]]:
    best: Optional[tuple[str, str]] = None
    best_score = float("-inf")
    # Shuffle to break score ties randomly
    shuffled = list(frontier)
    rng.shuffle(shuffled)
    for cand_id, edge_type in shuffled:
        if cand_id in visited:
            continue
        if cand_id not in nodes:
            continue
        n = nodes[cand_id]
        score = 0.0
        # +3 unseen lens (strongest plurality signal)
        if n.lenses and not (n.lenses & seen_lenses):
            score += 3.0
        # +2 unseen era
        if n.era not in seen_eras:
            score += 2.0
        # +2 unseen category (node type)
        if n.type not in seen_categories:
            score += 2.0
        # +1 cross-lens edge (source and candidate share no lens)
        if n.lenses and recent_lenses and not (n.lenses & recent_lenses[-1]):
            score += 1.0
        # +1 embedding-derived edge
        if edge_type in EMBEDDING_DERIVED_EDGE_TYPES:
            score += 1.0
        # -2 same lens as last 3 picks
        if recent_lenses and len(recent_lenses) >= 3:
            last_three = recent_lenses[-3:]
            if all(n.lenses & lset for lset in last_three if lset):
                score -= 2.0
        # +1 if the edge_type is new to this walk
        if edge_type not in seen_edge_types:
            score += 1.0
        if score > best_score:
            best_score = score
            best = (cand_id, edge_type)
    return best


def walk_from_seed(
    seed_id: str,
    nodes: dict[str, Node],
    adj: dict[str, list[tuple[str, str]]],
    rng: random.Random,
) -> tuple[set[str], list[tuple[str, str, str]]]:
    """Run the scored random walk from seed. Returns (visited_node_ids, collected_edges)."""
    visited: set[str] = {seed_id}
    edges_collected: list[tuple[str, str, str]] = []  # (source, target, edge_type)
    recent_lenses: list[frozenset[str]] = [frozenset(nodes[seed_id].lenses)]
    seen_lenses: set[str] = set(nodes[seed_id].lenses)
    seen_eras: set[str] = {nodes[seed_id].era}
    seen_categories: set[str] = {nodes[seed_id].type}
    seen_edge_types: set[str] = set()

    # Frontier: list of (candidate_id, edge_type)
    # Start with seed's neighbours
    frontier: list[tuple[str, str]] = list(adj.get(seed_id, []))

    while len(visited) < TARGET_SIZE and frontier:
        pick = pick_next(
            frontier, visited, nodes, recent_lenses,
            seen_lenses, seen_eras, seen_categories, seen_edge_types, rng,
        )
        if not pick:
            break
        cand_id, via_edge_type = pick
        visited.add(cand_id)
        n = nodes[cand_id]
        recent_lenses.append(frozenset(n.lenses))
        seen_lenses |= n.lenses
        seen_eras.add(n.era)
        seen_categories.add(n.type)
        seen_edge_types.add(via_edge_type)
        # Extend frontier with the new node's neighbours (dedup happens via visited check)
        for neigh_id, et in adj.get(cand_id, []):
            if neigh_id not in visited:
                frontier.append((neigh_id, et))

    # Collect all edges that lie entirely within the visited set
    for src in visited:
        for tgt, et in adj.get(src, []):
            if tgt in visited and src < tgt:  # dedup undirected pairs
                edges_collected.append((src, tgt, et))

    return visited, edges_collected


def build_snapshot(
    conn: sqlite3.Connection,
    seed_id: Optional[str] = None,
    rng: Optional[random.Random] = None,
) -> dict:
    rng = rng or random.Random()
    nodes, adj, edge_counts = load_graph(conn)

    eligible_seeds = [nid for nid, count in edge_counts.items() if count >= MIN_EDGE_COUNT_SEED]
    if not eligible_seeds:
        log("No seeds with >=3 edges — falling back to all nodes.")
        eligible_seeds = list(nodes.keys())
    if not eligible_seeds:
        return {"nodes": [], "edges": [], "seed": None, "diversity": {}, "warning": "no nodes"}

    best_attempt: Optional[dict] = None
    for attempt in range(MAX_RESTART_ATTEMPTS):
        if seed_id and seed_id in nodes and attempt == 0:
            chosen_seed = seed_id
        else:
            chosen_seed = rng.choice(eligible_seeds)
        visited, edges = walk_from_seed(chosen_seed, nodes, adj, rng)

        # Diversity check
        distinct_lenses = len({lid for nid in visited for lid in nodes[nid].lenses})
        distinct_eras = len({nodes[nid].era for nid in visited})
        distinct_categories = len({nodes[nid].type for nid in visited})
        distinct_edge_types = len({et for _, _, et in edges})

        diversity = {
            "lenses": distinct_lenses,
            "eras": distinct_eras,
            "categories": distinct_categories,
            "edge_types": distinct_edge_types,
        }

        passed = (
            distinct_lenses >= DIVERSITY_MIN_LENSES
            and distinct_eras >= DIVERSITY_MIN_ERAS
            and distinct_categories >= DIVERSITY_MIN_CATEGORIES
            and distinct_edge_types >= DIVERSITY_MIN_EDGE_TYPES
        )

        snap = {
            "nodes": [
                {
                    "id": nodes[nid].id,
                    "name": nodes[nid].name,
                    "type": nodes[nid].type,
                    "slug": nodes[nid].slug,
                    "era": nodes[nid].era,
                }
                for nid in visited
            ],
            "edges": [
                {"source": src, "target": tgt, "type": et}
                for src, tgt, et in edges
            ],
            "seed": {"id": chosen_seed, "name": nodes[chosen_seed].name},
            "diversity": diversity,
            "passed_diversity": passed,
            "attempt": attempt + 1,
        }

        if passed:
            return snap
        # Keep the best-effort attempt in case we exhaust retries
        if best_attempt is None:
            best_attempt = snap
        else:
            cur = sum(best_attempt["diversity"].values())
            new = sum(diversity.values())
            if new > cur:
                best_attempt = snap

    # Fell through — return best-effort with a warning
    if best_attempt is None:
        return {"nodes": [], "edges": [], "seed": None, "diversity": {}, "warning": "could not build"}
    best_attempt["warning"] = "diversity thresholds not met after retries"
    return best_attempt


# ---------------------------------------------------------------------------
# Optional: bulk pre-compute into a snapshots table
# ---------------------------------------------------------------------------


def ensure_snapshots_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS snapshots (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          seed_id     TEXT,
          payload     TEXT NOT NULL,
          node_count  INTEGER,
          lenses      INTEGER,
          eras        INTEGER,
          categories  INTEGER,
          edge_types  INTEGER,
          passed      INTEGER DEFAULT 0,
          created_at  TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
        )
        """
    )
    conn.commit()


def store_snapshot(conn: sqlite3.Connection, snap: dict) -> int:
    seed_id = (snap.get("seed") or {}).get("id")
    diversity = snap.get("diversity", {})
    cur = conn.execute(
        """
        INSERT INTO snapshots (seed_id, payload, node_count, lenses, eras, categories, edge_types, passed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            seed_id,
            json.dumps(snap),
            len(snap.get("nodes") or []),
            diversity.get("lenses", 0),
            diversity.get("eras", 0),
            diversity.get("categories", 0),
            diversity.get("edge_types", 0),
            1 if snap.get("passed_diversity") else 0,
        ),
    )
    conn.commit()
    return cur.lastrowid


def rotate_snapshots(conn: sqlite3.Connection, count: int = 500) -> None:
    """Regenerate the snapshots table with `count` fresh snapshots."""
    ensure_snapshots_table(conn)
    conn.execute("DELETE FROM snapshots")
    conn.commit()

    rng = random.Random()
    ok = 0
    warned = 0
    start = time.time()
    for i in range(count):
        snap = build_snapshot(conn, rng=rng)
        store_snapshot(conn, snap)
        if snap.get("passed_diversity"):
            ok += 1
        else:
            warned += 1
        if (i + 1) % 50 == 0:
            log(f"  generated {i + 1}/{count} (passed={ok}, best-effort={warned})")
    log(f"Done. {ok}/{count} snapshots passed diversity; {warned} best-effort. ({time.time() - start:.1f}s)")


# ---------------------------------------------------------------------------
# Entry
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a lens-diverse graph snapshot")
    parser.add_argument("--db", required=True, help="Path to adai.db")
    parser.add_argument("--seed", help="Specific seed node id (optional)")
    parser.add_argument("--store", action="store_true", help="Bulk pre-compute into snapshots table")
    parser.add_argument("--count", type=int, default=500, help="Count for --store (default 500)")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON")
    args = parser.parse_args()

    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row

    if args.store:
        rotate_snapshots(conn, count=args.count)
        return

    snap = build_snapshot(conn, seed_id=args.seed)
    if args.pretty:
        print(json.dumps(snap, indent=2))
    else:
        print(json.dumps(snap))


if __name__ == "__main__":
    main()
