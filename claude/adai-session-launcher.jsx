import { useState, useCallback } from "react";

const TASKS = {
  raindrop_sync: "Build raindrop_sync.py — fetch Raindrop bookmarks tagged 'adai', deduplicate by URL, write to Signal Inbox",
  transcript_ingest: "Build transcript_ingest.py — CLI version of AssemblyAI→Claude→Notion pipeline (mirrors adai-transcriber.jsx flow)",
  signal_processor: "Build signal_processor.py — pull all status=raw signals, call Claude API, extract summary + concepts + actors, write back to Notion",
  query: "Build query.py — natural language question → search Notion corpus → synthesized answer with signal citations",
  weekly_brief: "Build weekly_brief.py — pull last 7 days of processed signals, cluster by concept, generate brief in A(DAI) voice, write to Sensemaking Outputs",
  custom: "Custom task…",
};

const RUNNERS = ["Iri", "JB", "Piyush", "Gio"];

function buildPrompt(taskKey, taskText, note, runner) {
  const sessionTask = taskKey === "custom" ? taskText : TASKS[taskKey];
  const noteLine = note.trim() ? `\n${note.trim()}` : "";

  return `# A(DAI) — Collective Intelligence Infrastructure

You are a senior Python engineer and knowledge systems architect. You are building the technical infrastructure for A(DAI) — A Digital Arts Institute — a commons-first collective intelligence project for the digital arts field.

## Who We Are

- Iri (@aiio)             — founder aiio.studio, coordination systems, curatorial advisor
- JB (@jamie247)          — distributed systems, market formation, Outlier Ventures
- Piyush (@Pixel0Symphony) — generative/algorithmic artist, art history, curatorial
- Gio                     — developer, technical implementation

We are NOT a startup. We build open-source protocol infrastructure for the digital arts field. Everything must be modular, documented, and forkable.

## What We Are Building

A Notion-native collective intelligence system. Notion is where the entire team works. Each team member uses their own LLM (Claude) to interact with Notion — reading signals, generating briefs, running queries. You (Claude Code) build and maintain all Python automation that powers this.

The five sensemaking protocols:

  SENSE      → observe and absorb what is emerging
  QUERY      → ask the field's collective intelligence
  SPECULATE  → propose frameworks, name movements
  REACT      → respond, critique, debate, disagree
  EXPERIMENT → test through exhibitions, activations, capital

## Tech Stack

- Language:      Python 3.11+
- Database:      Notion (notion-client SDK, Notion API v1)
- AI:            Anthropic API (claude-sonnet-4-20250514, max_tokens=2000)
- Transcription: AssemblyAI API v2 (speaker diarization enabled)
- Bookmarks:     Raindrop.io API (v1)
- Secrets:       .env file (python-dotenv) — NEVER hardcode
- Version:       GitHub (adai-intelligence repo)

## Notion Database Schema — Five Databases

The Signal Inbox is the entry point for all intelligence. All five databases are relational.

DB 1: SIGNAL INBOX

  title          text      — auto-generated or user-written headline
  url            url       — source link if applicable
  source_type    select    — bookmark | transcript | observation | article | conversation
  raw_content    text      — full text, ungated
  submitted_by   select    — Iri | JB | Piyush | Gio | system
  date_captured  date      — when signal entered the system
  protocol_stage select    — SENSE | QUERY | SPECULATE | REACT | EXPERIMENT
  status         select    — raw | processing | processed | archived
  summary_ai     text      — Claude-generated summary
  signal_type    select    — conversation | lecture | interview | meeting | panel | other
  key_quotes     text      — 2-3 verbatim quotes (if transcript)
  tags           multi     — freeform field tags
  concepts[]     relation  — relates to Concepts DB
  contacts[]     relation  — relates to Contacts DB

DB 2: CONCEPTS

  name           title
  definition     text      — working definition, editable by team
  first_seen     date
  status         select    — emerging | established | contested | dormant
  signals[]      relation  — back-relates to Signal Inbox
  related[]      relation  — self-relation to other Concepts

DB 3: CONTACTS

  name           title
  type           select    — artist | institution | critic | funder | platform | collective
  role           text
  location       text
  signals[]      relation  — back-relates to Signal Inbox

DB 4: SENSEMAKING OUTPUTS

  title          text
  type           select    — brief | query_response | pattern_report | field_dispatch | analysis
  content        text      — full AI-generated content
  generated_by   select    — Iri | JB | Piyush | Gio | system
  date           date
  source_signals relation  — signals that fed this output
  concepts[]     relation  — concepts this surfaces

DB 5: PROJECTS

  name           title
  protocol_stage select    — SENSE | QUERY | SPECULATE | REACT | EXPERIMENT
  status         select    — active | paused | complete | archived
  lead           select    — Iri | JB | Piyush | Gio
  signals[]      relation  — back-relates to Signal Inbox

## Transcript Pipeline — AssemblyAI → Claude → Notion

The team's primary signal intake is meeting transcripts. The flow:

  1. Audio/video file uploaded (MP4, M4A, WAV, MP3)
  2. AssemblyAI transcribes with speaker diarization (speaker_labels: true)
  3. Formatted transcript: [MM:SS] Speaker A: text
  4. Claude analyzes and returns JSON:
       summary: 2-3 paragraph field signal brief
       tags: 4-8 lowercase tags
       signal_type: conversation|lecture|interview|meeting|panel|other
       key_quotes: 2-3 significant verbatim quotes with speaker
  5. Notion page created in Signal Inbox with Summary, Key Quotes, Full Transcript blocks
     Transcript chunked into 1900-char code blocks (Notion API limit)

A working React transcriber (adai-transcriber.jsx) already exists. transcript_ingest.py replicates this flow for CLI use.

## Engineering Rules

1. ALL keys from .env — NOTION_TOKEN, NOTION_DB_SIGNALS, NOTION_DB_CONCEPTS, NOTION_DB_CONTACTS, NOTION_DB_OUTPUTS, NOTION_DB_PROJECTS, ASSEMBLYAI_KEY, RAINDROP_TOKEN, ANTHROPIC_API_KEY — never hardcode.
2. Notion rate limit: 3 req/sec — always time.sleep(0.34) between API calls.
3. All scripts must be idempotent. Deduplicate by URL or content hash.
4. Wrap every Notion write in try/except. Log to errors.log, never crash silently.
5. All AI-generated content: mark ai_generated=True in Notion properties.
6. Show me the full script BEFORE running against live Notion databases.
7. For destructive operations: dry-run first, explicit confirmation required.
8. Update README.md and PROGRESS.md after every session.
9. Prefer simple, readable Python. Gio maintains this codebase.

## What Good Signal Processing Looks Like

When processor.py calls Claude on a raw signal, request JSON only:

  1. 3-sentence summary (journalistic tone, no hype)
  2. 3-5 named concepts (movement names, aesthetic terms, tensions)
  3. Named actors and orgs if present
  4. One speculative implication (what might this mean for the field in 12 months?)

Output writes back to Notion: summary → summary_ai, concepts auto-linked, status → processed.

## How the Team Interacts — LLM as Interface

No one runs Python manually. Personal Claude via Notion MCP for conversation and manual entries. Claude Code handles automation.

  'Add this transcript'                → transcript_ingest.py or transcriber UI
  'Sync Raindrop bookmarks'            → raindrop_sync.py
  'Process all unprocessed signals'    → signal_processor.py
  'What do we know about X?'           → query.py --q '...'
  'Generate this week's brief'         → weekly_brief.py

## Session Task

Runner: ${runner}

${sessionTask}${noteLine}

## How to Work With Me

- Show me the full script before running. Explain architectural decisions.
- For all Notion writes: show dry-run output first.
- When you make a tradeoff, name it. I want to understand the system.
- End each session: update PROGRESS.md, suggest the next logical build step.
- This codebase will be open-sourced. Write it like others will read it.`;
}

