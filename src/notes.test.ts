import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseNote, noteName, noteParts, nearestNote, isBlack } from './notes.ts'

test('note names round-trip', () => {
  for (const n of ['C4', 'A4', 'F#5', 'C-1', 'G9', 'A#0']) assert.equal(noteName(parseNote(n)), n)
  assert.equal(parseNote('A4'), 69)
  assert.equal(parseNote('C4'), 60)
  assert.throws(() => parseNote('H4'))
  assert.throws(() => parseNote('Db4'))
  assert.deepEqual(noteParts(66), ['F\u266F', '4'])
  assert.deepEqual(noteParts(60), ['C', '4'])
  assert.equal(isBlack(61), true)
  assert.equal(isBlack(60), false)
})

test('frequency math', () => {
  assert.deepEqual(nearestNote(440, 440), { midi: 69, cents: 0 })
  assert.deepEqual(nearestNote(445, 440), { midi: 69, cents: 20 })
  assert.deepEqual(nearestNote(440, 442), { midi: 69, cents: -8 })
  assert.equal(nearestNote(466.16, 440).midi, 70)
  assert.equal(nearestNote(261.63, 440).midi, 60)
})
