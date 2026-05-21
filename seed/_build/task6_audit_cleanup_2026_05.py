"""
Task 6 — 2026-05-20 enrichment-pass audit cleanup.

Applies Irina's audit decisions deterministically to seed/edges.json and
seed/signals.json. Three buckets of rule-violating edges get retired,
nineteen are repaired in place. Re-running is idempotent.

Buckets handled (counts verified against seed/edges.json on 2026-05-20):

  A. 75 USES_TECHNIQUE edges with artwork source, created_by='gatherer-enrichment'
     Root cause is in task3_embodies.py (USES_TECHNIQUE emitter, retired in v3).
     Of the 75:
       - 19 reclassified to EMBODIES because the technique-concept is the
         work's subject (not its medium). Each pair listed in REPAIRS.
       - 56 deleted because the medium info already lives in
         nodes[].metadata.medium, and the edge would just duplicate it as
         the wrong relation type.

  B. 3 INFLUENCES edges, created_by='gatherer-enrichment', source_evidence
     = "Kept-stub anchor rule: target is a historical-influence stub
     preserved for INFLUENCES". The producing script is not committed to
     this repo; the rule was applied via an ad-hoc one-shot. Per
     SKILL.md §1.4 INFLUENCES requires attested artist intent (statement,
     interview, first-person attestation) — never a heuristic. All three
     are deleted.

  C. 5 BELONGS_TO edges, created_by='gatherer-theorist-completion', placing
     theorists (Galloway, Hayles, Chun) into scenes. Producing script also
     not committed. Contradicts seed/COVERAGE.md:119 which records the
     Task 4 audit decision: "Removed digital-arts theory (theorists
     positioned via INFLUENCES)". All five are deleted.

Outputs:
  - seed/edges.json   — rewritten with cleanup applied
  - seed/signals.json — appends signal:cleanup-enrichment-audit-2026-05
                        (idempotent: skipped if already present)

Run from anywhere:
  python3 seed/_build/task6_audit_cleanup_2026_05.py
"""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "seed"
EDGES_PATH = SEED / "edges.json"
SIGNALS_PATH = SEED / "signals.json"

CLEANUP_SIGNAL_ID = "signal:cleanup-enrichment-audit-2026-05"
CLEANUP_CREATED_BY = "audit-cleanup-2026-05"

# 19 USES_TECHNIQUE edges to repair → EMBODIES. Concept is the work's subject.
# Pair = (source_id, target_id). Edge_type implied (USES_TECHNIQUE in, EMBODIES out).
REPAIRS: set[tuple[str, str]] = {
    ("artwork:is art", "concept:smart contract"),
    ("artwork:is art", "concept:on-chain generative art"),
    ("artwork:smart contract as cultural object", "concept:smart contract"),
    ("artwork:digital zones of immaterial pictorial sensibility", "concept:smart contract"),
    ("artwork:plantoid", "concept:on-chain generative art"),
    ("artwork:chromie squiggle", "concept:on-chain generative art"),
    ("artwork:art blocks 500 complete collection", "concept:on-chain generative art"),
    ("artwork:fxh protocol art coins", "concept:on-chain generative art"),
    ("artwork:jonas lund token jlt", "concept:smart contract"),
    ("artwork:holly+ dao", "concept:smart contract"),
    ("artwork:daily program season 1", "concept:smart contract"),
    ("artwork:how a machine learns and fails: a grammar of error for artificial intelligence",
     "concept:machine learning"),
    ("artwork:the eye of the master: a social history of artificial intelligence",
     "concept:machine learning"),
    ("artwork:learning to see", "concept:machine learning"),
    ("artwork:haveibeentrainedcom", "concept:diffusion models"),
    ("artwork:zizi: queering the dataset", "concept:generative adversarial networks"),
    ("artwork:ai generated nude portrait #1", "concept:generative adversarial networks"),
    ("artwork:memories of passersby i", "concept:generative adversarial networks"),
    ("artwork:386dx", "concept:text-to-speech"),
}

# 8 orphan edges to delete unconditionally. (source_id, target_id, edge_type).
ORPHAN_DELETES: set[tuple[str, str, str]] = {
    # 3 INFLUENCES — "Kept-stub anchor rule" (no URL attestation)
    ("practitioner:sol lewitt", "practitioner:casey reas", "INFLUENCES"),
    ("practitioner:gilbert simondon", "practitioner:yuk hui", "INFLUENCES"),
    ("practitioner:augusto de campos", "practitioner:waldemar cordeiro", "INFLUENCES"),
    # 5 gatherer-theorist-completion BELONGS_TO (theorists shouldn't be in scenes)
    ("practitioner:alexander r galloway", "scene:software art", "BELONGS_TO"),
    ("practitioner:alexander r galloway", "scene:tactical media", "BELONGS_TO"),
    ("practitioner:n katherine hayles", "scene:software art", "BELONGS_TO"),
    ("practitioner:wendy hui kyong chun", "scene:software art", "BELONGS_TO"),
    ("practitioner:wendy hui kyong chun", "scene:race technology and digital culture", "BELONGS_TO"),
}


