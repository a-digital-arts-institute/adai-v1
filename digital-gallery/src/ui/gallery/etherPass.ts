// The one pass the gallery is seen through. The scene renders into a target with its depth. Up to the focus and a
// little past it the true render shows through. Deeper, it dissolves into its own dither: an ordered (Bayer) dither
// fixed to the screen, with fewer tones and a touch softer the further it is. Deeper still the dither opens into an
// ether: soft round dots on a staggered grid, each in the colour of the picture behind it and as large as that is
// bright, over a faint glow of the picture; with distance the dots blur wider and dim until they are gone. Nothing in
// it switches: the dither's steps are soft, every dot's edge is anti-aliased, every dot reads the picture continuously
// (a mip level, filtered) and is weighed by its own pixel's depth, and the whole layer eases toward each new frame, so
// as the walk moves the pictures slide under the dots without a flicker.
import * as THREE from 'three'
import { COARSE, DITHER_IN, ETHER_FULL, ETHER_GONE, ETHER_IN, FOCUS, SHARP } from '../../lib/hall.ts'
import { screenVertex, toSRGB } from '../three/dither.ts'

/** the ether's dot grid, and the dither's dot, in CSS px */
export const DOT = 3
const DITHER = 1
/** how fast the eased layer catches up with a new frame (per second): high enough to follow the walk, low enough to calm it */
const SETTLE = 9

/** shared by both passes: depth → how far gone a pixel is */
const common = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform float uNear;
uniform float uFar;
uniform float uFocus;
uniform float uSharp;
uniform float uDitherIn;
uniform float uCoarse;
uniform float uEtherIn;
uniform float uEtherFull;
uniform float uEtherGone;
varying vec2 vUv;

${toSRGB}

// distance from the eye; the empty dark counts as far
float distAt(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  if (d >= 1.0) return 1e4;
  float z = d * 2.0 - 1.0;
  return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
}

float edge0() { return uFocus + uSharp; }
// 1 = the sharp render (up close), 0 = its dither and the ether beyond
float sharpness(float dist) { return 1.0 - smoothstep(edge0(), edge0() + uDitherIn, dist); }
// how far the dither has coarsened: 0 fine, 1 its coarsest
float coarse(float dist) { return smoothstep(edge0(), edge0() + uCoarse, dist); }
// 0 = the dither, 1 = the ether
float etherness(float dist) { return smoothstep(edge0() + uEtherIn, edge0() + uEtherFull, dist); }
// how far the ether has gone: its dots blurred wide and dimmed away
float gone(float dist) { return smoothstep(edge0() + uEtherFull, edge0() + uEtherGone, dist); }
`

/** pass 1: the dither and the ether, eased into the history target */
const etherFragment = /* glsl */ `
${common}
uniform sampler2D tPrev;
uniform vec2 uRes;
uniform float uDot;
uniform float uGrid;
uniform float uLod;
uniform float uBlend;

float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

// an 8 x 8 ordered dither threshold in 0..1, from nested 2 x 2 Bayer steps
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

void main() {
  vec2 px = vUv * uRes;
  vec3 prev = texture2D(tPrev, vUv).rgb;
  float dist = distAt(vUv);
  // where the true render shows, the layer fades to black
  if (sharpness(dist) >= 1.0) {
    gl_FragColor = vec4(prev * (1.0 - uBlend), 1.0);
    return;
  }

  // the picture dithered down: a touch softer and fewer tones the further it is, an ordered dither in place of the
  // tones it loses, its dots fixed to the screen
  float k = coarse(dist);
  vec3 soft = toSRGB(textureLod(tColor, vUv, k * 1.6).rgb);
  float tones = mix(16.0, 2.5, k);
  // soft steps: near its threshold a tone eases from one level to the next, so a picture moving under the pattern
  // shades over instead of snapping
  vec3 v = soft * tones, lvl = floor(v);
  float th = bayer8(floor(px / uDot));
  vec3 outc = clamp((lvl + smoothstep(vec3(th - 0.22), vec3(th + 0.22), fract(v))) / tones, 0.0, 1.0) * mix(1.0, 0.8, k);

  float e = etherness(dist);
  if (e > 0.0) {
    // the ether: a staggered grid of soft dots, each the colour of the picture at its centre and as large as that is
    // bright, blurring wider and dimming as it recedes
    vec2 g = px / uGrid;
    float row = floor(g.y);
    g.x += 0.5 * mod(row, 2.0);
    vec2 cell = floor(g), f = fract(g) - 0.5;
    vec2 cuv = (vec2(cell.x - 0.5 * mod(row, 2.0), row) + 0.5) * uGrid / uRes;
    vec3 c = toSRGB(textureLod(tColor, cuv, uLod).rgb);
    float far = gone(dist);
    float r = 0.5 * sqrt(clamp(luma(c) * 1.5, 0.0, 1.0));
    // never sharper than a device pixel, wider as it recedes
    float blur = max(1.0 / uGrid, mix(0.07, 0.45, smoothstep(0.0, 1.0, coarse(dist) * 0.4 + far * 0.6)));
    float spot = 1.0 - smoothstep(max(0.0, r - blur), r + blur, length(f));
    vec3 glow = toSRGB(textureLod(tColor, vUv, uLod + 2.5).rgb);
    // quieter than the pictures, and quieter still as it recedes, so the back of the hall fades into the dark
    vec3 ether = (c * spot * mix(0.85, 0.3, far) + glow * 0.12) * (1.0 - far);
    outc = mix(outc, ether, e);
  }

  gl_FragColor = vec4(mix(prev, outc, uBlend), 1.0);
}
`

/** pass 2: the sharp render up close, dissolving into the eased layer (dither, then ether) beyond */
const composeFragment = /* glsl */ `
${common}
uniform sampler2D tEther;
uniform float uFade;

