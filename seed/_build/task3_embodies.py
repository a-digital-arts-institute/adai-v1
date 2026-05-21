"""
Task 3 (v2): Add EMBODIES + USES_TECHNIQUE edges to artwork nodes.

IDEMPOTENT: On each run, first removes any previously-added Task 3 edges and concepts,
then re-runs with current keyword sets + hand-assignments.

Changes from v1 (per user direction after checkpoint):
  A. Added title-match fallback so Starmirror / The Call / similar parenthetical variants resolve
  B. Tightened 'labour and work' keywords (dropped "work"/"working"/"works")
  C1. Tightened 'writing and textuality' (dropped bare "text"/"textual"/"writing")
  C2. Tightened 'immersion and installation' (dropped bare "installation")
  D. Hand-assigned EMBODIES for ~16 high-visibility 0-EMBODIES artworks (editorial, not keyword)

All EMBODIES and USES_TECHNIQUE edges tagged confidence: "medium".
Hand-assignments also "medium" — future editorial/practitioner-review passes upgrade to "high".
"""
from __future__ import annotations
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "seed"
SIGNAL_ID = "enrichment-seed-canon-v1-2026-04"

# ============================================================================
# THEME VOCABULARY (tightened per Task 3 checkpoint feedback)
# ============================================================================

