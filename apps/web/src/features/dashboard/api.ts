import { NUTRIENT, addDays, dayRange, toDayKey } from '@vitalog/shared'
import { supabase } from '../../lib/supabase'
import type { EnergyLog, Fast, Reading } from './stats'

export const dashboardKey = (userId: string, ...rest: unknown[]) => ['dashboard', userId, ...rest] as const

// PostgREST returns at most 1000 rows per request, so longer ranges are read in pages.
const PAGE = 1000

async function allPages<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) return rows
  }
}

/** From the start of `fromDay` to the end of `toDay`, as ISO timestamps. */
function span(fromDay: string, toDay: string) {
  return { start: dayRange(fromDay).start, end: dayRange(toDay).end }
}

const ENERGY_NUTRIENTS = [NUTRIENT.energy, NUTRIENT.protein, NUTRIENT.fat, NUTRIENT.carbs, NUTRIENT.alcohol]

/** Energy and macros for every food logged between two days, plus exercise calories. */
export async function fetchEnergy(userId: string, fromDay: string, toDay: string) {
  const { start, end } = span(fromDay, toDay)
  const [foods, burns] = await Promise.all([
    allPages((from, to) =>
      supabase
        .from('diary_entries')
        .select('id, logged_at, diary_nutrient_values (nutrient_id, value)')
        .eq('user_id', userId)
        .gte('logged_at', start)
        .lt('logged_at', end)
        .in('diary_nutrient_values.nutrient_id', ENERGY_NUTRIENTS)
        .order('logged_at')
        .order('id')
        .range(from, to),
    ),
    allPages((from, to) =>
      supabase
        .from('exercise_log')
        .select('id, logged_at, calories_burned')
        .eq('user_id', userId)
        .gte('logged_at', start)
        .lt('logged_at', end)
        .order('logged_at')
        .order('id')
        .range(from, to),
    ),
  ])

  const logs: EnergyLog[] = foods.map((e) => {
    const n: Record<number, number> = {}
    for (const v of e.diary_nutrient_values ?? []) n[v.nutrient_id] = v.value
    return {
      day: toDayKey(new Date(e.logged_at)),
      energy: n[NUTRIENT.energy] ?? 0,
      protein: n[NUTRIENT.protein] ?? 0,
      fat: n[NUTRIENT.fat] ?? 0,
      carbs: n[NUTRIENT.carbs] ?? 0,
      alcohol: n[NUTRIENT.alcohol] ?? 0,
    }
  })
  return {
    foods: logs,
    burns: burns.map((b) => ({ day: toDayKey(new Date(b.logged_at)), kcal: b.calories_burned ?? 0 })),
  }
}

/** Readings of one biometric since a day, oldest first. */
export async function fetchReadings(userId: string, metric: string, fromDay: string): Promise<Reading[]> {
  const rows = await allPages((from, to) =>
    supabase
      .from('biometrics')
      .select('id, logged_at, value, unit')
      .eq('user_id', userId)
      .eq('metric_type', metric)
      .gte('logged_at', dayRange(fromDay).start)
      .order('logged_at')
      .order('id')
      .range(from, to),
  )
  return rows.map((r) => ({ loggedAt: r.logged_at, value: r.value, unit: r.unit }))
}

/** The first and latest weigh-ins ever, for progress toward the weight goal. */
export async function fetchWeightEnds(userId: string): Promise<{ first: Reading | null; latest: Reading | null }> {
  const query = (ascending: boolean) =>
    supabase
      .from('biometrics')
      .select('logged_at, value, unit')
      .eq('user_id', userId)
      .eq('metric_type', 'weight')
      .order('logged_at', { ascending })
      .limit(1)
  const [first, latest] = await Promise.all([query(true), query(false)])
  for (const r of [first, latest]) if (r.error) throw r.error
  const toReading = (r: { logged_at: string; value: number; unit: string } | undefined) =>
    r ? { loggedAt: r.logged_at, value: r.value, unit: r.unit } : null
  return { first: toReading(first.data?.[0]), latest: toReading(latest.data?.[0]) }
}

export async function fetchFasts(userId: string): Promise<{ active: Fast | null; finished: Fast[] }> {
  const rows = await allPages((from, to) =>
    supabase
      .from('fasting_log')
      .select('id, started_at, ended_at, target_duration_hours')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .order('id')
      .range(from, to),
  )
  const fasts = rows.map((r) => ({ id: r.id, startedAt: r.started_at, endedAt: r.ended_at, targetHours: r.target_duration_hours }))
  return { active: fasts.find((f) => !f.endedAt) ?? null, finished: fasts.filter((f) => f.endedAt) }
}

export async function startFast(userId: string, targetHours: number) {
  const { error } = await supabase
    .from('fasting_log')
    .insert({ user_id: userId, started_at: new Date().toISOString(), target_duration_hours: targetHours })
  if (error) throw error
}

/** Ends a fast. It counts as completed only if it reached its target. */
export async function endFast(fast: Fast, now = new Date()) {
  const hours = (now.getTime() - new Date(fast.startedAt).getTime()) / 3_600_000
  const { error } = await supabase
    .from('fasting_log')
    .update({ ended_at: now.toISOString(), completed: hours >= (fast.targetHours ?? 0) })
    .eq('id', fast.id)
  if (error) throw error
}

export const STREAK_WINDOW_DAYS = 366

/** Logging streaks from the last year of food, exercise and biometric entries, and all-time totals. */
export async function fetchStreaks(userId: string, today: string) {
  const since = dayRange(addDays(today, -STREAK_WINDOW_DAYS)).start
  const days = (table: 'diary_entries' | 'exercise_log' | 'biometrics') =>
    allPages((from, to) =>
      supabase.from(table).select('id, logged_at').eq('user_id', userId).gte('logged_at', since).order('logged_at').order('id').range(from, to),
    )
  const count = async (table: 'diary_entries' | 'exercise_log' | 'biometrics') => {
    const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq('user_id', userId)
    if (error) throw error
    return count ?? 0
  }
  const [foods, exercise, biometrics, foodCount, exerciseCount, biometricCount, saved] = await Promise.all([
    days('diary_entries'),
    days('exercise_log'),
    days('biometrics'),
    count('diary_entries'),
    count('exercise_log'),
    count('biometrics'),
    supabase.from('streaks').select('longest_streak').eq('user_id', userId).maybeSingle(),
  ])
  if (saved.error) throw saved.error
  const loggedDays = [...foods, ...exercise, ...biometrics].map((r) => toDayKey(new Date(r.logged_at)))
  return {
    loggedDays,
    savedLongest: saved.data?.longest_streak ?? 0,
    totals: { foods: foodCount, exercises: exerciseCount, biometrics: biometricCount },
  }
}

/** Sleep sessions that ended in the last `days` days, newest first. */
export async function fetchSleep(userId: string, today: string, days: number) {
  const { data, error } = await supabase
    .from('sleep_log')
    .select('id, sleep_start, sleep_end, duration_minutes')
    .eq('user_id', userId)
    .gte('sleep_end', dayRange(addDays(today, -(days - 1))).start)
    .order('sleep_end', { ascending: false })
  if (error) throw error
  return data ?? []
}
