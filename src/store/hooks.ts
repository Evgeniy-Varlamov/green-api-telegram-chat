import { useContext, type Dispatch } from 'react'
import type { Action } from './actions'
import { DispatchContext, StateContext } from './context'
import type { AppState } from './types'

export function useAppState(): AppState {
  const state = useContext(StateContext)
  if (!state) throw new Error('useAppState must be used within AppProvider')
  return state
}

export function useAppDispatch(): Dispatch<Action> {
  const dispatch = useContext(DispatchContext)
  if (!dispatch) throw new Error('useAppDispatch must be used within AppProvider')
  return dispatch
}
