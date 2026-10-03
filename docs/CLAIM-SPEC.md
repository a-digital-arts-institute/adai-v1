# Claim, handle, personal log, field lens — spec

Status: **draft for review** · 2026-10-03 · target: live on prod before Glitch (2–3 weeks)

The five agreed MVP points, as decided:

| # | Point | Decision |
|---|---|---|
| 1 | **Claim** (badge + claimed page) | Practitioners, collectives, institutions. An admin invite naming the node is instant; any other claim goes to a curator. A claimed peer inviting the other end of a relation is instant too. |
| 2 | **Handle** | `@name`, always an alias to **a node** (not to a person). `/@name` resolves to the node. |
| 3 | **Personal log** | Your nodes' relations over time. You can **contextualise** (note on a relation), **contest** (public mark, curator decides) and **invite** (email the other end). You also see what's pending about you. **No user approval**: approving edits stays with the moderators. |
| 4 | **Field lens** | Signed in, `/field` opens on your node. A toggle fades everything outside your neighbourhood. It's a personal *view* of public data, so nothing is hidden from anyone. |
| 5 | **After a URL read** | After Confirm, ask "is one of these you?", pick the node(s), pick a handle. |

---

## 1. Data model

There are no new CRR tables. What's public goes into existing CRRs (`node_aliases`, `signals`, node `metadata`). What's operational is local, like the rest of the intake.

### 1.1 `node_claims` (local)

```sql
CREATE TABLE IF NOT EXISTS node_claims (
    id              TEXT PRIMARY KEY NOT NULL,      -- 'clm_' + 16 hex
    node_id         TEXT NOT NULL,
    contributor_id  TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | withdrawn | revoked
    via             TEXT NOT NULL,                   -- invite | request | peer_invite | post_intake
    evidence        TEXT,                            -- free text / URL the claimant gave
    invited_by      TEXT,                            -- contributor id (peer_invite)
    queue_id        TEXT,                            -- intake_queue row (kind='claim') while pending
    signal_id       TEXT,                            -- the api_admin/claim signal that made it public
    reviewed_by     TEXT,
    reviewed_at     TEXT,
    created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_node_claims_node ON node_claims(node_id, status);
CREATE INDEX IF NOT EXISTS idx_node_claims_contributor ON node_claims(contributor_id, status);
```

- **Several approved claimants per node** are allowed (members of a collective or staff of an institution), all equal. There are no roles in the MVP.
- **One person can hold several claims** (me, my collective, my studio).
- **Migration:** every existing `contributor_emails.self_node_id` becomes an `approved` claim with `via='invite'`. `self_node_id` stays as the contributor's *primary* node, which the intake agent's default subject already reads.

### 1.2 Public face of a claim

On approval, an anchoring signal (`source_type='claim'`, `submitted_by=<claimant>`, `confidence='high'`) is written. The node gets a metadata patch through the normal path, so the before-image is recorded (`recordPrior`):

```json
{ "claimed": { "at": "2026-10-10T…", "handles": ["casey-reas"], "by": ["Casey Reas"] } }
```

The email never appears. `by` is the claimants' display names, and a claimant can choose `anonymous` (the badge still shows, the name doesn't). Revoking a claim patches the key back, again with a before-image.

### 1.3 Handles: `node_aliases(source='handle')`

`node_aliases` is already a CRR with `PRIMARY KEY (source, external_id)`, so **handle uniqueness is enforced by the existing PK**. CRRs can't carry a UNIQUE index, but they can carry a PK.

- `(source='handle', external_id='casey-reas', node_id='practitioner:casey reas')`
- Format `^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$` (3–30 chars), lowercase. A **reserved list** covers every top-level route and type name (`api`, `field`, `review`, `contribute`, `draft`, `batch`, `auth`, `me`, `practitioner`, …, `admin`, `adai`).
- Only an approved claimant can set a handle, and only on a node they've claimed. One *current* handle per node is the one in `metadata.claimed.handles[0]`. Old handles keep their alias row, so old links still resolve. That row isn't deleted, which keeps "nothing is deleted" true, and it also keeps a released handle from being re-taken.
- Each handle change counts against a limit of 1 per 30 days per node.
- `GET /@:handle` → 302 to `/:type/:slug`. `GET /@:handle/data` and `/@:handle/history` do the same.

