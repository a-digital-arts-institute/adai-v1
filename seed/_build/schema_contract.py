"""Machine-readable expression of each schema document's claims.

Companion to seed/_build/audit_schema.py.
See docs/superpowers/specs/2026-05-24-schema-audit-design.md.

CONTRACT_SCHEMA_VERSION participates in the Section D LLM cache key.
Bump it when the structure of EDGE_CLAIMS or any pinned constant changes,
to invalidate cached LLM results.
"""
from dataclasses import dataclass
from typing import Optional, List, Dict, FrozenSet, Tuple

CONTRACT_SCHEMA_VERSION = "1.0"


@dataclass(frozen=True)
class EdgeClaim:
    source_types: Tuple[str, ...]
    target_types: Tuple[str, ...]
    is_invitation: bool = False
    description: str = ""
    ref: str = ""


EDGE_CLAIMS: Dict[str, Dict[str, Optional[EdgeClaim]]] = {
    "EXHIBITED_AT": {
        "skill_md": EdgeClaim(
            source_types=("artwork",),
            target_types=("institution", "platform"),
            description="A specific artwork was shown at a specific institution/platform.",
            ref="SKILL.md §1.4 edge table, line 221",
        ),
        "sources_md": EdgeClaim(
            source_types=("artwork",),
            target_types=("institution", "platform"),
            description="SOURCES.md no longer defines edge shape; defers to SKILL.md (May 2026 cleanup). Mirrors SKILL.md's claim.",
            ref="SOURCES.md ('Edge type contract' section — points to SKILL.md)",
        ),
        "claude_md": EdgeClaim(
            source_types=("artwork",),
            target_types=("institution", "platform"),
            description="A specific artwork was shown at a specific institution/platform.",
            ref="CLAUDE.md edge-types paragraph (Database section, count 305)",
        ),
    },
    "RESPONDS_TO": {
        "skill_md": EdgeClaim(
            source_types=("artwork",),
            target_types=("artwork",),
            is_invitation=True,
            description="This work references or responds to that one. Requires attested artist intent — hard rule: do not infer from style/visual/thematic similarity.",
            ref="SKILL.md §1.4 edge table line 225 + §1.4 'don't infer' hard rule lines 227-231 + §5 Don'ts line 436",
        ),
        "sources_md": EdgeClaim(
            source_types=("artwork",),
            target_types=("artwork",),
            is_invitation=True,
            description="Reserved for practitioner voice; zero by design. Requires evidence of artist intent (statements, interviews, practitioner knowledge), not thematic similarity. Highest-value edge type for Basel-floor practitioner contributions.",
            ref="SOURCES.md line 20 (invitation edge introduction) + line 318 (RESPONDS_TO empty section)",
        ),
        "claude_md": EdgeClaim(
            source_types=("artwork",),
            target_types=("artwork",),
            is_invitation=True,
            description="Empty by design; pipeline refuses to auto-emit. Requires evidence of artist intent (statements, interviews, practitioner contribution), not thematic similarity.",
            ref="CLAUDE.md 'Edge types' paragraph: 'RESPONDS_TO (artwork → artwork) — left at zero because it requires evidence of artist intent'",
        ),
    },
    "CONTESTS": {
        "skill_md": None,
        "sources_md": EdgeClaim(
            source_types=("signal",),
            target_types=("edge",),
            is_invitation=True,
            description="Practitioner contestation of an existing edge. Reserved for first-person testimony. Zero edges by design — 'you don't tell two artists they're in tension with each other, they tell you.'",
            ref="SOURCES.md line 20 (invitation edge introduction) + line 322 (CONTESTS/TENSION_WITH empty section)",
        ),
        "claude_md": None,
    },
    "CREATED_BY": {
        "skill_md": EdgeClaim(
            source_types=("artwork",),
            target_types=("practitioner",),
            description="Who made the artwork.",
            ref="SKILL.md §1.4 edge table, line 216",
        ),
        "sources_md": EdgeClaim(
            source_types=("artwork",),
            target_types=("practitioner",),
            description="Who made it. Count: 339 (as of April 28 state documented in SOURCES.md table). Auto-derive pass explicitly refuses to write CREATED_BY without human ratification; attribution candidates flow into intake_queue as ai_suggestion.",
            ref="SOURCES.md line 295 edge structure table + line 314 (auto-derive refusal clause)",
        ),
        "claude_md": EdgeClaim(
            source_types=("artwork",),
            target_types=("practitioner",),
            description="Who made it. CLAUDE.md mentions count (738, May 2026 post-embedding pass) without re-stating direction; encoded to mirror SKILL.md per the plan's worked-example pattern (CLAUDE.md inherits the seed-research narrative).",
            ref="CLAUDE.md 'Edge types' paragraph (Database section, count 738)",
        ),
    },
    "EMBODIES": {
        "skill_md": EdgeClaim(
            source_types=("artwork",),
            target_types=("concept",),
            description="What the artwork expresses conceptually.",
            ref="SKILL.md §1.4 edge table, line 217",
        ),
        "sources_md": EdgeClaim(
            source_types=("artwork",),
            target_types=("concept",),
            description="What a work is about conceptually. Count: 621. Heuristic EMBODIES from April 22 enrichment pass superseded by 1,035 source-attested EMBODIES from objkt, fxhash, and Wikidata depicts in real-source pass.",
            ref="SOURCES.md line 293 edge structure table + line 377 (Known Gaps #11 EMBODIES edge quality)",
        ),
        "claude_md": EdgeClaim(
            source_types=("artwork",),
            target_types=("concept",),
            description="What the artwork expresses conceptually. CLAUDE.md mentions count (1096) without re-stating direction; encoded to mirror SKILL.md per the worked-example pattern.",
            ref="CLAUDE.md 'Edge types' paragraph (Database section, count 1096)",
        ),
    },
    "PRACTICES": {
        "skill_md": EdgeClaim(
            source_types=("practitioner",),
            target_types=("concept",),
            description="What the practitioner works with. SKILL.md lists target as 'concept / technique'.",
            ref="SKILL.md §1.4 edge table, line 218",
        ),
        "sources_md": EdgeClaim(
            source_types=("practitioner",),
            target_types=("concept",),
            description="What someone works with. Count: 461. SOURCES.md table lists target type as 'concept' only (no 'technique' qualifier, unlike SKILL.md).",
            ref="SOURCES.md line 294 edge structure table",
        ),
        "claude_md": EdgeClaim(
            source_types=("practitioner",),
            target_types=("concept",),
            description="What the practitioner works with. CLAUDE.md mentions count (461) without re-stating direction; encoded to mirror SKILL.md (SKILL.md target is 'concept / technique' but no 'technique' node type exists in canon, so target encoded as ('concept',)).",
            ref="CLAUDE.md 'Edge types' paragraph (Database section, count 461)",
        ),
    },
    "USES_TECHNIQUE": {
        "skill_md": EdgeClaim(
            source_types=("practitioner",),
            target_types=("technique",),
            description="Finer-grained than PRACTICES. SKILL.md lists source as practitioner and target as technique.",
            ref="SKILL.md §1.4 edge table, line 219",
        ),
        "sources_md": EdgeClaim(
            source_types=("artwork",),
            target_types=("concept",),
            description="What method/tool the work employs. Count: 75. Note: SOURCES.md table lists source as artwork (not practitioner as in SKILL.md) and target as concept (not technique). This is a documented cross-document discrepancy.",
            ref="SOURCES.md line 300 edge structure table ('artwork → concept, What method/tool the work employs')",
        ),
        "claude_md": EdgeClaim(
            source_types=("practitioner",),
            target_types=("concept",),
            description="Finer-grained than PRACTICES. CLAUDE.md mentions count (102) without re-stating direction; encoded to mirror SKILL.md's practitioner-source (SKILL.md target is 'technique' but no 'technique' node type exists, so encoded as 'concept' which is the actual seed target per SOURCES.md).",
            ref="CLAUDE.md 'Edge types' paragraph (Database section, count 102)",
        ),
    },
    "BELONGS_TO": {
        "skill_md": EdgeClaim(
            source_types=("practitioner",),
            target_types=("collective", "scene"),
            description="Membership in a collective or scene. SKILL.md lists both collective and scene as valid target types.",
            ref="SKILL.md §1.4 edge table, line 220",
        ),
        "sources_md": EdgeClaim(
            source_types=("practitioner",),
            target_types=("scene",),
            description="Which community or practice tradition. Count: 155. SOURCES.md table lists target type as 'scene' only — does not mention 'collective' as a valid target (unlike SKILL.md).",
            ref="SOURCES.md line 299 edge structure table",
        ),
        "claude_md": EdgeClaim(
            source_types=("practitioner",),
            target_types=("collective", "scene"),
            description="Membership in a collective or scene. CLAUDE.md mentions count (193) without re-stating direction; encoded to mirror SKILL.md.",
            ref="CLAUDE.md 'Edge types' paragraph (Database section, count 193)",
        ),
    },
    "CLASSIFIED_BY": {
        "skill_md": EdgeClaim(
            source_types=("any",),
            target_types=("classification_regime",),
            description="Who positioned this node — any node type can be classified by a classification_regime.",
            ref="SKILL.md §1.4 edge table, line 222",
        ),
        "sources_md": EdgeClaim(
            source_types=("any",),
            target_types=("classification_regime",),
            description="Provenance: which research lens saw this node. Count: 283. CLASSIFIED_BY edges are authored in seed/edges.json, not auto-injected.",
            ref="SOURCES.md line 297 edge structure table ('any → classification regime, Provenance: which research lens saw this node')",
        ),
        "claude_md": EdgeClaim(
            source_types=("any",),
            target_types=("classification_regime",),
            description="Any node → classification_regime that actively positioned it. Count: 295. Source/target explicitly stated in the paragraph ('any node → classification_regime').",
            ref="CLAUDE.md 'Edge types' paragraph: 'CLASSIFIED_BY (295 — any node → classification_regime that actively positioned it)'",
        ),
    },
    "COLLABORATES_WITH": {
        "skill_md": EdgeClaim(
            source_types=("practitioner",),
            target_types=("practitioner",),
            description="Symmetric creative collaboration between practitioners.",
            ref="SKILL.md §1.4 edge table, line 223",
        ),
        "sources_md": EdgeClaim(
            source_types=("practitioner",),
            target_types=("practitioner",),
            description="Actual creative collaboration. Count: 183. The enrichment pass reclassified polluted COLLABORATES_WITH edges into proper types (EXHIBITED_AT, INFLUENCES, BELONGS_TO).",
            ref="SOURCES.md line 298 edge structure table + line 121 (enrichment pass reclassification note)",
        ),
        "claude_md": EdgeClaim(
            source_types=("practitioner",),
            target_types=("practitioner",),
            description="Symmetric creative collaboration between practitioners. CLAUDE.md mentions count (183) without re-stating direction; encoded to mirror SKILL.md.",
            ref="CLAUDE.md 'Edge types' paragraph (Database section, count 183)",
        ),
    },
    "INFLUENCES": {
        "skill_md": EdgeClaim(
            source_types=("practitioner",),
            target_types=("practitioner",),
            description="Who shaped whose practice. Needs attestation — hard rule: do not infer from style/visual/thematic similarity. Requires attested statement (interview, essay, self-report) with a URL anchoring the claim.",
            ref="SKILL.md §1.4 edge table line 224 + hard rule lines 227-231",
        ),
        "sources_md": EdgeClaim(
            source_types=("practitioner",),
            target_types=("practitioner",),
            description="Who shaped whose practice. Only 4 edges — deliberately sparse. Influence is directional and claims something specific; making that claim from the outside without practitioner confirmation is editorially risky. More will come from practitioner contributions. Pipeline refuses to auto-emit.",
            ref="SOURCES.md line 301 edge structure table + line 314 (auto-derive refusal) + line 320 (INFLUENCES sparseness rationale)",
        ),
        "claude_md": EdgeClaim(
            source_types=("practitioner",),
            target_types=("practitioner",),
            description="Who shaped whose practice. CLAUDE.md mentions count (4) and that the pipeline refuses to auto-emit INFLUENCES; encoded to mirror SKILL.md.",
            ref="CLAUDE.md 'Edge types' paragraph + 'pipeline refuses to auto-emit INFLUENCES or RESPONDS_TO' clause",
        ),
    },
    "TENSION_WITH": {
        "skill_md": None,
        "sources_md": EdgeClaim(
            source_types=("concept",),
            target_types=("concept",),
            is_invitation=True,
            description="Tension between concepts that don't sit easily together. Zero edges by design — requires practitioner voice. 'You don't tell two artists they're in tension with each other, they tell you.'",
            ref="SOURCES.md line 20 (invitation edge introduction: 'concept ↔ concept') + line 322 (CONTESTS/TENSION_WITH empty section)",
        ),
        "claude_md": None,
    },
    "STYLE_KIN": {
        "skill_md": None,
        "sources_md": EdgeClaim(
            source_types=("practitioner",),
            target_types=("practitioner",),
            is_invitation=False,
            description="Stylistic adjacency, derived from cosine over each practitioner's style centroid (mean of artwork vectors they CREATED_BY). Auto-derived, threshold τ_kin = 0.91.",
            ref="SOURCES.md line 309 (embedding-pipeline table)",
        ),
        "claude_md": EdgeClaim(
            source_types=("practitioner",),
            target_types=("practitioner",),
            description="Stylistic adjacency, auto-derived from cosine over each practitioner's style centroid (mean of artwork vectors they CREATED_BY). Stored bidirectionally. Above τ_kin=0.91. Count: 748 (May 2026). Rendered dashed in /field. Pipeline is the sole author — never hand-edit these rows.",
            ref="CLAUDE.md 'Edge types' paragraph: 'STYLE_KIN (748, practitioner ↔ practitioner, stored bidirectionally)' + Embedding pipeline section",
        ),
    },
    "VISUALLY_AFFINE": {
        "skill_md": None,
        "sources_md": EdgeClaim(
            source_types=("artwork",),
            target_types=("artwork",),
            is_invitation=False,
            description="Cross-artist visual rhymes from artwork-vector cosine, gated to different creators. Auto-derived, threshold τ_visual = 0.84.",
            ref="SOURCES.md line 310 (embedding-pipeline table)",
        ),
        "claude_md": EdgeClaim(
            source_types=("artwork",),
            target_types=("artwork",),
            description="Cross-artist visual rhymes from artwork-vector cosine, gated to different creators. Stored bidirectionally. Above τ_visual=0.84. Count: 418 (May 2026). Rendered dashed in /field. Pipeline is the sole author — never hand-edit these rows.",
            ref="CLAUDE.md 'Edge types' paragraph: 'VISUALLY_AFFINE (418, artwork ↔ artwork, also bidirectional)' + Embedding pipeline section",
        ),
    },
}


