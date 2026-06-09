// Display-year extractor for artwork nodes.
//
// Artwork metadata stores year inconsistently across seed sources:
//   1. metadata.year_raw                              — verbatim human string ("c. 1965", "1985–present"). Wins when present.
//   2. metadata.year_start[/_end][/_ongoing]          — structured ints (canonical going forward).
//   3. metadata.year                                  — fetcher convention (MoMA, Wikidata): string, sometimes "YYYY",
//                                                       sometimes "YYYY-MM-DD" (ISO date), sometimes "YYYY–YYYY" (range).
//                                                       We strip ISO dates down to YYYY; everything else passes through.
//   4. metadata.date_text                             — V&A gatherer: verbatim museum date string ("1967 - 1968").
//   5. metadata.mint_opens_at                         — fxhash gatherer: ISO datetime of the mint opening. → YYYY.
//   6. metadata.created_at                            — SuperRare gatherer: ISO datetime of the token creation. → YYYY.
//   7. metadata.basic_info.active_years               — legacy seed string ("2024-2025").
//   8. metadata.full_profile.basic_info.active_years  — same, nested under full_profile in older shapes.
//
// (4)–(6) are the live four-source canon's actual keys — none of the May
// 2026 gatherers writes (1)–(3), so before they were added here every canon
// artwork rendered yearless. Art Blocks stores NO date at all in its
// metadata; fixing that is a producer change in fetch_artblocks.py (+ canon
// regeneration), not something to fake here.
//
// All are tried in that priority order. Returns a single display
// string or null when no year info exists. Non-artwork types should not
// call this — practitioner born/died lives elsewhere with different
// rendering rules.
//
// Two entry points:
//   - formatArtworkYear({extracted fields}) — for SQL paths that pulled
//     the fields via json_extract.
//   - formatArtworkYearFromMetadata(meta)   — for code that already has
//     a parsed metadata object (profile page, /data export).
//
// yearSqlFragment() returns the SQL SELECT fragment so every endpoint
// extracts the same columns under the same names. Use it via template
// literal in prepared statements.

export interface ArtworkYearFields {
  year_raw?: string | null;
  year_start?: number | null;
  year_end?: number | null;
  // SQLite returns booleans as 0/1; accept either.
  year_ongoing?: number | boolean | null;
  /** metadata.year — fetcher convention (MoMA/Wikidata). May be "YYYY", "YYYY-MM-DD", "YYYY–YYYY", or null. */
  year_meta?: string | null;
  date_text?: string | null;      // metadata.date_text — V&A verbatim ("1967 - 1968")
  mint_opens_at?: string | null;  // metadata.mint_opens_at — fxhash ISO datetime
  created_at?: string | null;     // metadata.created_at — SuperRare ISO datetime
  active_years_1?: string | null; // metadata.basic_info.active_years
  active_years_2?: string | null; // metadata.full_profile.basic_info.active_years
}

// "2019-01-01" → "2019". "2018" → "2018". "2021–2022" → "2021–2022".
// Defensive: never returns empty string.
function normaliseLooseYear(s: string): string {
  const trimmed = s.trim();
  const isoMatch = /^(\d{4})-\d{2}-\d{2}(?:T.*)?$/.exec(trimmed);
  if (isoMatch) return isoMatch[1]!;
  return trimmed;
}

export function formatArtworkYear(fields: ArtworkYearFields): string | null {
  const raw = fields.year_raw;
  if (typeof raw === "string" && raw.trim()) return raw.trim();

  const start = fields.year_start;
  const end = fields.year_end;
  const ongoing = !!fields.year_ongoing;
  if (typeof start === "number") {
    if (ongoing && (end == null)) return `${start}–`;
    if (end == null || end === start) return `${start}`;
    return `${start}–${end}`;
  }

  const ym = fields.year_meta;
  if (typeof ym === "string" && ym.trim()) return normaliseLooseYear(ym);

  const dt = fields.date_text;
  if (typeof dt === "string" && dt.trim()) return dt.trim();

  const mint = fields.mint_opens_at;
  if (typeof mint === "string" && mint.trim()) return normaliseLooseYear(mint);

  const created = fields.created_at;
  if (typeof created === "string" && created.trim()) return normaliseLooseYear(created);

  const a1 = fields.active_years_1;
  if (typeof a1 === "string" && a1.trim()) return a1.trim();
  const a2 = fields.active_years_2;
  if (typeof a2 === "string" && a2.trim()) return a2.trim();

  return null;
}

export function formatArtworkYearFromMetadata(meta: any): string | null {
  if (!meta || typeof meta !== "object") return null;
  return formatArtworkYear({
    year_raw: meta.year_raw,
    year_start: meta.year_start,
    year_end: meta.year_end,
    year_ongoing: meta.year_ongoing,
    year_meta: typeof meta.year === "string" ? meta.year : null,
    date_text: typeof meta.date_text === "string" ? meta.date_text : null,
    mint_opens_at: typeof meta.mint_opens_at === "string" ? meta.mint_opens_at : null,
    created_at: typeof meta.created_at === "string" ? meta.created_at : null,
    active_years_1: meta.basic_info?.active_years,
    active_years_2: meta.full_profile?.basic_info?.active_years,
  });
}

// SQL fragment that pulls every field formatArtworkYear() reads. Comma-
// separated, no leading/trailing comma — embed in a SELECT list.
//
// Usage:
//   `SELECT id, name, type, slug, ${YEAR_SQL_FRAGMENT} FROM nodes WHERE …`
//
// The extracted columns are then passed to formatArtworkYear() (or used
// as-is in the response if you'd rather format client-side).
export const YEAR_SQL_FRAGMENT = `
json_extract(metadata,'$.year_raw') AS year_raw,
json_extract(metadata,'$.year_start') AS year_start,
json_extract(metadata,'$.year_end') AS year_end,
json_extract(metadata,'$.year_ongoing') AS year_ongoing,
json_extract(metadata,'$.year') AS year_meta,
json_extract(metadata,'$.date_text') AS date_text,
json_extract(metadata,'$.mint_opens_at') AS mint_opens_at,
json_extract(metadata,'$.created_at') AS created_at,
json_extract(metadata,'$.basic_info.active_years') AS active_years_1,
json_extract(metadata,'$.full_profile.basic_info.active_years') AS active_years_2
`.trim();
