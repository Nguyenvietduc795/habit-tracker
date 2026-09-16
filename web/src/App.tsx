import { AuthScreen } from './components/AuthScreen.tsx'
import { Dashboard } from './components/Dashboard.tsx'
import { useAuth } from './lib/auth-context.ts'

export default function App() {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="boot" aria-busy="true" aria-label="Đang tải">
        <span className="spinner" />
      </div>
    )
  }

  return status === 'authed' ? <Dashboard /> : <AuthScreen />
}
