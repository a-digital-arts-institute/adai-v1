---
name: adai-contribute
description: Contribute to the A(DAI) Digital Arts Knowledge Commons graph (https://adai-basel.fly.dev) on behalf of a practitioner using their bearer token in ADAI_TOKEN. Use this skill when the user wants to add a text signal about an existing node, create a new node (practitioner, artwork, concept, scene, institution, collective, platform, etc.), add or supersede an edge between two nodes (CREATED_BY, EMBODIES, PRACTICES, EXHIBITED_AT, CLASSIFIED_BY, BELONGS_TO, COLLABORATES_WITH, USES_TECHNIQUE, INFLUENCES, RESPONDS_TO), upload an image and attach it to a node, tag a session of writes with a batch_id, review the practitioner's own contribution history, or — with an admin-scope token — mint/list/revoke contributor tokens, work the curator review queue (list, approve, reject, bulk by batch or contributor), revoke a signal, retire a node, or roll back an entire contribution batch ("delete and start again", provenance-preserving). Talks to /api/v1/* via curl. Respects trust tiers (auto/reviewed go live, probationary queue at /review for curator approval). Never infer INFLUENCES or RESPONDS_TO from style or visual similarity; both require attested artist intent.
---

# A(DAI) contributor skill — for Claude (and any other AI assistant) writing to the knowledge commons

You are a Claude instance running with the practitioner's local sandbox. The
practitioner has handed you a bearer token for the A(DAI) Digital Arts
Knowledge Commons. Everything you contribute will be **attributed to them**,
land in the public commons under their consent settings, and remain
**revocable**. Don't be reckless.

A(DAI) is live at https://adai-basel.fly.dev/. The graph behind it has
practitioners, artworks, concepts, scenes, institutions, collectives,
platforms — see `/api/stats` for current counts.

---

## 0 — Setup, 30 seconds

`ADAI_TOKEN` should already be set in your environment by the practitioner.
Confirm it's there and identify yourself before writing anything:

```bash
# The token the practitioner gave you. Treat it like an SSH key — do NOT echo it.
[ -n "$ADAI_TOKEN" ] || { echo "ADAI_TOKEN not set — ask the practitioner"; exit 1; }
export ADAI_BASE="${ADAI_BASE:-https://adai-basel.fly.dev}"  # override for dev

# Confirm who you are about to write as.
curl -s -H "Authorization: Bearer $ADAI_TOKEN" "$ADAI_BASE/api/v1/whoami" | jq
```

Expected:
```json
{
  "contributor": { "id": "...", "name": "Casey Reas", "trust_tier": "reviewed" },
  "token_label": "claude-laptop",
  "token_prefix": "adai_abc1",
  "scope": "write",
  "r2_configured": true
}
```

If `trust_tier` is `auto` or `reviewed`, your writes go live immediately.
If it's `probationary`, every write lands in the curator queue at
`$ADAI_BASE/review` — that's normal for new contributors. **You should
still contribute** — just be especially careful with edges and node
creates, since each one is a curator's time.

If `r2_configured` is `false`, image uploads (§1.5) will hard-fail with
`503 r2_not_configured`. The other endpoints still work — tell the
practitioner to set the `R2_*` env vars if they need images.

---

## 0.5 — Opening move

Once `whoami` succeeds, tell the practitioner who they're writing as and
what you can do for them (say things about existing entries, create new
ones, connect them, attach images — §1). Then offer a few starting
points; these map to the most common sessions and keep first-time
contributors out of trouble:

- **"Does ___ already exist in the graph?"** — always the first check (§1.0).
- **"Show me what you'll add before you post it."** — draft → sign-off → POST.
- **"What's my source for this?"** — required for INFLUENCES / RESPONDS_TO (§1.4).
- **"Will this go live now, or be reviewed first?"** — trust tier (§3).
- **"What have I contributed so far?"** — contribution history (§1.6).
- **"Here are the works from my show — add them and attach these images."**
  — batch intake; confirm the count and set a `batch_id` first (§1.7, §6).

One more thing to surface unprompted: the graph is a **public commons** and
contributions are attributed. If something they're telling you sounds
private (an unannounced collab, a personal anecdote about someone else),
ask before writing it.

---

## 1 — The verbs

You have two read verbs and four write verbs. Pick the smallest one that
does the job.

### 1.0 `GET /api/graph` — discover what already exists

Before creating a node or edge, **look**. Duplicates are real work for the
curator to clean up. These read endpoints are unauthenticated.

```bash
# Every node of a type (id + name + slug + optional images). The id is
# what you pass to the write endpoints; the slug is what you pass to the
# ego/component endpoints below.
curl -s "$ADAI_BASE/api/graph?type=practitioner" | jq '.nodes[:3]'
# [
#   { "id": "practitioner:casey-reas", "name": "Casey Reas",
#     "type": "practitioner", "slug": "casey-reas",
#     "cdn_image_url": "https://pub-….r2.dev/images/ab/abcd….jpg" },
#   ...
# ]

# Ego graph — one hop around a node. Pass the slug, not the id.
curl -s "$ADAI_BASE/api/graph/casey-reas" | jq

# Full connected component reachable from a node (BFS over live edges).
# Use this when you need the practitioner's full neighbourhood — concepts
# they practise, collectives they belong to, artworks they made, etc.
# Caps at 800 by default; pass ?max_nodes=N up to 5000.
curl -s "$ADAI_BASE/api/graph/casey-reas/component?max_nodes=200" | jq
```

Valid `type=` values: `practitioner`, `artwork`, `concept`, `scene`,
`institution`, `collective`, `platform`, `publication`, `project`,
`classification_regime`. Pass `type=_all` for everything.

**Always grep these results for an existing name before you `POST /nodes`.**
Match case-insensitively, allow for punctuation differences, and surface
near-matches to the practitioner ("I see an existing `practitioner:tyler-hobbs`
— is that the same person?") rather than guessing.

### 1.1 `POST /api/v1/signals` — a piece of text about an existing node

Use this when the practitioner wants to **say something** about an entity:
context, attribution, a correction, a memory. The text goes into the
`signals` table; the curator decides whether to fold it into the node's
narrative.

```bash
curl -s -X POST "$ADAI_BASE/api/v1/signals" \
  -H "Authorization: Bearer $ADAI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target_node": "practitioner:casey-reas",
    "title": "Pedagogy note",
    "content": "Casey emphasised that Form+Code was structured around the idea that...",
    "source_url": "https://artblog.example.com/interview-2024"
  }'
```

Response: `{ signal_id, intake_id, status: "approved" | "pending", target_node }`.

### 1.2 `POST /api/v1/nodes` — create a new entity

Use this when nothing in §1.0 matched what the practitioner is talking
about. The server computes `<type>:<slug>` from the name (slug =
lowercase, spaces → `-`, parens/dots/apostrophes stripped, `&` → `and`).
Pass `slug` explicitly only if you need to override that.

```bash
curl -s -X POST "$ADAI_BASE/api/v1/nodes" \
  -H "Authorization: Bearer $ADAI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "scene",
    "name": "Bay Area Generative Art 1980s",
    "metadata": { "status": "draft", "summary": "Loose meet-ups around..." },
    "aliases": [{ "source": "wikidata", "external_id": "Q123456" }]
  }'
```

Returns `{ node_id, created, status, signal_id, intake_id, warnings }`.
`created: false` means a node with that id already existed — your
metadata is **not** merged in that case; use PATCH (§1.3) instead.

After a successful create, hand the practitioner the share links: the
profile page `$ADAI_BASE/<type>/<slug>` and the field view zoomed straight
to the node, `$ADAI_BASE/field?node=<node_id>` (URL-encode the id). The
second one is the "look at what I added" link.

**Common metadata fields by type.** Metadata is free-form, but the UI
reads these specific keys and renders them everywhere (profile pages,
graph/field hover, embed-space tooltip, listings). Put structured data
in the fields below when you have it — fall back to free text otherwise.

For `type: "artwork"` — **year** (single source of truth for any
artwork-year display surface):

| Field | Type | Meaning |
|-------|------|---------|
| `year_start` | int | First year. Required for any year display when you don't have `year_raw`. |
| `year_end` | int \| null | Last year. Null or equal to `year_start` ⇒ single-year ("2024"). Otherwise renders as "2019–2024". |
| `year_ongoing` | bool | When true and `year_end` is null, renders as "2019–". |
| `year_raw` | string | Verbatim human form for the cases ints can't capture: `"c. 1965"`, `"1985–present"`, `"late 1990s"`. **Wins over `year_start`/`year_end`** when present, so only set it if the structured pair is wrong. |

Example creating an artwork with a clean year range:

```bash
curl -s -X POST "$ADAI_BASE/api/v1/nodes" \
  -H "Authorization: Bearer $ADAI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "artwork",
    "name": "Fidenza",
    "metadata": {
      "status": "confirmed",
      "year_start": 2021,
      "year_end": 2021,
      "medium": "long-form generative art on Art Blocks"
    }
  }'
```

Legacy seed artworks often store year under `basic_info.active_years`
(a string like `"2024-2025"`). The display layer reads that as a
fallback, so you don't need to migrate older nodes — but when **adding
new artworks or patching existing ones**, prefer the structured fields
above so future tooling can sort, filter, and reason about them.

### 1.3 `PATCH /api/v1/nodes/:id` — merge into existing metadata

Use this to **add or correct fields** on a node you didn't create — bios,
status flags, biographical links, URLs. The body is a JSON merge-patch:
keys you provide are merged, nested objects deep-merge, `null` deletes a
key. **You can't change `id` / `type` / `slug` / `name`** — those live in
columns, not metadata.

The node id goes in the path, so URL-encode it. Spaces → `%20`, colons
stay literal (curl handles them fine in unquoted form, but be safe in
scripts):

```bash
curl -s -X PATCH "$ADAI_BASE/api/v1/nodes/practitioner:casey-reas" \
  -H "Authorization: Bearer $ADAI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "homepage": "https://reas.com", "status": "confirmed" }'

# Legacy node id with a space — encode the space in the path:
curl -s -X PATCH "$ADAI_BASE/api/v1/nodes/practitioner:casey%20reas" \
  -H "Authorization: Bearer $ADAI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "homepage": "https://reas.com" }'
```

**Path params get URL-encoded; JSON body values do not.** That's why
`target_node` / `source_id` / `target_id` in POST bodies above keep
spaces as-is.

### 1.4 `POST /api/v1/edges` — connect two existing nodes

The graph is mostly edges. Use the curated edge types:

| Edge | Direction | Meaning |
|------|-----------|---------|
| `CREATED_BY` | artwork → practitioner | who made it |
| `EMBODIES` | artwork → concept | what it expresses |
| `PRACTICES` | practitioner → concept / technique | what they work with |
| `USES_TECHNIQUE` | practitioner → technique | finer-grained than PRACTICES |
| `BELONGS_TO` | practitioner → collective / scene | membership |
| `EXHIBITED_AT` | artwork → institution / platform | where it showed |
| `CLASSIFIED_BY` | any node → classification_regime | who positioned it |
| `COLLABORATES_WITH` | practitioner ↔ practitioner | symmetric collab |
| `INFLUENCES` | practitioner → practitioner | **needs attestation** |
| `RESPONDS_TO` | artwork → artwork | **needs attestation** |

**Hard rule — do not infer `INFLUENCES` or `RESPONDS_TO` from style /
visual / thematic similarity.** These require an attested statement
(interview, essay, self-report). If you don't have a URL anchoring the
claim, don't write the edge. The embedding pipeline refuses to auto-emit
these for the same reason.

```bash
curl -s -X POST "$ADAI_BASE/api/v1/edges" \
  -H "Authorization: Bearer $ADAI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source_id": "artwork:fidenza",
    "target_id": "practitioner:tyler-hobbs",
    "edge_type": "CREATED_BY",
    "confidence": "high",
    "event_time": "2021-06-11"
  }'
```

**Fields:**
- `confidence`: free-form string, conventionally `"low"` / `"medium"` /
  `"high"`. Defaults to `"medium"` when omitted.
- `event_time`: when the relationship was **true in the world** (not when
  you recorded it — that's `created_at`, server-set). Optional. ISO 8601
  date (`"2021-06-11"`) or full timestamp (`"2021-06-11T14:00:00Z"`); the
  server stores the string verbatim, no validation.

**Idempotent retries.** Edge ids are deterministic on
`<source>--<EDGE_TYPE>--<target>--api-<your_contributor_name>`. POSTing
the same triple twice (e.g. after a flaky network) is a no-op — the
server `INSERT OR IGNORE`s and returns the same `edge_id`, no error, no
duplicate row.

**Superseding an edge** — when a fact changes (a practitioner left a
collective, an attribution turned out wrong), don't delete the old edge.
Add a new one with `supersedes_edge_id` pointing at the previous edge's
id (as returned by the earlier POST, or read from `/api/graph` plus the
deterministic format above). The old edge's `valid_until` and
`invalidated_by` get set; queries that filter `valid_until IS NULL` see
only the current state, but the history is preserved. Supersession breaks
the determinism rule above — the new edge gets a random 4-byte suffix
appended to its id, so you can re-attest the same triple as many times
as the facts change.

```json
{
  "source_id": "practitioner:foo",
  "target_id": "collective:bar",
  "edge_type": "BELONGS_TO",
  "supersedes_edge_id": "practitioner:foo--BELONGS_TO--collective:bar--api-casey-reas"
}
```

### 1.5 `POST /api/v1/images` — upload an image and attach it

The practitioner just dropped a file in your sandbox. Hash it, push it to
the R2 mirror, attach the URL to a node — all in one round-trip.

```bash
curl -s -X POST "$ADAI_BASE/api/v1/images" \
  -H "Authorization: Bearer $ADAI_TOKEN" \
  -F "image=@/tmp/casey-portrait.jpg" \
  -F "node_id=practitioner:casey-reas"
```

Returns `{ node_id, upload: { key, url, sha256, bytes, content_type,
already_existed }, status, signal_id, intake_id }`. The `upload` block
is the immutable R2 object; the `status` tells you whether the metadata
patch went live or is queued.

JSON fallback (when you don't have multipart at hand):

```bash
B64=$(base64 -w0 /tmp/casey-portrait.jpg)
curl -s -X POST "$ADAI_BASE/api/v1/images" \
  -H "Authorization: Bearer $ADAI_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"node_id\":\"practitioner:casey-reas\",\"mime_type\":\"image/jpeg\",\"image_base64\":\"$B64\"}"
```

**What gets attached.** On approval, three fields are merged into the
node's `metadata`:
- `cdn_image_url` — the R2 URL. **Always overwritten** by each upload.
- `image_url` — upstream provenance URL. Only written **if missing**, so
  the original source URL (MoMA, Wikimedia, fxhash) stays authoritative
  when one exists.
- `image_sha256` — content hash of the bytes you uploaded. Always rewritten.

**One image per node.** There is no gallery, no array, no
primary/secondary distinction. Uploading a second image to the same node
replaces `cdn_image_url`. If the practitioner wants multiple images,
confirm whether they want the *new* one to win or want you to leave the
node alone.

**Idempotent on bytes.** Images are content-addressed: uploading the
same bytes twice is free (server HEADs R2 first; `already_existed: true`
in the response). Max payload: 12 MB.

**If `whoami` showed `r2_configured: false`,** this endpoint returns
`503 r2_not_configured` immediately — don't bother attempting. The
upload is the *only* endpoint that needs R2; signals/nodes/edges all
work without it.

### 1.6 `GET /api/v1/contributions` — the practitioner's own history

Answers "what have I contributed, and did it go live?" — every write made
with this token's contributor identity, newest first, with review status.
Token-scoped: it only ever shows their own rows.

```bash
curl -s -H "Authorization: Bearer $ADAI_TOKEN" "$ADAI_BASE/api/v1/contributions" | jq

# only the ones still waiting on a curator
curl -s -H "Authorization: Bearer $ADAI_TOKEN" \
  "$ADAI_BASE/api/v1/contributions?status=pending&limit=20" | jq
```

Response: `{ contributor, totals: { approved: N, pending: N, rejected: N },
returned, items }` where each item carries `action` (`signal` /
`create_node` / `patch_node` / `add_edge` / `attach_image`), `target_node`,
`status`, `created_at`, the anchoring `signal_id` + `title`, and the
`batch_id` when the write carried one (§1.7). Filter to one session with
`?batch=<batch_id>`. A `rejected` item includes the curator's
`rejection_reason` — relay it honestly; it's feedback, not a scolding.

### 1.7 `batch_id` — tag a session of related writes

Every write endpoint accepts an **optional batch handle** so a whole
session can be inspected later — and, if it went wrong, rolled back by an
admin in ONE call (§4.7) instead of fifty. **Always set one when you're
doing more than a couple of related writes** (a show's worth of artworks,
a gallery archive, any §6 bulk intake). For one-off contributions it's
fine to omit.

- `POST /signals`, `POST /nodes`, `POST /edges`: pass `"batch_id": "..."`
  in the JSON body.
- `POST /images`: pass `batch_id` as a multipart field (or JSON key).
- `PATCH /nodes/:id`: the body IS the metadata merge-patch, so the handle
  rides as a **query param**: `PATCH /api/v1/nodes/:id?batch_id=...`.

Format: 1–120 chars, letters/digits plus `. _ : -` (no spaces). Convention:
`<contributor-slug>-<purpose>-<YYYY-MM-DD>`, e.g.
`nguyen-wahed-archive-2026-06-08`. Generate it once at the start of the
session, use it on every write in that session, and tell the practitioner
what it is — it's their receipt.

```bash
BATCH="casey-reas-show-intake-2026-06-08"
curl -s -X POST "$ADAI_BASE/api/v1/nodes" \
  -H "Authorization: Bearer $ADAI_TOKEN" -H "Content-Type: application/json" \
  -d "{\"type\":\"artwork\",\"name\":\"Process 18\",\"batch_id\":\"$BATCH\"}"

# later: everything this session did, in one view
curl -s -H "Authorization: Bearer $ADAI_TOKEN" \
  "$ADAI_BASE/api/v1/contributions?batch=$BATCH" | jq
```

---

## 2 — ID conventions

- **Newly-created nodes** always get the hyphenated form:
  `<type>:<slug>` where slug is `lowercase`, spaces → `-`, parens / dots /
  apostrophes stripped, `&` → `and`. Examples: `practitioner:casey-reas`,
  `artwork:fidenza`, `classification_regime:a-dai-seed-canon-v1-2026-04`.
  This is what the API produces and what you should use in every example.
- **Legacy seed nodes** keep spaces from their original names:
  `practitioner:casey reas`, `classification_regime:a(dai) seed canon v1 (april 2026)`.
  **Both forms resolve** for write endpoints — the server matches on the
  full id. When you find a node via `/api/graph` (§1.0), echo back
  whichever id form the API returned; don't translate.
- **URL-encode for path params, leave alone in JSON bodies.** PATCH puts
  the id in the URL path, so spaces become `%20`. POST bodies (`source_id`,
  `target_id`, `target_node`) take the id verbatim — JSON handles it.
- **Edges**: the server computes the id (see §1.4). You don't write it.

To slugify yourself: `slugify("Casey Reas")` → `casey-reas`,
`slugify("Form & Code")` → `form-and-code`.

---

## 3 — Trust and the queue

The server returns `status: "approved"` or `status: "pending"` on every
write. `pending` means a human has to click Approve at `/review`. **Tell
the practitioner what happened** — copy the link `$ADAI_BASE/review` into
your reply.

If the practitioner's trust is `probationary`, expect every write to
queue. Don't try to escalate. Don't try to "merge" by writing multiple
times. One signal/node/edge/image per intent.

Note: for image uploads under `probationary`, the R2 upload happens
immediately (the bytes are content-addressed and immutable, so there's
nothing to undo), but the metadata patch that attaches the URL is queued.
The response includes a `note` field saying as much.

---

## 4 — If your token is admin-scope

`whoami` will show `"scope": "admin"`. Admin tokens can do everything a
write token can (signals / nodes / edges / images, attributed to the
admin contributor), **plus**:

- mint write-scope tokens for other practitioners and revoke any token
  (§4.1–4.3) — but never mint other admin tokens; that's intentionally
  limited to the operator running the local CLI on the host;
- work the curator review queue over JSON — list, approve, reject,
  bulk-sweep by batch or contributor (§4.4);
- run the **correction primitives** — revoke a signal, retire a node,
  retire a whole batch (§4.5–4.7).

One principle behind all of it: **nothing is ever deleted.** Signals flip
to `status='revoked'`, edges get bi-temporally superseded
(`valid_until` + `invalidated_by`), nodes get `metadata.retired` and
vanish from every listing while staying reachable by direct URL for
audit. Every correction is anchored by an admin signal recording who,
when, and why — corrections have provenance exactly like contributions.

### 4.1 Mint a contributor token for someone

```bash
curl -s -X POST "$ADAI_BASE/api/v1/tokens" \
  -H "Authorization: Bearer $ADAI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contributor_name": "Casey Reas",
    "label": "claude-laptop",
    "create_if_missing": true,
    "tier": "reviewed"
  }'
```

Response includes `raw_token` — show it to the practitioner ONCE, in a
channel they trust (their chat with their own Claude works). The server
keeps only `sha256(token)`. You can't recover it later; if they lose it,
revoke and mint a new one.

`tier` controls auto-merge for the new contributor. Defaults to
`probationary`. Use `reviewed` when you trust them to skip the curator
queue. `auto` is reserved for the founding team and the practitioner
themself.

### 4.2 List tokens

```bash
curl -s "$ADAI_BASE/api/v1/tokens" \
  -H "Authorization: Bearer $ADAI_TOKEN" | jq

# filter
curl -s "$ADAI_BASE/api/v1/tokens?contributor=Casey%20Reas&active=1" \
  -H "Authorization: Bearer $ADAI_TOKEN" | jq
```

### 4.3 Revoke a token (rotation, leak, change of heart)

```bash
curl -s -X POST "$ADAI_BASE/api/v1/tokens/adai_abc12345/revoke" \
  -H "Authorization: Bearer $ADAI_TOKEN"
```

Soft-delete: the row stays for audit, `revoked_at` gets set, the bearer
hits 401 from then on.

### 4.4 Work the review queue

The JSON twin of the `/review` web page — same materialisation logic on
the server, so approving here is identical to a curator clicking Approve.

```bash
# What's pending? (filters: ?status= ?contributor= ?batch= ?kind= ?limit=)
curl -s -H "Authorization: Bearer $ADAI_TOKEN" \
  "$ADAI_BASE/api/v1/review?status=pending" | jq

# Approve / reject one item
curl -s -X POST "$ADAI_BASE/api/v1/review/<intake_id>/approve" \
  -H "Authorization: Bearer $ADAI_TOKEN"
curl -s -X POST "$ADAI_BASE/api/v1/review/<intake_id>/reject" \
  -H "Authorization: Bearer $ADAI_TOKEN" -H "Content-Type: application/json" \
  -d '{"reason":"duplicate of practitioner:casey-reas"}'

# Bulk sweep — a whole batch or contributor in one call. ALWAYS dry-run
# first; the response lists exactly which intake_ids would be touched.
curl -s -X POST "$ADAI_BASE/api/v1/review/bulk" \
  -H "Authorization: Bearer $ADAI_TOKEN" -H "Content-Type: application/json" \
  -d '{"action":"approve","batch_id":"nguyen-wahed-archive-2026-06-08","dry_run":true}'
# then drop dry_run. For reject, "reason" is required.
```

Bulk requires at least one selector (`ids`, `batch_id`, `contributor`) —
there is deliberately no "approve everything" switch. Caps at 500 items
per call; the response's `remaining` tells you to loop.

### 4.5 Revoke a signal

Retract one contribution: flips the signal to `revoked` and (by default)
supersedes every live edge it anchored. Idempotent.

```bash
curl -s -X POST "$ADAI_BASE/api/v1/signals/<signal_id>/revoke" \
  -H "Authorization: Bearer $ADAI_TOKEN" -H "Content-Type: application/json" \
  -d '{"reason":"practitioner asked to retract this"}'
# {"signal_id":"...","already_revoked":false,"edges_superseded":2,"admin_signal_id":"..."}
# pass {"cascade":false} to leave the anchored edges alive
```

### 4.6 Retire a node

For a node that shouldn't exist (wrong entity, junk upload, duplicate the
curator missed). Supersedes every live edge touching it and sets
`metadata.retired` — the node disappears from `/api/graph`, `/field`,
`/explore`, search, embeddings surfaces and the stats, but its row and
full history stay (the profile URL still resolves, like the historical
husks the canon overlay leaves).

```bash
# look before you leap
curl -s -X POST "$ADAI_BASE/api/v1/nodes/artwork:wrong-thing/retire" \
  -H "Authorization: Bearer $ADAI_TOKEN" -H "Content-Type: application/json" \
  -d '{"reason":"uploaded against the wrong artist","dry_run":true}'
# then for real (drop dry_run)
```

Un-retiring is deliberate manual work: `PATCH /api/v1/nodes/:id` with
`{"retired": null, "retired_at": null, "retired_by": null, "retired_reason": null}`
brings the node back into listings, but its superseded edges stay
superseded — re-attest the ones that should live again (§1.4).

### 4.7 Batch rollback — "delete and start again"

The big one. When an upload session went wrong (wrong CSV, wrong artist
mapping, a gallery wants a clean restart), retire the **whole batch** in
one call — provided the writes carried a `batch_id` (§1.7; one more
reason to always set it on bulk work).

```bash
# 0. what batches exist?
curl -s -H "Authorization: Bearer $ADAI_TOKEN" \
  "$ADAI_BASE/api/v1/batches?contributor=Nguyen%20Wahed%20Gallery" | jq

# 1. ALWAYS dry-run first — the response is the full plan
curl -s -X POST "$ADAI_BASE/api/v1/batches/nguyen-wahed-archive-2026-06-08/retire" \
  -H "Authorization: Bearer $ADAI_TOKEN" -H "Content-Type: application/json" \
  -d '{"reason":"wrong mapping, gallery restarting","dry_run":true}' | jq

# 2. read the plan WITH the practitioner/gallery, then execute (drop dry_run)
```

What it does, in order: revokes every active signal in the batch →
supersedes every live edge those signals anchored → retires every node
the batch **created** → rejects every still-pending intake row from the
batch. What it deliberately does NOT do:

- **never retires pre-existing nodes** the batch merely collided with or
  patched (guarded by creation time; they're listed under
  `nodes_skipped_preexisting`);
- **cannot auto-revert metadata patches / image attachments on
  pre-existing nodes** (no before-image is stored) — these come back in
  `patches_to_review`, each with its `signal_id` whose `content` records
  the exact patch, so you can fix them by hand with PATCH (§1.3);
- R2 image bytes stay (content-addressed, immutable, harmless orphans).

After the rollback the gallery starts again with a **new** batch_id.
The retired batch stays queryable forever (`/api/v1/batches`,
`?batch=` on contributions) — that's the audit trail, not a mess to
clean up.

---

## 5 — Don'ts

- **Don't impersonate.** Your token is bound to one contributor on the
  server side; the `submitted_by` field comes from the token, never from
  anything you send.
- **Don't bulk-import** without the practitioner's explicit go-ahead. If
  they say "ingest all my old shows", confirm the count first and follow
  the §6 playbook (one batch_id, sign-off before POSTing).
- **Don't infer `INFLUENCES` or `RESPONDS_TO`** from similarity (see §1.4).
- **Don't write to `/api/contribute`.** That's the legacy public web form
  used by anonymous browsers on `$ADAI_BASE/contribute`. It doesn't read
  your bearer token, so your contribution won't be attributed to the
  practitioner and won't respect their trust tier. Always use `/api/v1/*`.
- **Don't try to issue or rotate your own token.** That happens out-of-
  band; the practitioner runs `npm run token:issue` locally.
- **Don't delete data.** There is no DELETE endpoint by design — for
  anyone. The correction primitives exist instead: supersede an edge
  (§1.4), and an **admin** can revoke a signal (§4.5), retire a node
  (§4.6), or roll back a batch (§4.7) — all provenance-preserving. If
  you're write-scope and something needs retracting, ask the curator.

If your token is admin-scope (§4), additional rules apply:
- **Don't mint a token without the practitioner asking.** A token they
  didn't ask for is impersonation potential.
- **Don't escalate `tier`.** If they came in as `probationary`, leave them
  there until they've earned `reviewed` — the curator queue exists for
  good reasons.
- **Don't share the raw token in a transcript you'll commit.** Use
  ephemeral channels.
- **Revoke proactively.** If a contributor lost their laptop, leaked a
  token in a screenshot, or just stopped contributing, rotate.
- **Always dry-run before any retire/bulk action** (§4.4, §4.6, §4.7) and
  read the plan back to whoever asked for the correction. The plan is
  cheap; an unnecessary retirement is annoying to reverse.
- **Prefer queue rejection over post-hoc rollback.** If a bulk upload is
  coming from a new contributor, keep them `probationary` for the first
  batch — then "start again" is just a bulk reject of pending items and
  nothing ever touched the graph. Rollback of *live* writes is the
  fallback, not the plan.
- **Don't "clean up" history.** A retired batch, a revoked signal, a
  superseded edge are records, not clutter. Never try to make them
  disappear harder than the primitives already do.

---

## 6 — Bulk archive intake (galleries, estates, collections)

The script for "we want to upload our archive" — designed so a botched
run is a non-event:

1. **Mint the gallery a token at `probationary`** (§4.1; or ask the
   operator). Tell them this is the safety net for the first batch, not
   a demotion: every write queues for curator review, so a wrong upload
   can be rejected wholesale and *nothing ever touches the graph*.
2. **Agree the manifest before any POST** (§7): how many artworks, which
   artists, what fields, which images. Count confirmed by a human.
3. **One `batch_id` for the whole session** (§1.7), e.g.
   `nguyen-wahed-archive-2026-06-08`. Every signal/node/edge/image write
   carries it. Tell the gallery the id — it's their receipt.
4. **Upload.** Check existence before every create (§1.0). Watch
   `GET /api/v1/contributions?batch=<id>` as you go.
5. **Review.** The curator (or an admin Claude, §4.4) sweeps the batch:
   spot-check, then `review/bulk` approve — or reject with a reason if
   the batch is wrong.
6. **If it went wrong after going live** (the contributor was
   `reviewed`/`auto`, or the queue was approved too fast): admin
   batch rollback, §4.7. Dry-run, read the plan together, execute,
   start again with a new batch_id.
7. **Graduate the tier** (operator decision) once a batch or two have
   landed clean — then future sessions go live immediately.

---

## 7 — When in doubt

Ask the practitioner. The graph is small and human; cleanup is cheap
compared to a confident hallucination. If they hand you a CSV of 400
artworks and a 30-second monologue, the right move is to summarise what
you'd write and ask for sign-off before any POST.
