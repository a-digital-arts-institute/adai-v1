import { useState, useRef, useCallback, useEffect } from "react";

// ── Constants ────────────────────────────────────────────────────
const STAGES = ["idle", "uploading", "transcribing", "summarising", "posting", "done", "error"];
const NOTION_DB_SIGNALS = "e380fc07d10f4242baefffbc58ed0e95";

const stageLabel = {
  idle: "",
  uploading: "Uploading to AssemblyAI\u2026",
  transcribing: "Transcribing + detecting speakers\u2026",
  summarising: "Generating summary & tags via Claude\u2026",
  posting: "Posting to Notion Signal Inbox\u2026",
  done: "Done",
  error: "Error",
};

// ── localStorage helpers ─────────────────────────────────────────
const STORAGE_KEY = "adai_transcriber_keys";
function loadKeys() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch { return {}; }
}
function saveKeys(keys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

// ── Utilities ────────────────────────────────────────────────────
function LogLine({ text, dim }) {
  return (
    <div style={{ color: dim ? "#555" : "#a8ff78", fontFamily: "monospace", fontSize: 13, lineHeight: 1.7 }}>
      {dim ? <span style={{ color: "#444" }}>&rsaquo;</span> : <span style={{ color: "#a8ff78" }}>&rsaquo;</span>} {text}
    </div>
  );
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── 1. Upload to AssemblyAI ──────────────────────────────────────
async function uploadToAssemblyAI(file, apiKey, onLog) {
  onLog("Uploading file\u2026");
  const res = await fetch("https://api.assemblyai.com/v2/upload", {
    method: "POST",
    headers: { authorization: apiKey, "content-type": "application/octet-stream" },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const { upload_url } = await res.json();
  onLog(`Uploaded \u2192 ${upload_url.slice(0, 48)}\u2026`);
  return upload_url;
}

// ── 2. Transcribe with speaker diarization ───────────────────────
async function transcribeWithAssemblyAI(uploadUrl, apiKey, onLog) {
  onLog("Submitting transcription job (speaker diarization on)\u2026");
  const res = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: { authorization: apiKey, "content-type": "application/json" },
    body: JSON.stringify({ audio_url: uploadUrl, speaker_labels: true, speech_models: ["universal-3-pro"] }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    onLog(`AssemblyAI: ${errBody.slice(0, 300)}`);
    throw new Error(`Transcription submit failed: ${res.status}`);
  }
  const { id } = await res.json();
  onLog(`Job ID: ${id} \u2014 polling\u2026`);

  let attempts = 0;
  while (attempts < 120) {
    await sleep(3000);
    attempts++;
    const poll = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { authorization: apiKey },
    });
    const data = await poll.json();
    if (data.status === "completed") {
      onLog(`Transcription complete (${data.words?.length ?? "?"} words, ${data.utterances?.length ?? "?"} speaker segments)`);
      return data;
    }
    if (data.status === "error") throw new Error(`AssemblyAI error: ${data.error}`);
    if (attempts % 5 === 0) onLog(`Still transcribing\u2026 (${attempts * 3}s elapsed)`);
  }
  throw new Error("Transcription timed out after 6 minutes");
}

// ── Format utterances ────────────────────────────────────────────
function formatUtterances(utterances) {
  if (!utterances?.length) return "";
  return utterances.map(u => {
    const mins = Math.floor(u.start / 60000);
    const secs = Math.floor((u.start % 60000) / 1000);
    const ts = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    return `[${ts}] Speaker ${u.speaker}: ${u.text}`;
  }).join("\n");
}

// ── 3. Summarise with Claude (direct browser access) ─────────────
async function summariseWithClaude(transcript, filename, anthropicKey, onLog) {
  onLog("Sending to Claude for summary + tags\u2026");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [{
        role: "user",
        content: `You are an intelligence analyst for A(DAI) \u2014 A Digital Arts Institute. Analyze this transcript and return ONLY a JSON object (no markdown, no preamble) with these fields:
- "summary": 2-3 paragraph synthesis, written as a field signal brief. What matters, what patterns, what implications for digital arts/culture/tech.
- "tags": array of 4-8 lowercase tags (topics, themes, people, orgs, technologies)
- "signal_type": one of ["conversation", "lecture", "interview", "meeting", "field_recording", "panel", "other"]
- "key_quotes": array of 2-3 most significant verbatim quotes (with speaker if known)

Transcript from "${filename}":

${transcript.slice(0, 8000)}`
      }]
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.content.find(b => b.type === "text")?.text ?? "{}";
  const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
  onLog(`Tags: ${parsed.tags?.join(", ")}`);
  onLog(`Signal type: ${parsed.signal_type}`);
  return parsed;
}

// ── 4. Post to Notion Signal Inbox (via serverless proxy) ────────
async function postToNotion(notionKey, filename, transcriptFormatted, analysis, submittedBy, onLog) {
  onLog("Creating Notion page in Signal Inbox\u2026");

  const today = new Date().toISOString().split("T")[0];
  const tagProps = (analysis.tags || []).map(t => ({ name: t }));
  const keyQuotesText = (analysis.key_quotes || []).join("\n\n---\n\n");

  const children = [
    { object: "block", type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: "Summary" } }] } },
    ...(analysis.summary || "").split("\n\n").filter(Boolean).map(p => ({
      object: "block", type: "paragraph",
      paragraph: { rich_text: [{ type: "text", text: { content: p } }] }
    })),
    { object: "block", type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: "Key Quotes" } }] } },
    ...(analysis.key_quotes || []).map(q => ({
      object: "block", type: "quote",
      quote: { rich_text: [{ type: "text", text: { content: q } }] }
    })),
    { object: "block", type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: "Full Transcript" } }] } },
  ];

  for (let i = 0; i < transcriptFormatted.length; i += 1900) {
    children.push({
      object: "block", type: "code",
      code: { rich_text: [{ type: "text", text: { content: transcriptFormatted.slice(i, i + 1900) } }], language: "plain text" }
    });
  }

  const body = {
    parent: { database_id: NOTION_DB_SIGNALS },
    properties: {
      Name: { title: [{ text: { content: filename } }] },
      source_type: { select: { name: "transcript" } },
      raw_content: { rich_text: [{ text: { content: transcriptFormatted.slice(0, 2000) } }] },
      submitted_by: { select: { name: submittedBy } },
      date_captured: { date: { start: today } },
      protocol_stage: { select: { name: "SENSE" } },
      status: { select: { name: "raw" } },
      summary_ai: { rich_text: [{ text: { content: (analysis.summary || "").slice(0, 2000) } }] },
      signal_type: { select: { name: analysis.signal_type || "other" } },
      key_quotes: { rich_text: [{ text: { content: keyQuotesText.slice(0, 2000) } }] },
      tags: { multi_select: tagProps },
      intelligence_tier: { select: { name: "primary" } },
      signal_confidence: { select: { name: "verified" } },
    },
    children,
  };

  // Use /api/notion proxy (Vercel serverless fn or Vite dev proxy)
  const res = await fetch("/api/notion", {
    method: "POST",
    headers: {
      authorization: `Bearer ${notionKey}`,
      "notion-version": "2022-06-28",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion error ${res.status}: ${err.slice(0, 300)}`);
  }
  const page = await res.json();
  onLog(`Page created \u2192 ${page.url}`);
  return page.url;
}


// ══════════════════════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════════════════════

export default function Transcriber() {
  const [stage, setStage] = useState("idle");
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [submittedBy, setSubmittedBy] = useState("Iri");
  const [file, setFile] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const fileRef = useRef();

  // Keys from localStorage
  const [keys, setKeys] = useState(() => loadKeys());
  const hasKeys = keys.assemblyai && keys.anthropic && keys.notion;

  // Show setup on first load if no keys
  useEffect(() => { if (!hasKeys) setShowSetup(true); }, []);

  function updateKey(field, value) {
    const next = { ...keys, [field]: value.trim() };
    setKeys(next);
    saveKeys(next);
  }

  const log = useCallback((msg) => setLogs(l => [...l, msg]), []);

  const run = useCallback(async (f) => {
    if (!hasKeys) { setShowSetup(true); return; }
    setLogs([]);
    setResult(null);
    setFile(f);

    try {
      setStage("uploading");
      const uploadUrl = await uploadToAssemblyAI(f, keys.assemblyai, log);

      setStage("transcribing");
      const transcript = await transcribeWithAssemblyAI(uploadUrl, keys.assemblyai, log);
      const formatted = formatUtterances(transcript.utterances) || transcript.text;

      setStage("summarising");
      const analysis = await summariseWithClaude(formatted, f.name, keys.anthropic, log);

      setStage("posting");
      const pageUrl = await postToNotion(keys.notion, f.name, formatted, analysis, submittedBy, log);

      setResult({ pageUrl, analysis });
      setStage("done");
    } catch (e) {
      log(`ERROR: ${e.message}`);
      setStage("error");
    }
  }, [log, submittedBy, keys, hasKeys]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) run(f);
  }, [run]);

  const handleFile = useCallback((e) => {
    const f = e.target.files[0];
    if (f) run(f);
  }, [run]);

  const isRunning = !["idle", "done", "error"].includes(stage);
  const stageIndex = STAGES.indexOf(stage);

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0a", color: "#e0e0e0",
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "48px 24px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=Space+Grotesk:wght@300;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; background: #0a0a0a; }
        input, select { background: #111; border: 1px solid #2a2a2a; color: #ccc; padding: 8px 12px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; width: 100%; outline: none; border-radius: 2px; }
        input:focus, select:focus { border-color: #a8ff78; }
        input::placeholder { color: #444; }
        select option { background: #111; color: #ccc; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #111; } ::-webkit-scrollbar-thumb { background: #333; }
        .stage-dot { width: 6px; height: 6px; border-radius: 50%; background: #2a2a2a; transition: background 0.4s; }
        .stage-dot.active { background: #a8ff78; box-shadow: 0 0 8px #a8ff78; }
        .stage-dot.past { background: #3a5a2a; }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        .pulsing { animation: pulse 1.2s ease-in-out infinite; }
        a { color: #a8ff78; text-decoration: none; } a:hover { text-decoration: underline; }
        .btn { background: transparent; border: 1px solid #2a2a2a; color: #888; padding: 8px 20px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; cursor: pointer; border-radius: 2px; letter-spacing: 1px; transition: all 0.2s; }
        .btn:hover { border-color: #a8ff78; color: #a8ff78; }
        .btn-primary { border-color: #a8ff78; color: #a8ff78; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 10, letterSpacing: 6, color: "#555", marginBottom: 12, textTransform: "uppercase" }}>A(DAI) Field Intelligence</div>
        <div style={{ fontSize: 28, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 300, letterSpacing: -1, color: "#fff" }}>
          Signal Transcriber
        </div>
        <div style={{ fontSize: 12, color: "#444", marginTop: 8 }}>Audio/Video &rarr; AssemblyAI &rarr; Claude &rarr; Notion Signal Inbox</div>
      </div>

      {/* Setup toggle */}
      <div style={{ width: "100%", maxWidth: 560, marginBottom: 16, textAlign: "right" }}>
        <button className="btn" onClick={() => setShowSetup(!showSetup)}>
          {showSetup ? "HIDE SETUP" : "SETUP"}
        </button>
      </div>

      {/* Key entry panel */}
      {showSetup && (
        <div style={{
          width: "100%", maxWidth: 560, border: "1px solid #1a1a1a", borderRadius: 2,
          padding: 24, marginBottom: 24, background: "#0d0d0d",
        }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#555", marginBottom: 16, textTransform: "uppercase" }}>API Keys (saved in your browser)</div>
          {[
            { key: "assemblyai", label: "AssemblyAI Key", placeholder: "72973ae8..." },
            { key: "anthropic", label: "Anthropic Key", placeholder: "sk-ant-api03-..." },
            { key: "notion", label: "Notion Token", placeholder: "ntn_..." },
          ].map(({ key, label, placeholder }) => (
            <div key={key} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>{label}</div>
              <input
                type="password"
                placeholder={placeholder}
                value={keys[key] || ""}
                onChange={e => updateKey(key, e.target.value)}
              />
            </div>
          ))}
          <div style={{ fontSize: 11, color: hasKeys ? "#3a6a3a" : "#6a3a3a", marginTop: 8 }}>
            {hasKeys ? "All keys set \u2014 stored in localStorage" : "Enter all 3 keys to enable transcription"}
          </div>
        </div>
      )}

      {/* Submitted By selector */}
      <div style={{ width: "100%", maxWidth: 560, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 11, color: "#555", width: 120, flexShrink: 0 }}>Submitted by</div>
          <select
            value={submittedBy}
            onChange={e => setSubmittedBy(e.target.value)}
            disabled={isRunning}
            style={{ maxWidth: 200 }}
          >
            {["Iri", "JB", "Piyush", "Gio"].map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Drop zone */}
      <div
        style={{
          width: "100%", maxWidth: 560, height: 160,
          border: `1px dashed ${dragOver ? "#a8ff78" : "#2a2a2a"}`,
          borderRadius: 4, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          cursor: isRunning ? "not-allowed" : hasKeys ? "pointer" : "not-allowed",
          transition: "border-color 0.2s, background 0.2s",
          background: dragOver ? "rgba(168,255,120,0.03)" : "#0d0d0d",
          opacity: hasKeys ? 1 : 0.4,
          marginBottom: 32,
        }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isRunning && hasKeys && fileRef.current.click()}
      >
        <input ref={fileRef} type="file" accept="video/*,audio/*" style={{ display: "none" }} onChange={handleFile} />
        {isRunning ? (
          <div className="pulsing" style={{ color: "#a8ff78", fontSize: 12 }}>{stageLabel[stage]}</div>
        ) : stage === "done" ? (
          <div style={{ color: "#a8ff78", fontSize: 12 }}>Done &mdash; {file?.name} &mdash; drop another to run again</div>
        ) : !hasKeys ? (
          <div style={{ fontSize: 12, color: "#555" }}>Enter API keys above to enable</div>
        ) : (
          <>
            <div style={{ fontSize: 24, marginBottom: 8, color: "#333" }}>+</div>
            <div style={{ fontSize: 12, color: "#444" }}>Drop audio/video file (or click to browse)</div>
            <div style={{ fontSize: 11, color: "#333", marginTop: 6 }}>MP4, MP3, WAV, M4A, WebM</div>
          </>
        )}
      </div>

      {/* Progress stages */}
      {stage !== "idle" && (
        <div style={{ width: "100%", maxWidth: 560, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 16 }}>
            {["uploading", "transcribing", "summarising", "posting", "done"].map((s, i, arr) => {
              const active = stage === s;
              const past = stageIndex > STAGES.indexOf(s);
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", flex: i < arr.length - 1 ? 1 : 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div className={`stage-dot ${active ? "active pulsing" : past ? "past" : ""}`} />
                    <div style={{ fontSize: 9, color: active ? "#a8ff78" : past ? "#3a5a2a" : "#333", letterSpacing: 1, whiteSpace: "nowrap" }}>
                      {s.toUpperCase()}
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ flex: 1, height: 1, background: past ? "#3a5a2a" : "#1a1a1a", margin: "0 8px 16px" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Log */}
      {logs.length > 0 && (
        <div style={{
          width: "100%", maxWidth: 560, background: "#0d0d0d",
          border: "1px solid #1a1a1a", borderRadius: 2, padding: "16px",
          maxHeight: 200, overflowY: "auto", marginBottom: 24,
        }}>
          {logs.map((l, i) => <LogLine key={i} text={l} dim={i < logs.length - 3} />)}
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ width: "100%", maxWidth: 560, border: "1px solid #1e3a1e", borderRadius: 2, padding: 24, background: "#0d130d" }}>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#3a6a3a", marginBottom: 16, textTransform: "uppercase" }}>Signal Posted</div>
          <div style={{ fontSize: 12, color: "#7ab87a", marginBottom: 12 }}>
            <a href={result.pageUrl} target="_blank" rel="noopener noreferrer">&rarr; Open in Notion</a>
          </div>
          <div style={{ fontSize: 11, color: "#555", marginBottom: 8 }}>
            Type: <span style={{ color: "#888" }}>{result.analysis.signal_type}</span>
            &nbsp;&middot;&nbsp;Tags: <span style={{ color: "#888" }}>{result.analysis.tags?.join(", ")}</span>
          </div>
          <div style={{ fontSize: 12, color: "#666", lineHeight: 1.7, borderTop: "1px solid #1a2a1a", paddingTop: 12, marginTop: 12 }}>
            {result.analysis.summary?.slice(0, 300)}&hellip;
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: 48, fontSize: 10, color: "#333", letterSpacing: 2 }}>
        A(DAI) &middot; A DIGITAL ARTS INSTITUTE
      </div>
    </div>
  );
}
