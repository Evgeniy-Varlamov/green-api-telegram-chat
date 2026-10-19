import type { MessageData, NotificationBody } from '../api/types'
import type { Message, MessageStatus } from '../store/types'

export interface ChatHint {
  chatId: string
  name?: string
  phone?: string
}

export type NotificationEvent =
  | { type: 'message'; message: Message; chat: ChatHint }
  | { type: 'status'; chatId: string; idMessage: string; status: MessageStatus }
  | { type: 'state'; stateInstance: string }
  | { type: 'quota' }
  | { type: 'ignore' }

const IGNORE: NotificationEvent = { type: 'ignore' }

function extractText(data: MessageData | undefined): string | null {
  if (!data) return null
  if (data.typeMessage === 'textMessage') return data.textMessageData?.textMessage ?? null
  if (data.typeMessage === 'extendedTextMessage') return data.extendedTextMessageData?.text ?? null
  return null
}

function toStatus(status: string | undefined): MessageStatus | null {
  switch (status) {
    case 'sent':
    case 'delivered':
    case 'read':
      return status
    case undefined:
      return null
    default:
      // failed, noAccount, notInGroup и т. п.
      return 'failed'
  }
}

/** Переводит уведомление GREEN-API в доменное событие. Никогда не бросает исключений. */
export function parseNotification(body: NotificationBody | null | undefined): NotificationEvent {
  if (!body || typeof body.typeWebhook !== 'string') return IGNORE
  const timestamp = (body.timestamp ?? Date.now() / 1000) * 1000

  switch (body.typeWebhook) {
    case 'incomingMessageReceived':
    case 'outgoingMessageReceived':
    case 'outgoingAPIMessageReceived': {
      const sender = body.senderData
      if (!sender?.chatId || !body.idMessage) return IGNORE
      const incoming = body.typeWebhook === 'incomingMessageReceived'
      const text = extractText(body.messageData)
      const message: Message = {
        id: body.idMessage,
        chatId: sender.chatId,
        direction: incoming ? 'in' : 'out',
        text: text ?? '',
        timestamp,
        ...(incoming ? {} : { status: 'sent' as const }),
        ...(text === null ? { unsupported: true } : {}),
      }
      const name = incoming
        ? sender.chatName || sender.senderName || sender.senderContactName
        : sender.chatName
      const phone =
        incoming && sender.senderPhoneNumber ? String(sender.senderPhoneNumber) : undefined
      return {
        type: 'message',
        message,
        chat: { chatId: sender.chatId, ...(name ? { name } : {}), ...(phone ? { phone } : {}) },
      }
    }

    case 'outgoingMessageStatus': {
      const status = toStatus(body.status)
      if (!body.chatId || !body.idMessage || !status) return IGNORE
      return { type: 'status', chatId: body.chatId, idMessage: body.idMessage, status }
    }

    case 'stateInstanceChanged':
      return body.stateInstance ? { type: 'state', stateInstance: body.stateInstance } : IGNORE

    case 'quotaExceeded':
      return { type: 'quota' }

    default:
      return IGNORE
  }
}
