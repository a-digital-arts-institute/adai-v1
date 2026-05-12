# Gemini Embedding 2 — Multimodal Artist↔Artwork Edges for A(DAI)

> Audience: Claude Code working in this repo.
> Goal: design a clean multimodal embedding pipeline on top of `db.sql` that fuses **artwork images + textual metadata** into a single vector space, then derives artist↔artwork (and artwork↔artwork) edges from that space.

Greenfield — ignore anything in `pipeline/embed.py`, that's vibe-coded scratch. The source of truth is `db.sql` + the `image_url` fields in node metadata.

---

## 1. Why Gemini Embedding 2

Google's first natively multimodal embedding model. GA April 2026.

- Model ID: `gemini-embedding-2` (alias `gemini-embedding-2-preview` also works).
- Inputs: text, image, video, audio, PDF — projected into one unified vector space via a shared transformer (not CLIP-style late fusion).
- **Interleaved input → one aggregated vector.** Send `["title text…", <image bytes>]` in a single call, get back one 3072-d (or truncated) vector that fuses both modalities.
- Matryoshka-trained: truncate to 128 / 768 / 1536 / 3072 without retraining. Sub-3072 vectors are **not L2-normalised** — must normalise manually before cosine if you use dot-product.
- Pricing: $0.20 / M text tokens, $0.10 / M via Batch API. Images billed at 258 tokens each. Our scale (~1k nodes, ~400 with images) is in single-dollar territory.

The match to A(DAI) is exact: an artwork node is "a title + a description + an image". Today the graph only knows the text half. A multimodal vector lets the derive pass see that two Casey Reas pieces look like each other even when their descriptions don't say so, and that an unattributed Art Blocks piece is stylistically in Tyler Hobbs's neighbourhood.

---

## 2. Schema additions

Current `db.sql` has no embedding storage. Add a **local-only** table (not CRR — embeddings are recomputable, don't need CRDT sync, and CRR has constraints we'd fight):

```sql
-- === LOCAL-ONLY TABLES ===

CREATE TABLE IF NOT EXISTS node_embeddings (
    node_id        TEXT PRIMARY KEY NOT NULL,
    model          TEXT NOT NULL,                -- e.g. 'gemini-embedding-2'
    dims           INTEGER NOT NULL,             -- 768 for us
    vector         BLOB NOT NULL,                -- f32 little-endian, L2-normalised
    has_image      INTEGER DEFAULT 0,            -- 1 if image was successfully folded in
    image_hash     TEXT,                         -- sha256 of bytes embedded, for cache invalidation
    text_hash      TEXT,                         -- sha256 of text embedded, for cache invalidation
    created_at     TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY (node_id) REFERENCES nodes(id)
);

CREATE INDEX IF NOT EXISTS idx_node_embeddings_model ON node_embeddings(model);
CREATE INDEX IF NOT EXISTS idx_node_embeddings_has_image ON node_embeddings(has_image);
```

Optional but cheap: a local image cache so repeated embed runs don't re-fetch Wikimedia / fxhash / Art Blocks images.

```sql
CREATE TABLE IF NOT EXISTS image_cache (
    url            TEXT PRIMARY KEY NOT NULL,
    sha256         TEXT NOT NULL,
    mime_type      TEXT NOT NULL,
    bytes          BLOB NOT NULL,
    fetched_at     TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    status         TEXT DEFAULT 'ok'             -- 'ok' | '404' | 'too_large' | 'bad_mime'
);
```

Both tables stay out of CR-SQLite's `crsql_as_crr` because they're per-instance derived data. Local Dockerfile bakes them like any other table.

---

## 3. What gets embedded — per node type

`nodes.type` distribution (from `CLAUDE.md`): artwork (399), concept (318), institution (121), practitioner (117), scene (25), collective (8), platform (8), classification_regime (6), publication (3), project (2).

| Type | Modalities | Content strategy |
|---|---|---|
| `artwork` | **text + image** | `"task: sentence similarity \| query: {title} ({year}). {description}"` + image bytes |
| `practitioner` | text only (proposal) | `"task: sentence similarity \| query: {name}. {practice_summary} {methodology}"` — see § 3.1 |
| `collective` | text only | Same as practitioner |
| `concept` | text only | `"task: sentence similarity \| query: Concept: {name}. {description if any}"` |
| `scene` | text only | `"task: sentence similarity \| query: Scene: {name}."` |
| `institution` | text only | Skip unless useful for EXHIBITED_AT enrichment later |
| `classification_regime` | text only | Embed its description + a sample of its `CLASSIFIED_BY` exemplars |

All vectors land in the **same space** even when one node has an image and another doesn't — that's the point of native multimodality. A practitioner-text vector and an artwork-text-plus-image vector are directly cosine-comparable.

### 3.1 Should we embed practitioner portraits?

Wikidata-sourced portraits are mostly faces. Faces don't tell you what a person makes. My recommendation: **don't fold portraits into practitioner vectors by default.** Run an A/B once and measure: does including the portrait improve practitioner↔artwork similarity for known CREATED_BY pairs, or does it pull practitioners toward "people who look like each other"? My prior is the latter.

