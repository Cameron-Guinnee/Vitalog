import { Flame } from 'lucide-react'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { Alert } from '../../../components/ui/alert'
import { ChartFrame, Legend, SERIES, axisProps, gridProps, tooltipProps } from '../chart'
import { Card, Empty, Segmented, Stat } from '../Card'
import { averageOfLogged, matchesDayFilter, shortDay, type DayFilter } from '../stats'
import { ENERGY_RANGES, useEnergy } from '../useEnergy'

const MACROS = [
  { key: 'protein', label: 'Protein' },
  { key: 'fat', label: 'Fat' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'alcohol', label: 'Alcohol' },
] as const

export const DAY_FILTERS = [
  { value: 'all', label: 'All days' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
] as const

export function EnergyConsumedCard({ userId, today }: { userId: string; today: string }) {
  const [range, setRange] = useState<number>(7)
  const [filter, setFilter] = useState<DayFilter>('all')
  const energy = useEnergy(userId, today, range)
  const rows = energy.rows.filter((r) => matchesDayFilter(r.day, filter))
  const macroTotal = (r: (typeof rows)[number]) => r.protein + r.fat + r.carbs + r.alcohol
  const average = averageOfLogged(rows.map(macroTotal))
  const hasData = rows.some((r) => macroTotal(r) > 0)
  const share = (key: (typeof MACROS)[number]['key']) => {
    const total = rows.reduce((s, r) => s + macroTotal(r), 0)
    return total ? `${Math.round((rows.reduce((s, r) => s + r[key], 0) / total) * 100)}%` : '—'
  }

  return (
    <Card
      title="Energy consumed"
      icon={Flame}
      details={
        <div className="flex flex-col gap-3">
          <Segmented label="Days to include" value={filter} options={DAY_FILTERS} onChange={setFilter} />
          <dl className="grid grid-cols-4 gap-2">
            {MACROS.map((m) => (
              <Stat key={m.key} label={m.label} value={share(m.key)} />
            ))}
          </dl>
        </div>
      }
    >
      <Segmented label="Date range" value={range} options={ENERGY_RANGES} onChange={setRange} />
      {energy.isError ? (
        <Alert tone="error">Couldn’t load your energy history.</Alert>
      ) : energy.isPending ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : !hasData ? (
        <Empty>No food logged in this range.</Empty>
      ) : (
        <>
          <p className="text-sm text-muted">
            <span className="text-lg font-medium text-foreground tabular-nums">{average}</span> kcal a day on average
          </p>
          <ChartFrame summary={`Calories from each macronutrient per day. Average ${average} kcal on days with food logged.`}>
            <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="day" tickFormatter={shortDay} {...axisProps} minTickGap={16} />
              <YAxis {...axisProps} width={44} />
              <Tooltip {...tooltipProps} cursor={{ fill: 'var(--color-surface-raised)' }} formatter={(v) => `${v} kcal`} />
              {MACROS.map((m, i) => (
                <Bar
                  key={m.key}
                  dataKey={m.key}
                  name={m.label}
                  stackId="kcal"
                  fill={SERIES[i]}
                  stroke="var(--color-surface)"
                  strokeWidth={1}
                  maxBarSize={28}
                  radius={i === MACROS.length - 1 ? [4, 4, 0, 0] : 0}
                />
              ))}
            </BarChart>
          </ChartFrame>
          <Legend items={MACROS.map((m, i) => ({ label: m.label, color: SERIES[i]! }))} />
        </>
      )}
    </Card>
  )
}