### 1.4 Relation notes: contest + contextualise

Both are **signals** (CRR, public, consent-aware like every other signal), and both attach to a **relation**, the `(source, type, target)` triple, not to one claim row. That's because the profile shows a relation once, however many sources back it (`src/utils/claims.ts`).

- `source_type='subject_contest'` or `'subject_context'`, `lived_experience=1`.
- `content` = `{ "relation": {source_id, edge_type, target_id}, "note": "…" }`.
- A local index makes the profile, `/field` and the log cheap to read:

```sql
CREATE TABLE IF NOT EXISTS relation_notes (
    signal_id       TEXT PRIMARY KEY NOT NULL,
    kind            TEXT NOT NULL,                   -- contest | context
    source_id       TEXT NOT NULL,
    edge_type       TEXT NOT NULL,
    target_id       TEXT NOT NULL,
    node_id         TEXT NOT NULL,                   -- the claimed node it was written from
    contributor_id  TEXT NOT NULL,
    state           TEXT NOT NULL DEFAULT 'open',    -- contest: open | upheld | dismissed ; context: live | pending | withdrawn
    queue_id        TEXT,
    resolved_by     TEXT,
    resolved_at     TEXT,
    created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_relation_notes_triple ON relation_notes(source_id, edge_type, target_id);
CREATE INDEX IF NOT EXISTS idx_relation_notes_node ON relation_notes(node_id, created_at);
```

### 1.5 Queue kinds

`intake_queue.kind` gains `'claim'`, `'contest'` and `'context'` (the last one only for probationary claimants, see §4.2). `/review` gets a tab for each one, and the `/api/v1/review` JSON twin handles them through `approve`/`reject` (`src/utils/review.ts`).

---

## 2. Claim (point 1)

### 2.1 Entry points

1. **Profile page.** A signed-in user sees **"Is this you? Claim this page"** on a practitioner, collective or institution page. If you're not signed in, the same button opens the sign-in form with `redirect=/claim/:type/:slug`.
2. **Post-URL prompt** (§6).
3. **Peer invite** from the personal log (§4.3).
4. **Admin invite** (`npm run invite … practitioner:slug`, `POST /api/v1/invites` `{practitioner}`). This stays as it is and now also writes an approved claim. `practitioner` gets an alias, `node`, that accepts any claimable type.

### 2.2 The approval rule

| Situation | Result |
|---|---|
| Admin invite named this node | **approved** at once (`via='invite'`) |
| A claimed peer invited you to this node (§4.3) | **approved** at once (`via='peer_invite'`) |
| Anything else | **pending** → `intake_queue(kind='claim')` with the evidence, the claimant's email *domain* and any URL-intake drafts they ran on that node's site. A curator approves or rejects it on `/review`. |

The claimant gets an email on approval or rejection (Resend / stdout transport, as for intake notifications).

### 2.3 Uninvited people

Sign-in is invite-only, so someone who isn't invited can't reach §2.1. On the profile page, "Claim this page" asks a signed-out visitor for an email + evidence:

- **Invited address:** the normal magic link, which lands on the claim confirmation.
- **Uninvited address:** the same neutral "check your inbox" answer as today (no enumeration). The request goes into `intake_access_requests`, which gains `node_id` + `evidence` columns. The admin notification names the node. On `/review`'s claim tab, an admin **approving** it does two things at once: it invites the address and approves the claim, and the person gets a sign-in link that lands on their claimed page.

### 2.4 Badge + claimed page

- **Profile**: a badge under the name, `claimed · @handle`, plus the claimants' names unless they're anonymous. The relations list shows the contest and context notes from §4 inline.
- **For the claimant themselves**, the profile shows **Edit handle**, **Open my log** and **See in field**.
- **`/field` entity panel**: the same badge line. In the field itself, claimed nodes get a subtle ring. That's a cheap win, but optional.
- `/:type/:slug/data` and the archivist's `get_node` include `claimed` (no emails).

### 2.5 Withdraw / revoke

