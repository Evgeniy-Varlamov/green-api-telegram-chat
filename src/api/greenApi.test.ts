import { buildUrl } from './client'
import { ApiError, errorMessage } from './errors'
import {
  checkAccount,
  deleteNotification,
  getStateInstance,
  receiveNotification,
  sendMessage,
} from './greenApi'
import type { Credentials } from './types'

const credentials: Credentials = {
  apiUrl: 'https://api.green-api.com/',
  idInstance: '1101000001',
  apiTokenInstance: 'secret',
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const respond = (status: number, body: string) =>
  fetchMock.mockResolvedValueOnce(new Response(body, { status }))

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]
  return { url: String(url), init: init ?? {} }
}

describe('buildUrl', () => {
  it('собирает URL и убирает слэш в конце apiUrl', () => {
    expect(buildUrl(credentials, 'getStateInstance')).toBe(
      'https://api.green-api.com/waInstance1101000001/getStateInstance/secret',
    )
  })

  it('использует адрес по умолчанию, если apiUrl пустой', () => {
    expect(buildUrl({ ...credentials, apiUrl: '' }, 'x')).toMatch(
      /^https:\/\/api\.green-api\.com\//,
    )
  })

  it('добавляет суффикс пути и query', () => {
    expect(buildUrl(credentials, 'deleteNotification', { pathSuffix: '/5', query: { a: 1 } })).toBe(
      'https://api.green-api.com/waInstance1101000001/deleteNotification/secret/5?a=1',
    )
  })
})

describe('методы API', () => {
  it('getStateInstance', async () => {
    respond(200, '{"stateInstance":"authorized"}')
    await expect(getStateInstance(credentials)).resolves.toEqual({ stateInstance: 'authorized' })
    expect(lastCall().init.method).toBe('GET')
  })

  it('sendMessage отправляет JSON с единственным заголовком Content-Type', async () => {
    respond(200, '{"idMessage":"srv-1"}')
    await expect(sendMessage(credentials, '100', 'Привет')).resolves.toEqual({
      idMessage: 'srv-1',
    })
    const { url, init } = lastCall()
    expect(url).toMatch(/\/sendMessage\/secret$/)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(String(init.body))).toEqual({ chatId: '100', message: 'Привет' })
  })

  it('receiveNotification передаёт receiveTimeout и возвращает null на пустой ответ', async () => {
    respond(200, '')
    await expect(receiveNotification(credentials)).resolves.toBeNull()
    expect(lastCall().url).toMatch(/receiveNotification\/secret\?receiveTimeout=20$/)

    respond(200, 'null')
    await expect(receiveNotification(credentials)).resolves.toBeNull()
  })

  it('deleteNotification использует DELETE и receiptId в пути', async () => {
    respond(200, '{"result":true}')
    await deleteNotification(credentials, 42)
    const { url, init } = lastCall()
    expect(url).toMatch(/\/deleteNotification\/secret\/42$/)
    expect(init.method).toBe('DELETE')
  })
})

describe('checkAccount', () => {
  it('найден: возвращает chatId, номер передаётся числом', async () => {
    respond(200, '{"exist":true,"chatId":"10000000","username":"@user"}')
    await expect(checkAccount(credentials, '79991234567')).resolves.toEqual({
      exist: true,
      chatId: '10000000',
      username: '@user',
    })
    expect(JSON.parse(String(lastCall().init.body))).toEqual({ phoneNumber: 79991234567 })
  })

  it('не найден', async () => {
    respond(200, '{"exist":false,"chatId":""}')
    await expect(checkAccount(credentials, '79991234567')).resolves.toEqual({ exist: false })
  })

  it('инстанс не авторизован', async () => {
    respond(200, '{"status":false,"reason":"instance is starting or not authorized"}')
    await expect(checkAccount(credentials, '79991234567')).rejects.toMatchObject({
      kind: 'notAuthorizedInstance',
    })
  })

  it('лимит проверки номеров', async () => {
    respond(
      200,
      '{"status":false,"data":{"status":"fail","reason":"rate_limit_exceeded","retryAfter":1}}',
    )
    await expect(checkAccount(credentials, '79991234567')).rejects.toMatchObject({
      kind: 'messengerLimited',
    })
  })
})

describe('ошибки', () => {
  it.each([
    [401, '', 'unauthorized'],
    [403, 'Your account is suspended', 'suspended'],
    [400, 'Validation failed', 'validation'],
    [400, 'Custom webhook url is set', 'webhookConfigured'],
    [429, '', 'rateLimited'],
    [466, '', 'quota'],
    [469, 'Rate limited by messenger', 'messengerLimited'],
    [500, '', 'server'],
  ])('HTTP %i %s → %s', async (status, body, kind) => {
    respond(status, body)
    const error = await getStateInstance(credentials).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ kind, status })
    expect(errorMessage(error)).not.toBe(errorMessage(new Error()))
  })

  it('сетевая ошибка', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(getStateInstance(credentials)).rejects.toMatchObject({ kind: 'network' })
  })

  it('отмена запроса', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'))
    await expect(getStateInstance(credentials)).rejects.toMatchObject({ kind: 'aborted' })
  })

  it('токен не попадает в текст ошибки для пользователя', async () => {
    respond(401, '')
    const error = await getStateInstance(credentials).catch((e: unknown) => e)
    expect(errorMessage(error)).not.toContain('secret')
  })
})
