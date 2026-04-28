#!/usr/bin/env python3
"""
Prune the four real-source pass outputs (2026-04-28):
  - moma_digital_2026-04-28.json
  - fxhash_tags_2026-04-28.json
  - wikidata_artworks_2026-04-28b.json
  - objkt_tags_2026-04-28.json

Actions:
  A. Drop confirmed-false objkt matches (Constant, XCOPY, Beeple).
  B. Tag noise: denylist junk + crypto-meme + project tags; strip
     zero-width chars; canonicalise marketing variants
     (generativeart → generative, etc.); drop self-references
     (tag matches creator's own name).
  C. Sol LeWitt MoMA Wall Drawings: drop by default (KEEP_LEWITT=False).
     Flip the flag to keep them if editorial decision changes.

Outputs cleaned files with `.pruned.json` suffix and a single
`prune_report_2026-04-28.json` summarising what was removed.
"""
from __future__ import annotations
import json, re, unicodedata
from pathlib import Path
from collections import Counter, defaultdict

HERE = Path(__file__).parent
DATE = "2026-04-28"

KEEP_LEWITT = False  # editorial flag — flip to True to keep Wall Drawings

# A. Confirmed false objkt matches (verified 2026-04-28 via API + Twitter handles)
DROP_OBJKT_PRACTITIONERS = {
    "practitioner:constant",  # "Fjconstantino" is unrelated; real Constant collective not on objkt
    "practitioner:xcopy",     # "XXXCopy" (NSFW Glitch) is parody/derivative; real XCOPY not on objkt
    "practitioner:beeple",    # "beeple fan" is fan account ("Art is my passion"); Beeple is Ethereum-only
}

# B1. Junk + meme tags to drop entirely
TAG_DENYLIST = {
    # junk
    "asdf",
    # crypto-marketing memes
    "btc","xcopy","xocpy","30eth","topart","btcfan","btc1m","tezosart","krrowbar",
    "eth","ethereum","tezos","blockchain","nft","crypto","fxhash","objkt",
    "tezos generative","fxhash genart","cleannft","#cleannft",
    # project / event-specific tags (not concepts)
    "popnyc2023","proof of people","2017gif",
    # vague aliases
    "art","artwork","gif",
}

# B2. Canonicalise: marketing-hashtag → existing concept
TAG_CANONICALISE = {
    "generativeart":     "generative",
    "abstractart":       "abstract",
    "creativecodeart":   "creative coding",
    "creativecoding":    "creative coding",
    "algorithmicart":    "algorithmic art",
    "codeart":           "creative coding",
    "computationalart":  "computational art",
    "madewithcode":      "creative coding",
    "real-time":         "real time",
    "real time":         "real time",
    # dedup self-name variants from fxhash
    "kimasendorf":       None,  # drop (self-ref)
    "kim asendorf":      None,
    "joshuadavis":       None,
    "praystation":       None,
    "hwf":               "herbert w. franke",
    "hwf tribute":       "herbert w. franke",
    "bit operations":    None,  # circular self-ref of artwork title
}

ZERO_WIDTH = re.compile(r"[\u200b\u200c\u200d\ufeff]")

def clean_tag(t: str) -> str | None:
    """Apply canonicalisation + denylist + zero-width strip. None means drop."""
    t = ZERO_WIDTH.sub("", t).strip().lower()
    t = t.lstrip("#").strip()
    if not t:
        return None
    if t in TAG_DENYLIST:
        return None
    if t in TAG_CANONICALISE:
        canon = TAG_CANONICALISE[t]
        return canon  # may be None to drop
    return t

def name_key(s: str) -> str:
    s = unicodedata.normalize("NFKD", (s or "").lower()).encode("ascii", "ignore").decode()
    return " ".join(s.split())

def slugify(s):
    s = unicodedata.normalize("NFKD", (s or "").lower()).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9&+\- ]", "", s)
    return re.sub(r"\s+", " ", s).strip()

