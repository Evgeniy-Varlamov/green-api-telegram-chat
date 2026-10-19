import { request } from './client'
import { ApiError } from './errors'
import type {
  CheckAccountResponse,
  Credentials,
  DeleteNotificationResponse,
  ReceivedNotification,
  SendMessageResponse,
  SettingsResponse,
  StateInstanceResponse,
} from './types'

export const RECEIVE_TIMEOUT_SECONDS = 20
export const MAX_MESSAGE_LENGTH = 4000

export type CheckAccountResult =
  { exist: true; chatId: string; username?: string } | { exist: false }

export function getStateInstance(credentials: Credentials, signal?: AbortSignal) {
  return request<StateInstanceResponse>(credentials, 'getStateInstance', { signal })
}

export function getSettings(credentials: Credentials, signal?: AbortSignal) {
  return request<SettingsResponse>(credentials, 'getSettings', { signal })
}

export async function checkAccount(
  credentials: Credentials,
  phoneDigits: string,
): Promise<CheckAccountResult> {
  const response = await request<CheckAccountResponse>(credentials, 'checkAccount', {
    httpMethod: 'POST',
    body: { phoneNumber: Number(phoneDigits) },
  })

  if ('status' in response && response.status === false) {
    const reason = response.reason ?? response.data?.reason ?? ''
    if (reason.includes('not authorized') || reason.includes('starting')) {
      throw new ApiError('notAuthorizedInstance', 200, reason)
    }
    if (reason.includes('rate_limit') || reason.includes('limit')) {
      throw new ApiError('messengerLimited', 200, reason)
    }
    throw new ApiError('unknown', 200, reason)
  }

  const found = response as Exclude<CheckAccountResponse, { status: false }>
  if (!found.exist || !found.chatId) return { exist: false }
  return { exist: true, chatId: found.chatId, username: found.username }
}

export function sendMessage(credentials: Credentials, chatId: string, message: string) {
  return request<SendMessageResponse>(credentials, 'sendMessage', {
    httpMethod: 'POST',
    body: { chatId, message },
  })
}

export function receiveNotification(credentials: Credentials, signal?: AbortSignal) {
  return request<ReceivedNotification | null>(credentials, 'receiveNotification', {
    query: { receiveTimeout: RECEIVE_TIMEOUT_SECONDS },
    signal,
    timeoutMs: (RECEIVE_TIMEOUT_SECONDS + 10) * 1000,
  })
}

export function deleteNotification(
  credentials: Credentials,
  receiptId: number,
  signal?: AbortSignal,
) {
  return request<DeleteNotificationResponse>(credentials, 'deleteNotification', {
    httpMethod: 'DELETE',
    pathSuffix: `/${receiptId}`,
    signal,
  })
}

/** Отмечает сообщения чата прочитанными — у собеседника появляются две галочки. */
export function readChat(credentials: Credentials, chatId: string) {
  return request<{ setRead: boolean }>(credentials, 'readChat', {
    httpMethod: 'POST',
    body: { chatId },
  })
}
