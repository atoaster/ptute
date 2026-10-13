# ptute — final design

Synthesis of the "minimal" skeleton (winner on combined score) with the judges' grafts: "feedback"'s onset/refractory rule, one-slot status strip, dimmed keyboard and throttled tuner text; "beginner"'s per-lesson hints, "Play again" caption, semitone-off tuning hint, single "Up next" tag and no-red palette. Everything below is decided.

## 1. Name, tone & one-line promise

- **Name:** `ptute` (lowercase wordmark, system font, 1rem / 600; no logo, no icon).
- **Tone:** quiet, plain, patient. Short sentences. No exclamation marks. No praise words, no scores. The app never says "wrong" or "error" to the player; those words are reserved for the computer's own problems. A wrong note is information; the lit key is the hint.
- **Promise** (the one sentence on the Lessons screen): **Play on your real piano. ptute listens and lights the next key.**
- **The core loop everything serves:** see the lit key → strike it → within ~100 ms the key blinks, `C4 ✓` appears, the light moves to the next key.

## 2. Information architecture & navigation

Three hash routes, one shell (`<header class="header">` + `<main class="view">`), one view mounted at a time.

| Route | View | Header left | Header right | `document.title` |
|---|---|---|---|---|
| `#/` | Lessons | `<span class="wordmark">ptute</span>` | `<a href="#/tune">Tuner</a>` | `ptute` |
| `#/lesson/<1–8>` | Practice | `<a href="#/">← Lessons</a>` | `<a href="#/tune">Tuner</a>` | `<Lesson title> · ptute` |
| `#/tune` | Tuner | `<a href="#/">← Lessons</a>` | *(empty)* | `Tuner · ptute` |

- Header: 3.5rem tall, flex, space-between, no background, no border, no shadow. `←` is U+2190 text.
- Back navigation is the "← Lessons" link (always `#/`) or the browser Back button. No breadcrumbs, no menu, no footer.
- Unknown route or lesson id → `location.replace('#/')`.
- On every route change: `<main>` is replaced, `document.title` set, scroll to top, focus moves to the view's `<h1 tabindex="-1">`.
- **Microphone lifecycle:** one shared listener. It starts only from the **Start listening** button. Once running it stays running across Practice ↔ Tuner and "Next lesson". It stops when the Lessons view mounts and on `pagehide`. If the track ends (device unplugged) the current view shows the "stopped" state (§7).
- **Storage:** `localStorage["ptute.a4"]` = reference A frequency as a decimal string (default 440); `localStorage["ptute.done"]` = JSON array of completed lesson ids (numbers). Nothing else is stored.
- **Files:** `src/main.ts` (router, shell, focus), `src/lessons.ts` (data below), `src/notes.ts` (note math + the `ptute.a4` key), `src/listen.ts` (mic, pitchy, stable note, onset — exported as the shared `mic` object), `src/keyboard.ts` (render + `set("on"|"off", midi)`), `src/views/home.ts|css` (Lessons list), `src/views/practice.ts|css`, `src/views/tune.ts|css`, `src/style.css`.

**Lesson data** (ids are the fixed order; note names use sharps only, `♯` = U+266F):

| id | Title | Hint (shown under the title on Practice) | Notes |
|---|---|---|---|
| 1 | Find middle C | Middle C sits near the middle of your piano, just left of two black keys. On screen it is C4, the key with the dot. | C4 |
| 2 | Five-finger C position | Thumb on middle C, one finger per key, going up. | C4 D4 E4 F4 G4 |
| 3 | C major scale, up and down | Eight white keys up from middle C, then back down. | C4 D4 E4 F4 G4 A4 B4 C5 B4 A4 G4 F4 E4 D4 C4 |
| 4 | Twinkle Twinkle | Starts on middle C. A repeated note needs a fresh press each time. | C4 C4 G4 G4 A4 A4 G4 F4 F4 E4 E4 D4 D4 C4 |
| 5 | Mary Had a Little Lamb | Starts on the E just right of middle C. | E4 D4 C4 D4 E4 E4 E4 D4 D4 D4 E4 G4 G4 |
| 6 | Ode to Joy | Starts on the E just right of middle C. | E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4 D4 D4 |
| 7 | G major scale, with F♯ | Starts on the G below middle C. F♯ is a black key. | G3 A3 B3 C4 D4 E4 F♯4 G4 F♯4 E4 D4 C4 B3 A3 G3 |
| 8 | Happy Birthday | Starts on the G below middle C. | G3 G3 A3 G3 C4 B3 |

