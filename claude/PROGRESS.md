# A(DAI) Infrastructure Progress

## 2026-03-02

### Notion Workspace Created (`setup_notion.py`)
6 databases created with all properties, icons, and 11 two-way relations:
- Signal Inbox (📡) — `e380fc07-d10f-4242-baef-ffbc58ed0e95`
- Concepts (💡) — `1ab6bc40-63df-4a45-812f-901012edc7a7`
- Practitioners & Orgs (🧑‍🎨) — `3c2bc39a-bef9-4499-9ff8-ee25f7417b0d`
- Scenes (🌐) — `e6691c7d-f78b-4f9e-a959-1574505bb126`
- Threads (🧵) — `cc3dec36-47b0-4d93-b0b5-7899daca6018`
- Sensemaking Outputs (📄) — `51e71a4e-1e19-47dc-81b5-437c5aeb409f`

### Schema Updated — Intelligence Tier System (`update_notion_schema.py`)
13 changes across all 6 databases:

**Signal Inbox:**
- `source_type` options replaced — PRIMARY: transcript, observation, conversation, meeting_notes / SECONDARY: article, bookmark, web_scan, publication
- Added: `intelligence_tier` (primary/secondary), `signal_confidence` (verified/unverified/speculative), `corroborated` (checkbox)

**Concepts:** `primary_signal_count`, `secondary_signal_count`
**Practitioners & Orgs:** `first_mentioned_in` (primary/secondary)
**Scenes:** `intelligence_coverage` (primary_only/secondary_only/both/none)
**Threads:** `primary_signal_count`, `secondary_signal_count`
**Sensemaking Outputs:** `primary_sources`, `secondary_sources`, `intelligence_basis` (primary_led/secondary_led/mixed)

### Manual Steps Pending
- [ ] Create "Field Intelligence" view in Signal Inbox (filter: intelligence_tier = primary)
- [ ] Create "Web Intelligence" view in Signal Inbox (filter: intelligence_tier = secondary)

### Signal Transcriber — Deployed
- **Live:** https://transcriber-ruddy.vercel.app/
- Vite + React app in `transcriber/` — deployed on Vercel
- Pipeline: Upload → AssemblyAI (universal-3-pro, speaker diarization) → Claude (summary + tags) → Notion Signal Inbox
- Posts signals as `status: "raw"` so they flow through the processing pipeline
- Serverless `/api/notion` proxy for CORS (Vercel function)
- Direct Anthropic API calls with `anthropic-dangerous-direct-browser-access` header
- Manual key entry with localStorage persistence — shared keys = shared database
- Local dev prototype still at `prototype/` with Vite proxies

### Intelligence Processing Pipeline
Two Python scripts in `claude/`:

**`signal_processor.py`** — Fetches `status=raw` signals, sends to Claude for 4-register analysis (surface/structure/position/narrative), writes `summary_ai` + `status=processed` + merged tags back to Notion. Caches full analysis to `concepts_cache.json`.

**`concept_linker.py`** — Reads `concepts_cache.json`, builds indexes of existing Concepts/Practitioners/Scenes/Threads, then creates/matches entries and wires Notion relations back to signals.

**`run_pipeline.sh`** — Runs both scripts in sequence.

**First run results (2 signals):**
- 2 signals processed (both high quality)
- 11 concepts created
- 3 practitioners created (1 matched across signals)
- 3 scenes created
- 2 threads suggested
- All relations wired in Notion
