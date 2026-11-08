import { dayRange, addDays, toDayKey, type Json, type NutrientMap } from '@vitalog/shared'
import { allPages } from '../../lib/pages'
import { supabase } from '../../lib/supabase'
import { TREND_METRICS, sourceMetrics } from './readings'

export const trendsKey = (userId: string, ...rest: unknown[]) => ['trends', userId, ...rest] as const

export async function deleteReadings(ids: string[]) {
  const { error } = await supabase.from('biometrics').delete().in('id', ids)
  if (error) throw error
}

/** Total nutrients for each local day between two days (inclusive) that has food logged. */
export async function fetchNutritionByDay(userId: string, fromDay: string, toDay: string): Promise<Map<string, NutrientMap>> {
  const rows = await allPages((from, to) =>
    supabase
      .from('diary_entries')
      .select('id, logged_at, diary_nutrient_values (nutrient_id, value)')
      .eq('user_id', userId)
      .gte('logged_at', dayRange(fromDay).start)
      .lt('logged_at', dayRange(toDay).end)
      .order('logged_at')
      .order('id')
      .range(from, to),
  )
  const days = new Map<string, NutrientMap>()
  for (const e of rows) {
    const day = toDayKey(new Date(e.logged_at))
    const totals = days.get(day) ?? {}
    for (const v of e.diary_nutrient_values ?? []) totals[v.nutrient_id] = (totals[v.nutrient_id] ?? 0) + v.value
    days.set(day, totals)
  }
  return days
}

export type ReportOptions = { from: string; to: string; nutrition: boolean; biometrics: boolean; fasting: boolean; exercise: boolean }

export type ReportFood = { id: string; loggedAt: string; name: string; quantity: number; servingUnit: string; nutrients: NutrientMap }

/** Everything the printable report needs for a date range. */
export async function fetchReport(userId: string, o: ReportOptions) {
  const start = dayRange(o.from).start
  const end = dayRange(o.to).end
  const none = Promise.resolve([])
  const [foods, biometrics, fasts, exercise] = await Promise.all([
    o.nutrition
      ? allPages((from, to) =>
          supabase
            .from('diary_entries')
            .select('id, logged_at, quantity, serving_unit, foods (name), custom_foods (name), diary_nutrient_values (nutrient_id, value)')
            .eq('user_id', userId)
            .gte('logged_at', start)
            .lt('logged_at', end)
            .order('logged_at')
            .order('id')
            .range(from, to),
        )
      : none,
    o.biometrics
      ? allPages((from, to) =>
          supabase
            .from('biometrics')
            .select('id, logged_at, metric_type, value, unit, notes')
            .eq('user_id', userId)
            .gte('logged_at', start)
            .lt('logged_at', end)
            .order('logged_at')
            .order('id')
            .range(from, to),
        )
      : none,
    o.fasting
      ? allPages((from, to) =>
          supabase
            .from('fasting_log')
            .select('id, started_at, ended_at, target_duration_hours')
            .eq('user_id', userId)
            .gte('started_at', start)
            .lt('started_at', end)
            .not('ended_at', 'is', null)
            .order('started_at')
            .order('id')
            .range(from, to),
        )
      : none,
    o.exercise
      ? allPages((from, to) =>
          supabase
            .from('exercise_log')
            .select('id, logged_at, exercise_name, duration_minutes, calories_burned')
            .eq('user_id', userId)
            .gte('logged_at', start)
            .lt('logged_at', end)
            .order('logged_at')
            .order('id')
            .range(from, to),
        )
      : none,
  ])
  return {
    foods: foods.map(
      (e): ReportFood => ({
        id: e.id,
        loggedAt: e.logged_at,
        name: e.foods?.name ?? e.custom_foods?.name ?? 'Unknown food',
        quantity: e.quantity,
        servingUnit: e.serving_unit,
        nutrients: Object.fromEntries((e.diary_nutrient_values ?? []).map((v) => [v.nutrient_id, v.value])),
      }),
    ),
    biometrics,
    fasts,
    exercise,
  }
}

export type SnapshotMetrics = Record<string, { value: number; unit: string }>
export type Snapshot = { id: string; createdAt: string; note: string | null; metrics: SnapshotMetrics }

function toMetrics(json: Json): SnapshotMetrics {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return {}
  const out: SnapshotMetrics = {}
  for (const [k, v] of Object.entries(json)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.value === 'number') out[k] = { value: v.value, unit: String(v.unit ?? '') }
  }
  return out
}

export async function fetchSnapshots(userId: string): Promise<Snapshot[]> {
  const { data, error } = await supabase
    .from('biometric_snapshots')
    .select('id, created_at, note, metrics')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((s) => ({ id: s.id, createdAt: s.created_at, note: s.note, metrics: toMetrics(s.metrics) }))
}

/** Saves the latest value of every biometric the user has logged. Returns how many were captured. */
export async function takeSnapshot(userId: string, note: string): Promise<number> {
  const metrics = TREND_METRICS.flatMap((m) => sourceMetrics(m.value))
  const latest = await Promise.all(
    metrics.map((metric) =>
      supabase
        .from('biometrics')
        .select('value, unit')
        .eq('user_id', userId)
        .eq('metric_type', metric)
        .order('logged_at', { ascending: false })
        .limit(1),
    ),
  )
  const captured: SnapshotMetrics = {}
  latest.forEach((r, i) => {
    if (r.error) throw r.error
    const row = r.data?.[0]
    if (row) captured[metrics[i]!] = { value: row.value, unit: row.unit }
  })
  if (!Object.keys(captured).length) throw new NothingToSnapshot()
  const { error } = await supabase.from('biometric_snapshots').insert({ user_id: userId, metrics: captured, note: note.trim() || null })
  if (error) throw error
  return Object.keys(captured).length
}

export class NothingToSnapshot extends Error {
  constructor() {
    super('No biometrics logged yet')
  }
}

export async function deleteSnapshot(id: string) {
  const { error } = await supabase.from('biometric_snapshots').delete().eq('id', id)
  if (error) throw error
}

/** The first day of a range ending today, or null for all time. */
export const rangeStart = (today: string, days: number | null) => (days == null ? null : addDays(today, -(days - 1)))
