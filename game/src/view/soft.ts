// Seeded randomness and the soft textures for dust, smoke and glow.
// softTexture: the colour is fixed white and only the alpha varies. Safari mixes the colours of soft canvas
// gradients and shows coloured dots in smoke on iPhone (docs/practices.md), so the canvas colour is never uploaded.
import * as THREE from 'three'

let SEED = 1337
export const seed = (s: number) => { SEED = s }
/** The same sequence every time for the same seed, so the map looks the same on every phone. */
export function rng(): number {
  SEED = (SEED * 16807) % 2147483647
  return (SEED - 1) / 2147483646
}
export const pick = <T>(a: readonly T[]): T => a[Math.floor(rng() * a.length)]!

const hash = (x: number, y: number) => {
  let h = x * 374761393 + y * 668265263 + 1442695041
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}
function vnoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
function fbm(x: number, y: number, oct = 5): number {
  let s = 0, amp = 0.5, f = 1, norm = 0
  for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f, y * f); norm += amp; amp *= 0.5; f *= 2 }
  return s / norm
}

/** A texture from an alpha function: white everywhere, alpha from a(x, y) in 0..1. */
export function softTexture(size: number, a: (x: number, y: number) => number): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4
    data[i] = data[i + 1] = data[i + 2] = 255
    data[i + 3] = Math.round(Math.max(0, Math.min(1, a(x, y))) * 255)
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  t.colorSpace = THREE.SRGBColorSpace
  t.magFilter = THREE.LinearFilter
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.generateMipmaps = true
  t.needsUpdate = true
  return t
}

/** A soft cloud of dust (mockup/src/textures.js cloudTex, as a softTexture). */
export const cloudTexture = (size = 128) => softTexture(size, (x, y) => {
  const r = Math.hypot(x / size - 0.5, y / size - 0.5) * 2
  const n = fbm(x / 14 + 3, y / 14 + 7, 5)
  const a = Math.max(0, Math.min(1, (1 - r) * 1.6 * (0.45 + n)))
  return a * a
})

/** A round glow for light pools on the ground (mockup/src/textures.js glowTex, as a softTexture). */
export const glowTexture = (size = 128) => softTexture(size, (x, y) => {
  const r = Math.hypot(x / size - 0.5, y / size - 0.5) * 2
  return r >= 1 ? 0 : r < 0.35 ? 1 - (r / 0.35) * 0.55 : 0.45 * (1 - (r - 0.35) / 0.65)
})

/** The dusty ground: soft blotches on the planet's colour, painted once on a canvas (no gradients with colour mixing). */
export function groundTexture(base: string, tones: string[]): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const x = c.getContext('2d')!
  x.fillStyle = base
  x.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 60; i++) {
    const r = 15 + rng() * 45, px = rng() * 512, py = rng() * 512
    const g = x.createRadialGradient(px, py, 0, px, py, r)
    const tone = pick(tones)
    g.addColorStop(0, `rgba(${tone},.5)`)
    g.addColorStop(1, `rgba(${tone},0)`)
    x.fillStyle = g
    x.beginPath(); x.arc(px, py, r, 0, 7); x.fill()
  }
  for (let i = 0; i < 160; i++) {
    x.fillStyle = `rgba(205,120,80,${0.2 + rng() * 0.25})`
    x.beginPath(); x.ellipse(rng() * 512, rng() * 512, 1 + rng() * 2.5, 0.8 + rng() * 1.5, rng() * 3, 0, 7); x.fill()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(8, 8)
  t.anisotropy = 4
  return t
}
