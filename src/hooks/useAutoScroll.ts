import { useLayoutEffect, useRef } from 'react'
import type { Message } from '../store/types'

const NEAR_BOTTOM_PX = 80

/**
 * Прокручивает ленту вниз при открытии чата, при своём сообщении
 * и при входящем — только если пользователь и так был внизу.
 */
export function useAutoScroll(chatId: string | null, messages: Message[]) {
  const ref = useRef<HTMLDivElement>(null)
  const wasNearBottom = useRef(true)
  const prev = useRef<{ chatId: string | null; count: number }>({ chatId: null, count: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const last = messages[messages.length - 1]
    const chatChanged = prev.current.chatId !== chatId
    const added = messages.length > prev.current.count
    prev.current = { chatId, count: messages.length }

    if (chatChanged || (added && (last?.direction === 'out' || wasNearBottom.current))) {
      el.scrollTop = el.scrollHeight
      wasNearBottom.current = true
    }
  }, [chatId, messages])

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    wasNearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX
  }

  return { ref, onScroll }
}
