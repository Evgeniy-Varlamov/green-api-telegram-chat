import type { Credentials } from '../api/types'

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface Message {
  /** idMessage от API; до ответа sendMessage — локальный `local-<uuid>` */
  id: string
  chatId: string
  direction: 'in' | 'out'
  text: string
  /** ms */
  timestamp: number
  status?: MessageStatus
  /** Не текстовое сообщение — по ТЗ показываем только заглушку */
  unsupported?: boolean
}

export interface Chat {
  chatId: string
  phone?: string
  name?: string
  username?: string
  unread: number
  /** ms, для сортировки списка */
  updatedAt: number
}

export type Connection = 'idle' | 'polling' | 'error' | 'offline'

export interface ChatData {
  chats: Record<string, Chat>
  messages: Record<string, Message[]>
  phoneToChatId: Record<string, string>
}

export interface AppState extends ChatData {
  credentials: Credentials | null
  activeChatId: string | null
  connection: Connection
  instanceState: string | null
  quotaExceeded: boolean
  receivingDisabled: boolean
}
