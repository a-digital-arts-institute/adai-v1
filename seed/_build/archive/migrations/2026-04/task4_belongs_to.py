"""
Task 4 (v2): Add BELONGS_TO edges for scene affiliations, with re-audit.

Changes from v1 (per re-audit):
  - REMOVED: 'digital-arts theory' (not a scene; theorists positioned via INFLUENCES + PRACTICES)
  - REMOVED: 'Asia-Pacific digital art' (geographic label, not a practice)
  - RENAMED: 'Black digital art' -> 'race technology and digital culture' (describes work not people)
  - VERIFIED: 'speculative and sci-fi practice' now has 5+ practitioners via expanded aliases
  - ADDED: 'new media art' (8 practitioner mentions), 'performance art' (3), 'critical tech art' (4)

Grounding for every scene is tagged in metadata (SOURCES.md / outline.yaml / practitioner language /
established field usage / claude inference — user reviews inference-tagged ones).

Idempotent: on each run, removes prior Task 4 additions, then re-runs.
"""
from __future__ import annotations
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "seed"
SIGNAL_ID = "enrichment-seed-canon-v1-2026-04"


def _m(n):
    m = n.get("metadata")
    if isinstance(m, str):
        try: return json.loads(m)
        except: return {}
    return m or {}


# Canonical scenes with aliases + grounding tag.
# grounding ∈ {"SOURCES.md", "outline.yaml", "practitioner language", "established field usage", "claude inference"}
CANONICAL: dict[str, dict] = {
    "post-internet art": {
        "aliases": ["post-internet", "post internet", "post-internet art", "avatar art",
                    "post-internet sculpture", "post-internet photography"],
        "grounding": "SOURCES.md",
        "note": "SOURCES.md category #3",
    },
    "crypto art": {
        "aliases": ["crypto art", "cryptoart", "blockchain art", "nft art",
                    "web3/dao art", "web3 / dao art", "web3/dao art community",
                    "web3 art", "dao art", "conceptual crypto art",
                    "leftist blockchain critique"],
        "grounding": "SOURCES.md",
        "note": "SOURCES.md #5 + outline.yaml 'Crypto / Blockchain'",
    },
    "sound art": {
        "aliases": ["sound art", "sound-art", "algorithmic music", "experimental electronic music",
                    "computer music", "electronic music", "new music", "noise music",
                    "experimental sound", "radio art", "ambient music", "audio art"],
        "grounding": "SOURCES.md",
        "note": "SOURCES.md #11",
    },
    "net art": {
        "aliases": ["net art", "net.art", "browser-based art", "browser art",
                    "vernacular web", "html-native art", "tactical-media net.art"],
        "grounding": "SOURCES.md",
        "note": "SOURCES.md #2 + outline.yaml 'Net Art / Software Art'",
    },
    "generative art": {
        "aliases": ["generative art", "on-chain generative art", "algorithmic art",
                    "procedural art", "long-form generative", "algorithmic design",
                    "generative design", "generative code"],
        "grounding": "SOURCES.md",
        "note": "SOURCES.md #4 + outline.yaml 'Algorithmic / Generative'",
    },
    "AI art": {
        "aliases": ["ai art", "ai-art", "generative ai art", "autonomous ai art",
                    "ai image art", "ai voice art", "ai co-authorship",
                    "early ai art", "gan art", "open-source gan",
                    "ai art community", "ai art and machine learning art community (central figure)",
                    "academic creative ai research"],
        "grounding": "SOURCES.md",
        "note": "SOURCES.md #6 + outline.yaml 'AI / Machine Learning'",
    },
    "creative coding": {
        "aliases": ["creative coding", "creative-coding", "interactive typography",
                    "processing community", "openframeworks community",
                    "new-media pedagogy", "computational pedagogy", "live coding",
                    "creative coding (processing/p5", "creative coding (openframeworks community)"],
        "grounding": "practitioner language",
        "note": "Processing/p5 community self-identifies; outline.yaml also has 'Performance / Live Coding'",
    },
    "early computer art": {
        "aliases": ["early computer art", "pioneer computer art", "1960s computer art",
                    "stuttgart school", "bell labs research lineage", "academic computer graphics",
                    "plotter art", "computer sculpture"],
        "grounding": "SOURCES.md",
        "note": "SOURCES.md #1",
    },
    "data art": {
        "aliases": ["data art", "data visualization", "data visualisation",
                    "information design", "cultural analytics"],
        "grounding": "outline.yaml",
        "note": "outline.yaml 'Data / Visualization'",
    },
    "feminist digital practice": {
        "aliases": ["feminist tech", "cyberfeminism", "feminist digital art",
                    "feminist free software", "feminist digital practice"],
        "grounding": "established field usage",
        "note": "Cyberfeminism (Old Boys Network 1997) — well-established term",
    },
    "game art": {
        "aliases": ["game art", "art games", "game-engine art", "independent games",
                    "game modding", "circuit bending", "game engine art"],
        "grounding": "SOURCES.md",
        "note": "SOURCES.md #8",
    },
    "forensic and research-based art": {
        "aliases": ["forensic art", "investigative art", "research-based art",
                    "research-based installation", "forensic-architecture",
                    "forensic architecture network", "human rights investigation community"],
        "grounding": "practitioner language",
        "note": "Forensic Architecture group self-term; Schuppli 'Material Witness'",
    },
    "tactical media": {
        "aliases": ["tactical media", "activist art", "hacker art",
                    "hackerspace culture", "community tech"],
        "grounding": "established field usage",
        "note": "Coined 1996 (Lovink/Garcia, Next 5 Minutes)",
    },
    "infrastructure and artist-run platforms": {
        "aliases": ["digital art infrastructure", "artist-run platforms",
                    "infrastructure art", "platform-building"],
        "grounding": "claude inference",
        "note": "I bundled these — practitioners use 'artist-run platform' individually but not this composite label. Flagged for review.",
    },
    "glitch art": {
        "aliases": ["glitch", "glitch art", "data bending"],
        "grounding": "SOURCES.md",
        "note": "SOURCES.md #9 + outline.yaml 'Glitch / Post-Digital'",
    },
    "digital installation": {
        "aliases": ["digital installation", "interactive public art", "biometric art",
                    "responsive architecture", "immersive installation-art",
                    "interactive art", "computational architecture", "biomimetic design"],
        "grounding": "SOURCES.md",
        "note": "SOURCES.md #7 'Digital Installation and Immersive Art' + outline.yaml 'Immersive / Spatial'",
    },
    "blockchain governance and DAO art": {
        "aliases": ["blockchain governance", "dao governance", "commons governance"],
        "grounding": "practitioner language",
        "note": "De Filippi / Catlow / Myers all use DAO governance framing",
    },
    "race technology and digital culture": {
        "aliases": ["black digital art", "black art and technology",
                    "black trans art and activism", "black feminist technology studies",
                    "critical race and technology studies"],
        "grounding": "practitioner language",
        "note": "Renamed from 'Black digital art' — describes the work, not the people. Critical-race and Black-digital traditions both fit under this umbrella; aliasing preserved here for the graph but the distinct intellectual traditions are noted in this grounding field.",
    },
    "digital-art preservation": {
        "aliases": ["digital preservation", "net-art preservation",
                    "digital-art preservation", "web preservation", "archival practice"],
        "grounding": "established field usage",
        "note": "Rhizome preservation community self-term; 'digital preservation' established since early 2000s",
    },
    "video art and moving image": {
        "aliases": ["video art", "video art extended", "single-channel video",
                    "contemporary video art", "video essay"],
        "grounding": "SOURCES.md",
        "note": "SOURCES.md #10 + outline.yaml 'Video / Electronic'",
    },
    "sound/audio-visual performance": {
        "aliases": ["audio-visual performance", "audiovisual", "av performance"],
        "grounding": "practitioner language",
        "note": "Ikeda / Nicolai / Alva Noto / Arca all use 'audio-visual' framing",
    },
    "commons and open-source culture": {
        "aliases": ["libre tools", "artist-run culture", "open source culture",
                    "free software culture", "open-source culture",
                    "free/libre culture"],
        "grounding": "practitioner language",
        "note": "Constant / Furtherfield / free-culture community self-term",
    },
    "speculative and sci-fi practice": {
        "aliases": ["speculative realism", "speculative practice", "science-fiction practice",
                    "sinofuturism", "simulation art", "speculative/science fiction art",
                    "speculative fiction", "speculative philosophy", "speculative feminism",
                    "indigenous futurism"],
        "grounding": "practitioner language",
        "note": "Lek (sinofuturism), Cheng (simulation art), Treister (sci-fi art), Novitskova (spec. realism), K Allado-McDowell (speculative fiction)",
    },
    # NEW SCENES added in this re-audit
    "new media art": {
        "aliases": ["new media art", "new media art (pioneer since 1990s)",
                    "australian new media art scene (originally)", "new york new media art"],
        "grounding": "established field usage",
        "note": "Widely used umbrella term since 1990s; at least 8 seed practitioners self-identify",
    },
    "performance art": {
        "aliases": ["performance art", "performance"],
        "grounding": "practitioner language",
        "note": "Ulman, Russell, Sougwen Chung use performance framing explicitly",
    },
    "critical tech art": {
        "aliases": ["critical tech art", "critical technology art",
                    "critical technology studies", "digital culture critique",
                    "digital culture theory"],
        "grounding": "practitioner language",
        "note": "Pipkin, Lavigne, Bridle, Treister self-identify with 'critical tech' framing",
    },
}

