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
      // [id^="adai-"] covers the dynamically-created field chrome from
      // graph-field.js (#adai-breadcrumb, #adai-embed-strip, #adai-edge-filter,
      // #adai-bookmarks, #adai-intro). Those panels are body-appended divs full
      // of <span> chips — without this, a chip click bubbled here and zoomTo()
      // re-targeted the camera to whatever dot sat under the chip's screen
      // position, hijacking the navigation the chip had just performed
      // (click "Artist X" in the embed strip / breadcrumb → land on unrelated Y).
      return !!e.target.closest?.(
        '#chrome, #graph-canvas, #search-palette, #entity-view, #entity-panel, #chat-narrator, #archivist-bar, #coming-soon, #philosophy, [id^="adai-"], a, button, input, textarea, select, label'
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
