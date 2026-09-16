import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { friendlyError } from '../lib/api.ts'
import { useAuth } from '../lib/auth-context.ts'
import { HABIT_COLORS, colorOf } from '../lib/colors.ts'
import { formatLongDate, todayIn } from '../lib/dates.ts'
import { useArchiveHabit, useCreateHabit, useDeleteHabit, useHabits } from '../lib/habits.ts'
import type { Habit } from '../lib/types.ts'
import { Confetti, ProgressRing, type ConfettiHandle } from './Celebration.tsx'
import { HabitCard } from './HabitCard.tsx'
import { Mascot, type MascotHandle, type Reaction } from './Mascot.tsx'
import { NewHabitForm } from './NewHabitForm.tsx'

const SUGGESTIONS = [
  { name: 'Uống 2 lít nước', emoji: '💧' },
  { name: 'Đọc sách 20 phút', emoji: '📖' },
  { name: 'Tập thể dục', emoji: '🏃' },
  { name: 'Đi ngủ trước 23h', emoji: '🌙' },
]

// Moi lan tick cao doi mot kieu vui, khong lap lai nham chan
const CHEERS: Reaction[] = ['delighted', 'sparkle', 'wink']

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 5) return 'Khuya rồi'
  if (hour < 11) return 'Chào buổi sáng'
  if (hour < 14) return 'Chào buổi trưa'
  if (hour < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

function headline(total: number, done: number): string {
  if (total === 0) return 'Bắt đầu thói quen đầu tiên nào'
  if (done === total) return 'Xong hết rồi. Tuyệt vời!'
  if (done === 0) return `Hôm nay có ${total} việc nhỏ đang chờ bạn`
  return `Còn ${total - done} việc nữa thôi, cố lên!`
}

export function Dashboard() {
  const { user, logout } = useAuth()
  const habits = useHabits()
  const [notice, setNotice] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const prevDone = useRef<number | null>(null)
  const foxRef = useRef<MascotHandle>(null)
  const confettiRef = useRef<ConfettiHandle>(null)

  const all = habits.data ?? []
  const active = all.filter((h) => h.archivedAt === null)
  const archived = all.filter((h) => h.archivedAt !== null)
  const doneCount = active.filter((h) => h.checkedToday).length
  const allDone = active.length > 0 && doneCount === active.length

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  // Cao + phao giay phan ung theo so viec da xong. Lan tai dau (prev = null)
  // thi im lang — chi phan ung khi user VUA lam gi do, khong phai moi lan mo app.
  useEffect(() => {
    if (!habits.isSuccess) return
    const prev = prevDone.current
    prevDone.current = doneCount
    if (prev === null || prev === doneCount) return

    if (doneCount < prev) {
      foxRef.current?.react('surprised', 700)
    } else if (allDone) {
      confettiRef.current?.fire()
      foxRef.current?.react('heart', 1800)
    } else {
      foxRef.current?.react(CHEERS[doneCount % CHEERS.length])
    }
  }, [doneCount, allDone, habits.isSuccess])

  if (!user) return null

  const today = todayIn(user.timezone)
  const firstName = user.displayName.trim() || user.email.split('@')[0]

  return (
    <div className="shell">
      <Confetti ref={confettiRef} />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">🔥</span>
          <span className="brand-name">Habit Tracker</span>
        </div>
        <div className="account">
          <span className="avatar" aria-hidden="true">
            {firstName.charAt(0).toUpperCase()}
          </span>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => void logout()}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main>
        <div className="hero-wrap">
          {/* Cao lo dau len tu mep tren khung — phan nguc nap sau khung */}
          <div className="hero-mascot">
            <Mascot
              ref={foxRef}
              directions="/mascots/fox-directions.webp"
              reactions="/mascots/fox-reactions.webp"
              size={92}
              label="bé cáo"
            />
          </div>
          <section className={`hero ${allDone ? 'is-complete' : ''}`}>
            <div className="hero-text">
              <p className="hero-greet">
                {greeting()}, {firstName} <span aria-hidden="true">{allDone ? '🎉' : '👋'}</span>
              </p>
              <h1 className="hero-title">{headline(active.length, doneCount)}</h1>
              <p className="hero-date">{formatLongDate(today)}</p>
            </div>
            {active.length > 0 && <ProgressRing done={doneCount} total={active.length} />}
          </section>
        </div>

        {notice && (
          <div className="notice" role="alert">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Đóng thông báo">
              ×
            </button>
          </div>
        )}

        <NewHabitForm habits={active} />

        {habits.isPending && (
          <div className="list" aria-busy="true">
            <div className="card skeleton" />
            <div className="card skeleton" />
            <div className="card skeleton" />
          </div>
        )}

        {habits.isError && (
          <div className="empty">
            <p className="error">{friendlyError(habits.error)}</p>
            <button className="btn btn-ghost" type="button" onClick={() => void habits.refetch()}>
              Thử lại
            </button>
          </div>
        )}

        {habits.isSuccess && active.length === 0 && <EmptyState onError={setNotice} />}

        {active.length > 0 && (
          <div className="list">
            {active.map((habit) => (
              <HabitCard key={habit.id} habit={habit} today={today} onError={setNotice} />
            ))}
          </div>
        )}

        {archived.length > 0 && (
          <div className="archived-toggle">
            <button className="link" type="button" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? 'Ẩn thói quen đã lưu trữ' : `Đã lưu trữ (${archived.length})`}
            </button>
          </div>
        )}
        {showArchived && archived.length > 0 && <ArchivedList habits={archived} onError={setNotice} />}
      </main>
    </div>
  )
}

function EmptyState({ onError }: { onError: (message: string) => void }) {
  const createHabit = useCreateHabit()

  return (
    <div className="empty">
      <span className="empty-emoji" aria-hidden="true">🌱</span>
      <p className="empty-title">Chưa có thói quen nào</p>
      <p className="muted">Chọn nhanh một cái bên dưới. Bắt đầu nhỏ thôi — làm được mỗi ngày mới là quan trọng.</p>
      <div className="chips">
        {SUGGESTIONS.map((s, i) => {
          const color = HABIT_COLORS[i % HABIT_COLORS.length].value
          return (
            <button
              key={s.name}
              type="button"
              className="chip"
              style={{ '--c': color } as CSSProperties}
              disabled={createHabit.isPending}
              onClick={() =>
                createHabit.mutate({ name: s.name, color }, { onError: (err) => onError(friendlyError(err)) })
              }
            >
              <span aria-hidden="true">{s.emoji}</span> {s.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ArchivedList({ habits, onError }: { habits: Habit[]; onError: (message: string) => void }) {
  const archive = useArchiveHabit()
  const remove = useDeleteHabit()

  return (
    <ul className="archived">
      {habits.map((habit) => (
        <li key={habit.id} style={{ '--c': colorOf(habit) } as CSSProperties}>
          <span className="archived-name">
            <span className="dot" aria-hidden="true" />
            {habit.name}
          </span>
          <div className="archived-actions">
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() =>
                archive.mutate(
                  { id: habit.id, archived: false },
                  { onError: (err) => onError(friendlyError(err)) },
                )
              }
            >
              Dùng lại
            </button>
            <button
              className="btn btn-danger btn-sm"
              type="button"
              onClick={() => {
                if (window.confirm(`Xoá hẳn "${habit.name}" và toàn bộ lịch sử?`)) {
                  remove.mutate(habit.id, { onError: (err) => onError(friendlyError(err)) })
                }
              }}
            >
              Xoá
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
