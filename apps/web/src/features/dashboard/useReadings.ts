import { useQuery } from '@tanstack/react-query'
import { addDays } from '@vitalog/shared'
import { dashboardKey, fetchReadings } from './api'

export const READING_RANGES = [
  { value: 14, label: '2 weeks' },
  { value: 28, label: '4 weeks' },
  { value: 91, label: '3 months' },
  { value: 182, label: '6 months' },
  { value: 365, label: '1 year' },
] as const

/** Readings of one biometric over the last `days` days. */
export function useReadings(userId: string, metric: string, today: string, days: number) {
  const from = addDays(today, -(days - 1))
  return useQuery({ queryKey: dashboardKey(userId, 'readings', metric, from), queryFn: () => fetchReadings(userId, metric, from) })
}