Every lesson fits the fixed keyboard range G3–C5 (MIDI 55–72).

## 3. Screen: Lessons (`#/`)

Single column, max-width 40rem, centred. Order:

1. Header: wordmark / **Tuner**.
2. `<h1 class="view-title" tabindex="-1">Lessons</h1>` (1.25rem / 600).
3. `<p class="view-sub">Play on your real piano. ptute listens and lights the next key.</p>` (0.875rem, `--ink-2`).
4. `<ol class="lessons">` of 8 `<li>`, each containing one full-width `<a class="lesson" href="#/lesson/<id>">`. Rows are min-height 3.5rem with a 1px `--line` hairline between rows (border-top on every row except the first). No cards, no borders around the list.

**Row anatomy** (flex, align centre, gap 1rem):
- `.lesson-num`: `1`–`8`, 0.875rem, `--ink-2`, tabular numerals, width 1.5rem.
- `.lesson-title`: 1.125rem, `--ink`, `flex: 1`. On hover/focus of the row the title turns `--accent`. Nothing else changes.
- `.lesson-tag`: 0.875rem, right-aligned. Exactly one of: **Done** (`--ink-2`, when the id is in `ptute.done`); **Up next** (`--accent`, 600, on the first lesson that is not done — at most one row has it, none when all are done); empty.

Done lessons stay replayable. The Lessons screen never touches the microphone; mounting it stops the listener.

## 4. Screen: Practice (`#/lesson/<id>`)

Single column, max-width 40rem. Order and vertical gaps:

1. Header: **← Lessons** / **Tuner**.
2. `<h1 class="view-title" tabindex="-1">` lesson title (1.25rem / 600). Gap 0.25rem.
3. `<p class="view-sub">` the lesson hint (0.875rem, `--ink-2`). Gap 1.5rem.
4. **Keyboard (hero)** — first under the title so it is above the fold on every viewport. `<div class="keys" aria-hidden="true">`, full column width, fixed range **G3–C5**: 11 white keys (G3 A3 B3 C4 D4 E4 F4 G4 A4 B4 C5), 7 black keys (G♯3 A♯3 C♯4 D♯4 F♯4 G♯4 A♯4). Same range on every lesson so middle C never moves. Not interactive.
   - Container `position: relative; display: flex; gap: 2px; background: var(--line); border: 1px solid var(--line); forced-color-adjust: none`; height `clamp(120px, min(30vw, 32vh), 220px)`.
   - White key `.key.key-white`: `flex: 1`, fill `--key-white`, radius `0 0 4px 4px`. Width ≈ 28px at 360px viewport, ≈ 56px at 40rem.
   - Black key `.key.key-black`: `position: absolute; top: 0; z-index: 1`, fill `--key-black`, radius `0 0 3px 3px`, `width: calc(100% / 11 * 0.6)`, `height: 62%`, `left: calc((var(--i) + 1) * 100% / 11 - 100% / 11 * 0.3)` with `--i` set inline to the 0-based index of the white key on its left: G♯3 `0`, A♯3 `1`, C♯4 `3`, D♯4 `4`, F♯4 `6`, G♯4 `7`, A♯4 `8`. `shortcut: ignores the 2px gaps (≤1px drift), upgrade only if a tester misreads a black key.`
   - Middle C dot: `.key.is-middle-c::after` — 6px circle, `--key-black`, centred, 12px above the key bottom. Always present.
   - `.is-on` (expected key): fill `--key-on`. Exactly one key, or none during the 150 ms blink and after completion.
   - `.is-off` (wrong key heard, within range): fill `--key-off`. Stays until the next judged strike (or Start over).
   - `.keys.is-dim`: `opacity: 0.5` — before listening starts and in every error state. The expected key stays lit underneath so the player knows what comes first.
   - No labels on keys. The big note names the key; the dot anchors middle C. Gap 1.5rem.
