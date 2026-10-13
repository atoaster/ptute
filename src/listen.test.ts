import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tracker } from './listen.ts'

// Frames are 16 ms apart. A strike is ignored for 45 ms (3 frames), then 3 agreeing frames make a note stable.
const session = () => {
  const track = tracker()
  let now = 0
  return (midi: number | null, rms = 0.1) => track({ midi, rms, now: now += 16 })
}
type F = ReturnType<typeof session>
const strike = (f: F, midi: number, rms = 0.1) => {
  let r = f(midi, rms)
  for (let i = 0; i < 5; i++) r = f(midi, rms)
  return r
}
const settle = (f: F, midi: number, rms = 0.1) => {
  f(null, 0); f(null, 0)
  assert.partialDeepStrictEqual(strike(f, midi, rms), { stable: midi, onset: true })
}

test('silence then a note: ignored while the window straddles the strike, then stable + one onset', () => {
  const f = session()
  f(null, 0); f(null, 0)
  for (let i = 0; i < 5; i++) assert.partialDeepStrictEqual(f(60), { stable: null, onset: false })
  assert.partialDeepStrictEqual(f(60), { stable: 60, onset: true })
  for (let i = 1; i <= 12; i++) assert.partialDeepStrictEqual(f(60, 0.1 - i * 0.002), { stable: 60, onset: false }, 'decay is not a re-strike')
})

test('a decaying held note never re-triggers; a re-strike while it rings does, once', () => {
  const f = session()
  settle(f, 60)
  for (let i = 0; i < 30; i++) assert.partialDeepStrictEqual(f(60, 0.1 - i * 0.002), { stable: 60, onset: false })
  for (let i = 0; i < 3; i++) assert.partialDeepStrictEqual(f(60, 0.1), { stable: 60, onset: false })
  assert.partialDeepStrictEqual(f(60, 0.1), { stable: 60, onset: true })
  for (let i = 0; i < 5; i++) assert.partialDeepStrictEqual(f(60, 0.1), { stable: 60, onset: false })
})

test('a different note at the same level becomes stable after 3 frames with one onset', () => {
  const f = session()
  settle(f, 60)
  assert.partialDeepStrictEqual(f(62), { stable: 60, onset: false })
  assert.partialDeepStrictEqual(f(62), { stable: 60, onset: false })
  assert.partialDeepStrictEqual(f(62), { stable: 62, onset: true })
  assert.partialDeepStrictEqual(f(62), { stable: 62, onset: false })
})

test('a single glitch frame does not change stable or trigger onset', () => {
  const f = session()
  settle(f, 60)
  assert.partialDeepStrictEqual(f(67), { stable: 60, onset: false })
  for (let i = 0; i < 5; i++) assert.partialDeepStrictEqual(f(60), { stable: 60, onset: false })
})

test('600 ms of unclear frames clears stable; the next note is an onset again', () => {
  const f = session()
  settle(f, 60)
  for (let t = 16; t < 600; t += 16) assert.partialDeepStrictEqual(f(null, 0), { stable: 60, onset: false })
  assert.partialDeepStrictEqual(f(null, 0), { stable: null, onset: false })
  assert.partialDeepStrictEqual(strike(f, 60), { stable: 60, onset: true })
})

test('a damped repeat (short gap, same note struck again) is an onset; a quiet return is not', () => {
  const f = session()
  settle(f, 60)
  for (let i = 0; i < 10; i++) assert.partialDeepStrictEqual(f(null, 0.004), { stable: 60, onset: false })
  for (let i = 0; i < 3; i++) assert.partialDeepStrictEqual(f(60, 0.1), { stable: 60, onset: false })
  assert.partialDeepStrictEqual(f(60, 0.1), { stable: 60, onset: true })
  const g = session()
  settle(g, 60, 0.09)
  g(null, 0.09); g(null, 0.09)
  assert.partialDeepStrictEqual(g(60, 0.09), { stable: 60, onset: false })
})

test('a subharmonic of the ringing note is ignored for 600 ms; the same pitch after real silence is a new note', () => {
  const f = session()
  settle(f, 60)
  for (let i = 0; i < 6; i++) assert.partialDeepStrictEqual(f(48, 0.08), { stable: 60, onset: false })
  assert.partialDeepStrictEqual(f(60, 0.07), { stable: 60, onset: false })
  for (let i = 0; i < 37; i++) assert.partialDeepStrictEqual(f(48, 0.08), { stable: 60, onset: false })
  for (let i = 0; i < 2; i++) assert.partialDeepStrictEqual(f(48, 0.08), { stable: null, onset: false }, 'ringing note expired')
  assert.partialDeepStrictEqual(f(48, 0.08), { stable: 48, onset: true }, 'an octave-down correction is accepted ~600 ms late')
  assert.partialDeepStrictEqual(f(48, 0.08), { stable: 48, onset: false })
  const g = session()
  settle(g, 60)
  g(null, 0.004); g(null, 0.004)
  assert.partialDeepStrictEqual(strike(g, 48), { stable: 48, onset: true })
})

test('a new note struck over a ringing one: the mixture reads as a subharmonic first, then resolves with one onset', () => {
  const f = session()
  settle(f, 60)
  for (let i = 0; i < 20; i++) f(60, 0.1 - i * 0.003)
  for (let i = 0; i < 5; i++) assert.partialDeepStrictEqual(f(48, 0.12), { stable: 60, onset: false })
  assert.partialDeepStrictEqual(f(67, 0.12), { stable: 60, onset: false })
  assert.partialDeepStrictEqual(f(67, 0.12), { stable: 60, onset: false })
  assert.partialDeepStrictEqual(f(67, 0.12), { stable: 67, onset: true })
  assert.partialDeepStrictEqual(f(67, 0.12), { stable: 67, onset: false })
})

test('frames within 45 ms of a strike are not settled; silence never counts as a strike', () => {
  const f = session()
  for (let i = 0; i < 12; i++) assert.equal(f(null, 0).settled, true)
  for (let i = 0; i < 12; i++) assert.equal(f(null, 0.0002 * (1 + i % 2)).settled, true, 'noise floor flicker')
  assert.equal(f(60, 0.1).settled, false)
  assert.equal(f(60, 0.1).settled, false)
  assert.equal(f(60, 0.1).settled, false)
  assert.equal(f(60, 0.1).settled, true)
})
