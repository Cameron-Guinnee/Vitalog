import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ACTIVITY_LEVELS,
  WEIGHT_GOAL_TYPES,
  ageOn,
  round1,
  weeklyGoalsFor,
  weeklyRateFromKcal,
  type ActivityLevel,
  type Sex,
  type Units,
  type WeightGoalType,
} from '@vitalog/shared'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useUserId } from '../../auth/AuthProvider'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { ChoiceGroup } from '../../components/ui/choice'
import { Field } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { dashboardKey, fetchWeightEnds } from '../../features/dashboard/api'
import { weightSeries } from '../../features/dashboard/stats'
import { convertWeight, heightCmOf, heightFields, num, tdeeOf, type BodyFields } from '../../features/profile/body'
import { profileQueryKey, useProfile, type Profile } from '../../features/profile/useProfile'
import { supabase } from '../../lib/supabase'

export type TargetsForm = BodyFields & {
  dateOfBirth: string
  sex: Sex | ''
  activity: ActivityLevel | ''
  goalType: WeightGoalType | ''
  weeklyKcal: string
  targetWeight: string
  calorieGoal: string
}

const oneOf = <T extends string>(value: string | null | undefined, options: readonly { value: T }[]): T | '' =>
  options.find((o) => o.value === value)?.value ?? ''

/** The form as stored: the goal weight is kept in the user's units, and the weight is their latest weigh-in. */
export function formFromProfile(profile: Profile, latestWeight: number | null): TargetsForm {
  const units: Units = profile.units_preference === 'metric' ? 'metric' : 'imperial'
  const goalType = oneOf(profile.weight_goal_type, WEIGHT_GOAL_TYPES)
  const weeklyKcal = Math.round((profile.weekly_rate ?? 0) * 500)
  const weeklyOptions = goalType ? weeklyGoalsFor(goalType).map((g) => g.kcalPerDay as number) : []
  return {
    units,
    ...heightFields(profile.height_cm),
    weight: latestWeight != null ? String(latestWeight) : '',
    dateOfBirth: profile.date_of_birth ?? '',
    sex: profile.sex === 'male' || profile.sex === 'female' ? profile.sex : '',
    activity: oneOf(profile.activity_level, ACTIVITY_LEVELS),
    goalType,
    weeklyKcal: weeklyOptions.includes(weeklyKcal) ? String(weeklyKcal) : '',
    targetWeight: goalType && goalType !== 'maintain' && profile.weight_goal != null ? String(round1(profile.weight_goal)) : '',
    calorieGoal: profile.calorie_goal != null ? String(profile.calorie_goal) : '',
  }
}

export function validateTargets(f: TargetsForm): string | null {
  if (!f.dateOfBirth || !(ageOn(f.dateOfBirth) > 0)) return 'Enter a valid date of birth.'
  if (!f.sex) return 'Choose your biological sex.'
  if (!(heightCmOf(f) > 0)) return 'Enter your height.'
  if (!(num(f.weight) > 0)) return 'Enter your current weight.'
  if (!f.activity) return 'Choose your activity level.'
  if (!f.goalType) return 'Choose a weight goal.'
  if (f.goalType !== 'maintain') {
    if (f.weeklyKcal === '') return 'Choose a weekly goal.'
    if (!(num(f.targetWeight) > 0)) return 'Enter your target weight.'
  }
  if (!(num(f.calorieGoal) > 0)) return 'Enter a daily calorie goal.'
  return null
}

/** Switching units converts what's already typed, so nothing is saved in the wrong unit. */
export function switchUnits(f: TargetsForm, units: Units): TargetsForm {
  if (f.units === units) return f
  const cm = heightCmOf(f)
  return {
    ...f,
    units,
    ...(cm > 0 ? heightFields(cm) : {}),
    weight: convertWeight(f.weight, f.units, units),
    targetWeight: convertWeight(f.targetWeight, f.units, units),
  }
}