# Strings to SKIP entirely (geographic, awards, fragments, institutions)
SKIP_PATTERNS = [
    re.compile(r"^\s*\d{4}\)?\s*$"),  # year fragments
    re.compile(r"award", re.I),
    re.compile(r"biennale", re.I),
    re.compile(r"biennial", re.I),
    re.compile(r"festival", re.I),
    re.compile(r"foundation", re.I),
    re.compile(r"gallery", re.I),
    re.compile(r"museum", re.I),
    re.compile(r"\bnetwork\b", re.I),
    re.compile(r"alumni", re.I),
    re.compile(r"^(new york|london|berlin|paris|tokyo|shanghai|hong kong|beirut) ", re.I),
    re.compile(r" (scene|community|circuit)$", re.I),  # X scene/community catch-all
]
SKIP_EXACT = {
    "serpentine", "serpentine galleries", "serpentine arts technologies",
    "rhizome", "barbican", "centre pompidou", "ars electronica",
    "zkm", "moma", "tate", "mit media lab", "ircam", "cemamu",
    "luma", "the shed", "whitney", "parsons)", "queens museum)",
    "modern art oxford)", "la)", "silicon valley tech-art intersection",
    "the kitchen community", "tate)", "occult/esoteric art traditions",
    "psychoacoustics research community", "ccru legacy)",
    "psychedelic culture",
}


