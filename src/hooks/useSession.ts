import { useCallback, useEffect } from 'react'
import { ApiError } from '../api/errors'
import { getSettings, getStateInstance } from '../api/greenApi'
import type { Credentials } from '../api/types'
import { useAppDispatch, useAppState } from '../store/hooks'
import { clearChatData, loadChatData } from '../store/persistence'

async function isReceivingDisabled(credentials: Credentials): Promise<boolean | null> {
  try {
    const settings = await getSettings(credentials)
    return Boolean(settings.webhookUrl) || settings.incomingWebhook !== 'yes'
  } catch {
    return null
  }
}

export function useSession() {
  const dispatch = useAppDispatch()
  const { credentials } = useAppState()

  const login = useCallback(
    async (next: Credentials) => {
      const { stateInstance } = await getStateInstance(next)
      if (stateInstance !== 'authorized') {
        throw new ApiError('notAuthorizedInstance', 200, stateInstance)
      }
      dispatch({ type: 'LOGIN', credentials: next, data: loadChatData(next.idInstance) })
    },
    [dispatch],
  )

  const logout = useCallback(
    ({ clearData = false }: { clearData?: boolean } = {}) => {
      if (clearData && credentials) clearChatData(credentials.idInstance)
      dispatch({ type: 'LOGOUT' })
    },
    [credentials, dispatch],
  )

  return { credentials, login, logout }
}

/**
 * После входа и после восстановления сессии проверяет, что токен ещё действителен
 * и что получение уведомлений включено в настройках инстанса. Подключается один раз в App.
 */
export function useSessionCheck() {
  const dispatch = useAppDispatch()
  const { credentials } = useAppState()

  useEffect(() => {
    if (!credentials) return
    let cancelled = false
    ;(async () => {
      try {
        const { stateInstance } = await getStateInstance(credentials)
        if (cancelled) return
        dispatch({ type: 'INSTANCE_STATE_CHANGED', stateInstance })
      } catch (error) {
        if (cancelled) return
        if (error instanceof ApiError && error.kind === 'unauthorized') {
          dispatch({ type: 'LOGOUT' })
          return
        }
      }
      const disabled = await isReceivingDisabled(credentials)
      if (!cancelled && disabled !== null) dispatch({ type: 'RECEIVING_DISABLED', value: disabled })
    })()
    return () => {
      cancelled = true
    }
  }, [credentials, dispatch])
}