5. **Big note** `<div class="note" aria-live="polite" aria-atomic="true">`, min-height 6rem, centred:
   - `<p class="note-caption">` 0.875rem `--ink-2`: **Play**; **Play again** when this note equals the note just accepted; empty on completion.
   - `<span class="note-letter">` 4rem / 600, line-height 1, letter-spacing −0.02em, `--ink`: `C`, `F♯`.
   - `<span class="note-octave">` 1.5rem / 400, `--ink-2`, baseline-aligned, margin-left 0.125rem: `4`.
   - A screen reader hears "Play C 4" / "Play again C 4" / "Done.". `.note.is-dim` (the letter turns `--ink-2`; no opacity, so it stays AA) whenever the keyboard is dimmed, so the idle screen gives one instruction: Start listening. Gap 1rem.
6. **Progress strip** `<ol class="strip" aria-label="Notes in this lesson">`: one `<li class="strip-note">` per note showing the letter and accidental only (`C`, `F♯`), 0.875rem, gap 0.5rem, `flex-wrap: wrap`, centred. Upcoming: `--ink`, 400. `.is-current`: `--accent`, 600, `aria-current="step"`. `.is-done`: `--ink-2`. Gap 1.5rem.
7. **Status strip** `<div class="status" aria-live="polite" aria-atomic="true">`: min-height 4.5rem, flex column, centred, gap 0.5rem, 0.875rem `--ink-2`. Exactly one content at a time:
   - Idle: `<button class="btn">Start listening</button>` + `<p class="status-sub">Uses your microphone. Nothing is recorded or sent.</p>`. The button is disabled while the browser permission prompt is open; its label does not change.
   - Listening, silence: `<p class="status-text">Listening…</p>` (U+2026).
   - Note ringing with no judgement (e.g. the accepted note still sounding): **Hearing C4**.
   - Correct: **C4 ✓** — held at least 600 ms, then the strip follows the sound (Hearing / Listening…).
   - Wrong: **Heard D4, not E4.** (`.status.is-wrong`: `--ink`, 1.125rem, readable from the bench). It stays until the next judged strike; silence never replaces it. After 3 consecutive wrong onsets at the same step that are each exactly one semitone from the expected note, a second line appears: `<p class="status-sub">Every note a step off? Check <a href="#/tune">Tuner</a>.</p>`. After 2 consecutive wrong onsets that are the right pitch class in the wrong octave: `<p class="status-sub">Same note, a different octave. Middle C is the key with the dot.</p>`. Both disappear on the next correct note. These are the only places Practice mentions tuning or octaves.
   - Error: §7.
   - Complete: `<div class="status-row">` with `<a class="btn" href="#/lesson/<id+1>">Next lesson</a>` (on lesson 8: `<a class="btn" href="#/">Back to lessons</a>`) and `<button class="btn-text">Start over</button>` (not "Play again", which is the repeat caption).

**Completion state** (last note accepted): the id is written to `ptute.done` immediately; after the 150 ms blink the big note reads **Done.** (caption empty), all strip letters are `--ink-2`, no key is lit, the status strip shows the completion row. The microphone keeps running. **Start over** restarts the sequence instantly without touching the mic.

## 5. Screen: Tuner (`#/tune`)

Single column, max-width 40rem. Order:

