import { createContext, useContext } from 'react'
import type { User } from './types.ts'

export type AuthStatus = 'loading' | 'authed' | 'guest'

export interface AuthValue {
  status: AuthStatus
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth phai nam ben trong <AuthProvider>')
  return value
}
