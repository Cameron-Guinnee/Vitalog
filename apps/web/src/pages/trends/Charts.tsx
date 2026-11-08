import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toDayKey } from '@vitalog/shared'
import { X } from 'lucide-react'
import { useState } from 'react'
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import { useUserId } from '../../auth/AuthProvider'
import { Alert } from '../../components/ui/alert'
import { fetchReadings } from '../../features/dashboard/api'
import { Segmented, Stat } from '../../features/dashboard/Card'
import { ChartFrame, Legend, SERIES, axisProps, gridProps, tooltipProps } from '../../features/dashboard/chart'
import { shortDay } from '../../features/dashboard/stats'
import { deleteReadings, rangeStart, trendsKey } from '../../features/trends/api'
import { TREND_METRICS, displayValue, formatDateTime, historyRows, sourceMetrics, summarise } from '../../features/trends/readings'
import { useProfile } from '../../features/profile/useProfile'

const RANGES = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 182, label: '6 months' },
  { value: 365, label: '1 year' },
  { value: 0, label: 'All time' },
] as const

const HISTORY_PREVIEW = 10

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}`

export function Charts() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  const { data: profile } = useProfile(userId)
  const units = profile?.units_preference === 'metric' ? 'metric' : 'imperial'
  const [metric, setMetric] = useState('weight')
  const [range, setRange] = useState<number>(90)
  const [showAll, setShowAll] = useState(false)
  const from = rangeStart(toDayKey(new Date()), range || null)
  const [primaryMetric, secondaryMetric] = sourceMetrics(metric)

  const primary = useQuery({ queryKey: trendsKey(userId, 'readings', primaryMetric, from), queryFn: () => fetchReadings(userId, primaryMetric!, from) })
  const secondary = useQuery({
    queryKey: trendsKey(userId, 'readings', secondaryMetric, from),
    queryFn: () => fetchReadings(userId, secondaryMetric!, from),
    enabled: !!secondaryMetric,
  })
  const remove = useMutation({
    mutationFn: deleteReadings,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: trendsKey(userId) }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', userId] }),
        queryClient.invalidateQueries({ queryKey: ['latest-weight', userId] }),
      ]),
  })

  const info = TREND_METRICS.find((m) => m.value === metric)!
  const readings = primary.data ?? []
  const second = secondaryMetric ? (secondary.data ?? []) : []
  const loading = primary.isPending || (!!secondaryMetric && secondary.isPending)
  const values = readings.map((r) => displayValue(metric, r, units).value)
  const unit = readings.length ? displayValue(metric, readings.at(-1)!, units).unit : info.unit(units)
  const stats = summarise(values)
  const secondStats = summarise(second.map((r) => r.value))

  // Every reading is a point here (not one per day), so the chart matches the history list.
  const points = new Map<string, { at: string; value?: number; second?: number }>()
  readings.forEach((r, i) => points.set(r.loggedAt, { at: r.loggedAt, value: values[i] }))
  for (const r of second) points.set(r.loggedAt, { ...(points.get(r.loggedAt) ?? { at: r.loggedAt }), second: r.value })
  const rows = [...points.values()].sort((a, b) => a.at.localeCompare(b.at))
  const history = historyRows(metric, readings, second, units)
  const lines = secondaryMetric
    ? [
        { key: 'value', label: 'Systolic', color: SERIES[0] },
        { key: 'second', label: 'Diastolic', color: SERIES[1] },
      ]
    : [{ key: 'value', label: info.label, color: SERIES[0] }]
  const atLabel = (at: unknown) => (typeof at === 'string' ? shortDay(toDayKey(new Date(at))) : '')

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div role="tablist" aria-label="Biometric" className="flex gap-1 overflow-x-auto pb-1">
        {TREND_METRICS.map((m) => (
          <button
            key={m.value}
            role="tab"
            type="button"
            aria-selected={m.value === metric}
            onClick={() => setMetric(m.value)}
            className={
              m.value === metric
                ? 'shrink-0 rounded-lg bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary'
                : 'shrink-0 rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-surface-raised hover:text-foreground'
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      <section aria-label={info.label} className="flex flex-col gap-4 rounded-xl bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">{info.label}</h2>
            {history[0] && (
              <p className="text-sm text-muted">
                Latest <span className="font-medium text-foreground">{history[0].text}</span> · {formatDateTime(history[0].loggedAt)}
              </p>
            )}
          </div>
          <Segmented label="Date range" value={range} options={RANGES} onChange={setRange} />
        </div>

        {primary.isError || secondary.isError ? (
          <Alert tone="error">Couldn’t load your readings. Refresh to try again.</Alert>
        ) : loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted">
            <p>No {info.label.toLowerCase()} readings {range ? 'in this range' : 'yet'}.</p>
            <p>Log one from the diary or dashboard with the Biometric button.</p>
          </div>
        ) : (
          <>
            <ChartFrame height={280} summary={`${info.label} over time. ${stats ? `Average ${stats.average}, lowest ${stats.min}, highest ${stats.max} ${unit}.` : ''}`}>
              <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="at" tickFormatter={atLabel} {...axisProps} minTickGap={24} />
                <YAxis {...axisProps} width={44} domain={['auto', 'auto']} />
                <Tooltip {...tooltipProps} labelFormatter={(at) => (typeof at === 'string' ? formatDateTime(at) : '')} cursor={{ stroke: 'var(--color-muted)' }} formatter={(v) => `${v} ${unit}`} />
                {lines.map((l) => (
                  <Line key={l.key} dataKey={l.key} name={l.label} stroke={l.color} strokeWidth={2} connectNulls dot={rows.length <= 60 ? { r: 3, fill: l.color, strokeWidth: 0 } : false} activeDot={{ r: 4, stroke: 'var(--color-surface)', strokeWidth: 2 }} />
                ))}
              </LineChart>
            </ChartFrame>
            {lines.length > 1 && <Legend items={lines} />}
            {stats && (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {secondaryMetric && secondStats ? (
                  <>
                    <Stat label="Average" value={`${Math.round(stats.average)}/${Math.round(secondStats.average)} ${unit}`} />
                    <Stat label="Lowest systolic" value={`${stats.min} ${unit}`} />
                    <Stat label="Highest systolic" value={`${stats.max} ${unit}`} />
                    <Stat label="Change" value={`${signed(stats.change)}/${signed(secondStats.change)} ${unit}`} />
                  </>
                ) : (
                  <>
                    <Stat label="Average" value={`${stats.average} ${unit}`} />
                    <Stat label="Lowest" value={`${stats.min} ${unit}`} />
                    <Stat label="Highest" value={`${stats.max} ${unit}`} />
                    <Stat label="Change" value={`${signed(stats.change)} ${unit}`} />
                  </>
                )}
              </dl>
            )}
          </>
        )}
      </section>

      {history.length > 0 && (
        <section aria-label="History" className="rounded-xl bg-surface">
          <h2 className="px-5 pt-4 pb-2 font-medium">History</h2>
          {remove.isError && (
            <div className="px-5 pb-2">
              <Alert tone="error">Couldn’t delete that reading. Please try again.</Alert>
            </div>
          )}
          <ul className="divide-y divide-border">
            {(showAll ? history : history.slice(0, HISTORY_PREVIEW)).map((h) => (
              <li key={h.key} className="group flex items-center gap-3 px-5 py-2.5">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium tabular-nums">{h.text}</span>
                  <span className="text-xs text-muted">
                    {formatDateTime(h.loggedAt)}
                    {h.notes ? ` · ${h.notes}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => remove.mutate(h.ids)}
                  disabled={remove.isPending}
                  aria-label={`Delete reading from ${formatDateTime(h.loggedAt)}`}
                  className="rounded-md p-1 text-muted opacity-60 hover:bg-surface-raised hover:text-danger group-hover:opacity-100"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
          {history.length > HISTORY_PREVIEW && (
            <div className="border-t border-border px-5 py-2">
              <button type="button" onClick={() => setShowAll((v) => !v)} className="text-sm text-primary hover:underline">
                {showAll ? 'Show fewer' : `Show all ${history.length} readings`}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
