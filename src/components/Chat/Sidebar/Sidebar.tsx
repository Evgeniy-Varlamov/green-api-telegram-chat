import { useEffect, useMemo, useRef, useState } from 'react'
import { useChatActions } from '../../../hooks/useChatActions'
import { useSession } from '../../../hooks/useSession'
import { useAppDispatch, useAppState } from '../../../store/hooks'
import { selectChatList } from '../../../store/selectors'
import { PopupCreateContact } from '../../PopupCreateContact/PopupCreateContact'
import { ContactItem } from './ContactItem'
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

function ConnectionStrip() {
  const { connection } = useAppState()
  if (connection === 'offline') return <div className={styles.connection}>Нет сети</div>
  if (connection === 'error') return <div className={styles.connection}>Соединение…</div>
  return null
}

export function Sidebar() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const { createChat } = useChatActions()
  const [creating, setCreating] = useState(false)
  const [query, setQuery] = useState('')

  const chats = useMemo(() => selectChatList(state), [state])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return chats
    const qDigits = q.replace(/\D/g, '')
    return chats.filter(
      ({ title, chat }) =>
        title.toLowerCase().includes(q) ||
        (qDigits.length > 0 && chat.phone?.includes(qDigits)) ||
        chat.username?.toLowerCase().includes(q),
    )
  }, [chats, query])

  return (
    <aside className={styles.sidebar}>
      <header className={styles.header}>
        <SidebarMenu />
        <h2 className={styles.title}>Чаты</h2>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Новый чат"
          title="Новый чат"
          onClick={() => setCreating(true)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <ConnectionStrip />

      {chats.length > 0 && (
        <div className={styles.search}>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Поиск"
            aria-label="Поиск по чатам"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {chats.length === 0 ? (
        <div className={styles.empty}>
          <p>Чатов пока нет</p>
          <button type="button" className={styles.emptyAction} onClick={() => setCreating(true)}>
            Создать чат по номеру телефона
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <p>Ничего не найдено</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {filtered.map((item) => (
            <ContactItem
              key={item.chat.chatId}
              item={item}
              active={item.chat.chatId === state.activeChatId}
              onSelect={(chatId) => dispatch({ type: 'CHAT_OPENED', chatId })}
            />
          ))}
        </ul>
      )}

      {creating && <PopupCreateContact onClose={() => setCreating(false)} onCreate={createChat} />}
    </aside>
  )
}
