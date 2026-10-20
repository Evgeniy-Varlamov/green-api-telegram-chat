export type ThemeChoice = 'light' | 'dark' | 'auto'

/** Тот же ключ читает встроенный скрипт в index.html — до запуска React, чтобы не мигало */
export const THEME_KEY = 'greenchat:v1:theme'

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === 'light' || value === 'dark' || value === 'auto'
}

export function loadTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return isThemeChoice(value) ? value : 'auto'
  } catch {
    return 'auto'
  }
}

export function saveTheme(theme: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // без localStorage тема просто не запоминается
  }
}

/** auto — без атрибута: тему выбирает prefers-color-scheme (см. styles/tokens.css) */
export function applyTheme(theme: ThemeChoice): void {
  const root = document.documentElement
  if (theme === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}
