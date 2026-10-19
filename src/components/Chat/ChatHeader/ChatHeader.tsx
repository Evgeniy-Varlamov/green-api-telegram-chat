import { chatTitle } from '../../../store/selectors'
import type { Chat } from '../../../store/types'
import { formatPhone } from '../../../utils/phone'
import { Avatar } from '../../Avatar/Avatar'
import styles from './ChatHeader.module.css'

interface ChatHeaderProps {
  chat: Chat
  onBack: () => void
}

function subtitle(chat: Chat): string | null {
  if (chat.name && chat.phone) return formatPhone(chat.phone)
  if (chat.username && (chat.name || chat.phone)) return chat.username
  return null
}

export function ChatHeader({ chat, onBack }: ChatHeaderProps) {
  const title = chatTitle(chat)
  const sub = subtitle(chat)
  return (
    <header className={styles.header}>
      <button type="button" className={styles.back} aria-label="Назад к чатам" onClick={onBack}>
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M15 5l-7 7 7 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <Avatar title={title} colorKey={chat.chatId} size={40} />
      <div className={styles.text}>
        <h2 className={styles.title}>{title}</h2>
        {sub && <p className={styles.subtitle}>{sub}</p>}
      </div>
    </header>
  )
}
