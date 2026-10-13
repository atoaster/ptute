import './practice.css'
import { keyboard } from '../keyboard.ts'
import { getLesson, markDone } from '../lessons.ts'
import { mic, type MicError, type Reading } from '../listen.ts'
import { noteParts, parseNote } from '../notes.ts'
import { el, renderMicSlot } from '../status.ts'

const name = (m: number) => noteParts(m).join('')

/** Render the view into `root`; return a cleanup that stops any mic/timers. */
export function mount(root: HTMLElement, params: Record<string, string>): () => void {
  const n = Number(params.id), lesson = getLesson(n)!
  const notes = lesson.notes.map(parseNote)

  root.innerHTML = `
    <h1 class="view-title" tabindex="-1"></h1>
    <p class="view-sub"></p>
    <div class="note" aria-live="polite" aria-atomic="true"><p class="note-caption"></p><span class="note-letter"></span><span class="note-octave"></span></div>
    <ol class="strip" aria-label="Notes in this lesson"></ol>
    <div class="status" aria-live="polite" aria-atomic="true"></div>`
  const $ = (s: string) => root.querySelector(s) as HTMLElement
  const title = $('.view-title'), note = $('.note'), strip = $('.strip'), caption = $('.note-caption'), letter = $('.note-letter'), octave = $('.note-octave'), status = $('.status')
  title.textContent = lesson.title
  $('.view-sub').textContent = lesson.hint
  const kb = keyboard()
  note.before(kb.el) // the keyboard is the hero: first under the title on every viewport
  const dim = (on: boolean) => { for (const e of [kb.el, note]) e.classList.toggle('is-dim', on) }

  const text = el('p', 'status-text')
  const hint = el('p', 'status-sub')
  hint.innerHTML = 'Every note a step off? Check <a href="#/tune">Tuner</a>.'
  const octaveHint = el('p', 'status-sub', 'Same note, a different octave. Middle C is the key with the dot.')
  const row = el('div', 'status-row')
  row.innerHTML = (getLesson(n + 1) ? `<a class="btn" href="#/lesson/${n + 1}">Next lesson</a>` : '<a class="btn" href="#/">Back to lessons</a>')
    + '<button class="btn-text">Start over</button>'

  let step = 0, semis = 0, octaves = 0
  let heard: number | null = null, wrong = false, holdUntil = 0, refractory = false, blink = 0

  const say = (s: string) => { if (text.textContent !== s) text.textContent = s }
  const clearWrong = () => { wrong = false; kb.set('off', null); status.classList.remove('is-wrong') }
  const mark = (i: number, cls: string) => {
    const li = strip.children[i]
    li.className = `strip-note ${cls}`
    if (cls === 'is-current') li.setAttribute('aria-current', 'step')
    else li.removeAttribute('aria-current')
  }
  const buildStrip = () => {
    strip.replaceChildren(...notes.map(m => Object.assign(el('li', 'strip-note'), { textContent: noteParts(m)[0] })))
    mark(0, 'is-current')
  }
  const show = () => {
    if (step === notes.length) {
      caption.textContent = ''; letter.textContent = 'Done.'; octave.textContent = ''
      return
    }
    const m = notes[step]
    kb.set('on', m)
    caption.textContent = m === notes[step - 1] ? 'Play again' : 'Play'
    const [l, o] = noteParts(m)
    letter.textContent = l; octave.textContent = o
  }
  const listen = () => {
    dim(false)
    status.classList.remove('is-error', 'is-wrong')
    status.replaceChildren(step < notes.length ? text : row)
    say('Listening…')
    holdUntil = 0
    title.focus() // replaceChildren just removed the focused button
  }
  const onResult = (e: MicError | null) => {
    if (e) renderMicSlot(status, e, onResult)
    else listen()
  }
  const accept = () => {
    kb.set('on', null); clearWrong()
    mark(step, 'is-done')
    const m = notes[step++]
    if (step < notes.length) mark(step, 'is-current')
    else markDone(n)
    semis = octaves = 0
    if (hint.contains(document.activeElement)) title.focus() // the Tuner link is about to go
    hint.remove(); octaveHint.remove()
    say(`${name(m)} ✓`)
    holdUntil = performance.now() + 600
    refractory = true
    blink = setTimeout(() => {
      refractory = false
      show()
      if (step === notes.length && mic.running) status.replaceChildren(row)
    }, 150)
  }
  const judge = (m: number) => {
    const want = notes[step]
    if (m === want) return accept()
    kb.set('off', m)
    // not say(): a re-strike of the same wrong key must re-announce, so replace the text node even when the words match
    text.textContent = `Heard ${name(m)}, not ${name(want)}.`
    wrong = true; status.classList.add('is-wrong') // stays until the next strike, so a player looking at their hands still sees it
    semis = Math.abs(m - want) === 1 ? semis + 1 : 0
    octaves = (m - want) % 12 === 0 ? octaves + 1 : 0
    if (semis >= 3 && !hint.isConnected) status.append(hint)
    if (octaves >= 2 && !octaveHint.isConnected) status.append(octaveHint)
  }
  const onReading = (r: Reading | null) => {
    heard = r?.stable ?? null
    if (!r) {
      clearWrong(); dim(true)
      renderMicSlot(status, 'stopped', onResult)
      return
    }
    if (r.onset && heard !== null && !refractory && step < notes.length) judge(heard)
    if (!wrong && performance.now() >= holdUntil) say(heard === null ? 'Listening…' : `Hearing ${name(heard)}`)
  }
  const restart = () => {
    step = 0; semis = octaves = 0
    clearWrong(); hint.remove(); octaveHint.remove()
    buildStrip(); show(); listen()
  }
  row.querySelector('button')!.onclick = restart

  buildStrip(); show()
  const err = mic.support()
  if (!err && mic.running) listen()
  else { dim(true); renderMicSlot(status, err, onResult) }
  const unsub = mic.subscribe(onReading)

  return () => { unsub(); clearTimeout(blink) }
}
