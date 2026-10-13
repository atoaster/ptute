import { PitchDetector } from 'pitchy'
import { nearestNote } from './notes.ts'

export type Reading = {
  freq: number        // Hz; 0 unless "clear" (clarity ≥ 0.9, rms ≥ GATE, 27–4200 Hz) and ≥ 45 ms after a key strike
  midi: number | null // nearest MIDI note using getA4(); null when not clear
  cents: number       // deviation from `midi`, -50..50; 0 when midi is null
  stable: number | null // MIDI note heard in ≥3 consecutive clear frames; null after 600 ms without one
  onset: boolean      // true only on the frame that begins a new strike of `stable` (DESIGN.md §6 "Onset")
}
export type MicError = 'insecure' | 'unsupported' | 'denied' | 'nodevice' | 'stopped'

/** Input level below which the room is silent (also the "clear frame" gate). */
const GATE = 0.01

/** Stable note + onset per DESIGN.md §6, fed one frame at a time (`now` in ms). */
export function tracker() {
  let stable: number | null = null, cand: number | null = null, run = 0
  let lastClear = 0, lastOnset = -Infinity, struck = -Infinity, gap = true
  const recent: [number, number][] = [] // [now, rms] over the last 100 ms
  return ({ midi, rms, now }: { midi: number | null; rms: number; now: number }) => {
    while (recent.length && now - recent[0][0] > 100) recent.shift()
    // +3.5 dB over the quietest recent frame = a key strike (unison-string beating stays under ~2 dB)
    if (recent.length && rms >= GATE && rms >= 1.5 * Math.min(...recent.map(f => f[1])) && now - struck > 150) struck = now
    recent.push([now, rms])
    let onset = false
    const settled = now - struck >= 45 // the analysis window straddling a strike reads garbage
    if (now - lastClear >= 600) { stable = null; run = 0 }
    if (rms < GATE) gap = true
    if (midi === null) run = 0
    else if (settled) {
      // shortcut: a reading ≥ an octave below a note that read clear in the last 600 ms is the two-note mixture's
      // subharmonic, so an octave-down leap or wrong-octave correction lands ~600 ms late. Upgrade if that lag bothers players.
      if (stable !== null && midi <= stable - 12 && !gap) run = 0
      else {
        lastClear = now
        run = midi === cand ? run + 1 : 1
        cand = midi
        if (stable === midi) { gap = false; onset = struck > lastOnset && now - struck < 300 }
        else if (run >= 3) { stable = midi; gap = false; onset = true }
      }
    }
    if (onset) lastOnset = now
    return { stable, onset, settled }
  }
}

const ERRORS: Record<string, MicError> = {
  NotAllowedError: 'denied', SecurityError: 'denied',
  NotFoundError: 'nodevice', OverconstrainedError: 'nodevice', DevicesNotFoundError: 'nodevice',
}
const subs = new Set<(r: Reading | null) => void>()
let ctx: AudioContext | undefined
let stream: MediaStream | undefined
let starting: Promise<MicError | null> | undefined
let raf = 0
let gen = 0

async function begin(): Promise<MicError | null> {
  const bad = mic.support()
  if (bad) return bad
  let s: MediaStream
  const g = gen
  try {
    // browser processing mangles piano harmonics
    s = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    })
  } catch (e) {
    return ERRORS[(e as DOMException).name] ?? 'stopped'
  }
  // stop() ran while the permission prompt was open (e.g. Lessons mounted)
  if (g !== gen) { s.getTracks().forEach(t => t.stop()); return 'stopped' }
  const c = new AudioContext()
  void c.resume()
  const analyser = new AnalyserNode(c, { fftSize: 2048 })
  new MediaStreamAudioSourceNode(c, { mediaStream: s }).connect(analyser)
  const buf = new Float32Array(2048)
  const detector = PitchDetector.forFloat32Array(2048)
  const track = tracker()
  const frame = () => {
    raf = requestAnimationFrame(frame)
    analyser.getFloatTimeDomainData(buf)
    const rms = Math.sqrt(buf.reduce((sum, x) => sum + x * x, 0) / buf.length)
    const [hz, clarity] = detector.findPitch(buf, c.sampleRate)
    // A0–C8: noise alone reads as a confident sub-27 Hz pitch and would keep `stable` alive through silence
    const clear = clarity >= 0.9 && rms >= GATE && hz >= 27 && hz <= 4200
    let { midi, cents } = clear ? nearestNote(hz) : { midi: null as number | null, cents: 0 }
    const { stable, onset, settled } = track({ midi, rms, now: performance.now() })
    if (!settled) { midi = null; cents = 0 }
    const r: Reading = { freq: midi === null ? 0 : hz, midi, cents, stable, onset }
    for (const cb of [...subs]) if (ctx) cb(r)
  }
  ctx = c
  stream = s
  raf = requestAnimationFrame(frame)
  for (const t of s.getTracks()) t.onended = mic.stop
  addEventListener('pagehide', mic.stop)
  return null
}

/** One shared microphone listener for the whole app (persists across Practice ↔ Tuner). */
export const mic = {
  get running(): boolean { return !!ctx },
  /** 'insecure' | 'unsupported' when this page can never listen, else null. Safe before any click. */
  support(): MicError | null {
    if (!window.isSecureContext) return 'insecure'
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) return 'unsupported'
    return null
  },
  /** Idempotent. Must be called from a user gesture the first time. Resolves null on success. */
  async start(): Promise<MicError | null> {
    if (ctx) return null
    return (starting ??= begin().finally(() => { starting = undefined }))
  },
  stop(): void {
    gen++
    if (!ctx) return
    cancelAnimationFrame(raf)
    stream?.getTracks().forEach(t => t.stop())
    void ctx.close()
    ctx = stream = undefined
    for (const cb of [...subs]) cb(null)
  },
  /** `cb` gets a Reading per animation frame while running, and `null` once when the mic stops
   *  (stop() or the track ended). Returns an unsubscribe function. */
  subscribe(cb: (r: Reading | null) => void): () => void {
    subs.add(cb)
    return () => { subs.delete(cb) }
  },
}
