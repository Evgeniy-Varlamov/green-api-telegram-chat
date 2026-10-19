import { useCallback, useEffect, useRef, type Dispatch } from 'react'
import type { Action } from './actions'

/**
 * Действия, которые меняют общие данные: их получают все вкладки одного инстанса,
 * чтобы история в localStorage не расходилась. Выбор открытого чата у каждой вкладки свой.
 */
const SYNCED: ReadonlySet<Action['type']> = new Set<Action['type']>([
  'LOGOUT',
  'CHAT_CREATED',
  'MESSAGE_SEND_STARTED',
  'MESSAGE_SEND_SUCCEEDED',
  'MESSAGE_SEND_FAILED',
  'MESSAGE_RETRY',
  'MESSAGE_RECEIVED',
  'MESSAGE_STATUS_UPDATED',
  'CONNECTION_CHANGED',
  'INSTANCE_STATE_CHANGED',
  'QUOTA_EXCEEDED',
])

function asRemote(action: Action): Action {
  return action.type === 'CHAT_CREATED' ? { ...action, remote: true } : action
}

export function useTabSync(idInstance: string | undefined, dispatch: Dispatch<Action>) {
  const channel = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    if (!idInstance || typeof BroadcastChannel === 'undefined') return
    const ch = new BroadcastChannel(`greenchat:${idInstance}`)
    ch.onmessage = (event: MessageEvent<Action>) => dispatch(asRemote(event.data))
    channel.current = ch
    return () => {
      channel.current = null
      ch.onmessage = null
      // Закрываем на следующем тике: иначе только что отправленное действие
      // (например, LOGOUT, из-за которого канал и закрывается) может не дойти
      setTimeout(() => ch.close(), 0)
    }
  }, [idInstance, dispatch])

  return useCallback(
    (action: Action) => {
      dispatch(action)
      if (SYNCED.has(action.type)) channel.current?.postMessage(action)
    },
    [dispatch],
  )
}