def is_self_ref(tag: str, creator_id: str | None) -> bool:
    """Tag is the artist's own name?"""
    if not creator_id:
        return False
    creator_name = creator_id.split(":", 1)[-1]  # strip 'practitioner:' prefix
    nk_creator = name_key(creator_name)
    nk_tag = name_key(tag)
    return nk_tag == nk_creator or nk_tag == nk_creator.replace(" ", "")

def prune_file(path: Path, drop_practitioners: set, drop_lewitt: bool, label: str):
    data = json.loads(path.read_text())
    nodes = data.get("nodes", [])
    edges = data.get("edges", [])

    report = {
        "label": label,
        "input_file": path.name,
        "input_nodes": len(nodes),
        "input_edges": len(edges),
        "dropped_artworks": [],
        "dropped_edges": 0,
        "tag_drops": Counter(),
        "tag_canonicalisations": Counter(),
        "self_ref_drops": Counter(),
        "lewitt_drops": [],
    }

    # Pass 1: identify artworks to drop (false-match practitioners + LeWitt if !keep)
    drop_artwork_ids = set()
    for n in nodes:
        if n.get("type") != "artwork":
            continue
        m = n.get("metadata") or {}
        cid = m.get("creator_id")
        if cid in drop_practitioners:
            drop_artwork_ids.add(n["id"])
            report["dropped_artworks"].append({"id": n["id"], "creator": cid, "reason": "false-match practitioner"})
            continue
        if drop_lewitt and cid == "practitioner:sol lewitt":
            drop_artwork_ids.add(n["id"])
            report["lewitt_drops"].append(n["id"])

    # Pass 2: rebuild nodes — strip dropped artworks + clean concept nodes
    kept_nodes = []
    concept_id_remap = {}  # old id → new id (after canonicalisation), or None to drop
    seen_concept_ids = set()  # to dedup post-canonicalisation
    for n in nodes:
        if n.get("type") == "artwork" and n["id"] in drop_artwork_ids:
            continue
        if n.get("type") == "concept":
            old_name = n["name"]
            new_name = clean_tag(old_name)
            if new_name is None:
                concept_id_remap[n["id"]] = None
                report["tag_drops"][old_name] += 1
                continue
            if new_name != old_name.strip().lower():
                report["tag_canonicalisations"][f"{old_name} → {new_name}"] += 1
            new_id = f"concept:{new_name}"
            concept_id_remap[n["id"]] = new_id
            if new_id in seen_concept_ids:
                continue  # dedup — concept already added under canonical id
            seen_concept_ids.add(new_id)
            n2 = dict(n)
            n2["id"] = new_id
            n2["name"] = new_name
            n2["slug"] = slugify(new_name)
            kept_nodes.append(n2)
        else:
            kept_nodes.append(n)

    # Pass 3: rebuild edges — drop edges touching dropped artworks; remap concept ids;
    # also filter EMBODIES self-refs and EMBODIES whose target was canonicalised away
    kept_edges = []
    seen_edge_ids = set()
    for e in edges:
        src, tgt = e["source_id"], e["target_id"]
        if src in drop_artwork_ids or tgt in drop_artwork_ids:
            report["dropped_edges"] += 1
            continue
        new_src = src
        new_tgt = tgt
        if src in concept_id_remap:
            new_src = concept_id_remap[src]
            if new_src is None:
                report["dropped_edges"] += 1; continue
        if tgt in concept_id_remap:
            new_tgt = concept_id_remap[tgt]
            if new_tgt is None:
                report["dropped_edges"] += 1; continue

        # Self-reference check (EMBODIES where tag = artist's own name)
        if e["edge_type"] == "EMBODIES":
            tag_name = (new_tgt or tgt).replace("concept:", "")
            # Find creator from artwork metadata
            artwork = next((n for n in kept_nodes if n["id"] == new_src and n.get("type") == "artwork"), None)
            if artwork:
                creator = (artwork.get("metadata") or {}).get("creator_id")
                if is_self_ref(tag_name, creator):
                    report["self_ref_drops"][f"{creator} → {tag_name}"] += 1
                    report["dropped_edges"] += 1
                    continue

        e2 = dict(e)
        e2["source_id"] = new_src
        e2["target_id"] = new_tgt
        e2["id"] = f"{new_src}--{e['edge_type'].lower()}--{new_tgt}"
        if e2["id"] in seen_edge_ids:
            report["dropped_edges"] += 1
            continue
        seen_edge_ids.add(e2["id"])
        kept_edges.append(e2)

    report["output_nodes"] = len(kept_nodes)
    report["output_edges"] = len(kept_edges)
    report["dropped_artwork_count"] = len(report["dropped_artworks"])

    out = dict(data)
    out["nodes"] = kept_nodes
    out["edges"] = kept_edges
    out["pruned_at"] = DATE
    out["prune_report"] = {
        "dropped_artworks": report["dropped_artwork_count"],
        "dropped_edges":    report["dropped_edges"],
        "tag_drops":        dict(report["tag_drops"]),
        "tag_canonicalisations": dict(report["tag_canonicalisations"]),
        "self_ref_drops":   dict(report["self_ref_drops"]),
        "lewitt_drops":     report["lewitt_drops"],
    }
    out_path = path.with_suffix(".pruned.json")
    out_path.write_text(json.dumps(out, indent=2, ensure_ascii=False))
    return report

