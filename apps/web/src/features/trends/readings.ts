import { BIOMETRICS, kgToLb, round1, weightToKg, type Units } from '@vitalog/shared'
import type { Reading } from '../dashboard/stats'

export type TrendMetric = { value: string; label: string; unit: (u: Units) => string }

/** Every biometric that can be charted. Blood pressure is two readings drawn together. */
export const TREND_METRICS: readonly TrendMetric[] = BIOMETRICS

/** The biometrics rows behind a metric. */
export const sourceMetrics = (metric: string) => (metric === 'blood_pressure' ? ['blood_pressure_systolic', 'blood_pressure_diastolic'] : [metric])

/** A reading in the user's units: weights are converted, everything else is shown as logged. */
export function displayValue(metric: string, r: Pick<Reading, 'value' | 'unit'>, units: Units): { value: number; unit: string } {
  if (metric !== 'weight') return { value: r.value, unit: r.unit }
  const kg = weightToKg(r.value, r.unit)
  return units === 'imperial' ? { value: round1(kgToLb(kg)), unit: 'lbs' } : { value: round1(kg), unit: 'kg' }
}

export type Summary = { average: number; min: number; max: number; change: number }

export function summarise(values: number[]): Summary | null {
  if (!values.length) return null
  return {
    average: round1(values.reduce((a, b) => a + b, 0) / values.length),
    min: round1(Math.min(...values)),
    max: round1(Math.max(...values)),
    change: round1(values.at(-1)! - values[0]!),
  }
}

export type HistoryRow = { key: string; ids: string[]; loggedAt: string; text: string; notes: string | null }

/**
 * One row per reading, newest first. Blood pressure readings saved together
 * (same timestamp) become one "120/80" row, and deleting it removes both.
 */
export function historyRows(metric: string, primary: Reading[], secondary: Reading[], units: Units): HistoryRow[] {
  const rows: HistoryRow[] = []
  if (metric === 'blood_pressure') {
    const diastolic = new Map(secondary.map((r) => [r.loggedAt, r]))
    const paired = new Set<Reading>()
    for (const s of primary) {
      const d = diastolic.get(s.loggedAt)
      if (d) paired.add(d)
      rows.push({
        key: s.id!,
        ids: [s.id!, ...(d ? [d.id!] : [])],
        loggedAt: s.loggedAt,
        text: `${s.value}/${d ? d.value : '–'} ${s.unit}`,
        notes: s.notes ?? null,
      })
    }
    for (const d of secondary)
      if (!paired.has(d)) rows.push({ key: d.id!, ids: [d.id!], loggedAt: d.loggedAt, text: `–/${d.value} ${d.unit}`, notes: d.notes ?? null })
  } else {
    for (const r of primary) {
      const v = displayValue(metric, r, units)
      rows.push({ key: r.id!, ids: [r.id!], loggedAt: r.loggedAt, text: `${v.value} ${v.unit}`, notes: r.notes ?? null })
    }
  }
  return rows.sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}
