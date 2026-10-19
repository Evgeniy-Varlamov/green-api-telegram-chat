import { useCallback } from 'react'
import { ApiError } from '../api/errors'
import { checkAccount, sendMessage } from '../api/greenApi'
import { createLocalId } from '../store/actions'
import { useAppDispatch, useAppState } from '../store/hooks'
import type { Message } from '../store/types'

export function useChatActions() {
  const dispatch = useAppDispatch()
  const { credentials, phoneToChatId } = useAppState()

  /** Находит chatId по номеру (кэш → checkAccount), создаёт и открывает чат. */
  const createChat = useCallback(
    async (phone: string) => {
      if (!credentials) return
      const cached = phoneToChatId[phone]
      if (cached) {
        dispatch({ type: 'CHAT_CREATED', chatId: cached, phone, now: Date.now() })
        return
      }
      const result = await checkAccount(credentials, phone)
      if (!result.exist) throw new ApiError('accountNotFound', 200, 'exist: false')
      dispatch({
        type: 'CHAT_CREATED',
        chatId: result.chatId,
        phone,
        username: result.username,
        now: Date.now(),
      })
    },
    [credentials, phoneToChatId, dispatch],
  )

  const deliver = useCallback(
    async (chatId: string, localId: string, text: string) => {
      if (!credentials) return
      try {
        const { idMessage } = await sendMessage(credentials, chatId, text)
        dispatch({ type: 'MESSAGE_SEND_SUCCEEDED', chatId, localId, idMessage })
      } catch {
        dispatch({ type: 'MESSAGE_SEND_FAILED', chatId, localId })
      }
    },
    [credentials, dispatch],
  )

  const sendText = useCallback(
    (chatId: string, text: string) => {
      const message: Message = {
        id: createLocalId(),
        chatId,
        direction: 'out',
        text,
        timestamp: Date.now(),
        status: 'sending',
      }
      dispatch({ type: 'MESSAGE_SEND_STARTED', message })
      return deliver(chatId, message.id, text)
    },
    [deliver, dispatch],
  )

  const retry = useCallback(
    (message: Message) => {
      dispatch({ type: 'MESSAGE_RETRY', chatId: message.chatId, localId: message.id })
      return deliver(message.chatId, message.id, message.text)
    },
    [deliver, dispatch],
  )

  return { createChat, sendText, retry }
}
