// Типы запросов и ответов GREEN-API (Telegram / MAX, API v3).
// Источник: документация green-api.com и реальные ответы инстанса.

export interface Credentials {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export interface StateInstanceResponse {
  stateInstance: string
}

export type YesNo = 'yes' | 'no'

export interface SettingsResponse {
  wid?: string
  typeInstance?: string
  webhookUrl: string
  incomingWebhook: YesNo
  outgoingWebhook?: YesNo
  outgoingMessageWebhook?: YesNo
  outgoingAPIMessageWebhook?: YesNo
  stateWebhook?: YesNo
}

export interface CheckAccountFound {
  exist: boolean
  chatId: string
  username?: string
  phoneNumber?: number
  fromCache?: boolean
}

export interface CheckAccountFailure {
  status: false
  reason?: string
  data?: { status?: string; reason?: string; retryAfter?: number }
}

export type CheckAccountResponse = CheckAccountFound | CheckAccountFailure

export interface SendMessageResponse {
  idMessage: string
}

export interface SenderData {
  chatId: string
  chatName?: string
  chatType?: string
  sender?: string
  senderName?: string
  senderContactName?: string
  senderPhoneNumber?: number
}

export interface MessageData {
  typeMessage: string
  textMessageData?: { textMessage: string }
  extendedTextMessageData?: { text: string }
}

export interface NotificationBody {
  typeWebhook: string
  timestamp?: number
  idMessage?: string
  senderData?: SenderData
  messageData?: MessageData
  // outgoingMessageStatus
  chatId?: string
  status?: string
  // stateInstanceChanged
  stateInstance?: string
}

export interface ReceivedNotification {
  receiptId: number
  body: NotificationBody
}

export interface DeleteNotificationResponse {
  result: boolean
  reason?: string
}
