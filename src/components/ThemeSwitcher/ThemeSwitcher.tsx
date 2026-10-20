import { useTheme } from '../../hooks/useTheme'
import type { ThemeChoice } from '../../utils/theme'
import styles from './ThemeSwitcher.module.css'

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
  { value: 'auto', label: 'Авто' },
]

const LABEL: Record<ThemeChoice, string> = { light: 'светлая', dark: 'тёмная', auto: 'авто' }
const NEXT: Record<ThemeChoice, ThemeChoice> = { auto: 'light', light: 'dark', dark: 'auto' }

export function ThemeIcon({ theme, size = 20 }: { theme: ThemeChoice; size?: number }) {
  if (theme === 'light') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    )
  }
  if (theme === 'dark') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
    </svg>
  )
}

/** Группа пунктов «Тема» для меню ☰ */
export function ThemeMenuItems() {
  const [theme, setTheme] = useTheme()
  return (
    <div role="group" aria-label="Тема" className={styles.group}>
      <span className={styles.groupLabel} aria-hidden="true">
        Тема
      </span>
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="menuitemradio"
          aria-checked={theme === value}
          className={styles.item}
          onClick={() => setTheme(value)}
        >
          <ThemeIcon theme={value} size={18} />
          <span className={styles.itemLabel}>{label}</span>
          {theme === value && (
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              aria-hidden="true"
              className={styles.check}
            >
              <path
                d="M3 8.5l3 3 7-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      ))}
    </div>
  )
}

/** Компактная кнопка для экрана входа: авто → светлая → тёмная → авто */
export function ThemeToggleButton({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useTheme()
  const label = `Тема: ${LABEL[theme]}. Переключить на «${LABEL[NEXT[theme]]}»`
  return (
    <button
      type="button"
      className={`${styles.toggle} ${className}`}
      aria-label={label}
      title={label}
      onClick={() => setTheme(NEXT[theme])}
    >
      <ThemeIcon theme={theme} />
    </button>
  )
}
