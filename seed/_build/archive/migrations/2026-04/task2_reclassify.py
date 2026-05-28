"""
Task 2: Reclassify polluted COLLABORATES_WITH edges.

Rules:
  1. practitioner -> institution/museum/gallery ==> EXHIBITED_AT
  2. practitioner -> practitioner:
       - cross-check source's metadata.collaborators typed list
       - if target name is listed with type INFLUENCES -> reverse direction
         (influence flows from historical figure TO practitioner), confidence=medium
       - if type BELONGS_TO -> leave edge but mark BELONGS_TO
       - if type EXHIBITED_AT (rare for pract->pract) -> mark EXHIBITED_AT
       - default: keep as COLLABORATES_WITH
  3. artwork -> institution/platform ==> EXHIBITED_AT (commissioning/presentation relationships)
  4. Other structural cases (platform<->platform partnerships, institution<->platform) -> keep
  5. Dedupe against any EXHIBITED_AT added in Task 1 (same source+target+type).
"""
from __future__ import annotations
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "seed"
SIGNAL_ID = "enrichment-seed-canon-v1-2026-04"

VENUE_TYPES = {"institution", "publication"}
PLATFORM_TYPES = {"platform"}


def name_match(a: str, b: str) -> bool:
    """Loose name match for cross-ref against collaborators list."""
    if not a or not b:
        return False
    a = a.lower().strip().replace("—", "-").replace("&", "and")
    b = b.lower().strip().replace("—", "-").replace("&", "and")
    if a == b:
        return True
    # first-token overlap or substring
    if a in b or b in a:
        return True
    # Compare last-name
    a_last = a.split()[-1] if a.split() else a
    b_last = b.split()[-1] if b.split() else b
    if a_last and a_last == b_last and len(a_last) > 3:
        return True
    return False


