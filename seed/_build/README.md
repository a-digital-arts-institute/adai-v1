# seed/_build/ — regeneration + enrichment scripts

Everything in this directory is tooling, not canonical data. The canonical data is in `seed/*.json`.

## What's in here

| File | Purpose |
|---|---|
| `build_seed.py` | Regenerates `seed/nodes.json`, `edges.json`, `signals.json`, `aliases.json`, `contributors.json` from source inputs. |
| `validate_seed.py` | Schema + referential-integrity check against `db.sql` on `feat/cr-sqlite-backend`. Exits non-zero on errors. |
| `new_entries.json` | 45 new practitioners authored from the April 2026 seed-taxonomy article. Input to `build_seed.py`. |
| `wikidata_verified.json` | 60 practitioner QIDs + images verified via batched SPARQL queries (April 2026). Input to `build_seed.py`. |
| `fetch_wikidata_artworks.py` | Follow-up pass: fetches artwork images from Wikidata by creator QID. |
| `fetch_moma_csv.py` | Follow-up pass: joins MoMA's public Artworks.csv (CC0) by artist + title. |
| `fetch_met_openaccess.py` | Follow-up pass: queries the Met Open Access API for public-domain matches. |
| `fetch_artblocks.py` | Follow-up pass: queries the Art Blocks Hasura GraphQL API for generative-art project thumbnails. |
| `apply_image_patches.py` | Merges everything in `image_patches/*.json` into `nodes.json`. |
| `image_patches/` | Output directory for the four fetcher scripts. One JSON file per source. |

## Ordered workflow (Gio)

From a fresh clone on `feat/cr-sqlite-backend`, in this directory:

```bash
# 1. Regenerate the base seed files (only needed if new_entries.json or
#    wikidata_verified.json change)
python3 build_seed.py
python3 validate_seed.py

# 2. Fill in artwork images from three sources (dry-run first, then --write)
python3 fetch_wikidata_artworks.py              # ~60 SPARQL queries, ~2 min
python3 fetch_wikidata_artworks.py --write

python3 fetch_moma_csv.py                        # downloads ~40 MB CSV once
python3 fetch_moma_csv.py --write

python3 fetch_met_openaccess.py                  # slow: ~80 artist searches, +obj fetches
python3 fetch_met_openaccess.py --write          # tune with --max=5 to cap per artist

python3 fetch_artblocks.py                       # ~80 Hasura queries (core contracts only)
python3 fetch_artblocks.py --write

# 3. Merge the patch files into nodes.json
python3 apply_image_patches.py                   # dry-run, shows counts
python3 apply_image_patches.py --write           # rewrites nodes.json, backup at .bak

# 4. Re-validate
python3 validate_seed.py
```

## Design notes

**Dry-run by default.** Every fetcher script prints what it would write. Add `--write` to persist. This keeps accidental runs cheap.

**Patches are additive, never destructive.** `apply_image_patches.py` only fills in `image_url` on artwork nodes that don't already have one. A node with an existing image from an earlier run is left alone. Running all three fetchers twice produces the same result.

**Priority on conflicts.** When multiple sources claim the same artwork:
1. `wikidata` wins (stable Commons image + clear licensing metadata on the Commons page)
2. `met` next (Open Access CC0, unambiguous reuse)
3. `moma` next (collection thumbnail, per-work rights vary)
4. `artblocks` last (media.artblocks.io thumbnail — licensing varies per project, verify)

**Name matching is accent- and case-insensitive.** "Vera Molnár" = "Vera Molnar", "Myriad (Tulips)" = "myriad tulips".

**Art Blocks is covered** (`fetch_artblocks.py`, April 2026). The public Hasura endpoint at `data.artblocks.io/v1/graphql` needs no auth and serves project metadata. We only hit the three core contracts (V0/V1/V3) and skip Engine/PBAB. Thumbnails come from `media.artblocks.io/thumb/{token_id}.png` — the first mint of project N is token `N * 1_000_000`. Still no fxhash pass: that one needs a different schema and its own pinning decision.

## What to expect per source (rough guesses)

- **Wikidata artworks**: 20–40 hits, strongest on Vera Molnár, Frieder Nake, Casey Reas, Lynn Hershman Leeson, Lozano-Hemmer, video-art figures.
- **MoMA**: 20–30 hits, strongest on Arcangel, Reas, Maeda, Steyerl, Random International (Rain Room), Paglen, historical works.
- **Met**: 5–15 hits at most. The Met is historical-heavy; contemporary digital art is thin in their holdings.
- **Art Blocks**: 15–30+ hits. Strong on generative/on-chain works: Fidenza, Ringers, Chromie Squiggle, Meridian, Subscapes, The Eternal Pump, Archetype, Gazers, Anticyclone, etc. Covers practitioners the three other sources miss entirely.

After all four passes, expect ~70–110 artworks with images out of 239 total. The remainder waits for an fxhash pass or manual sourcing.
