import type { ChatListItem } from '../../../store/selectors'
import { formatListTime } from '../../../utils/time'
import { Avatar } from '../../Avatar/Avatar'
import styles from './Sidebar.module.css'

interface ContactItemProps {
  item: ChatListItem
  active: boolean
  onSelect: (chatId: string) => void
}

function preview({ lastMessage }: ChatListItem): string {
  if (!lastMessage) return 'Нет сообщений'
  const text = lastMessage.unsupported ? 'Неподдерживаемое сообщение' : lastMessage.text
  return lastMessage.direction === 'out' ? `Вы: ${text}` : text
}

export function ContactItem({ item, active, onSelect }: ContactItemProps) {
  const { chat, title, lastMessage } = item
  return (
    <li>
      <button
        type="button"
        className={`${styles.item} ${active ? styles.itemActive : ''}`}
        aria-current={active ? 'true' : undefined}
        onClick={() => onSelect(chat.chatId)}
      >
        <Avatar title={title} colorKey={chat.chatId} />
        <span className={styles.itemBody}>
          <span className={styles.itemRow}>
            <span className={styles.itemName}>{title}</span>
            {lastMessage && (
              <span className={styles.itemTime}>{formatListTime(lastMessage.timestamp)}</span>
            )}
          </span>
          <span className={styles.itemRow}>
            <span className={styles.itemPreview}>{preview(item)}</span>
            {chat.unread > 0 && (
              <span className={styles.badge} aria-label={`Непрочитанных: ${chat.unread}`}>
                {chat.unread}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  )
}
