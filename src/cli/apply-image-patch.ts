// CLI: apply a shrink patch (produced by seed/_build/shrink_oversized.py) to
// the LIVE DB — repoint each node's metadata.cdn_image_url from the oversized
// original to the resized copy's new content-addressed URL.
//
// This is the live-DB half of the oversized-image shrinker. The Python side
// (seed/_build/shrink_oversized.py --apply) downloads + resizes + uploads the
// new R2 objects and emits the patch JSON; this CLI is the only thing that
// writes the database. Run it where the live DB lives — on prod via SSH:
//
//   flyctl ssh console --app adai-basel -C \
//     "node /app/dist/cli/apply-image-patch.js --from /tmp/patch.json"
//
// (the justfile recipe `shrink-oversized-prod-apply` wires the whole flow).
//
// SAFE / IDEMPOTENT:
//   - Each repoint is guarded: it only writes if the node's CURRENT
//     cdn_image_url still equals the patch's old_cdn_image_url. If prod has
//     drifted since the snapshot the patch was built from (a live re-upload,
//     a retire, a second apply), that entry is skipped — never clobbered.
//   - An entry already pointing at the new URL counts as already-applied.
//   - metadata.image_url (upstream provenance) is NEVER touched.
//   - We deliberately do NOT go through the contributor API / embed-on-write:
//     the image is visually identical (just fewer pixels), so re-embedding
//     would only churn the vectors and spend Gemini for nothing. This is a
//     surgical metadata UPDATE through the same crsql-loaded connection the
//     server uses, so CRDT bookkeeping stays correct.
//
//   --from <path>   patch JSON (required)
//   --dry-run       report what would change, write nothing
//   --db <path>     override DB path (else resolveCliDbPath: DB_PATH → /data/adai.db → ./adai.db)

import { readFileSync } from "node:fs";
import { initDb, getDb } from "../db.js";
import { resolveCliDbPath } from "../utils/db-path.js";

interface PatchEntry {
  node_id: string;
  old_cdn_image_url: string;
  new_cdn_image_url: string;
  old_key?: string;
  new_key?: string;
  orig_bytes?: number;
  new_bytes?: number;
}

interface Patch {
  generated_at?: string;
  params?: Record<string, unknown>;
  public_base?: string;
  entries: PatchEntry[];
}

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

const NOW_ISO = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const from = typeof args.from === "string" ? args.from : null;
  const dryRun = args["dry-run"] === true;
  if (!from) {
    console.error("Usage: apply-image-patch --from <patch.json> [--dry-run] [--db <path>]");
    process.exit(2);
  }

  let patch: Patch;
  try {
    patch = JSON.parse(readFileSync(from, "utf-8"));
  } catch (e: any) {
    console.error(`Cannot read patch ${from}: ${e?.message ?? e}`);
    process.exit(1);
  }
  const entries = Array.isArray(patch?.entries) ? patch.entries : [];
  if (entries.length === 0) {
    console.error(`Patch has no entries — nothing to do (${from}).`);
    return;
  }

  const dbPath = (typeof args.db === "string" ? args.db : null) ?? resolveCliDbPath();
  console.error(`[apply-image-patch] using DB ${dbPath} — ${entries.length} entries from ${from}${dryRun ? "  [dry-run]" : ""}`);
  if (typeof args.db === "string") process.env.DB_PATH = args.db;
  initDb(dbPath);
  const db = getDb();

  const sel = db.prepare("SELECT metadata FROM nodes WHERE id = ?");
  const upd = db.prepare("UPDATE nodes SET metadata = ?, updated_by = ? WHERE id = ?");

  let updated = 0;
  let already = 0;
  let mismatched = 0;
  let missing = 0;
  let savedBytes = 0;
  const at = NOW_ISO();

  const apply = () => {
    for (const e of entries) {
      if (!e?.node_id || !e?.new_cdn_image_url) { missing++; continue; }
      const row = sel.get(e.node_id) as { metadata?: string } | undefined;
      if (!row) { missing++; continue; }
      let meta: any = {};
      if (row.metadata) {
        try { meta = JSON.parse(row.metadata); } catch { meta = {}; }
      }
      const cur = meta.cdn_image_url;
      if (cur === e.new_cdn_image_url) { already++; continue; }
      if (cur !== e.old_cdn_image_url) {
        // prod drifted from the snapshot — do not clobber.
        mismatched++;
        continue;
      }
      meta.cdn_image_url = e.new_cdn_image_url;
      // Inline provenance: enough to trace the swap after the original is culled.
      meta.cdn_resized = {
        at,
        orig_key: e.old_key ?? null,
        new_key: e.new_key ?? null,
        orig_bytes: e.orig_bytes ?? null,
        new_bytes: e.new_bytes ?? null,
      };
      if (!dryRun) {
        upd.run(JSON.stringify(meta), "cli-shrink-oversized", e.node_id);
      }
      updated++;
      if (typeof e.orig_bytes === "number" && typeof e.new_bytes === "number") {
        savedBytes += e.orig_bytes - e.new_bytes;
      }
    }
  };

  if (dryRun) {
    apply();
  } else {
    db.exec("BEGIN");
    try {
      apply();
      db.exec("COMMIT");
    } catch (e) {
      try { db.exec("ROLLBACK"); } catch { /* already rolled back */ }
      throw e;
    }
  }

  const mib = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MiB`;
  console.error(
    `[apply-image-patch] ${dryRun ? "would update" : "updated"} ${updated}  ·  ` +
    `already=${already} mismatched=${mismatched} missing=${missing}  ·  ` +
    `bucket egress freed ≈ ${mib(savedBytes)}`
  );
  if (mismatched > 0) {
    console.error(`  (${mismatched} skipped because prod's cdn_image_url no longer matches the patch — re-run the shrink to refresh)`);
  }
  if (!dryRun && updated > 0) {
    console.error("  next: reclaim the now-orphaned originals with `just cull-orphans-prod-delete`");
  }
}

main();
