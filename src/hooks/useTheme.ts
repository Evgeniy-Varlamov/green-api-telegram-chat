import { useSyncExternalStore } from 'react'
import {
  applyTheme,
  isThemeChoice,
  loadTheme,
  saveTheme,
  THEME_KEY,
  type ThemeChoice,
} from '../utils/theme'

// Тема — общее состояние вне React: одно на приложение, синхронизируется между вкладками
let current: ThemeChoice = loadTheme()
const listeners = new Set<() => void>()

function update(theme: ThemeChoice) {
  current = theme
  applyTheme(theme)
  listeners.forEach((listener) => listener())
}

export function setTheme(theme: ThemeChoice): void {
  saveTheme(theme)
  update(theme)
}

window.addEventListener('storage', (event) => {
  if (event.key === THEME_KEY) update(isThemeChoice(event.newValue) ? event.newValue : 'auto')
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme(): [ThemeChoice, (theme: ThemeChoice) => void] {
  return [useSyncExternalStore(subscribe, () => current), setTheme]
}
