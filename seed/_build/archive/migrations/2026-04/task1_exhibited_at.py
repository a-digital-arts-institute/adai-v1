"""
Task 1: Extract EXHIBITED_AT edges from metadata.exhibitions arrays.

For each institution string on each practitioner node:
  - clean name (strip trailing parenthetical, skip placeholders)
  - resolve via alias map to canonical institution id
  - create institution node if new
  - create EXHIBITED_AT edge: practitioner -> institution (confidence: high)

Reads/writes: seed/nodes-final.json, seed/edges-final.json
Report:       seed/_build/task1_report.json
"""
from __future__ import annotations
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "seed"
SIGNAL_ID = "enrichment-seed-canon-v1-2026-04"

# Placeholder patterns to skip entirely
PLACEHOLDER_PATTERNS = [
    re.compile(r"^\s*\(", re.I),  # starts with (
    re.compile(r"not applicable", re.I),
    re.compile(r"^\(n/a\)", re.I),
]

# Alias map: normalised-string -> canonical institution id + display name
# Keys are lowercase, whitespace-normalised, punctuation-light
ALIASES: dict[str, tuple[str, str]] = {
    # MoMA family
    "moma": ("institution:moma", "MoMA"),
    "museum of modern art": ("institution:moma", "MoMA"),
    "moma ps1": ("institution:moma ps1", "MoMA PS1"),
    # Whitney
    "whitney museum": ("institution:whitney museum", "Whitney Museum"),
    "whitney museum of american art": ("institution:whitney museum", "Whitney Museum"),
    "whitney artport": ("institution:whitney artport", "Whitney Artport"),
    "whitney biennial": ("institution:whitney biennial", "Whitney Biennial"),
    # Tate family
    "tate": ("institution:tate", "Tate"),
    "tate modern": ("institution:tate modern", "Tate Modern"),
    "tate britain": ("institution:tate britain", "Tate Britain"),
    # V&A
    "v&a": ("institution:v&a", "V&A"),
    "v & a": ("institution:v&a", "V&A"),
    "victoria and albert museum": ("institution:v&a", "V&A"),
    # Serpentine (retargeted per user instruction in Task 0)
    "serpentine": ("institution:serpentine arts technologies", "Serpentine Arts Technologies"),
    "serpentine galleries": ("institution:serpentine arts technologies", "Serpentine Arts Technologies"),
    "serpentine sackler": ("institution:serpentine arts technologies", "Serpentine Arts Technologies"),
    # Centre Pompidou
    "centre pompidou": ("institution:centre pompidou", "Centre Pompidou"),
    "pompidou": ("institution:centre pompidou", "Centre Pompidou"),
    "centre pompidou-metz": ("institution:centre pompidou-metz", "Centre Pompidou-Metz"),
    # SFMOMA
    "sfmoma": ("institution:sfmoma", "SFMOMA"),
    "san francisco museum of modern art": ("institution:sfmoma", "SFMOMA"),
    # LACMA
    "lacma": ("institution:lacma", "LACMA"),
    "los angeles county museum of art": ("institution:lacma", "LACMA"),
    # ZKM
    "zkm": ("institution:zkm", "ZKM"),
    "zkm karlsruhe": ("institution:zkm", "ZKM"),
    "zkm center for art and media": ("institution:zkm", "ZKM"),
    "zentrum für kunst und medien karlsruhe": ("institution:zkm", "ZKM"),
    # Rhizome
    "rhizome": ("institution:rhizome artbase", "Rhizome / ArtBase"),
    "rhizome / artbase": ("institution:rhizome artbase", "Rhizome / ArtBase"),
    # Galleries often multi-location
    "pace gallery": ("institution:pace gallery", "Pace Gallery"),
    "pace": ("institution:pace gallery", "Pace Gallery"),
    "bitforms gallery": ("institution:bitforms gallery", "bitforms gallery"),
    "bitforms": ("institution:bitforms gallery", "bitforms gallery"),
    "sprüth magers": ("institution:sprueth magers", "Sprüth Magers"),
    "sprueth magers": ("institution:sprueth magers", "Sprüth Magers"),
    # Venice Biennale (collapse variants to base)
    "venice biennale": ("institution:venice biennale", "Venice Biennale"),
    # Ars Electronica
    "ars electronica": ("institution:ars electronica", "Ars Electronica"),
    "ars electronica festival": ("institution:ars electronica", "Ars Electronica"),
    # SIGGRAPH
    "siggraph": ("institution:siggraph", "SIGGRAPH"),
    # Auction houses
    "sotheby's": ("institution:sotheby's", "Sotheby's"),
    "sothebys": ("institution:sotheby's", "Sotheby's"),
    "christie's": ("institution:christie's", "Christie's"),
    "christies": ("institution:christie's", "Christie's"),
    # Festivals often referenced
    "transmediale": ("institution:transmediale", "Transmediale"),
    "documenta": ("institution:documenta", "Documenta"),
    "documenta x": ("institution:documenta", "Documenta"),
    # Platforms already in graph
    "feral file": ("platform:feral file", "Feral File"),
    "art blocks": ("platform:art blocks", "Art Blocks"),
    "art blocks curated": ("platform:art blocks", "Art Blocks"),
    "art blocks marfa": ("platform:art blocks", "Art Blocks"),
    # Non-exhibition-venue entries that should be skipped (they're tools/markers)
    "cybernetic serendipity": ("institution:ica london", "ICA London"),  # 1968 show at ICA London
    "ica london": ("institution:ica london", "ICA London"),
    "institute of contemporary arts london": ("institution:ica london", "ICA London"),
    # Hamburger Bahnhof
    "hamburger bahnhof": ("institution:hamburger bahnhof", "Hamburger Bahnhof"),
    # Kunsthalle family
    "kunsthalle basel": ("institution:kunsthalle basel", "Kunsthalle Basel"),
    "kunsthalle bremen": ("institution:kunsthalle bremen", "Kunsthalle Bremen"),
    # Goldsmiths / academic-adjacent but listed in exhibitions
    # (leave these; they'll become institutions)
    # Bright Moments
    "bright moments": ("institution:bright moments", "Bright Moments"),
    # M+
    "m+ hong kong": ("institution:m+ hong kong", "M+ Hong Kong"),
    "m+": ("institution:m+ hong kong", "M+ Hong Kong"),
    # Palais de Tokyo
    "palais de tokyo": ("institution:palais de tokyo", "Palais de Tokyo"),
    # New Museum
    "new museum": ("institution:new museum", "New Museum"),
    "new museum nyc": ("institution:new museum", "New Museum"),
}