1. Header: **← Lessons** / empty.
2. `<h1 class="view-title" tabindex="-1">Tuner</h1>`.
3. `<p class="view-sub">Play any note to check it. If your piano isn't at 440, play its A above middle C and press Use this as A.</p>` — the only explanation on the page.
4. **Readout block.** Before listening and in error states this block is the status strip (§7) with **Start listening** + the privacy line. Once listening it is:
   - Big note (`.note`, same component as Practice, no caption): nearest note `A` 4rem + `4` 1.5rem. Silence: `–` (U+2013) in `--ink-2`.
   - **Meter** `<div class="meter">`: full width, 24px tall, `position: relative`. Baseline 2px `--line` at vertical centre; centre tick 1px × 16px `--ink`; end ticks at −50/+50 cents 1px × 8px `--ink-2`; marker `<div class="meter-mark">` 3px × 24px, radius 1.5px, `--ink`, `left: calc(50% + <cents> * 1%)` with cents clamped to ±50, `transition: left var(--t) linear`. Marker hidden during silence.
   - **Reading** `<p class="reading" aria-live="polite" aria-atomic="true">` 1.5rem `--ink`, tabular numerals: **12 cents sharp** / **3 cents flat** / **In tune** (|cents| ≤ 5). Silence: **Play any note** in `--ink-2`.
   - **Frequency** `<p class="hz">` 0.875rem `--ink-2`, min-height 1.5em: **261.6 Hz** (one decimal). Empty during silence (the row keeps its height so nothing below shifts).
   - When in tune, `.note`, `.reading` and `.meter-mark` all get `.is-tuned` → `--accent`.
   - The marker moves every frame (cents = median of the last 5 clear frames). Note, reading and Hz text update at most 4 times per second.
5. **Reference block** `<div class="ref">` (margin-top 3rem):
   - `<label class="field-label" for="a4">Reference A</label>` 0.875rem `--ink-2`.
   - Row: `<input class="input" id="a4" type="number" min="415" max="466" step="0.1" inputmode="decimal">` showing the stored value with one decimal (`440.0`), then the text **Hz** in `--ink-2`. Saves on `change` only. A value outside 415–466 is not saved: the input reverts to the stored value and the message line reads **Enter a value between 415 and 466.**
   - `<button class="btn">Use this as A</button>` — always enabled. On press it uses the most recent stable frequency between 415 and 466 Hz heard in the last 3 seconds (latched, so the note may already have decayed). If there is one: save it rounded to 0.1, update the input, message **Reference set to 442.3 Hz.**; the readout immediately shows **In tune**. If there is none (not listening, silence, or nothing in range in 3 s): message **Play the A above middle C first.**
   - `<button class="btn-text">Reset to 440</button>` — rendered only while the stored value ≠ 440. On press: save 440, message **Reference set to 440.0 Hz.**
   - `<p class="msg" aria-live="polite" aria-atomic="true">` 0.875rem `--ink-2`, min-height 1.5rem, empty until the first action.

**Exact copy strings on this screen:** `Tuner`, `Play any note to check it. If your piano isn't at 440, play its A above middle C and press Use this as A.`, `Play any note`, `In tune`, `{n} cents sharp`, `{n} cents flat`, `{f} Hz`, `Reference A`, `Hz`, `Use this as A`, `Reset to 440`, `Reference set to {f} Hz.`, `Play the A above middle C first.`, `Enter a value between 415 and 466.`

## 6. Interaction rules

**Sensing** (`src/listen.ts`): `AudioContext` + `MediaStreamSource` → `AnalyserNode` with `fftSize = 2048`; `getFloatTimeDomainData` once per `requestAnimationFrame`; `PitchDetector.forFloat32Array(2048).findPitch(buf, sampleRate)` → `[hz, clarity]`; `rms = sqrt(mean(buf²))`. A frame is **clear** when `clarity ≥ 0.9`, `rms ≥ 0.01` and `27 ≤ hz ≤ 4200` (A0–C8; noise reads as a confident sub-27 Hz pitch). For a clear frame: `midi = round(69 + 12·log2(hz / a4))`, `cents = 1200·log2(hz / (a4 · 2^((midi − 69) / 12)))`, where `a4` is read from `ptute.a4` on every view mount and after every save.

**Stable note:** the same `midi` in 3 consecutive clear frames (~50 ms). Everything below reacts to stable notes only.

**Silence:** 600 ms without a clear frame → stable note becomes none. Practice: strip returns to **Listening…** (unless **C4 ✓** is still within its 600 ms hold, or a **Heard …** sentence is showing — it and `.is-off` persist until the next judged strike, see Wrong). Tuner: note `–`, marker hidden, reading **Play any note**, Hz hidden. Progress and the lit key never change on silence. No timeout, no nudge.