THEMES: dict[str, list[str]] = {
    # --- Body, identity, gender ---
    "embodiment": ["body", "bodies", "embodied", "embodiment", "corporeal", "flesh", "skin", "blood"],
    "avatar and persona": ["avatar", "persona", "virtual body", "digital body", "self-portrait", "selfie"],
    "gender and non-binary identity": ["gender", "non-binary", "trans ", "queer", "feminist", "feminism",
                                        "gendered", "uterus", "reproductive"],
    "race and Blackness": ["black", "blackness", "race", "racial", "african", "diaspora", "african american"],
    "coloniality and decolonial practice": ["colonial", "colonialism", "decolonial", "postcolonial",
                                             "imperial", "sovereignty", "slave", "slavery"],

    # --- Memory, archive, time ---
    "memory and remembering": ["memory", "memories", "remember", "remembrance", "forgetting", "loss",
                                "amnesia", "nostalgia"],
    "archive and preservation": ["archive", "archives", "archival", "preservation", "preserving",
                                  "conservation", "record"],
    "time and duration": ["duration", "durational", "temporality", "slowness", "slow",
                           "real-time", "ephemeral"],
    "obsolescence and decay": ["obsolete", "obsolescence", "decay", "ageing", "ruin", "abandoned",
                                "defunct", "discontinued"],

    # --- Infrastructure & network ---
    "infrastructure": ["infrastructure", "infrastructural", "cable", "pipeline",
                        "back-end", "backend", "substrate"],
    "platform and protocol": ["platform", "protocol", "smart contract", "token", "mint", "minting",
                               "marketplace", "blockchain"],
    "internet and web culture": ["internet", "web ", "browser", "html", "url", "website", "vernacular web",
                                  "amateur web", "geocities"],
    "surveillance": ["surveillance", "observation", "watching", "monitor", "monitoring", "spying",
                      "tracking", "cctv"],
    "data and dataset": ["dataset", "data set", "corpus", "training data", "training set"],

    # --- Labour, economy, care (TIGHTENED: B) ---
    "labour and work": ["labour", "labor", "alienation", "workers", "employment",
                         "wage ", "exploitation", "care work"],
    "platform labour and feminised labour": ["domestic labour", "housework", "influencer", "feminised",
                                              "gendered labour", "care work"],
    "attention and focus": ["attention", "distraction", "consciousness", "absorption"],
    "commons and open source": ["commons", "open source", "open-source", "free software", "libre",
                                 "creative commons", "public domain", "cc0"],
    "community and collective practice": ["collective", "community", "collaborative", "participatory",
                                           "collaboration", "co-authorship"],
    "governance and authority": ["governance", "authority", "sovereignty", "dao",
                                  "voting", "consent"],

    # --- Authorship & reproduction ---
    "authorship and attribution": ["authorship", "attribution", "credit", "signature",
                                    "pseudonym", "anonymous"],
    "reproduction and remix": ["remix", "remake", "copy", "clone",
                                "duplication", "appropriation", "sampling"],

    # --- AI, machine thought ---
    "machine intelligence and AI autonomy": ["autonomous", "machine intelligence",
                                              "artificial intelligence", "ai system", "neural",
                                              "self-organising"],
    "machine vision and classification": ["machine vision", "classification", "labeling", "labels",
                                           "image recognition", "object detection", "imagenet"],
    "generative systems and rule": ["algorithm", "generative", "rule", "rules-based", "procedural",
                                     "emergent", "emergence", "stochastic", "randomness"],
    "latent space and embedding": ["latent", "embedding", "embeddings", "vector space",
                                    "representation learning"],

    # --- Politics, power, violence ---
    "power and politics": ["political", "politics", "hegemon", "capital", "capitalism",
                            "authoritarian"],
    "violence and conflict": ["violence", "war", "conflict", "violent", "torture"],
    "borders and migration": ["border", "borders", "migration", "migrant", "refugee", "immigration",
                               "displacement"],

    # --- Knowledge, epistemology ---
    "knowledge and epistemology": ["epistemology", "epistemic", "cognition", "reason",
                                    "reasoning", "thought", "thinking"],
    "language and speech": ["language", "speech", "phoneme", "utterance", "spoken", "linguistic",
                             "translation"],
    "writing and textuality": ["poetry", "poem", "poetic", "computational poetry", "novel",
                                "literature", "literary"],   # TIGHTENED C1

    # --- Nature, ecology ---
    "ecology and environment": ["ecology", "ecological", "environment", "environmental", "climate",
                                 "biosphere", "ecosystem"],
    "more-than-human and non-human": ["non-human", "nonhuman", "more-than-human",
                                       "species", "creature"],

    # --- Aesthetics, form ---
    "aesthetics and beauty": ["beauty", "beautiful", "aesthetic", "aesthetics", "elegant", "elegance"],
    "composition and structure": ["composition", "structural", "formalism", "geometry", "geometric"],
    "glitch and error": ["glitch", "error", "breakdown", "malfunction", "corruption",
                          "distortion"],
    "noise and signal": ["noise", "signal-to-noise", "static"],

    # --- Space, place ---
    "place and geography": ["geography", "geographical", "territory", "landscape",
                             "territorial", "region"],
    "virtual worlds and simulation": ["virtual world", "virtual worlds", "simulation", "simulated",
                                       "virtual reality", " vr ", " vr,", " vr.", "game world"],
    # TIGHTENED C2: removed bare "installation" from keyword list
    "immersion and installation": ["immersive installation", "immersive", "immersion",
                                    "environmental work", "multi-channel installation",
                                    "spatial audio installation"],

    # --- Sound, music ---
    "sound and listening": ["listening", "aural", "acoustic", "soundscape"],
    "music and composition": ["music", "musical", "score-based"],
    "voice and phonemic speech": ["voice", "vocal", "singing", "choir", "phoneme"],

    # --- Other ---
    "ritual and ceremony": ["ritual", "ceremony", "ceremonial", "liturgy"],
    "speculation and fiction": ["speculative", "speculation", "theory-fiction",
                                 "imagined", "science fiction", "sci-fi"],
    "consent and authorship rights": ["consent", "opt-in", "opt-out", "licensing pathway",
                                       "licensing scheme"],
    "image-making and visual culture": ["image-making", "picture", "visual", "visibility"],
    "platform critique": ["tactical media", "intervention", "institutional critique"],
    "bureaucracy and administration": ["bureaucracy", "administrative", "clerical"],
    "assemblage and hybridity": ["assemblage", "hybrid", "hybridity", "cyborg", "fused"],
}

