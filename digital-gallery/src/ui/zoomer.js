// Deep zoom for a picture shown whole on black: the open work full screen. Plain JavaScript with no imports, as it came
// from the AWO coil (whose picture viewer inlines a copy); typed by zoomer.d.ts beside it.
//
// The wheel or a pinch zooms about the pointer, on and on, until one pixel of the picture is DEEPEST px across (past
// CRISP px a pixel they show square, not smeared); a drag pans; a click on the picture at its whole goes STEP times in
// there; a double click, `0` or a click on the black around goes back to the whole; `+` `-` zoom, the arrow keys pan.
// Zoomed in, an overview in the bottom-left corner shows the whole picture with the part in view framed; a click or a
// drag there moves the view. The smaller copy shows at once and the larger fades in over it when it arrives.

/** how close it goes: one pixel of the picture this many CSS px across */
const DEEPEST = 48
/** from this many CSS px a pixel, pixels show square */
const CRISP = 3
/** a click on the picture at its whole goes this far in */
const STEP = 3
/** how fast the view catches up with the wheel (per second) */
const EASE = 18
/** room kept around the picture at its whole: the sides, and above and below (the caption sits below) */
const MARGIN = [24, 48]

const el = (tag, cls) => {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  return e
}

/**
 * Fit a picture of natural size `nat` into a box `bw` × `bh`: contained within the margins, never larger than itself.
 * Then the view: scale `z` (1 = whole) with the picture's top-left at `x`, `y`, kept so the picture covers the box on any
 * axis it overflows and is centred on any it does not.
 */
export function fitRect(nat, bw, bh) {
  const k = Math.min((bw - 2 * MARGIN[0]) / nat.w, (bh - 2 * MARGIN[1]) / nat.h, 1)
  const w = Math.max(1, nat.w * k), h = Math.max(1, nat.h * k)
  return { w, h, x: (bw - w) / 2, y: (bh - h) / 2 }
}

export function clampView(fit, bw, bh, v, deepest) {
  const z = Math.min(deepest, Math.max(1, v.z))
  const W = fit.w * z, H = fit.h * z
  const x = W <= bw ? (bw - W) / 2 : Math.min(0, Math.max(bw - W, v.x))
  const y = H <= bh ? (bh - H) / 2 : Math.min(0, Math.max(bh - H, v.y))
  return { z, x, y }
}

/** zoom view `v` to scale `z`, keeping the picture's point under (px, py) where it is */
export function zoomView(fit, v, z, px, py) {
  const u = (px - v.x) / (fit.w * v.z), w = (py - v.y) / (fit.h * v.z)
  return { z, x: px - u * fit.w * z, y: py - w * fit.h * z }
}

/** the part of the picture in view, as fractions of it */
export function inView(fit, bw, bh, v) {
  const W = fit.w * v.z, H = fit.h * v.z
  const l = Math.max(0, -v.x / W), t = Math.max(0, -v.y / H)
  return { l, t, r: Math.min(1, (bw - v.x) / W), b: Math.min(1, (bh - v.y) / H) }
}

/**
 * Give `box` (a full-screen element, positioned) a zoomable picture. Returns `set(lo, hi, alt)` to show a picture,
 * `reset()` back to its whole, `zoomed()`, `key(e)` (true when the key was the zoom's) and `destroy()`. `onClose` is
 * called for a click on the black around the picture at its whole.
 */
