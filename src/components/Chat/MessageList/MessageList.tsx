import { Fragment } from 'react'
import { useAutoScroll } from '../../../hooks/useAutoScroll'
import type { Message } from '../../../store/types'
import { formatDay, isSameDay } from '../../../utils/time'
import { MessageBubble } from './MessageBubble'
import styles from './MessageList.module.css'

interface MessageListProps {
  chatId: string
  messages: Message[]
  onRetry: (message: Message) => void
}

export function MessageList({ chatId, messages, onRetry }: MessageListProps) {
  const { ref, onScroll } = useAutoScroll(chatId, messages)

  return (
    <div
      ref={ref}
      className={styles.list}
      onScroll={onScroll}
      role="log"
      aria-live="polite"
      aria-label="Переписка"
    >
      {messages.length === 0 ? (
        <div className={styles.empty}>Напишите первое сообщение</div>
      ) : (
        <div className={styles.inner}>
          {messages.map((message, index) => {
            const prev = messages[index - 1]
            const newDay = !prev || !isSameDay(prev.timestamp, message.timestamp)
            return (
              <Fragment key={message.id}>
                {newDay && (
                  <div className={styles.day}>
                    <span>{formatDay(message.timestamp)}</span>
                  </div>
                )}
                <MessageBubble message={message} onRetry={onRetry} />
              </Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}
