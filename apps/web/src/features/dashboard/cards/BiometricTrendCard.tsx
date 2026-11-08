import { BIOMETRICS, round1, type Units } from '@vitalog/shared'
import { Activity } from 'lucide-react'
import { useState } from 'react'
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import { Alert } from '../../../components/ui/alert'
import { Select } from '../../../components/ui/select'
import { ChartFrame, Legend, SERIES, axisProps, gridProps, tooltipProps } from '../chart'
import { Card, Empty, Segmented, Stat } from '../Card'
import { readingSeries, shortDay, weightSeries, type Point } from '../stats'
import { READING_RANGES, useReadings } from '../useReadings'

// Blood pressure is saved as two readings, so it charts as two lines.
const METRICS = BIOMETRICS.filter((b) => b.value !== 'sleep_duration')

type Props = { userId: string; today: string; units: Units }

export function BiometricTrendCard({ userId, today, units }: Props) {
  const [metric, setMetric] = useState<string>('weight')
  const [range, setRange] = useState<number>(91)
  const isBp = metric === 'blood_pressure'
  const primary = useReadings(userId, isBp ? 'blood_pressure_systolic' : metric, today, range)
  const diastolic = useReadings(userId, 'blood_pressure_diastolic', today, range)
  const info = METRICS.find((m) => m.value === metric)!
  const unit = metric === 'weight' ? info.unit(units) : (primary.data?.at(-1)?.unit ?? info.unit(units))

  const main: Point[] = metric === 'weight' ? weightSeries(primary.data ?? [], units) : readingSeries(primary.data ?? [])
  const second: Point[] = isBp ? readingSeries(diastolic.data ?? []) : []
  const merged = new Map<string, { day: string; value?: number; second?: number }>()
  for (const p of main) merged.set(p.day, { day: p.day, value: p.value })
  for (const p of second) merged.set(p.day, { ...(merged.get(p.day) ?? { day: p.day }), second: p.value })
  const rows = [...merged.values()].sort((a, b) => a.day.localeCompare(b.day))
  const values = main.map((p) => p.value)
  const loading = primary.isPending || (isBp && diastolic.isPending)
  const lines = isBp
    ? [
        { key: 'value', label: 'Systolic', color: SERIES[0] },
        { key: 'second', label: 'Diastolic', color: SERIES[1] },
      ]
    : [{ key: 'value', label: info.label, color: SERIES[0] }]

  return (
    <Card
      title="Biometrics"
      icon={Activity}
      details={
        values.length > 0 && (
          <dl className="grid grid-cols-3 gap-3">
            <Stat label="Latest" value={`${values.at(-1)} ${unit}`} />
            <Stat label="Lowest" value={`${Math.min(...values)} ${unit}`} />
            <Stat label="Highest" value={`${Math.max(...values)} ${unit}`} />
          </dl>
        )
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Select aria-label="Biometric" value={metric} onChange={(e) => setMetric(e.target.value)} className="h-8 w-auto text-xs">
          {METRICS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
        <Segmented label="Date range" value={range} options={READING_RANGES} onChange={setRange} />
      </div>
      {primary.isError || diastolic.isError ? (
        <Alert tone="error">Couldn’t load your readings.</Alert>
      ) : loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <Empty>No {info.label.toLowerCase()} readings in this range.</Empty>
      ) : (
        <>
          <ChartFrame summary={`${info.label} over time, latest ${round1(values.at(-1) ?? 0)} ${unit}.`}>
            <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="day" tickFormatter={shortDay} {...axisProps} minTickGap={16} />
              <YAxis {...axisProps} width={44} domain={['auto', 'auto']} />
              <Tooltip {...tooltipProps} cursor={{ stroke: 'var(--color-muted)' }} formatter={(v) => `${v} ${unit}`} />
              {lines.map((l) => (
                <Line key={l.key} dataKey={l.key} name={l.label} stroke={l.color} strokeWidth={2} connectNulls dot={rows.length < 30 ? { r: 3, fill: l.color, strokeWidth: 0 } : false} activeDot={{ r: 4, stroke: 'var(--color-surface)', strokeWidth: 2 }} />
              ))}
            </LineChart>
          </ChartFrame>
          {lines.length > 1 && <Legend items={lines} />}
        </>
      )}
    </Card>
  )
}
