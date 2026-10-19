import { useChatActions } from '../../hooks/useChatActions'
import { useAppDispatch, useAppState } from '../../store/hooks'
import { selectActiveChat, selectActiveMessages } from '../../store/selectors'
import styles from './Chat.module.css'
import { ChatHeader } from './ChatHeader/ChatHeader'
import { MessageInput } from './MessageInput/MessageInput'
import { MessageList } from './MessageList/MessageList'
import { Sidebar } from './Sidebar/Sidebar'

function InstanceBanner() {
  const { instanceState, receivingDisabled, quotaExceeded } = useAppState()

  let text: string | null = null
  if (instanceState && instanceState !== 'authorized') {
    text = 'Инстанс не авторизован в мессенджере — сообщения не отправляются и не приходят.'
  } else if (receivingDisabled) {
    text =
      'Получение сообщений выключено: в настройках инстанса очистите Webhook URL и включите входящие уведомления.'
  } else if (quotaExceeded) {
    text = 'Превышены лимиты тарифа Developer.'
  }

  return text ? (
    <div className={styles.banner} role="status">
      {text}
    </div>
  ) : null
}

export function Chat() {
  const state = useAppState()
  const dispatch = useAppDispatch()
  const { sendText, retry } = useChatActions()
  const chat = selectActiveChat(state)
  const messages = selectActiveMessages(state)

  return (
    <div className={`${styles.layout} ${chat ? styles.chatOpen : ''}`}>
      <Sidebar />
      <main className={styles.main}>
        <InstanceBanner />
        {chat ? (
          <>
            <ChatHeader chat={chat} onBack={() => dispatch({ type: 'CHAT_CLOSED' })} />
            <MessageList chatId={chat.chatId} messages={messages} onRetry={retry} />
            <MessageInput key={chat.chatId} onSend={(text) => void sendText(chat.chatId, text)} />
          </>
        ) : (
          <div className={styles.placeholder}>Выберите чат или создайте новый</div>
        )}
      </main>
    </div>
  )
}
