import { useQuery } from '@tanstack/react-query'
import { dashboardKey, fetchEnergy } from './api'
import { energyByDay, lastDays } from './stats'

export const ENERGY_RANGES = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
] as const

/** Daily energy for the last `count` days, with empty days filled in. */
export function useEnergy(userId: string, today: string, count: number) {
  const days = lastDays(count, today)
  const query = useQuery({
    queryKey: dashboardKey(userId, 'energy', days[0], today),
    queryFn: () => fetchEnergy(userId, days[0]!, today),
  })
  return { ...query, rows: query.data ? energyByDay(days, query.data.foods, query.data.burns) : [] }
}
