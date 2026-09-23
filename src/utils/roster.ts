// The artists of a gallery, venue or platform, read off live relations.
//
// A gallery's own edges are to works and shows; its artists sit one step
// behind them (work → CREATED_BY → artist, artist → PARTICIPATED_IN → show
// → PRESENTED_BY → gallery). The profile page leads with this roster, but it
// is DERIVED at read time and never written back as edges: a work shown at
// a gallery does not make the gallery represent its maker. Only REPRESENTS
// says that, and it is listed apart.

import type { DatabaseSync } from "node:sqlite";
import { notRetired } from "./visibility.js";

export interface RosterEntry {
  id: string;
  name: string;
  slug: string;
  type: string;
  represented: boolean;
  shows: number;
  works: number;
}

export function rosterFor(db: DatabaseSync, orgId: string): RosterEntry[] {
  const acc = new Map<string, { represented: boolean; shows: Set<string>; works: Set<string> }>();
  const get = (id: string) => {
    let a = acc.get(id);
    if (!a) acc.set(id, (a = { represented: false, shows: new Set(), works: new Set() }));
    return a;
  };

  // represented: org REPRESENTS artist
  for (const r of db
    .prepare("SELECT target_id AS pid FROM edges WHERE source_id = ? AND edge_type = 'REPRESENTS' AND valid_until IS NULL")
    .all(orgId) as any[]) get(r.pid).represented = true;

  // in shows the org presented: artist PARTICIPATED_IN show PRESENTED_BY org
  for (const r of db
    .prepare(
      `SELECT p.source_id AS pid, p.target_id AS show FROM edges pr
         JOIN edges p ON p.target_id = pr.source_id AND p.edge_type = 'PARTICIPATED_IN' AND p.valid_until IS NULL
        WHERE pr.target_id = ? AND pr.edge_type = 'PRESENTED_BY' AND pr.valid_until IS NULL`
    )
    .all(orgId) as any[]) get(r.pid).shows.add(r.show);

  // works shown here, directly or in a show the org presented
  for (const r of db
    .prepare(
      `SELECT c.target_id AS pid, x.source_id AS work FROM edges x
         JOIN edges c ON c.source_id = x.source_id AND c.edge_type = 'CREATED_BY' AND c.valid_until IS NULL
        WHERE x.edge_type = 'EXHIBITED_AT' AND x.valid_until IS NULL
          AND (x.target_id = ?
               OR x.target_id IN (SELECT source_id FROM edges WHERE target_id = ? AND edge_type = 'PRESENTED_BY' AND valid_until IS NULL))`
    )
    .all(orgId, orgId) as any[]) get(r.pid).works.add(r.work);

  if (!acc.size) return [];
  const ids = [...acc.keys()];
  const out: RosterEntry[] = [];
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const rows = db
      .prepare(
        `SELECT n.id, n.name, n.slug, n.type FROM nodes n
          WHERE n.id IN (${chunk.map(() => "?").join(",")})
            AND n.type IN ('practitioner', 'collective') AND ${notRetired("n")}`
      )
      .all(...chunk) as any[];
    for (const r of rows) {
      const a = acc.get(r.id)!;
      out.push({ id: r.id, name: r.name, slug: r.slug, type: r.type, represented: a.represented, shows: a.shows.size, works: a.works.size });
    }
  }
  return out.sort(
    (a, b) =>
      Number(b.represented) - Number(a.represented) ||
      b.shows + b.works - (a.shows + a.works) ||
      a.name.localeCompare(b.name)
  );
}
