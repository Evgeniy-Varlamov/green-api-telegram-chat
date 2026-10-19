import type { NotificationBody } from '../api/types'
import { parseNotification } from './notifications'

// Пример из документации GREEN-API (входящее текстовое сообщение)
const incomingText: NotificationBody = {
  typeWebhook: 'incomingMessageReceived',
  timestamp: 1763115112,
  idMessage: '1763115112345',
  senderData: {
    chatId: '10000000',
    chatName: 'Ходабрыш Пробешёлов',
    chatType: 'user',
    sender: '10000000',
    senderName: 'Ходабрыш Пробешёлов',
    senderPhoneNumber: 79876543210,
  },
  messageData: {
    typeMessage: 'textMessage',
    textMessageData: { textMessage: 'Я использую GREEN-API для отправки этого сообщения!' },
  },
}

describe('parseNotification', () => {
  it('входящее текстовое сообщение', () => {
    expect(parseNotification(incomingText)).toEqual({
      type: 'message',
      message: {
        id: '1763115112345',
        chatId: '10000000',
        direction: 'in',
        text: 'Я использую GREEN-API для отправки этого сообщения!',
        timestamp: 1763115112000,
      },
      chat: { chatId: '10000000', name: 'Ходабрыш Пробешёлов', phone: '79876543210' },
    })
  })

  it('extendedTextMessage', () => {
    const event = parseNotification({
      ...incomingText,
      messageData: { typeMessage: 'extendedTextMessage', extendedTextMessageData: { text: 'Hi' } },
    })
    expect(event.type === 'message' && event.message.text).toBe('Hi')
  })

  it('нетекстовое сообщение помечается как unsupported', () => {
    const event = parseNotification({
      ...incomingText,
      messageData: { typeMessage: 'imageMessage' },
    })
    expect(event.type === 'message' && event.message).toMatchObject({
      text: '',
      unsupported: true,
    })
  })

  it.each(['outgoingAPIMessageReceived', 'outgoingMessageReceived'])(
    '%s — исходящее со статусом sent, без телефона',
    (typeWebhook) => {
      const event = parseNotification({ ...incomingText, typeWebhook })
      expect(event).toMatchObject({
        type: 'message',
        message: { direction: 'out', status: 'sent' },
        chat: { chatId: '10000000' },
      })
      expect(event.type === 'message' && event.chat.phone).toBeFalsy()
    },
  )

  it.each([
    ['delivered', 'delivered'],
    ['read', 'read'],
    ['failed', 'failed'],
    ['noAccount', 'failed'],
  ])('outgoingMessageStatus %s → %s', (status, expected) => {
    expect(
      parseNotification({
        typeWebhook: 'outgoingMessageStatus',
        chatId: '10000000',
        idMessage: 'abc',
        status,
      }),
    ).toEqual({ type: 'status', chatId: '10000000', idMessage: 'abc', status: expected })
  })

  it('stateInstanceChanged', () => {
    expect(
      parseNotification({ typeWebhook: 'stateInstanceChanged', stateInstance: 'notAuthorized' }),
    ).toEqual({ type: 'state', stateInstance: 'notAuthorized' })
  })

  it('quotaExceeded', () => {
    expect(parseNotification({ typeWebhook: 'quotaExceeded' })).toEqual({ type: 'quota' })
  })

  it.each([
    ['неизвестный тип', { typeWebhook: 'editedMessage' }],
    ['пустое тело', null],
    ['без typeWebhook', {} as NotificationBody],
    ['сообщение без chatId', { ...incomingText, senderData: undefined }],
    ['статус без idMessage', { typeWebhook: 'outgoingMessageStatus', chatId: '1', status: 'read' }],
  ])('%s → ignore', (_, body) => {
    expect(parseNotification(body as NotificationBody | null)).toEqual({ type: 'ignore' })
  })
})
