import './tune.css'
import { A4_MAX, A4_MIN, getA4, noteParts, setA4 } from '../notes.ts'
import { mic, type MicError, type Reading } from '../listen.ts'
import { renderMicSlot } from '../status.ts'

const set = (el: HTMLElement, s: string) => { if (el.textContent !== s) el.textContent = s }

/** Render the view into `root`; return a cleanup that stops any mic/timers. */
export function mount(root: HTMLElement, _params: Record<string, string>): () => void {
  root.innerHTML = `
<h1 class="view-title" tabindex="-1">Tuner</h1>
<p class="view-sub">Play any note to check it. If your piano isn't at 440, play its A above middle C and press Use this as A.</p>
<div>
  <div class="status" aria-live="polite" aria-atomic="true"></div>
  <div class="note"><span class="note-letter"></span><span class="note-octave"></span></div>
  <div class="meter"><div class="meter-mark" hidden></div></div>
  <p class="reading" aria-live="polite" aria-atomic="true"></p>
  <p class="hz"></p>
</div>
<div class="ref">
  <label class="field-label" for="a4">Reference A</label>
  <div><input class="input" id="a4" type="number" min="${A4_MIN}" max="${A4_MAX}" step="0.1" inputmode="decimal"> <span class="field-label">Hz</span></div>
  <button class="btn">Use this as A</button>
  <button class="btn-text">Reset to 440</button>
  <p class="msg" aria-live="polite" aria-atomic="true"></p>
</div>`
  const q = (s: string) => root.querySelector<HTMLElement>(s)!
  const [status, note, letter, octave, meter, mark, reading, hz, use, reset, msg] =
    ['.status', '.note', '.note-letter', '.note-octave', '.meter', '.meter-mark', '.reading', '.hz', '.ref .btn', '.ref .btn-text', '.msg'].map(q)
  const input = q('#a4') as HTMLInputElement
  const host = status.parentElement!
  const readout = [note, meter, reading, hz]

  const showStatus = (e: MicError | null) => { host.replaceChildren(status); renderMicSlot(status, e, onResult) }
  const onResult = (e: MicError | null) => e ? showStatus(e) : host.replaceChildren(...readout)

  let recent: Reading[] = [], aHz = 0, aAt = -Infinity, textAt = 0
  const median = (k: 'cents' | 'freq') => [...recent].sort((a, b) => a[k] - b[k])[recent.length >> 1]?.[k] ?? 0
  const onFrame = (r: Reading | null) => {
    if (!r) return showStatus('stopped')
    const now = performance.now()
    const quiet = r.stable === null
    if (quiet) recent = []
    else if (r.midi !== null) recent = [...recent.slice(-4), r]
    const c = median('cents')
    const freq = median('freq')
    if (recent.length === 5 && freq >= A4_MIN && freq <= A4_MAX) { aHz = freq; aAt = now }
    mark.hidden = quiet
    mark.style.left = `calc(50% + ${c}%)`
    if (now - textAt < 250) return
    textAt = now
    const tuned = !quiet && Math.abs(c) <= 5
    const [l, o] = r.stable === null ? ['–', ''] : noteParts(r.stable)
    set(letter, l)
    set(octave, o)
    set(reading, quiet ? 'Play any note' : tuned ? 'In tune' : `${Math.abs(c)} cents ${c > 0 ? 'sharp' : 'flat'}`)
    set(hz, quiet ? '' : `${freq.toFixed(1)} Hz`)
    letter.style.color = reading.style.color = quiet ? 'var(--ink-2)' : ''
    for (const el of [note, reading, mark]) el.classList.toggle('is-tuned', tuned)
  }

  const showA4 = () => {
    input.value = getA4().toFixed(1)
    reset.hidden = getA4() === 440
  }
  const save = (v: number) => { setA4(v); showA4(); msg.textContent = `Reference set to ${getA4().toFixed(1)} Hz.` }
  input.onchange = () => {
    const v = input.valueAsNumber
    if (v >= A4_MIN && v <= A4_MAX) save(v)
    else { showA4(); msg.textContent = 'Enter a value between 415 and 466.' }
  }
  use.onclick = () => {
    if (performance.now() - aAt < 3000) save(aHz)
    else msg.textContent = 'Play the A above middle C first.'
  }
  reset.onclick = () => { save(440); use.focus() }

  showA4()
  const err = mic.support()
  if (err || !mic.running) showStatus(err); else host.replaceChildren(...readout)
  return mic.subscribe(onFrame)
}
