PRAGMA journal_mode = WAL;

-- === CR-SQLite CRR TABLES ===
-- NOTE: CRR tables cannot have UNIQUE indices (besides PK) or NOT NULL without DEFAULT

CREATE TABLE IF NOT EXISTS nodes (
    id          TEXT PRIMARY KEY NOT NULL,
    type        TEXT DEFAULT '',
    name        TEXT DEFAULT '',
    slug        TEXT,
    metadata    TEXT,
    created_at  TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_by  TEXT DEFAULT 'unknown'
);

CREATE INDEX IF NOT EXISTS idx_nodes_slug ON nodes(slug);
CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);

SELECT crsql_as_crr('nodes');

CREATE TABLE IF NOT EXISTS edges (
    id             TEXT PRIMARY KEY NOT NULL,
    source_id      TEXT DEFAULT '',
    target_id      TEXT DEFAULT '',
    edge_type      TEXT DEFAULT '',
    signal_id      TEXT,
    confidence     TEXT DEFAULT 'medium',
    charge         TEXT,
    created_at     TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    created_by     TEXT DEFAULT 'unknown',
    event_time     TEXT,
    valid_from     TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    valid_until    TEXT,
    invalidated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);
CREATE INDEX IF NOT EXISTS idx_edges_type ON edges(edge_type);
CREATE INDEX IF NOT EXISTS idx_edges_composite ON edges(source_id, target_id, edge_type, signal_id);
CREATE INDEX IF NOT EXISTS idx_edges_valid ON edges(valid_until);

SELECT crsql_as_crr('edges');

CREATE TABLE IF NOT EXISTS signals (
    id                  TEXT PRIMARY KEY NOT NULL,
    title               TEXT,
    source_url          TEXT,
    source_type         TEXT,
    cla_layer           TEXT,
    summary             TEXT,
    content             TEXT,
    submitted_by        TEXT DEFAULT 'unknown',
    confidence          TEXT DEFAULT 'medium',
    lived_experience    INTEGER DEFAULT 0,
    created_at          TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    consent_scope       TEXT DEFAULT 'full_commons',
    consent_attribution TEXT DEFAULT 'attributed',
    consent_revocable   INTEGER DEFAULT 1,
    processing_trace    TEXT,
    source_origin       TEXT DEFAULT 'unknown',
    batch_id            TEXT,
    status              TEXT DEFAULT 'active',
    provenance_chain    TEXT
);

CREATE INDEX IF NOT EXISTS idx_signals_origin ON signals(source_origin);
CREATE INDEX IF NOT EXISTS idx_signals_batch  ON signals(batch_id);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);

SELECT crsql_as_crr('signals');

