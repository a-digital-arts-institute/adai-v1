import { describe, expect, it } from 'vitest'
import { clampView, fitRect, inView, zoomView } from './zoomer.js'

const nat = { w: 1600, h: 1000 }
const [bw, bh] = [1440, 900]
const fit = fitRect(nat, bw, bh)

describe('the full-screen zoom', () => {
  it('shows the picture whole within the margins, centred, never larger than itself', () => {
    expect(fit.h).toBeCloseTo(900 - 96, 6)
    expect(fit.x).toBeCloseTo((bw - fit.w) / 2, 6)
    const small = fitRect({ w: 400, h: 300 }, bw, bh)
    expect([small.w, small.h]).toEqual([400, 300])
  })
  it('keeps the point under the pointer still as it zooms', () => {
    const v0 = { z: 1, x: fit.x, y: fit.y }
    const v1 = zoomView(fit, v0, 6, 500, 300)
    // the picture's point that was at (500, 300) is still there
    const u = (500 - v0.x) / fit.w, w = (300 - v0.y) / fit.h
    expect(v1.x + u * fit.w * 6).toBeCloseTo(500, 6)
    expect(v1.y + w * fit.h * 6).toBeCloseTo(300, 6)
  })
  it('never zooms out past the whole or in past the deepest, and keeps the picture over the screen', () => {
    expect(clampView(fit, bw, bh, { z: 0.2, x: 0, y: 0 }, 40)).toEqual({ z: 1, x: fit.x, y: fit.y })
    expect(clampView(fit, bw, bh, { z: 500, x: 0, y: 0 }, 40).z).toBe(40)
    const v = clampView(fit, bw, bh, { z: 4, x: 200, y: -1e6 }, 40)
    expect(v.x).toBe(0)
    expect(v.y).toBeCloseTo(bh - fit.h * 4, 6)
  })
  it('frames the part in view for the overview', () => {
    expect(inView(fit, bw, bh, { z: 1, x: fit.x, y: fit.y })).toEqual({ l: 0, t: 0, r: 1, b: 1 })
    const f = inView(fit, bw, bh, { z: 4, x: -fit.w * 1.5, y: -fit.h * 1.5 })
    expect(f.l).toBeCloseTo(0.375, 6)
    expect(f.t).toBeCloseTo(0.375, 6)
    expect(f.r - f.l).toBeCloseTo(bw / (fit.w * 4), 6)
  })
})
