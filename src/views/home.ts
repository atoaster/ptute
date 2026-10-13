import './home.css'
import { isDone, lessons } from '../lessons.ts'
import { mic } from '../listen.ts'

/** Render the view into `root`; return a cleanup that stops any mic/timers. */
export function mount(root: HTMLElement, _: Record<string, string>): () => void {
  mic.stop()
  const next = lessons.findIndex((_, i) => !isDone(i + 1))
  root.innerHTML = `<h1 class="view-title" tabindex="-1">Lessons</h1>
<p class="view-sub">Play on your real piano. ptute listens and lights the next key.</p>
<ol class="lessons"></ol>`
  const ol = root.querySelector('ol')!
  lessons.forEach(({ title }, i) => {
    const id = i + 1
    const [tag, cls] = isDone(id) ? ['Done', 'is-done'] : i === next ? ['Up next', 'is-next'] : ['', '']
    const li = document.createElement('li')
    li.innerHTML = `<a class="lesson" href="#/lesson/${id}"><span class="lesson-num">${id}</span><span class="lesson-title"></span><span class="lesson-tag ${cls}"></span></a>`
    li.querySelector('.lesson-title')!.textContent = title
    li.querySelector('.lesson-tag')!.textContent = tag
    ol.append(li)
  })
  return () => {}
}
