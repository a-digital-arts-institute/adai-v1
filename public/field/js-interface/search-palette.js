/**
 * A(DAI) — search palette
 *
 * Cmd/Ctrl+K (or '/') opens a centered floating input that searches across
 * the live graph. Enter on the top match (or click any) navigates via
 * window.ADAI_GRAPH_FIELD.zoomTo(id) — works for any node type, not just
 * practitioners (artworks, scenes, institutions, concepts all reachable).
 *
 * Read-only navigation only. No edits, no contribute path.
 */
(() => {
  const STATE = { open: false, query: '', results: [], cursor: 0 };
  const MAX_RESULTS = 200;

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---------- Search ----------
  // Lightweight scoring: prefix match > word-boundary match > substring.
  // Practitioners ranked above artworks ranked above concepts.
  const TYPE_RANK = {
    practitioner: 0,
    artwork: 1,
    scene: 2,
    institution: 3,
    collective: 3,
    platform: 4,
    concept: 5,
    classification_regime: 6,
  };

  function scoreNode(node, q) {
    if (!q) return 0;
    const name = (node.name || '').toLowerCase();
    const lq = q.toLowerCase();
    if (!name) return -Infinity;
    if (name === lq) return 1000;
    if (name.startsWith(lq)) return 500 - name.length;
    // word-boundary
    const re = new RegExp('(^|\\s|[-/_])' + lq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (re.test(name)) return 300 - name.length;
    if (name.includes(lq)) return 100 - name.length;
    return -Infinity;
  }

  function search(q) {
    const g = window.ADAI_GRAPH;
    if (!g) return [];
    if (!q || q.length < 1) {
      // Empty query: show top practitioners by intention (most-connected first).
      const ps = (g.byType.get('practitioner') || []).slice();
      ps.sort((a, b) => (g.intentionOf(b.id) || 0) - (g.intentionOf(a.id) || 0));
      return ps.slice(0, MAX_RESULTS).map(n => ({ node: n, score: 0 }));
    }
    const out = [];
    for (const n of g.byId.values()) {
      const s = scoreNode(n, q);
      if (s === -Infinity) continue;
      out.push({ node: n, score: s });
    }
    out.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ra = TYPE_RANK[a.node.type] ?? 9;
      const rb = TYPE_RANK[b.node.type] ?? 9;
      if (ra !== rb) return ra - rb;
      return (a.node.name || '').localeCompare(b.node.name || '');
    });
    return out.slice(0, MAX_RESULTS);
  }

  // ---------- DOM ----------
  function ensureEl() {
    let el = document.getElementById('search-palette');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'search-palette';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '';
    document.body.appendChild(el);
    return el;
  }

  function highlightMatch(name, q) {
    if (!q) return escapeHtml(name);
    const lname = name.toLowerCase();
    const lq = q.toLowerCase();
    const i = lname.indexOf(lq);
    if (i < 0) return escapeHtml(name);
    return `${escapeHtml(name.slice(0, i))}<mark>${escapeHtml(name.slice(i, i + q.length))}</mark>${escapeHtml(name.slice(i + q.length))}`;
  }

  function render() {
    const el = ensureEl();
    const results = STATE.results;
    const list = results.length
      ? results.map((r, i) => {
          const cls = i === STATE.cursor ? 'sp-row sp-row--cursor' : 'sp-row';
          return `
            <li class="${cls}" data-sp-idx="${i}" data-sp-id="${escapeHtml(r.node.id)}">
              <span class="sp-type">[${escapeHtml(r.node.type)}]</span>
              <span class="sp-name">${highlightMatch(r.node.name || '(unnamed)', STATE.query)}</span>
            </li>
          `;
        }).join('')
      : `<li class="sp-empty">no matches — try a different name</li>`;
    el.innerHTML = `
      <div class="sp-shell">
        <header class="sp-head">
          <span class="sp-prompt">⌕</span>
          <input class="sp-input" type="text" placeholder="find a practitioner, work, scene, institution…" autocomplete="off" spellcheck="false" value="${escapeHtml(STATE.query)}">
          <span class="sp-keyhint">↑↓ ↵ esc</span>
        </header>
        <ul class="sp-list">${list}</ul>
        <footer class="sp-foot">
          <span class="sp-foot-stat">${results.length} of ${(window.ADAI_GRAPH?.nodes?.length) || 0} nodes</span>
          <button type="button" class="sp-archivist" data-sp-archivist title="hand off to the archivist (Reader skill)">ask the archivist →</button>
          <span class="sp-foot-tip">⌘K · /</span>
        </footer>
      </div>
    `;
    // Restore focus + caret position to the input.
    const input = el.querySelector('.sp-input');
    if (input) {
      input.focus();
      try { input.setSelectionRange(STATE.query.length, STATE.query.length); } catch {}
    }
    // Keep the cursor row visible when navigating by keyboard.
    const sel = el.querySelector('.sp-row--cursor');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  function open() {
    STATE.open = true;
    STATE.query = '';
    STATE.results = search('');
    STATE.cursor = 0;
    const el = ensureEl();
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    render();
  }
  function close() {
    STATE.open = false;
    const el = document.getElementById('search-palette');
    if (el) {
      el.classList.remove('is-open');
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '';
    }
  }
  function commit(idx) {
    const r = STATE.results[idx];
    if (!r) return;
    const id = r.node.id;
    close();
    // Defer one frame so the modal teardown doesn't fight the zoom animation.
    requestAnimationFrame(() => {
      const api = window.ADAI_GRAPH_FIELD;
      if (api && typeof api.zoomTo === 'function') api.zoomTo(id);
    });
  }

  // ---------- Events ----------
  // Global open shortcuts.
  document.addEventListener('keydown', (e) => {
    if (STATE.open) return;
    // Skip if user is typing in another input.
    const tag = (document.activeElement?.tagName || '').toLowerCase();
    const isTyping = tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault(); open(); return;
    }
    if (!isTyping && e.key === '/') {
      e.preventDefault(); open(); return;
    }
  });

  // Palette-internal events (use capture for ESC priority over other modals).
  document.addEventListener('keydown', (e) => {
    if (!STATE.open) return;
    const k = e.key;
    if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (k === 'ArrowDown') {
      e.preventDefault();
      STATE.cursor = Math.min(STATE.cursor + 1, STATE.results.length - 1);
      render(); return;
    }
    if (k === 'ArrowUp') {
      e.preventDefault();
      STATE.cursor = Math.max(STATE.cursor - 1, 0);
      render(); return;
    }
    if (k === 'Enter') {
      e.preventDefault();
      commit(STATE.cursor);
      return;
    }
  }, true);

  document.addEventListener('input', (e) => {
    if (!STATE.open) return;
    if (!e.target?.classList?.contains('sp-input')) return;
    STATE.query = e.target.value;
    STATE.results = search(STATE.query);
    STATE.cursor = 0;
    render();
  });

  document.addEventListener('click', (e) => {
    // Launcher chip — opens palette from any state.
    if (e.target?.closest?.('[data-sp-launch]')) {
      e.preventDefault();
      if (!STATE.open) open();
      return;
    }
    if (!STATE.open) return;
    // Hand off to the archivist (Reader skill).
    if (e.target?.closest?.('[data-sp-archivist]')) {
      e.preventDefault();
      close();
      requestAnimationFrame(() => {
        if (window.ADAI_CHAT_NARRATOR?.open) window.ADAI_CHAT_NARRATOR.open();
      });
      return;
    }
    const row = e.target?.closest?.('.sp-row');
    if (row) {
      const idx = Number(row.dataset.spIdx);
      if (!Number.isNaN(idx)) commit(idx);
      return;
    }
    // Click outside the shell closes.
    const shell = e.target?.closest?.('.sp-shell');
    if (!shell) close();
  });

  // ---------- Public API ----------
  window.ADAI_SEARCH = { open, close, get isOpen() { return STATE.open; } };

  // ---------- Styles ----------
  const style = document.createElement('style');
  style.textContent = `
    #search-palette {
      position: fixed; inset: 0; z-index: 1300;
      background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
      display: none; align-items: flex-start; justify-content: center;
      padding-top: 14vh;
    }
    #search-palette.is-open { display: flex; }
    .sp-shell {
      width: min(560px, 92vw);
      background: rgba(8, 8, 10, 0.97);
      border: 1px solid #2a2a2c;
      box-shadow: 0 24px 48px rgba(0,0,0,0.5);
      color: var(--text, #E8E6E1);
      font-family: var(--mono, 'SF Mono', 'Menlo', 'Consolas', monospace);
    }
    .sp-head {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border-bottom: 1px solid #2a2a2c;
    }
    .sp-prompt { color: #6a6a6c; font-size: 14px; }
    .sp-input {
      flex: 1; background: transparent; color: var(--text, #E8E6E1);
      border: none; outline: none;
      font-family: inherit; font-size: 14px; padding: 4px 0;
    }
    .sp-input::placeholder { color: #4a4a4c; }
    .sp-keyhint { color: #4a4a4c; font-size: 11px; letter-spacing: 0.06em; }
    .sp-list { list-style: none; padding: 4px 0; margin: 0; max-height: 50vh; overflow-y: auto; }
    .sp-row {
      display: grid; grid-template-columns: 110px 1fr; gap: 12px;
      padding: 7px 14px; cursor: pointer; align-items: baseline;
      font-size: 13px;
    }
    .sp-row:hover, .sp-row--cursor {
      background: rgba(65, 105, 176, 0.12);
    }
    .sp-row--cursor { box-shadow: inset 2px 0 0 var(--brand-color, #4169B0); }
    .sp-type { color: #6a6a6c; }
    .sp-name { color: var(--text); }
    .sp-name mark { background: rgba(65, 105, 176, 0.35); color: var(--text); }
    .sp-empty { padding: 20px 14px; color: #6a6a6c; font-size: 13px; }
    .sp-foot {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 14px; border-top: 1px solid #2a2a2c;
      color: #4a4a4c; font-size: 11px; letter-spacing: 0.04em;
    }
    .sp-foot-tip { font-family: inherit; }
    .sp-archivist {
      background: transparent; border: 1px solid #2a2a2c; color: #b4b4b6;
      font-family: inherit; font-size: 11px; letter-spacing: 0.04em;
      padding: 3px 8px; cursor: pointer; line-height: 1;
    }
    .sp-archivist:hover { color: var(--text, #E8E6E1); border-color: #4a4a4c; }

    /* Global launcher group — top-center of chrome. Below the logotype line. */
    #adai-launchers {
      position: fixed; top: 14px; left: 50%; transform: translateX(-50%);
      display: flex; gap: 8px; z-index: 12;
    }
    .adai-launcher {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 10px; border: 1px solid #2a2a2c; background: rgba(0,0,0,0.4);
      color: #b4b4b6; font-family: var(--mono, 'SF Mono', monospace); font-size: 11px;
      cursor: pointer; line-height: 1; height: 24px;
    }
    .adai-launcher:hover { color: var(--text, #E8E6E1); border-color: #4a4a4c; }
    .adai-launcher-key { color: #6a6a6c; padding-left: 4px; font-size: 10px; }
    .adai-launcher-wip {
      color: #c4a868; padding-left: 6px; font-size: 9px; letter-spacing: 0.08em;
      text-transform: uppercase; border-left: 1px solid #2a2a2c; margin-left: 4px;
      padding-left: 8px;
    }
  `;
  document.head.appendChild(style);
})();
