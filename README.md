# A(DAI) — A Digital Arts Institute

Field intelligence infrastructure for the digital arts. Surfaces patterns, names movements, maps tensions, and builds the critical language the field needs.

## Architecture

```
Audio/Video ──→ Transcriber ──→ Signal Inbox (Notion)
                                      │
                              run_pipeline.sh
                                      │
                         ┌────────────┴────────────┐
                   signal_processor.py      concept_linker.py
                    (Claude analysis)       (relational layer)
                         │                        │
                         ▼                        ▼
                   summary_ai              Concepts DB
                   status=processed        Practitioners DB
                   scene tags              Scenes DB
                                           Threads DB
                                           (all linked via relations)
```

## Components

### `/transcriber` — Signal Capture
Deployed Vite + React app. Team uploads audio recordings, gets transcription via AssemblyAI + Claude summary, posts directly to Notion Signal Inbox.

- **Live:** https://transcriber-ruddy.vercel.app/
- AssemblyAI (universal-3-pro, speaker diarization) → Claude summary → Notion
- Serverless `/api/notion` proxy for CORS
- Manual API key entry with localStorage persistence

### `/claude` — Intelligence Pipeline
Python scripts that process raw signals into structured field intelligence.

| Script | Purpose |
|--------|---------|
| `signal_processor.py` | Fetches `status=raw` signals, runs 4-register Claude analysis (surface/structure/narrative), writes back to Notion |
| `concept_linker.py` | Creates/matches Concepts, Practitioners, Scenes, Threads from cached analysis, wires Notion relations |
| `run_pipeline.sh` | Runs both in sequence. Scheduled nightly at 2am via cron |

### `/claude` — Setup Scripts (one-time)
| Script | Purpose |
|--------|---------|
| `setup_notion.py` | Created 6 databases + 11 two-way relations |
| `update_notion_schema.py` | Added intelligence tier system across all DBs |
| `rebuild_schema.py` | Emergency property rebuild after schema loss |

## Notion Databases

| Database | ID | Purpose |
|----------|-----|---------|
| Signal Inbox | `e380fc07...` | Raw field observations |
| Concepts | `1ab6bc40...` | Named movements, tensions, practices |
| Practitioners & Orgs | `3c2bc39a...` | Artists, curators, institutions |
| Scenes | `e6691c7d...` | Genre/community clusters |
| Threads | `cc3dec36...` | Open investigative questions |
| Sensemaking Outputs | `51e71a4e...` | Briefs, analyses, synthesis |

11 two-way relations connect these into a queryable knowledge graph.

## Intelligence Tier System

**Primary (field intelligence):** transcripts, observations, conversations, meeting notes — direct from the field.

**Secondary (web intelligence):** articles, bookmarks, web scans, publications — mediated sources.

## Setup

1. Copy `.env.example` to `.env` and fill in your keys
2. `pip install anthropic requests` for the pipeline
3. `cd transcriber && npm install` for the transcriber
4. Run `./claude/run_pipeline.sh` or let cron handle it

## Team

- Gio, Irina, JB, Piyush
