# Regenerate A(DAI) Status Dashboard

`claude/skills/regenerate-status-dashboard.md` — On-demand skill. Run when you want a fresh snapshot of project state from Notion.

---

## What this does

Reads key Notion docs via the Notion MCP tools, extracts current status data, and regenerates the HTML status dashboard at `docs/status.html` (GitHub Pages) and `~/.agent/diagrams/adai-status-map.html` (local).

## When to run

Run this whenever:
- Notion docs have been updated
- Schema or data state has changed
- Before a team sync or meeting
- After completing a batch of work

## Data sources to read

Fetch these Notion pages and extract status data:

### 1. Backend & Storage Idea (architecture status)
`id: 3247b5c8702080c9b40ef2ba4fcc71f2`
Extract: architecture status table at the bottom (component × status × notes)

### 2. Team Brief — April 2026 (who's doing what)
`id: 3377b5c8702081cb9042f4819049f456`
Extract: team assignments, current focus areas

### 3. Schema Definition (schema decisions)
`id: 3367b5c8702081f68371dabbd5b1281c`
Extract: decision status for all 7 items

### 4. Build Guide: Scout Agents (pipeline status)
`id: 3367b5c8702081008ae9cf29423baf79`
Extract: step completion status table

### 5. Agentic Risk Map (risk status)
`id: 3367b5c8702081be9a23f7d1efe8e858`
Extract: risk × readiness summary table

### 6. SOURCES doc (ingestion plan)
`id: 3377b5c8702081459238e2171499f5af`
Extract: first-pass ingestion plan section, expected output numbers

### 7. Next Steps (current week priorities)
`id: 3367b5c8702081dab383d788b8291212`
Extract: current week's task table

### 8. Schema Freeze Proposal (if exists)
`id: 3417b5c8702081e89a07c6c7a1fef9d6`
Extract: confirmation status for each addition, open questions

### 9. Live backend stats
Fetch `https://adai-basel.fly.dev/api/stats` for current node/edge counts if accessible.

## What to generate

Regenerate the HTML status dashboard with:

1. **KPI row** — current node count, edge count, artwork count, edge types in use, sources curated, skills files
2. **Risk banner** — whatever the current blocking risk is (schema freeze, authentication, etc.)
3. **4 track swim lanes** — Editorial, Infrastructure, Data, Frontend — each item with status dot and badge
4. **First-pass ingestion plan** — 3 source cards with edge coverage table
5. **Schema freeze detail** — what's in vs. what's missing
6. **Team cards** — current focus per person
7. **Basel countdown** — days remaining
8. **Footer** — when last regenerated, how many Notion docs read

## Output locations

1. `docs/status.html` — for GitHub Pages (team-accessible URL)
2. `~/.agent/diagrams/adai-status-map.html` — local copy
3. Open in browser after generation

## Style

- Dark theme with A(DAI) green accent (#00EA6D)
- DM Sans + Fira Code fonts
- Mission control aesthetic
- Status dots: green (done/live), blue (in progress), amber (at risk), red (critical/blocked), grey (not started)
- Staggered fade-in animations
- Both light and dark theme support via prefers-color-scheme

## After regeneration

Tell the user:
- What changed since last generation
- Any new risks or blockers detected
- Link to the GitHub Pages URL once deployed
