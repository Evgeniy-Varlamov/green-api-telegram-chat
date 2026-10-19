import { useEffect, useRef, useState } from 'react'
import { useSession } from '../../../hooks/useSession'
import styles from './Sidebar.module.css'

function SidebarMenu() {
  const { logout } = useSession()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === 'Escape'
          : !ref.current?.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div className={styles.menu} ref={ref}>
      <button
        type="button"
        className={styles.iconButton}
        aria-label="Меню"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open && (
        <div className={styles.dropdown} role="menu">
          <button type="button" role="menuitem" onClick={() => logout()}>
            Выйти
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.danger}
            onClick={() => logout({ clearData: true })}
          >
            Выйти и очистить данные
          </button>
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <header className={styles.header}>
        <SidebarMenu />
        <h2 className={styles.title}>Чаты</h2>
      </header>
      <div className={styles.empty}>Создайте чат по номеру телефона</div>
    </aside>
  )
}
