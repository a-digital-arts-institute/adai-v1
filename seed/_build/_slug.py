"""Shared slug helpers for gatherers — including generic-title disambiguation.

The slug-collision bug this guards against: independent gatherers each minted
`artwork:<title>` slugs. For unique titles ("Fidenza", "Starmirror") that's
fine. For generic titles ("Untitled", "Black Hole") it collides — different
artworks under the same id, edges getting tangled. See PR #25 / CLAUDE.md
"Image coverage" section for the historical occurrence.

Rule: when a gatherer mints an artwork id and the title is in GENERIC_TITLES,
append a source-specific disambiguator so different works under the same
title get distinct ids.

Existing canon (the 2 collisions `artwork:untitled` and `artwork:black hole`)
is corrected via `seed/canon_overlay.json` — never by re-writing nodes.json.

Usage in a gatherer:
    from _slug import artwork_slug, slugify
    artwork_id = artwork_slug(title, source="moma", external_id=object_id)
    # or, if the gatherer has the creator at minting time:
    artwork_id = artwork_slug(title, creator_slug="vera-molnar")
"""
from __future__ import annotations

import re
import unicodedata

__all__ = ["slugify", "is_generic_title", "artwork_slug", "GENERIC_TITLES"]

# Titles that collide across gatherers in practice. Keep this set narrow:
# disambiguation noise on every artwork is worse than the occasional collision.
# Add to it when a real collision is observed in the seed. Comparison is done
# on the slugified form, so case + accents are handled.
GENERIC_TITLES: frozenset[str] = frozenset({
    "untitled",
    "no title",
    "sin titulo",   # NFKD of "sin título"
    "black hole",
    "self-portrait",
    "composition",
    "study",
    "drawing",
})


def slugify(s: str) -> str:
    """ASCII lower-case slug with letters / digits / `& + -` and single spaces.

    Matches the existing per-gatherer implementations (fetch_moma_digital_v3,
    fetch_wikidata_v3b, fetch_objkt_tags_v3) so output is identical to what
    those modules produce today — this is a drop-in replacement.
    """
    s = unicodedata.normalize("NFKD", (s or "").lower()).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-z0-9&+\- ]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def is_generic_title(title: str) -> bool:
    return slugify(title) in GENERIC_TITLES


def artwork_slug(
    title: str,
    *,
    source: str | None = None,
    external_id: str | int | None = None,
    creator_slug: str | None = None,
) -> str:
    """Build an `artwork:<…>` id, disambiguated for generic titles.

    For non-generic titles: returns `artwork:<slug(title)>` — same as today,
    so existing canon ids round-trip identically.

    For generic titles: appends a disambiguator. Preference order:
      1. `--<source>-<external_id>` — when the gatherer has a source-specific
         canonical id (MoMA object_id, Wikidata QID, Art Blocks token id, …).
         This is the strongest disambiguator: deterministic per source.
      2. `--<creator_slug>` — fallback when only the creator is known. Used
         by the existing-canon migration (canon_overlay.json) where we don't
         have the original external id any more.
      3. Plain `artwork:<slug(title)>` — last-resort fallback when neither is
         available. Logs nothing (callers should know), but at minimum keeps
         the previous behaviour.
    """
    base = f"artwork:{slugify(title)}"
    if not is_generic_title(title):
        return base
    # Disambiguator suffix uses dashes (URL-friendly, visually distinct from the
    # title portion which keeps the base slugify behaviour — spaces — to round-
    # trip with existing canon ids like `practitioner:american artist`).
    def _suffix(s: str) -> str:
        return slugify(s).replace(" ", "-")
    if source and external_id is not None:
        return f"{base}--{_suffix(source)}-{_suffix(str(external_id))}"
    if creator_slug:
        return f"{base}--{_suffix(creator_slug)}"
    return base


# Self-test (run as: python3 seed/_build/_slug.py). Cheap, no dependencies.
if __name__ == "__main__":
    cases = [
        # (title, kwargs, expected)
        ("Fidenza", {}, "artwork:fidenza"),
        ("Starmirror", {"source": "fxhash", "external_id": "123"}, "artwork:starmirror"),
        ("Untitled", {}, "artwork:untitled"),  # last-resort fallback
        ("Untitled", {"source": "moma", "external_id": 435713},
         "artwork:untitled--moma-435713"),
        ("Untitled", {"creator_slug": "American Artist"},
         "artwork:untitled--american-artist"),
        ("Black Hole", {"creator_slug": "Suzanne Treister"},
         "artwork:black hole--suzanne-treister"),
        ("Sin Título", {"creator_slug": "Foo Bar"},
         "artwork:sin titulo--foo-bar"),  # accents folded
        # "Composition #4" is a specific numbered work, not the generic title
        # "Composition" — so it correctly does NOT get disambiguated.
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
    print(f"\n{'all pass' if failed == 0 else f'{failed} FAILED'}")
    raise SystemExit(0 if failed == 0 else 1)
