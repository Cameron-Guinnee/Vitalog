import { BIOMETRICS, round1, type Units } from '@vitalog/shared'
import type { SnapshotMetrics } from './api'
import { displayValue } from './readings'

const ORDER = BIOMETRICS.flatMap((b) => (b.value === 'blood_pressure' ? ['blood_pressure_systolic', 'blood_pressure_diastolic'] : [b.value]))

export const snapshotLabel = (metric: string) =>
  metric === 'blood_pressure_systolic'
    ? 'Blood pressure (systolic)'
    : metric === 'blood_pressure_diastolic'
      ? 'Blood pressure (diastolic)'
      : (BIOMETRICS.find((b) => b.value === metric)?.label ?? metric.replace(/_/g, ' '))

export type SnapshotRow = { metric: string; label: string; value: number; unit: string; change: number | null }

/**
 * A snapshot's values in the user's units, in the usual biometric order, each with
 * its change since the previous snapshot (when both have it in the same unit).
 */
export function snapshotRows(metrics: SnapshotMetrics, previous: SnapshotMetrics | null, units: Units): SnapshotRow[] {
  const keys = Object.keys(metrics).sort((a, b) => {
    const ia = ORDER.indexOf(a)
    const ib = ORDER.indexOf(b)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })
  return keys.map((metric) => {
    const now = displayValue(metric, metrics[metric]!, units)
    const before = previous?.[metric] ? displayValue(metric, previous[metric], units) : null
    return {
      metric,
      label: snapshotLabel(metric),
      value: now.value,
      unit: now.unit,
      change: before && before.unit === now.unit ? round1(now.value - before.value) : null,
    }
  })
}
