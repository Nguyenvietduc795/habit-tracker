import type { Habit } from './types.ts'

/**
 * Bang mau cho tung thoi quen. Moi mau deu du dam de dau tick trang
 * noi ro tren nen mau (ti le tuong phan >= 3:1).
 */
export const HABIT_COLORS = [
  { value: '#6D5DFB', name: 'Tím' },
  { value: '#F0643C', name: 'Cam' },
  { value: '#16A34A', name: 'Lá' },
  { value: '#2F80ED', name: 'Dương' },
  { value: '#E0468A', name: 'Hồng' },
  { value: '#0E9F8E', name: 'Ngọc' },
  { value: '#D97706', name: 'Hổ phách' },
  { value: '#0891B2', name: 'Lam' },
] as const

const HEX_RE = /^#[0-9a-f]{6}$/i

/** Mau cua mot thoi quen. Thoi quen cu chua co mau -> suy ra co dinh tu id. */
export function colorOf(habit: Pick<Habit, 'id' | 'color'>): string {
  if (habit.color && HEX_RE.test(habit.color)) return habit.color
  let hash = 0
  for (const ch of habit.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return HABIT_COLORS[hash % HABIT_COLORS.length].value
}

/** Mau cho thoi quen sap tao: uu tien mau chua ai dung, de cac the khac nhau. */
export function nextColor(habits: Pick<Habit, 'id' | 'color'>[]): string {
  const used = new Set(habits.map(colorOf))
  const free = HABIT_COLORS.find((c) => !used.has(c.value))
  return (free ?? HABIT_COLORS[habits.length % HABIT_COLORS.length]).value
}
