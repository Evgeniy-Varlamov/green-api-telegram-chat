import { createContext, type Dispatch } from 'react'
import type { Action } from './actions'
import type { AppState } from './types'

export const StateContext = createContext<AppState | null>(null)
export const DispatchContext = createContext<Dispatch<Action> | null>(null)
