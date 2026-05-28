"""Shared slug + id helpers for gatherers — generic-title disambiguation.

Two concerns the helpers solve:

  1. **Slug collision** — independent gatherers minting `<type>:<title>`
     for generic-titled rows ("Untitled", "Black Hole") would have collided
     in canon (see PR #25 / CLAUDE.md). The disambiguator suffixes the
     source's external id so different works land at different ids.
  2. **Cross-gatherer alignment** — every gatherer uses the same `slugify`
     (same NFKD, same regex, same lowercase) so ids are byte-equal across
     sources. Identity matching then happens via `seed/aliases.json`
     (cross-source links), not via slug heuristics.

The artwork case is the one we've observed in the wild. Other node types
are scaffolded but have empty generic-title sets — extend them when a
collision is actually observed (over-disambiguating creates noise).

Public API:

    slugify(s)                       # NFKD-lower ASCII alphanumeric+'&+-'
    slugify_url(s)                   # like slugify but dashes-not-spaces (URL-safe)
    node_id(type, name, **kw) -> str # the canonical "<type>:<…>" id
    node_slug(type, name) -> str     # the canonical URL-safe slug
    artwork_slug(title, **kw)        # back-compat for older callers; alias of node_id("artwork", ...)
    is_generic(type, name) -> bool
    GENERIC_TITLES_BY_TYPE: dict[str, frozenset[str]]
"""
from __future__ import annotations

import re
import unicodedata

__all__ = [
    "slugify",
    "slugify_url",
    "node_id",
    "node_slug",
    "artwork_slug",
    "is_generic",
    "is_generic_title",  # back-compat
    "GENERIC_TITLES",    # back-compat (= GENERIC_TITLES_BY_TYPE["artwork"])
    "GENERIC_TITLES_BY_TYPE",
]


# Per-type generic-title sets. Comparison is on slugify(name) so case +
# accents are handled. Keep each set NARROW — disambiguator noise on every
# row is worse than the occasional collision. Add a name only when a real
# canon collision has been observed.
GENERIC_TITLES_BY_TYPE: dict[str, frozenset[str]] = {
    "artwork": frozenset({
        "untitled",
        "no title",
        "sin titulo",      # NFKD of "sin título"
        "black hole",
        "self-portrait",
        "composition",
        "study",
        "drawing",
    }),
    # Scaffolded — empty for now. Extend when a real collision shows up.
    "concept": frozenset(),
    "scene": frozenset(),
    "institution": frozenset(),
    "collective": frozenset(),
    "publication": frozenset(),
    "project": frozenset(),
    "platform": frozenset(),
    "practitioner": frozenset({
        # "american artist" is a known shared stage name (Black artist born 1989,
        # but also a generic phrase). Disambiguate when collisions appear.
    }),
    "classification_regime": frozenset(),
    "event": frozenset(),
    "related": frozenset(),
}

# Back-compat re-export so existing imports `from _slug import GENERIC_TITLES` still work.
GENERIC_TITLES: frozenset[str] = GENERIC_TITLES_BY_TYPE["artwork"]


def slugify(s: str) -> str:
    """ASCII lower-case slug with letters / digits / `& + -` and single spaces.

    Output keeps spaces in the BASE form — matches existing canon ids like
    `practitioner:american artist`. Use ``slugify_url`` for the URL-safe
    (kebab) form when populating the ``slug`` field on a node.
    """
    s = unicodedata.normalize("NFKD", (s or "").lower()).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9&+\- ]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def slugify_url(s: str) -> str:
    """Kebab-case URL-safe slug. Used for the ``slug`` field on every node row."""
    return slugify(s).replace(" ", "-")


def is_generic(node_type: str, name: str) -> bool:
    return slugify(name) in GENERIC_TITLES_BY_TYPE.get(node_type, frozenset())


# Back-compat
def is_generic_title(title: str) -> bool:
    return is_generic("artwork", title)


