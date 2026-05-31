#!/usr/bin/env python3
"""derive_curation.py — Phase 3 source-derived curation.

Reads:  seed/nodes.json + seed/edges.json (the post-merge canon).
Writes: seed/_build/runs/<YYYY-MM>/curation-<ts>.json  (another batch)
        Then the caller re-runs merge_batches.py to fold it into canon.

What it emits, RULE-derived (not curated by hand):

  Concept nodes  — the vocabulary the rest of the graph anchors to. Small,
  defensible set of digital-art concepts, each with a 1-line definition
  (verbatim from Wikidata's schema:description, source-attested).

  Classification regimes:
    classification_regime:a(dai) seed canon v1 (april 2026)  — the canonical lens
    plus the 5 sub-regimes used by the prior canon (kept identical IDs for
    cross-source classification — Phase 3 doesn't relitigate the regime split).

  CLASSIFIED_BY edges:
    - Every artwork that came from MoMA digital filter / Art Blocks core
      contracts / fxhash → CLASSIFIED_BY a(dai) seed canon.
    - Every practitioner with a Wikidata movement/occupation in the digital-
      art QID set → CLASSIFIED_BY a(dai) seed canon.

  PRACTICES edges (practitioner → concept):
    Rule-derived from practitioner.metadata.movement_qids and
    .occupation_qids. Mapping table is the canonical QID → concept slug.
    No fuzzy NLP, no LLM inference.

  EMBODIES edges (artwork → concept):
    Rule-derived from artwork.metadata.moma_classification (MoMA artworks),
    artwork.metadata.genre_qids (Wikidata artworks), platform implication
    (every Art Blocks / fxhash artwork EMBODIES generative-art — the platform
    *is* the genre), and artist-applied fxhash tags that pass the frequency
    gate (Tier 1, attested — the artist wrote the tag). Tags become concept
    nodes (see TAG_MIN_ARTWORKS); the embedding pipeline later proposes
    additional low-confidence EMBODIES for visually-similar untagged works.

No description / bio / summary fields are written. The validator's
anti-enrichment rule guards this.

Run:
    python3 seed/_build/derive_curation.py
    # then re-merge:
    python3 seed/_build/merge_batches.py
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).parent))
from _node_schema import Alias, Edge, Node, validate_batch  # noqa: E402
from _provenance import GathererSignal, now_iso, write_batch  # noqa: E402
from _slug import node_id, node_slug  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
SEED = REPO / "seed"

PRODUCER = "curation"

# Concept vocabulary — minimal, source-grounded. Each concept has:
#   name           : human display name
#   wikidata_qid   : Q-number for cross-source anchoring (where applicable)
#   description    : ONE-LINE description, verbatim from Wikidata's schema:description
#                    or paraphrased only when Wikidata is missing — source_url required.
# ⚠️ 2026-05 QID correction. The prior vocabulary's QIDs were CORRUPT — every
# one resolved to an insect, a 404, or an unrelated item (Q649652 "Digital Art"
# was a *bee species*; Q4671798 "Generative Art" a moth; Q650711 "Net.art"
# = "combat"; Q1925963 "Sound Art" = "graphic artist", which alone dragged 3,652
# non-digital painters/sculptors — Duchamp, Miró — into the canon via the twin
# garbage list in fetch_wikidata.py). The names/descriptions were fine; only the
# Wikidata anchors were wrong, so every concept's source_url pointed at a bee.
# Replaced with the verified correct QIDs (descriptions verbatim from each item's
# Wikidata schema:description) and trimmed to the digital-native vocabulary —
# the MoMA-classification axis (Video/Sound/Installation/Performance/Film) is
# dropped: the canon is now Art Blocks + fxhash generative work, no MoMA, so
# those concepts had no artworks and the wrong lens. Re-add with correct QIDs if
# a source that needs them is ingested.
CONCEPT_VOCAB: list[dict[str, Any]] = [
    {"name": "Digital Art",     "qid": "Q860372",  "desc": "collective term for art that is generated digitally with the computer"},
    {"name": "Computer Art",    "qid": "Q1376265", "desc": "art genre in which computers are used as a main tool in the creative process"},
    {"name": "Generative Art",  "qid": "Q1502032", "desc": "form of art that is created through the use of autonomous systems, often involving algorithms, random processes, or computational techniques to generate artworks"},
    {"name": "Algorithmic Art", "qid": "Q2835759", "desc": "art genre"},
    {"name": "Software Art",    "qid": "Q2864686", "desc": "art genre"},
    {"name": "Interactive Art", "qid": "Q2394336", "desc": "art that involves the spectator"},
    {"name": "New Media Art",   "qid": "Q378604",  "desc": "artworks designed and produced by means of electronic media technologies"},
    {"name": "Internet Art",    "qid": "Q1569950", "desc": "art that uses the Internet as a medium or subject"},
]

# --- Tag-derived concepts (Tier 1, attested) --------------------------------
# fxhash artworks carry artist-applied ``tags`` (source-attested). Any tag
# carried by >= TAG_MIN_ARTWORKS distinct artworks becomes a concept node, and
# every artwork carrying it gets an attested EMBODIES edge (confidence 1.0).
# This is what turns the flat single-target EMBODIES (every artwork → just
# generative-art) into a real vocabulary — without inventing anything: the
# artist wrote the tag.
#
# Pure frequency gate (the chosen policy): no allowlist, no semantic filter. A
# tag that normalises to an existing CONCEPT_VOCAB slug (e.g. "generative art")
# folds into that base concept rather than minting a duplicate. TAG_STOPLIST is
# the escape hatch for obvious non-concepts (left empty by default — fill it if
# platform/blockchain tags like "tezos"/"nft" become a nuisance).
TAG_MIN_ARTWORKS = 25
# Pure frequency admits a lot of non-concepts: platform / chain / marketplace /
# tool / format tags, promo hashtags, and artists' own handles. These are
# attested (artists wrote them) but they're not art concepts — stoplist them so
# they never become concept nodes. (Genuinely aesthetic tags — abstract,
# geometric, pixel, glitch, voronoi, landscape, … — pass through.) Tunable.
TAG_STOPLIST: set[str] = {
    # platform / chain / marketplace
    "fxhash", "tezos", "tezosart", "tezosnft", "tezosnfts", "tezosnftart",
    "nft", "nfts", "nftart", "nftcommunity", "crypto", "cryptoart", "web3",
    "blockchain", "onchain", "ethereum", "objkt", "opensea", "artblocks",
    # ai promo variants (noisy near-duplicates)
    "ai", "aiart", "aiartwork", "ai_tezoart", "generativeai",
    # tooling / format
    "p5", "p5js", "p5.js", "javascript", "js", "webgl", "glsl", "three.js",
    "threejs", "shader", "shaders", "code", "svg", "canvas", "html",
    # generic promo / non-descriptive
    "art", "artist", "digital", "digitalart", "generative", "generativeart",
    "genart", "unique", "collection", "edition", "mint", "drop", "pfp",
    "nccu", "1of1", "oneofone", "rare", "new", "wip",
    # artist handles / project names seen in the data (not concepts)
    "artsofchet",
}

# QID → concept slug mapping for PRACTICES / EMBODIES derivation.
# Built from CONCEPT_VOCAB so the mapping stays consistent with the vocabulary.

# MoMA Classification → concept slug.
MOMA_CLASSIFICATION_TO_CONCEPT = {
    "Video":        "video-art",
    "Audio":        "sound-art",
    "Installation": "installation-art",
    "Media":        "new-media-art",
    "Film":         "experimental-film",
    "Performance":  "performance-art",
    "Software":     "software-art",
}

# Wikidata OCCUPATION QID → concept slug. Wikidata practitioners are filtered
# by P106 occupation (Q7016454 new media artist, etc. — see fetch_wikidata.py),
# NOT by genre QID, so their occupation_qids don't appear in qid_to_concept_id
# (which is keyed by the genre QIDs in CONCEPT_VOCAB). This map bridges the two
# so a Wikidata practitioner gets CLASSIFIED_BY + PRACTICES instead of dangling
# as an orphan. Each occupation maps to its corresponding genre concept.
OCCUPATION_QID_TO_CONCEPT_SLUG = {
    "Q7016454":   "new-media-art",    # new media artist
    "Q106208189": "computer-art",     # computer artist
    "Q21764863":  "algorithmic-art",  # algorithm artist
    "Q106208042": "internet-art",     # internet artist
}

# A(DAI) canonical regime — the single canonical lens.
ADAI_REGIME_NAME = "A(DAI) Seed Canon v1 (April 2026)"
ADAI_REGIME_QID = None  # no Wikidata anchor; canonical to this project

# Five sub-regimes (kept identical to the prior canon for cross-source compat)
SUB_REGIMES = [
    "Academic Media-Art History",
    "Asia-Pacific Institutional",
    "Crypto Market-Native",
    "Euro-American Institutional",
    "Practitioner Self-Report",
]


def _parse_md(n: dict[str, Any]) -> dict[str, Any]:
    md = n.get("metadata")
    if isinstance(md, str):
        try:
            return json.loads(md)
        except json.JSONDecodeError:
            return {}
    return md or {}


def derive(tag_min_artworks: int = TAG_MIN_ARTWORKS) -> tuple[list[Node], list[Edge], list[Alias], dict[str, int]]:
    nodes_in = json.loads((SEED / "nodes.json").read_text())
    edges_in = json.loads((SEED / "edges.json").read_text())
    print(f"Loaded canon: {len(nodes_in)} nodes, {len(edges_in)} edges")

    out_nodes: list[Node] = []
    out_edges: list[Edge] = []
    out_aliases: list[Alias] = []
    stats: Counter = Counter()
    qid_to_concept_id: dict[str, str] = {}
    slug_to_concept_id: dict[str, str] = {}
    tag_to_concept_id: dict[str, str] = {}  # fxhash tag string → concept node id

    # 1. Concept nodes
    for c in CONCEPT_VOCAB:
        cid = node_id("concept", c["name"])
        slug = node_slug("concept", c["name"])
        # Already emitted? (duplicate name in the vocab)
        if any(n.id == cid for n in out_nodes):
            continue
        slug_to_concept_id[slug] = cid
        if c.get("qid"):
            prior = qid_to_concept_id.get(c["qid"])
            if prior is not None and prior != cid:
                raise ValueError(
                    f"QID collision in CONCEPT_VOCAB: {c['qid']} maps to both "
                    f"{prior} and {cid} — one concept per QID."
                )
            qid_to_concept_id[c["qid"]] = cid
        metadata: dict[str, Any] = {
            "wikidata_description": c["desc"],
            "source_url": f"https://www.wikidata.org/wiki/{c['qid']}" if c.get("qid") else "https://www.moma.org/collection/about/classification",
        }
        if c.get("qid"):
            metadata["wikidata_qid"] = c["qid"]
            out_aliases.append(Alias(source="wikidata", external_id=c["qid"], node_id=cid))
        out_nodes.append(Node(
            id=cid, type="concept", name=c["name"], slug=slug, metadata=metadata,
        ))
        stats["concepts_emitted"] += 1

    # 1b. Tag-derived concepts (attested vocabulary from fxhash tags).
    #     Count distinct artworks per tag; gate by frequency; mint a concept
    #     per surviving tag (folding into a base concept when the slug matches).
    tag_counts: Counter = Counter()
    for n in nodes_in:
        if n["type"] != "artwork":
            continue
        for tag in _parse_md(n).get("tags", []) or []:
            if isinstance(tag, str) and tag.strip():
                tag_counts[tag.strip().lower()] += 1

    for tag, cnt in sorted(tag_counts.items(), key=lambda kv: (-kv[1], kv[0])):
        if cnt < tag_min_artworks or tag in TAG_STOPLIST:
            continue
        cid = node_id("concept", tag)
        slug = node_slug("concept", tag)
        tag_to_concept_id[tag] = cid
        if any(n.id == cid for n in out_nodes):
            # Folds into an existing concept (base vocab or an earlier tag
            # whose slug collides) — reuse, don't mint a duplicate.
            stats["tag_concepts_folded"] += 1
            continue
        slug_to_concept_id[slug] = cid
        out_nodes.append(Node(
            id=cid, type="concept", name=tag, slug=slug,
            metadata={
                "tag_origin": "fxhash",
                "artwork_count": cnt,
                "source_url": "https://www.fxhash.xyz/",
            },
        ))
        stats["tag_concepts_emitted"] += 1

    # 2. A(DAI) regime + sub-regimes
    adai_regime_id = node_id("classification_regime", ADAI_REGIME_NAME)
    out_nodes.append(Node(
        id=adai_regime_id,
        type="classification_regime",
        name=ADAI_REGIME_NAME,
        slug=node_slug("classification_regime", ADAI_REGIME_NAME),
        metadata={
            "kind": "canonical",
            "version": "v1",
            "date": "2026-04",
            "source_url": "https://github.com/a-digital-arts-institute/adai-v1",
        },
    ))
    stats["regimes_emitted"] += 1
    sub_regime_ids: dict[str, str] = {}
    for sr in SUB_REGIMES:
        sid = node_id("classification_regime", sr)
        sub_regime_ids[sr] = sid
        out_nodes.append(Node(
            id=sid, type="classification_regime", name=sr,
            slug=node_slug("classification_regime", sr),
            metadata={
                "kind": "lens",
                "source_url": "https://github.com/a-digital-arts-institute/adai-v1",
            },
        ))
        stats["regimes_emitted"] += 1

    # 3. CLASSIFIED_BY + PRACTICES + EMBODIES per existing node
    now = now_iso()
    artblocks_artworks = {n["id"] for n in nodes_in if n["type"] == "artwork" and "artblocks_token_id" in _parse_md(n)}
    fxhash_artworks = {n["id"] for n in nodes_in if n["type"] == "artwork" and "fxhash_token_id" in _parse_md(n)}
    # Resolve occupation QIDs → concept node ids (via the base-concept slugs).
    occ_to_concept_id = {
        q: slug_to_concept_id[slug]
        for q, slug in OCCUPATION_QID_TO_CONCEPT_SLUG.items()
        if slug in slug_to_concept_id
    }

    for n in nodes_in:
        md = _parse_md(n)
        nid = n["id"]
        ntype = n["type"]

        # ---- V&A MAKERS (practitioner or collective) ----
        # V&A makers carry no Wikidata QID and aren't platform-native, so the
        # QID/platform rules below would leave them unclassified. They ARE the
        # historical computer-art canon (Nake, Cohen, Mohr, Molnár, Nees, the
        # Computer Technique Group …), recognised through an institution and
        # the field's scholarship — so: CLASSIFIED_BY A(DAI) + the two
        # non-crypto sub-regimes, and PRACTICES computer-art. A maker merged
        # with a platform node (e.g. Manfred Mohr on both V&A and Art Blocks)
        # is handled here; the platform path adds nothing at the maker level.
        if md.get("va_maker_name") and ntype in ("practitioner", "collective"):
            out_edges.append(Edge(
                source_id=nid, target_id=adai_regime_id,
                edge_type="CLASSIFIED_BY", valid_from=now_iso(), confidence=1.0,
            ))
            out_edges.append(Edge(
                source_id=nid, target_id=sub_regime_ids["Academic Media-Art History"],
                edge_type="CLASSIFIED_BY", valid_from=now_iso(), confidence=1.0,
            ))
            out_edges.append(Edge(
                source_id=nid, target_id=sub_regime_ids["Euro-American Institutional"],
                edge_type="CLASSIFIED_BY", valid_from=now_iso(), confidence=1.0,
            ))
            stats["classified_by_va_maker"] += 3
            ca = slug_to_concept_id.get("computer-art")
            if ca:
                out_edges.append(Edge(
                    source_id=nid, target_id=ca,
                    edge_type="PRACTICES", valid_from=now_iso(), confidence=1.0,
                ))
                stats["practices_va"] += 1
            continue

        # ---- PRACTITIONERS ----
        if ntype == "practitioner":
            mvmt = md.get("movement_qids", []) or []
            occ = md.get("occupation_qids", []) or []
            has_moma = bool(md.get("moma_constituent_id"))
            is_primary = md.get("canon_tier") == "primary"
            is_wikidata = bool(md.get("wikidata_qid"))

            # Concepts this practitioner PRACTICES — from genre-QID movements
            # (legacy) AND from Wikidata occupation QIDs (Q7016454 etc.) mapped
            # to their corresponding concept. A set of concept node ids.
            practiced: set[str] = set()
            for q in mvmt + occ:
                if q in qid_to_concept_id:
                    practiced.add(qid_to_concept_id[q])
                elif q in occ_to_concept_id:
                    practiced.add(occ_to_concept_id[q])

            # CLASSIFIED_BY A(DAI) regime if practitioner is in our scope.
            # canon_tier=primary (the v1 editorial whitelist) counts: being
            # hand-selected for the canon IS an act of classification under
            # the A(DAI) lens. This is what connects the theorists / pioneers
            # (Yuk Hui, Lillian Schwartz) the source-tag rules can't reach —
            # they carry no digital-art QID precisely because they're the
            # figures a source-tag sweep structurally misses.
            if practiced or has_moma or is_primary:
                out_edges.append(Edge(
                    source_id=nid, target_id=adai_regime_id,
                    edge_type="CLASSIFIED_BY", valid_from=now, confidence=1.0,
                ))
                stats["classified_by_adai"] += 1

            # Primary-tier practitioners also classify under Academic
            # Media-Art History — the whitelist was assembled from field
            # scholarship (Christiane Paul's index, etc.).
            if is_primary:
                out_edges.append(Edge(
                    source_id=nid, target_id=sub_regime_ids["Academic Media-Art History"],
                    edge_type="CLASSIFIED_BY", valid_from=now, confidence=1.0,
                ))
                stats["classified_by_primary_academic"] += 1

            # Sub-regime CLASSIFIED_BY
            # Euro-American Institutional: MoMA ConstituentID present
            if has_moma:
                out_edges.append(Edge(
                    source_id=nid, target_id=sub_regime_ids["Euro-American Institutional"],
                    edge_type="CLASSIFIED_BY", valid_from=now, confidence=1.0,
                ))
                stats["classified_by_euro_amer"] += 1

            # Academic Media-Art History: practitioner from the Wikidata
            # scholarly record (occupation-anchored) OR with a movement QID —
            # the named anchors recognised by art-history scholarship.
            if (is_wikidata and practiced) or mvmt:
                out_edges.append(Edge(
                    source_id=nid, target_id=sub_regime_ids["Academic Media-Art History"],
                    edge_type="CLASSIFIED_BY", valid_from=now, confidence=1.0,
                ))
                stats["classified_by_academic"] += 1

            # PRACTICES edges → each concept the practitioner works with.
            for cid in sorted(practiced):
                out_edges.append(Edge(
                    source_id=nid, target_id=cid,
                    edge_type="PRACTICES", valid_from=now, confidence=1.0,
                ))
                stats["practices"] += 1

            continue

        # ---- ARTWORKS ----
        if ntype != "artwork":
            continue

        is_moma = bool(md.get("moma_object_id"))
        is_artblocks = nid in artblocks_artworks
        is_fxhash = nid in fxhash_artworks
        is_va = bool(md.get("va_system_number"))
        genre_qids = md.get("genre_qids", []) or []
        in_scope = is_moma or is_artblocks or is_fxhash or is_va or genre_qids

        # CLASSIFIED_BY A(DAI) regime
        if in_scope:
            out_edges.append(Edge(
                source_id=nid, target_id=adai_regime_id,
                edge_type="CLASSIFIED_BY", valid_from=now, confidence=1.0,
            ))
            stats["classified_by_adai_artwork"] += 1

        # Sub-regimes
        if is_moma or is_va:
            out_edges.append(Edge(
                source_id=nid, target_id=sub_regime_ids["Euro-American Institutional"],
                edge_type="CLASSIFIED_BY", valid_from=now, confidence=1.0,
            ))
            stats["classified_by_euro_amer_artwork"] += 1
        if is_artblocks or is_fxhash:
            out_edges.append(Edge(
                source_id=nid, target_id=sub_regime_ids["Crypto Market-Native"],
                edge_type="CLASSIFIED_BY", valid_from=now, confidence=1.0,
            ))
            stats["classified_by_crypto"] += 1

        # EMBODIES — MoMA Classification → concept
        if is_moma:
            classif = md.get("moma_classification")
            slug = MOMA_CLASSIFICATION_TO_CONCEPT.get(classif)
            if slug and slug in slug_to_concept_id:
                cid = slug_to_concept_id[slug]
                out_edges.append(Edge(
                    source_id=nid, target_id=cid,
                    edge_type="EMBODIES", valid_from=now, confidence=1.0,
                ))
                stats["embodies_moma"] += 1

        # EMBODIES — V&A computer-art collection → computer-art (attested:
        # the V&A's own classification / the "computer art" search). The
        # bridge to generative-art and to the fxhash tag-concepts is left to
        # the embedding Tier-2 propagation: V&A works are untagged, so they're
        # exactly the candidates that pass get inferred concept edges when
        # visually close to the platform canon — cross-era links, earned not
        # asserted.
        if is_va:
            ca = slug_to_concept_id.get("computer-art")
            if ca:
                out_edges.append(Edge(
                    source_id=nid, target_id=ca,
                    edge_type="EMBODIES", valid_from=now, confidence=1.0,
                ))
                stats["embodies_va"] += 1

        # EMBODIES — Wikidata genre QIDs → concept
        for q in set(genre_qids):
            cid = qid_to_concept_id.get(q)
            if cid:
                out_edges.append(Edge(
                    source_id=nid, target_id=cid,
                    edge_type="EMBODIES", valid_from=now, confidence=1.0,
                ))
                stats["embodies_wikidata"] += 1

        # EMBODIES — Art Blocks / fxhash platform → generative-art
        # The platform IS the genre on these.
        gen_id = slug_to_concept_id.get("generative-art")
        if gen_id and (is_artblocks or is_fxhash):
            out_edges.append(Edge(
                source_id=nid, target_id=gen_id,
                edge_type="EMBODIES", valid_from=now, confidence=1.0,
            ))
            stats["embodies_platform"] += 1

        # EMBODIES — artist-applied tags → tag-concept (attested, Tier 1).
        # Only tags that passed the frequency gate are in tag_to_concept_id.
        for tag in md.get("tags", []) or []:
            cid = tag_to_concept_id.get(tag.strip().lower()) if isinstance(tag, str) else None
            if cid:
                out_edges.append(Edge(
                    source_id=nid, target_id=cid,
                    edge_type="EMBODIES", valid_from=now, confidence=1.0,
                ))
                stats["embodies_tag"] += 1

    # Dedup edges (deterministic id_for already does this implicitly via
    # source|type|target — but a single artwork could derive EMBODIES
    # generative-art twice if BOTH wikidata genre_qids AND platform say so).
    deduped: dict[str, Edge] = {}
    for e in out_edges:
        deduped[e.id] = e
    out_edges = list(deduped.values())

    return out_nodes, out_edges, out_aliases, dict(stats)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--tag-min-artworks", type=int, default=TAG_MIN_ARTWORKS,
                    help="min distinct artworks for a tag to become a concept")
    args = ap.parse_args()

    sig = GathererSignal(
        producer=PRODUCER,
        source="seed/{nodes,edges}.json (post-merge canon)",
        config={
            "concept_count": len(CONCEPT_VOCAB),
            "regime_name": ADAI_REGIME_NAME,
            "sub_regimes": SUB_REGIMES,
            "moma_classification_map": MOMA_CLASSIFICATION_TO_CONCEPT,
            "tag_min_artworks": args.tag_min_artworks,
        },
    )

    nodes, edges, aliases, stats = derive(tag_min_artworks=args.tag_min_artworks)
    node_rows = [sig.stamp(n.as_row()) for n in nodes]
    edge_rows = [sig.stamp(e.as_row()) for e in edges]
    alias_rows = [a.as_row() for a in aliases]

    # The curation batch's edges reference EXISTING canon nodes — pass the
    # canon node IDs as extra_node_ids so the batch validator doesn't flag
    # them as orphans. The post-merge --canon validation catches real orphans.
    canon_nodes_json = json.loads((SEED / "nodes.json").read_text())
    canon_node_ids = {n["id"] for n in canon_nodes_json}
    errors = validate_batch(nodes=node_rows, edges=edge_rows, extra_node_ids=canon_node_ids)
    if errors:
        print(f"VALIDATION FAILED ({len(errors)} errors):", file=sys.stderr)
        for err in errors[:10]:
            print(f"  {err}", file=sys.stderr)
        return 1

    if args.dry_run:
        print()
        print(f"(dry-run) Would emit {len(nodes)} nodes + {len(edges)} edges")
        for k, v in sorted(stats.items(), key=lambda x: -x[1]):
            print(f"  stat[{k}]: {v}")
        return 0

    path = write_batch(sig, nodes=node_rows, edges=edge_rows, aliases=alias_rows)
    print(f"wrote → {path}")
    print(f"  concepts:    {sum(1 for n in nodes if n.type == 'concept')}")
    print(f"  regimes:     {sum(1 for n in nodes if n.type == 'classification_regime')}")
    print(f"  edges:       {len(edges)}")
    for k, v in sorted(stats.items(), key=lambda x: -x[1]):
        print(f"  stat[{k}]: {v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
