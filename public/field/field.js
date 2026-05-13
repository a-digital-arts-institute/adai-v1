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

  // Room navigation
  document.querySelectorAll('.room-link').forEach(link => {
    link.addEventListener('click', (e) => {
      // Allow real links (like brand.html) to navigate normally
      const href = link.getAttribute('href');
      if (href && !href.startsWith('#')) return;
      e.preventDefault();
      document.querySelectorAll('.room-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });

})();