**Onset** (one strike = one note). A *strike* is a frame whose `rms` is ≥ 1.5 × the quietest frame of the last 100 ms (and ≥ 0.01), at most once per 150 ms. The 45 ms after a strike are not trusted: the analysis window still straddles the attack and reads garbage, so those frames count as unclear. An onset is reported (a) on the frame a note becomes stable when there was no stable note or the stable `midi` changed, or (b) on the first settled clear frame that reads the current stable note again after a strike (a re-strike of the same key, whether the first one was damped or still ringing). A clear reading an octave or more *below* a note that is still ringing (no frame under the rms gate since, and a clear frame of it within the last 600 ms) is the two-note mixture's common subharmonic, not a new note; it is ignored until the mixture resolves. Each lesson step is judged **only on onsets**; a held or ringing note is never judged twice.

**Refractory:** for 150 ms after a note is accepted nothing is judged. During those 150 ms no key is lit (`.is-on` removed) — this is the blink that makes a repeated note visibly a new ask. When it ends, `.is-on` moves to the next expected key (the same key for a repeat) and the big note updates.

**Correct** (onset, `midi === expected`): `.is-on` removed → strip letter becomes `.is-done`, next letter `.is-current` → status **C4 ✓** (≥ 600 ms) → after 150 ms the next key lights and the big note reads the next note, caption **Play again** if it is the same note. Acknowledgement lands ≈ 50 ms of agreement + ≈ 45 ms of buffer after the strike — the key blinks while the note is still sounding.

**Wrong** (onset, `midi !== expected`): the heard key gets `.is-off` if it is within G3–C5 (otherwise only the text reacts); status **Heard D4, not E4.** in `--ink` at 1.125rem; both stay until the next judged strike (silence does not clear them); the lit key stays lit; the step does not change. A wrong octave is wrong — the octave digit in the text shows why. Consecutive one-semitone misses are counted per step; at 3 the Tuner line appears (§4). Counter resets on a correct note. No shake, no sound, no red, no total.

**From the player's point of view:** *Each lit key wants one press. When the next note is the same key, the key blinks off and on and the caption says "Play again". Holding or letting it ring does nothing; strike it again.*

**Tuner page:** readout updates as in §5. `Use this as A` reads the latched in-range frequency (last 3 s). Saving `ptute.a4` takes effect on the next frame.

**Mic persistence:** Practice ↔ Tuner and Next lesson never re-prompt. The listener stops when Lessons mounts or the page hides; the `ended` event on the audio track puts the current view into the "stopped" state (§7).

## 7. Error & permission states

All appear in the status strip (`.status.is-error`): Practice below the keyboard (keyboard and big note `.is-dim`), Tuner in place of the readout block. One sentence (`.status-text`, 0.875rem, `--ink`) with the action beneath as `.btn` where listed. Checked in this order.

| State | Trigger | Copy | Action |
|---|---|---|---|
| Insecure context | `!window.isSecureContext` (on mount, before any click) | The microphone needs a secure page. Open ptute over https or on localhost. | none |
| Unsupported browser | no `navigator.mediaDevices?.getUserMedia` or no `AudioContext` (on mount) | This browser can't listen to the microphone. Try a current Chrome, Firefox, Safari or Edge. | none |
| Idle | listener not running | *(none)* | **Start listening** + `Uses your microphone. Nothing is recorded or sent.` |
| Permission denied | `NotAllowedError` / `SecurityError` | Microphone access is blocked. Allow it in your browser's address bar, then try again. | **Try again** |
| No microphone | `NotFoundError` / `OverconstrainedError` / `DevicesNotFoundError` | No microphone found. Plug one in, then try again. | **Try again** |
| Stopped / other | any other error, or the track's `ended` event | The microphone stopped. | **Start listening** |
| Listening | running, no stable note | Listening… | — |
| Hearing | stable note, no judgement | Hearing C4 | — |
| Correct | onset matches | C4 ✓ | — |
| Wrong | onset does not match | Heard D4, not E4. (+ Tuner line after 3 semitone misses; + octave line after 2 octave misses) | — |
| Lesson complete | last note accepted | *(big note: Done.)* | **Next lesson** / **Back to lessons**, **Start over** |

