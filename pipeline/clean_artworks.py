#!/usr/bin/env python3
"""
Clean up _artworks_preview.json before merge into the A(DAI) graph.

Fixes:
  1. Regenerates artwork_id slugs (strips /, (, ), +, &, unicode dashes)
  2. Adds structured year_start / year_end / year_uncertain / year_ongoing
  3. Adds work_type field (artwork | book | essay | protocol | exhibition |
     legislation | podcast | tool | report | theoretical-framework | platform)
  4. Collapses practitioner_type to controlled vocabulary, keeps original in
     practitioner_type_raw
  5. Flags co-authored / duplicate-title records (does NOT auto-deduplicate)
  6. Emits a cleanup report with all changes, duplicates, and practitioner
     strings needing graph ID resolution

Usage:
    python clean_artworks.py _artworks_preview.json

Outputs (alongside input):
    _artworks_preview_cleaned.json
    _artworks_preview_cleanup_report.md
"""

from __future__ import annotations
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any


# ── 1. Slugification ───────────────────────────────────────────────────────

_STRIP = re.compile(r"[''`\"\.,:;!?\(\)\[\]{}\u2014\u2013]")
_HYPHEN = re.compile(r"[\s/\\+&_—–]+")
_NON_ALNUM = re.compile(r"[^a-z0-9-]+")
_MULTI_HYPHEN = re.compile(r"-{2,}")


def slugify(text: str) -> str:
    s = text.lower()
    s = _STRIP.sub("", s)
    s = _HYPHEN.sub("-", s)
    s = _NON_ALNUM.sub("-", s)
    s = _MULTI_HYPHEN.sub("-", s)
    return s.strip("-")


def make_artwork_id(practitioner: str, title: str) -> str:
    return f"artwork-{slugify(practitioner)}--{slugify(title)}"


# ── 2. Year parsing ───────────────────────────────────────────────────────

_YEAR_RE = re.compile(r"\b(1\d{3}|20\d{2})\b")


def parse_year(raw: Any) -> dict:
    if isinstance(raw, int):
        return dict(year_raw=raw, year_start=raw, year_end=raw,
                    year_ongoing=False, year_uncertain=False)
    s = str(raw).strip() if raw else ""
    lower = s.lower()
    uncertain = "uncertain" in lower
    ongoing = any(t in lower for t in ("present", "ongoing"))
    years = sorted(set(int(y) for y in _YEAR_RE.findall(s)))
    start = years[0] if years else None
    end = None if ongoing else (years[-1] if years else None)
    if not ongoing and len(years) == 1:
        end = start
    return dict(year_raw=raw, year_start=start, year_end=end,
                year_ongoing=ongoing, year_uncertain=uncertain)


# ── 3. Practitioner type controlled vocabulary ─────────────────────────────

_PTYPE_MAP = {
    "artist": "individual",
    "artist-writer": "individual",
    "theorist": "individual",
    "collective": "collective",
    "artist-collective": "collective",
    "institution": "institution",
    "platform": "platform",
    "gallery": "platform",
    "artist-project": "project",
    "project": "project",
    "artwork": "project",
    "report": "framework",
    "theoretical": "framework",
    "exhibition-publication": "framework",
}


def normalize_ptype(raw: str) -> str:
    return _PTYPE_MAP.get((raw or "").strip().lower(), "unknown")


# ── 4. Work type inference ─────────────────────────────────────────────────

def infer_work_type(title: str, desc: str, ptype_raw: str) -> str:
    tl = title.lower()
    dl = desc.lower()
    pt = ptype_raw.lower()

    # Strong practitioner_type signals
    if pt == "report":
        return "report"
    if pt == "theoretical":
        return "theoretical-framework"
    if pt == "exhibition-publication":
        return "exhibition"

    # Legislation
    if "legislation" in tl or "a-corps" in tl.replace(" ", ""):
        return "legislation"

    # Podcast
    if "podcast" in tl:
        return "podcast"

    # Books
    book_signals = [
        "book arguing", "book tracing", "book examining", "book exploring",
        "book co-written", "book-length", "book analyzing", "book analysing",
        " manifesto", "published by counterpath", "published by ignota",
        "published by e-flux",
    ]
    if any(s in dl for s in book_signals):
        if "installation" not in dl[:80]:
            return "book"

    # Essays / talks
    if any(x in tl for x in ["(essay)", "talk/essay", "(talk/essay)"]):
        return "essay"
    essay_signals = [
        "essay and lecture", "influential essay", "essay critiquing",
        "essay examining", "essay exploring",
    ]
    if any(s in dl for s in essay_signals):
        return "essay"

    # Reports / strategic briefings
    if "future art ecosystems" in tl:
        return "report"
    if "strategic briefing" in dl:
        return "report"

    # Protocols / DAOs / tokens
    proto_kw = [" dao", " token", "ai.txt", "protocol"]
    if any(s in tl.lower() for s in proto_kw):
        return "protocol"
    if "erc-20" in dl or "dao " in dl[:120]:
        return "protocol"

    # Tools / libraries
    tool_signals = [
        "open-source tool", "command-line tool", "javascript library",
        "open-source javascript", "open-source software",
    ]
    if any(s in dl for s in tool_signals):
        return "tool"

    # Platforms / marketplaces (from practitioner_type)
    if pt in ("platform", "gallery"):
        return "platform"

    return "artwork"


# ── 5. Duplicate detection ─────────────────────────────────────────────────

