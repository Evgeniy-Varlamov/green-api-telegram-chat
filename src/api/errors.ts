export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'suspended'
  | 'validation'
  | 'rateLimited'
  | 'messengerLimited'
  | 'quota'
  | 'notAuthorizedInstance'
  | 'webhookConfigured'
  | 'server'
  | 'aborted'
  | 'unknown'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number

  constructor(kind: ApiErrorKind, status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}

export function classifyHttpError(status: number, body: string): ApiErrorKind {
  const text = body.toLowerCase()
  if (status === 401 || status === 403) {
    return text.includes('suspended') ? 'suspended' : 'unauthorized'
  }
  if (status === 429) return 'rateLimited'
  if (status === 466) return 'quota'
  if (status === 469) return 'messengerLimited'
  if (status === 400) {
    if (text.includes('webhook')) return 'webhookConfigured'
    return 'validation'
  }
  if (status >= 500) return 'server'
  return 'unknown'
}

const MESSAGES: Record<ApiErrorKind, string> = {
  network: 'Нет соединения с GREEN-API. Проверьте интернет.',
  timeout: 'Сервер не ответил. Проверьте idInstance и адрес API.',
  unauthorized: 'Неверный idInstance или apiTokenInstance.',
  suspended: 'Аккаунт временно ограничен, отправка невозможна.',
  validation: 'Сервер отклонил запрос: проверьте введённые данные.',
  rateLimited: 'Слишком много запросов. Повторите чуть позже.',
  messengerLimited: 'Мессенджер временно ограничил аккаунт. Попробуйте через несколько часов.',
  quota: 'Превышены лимиты тарифа Developer.',
  notAuthorizedInstance: 'Инстанс не авторизован в мессенджере. Авторизуйте его в личном кабинете.',
  webhookConfigured:
    'В настройках инстанса задан Webhook URL — очистите его в личном кабинете и подождите минуту.',
  server: 'Сервис временно недоступен. Повторите позже.',
  aborted: 'Запрос отменён.',
  unknown: 'Неизвестная ошибка.',
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return MESSAGES[error.kind]
  return MESSAGES.unknown
}
