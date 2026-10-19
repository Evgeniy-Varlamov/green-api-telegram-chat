import { useEffect, useReducer, useRef, type ReactNode } from 'react'
import { DispatchContext, StateContext } from './context'
import {
  clearCredentials,
  loadChatData,
  loadCredentials,
  saveChatData,
  saveCredentials,
} from './persistence'
import { initialState, reducer } from './reducer'
import type { AppState } from './types'

const SAVE_DELAY_MS = 300

function restoreSession(): AppState {
  const credentials = loadCredentials()
  if (!credentials) return initialState
  return reducer(initialState, {
    type: 'LOGIN',
    credentials,
    data: loadChatData(credentials.idInstance),
  })
}

function usePersistence(state: AppState) {
  const { credentials, chats, messages, phoneToChatId } = state

  useEffect(() => {
    if (credentials) saveCredentials(credentials)
    else clearCredentials()
  }, [credentials])

  const pending = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!credentials) return
    const save = () => {
      pending.current = null
      saveChatData(credentials.idInstance, { chats, messages, phoneToChatId })
    }
    pending.current = save
    const timer = setTimeout(save, SAVE_DELAY_MS)
    return () => {
      clearTimeout(timer)
      pending.current = null
    }
  }, [credentials, chats, messages, phoneToChatId])

  // Не теряем последние изменения, если вкладку закрыли до срабатывания таймера
  useEffect(() => {
    const flush = () => pending.current?.()
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [])
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, restoreSession)
  usePersistence(state)

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  )
}
