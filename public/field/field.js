/**
 * A(DAI) — Chrome layer
 * Handles UI elements: coordinates, vitals, and room nav.
 * Shape of Time renders independently via sketch-brand.js.
 */

(() => {
  const SIGNAL = '#A8C4E0';
  let mouseX = -1, mouseY = -1;
  let W = window.innerWidth;
  let H = window.innerHeight;

  function updateCoords() {
    if (mouseX >= 0) {
      document.getElementById('coord-x').textContent = `x ${(mouseX / W).toFixed(3)}`;
      document.getElementById('coord-y').textContent = `y ${(mouseY / H).toFixed(3)}`;
    }
  }

  window.addEventListener('resize', () => { W = window.innerWidth; H = window.innerHeight; });
  document.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; updateCoords(); });
  document.addEventListener('mouseleave', () => { mouseX = -1; mouseY = -1; });

  function startLogotypeTypewriter() {
    const root = document.getElementById('logotype');
    const textEl = document.getElementById('logotype-text');
    if (!root || !textEl) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const CURSOR_CASES = ['0', '1', '2', '3', '4', '5', '6'];
    const TYPE_DELAY = 150;
    const DELETE_SELECT_DELAY = 125;
    const DELETE_SETTLE_DELAY = 70;
    const HOLD_FULL_DELAY = 900;
    const HOLD_EMPTY_DELAY = 425;
    const INITIAL_DELAY = 320;
    let timerId = null;
    let word = 'adai';
    let index = 0;
    let deleting = false;
    let selectingDelete = false;
    let cursorCaseIndex = 0;

    const esc = (value) => value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    function getBrandWord() {
      return window.ADAI_BRAND?.currentLogo?.text || 'adai';
    }

    function applyCursorCase() {
      root.dataset.cursorCase = CURSOR_CASES[cursorCaseIndex];
    }

    function advanceCursorCase() {
      cursorCaseIndex = (cursorCaseIndex + 1) % CURSOR_CASES.length;
      applyCursorCase();
    }

    function applyBrandStyle() {
      const brand = window.ADAI_BRAND;
      const logo = brand?.currentLogo;
      const font = brand?.currentFont;
      word = getBrandWord();
      applyCursorCase();
      root.setAttribute('aria-label', word);
      root.style.setProperty('--logotype-char-count', String(Math.max(Array.from(word).length, 6)));

      if (!logo || !font) return;

      root.style.fontFamily = font.family;
      root.style.fontWeight = String(logo.weight);
      root.style.letterSpacing = logo.tracking;
    }

    function render() {
      const visibleChars = Array.from(word).slice(0, index);
      textEl.innerHTML = visibleChars.map((char, charIndex) => {
        const selected = deleting && selectingDelete && charIndex === index - 1;
        return `<span class="logotype__char${selected ? ' is-selected' : ''}">${esc(char)}</span>`;
      }).join('');
      root.classList.toggle('logotype--deleting', deleting && selectingDelete);
    }

    function queue(next, delay) {
      window.clearTimeout(timerId);
      timerId = window.setTimeout(next, delay);
    }

    function beginTyping() {
      deleting = false;
      selectingDelete = false;
      if (index >= Array.from(word).length) {
        queue(beginDeleteSelection, HOLD_FULL_DELAY);
        return;
      }

      index += 1;
      render();
      queue(beginTyping, TYPE_DELAY);
    }

    function beginDeleteSelection() {
      if (index <= 0) {
        deleting = false;
        selectingDelete = false;
        render();
        queue(beginTyping, HOLD_EMPTY_DELAY);
        return;
      }

      deleting = true;
      selectingDelete = true;
      render();
      queue(removeSelectedCharacter, DELETE_SELECT_DELAY);
    }

    function removeSelectedCharacter() {
      index = Math.max(0, index - 1);
      deleting = false;
      selectingDelete = false;
      render();

      if (index <= 0) {
        advanceCursorCase();
        queue(beginTyping, HOLD_EMPTY_DELAY);
        return;
      }

      queue(beginDeleteSelection, DELETE_SETTLE_DELAY);
    }

    function restart() {
      window.clearTimeout(timerId);
      applyBrandStyle();
      index = 0;
      deleting = false;
      selectingDelete = false;
      render();
      if (document.fonts && typeof document.fonts.load === 'function' && window.ADAI_BRAND?.currentFont) {
        document.fonts.load(`400 18px ${window.ADAI_BRAND.currentFont.family}`)
          .then(() => render())
          .catch(() => {});
      }
      if (!reducedMotion.matches) queue(beginTyping, INITIAL_DELAY);
    }

    applyBrandStyle();

    if (reducedMotion.matches) {
      index = Array.from(word).length;
      render();
      return;
    }

    window.addEventListener('adai:brand-change', restart);
    restart();
  }

  function startCanvasDrift() {
    const { FIELD, matchesKey, matchesAnyKey } = window.ADAI_SYSTEM;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const OVERSCAN_SCALE = 1.045;
    const BREATH_AMOUNT = 0.012;
    const DRIFT_X = 20;
    const DRIFT_Y = 14;
    const PARALLAX_X = 6;
    const PARALLAX_Y = 4;
    const MIN_SPEED = FIELD.MIN_SPEED;
    const MAX_SPEED = FIELD.MAX_SPEED;
    const SPEED_STEP = FIELD.SPEED_STEP;
    let canvas = null;
    let motionEnabled = !reducedMotion.matches;
    let motionSpeed = 1;
    let phase = 0;
    let lastNow = null;

    const findCanvas = () => document.getElementById('myCanvas') || document.querySelector('#mopey canvas');
    const signalEl = document.getElementById('v-signal');

    function updateMotionSignal() {
      if (!signalEl) return;
      if (reducedMotion.matches) {
        signalEl.textContent = 'rm';
        return;
      }
      signalEl.textContent = motionEnabled ? `${motionSpeed.toFixed(1)}x` : 'off';
    }

    function applyStaticTransform() {
      if (!canvas) return;
      canvas.style.transform = 'translate3d(0px, 0px, 0) scale(1)';
    }

    function setMotionEnabled(nextEnabled) {
      motionEnabled = nextEnabled;
      canvas = canvas && canvas.isConnected ? canvas : findCanvas();
      if (!motionEnabled) applyStaticTransform();
      updateMotionSignal();
    }

    function adjustMotionSpeed(delta) {
      motionSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, motionSpeed + delta));
      updateMotionSignal();
    }

    updateMotionSignal();

    if (reducedMotion.matches) return;

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (matchesKey(e, FIELD.MOTION_TOGGLE_KEY)) {
        e.preventDefault();
        setMotionEnabled(!motionEnabled);
        return;
      }

      if (matchesAnyKey(e, FIELD.SPEED_UP_KEYS)) {
        e.preventDefault();
        adjustMotionSpeed(SPEED_STEP);
        return;
      }

      if (matchesAnyKey(e, FIELD.SPEED_DOWN_KEYS)) {
        e.preventDefault();
        adjustMotionSpeed(-SPEED_STEP);
      }
    });

    const animate = (now) => {
      canvas = canvas && canvas.isConnected ? canvas : findCanvas();
      if (!canvas) {
        requestAnimationFrame(animate);
        return;
      }

      if (lastNow === null) lastNow = now;
      const deltaSeconds = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;

      if (!motionEnabled) {
        requestAnimationFrame(animate);
        return;
      }

      phase += deltaSeconds * motionSpeed;
      const t = phase;
      const nx = mouseX >= 0 ? (mouseX / W - 0.5) * 2 : 0;
      const ny = mouseY >= 0 ? (mouseY / H - 0.5) * 2 : 0;

      const driftX = Math.sin(t * 0.11) * DRIFT_X + nx * PARALLAX_X;
      const driftY = Math.cos(t * 0.09) * DRIFT_Y + ny * PARALLAX_Y;
      const scale = OVERSCAN_SCALE + Math.sin(t * 0.05) * BREATH_AMOUNT;

      canvas.style.transform = `translate3d(${driftX.toFixed(2)}px, ${driftY.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  // Canvas drift disabled — static field
  // startCanvasDrift();
  startLogotypeTypewriter();

  // Room navigation. Two rooms (#query, #contribute) are entry points to
  // global tools rather than separate views — clicking them opens the search
  // palette / archivist chat. When that surface closes, we revert the active
  // chip back to #sense so the nav reflects what the reader is actually
  // looking at (the constellation).
  function setActiveRoom(hash) {
    document.querySelectorAll('.room-link').forEach(l => l.classList.remove('active'));
    const next = document.querySelector(`.room-link[href="${hash}"]`);
    if (next) next.classList.add('active');
  }

  // Both surfaces use `.is-open` on their root element. Wrapping their close
  // function only catches close()s called through the public API — Esc and
  // outside-click invoke the internal closure, bypassing the wrapper. A
  // MutationObserver on the class attribute catches every close path.
  // Both panels are lazy-created on first open(), so the watch attempts to
  // attach right after we open them and idempotently no-ops on re-attach.
  const watched = new Set();
  function watchPanelClose(elId) {
    if (watched.has(elId)) return;
    const el = document.getElementById(elId);
    if (!el) return;
    watched.add(elId);
    let wasOpen = el.classList.contains('is-open');
    new MutationObserver(() => {
      const isOpen = el.classList.contains('is-open');
      if (wasOpen && !isOpen) setActiveRoom('#sense');
      wasOpen = isOpen;
    }).observe(el, { attributes: true, attributeFilter: ['class'] });
  }

  document.querySelectorAll('.room-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      // Real links (e.g. brand.html) navigate normally.
      if (href && !href.startsWith('#')) return;
      e.preventDefault();
      // Stop propagation so the click doesn't bubble to the search palette's
      // "outside-click closes" listener and immediately undo the open() below.
      e.stopPropagation();
      setActiveRoom(href);
      if (href === '#query' && window.ADAI_SEARCH) {
        window.ADAI_SEARCH.open();
        watchPanelClose('search-palette');
        // The archivist is reachable from inside the palette — keep its
        // close → revert-to-#sense behavior wired even when reached that way.
        watchPanelClose('chat-narrator');
      } else if (href === '#contribute') {
        openComingSoon();
      } else if (href === '#philosophy') {
        openPhilosophy();
      }
      // #sense and #connect: just swap active state (no surface yet for connect).
    });
  });

  // Coming-soon panel for /contribute. The gather/review surface isn't built
  // yet; this is a placeholder that explains the merge-boundary intent.
  function ensureComingSoonStyles() {
    if (document.getElementById('coming-soon-styles')) return;
    const s = document.createElement('style');
    s.id = 'coming-soon-styles';
    s.textContent = `
      #coming-soon {
        position: fixed; inset: 0; z-index: 1290;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
        display: none; align-items: flex-start; justify-content: center;
        padding-top: 14vh;
      }
      #coming-soon.is-open { display: flex; }
      .cs-shell {
        width: min(560px, 92vw);
        background: rgba(8, 8, 10, 0.97);
        border: 1px solid #2a2a2c;
        box-shadow: 0 24px 48px rgba(0,0,0,0.5);
        color: var(--text, #E8E6E1);
        font-family: var(--mono, 'SF Mono', 'Menlo', 'Consolas', monospace);
        padding: 22px 26px 20px;
      }
      .cs-eyebrow { color: #6a6a6c; font-size: 11px; letter-spacing: 0.08em; text-transform: lowercase; }
      .cs-title { color: var(--text, #E8E6E1); font-size: 18px; margin: 6px 0 14px; letter-spacing: 0.02em; }
      .cs-p { color: #b4b4b6; font-size: 13px; line-height: 1.55; margin: 0 0 12px; }
      .cs-p em { color: var(--text, #E8E6E1); font-style: normal; }
      .cs-foot {
        display: flex; justify-content: space-between; align-items: center;
        margin-top: 10px; padding-top: 12px; border-top: 1px solid #2a2a2c;
        color: #4a4a4c; font-size: 11px; letter-spacing: 0.04em;
      }
      .cs-link {
        background: transparent; border: 1px solid #2a2a2c; color: #b4b4b6;
        font-family: inherit; font-size: 11px; letter-spacing: 0.04em;
        padding: 3px 8px; cursor: pointer; line-height: 1;
      }
      .cs-link:hover { color: var(--text, #E8E6E1); border-color: #4a4a4c; }
    `;
    document.head.appendChild(s);
  }

  function ensureComingSoonEl() {
    let el = document.getElementById('coming-soon');
    if (el) return el;
    ensureComingSoonStyles();
    el = document.createElement('div');
    el.id = 'coming-soon';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="cs-shell" role="dialog" aria-labelledby="cs-title">
        <div class="cs-eyebrow">[contribute]</div>
        <h2 class="cs-title" id="cs-title">coming soon</h2>
        <p class="cs-p">If you're already a node on A(DAI) — or want to be — this is where you'll contribute to the graph directly.</p>
        <p class="cs-p">Access will be through a skill file we send you, paired with a private key.</p>
        <div class="cs-foot">
          <span>esc to close</span>
          <button type="button" class="cs-link" data-cs-query>open /query →</button>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    return el;
  }

  function openComingSoon() {
    const el = ensureComingSoonEl();
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    watchPanelClose('coming-soon');
  }
  function closeComingSoon() {
    const el = document.getElementById('coming-soon');
    if (!el) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
  }

  // Esc + outside-click + "open /query" handoff for the coming-soon panel.
  document.addEventListener('keydown', (e) => {
    const el = document.getElementById('coming-soon');
    if (!el || !el.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeComingSoon(); }
  });
  document.addEventListener('click', (e) => {
    const el = document.getElementById('coming-soon');
    if (!el || !el.classList.contains('is-open')) return;
    if (e.target.closest?.('[data-cs-query]')) {
      closeComingSoon();
      setActiveRoom('#query');
      requestAnimationFrame(() => {
        if (window.ADAI_SEARCH?.open) window.ADAI_SEARCH.open();
        watchPanelClose('search-palette');
        watchPanelClose('chat-narrator');
      });
      return;
    }
    if (!e.target.closest?.('.cs-shell')) closeComingSoon();
  });

  // Philosophy panel — reading surface for "A protocol for mutual intention".
  function ensurePhilosophyStyles() {
    if (document.getElementById('philosophy-styles')) return;
    const s = document.createElement('style');
    s.id = 'philosophy-styles';
    s.textContent = `
      #philosophy {
        position: fixed; inset: 0; z-index: 1290;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
        display: none; align-items: flex-start; justify-content: center;
        padding-top: 8vh;
      }
      #philosophy.is-open { display: flex; }
      .ph-shell {
        width: min(680px, 92vw);
        max-height: 84vh;
        display: flex; flex-direction: column;
        background: rgba(8, 8, 10, 0.97);
        border: 1px solid #2a2a2c;
        box-shadow: 0 24px 48px rgba(0,0,0,0.5);
        color: var(--text, #E8E6E1);
        font-family: var(--mono, 'SF Mono', 'Menlo', 'Consolas', monospace);
      }
      .ph-head {
        padding: 18px 26px 12px;
        border-bottom: 1px solid #2a2a2c;
      }
      .ph-eyebrow { color: #6a6a6c; font-size: 11px; letter-spacing: 0.08em; text-transform: lowercase; }
      .ph-title { color: var(--text, #E8E6E1); font-size: 17px; margin: 6px 0 0; letter-spacing: 0.02em; font-weight: 700; }
      .ph-body { padding: 18px 26px 22px; overflow-y: auto; }
      .ph-p { color: #c8c6c1; font-size: 13px; line-height: 1.7; margin: 0 0 14px; }
      .ph-p:last-child { margin-bottom: 0; }
      .ph-p em { color: var(--text, #E8E6E1); font-style: italic; }
      .ph-p strong { color: var(--text, #E8E6E1); font-weight: 700; }
      .ph-foot {
        display: flex; justify-content: space-between; align-items: center;
        padding: 10px 26px; border-top: 1px solid #2a2a2c;
        color: #4a4a4c; font-size: 11px; letter-spacing: 0.04em;
      }
    `;
    document.head.appendChild(s);
  }

  function ensurePhilosophyEl() {
    let el = document.getElementById('philosophy');
    if (el) return el;
    ensurePhilosophyStyles();
    el = document.createElement('div');
    el.id = 'philosophy';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="ph-shell" role="dialog" aria-labelledby="ph-title">
        <header class="ph-head">
          <div class="ph-eyebrow">[philosophy]</div>
          <h2 class="ph-title" id="ph-title">A protocol for mutual intention</h2>
        </header>
        <div class="ph-body">
          <p class="ph-p">A(DAI) started with a seemingly simple question: <em>what is digital art?</em> The answer turned out to be plural — a rich plurality of mediums, movements, and subcultures at the shifting boundary of the human and the machine. Decades of history; a present moving at machine speed. Practitioners carry the knowledge of their scenes — who or what actually influenced whom — but that knowledge lives in people, or scattered across the web, never held in any shared structure. Its art history keeps getting written after the fact.</p>
          <p class="ph-p">So we began to ask: how can the digital arts collectively tell their story without flattening it? How can any one institute hold all of its tensions? The answer that emerged was not to build one. <strong><em>A</em></strong> digital arts institute, not <strong><em>the</em></strong>. A shared protocol rather than a single organisation.</p>
          <p class="ph-p">What we are building is a protocol for mutual intention.</p>
          <p class="ph-p">Not a platform shaped by attention. Platforms measure clicks; they reward volume; they hide the lens through which they see the field. A protocol for mutual intention measures something else — who said it, why it matters, with what evidence. The system draws out <em>why</em>: why something was made, why it was framed that way, why it matters to the person saying so. Knowledge moves through this web as edges between nodes, and edges only mean something when they are shaped by intentionality on both sides — practitioner and system, practitioner and practitioner. This is the inverse of an extractive feed. It is a structure that holds the relations themselves with care.</p>
          <p class="ph-p">Inside it, plurality is not a value statement but a structural constraint. The system is built so no single definition, practice, or market narrative can dominate. Anyone can fork the protocol. A net-art scene runs one instance; a cyberfeminist collective runs another. Each reads the same field and sees something genuinely different — because where you stand changes what counts as a centre and what counts as margin. Same substrate, different canons. Nobody owns it, including us.</p>
          <p class="ph-p">Provenance is the ethics that holds the web together. Every claim carries a chain of attribution — who said it, when, with what confidence, through which lens. Source origin is type-tagged: human voice, journalism, AI-assisted synthesis, automated extraction. Trust is not assumed; it is documented. And contradictions, when they appear, are made visible — held open, not resolved by the system itself. The divergence is the intelligence.</p>
          <p class="ph-p">This is what makes the place legible to the artist. Their practice is not flattened into metadata. Their scene's knowledge is held with its tensions intact. They do not contribute to a feed; they write into a substrate. Their reading becomes an edge type. When a curator contests it, both positions stay visible. When another instance forks, the framing travels with them. Contributing feels like dialogue — confided and listened to with respect.</p>
          <p class="ph-p">Collectors, curators, and exhibitors can explore not just what a work is, but where it sits in the field, what's forming around it retrospectively and in real time. The field itself gets a map that keeps moving, shaped by the people inside it rather than described from above.</p>
          <p class="ph-p">The frontier — what cannot yet be classified — is the most important signal. The field's vocabulary is still forming. The institute exists to hold the space where that emergence happens.</p>
          <p class="ph-p">A canon is situated, partial, provocative, generative. The web is the canon, and the canon is in motion. The digital arts begin to sense themselves — through one another, on the record, with intention.</p>
        </div>
        <div class="ph-foot">
          <span>esc to close</span>
          <span>scroll to read · click outside to dismiss</span>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    return el;
  }

  function openPhilosophy() {
    const el = ensurePhilosophyEl();
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    // Reset scroll to top each time the panel opens.
    const body = el.querySelector('.ph-body');
    if (body) body.scrollTop = 0;
    watchPanelClose('philosophy');
  }
  function closePhilosophy() {
    const el = document.getElementById('philosophy');
    if (!el) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('keydown', (e) => {
    const el = document.getElementById('philosophy');
    if (!el || !el.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); closePhilosophy(); }
  });
  document.addEventListener('click', (e) => {
    const el = document.getElementById('philosophy');
    if (!el || !el.classList.contains('is-open')) return;
    if (!e.target.closest?.('.ph-shell')) closePhilosophy();
  });

})();
