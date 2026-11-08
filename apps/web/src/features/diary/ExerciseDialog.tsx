import { useQuery } from '@tanstack/react-query'
import { DEFAULT_WEIGHT_KG, EXERCISE_CATEGORIES, caloriesFromMet } from '@vitalog/shared'
import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { ChoiceGroup } from '../../components/ui/choice'
import { Dialog } from '../../components/ui/dialog'
import { Field } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { cn } from '../../lib/utils'
import type { ActiveGroup } from '../profile/displaySettings'
import { fetchLatestWeightKg } from './api'

export type ExerciseToSave = { name: string; category: string; minutes: number; caloriesBurned: number; group: number; notes: string }

type Props = { open: boolean; onClose: () => void; userId: string; groups: ActiveGroup[]; onSave: (e: ExerciseToSave) => Promise<void> }

type Category = (typeof EXERCISE_CATEGORIES)[number]['label']

function ExerciseForm({ userId, groups, onSave }: Pick<Props, 'userId' | 'groups' | 'onSave'>) {
  const [category, setCategory] = useState<Category | ''>('')
  const [met, setMet] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [minutes, setMinutes] = useState('')
  const [manual, setManual] = useState(false)
  const [manualCalories, setManualCalories] = useState('')
  const [group, setGroup] = useState(groups[0]?.index ?? 0)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const weight = useQuery({ queryKey: ['latest-weight', userId], queryFn: () => fetchLatestWeightKg(userId) })
  const weightKg = weight.data ?? DEFAULT_WEIGHT_KG
  const mins = Number(minutes)
  const estimate = met && mins > 0 ? caloriesFromMet(met, weightKg, mins) : 0
  const calories = manual ? Number(manualCalories) || 0 : estimate
  const exercises = EXERCISE_CATEGORIES.find((c) => c.label === category)?.exercises ?? []

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Choose an exercise or type a name.')
    if (!(mins > 0)) return setError('Enter how many minutes you exercised.')
    setSaving(true)
    setError('')
    try {
      await onSave({ name: name.trim(), category: category || 'Other', minutes: Math.round(mins), caloriesBurned: calories, group, notes: notes.trim() })
    } catch {
      setError('Couldn’t save this exercise. Please try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <ChoiceGroup
        label="Category"
        columns={3}
        value={category}
        onChange={(c) => {
          setCategory(c)
          setMet(null)
        }}
        options={EXERCISE_CATEGORIES.map((c) => ({ value: c.label, label: c.label }))}
      />
      {exercises.length > 0 && (
        <ul aria-label="Exercises" className="max-h-48 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {exercises.map((x) => (
            <li key={x.name}>
              <button
                type="button"
                aria-pressed={name === x.name}
                onClick={() => {
                  setName(x.name)
                  setMet(x.met)
                }}
                className={cn('flex w-full justify-between px-4 py-2 text-left text-sm hover:bg-surface-raised', name === x.name && 'bg-primary/10')}
              >
                {x.name}
                <span className="text-xs text-muted">MET {x.met}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Field label="Exercise name" htmlFor="ex-name" hint="Pick one above, or type your own.">
        <Input
          id="ex-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setMet(null)
          }}
        />
      </Field>
      <Field label="Duration (minutes)" htmlFor="ex-minutes">
        <Input id="ex-minutes" type="number" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
      </Field>
      <Field
        label="Calories burned"
        htmlFor="ex-calories"
        hint={
          manual
            ? undefined
            : met
              ? `Estimated from the exercise’s MET value${weight.data ? ' and your latest weight' : ' and an average weight (log your weight for a better estimate)'}.`
              : 'Pick an exercise from the list for an estimate, or enter it yourself.'
        }
      >
        <Input
          id="ex-calories"
          type="number"
          min={0}
          readOnly={!manual}
          value={manual ? manualCalories : estimate || ''}
          onChange={(e) => setManualCalories(e.target.value)}
          className={cn(!manual && 'text-muted')}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={manual}
          onChange={(e) => {
            setManual(e.target.checked)
            if (e.target.checked && estimate) setManualCalories(String(estimate))
          }}
        />
        Enter calories myself
      </label>
      <Field label="Diary group" htmlFor="ex-group">
        <Select id="ex-group" value={group} onChange={(e) => setGroup(Number(e.target.value))}>
          {groups.map((g) => (
            <option key={g.index} value={g.index}>
              {g.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Notes (optional)" htmlFor="ex-notes">
        <Input id="ex-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Log exercise'}
      </Button>
    </form>
  )
}

export function ExerciseDialog({ open, onClose, userId, groups, onSave }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title="Log exercise">
      {/* Mounting the form only while open resets it each time. */}
      <ExerciseForm
        userId={userId}
        groups={groups}
        onSave={async (e) => {
          await onSave(e)
          onClose()
        }}
      />
    </Dialog>
  )
}