If we want a practitioner's *style fingerprint*, the cleaner move is § 3.2.

### 3.2 Practitioner style centroid (optional, recommended)

In addition to the practitioner's own text vector, compute a **style centroid**: the mean of all the artwork embeddings for artworks where there's a `CREATED_BY → practitioner` edge. Store it in a second row with a synthetic id like `practitioner:casey reas::style_centroid`, or add a `kind` column to `node_embeddings` to discriminate.

```
vec(practitioner P)              = textual identity of P
vec(P :: style_centroid)         = mean of vec(A) for A in {artworks P made}, then L2-normalise
```

The style centroid is what you compare against when asking "is this unattributed artwork stylistically close to P?". It's a much stronger signal than the practitioner's bio text alone, because the bio is mostly biography, not style.

---

## 4. API shape

```ts
// Node SDK — fits the existing TS/Express server, no Python boundary needed.
// npm install @google/genai
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

async function embedArtwork(title: string, year: string, description: string,
                            imageBytes: Uint8Array | null, mimeType: string | null) {
  const text = `task: sentence similarity | query: ${title} (${year}). ${description}`;
  const contents: any[] = [text];
  if (imageBytes && mimeType) {
    contents.push({
      inlineData: {
        mimeType,
        data: Buffer.from(imageBytes).toString('base64'),
      },
    });
  }
  const res = await ai.models.embedContent({
    model: 'gemini-embedding-2',
    contents,
    config: { outputDimensionality: 768 },
  });
  return l2normalise(res.embeddings[0].values);
}
```

Prefix conventions:

- **For our graph derivation, use the symmetric prefix:** `task: sentence similarity | query: {content}`. Apply the *same prefix on both sides* of every comparison. This is the prefix Google documents for "are these two things alike?", which is exactly the relation we're inferring.
- Don't use `task: search result` (asymmetric retrieval) — we're not doing query→doc lookup.
- `task_type` enum from `gemini-embedding-001` is **gone**. Don't pass it. Bake the task into the content string.

---

## 5. Image fetching

Practical bits:
- `image_url` in metadata may be Wikimedia (`Special:FilePath`), MoMA CDN, fxhash, Art Blocks, etc. All of these are direct image URLs once redirects resolve.
- Cap fetch at 4 MB. Above that, downsample server-side via `sharp` (Node) before sending to Gemini, or just skip — pixel fidelity beyond ~1024px doesn't change the embedding meaningfully.
- Cache to the `image_cache` table by URL. Re-runs become free.
- Supported MIME: JPEG, PNG, WebP, BMP, HEIC, HEIF, AVIF. Reject anything else (SVG, GIF, etc.) — fallback to text-only for that node.
- One image per artwork. Gemini Embedding 2 supports up to 6 images per request but we'd be giving the model nothing extra by sending duplicates; if multiple `image_url`s exist, pick the highest-res one.

---

## 6. Deriving edges from the vector space

Once every node has a vector, the derive pass is plain linear algebra. For ~1,000 nodes × 768 dims = ~3 MB of vectors — fits in RAM, one `numpy`/`@stdlib` matrix multiply does the whole pairwise similarity in milliseconds.

### 6.1 The edges we want to surface

| Edge type | Direction | Trigger |
|---|---|---|
| `SUGGESTS_CREATED_BY` | practitioner → artwork | `cos(P_style_centroid, A) ≥ τ_attribute` **AND** no existing `CREATED_BY` edge for A. Send to `intake_queue`, not direct insert. |
| `STYLE_KIN` | practitioner → practitioner | `cos(P1_style_centroid, P2_style_centroid) ≥ τ_kin`. Cheap signal of "these artists work in adjacent visual territory." |
| `VISUALLY_AFFINE` | artwork → artwork | `cos(A1, A2) ≥ τ_visual` AND different creators. Surfaces cross-artist visual rhymes. |
| `INFLUENCES` | older practitioner → newer practitioner | Already in seed (4 rows). Keep manual-only — embedding sim ≠ influence. **Do not auto-emit this from embeddings.** |
| `RESPONDS_TO` | artwork → artwork | Reserved in seed, intentionally empty (`SOURCES.md`). **Do not auto-emit** — requires evidence of intent, not visual similarity. Embedding sim alone is the wrong signal. |

The last two restrictions are important: embedding similarity is a *necessary-but-not-sufficient* condition for influence/response. Don't dilute those edge types with auto-derived rows.

### 6.2 Threshold calibration — must be done from data, not guessed

Pick ~30 hand-picked positive pairs (practitioner ↔ one of their known artworks) and ~30 hand-picked negatives (practitioner ↔ artwork from a different scene/era). Compute similarities. Set thresholds at the gap between the two distributions. Ship those.

Starting guesses for sanity-check only (Gemini Embedding 2 distributions run tighter than v001):
- `τ_attribute ≈ 0.78` (high bar — these go to review queue)
- `τ_kin ≈ 0.72`
- `τ_visual ≈ 0.80` (visual similarity has less spread than text)