def normalize_scene(raw: str) -> str:
    if not isinstance(raw, str):
        return ""
    s = raw.lower().strip()
    s = re.sub(r"[\"\']", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def build_alias_lookup() -> dict[str, str]:
    out: dict[str, str] = {}
    for canonical, spec in CANONICAL.items():
        out[normalize_scene(canonical)] = canonical
        for a in spec["aliases"]:
            out[normalize_scene(a)] = canonical
    return out


def should_skip(raw: str) -> bool:
    s = normalize_scene(raw)
    if not s or len(s) < 3:
        return True
    if s in SKIP_EXACT:
        return True
    for pat in SKIP_PATTERNS:
        if pat.search(raw):
            return True
    return False


def main():
    nodes = json.loads((SEED / "nodes-final.json").read_text())
    edges = json.loads((SEED / "edges-final.json").read_text())

    # --- Rollback previous Task 4 additions ---
    scene_ids_to_drop = {n["id"] for n in nodes if n.get("type") == "scene"}
    before_n = len(nodes)
    nodes = [n for n in nodes if n["id"] not in scene_ids_to_drop]
    before_e = len(edges)
    edges = [e for e in edges if e.get("edge_type") != "BELONGS_TO"]
    print(f"Rolled back: removed {before_n - len(nodes)} scene nodes, "
          f"{before_e - len(edges)} BELONGS_TO edges")

    alias_lookup = build_alias_lookup()
    by_id = {n["id"]: n for n in nodes}

    new_scenes: dict[str, dict] = {}
    new_edges: list[dict] = []
    seen_keys = {(e.get("source_id"), e.get("target_id"), e.get("edge_type")) for e in edges}

    unresolved: Counter = Counter()
    skipped: Counter = Counter()
    scene_members: dict[str, set] = defaultdict(set)

    def ensure_scene(canonical: str) -> str:
        sid = f"scene:{canonical}"
        if sid in new_scenes:
            return sid
        spec = CANONICAL[canonical]
        new_scenes[sid] = {
            "id": sid,
            "name": canonical,
            "type": "scene",
            "slug": re.sub(r"[^a-z0-9&+\- ]", "", canonical.lower()).strip(),
            "metadata": {
                "auto_generated": True,
                "generated_by": SIGNAL_ID,
                "signal_id": SIGNAL_ID,
                "grounding": spec["grounding"],
                "grounding_note": spec["note"],
            },
        }
        return sid

    for n in nodes:
        if n.get("type") != "practitioner":
            continue
        md = _m(n)
        sa = md.get("scene_affiliation") or []
        if not isinstance(sa, list):
            continue
        for raw in sa:
            if should_skip(raw):
                skipped[raw] += 1
                continue
            key = normalize_scene(raw)
            canonical = alias_lookup.get(key)
            if not canonical:
                unresolved[raw] += 1
                continue
            sid = ensure_scene(canonical)
            edge_key = (n["id"], sid, "BELONGS_TO")
            if edge_key in seen_keys:
                continue
            seen_keys.add(edge_key)
            new_edges.append({
                "id": f"{n['id']}--belongs_to--{sid}",
                "source_id": n["id"],
                "target_id": sid,
                "edge_type": "BELONGS_TO",
                "confidence": "high",
                "signal_id": SIGNAL_ID,
                "created_by": "gatherer-enrichment",
                "source_evidence": "metadata.scene_affiliation (re-audited alias map)",
                "charge": None,
            })
            scene_members[sid].add(n["id"])

    nodes_out = nodes + list(new_scenes.values())
    edges_out = edges + new_edges
    (SEED / "nodes-final.json").write_text(json.dumps(nodes_out, indent=2, ensure_ascii=False))
    (SEED / "edges-final.json").write_text(json.dumps(edges_out, indent=2, ensure_ascii=False))

    # Build grounded report
    scene_rows = []
    for sid, members in sorted(scene_members.items(), key=lambda kv: -len(kv[1])):
        name = new_scenes[sid]["name"]
        spec = CANONICAL[name]
        scene_rows.append({
            "scene": name,
            "practitioners": len(members),
            "grounding": spec["grounding"],
            "note": spec["note"],
        })

    under_populated = [r for r in scene_rows if r["practitioners"] <= 1]

    report = {
        "signal_id": SIGNAL_ID,
        "task": "Task 4 (v2) — BELONGS_TO scene edges with re-audit",
        "scene_nodes_created": len(new_scenes),
        "belongs_to_edges": len(new_edges),
        "scenes_report": scene_rows,
        "under_populated_flag": under_populated,
        "unresolved_strings_sample": unresolved.most_common(40),
        "skipped_count": sum(skipped.values()),
    }
    (SEED / "_build" / "task4_report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))

    print(f"\nScenes created: {len(new_scenes)}")
    print(f"BELONGS_TO edges: {len(new_edges)}")
    print(f"\nFinal scene list (practitioner count + grounding):")
    for r in scene_rows:
        print(f"  [{r['practitioners']:>2}]  [{r['grounding']:<22}]  {r['scene']}")
        if r['grounding'] == 'claude inference':
            print(f"         ⚠ {r['note']}")
    if under_populated:
        print(f"\n⚠ Under-populated (≤1 practitioner):")
        for r in under_populated:
            print(f"  - {r['scene']}")

    from collections import Counter as C
    ntypes = C(n.get("type") for n in nodes_out)
    etypes = C(e.get("edge_type") for e in edges_out)
    print(f"\nFinal totals: {len(nodes_out)} nodes, {len(edges_out)} edges")
    print(f"Node types: {dict(ntypes)}")
    print(f"Edge types: {dict(etypes)}")


if __name__ == "__main__":
    main()
