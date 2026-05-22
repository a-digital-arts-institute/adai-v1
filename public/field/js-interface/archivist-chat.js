/**
 * A(DAI) — floating archivist chat (server-hosted).
 *
 * Different from chat-narrator.js (the Reader handoff): this is the
 * server-hosted archivist that talks to Anthropic via /api/archivist/chat
 * and can drive the field view through client tools (focus_node,
 * highlight_nodes, set_field_mode, clear_focus).
 *
 * Self-contained: mounts one <div id="archivist-bar"> sibling to #chrome,
 * never edits other modules. Keyboard: Shift+? to toggle focus.
 *
 * Conversation state lives in memory + sessionStorage (per-tab, lost on
 * tab close). Server is stateless on history — we replay the last ~20
 * turns every chat.
 */
(() => {
  if (window.ADAI_ARCHIVIST) return; // idempotent

  const SESSION_HISTORY_KEY = 'adai_archivist_history';
  const MAX_HISTORY = 20;

  const STATE = {
    open: false,
    busy: false,
    online: null,     // null = unknown; true/false set after /session call
    quota: null,
    /** Wire-form history: array of { role, content } where content is either
     *  a string (user/assistant text) or a list of structured blocks
     *  (assistant tool_use + user tool_result). */
    history: [],
    /** UI-form turns: array of { role: 'user'|'assistant', html, chips: [] }
     *  used purely for rendering — separate from wire history because we
     *  collapse tool_use blocks into chips. */
    turns: [],
    pendingAssistant: null, // current assistant UI turn while streaming
    currentToolCalls: new Map(), // tool_use_id -> chip element
  };

  // ---------- session storage ----------
  function loadHistory() {
    try {
      const raw = sessionStorage.getItem(SESSION_HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.history) && Array.isArray(parsed.turns)) {
        STATE.history = parsed.history.slice(-MAX_HISTORY);
        STATE.turns = parsed.turns.slice(-MAX_HISTORY);
      }
    } catch {}
  }
  function saveHistory() {
    try {
      sessionStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify({
        history: STATE.history.slice(-MAX_HISTORY),
        turns: STATE.turns.slice(-MAX_HISTORY),
      }));
    } catch {}
  }

  // ---------- helpers ----------
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Minimal markdown — paragraphs, bullets, bold, italic, inline code, links.
  // Intentionally NOT a full parser. We control the model's output style
  // via the system prompt; this just needs to handle the common cases.
  function renderMarkdown(src) {
    if (!src) return '';
    // Split on blank lines to get paragraph-like blocks.
    const blocks = src.replace(/\r\n/g, '\n').split(/\n{2,}/);
    const out = [];
    for (const blockRaw of blocks) {
      const block = blockRaw.trim();
      if (!block) continue;
      const lines = block.split('\n');
      const isBulletList = lines.every(l => /^[-*]\s+/.test(l));
      const isNumList = lines.every(l => /^\d+\.\s+/.test(l));
      if (isBulletList) {
        out.push('<ul>' + lines.map(l => '<li>' + inline(l.replace(/^[-*]\s+/, '')) + '</li>').join('') + '</ul>');
      } else if (isNumList) {
        out.push('<ol>' + lines.map(l => '<li>' + inline(l.replace(/^\d+\.\s+/, '')) + '</li>').join('') + '</ol>');
      } else {
        out.push('<p>' + inline(block).replace(/\n/g, '<br>') + '</p>');
      }
    }
    return out.join('');
  }
  function inline(s) {
    // Escape first, then re-introduce the few constructs we support. Markdown
    // links are restricted to same-origin paths starting with '/'.
    let t = escapeHtml(s);
    // code: `foo`
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    // bold: **foo**
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // italic: *foo* (must not match left over from bold; bold already replaced)
    t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    // links: [text](/path) — only same-origin paths.
    t = t.replace(/\[([^\]]+)\]\((\/[^)]*)\)/g, (_m, label, href) => {
      return `<a href="${href}">${label}</a>`;
    });
    return t;
  }

  // ---------- DOM ----------
  function ensureRoot() {
    let el = document.getElementById('archivist-bar');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'archivist-bar';
    el.setAttribute('aria-label', 'archivist chat');
    el.innerHTML = `
      <div class="arch-log" id="arch-log" role="log" aria-live="polite"></div>
      <div class="arch-bar">
        <span class="arch-prompt" aria-hidden="true">⟁</span>
        <textarea class="arch-input" id="arch-input" rows="1"
          placeholder="ask the archivist…" autocomplete="off"
          spellcheck="false"></textarea>
        <button type="button" class="arch-send" id="arch-send">send</button>
        <span class="arch-keyhint" aria-hidden="true">⇧?</span>
      </div>
      <div class="arch-status" id="arch-status">…</div>
    `;
    document.body.appendChild(el);
    return el;
  }

  function renderLog() {
    const root = ensureRoot();
    const log = root.querySelector('#arch-log');
    if (!log) return;
    if (STATE.turns.length === 0) {
      log.innerHTML = `
        <div class="arch-empty">
          a server-hosted archivist with read-only access to the graph.
          ask about a practitioner, an artwork, a scene, or what's missing.
          <kbd>⇧?</kbd> toggles · <kbd>esc</kbd> closes
        </div>`;
      return;
    }
    log.innerHTML = STATE.turns.map((t, i) => renderTurn(t, i)).join('');
    log.scrollTop = log.scrollHeight;
  }
  function renderTurn(turn /*, idx */) {
    const cls = `arch-msg arch-msg-${turn.role}`;
    if (turn.role === 'user') {
      return `<div class="${cls}">${renderMarkdown(turn.text || '')}</div>`;
    }
    const chipsHtml = (turn.chips && turn.chips.length)
      ? `<div class="arch-chips">${turn.chips.map(chipHtml).join('')}</div>`
      : '';
    return `<div class="${cls}">${renderMarkdown(turn.text || '')}${chipsHtml}</div>`;
  }
  function chipHtml(c) {
    const cls = ['arch-chip'];
    if (c.done) cls.push('arch-chip-done');
    if (c.client) cls.push('arch-chip-client');
    if (c.error) cls.push('arch-chip-error');
    return `<span class="${cls.join(' ')}">${escapeHtml(c.label)}</span>`;
  }

  function setBusy(busy, status) {
    STATE.busy = !!busy;
    const root = ensureRoot();
    root.classList.toggle('is-busy', !!busy);
    const sEl = root.querySelector('#arch-status');
    if (sEl) sEl.textContent = status || '';
    const send = root.querySelector('#arch-send');
    if (send) send.disabled = !!busy;
  }
  function open() {
    STATE.open = true;
    const root = ensureRoot();
    root.classList.add('is-open');
    renderLog();
    const input = root.querySelector('#arch-input');
    if (input) input.focus();
  }
  function close() {
    STATE.open = false;
    const root = ensureRoot();
    root.classList.remove('is-open');
    const input = root.querySelector('#arch-input');
    if (input) input.blur();
  }
  function toggle() { STATE.open ? close() : open(); }
  function clear() {
    STATE.history = [];
    STATE.turns = [];
    saveHistory();
    renderLog();
  }

  // ---------- session bootstrap ----------
  async function ensureSession() {
    if (STATE.online !== null) return STATE.online;
    try {
      const r = await fetch('/api/archivist/session', { method: 'POST', credentials: 'same-origin' });
      if (!r.ok) { STATE.online = false; return false; }
      const j = await r.json();
      STATE.online = j.online !== false;
      STATE.quota = j.quota ?? null;
      return STATE.online;
    } catch {
      STATE.online = false;
      return false;
    }
  }

  // ---------- send + stream ----------
  async function send(text) {
    if (!text || STATE.busy) return;
    const online = await ensureSession();
    if (!online) {
      STATE.turns.push({ role: 'assistant', text: '*the archivist is offline (no API key configured).*', chips: [] });
      renderLog();
      return;
    }
    // Add user turn (both UI and wire).
    STATE.turns.push({ role: 'user', text });
    STATE.history.push({ role: 'user', content: text });
    STATE.pendingAssistant = { role: 'assistant', text: '', chips: [] };
    STATE.turns.push(STATE.pendingAssistant);
    STATE.currentToolCalls = new Map();
    setBusy(true, 'thinking…');
    renderLog();

    let resp;
    try {
      resp = await fetch('/api/archivist/chat', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        body: JSON.stringify({ messages: STATE.history.slice(-MAX_HISTORY) }),
      });
    } catch (e) {
      finishWithError('network error: ' + (e?.message || e));
      return;
    }
    if (!resp.ok) {
      let detail = '';
      try { detail = JSON.stringify(await resp.json()); } catch {}
      if (resp.status === 429) {
        finishWithError('rate-limited — slow down and try again in a few minutes.');
      } else if (resp.status === 503) {
        finishWithError('the archivist is resting (daily budget reached).');
      } else {
        finishWithError(`server returned ${resp.status}. ${detail}`);
      }
      return;
    }
    if (!resp.body) {
      finishWithError('no response body from server.');
      return;
    }
    try {
      await consumeSse(resp.body);
    } catch (e) {
      finishWithError('stream interrupted: ' + (e?.message || e));
      return;
    }
    // On done: record the assistant turn in wire history. If Claude emitted
    // text only (no tool calls outside the loop), a single string content
    // is enough; the model can resume next turn without seeing the chips.
    if (STATE.pendingAssistant && STATE.pendingAssistant.text) {
      STATE.history.push({ role: 'assistant', content: STATE.pendingAssistant.text });
    } else if (STATE.pendingAssistant) {
      // Empty assistant turn — drop it from history but keep the UI bubble
      // (with chips) so the user sees what happened.
      STATE.history.push({ role: 'assistant', content: '(no response)' });
      STATE.pendingAssistant.text = '*the archivist returned no text.*';
    }
    saveHistory();
    STATE.pendingAssistant = null;
    setBusy(false, '');
    renderLog();
  }

  function finishWithError(msg) {
    if (STATE.pendingAssistant) {
      STATE.pendingAssistant.text = '*' + msg + '*';
    } else {
      STATE.turns.push({ role: 'assistant', text: '*' + msg + '*', chips: [] });
    }
    setBusy(false, '');
    saveHistory();
    renderLog();
  }

  // Manual SSE parser — splits on double newline, then per-line on the
  // 'event:' and 'data:' prefixes. EventSource doesn't support POST, so
  // we roll this ourselves.
  async function consumeSse(body) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let currentEvent = '';
    let dataParts = [];
    let done = false;
    while (!done) {
      const { value, done: d } = await reader.read();
      done = d;
      if (value) buf += decoder.decode(value, { stream: !done });
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (line === '') {
          // dispatch
          if (dataParts.length > 0) {
            const dataStr = dataParts.join('\n');
            let payload = null;
            try { payload = JSON.parse(dataStr); } catch {}
            dispatchSse(currentEvent || 'message', payload);
          }
          currentEvent = '';
          dataParts = [];
          continue;
        }
        if (line.startsWith(':')) continue; // comment / heartbeat
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataParts.push(line.slice(5).trimStart());
        }
      }
    }
  }

  function chipLabelFor(name, input) {
    const labels = {
      search_nodes: input && input.query ? `searching: "${input.query}"` : 'searching',
      get_node: input && input.slug ? `reading: ${input.slug}` : 'reading node',
      get_neighbours: input && input.slug ? `neighbours: ${input.slug}` : 'neighbours',
      get_component: input && input.slug ? `component: ${input.slug}` : 'component',
      get_stats: 'graph stats',
      list_recent_additions: 'recent additions',
      focus_node: input && input.slug ? `→ focusing ${input.slug}` : '→ focus',
      highlight_nodes: input && Array.isArray(input.slugs) ? `→ highlight ×${input.slugs.length}` : '→ highlight',
      set_field_mode: input && input.mode ? `→ mode: ${input.mode}` : '→ mode',
      clear_focus: '→ zoom out',
    };
    return labels[name] || name;
  }

  function dispatchSse(event, data) {
    if (!data) return;
    const a = STATE.pendingAssistant;
    if (!a) return;
    if (event === 'text_delta' && typeof data.text === 'string') {
      a.text += data.text;
      renderLog();
    } else if (event === 'tool_use_start') {
      const chip = { id: data.tool_use_id, name: data.name, label: chipLabelFor(data.name, null), done: false };
      a.chips.push(chip);
      STATE.currentToolCalls.set(data.tool_use_id, chip);
      renderLog();
    } else if (event === 'tool_use_end') {
      const chip = STATE.currentToolCalls.get(data.tool_use_id);
      if (chip) {
        chip.done = true;
        if (!data.ok) chip.error = true;
      }
      renderLog();
    } else if (event === 'client_tool') {
      const chip = { name: data.name, label: chipLabelFor(data.name, data.input), client: true, done: true };
      a.chips.push(chip);
      dispatchClientTool(data.name, data.input || {});
      renderLog();
    } else if (event === 'stop') {
      // record reason silently; UI cleanup happens in send()
    } else if (event === 'error') {
      const msg = (data && data.error) || 'unknown error';
      a.chips.push({ name: 'error', label: 'error: ' + String(msg).slice(0, 80), error: true, done: true });
      renderLog();
    } else if (event === 'done') {
      // end-of-stream marker; consumeSse will exit naturally after this.
    }
  }

  // ---------- client tool dispatch ----------
  function findNodeIdBySlug(slug) {
    const g = window.ADAI_GRAPH;
    if (!g || !g.byId) return null;
    // Slugs are unique per the canonical seed. Search byId for a matching slug.
    for (const n of g.byId.values()) {
      if (n.slug === slug) return n.id;
    }
    return null;
  }
  function dispatchClientTool(name, input) {
    try {
      if (name === 'focus_node') {
        const id = findNodeIdBySlug(input.slug);
        if (id && window.ADAI_GRAPH_FIELD && typeof window.ADAI_GRAPH_FIELD.zoomTo === 'function') {
          window.ADAI_GRAPH_FIELD.zoomTo(id);
        }
      } else if (name === 'highlight_nodes') {
        const slugs = Array.isArray(input.slugs) ? input.slugs : [];
        if (slugs.length > 0) {
          const id = findNodeIdBySlug(slugs[0]);
          if (id && window.ADAI_GRAPH_FIELD && typeof window.ADAI_GRAPH_FIELD.zoomTo === 'function') {
            window.ADAI_GRAPH_FIELD.zoomTo(id);
          }
        }
      } else if (name === 'clear_focus') {
        // Best-effort: call zoomTo(null) if supported; otherwise just no-op.
        if (window.ADAI_GRAPH_FIELD && typeof window.ADAI_GRAPH_FIELD.zoomTo === 'function') {
          try { window.ADAI_GRAPH_FIELD.zoomTo(null); } catch {}
        }
      }
      // set_field_mode: deferred — no client API yet. Chip is shown so the
      // user knows the model tried; nothing visual changes until we wire
      // the embeddings-mode toggle into graph-field.js.
    } catch (e) {
      console.warn('[archivist] client-tool dispatch failed:', name, e);
    }
  }

  // ---------- event wiring ----------
  function onSendClick() {
    const root = ensureRoot();
    const input = root.querySelector('#arch-input');
    if (!input) return;
    const v = (input.value || '').trim();
    if (!v) return;
    input.value = '';
    autoresize();
    send(v);
  }
  function autoresize() {
    const root = ensureRoot();
    const input = root.querySelector('#arch-input');
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 96) + 'px';
  }

  // Build the DOM up-front so the bar is always visible. The log starts
  // collapsed (display:none in the empty state) and expands on first turn.
  function init() {
    loadHistory();
    ensureRoot();
    renderLog();
    const root = ensureRoot();
    root.classList.add('is-open'); // bar itself is always visible; log shows when there are turns

    const sendBtn = root.querySelector('#arch-send');
    const input = root.querySelector('#arch-input');
    sendBtn?.addEventListener('click', onSendClick);
    input?.addEventListener('input', autoresize);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSendClick();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        input.blur();
      }
    });
    input?.addEventListener('focus', () => { STATE.open = true; });

    // Global keyboard — Shift+? focuses the input from anywhere except
    // when the user is already typing in another field.
    document.addEventListener('keydown', (e) => {
      if (e.key === '?' && e.shiftKey) {
        const tag = (document.activeElement?.tagName || '').toLowerCase();
        const isTyping = tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable;
        if (isTyping && document.activeElement?.id !== 'arch-input') return;
        e.preventDefault();
        toggle();
      }
    });

    // Kick off the session in the background — no UI dependency.
    ensureSession().catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.ADAI_ARCHIVIST = {
    open, close, toggle, send, clear,
    get isOpen() { return STATE.open; },
    get isBusy() { return STATE.busy; },
  };
})();
