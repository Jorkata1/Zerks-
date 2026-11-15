// Seeded randomness and the soft textures for glow (the canyon's dust makes its own softTextures, canyon.ts).
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

/** A round glow for light pools on the ground (mockup/src/textures.js glowTex, as a softTexture). */
export const glowTexture = (size = 128) => softTexture(size, (x, y) => {
  const r = Math.hypot(x / size - 0.5, y / size - 0.5) * 2
  return r >= 1 ? 0 : r < 0.35 ? 1 - (r / 0.35) * 0.55 : 0.45 * (1 - (r - 0.35) / 0.65)
})