A claimant can withdraw their own claim. An admin can revoke one with `POST /api/v1/claims/:id/revoke` (`api_admin` signal, as in the correction model). A claim that ends is recorded in history and patches `metadata.claimed` (the before-image is kept). Handles stay attached to the node.

---

## 3. Handle (point 2)

- You set the handle in the claim confirmation step, or later from the profile. It's suggested from the slug, with a live availability check (`GET /api/claim/handle?h=`).
- `/@handle` is the shareable link, and the badge, the log header and invite emails all use it.
- An org node's handle belongs to the node, and any approved claimant can set it once it's unset (§1.3 covers the change limit).

---

## 4. Personal log (point 3): `GET /me`

This is a session page (like `/draft/:id`) with a JSON twin, `GET /api/me/log`, which a bearer token can use too, so an assistant can drive it. It shows, newest first, for **every node you've claimed** (with a switcher when there's more than one):

1. **Relations**: the relation events from `nodeHistory()` (`src/utils/history.ts`), each grouped by relation with its sources ("claimed by N sources"). Every live relation has **Contextualise**, **Contest** and, if the other end can be claimed and isn't yet, **Invite**.
2. **Pending about you**: `intake_queue` rows (any kind) whose proposed edges or patches touch your nodes. You can **object** to one, which attaches a contest note to the queue item so the curator sees it while reviewing. You can't approve: moderators approve.
3. **Your notes**: the state of each contest (open / upheld / dismissed) and each context note.
4. **Invites you sent**: whether each one was accepted, and how many you have left this week.
5. **Metadata edits** on your nodes (from `nodeHistory`), read-only, with a contest button that files a contest on the edit. It works the same way, with `relation` replaced by `{node_id, key}`.

### 4.1 Contest

- `POST /api/me/contest` `{relation | queue_id | edit, note (required, ≤2000), node_id}`.
- This writes a `subject_contest` signal and a `relation_notes` row, plus an `intake_queue(kind='contest')` row.
- **Public right away**: the relation shows *"contested by the subject"* with the note on the profile, in history, and as a dashed/flagged thread in `/field`. The edge stays live: a contest is a mark, not a decision.
- **The curator decides**:
  - **Upheld**: every live claim row of that triple is superseded bi-temporally by one `api_admin` signal (`invalidated_by`), reusing `src/utils/admin-actions.ts`. The relation shows as *ended (contested by subject)* in history.
  - **Dismissed**: the public mark comes off the relation, and the contest signal plus the curator's reason stay in history.
- You can only contest a relation that touches a node you've claimed.

### 4.2 Contextualise

- `POST /api/me/context` `{relation, note, node_id}` writes a `subject_context` signal and is shown under the relation on the profile and in history.
- **Gating** follows the claimant's trust tier, like every other write: `auto` and `reviewed` go live at once, and `probationary` goes to `intake_queue(kind='context')`. This is consistent with "moderators approve edits". → *open question Q1.*
- The same `node_id` rule applies, and the claimant can withdraw their own note (status → `superseded`, history keeps it).

### 4.3 Invite

- `POST /api/me/invite` `{node_id (the other end), email, name?, message?}`.
- **Who can invite:** anyone with an approved claim, for a node that is **one live hop** from one of their claimed nodes, is of a claimable type, and **has no approved claim** yet.
- **Effect:** `ensureContributorForEmail(…, invite: true, tier: 'probationary')` plus an **approved** claim (`via='peer_invite'`, `invited_by`). The email says who invited them and via which relation, and its magic link lands on `/me`.
- **Limit:** 10 a week per inviter (local table or `settings` counter). Admins can see the list and revoke it (`GET /api/v1/invites` gains `invited_by`).
- **Safety:** since the claim is instant, the invite email is the only proof. An admin can revoke a bad one later, and a claimed node's real owner can contest it (a claim contest goes to the claim queue).

---

## 5. Field lens (point 4)

