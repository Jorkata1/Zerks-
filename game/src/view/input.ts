// Touch and mouse: one finger pans (with a little glide after it lets go), two fingers zoom, a short tap picks.
import type { IsoCamera } from './camera'

export interface InputEvents {
  tap(sx: number, sy: number): void
  /** Called on every interaction, so the loop renders at full rate for a while. */
  active(): void
}

const TAP_MOVE = 8 // pixels a finger may move and still count as a tap
const TAP_MS = 450

export function attachInput(el: HTMLElement, cam: IsoCamera, on: InputEvents): { step(dtMs: number): boolean } {
  const pts = new Map<number, { x: number; y: number; x0: number; y0: number; t0: number }>()
  let moved = false
  let pinch: { d: number; mx: number; my: number } | null = null
  let vx = 0, vy = 0, lastT = 0

  const local = (e: PointerEvent) => { const r = el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
  const twoFinger = () => {
    const [a, b] = [...pts.values()]
    return { d: Math.hypot(a!.x - b!.x, a!.y - b!.y), mx: (a!.x + b!.x) / 2, my: (a!.y + b!.y) / 2 }
  }

  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId)
    const p = local(e)
    pts.set(e.pointerId, { x: p.x, y: p.y, x0: p.x, y0: p.y, t0: performance.now() })
    if (pts.size === 1) { moved = false; vx = vy = 0 }
    if (pts.size === 2) { pinch = twoFinger(); moved = true }
    on.active()
  })
  el.addEventListener('pointermove', (e) => {
    const p0 = pts.get(e.pointerId)
    if (!p0) return
    const p = local(e)
    if (pts.size === 1) {
      const dx = p.x - p0.x, dy = p.y - p0.y
      if (!moved && Math.hypot(p.x - p0.x0, p.y - p0.y0) > TAP_MOVE) moved = true
      if (moved) {
        cam.panBy(dx, dy)
        const now = performance.now(), dt = Math.max(1, now - lastT)
        vx = 0.8 * (dx / dt) + 0.2 * vx; vy = 0.8 * (dy / dt) + 0.2 * vy
        lastT = now
      }
    }
    p0.x = p.x; p0.y = p.y
    if (pts.size === 2 && pinch) {
      const now = twoFinger()
      if (now.d > 0) cam.zoomAt(pinch.d / now.d, now.mx, now.my)
      cam.panBy(now.mx - pinch.mx, now.my - pinch.my)
      pinch = now
    }
    on.active()
  })
  const end = (e: PointerEvent) => {
    const p0 = pts.get(e.pointerId)
    pts.delete(e.pointerId)
    if (pts.size < 2) pinch = null
    if (p0 && pts.size === 0 && !moved && performance.now() - p0.t0 < TAP_MS) on.tap(p0.x, p0.y)
    if (performance.now() - lastT > 80) { vx = vy = 0 }
    on.active()
  }
  el.addEventListener('pointerup', end)
  el.addEventListener('pointercancel', end)
  el.addEventListener('wheel', (e) => {
    e.preventDefault()
    const r = el.getBoundingClientRect()
    cam.zoomAt(Math.exp(e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top)
    on.active()
  }, { passive: false })
  // iOS Safari: no page zoom from gestures
  for (const t of ['gesturestart', 'gesturechange']) document.addEventListener(t, (e) => e.preventDefault())

  return {
    /** The glide after a fling; true while it still moves. */
    step(dtMs: number) {
      if (pts.size > 0 || (Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01)) return false
      cam.panBy(vx * dtMs, vy * dtMs)
      const k = Math.pow(0.9, dtMs / 16.7)
      vx *= k; vy *= k
      return true
    },
  }
}
