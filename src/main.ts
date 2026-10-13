import './style.css'
import { getLesson } from './lessons.ts'
import * as home from './views/home.ts'
import * as practice from './views/practice.ts'
import * as tune from './views/tune.ts'

type Route = [view: typeof home, header: string, title: string]
const BACK = '<a href="#/">← Lessons</a>'
const TUNE = '<a href="#/tune">Tuner</a>'
const routes: Partial<Record<string, Route>> = {
  '#/': [home, `<span class="wordmark">ptute</span>${TUNE}`, 'ptute'],
  '#/tune': [tune, BACK, 'Tuner · ptute'],
}

const app = document.querySelector('#app')!
app.innerHTML = '<header class="header"></header><main class="view"></main>'
const header = app.querySelector('header')!
const main = app.querySelector('main')!
let cleanup = () => {}

function route() {
  const hash = location.hash || '#/'
  const m = /^#\/lesson\/([1-9]\d*)$/.exec(hash)
  const lesson = m && getLesson(Number(m[1]))
  const r: Route | undefined = lesson ? [practice, BACK + TUNE, `${lesson.title} · ptute`] : routes[hash]
  if (!r) return location.replace('#/')
  cleanup()
  main.replaceChildren()
  header.innerHTML = r[1]
  document.title = r[2]
  cleanup = r[0].mount(main, m ? { id: m[1] } : {})
  window.scrollTo(0, 0)
  main.querySelector('h1')?.focus()
}

addEventListener('hashchange', route)
route()