CREATE TABLE IF NOT EXISTS contributors (
    id              TEXT PRIMARY KEY NOT NULL,
    name            TEXT DEFAULT '',
    type            TEXT DEFAULT '',
    trust_tier      TEXT DEFAULT 'low',
    contributions   INTEGER DEFAULT 0,
    approved_count  INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

SELECT crsql_as_crr('contributors');

CREATE TABLE IF NOT EXISTS node_aliases (
    source      TEXT NOT NULL DEFAULT '',
    external_id TEXT NOT NULL DEFAULT '',
    node_id     TEXT NOT NULL DEFAULT '',
    created_at  TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    PRIMARY KEY (source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_node_aliases_node ON node_aliases(node_id);

SELECT crsql_as_crr('node_aliases');

-- === LOCAL-ONLY TABLES ===

CREATE TABLE IF NOT EXISTS intake_queue (
    id              TEXT PRIMARY KEY NOT NULL,
    signal_id       TEXT,
    target_node     TEXT,
    submitted_by    TEXT NOT NULL,
    trust_tier      TEXT NOT NULL,
    status          TEXT DEFAULT 'pending',
    reviewed_by     TEXT,
    reviewed_at     TEXT,
    rejection_reason TEXT,
    proposed_nodes  TEXT,
    proposed_edges  TEXT,
    created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_intake_status ON intake_queue(status);

-- Embeddings (Gemini Embedding 2 multimodal pass). Local-only, recomputable.
-- Two rows per practitioner are possible: kind='identity' (their text vector)
-- and kind='style_centroid' (mean of artworks they CREATED_BY, L2-normalised).
-- Only practitioners with live CREATED_BY edges get a style_centroid row;
-- bridge practitioners and net-new imports without attribution silently
-- fall out of STYLE_KIN / SUGGESTS_CREATED_BY downstream.
CREATE TABLE IF NOT EXISTS node_embeddings (
    node_id    TEXT NOT NULL,
    kind       TEXT NOT NULL DEFAULT 'identity',     -- 'identity' | 'style_centroid'
    model      TEXT NOT NULL,
    dims       INTEGER NOT NULL,
    vector     BLOB NOT NULL,                         -- f32 LE, L2-normalised
    has_image  INTEGER DEFAULT 0,
    image_hash TEXT,
    text_hash  TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    PRIMARY KEY (node_id, kind),
    FOREIGN KEY (node_id) REFERENCES nodes(id)
);

CREATE INDEX IF NOT EXISTS idx_node_embeddings_kind ON node_embeddings(kind);

-- Latent "islands": k-means cluster id per node over the identity vectors.
-- Local-only (NOT a CRR) — a derived view of the embedding space, recomputed
-- by `embed:derive` (k-means in src/embed/islands.ts). Drives the field-flow
-- macro-layout: each island becomes a contiguous region of the Shape of Time.
-- Wiped + rewritten each derive run; served read-only at GET /api/islands.
CREATE TABLE IF NOT EXISTS node_islands (
    node_id    TEXT PRIMARY KEY NOT NULL,
    island     INTEGER NOT NULL,
    updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    FOREIGN KEY (node_id) REFERENCES nodes(id)
);

CREATE INDEX IF NOT EXISTS idx_node_islands_island ON node_islands(island);

-- Pairs the curator rejected from the AI suggestion queue. The derive pass
-- consults this to avoid re-proposing the same attribution every run.
CREATE TABLE IF NOT EXISTS rejected_ai_suggestions (
    pair_hash   TEXT PRIMARY KEY NOT NULL,    -- sha256(source_id||edge_type||target_id)
    source_id   TEXT NOT NULL,
    target_id   TEXT NOT NULL,
    edge_type   TEXT NOT NULL,
    reason      TEXT,
    rejected_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_rejected_ai_target ON rejected_ai_suggestions(target_id);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('db_version', '1');

-- Bearer tokens for the /api/v1/* contributor API. Local-only (NOT a CRR):
-- token material must never sync. The raw token is sha256-hashed before
-- storage; we keep token_prefix (first 8 chars of the raw token) so an
-- operator can identify a token in `npm run token:revoke` without ever
-- seeing the secret again. Issuance is out-of-band via `src/cli/issue-token.ts`
-- — there is no HTTP endpoint that mints tokens.
CREATE TABLE IF NOT EXISTS contributor_tokens (
    token_hash      TEXT PRIMARY KEY NOT NULL,
    token_prefix    TEXT NOT NULL,
    contributor_id  TEXT NOT NULL,
    label           TEXT,
    scope           TEXT DEFAULT 'write',
    created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    last_used_at    TEXT,
    revoked_at      TEXT
);

CREATE INDEX IF NOT EXISTS idx_contributor_tokens_contributor
  ON contributor_tokens(contributor_id);
CREATE INDEX IF NOT EXISTS idx_contributor_tokens_prefix
  ON contributor_tokens(token_prefix);

-- Beta-programme email signups from the /field "Connect" room ("Enter the
-- Beta"). Local-only (NOT a CRR): visitor contact details must never sync into
-- the public graph. Lives on the /data volume, backed up by Litestream with
-- the rest of the DB. Read via the admin endpoint GET /api/v1/beta-signups.
-- UNIQUE(email) makes repeat submits idempotent.
CREATE TABLE IF NOT EXISTS beta_signups (
    id          TEXT PRIMARY KEY NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    role        TEXT,
    note        TEXT,
    source      TEXT,
    created_at  TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_beta_signups_created ON beta_signups(created_at);

-- Archivist chat sessions. Local-only — anonymous-visitor session cookies
-- live here so we can rate-limit and audit without sync. NOT a CRR.
-- Cookie format: <session_id>.<hex(hmac_sha256(session_id, secret))> set as
-- HttpOnly+SameSite=Lax. Verification only requires re-computing the HMAC,
-- but we keep a row so we can track message_count for the per-session quota
-- and last_message_at for the rolling window.
CREATE TABLE IF NOT EXISTS archivist_sessions (
    session_id        TEXT PRIMARY KEY NOT NULL,
    created_at        INTEGER NOT NULL,
    ip                TEXT,
    user_agent        TEXT,
    message_count     INTEGER DEFAULT 0,
    last_message_at   INTEGER
);

-- Per-day token + cost rollup for the global budget gate. Pricing
-- constants live in src/archivist/ratelimit.ts; this table just stores
-- aggregates so we can compare today's spend to ARCHIVIST_DAILY_BUDGET_USD.
CREATE TABLE IF NOT EXISTS archivist_usage (
    date                 TEXT PRIMARY KEY NOT NULL,   -- YYYY-MM-DD UTC
    input_tokens         INTEGER DEFAULT 0,
    output_tokens        INTEGER DEFAULT 0,
    cache_read_tokens    INTEGER DEFAULT 0,
    cache_write_tokens   INTEGER DEFAULT 0,
    est_cost_usd         REAL DEFAULT 0
);
