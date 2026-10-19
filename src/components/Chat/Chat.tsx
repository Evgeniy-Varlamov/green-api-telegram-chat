import { useAppState } from '../../store/hooks'
import styles from './Chat.module.css'
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
  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <InstanceBanner />
        <div className={styles.placeholder}>Выберите чат или создайте новый</div>
      </main>
    </div>
  )
}
