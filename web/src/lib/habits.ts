import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api.ts'
import type { Frequency, Habit, HabitDetail } from './types.ts'

export const habitKeys = {
  all: ['habits'] as const,
  list: ['habits', 'list'] as const,
  detail: (id: string) => ['habits', 'detail', id] as const,
}

/**
 * MOT request lay ca thoi quen dang dung lan da luu tru, roi tach o frontend.
 * Truoc day goi 2 lan rieng — mot lan chi de biet "co cai nao luu tru khong".
 */
export function useHabits() {
  return useQuery({
    queryKey: habitKeys.list,
    queryFn: () => api<Habit[]>('/habits?includeArchived=true'),
  })
}

/** Chi tai chi tiet khi mo the ra — khong goi N request cho N the luc vao trang. */
export function useHabitDetail(id: string, enabled: boolean) {
  return useQuery({
    queryKey: habitKeys.detail(id),
    queryFn: () => api<HabitDetail>(`/habits/${id}`),
    enabled,
  })
}

function useInvalidateHabits() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: habitKeys.all })
}

export function useCreateHabit() {
  const invalidate = useInvalidateHabits()
  return useMutation({
    mutationFn: (input: { name: string; color: string; frequency?: Frequency }) =>
      api<Habit>('/habits', { method: 'POST', json: input }),
    onSuccess: invalidate,
  })
}

export function useUpdateHabit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...changes }: { id: string; name?: string; color?: string }) =>
      api<Habit>(`/habits/${id}`, { method: 'PATCH', json: changes }),

    // Doi mau thi doi NGAY tren man hinh, khong cho server
    onMutate: async ({ id, ...changes }) => {
      await queryClient.cancelQueries({ queryKey: habitKeys.list })
      const prevList = queryClient.getQueryData<Habit[]>(habitKeys.list)
      if (prevList) {
        queryClient.setQueryData<Habit[]>(
          habitKeys.list,
          prevList.map((h) => (h.id === id ? { ...h, ...changes } : h)),
        )
      }
      return { prevList }
    },
    onError: (_error, _vars, context) => {
      if (context?.prevList) queryClient.setQueryData(habitKeys.list, context.prevList)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitKeys.all }),
  })
}

export function useArchiveHabit() {
  const invalidate = useInvalidateHabits()
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      api<Habit>(`/habits/${id}/archive`, { method: 'PATCH', json: { archived } }),
    onSuccess: invalidate,
  })
}

export function useDeleteHabit() {
  const invalidate = useInvalidateHabits()
  return useMutation({
    mutationFn: (id: string) => api<void>(`/habits/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

interface ToggleInput {
  habitId: string
  date: string
  /** Trang thai HIEN TAI truoc khi bam */
  checked: boolean
  today: string
}

/**
 * Tick / bo tick mot ngay.
 * Cap nhat giao dien NGAY (optimistic) roi moi goi server — bam la thay doi,
 * khong phai cho mang. Server bao loi thi tra lai trang thai cu.
 */
export function useToggleCheckIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ habitId, date, checked }: ToggleInput) =>
      checked
        ? api<void>(`/habits/${habitId}/check-in?date=${date}`, { method: 'DELETE' })
        : api<unknown>(`/habits/${habitId}/check-in`, { method: 'POST', json: { date } }),

    onMutate: async ({ habitId, date, checked, today }) => {
      const detailKey = habitKeys.detail(habitId)

      await queryClient.cancelQueries({ queryKey: habitKeys.all })

      const prevList = queryClient.getQueryData<Habit[]>(habitKeys.list)
      const prevDetail = queryClient.getQueryData<HabitDetail>(detailKey)

      if (date === today && prevList) {
        // Streak tinh truoc duoc chinh xac cho ngay hom nay:
        // chua tick -> tick: chuoi dang tinh den hom qua, cong them hom nay = +1
        // da tick -> bo tick: chuoi van con song nho hom qua = -1
        queryClient.setQueryData<Habit[]>(
          habitKeys.list,
          prevList.map((h) =>
            h.id === habitId
              ? {
                  ...h,
                  checkedToday: !checked,
                  currentStreak: checked ? Math.max(0, h.currentStreak - 1) : h.currentStreak + 1,
                }
              : h,
          ),
        )
      }

      if (prevDetail) {
        const checkIns = checked
          ? prevDetail.checkIns.filter((c) => c.doneOn !== date)
          : [...prevDetail.checkIns, { doneOn: date, note: null }]
        queryClient.setQueryData<HabitDetail>(detailKey, {
          ...prevDetail,
          checkIns,
          checkedToday: date === today ? !checked : prevDetail.checkedToday,
        })
      }

      return { prevList, prevDetail }
    },

    onError: (_error, { habitId }, context) => {
      if (context?.prevList) queryClient.setQueryData(habitKeys.list, context.prevList)
      if (context?.prevDetail) queryClient.setQueryData(habitKeys.detail(habitId), context.prevDetail)
    },

    // Lay lai so lieu that tu server (streak do server tinh)
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitKeys.all }),
  })
}
