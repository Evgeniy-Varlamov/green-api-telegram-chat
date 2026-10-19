import type { ChatHint } from '../utils/notifications'
import type { Action } from './actions'
import type { AppState, Chat, Message, MessageStatus } from './types'

export const initialState: AppState = {
  credentials: null,
  chats: {},
  messages: {},
  phoneToChatId: {},
  activeChatId: null,
  connection: 'idle',
  instanceState: null,
  quotaExceeded: false,
  receivingDisabled: false,
}

const STATUS_RANK: Record<MessageStatus, number> = {
  failed: -1,
  sending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
}

/** Статус не откатывается назад: «прочитано» не превращается в «доставлено». */
function nextStatus(current: MessageStatus | undefined, incoming: MessageStatus): MessageStatus {
  if (!current) return incoming
  if (incoming === 'failed') return STATUS_RANK[current] <= STATUS_RANK.sent ? 'failed' : current
  return STATUS_RANK[incoming] > STATUS_RANK[current] ? incoming : current
}

function upsertChat(state: AppState, hint: ChatHint, timestamp: number): AppState {
  const existing = state.chats[hint.chatId]
  const chat: Chat = existing
    ? {
        ...existing,
        name: existing.name ?? hint.name,
        phone: existing.phone ?? hint.phone,
        updatedAt: Math.max(existing.updatedAt, timestamp),
      }
    : { chatId: hint.chatId, name: hint.name, phone: hint.phone, unread: 0, updatedAt: timestamp }

  return {
    ...state,
    chats: { ...state.chats, [chat.chatId]: chat },
    phoneToChatId: chat.phone
      ? { ...state.phoneToChatId, [chat.phone]: chat.chatId }
      : state.phoneToChatId,
  }
}

function insertSorted(list: Message[], message: Message): Message[] {
  const last = list[list.length - 1]
  if (!last || last.timestamp <= message.timestamp) return [...list, message]
  const index = list.findIndex((m) => m.timestamp > message.timestamp)
  return [...list.slice(0, index), message, ...list.slice(index)]
}

function updateMessages(
  state: AppState,
  chatId: string,
  update: (list: Message[]) => Message[],
): AppState {
  const list = state.messages[chatId]
  if (!list) return state
  return { ...state, messages: { ...state.messages, [chatId]: update(list) } }
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...initialState,
        ...action.data,
        credentials: action.credentials,
      }

    case 'LOGOUT':
      return initialState

    case 'CHAT_CREATED': {
      const next = upsertChat(state, { chatId: action.chatId, phone: action.phone }, action.now)
      const chat = next.chats[action.chatId]
      return {
        ...next,
        chats: {
          ...next.chats,
          [action.chatId]: {
            ...chat,
            username: chat.username ?? action.username,
            unread: action.remote ? chat.unread : 0,
          },
        },
        messages: next.messages[action.chatId]
          ? next.messages
          : { ...next.messages, [action.chatId]: [] },
        activeChatId: action.remote ? state.activeChatId : action.chatId,
      }
    }

    case 'CHAT_OPENED': {
      const chat = state.chats[action.chatId]
      if (!chat) return state
      return {
        ...state,
        activeChatId: action.chatId,
        chats: { ...state.chats, [action.chatId]: { ...chat, unread: 0 } },
      }
    }

    case 'CHAT_CLOSED':
      return { ...state, activeChatId: null }

    case 'MESSAGE_SEND_STARTED': {
      const { message } = action
      const next = upsertChat(state, { chatId: message.chatId }, message.timestamp)
      const list = next.messages[message.chatId] ?? []
      return { ...next, messages: { ...next.messages, [message.chatId]: [...list, message] } }
    }

    case 'MESSAGE_SEND_SUCCEEDED':
      return updateMessages(state, action.chatId, (list) => {
        // Эхо outgoingAPIMessageReceived могло прийти раньше ответа sendMessage
        if (list.some((m) => m.id === action.idMessage)) {
          return list.filter((m) => m.id !== action.localId)
        }
        return list.map((m) =>
          m.id === action.localId
            ? { ...m, id: action.idMessage, status: nextStatus(m.status, 'sent') }
            : m,
        )
      })

    case 'MESSAGE_SEND_FAILED':
      return updateMessages(state, action.chatId, (list) =>
        list.map((m) => (m.id === action.localId ? { ...m, status: 'failed' } : m)),
      )

    case 'MESSAGE_RETRY':
      return updateMessages(state, action.chatId, (list) =>
        list.map((m) => (m.id === action.localId ? { ...m, status: 'sending' } : m)),
      )

    case 'MESSAGE_RECEIVED': {
      const { message, chat } = action
      const list = state.messages[message.chatId] ?? []
      if (list.some((m) => m.id === message.id)) return state

      const next = upsertChat(state, chat, message.timestamp)
      const current = next.chats[message.chatId]
      const countUnread = message.direction === 'in' && state.activeChatId !== message.chatId
      return {
        ...next,
        chats: {
          ...next.chats,
          [message.chatId]: countUnread ? { ...current, unread: current.unread + 1 } : current,
        },
        messages: { ...next.messages, [message.chatId]: insertSorted(list, message) },
      }
    }

    case 'MESSAGE_STATUS_UPDATED':
      return updateMessages(state, action.chatId, (list) =>
        list.map((m) =>
          m.id === action.idMessage ? { ...m, status: nextStatus(m.status, action.status) } : m,
        ),
      )

    case 'CONNECTION_CHANGED':
      return state.connection === action.connection
        ? state
        : { ...state, connection: action.connection }

    case 'INSTANCE_STATE_CHANGED':
      return { ...state, instanceState: action.stateInstance }

    case 'QUOTA_EXCEEDED':
      return { ...state, quotaExceeded: true }

    case 'RECEIVING_DISABLED':
      return { ...state, receivingDisabled: action.value }
  }
}
