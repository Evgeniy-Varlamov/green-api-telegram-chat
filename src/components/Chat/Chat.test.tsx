import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'
import type { NotificationBody } from '../../api/types'
import { saveCredentials } from '../../store/persistence'

const credentials = {
  apiUrl: 'https://api.green-api.com',
  idInstance: '1101000001',
  apiTokenInstance: 'secret',
}

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

/**
 * Фейковый GREEN-API: очередь уведомлений и long polling,
 * который «висит», пока очередь пуста (до abort).
 */
function fakeApi() {
  const queue: { receiptId: number; body: NotificationBody }[] = []
  let waiter: (() => void) | null = null
  let receipt = 0
  const sent: { chatId: string; message: string }[] = []

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = /\/waInstance\d+\/(\w+)\//.exec(String(input))?.[1]
    switch (method) {
      case 'getStateInstance':
        return json({ stateInstance: 'authorized' })
      case 'getSettings':
        return json({ webhookUrl: '', incomingWebhook: 'yes' })
      case 'checkAccount':
        return json({ exist: true, chatId: '555', username: '@friend' })
      case 'sendMessage': {
        sent.push(JSON.parse(String(init?.body)))
        return json({ idMessage: `srv-${sent.length}` })
      }
      case 'deleteNotification':
        return json({ result: true })
      case 'receiveNotification': {
        if (!queue.length) {
          await new Promise<void>((resolve, reject) => {
            waiter = resolve
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            )
          })
        }
        return json(queue.shift() ?? null)
      }
      default:
        return new Response('', { status: 404 })
    }
  })
  vi.stubGlobal('fetch', fetchMock)

  return {
    sent,
    push(body: NotificationBody) {
      queue.push({ receiptId: ++receipt, body })
      waiter?.()
      waiter = null
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Chat: сквозной сценарий ТЗ', () => {
  it('создать чат по номеру → отправить сообщение → увидеть ответ', async () => {
    const api = fakeApi()
    saveCredentials(credentials)
    const user = userEvent.setup()
    render(<App />)

    // Пользователь вводит номер получателя и создаёт чат
    await user.click(screen.getByRole('button', { name: 'Новый чат' }))
    await user.type(screen.getByLabelText('Номер телефона'), '9991234567')
    await user.click(screen.getByRole('button', { name: 'Создать чат' }))

    const header = await screen.findByRole('heading', { level: 2, name: '+7 999 123-45-67' })
    expect(header).toBeInTheDocument()

    // Пишет сообщение и отправляет его
    await user.type(screen.getByLabelText('Сообщение'), 'Привет!{Enter}')
    const log = screen.getByRole('log')
    expect(await within(log).findByText('Привет!')).toBeInTheDocument()
    expect(api.sent).toEqual([{ chatId: '555', message: 'Привет!' }])
    expect(await within(log).findByLabelText('Отправлено')).toBeInTheDocument()

    // Эхо отправленного через API не создаёт дубль, статус доставки обновляется
    api.push({
      typeWebhook: 'outgoingAPIMessageReceived',
      idMessage: 'srv-1',
      timestamp: Date.now() / 1000,
      senderData: { chatId: '555' },
      messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет!' } },
    })
    api.push({
      typeWebhook: 'outgoingMessageStatus',
      chatId: '555',
      idMessage: 'srv-1',
      status: 'read',
    })
    expect(await within(log).findByLabelText('Прочитано')).toBeInTheDocument()
    expect(within(log).getAllByText('Привет!')).toHaveLength(1)

    // Получатель отвечает — ответ появляется в чате
    api.push({
      typeWebhook: 'incomingMessageReceived',
      idMessage: 'in-1',
      timestamp: Date.now() / 1000,
      senderData: { chatId: '555', senderName: 'Друг' },
      messageData: {
        typeMessage: 'textMessage',
        textMessageData: { textMessage: 'И тебе привет' },
      },
    })
    expect(await within(log).findByText('И тебе привет')).toBeInTheDocument()
  })

  it('ответ из другого чата увеличивает счётчик непрочитанных', async () => {
    const api = fakeApi()
    saveCredentials(credentials)
    render(<App />)

    api.push({
      typeWebhook: 'incomingMessageReceived',
      idMessage: 'in-2',
      timestamp: Date.now() / 1000,
      senderData: { chatId: '777', chatName: 'Мария', senderPhoneNumber: 79990000000 },
      messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Ты тут?' } },
    })

    expect(await screen.findByText('Мария')).toBeInTheDocument()
    expect(screen.getByLabelText('Непрочитанных: 1')).toBeInTheDocument()
    expect(screen.getByText('Ты тут?')).toBeInTheDocument()
  })

  it('ошибка отправки → «Повторить»', async () => {
    fakeApi()
    saveCredentials(credentials)
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Новый чат' }))
    await user.type(screen.getByLabelText('Номер телефона'), '9991234567')
    await user.click(screen.getByRole('button', { name: 'Создать чат' }))
    await screen.findByRole('log')

    const fetchMock = vi.mocked(fetch)
    const original = fetchMock.getMockImplementation()!
    fetchMock.mockImplementation(async (input, init) =>
      String(input).includes('/sendMessage/')
        ? Promise.reject(new TypeError('offline'))
        : original(input, init),
    )
    await user.type(screen.getByLabelText('Сообщение'), 'Тест{Enter}')
    expect(await screen.findByLabelText('Не отправлено')).toBeInTheDocument()

    fetchMock.mockImplementation(original)
    await user.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByLabelText('Отправлено')).toBeInTheDocument()
  })
})