**Try again** and **Start listening** both run the same start routine. The Lessons screen never shows mic states.

## 8. Visual language

**Tokens** (`:root` light; `@media (prefers-color-scheme: dark)` overrides; `html { color-scheme: light dark }`; no toggle):

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FFFFFF` | `#121212` | page |
| `--ink` | `#111111` | `#F2F2F2` | text, meter marker, centre tick |
| `--ink-2` | `#6B6B6B` | `#A3A3A3` | secondary text, done notes, end ticks, input border |
| `--line` | `#E3E3E3` | `#2A2A2A` | hairlines, keyboard gaps and outline, meter baseline |
| `--accent` | `#2461E0` | `#6B9BFF` | links, current strip note, "Up next", primary button fill, in-tune state |
| `--on-accent` | `#FFFFFF` | `#121212` | primary button text |
| `--key-white` | `#FFFFFF` | `#D9D9D9` | white keys |
| `--key-black` | `#1A1A1A` | `#1A1A1A` | black keys, middle-C dot |
| `--key-on` | `#2461E0` | `#2461E0` | expected key (fixed in both themes; ≥ 3:1 on both key colours) |
| `--key-off` | `#767676` | `#767676` | wrong key (≥ 3:1 on white, grey and black keys) |

One accent. No green, no red, no amber. "Correct" is the blink plus the ✓ text; "wrong" is a neutral grey key plus a sentence.

**Type:** `font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`. Scale (rem): `0.875` (sub lines, strip, status, labels, Hz, tags, numbers) · `1` (body, buttons, header) · `1.125` (lesson titles) · `1.25` (h1) · `1.5` (octave digit, tuner reading) · `4` (note letter, "Done."). Weights 400 and 600 only. Line-height 1.5; 1.2 for h1; 1 for the 4rem letter. `font-variant-numeric: tabular-nums` on `.lesson-num`, `.note`, `.reading`, `.hz`, `.input`.

**Spacing:** scale `0.25 / 0.5 / 0.75 / 1 / 1.5 / 2 / 3rem`. Page gutter 1rem below 600px, 1.5rem above. Column max-width 40rem, centred. Header 3.5rem. Vertical gaps as given per screen.

**Radius:** 6px buttons and input; white keys `0 0 4px 4px`; black keys `0 0 3px 3px`; meter marker 1.5px; dot 50%. **Shadow:** none anywhere. **Borders:** 1px `--line`.

**Controls:** `.btn` height 2.75rem, padding 0 1.25rem, 1rem / 600, `--accent` fill, `--on-accent` text, no border, radius 6px; as `<a>` it is `display: inline-flex; align-items: center; text-decoration: none`. `.btn-text` is a `<button>` styled as a link: transparent, no border, `--accent`, 1rem, underline on hover/focus, min-height 2.75rem. `:disabled` → opacity 0.5, `cursor: not-allowed`. `.input` height 2.75rem, width 7ch, padding-left 0.5rem, 1px `--ink-2` border (3:1 non-text contrast), radius 6px, 1.5rem tabular text, `--bg` background. Links: `--accent`; body links underlined (`text-underline-offset: 0.15em`); header links underline only on hover/focus.

**Keyboard:** see §4 item 4 for geometry. Fill changes are instant (no transition), so the 150 ms blink is crisp.

**Motion:** one duration `--t: 150ms`. Used for the meter marker `left` (linear) and as the blink/refractory length in code. Nothing animates continuously; no breathing dot, no pulse. Under `prefers-reduced-motion: reduce`: `--t: 0ms` in CSS (marker jumps); the blink is a colour change, not motion, and stays.

## 9. Accessibility

