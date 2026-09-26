// Invite a contributor to the URL intake (docs/URL-INTAKE-SPEC.md §4.3).
//
//   npm run invite -- --email x@y.z --name "Name" --tier auto [--practitioner "practitioner:name"] [--send]
//
// Inserts the contributor + contributor_emails row up front so the tier and
// the display name are right on first login. --send also emails a sign-in
// link (stdout transport when RESEND_API_KEY is unset). Runs against the DB
// resolved by src/utils/db-path.ts (DB_PATH → /data/adai.db → ./adai.db).

import { initDb } from "../db.js";
import { resolveCliDbPath } from "../utils/db-path.js";
import { ensureContributorForEmail, normaliseEmail } from "../intake/auth.js";
import { sendLoginEmail } from "../intake/mail.js";

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0) return null;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : "";
}

async function main() {
  const email = normaliseEmail(arg("email"));
  const name = arg("name");
  const tier = arg("tier") ?? "probationary";
  const practitioner = arg("practitioner");
  const send = process.argv.includes("--send");
  if (!email || !name) {
    console.error('Usage: npm run invite -- --email x@y.z --name "Name" [--tier auto|reviewed|probationary] [--practitioner "practitioner:slug"] [--send]');
    process.exit(2);
  }
  if (!["auto", "reviewed", "probationary"].includes(tier)) {
    console.error(`bad --tier ${tier}`);
    process.exit(2);
  }
  const dbPath = resolveCliDbPath();
  const db = initDb(dbPath);
  console.error(`[invite] using DB ${dbPath}`);
  if (practitioner) {
    const row = db.prepare("SELECT id FROM nodes WHERE id = ?").get(practitioner);
    if (!row) {
      console.error(`[invite] node '${practitioner}' does not exist`);
      process.exit(1);
    }
  }
  const c = ensureContributorForEmail(db, { email, name, tier, self_node_id: practitioner ?? undefined, invite: true });
  console.log(JSON.stringify({ contributor_id: c.id, name: c.name, trust_tier: c.trust_tier, email: c.email, self_node_id: c.self_node_id }));
  if (send) {
    await sendLoginEmail(db, email, null, "/contribute");
    console.error("[invite] sign-in link sent");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
