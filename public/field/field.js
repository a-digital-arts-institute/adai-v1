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

  // Contribute panel — reading surface for "An invitation to help write the
  // digital arts' shared record". Reuses the philosophy panel's shell styles
  // (.ph-*) and adds contribute-specific step/tag styles (.ct-*).
  function ensureContributeStyles() {
    ensurePhilosophyStyles(); // reuse .ph-shell / .ph-body / .ph-line / .ph-sec
    if (document.getElementById('contribute-styles')) return;
    const s = document.createElement('style');
    s.id = 'contribute-styles';
    s.textContent = `
      #contribute-panel {
        position: fixed; inset: 0; z-index: 1290;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);
        display: none; align-items: flex-start; justify-content: center;
        padding-top: 8vh;
      }
      #contribute-panel.is-open { display: flex; }
      .ct-step { display: flex; gap: 13px; margin: 0 0 14px; }
      .ct-step:last-child { margin-bottom: 0; }
      .ct-num { color: #6a6a6c; flex: none; min-width: 18px; font-size: 13px; line-height: 1.6; }
      .ct-step-body { color: #c8c6c1; font-size: 13px; line-height: 1.6; }
      .ct-code {
        display: block; margin: 9px 0 0; padding: 10px 12px;
        background: rgba(255,255,255,0.03); border: 1px solid #2a2a2c;
        color: #d8d6d1; font-size: 12px; line-height: 1.5;
        white-space: pre-wrap; word-break: break-word;
      }
      .ct-tags { display: flex; flex-wrap: wrap; gap: 7px; margin: 16px 0 0; }
      .ct-tag {
        border: 1px solid #2a2a2c; color: #9a9a9c;
        font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
        padding: 4px 9px;
      }
      .ct-guide { margin: 18px 0 0; padding-top: 16px; border-top: 1px solid #2a2a2c; }
      .ct-guide-btn {
        display: inline-flex; align-items: center; gap: 8px;
        border: 1px solid #4169B0; color: #7e9fdc; background: transparent;
        font-family: inherit; font-size: 11px; letter-spacing: 0.08em;
        text-transform: uppercase; padding: 9px 14px; text-decoration: none;
        cursor: pointer; transition: background 120ms ease, color 120ms ease;
      }
      .ct-guide-btn:hover { background: rgba(65,105,176,0.14); color: #a8c0ea; }
      .ct-guide-btn .ct-arrow { color: #4169B0; }
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
      <div class="ph-shell" role="dialog" aria-labelledby="ct-title">
        <header class="ph-head">
          <div class="ph-eyebrow">[contribute]</div>
          <h2 class="ph-title" id="ct-title">An invitation to help write the digital arts' shared record</h2>
        </header>
        <div class="ph-body">
          <p class="ph-line">Curate A(DAI) in plain language from your own LLM — every edit attributed to you, withdrawable anytime.</p>
          <section class="ph-sec">
            <div class="ph-sec-label">How to contribute — from your own LLM, in minutes</div>
            <p class="ph-line">You don't need our UI. You curate through Claude Cowork (or any assistant with a code sandbox), in plain language.</p>
            <div class="ct-step">
              <span class="ct-num">01</span>
              <div class="ct-step-body">We'll send you a private access token separately — treat it like a password.</div>
            </div>
            <div class="ct-step">
              <span class="ct-num">02</span>
              <div class="ct-step-body">In Claude Cowork (or other LLM with code sandbox), paste:<code class="ct-code">Read https://adai-basel.fly.dev/skill.md and use this token to contribute to A(DAI) on my behalf: [token]</code></div>
            </div>
            <div class="ct-step">
              <span class="ct-num">03</span>
              <div class="ct-step-body">Claude confirms it's you, then just talk:<code class="ct-code">Add my new work as a piece I made — generative, 2024 — and connect it to the exhibition where it was shown.</code></div>
            </div>
            <div class="ct-step">
              <span class="ct-num">04</span>
              <div class="ct-step-body">Every edit lands attributed to you, and you can withdraw or supersede any of it, anytime.</div>
            </div>
            <div class="ct-tags">
              <span class="ct-tag">No deadlines</span>
              <span class="ct-tag">No lock-in</span>
              <span class="ct-tag">Attributed to you</span>
              <span class="ct-tag">Withdraw anytime</span>
            </div>
          </section>
          <p class="ph-line">Some connections only you can see: between your work and what shaped it, where it showed, who it spoke to. Draw one, and the field is truer for it.</p>
          <div class="ct-guide">
            <a class="ct-guide-btn" href="/field-static/guide.html" target="_blank" rel="noopener">Starter guide <span class="ct-arrow" aria-hidden="true">→</span></a>
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

  function openContribute() {
    const el = ensureContributeEl();
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    const body = el.querySelector('.ph-body');
    if (body) body.scrollTop = 0;
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
    if (!e.target.closest?.('.ph-shell')) closeContribute();
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
            <p class="ph-line">A shared protocol for the digital arts to tell its own story — across time, mediums and practices.</p>
            <p class="ph-line">An open, permissionless commons. Never finished, never flattened.</p>
            <p class="ph-line">A provocation to begin: a seed canon inviting discovery and participation.</p>
            <p class="ph-line">Re-weightable, forkable — every fork a legitimate centre.</p>
          </section>
          <section class="ph-sec">
            <div class="ph-sec-label">Why</div>
            <p class="ph-line">Digital art is the defining art of our time — testing the line between human and machine.</p>
            <p class="ph-line">Decades of history still unmetabolised, and a scene exploding at machine-speed.</p>
            <p class="ph-line">Its story lives between practitioners — scattered across feeds, shows and moments.</p>
            <p class="ph-line">No single institution holds that tension without flattening it. The field needs a native one.</p>
          </section>
          <section class="ph-sec">
            <div class="ph-sec-label">How</div>
            <p class="ph-line">Speed without intention collapses under its own weight.</p>
            <p class="ph-line">So we turn the machine on itself — ingesting work, crowdsourcing curation from practitioners.</p>
            <p class="ph-line">A seed canon and knowledge graph: a commons to surface bias and provoke contribution.</p>
            <ol class="ph-principles">
              <li><span class="ph-num">01</span> Plurality as constraint</li>
              <li><span class="ph-num">02</span> Artists as sovereign</li>
              <li><span class="ph-num">03</span> Tensions preserved, not resolved</li>
              <li><span class="ph-num">04</span> Provenance as ethics</li>
              <li><span class="ph-num">05</span> Intention over attention</li>
              <li><span class="ph-num">06</span> Commons without enclosure</li>
              <li><span class="ph-num">07</span> Where language fails</li>
            </ol>
          </section>
          <section class="ph-sec">
            <div class="ph-sec-label">Next</div>
            <p class="ph-line">A select cohort of artists, curators and institutions to seed the canon and shape its governance.</p>
            <p class="ph-line">Each partner owns their assets; every contribution stays attributable.</p>
          </section>
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