- **Native controls only:** `<a>` for navigation, `<button>` for actions, `<input type="number">` with a visible `<label>`. Tab order = reading order: header links → h1 → content → buttons/input. Targets ≥ 44px (2.75rem buttons; 3.5rem lesson rows).
- **Focus:** `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }` everywhere; no `outline: none`. On route change focus moves to `<h1 tabindex="-1">`.
- **Piano keyboard** is `aria-hidden="true"` and non-interactive. Its information is carried by the big note ("Play C 4") and the progress `<ol>` with `aria-current="step"`.
- **Live regions** (all `aria-live="polite" aria-atomic="true"`): `.note` on Practice (changes once per accepted note), `.status` (changes on events only: Listening… / Hearing X / X ✓ / Heard X, not Y. / errors / completion — never per frame), `.reading` on Tuner (≤ 4 updates/s), `.msg` on Tuner. Marker and key colours are visual only.
- **Not colour alone:** expected key is named by the big note; correct is also `✓` text and a strip letter change; wrong is also a sentence; in tune is also the words **In tune**; done lessons use the word **Done**; up next uses the words **Up next**.
- **Contrast (WCAG AA):** `#111111`/`#FFFFFF` 18.9:1; `#6B6B6B`/`#FFFFFF` 5.3:1; `#2461E0`/`#FFFFFF` 5.4:1 (text and button); `#F2F2F2`/`#121212` 17:1; `#A3A3A3`/`#121212` 7.4:1; `#6B9BFF`/`#121212` 7.0:1; `#121212`/`#6B9BFF` 7.8:1. Non-text: `#2461E0` vs `#FFFFFF` 5.4:1, vs `#D9D9D9` 4.0:1, vs `#1A1A1A` 3.2:1; `#767676` vs `#FFFFFF` 4.5:1, vs `#D9D9D9` 3.4:1, vs `#1A1A1A` 3.8:1.
- **Reduced motion:** §8. **Zoom:** all sizes in rem; layout holds at 200% zoom and 360px wide with no horizontal scroll (keyboard is fluid, strip wraps).
- **Numbers:** tabular numerals; `inputmode="decimal"`; `min`/`max`/`step` on the input.
- `<html lang="en">`, viewport meta, one `<h1>` per view, `<main>` landmark, `<ol>` for lists.

## 10. Deliberately left out

- **Labels on keys** — the big note names the key; the dot anchors middle C. Letters on 28px keys would be noise and cannot fit a black key.
- **Green / red / amber, shakes, pops, nudges, confetti, sounds, scores, streaks, timers, attempt counters** — a wrong note is information; a correct one is already shown by the blink, the ✓ and the strip. Sound would collide with the piano the mic is listening to.
- **Directional hints ("C is to the left")** — the detector's octave errors during decay would make the app confidently correct a player who played the right key. "Heard C5, not C4." states only what was heard.
- **Per-lesson keyboard windows** — a fixed G3–C5 keeps middle C in one place across all lessons.
- **A "heard" outline key state** — "Hearing C4" in the status strip plus the "Play again" caption carry the same message in text.
- **−/+ stepper buttons** — the native number input already steps.
- **Toasts and "Saved" badges** — the message line and the readout turning **In tune** are the confirmation.
- **A stop button, level meter, device picker, gain control** — the browser's tab indicator shows the mic is on; it stops on the Lessons screen. A picker is settings beyond A4.
- **Onboarding, tooltips, help page, empty states** — one sentence on Lessons, one on Tuner and one hint per lesson are the whole manual; the list is never empty.
- **Octave-agnostic matching** — hand position is part of what a beginner learns.
- **Mid-lesson progress persistence, resume, stats, "reset progress"** — lessons are ≤ 15 notes; clearing site data is the reset.
- **History-aware back, breadcrumbs, logo, cards, shadows, web fonts, icons, theme toggle** — none help play the next note.
- **Accounts, rhythm, chords, playback, sheet music** — excluded by the brief.

## 11. CSS class inventory

Shared, in `src/style.css` (tokens, reset, shell, shared components). Per-view files hold only what one view uses.

**Tokens & base**
- `:root` — the ten tokens in §8 plus `--t: 150ms`.
- `body` — `background: var(--bg); color: var(--ink)`, font stack, line-height 1.5, margin 0.
- `.vh` — visually hidden (clip pattern).

