import html from '../../index.html?raw'
import { THEME_KEY } from './theme'

// Встроенный скрипт из index.html применяет тему до запуска React — проверяем его как есть
const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? ''

describe('скрипт темы в index.html', () => {
  afterEach(() => document.documentElement.removeAttribute('data-theme'))

  it('использует тот же ключ localStorage', () => {
    expect(script).toContain(`'${THEME_KEY}'`)
  })

  it.each([
    ['dark', 'dark'],
    ['light', 'light'],
    ['auto', null],
    ['мусор', null],
  ])('сохранено %s → data-theme=%s', (stored, expected) => {
    localStorage.setItem(THEME_KEY, stored)
    new Function(script)()
    expect(document.documentElement.getAttribute('data-theme')).toBe(expected)
  })
})
