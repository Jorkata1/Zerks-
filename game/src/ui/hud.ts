// The HUD of stage 1: the Ark's level, the atmosphere, day or night, the selected building and a frame counter.
// All game text is in English (decided 03.11.2026).
import './hud.css'

export interface Hud {
  setSky(night: boolean): void
  select(name: string | null, level?: number): void
  debug(text: string): void
  lost(on: boolean): void
}

export function createHud(root: HTMLElement, o: { arkLevel: number; atmo: number; atmoNext: number }): Hud {
  root.innerHTML = `
    <div class="shade"></div>
    <div class="ark"><div class="c">${o.arkLevel}</div><div class="t">ARK</div></div>
    <div class="atm card"><span class="lbl">Air</span><div class="bar"><i style="width:${(o.atmo / o.atmoNext) * 100}%"></i><b style="left:calc(100% - 2px)"></b></div><span class="v">${o.atmo}%</span></div>
    <div class="sky card"><span class="ic"></span><span class="txt">Day</span></div>
    <div class="tag">Stage 1 test</div>
    <div class="hint">Drag to move · Pinch to zoom · Tap a building</div>
    <div class="sel card"><div class="lv"></div><div><div class="nm"></div><div class="sub"></div></div></div>
    <div class="debug"></div>
    <div class="lost">The graphics stopped (the phone took the GPU away).<br>Tap to reload.</div>`
  const $ = (s: string) => root.querySelector(s) as HTMLElement
  setTimeout(() => $('.hint').classList.add('gone'), 6000)
  $('.lost').addEventListener('click', () => location.reload())
  return {
    setSky(night) {
      $('.sky').classList.toggle('night', night)
      $('.sky .txt').textContent = night ? 'Night' : 'Day'
      document.body.classList.toggle('night-ui', night)
    },
    select(name, level) {
      $('.sel').classList.toggle('on', !!name)
      if (!name) return
      $('.sel .lv').textContent = String(level ?? '')
      $('.sel .nm').textContent = name
      $('.sel .sub').textContent = `Level ${level}`
      $('.hint').classList.add('gone')
    },
    debug(text) { $('.debug').textContent = text },
    lost(on) { $('.lost').classList.toggle('on', on) },
  }
}
