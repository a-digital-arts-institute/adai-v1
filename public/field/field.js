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

  function startStudyZoom() {
    const DEFAULT_ZOOM = 2;
    const MIN_ZOOM = 1;
    // Cap how far focusing a node zooms the camera. A tiny / peripheral dot used
    // to zoom to ~14×, which spread its graph neighbours far off-screen ("I only
    // see a few"). Keeping it modest means every node — central or peripheral,
    // small or large fan-out — focuses the same natural way: pan to the dot,
    // neighbours anchored around it, in view.
    const MAX_ZOOM = 4;
    const BITMAP_SCALE_CAP = 2.35;
    const TARGET_SCREEN_RADIUS_RATIO = 0.01;
    const MIN_TARGET_SCREEN_RADIUS = 5;
    const MAX_TARGET_SCREEN_RADIUS = 8;
    const PICK_SCREEN_RADIUS = 96;
    const DURATION_MS = 1250;
    const DETAIL_MOTION_DPR_CAP = 1.35;
    const DETAIL_FINAL_DPR_CAP = 2;
    let zoomed = false;
    let animationFrame = 0;
    let camera = { scale: 1, x: 0, y: 0 };
    let lastDetailMotionFrame = 0;

    const findStage = () => document.getElementById('mopey-stage');
    const fieldCanvases = () => [
      document.getElementById('myCanvas'),
      document.getElementById('myCanvasOverlay'),
    ].filter(Boolean);
    const cameraTargets = () => fieldCanvases();
    let detailCanvas = null;
    let detailCtx = null;
    let detailDpr = 1;

    function isUiClick(e) {
      // A detached target IS a UI click: chrome chip handlers (breadcrumb
      // segments, embed-strip rows, …) run before this document-level
      // listener and re-render their container via innerHTML — detaching the
      // clicked element mid-dispatch. closest() can't walk a severed parent
      // chain, so without this guard the click fell through and zoomTo()
      // hijacked the navigation the chip had just performed.
      if (e.target instanceof Node && !e.target.isConnected) return true;
      // [id^="adai-"] covers the dynamically-created field chrome from
      // graph-field.js (#adai-breadcrumb, #adai-embed-strip, #adai-edge-filter,
      // #adai-bookmarks, #adai-intro). Those panels are body-appended divs full
      // of <span> chips — without this, a chip click bubbled here and zoomTo()
      // re-targeted the camera to whatever dot sat under the chip's screen
      // position, hijacking the navigation the chip had just performed
      // (click "Artist X" in the embed strip / breadcrumb → land on unrelated Y).
      return !!e.target.closest?.(
        '#chrome, #graph-canvas, #search-palette, #entity-view, #entity-panel, #chat-narrator, #archivist-bar, #contribute-panel, #philosophy, [id^="adai-"], a, button, input, textarea, select, label'
      );
    }

    function easeCamera(t) {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function getStageScreenScale(stage, rect = stage.getBoundingClientRect()) {
      return rect.width && stage.offsetWidth ? rect.width / stage.offsetWidth : 1;
    }

    function getTargetScreenRadius() {
      const shortSide = Math.min(window.innerWidth || 0, window.innerHeight || 0);
      return clamp(shortSide * TARGET_SCREEN_RADIUS_RATIO, MIN_TARGET_SCREEN_RADIUS, MAX_TARGET_SCREEN_RADIUS);
    }

    function getVisibleDots() {
      return Array.isArray(window.__adaiDotRegistry) ? window.__adaiDotRegistry : [];
    }

    function getGraphField() {
      return window.ADAI_GRAPH_FIELD || null;
    }

    function findNearestGraphDot(fieldX, fieldY, stageScreenScale) {
      const graphField = getGraphField();
      if (!graphField?.findNearestBrandPoint) return null;
      return graphField.findNearestBrandPoint(fieldX, fieldY, {
        maxDistance: PICK_SCREEN_RADIUS / Math.max(stageScreenScale, 0.001)
      });
    }

    function engageGraphNode(nodeId) {
      if (!nodeId) return;
      const graphField = getGraphField();
      if (graphField?.revealInPlace) {
        graphField.revealInPlace(nodeId, { fromFieldStudy: true });
        return;
      }
      if (graphField?.focusInPlace) {
        graphField.focusInPlace(nodeId, { fromFieldStudy: true });
      }
    }

    function constrainCamera(nextCamera) {
      const stage = findStage();
      if (!stage) return nextCamera;

      const width = stage.offsetWidth;
      const height = stage.offsetHeight;
      // Overscan: how far past the field edge the camera may pan. 0 at rest
      // (scale 1 — the field always fills the frame) ramping to a half-viewport
      // by DEFAULT_ZOOM, which is exactly enough to centre ANY field point,
      // including the spiral rim. Without it, focusing a rim dot (where
      // live-contributed nodes land until their nightly UMAP placement) pinned
      // the focus to the screen edge and the whole neighbour layout — computed
      // 360° around the focus — squeezed into the remaining sliver.
      const overscanT = clamp((nextCamera.scale - 1) / (DEFAULT_ZOOM - 1), 0, 1);
      const overscanX = overscanT * width / 2;
      const overscanY = overscanT * height / 2;
      const minX = width - width * nextCamera.scale;
      const minY = height - height * nextCamera.scale;

      return {
        scale: nextCamera.scale,
        x: clamp(nextCamera.x, minX - overscanX, overscanX),
        y: clamp(nextCamera.y, minY - overscanY, overscanY)
      };
    }

    function findNearestDot(fieldX, fieldY, stageScreenScale) {
      const dots = getVisibleDots();
      if (!dots.length) return null;

      let nearest = null;
      let nearestEdgeDistance = Infinity;
      const maxEdgeDistance = PICK_SCREEN_RADIUS / Math.max(stageScreenScale, 0.001);

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        const x = Number(dot.x);
        const y = Number(dot.y);
        const radius = Number(dot.radius);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius) || radius <= 0) continue;

        const edgeDistance = Math.max(0, Math.hypot(x - fieldX, y - fieldY) - radius);
        if (edgeDistance < nearestEdgeDistance) {
          nearestEdgeDistance = edgeDistance;
          nearest = { x, y, radius };
        }
      }

      return nearestEdgeDistance <= maxEdgeDistance ? nearest : null;
    }

    function zoomForDot(dot, stageScreenScale) {
      if (!dot) {
        return {
          scale: DEFAULT_ZOOM,
          rawScale: DEFAULT_ZOOM,
          targetScreenRadius: getTargetScreenRadius()
        };
      }

      const targetScreenRadius = getTargetScreenRadius();
      const rawScale = targetScreenRadius / Math.max(dot.radius * stageScreenScale, 0.001);
      return {
        scale: clamp(rawScale, MIN_ZOOM, MAX_ZOOM),
        rawScale,
        targetScreenRadius
      };
    }

    function cameraWithScale(nextCamera, scale) {
      const stage = findStage();
      if (!stage || !nextCamera.scale) return { scale: 1, x: 0, y: 0 };

      const focusX = (stage.offsetWidth / 2 - nextCamera.x) / nextCamera.scale;
      const focusY = (stage.offsetHeight / 2 - nextCamera.y) / nextCamera.scale;
      return constrainCamera({
        scale,
        x: stage.offsetWidth / 2 - focusX * scale,
        y: stage.offsetHeight / 2 - focusY * scale
      });
    }

    function ensureDetailCanvas() {
      if (detailCanvas?.isConnected) return detailCanvas;

      detailCanvas = document.createElement('canvas');
      detailCanvas.id = 'field-detail-canvas';
      detailCanvas.setAttribute('aria-hidden', 'true');
      detailCanvas.style.transition = 'none';
      document.body.appendChild(detailCanvas);
      detailCtx = detailCanvas.getContext('2d', { alpha: true, desynchronized: true }) || detailCanvas.getContext('2d');
      resizeDetailCanvas('final');
      return detailCanvas;
    }

    function resizeDetailCanvas(renderMode = 'final') {
      if (!detailCanvas) return;
      const cap = renderMode === 'motion' ? DETAIL_MOTION_DPR_CAP : DETAIL_FINAL_DPR_CAP;
      detailDpr = Math.max(1, Math.min(cap, window.devicePixelRatio || 1));
      const width = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
      const height = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
      const nextWidth = Math.round(width * detailDpr);
      const nextHeight = Math.round(height * detailDpr);

      if (detailCanvas.width !== nextWidth || detailCanvas.height !== nextHeight) {
        detailCanvas.width = nextWidth;
        detailCanvas.height = nextHeight;
        detailCanvas.style.width = `${width}px`;
        detailCanvas.style.height = `${height}px`;
      }

      detailCtx?.setTransform(detailDpr, 0, 0, detailDpr, 0, 0);
    }

    function clearDetailCanvas() {
      if (!detailCanvas || !detailCtx) return;
      resizeDetailCanvas();
      detailCtx.clearRect(0, 0, detailCanvas.width / detailDpr, detailCanvas.height / detailDpr);
      detailCanvas.style.transition = 'none';
      detailCanvas.style.opacity = '0';
    }

    function drawDetailDot(ctx, x, y, radius, color, alpha, renderMode = 'final') {
      if (radius < 0.35) return;

      const lineWidth = clamp(radius * 0.14, 0.75, 2.6);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();

      if (renderMode === 'motion') {
        ctx.restore();
        return;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.2, radius - lineWidth * 0.9), 0, Math.PI * 2);
      ctx.clip();

      let theta = 0;
      let first = true;
      const spiralStroke = clamp(lineWidth * 0.62, 0.55, 1.45);
      const spacing = Math.max(spiralStroke * 1.35, radius * 0.13);
      const b = spacing / (Math.PI * 2);
      const rMax = Math.max(0, radius - lineWidth * 1.15);
      const thetaMax = rMax / Math.max(b, 0.001);
      const desiredChord = clamp(radius / 18, 0.65, 2.2);

      ctx.globalAlpha = alpha * 0.78;
      ctx.lineWidth = spiralStroke;
      ctx.beginPath();
      while (theta <= thetaMax) {
        const rr = b * theta;
        const px = x + rr * Math.cos(theta);
        const py = y + rr * Math.sin(theta);
        if (first) {
          ctx.moveTo(px, py);
          first = false;
        } else {
          ctx.lineTo(px, py);
        }
        theta += clamp(desiredChord / Math.max(rr, 1), Math.PI / 180, Math.PI / 16);
      }
      ctx.stroke();
      ctx.restore();
      ctx.restore();
    }

    function renderDetailCanvas(renderMode = 'final') {
      if (renderMode === 'hidden') {
        clearDetailCanvas();
        return;
      }

      const canvas = ensureDetailCanvas();
      if (!detailCtx) return;

      const stage = findStage();
      const dots = getVisibleDots();
      if (!stage || !dots.length || camera.scale <= 1.01) {
        clearDetailCanvas();
        return;
      }

      if (renderMode === 'motion') {
        const now = performance.now();
        if (now - lastDetailMotionFrame < 48) {
          canvas.style.opacity = String(clamp((camera.scale - 1.15) / 1.5, 0, 0.72));
          return;
        }
        lastDetailMotionFrame = now;
      }

      resizeDetailCanvas(renderMode);
      const rect = stage.getBoundingClientRect();
      const stageScreenScale = getStageScreenScale(stage, rect);
      const width = detailCanvas.width / detailDpr;
      const height = detailCanvas.height / detailDpr;
      const fadeMax = renderMode === 'motion' ? 0.72 : 1;
      const fade = clamp((camera.scale - 1.15) / 1.5, 0, fadeMax);

      detailCtx.clearRect(0, 0, width, height);
      canvas.style.opacity = String(fade);

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        const fieldX = Number(dot.x);
        const fieldY = Number(dot.y);
        const fieldRadius = Number(dot.radius);
        if (!Number.isFinite(fieldX) || !Number.isFinite(fieldY) || !Number.isFinite(fieldRadius) || fieldRadius <= 0) continue;

        const screenX = rect.left + (fieldX * camera.scale + camera.x) * stageScreenScale;
        const screenY = rect.top + (fieldY * camera.scale + camera.y) * stageScreenScale;
        const screenRadius = fieldRadius * camera.scale * stageScreenScale;
        const margin = Math.max(18, screenRadius + 8);
        if (screenX < -margin || screenX > width + margin || screenY < -margin || screenY > height + margin) continue;

        const opacity = clamp(0.22 + screenRadius / 24, 0.38, 0.86);
        drawDetailDot(detailCtx, screenX, screenY, screenRadius, dot.strokeCol || '#F2F2F2', opacity, renderMode);
      }
    }

    function applyCamera(nextCamera, renderMode = 'final') {
      camera = constrainCamera(nextCamera);
      const displayCamera = cameraWithScale(camera, Math.min(camera.scale, BITMAP_SCALE_CAP));
      const contextOpacity = camera.scale > 1.01
        ? clamp(1 - (camera.scale - 1) / 3.4, 0.16, 1)
        : 1;

      cameraTargets().forEach((canvas) => {
        canvas.style.transformOrigin = '0 0';
        canvas.style.transform = `translate3d(${displayCamera.x.toFixed(2)}px, ${displayCamera.y.toFixed(2)}px, 0) scale(${displayCamera.scale.toFixed(4)})`;
      });

      fieldCanvases().forEach((canvas) => {
        canvas.style.transition = 'none';
        canvas.style.opacity = String(contextOpacity);
      });
      renderDetailCanvas(renderMode);
    }

    function animateCamera(targetCamera, onComplete, renderMode = 'zoom') {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      const from = { ...camera };
      const start = performance.now();
      lastDetailMotionFrame = 0;

      function tick(now) {
        const progress = Math.min(1, (now - start) / DURATION_MS);
        const eased = easeCamera(progress);
        const frameMode = renderMode === 'reset'
          ? 'hidden'
          : progress < 1
            ? 'motion'
            : 'final';

        applyCamera({
          scale: from.scale + (targetCamera.scale - from.scale) * eased,
          x: from.x + (targetCamera.x - from.x) * eased,
          y: from.y + (targetCamera.y - from.y) * eased
        }, frameMode);

        if (progress < 1) {
          animationFrame = requestAnimationFrame(tick);
          return;
        }

        animationFrame = 0;
        applyCamera(targetCamera, renderMode === 'reset' ? 'hidden' : 'final');
        onComplete?.();
      }

      animationFrame = requestAnimationFrame(tick);
    }

    function zoomToBrandPoint(focusX, focusY, radius, options = {}) {
      const stage = findStage();
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const stageScreenScale = getStageScreenScale(stage, rect);
      const dot = Number.isFinite(radius) && radius > 0
        ? { x: focusX, y: focusY, radius }
        : findNearestDot(focusX, focusY, stageScreenScale);
      const zoom = zoomForDot(dot, stageScreenScale);

      document.body.classList.add('field-study-zoomed');
      document.body.dataset.fieldZoomScale = zoom.scale.toFixed(4);
      document.body.dataset.fieldZoomRawScale = zoom.rawScale.toFixed(4);
      document.body.dataset.fieldZoomRadius = dot ? dot.radius.toFixed(4) : '';
      document.body.dataset.fieldZoomTargetRadius = zoom.targetScreenRadius.toFixed(2);
      document.body.dataset.fieldGraphNode = options.graphNodeId || '';
      zoomed = true;
      animateCamera({
        scale: zoom.scale,
        x: stage.offsetWidth / 2 - focusX * zoom.scale,
        y: stage.offsetHeight / 2 - focusY * zoom.scale
      }, () => {
        if (options.syncGraph !== false) engageGraphNode(options.graphNodeId);
      });
    }

    function zoomToNode(nodeId, options = {}) {
      const graphField = getGraphField();
      const point = graphField?.brandPointForNode?.(nodeId);
      if (!point) return false;
      zoomToBrandPoint(point.x, point.y, point.radius, {
        graphNodeId: nodeId,
        syncGraph: options.syncGraph
      });
      return true;
    }

    function zoomTo(clientX, clientY) {
      const stage = findStage();
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const stageX = (clientX - rect.left) * (stage.offsetWidth / rect.width);
      const stageY = (clientY - rect.top) * (stage.offsetHeight / rect.height);
      const fieldX = (stageX - camera.x) / camera.scale;
      const fieldY = (stageY - camera.y) / camera.scale;
      const stageScreenScale = getStageScreenScale(stage, rect);
      const graphDot = findNearestGraphDot(fieldX, fieldY, stageScreenScale);
      const dot = graphDot
        ? { x: graphDot.x, y: graphDot.y, radius: graphDot.radius }
        : findNearestDot(fieldX, fieldY, stageScreenScale);
      const focusX = dot ? dot.x : fieldX;
      const focusY = dot ? dot.y : fieldY;

      zoomToBrandPoint(focusX, focusY, dot?.radius, {
        graphNodeId: graphDot?.id || null
      });
    }

    function reset(options = {}) {
      clearDetailCanvas();
      getGraphField()?.hideOverlay?.();
      if (camera.scale > BITMAP_SCALE_CAP) {
        camera = cameraWithScale(camera, BITMAP_SCALE_CAP);
      }
      if (options.syncGraph !== false) {
        getGraphField()?.zoomToHome?.({ syncField: false });
      }
      animateCamera({ scale: 1, x: 0, y: 0 }, () => {
        cameraTargets().forEach((canvas) => {
          canvas.style.transformOrigin = '';
          canvas.style.transform = '';
          canvas.style.transition = 'none';
          canvas.style.opacity = '';
        });
        clearDetailCanvas();
      }, 'reset');
      document.body.classList.remove('field-study-zoomed');
      delete document.body.dataset.fieldZoomScale;
      delete document.body.dataset.fieldZoomRawScale;
      delete document.body.dataset.fieldZoomRadius;
      delete document.body.dataset.fieldZoomTargetRadius;
      delete document.body.dataset.fieldGraphNode;
      zoomed = false;
    }

    function projectBrandPoint(x, y, radius = 0) {
      const stage = findStage();
      if (!stage) return null;
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const stageScreenScale = getStageScreenScale(stage, rect);
      return {
        x: rect.left + (x * camera.scale + camera.x) * stageScreenScale,
        y: rect.top + (y * camera.scale + camera.y) * stageScreenScale,
        radius: radius * camera.scale * stageScreenScale,
        scale: camera.scale * stageScreenScale
      };
    }

    // Current camera transform as plain numbers, so a caller can project many
    // points inline without a getBoundingClientRect per point. One layout read
    // per call. Project as: x = left + (bx*scale + camX)*screenScale.
    function getTransform() {
      const stage = findStage();
      if (!stage) return null;
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      return {
        left: rect.left,
        top: rect.top,
        scale: camera.scale,
        x: camera.x,
        y: camera.y,
        screenScale: getStageScreenScale(stage, rect),
      };
    }

    window.ADAI_FIELD_STUDY = {
      reset,
      zoomToNode,
      zoomToBrandPoint,
      projectBrandPoint,
      getTransform,
      // Relative camera zoom (1 at rest). The graph overlay reads this so it can
      // scale the constellation in lockstep with the bitmap instead of hiding it.
      get zoomScale() { return camera.scale; },
      get isZoomed() { return zoomed; }
    };

    // ---- Drag-to-pan while zoomed (review note 13) ----
    // The instinct on the floor is to click outside the focus and drag the
    // field around. pointerdown→move beyond a small threshold pans the
    // camera (constrainCamera's bounds incl. the zoom overscan still apply);
    // a movement-free click keeps its existing meaning. The capture-phase
    // interceptor below swallows the click that FOLLOWS a pan, so the
    // graph-canvas handler doesn't read the release as "zoom home".
    const DRAG_THRESHOLD_PX = 5;
    let suppressClickUntil = 0;
    let drag = null;
    // Like isUiClick but WITHOUT #graph-canvas — that's exactly where pans
    // start. Real chrome (breadcrumb, strips, archivist, overlays) still
    // refuses the drag.
    function isUiPointer(e) {
      if (e.target instanceof Node && !e.target.isConnected) return true;
      return !!e.target.closest?.(
        '#chrome, #search-palette, #entity-view, #entity-panel, #chat-narrator, #archivist-bar, #contribute-panel, #philosophy, [id^="adai-"], a, button, input, textarea, select, label'
      );
    }
    document.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || drag) return;
      if (isUiPointer(e)) return;
      if (camera.scale <= 1.01) return;   // nothing to pan at rest
      const stage = findStage();
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      if (!rect.width) return;
      drag = {
        startX: e.clientX, startY: e.clientY,
        camX: camera.x, camY: camera.y,
        screenScale: getStageScreenScale(stage, rect),
        moved: false,
      };
    }, true);
    document.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (!drag.moved) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        drag.moved = true;
        // A drag takes over from any in-flight camera animation.
        if (animationFrame) { cancelAnimationFrame(animationFrame); animationFrame = 0; }
        document.body.classList.add('field-panning');
      }
      applyCamera({
        scale: camera.scale,
        x: drag.camX + dx / drag.screenScale,
        y: drag.camY + dy / drag.screenScale,
      }, 'motion');
    });
    const endDrag = () => {
      if (!drag) return;
      const moved = drag.moved;
      drag = null;
      document.body.classList.remove('field-panning');
      if (moved) {
        applyCamera(camera, 'final');
        suppressClickUntil = performance.now() + 350;
      }
    };
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);
    document.addEventListener('click', (e) => {
      if (performance.now() < suppressClickUntil) {
        e.stopPropagation();
        e.preventDefault();
        suppressClickUntil = 0;
      }
    }, true);

    // ---- Pinch-to-zoom (touch) ----
    // Two fingers magnify the field around their midpoint. Unlike drag-pan
    // (which only pans an already-zoomed field), pinch works from rest, so it's
    // the primary touch zoom gesture. touch-action:none on the field canvases
    // (style.css) stops iPadOS from hijacking it as native page zoom. The same
    // suppressClickUntil gate swallows the click that follows the lift, and the
    // graph overlay's reveal/hit-test reproject in lockstep (graph-field.js
    // re-syncs sim positions each frame while camera.scale > 1.01).
    const pinchPointers = new Map();   // pointerId -> {x, y} (field touches only)
    let pinch = null;
    function pinchSpan() {
      const p = [...pinchPointers.values()];
      return {
        dist: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y),
        midX: (p[0].x + p[1].x) / 2,
        midY: (p[0].y + p[1].y) / 2,
      };
    }
    function beginPinch() {
      const stage = findStage();
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      if (animationFrame) { cancelAnimationFrame(animationFrame); animationFrame = 0; }
      drag = null;                                   // a 2nd finger cancels single-finger pan
      document.body.classList.remove('field-panning');
      const screenScale = getStageScreenScale(stage, rect);
      const span = pinchSpan();
      const stageX = (span.midX - rect.left) / screenScale;
      const stageY = (span.midY - rect.top) / screenScale;
      pinch = {
        startDist: span.dist || 1,
        startScale: camera.scale,
        rect, screenScale,
        anchorX: (stageX - camera.x) / camera.scale,  // field point under the midpoint
        anchorY: (stageY - camera.y) / camera.scale,
        moved: false,
      };
    }
    function updatePinch() {
      if (!pinch) return;
      const span = pinchSpan();
      const ratio = (span.dist || 1) / pinch.startDist;
      if (!pinch.moved && Math.abs(ratio - 1) > 0.02) pinch.moved = true;
      const scale = clamp(pinch.startScale * ratio, MIN_ZOOM, MAX_ZOOM);
      const stageX = (span.midX - pinch.rect.left) / pinch.screenScale;
      const stageY = (span.midY - pinch.rect.top) / pinch.screenScale;
      if (scale > 1.01 && !zoomed) {
        zoomed = true;
        document.body.classList.add('field-study-zoomed');
      }
      applyCamera({
        scale,
        x: stageX - pinch.anchorX * scale,
        y: stageY - pinch.anchorY * scale,
      }, 'motion');
    }
    function endPinchPointer(e) {
      if (!pinchPointers.has(e.pointerId)) return;
      pinchPointers.delete(e.pointerId);
      if (pinch && pinchPointers.size < 2) {
        const wasPinch = pinch.moved;
        pinch = null;
        if (wasPinch) suppressClickUntil = performance.now() + 350;
        if (camera.scale <= 1.02) reset();           // pinched back to rest → home
        else applyCamera(camera, 'final');           // settle a crisp frame at the held zoom
      }
    }
    document.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch' || isUiPointer(e)) return;
      pinchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinchPointers.size === 2) beginPinch();
    }, true);
    document.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'touch' || !pinchPointers.has(e.pointerId)) return;
      pinchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pinchPointers.size >= 2) updatePinch();
    });
    document.addEventListener('pointerup', endPinchPointer);
    document.addEventListener('pointercancel', endPinchPointer);

    document.addEventListener('click', (e) => {
      if (isUiClick(e)) return;
      if (e.detail >= 2) {
        reset();
        return;
      }
      zoomTo(e.clientX, e.clientY);
    });

    document.addEventListener('keydown', (e) => {
      if (!zoomed || e.key !== 'Escape') return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      e.preventDefault();
      reset();
    });

    window.addEventListener('resize', reset);
  }

  startStudyZoom();

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
        openContribute();
      } else if (href === '#philosophy') {
        openPhilosophy();
      }
      // #sense: just swap active state (the constellation is already in view).
    });
  });

  // Public room API. Other in-field surfaces (entity-view's "contribute ↗"
  // CTAs, the archivist's contribute prompt) open a room by triggering its nav
  // chip — reuse that exact path (incl. its stopPropagation guard) rather than
  // re-implementing panel open/close per caller. Deferred a tick so the click
  // that called us finishes propagating before the panel's own outside-click
  // listener arms (otherwise that same click reads as outside → self-closes).
  window.ADAI_ROOMS = {
    open(hash) {
      const link = document.querySelector(`.room-link[href="${hash}"]`);
      if (!link) return false;
      setTimeout(() => link.click(), 0);
      return true;
    },
  };

  // Deep-link a room on load: /field#contribute (also #philosophy) opens that
  // panel straight away, so "Contribute" links from the legacy server pages
  // land on the modern panel instead of the old form.
  if (window.location.hash) window.ADAI_ROOMS.open(window.location.hash);

  // Contribute panel — the "Set up once. Then just talk." walkthrough.
  // A 7-step setup guide shown as a card centred over the dimmed graph, in the
  // same dark protocol theme as the other panels. Styles are scoped under
  // #contribute-panel; colours are driven by the CSS vars below.
  function ensureContributeStyles() {
    if (document.getElementById('contribute-styles')) return;
    const s = document.createElement('style');
    s.id = 'contribute-styles';
    s.textContent = `
      #contribute-panel {
        --bg:rgba(8,8,10,0.97); --ink:#E8E6E1; --dim:#6a6a6c; --faint:#2a2a2c; --box:rgba(255,255,255,0.02); --sel:rgba(65,105,176,0.22); --sel-ink:#dbe7fb;
        position: fixed; inset: 0; z-index: 1290;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
        display: none; align-items: center; justify-content: center; padding: 22px;
        font-family: 'SF Mono','SFMono-Regular',Menlo,'DejaVu Sans Mono','Liberation Mono',Consolas,monospace;
      }
      #contribute-panel.is-open { display: flex; }
      #contribute-panel * { box-sizing: border-box; }
      #contribute-panel .frame {
        width: min(840px, 92vw); height: min(520px, 86vh);
        background: var(--bg); border: 1px solid var(--faint); color: var(--ink);
        display: flex; flex-direction: column; box-shadow: 0 18px 44px rgba(0,0,0,.45);
      }
      #contribute-panel .head { padding: 20px 26px 16px; border-bottom: 1px solid var(--faint); }
      #contribute-panel .kicker { color: var(--dim); font-size: 13px; margin: 0 0 10px; }
      #contribute-panel h1 { font-size: 21px; font-weight: 700; line-height: 1.3; margin: 0; color: var(--ink); }
      #contribute-panel .scrollwrap { flex: 1; overflow: auto; padding: 18px 26px 26px; }
      #contribute-panel p { margin: 0 0 13px; font-size: 13px; line-height: 1.62; color: #c8c6c1; }
      #contribute-panel .lead { color: var(--ink); }
      #contribute-panel .label { color: var(--dim); text-transform: uppercase; letter-spacing: .07em; font-size: 12px; margin: 20px 0 11px; }
      #contribute-panel .step { display: grid; grid-template-columns: 30px 1fr; gap: 4px 13px; margin: 0 0 16px; }
      #contribute-panel .step .no { color: var(--dim); font-size: 13px; padding-top: 2px; }
      #contribute-panel .step .b { min-width: 0; }
      #contribute-panel .step .b p { margin: 0 0 9px; }
      #contribute-panel b.k { font-weight: 700; }
      #contribute-panel .paste { border: 1px solid var(--faint); background: rgba(255,255,255,0.03); color: #d8d6d1; padding: 14px 16px; margin: 6px 0 4px; font-size: 13px; line-height: 1.7; white-space: pre-wrap; word-break: break-word; }
      #contribute-panel .paste .u { word-break: break-all; }
      #contribute-panel .paste .muted { color: var(--dim); }
      #contribute-panel .scr { border: 1px solid var(--faint); background: var(--box); padding: 11px; margin: 8px 0 4px; font-size: 12.5px; }
      #contribute-panel .scr .tabs { color: var(--dim); padding: 2px 8px 8px; }
      #contribute-panel .scr .tabs b { color: var(--ink); font-weight: 700; }
      #contribute-panel .scr .ln { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 5px 8px; color: var(--ink); }
      #contribute-panel .scr .ln.dim { color: var(--dim); }
      #contribute-panel .scr .ln.small { font-size: 11.5px; }
      #contribute-panel .scr .sel { background: var(--sel); color: var(--sel-ink); }
      #contribute-panel .scr .sel .hint { color: var(--sel-ink); opacity: .62; }
      #contribute-panel .scr .added { color: var(--dim); }
      #contribute-panel .scr .rule { border-top: 1px solid var(--faint); margin: 7px 4px; }
      #contribute-panel .pill-sel { background: var(--sel); color: var(--sel-ink); padding: 2px 9px; white-space: nowrap; }
      #contribute-panel .caret { display: inline-block; width: 7px; margin-left: 1px; background: var(--ink); color: transparent; animation: adaiblink 1.05s steps(1) infinite; }
      @keyframes adaiblink { 50% { opacity: 0; } }
      #contribute-panel .pills { display: flex; flex-wrap: wrap; gap: 9px; margin: 24px 0 8px; }
      #contribute-panel .pill { border: 1px solid var(--faint); color: var(--dim); text-transform: uppercase; letter-spacing: .08em; font-size: 11px; padding: 7px 11px; }
      #contribute-panel .off { font-size: 13px; line-height: 1.7; color: var(--ink); margin: 0 0 8px; }
      #contribute-panel .off .arrow { color: var(--dim); }
      #contribute-panel .closer { color: var(--dim); font-size: 13px; line-height: 1.7; margin: 18px 0 0; border-top: 1px solid var(--faint); padding-top: 15px; }
      #contribute-panel .prog { height: 2px; background: var(--faint); }
      #contribute-panel .prog > i { display: block; height: 100%; width: 0; background: #7e9fdc; transition: width 80ms linear; }
      #contribute-panel .foot { display: flex; justify-content: space-between; gap: 14px; color: var(--dim); font-size: 12px; padding: 12px 22px; }
      #contribute-panel .guide { margin: 16px 0 0; }
      #contribute-panel .guide a {
        display: inline-flex; align-items: center; gap: 8px;
        border: 1px solid #4169B0; color: #7e9fdc; background: transparent;
        font-family: inherit; font-size: 11px; letter-spacing: 0.08em;
        text-transform: uppercase; padding: 8px 13px; text-decoration: none;
        cursor: pointer; transition: background 120ms ease, color 120ms ease;
      }
      #contribute-panel .guide a:hover { background: rgba(65,105,176,0.14); color: #a8c0ea; }
      #contribute-panel .guide a .garrow { color: #4169B0; }
    `;
    document.head.appendChild(s);
  }

  function ensureContributeEl() {
    let el = document.getElementById('contribute-panel');
    if (el) return el;
    ensureContributeStyles();
    el = document.createElement('div');
    el.id = 'contribute-panel';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="frame" role="dialog" aria-labelledby="ct-title">
        <div class="head">
          <p class="kicker">[contribute · setup]</p>
          <h1 id="ct-title">Set up once. Then just talk.</h1>
        </div>
        <div class="scrollwrap" id="ct-scroll">
          <p class="lead">Contribution is a way to place knowledge into the commons with attribution, consent and the right to withdraw.</p>
          <p>Curate A(DAI) in plain language from your own assistant — every edit attributed to you, withdrawable anytime.</p>
          <p class="label">How to set up — about five minutes, just once</p>
          <p>You don't need our UI. You'll connect Claude (or any assistant that can run shell commands with internet access) to A(DAI), then curate by chatting. Seven steps:</p>

          <div class="step"><div class="no">01</div><div class="b"><p>We'll send you a private access token separately — treat it like a password.</p></div></div>

          <div class="step"><div class="no">02</div><div class="b">
            <p><b class="k">Download the skill.</b> Open this link and save the file to your computer (Downloads is fine):</p>
            <div class="paste"><span class="u">https://digitalartsinstitute.io/skill.md</span>
<span class="muted">right-click  →  "save as…"  →  keep the name  skill.md</span></div>
          </div></div>

          <div class="step"><div class="no">03</div><div class="b">
            <p><b class="k">Open Customize.</b> In the Claude app, go to the Cowork tab, then click Customize.</p>
            <div class="scr">
              <div class="tabs">chat &nbsp; [<b>cowork</b>] &nbsp; code</div>
              <div class="ln dim"><span>+&nbsp; new task</span></div>
              <div class="ln dim"><span>projects</span></div>
              <div class="ln dim"><span>artifacts</span></div>
              <div class="ln dim"><span>scheduled</span></div>
              <div class="ln dim"><span>dispatch &nbsp;(beta)</span></div>
              <div class="ln sel"><span>customize</span><span class="hint">&larr; click</span></div>
              <div class="rule"></div>
              <div class="ln dim small"><span>recents</span></div>
              <div class="ln dim small"><span>·&nbsp; adai contribution token</span></div>
            </div>
          </div></div>

          <div class="step"><div class="no">04</div><div class="b">
            <p><b class="k">Allow internet access.</b> On the Capabilities page, switch on network egress and set the domain allowlist to All domains. This is what lets the skill reach the site to save your work.</p>
            <div class="scr">
              <div class="ln"><span>allow network egress</span><span class="pill-sel">ON&nbsp; &larr;</span></div>
              <div class="ln"><span>domain allowlist</span><span class="pill-sel">ALL DOMAINS ▾</span></div>
              <div class="ln dim small"><span>ⓘ&nbsp; claude can access all domains on the internet</span></div>
            </div>
            <p style="color:var(--dim);font-size:13px;margin-top:9px">More cautious? Allow just <b class="k" style="color:var(--ink)">adai-basel.fly.dev</b> — that's the only site the skill needs.</p>
          </div></div>

          <div class="step"><div class="no">05</div><div class="b">
            <p><b class="k">Add the skill.</b> On the same page, under Skills, press + and choose the skill.md you saved.</p>
            <div class="scr">
              <div class="ln"><span>skills</span><span class="pill-sel">+&nbsp; &larr; press</span></div>
              <div class="rule"></div>
              <div class="ln"><span>✓&nbsp; adai-contribute</span><span class="added">added</span></div>
            </div>
          </div></div>

          <div class="step"><div class="no">06</div><div class="b">
            <p><b class="k">Start a task.</b> Back in Cowork, click + New task.</p>
            <div class="scr">
              <div class="tabs">chat &nbsp; [<b>cowork</b>] &nbsp; code</div>
              <div class="ln sel"><span>+&nbsp; new task</span><span class="hint">&larr; click</span></div>
              <div class="ln dim"><span>projects</span></div>
              <div class="ln dim"><span>artifacts</span></div>
            </div>
          </div></div>

          <div class="step"><div class="no">07</div><div class="b">
            <p><b class="k">Run it, then talk.</b> Type /adai-contribute (it autocompletes). Add your token on the same line, or just send it and Claude will ask. Then describe your work in plain language.</p>
            <div class="scr">
              <div class="ln"><span>&gt;&nbsp; /adai-contribute<span class="caret">.</span></span></div>
              <div class="rule"></div>
              <div class="ln sel"><span>/adai-contribute</span><span class="hint">contribute to the A(DAI) commons</span></div>
            </div>
            <div class="paste" style="margin-top:11px">"Add my piece Drift — generative, 2024 — and connect it to the show where it was exhibited."</div>
          </div></div>

          <div class="pills">
            <span class="pill">Attributed to you</span>
            <span class="pill">Withdraw anytime</span>
            <span class="pill">No lock-in</span>
            <span class="pill">Reviewed first</span>
          </div>

          <p class="label">If something's off</p>
          <p class="off"><b class="k">/adai-contribute won't appear</b> <span class="arrow">→</span> redo step 05, and make sure you're inside a Cowork task (not a plain Chat).</p>
          <p class="off"><b class="k">it can't reach the site / can't save</b> <span class="arrow">→</span> redo step 04 — network egress on, allowlist includes adai-basel.fly.dev.</p>
          <p class="off"><b class="k">"pending review"</b> <span class="arrow">→</span> normal for new contributors. Your work is saved and credited, just waiting for a curator.</p>

          <p class="closer">Some connections only you can see: between your work and what shaped it, where it showed, who it spoke to. Draw one, and the field is truer for it.</p>
          <div class="guide"><a href="/field-static/guide.html" target="_blank" rel="noopener">Starter guide <span class="garrow" aria-hidden="true">&rarr;</span></a></div>
        </div>
        <div class="prog"><i id="ct-bar"></i></div>
        <div class="foot"><span>esc to close</span><span>scroll to read · click outside to dismiss</span></div>
      </div>
    `;
    document.body.appendChild(el);

    // Scroll-progress bar.
    const scroll = el.querySelector('#ct-scroll');
    const bar = el.querySelector('#ct-bar');
    if (scroll && bar) {
      const upd = () => {
        const m = scroll.scrollHeight - scroll.clientHeight;
        bar.style.width = (m > 0 ? (scroll.scrollTop / m * 100) : 0).toFixed(2) + '%';
      };
      scroll.addEventListener('scroll', upd);
      window.addEventListener('resize', upd);
      el._updProg = upd;
    }
    return el;
  }

  function openContribute() {
    const el = ensureContributeEl();
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    const scroll = el.querySelector('#ct-scroll');
    if (scroll) scroll.scrollTop = 0;
    if (el._updProg) el._updProg();
    watchPanelClose('contribute-panel');
  }
  function closeContribute() {
    const el = document.getElementById('contribute-panel');
    if (!el) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
  }

  // Esc + outside-click for the contribute panel.
  document.addEventListener('keydown', (e) => {
    const el = document.getElementById('contribute-panel');
    if (!el || !el.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeContribute(); }
  });
  document.addEventListener('click', (e) => {
    const el = document.getElementById('contribute-panel');
    if (!el || !el.classList.contains('is-open')) return;
    if (!e.target.closest?.('.frame')) closeContribute();
  });

  // Philosophy panel — reading surface for "A Digital Arts Institute".
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
      .ph-sec { margin: 0 0 22px; }
      .ph-sec:last-child { margin-bottom: 0; }
      .ph-sec-label { color: #6a6a6c; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 9px; }
      .ph-line { color: #c8c6c1; font-size: 13px; line-height: 1.6; margin: 0 0 7px; }
      .ph-line:last-child { margin-bottom: 0; }
      .ph-line em { color: var(--text, #E8E6E1); font-style: italic; }
      .ph-line strong { color: var(--text, #E8E6E1); font-weight: 700; }
      .ph-principles { list-style: none; margin: 13px 0 0; padding: 0; }
      .ph-principles li { color: #c8c6c1; font-size: 13px; line-height: 1.6; margin: 0 0 6px; display: flex; gap: 11px; }
      .ph-principles li:last-child { margin-bottom: 0; }
      .ph-num { color: #6a6a6c; flex: none; }
      .ph-cta { margin: 4px 0 0; padding-top: 18px; border-top: 1px solid #2a2a2c; display: flex; flex-wrap: wrap; gap: 10px; }
      .ph-cta-btn {
        display: inline-flex; align-items: center; gap: 8px;
        border: 1px solid #4169B0; color: #7e9fdc; background: transparent;
        font-family: inherit; font-size: 11px; letter-spacing: 0.08em;
        text-transform: uppercase; padding: 9px 14px; text-decoration: none;
        cursor: pointer; transition: background 120ms ease, color 120ms ease;
      }
      .ph-cta-btn:hover { background: rgba(65,105,176,0.14); color: #a8c0ea; }
      .ph-cta-btn .ph-arrow { color: #4169B0; }
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
          <h2 class="ph-title" id="ph-title">A Digital Arts Institute</h2>
        </header>
        <div class="ph-body">
          <section class="ph-sec">
            <div class="ph-sec-label">What</div>
            <p class="ph-line">A(DAI) is an open protocol for the digital arts: a shared meaning layer for a networked, agent-readable age.</p>
            <p class="ph-line">It helps artists, curators, galleries, archives, platforms and researchers connect knowledge across the field while preserving many canons, vocabularies and centres.</p>
          </section>
          <section class="ph-sec">
            <div class="ph-sec-label">Why</div>
            <p class="ph-line">Digital art already has galleries, museums, platforms, festivals, archives and communities doing important work. A(DAI) creates connective tissue between them.</p>
            <p class="ph-line">As culture becomes machine-readable, the field needs ways to structure its own meaning through context, testimony, provenance and relation.</p>
            <p class="ph-line">A(DAI) connects the people, places and systems already carrying the field, so knowledge can move between them without losing its tensions.</p>
          </section>
          <section class="ph-sec">
            <div class="ph-sec-label">How</div>
            <p class="ph-line">A(DAI) builds provenance of meaning: who says a work matters, why, from what position, and on what basis.</p>
            <p class="ph-line">The protocol privileges relational density over quantified attention: interviews, essays, exhibitions, testimony, research, concepts, techniques, scenes and tensions.</p>
            <p class="ph-line">It is infrastructure for meaning: a commons where context can accumulate, remain attributable and be revised over time.</p>
          </section>
          <section class="ph-sec">
            <div class="ph-sec-label">Principles</div>
            <ol class="ph-principles">
              <li><span class="ph-num">01</span> Plurality as architecture</li>
              <li><span class="ph-num">02</span> Artists as sovereign</li>
              <li><span class="ph-num">03</span> Tensions held open</li>
              <li><span class="ph-num">04</span> Provenance as ethics</li>
              <li><span class="ph-num">05</span> Intention over attention</li>
              <li><span class="ph-num">06</span> Machines assist; humans author meaning</li>
              <li><span class="ph-num">07</span> Commons without enclosure</li>
              <li><span class="ph-num">08</span> Where language fails</li>
            </ol>
          </section>
          <section class="ph-sec">
            <div class="ph-sec-label">Next</div>
            <p class="ph-line">A provisional canon, built to be contested, forked and improved. A select cohort of artists, curators and institutions will help seed the graph and shape protocol stewardship. Each contribution stays attributable, consent-bound and correctable.</p>
          </section>
          <div class="ph-cta">
            <a class="ph-cta-btn" href="/field-static/seed-thesis.html" target="_blank" rel="noopener">Read the Seed Thesis <span class="ph-arrow" aria-hidden="true">→</span></a>
            <a class="ph-cta-btn" href="/field-static/protocol-stewardship.html" target="_blank" rel="noopener">Protocol Stewardship <span class="ph-arrow" aria-hidden="true">→</span></a>
            <a class="ph-cta-btn" href="/field-static/whitepaper.html" target="_blank" rel="noopener">Read the Whitepaper <span class="ph-arrow" aria-hidden="true">→</span></a>
          </div>
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