- `/field` already reads the session cookie the same way (`GET /api/intake/me`, which gains `claims: [{node_id, handle}]`).
- **Signed in with a claim**: on first load, `focusInPlace(primary claimed node)` replaces the default overview. The nav is the same.
- **Toggle "my field"** (the chip column where the edge-type chips live, plus a key, `m`): it fades every node and thread outside the **2-hop** neighbourhood of your claimed nodes. This reuses the alpha-fade path the edge-type chips use (`graph-field.js` ~L1693). The toggle state is stored in `localStorage` (try/catch).
- The fade is client-side over data the page already has, so no new endpoint is needed and the IndexedDB stamp cache is untouched.
- Contested relations render dashed, with the contest colour, for everyone (not just inside the lens).

---

## 6. After a URL read (point 5)

On `/batch/:id` (the receipt, after Confirm), if the contributor has **no approved claim** yet:

> **Is one of these you?**
> ☐ Casey Reas (practitioner) · ☐ Processing Foundation (collective) · …
> handle: `@[casey-reas]` ✓ available
> [Claim selected]

- **Candidates:** the draft's `subject_node_id` first, then the batch's practitioner, collective and institution nodes (cap 8).
- **Rule:** if the node equals the invite's `self_node_id`, the claim is instant. Otherwise it's `pending` with `via='post_intake'`, and the **draft itself is the evidence** (the curator sees the URL they read and that site's host matched against the node's `website`).
- You can dismiss the prompt ("not now"), and it comes back on the next receipt, not on every page.
- If you already have a claim, the receipt shows "add another page you represent?" in a smaller style.

---

## 7. Routes summary

| Route | Auth | |
|---|---|---|
| `GET /@:handle[/data\|/history]` | public | 302 to the node |
| `GET /claim/:type/:slug` | session | the claim confirmation (evidence + handle) |
| `POST /api/claims` `{node_id, evidence?, handle?, via?}` | session/bearer | create a claim (§2.2 rule) |
| `POST /api/claims/request` `{node_id, email, evidence}` | public | the signed-out claim → magic link or access request |
| `POST /api/claims/:id/withdraw` | owner | |
| `GET /api/claim/handle?h=` | session | availability |
| `PUT /api/nodes/:id/handle` `{handle}` | claimant | set/change a handle |
| `GET /me` · `GET /api/me/log` | session/bearer | the personal log |
| `POST /api/me/contest` · `/context` · `/invite` | session/bearer | §4 |
| `POST /api/v1/claims/:id/revoke` · `GET /api/v1/claims` | admin | |
| `/review?kind=claim\|contest\|context` | curator | |

---

## 8. Build order (≈ 2–3 weeks)

1. **Schema + claims core**: tables, migrating `self_node_id` → claims, `node_claims` service, the review kinds, the admin endpoints, tests. *(2–3 days)*
2. **Handle + badge + `/@`**: aliases, the reserved list, the profile badge, `/data`, the archivist. *(1–2 days)*
3. **Claim entry points**: the profile button, the signed-out request → access-request flow, `/claim/:type/:slug`, emails. *(2 days)*
4. **`/me` log + contest/context/invite**: the history reuse, notes, the curator resolution paths, the invite limit. *(4–5 days)*
5. **Field lens**: focus on load, the toggle, contested threads, the badge in the entity panel. *(2 days)*
6. **Post-URL prompt** on `/batch/:id`. *(1 day)*
7. **SKILL.md + CLAUDE.md + spec updates; deploy.** *(1 day)*

Each step lands as its own commit on `feat/claim`, with tests next to the existing `tests/*.test.ts`.

---

## 9. Open questions

- **Q1. Context notes from probationary claimants**: queue them (consistent with "moderators approve") or publish at once (the subject speaking about themselves)? *Default in this spec: queue.*
- **Q2. Contester identity**: should a contest show "contested by the subject" only, or name the claimant? *Default: "the subject" plus the handle.*
- **Q3. Peer-invite tier**: invitees start `probationary`. Should an invite from an `auto` claimant inherit `reviewed`?
- **Q4. Lens radius**: is 2 hops right for a dense node (an institution with 300 artists)? Option: 1 hop when the 2-hop set is over 500 nodes.
- **Q5. Claim conflicts**: a second person claims an already-claimed practitioner (one person, one node). Auto-route it to the curator with the existing claimant notified?