Concrete deliverable: `pipeline/calibrate.ts` that prints histograms and recommends thresholds before any edges are written.

### 6.3 Tagging & idempotency

Every derived edge:

```
created_by  = 'embedding-multimodal-v1'
signal_id   = 'signal:embedding-multimodal-2026-05'
confidence  = 'low'         -- always low for auto-derived
charge      = NULL
```

Add a corresponding signal row + a `contributor:embedding-pipeline` (trust_tier `probationary` — never auto-merges). The derive pass's first action is `DELETE FROM edges WHERE created_by = 'embedding-multimodal-v1'`, so re-runs are clean.

---

## 7. Implementation plan

1. **Schema migration**: add `node_embeddings` + `image_cache` to `db.sql`. Both are local-only, no CRR. Safe to add — schema migrations bite when they touch *existing* CRR tables (see `CLAUDE.md` § Deploy gotchas); brand-new local tables don't.

2. **Contributor + signal seed rows** for the embedding pipeline:
   ```json
   { "id": "contributor:embedding-pipeline", "name": "Embedding Pipeline", "type": "system", "trust_tier": "probationary" }
   { "id": "signal:embedding-multimodal-2026-05", "title": "Gemini Embedding 2 multimodal pass",
     "source_type": "ai_generated", "source_origin": "ai_generated", "consent_scope": "structural_only" }
   ```

3. **`src/embed.ts`** — single TypeScript module living in the server tree:
   - `fetchImage(url) → { bytes, mime, hash } | null` with `image_cache` lookup.
   - `embedNode(node) → Float32Array` interleaved text + image, L2-normalised.
   - `embedAll({ force = false })` iterates nodes, skips when `text_hash`/`image_hash` match cache.
   - `computeStyleCentroids()` after artwork embeddings exist.
   - `derive({ dryRun, calibrate })` writes the three edge types.

4. **CLI entrypoints** via `npm run`:
   ```
   npm run embed         # embed all nodes that need it
   npm run embed:derive  # regenerate derived edges from current vectors
   npm run embed:calibrate  # dump similarity stats on known pairs
   ```

5. **Auth endpoint** (later): `POST /api/embed/recompute` for triggering re-embeds from the running Fly instance without SSH. Auth-gated.

6. **`/review` integration**: `SUGGESTS_CREATED_BY` edges go into `intake_queue` with `submitted_by='contributor:embedding-pipeline'`, `trust_tier='probationary'`. Curator approves → real `CREATED_BY` edge. Reject → row dies, never re-emitted (cache the rejection by `(practitioner, artwork)` hash so the next run doesn't keep re-proposing it).

7. **Graph viz** (`/graph` page): render derived edges with a different stroke (dashed? lower opacity?) so it's visually obvious which edges came from a human and which from the embedding pass.

---

## 8. Dimensionality, normalisation, math

- **768 dims**, L2-normalised at storage time. Rationale: 3 MB of vectors at our scale, dot product == cosine after normalisation, BLAS-friendly.
- Storage as little-endian f32 BLOB. Decode in JS:
  ```ts
  function decode(blob: Buffer): Float32Array {
    return new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4);
  }
  ```
- Pairwise scan: stack all N vectors into an N×768 matrix M, normalised. Pairwise similarity = `M @ M.T`, an N×N matrix. For N=1000, that's 1M dot products — sub-second even without BLAS. Use `mathjs` if we want it ergonomic.

---

## 9. Open questions for Gio

1. **Practitioner portraits in embeddings — in or out?** My vote: out by default, A/B once to verify (§ 3.1).
2. **Style centroid as a separate row, or as a `kind` discriminator column on `node_embeddings`?** Column is cleaner; row is simpler. I lean column (`kind TEXT DEFAULT 'identity'`, values `identity` | `style_centroid`).
3. **`SUGGESTS_CREATED_BY` flow** — through `intake_queue` (formal), or as a separate "AI suggestions" surface in the UI that's not the human-signal review queue? Mixing them could swamp the queue.
4. **Are we OK adding `STYLE_KIN` and `VISUALLY_AFFINE` to the edge-type list?** They'd be the first auto-derived edge types in the canon. Update `seed/SOURCES.md` and the count table in `CLAUDE.md` if yes.
5. **Embed concepts and scenes too, or just practitioners + artworks?** Concepts are abstract; their embeddings would be very text-dependent (mostly just the name). Probably skip in v1.
6. **Run schedule.** One-shot before Basel, or wire it into the seed pipeline so every fresh DB has embeddings baked? I'd say: one-shot for now, automate once the design has settled.

---

## 10. References

- Gemini Embedding 2 GA blog: https://developers.googleblog.com/en/building-with-gemini-embedding-2/
- API model card: https://ai.google.dev/gemini-api/docs/models/gemini-embedding-2-preview
- Vertex multimodal embeddings guide (task prefixes, limits): https://docs.cloud.google.com/vertex-ai/generative-ai/docs/embeddings/get-multimodal-embeddings
- DeepMind page (benchmarks): https://deepmind.google/models/gemini/embedding/
- Node SDK: `@google/genai` on npm
