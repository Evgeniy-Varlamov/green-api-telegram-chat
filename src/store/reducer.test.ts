import type { Credentials } from '../api/types'
import type { Action } from './actions'
import { initialState, reducer } from './reducer'
import { selectChatList } from './selectors'
import type { AppState, Message } from './types'

const credentials: Credentials = {
  apiUrl: 'https://api.green-api.com',
  idInstance: '1101000001',
  apiTokenInstance: 'token',
}

const run = (actions: Action[], state: AppState = initialState) => actions.reduce(reducer, state)

const loggedIn = run([{ type: 'LOGIN', credentials }])

const incoming = (id: string, chatId = '100', timestamp = 1000): Message => ({
  id,
  chatId,
  direction: 'in',
  text: `text ${id}`,
  timestamp,
})

describe('reducer', () => {
  it('LOGIN подставляет сохранённые данные, LOGOUT всё очищает', () => {
    const data = {
      chats: { '1': { chatId: '1', unread: 0, updatedAt: 1 } },
      messages: { '1': [] },
      phoneToChatId: {},
    }
    const state = reducer(initialState, { type: 'LOGIN', credentials, data })
    expect(state.credentials).toEqual(credentials)
    expect(state.chats['1']).toBeDefined()
    expect(reducer(state, { type: 'LOGOUT' })).toEqual(initialState)
  })

  it('CHAT_CREATED создаёт и открывает чат, запоминает телефон', () => {
    const state = reducer(loggedIn, {
      type: 'CHAT_CREATED',
      chatId: '100',
      phone: '79991234567',
      now: 5,
    })
    expect(state.activeChatId).toBe('100')
    expect(state.chats['100']).toMatchObject({ phone: '79991234567', unread: 0, updatedAt: 5 })
    expect(state.messages['100']).toEqual([])
    expect(state.phoneToChatId['79991234567']).toBe('100')
  })

  it('CHAT_CREATED для существующего чата не теряет переписку', () => {
    const state = run(
      [
        { type: 'MESSAGE_RECEIVED', message: incoming('a'), chat: { chatId: '100' } },
        { type: 'CHAT_CREATED', chatId: '100', phone: '79991234567', now: 5 },
      ],
      loggedIn,
    )
    expect(state.messages['100']).toHaveLength(1)
    expect(state.chats['100'].phone).toBe('79991234567')
  })

  describe('MESSAGE_RECEIVED', () => {
    it('создаёт чат из уведомления и считает непрочитанные', () => {
      const state = run(
        [
          {
            type: 'MESSAGE_RECEIVED',
            message: incoming('a'),
            chat: { chatId: '100', name: 'Иван', phone: '79990000000' },
          },
          {
            type: 'MESSAGE_RECEIVED',
            message: incoming('b', '100', 2000),
            chat: { chatId: '100' },
          },
        ],
        loggedIn,
      )
      expect(state.chats['100']).toMatchObject({ name: 'Иван', unread: 2, updatedAt: 2000 })
      expect(state.phoneToChatId['79990000000']).toBe('100')
    })

    it('не считает непрочитанные в открытом чате', () => {
      const state = run(
        [
          { type: 'CHAT_CREATED', chatId: '100', now: 0 },
          { type: 'MESSAGE_RECEIVED', message: incoming('a'), chat: { chatId: '100' } },
        ],
        loggedIn,
      )
      expect(state.chats['100'].unread).toBe(0)
    })

    it('идемпотентен: повторное уведомление не создаёт дубль', () => {
      const action: Action = {
        type: 'MESSAGE_RECEIVED',
        message: incoming('a'),
        chat: { chatId: '100' },
      }
      const once = reducer(loggedIn, action)
      expect(reducer(once, action)).toBe(once)
    })

    it('вставляет сообщения по времени', () => {
      const state = run(
        [
          {
            type: 'MESSAGE_RECEIVED',
            message: incoming('late', '100', 3000),
            chat: { chatId: '100' },
          },
          {
            type: 'MESSAGE_RECEIVED',
            message: incoming('early', '100', 1000),
            chat: { chatId: '100' },
          },
        ],
        loggedIn,
      )
      expect(state.messages['100'].map((m) => m.id)).toEqual(['early', 'late'])
    })
  })

  describe('отправка', () => {
    const local: Message = {
      id: 'local-1',
      chatId: '100',
      direction: 'out',
      text: 'Привет',
      timestamp: 1000,
      status: 'sending',
    }
    const started = run(
      [
        { type: 'CHAT_CREATED', chatId: '100', now: 0 },
        { type: 'MESSAGE_SEND_STARTED', message: local },
      ],
      loggedIn,
    )

    it('успех заменяет локальный id и ставит sent', () => {
      const state = reducer(started, {
        type: 'MESSAGE_SEND_SUCCEEDED',
        chatId: '100',
        localId: 'local-1',
        idMessage: 'srv-1',
      })
      expect(state.messages['100']).toEqual([{ ...local, id: 'srv-1', status: 'sent' }])
    })

    it('эхо outgoingAPIMessageReceived до ответа sendMessage не даёт дубля', () => {
      const state = run(
        [
          {
            type: 'MESSAGE_RECEIVED',
            message: { ...local, id: 'srv-1', status: 'sent', timestamp: 1001 },
            chat: { chatId: '100' },
          },
          {
            type: 'MESSAGE_SEND_SUCCEEDED',
            chatId: '100',
            localId: 'local-1',
            idMessage: 'srv-1',
          },
        ],
        started,
      )
      expect(state.messages['100'].map((m) => m.id)).toEqual(['srv-1'])
    })

    it('эхо после ответа sendMessage игнорируется', () => {
      const state = run(
        [
          {
            type: 'MESSAGE_SEND_SUCCEEDED',
            chatId: '100',
            localId: 'local-1',
            idMessage: 'srv-1',
          },
          {
            type: 'MESSAGE_RECEIVED',
            message: { ...local, id: 'srv-1', status: 'sent' },
            chat: { chatId: '100' },
          },
        ],
        started,
      )
      expect(state.messages['100']).toHaveLength(1)
    })

    it('ошибка и повтор', () => {
      const failed = reducer(started, {
        type: 'MESSAGE_SEND_FAILED',
        chatId: '100',
        localId: 'local-1',
      })
      expect(failed.messages['100'][0].status).toBe('failed')
      const retried = reducer(failed, { type: 'MESSAGE_RETRY', chatId: '100', localId: 'local-1' })
      expect(retried.messages['100'][0].status).toBe('sending')
    })
  })

  describe('MESSAGE_STATUS_UPDATED', () => {
    const sent = run(
      [
        {
          type: 'MESSAGE_RECEIVED',
          message: {
            id: 'srv-1',
            chatId: '100',
            direction: 'out',
            text: 'x',
            timestamp: 1,
            status: 'sent',
          },
          chat: { chatId: '100' },
        },
      ],
      loggedIn,
    )
    const status = (state: AppState) => state.messages['100'][0].status
    const update = (s: 'delivered' | 'read' | 'failed'): Action => ({
      type: 'MESSAGE_STATUS_UPDATED',
      chatId: '100',
      idMessage: 'srv-1',
      status: s,
    })

    it('повышает статус', () => {
      expect(status(run([update('delivered'), update('read')], sent))).toBe('read')
    })

    it('не откатывает read → delivered', () => {
      expect(status(run([update('read'), update('delivered')], sent))).toBe('read')
    })

    it('failed после sent', () => {
      expect(status(reducer(sent, update('failed')))).toBe('failed')
    })

    it('failed не перекрывает delivered', () => {
      expect(status(run([update('delivered'), update('failed')], sent))).toBe('delivered')
    })
  })

  it('CHAT_OPENED сбрасывает непрочитанные', () => {
    const state = run(
      [
        { type: 'MESSAGE_RECEIVED', message: incoming('a'), chat: { chatId: '100' } },
        { type: 'CHAT_OPENED', chatId: '100' },
      ],
      loggedIn,
    )
    expect(state.chats['100'].unread).toBe(0)
    expect(state.activeChatId).toBe('100')
  })

  it('CHAT_OPENED для неизвестного чата ничего не делает', () => {
    expect(reducer(loggedIn, { type: 'CHAT_OPENED', chatId: 'nope' })).toBe(loggedIn)
  })

  it('selectChatList сортирует по последней активности', () => {
    const state = run(
      [
        { type: 'MESSAGE_RECEIVED', message: incoming('a', '1', 1000), chat: { chatId: '1' } },
        { type: 'MESSAGE_RECEIVED', message: incoming('b', '2', 3000), chat: { chatId: '2' } },
        {
          type: 'MESSAGE_RECEIVED',
          message: incoming('c', '3', 2000),
          chat: { chatId: '3', phone: '79991234567' },
        },
      ],
      loggedIn,
    )
    const list = selectChatList(state)
    expect(list.map((item) => item.chat.chatId)).toEqual(['2', '3', '1'])
    expect(list[1].title).toBe('+7 999 123-45-67')
    expect(list[0].lastMessage?.id).toBe('b')
  })
})
