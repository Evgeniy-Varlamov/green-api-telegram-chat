import {
  clearChatData,
  clearCredentials,
  loadChatData,
  loadCredentials,
  saveChatData,
  saveCredentials,
} from './persistence'
import type { ChatData } from './types'

const credentials = { apiUrl: 'https://api.green-api.com', idInstance: '1', apiTokenInstance: 't' }

const data: ChatData = {
  chats: { '100': { chatId: '100', unread: 0, updatedAt: 1 } },
  messages: {
    '100': [
      { id: 'a', chatId: '100', direction: 'out', text: 'x', timestamp: 1, status: 'sent' },
      {
        id: 'local-b',
        chatId: '100',
        direction: 'out',
        text: 'y',
        timestamp: 2,
        status: 'sending',
      },
    ],
  },
  phoneToChatId: { '79991234567': '100' },
}

describe('persistence', () => {
  it('сохраняет и читает учётные данные', () => {
    expect(loadCredentials()).toBeNull()
    saveCredentials(credentials)
    expect(loadCredentials()).toEqual(credentials)
    clearCredentials()
    expect(loadCredentials()).toBeNull()
  })

  it('игнорирует повреждённые учётные данные', () => {
    localStorage.setItem('greenchat:v1:auth', '{"idInstance":1}')
    expect(loadCredentials()).toBeNull()
    localStorage.setItem('greenchat:v1:auth', 'not json')
    expect(loadCredentials()).toBeNull()
  })

  it('хранит данные отдельно для каждого инстанса', () => {
    saveChatData('1', data)
    expect(loadChatData('2')).toBeUndefined()
    expect(loadChatData('1')?.chats).toEqual(data.chats)
    clearChatData('1')
    expect(loadChatData('1')).toBeUndefined()
  })

  it('помечает неотправленные сообщения как failed при загрузке', () => {
    saveChatData('1', data)
    const statuses = loadChatData('1')?.messages['100'].map((m) => m.status)
    expect(statuses).toEqual(['sent', 'failed'])
  })

  it('работает, если localStorage недоступен', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => saveCredentials(credentials)).not.toThrow()
    spy.mockRestore()
  })
})
