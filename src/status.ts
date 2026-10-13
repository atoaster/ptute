import { mic, type MicError } from './listen.ts'

// Copy from DESIGN.md §7: [sentence, action label]. No action = nothing the player can do here.
const COPY: Record<MicError, [string, string | null]> = {
  insecure: ['The microphone needs a secure page. Open ptute over https or on localhost.', null],
  unsupported: ["This browser can't listen to the microphone. Try a current Chrome, Firefox, Safari or Edge.", null],
  denied: ["Microphone access is blocked. Allow it in your browser's address bar, then try again.", 'Try again'],
  nodevice: ['No microphone found. Plug one in, then try again.', 'Try again'],
  stopped: ['The microphone stopped.', 'Start listening'],
}

export const el = (tag: string, className: string, textContent = '') =>
  Object.assign(document.createElement(tag), { className, textContent })

/** Fill `slot` (a `.status` element) with the idle "Start listening" state or a mic error.
 *  The action button calls mic.start(); `onResult` gets null on success or the error to show next. */
export function renderMicSlot(slot: HTMLElement, error: MicError | null, onResult: (e: MicError | null) => void) {
  const [text, action] = error ? COPY[error] : ['', 'Start listening']
  slot.classList.toggle('is-error', !!error)
  slot.replaceChildren()
  if (text) slot.append(el('p', 'status-text', text))
  if (action) {
    const btn = el('button', 'btn', action) as HTMLButtonElement
    btn.onclick = async () => {
      btn.disabled = true // label stays; disabled while the permission prompt is open
      onResult(await mic.start())
      // every outcome detaches this button: focus the new Try again, else the view's h1
      const next = slot.querySelector<HTMLElement>('button:enabled') ?? document.querySelector<HTMLElement>('h1')
      next?.focus()
    }
    slot.append(btn)
  }
  if (!error) slot.append(el('p', 'status-sub', 'Uses your microphone. Nothing is recorded or sent.'))
}
