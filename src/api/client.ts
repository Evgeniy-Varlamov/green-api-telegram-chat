import { ApiError, classifyHttpError } from './errors'
import type { Credentials } from './types'

export const DEFAULT_API_URL = 'https://api.green-api.com'
export const DEFAULT_TIMEOUT_MS = 15_000

interface RequestOptions {
  httpMethod?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  pathSuffix?: string
  query?: Record<string, string | number>
  signal?: AbortSignal
  timeoutMs?: number
}

export function buildUrl(
  credentials: Credentials,
  method: string,
  { pathSuffix = '', query }: Pick<RequestOptions, 'pathSuffix' | 'query'> = {},
): string {
  const base = (credentials.apiUrl || DEFAULT_API_URL).trim().replace(/\/+$/, '')
  const path = `${base}/waInstance${credentials.idInstance}/${method}/${credentials.apiTokenInstance}${pathSuffix}`
  if (!query) return path
  const params = new URLSearchParams(
    Object.entries(query).map(([key, value]) => [key, String(value)]),
  )
  return `${path}?${params}`
}

export async function request<T>(
  credentials: Credentials,
  method: string,
  options: RequestOptions = {},
): Promise<T> {
  const { httpMethod = 'GET', body, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options

  // При неверном idInstance сервер не отвечает вовсе — без таймаута запрос висит бесконечно
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const abortFromOutside = () => controller.abort()
  if (signal?.aborted) controller.abort()
  signal?.addEventListener('abort', abortFromOutside)

  let response: Response
  let text: string
  try {
    response = await fetch(buildUrl(credentials, method, options), {
      method: httpMethod,
      // Единственный заголовок, который разрешает CORS-preflight GREEN-API
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })
    text = await response.text()
  } catch (error) {
    if (timedOut) throw new ApiError('timeout', 0, 'timeout')
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('aborted', 0, 'aborted')
    }
    throw new ApiError('network', 0, error instanceof Error ? error.message : 'network error')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abortFromOutside)
  }

  if (!response.ok) {
    throw new ApiError(classifyHttpError(response.status, text), response.status, text)
  }
  // receiveNotification по таймауту отвечает пустым телом или "null"
  if (!text) return null as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new ApiError('unknown', response.status, 'invalid JSON')
  }
}
