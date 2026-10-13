import { isBlack } from './notes.ts'

/** Fixed range G3–C5 so middle C never moves between lessons. */
export function keyboard() {
  const el = document.createElement('div')
  el.className = 'keys'
  el.setAttribute('aria-hidden', 'true')
  let white = -1
  for (let m = 55; m <= 72; m++) {
    const key = document.createElement('div')
    key.dataset.midi = String(m)
    if (isBlack(m)) {
      key.className = 'key key-black'
      key.style.setProperty('--i', String(white))
    } else {
      white++
      key.className = `key key-white${m === 60 ? ' is-middle-c' : ''}`
    }
    el.append(key)
  }
  return {
    el,
    /** Move the single marker for state to midi (null clears it); 'on' = expected key, 'off' = wrong key heard. */
    set(state: 'on' | 'off', midi: number | null) {
      el.querySelector(`.is-${state}`)?.classList.remove(`is-${state}`)
      el.querySelector(`[data-midi="${midi}"]`)?.classList.add(`is-${state}`)
    },
  }
}
