import { formatPhone } from '../utils/phone'
import type { AppState, Chat, Message } from './types'

export interface ChatListItem {
  chat: Chat
  title: string
  lastMessage?: Message
}

export function chatTitle(chat: Chat): string {
  if (chat.name) return chat.name
  if (chat.phone) return formatPhone(chat.phone)
  if (chat.username) return chat.username
  return chat.chatId
}

export function selectChatList(state: AppState): ChatListItem[] {
  return Object.values(state.chats)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((chat) => {
      const list = state.messages[chat.chatId]
      return { chat, title: chatTitle(chat), lastMessage: list?.[list.length - 1] }
    })
}

export function selectActiveChat(state: AppState): Chat | null {
  return state.activeChatId ? (state.chats[state.activeChatId] ?? null) : null
}

const EMPTY: Message[] = []

export function selectActiveMessages(state: AppState): Message[] {
  return state.activeChatId ? (state.messages[state.activeChatId] ?? EMPTY) : EMPTY
}
