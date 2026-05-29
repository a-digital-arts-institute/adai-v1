#!/usr/bin/env python3
"""fetch_named_anchors.py — re-fetch the v1 editorial practitioner whitelist.

The v1 canon (Irina's hand-curated set, recovered from commit 163ffa0) was
a 146-name whitelist chosen by field knowledge that cuts ACROSS source
categories — theorists (Yuk Hui, McKenzie Wark), pre-digital pioneers
(Lillian Schwartz, Manfred Mohr), sound artists Wikidata files as
"composer" (Ryoji Ikeda, Xenakis), genre-crossing names (Holly Herndon,
Beeple). The v2 source-tag gatherers structurally CANNOT find these — a
MoMA-digital-classification query has no Yuk Hui, a Wikidata
"new media artist" occupation query has no Ryoji Ikeda.

This gatherer restores them. It is occupation-agnostic: it fetches each
anchor by QID (or resolves a QID by name, P31=Q5 gated) and emits a
practitioner node regardless of how Wikidata classifies them. The
editorial judgment lives in the input file `named_anchors.json` (names +
QIDs only — pure judgment, no prose); the fetch is disciplined and
source-attested per the producer contract.

Every emitted node carries `metadata.canon_tier = "primary"` so the
render layer can default to the curated set while the broader v2 sweep
stays searchable.

Run:
    python3 seed/_build/fetch_named_anchors.py [--limit N] [--no-resolve]
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

sys.path.insert(0, str(Path(__file__).parent))
from _http import HttpError, get_json  # noqa: E402
from _node_schema import Alias, Node, validate_batch  # noqa: E402
from _provenance import GathererSignal, write_batch  # noqa: E402
from _slug import node_id, node_slug, slugify  # noqa: E402

PRODUCER = "named-anchors"
ANCHORS_FILE = Path(__file__).parent / "named_anchors.json"
ENTITYDATA = "https://www.wikidata.org/wiki/Special:EntityData/{qid}.json"
WBSEARCH = "https://www.wikidata.org/w/api.php"
COMMONS_FILEPATH = "https://commons.wikimedia.org/wiki/Special:FilePath/"


def _claim_values(entity: dict[str, Any], prop: str) -> list[Any]:
    out = []
    for c in entity.get("claims", {}).get(prop, []):
        snak = c.get("mainsnak", {})
        dv = snak.get("datavalue", {})
        if dv:
            out.append(dv.get("value"))
    return out


def _entity_qids(entity: dict[str, Any], prop: str) -> list[str]:
    return [v["id"] for v in _claim_values(entity, prop) if isinstance(v, dict) and v.get("id")]


def _entity_time_year(entity: dict[str, Any], prop: str) -> str | None:
    for v in _claim_values(entity, prop):
        if isinstance(v, dict) and v.get("time"):
            t = v["time"]  # e.g. "+1949-00-00T00:00:00Z"
            sign = "-" if t.startswith("-") else ""
            digits = t.lstrip("+-")[:4]
            if digits.isdigit():
                return f"{sign}{digits}"
    return None


def _entity_image(entity: dict[str, Any]) -> str | None:
    for v in _claim_values(entity, "P18"):
        if isinstance(v, str) and v:
            return f"{COMMONS_FILEPATH}{v.replace(' ', '_')}"
    return None


def fetch_entity(qid: str) -> dict[str, Any] | None:
    try:
        body = get_json(ENTITYDATA.format(qid=qid), timeout=30, host_limit=4)
    except HttpError as e:
        print(f"  WARN: entity fetch {qid} failed: {e}", file=sys.stderr)
        return None
    return body.get("entities", {}).get(qid)


def resolve_qid(name: str) -> str | None:
    """Resolve a name → QID via wbsearchentities, gated on P31=Q5 (human).

    Guards against the mis-resolution class (e.g. 'Sónar' → SonarQube): we
    only accept a hit that the entity actually declares instance-of human.
    """
    params = urlencode({
        "action": "wbsearchentities", "search": name, "language": "en",
        "format": "json", "type": "item", "limit": 5,
    })
    try:
        body = get_json(f"{WBSEARCH}?{params}", timeout=30, host_limit=4)
    except HttpError:
        return None
    for hit in body.get("search", []):
        qid = hit.get("id")
        if not qid:
            continue
        ent = fetch_entity(qid)
        if not ent:
            continue
        if "Q5" in _entity_qids(ent, "P31"):  # is human
            return qid
    return None


def gather(*, limit: int | None, resolve: bool) -> tuple[list[Node], list[Alias], dict[str, int]]:
    payload = __import__("json").loads(ANCHORS_FILE.read_text())
    anchors = payload["anchors"]
    if limit:
        anchors = anchors[:limit]

    nodes: list[Node] = []
    aliases: list[Alias] = []
    stats: dict[str, int] = {
        "anchors": len(anchors), "emitted": 0, "qid_given": 0,
        "qid_resolved": 0, "qid_unresolved": 0, "fetch_failed": 0,
        "name_only_stub": 0,
    }
    seen_pids: set[str] = set()

    for a in anchors:
        name = a["name"].strip()
        qid = a.get("wikidata_qid")
        if not slugify(name):
            continue

        if not qid and resolve:
            qid = resolve_qid(name)
            if qid:
                stats["qid_resolved"] += 1
            else:
                stats["qid_unresolved"] += 1
            time.sleep(0.3)
        elif qid:
            stats["qid_given"] += 1

        pid = node_id("practitioner", name)
        if pid in seen_pids:
            continue
        seen_pids.add(pid)

        metadata: dict[str, Any] = {"canon_tier": "primary"}

        if qid:
            ent = fetch_entity(qid)
            time.sleep(0.2)
            if ent is None:
                stats["fetch_failed"] += 1
                # still emit a primary stub with the QID + source
                metadata["wikidata_qid"] = qid
                metadata["source_url"] = f"https://www.wikidata.org/wiki/{qid}"
            else:
                metadata["wikidata_qid"] = qid
                metadata["source_url"] = f"https://www.wikidata.org/wiki/{qid}"
                desc = (ent.get("descriptions", {}).get("en", {}) or {}).get("value")
                if desc:
                    metadata["wikidata_description"] = desc
                birth = _entity_time_year(ent, "P569")
                if birth:
                    metadata["birth_year"] = birth
                death = _entity_time_year(ent, "P570")
                if death:
                    metadata["death_year"] = death
                img = _entity_image(ent)
                if img:
                    metadata["image_url"] = img
                countries = _entity_qids(ent, "P27")
                if countries:
                    metadata["nationality_qids"] = countries
                occ = _entity_qids(ent, "P106")
                if occ:
                    metadata["occupation_qids"] = occ
                mvmt = _entity_qids(ent, "P135")
                if mvmt:
                    metadata["movement_qids"] = mvmt
            aliases.append(Alias(source="wikidata", external_id=qid, node_id=pid))
        else:
            # Name-only curated stub. The editorial decision (this person
            # belongs in the canon) is itself the attestation; the
            # named_anchors.json file is the source.
            stats["name_only_stub"] += 1
            metadata["source_url"] = "https://github.com/a-digital-arts-institute/adai-v1/blob/main/seed/_build/named_anchors.json"
            metadata["canon_note"] = "v1 editorial whitelist; QID not yet resolved"

        nodes.append(Node(
            id=pid, type="practitioner", name=name,
            slug=node_slug("practitioner", name), metadata=metadata,
        ))
        stats["emitted"] += 1

    return nodes, aliases, dict(stats)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--no-resolve", action="store_true",
                    help="don't try to resolve QIDs for name-only anchors")
    args = ap.parse_args()

    sig = GathererSignal(
        producer=PRODUCER,
        source="seed/_build/named_anchors.json (v1 editorial whitelist) + Wikidata EntityData",
        config={"limit": args.limit, "resolve": not args.no_resolve},
    )

    nodes, aliases, stats = gather(limit=args.limit, resolve=not args.no_resolve)
    node_rows = [sig.stamp(n.as_row()) for n in nodes]
    alias_rows = [a.as_row() for a in aliases]

    errors = validate_batch(nodes=node_rows, edges=[])
    if errors:
        print(f"VALIDATION FAILED ({len(errors)} errors):", file=sys.stderr)
        for err in errors[:10]:
            print(f"  {err}", file=sys.stderr)
        return 1

    path = write_batch(sig, nodes=node_rows, edges=[], aliases=alias_rows)
    print(f"wrote → {path}")
    for k, v in stats.items():
        print(f"  stat[{k}]: {v}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
