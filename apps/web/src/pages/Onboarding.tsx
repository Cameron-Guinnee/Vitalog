import { useQueryClient } from '@tanstack/react-query'
import {
  ACTIVITY_LEVELS,
  WEIGHT_GOAL_TYPES,
  ageOn,
  weeklyGoalsFor,
  weeklyRateFromKcal,
  type ActivityLevel,
  type Sex,
  type Units,
  type WeightGoalType,
} from '@vitalog/shared'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { useUserId } from '../auth/AuthProvider'
import { Alert } from '../components/ui/alert'
import { Button } from '../components/ui/button'
import { ChoiceGroup } from '../components/ui/choice'
import { Field } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { heightCmOf, num, tdeeOf, weightKgOf } from '../features/profile/body'
import { profileQueryKey } from '../features/profile/useProfile'
import { cn } from '../lib/utils'
import { supabase } from '../lib/supabase'

type Form = {
  displayName: string
  dateOfBirth: string
  sex: Sex | ''
  units: Units
  heightFt: string
  heightIn: string
  heightCm: string
  weight: string
  activity: ActivityLevel | ''
  goalType: WeightGoalType | ''
  weeklyKcal: string
  targetWeight: string
  calorieGoal: string
}

const initialForm: Form = {
  displayName: '',
  dateOfBirth: '',
  sex: '',
  units: 'imperial',
  heightFt: '',
  heightIn: '',
  heightCm: '',
  weight: '',
  activity: '',
  goalType: '',
  weeklyKcal: '',
  targetWeight: '',
  calorieGoal: '',
}

const STEPS = ['Personal information', 'Body measurements', 'Activity and goals'] as const

export { heightCmOf, weightKgOf, tdeeOf }

export function validate(step: number, f: Form): string | null {
  if (step === 0) {
    if (!f.displayName.trim()) return 'Enter a display name.'
    if (!f.dateOfBirth || !(ageOn(f.dateOfBirth) > 0)) return 'Enter a valid date of birth.'
    if (!f.sex) return 'Choose your biological sex.'
  }
  if (step === 1) {
    if (!(heightCmOf(f) > 0)) return 'Enter your height.'
    if (!(num(f.weight) > 0)) return 'Enter your current weight.'
  }
  if (step === 2) {
    if (!f.activity) return 'Choose your activity level.'
    if (!f.goalType) return 'Choose a weight goal.'
    if (f.goalType !== 'maintain') {
      if (f.weeklyKcal === '') return 'Choose a weekly goal.'
      if (!(num(f.targetWeight) > 0)) return 'Enter your target weight.'
    }
    if (!(num(f.calorieGoal) > 0)) return 'Enter a daily calorie goal.'
  }
  return null
}

