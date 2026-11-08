import { round1, type Units } from '@vitalog/shared'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import { Alert } from '../../../components/ui/alert'
import { ChartFrame, Legend, SERIES, axisProps, gridProps, tooltipProps } from '../chart'
import { Card, Empty, Segmented } from '../Card'
import { shortDay, weightSeries } from '../stats'
import { READING_RANGES, useReadings } from '../useReadings'

type Props = { userId: string; today: string; units: Units; goal: number | null }

export function WeightChangeCard({ userId, today, units, goal }: Props) {
  const [range, setRange] = useState<number>(91)
  const [showGoal, setShowGoal] = useState(true)
  const readings = useReadings(userId, 'weight', today, range)
  const points = weightSeries(readings.data ?? [], units)
  const unit = units === 'imperial' ? 'lbs' : 'kg'
  const change = points.length >= 2 ? round1(points.at(-1)!.value - points[0]!.value) : null
  const withGoal = showGoal && goal != null
  // Keep the goal line on screen even when it's outside the logged range.
  const values = [...points.map((p) => p.value), ...(withGoal ? [goal] : [])]
  const domain = values.length ? [Math.floor(Math.min(...values) - 1), Math.ceil(Math.max(...values) + 1)] : [0, 1]
  const Icon = change != null && change > 0 ? TrendingUp : TrendingDown

  return (
    <Card
      title="Weight change"
      icon={Icon}
      details={
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showGoal} onChange={(e) => setShowGoal(e.target.checked)} className="accent-primary" />
          Show goal weight line
        </label>
      }
    >
      <Segmented label="Date range" value={range} options={READING_RANGES} onChange={setRange} />
      {readings.isError ? (
        <Alert tone="error">Couldn’t load your weigh-ins.</Alert>
      ) : readings.isPending ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : points.length === 0 ? (
        <Empty>No weigh-ins in this range.</Empty>
      ) : (
        <>
          <p className="text-sm text-muted">
            <span className="text-lg font-medium text-foreground tabular-nums">
              {change == null ? '—' : `${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change)} ${unit}`}
            </span>{' '}
            {change == null ? 'Log another weigh-in to see a change' : `since ${shortDay(points[0]!.day)}`}
          </p>
          <ChartFrame summary={`Weight over time${change != null ? `, a change of ${change} ${unit}` : ''}.`}>
            <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="day" tickFormatter={shortDay} {...axisProps} minTickGap={16} />
              <YAxis {...axisProps} width={44} domain={domain} />
              <Tooltip {...tooltipProps} cursor={{ stroke: 'var(--color-muted)' }} formatter={(v) => `${v} ${unit}`} />
              {withGoal && <ReferenceLine y={goal} stroke="var(--color-muted)" strokeDasharray="4 4" />}
              <Line dataKey="value" name="Weight" stroke={SERIES[0]} strokeWidth={2} dot={points.length < 30 ? { r: 3, fill: SERIES[0], strokeWidth: 0 } : false} activeDot={{ r: 4, stroke: 'var(--color-surface)', strokeWidth: 2 }} />
            </LineChart>
          </ChartFrame>
          {withGoal && <Legend items={[{ label: `Goal (${round1(goal)} ${unit})`, color: 'var(--color-muted)', dashed: true }]} />}
        </>
      )}
    </Card>
  )
}