def find_duplicates(artworks: list[dict]) -> dict[str, list[int]]:
    by_title: dict[str, list[int]] = defaultdict(list)
    for i, a in enumerate(artworks):
        key = slugify(a.get("title", ""))
        by_title[key].append(i)
    return {k: v for k, v in by_title.items() if len(v) > 1}


# ── 6. Main pipeline ──────────────────────────────────────────────────────

def clean(data: dict) -> tuple[dict, str]:
    artworks = data.get("artworks", [])
    id_changes: list[tuple[str, str]] = []
    practitioners_seen: set[str] = set()

    for entry in artworks:
        prac = entry.get("practitioner", "")
        title = entry.get("title", "")
        practitioners_seen.add(prac)

        # Slug fix
        old_id = entry.get("artwork_id", "")
        new_id = make_artwork_id(prac, title)
        if old_id != new_id:
            id_changes.append((old_id, new_id))
        entry["artwork_id"] = new_id

        # Year parsing
        yr = parse_year(entry.get("year"))
        entry["year_start"] = yr["year_start"]
        entry["year_end"] = yr["year_end"]
        entry["year_ongoing"] = yr["year_ongoing"]
        entry["year_uncertain"] = yr["year_uncertain"]
        entry["year_raw"] = yr["year_raw"]
        if "year" in entry:
            del entry["year"]

        # Practitioner type
        raw_ptype = entry.get("practitioner_type", "")
        entry["practitioner_type_raw"] = raw_ptype
        entry["practitioner_type"] = normalize_ptype(raw_ptype)

        # Work type
        entry["work_type"] = infer_work_type(title,
                                              entry.get("description", ""),
                                              raw_ptype)

    # Duplicates
    dupes = find_duplicates(artworks)

    # ── Build report ──
    R = []
    R.append("# Artworks Preview Cleanup Report\n")
    R.append(f"**Total entries:** {len(artworks)}")
    R.append(f"**Unique practitioners:** {len(practitioners_seen)}")
    R.append(f"**ID changes:** {len(id_changes)}")
    R.append(f"**Duplicate-title groups:** {len(dupes)}\n")

    # ID changes
    if id_changes:
        R.append("## ID Changes\n")
        for old, new in id_changes:
            R.append(f"- `{old}`")
            R.append(f"  → `{new}`\n")

    # Duplicates
    if dupes:
        R.append("## Duplicate Titles (Likely Co-Authored Works)\n")
        R.append("Editorial decision needed: merge into one node with multiple")
        R.append("CREATED_BY edges, or keep separate.\n")
        for slug, indices in sorted(dupes.items()):
            entries_d = [artworks[j] for j in indices]
            title = entries_d[0].get("title", slug)
            pracs = [e.get("practitioner", "?") for e in entries_d]
            R.append(f"### {title}")
            R.append(f"- Practitioners: {', '.join(pracs)}")
            R.append(f"- Indices: {indices}")
            R.append(f"- IDs: {[e['artwork_id'] for e in entries_d]}\n")

    # Work type distribution
    wt_counts: dict[str, int] = defaultdict(int)
    for a in artworks:
        wt_counts[a["work_type"]] += 1
    R.append("## Work Type Distribution\n")
    for wt, c in sorted(wt_counts.items(), key=lambda x: -x[1]):
        R.append(f"- **{wt}**: {c}")
    R.append("")

    # Practitioner type distribution
    pt_counts: dict[str, int] = defaultdict(int)
    for a in artworks:
        pt_counts[a["practitioner_type"]] += 1
    R.append("## Practitioner Type Distribution (normalised)\n")
    for pt, c in sorted(pt_counts.items(), key=lambda x: -x[1]):
        R.append(f"- **{pt}**: {c}")
    R.append("")

    # Practitioner strings for graph resolution
    R.append("## Practitioner Strings Needing Graph ID Resolution\n")
    R.append("Each must resolve to an existing practitioner node before")
    R.append("CREATED_BY edges can be built.\n")
    for p in sorted(practitioners_seen):
        R.append(f"- `{p}`")
    R.append("")

    # Update top-level
    data["count"] = len(artworks)
    data["note"] = (
        "CLEANED. Ready for Phase 2 merge after editorial review of "
        "duplicates and practitioner ID resolution. See cleanup_report.md."
    )
    data["artworks"] = artworks
    return data, "\n".join(R)


# ── CLI ────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        print(f"Usage: python {sys.argv[0]} <input.json>", file=sys.stderr)
        sys.exit(1)

    inpath = Path(sys.argv[1])
    if not inpath.exists():
        print(f"File not found: {inpath}", file=sys.stderr)
        sys.exit(1)

    out_json = inpath.with_name(inpath.stem + "_cleaned.json")
    out_report = inpath.with_name(inpath.stem + "_cleanup_report.md")

    with open(inpath, "r", encoding="utf-8") as f:
        data = json.load(f)

    cleaned, report = clean(data)

    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(cleaned, f, indent=2, ensure_ascii=False)

    with open(out_report, "w", encoding="utf-8") as f:
        f.write(report)

    print(f"Cleaned JSON  -> {out_json}")
    print(f"Report        -> {out_report}")

    dupes = find_duplicates(cleaned["artworks"])
    print(f"\n  {cleaned['count']} entries processed")
    print(f"  {len(dupes)} duplicate-title groups flagged")
    print(f"  See report for full details")


if __name__ == "__main__":
    main()
