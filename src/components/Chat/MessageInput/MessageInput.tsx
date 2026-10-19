import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { MAX_MESSAGE_LENGTH } from '../../../api/greenApi'
import styles from './MessageInput.module.css'

const COUNTER_FROM = 3500
const MAX_HEIGHT_PX = 160

interface MessageInputProps {
  onSend: (text: string) => void
}

export function MessageInput({ onSend }: MessageInputProps) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  const length = text.length
  const tooLong = length > MAX_MESSAGE_LENGTH
  const canSend = text.trim().length > 0 && !tooLong

  // Поле растёт по содержимому до MAX_HEIGHT_PX
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
  }, [text])

  function send() {
    if (!canSend) return
    onSend(text.trim())
    setText('')
    ref.current?.focus()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    send()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send()
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <textarea
          ref={ref}
          className={styles.textarea}
          rows={1}
          placeholder="Сообщение"
          aria-label="Сообщение"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        {length > COUNTER_FROM && (
          <span className={`${styles.counter} ${tooLong ? styles.counterError : ''}`}>
            {length}/{MAX_MESSAGE_LENGTH}
          </span>
        )}
      </div>
      <button type="submit" className={styles.send} disabled={!canSend} aria-label="Отправить">
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.99.99 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z"
            fill="currentColor"
          />
        </svg>
      </button>
    </form>
  )
}
