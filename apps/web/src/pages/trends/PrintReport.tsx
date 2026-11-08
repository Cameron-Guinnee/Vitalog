import { useQuery } from '@tanstack/react-query'
import { BIOMETRICS, NUTRIENT, addDays, fromDayKey, round1, toDayKey, type NutrientMap } from '@vitalog/shared'
import { Printer } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useUserId } from '../../auth/AuthProvider'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Field } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { useProfile } from '../../features/profile/useProfile'
import { fetchReport, trendsKey, type ReportFood, type ReportOptions } from '../../features/trends/api'
import { displayValue } from '../../features/trends/readings'

const SECTIONS = [
  { key: 'nutrition', label: 'Food diary' },
  { key: 'exercise', label: 'Exercise' },
  { key: 'biometrics', label: 'Biometric measurements' },
  { key: 'fasting', label: 'Fasting sessions' },
] as const

const longDay = (day: string) => fromDayKey(day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const g = (n: NutrientMap, id: number) => round1(n[id] ?? 0)
const hours = (start: string, end: string) => round1((Date.parse(end) - Date.parse(start)) / 3_600_000)

// BIOMETRICS names blood pressure once; the two saved readings get their own labels.
const metricLabel = (metric: string) =>
  metric === 'blood_pressure_systolic'
    ? 'Blood pressure (systolic)'
    : metric === 'blood_pressure_diastolic'
      ? 'Blood pressure (diastolic)'
      : (BIOMETRICS.find((b) => b.value === metric)?.label ?? metric.replace(/_/g, ' '))

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={h} scope="col" className={`border-b border-gray-300 py-1.5 font-semibold ${i ? 'text-right' : 'text-left'}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

const cell = 'border-b border-gray-200 py-1 text-right tabular-nums'
const firstCell = 'border-b border-gray-200 py-1 pr-3 text-left'

function FoodSection({ foods }: { foods: ReportFood[] }) {
  const byDay = new Map<string, ReportFood[]>()
  for (const f of foods) {
    const day = toDayKey(new Date(f.loggedAt))
    byDay.set(day, [...(byDay.get(day) ?? []), f])
  }
  const sum = (list: ReportFood[], id: number) => round1(list.reduce((s, f) => s + (f.nutrients[id] ?? 0), 0))
  return (
    <Table head={['Food', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)']}>
      {[...byDay].map(([day, list]) => (
        <DayRows key={day} day={day} list={list} sum={sum} />
      ))}
    </Table>
  )
}

function DayRows({ day, list, sum }: { day: string; list: ReportFood[]; sum: (l: ReportFood[], id: number) => number }) {
  return (
    <>
      <tr>
        <th colSpan={5} scope="rowgroup" className="pt-3 pb-1 text-left font-semibold">
          {longDay(day)}
        </th>
      </tr>
      {list.map((f) => (
        <tr key={f.id}>
          <td className={firstCell}>
            {f.name} <span className="text-gray-500">· {f.quantity} {f.servingUnit}</span>
          </td>
          <td className={cell}>{Math.round(f.nutrients[NUTRIENT.energy] ?? 0)}</td>
          <td className={cell}>{g(f.nutrients, NUTRIENT.protein)}</td>
          <td className={cell}>{g(f.nutrients, NUTRIENT.carbs)}</td>
          <td className={cell}>{g(f.nutrients, NUTRIENT.fat)}</td>
        </tr>
      ))}
      <tr className="font-semibold">
        <td className={firstCell}>Day total</td>
        <td className={cell}>{Math.round(sum(list, NUTRIENT.energy))}</td>
        <td className={cell}>{sum(list, NUTRIENT.protein)}</td>
        <td className={cell}>{sum(list, NUTRIENT.carbs)}</td>
        <td className={cell}>{sum(list, NUTRIENT.fat)}</td>
      </tr>
    </>
  )
}

export function PrintReport() {
  const userId = useUserId()
  const { data: profile } = useProfile(userId)
  const units = profile?.units_preference === 'metric' ? 'metric' : 'imperial'
  const today = toDayKey(new Date())
  const [form, setForm] = useState<ReportOptions>({ from: addDays(today, -6), to: today, nutrition: true, exercise: true, biometrics: true, fasting: false })
  const [options, setOptions] = useState<ReportOptions | null>(null)
  const [error, setError] = useState('')
  const report = useQuery({
    queryKey: trendsKey(userId, 'report', options),
    queryFn: () => fetchReport(userId, options!),
    enabled: !!options,
  })

  function generate(e: FormEvent) {
    e.preventDefault()
    if (!form.from || !form.to) return setError('Choose both dates.')
    if (form.from > form.to) return setError('The start date must be on or before the end date.')
    if (!SECTIONS.some((s) => form[s.key])) return setError('Choose at least one section to include.')
    setError('')
    setOptions(form)
  }

  const data = report.data
  const empty =
    data && !data.foods.length && !data.biometrics.length && !data.fasts.length && !data.exercise.length

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <form onSubmit={generate} noValidate className="flex flex-col gap-4 rounded-xl bg-surface p-5 print:hidden">
        <p className="text-sm text-muted">Build a summary for a date range, check it below, then print it or save it as a PDF.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="From" htmlFor="report-from">
            <Input id="report-from" type="date" value={form.from} max={today} onChange={(e) => setForm({ ...form, from: e.target.value })} />
          </Field>
          <Field label="To" htmlFor="report-to">
            <Input id="report-to" type="date" value={form.to} max={today} onChange={(e) => setForm({ ...form, to: e.target.value })} />
          </Field>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Include</legend>
          {SECTIONS.map((s) => (
            <label key={s.key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="accent-primary" checked={form[s.key]} onChange={(e) => setForm({ ...form, [s.key]: e.target.checked })} />
              {s.label}
            </label>
          ))}
        </fieldset>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={report.isFetching}>
            {report.isFetching ? 'Building…' : 'Build report'}
          </Button>
          {data && !empty && (
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={16} /> Print or save as PDF
            </Button>
          )}
        </div>
      </form>

      {report.isError && <Alert tone="error">Couldn’t build the report. Please try again.</Alert>}
      {empty && <p className="text-sm text-muted print:hidden">Nothing was logged in that range for the sections you chose.</p>}

      {data && options && !empty && (
        // The report is printed on its own, in black on white, whatever the app's theme.
        <article id="print-report" aria-label="Report preview" className="flex flex-col gap-6 rounded-xl bg-white p-8 text-gray-900 print:rounded-none print:p-0">
          <header>
            <h1 className="text-2xl font-semibold">Vitalog health report</h1>
            <p className="text-sm text-gray-600">
              {profile?.display_name} · {longDay(options.from)} to {longDay(options.to)}
            </p>
          </header>

          {options.nutrition && (
            <section>
              <h2 className="mb-1 text-lg font-semibold">Food diary</h2>
              {data.foods.length ? <FoodSection foods={data.foods} /> : <p className="text-sm text-gray-600">No food logged.</p>}
            </section>
          )}

          {options.exercise && (
            <section>
              <h2 className="mb-1 text-lg font-semibold">Exercise</h2>
              {data.exercise.length ? (
                <Table head={['Exercise', 'When', 'Minutes', 'Calories burned']}>
                  {data.exercise.map((x) => (
                    <tr key={x.id}>
                      <td className={firstCell}>{x.exercise_name}</td>
                      <td className={cell}>{dateTime(x.logged_at)}</td>
                      <td className={cell}>{x.duration_minutes}</td>
                      <td className={cell}>{x.calories_burned != null ? Math.round(x.calories_burned) : '–'}</td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <p className="text-sm text-gray-600">No exercise logged.</p>
              )}
            </section>
          )}

          {options.biometrics && (
            <section>
              <h2 className="mb-1 text-lg font-semibold">Biometric measurements</h2>
              {data.biometrics.length ? (
                <Table head={['Measurement', 'When', 'Value']}>
                  {data.biometrics.map((b) => {
                    const v = displayValue(b.metric_type, b, units)
                    return (
                      <tr key={b.id}>
                        <td className={firstCell}>
                          {metricLabel(b.metric_type)}
                          {b.notes && <span className="text-gray-500"> · {b.notes}</span>}
                        </td>
                        <td className={cell}>{dateTime(b.logged_at)}</td>
                        <td className={cell}>
                          {v.value} {v.unit}
                        </td>
                      </tr>
                    )
                  })}
                </Table>
              ) : (
                <p className="text-sm text-gray-600">No measurements logged.</p>
              )}
            </section>
          )}

          {options.fasting && (
            <section>
              <h2 className="mb-1 text-lg font-semibold">Fasting sessions</h2>
              {data.fasts.length ? (
                <Table head={['Started', 'Ended', 'Hours', 'Target']}>
                  {data.fasts.map((f) => (
                    <tr key={f.id}>
                      <td className={firstCell}>{dateTime(f.started_at)}</td>
                      <td className={cell}>{dateTime(f.ended_at!)}</td>
                      <td className={cell}>{hours(f.started_at, f.ended_at!)}</td>
                      <td className={cell}>{f.target_duration_hours ? `${f.target_duration_hours} h` : '–'}</td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <p className="text-sm text-gray-600">No finished fasts.</p>
              )}
            </section>
          )}
        </article>
      )}
    </div>
  )
}