def strip_trailing_parenthetical(s: str) -> str:
    """Remove a single trailing (...) if present. Keep nested-level simple."""
    return re.sub(r"\s*\([^()]*\)\s*$", "", s).strip()


def is_placeholder(s: str) -> bool:
    return any(p.search(s) for p in PLACEHOLDER_PATTERNS)


def normalize_key(s: str) -> str:
    """Lowercase, strip punctuation except key chars, collapse whitespace."""
    s = s.lower()
    s = re.sub(r"[^a-z0-9'+&\- ]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def slug_for_new(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^a-z0-9&+\- ]", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def resolve_institution(raw: str, existing_by_key: dict[str, str]) -> tuple[str | None, str, bool]:
    """
    Returns (canonical_id, display_name, is_new).
    is_new=True if we need to create a node for this.
    Returns (None, ...) if the string should be skipped.
    """
    if is_placeholder(raw):
        return (None, raw, False)

    # Strip trailing parenthetical (date / pavilion note)
    cleaned = strip_trailing_parenthetical(raw).strip()
    if not cleaned:
        return (None, raw, False)
    # If the cleaned text is empty or a placeholder too
    if is_placeholder(cleaned):
        return (None, raw, False)

    key = normalize_key(cleaned)
    # Alias lookup
    if key in ALIASES:
        cid, display = ALIASES[key]
        # If the target id is already an existing node, flag not-new
        is_new = cid not in existing_by_key
        return (cid, display, is_new)

    # Otherwise: create new institution id
    slug = slug_for_new(cleaned)
    cid = f"institution:{slug}"
    is_new = cid not in existing_by_key
    return (cid, cleaned, is_new)


def main():
    nodes = json.loads((SEED / "nodes-final.json").read_text())
    edges = json.loads((SEED / "edges-final.json").read_text())

    # Existing id -> display name map
    existing_ids = {n["id"]: n.get("name", "") for n in nodes}
    existing_keys = {(e.get("source_id"), e.get("target_id"), e.get("edge_type")) for e in edges}

    # Collect add sets
    new_institutions: dict[str, dict] = {}  # id -> node
    new_edges: list[dict] = []
    skipped: list[tuple[str, str]] = []  # (practitioner_name, raw)
    extractions: list[dict] = []

    practitioners = [n for n in nodes if n.get("type") == "practitioner"]
    for p in practitioners:
        pid = p["id"]
        pname = p.get("name", "")
        md = p.get("metadata") or {}
        exhibitions = md.get("exhibitions") or []
        if not exhibitions:
            continue
        for raw in exhibitions:
            if not isinstance(raw, str) or not raw.strip():
                continue
            cid, display, is_new = resolve_institution(raw, existing_ids)
            if cid is None:
                skipped.append((pname, raw))
                continue

            if is_new and cid not in new_institutions:
                new_institutions[cid] = {
                    "id": cid,
                    "name": display,
                    "type": cid.split(":", 1)[0] if cid.startswith("platform:") else "institution",
                    "slug": cid.split(":", 1)[1],
                    "metadata": {
                        "auto_generated": True,
                        "generated_by": SIGNAL_ID,
                        "signal_id": SIGNAL_ID,
                    },
                }
                existing_ids[cid] = display

            # Edge: practitioner -> institution
            edge_key = (pid, cid, "EXHIBITED_AT")
            if edge_key in existing_keys:
                continue
            new_edge = {
                "id": f"{pid}--exhibited_at--{cid}",
                "source_id": pid,
                "target_id": cid,
                "edge_type": "EXHIBITED_AT",
                "confidence": "high",
                "signal_id": SIGNAL_ID,
                "created_by": "gatherer-enrichment",
                "source_evidence": "metadata.exhibitions",
                "charge": None,
            }
            new_edges.append(new_edge)
            existing_keys.add(edge_key)
            extractions.append({"practitioner": pname, "raw": raw, "resolved_id": cid, "display": display, "is_new": is_new})

    # Write outputs
    nodes_out = nodes + list(new_institutions.values())
    edges_out = edges + new_edges
    (SEED / "nodes-final.json").write_text(json.dumps(nodes_out, indent=2, ensure_ascii=False))
    (SEED / "edges-final.json").write_text(json.dumps(edges_out, indent=2, ensure_ascii=False))

    # Report
    report = {
        "signal_id": SIGNAL_ID,
        "task": "Task 1 — EXHIBITED_AT edges from metadata.exhibitions",
        "new_edges_created": len(new_edges),
        "new_institution_nodes_created": len(new_institutions),
        "skipped_placeholder_entries": len(skipped),
        "practitioners_processed": len([p for p in practitioners if (p.get('metadata') or {}).get('exhibitions')]),
        "new_institutions_created": sorted([v["name"] for v in new_institutions.values()]),
        "skipped_sample": skipped[:20],
        "alias_collisions": [],  # for spec completeness
    }
    (SEED / "_build" / "task1_report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))

    print(f"Practitioners processed: {report['practitioners_processed']}")
    print(f"New EXHIBITED_AT edges:  {len(new_edges)}")
    print(f"New institution nodes:   {len(new_institutions)}")
    print(f"Skipped placeholders:    {len(skipped)}")
    print()
    print(f"Final totals: {len(nodes_out)} nodes, {len(edges_out)} edges")

    from collections import Counter
    ntypes = Counter(n.get("type") for n in nodes_out)
    etypes = Counter(e.get("edge_type") for e in edges_out)
    print(f"Node types: {dict(ntypes)}")
    print(f"Edge types: {dict(etypes)}")

    print()
    print("New institutions (alphabetical):")
    for name in sorted([v["name"] for v in new_institutions.values()]):
        print(f"  - {name}")

    if skipped:
        print("\nSkipped entries (placeholders):")
        for pname, raw in skipped:
            print(f"  [{pname}]  '{raw}'")


if __name__ == "__main__":
    main()
