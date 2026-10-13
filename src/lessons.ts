type Lesson = { title: string; hint: string; notes: string[] }

const seq = (s: string) => s.split(' ')

/** Every lesson fits the fixed on-screen keyboard range G3–C5, so middle C never moves. */
export const lessons: Lesson[] = [
  {
    title: 'Find middle C',
    hint: 'Middle C sits near the middle of your piano, just left of two black keys. On screen it is C4, the key with the dot.',
    notes: seq('C4'),
  },
  {
    title: 'Five-finger C position',
    hint: 'Thumb on middle C, one finger per key, going up.',
    notes: seq('C4 D4 E4 F4 G4'),
  },
  {
    title: 'C major scale, up and down',
    hint: 'Eight white keys up from middle C, then back down.',
    notes: seq('C4 D4 E4 F4 G4 A4 B4 C5 B4 A4 G4 F4 E4 D4 C4'),
  },
  {
    title: 'Twinkle Twinkle',
    hint: 'Starts on middle C. A repeated note needs a fresh press each time.',
    notes: seq('C4 C4 G4 G4 A4 A4 G4 F4 F4 E4 E4 D4 D4 C4'),
  },
  {
    title: 'Mary Had a Little Lamb',
    hint: 'Starts on the E just right of middle C.',
    notes: seq('E4 D4 C4 D4 E4 E4 E4 D4 D4 D4 E4 G4 G4'),
  },
  {
    title: 'Ode to Joy',
    hint: 'Starts on the E just right of middle C.',
    notes: seq('E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4 D4 D4'),
  },
  {
    title: 'G major scale, with F\u266F',
    hint: 'Starts on the G below middle C. F\u266F is a black key.',
    notes: seq('G3 A3 B3 C4 D4 E4 F#4 G4 F#4 E4 D4 C4 B3 A3 G3'),
  },
  {
    title: 'Happy Birthday',
    hint: 'Starts on the G below middle C.',
    notes: seq('G3 G3 A3 G3 C4 B3'),
  },
]

/** Lessons are addressed by 1-based position: #/lesson/1 … #/lesson/8. */
export const getLesson = (id: number): Lesson | undefined => lessons[id - 1]

const KEY = 'ptute.done'
const doneIds = (): number[] => {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}
export const isDone = (id: number) => doneIds().includes(id)
export const markDone = (id: number) => {
  try { localStorage.setItem(KEY, JSON.stringify([...new Set([...doneIds(), id])])) } catch {} // storage may be blocked; the lesson still completes
}