**Shell / nav**
- `.header` — 3.5rem, flex, space-between, align centre, column gutter.
- `.wordmark` — `ptute`, 1rem / 600, `--ink`.
- `.header a` — `--accent`, no underline; underline on `:hover`, `:focus-visible`.
- `.view` — `<main>`: max-width 40rem, margin auto, gutter padding (1rem; 1.5rem ≥ 600px).
- `.view-title` — `<h1>`, 1.25rem / 600, line-height 1.2, margin 0 0 0.25rem.
- `.view-sub` — `<p>`, 0.875rem, `--ink-2`, margin 0 0 1.5rem.

**Buttons**
- `.btn` — primary (filled), for `<button>` and `<a>`.
- `.btn-text` — link-styled `<button>`.
- `.btn:disabled`, `.btn-text:disabled` — opacity 0.5, `cursor: not-allowed`.

**Big note (Practice and Tuner)**
- `.note` — container, min-height 6rem, text centred, tabular numerals.
- `.note-caption` — 0.875rem `--ink-2` (Practice only; absent on Tuner).
- `.note-letter` — 4rem / 600, line-height 1, letter-spacing −0.02em.
- `.note-octave` — 1.5rem / 400, `--ink-2`, margin-left 0.125rem.
- `.note.is-tuned` — letter and octave `--accent` (Tuner, |cents| ≤ 5).

**Keyboard & key states**
- `.keys` — container (relative, flex, 2px gap, `--line` background and 1px border, clamp height, `forced-color-adjust: none`).
- `.is-dim` — opacity 0.5 on `.keys`; on `.note` it turns the letter `--ink-2` instead (idle / error).
- `.key` — base (no border, no transition).
- `.key-white` — flex 1, `--key-white`, radius `0 0 4px 4px`.
- `.key-black` — absolute, uses `--i`, `--key-black`, radius `0 0 3px 3px`.
- `.key.is-on` — `--key-on` (expected).
- `.key.is-off` — `--key-off` (wrong heard).
- `.key.is-middle-c::after` — the 6px `--key-black` dot.

**Note progress**
- `.strip` — `<ol>`, flex, wrap, centred, gap 0.5rem, 0.875rem, list-style none, padding 0.
- `.strip-note` — `<li>`, `--ink`.
- `.strip-note.is-current` — `--accent`, 600.
- `.strip-note.is-done` — `--ink-2`.

**Status / readout (one slot)**
- `.status` — flex column, centred, gap 0.5rem, min-height 4.5rem, 0.875rem `--ink-2`, text centred.
- `.status.is-error .status-text` — colour `--ink`.
- `.status.is-wrong .status-text` — colour `--ink`, 1.125rem (the Heard sentence).
- `.status-text` — the one main line (Listening… / Hearing C4 / C4 ✓ / Heard D4, not E4. / error sentence).
- `.status-sub` — second line (privacy line under Start; Tuner hint after 3 semitone misses; octave hint after 2 octave misses), 0.875rem `--ink-2`.
- `.status-row` — flex row, gap 1rem, align centre (completion buttons).

**Error panel** — there is no separate panel; errors are `.status.is-error` with `.status-text` and a `.btn`.

**Per-view (not in style.css)**
- `src/views/home.css`: `.lessons`, `.lesson`, `.lesson-num`, `.lesson-title`, `.lesson-tag`.
- `src/views/practice.css`: only the three gaps of the keyboard → note → strip order.
- `src/views/tune.css`: `.meter`, `.meter-mark`, `.meter-mark.is-tuned`, `.reading`, `.reading.is-tuned`, `.hz`, `.ref`, `.field-label`, `.input`, `.msg`.

*Not checked on a real piano: the 0.9 clarity / 0.01 rms gates, the 1.5× strike rule and the 45 ms strike transient (all verified only against a synthesized piano-like recording in headless Chromium). Risk: with the sustain pedal held, a new note struck over a ringing one is read late or not at all while the two sounds overlap; play lessons without the pedal.*
