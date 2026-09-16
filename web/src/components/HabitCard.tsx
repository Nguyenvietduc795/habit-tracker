import { useState, type FormEvent } from 'react'
import { friendlyError } from '../lib/api.ts'
import { WEEKDAY_LABELS, calendarWeeks, formatShortDate } from '../lib/dates.ts'
import {
  useArchiveHabit,
  useDeleteHabit,
  useHabitDetail,
  useRenameHabit,
  useToggleCheckIn,
} from '../lib/habits.ts'
import type { Habit } from '../lib/types.ts'

interface Props {
  habit: Habit
  today: string
  onError: (message: string) => void
}

function streakText(habit: Habit): string {
  if (habit.checkedToday) return `${habit.currentStreak} ngày liên tục`
  if (habit.currentStreak > 0) return `${habit.currentStreak} ngày — tick hôm nay để giữ chuỗi`
  return 'Chưa có chuỗi — tick hôm nay để bắt đầu'
}

export function HabitCard({ habit, today, onError }: Props) {
  const [open, setOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(habit.name)

  const detail = useHabitDetail(habit.id, open)
  const toggle = useToggleCheckIn()
  const rename = useRenameHabit()
  const archive = useArchiveHabit()
  const remove = useDeleteHabit()

  function toggleDay(date: string, checked: boolean) {
    toggle.mutate(
      { habitId: habit.id, date, checked, today },
      { onError: (err) => onError(friendlyError(err, { 409: 'Ngày này đã được tick rồi.' })) },
    )
  }

  function handleRename(event: FormEvent) {
    event.preventDefault()
    const name = draft.trim()
    if (!name || name === habit.name) {
      setRenaming(false)
      return
    }
    rename.mutate(
      { id: habit.id, name },
      {
        onSuccess: () => setRenaming(false),
        onError: (err) => onError(friendlyError(err)),
      },
    )
  }

  function handleArchive() {
    archive.mutate(
      { id: habit.id, archived: true },
      { onError: (err) => onError(friendlyError(err)) },
    )
  }

  function handleDelete() {
    const ok = window.confirm(
      `Xoá hẳn "${habit.name}"?\n\nToàn bộ lịch sử tick sẽ mất và không khôi phục được. ` +
        'Nếu chỉ muốn tạm ẩn, hãy chọn "Lưu trữ".',
    )
    if (!ok) return
    remove.mutate(habit.id, { onError: (err) => onError(friendlyError(err)) })
  }

  const done = habit.checkedToday
  const checkedDays = new Set(detail.data?.checkIns.map((c) => c.doneOn) ?? [])
  const days = calendarWeeks(today)

  return (
    <article className={`card ${done ? 'is-done' : ''} ${open ? 'is-open' : ''}`}>
      <div className="card-row">
        <button
          type="button"
          className="check"
          onClick={() => toggleDay(today, done)}
          disabled={toggle.isPending}
          aria-pressed={done}
          aria-label={done ? `Bỏ tick "${habit.name}" hôm nay` : `Tick "${habit.name}" hôm nay`}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </button>

        <button
          type="button"
          className="card-main"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="card-name">{habit.name}</span>
          <span className={`card-sub ${habit.currentStreak > 0 ? 'has-streak' : ''}`}>
            {habit.currentStreak > 0 && <span aria-hidden="true">🔥 </span>}
            {streakText(habit)}
          </span>
        </button>

        <span className="chev" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M8 10l4 4 4-4" />
          </svg>
        </span>
      </div>

      {open && (
        <div className="detail">
          {detail.isPending && <p className="muted">Đang tải lịch sử…</p>}
          {detail.isError && <p className="error">{friendlyError(detail.error)}</p>}

          {detail.data && (
            <>
              <div className="stats">
                <div className="stat">
                  <span className="stat-num">{habit.currentStreak}</span>
                  <span className="stat-label">Chuỗi hiện tại</span>
                </div>
                <div className="stat">
                  <span className="stat-num">{detail.data.longestStreak}</span>
                  <span className="stat-label">Dài nhất</span>
                </div>
                <div className="stat">
                  <span className="stat-num">{detail.data.checkIns.length}</span>
                  <span className="stat-label">Tổng số lần</span>
                </div>
              </div>

              <div className="calendar">
                <div className="grid" role="grid" aria-label="5 tuần gần nhất">
                  {WEEKDAY_LABELS.map((label) => (
                    <span key={label} className="weekday">
                      {label}
                    </span>
                  ))}
                  {days.map((date) => {
                    const on = checkedDays.has(date)
                    const future = date > today
                    return (
                      <button
                        key={date}
                        type="button"
                        className={`day ${on ? 'is-on' : ''} ${date === today ? 'is-today' : ''}`}
                        disabled={future || toggle.isPending}
                        onClick={() => toggleDay(date, on)}
                        aria-pressed={on}
                        title={future ? 'Chưa tới ngày này' : `${formatShortDate(date)} — bấm để ${on ? 'bỏ tick' : 'tick bù'}`}
                      >
                        {Number(date.slice(8))}
                      </button>
                    )
                  })}
                </div>
                <p className="hint">Quên tick hôm trước? Bấm vào ngày đó để tick bù.</p>
              </div>
            </>
          )}

          {renaming ? (
            <form className="rename" onSubmit={handleRename}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={100}
                autoFocus
                aria-label="Tên mới"
              />
              <button className="btn btn-primary" type="submit" disabled={rename.isPending}>
                Lưu
              </button>
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  setDraft(habit.name)
                  setRenaming(false)
                }}
              >
                Huỷ
              </button>
            </form>
          ) : (
            <div className="actions">
              <button className="btn btn-ghost" type="button" onClick={() => setRenaming(true)}>
                Đổi tên
              </button>
              <button className="btn btn-ghost" type="button" onClick={handleArchive} disabled={archive.isPending}>
                Lưu trữ
              </button>
              <button className="btn btn-danger" type="button" onClick={handleDelete} disabled={remove.isPending}>
                Xoá
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
