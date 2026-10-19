import type { Credentials } from '../api/types'
import type { ChatData, Message } from './types'

const PREFIX = 'greenchat:v1'
const AUTH_KEY = `${PREFIX}:auth`
const dataKey = (idInstance: string) => `${PREFIX}:data:${idInstance}`

// localStorage может быть недоступен (приватный режим, запрет cookies) —
// тогда приложение работает без сохранения.
function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

function isCredentials(value: unknown): value is Credentials {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.apiUrl === 'string' &&
    typeof v.idInstance === 'string' &&
    typeof v.apiTokenInstance === 'string'
  )
}

export function loadCredentials(): Credentials | null {
  const value = read<unknown>(AUTH_KEY)
  return isCredentials(value) ? value : null
}

export function saveCredentials(credentials: Credentials): void {
  write(AUTH_KEY, credentials)
}

export function clearCredentials(): void {
  remove(AUTH_KEY)
}

export function loadChatData(idInstance: string): ChatData | undefined {
  const value = read<ChatData>(dataKey(idInstance))
  if (!value || typeof value.chats !== 'object' || typeof value.messages !== 'object') {
    return undefined
  }
  // Сообщения, не успевшие отправиться до закрытия вкладки, помечаем как неотправленные
  const messages: Record<string, Message[]> = {}
  for (const [chatId, list] of Object.entries(value.messages)) {
    messages[chatId] = list.map((m) => (m.status === 'sending' ? { ...m, status: 'failed' } : m))
  }
  return { chats: value.chats, messages, phoneToChatId: value.phoneToChatId ?? {} }
}

export function saveChatData(idInstance: string, data: ChatData): void {
  write(dataKey(idInstance), {
    chats: data.chats,
    messages: data.messages,
    phoneToChatId: data.phoneToChatId,
  })
}

export function clearChatData(idInstance: string): void {
  remove(dataKey(idInstance))
}
