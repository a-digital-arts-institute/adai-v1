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

```bash
# The token the practitioner gave you. Treat it like an SSH key.
export ADAI_TOKEN="adai_..."
export ADAI_BASE="https://adai-basel.fly.dev"   # or http://localhost:8080 for dev

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
`/review` — that's normal for new contributors. **You should still
contribute** — just be especially careful with edges and node creates,
since each one is a curator's time.

---

## 1 — The four verbs

You have exactly four verbs. Pick the smallest one that does the job.

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
    "target_node": "practitioner:casey reas",
    "title": "Pedagogy note",
    "content": "Casey emphasised that Form+Code was structured around the idea that...",
    "source_url": "https://artblog.example.com/interview-2024"
  }'
```

Response: `{ signal_id, intake_id, status: "approved" | "pending", target_node }`.

### 1.2 `POST /api/v1/nodes` — create a new entity

Use this when nothing in the graph represents what the practitioner is
talking about. Check first with `/api/graph?type=<type>` — duplicates
are real work for the curator to clean up.

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

Returns the canonical `node_id` (always `<type>:<slug>`). Server computes the
slug from the name. If you need to control it, pass `slug` explicitly.

### 1.3 `PATCH /api/v1/nodes/:id` — merge into existing metadata

Use this to **add or correct fields** on a node you didn't create — bios,
status flags, biographical links, URLs. The body is a JSON merge-patch:
keys you provide are merged, nested objects deep-merge, `null` deletes a
key. **You can't change `id` / `type` / `slug` / `name`** — those live in
columns, not metadata.

```bash
curl -s -X PATCH "$ADAI_BASE/api/v1/nodes/practitioner:casey%20reas" \
  -H "Authorization: Bearer $ADAI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "homepage": "https://reas.com", "status": "confirmed" }'
```

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
    "target_id": "practitioner:tyler hobbs",
    "edge_type": "CREATED_BY",
    "confidence": "high",
    "event_time": "2021-06-11"
  }'
```

**Superseding an edge** — when a fact changes (a practitioner left a
collective, an attribution turned out wrong), don't delete the old edge.
Add a new one with `supersedes_edge_id`. The old edge's `valid_until`
and `invalidated_by` get set; queries that filter `valid_until IS NULL`
see only the current state, but the history is preserved.

```json
{
  "source_id": "practitioner:foo",
  "target_id": "collective:bar",
  "edge_type": "BELONGS_TO",
  "supersedes_edge_id": "practitioner:foo--BELONGS_TO--collective:bar--api-foo"
}
```

### 1.5 `POST /api/v1/images` — upload an image and attach it

The practitioner just dropped a file in your sandbox. Hash it, push it to
the R2 mirror, attach the URL to a node — all in one round-trip.

```bash
curl -s -X POST "$ADAI_BASE/api/v1/images" \
  -H "Authorization: Bearer $ADAI_TOKEN" \
  -F "image=@/tmp/casey-portrait.jpg" \
  -F "node_id=practitioner:casey reas"
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
  -d "{\"node_id\":\"practitioner:casey reas\",\"mime_type\":\"image/jpeg\",\"image_base64\":\"$B64\"}"
```

Images are content-addressed. Uploading the same bytes twice is free
(server HEADs R2 first). Max payload: 12 MB.

---

## 2 — ID conventions

- **Nodes**: `<type>:<slug>` (e.g. `practitioner:casey-reas`,
  `artwork:fidenza`). Slug is lowercase, spaces → `-`, parens/dots/
  apostrophes stripped, `&` → `and`. Some legacy IDs preserve spaces
  (e.g. `practitioner:casey reas`); both forms resolve.
- **Edges**: the server computes the ID. You don't write it.
- **Slugify yourself**: `slugify("Casey Reas")` → `casey-reas`.

To discover what already exists:
- `GET /api/graph?type=practitioner` — every practitioner with id + name
- `GET /api/graph/:slug/component` — full component reachable from a node

---

## 3 — Trust and the queue

The server returns `status: "approved"` or `status: "pending"` on every
write. `pending` means a human has to click Approve at `/review`. **Tell
the practitioner what happened** — copy the link
`{ADAI_BASE}/review` into your reply.

If the practitioner's trust is `probationary`, expect every write to
queue. Don't try to escalate. Don't try to "merge" by writing multiple
times. One signal/node/edge/image per intent.

---

## 4 — Don'ts

- **Don't impersonate.** Your token is bound to one contributor on the
  server side; the `submitted_by` field comes from the token, never from
  anything you send.
- **Don't bulk-import** without the practitioner's explicit go-ahead. If
  they say "ingest all my old shows", confirm the count first and offer
  to break it into reviewable batches.
- **Don't infer `INFLUENCES` or `RESPONDS_TO`** from similarity (see §1.4).
- **Don't write to `/api/contribute`** — that's the legacy web form for
  anonymous browsers. The `/api/v1` endpoints are for you.
- **Don't try to issue or rotate your own token.** That happens out-of-
  band; the practitioner runs `npm run token:issue` locally.
- **Don't delete data.** There is no DELETE endpoint by design. To
  invalidate an edge, supersede it. To retract a signal, ask the curator.

---

## 4.5 — If your token is admin-scope

`whoami` will show `"scope": "admin"`. Admin tokens can do everything a
write token can (signals / nodes / edges / images, attributed to the
admin contributor), **plus** mint write-scope tokens for other
practitioners and revoke any token. They cannot mint other admin tokens —
that's intentionally limited to the operator running the local CLI on
the host.

### Mint a contributor token for someone

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

### List tokens

```bash
curl -s "$ADAI_BASE/api/v1/tokens" \
  -H "Authorization: Bearer $ADAI_TOKEN" | jq

# filter
curl -s "$ADAI_BASE/api/v1/tokens?contributor=Casey%20Reas&active=1" \
  -H "Authorization: Bearer $ADAI_TOKEN" | jq
```

### Revoke a token (rotation, leak, change of heart)

```bash
curl -s -X POST "$ADAI_BASE/api/v1/tokens/adai_abc12345/revoke" \
  -H "Authorization: Bearer $ADAI_TOKEN"
```

Soft-delete: the row stays for audit, `revoked_at` gets set, the bearer
hits 401 from then on.

### Admin discipline

- Don't mint a token without the practitioner asking. A token they
  didn't ask for is impersonation potential.
- Don't escalate `tier`. If they came in as `probationary`, leave them
  there until they've earned `reviewed` — the curator queue exists for
  good reasons.
- Don't share the raw token in a transcript you'll commit. Use ephemeral
  channels.
- Revoke proactively: if a contributor lost their laptop, leaked a token
  in a screenshot, or just stopped contributing, rotate.

---

## 5 — When in doubt

Ask the practitioner. The graph is small and human; cleanup is cheap
compared to a confident hallucination. If they hand you a CSV of 400
artworks and a 30-second monologue, the right move is to summarise what
you'd write and ask for sign-off before any POST.
