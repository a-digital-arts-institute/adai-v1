#!/usr/bin/env python3
"""fetch_artblocks.py — Gather generative artworks + creators from Art Blocks.

Source: ``https://data.artblocks.io/v1/graphql`` (public Hasura, no auth).

Scope: the three CORE Art Blocks contracts (V0/V1/V3). Engine / PBAB
deployments are excluded — they're individually curated and outside the
Art Blocks editorial line that the platform represents.

What it emits, source-attested only:
  - ``artwork`` nodes — one per project. Title = ``projects_metadata.name``.
  - ``practitioner`` nodes — one per distinct ``artist_name``.
  - ``platform:art-blocks`` — the platform node.
  - ``CREATED_BY`` edges — artwork → practitioner.
  - ``EXHIBITED_AT`` edges — artwork → platform:art-blocks (genesis platform).
  - Aliases:
      ``(artblocks, contract:project_id)`` → artwork
      ``(artblocks_artist, normalized_name)`` → practitioner (weak; no stable id)

Thumbnail URL: ``https://media.artblocks.io/thumb/{token_id}.png`` where
``token_id = project_id * 1_000_000`` (first mint of the project).

Run:
    python3 seed/_build/fetch_artblocks.py [--limit N]
"""
from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent))
from _http import HttpError, post_json  # noqa: E402
from _node_schema import Alias, Edge, Node, validate_batch  # noqa: E402
from _provenance import GathererSignal, now_iso, write_batch  # noqa: E402
from _slug import node_id, node_slug, slugify  # noqa: E402

PRODUCER = "artblocks"
HASURA = "https://data.artblocks.io/v1/graphql"

CORE_CONTRACTS = [
    "0x059edd72cd353df5106d2b9cc5ab83a52287ac3a",  # V0
    "0xa7d8d9ef8d8ce8992df33d8b8cf4aebabd5bd270",  # V1
    "0x99a9b7c1116f9ceeb1652de04d5969cce509b069",  # V3
]

PLATFORM_ID = "platform:art-blocks"
PLATFORM_NAME = "Art Blocks"

ALL_PROJECTS_QUERY = """query AllProjects($contracts: [String!]!) {
  projects_metadata(
    where: { contract_address: {_in: $contracts} }
    order_by: { project_id: asc }
  ) {
    id
    name
    artist_name
    description
    project_id
    contract_address
    invocations
    website
  }
}"""


def gather(*, limit: int | None) -> tuple[list[Node], list[Edge], list[Alias], dict[str, int]]:
    body = post_json(
        HASURA,
        {"query": ALL_PROJECTS_QUERY, "variables": {"contracts": CORE_CONTRACTS}},
        timeout=60,
    )
    if body.get("errors"):
        raise RuntimeError(f"Hasura: {body['errors']}")
    projects = body.get("data", {}).get("projects_metadata", []) or []
    stats = Counter({"projects_returned": len(projects)})

    nodes: list[Node] = []
    edges: list[Edge] = []
    aliases: list[Alias] = []

    # Platform node (one)
    nodes.append(Node(
        id=PLATFORM_ID,
        type="platform",
        name=PLATFORM_NAME,
        slug=node_slug("platform", PLATFORM_NAME),
        metadata={
            "kind": "on-chain generative art platform",
            "blockchain": "ethereum",
            "source_url": "https://www.artblocks.io/",
            "wikidata_qid": "Q105966095",
        },
    ))
    aliases.append(Alias(source="wikidata", external_id="Q105966095", node_id=PLATFORM_ID))

    # Practitioners: deduped by normalised artist_name.
    artist_pid_by_norm: dict[str, str] = {}

    for proj in projects:
        if limit and stats["artworks_emitted"] >= limit:
            break
        name = (proj.get("name") or "").strip()
        artist = (proj.get("artist_name") or "").strip()
        if not name or not artist:
            stats["skipped_missing_name_or_artist"] += 1
            continue
        if not slugify(name) or not slugify(artist):
            stats["skipped_unslugifiable"] += 1
            continue

        # Practitioner — dedupe across multiple projects by same artist
        norm = slugify(artist)
        pid = artist_pid_by_norm.get(norm)
        if not pid:
            pid = node_id("practitioner", artist)
            artist_pid_by_norm[norm] = pid
            nodes.append(Node(
                id=pid,
                type="practitioner",
                name=artist,
                slug=node_slug("practitioner", artist),
                metadata={
                    "source_url": "https://www.artblocks.io/curated",
                    "artblocks_artist_name": artist,
                },
            ))
            aliases.append(Alias(source="artblocks_artist", external_id=norm, node_id=pid))

        # Artwork
        contract = proj.get("contract_address", "")
        pid_num = proj.get("project_id")
        external_id = f"{contract}:{pid_num}"
        artwork_id = node_id("artwork", name, source="artblocks", external_id=external_id)
        token_id = str(int(pid_num) * 1_000_000) if pid_num is not None else ""
        thumb = f"https://media.artblocks.io/thumb/{token_id}.png" if token_id else None

        metadata: dict[str, Any] = {
            "artblocks_contract": contract,
            "artblocks_project_id": str(pid_num),
            "artblocks_token_id": token_id,
            "source_url": f"https://www.artblocks.io/project/{pid_num}",
        }
        if thumb:
            metadata["image_url"] = thumb
        inv = proj.get("invocations")
        if inv is not None:
            metadata["invocations"] = inv
        website = proj.get("website")
        if website:
            metadata["artist_website"] = website

        nodes.append(Node(
            id=artwork_id,
            type="artwork",
            name=name,
            slug=node_slug("artwork", name, source="artblocks", external_id=external_id),
            metadata=metadata,
        ))
        aliases.append(Alias(source="artblocks", external_id=external_id, node_id=artwork_id))

        edges.append(Edge(
            source_id=artwork_id,
            target_id=pid,
            edge_type="CREATED_BY",
            valid_from=now_iso(),
            confidence=1.0,
        ))
        edges.append(Edge(
            source_id=artwork_id,
            target_id=PLATFORM_ID,
            edge_type="EXHIBITED_AT",
            valid_from=now_iso(),
            confidence=1.0,
        ))
        stats["artworks_emitted"] += 1

    return nodes, edges, aliases, dict(stats)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    args = ap.parse_args()

    sig = GathererSignal(
        producer=PRODUCER,
        source=HASURA,
        config={"contracts": CORE_CONTRACTS, "limit": args.limit},
    )

    try:
        nodes, edges, aliases, stats = gather(limit=args.limit)
    except (HttpError, RuntimeError) as e:
        print(f"FAIL: {e}", file=sys.stderr)
        return 1

    node_rows = [sig.stamp(n.as_row()) for n in nodes]
    edge_rows = [sig.stamp(e.as_row()) for e in edges]
    alias_rows = [a.as_row() for a in aliases]

    errors = validate_batch(nodes=node_rows, edges=edge_rows)
    if errors:
        print(f"VALIDATION FAILED ({len(errors)} errors):", file=sys.stderr)
        for err in errors[:10]:
            print(f"  {err}", file=sys.stderr)
        return 1

    path = write_batch(sig, nodes=node_rows, edges=edge_rows, aliases=alias_rows)
    print(f"wrote → {path}")
    print(f"  practitioners: {sum(1 for n in nodes if n.type == 'practitioner')}")
    print(f"  artworks:      {sum(1 for n in nodes if n.type == 'artwork')}")
    print(f"  edges:         {len(edges)}")
    print(f"  aliases:       {len(aliases)}")
    for k, v in stats.items():
        print(f"  stat[{k}]: {v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
