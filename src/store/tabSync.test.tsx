import { act, render, screen, waitFor } from '@testing-library/react'
import App from '../App'
import { saveCredentials } from './persistence'

const credentials = {
  apiUrl: 'https://api.green-api.com',
  idInstance: '1101000001',
  apiTokenInstance: 'secret',
}

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

/** Упрощённая реализация Web Locks: блокировку держит один, остальные ждут в очереди */
function installFakeLocks() {
  const queues = new Map<string, Promise<void>>()
  const locks = {
    request(
      name: string,
      options: { signal?: AbortSignal },
      callback: () => Promise<unknown>,
    ): Promise<unknown> {
      const previous = queues.get(name) ?? Promise.resolve()
      let release!: () => void
      const current = new Promise<void>((resolve) => (release = resolve))
      queues.set(
        name,
        previous.then(() => current),
      )
      const aborted = new Promise<never>((_, reject) =>
        options.signal?.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        ),
      )
      return Promise.race([previous, aborted])
        .then(() => callback())
        .finally(release)
    },
  }
  Object.defineProperty(navigator, 'locks', { value: locks, configurable: true })
}

/** Фейковый API: long polling «висит» до abort и отдаёт уведомления из очереди */
function fakeApi() {
  const queue: unknown[] = []
  let wake: (() => void) | null = null
  let receipt = 0
  const receiveCalls: string[] = []

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = /\/waInstance\d+\/(\w+)\//.exec(String(input))?.[1]
      if (method === 'getStateInstance') return json({ stateInstance: 'authorized' })
      if (method === 'getSettings') return json({ webhookUrl: '', incomingWebhook: 'yes' })
      if (method === 'deleteNotification') return json({ result: true })
      if (method === 'readChat') return json({ setRead: true })
      if (method === 'receiveNotification') {
        receiveCalls.push(String(input))
        if (!queue.length) {
          await new Promise<void>((resolve, reject) => {
            wake = resolve
            init?.signal?.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            )
          })
        }
        return json(queue.shift() ?? null)
      }
      return new Response('', { status: 404 })
    }),
  )

  return {
    receiveCalls,
    push(text: string) {
      queue.push({
        receiptId: ++receipt,
        body: {
          typeWebhook: 'incomingMessageReceived',
          idMessage: `in-${receipt}`,
          timestamp: Date.now() / 1000,
          senderData: { chatId: '555', chatName: 'Анна' },
          messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: text } },
        },
      })
      wake?.()
      wake = null
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'locks')
})

describe('несколько вкладок', () => {
  it('очередь читает одна вкладка, сообщение появляется в обеих', async () => {
    installFakeLocks()
    const api = fakeApi()
    saveCredentials(credentials)

    const tab1 = render(<App />)
    const tab2 = render(<App />)
    await waitFor(() => expect(api.receiveCalls).toHaveLength(1))

    act(() => api.push('Привет из Telegram'))
    await waitFor(() => {
      expect(tab1.getAllByText('Привет из Telegram')).toHaveLength(1)
      expect(tab2.getAllByText('Привет из Telegram')).toHaveLength(1)
    })
    // После обработки ведущая вкладка снова ждёт; вторая так и не начала опрос
    await waitFor(() => expect(api.receiveCalls).toHaveLength(2))
  })

  it('после закрытия ведущей вкладки опрос продолжает другая', async () => {
    installFakeLocks()
    const api = fakeApi()
    saveCredentials(credentials)

    const tab1 = render(<App />)
    const tab2 = render(<App />)
    await waitFor(() => expect(api.receiveCalls).toHaveLength(1))

    tab1.unmount()
    await waitFor(() => expect(api.receiveCalls).toHaveLength(2))

    act(() => api.push('Я всё ещё здесь'))
    expect(await tab2.findByText('Я всё ещё здесь')).toBeInTheDocument()
  })

  it('выход в одной вкладке выходит и в другой', async () => {
    installFakeLocks()
    fakeApi()
    saveCredentials(credentials)

    render(<App />)
    render(<App />)
    const [menu] = screen.getAllByRole('button', { name: 'Меню' })
    act(() => menu.click())
    act(() => screen.getByRole('menuitem', { name: 'Выйти' }).click())

    await waitFor(() => expect(screen.getAllByRole('heading', { name: 'Вход' })).toHaveLength(2))
  })
})