TECHNIQUES: dict[str, list[str]] = {
    "generative adversarial networks": ["gan ", "gans", "generative adversarial"],
    "diffusion models": ["diffusion model", "stable diffusion", "diffusion"],
    "machine learning": ["machine learning", "neural network", "neural-network"],
    "3D rendering": ["3d render", "3d-render", "3d rendering", "octane", "cinema 4d"],
    "CGI": ["cgi"],
    "motion capture": ["motion capture", "mocap", "motion-capture"],
    "game engine": ["unreal engine", "unity", "game engine"],
    "plotter drawing": ["plotter", "graphomat", "pen plotter"],
    "smart contract": ["smart contract", "solidity", "ethereum"],
    "on-chain generative art": ["on-chain", "fully on-chain"],
    "p5.js / processing": ["processing language", "p5.js", "p5js"],
    "webcam": ["webcam", "photobooth"],
    "web browser": ["browser-based", "html-native"],
    "player piano": ["player piano", "player-piano", "disklavier"],
    "sine wave synthesis": ["sine wave", "sine tone", "sine-tone"],
    "field recording": ["field recording", "field-recording"],
    "mainframe computing": ["ibm mainframe", "mainframe", "siemens 2002", "algol", "fortran",
                            "cdc mainframe"],
    "emulation": ["emulation", "emulator"],
    "web archiving": ["web archiving", "webrecorder"],
    "text-to-speech": ["text-to-speech", "tts ", "microsoft sam", "speech synthesis"],
    "3D scanning / photogrammetry": ["photogrammetry", "3d scanning", "3d-scanning"],
}

# ============================================================================
# HAND-ASSIGNMENTS for high-visibility works (D)
# Editorial, not keyword — based on what each work is about.
# Added as EMBODIES + USES_TECHNIQUE with confidence: "medium".
# ============================================================================

HAND_ASSIGNMENTS: dict[str, dict[str, list[str]]] = {
    "artwork:super mario clouds": {
        "embodies": ["obsolescence and decay", "reproduction and remix", "game art and modification"],
        "uses_technique": [],
    },
    "artwork:vvebcam": {
        "embodies": ["platform labour and feminised labour", "avatar and persona",
                     "internet and web culture"],
        "uses_technique": ["webcam"],
    },
    "artwork:excellences & perfections": {
        "embodies": ["platform labour and feminised labour", "avatar and persona",
                     "platform critique"],
        "uses_technique": [],
    },
    "artwork:chromie squiggle": {
        "embodies": ["generative systems and rule", "platform and protocol",
                     "authorship and attribution"],
        "uses_technique": ["on-chain generative art"],
    },
    "artwork:art blocks 500 complete collection": {
        "embodies": ["platform and protocol", "generative systems and rule"],
        "uses_technique": ["on-chain generative art"],
    },
    "artwork:artbase anthologies": {
        "embodies": ["archive and preservation", "internet and web culture",
                     "community and collective practice"],
        "uses_technique": [],
    },
    "artwork:starmirror holly herndon & mat dryhurst": {
        "embodies": ["machine intelligence and AI autonomy", "voice and phonemic speech",
                     "consent and authorship rights"],
        "uses_technique": ["machine learning"],
    },
    "artwork:the call holly herndon & mat dryhurst": {
        "embodies": ["voice and phonemic speech", "consent and authorship rights",
                     "community and collective practice"],
        "uses_technique": ["machine learning"],
    },
    "artwork:oss ***": {
        "embodies": ["glitch and error", "internet and web culture", "platform critique"],
        "uses_technique": ["web browser"],
    },
    "artwork:autonomous trap 001": {
        "embodies": ["machine intelligence and AI autonomy", "ritual and ceremony", "infrastructure"],
        "uses_technique": [],
    },
    "artwork:hommage a paul klee 13 9 65 nr2": {
        "embodies": ["composition and structure", "generative systems and rule",
                     "aesthetics and beauty"],
        "uses_technique": ["plotter drawing", "mainframe computing"],
    },
    "artwork:photoshop gradient demonstrations": {
        "embodies": ["authorship and attribution", "aesthetics and beauty", "reproduction and remix"],
        "uses_technique": [],
    },
    "artwork:p-159": {
        "embodies": ["generative systems and rule", "composition and structure",
                     "knowledge and epistemology"],
        "uses_technique": ["plotter drawing"],
    },
    "artwork:dimensions": {
        "embodies": ["generative systems and rule", "composition and structure"],
        "uses_technique": ["plotter drawing"],
    },
    "artwork:interruptions": {
        "embodies": ["generative systems and rule", "composition and structure", "glitch and error"],
        "uses_technique": ["plotter drawing"],
    },
    "artwork:hummingbird": {
        "embodies": ["time and duration", "composition and structure",
                     "image-making and visual culture"],
        "uses_technique": ["mainframe computing"],
    },
    "artwork:approximation series": {
        "embodies": ["more-than-human and non-human", "image-making and visual culture",
                     "assemblage and hybridity"],
        "uses_technique": [],
    },
    "artwork:recursivity and contingency": {
        "embodies": ["knowledge and epistemology", "machine intelligence and AI autonomy",
                     "time and duration"],
        "uses_technique": [],
    },
    "artwork:sentient veil hylozoic series": {
        "embodies": ["more-than-human and non-human", "immersion and installation", "infrastructure"],
        "uses_technique": [],
    },
    "artwork:chicago architecture biennial collaboration": {
        "embodies": ["community and collective practice", "place and geography"],
        "uses_technique": [],
    },
}