def main():
    nodes = json.loads((SEED / "nodes-final.json").read_text())
    edges = json.loads((SEED / "edges-final.json").read_text())
    by_id = {n["id"]: n for n in nodes}

    # Build collaborator-type map: {source_id: {target_name_lower: type}}
    type_map: dict[str, dict[str, str]] = {}
    for n in nodes:
        if n.get("type") != "practitioner":
            continue
        md = n.get("metadata") or {}
        collabs = md.get("collaborators") or []
        if not collabs:
            continue
        tm: dict[str, str] = {}
        for c in collabs:
            if not isinstance(c, dict):
                continue
            cname = c.get("name", "")
            ctype = c.get("type", "COLLABORATES_WITH")
            if cname:
                tm[cname.lower().strip()] = ctype
        if tm:
            type_map[n["id"]] = tm

    def lookup_type(source_id: str, target_name: str) -> str | None:
        tm = type_map.get(source_id, {})
        # Try exact match first
        t = tm.get((target_name or "").lower().strip())
        if t:
            return t
        # Loose match across entries
        for k, v in tm.items():
            if name_match(k, target_name):
                return v
        return None

    # Track what we do
    reclassified_to_exhibited_at = 0
    reclassified_to_influences = 0
    reclassified_to_belongs_to = 0
    kept_as_collaborates = 0
    skipped_non_practitioner_source = 0
    artwork_inst_to_exhibited_at = 0
    flagged_for_review: list[dict] = []

    new_edges: list[dict] = []
    seen_keys: set[tuple] = set()

    # Pre-seed seen_keys with existing non-CW edges to avoid duplicating
    for e in edges:
        if e.get("edge_type") != "COLLABORATES_WITH":
            seen_keys.add((e.get("source_id"), e.get("target_id"), e.get("edge_type")))

    for e in edges:
        if e.get("edge_type") != "COLLABORATES_WITH":
            new_edges.append(e)
            continue

        s_id, t_id = e.get("source_id"), e.get("target_id")
        s_node = by_id.get(s_id)
        t_node = by_id.get(t_id)
        if not s_node or not t_node:
            new_edges.append(e)
            continue
        s_type, t_type = s_node.get("type"), t_node.get("type")
        s_name, t_name = s_node.get("name", ""), t_node.get("name", "")

        # RULE 1: practitioner -> institution
        if s_type == "practitioner" and t_type == "institution":
            # check if INFLUENCES or BELONGS_TO is hinted in collaborators map
            hinted = lookup_type(s_id, t_name)
            new_type = "EXHIBITED_AT"
            if hinted in ("BELONGS_TO", "INFLUENCES"):
                new_type = hinted
                if new_type == "BELONGS_TO":
                    reclassified_to_belongs_to += 1
                else:
                    reclassified_to_influences += 1
            else:
                reclassified_to_exhibited_at += 1
            key = (s_id, t_id, new_type)
            if key in seen_keys:
                # already exists — drop the duplicate
                continue
            seen_keys.add(key)
            new_e = dict(e)
            new_e["edge_type"] = new_type
            new_e["id"] = f"{s_id}--{new_type.lower()}--{t_id}"
            new_e["confidence"] = "high" if new_type == "EXHIBITED_AT" else "medium"
            new_e["source_evidence"] = "Task 2 reclassification from COLLABORATES_WITH; target node type=institution"
            new_e["signal_id"] = SIGNAL_ID
            new_edges.append(new_e)
            continue

        # RULE 2: practitioner -> practitioner
        if s_type == "practitioner" and t_type == "practitioner":
            hinted = lookup_type(s_id, t_name)
            if hinted == "INFLUENCES":
                # Reverse direction: influence flows FROM t_id TO s_id
                new_type = "INFLUENCES"
                rev_s, rev_t = t_id, s_id
                key = (rev_s, rev_t, new_type)
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                new_e = dict(e)
                new_e["source_id"] = rev_s
                new_e["target_id"] = rev_t
                new_e["edge_type"] = new_type
                new_e["id"] = f"{rev_s}--influences--{rev_t}"
                new_e["confidence"] = "medium"
                new_e["source_evidence"] = f"metadata.collaborators on {s_name} (declared as INFLUENCES)"
                new_e["signal_id"] = SIGNAL_ID
                reclassified_to_influences += 1
                new_edges.append(new_e)
                continue
            elif hinted == "EXHIBITED_AT":
                new_type = "EXHIBITED_AT"
                key = (s_id, t_id, new_type)
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                new_e = dict(e)
                new_e["edge_type"] = new_type
                new_e["id"] = f"{s_id}--exhibited_at--{t_id}"
                new_e["confidence"] = "medium"
                new_e["source_evidence"] = f"metadata.collaborators on {s_name} (declared as EXHIBITED_AT)"
                new_e["signal_id"] = SIGNAL_ID
                reclassified_to_exhibited_at += 1
                flagged_for_review.append({"source": s_name, "target": t_name,
                                           "reason": "practitioner→practitioner reclassified EXHIBITED_AT (unusual)"})
                new_edges.append(new_e)
                continue
            elif hinted == "BELONGS_TO":
                new_type = "BELONGS_TO"
                key = (s_id, t_id, new_type)
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                new_e = dict(e)
                new_e["edge_type"] = new_type
                new_e["id"] = f"{s_id}--belongs_to--{t_id}"
                new_e["confidence"] = "medium"
                new_e["source_evidence"] = f"metadata.collaborators on {s_name} (declared as BELONGS_TO)"
                new_e["signal_id"] = SIGNAL_ID
                reclassified_to_belongs_to += 1
                new_edges.append(new_e)
                continue
            else:
                # keep COLLABORATES_WITH
                key = (s_id, t_id, "COLLABORATES_WITH")
                if key in seen_keys:
                    continue
                seen_keys.add(key)
                kept_as_collaborates += 1
                new_edges.append(e)
                continue

        # RULE 3: artwork -> institution OR artwork -> platform
        if s_type == "artwork" and t_type in (VENUE_TYPES | PLATFORM_TYPES):
            new_type = "EXHIBITED_AT"
            key = (s_id, t_id, new_type)
            if key in seen_keys:
                continue
            seen_keys.add(key)
            new_e = dict(e)
            new_e["edge_type"] = new_type
            new_e["id"] = f"{s_id}--{new_type.lower()}--{t_id}"
            new_e["confidence"] = "high"
            new_e["source_evidence"] = "Task 2 reclassification; artwork→institution/platform (commission or presentation)"
            new_e["signal_id"] = SIGNAL_ID
            artwork_inst_to_exhibited_at += 1
            new_edges.append(new_e)
            continue

        # RULE 4: everything else — keep
        # (platform<->platform, platform<->institution, institution<->institution,
        #  collective<->collective, collective<->practitioner, etc. — partnerships)
        key = (s_id, t_id, "COLLABORATES_WITH")
        if key in seen_keys:
            continue
        seen_keys.add(key)
        kept_as_collaborates += 1
        if s_type not in ("practitioner", "collective") and t_type not in ("practitioner", "collective"):
            flagged_for_review.append({"source": f"{s_name} ({s_type})", "target": f"{t_name} ({t_type})",
                                       "reason": "Non-person partnership — kept as COLLABORATES_WITH"})
        new_edges.append(e)

    # Save
    (SEED / "nodes-final.json").write_text(json.dumps(nodes, indent=2, ensure_ascii=False))
    (SEED / "edges-final.json").write_text(json.dumps(new_edges, indent=2, ensure_ascii=False))

    # Report
    totals_by_type = Counter(e.get("edge_type") for e in new_edges)
    reclassified_total = (reclassified_to_exhibited_at + reclassified_to_influences +
                          reclassified_to_belongs_to + artwork_inst_to_exhibited_at)
    report = {
        "signal_id": SIGNAL_ID,
        "task": "Task 2 — Reclassify COLLABORATES_WITH",
        "edges_reviewed": 248,
        "reclassified_total": reclassified_total,
        "kept_as_collaborates_with": kept_as_collaborates,
        "by_new_type": {
            "EXHIBITED_AT (practitioner→institution)": reclassified_to_exhibited_at,
            "EXHIBITED_AT (artwork→institution/platform)": artwork_inst_to_exhibited_at,
            "INFLUENCES (reversed direction)": reclassified_to_influences,
            "BELONGS_TO": reclassified_to_belongs_to,
        },
        "final_edge_type_counts": dict(totals_by_type),
        "flagged_for_review_count": len(flagged_for_review),
        "flagged_for_review": flagged_for_review,
    }
    (SEED / "_build" / "task2_report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))

    print(f"Edges reviewed:               248 COLLABORATES_WITH")
    print(f"Reclassified total:           {reclassified_total}")
    print(f"  → EXHIBITED_AT (pract→inst): {reclassified_to_exhibited_at}")
    print(f"  → EXHIBITED_AT (artwork→):   {artwork_inst_to_exhibited_at}")
    print(f"  → INFLUENCES (reversed):     {reclassified_to_influences}")
    print(f"  → BELONGS_TO:                {reclassified_to_belongs_to}")
    print(f"Kept as COLLABORATES_WITH:    {kept_as_collaborates}")
    print()
    print(f"Final edge type counts: {dict(totals_by_type)}")
    print(f"Flagged for review: {len(flagged_for_review)}")
    if flagged_for_review:
        print()
        print("Review samples:")
        for fr in flagged_for_review[:15]:
            print(f"  {fr.get('source')} ↔ {fr.get('target')}  — {fr.get('reason')}")


if __name__ == "__main__":
    main()
