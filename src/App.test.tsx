import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { saveChatData, saveCredentials } from './store/persistence'

const credentials = {
  apiUrl: 'https://api.green-api.com',
  idInstance: '1101000001',
  apiTokenInstance: 'secret',
}

type Routes = Record<string, () => Response>

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

const authorized: Routes = {
  getStateInstance: () => json({ stateInstance: 'authorized' }),
  getSettings: () => json({ webhookUrl: '', incomingWebhook: 'yes' }),
}

function mockApi(routes: Routes) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const method = /\/waInstance\d+\/(\w+)\//.exec(String(input))?.[1] ?? ''
    const handler = routes[method]
    return handler ? handler() : json({}, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

async function login(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('idInstance'), credentials.idInstance)
  await user.type(screen.getByLabelText('apiTokenInstance'), credentials.apiTokenInstance)
  await user.click(screen.getByRole('button', { name: 'Войти' }))
}

describe('App: сессия', () => {
  it('без сохранённой сессии показывает форму входа', () => {
    mockApi(authorized)
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument()
  })

  it('успешный вход открывает чат и сохраняет учётные данные', async () => {
    mockApi(authorized)
    const user = userEvent.setup()
    render(<App />)
    await login(user)
    expect(await screen.findByRole('heading', { name: 'Чаты' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('greenchat:v1:auth')!)).toEqual(credentials)
  })

  it('неавторизованный инстанс — ошибка, вход не выполняется', async () => {
    mockApi({ getStateInstance: () => json({ stateInstance: 'notAuthorized' }) })
    const user = userEvent.setup()
    render(<App />)
    await login(user)
    expect(await screen.findByRole('alert')).toHaveTextContent('не авторизован')
    expect(screen.queryByRole('heading', { name: 'Чаты' })).not.toBeInTheDocument()
  })

  it('восстанавливает сессию после перезагрузки', async () => {
    mockApi(authorized)
    saveCredentials(credentials)
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Чаты' })).toBeInTheDocument()
  })

  it('выходит, если сохранённый токен стал недействителен', async () => {
    mockApi({ getStateInstance: () => new Response('', { status: 401 }) })
    saveCredentials(credentials)
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Вход' })).toBeInTheDocument()
    expect(localStorage.getItem('greenchat:v1:auth')).toBeNull()
  })

  it('предупреждает, если получение уведомлений выключено', async () => {
    mockApi({
      ...authorized,
      getSettings: () => json({ webhookUrl: 'https://example.com', incomingWebhook: 'yes' }),
    })
    saveCredentials(credentials)
    render(<App />)
    expect(await screen.findByRole('status')).toHaveTextContent('Получение сообщений выключено')
  })

  it('«Выйти» сохраняет историю, «Выйти и очистить данные» — удаляет', async () => {
    mockApi(authorized)
    const dataKey = `greenchat:v1:data:${credentials.idInstance}`
    saveChatData(credentials.idInstance, { chats: {}, messages: {}, phoneToChatId: {} })
    const user = userEvent.setup()

    saveCredentials(credentials)
    const { unmount } = render(<App />)
    await user.click(screen.getByRole('button', { name: 'Меню' }))
    await user.click(screen.getByRole('menuitem', { name: 'Выйти' }))
    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument()
    expect(localStorage.getItem('greenchat:v1:auth')).toBeNull()
    expect(localStorage.getItem(dataKey)).not.toBeNull()
    unmount()

    saveCredentials(credentials)
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Меню' }))
    await user.click(screen.getByRole('menuitem', { name: 'Выйти и очистить данные' }))
    await waitFor(() => expect(localStorage.getItem(dataKey)).toBeNull())
  })
})
