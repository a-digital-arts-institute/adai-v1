---
name: adai-contribute
description: Contribute to the A(DAI) Digital Arts Knowledge Commons graph (https://adai-basel.fly.dev) on behalf of a practitioner using their bearer token in ADAI_TOKEN. Use this skill when the user wants to add a text signal about an existing node, create a new node (practitioner, artwork, concept, scene, institution, collective, platform, etc.), add or supersede an edge between two nodes (CREATED_BY, EMBODIES, PRACTICES, EXHIBITED_AT, CLASSIFIED_BY, BELONGS_TO, COLLABORATES_WITH, USES_TECHNIQUE, INFLUENCES, RESPONDS_TO), upload an image and attach it to a node, or — with an admin-scope token — mint, list, or revoke contributor tokens for others. Talks to /api/v1/* via curl. Respects trust tiers (auto/reviewed go live, probationary queue at /review for curator approval). Never infer INFLUENCES or RESPONDS_TO from style or visual similarity; both require attested artist intent.
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

If `r2_configured` is `false`, image uploads (§1.6) will hard-fail with
`503 r2_not_configured`. The other endpoints still work — tell the
practitioner to set the `R2_*` env vars if they need images.

---

## 1 — The verbs

You have one read verb and four write verbs. Pick the smallest one that
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
admin contributor), **plus** mint write-scope tokens for other
practitioners and revoke any token. They cannot mint other admin tokens —
that's intentionally limited to the operator running the local CLI on
the host.

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

---

## 5 — Don'ts

- **Don't impersonate.** Your token is bound to one contributor on the
  server side; the `submitted_by` field comes from the token, never from
  anything you send.
- **Don't bulk-import** without the practitioner's explicit go-ahead. If
  they say "ingest all my old shows", confirm the count first and offer
  to break it into reviewable batches.
- **Don't infer `INFLUENCES` or `RESPONDS_TO`** from similarity (see §1.4).
- **Don't write to `/api/contribute`.** That's the legacy public web form
  used by anonymous browsers on `$ADAI_BASE/contribute`. It doesn't read
  your bearer token, so your contribution won't be attributed to the
  practitioner and won't respect their trust tier. Always use `/api/v1/*`.
- **Don't try to issue or rotate your own token.** That happens out-of-
  band; the practitioner runs `npm run token:issue` locally.
- **Don't delete data.** There is no DELETE endpoint by design. To
  invalidate an edge, supersede it (§1.4). To retract a signal, ask the
  curator.

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

---

## 6 — When in doubt

Ask the practitioner. The graph is small and human; cleanup is cheap
compared to a confident hallucination. If they hand you a CSV of 400
artworks and a 30-second monologue, the right move is to summarise what
you'd write and ask for sign-off before any POST.
