import { useQuery } from '@tanstack/react-query'
import { NUTRIENT, fromDayKey, round1, toDayKey } from '@vitalog/shared'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts'
import { useUserId } from '../../auth/AuthProvider'
import { Alert } from '../../components/ui/alert'
import { Segmented, Stat } from '../../features/dashboard/Card'
import { ChartFrame, Legend, SERIES, axisProps, gridProps, tooltipProps } from '../../features/dashboard/chart'
import { lastDays, shortDay } from '../../features/dashboard/stats'
import { NutrientTable } from '../../features/diary/NutrientTable'
import { useProfile } from '../../features/profile/useProfile'
import { fetchNutritionByDay, trendsKey } from '../../features/trends/api'
import { averageNutrients, macroSplit } from '../../features/trends/nutrition'

const RANGES = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
] as const

const COLUMNS = [
  { id: NUTRIENT.energy, label: 'Calories', unit: 'kcal' },
  { id: NUTRIENT.protein, label: 'Protein', unit: 'g' },
  { id: NUTRIENT.carbs, label: 'Carbs', unit: 'g' },
  { id: NUTRIENT.fat, label: 'Fat', unit: 'g' },
  { id: 1079, label: 'Fiber', unit: 'g' },
  { id: 1092, label: 'Sodium', unit: 'mg' },
] as const

export function NutritionReport() {
  const userId = useUserId()
  const { data: profile } = useProfile(userId)
  const goal = profile?.calorie_goal ?? 2000
  const [range, setRange] = useState<number>(7)
  const today = toDayKey(new Date())
  const days = lastDays(range, today)
  const report = useQuery({
    queryKey: trendsKey(userId, 'nutrition', days[0], today),
    queryFn: () => fetchNutritionByDay(userId, days[0]!, today),
  })

  const logged = days.filter((d) => report.data?.has(d))
  const averages = averageNutrients(logged.map((d) => report.data!.get(d)!))
  const split = macroSplit(averages)
  const avgKcal = Math.round(averages[NUTRIENT.energy] ?? 0)
  const chartRows = days.map((day) => ({ day, kcal: Math.round(report.data?.get(day)?.[NUTRIENT.energy] ?? 0) || null }))
  const onTarget = logged.filter((d) => (report.data!.get(d)![NUTRIENT.energy] ?? 0) <= goal).length

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <Segmented label="Date range" value={range} options={RANGES} onChange={setRange} />

      {report.isError ? (
        <Alert tone="error">Couldn’t load your report. Refresh to try again.</Alert>
      ) : report.isPending ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : logged.length === 0 ? (
        <div className="rounded-xl bg-surface py-10 text-center text-sm text-muted">
          <p>No food logged in the last {range} days.</p>
          <p>Log food in your diary to see your nutrition report here.</p>
        </div>
      ) : (
        <>
          <section aria-label="Summary" className="flex flex-col gap-4 rounded-xl bg-surface p-5">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Days logged" value={`${logged.length} of ${range}`} />
              <Stat label="Average calories" value={`${avgKcal} kcal`} />
              <Stat label="Days at or under goal" value={`${onTarget} of ${logged.length}`} />
              <Stat label="Protein / carbs / fat" value={split ? `${split.protein} / ${split.carbs} / ${split.fat}%` : '—'} />
            </dl>
            <ChartFrame summary={`Calories per day against a goal of ${goal} kcal. Average ${avgKcal} kcal over ${logged.length} logged days.`}>
              <BarChart data={chartRows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="day" tickFormatter={shortDay} {...axisProps} minTickGap={16} />
                <YAxis {...axisProps} width={44} />
                <Tooltip {...tooltipProps} cursor={{ fill: 'var(--color-surface-raised)' }} formatter={(v) => `${v} kcal`} />
                <ReferenceLine y={goal} stroke="var(--color-muted)" strokeDasharray="4 4" />
                <Bar dataKey="kcal" name="Calories" fill={SERIES[0]} maxBarSize={28} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartFrame>
            <Legend items={[{ label: `Goal (${goal} kcal)`, color: 'var(--color-muted)', dashed: true }]} />
          </section>

          <section aria-label="Day by day" className="rounded-xl bg-surface">
            <h2 className="px-5 pt-4 pb-2 font-medium">Day by day</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th scope="col" className="px-5 py-2 font-medium">
                      Date
                    </th>
                    {COLUMNS.map((c) => (
                      <th key={c.id} scope="col" className="px-3 py-2 text-right font-medium">
                        {c.label} <span className="font-normal">({c.unit})</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...logged].reverse().map((day) => {
                    const n = report.data!.get(day)!
                    return (
                      <tr key={day}>
                        <th scope="row" className="px-5 py-2 text-left font-normal">
                          {fromDayKey(day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </th>
                        {COLUMNS.map((c) => (
                          <td key={c.id} className="px-3 py-2 text-right tabular-nums">
                            {n[c.id] ? (c.unit === 'g' ? round1(n[c.id]!) : Math.round(n[c.id]!)) : '–'}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <NutrientTable
            nutrients={averages}
            title="Daily averages"
            description={`Averaged over the ${logged.length} ${logged.length === 1 ? 'day' : 'days'} with food logged, against daily values.`}
          />
        </>
      )}
    </div>
  )
}