const FONT = "'IBM Plex Mono', 'Courier New', monospace";
const GREEN = "#ccff00";
const BG = "#0a0a0a";

export default function SessionLauncher() {
  const [selectedTask, setSelectedTask] = useState("raindrop_sync");
  const [customTask, setCustomTask] = useState("");
  const [sessionNote, setSessionNote] = useState("");
  const [runner, setRunner] = useState("Iri");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = useCallback(() => {
    const prompt = buildPrompt(selectedTask, customTask, sessionNote, runner);
    setGeneratedPrompt(prompt);
    setCopied(false);
  }, [selectedTask, customTask, sessionNote, runner]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(generatedPrompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [generatedPrompt]);

  const taskLabel =
    selectedTask === "custom" ? "custom" : selectedTask.replace(/_/g, "_");

  const inputStyle = {
    backgroundColor: "#111",
    border: "1px solid #2a2a2a",
    color: "#e0e0e0",
    fontFamily: FONT,
    fontSize: 13,
  };

  const labelStyle = {
    color: "#888",
    fontFamily: FONT,
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  };

  return (
    <div
      className="min-h-screen flex items-start justify-center px-4 py-12"
      style={{ backgroundColor: BG, fontFamily: FONT }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&display=swap');
        ::selection { background: #ccff0033; color: #fff; }
        .launcher-scroll::-webkit-scrollbar { width: 6px; }
        .launcher-scroll::-webkit-scrollbar-track { background: #111; }
        .launcher-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        .launcher-scroll::-webkit-scrollbar-thumb:hover { background: #555; }
      `}</style>

      <div className="w-full" style={{ maxWidth: 600 }}>
        {/* Header */}
        <div className="mb-10">
          <h1
            className="tracking-tight"
            style={{
              fontFamily: FONT,
              fontWeight: 500,
              fontSize: 32,
              color: GREEN,
              lineHeight: 1,
              marginBottom: 6,
            }}
          >
            A(DAI)
          </h1>
          <h2
            style={{
              fontFamily: FONT,
              fontWeight: 300,
              fontSize: 18,
              color: "#e0e0e0",
              marginBottom: 4,
            }}
          >
            Session Launcher
          </h2>
          <p style={{ fontFamily: FONT, fontSize: 11, color: "#555" }}>
            assemble your claude code prompt
          </p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-5">
          {/* Session Task */}
          <div className="flex flex-col gap-1.5">
            <label style={labelStyle}>Session Task</label>
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              className="w-full rounded px-3 py-2.5 outline-none focus:ring-1"
              style={{
                ...inputStyle,
                focusRingColor: GREEN,
              }}
            >
              {Object.entries(TASKS).map(([key, desc]) => (
                <option key={key} value={key}>
                  {key === "custom" ? "custom — free text" : `${key}`}
                </option>
              ))}
            </select>
            <p
              style={{
                fontSize: 11,
                color: "#555",
                fontFamily: FONT,
                marginTop: 2,
              }}
            >
              {TASKS[selectedTask]}
            </p>
          </div>

          {/* Custom Task Input */}
          {selectedTask === "custom" && (
            <div className="flex flex-col gap-1.5">
              <label style={labelStyle}>Custom Task Description</label>
              <textarea
                value={customTask}
                onChange={(e) => setCustomTask(e.target.value)}
                placeholder="Describe the build task…"
                rows={3}
                className="w-full rounded px-3 py-2.5 outline-none resize-none focus:ring-1"
                style={inputStyle}
              />
            </div>
          )}

          {/* Session Note */}
          <div className="flex flex-col gap-1.5">
            <label style={labelStyle}>
              Session Note{" "}
              <span style={{ color: "#444", textTransform: "none" }}>
                (optional)
              </span>
            </label>
            <textarea
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              placeholder="e.g. focus on error handling, Gio is running this…"
              rows={2}
              className="w-full rounded px-3 py-2.5 outline-none resize-none focus:ring-1"
              style={inputStyle}
            />
          </div>

          {/* Runner */}
          <div className="flex flex-col gap-1.5">
            <label style={labelStyle}>Who is running this session</label>
            <select
              value={runner}
              onChange={(e) => setRunner(e.target.value)}
              className="w-full rounded px-3 py-2.5 outline-none focus:ring-1"
              style={inputStyle}
            >
              {RUNNERS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={selectedTask === "custom" && !customTask.trim()}
            className="w-full rounded py-3 font-medium tracking-wide uppercase text-sm transition-opacity"
            style={{
              backgroundColor: GREEN,
              color: "#000",
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "0.05em",
              opacity:
                selectedTask === "custom" && !customTask.trim() ? 0.35 : 1,
              cursor:
                selectedTask === "custom" && !customTask.trim()
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            Generate Prompt
          </button>
        </div>

        {/* Output */}
        {generatedPrompt && (
          <div className="mt-8">
            {/* Status line */}
            <p
              className="mb-3"
              style={{ fontSize: 11, color: "#888", fontFamily: FONT }}
            >
              Session:{" "}
              <span style={{ color: GREEN }}>{taskLabel}</span>
              {"  ·  "}Runner:{" "}
              <span style={{ color: GREEN }}>{runner}</span>
              {"  ·  "}
              <span style={{ color: "#555" }}>
                Ready to paste into Claude Code
              </span>
            </p>

            {/* Prompt block */}
            <div
              className="relative rounded"
              style={{
                backgroundColor: "#111",
                borderLeft: `3px solid ${GREEN}`,
              }}
            >
              {/* Copy button */}
              <div
                className="sticky top-0 flex justify-end p-2"
                style={{ backgroundColor: "#111", zIndex: 1 }}
              >
                <button
                  onClick={handleCopy}
                  className="rounded px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: copied ? "#1a2a0a" : GREEN,
                    color: copied ? GREEN : "#000",
                    fontFamily: FONT,
                    fontSize: 11,
                    border: copied ? `1px solid ${GREEN}33` : "none",
                  }}
                >
                  {copied ? "Copied \u2713" : "Copy"}
                </button>
              </div>

              <pre
                className="launcher-scroll overflow-auto px-4 pb-4 whitespace-pre-wrap break-words"
                style={{
                  fontFamily: FONT,
                  fontSize: 11,
                  lineHeight: 1.6,
                  color: "#ccc",
                  maxHeight: 480,
                }}
              >
                {generatedPrompt}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
