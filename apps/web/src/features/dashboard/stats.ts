import { addDays, fromDayKey, kgToLb, round1, toDayKey, weightToKg, type Units } from '@vitalog/shared'

/** The last `count` local days, oldest first, ending with `today`. */
export function lastDays(count: number, today: string): string[] {
  return Array.from({ length: count }, (_, i) => addDays(today, i - count + 1))
}

export type DayFilter = 'all' | 'weekdays' | 'weekends'

export function matchesDayFilter(day: string, filter: DayFilter): boolean {
  if (filter === 'all') return true
  const weekday = fromDayKey(day).getDay()
  const weekend = weekday === 0 || weekday === 6
  return filter === 'weekends' ? weekend : !weekend
}

/** Calories from each macronutrient (4/9/4/7 kcal per gram) plus the logged total. */
export type DayEnergy = { day: string; protein: number; fat: number; carbs: number; alcohol: number; consumed: number; burned: number }

export type EnergyLog = { day: string; protein: number; fat: number; carbs: number; alcohol: number; energy: number }

/** One row per day in `days`, with zeros for days nothing was logged. */
export function energyByDay(days: string[], foods: EnergyLog[], burns: { day: string; kcal: number }[]): DayEnergy[] {
  const byDay = new Map(days.map((day) => [day, { day, protein: 0, fat: 0, carbs: 0, alcohol: 0, consumed: 0, burned: 0 }]))
  for (const f of foods) {
    const d = byDay.get(f.day)
    if (!d) continue
    d.protein += f.protein * 4
    d.fat += f.fat * 9
    d.carbs += f.carbs * 4
    d.alcohol += f.alcohol * 7
    d.consumed += f.energy
  }
  for (const b of burns) {
    const d = byDay.get(b.day)
    if (d) d.burned += b.kcal
  }
  return [...byDay.values()].map((d) => ({
    day: d.day,
    protein: Math.round(d.protein),
    fat: Math.round(d.fat),
    carbs: Math.round(d.carbs),
    alcohol: Math.round(d.alcohol),
    consumed: Math.round(d.consumed),
    burned: Math.round(d.burned),
  }))
}

/** Average of the days that have something logged, so empty days don't drag it down. */
export function averageOfLogged(values: number[]): number {
  const logged = values.filter((v) => v > 0)
  return logged.length ? Math.round(logged.reduce((a, b) => a + b, 0) / logged.length) : 0
}

/**
 * Current and longest run of consecutive days with something logged. The current
 * streak survives until the end of today, so it still counts yesterday's run.
 */
export function streaks(loggedDays: Iterable<string>, today: string): { current: number; longest: number } {
  const days = new Set(loggedDays)
  let longest = 0
  for (const day of days) {
    if (days.has(addDays(day, -1))) continue // not the start of a run
    let length = 1
    while (days.has(addDays(day, length))) length++
    longest = Math.max(longest, length)
  }
  let current = 0
  let cursor = days.has(today) ? today : addDays(today, -1)
  while (days.has(cursor)) {
    current++
    cursor = addDays(cursor, -1)
  }
  return { current, longest }
}

export type Fast = { id: string; startedAt: string; endedAt: string | null; targetHours: number | null }

const hoursBetween = (start: string, end: string) => (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000

/** Stats over finished fasts. `finished` is newest first. */
export function fastStats(finished: Fast[]) {
  const hours = finished.filter((f) => f.endedAt).map((f) => hoursBetween(f.startedAt, f.endedAt!))
  const recent = hours.slice(0, 7)
  return {
    count: hours.length,
    longestHours: round1(hours.length ? Math.max(...hours) : 0),
    totalHours: round1(hours.reduce((a, b) => a + b, 0)),
    recentAverageHours: round1(recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0),
  }
}

/** HH:MM:SS, with hours allowed past 24. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`
}

export type Reading = { id?: string; loggedAt: string; value: number; unit: string; notes?: string | null }
export type Point = { day: string; value: number }

/** Weigh-ins in the user's units, one per day (the last of the day), oldest first. */
export function weightSeries(readings: Reading[], units: Units): Point[] {
  const byDay = new Map<string, number>()
  const sorted = [...readings].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
  for (const r of sorted) {
    const kg = weightToKg(r.value, r.unit)
    byDay.set(toDayKey(new Date(r.loggedAt)), round1(units === 'imperial' ? kgToLb(kg) : kg))
  }
  return [...byDay].map(([day, value]) => ({ day, value }))
}

/** Other readings as logged, one per day (the last of the day), oldest first. */
export function readingSeries(readings: Reading[]): Point[] {
  const byDay = new Map<string, number>()
  for (const r of [...readings].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))) byDay.set(toDayKey(new Date(r.loggedAt)), r.value)
  return [...byDay].map(([day, value]) => ({ day, value }))
}

/** Short axis label for a day key, such as "Nov 7". */
export function shortDay(day: string): string {
  return fromDayKey(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
