/** Ngay hom nay dang YYYY-MM-DD theo mui gio cua user — giong het backend. */
export function todayIn(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())
  } catch {
    return new Intl.DateTimeFormat('en-CA').format(new Date())
  }
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** 0 = thu Hai ... 6 = Chu nhat */
function weekdayMon0(isoDate: string): number {
  return (new Date(`${isoDate}T00:00:00Z`).getUTCDay() + 6) % 7
}

/** Luoi 5 tuan bat dau tu thu Hai, tuan cuoi chua hom nay. */
export function calendarWeeks(today: string, weeks = 5): string[] {
  const end = addDays(today, 6 - weekdayMon0(today))
  const start = addDays(end, -(weeks * 7 - 1))
  return Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i))
}

export const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export function formatLongDate(isoDate: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00Z`))
}

export function formatShortDate(isoDate: string): string {
  const [, m, d] = isoDate.split('-')
  return `${Number(d)}/${Number(m)}`
}