def node_id(
    node_type: str,
    name: str,
    *,
    source: str | None = None,
    external_id: str | int | None = None,
    creator_slug: str | None = None,
) -> str:
    """Build a canonical ``<type>:<…>`` id, disambiguated for generic names.

    For non-generic names: returns ``<type>:<slugify(name)>`` — unique
    rows round-trip identically.

    For generic names: appends a disambiguator. Preference order:
      1. ``--<source>-<external_id>`` — strongest, deterministic per source.
      2. ``--<creator_slug>`` — fallback when only the creator is known.
      3. Plain ``<type>:<slug>`` — last-resort; risks future collision,
         but at least matches pre-disambiguation behaviour.
    """
    base = f"{node_type}:{slugify(name)}"
    if not is_generic(node_type, name):
        return base
    def _suffix(s: str) -> str:
        return slugify(s).replace(" ", "-")
    if source and external_id is not None and external_id != "":
        return f"{base}--{_suffix(source)}-{_suffix(str(external_id))}"
    if creator_slug:
        return f"{base}--{_suffix(creator_slug)}"
    return base


def node_slug(node_type: str, name: str, **kwargs: str | int | None) -> str:
    """The URL-safe ``slug`` field for a node row.

    Mirrors ``node_id`` but emits the kebab-case form (no colons, no spaces).
    Example: name "Casey Reas" → slug "casey-reas".
    """
    nid = node_id(node_type, name, **kwargs)
    return nid.split(":", 1)[1].replace(" ", "-")


def artwork_slug(
    title: str,
    *,
    source: str | None = None,
    external_id: str | int | None = None,
    creator_slug: str | None = None,
) -> str:
    """Back-compat wrapper. Prefer ``node_id("artwork", title, ...)`` in new code."""
    return node_id(
        "artwork",
        title,
        source=source,
        external_id=external_id,
        creator_slug=creator_slug,
    )


# Self-test (run as: python3 seed/_build/_slug.py). Cheap, no dependencies.
if __name__ == "__main__":
    cases: list[tuple[str, dict[str, object], str]] = [
        # artwork_slug back-compat
        ("Fidenza", {}, "artwork:fidenza"),
        ("Untitled", {}, "artwork:untitled"),
        ("Untitled", {"source": "moma", "external_id": 435713},
         "artwork:untitled--moma-435713"),
        ("Untitled", {"creator_slug": "American Artist"},
         "artwork:untitled--american-artist"),
        ("Black Hole", {"creator_slug": "Suzanne Treister"},
         "artwork:black hole--suzanne-treister"),
        ("Sin Título", {"creator_slug": "Foo Bar"},
         "artwork:sin titulo--foo-bar"),
        ("Composition #4", {"source": "wikidata", "external_id": "Q12345"},
         "artwork:composition 4"),
    ]
    failed = 0
    for title, kwargs, expected in cases:
        got = artwork_slug(title, **kwargs)
        ok = got == expected
        print(f"  {'ok ' if ok else 'FAIL'}  artwork_slug({title!r}, **{kwargs}) → {got!r}")
        if not ok:
            print(f"         expected: {expected!r}")
            failed += 1
    # generic node_id checks
    generic_cases: list[tuple[tuple[str, str], dict[str, object], str]] = [
        (("practitioner", "Casey Reas"), {}, "practitioner:casey reas"),
        (("concept", "Generative Art"), {}, "concept:generative art"),
        (("scene", "Demoscene"), {}, "scene:demoscene"),
        (("institution", "MoMA"), {}, "institution:moma"),
        (("collective", "teamLab"), {}, "collective:teamlab"),
    ]
    for (ntype, name), kwargs, expected in generic_cases:
        got = node_id(ntype, name, **kwargs)
        ok = got == expected
        print(f"  {'ok ' if ok else 'FAIL'}  node_id({ntype!r}, {name!r}) → {got!r}")
        if not ok:
            print(f"         expected: {expected!r}")
            failed += 1
    # node_slug = URL-safe form
    slug_cases = [
        (("practitioner", "Casey Reas"), "casey-reas"),
        (("artwork", "Fidenza"), "fidenza"),
        (("artwork", "Untitled"), "untitled"),
    ]
    for (ntype, name), expected in slug_cases:
        got = node_slug(ntype, name)
        ok = got == expected
        print(f"  {'ok ' if ok else 'FAIL'}  node_slug({ntype!r}, {name!r}) → {got!r}")
        if not ok:
            print(f"         expected: {expected!r}")
            failed += 1
    print(f"\n{'all pass' if failed == 0 else f'{failed} FAILED'}")
    raise SystemExit(0 if failed == 0 else 1)
