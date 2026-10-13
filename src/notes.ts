const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const A4_MIDI = 69

export const noteName = (midi: number) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`
/** Display parts: 78 → ['F♯', '5']. */
export const noteParts = (midi: number): [string, string] => {
  const n = noteName(midi).replace('#', '\u266F')
  return [n.slice(0, -1), n.slice(-1)]
}
export const isBlack = (midi: number) => NAMES[midi % 12].length === 2

/** 'C4' → 60, 'F#5' → 78. Throws on anything else. */
export function parseNote(name: string): number {
  const m = /^([A-G]#?)(-?\d)$/.exec(name)
  const i = m ? NAMES.indexOf(m[1]) : -1
  if (!m || i < 0) throw new Error(`bad note ${name}`)
  return i + (Number(m[2]) + 1) * 12
}

/** Nearest MIDI note to `freq` and the deviation from it in cents (-50..50). */
export function nearestNote(freq: number, a4 = getA4()): { midi: number; cents: number } {
  const exact = A4_MIDI + 12 * Math.log2(freq / a4)
  const midi = Math.round(exact)
  return { midi, cents: Math.round((exact - midi) * 100) }
}

/** Reference pitch for A4. Persisted so a piano tuned off 440 Hz is still read correctly. */
export const A4_MIN = 415
export const A4_MAX = 466
let a4 = 440
try { a4 = Number(localStorage.getItem('ptute.a4')) || 440 } catch {} // storage may be blocked
export const getA4 = () => a4
export const setA4 = (hz: number) => {
  a4 = Math.round(hz * 10) / 10
  try { localStorage.setItem('ptute.a4', String(a4)) } catch {}
}
