import { useEffect, useState } from 'react'
import { friendlyError } from '../lib/api.ts'
import { useAuth } from '../lib/auth-context.ts'
import { formatLongDate, todayIn } from '../lib/dates.ts'
import { useArchiveHabit, useCreateHabit, useDeleteHabit, useHabits } from '../lib/habits.ts'
import { HabitCard } from './HabitCard.tsx'
import { NewHabitForm } from './NewHabitForm.tsx'

const SUGGESTIONS = ['Uống 2 lít nước', 'Đọc sách 20 phút', 'Tập thể dục', 'Đi ngủ trước 23h']

export function Dashboard() {
  const { user, logout } = useAuth()
  const habits = useHabits(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  if (!user) return null

  const today = todayIn(user.timezone)
  const list = habits.data ?? []
  const doneCount = list.filter((h) => h.checkedToday).length
  const percent = list.length > 0 ? Math.round((doneCount / list.length) * 100) : 0

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">🔥</span>
          <span className="brand-name">Habit Tracker</span>
        </div>
        <div className="account">
          <span className="account-name" title={user.email}>
            {user.displayName || user.email}
          </span>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => void logout()}>
            Đăng xuất
          </button>
        </div>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">{formatLongDate(today)}</p>
          <h1 className="hero-title">
            {list.length === 0
              ? 'Hôm nay bắt đầu từ đâu?'
              : doneCount === list.length
                ? 'Xong hết rồi. Giỏi lắm.'
                : `Còn ${list.length - doneCount} việc cho hôm nay`}
          </h1>
          {list.length > 0 && (
            <div className="progress" aria-label={`Đã xong ${doneCount} trên ${list.length}`}>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${percent}%` }} />
              </div>
              <span className="progress-text">
                {doneCount}/{list.length}
              </span>
            </div>
          )}
        </section>

        {notice && (
          <div className="notice" role="alert">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Đóng thông báo">
              ×
            </button>
          </div>
        )}

        <NewHabitForm />

        {habits.isPending && (
          <div className="list" aria-busy="true">
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

        {habits.isSuccess && list.length === 0 && <EmptyState onError={setNotice} />}

        {list.length > 0 && (
          <div className="list">
            {list.map((habit) => (
              <HabitCard key={habit.id} habit={habit} today={today} onError={setNotice} />
            ))}
          </div>
        )}

        <div className="archived-toggle">
          <button className="link" type="button" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? 'Ẩn thói quen đã lưu trữ' : 'Xem thói quen đã lưu trữ'}
          </button>
        </div>
        {showArchived && <ArchivedList onError={setNotice} />}
      </main>
    </div>
  )
}

function EmptyState({ onError }: { onError: (message: string) => void }) {
  const createHabit = useCreateHabit()

  return (
    <div className="empty">
      <p className="empty-title">Chưa có thói quen nào</p>
      <p className="muted">
        Gõ vào ô ở trên, hoặc chọn nhanh một gợi ý. Bắt đầu nhỏ thôi — một việc làm được mỗi ngày tốt hơn
        năm việc bỏ dở.
      </p>
      <div className="chips">
        {SUGGESTIONS.map((name) => (
          <button
            key={name}
            type="button"
            className="chip"
            disabled={createHabit.isPending}
            onClick={() =>
              createHabit.mutate({ name }, { onError: (err) => onError(friendlyError(err)) })
            }
          >
            + {name}
          </button>
        ))}
      </div>
    </div>
  )
}

function ArchivedList({ onError }: { onError: (message: string) => void }) {
  const all = useHabits(true)
  const archive = useArchiveHabit()
  const remove = useDeleteHabit()
  const archived = (all.data ?? []).filter((h) => h.archivedAt !== null)

  if (all.isPending) return <p className="muted archived-empty">Đang tải…</p>
  if (archived.length === 0) return <p className="muted archived-empty">Chưa lưu trữ thói quen nào.</p>

  return (
    <ul className="archived">
      {archived.map((habit) => (
        <li key={habit.id}>
          <span className="archived-name">{habit.name}</span>
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
