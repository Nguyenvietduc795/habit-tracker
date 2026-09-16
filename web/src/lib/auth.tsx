import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, refreshAccessToken, setAccessToken, setSessionExpiredHandler } from './api.ts'
import { AuthContext, type AuthStatus } from './auth-context.ts'
import type { AuthResponse, User } from './types.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)

  const signOutLocally = useCallback(() => {
    setAccessToken(null)
    // Xoa sach cache: nguoi dang nhap sau tren cung may khong thay du lieu nguoi truoc
    queryClient.clear()
    setUser(null)
    setStatus('guest')
  }, [queryClient])

  const acceptAuth = useCallback(
    (data: AuthResponse) => {
      setAccessToken(data.accessToken)
      queryClient.clear()
      setUser(data.user)
      setStatus('authed')
    },
    [queryClient],
  )

  useEffect(() => {
    setSessionExpiredHandler(signOutLocally)
    return () => setSessionExpiredHandler(null)
  }, [signOutLocally])

  // Mo trang hoac tai lai trang: thu khoi phuc phien bang cookie refresh token
  useEffect(() => {
    let cancelled = false

    void (async () => {
      const token = await refreshAccessToken()
      if (cancelled) return
      if (!token) {
        setStatus('guest')
        return
      }
      try {
        const me = await api<User>('/auth/me')
        if (!cancelled) {
          setUser(me)
          setStatus('authed')
        }
      } catch {
        if (!cancelled) setStatus('guest')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api<AuthResponse>('/auth/login', {
        method: 'POST',
        json: { email, password },
      })
      acceptAuth(data)
    },
    [acceptAuth],
  )

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const data = await api<AuthResponse>('/auth/register', {
        method: 'POST',
        json: {
          email,
          password,
          displayName: displayName.trim() || undefined,
          // Gui mui gio cua trinh duyet -> "hom nay" tinh dung cho user nay
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      })
      acceptAuth(data)
    },
    [acceptAuth],
  )

  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {
      // Server loi thi van dang xuat o may nay
    }
    signOutLocally()
  }, [signOutLocally])

  const value = useMemo(
    () => ({ status, user, login, register, logout }),
    [status, user, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
