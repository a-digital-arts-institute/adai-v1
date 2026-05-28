# Legacy gatherers — superseded

Earlier gatherer versions, superseded by the contract-conformant rewrites
in `../../`. Kept so old fetch logic is reproducible. **Do not run** — the
live versions handle the same sources.

| Legacy | Superseded by |
|---|---|
| `fetch_moma_v2.py` | `fetch_moma.py` |
| `fetch_moma_csv.py` | `fetch_moma.py` (merged digital + CSV paths) |
| `fetch_wikidata_artworks.py` | `fetch_wikidata.py` (unified) |
| `fetch_wikidata_portraits.py` | `fetch_wikidata.py` (unified) |

The unified Wikidata gatherer also subsumes `fetch_wikidata_v3.py`,
`fetch_wikidata_v3b.py`, and `fetch_wikidata_named_anchors.py`, but those
are still in `../../` pending the Phase 2 rewrite — they'll move here once
the unified replacement lands.
