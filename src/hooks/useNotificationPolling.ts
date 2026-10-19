import { useEffect, type Dispatch } from 'react'
import { deleteNotification, receiveNotification } from '../api/greenApi'
import type { Credentials } from '../api/types'
import type { Action } from '../store/actions'
import { useAppDispatch, useAppState } from '../store/hooks'
import { parseNotification, type NotificationEvent } from '../utils/notifications'

const INITIAL_BACKOFF_MS = 1_000
const MAX_BACKOFF_MS = 30_000

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms)
    signal.addEventListener('abort', done, { once: true })
    function done() {
      clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
  })
}

function waitForOnline(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    window.addEventListener('online', done, { once: true })
    signal.addEventListener('abort', done, { once: true })
    function done() {
      window.removeEventListener('online', done)
      signal.removeEventListener('abort', done)
      resolve()
    }
  })
}

function apply(event: NotificationEvent, dispatch: Dispatch<Action>) {
  switch (event.type) {
    case 'message':
      dispatch({ type: 'MESSAGE_RECEIVED', message: event.message, chat: event.chat })
      break
    case 'status':
      dispatch({
        type: 'MESSAGE_STATUS_UPDATED',
        chatId: event.chatId,
        idMessage: event.idMessage,
        status: event.status,
      })
      break
    case 'state':
      dispatch({ type: 'INSTANCE_STATE_CHANGED', stateInstance: event.stateInstance })
      break
    case 'quota':
      dispatch({ type: 'QUOTA_EXCEEDED' })
      break
    case 'ignore':
      break
  }
}

/**
 * Цикл long polling: receiveNotification → обработка → deleteNotification.
 * Любое полученное уведомление удаляется из очереди, даже если оно не нужно,
 * иначе очередь «застревает» на нём. Повторная доставка безопасна: reducer идемпотентен.
 */
export async function runPolling(
  credentials: Credentials,
  dispatch: Dispatch<Action>,
  signal: AbortSignal,
): Promise<void> {
  let backoff = INITIAL_BACKOFF_MS

  while (!signal.aborted) {
    if (!navigator.onLine) {
      dispatch({ type: 'CONNECTION_CHANGED', connection: 'offline' })
      await waitForOnline(signal)
      // Не держим «Нет сети», пока висит первый long poll после восстановления
      if (!signal.aborted) dispatch({ type: 'CONNECTION_CHANGED', connection: 'polling' })
      continue
    }

    // Long poll висит до 20 с: при пропаже сети прерываем его сразу, а не ждём таймаута
    const request = new AbortController()
    const abortRequest = () => request.abort()
    signal.addEventListener('abort', abortRequest)
    window.addEventListener('offline', abortRequest)

    try {
      const notification = await receiveNotification(credentials, request.signal)
      dispatch({ type: 'CONNECTION_CHANGED', connection: 'polling' })
      backoff = INITIAL_BACKOFF_MS
      if (!notification) continue

      apply(parseNotification(notification.body), dispatch)
      await deleteNotification(credentials, notification.receiptId, signal)
    } catch {
      if (signal.aborted) return
      if (request.signal.aborted) continue // сеть пропала — на следующем шаге ждём online
      dispatch({ type: 'CONNECTION_CHANGED', connection: 'error' })
      await sleep(backoff, signal)
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
    } finally {
      signal.removeEventListener('abort', abortRequest)
      window.removeEventListener('offline', abortRequest)
    }
  }
}

/**
 * Подключается один раз на всё приложение; StrictMode-повтор эффекта отменяется через abort.
 *
 * Очередь уведомлений общая для всех вкладок, поэтому читает её только одна — та,
 * что держит Web Lock. Остальные ждут блокировку и получают события через BroadcastChannel
 * (см. store/tabSync). Когда ведущую вкладку закрывают, блокировку забирает следующая.
 */
export function useNotificationPolling() {
  const { credentials } = useAppState()
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!credentials) return
    const controller = new AbortController()
    let leading = false
    const poll = () => {
      leading = true
      return runPolling(credentials, dispatch, controller.signal)
    }

    // Заявку ставим на следующем тике: Chrome не убирает из очереди заявку, отменённую
    // в том же тике (так делает StrictMode в dev), и она висит «зомби» до получения блокировки
    const start = setTimeout(() => {
      if ('locks' in navigator && navigator.locks) {
        navigator.locks
          .request(
            `greenchat-poller:${credentials.idInstance}`,
            { signal: controller.signal },
            poll,
          )
          // AbortError: вкладку закрыли или вышли, пока ждали блокировку
          .catch(() => {})
      } else {
        void poll()
      }
    }, 0)

    return () => {
      clearTimeout(start)
      controller.abort()
      if (leading) dispatch({ type: 'CONNECTION_CHANGED', connection: 'idle' })
    }
  }, [credentials, dispatch])
}
