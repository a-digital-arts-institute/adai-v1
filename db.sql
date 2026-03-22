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
    id          TEXT PRIMARY KEY NOT NULL,
    source_id   TEXT DEFAULT '',
    target_id   TEXT DEFAULT '',
    edge_type   TEXT DEFAULT '',
    signal_id   TEXT,
    confidence  TEXT DEFAULT 'medium',
    charge      TEXT,
    created_at  TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    created_by  TEXT DEFAULT 'unknown'
);

CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id);
CREATE INDEX IF NOT EXISTS idx_edges_type ON edges(edge_type);
CREATE INDEX IF NOT EXISTS idx_edges_composite ON edges(source_id, target_id, edge_type, signal_id);

SELECT crsql_as_crr('edges');

CREATE TABLE IF NOT EXISTS signals (
    id              TEXT PRIMARY KEY NOT NULL,
    title           TEXT,
    source_url      TEXT,
    source_type     TEXT,
    cla_layer       TEXT,
    summary         TEXT,
    content         TEXT,
    submitted_by    TEXT DEFAULT 'unknown',
    confidence      TEXT DEFAULT 'medium',
    lived_experience INTEGER DEFAULT 0,
    created_at      TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

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

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('db_version', '1');
