import type { Message, MessageStatus } from '../../../store/types'
import { formatTime } from '../../../utils/time'
import styles from './MessageList.module.css'

const STATUS_LABEL: Record<MessageStatus, string> = {
  sending: 'Отправляется',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не отправлено',
}

function StatusIcon({ status }: { status: MessageStatus }) {
  if (status === 'sending') {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    )
  }
  if (status === 'failed') {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path d="M8 4v5M8 11.5v.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }
  const double = status === 'delivered' || status === 'read'
  return (
    <svg
      width={double ? 18 : 14}
      height="14"
      viewBox={double ? '0 0 20 16' : '0 0 16 16'}
      aria-hidden="true"
    >
      <path
        d="M2 8.5l3.5 3.5L13 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {double && (
        <path
          d="M9 12l7.5-7.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}

interface MessageBubbleProps {
  message: Message
  onRetry: (message: Message) => void
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const out = message.direction === 'out'
  const { status } = message
  return (
    <div className={`${styles.row} ${out ? styles.rowOut : ''}`}>
      <div className={`${styles.bubble} ${out ? styles.bubbleOut : styles.bubbleIn}`}>
        {message.unsupported ? (
          <span className={styles.unsupported}>Неподдерживаемый тип сообщения</span>
        ) : (
          <span className={styles.text}>{message.text}</span>
        )}
        <span className={styles.meta}>
          <time dateTime={new Date(message.timestamp).toISOString()}>
            {formatTime(message.timestamp)}
          </time>
          {out && status && (
            <span
              className={`${styles.status} ${styles[`status_${status}`] ?? ''}`}
              role="img"
              aria-label={STATUS_LABEL[status]}
              title={STATUS_LABEL[status]}
            >
              <StatusIcon status={status} />
            </span>
          )}
        </span>
      </div>
      {out && status === 'failed' && (
        <button type="button" className={styles.retry} onClick={() => onRetry(message)}>
          Повторить
        </button>
      )}
    </div>
  )
}
