import { useState, type FormEvent } from 'react'
import { friendlyError } from '../lib/api.ts'
import { useAuth } from '../lib/auth-context.ts'

type Mode = 'login' | 'register'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function AuthScreen() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isRegister = mode === 'register'

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    // Kiem o trinh duyet truoc cho nhanh; backend VAN kiem lai (khong tin frontend)
    if (!EMAIL_RE.test(email.trim())) {
      setError('Email chưa đúng định dạng.')
      return
    }
    if (isRegister && password.length < 8) {
      setError('Mật khẩu cần ít nhất 8 ký tự.')
      return
    }

    setSubmitting(true)
    try {
      if (isRegister) await register(email.trim(), password, displayName)
      else await login(email.trim(), password)
    } catch (err) {
      setError(
        friendlyError(err, {
          401: 'Email hoặc mật khẩu không đúng.',
          409: 'Email này đã được đăng ký. Thử đăng nhập nhé.',
        }),
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">🔥</span>
          <span className="brand-name">Habit Tracker</span>
        </div>

        <h1 className="auth-title">{isRegister ? 'Bắt đầu một thói quen' : 'Chào mừng quay lại'}</h1>
        <p className="auth-lede">
          {isRegister
            ? 'Mỗi ngày một dấu tick. Chuỗi ngày liên tục sẽ giữ bạn không bỏ cuộc.'
            : 'Đăng nhập để tick thói quen hôm nay.'}
        </p>

        <div className="tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!isRegister}
            className={`tab ${!isRegister ? 'is-active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isRegister}
            className={`tab ${isRegister ? 'is-active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Đăng ký
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <label className="field">
              <span>Tên hiển thị <em>(không bắt buộc)</em></span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="nickname"
                maxLength={100}
                placeholder="Đức"
              />
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="ban@example.com"
              required
            />
          </label>

          <label className="field">
            <span>Mật khẩu</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              placeholder={isRegister ? 'Ít nhất 8 ký tự' : ''}
              required
            />
          </label>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Đang xử lý…' : isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </main>
  )
}