export function zoomer(box, { onClose } = {}) {
  const stage = el('div', 'zm-stage')
  const lo = el('img', 'zm-lo'), hi = el('img', 'zm-hi')
  for (const i of [lo, hi]) i.draggable = false
  stage.append(lo, hi)
  const map = el('div', 'zm-map')
  const mapImg = el('img')
  mapImg.alt = ''
  mapImg.draggable = false
  const frame = el('i', 'zm-frame')
  const readout = el('p', 'zm-readout')
  const whole = el('button', 'zm-whole')
  whole.type = 'button'
  whole.textContent = 'whole'
  whole.title = 'Back to the whole picture (0, or a double click)'
  const level = el('span')
  readout.append(level, whole)
  const pic = el('div', 'zm-pic')
  pic.append(mapImg, frame)
  map.append(pic, readout)
  box.prepend(stage)
  box.append(map)
  box.classList.add('zm')

  let nat = { w: 1, h: 1 }
  let bw = box.clientWidth || innerWidth, bh = box.clientHeight || innerHeight
  let fit = fitRect(nat, bw, bh)
  let cur = { z: 1, x: fit.x, y: fit.y }
  let goal = cur
  let raf = 0
  let last = 0

  const deepest = () => Math.max(8, (DEEPEST * nat.w) / fit.w)
  const render = () => {
    stage.style.width = `${fit.w}px`
    stage.style.height = `${fit.h}px`
    stage.style.transform = `translate(${cur.x}px, ${cur.y}px) scale(${cur.z})`
    const perPixel = (fit.w * cur.z) / nat.w
    box.classList.toggle('zm-crisp', perPixel >= CRISP)
    const zoomed = cur.z > 1.01
    box.classList.toggle('zm-in', zoomed)
    map.toggleAttribute('data-shown', zoomed)
    const f = inView(fit, bw, bh, cur)
    frame.style.left = `${f.l * 100}%`
    frame.style.top = `${f.t * 100}%`
    frame.style.width = `${(f.r - f.l) * 100}%`
    frame.style.height = `${(f.b - f.t) * 100}%`
    const z = cur.z < 10 ? cur.z.toFixed(1) : Math.round(cur.z)
    level.textContent = perPixel >= 1.05 ? `${z}× · a pixel ${perPixel < 10 ? perPixel.toFixed(1) : Math.round(perPixel)} px` : `${z}×`
  }
  const tick = (now) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60
    last = now
    const k = 1 - Math.exp(-dt * EASE)
    // the scale eases in log space, so a deep zoom feels as even as a shallow one
    const z = Math.exp(Math.log(cur.z) + (Math.log(goal.z) - Math.log(cur.z)) * k)
    cur = { z, x: cur.x + (goal.x - cur.x) * k, y: cur.y + (goal.y - cur.y) * k }
    if (Math.abs(Math.log(goal.z / cur.z)) < 1e-3 && Math.abs(goal.x - cur.x) < 0.3 && Math.abs(goal.y - cur.y) < 0.3) cur = goal
    render()
    raf = cur === goal ? 0 : requestAnimationFrame(tick)
  }
  const go = (v, now) => {
    goal = clampView(fit, bw, bh, v, deepest())
    if (now || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cancelAnimationFrame(raf)
      raf = 0
      cur = goal
      render()
    } else if (!raf) {
      last = 0
      raf = requestAnimationFrame(tick)
    }
  }
  const zoomAt = (k, px, py, now) => go(zoomView(fit, goal, goal.z * k, px, py), now)
  const relayout = () => {
    // keep the same part of the picture in the middle across a new size or a sharper copy
    const f = inView(fit, bw, bh, goal)
    const cu = (f.l + f.r) / 2, cv = (f.t + f.b) / 2
    bw = box.clientWidth || innerWidth
    bh = box.clientHeight || innerHeight
    fit = fitRect(nat, bw, bh)
    const z = goal.z
    go({ z, x: bw / 2 - cu * fit.w * z, y: bh / 2 - cv * fit.h * z }, true)
  }
  const onLoad = (img) => () => {
    if (img === hi) hi.toggleAttribute('data-shown', true)
    // the sharper copy sets how far in there is to go
    if (img === hi || !hi.naturalWidth) nat = { w: img.naturalWidth || 1, h: img.naturalHeight || 1 }
    relayout()
  }
  lo.addEventListener('load', onLoad(lo))
  hi.addEventListener('load', onLoad(hi))
  hi.addEventListener('error', () => hi.removeAttribute('src'))
  const ro = new ResizeObserver(relayout)
  ro.observe(box)

  // where the picture is on screen now
  const onPicture = (x, y) => x >= cur.x && x <= cur.x + fit.w * cur.z && y >= cur.y && y <= cur.y + fit.h * cur.z
  const local = (e) => {
    const r = box.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  // ── pointers: one drags, two pinch; a press that does not move is a click ──
  const down = new Map()
  let press = null
  let pinch = null
  let lastClick = { t: 0, x: 0, y: 0, zoomedIn: false }
  const onDown = (e) => {
    if (e.button > 0 || e.target.closest('button, a, .zm-map, .full-cap, .picture-full-caption')) return
    e.preventDefault()
    try {
      box.setPointerCapture(e.pointerId)
    } catch {
      // a pointer the browser no longer knows
    }
    down.set(e.pointerId, local(e))
    if (down.size === 2) {
      const [a, b] = [...down.values()]
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }
      press = null
    } else if (down.size === 1) {
      const p = local(e)
      press = { ...p, vx: goal.x, vy: goal.y, moved: false }
    }
  }
  const onMove = (e) => {
    if (!down.has(e.pointerId)) return
    down.set(e.pointerId, local(e))
    if (pinch && down.size >= 2) {
      const [a, b] = [...down.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
      const v = zoomView(fit, goal, goal.z * (d / pinch.d), mx, my)
      go({ ...v, x: v.x + mx - pinch.mx, y: v.y + my - pinch.my }, true)
      pinch = { d, mx, my }
      return
    }
    if (!press) return
    const p = local(e)
    if (!press.moved && Math.hypot(p.x - press.x, p.y - press.y) < 4) return
    press.moved = true
    box.classList.add('zm-dragging')
    go({ z: goal.z, x: press.vx + p.x - press.x, y: press.vy + p.y - press.y }, true)
  }
  const onUp = (e) => {
    if (!down.has(e.pointerId)) return
    down.delete(e.pointerId)
    if (down.size < 2) pinch = null
    box.classList.remove('zm-dragging')
    const p = press
    press = null
    if (!p || p.moved || e.type === 'pointercancel') return
    const q = local(e), now = performance.now()
    const second = now - lastClick.t < 320 && Math.hypot(q.x - lastClick.x, q.y - lastClick.y) < 24
    const zoomedIn = goal.z > 1.01
    if (second && !lastClick.zoomedIn) {
      // a double click: back to the whole
      if (zoomedIn) go({ z: 1, x: 0, y: 0 })
      lastClick = { t: 0, x: 0, y: 0, zoomedIn: false }
      return
    }
    let didZoom = false
    if (onPicture(q.x, q.y) && !zoomedIn) {
      zoomAt(STEP, q.x, q.y)
      didZoom = true
    } else if (!onPicture(q.x, q.y)) {
      if (zoomedIn) go({ z: 1, x: 0, y: 0 })
      else onClose?.()
    }
    lastClick = { t: now, x: q.x, y: q.y, zoomedIn: didZoom }
  }
  const onWheel = (e) => {
    e.preventDefault()
    const p = local(e)
    // a pinch on a trackpad arrives as the wheel with ctrl held, in small steps
    const dy = e.deltaY * (e.deltaMode === 1 ? 33 : 1) * (e.ctrlKey ? 5 : 1)
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && !e.ctrlKey) return go({ ...goal, x: goal.x - e.deltaX })
    zoomAt(Math.exp(-dy * 0.002), p.x, p.y)
  }
  // the overview: press or drag to centre the view there
  const toMap = (e) => {
    const r = pic.getBoundingClientRect()
    const u = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), w = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    go({ z: goal.z, x: bw / 2 - u * fit.w * goal.z, y: bh / 2 - w * fit.h * goal.z }, true)
  }
  let mapping = false
  const onMapDown = (e) => {
    if (e.target === whole) return
    e.preventDefault()
    e.stopPropagation()
    mapping = true
    try {
      pic.setPointerCapture(e.pointerId)
    } catch {
      // as above
    }
    toMap(e)
  }
  const onMapMove = (e) => mapping && toMap(e)
  const onMapUp = () => (mapping = false)
  const onWhole = (e) => {
    e.stopPropagation()
    go({ z: 1, x: 0, y: 0 })
  }

  box.addEventListener('pointerdown', onDown)
  box.addEventListener('pointermove', onMove)
  box.addEventListener('pointerup', onUp)
  box.addEventListener('pointercancel', onUp)
  box.addEventListener('wheel', onWheel, { passive: false })
  pic.addEventListener('pointerdown', onMapDown)
  pic.addEventListener('pointermove', onMapMove)
  pic.addEventListener('pointerup', onMapUp)
  pic.addEventListener('pointercancel', onMapUp)
  whole.addEventListener('click', onWhole)

  return {
    set(loSrc, hiSrc, alt) {
      hi.removeAttribute('data-shown')
      nat = { w: 1, h: 1 }
      cur = goal = { z: 1, x: 0, y: 0 }
      for (const [img, src] of [[lo, loSrc], [hi, hiSrc]]) {
        if (src) img.src = src
        else img.removeAttribute('src')
      }
      if (loSrc || hiSrc) mapImg.src = loSrc || hiSrc
      else mapImg.removeAttribute('src')
      hi.alt = alt || ''
      lo.alt = hiSrc ? '' : alt || ''
      relayout()
    },
    reset() {
      go({ z: 1, x: 0, y: 0 })
    },
    zoomed: () => goal.z > 1.01,
    /** the zoom's keys: + - 0, and while zoomed the arrows (pan) and escape (back to the whole) */
    key(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return false
      const c = { x: bw / 2, y: bh / 2 }
      if (e.key === '+' || e.key === '=') return zoomAt(1.6, c.x, c.y), true
      if (e.key === '-' || e.key === '_') return zoomAt(1 / 1.6, c.x, c.y), true
      if (e.key === '0') return go({ z: 1, x: 0, y: 0 }), true
      if (goal.z <= 1.01) return false
      if (e.key === 'Escape') return go({ z: 1, x: 0, y: 0 }), true
      const step = Math.min(bw, bh) * 0.25
      const pan = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key]
      if (!pan) return false
      go({ z: goal.z, x: goal.x + pan[0], y: goal.y + pan[1] })
      return true
    },
    destroy() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      box.removeEventListener('pointerdown', onDown)
      box.removeEventListener('pointermove', onMove)
      box.removeEventListener('pointerup', onUp)
      box.removeEventListener('pointercancel', onUp)
      box.removeEventListener('wheel', onWheel)
      stage.remove()
      map.remove()
      box.classList.remove('zm', 'zm-crisp', 'zm-in', 'zm-dragging')
    },
  }
}
