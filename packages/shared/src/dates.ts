// Diary days are the user's local calendar days.

/** YYYY-MM-DD for a local date. */
export function toDayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export function addDays(key: string, days: number): string {
  const d = fromDayKey(key)
  d.setDate(d.getDate() + days)
  return toDayKey(d)
}

/** Start (inclusive) and end (exclusive) of a local day, as ISO timestamps. */
export function dayRange(key: string): { start: string; end: string } {
  return { start: fromDayKey(key).toISOString(), end: fromDayKey(addDays(key, 1)).toISOString() }
}

/**
 * A timestamp inside the given day for a new entry: now if the day is today,
 * otherwise midday, so entries added to past days land on that day.
 */
export function timestampForDay(key: string, now: Date = new Date()): string {
  if (key === toDayKey(now)) return now.toISOString()
  const d = fromDayKey(key)
  d.setHours(12)
  return d.toISOString()
}

export function dayLabel(key: string, today: Date = new Date()): string {
  const todayKey = toDayKey(today)
  if (key === todayKey) return 'Today'
  if (key === addDays(todayKey, -1)) return 'Yesterday'
  if (key === addDays(todayKey, 1)) return 'Tomorrow'
  return fromDayKey(key).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}