def is_enrichment_artwork_uses_technique(e: dict) -> bool:
    return (
        e.get("created_by") == "gatherer-enrichment"
        and e.get("edge_type") == "USES_TECHNIQUE"
        and isinstance(e.get("source_id"), str)
        and e["source_id"].startswith("artwork:")
    )


def cleanup_edges(edges: list[dict]) -> tuple[list[dict], dict[str, int]]:
    stats = {
        "repaired": 0,
        "deleted_uses_technique_medium_only": 0,
        "deleted_orphan_influences": 0,
        "deleted_orphan_theorist_belongs_to": 0,
    }
    kept: list[dict] = []
    for e in edges:
        key3 = (e.get("source_id"), e.get("target_id"), e.get("edge_type"))
        if key3 in ORPHAN_DELETES:
            if e.get("edge_type") == "INFLUENCES":
                stats["deleted_orphan_influences"] += 1
            else:
                stats["deleted_orphan_theorist_belongs_to"] += 1
            continue

        if is_enrichment_artwork_uses_technique(e):
            pair = (e["source_id"], e["target_id"])
            if pair in REPAIRS:
                repaired = dict(e)
                repaired["id"] = f"{e['source_id']}--embodies--{e['target_id']}"
                repaired["edge_type"] = "EMBODIES"
                repaired["signal_id"] = CLEANUP_SIGNAL_ID
                repaired["created_by"] = CLEANUP_CREATED_BY
                repaired["source_evidence"] = (
                    "Audit 2026-05-20: reclassified from USES_TECHNIQUE because the "
                    "concept is the work's subject, not its medium."
                )
                kept.append(repaired)
                stats["repaired"] += 1
            else:
                stats["deleted_uses_technique_medium_only"] += 1
            continue

        kept.append(e)

    return kept, stats


def ensure_signal(signals: list[dict]) -> bool:
    """Append the cleanup signal if it isn't already present. Returns True if appended."""
    if any(s.get("id") == CLEANUP_SIGNAL_ID for s in signals):
        return False
    signals.append({
        "id": CLEANUP_SIGNAL_ID,
        "title": "Audit 2026-05-20 cleanup: retired 83 rule-violating edges, reclassified 19 to EMBODIES",
        "source_url": None,
        "source_type": "audit",
        "cla_layer": None,
        "summary": (
            "Retired 75 USES_TECHNIQUE edges with artwork sources (root cause in "
            "task3_embodies.py, fixed in v3) — 19 reclassified to EMBODIES where "
            "the concept is the subject, 56 deleted as medium-only duplicates of "
            "metadata.medium. Also retired 3 INFLUENCES and 5 BELONGS_TO theorist "
            "edges produced by ad-hoc gatherers without URL attestation."
        ),
        "content": (
            "See seed/_build/task6_audit_cleanup_2026_05.py for the deterministic "
            "cleanup script. Root-cause fix lives in seed/_build/task3_embodies.py "
            "(USES_TECHNIQUE emission retired). Defense-in-depth guards live in "
            "src/utils/edge-types.ts."
        ),
        "submitted_by": "contributor:migration",
        "confidence": "high",
        "lived_experience": False,
        "created_at": "2026-05-20T00:00:00Z",
        "consent_scope": "full_commons",
        "consent_attribution": "attributed",
        "consent_revocable": False,
        "processing_trace": None,
        "source_origin": "human_secondary",
        "batch_id": "cleanup-enrichment-2026-05",
        "status": "active",
        "provenance_chain": None,
    })
    return True


def main() -> None:
    edges = json.loads(EDGES_PATH.read_text())
    signals = json.loads(SIGNALS_PATH.read_text())

    cleaned, stats = cleanup_edges(edges)
    signal_added = ensure_signal(signals)

    EDGES_PATH.write_text(json.dumps(cleaned, indent=2, ensure_ascii=False) + "\n")
    SIGNALS_PATH.write_text(json.dumps(signals, indent=2, ensure_ascii=False) + "\n")

    total_deleted = (
        stats["deleted_uses_technique_medium_only"]
        + stats["deleted_orphan_influences"]
        + stats["deleted_orphan_theorist_belongs_to"]
    )
    print(f"Edges in → out: {len(edges)} → {len(cleaned)}")
    print(f"  Repaired (USES_TECHNIQUE → EMBODIES): {stats['repaired']}")
    print(f"  Deleted USES_TECHNIQUE (medium-only): {stats['deleted_uses_technique_medium_only']}")
    print(f"  Deleted orphan INFLUENCES:            {stats['deleted_orphan_influences']}")
    print(f"  Deleted orphan theorist BELONGS_TO:   {stats['deleted_orphan_theorist_belongs_to']}")
    print(f"  Total deleted:                        {total_deleted}")
    print(f"Signal {CLEANUP_SIGNAL_ID}: {'appended' if signal_added else 'already present (skipped)'}")


if __name__ == "__main__":
    main()