/** Calories for the chosen goal, or 0 when something it needs is missing. */
export function suggestedCalories(f: TargetsForm): number {
  const base = tdeeOf(f)
  const kcal = f.goalType === 'maintain' ? 0 : num(f.weeklyKcal)
  return base > 0 && !Number.isNaN(kcal) ? base + kcal : 0
}

export function Targets() {
  const userId = useUserId()
  const profile = useProfile(userId)
  const ends = useQuery({ queryKey: dashboardKey(userId, 'weight-ends'), queryFn: () => fetchWeightEnds(userId) })

  if (profile.isError || ends.isError) return <Alert tone="error">Couldn’t load your profile. Refresh to try again.</Alert>
  if (!profile.data || !ends.data) return <p className="text-sm text-muted">Loading…</p>

  const units: Units = profile.data.units_preference === 'metric' ? 'metric' : 'imperial'
  const latest = ends.data.latest ? weightSeries([ends.data.latest], units)[0]!.value : null
  return <TargetsEditor userId={userId} initial={formFromProfile(profile.data, latest)} />
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-4 rounded-xl bg-surface p-5">
      <h2 className="font-medium">{title}</h2>
      {children}
    </section>
  )
}

function TargetsEditor({ userId, initial }: { userId: string; initial: TargetsForm }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const weightUnit = form.units === 'imperial' ? 'lb' : 'kg'
  const maintenance = tdeeOf(form)
  const suggestion = suggestedCalories(form)

  function update(patch: Partial<TargetsForm>) {
    setSuccess('')
    setForm((f) => {
      const next = { ...f, ...patch }
      if ('goalType' in patch) next.weeklyKcal = patch.goalType === 'maintain' ? '0' : ''
      // Changing the goal fills in the suggested calories, which the user can still edit.
      if ('goalType' in patch || 'weeklyKcal' in patch || 'activity' in patch) {
        const kcal = suggestedCalories(next)
        if (kcal > 0) next.calorieGoal = String(kcal)
      }
      return next
    })
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setSuccess('')
    const problem = validateTargets(form)
    setError(problem ?? '')
    if (problem) return
    setSaving(true)
    try {
      const weight = num(form.weight)
      // A changed weight is a new weigh-in, so it shows on the dashboard and in Trends.
      // Comparing in the form's units keeps a units switch from logging the same weight again.
      if (convertWeight(saved.weight, saved.units, form.units) !== form.weight) {
        const { error: weighInError } = await supabase.from('biometrics').insert({
          user_id: userId,
          metric_type: 'weight',
          value: weight,
          unit: form.units === 'imperial' ? 'lbs' : 'kg',
          logged_at: new Date().toISOString(),
        })
        if (weighInError) throw weighInError
      }
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          date_of_birth: form.dateOfBirth,
          sex: form.sex,
          height_cm: round1(heightCmOf(form)),
          units_preference: form.units,
          activity_level: form.activity,
          weight_goal_type: form.goalType,
          weight_goal: form.goalType === 'maintain' ? weight : num(form.targetWeight),
          weekly_rate: weeklyRateFromKcal(form.goalType === 'maintain' ? 0 : num(form.weeklyKcal)),
          calorie_goal: Math.round(num(form.calorieGoal)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
      if (profileError) throw profileError
      setSaved(form)
      setSuccess('Your profile and targets are saved.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', userId] }),
        queryClient.invalidateQueries({ queryKey: ['latest-weight', userId] }),
        queryClient.invalidateQueries({ queryKey: ['trends', userId] }),
      ])
    } catch (err) {
      console.error(err)
      setError('Couldn’t save your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} noValidate className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Section title="Personal information">
        <Field label="Date of birth" htmlFor="dateOfBirth">
          <Input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={(e) => update({ dateOfBirth: e.target.value })} />
        </Field>
        <Field label="Biological sex" hint="Used to estimate your daily energy needs (Mifflin–St Jeor).">
          <ChoiceGroup
            label="Biological sex"
            value={form.sex}
            onChange={(v) => update({ sex: v })}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
            ]}
          />
        </Field>
        <Field label="Units" hint="Switching converts the measurements below.">
          <ChoiceGroup
            label="Units"
            value={form.units}
            onChange={(v) => (setSuccess(''), setForm((f) => switchUnits(f, v)))}
            options={[
              { value: 'imperial', label: 'Imperial', description: 'lb, ft and in' },
              { value: 'metric', label: 'Metric', description: 'kg and cm' },
            ]}
          />
        </Field>
      </Section>

      <Section title="Body measurements">
        {form.units === 'imperial' ? (
          <Field label="Height">
            <div className="grid grid-cols-2 gap-2">
              <Input aria-label="Height, feet" type="number" min={0} placeholder="ft" value={form.heightFt} onChange={(e) => update({ heightFt: e.target.value })} />
              <Input aria-label="Height, inches" type="number" min={0} max={11} placeholder="in" value={form.heightIn} onChange={(e) => update({ heightIn: e.target.value })} />
            </div>
          </Field>
        ) : (
          <Field label="Height (cm)" htmlFor="heightCm">
            <Input id="heightCm" type="number" min={0} value={form.heightCm} onChange={(e) => update({ heightCm: e.target.value })} />
          </Field>
        )}
        <Field label={`Current weight (${weightUnit})`} htmlFor="weight" hint="Changing this logs a new weigh-in for today.">
          <Input id="weight" type="number" min={0} step="0.1" value={form.weight} onChange={(e) => update({ weight: e.target.value })} />
        </Field>
      </Section>

      <Section title="Activity and goals">
        <Field label="Activity level">
          <ChoiceGroup label="Activity level" columns={1} value={form.activity} onChange={(v) => update({ activity: v })} options={ACTIVITY_LEVELS} />
        </Field>
        <Field label="Weight goal">
          <ChoiceGroup label="Weight goal" columns={3} value={form.goalType} onChange={(v) => update({ goalType: v })} options={WEIGHT_GOAL_TYPES} />
        </Field>
        {form.goalType && form.goalType !== 'maintain' && (
          <>
            <Field label="Weekly goal">
              <ChoiceGroup
                label="Weekly goal"
                columns={1}
                value={form.weeklyKcal}
                onChange={(v) => update({ weeklyKcal: v })}
                options={weeklyGoalsFor(form.goalType).map((g) => ({
                  value: String(g.kcalPerDay),
                  label: g.label,
                  description: maintenance > 0 ? `${maintenance + g.kcalPerDay} kcal a day` : undefined,
                }))}
              />
            </Field>
            <Field label={`Target weight (${weightUnit})`} htmlFor="targetWeight">
              <Input id="targetWeight" type="number" min={0} step="0.1" value={form.targetWeight} onChange={(e) => update({ targetWeight: e.target.value })} />
            </Field>
          </>
        )}
        <Field
          label="Daily calorie goal (kcal)"
          htmlFor="calorieGoal"
          hint={maintenance > 0 ? `Your estimated maintenance is ${maintenance} kcal a day.` : undefined}
        >
          <Input id="calorieGoal" type="number" min={0} value={form.calorieGoal} onChange={(e) => update({ calorieGoal: e.target.value })} />
        </Field>
        {suggestion > 0 && String(suggestion) !== form.calorieGoal && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm">
            <span>
              For this goal we suggest <strong>{suggestion} kcal</strong> a day.
            </span>
            <Button variant="secondary" onClick={() => update({ calorieGoal: String(suggestion) })}>
              Use {suggestion} kcal
            </Button>
          </div>
        )}
      </Section>

      {error && <Alert tone="error">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}
      <Button type="submit" disabled={saving} className="self-end">
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
