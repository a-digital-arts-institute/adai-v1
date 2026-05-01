"""
Build seed/enrichment-trace.json — final processing trace.

Aggregates counts from the whole Task 0-5 enrichment pipeline.
"""
from __future__ import annotations
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "seed"
SIGNAL_ID = "enrichment-seed-canon-v1-2026-04"


def main():
    nodes = json.loads((SEED / "nodes-final.json").read_text())
    edges = json.loads((SEED / "edges-final.json").read_text())

    # Load all task reports for aggregation
    norm_rep = json.loads((SEED / "normalisation-report.json").read_text())
    t1_rep = json.loads((SEED / "_build" / "task1_report.json").read_text())
    t2_rep = json.loads((SEED / "_build" / "task2_report.json").read_text())
    t3_rep = json.loads((SEED / "_build" / "task3_report.json").read_text())
    t4_rep = json.loads((SEED / "_build" / "task4_report.json").read_text())
    t5_rep = json.loads((SEED / "_build" / "task5_report.json").read_text())

    etypes = Counter(e.get("edge_type") for e in edges)
    ntypes = Counter(n.get("type") for n in nodes)

    # Count edges by signal (enrichment-provenance vs original)
    orig_edges = sum(1 for e in edges if e.get("signal_id") != SIGNAL_ID
                      and "enrichment" not in (e.get("source_evidence") or "").lower())
    enrich_edges = len(edges) - orig_edges

    # Count nodes generated in enrichment
    enrich_nodes = sum(1 for n in nodes
                       if ((n.get("metadata") or {}) if isinstance(n.get("metadata"), dict)
                           else json.loads(n.get("metadata") or '{}')).get("generated_by") == SIGNAL_ID)

    practs_confirmed = sum(1 for n in nodes if n.get("type") == "practitioner"
                           and ((n.get("metadata") or {}) if isinstance(n.get("metadata"), dict)
                                else json.loads(n.get("metadata") or '{}')).get("status") == "confirmed")

    trace = {
        "signal_id": SIGNAL_ID,
        "spec": "Edge Enrichment Spec — A(DAI) Seed Canon v1",
        "completed_at": "2026-04-22",

        "source": ("seed/nodes.json + seed/edges.json original metadata (extracted from practitioner "
                    "full_profile objects); plus Claude training knowledge for the 71 profile-deepening "
                    "additions (42 intentional-draft deepenings + 29 stub promotions). All edges derived "
                    "from normalised metadata fields. No scraping."),
        "source_origin": "ai_assisted",

        # --- Per-task aggregates ---
        "task_0_normalisation": {
            "task_name": "Profile normalisation + cleanup",
            "practitioners_confirmed_total": practs_confirmed,  # should be 114 after Interdependence retype
            "canonical_fields_populated_for_every_confirmed": [
                "practice_summary", "methodology", "medium", "key_works",
                "exhibitions", "scene_affiliation", "collaborators",
                "commons_summary", "governance_summary",
            ],
            "stubs_kept_as_anchors": ["Sol LeWitt", "Gilbert Simondon", "Augusto de Campos"],
            "stubs_promoted_count": 29,
            "stubs_retargeted_count": 19,
            "stubs_removed_count": 69,
            "auto_injected_adai_root_removed": True,
            "single_canon_regime_id": "classification_regime:a(dai) seed canon v1 (april 2026)",
            "bogus_nodes_dropped": ["practitioner:audit (misingested audit metadata)"],
            "interdependence_retyped": "practitioner -> project",
        },

        "task_1_exhibited_at": {
            "task_name": "EXHIBITED_AT edges from metadata.exhibitions",
            "edges_created_before_cleanup": 307,
            "institution_nodes_created_before_cleanup": 148,
            "cleanup_applied": {
                "duplicate_merges": ["Pompidou Paris→Pompidou", "V&A London→V&A",
                                     "Venice Biennale 2001/2015→Venice Biennale",
                                     "Tate Modern/Britain→Tate", "ZKM variants",
                                     "Onassis Cultural Centre→Onassis Stegi",
                                     "3 Furtherfield spaces→single Furtherfield",
                                     "Whitney Biennial→Whitney Museum"],
                "type_retypes": ["SuperRare→platform:", "Nifty Gateway→platform:",
                                 "Outland→publication:", "fxhash→existing platform"],
                "fragment_drops": ["Haus", "Gallery", "Museum", "Palais", "Physical",
                                   "Hyperdub 10", "Processing Foundation community",
                                   "African Diaspora", "Compart database",
                                   "Computer Art Exhibitions 1968-70"],
                "retarget": "'AI. Whitney Biennial' → institution:whitney museum",
            },
            "final_exhibited_at_edges": etypes.get("EXHIBITED_AT", 0),
            "final_institution_nodes": ntypes.get("institution", 0),
        },

        "task_2_reclassify_collaborates_with": {
            "task_name": "Reclassify polluted COLLABORATES_WITH",
            "reclassified_total": 14,
            "to_EXHIBITED_AT_practitioner_to_institution": 6,
            "to_EXHIBITED_AT_artwork_to_venue": 6,
            "to_INFLUENCES_reversed": 2,
            "stub_anchor_INFLUENCES_forced": 3,  # Sol LeWitt, Simondon, de Campos
            "heuristic_false_positive_removed": "Ben Fry → Casey Reas INFLUENCES (parser misattributed 'lineage' keyword)",
            "non_person_collaborations_kept": 17,
            "final_collaborates_with": etypes.get("COLLABORATES_WITH", 0),
            "final_influences": etypes.get("INFLUENCES", 0),
        },

        "task_3_embodies": {
            "task_name": "EMBODIES + USES_TECHNIQUE edges on artworks",
            "method_note": (
                "EMBODIES edges were produced by heuristic keyword matching against a curated "
                "theme vocabulary of ~55 themes, not by per-artwork editorial reading. "
                "20 high-visibility artworks received hand-assigned edges after editorial research. "
                "All edges marked confidence: 'medium'. Future passes (practitioner review of their "
                "own artworks, targeted editorial audit of 20-30 highest-visibility practitioners "
                "pre-Basel) will upgrade some to 'high' and remove false-positives. "
                "Claude's own output is NOT re-audited by Claude — circular."
            ),
            "artworks_processed": 333,
            "artworks_hand_assigned_editorial": 20,
            "artworks_heuristic_assigned": 313,
            "artworks_skipped_no_description": 0,
            "embodies_edges": etypes.get("EMBODIES", 0),
            "uses_technique_edges": etypes.get("USES_TECHNIQUE", 0),
            "new_thematic_concepts_created": 63,
            "keyword_tightenings_applied": [
                "'labour and work' — dropped 'work/working/works' (kept 'labour/labor/workers')",
                "'writing and textuality' — dropped bare 'text/textual/writing' (kept 'poetry/novel/literature')",
                "'immersion and installation' — dropped bare 'installation' (kept 'immersive/multi-channel')",
            ],
        },

        "task_4_belongs_to": {
            "task_name": "BELONGS_TO scene edges with editorial re-audit",
            "scene_count": ntypes.get("scene", 0),
            "belongs_to_edges": etypes.get("BELONGS_TO", 0),
            "practitioners_with_scene_edges": 91,
            "audit_removals": [
                "digital-arts theory (theorists positioned via INFLUENCES+PRACTICES, not scenes)",
                "Asia-Pacific digital art (geographic label, not a practice)",
            ],
            "audit_renames": [
                "Black digital art → race technology and digital culture (describes the work, not the people)",
            ],
            "audit_additions": [
                "new media art (established field usage)",
                "performance art (practitioner language)",
                "critical tech art (practitioner language)",
            ],
            "grounding_distribution": {
                "SOURCES.md": 10,
                "outline.yaml": 1,
                "practitioner_language": 9,
                "established_field_usage": 4,
                "claude_inference_flagged": 1,
            },
            "claude_inference_flagged_scene": {
                "name": "infrastructure and artist-run platforms",
                "members": 3,
                "note": "composite label I created; components (digital-art infrastructure, artist-run platforms) are practitioner language",
            },
            "under_populated_1_member": ["commons and open-source culture"],
        },

        "task_5_dedup": {
            "task_name": "Deduplicate edges",
            "exact_duplicates_removed": t5_rep.get("exact_duplicates_removed", 0),
            "cross_type_suppressed_generic_to_specific": t5_rep.get("cross_type_suppressed", 0),
            "symmetric_collaborates_with_collapsed": t5_rep.get("symmetric_collaborates_with_collapsed", 0),
        },

        # --- Final totals ---
        "practitioners_processed": practs_confirmed,
        "artworks_processed": ntypes.get("artwork", 0),
        "profiles_deepened": 71,
        "profiles_deepened_source_origin": "ai_assisted",

        "new_edges_created": {
            "EXHIBITED_AT": etypes.get("EXHIBITED_AT", 0),
            "INFLUENCES": etypes.get("INFLUENCES", 0),
            "EMBODIES": etypes.get("EMBODIES", 0),
            "USES_TECHNIQUE": etypes.get("USES_TECHNIQUE", 0),
            "BELONGS_TO": etypes.get("BELONGS_TO", 0),
            "total_new_typed_edges": (etypes.get("EXHIBITED_AT", 0) + etypes.get("INFLUENCES", 0)
                                       + etypes.get("EMBODIES", 0) + etypes.get("USES_TECHNIQUE", 0)
                                       + etypes.get("BELONGS_TO", 0)),
        },
        "edges_reclassified_task_2": 14,
        "duplicates_found_total": (t5_rep.get("exact_duplicates_removed", 0)
                                     + t5_rep.get("cross_type_suppressed", 0)
                                     + t5_rep.get("symmetric_collaborates_with_collapsed", 0)),

        "new_nodes_created": {
            "institution": ntypes.get("institution", 0) - 3,  # 3 existed before
            "scene": ntypes.get("scene", 0),
            "concept": 63,  # task 3 thematic
            "artwork": 79,  # task 0c promotions
        },

        # --- Frontier signals ---
        "frontier_signals": [
            ("The edge vocabulary (PRACTICES/EMBODIES/USES_TECHNIQUE/EXHIBITED_AT/CREATED_BY/"
             "COLLABORATES_WITH/INFLUENCES/BELONGS_TO/CLASSIFIED_BY) was adequate for the seed "
             "but the gatherer will encounter practices that don't fit — especially in "
             "non-Western, bio-digital, and robotic/physical-computing traditions. Those resistances "
             "are editorial agenda, not failures."),
            ("Non-person partnerships (platform↔institution↔platform) were kept as COLLABORATES_WITH "
             "because no better edge type exists. A 'PARTNERS_WITH' or similar organisational-scale "
             "edge type may be needed if this class of relationship becomes important."),
            ("'Claude inference' scene 'infrastructure and artist-run platforms' — the components "
             "are practitioner language but the composite label was my synthesis. Flagged for human "
             "editorial decision."),
        ],

        "tier_1_sources_used": [
            "Art Blocks Hasura API (platform data)",
            "Wikidata SPARQL (CC0)",
            "MoMA Collection CSV (CC0)",
            "Met Open Access API (CC0 / public domain)",
            "fxhash API (platform data)",
            "Rhizome ArtBase SPARQL (open access)",
        ],

        "tier_2_sources_pending": [
            "Ars Electronica — requires institutional outreach",
            "ZKM — requires institutional outreach",
            "ELMCIP — requires institutional outreach",
            "ADA (Archive of Digital Art) — requires institutional outreach",
            "ISEA Archives — requires institutional outreach",
            "Asia Art Archive — requires institutional outreach",
            "ARTLINKART — requires institutional outreach",
            "Chronus Art Center — requires institutional outreach",
            "FILE Festival — requires institutional outreach",
            "African Digital Art Network — requires institutional outreach",
            "Sharjah Art Foundation — requires institutional outreach",
        ],

        "known_gaps": [
            "fxhash/Tezos ecosystem thin — only Art Blocks artworks ingested",
            "Second-wave AI art (post-2020 diffusion/LLM practitioners) underrepresented",
            "Pre-boom conceptual blockchain art limited",
            "Non-Western practices limited to English-language documentation",
            "Sound art and algorithmic music: boosted from 2 to 6 practitioners in this pass (Nicolai, Fell, Ablinger, Haswell, Xenakis, + existing); should be 10+ in future pass",
            "No EXHIBITED_AT edges from institutional records — requires Tier 2 partnerships",
            "Early computer art pioneers improved but still sparse (Nees, Mallary, Xenakis, Perlin, Moscati, Knowlton added)",
            "0% artwork image coverage — deferred to image pipeline",
            "Robotic/physical-computing and bio-digital traditions underrepresented (Stelarc, Moon Ribas, Amy Karle absent; Sougwen Chung present but classified under creative-coding)",
        ],

        "bias_report": {
            "source": ("Seed profiles: 44 from human editorial research (Pass 1+2, human_secondary), "
                        "71 deepened/promoted by Claude from training knowledge (ai_assisted). "
                        "All structured data from Tier 1 licensed/CC0 sources only. No scraping."),
            "geographic_bias": ("Euro-American institutional + crypto-native overrepresentation. "
                                 "Non-Western coverage limited to practitioners with English-language "
                                 "documentation. Lu Yang (China) and Giorgio Moscati (Brazil) added "
                                 "via promotion but coverage remains thin."),
            "temporal_bias": ("Contemporary (post-2010) overrepresentation. Pre-2000 computational "
                                "pioneers augmented in this pass (Nees, Mallary, Xenakis, Perlin, "
                                "Moscati, Knowlton promoted from stubs) but still sparse relative to "
                                "field significance."),
            "epistemological_bias": ("Institutional + platform legibility favoured. Practices without "
                                      "API-accessible archives (sound art, VJ culture, demoscene, "
                                      "modular synthesis) structurally underrepresented in Tier 1."),
            "methodology": ("See SOURCES.md for full selection methodology. The theme vocabulary for "
                              "EMBODIES was synthesised by Claude from digital-arts field reading; "
                              "practitioner review will reveal where the vocabulary is off or missing."),
        },

        "final_graph_totals": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "node_types": dict(ntypes),
            "edge_types": dict(etypes),
        },
    }

    (SEED / "enrichment-trace.json").write_text(json.dumps(trace, indent=2, ensure_ascii=False))
    print(f"Wrote seed/enrichment-trace.json")
    print(f"\nFinal graph:")
    print(f"  Nodes: {len(nodes)}")
    print(f"  Edges: {len(edges)}")
    print(f"  Node types: {dict(ntypes)}")
    print(f"  Edge types: {dict(etypes)}")


if __name__ == "__main__":
    main()
