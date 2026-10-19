import { ApiError } from '../api/errors'
import { deleteNotification, receiveNotification } from '../api/greenApi'
import type { NotificationBody } from '../api/types'
import { runPolling } from './useNotificationPolling'

vi.mock('../api/greenApi', () => ({
  receiveNotification: vi.fn(),
  deleteNotification: vi.fn(),
}))

const receive = vi.mocked(receiveNotification)
const remove = vi.mocked(deleteNotification)

const credentials = { apiUrl: 'https://api.green-api.com', idInstance: '1', apiTokenInstance: 't' }

const incoming: NotificationBody = {
  typeWebhook: 'incomingMessageReceived',
  timestamp: 1,
  idMessage: 'm1',
  senderData: { chatId: '100' },
  messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет' } },
}

let controller: AbortController
const dispatch = vi.fn()

/** После перечисленных ответов цикл останавливается */
function stopAfter() {
  receive.mockImplementation(async () => {
    controller.abort()
    return null
  })
}

beforeEach(() => {
  controller = new AbortController()
  dispatch.mockReset()
  receive.mockReset()
  remove.mockReset().mockResolvedValue({ result: true })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('runPolling', () => {
  it('обрабатывает уведомление, затем удаляет его из очереди', async () => {
    stopAfter()
    receive.mockResolvedValueOnce({ receiptId: 7, body: incoming })
    await runPolling(credentials, dispatch, controller.signal)

    const received = dispatch.mock.calls.findIndex(([a]) => a.type === 'MESSAGE_RECEIVED')
    expect(received).toBeGreaterThanOrEqual(0)
    expect(remove).toHaveBeenCalledWith(credentials, 7, controller.signal)
    expect(dispatch.mock.invocationCallOrder[received]).toBeLessThan(
      remove.mock.invocationCallOrder[0],
    )
  })

  it('удаляет и ненужные уведомления, чтобы очередь не застряла', async () => {
    stopAfter()
    receive.mockResolvedValueOnce({ receiptId: 8, body: { typeWebhook: 'editedMessage' } })
    await runPolling(credentials, dispatch, controller.signal)
    expect(remove).toHaveBeenCalledWith(credentials, 8, controller.signal)
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'MESSAGE_RECEIVED' }))
  })

  it('пустой ответ — просто следующий запрос', async () => {
    stopAfter()
    receive.mockResolvedValueOnce(null)
    await runPolling(credentials, dispatch, controller.signal)
    expect(receive).toHaveBeenCalledTimes(2)
    expect(remove).not.toHaveBeenCalled()
  })

  it('при ошибке ждёт с нарастающей задержкой и восстанавливается', async () => {
    vi.useFakeTimers()
    stopAfter()
    receive
      .mockRejectedValueOnce(new ApiError('network', 0, ''))
      .mockRejectedValueOnce(new ApiError('server', 500, ''))

    const done = runPolling(credentials, dispatch, controller.signal)
    await vi.advanceTimersByTimeAsync(999)
    expect(receive).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(receive).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1999)
    expect(receive).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    await done

    expect(receive).toHaveBeenCalledTimes(3)
    expect(dispatch).toHaveBeenCalledWith({ type: 'CONNECTION_CHANGED', connection: 'error' })
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'CONNECTION_CHANGED', connection: 'polling' })
  })

  it('без сети ждёт события online', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    stopAfter()
    const done = runPolling(credentials, dispatch, controller.signal)
    await Promise.resolve()
    expect(dispatch).toHaveBeenCalledWith({ type: 'CONNECTION_CHANGED', connection: 'offline' })
    expect(receive).not.toHaveBeenCalled()

    onLine.mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    await done
    expect(receive).toHaveBeenCalled()
  })

  it('отмена прерывает цикл без ошибки', async () => {
    receive.mockImplementation(async () => {
      controller.abort()
      throw new ApiError('aborted', 0, '')
    })
    await expect(runPolling(credentials, dispatch, controller.signal)).resolves.toBeUndefined()
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'CONNECTION_CHANGED', connection: 'error' })
  })
})
