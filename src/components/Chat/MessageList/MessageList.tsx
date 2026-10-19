import { Fragment } from 'react'
import { useAutoScroll } from '../../../hooks/useAutoScroll'
import type { Message } from '../../../store/types'
import { formatDay, isSameDay } from '../../../utils/time'
import { MessageBubble } from './MessageBubble'
import styles from './MessageList.module.css'

const STACK_WINDOW_MS = 5 * 60 * 1000

/** Сообщения одного направления с разницей до 5 минут в один день образуют группу */
function sameGroup(a: Message | undefined, b: Message | undefined): boolean {
  return (
    !!a &&
    !!b &&
    a.direction === b.direction &&
    isSameDay(a.timestamp, b.timestamp) &&
    Math.abs(b.timestamp - a.timestamp) < STACK_WINDOW_MS
  )
}

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
                <MessageBubble
                  message={message}
                  onRetry={onRetry}
                  stackTop={!newDay && sameGroup(prev, message)}
                  stackBottom={sameGroup(message, messages[index + 1])}
                />
              </Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}