export function Onboarding() {
  const userId = useUserId()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Form>(initialForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }))
  const weightUnit = form.units === 'imperial' ? 'lb' : 'kg'
  const maintenance = tdeeOf(form)

  // Picking a goal or weekly rate fills in the suggested calories, which the user can still edit.
  function suggestCalories(next: Form) {
    const kcal = next.goalType === 'maintain' ? 0 : num(next.weeklyKcal)
    const base = tdeeOf(next)
    return base > 0 && !Number.isNaN(kcal) ? String(base + kcal) : next.calorieGoal
  }

  function update(patch: Partial<Form>) {
    setForm((f) => {
      const next = { ...f, ...patch }
      if ('goalType' in patch) next.weeklyKcal = patch.goalType === 'maintain' ? '0' : ''
      if ('goalType' in patch || 'weeklyKcal' in patch || 'activity' in patch) next.calorieGoal = suggestCalories(next)
      return next
    })
  }

  function next(e: FormEvent) {
    e.preventDefault()
    const problem = validate(step, form)
    setError(problem ?? '')
    if (problem) return
    if (step < STEPS.length - 1) {
      setStep(step + 1)
      return
    }
    void save()
  }

  async function save() {
    setSaving(true)
    try {
      const currentWeight = num(form.weight)
      // The initial weigh-in and streak go first: the profile update is what marks
      // onboarding as done, so it only happens once everything else has saved.
      const weighIn = await supabase.from('biometrics').insert({
        user_id: userId,
        metric_type: 'weight',
        value: currentWeight,
        unit: weightUnit === 'lb' ? 'lbs' : 'kg',
        logged_at: new Date().toISOString(),
      })
      if (weighIn.error) throw weighIn.error

      const streak = await supabase
        .from('streaks')
        .upsert({ user_id: userId, current_streak: 1, longest_streak: 1 }, { onConflict: 'user_id' })
      if (streak.error) throw streak.error

      const profile = await supabase
        .from('profiles')
        .update({
          display_name: form.displayName.trim(),
          date_of_birth: form.dateOfBirth,
          sex: form.sex,
          height_cm: Math.round(heightCmOf(form) * 10) / 10,
          units_preference: form.units,
          activity_level: form.activity,
          weight_goal_type: form.goalType,
          weight_goal: form.goalType === 'maintain' ? currentWeight : num(form.targetWeight),
          weekly_rate: weeklyRateFromKcal(num(form.weeklyKcal) || 0),
          calorie_goal: Math.round(num(form.calorieGoal)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
      if (profile.error) throw profile.error

      await queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error(err)
      setError('Something went wrong saving your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isLast = step === STEPS.length - 1

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <form onSubmit={next} noValidate className="flex w-full max-w-md flex-col gap-5 rounded-xl bg-surface p-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Vitalog</h1>
          <p className="text-sm text-muted">Let’s set up your profile</p>
          <ol className="mt-3 flex gap-2" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((s, i) => (
              <li key={s} className={cn('h-1.5 flex-1 rounded-full', i <= step ? 'bg-primary' : 'bg-border')} />
            ))}
          </ol>
        </header>

        <h2 className="text-lg font-medium">{STEPS[step]}</h2>

        {step === 0 && (
          <>
            <Field label="Display name" htmlFor="displayName">
              <Input id="displayName" value={form.displayName} onChange={(e) => set('displayName', e.target.value)} />
            </Field>
            <Field label="Date of birth" htmlFor="dateOfBirth">
              <Input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
            </Field>
            <Field label="Biological sex" hint="Used to estimate your daily energy needs (Mifflin–St Jeor).">
              <ChoiceGroup
                label="Biological sex"
                value={form.sex}
                onChange={(v) => set('sex', v)}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                ]}
              />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Units">
              <ChoiceGroup
                label="Units"
                value={form.units}
                onChange={(v) => set('units', v)}
                options={[
                  { value: 'imperial', label: 'Imperial', description: 'lb, ft and in' },
                  { value: 'metric', label: 'Metric', description: 'kg and cm' },
                ]}
              />
            </Field>
            {form.units === 'imperial' ? (
              <Field label="Height">
                <div className="grid grid-cols-2 gap-2">
                  <Input aria-label="Height, feet" type="number" min={0} placeholder="ft" value={form.heightFt} onChange={(e) => set('heightFt', e.target.value)} />
                  <Input aria-label="Height, inches" type="number" min={0} max={11} placeholder="in" value={form.heightIn} onChange={(e) => set('heightIn', e.target.value)} />
                </div>
              </Field>
            ) : (
              <Field label="Height (cm)" htmlFor="heightCm">
                <Input id="heightCm" type="number" min={0} value={form.heightCm} onChange={(e) => set('heightCm', e.target.value)} />
              </Field>
            )}
            <Field label={`Current weight (${weightUnit})`} htmlFor="weight">
              <Input id="weight" type="number" min={0} value={form.weight} onChange={(e) => set('weight', e.target.value)} />
            </Field>
          </>
        )}

        {step === 2 && (
          <>
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
                  <Input id="targetWeight" type="number" min={0} value={form.targetWeight} onChange={(e) => set('targetWeight', e.target.value)} />
                </Field>
              </>
            )}
            <Field
              label="Daily calorie goal (kcal)"
              htmlFor="calorieGoal"
              hint={maintenance > 0 ? `Your estimated maintenance is ${maintenance} kcal a day.` : undefined}
            >
              <Input id="calorieGoal" type="number" min={0} value={form.calorieGoal} onChange={(e) => set('calorieGoal', e.target.value)} />
            </Field>
          </>
        )}

        {error && <Alert tone="error">{error}</Alert>}

        <div className="flex justify-between gap-2">
          {step > 0 ? (
            <Button variant="secondary" onClick={() => (setError(''), setStep(step - 1))}>
              Back
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={saving}>
            {isLast ? (saving ? 'Saving…' : 'Get started') : 'Next'}
          </Button>
        </div>
      </form>
    </main>
  )
}
