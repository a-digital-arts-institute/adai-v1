// Types for zoomer.js (plain JavaScript, as it came from the AWO coil).
export interface Size {
  w: number
  h: number
}
export interface Fit extends Size {
  x: number
  y: number
}
export interface View {
  z: number
  x: number
  y: number
}
export function fitRect(nat: Size, bw: number, bh: number): Fit
export function clampView(fit: Fit, bw: number, bh: number, v: View, deepest: number): View
export function zoomView(fit: Fit, v: View, z: number, px: number, py: number): View
export function inView(fit: Fit, bw: number, bh: number, v: View): { l: number; t: number; r: number; b: number }
export interface Zoomer {
  set(lo: string | undefined, hi: string | undefined, alt?: string): void
  reset(): void
  zoomed(): boolean
  key(e: KeyboardEvent): boolean
  destroy(): void
}
export function zoomer(box: HTMLElement, opts?: { onClose?: () => void }): Zoomer
