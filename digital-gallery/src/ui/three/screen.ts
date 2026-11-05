// The window as the 3D views see it: the renderer and camera fitted to it with a capped pixel ratio, and a pointer as
// normalised device coordinates. Shared by the gallery, the vortex and the city.
import * as THREE from 'three'

/** the most device pixels drawn per CSS pixel: enough for crisp pictures, not a 4K render on a phone */
export const MAX_DPR = 1.5

export interface Viewport {
  W: number
  H: number
  dpr: number
}

/** Fit the renderer (and the camera, when there is one yet) to the window; returns the size it was fitted to. */
export function fitWindow(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera | null): Viewport {
  const W = window.innerWidth, H = window.innerHeight, dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1)
  renderer.setPixelRatio(dpr)
  renderer.setSize(W, H, false)
  if (camera) {
    camera.aspect = W / H
    camera.updateProjectionMatrix()
  }
  return { W, H, dpr }
}

/** a pointer's place on the screen as normalised device coordinates (-1..1, y up), for picking */
export const ndc = (e: { clientX: number; clientY: number }) => new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)

/**
 * A renderer on a canvas of its own, created here and put in `host`. `drop()` disposes the renderer, gives its WebGL
 * context back at once and takes the canvas away: dispose() alone leaves the context to the garbage collector, and a few
 * view switches would hit the browser's limit on live contexts. A lost context cannot be used again, so every mount
 * (React's StrictMode mounts twice) needs a canvas of its own; that is why the view does not render one itself.
 */
export function mountRenderer(host: HTMLElement, label: string): { renderer: THREE.WebGLRenderer; canvas: HTMLCanvasElement; drop: () => void } {
  const canvas = document.createElement('canvas')
  canvas.className = 'gallery'
  canvas.setAttribute('aria-label', label)
  host.appendChild(canvas)
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  return {
    renderer,
    canvas,
    drop: () => {
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    },
  }
}
