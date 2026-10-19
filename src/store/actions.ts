import type { Credentials } from '../api/types'
import type { ChatHint } from '../utils/notifications'
import type { ChatData, Connection, Message, MessageStatus } from './types'

export type Action =
  | { type: 'LOGIN'; credentials: Credentials; data?: ChatData }
  | { type: 'LOGOUT' }
  | { type: 'CHAT_CREATED'; chatId: string; phone?: string; username?: string; now: number }
  | { type: 'CHAT_OPENED'; chatId: string }
  | { type: 'CHAT_CLOSED' }
  | { type: 'MESSAGE_SEND_STARTED'; message: Message }
  | { type: 'MESSAGE_SEND_SUCCEEDED'; chatId: string; localId: string; idMessage: string }
  | { type: 'MESSAGE_SEND_FAILED'; chatId: string; localId: string }
  | { type: 'MESSAGE_RETRY'; chatId: string; localId: string }
  | { type: 'MESSAGE_RECEIVED'; message: Message; chat: ChatHint }
  | { type: 'MESSAGE_STATUS_UPDATED'; chatId: string; idMessage: string; status: MessageStatus }
  | { type: 'CONNECTION_CHANGED'; connection: Connection }
  | { type: 'INSTANCE_STATE_CHANGED'; stateInstance: string }
  | { type: 'QUOTA_EXCEEDED' }
  | { type: 'RECEIVING_DISABLED'; value: boolean }

export function createLocalId(): string {
  return `local-${crypto.randomUUID()}`
}

export function isLocalId(id: string): boolean {
  return id.startsWith('local-')
}