void main() {
  vec3 real = toSRGB(texture2D(tColor, vUv).rgb);
  vec3 c = mix(texture2D(tEther, vUv).rgb, real, sharpness(distAt(vUv)));
  // the fade of a long glide, eased so it starts and ends gently
  gl_FragColor = vec4(c * uFade * uFade * (3.0 - 2.0 * uFade), 1.0);
}
`

export class EtherPass {
  readonly target: THREE.WebGLRenderTarget
  /** the eased layer, this frame and the last, swapped every frame */
  private history: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget]
  private ether: THREE.ShaderMaterial
  private compose: THREE.ShaderMaterial
  private quad: THREE.Mesh
  private scene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private fresh = true

  constructor(camera: THREE.PerspectiveCamera) {
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      depthTexture: new THREE.DepthTexture(1, 1),
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    })
    const layer = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false })
    this.history = [layer(), layer()]
    const depth = {
      tColor: { value: this.target.texture },
      tDepth: { value: this.target.depthTexture },
      uNear: { value: camera.near },
      uFar: { value: camera.far },
      uFocus: { value: FOCUS },
      uSharp: { value: SHARP },
      uDitherIn: { value: DITHER_IN },
      uCoarse: { value: COARSE },
      uEtherIn: { value: ETHER_IN },
      uEtherFull: { value: ETHER_FULL },
      uEtherGone: { value: ETHER_GONE },
    }
    this.ether = new THREE.ShaderMaterial({
      vertexShader: screenVertex,
      fragmentShader: etherFragment,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        ...depth,
        tPrev: { value: null },
        uRes: { value: new THREE.Vector2(1, 1) },
        uDot: { value: 2 },
        uGrid: { value: DOT },
        uLod: { value: 2 },
        uBlend: { value: 1 },
      },
    })
    this.compose = new THREE.ShaderMaterial({
      vertexShader: screenVertex,
      fragmentShader: composeFragment,
      depthTest: false,
      depthWrite: false,
      uniforms: { ...depth, tEther: { value: null }, uFade: { value: 1 } },
    })
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.ether)
    this.quad.frustumCulled = false
    this.scene.add(this.quad)
  }

  setSize(w: number, h: number, dpr: number): void {
    const W = Math.round(w * dpr), H = Math.round(h * dpr)
    this.target.setSize(W, H)
    for (const t of this.history) t.setSize(W, H)
    const u = this.ether.uniforms
    ;(u.uRes!.value as THREE.Vector2).set(W, H)
    u.uGrid!.value = DOT * dpr
    // the mip level whose texels are about a dot across
    u.uLod!.value = Math.log2(DOT * dpr)
    // a dither dot one CSS px across
    u.uDot!.value = Math.max(1, Math.round(DITHER * dpr))
    this.fresh = true
  }

  /** Start the eased layer afresh: after a cut nothing of the old view should linger. */
  reset(): void {
    this.fresh = true
  }

  /** Render the scene, then the eased layer over `dt` seconds toward it, then both to the screen, faded by `fade`. */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, dt: number, fade = 1): void {
    renderer.setRenderTarget(this.target)
    renderer.render(scene, camera)

    const [prev, next] = this.history
    this.ether.uniforms.tPrev!.value = prev.texture
    this.ether.uniforms.uBlend!.value = this.fresh ? 1 : 1 - Math.exp(-dt * SETTLE)
    this.fresh = false
    this.quad.material = this.ether
    renderer.setRenderTarget(next)
    renderer.render(this.scene, this.camera)

    this.compose.uniforms.tEther!.value = next.texture
    this.compose.uniforms.uFade!.value = fade
    this.quad.material = this.compose
    renderer.setRenderTarget(null)
    renderer.render(this.scene, this.camera)
    this.history = [next, prev]
  }

  dispose(): void {
    this.target.depthTexture?.dispose()
    this.target.dispose()
    for (const t of this.history) t.dispose()
    this.ether.dispose()
    this.compose.dispose()
    this.quad.geometry.dispose()
  }
}
