import { History } from 'lucide-react'
import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import { Alert } from '../../../components/ui/alert'
import { ChartFrame, Legend, SERIES, axisProps, gridProps, tooltipProps } from '../chart'
import { Card, Empty, Segmented, Stat } from '../Card'
import { averageOfLogged, shortDay } from '../stats'
import { ENERGY_RANGES, useEnergy } from '../useEnergy'

type Show = 'consumed' | 'burned' | 'both'
const SHOW = [
  { value: 'consumed', label: 'Consumed' },
  { value: 'burned', label: 'Burned' },
  { value: 'both', label: 'Both' },
] as const

export function EnergyHistoryCard({ userId, today, calorieGoal }: { userId: string; today: string; calorieGoal: number }) {
  const [range, setRange] = useState<number>(14)
  const [show, setShow] = useState<Show>('consumed')
  const energy = useEnergy(userId, today, range)
  const rows = energy.rows
  // Days with no food logged break the line instead of plunging to zero.
  const chartRows = rows.map((r) => ({ ...r, consumed: r.consumed || null }))
  const avgConsumed = averageOfLogged(rows.map((r) => r.consumed))
  const avgBurned = averageOfLogged(rows.map((r) => r.burned))
  const daysUnderGoal = rows.filter((r) => r.consumed > 0 && r.consumed <= calorieGoal).length
  const daysLogged = rows.filter((r) => r.consumed > 0).length
  const lines = [
    { key: 'consumed', label: 'Consumed', color: SERIES[0], on: show !== 'burned' },
    { key: 'burned', label: 'Burned', color: SERIES[1], on: show !== 'consumed' },
  ].filter((l) => l.on)
  const hasData = rows.some((r) => lines.some((l) => r[l.key as 'consumed' | 'burned'] > 0))

  return (
    <Card
      title="Energy history"
      icon={History}
      details={
        <dl className="grid grid-cols-3 gap-3">
          <Stat label="Average eaten" value={`${avgConsumed} kcal`} />
          <Stat label="Average burned" value={`${avgBurned} kcal`} />
          <Stat label="Days at or under goal" value={`${daysUnderGoal} of ${daysLogged}`} />
        </dl>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented label="Date range" value={range} options={ENERGY_RANGES} onChange={setRange} />
        <Segmented label="Show" value={show} options={SHOW} onChange={setShow} />
      </div>
      {energy.isError ? (
        <Alert tone="error">Couldn’t load your energy history.</Alert>
      ) : energy.isPending ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : !hasData ? (
        <Empty>Nothing logged in this range.</Empty>
      ) : (
        <>
          <ChartFrame summary={`Calories eaten and burned per day. Average eaten ${avgConsumed} kcal, burned ${avgBurned} kcal, against a goal of ${calorieGoal} kcal.`}>
            <LineChart data={chartRows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="day" tickFormatter={shortDay} {...axisProps} minTickGap={16} />
              <YAxis {...axisProps} width={44} />
              <Tooltip {...tooltipProps} cursor={{ stroke: 'var(--color-muted)' }} formatter={(v) => `${v} kcal`} />
              {show !== 'burned' && <ReferenceLine y={calorieGoal} stroke="var(--color-muted)" strokeDasharray="4 4" />}
              {lines.map((l) => (
                <Line key={l.key} dataKey={l.key} name={l.label} stroke={l.color} strokeWidth={2} dot={rows.length <= 31 ? { r: 2.5, fill: l.color, strokeWidth: 0 } : false} activeDot={{ r: 4, stroke: 'var(--color-surface)', strokeWidth: 2 }} />
              ))}
            </LineChart>
          </ChartFrame>
          <Legend
            items={[
              ...lines.map((l) => ({ label: l.label, color: l.color })),
              ...(show !== 'burned' ? [{ label: `Goal (${calorieGoal} kcal)`, color: 'var(--color-muted)', dashed: true }] : []),
            ]}
          />
        </>
      )}
    </Card>
  )
}
