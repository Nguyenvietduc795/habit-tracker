import { useState, type CSSProperties, type FormEvent } from 'react'
import { friendlyError } from '../lib/api.ts'
import { nextColor } from '../lib/colors.ts'
import { useCreateHabit } from '../lib/habits.ts'
import type { Habit } from '../lib/types.ts'

export function NewHabitForm({ habits }: { habits: Habit[] }) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const createHabit = useCreateHabit()

  // Tu chon mau chua ai dung — user khong phai quyet dinh gi luc tao
  const color = nextColor(habits)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setError(null)
    createHabit.mutate(
      { name: trimmed, color },
      {
        onSuccess: () => setName(''),
        onError: (err) => setError(friendlyError(err)),
      },
    )
  }

  return (
    <div className="new-habit-wrap">
      <form className="new-habit" onSubmit={handleSubmit} style={{ '--c': color } as CSSProperties}>
        <span className="new-habit-dot" aria-hidden="true" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Thêm thói quen mới…"
          maxLength={100}
          aria-label="Tên thói quen mới"
        />
        <button
          className="new-habit-add"
          type="submit"
          disabled={!name.trim() || createHabit.isPending}
          aria-label="Thêm thói quen"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </form>
      {error && (
        <p className="error new-habit-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
