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
| `apply_image_patches.py` | Merges everything in `image_patches/*.json` into `nodes.json`. |
| `image_patches/` | Output directory for the three fetcher scripts. One JSON file per source. |

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

# 3. Merge the three patch files into nodes.json
python3 apply_image_patches.py                   # dry-run, shows counts
python3 apply_image_patches.py --write           # rewrites nodes.json, backup at .bak

# 4. Re-validate
python3 validate_seed.py
```

## Design notes

**Dry-run by default.** Every fetcher script prints what it would write. Add `--write` to persist. This keeps accidental runs cheap.

**Patches are additive, never destructive.** `apply_image_patches.py` only fills in `image_url` on artwork nodes that don't already have one. A node with an existing image from an earlier run is left alone. Running all three fetchers twice produces the same result.

**Priority on conflicts.** When three sources claim the same artwork:
1. `wikidata` wins (stable Commons image + clear licensing metadata on the Commons page)
2. `met` next (Open Access CC0, unambiguous reuse)
3. `moma` last (collection thumbnail, per-work rights vary)

**Name matching is accent- and case-insensitive.** "Vera Molnár" = "Vera Molnar", "Myriad (Tulips)" = "myriad tulips".

**Why no Art Blocks / fxhash fetcher yet.** Those require GraphQL subgraph access or signed API calls, and return IPFS thumbnail URLs that may not stay pinned. They belong in a separate pass where the licensing and pinning model is decided. For now, generative/crypto artwork images stay `null`.

## What to expect per source (rough guesses)

- **Wikidata artworks**: 20–40 hits, strongest on Vera Molnár, Frieder Nake, Casey Reas, Lynn Hershman Leeson, Lozano-Hemmer, video-art figures.
- **MoMA**: 20–30 hits, strongest on Arcangel, Reas, Maeda, Steyerl, Random International (Rain Room), Paglen, historical works.
- **Met**: 5–15 hits at most. The Met is historical-heavy; contemporary digital art is thin in their holdings.

After all three passes, expect ~50–80 artworks with images out of 239 total. The rest waits for the Art Blocks / fxhash pass or manual sourcing.