def main():
    files = [
        ("MoMA digital",     HERE / "moma_digital_2026-04-28.json",    set(),                    not KEEP_LEWITT),
        ("fxhash tags",      HERE / "fxhash_tags_2026-04-28.json",     set(),                    False),
        ("Wikidata artworks",HERE / "wikidata_artworks_2026-04-28b.json", set(),                False),
        ("Objkt tags",       HERE / "objkt_tags_2026-04-28.json",      DROP_OBJKT_PRACTITIONERS, False),
    ]

    summary = {
        "ran_at": DATE,
        "settings": {
            "DROP_OBJKT_PRACTITIONERS": sorted(DROP_OBJKT_PRACTITIONERS),
            "KEEP_LEWITT": KEEP_LEWITT,
            "TAG_DENYLIST_size": len(TAG_DENYLIST),
            "TAG_CANONICALISE_count": len(TAG_CANONICALISE),
        },
        "passes": [],
    }

    for label, path, drop_pracs, drop_lw in files:
        if not path.exists():
            print(f"  ! {label}: {path.name} missing")
            continue
        rpt = prune_file(path, drop_pracs, drop_lw, label)
        summary["passes"].append(rpt)
        print(f"\n=== {label} ({path.name}) ===")
        print(f"  in:  {rpt['input_nodes']} nodes, {rpt['input_edges']} edges")
        print(f"  out: {rpt['output_nodes']} nodes, {rpt['output_edges']} edges")
        print(f"  dropped: {rpt['dropped_artwork_count']} artworks, {rpt['dropped_edges']} edges")
        if rpt["tag_drops"]:
            print(f"  tag drops (top 6): {dict(rpt['tag_drops'].most_common(6))}")
        if rpt["tag_canonicalisations"]:
            print(f"  canonicalised (top 6): {dict(rpt['tag_canonicalisations'].most_common(6))}")
        if rpt["self_ref_drops"]:
            print(f"  self-ref drops: {dict(rpt['self_ref_drops'])}")
        if rpt["lewitt_drops"]:
            print(f"  LeWitt drops: {len(rpt['lewitt_drops'])}")

    # Convert Counters to dict for json
    for p in summary["passes"]:
        for k in ("tag_drops","tag_canonicalisations","self_ref_drops"):
            if k in p:
                p[k] = dict(p[k])
    (HERE / f"prune_report_{DATE}.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    print(f"\nReport: prune_report_{DATE}.json")

if __name__ == "__main__":
    main()
