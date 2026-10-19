import { useEffect, useRef, useSyncExternalStore } from 'react'
import { readChat } from '../api/greenApi'
import { useAppState } from '../store/hooks'
import type { Message } from '../store/types'

function subscribeVisibility(callback: () => void) {
  document.addEventListener('visibilitychange', callback)
  return () => document.removeEventListener('visibilitychange', callback)
}

const isVisible = () => document.visibilityState === 'visible'

/**
 * Отмечает открытый чат прочитанным в мессенджере, когда в нём есть новое входящее
 * сообщение и вкладка видна. Каждое сообщение отмечается один раз.
 */
export function useMarkRead(chatId: string | null, messages: Message[]) {
  const { credentials } = useAppState()
  const visible = useSyncExternalStore(subscribeVisibility, isVisible)
  const marked = useRef<string | null>(null)

  const lastIncoming = messages.findLast((m) => m.direction === 'in')?.id

  useEffect(() => {
    if (!credentials || !chatId || !lastIncoming || !visible) return
    const key = `${chatId}:${lastIncoming}`
    if (marked.current === key) return
    marked.current = key
    // Ошибка не критична: в худшем случае у собеседника останется одна галочка
    readChat(credentials, chatId).catch(() => {
      if (marked.current === key) marked.current = null
    })
  }, [credentials, chatId, lastIncoming, visible])
}
