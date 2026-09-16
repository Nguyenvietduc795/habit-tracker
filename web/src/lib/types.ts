// Hinh dang du lieu — khop voi docs/API-CONTRACT.md

export interface User {
  id: string
  email: string
  displayName: string
  timezone: string
}

export interface AuthResponse {
  user: User
  accessToken: string
}

export type Frequency = 'daily' | 'weekly'

export interface Habit {
  id: string
  name: string
  frequency: Frequency
  color: string | null
  archivedAt: string | null
  createdAt: string
  currentStreak: number
  checkedToday: boolean
}

export interface CheckIn {
  doneOn: string
  note: string | null
}

export interface HabitDetail extends Habit {
  longestStreak: number
  checkIns: CheckIn[]
}
