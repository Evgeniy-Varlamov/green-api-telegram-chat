import { Chat } from './components/Chat/Chat'
import { FormVerify } from './components/FormVerify/FormVerify'
import { useSession, useSessionCheck } from './hooks/useSession'
import { AppProvider } from './store/AppContext'

function Screens() {
  const { credentials, login } = useSession()
  useSessionCheck()
  return credentials ? <Chat /> : <FormVerify onSubmit={login} />
}

export default function App() {
  return (
    <AppProvider>
      <Screens />
    </AppProvider>
  )
}
