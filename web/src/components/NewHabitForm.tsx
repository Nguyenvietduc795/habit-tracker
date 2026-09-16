import { useState, type FormEvent } from 'react'
import { friendlyError } from '../lib/api.ts'
import { useCreateHabit } from '../lib/habits.ts'

export function NewHabitForm() {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const createHabit = useCreateHabit()

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setError(null)
    createHabit.mutate(
      { name: trimmed },
      {
        onSuccess: () => setName(''),
        onError: (err) => setError(friendlyError(err)),
      },
    )
  }

  return (
    <form className="new-habit" onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Thêm thói quen mới, ví dụ: Đọc sách 20 phút"
        maxLength={100}
        aria-label="Tên thói quen mới"
      />
      <button className="btn btn-primary" type="submit" disabled={!name.trim() || createHabit.isPending}>
        {createHabit.isPending ? 'Đang thêm…' : 'Thêm'}
      </button>
      {error && (
        <p className="error new-habit-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