def tokenize(text: str) -> str:
    if not text:
        return ""
    t = text.lower()
    t = re.sub(r"\s+", " ", t)
    return t


def score_phrase(text_lower: str, keywords: list[str]) -> int:
    score = 0
    for kw in keywords:
        if " " in kw or "-" in kw or kw.startswith(" ") or kw.endswith(" "):
            # substring (phrase or with leading/trailing space)
            if kw in text_lower:
                score += 2
        else:
            if re.search(rf"\b{re.escape(kw)}\b", text_lower):
                score += 1
    return score


def main():
    nodes = json.loads((SEED / "nodes-final.json").read_text())
    edges = json.loads((SEED / "edges-final.json").read_text())

    # --- Rollback previous Task 3 additions ---
    def _m(n):
        m = n.get("metadata")
        if isinstance(m, str):
            try: return json.loads(m)
            except: return {}
        return m or {}

    def is_task3_concept(n):
        if n.get("type") != "concept":
            return False
        md = _m(n)
        return md.get("generated_by") == SIGNAL_ID and md.get("concept_kind") == "theme"

    before_nodes = len(nodes)
    task3_concept_ids = {n["id"] for n in nodes if is_task3_concept(n)}
    nodes = [n for n in nodes if n["id"] not in task3_concept_ids]
    removed_concepts = before_nodes - len(nodes)

    # Remove EMBODIES + USES_TECHNIQUE edges
    before_edges = len(edges)
    edges = [e for e in edges if e.get("edge_type") not in ("EMBODIES", "USES_TECHNIQUE")]
    removed_edges = before_edges - len(edges)
    print(f"Rolled back: removed {removed_concepts} Task-3 concepts, {removed_edges} Task-3 edges")

    by_id = {n["id"]: n for n in nodes}

    def safe_meta(n):
        m = n.get("metadata")
        if isinstance(m, str):
            try: return json.loads(m)
            except: return {}
        return m or {}

    creator_map = defaultdict(list)
    for e in edges:
        if e.get("edge_type") == "CREATED_BY":
            creator_map[e["source_id"]].append(e["target_id"])

    # Title normalization for fallback matching
    def norm_title(s: str) -> str:
        s = (s or "").lower().strip()
        # Strip trailing parenthetical
        s = re.sub(r"\s*\([^()]*\)\s*$", "", s)
        s = re.sub(r"[^a-z0-9]+", " ", s)
        s = re.sub(r"\s+", " ", s).strip()
        return s

    def artwork_desc(a):
        md = safe_meta(a)
        if md.get("description"):
            return md["description"]
        title = (a.get("name") or "").strip().lower()
        title_norm = norm_title(a.get("name") or "")
        for cid in creator_map.get(a["id"], []):
            c = by_id.get(cid)
            if not c: continue
            cm = safe_meta(c)
            kw_list = cm.get("key_works") or []
            if not isinstance(kw_list, list):
                continue
            for kw in kw_list:
                if not isinstance(kw, dict): continue
                kt = (kw.get("title") or "").strip().lower()
                kt_norm = norm_title(kw.get("title") or "")
                # Tier 1: exact / simple substring
                if title == kt or title in kt or kt in title:
                    if kw.get("description"):
                        return kw["description"]
                # Tier 2: normalized (parentheticals stripped) match
                if title_norm == kt_norm:
                    if kw.get("description"):
                        return kw["description"]
                # Tier 3: first-n-tokens overlap
                t_toks = title_norm.split()
                k_toks = kt_norm.split()
                if t_toks and k_toks:
                    prefix_len = min(3, len(t_toks), len(k_toks))
                    if t_toks[:prefix_len] == k_toks[:prefix_len] and prefix_len >= 2:
                        if kw.get("description"):
                            return kw["description"]
        return None

    concept_by_name: dict[str, str] = {}
    for n in nodes:
        if n.get("type") == "concept":
            concept_by_name[(n.get("name") or "").lower().strip()] = n["id"]

    new_concepts: dict[str, dict] = {}
    new_edges: list[dict] = []
    seen_edge_keys = {(e.get("source_id"), e.get("target_id"), e.get("edge_type")) for e in edges}

    def get_or_create_concept(canonical_name: str) -> str:
        key = canonical_name.lower().strip()
        if key in concept_by_name:
            return concept_by_name[key]
        slug = re.sub(r"[^a-z0-9&+\- ]", "", canonical_name.lower()).strip()
        slug = re.sub(r"\s+", " ", slug)
        cid = f"concept:{slug}"
        if cid in new_concepts:
            return cid
        new_concepts[cid] = {
            "id": cid,
            "name": canonical_name,
            "type": "concept",
            "slug": slug,
            "metadata": {
                "auto_generated": True,
                "generated_by": SIGNAL_ID,
                "signal_id": SIGNAL_ID,
                "concept_kind": "theme",
            },
        }
        concept_by_name[key] = cid
        return cid

    def add_edge(src: str, tgt: str, etype: str, evidence: str) -> bool:
        key = (src, tgt, etype)
        if key in seen_edge_keys:
            return False
        seen_edge_keys.add(key)
        new_edges.append({
            "id": f"{src}--{etype.lower()}--{tgt}",
            "source_id": src,
            "target_id": tgt,
            "edge_type": etype,
            "confidence": "medium",
            "signal_id": SIGNAL_ID,
            "created_by": "gatherer-enrichment",
            "source_evidence": evidence,
            "charge": None,
        })
        return True

    artworks = [n for n in nodes if n.get("type") == "artwork"]
    stats = Counter()
    assignments: list[dict] = []
    skipped_no_desc: list[str] = []
    hand_applied_ids: set[str] = set()

    # 1) Apply hand-assignments first (they take precedence)
    for aid, spec in HAND_ASSIGNMENTS.items():
        if aid not in by_id:
            print(f"⚠ Hand-assignment target not found: {aid}")
            continue
        hand_applied_ids.add(aid)
        for theme in spec.get("embodies", []):
            cid = get_or_create_concept(theme)
            if add_edge(aid, cid, "EMBODIES",
                        "Task 3 hand-assignment (editorial research pass on high-visibility artwork)"):
                stats["EMBODIES"] += 1
        for tech in spec.get("uses_technique", []):
            cid = get_or_create_concept(tech)
            if add_edge(aid, cid, "USES_TECHNIQUE",
                        "Task 3 hand-assignment (editorial research pass on high-visibility artwork)"):
                stats["USES_TECHNIQUE"] += 1

    # 2) Heuristic assignments for all remaining artworks
    for a in artworks:
        if a["id"] in hand_applied_ids:
            assignments.append({"artwork": a.get("name"), "artwork_id": a["id"],
                                "method": "hand-assigned", "embodies": HAND_ASSIGNMENTS[a["id"]]["embodies"],
                                "uses_technique": HAND_ASSIGNMENTS[a["id"]]["uses_technique"]})
            continue

        desc = artwork_desc(a)
        if not desc:
            skipped_no_desc.append(a.get("name"))
            continue

        text_lower = tokenize(desc)
        theme_scores: list[tuple[int, str]] = []
        for theme, kws in THEMES.items():
            s = score_phrase(text_lower, kws)
            if s > 0:
                theme_scores.append((s, theme))
        theme_scores.sort(reverse=True)
        top_themes = [t for _, t in theme_scores[:3]]

        tech_scores: list[tuple[int, str]] = []
        for tech, kws in TECHNIQUES.items():
            s = score_phrase(text_lower, kws)
            if s > 0:
                tech_scores.append((s, tech))
        tech_scores.sort(reverse=True)
        top_techs = [t for _, t in tech_scores[:2]]

        for theme in top_themes:
            cid = get_or_create_concept(theme)
            if add_edge(a["id"], cid, "EMBODIES",
                        "Task 3 heuristic (artwork description keyword match against theme vocabulary)"):
                stats["EMBODIES"] += 1
        for tech in top_techs:
            cid = get_or_create_concept(tech)
            if add_edge(a["id"], cid, "USES_TECHNIQUE",
                        "Task 3 heuristic (artwork description keyword match against technique vocabulary)"):
                stats["USES_TECHNIQUE"] += 1

        assignments.append({"artwork": a.get("name"), "artwork_id": a["id"],
                            "method": "heuristic", "embodies": top_themes, "uses_technique": top_techs})

    nodes_out = nodes + list(new_concepts.values())
    edges_out = edges + new_edges
    (SEED / "nodes-final.json").write_text(json.dumps(nodes_out, indent=2, ensure_ascii=False))
    (SEED / "edges-final.json").write_text(json.dumps(edges_out, indent=2, ensure_ascii=False))

    report = {
        "signal_id": SIGNAL_ID,
        "task": "Task 3 (v2) — EMBODIES + USES_TECHNIQUE on artworks",
        "method_note": ("EMBODIES edges were produced by heuristic keyword matching against a curated "
                         "theme vocabulary. ~20 high-visibility artworks received hand-assigned edges "
                         "after editorial research. All edges marked confidence: medium. Future passes "
                         "(practitioner review, targeted editorial audit) will upgrade some to high "
                         "and remove false-positives."),
        "artworks_processed": len(artworks),
        "artworks_skipped_no_desc": len(skipped_no_desc),
        "artworks_hand_assigned": len(hand_applied_ids),
        "new_edges": {
            "EMBODIES": stats["EMBODIES"],
            "USES_TECHNIQUE": stats["USES_TECHNIQUE"],
            "total": len(new_edges),
        },
        "new_concept_nodes_created": len(new_concepts),
        "new_concepts_by_name": sorted([v["name"] for v in new_concepts.values()]),
        "skipped_list": skipped_no_desc,
        "sample_assignments_hand": [a for a in assignments if a.get("method") == "hand-assigned"][:25],
    }
    (SEED / "_build" / "task3_report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))

    print(f"\nArtworks hand-assigned:     {len(hand_applied_ids)}")
    print(f"Artworks heuristic-assigned: {len(artworks) - len(hand_applied_ids) - len(skipped_no_desc)}")
    print(f"Artworks skipped (no desc):  {len(skipped_no_desc)}")
    print(f"EMBODIES edges created:      {stats['EMBODIES']}")
    print(f"USES_TECHNIQUE edges:        {stats['USES_TECHNIQUE']}")
    print(f"New concept nodes:           {len(new_concepts)}")
    print()
    print(f"Final totals: {len(nodes_out)} nodes, {len(edges_out)} edges")
    from collections import Counter as C
    ntypes = C(n.get("type") for n in nodes_out)
    etypes = C(e.get("edge_type") for e in edges_out)
    print(f"Node types: {dict(ntypes)}")
    print(f"Edge types: {dict(etypes)}")


if __name__ == "__main__":
    main()