# Pinned constants — additions/edits require a code commit.
# See spec §C.1 — pinning these keeps acceptance criterion #5 (byte-identical re-runs) intact.

GENERIC_TITLE_DENYLIST: FrozenSet[str] = frozenset([
    "untitled", "untitled.", "untitled (no.1)", "untitled (no.2)",
    "sin título", "sans titre", "ohne titel", "senza titolo",
    "black hole", "numbers", "composition", "study", "no title",
    "1", "i", "n/a",
])

CRYPTO_ERA_SLUG_TOKENS: FrozenSet[str] = frozenset([
    "on-chain", "nft", "dao", "blockchain", "smart-contract",
    "tezos", "ethereum", "web3", "crypto",
])

ERA_VIOLATION_WHITELIST: FrozenSet[Tuple[str, str]] = frozenset([
    # (source_artwork_id, target_concept_id) pairs that are pre-2009
    # but legitimately crypto-related (curator-managed). Empty initially.
])

KNOWN_LEGACY_EDGE_TYPES: FrozenSet[str] = frozenset([
    "RELATED_TO",  # legacy seed.ts path; CLAUDE.md flags it
])

INVITATION_STATUS_SET: FrozenSet[str] = frozenset([
    "placeholder", "stub", "anchor", "draft", "bridge",
])

AUTOMATED_WRITER_PREFIXES: Tuple[str, ...] = ("gatherer-", "embedding-")
