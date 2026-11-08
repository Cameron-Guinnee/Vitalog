import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Dialog } from '../../components/ui/dialog'
import { Field } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import type { CustomFood, CustomFoodInput } from './api'

// The nutrients on a standard nutrition facts label, in label order.
export const LABEL_NUTRIENTS = [
  { id: 1008, label: 'Calories', unit: 'kcal' },
  { id: 1004, label: 'Total fat', unit: 'g' },
  { id: 1258, label: 'Saturated fat', unit: 'g' },
  { id: 1257, label: 'Trans fat', unit: 'g' },
  { id: 1253, label: 'Cholesterol', unit: 'mg' },
  { id: 1092, label: 'Sodium', unit: 'mg' },
  { id: 1005, label: 'Total carbs', unit: 'g' },
  { id: 1079, label: 'Fiber', unit: 'g' },
  { id: 1063, label: 'Total sugars', unit: 'g' },
  { id: 1235, label: 'Added sugars', unit: 'g' },
  { id: 1003, label: 'Protein', unit: 'g' },
  { id: 1110, label: 'Vitamin D', unit: 'mcg' },
  { id: 1087, label: 'Calcium', unit: 'mg' },
  { id: 1088, label: 'Iron', unit: 'mg' },
  { id: 1091, label: 'Potassium', unit: 'mg' },
  { id: 1162, label: 'Vitamin C', unit: 'mg' },
] as const

export const SERVING_UNITS = ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece', 'slice', 'serving']

type Props = { open: boolean; food: CustomFood | null; onClose: () => void; onSave: (f: CustomFoodInput) => Promise<void> }

function FoodForm({ food, onClose, onSave }: Omit<Props, 'open'>) {
  const [name, setName] = useState(food?.name ?? '')
  const [brand, setBrand] = useState(food?.brand ?? '')
  const [servingSize, setServingSize] = useState(String(food?.servingSize ?? 1))
  const [servingUnit, setServingUnit] = useState(food?.servingUnit ?? 'serving')
  const [values, setValues] = useState<Record<number, string>>(() =>
    Object.fromEntries(LABEL_NUTRIENTS.map((n) => [n.id, food?.nutrients[n.id] != null ? String(food.nutrients[n.id]) : ''])),
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  // Keep any nutrients the form doesn't show, such as ones from an older version of the app.
  const hidden = Object.fromEntries(Object.entries(food?.nutrients ?? {}).filter(([id]) => !LABEL_NUTRIENTS.some((n) => n.id === Number(id))))

  async function submit(e: FormEvent) {
    e.preventDefault()
    const size = Number(servingSize)
    if (!name.trim()) return setError('Enter a name.')
    if (!(size > 0)) return setError('Enter a serving size above zero.')
    const nutrients: Record<number, number> = { ...hidden }
    for (const n of LABEL_NUTRIENTS) {
      const raw = values[n.id]!.trim()
      if (raw === '') continue
      const v = Number(raw)
      if (!Number.isFinite(v) || v < 0) return setError(`Enter a number for ${n.label.toLowerCase()}, or leave it blank.`)
      nutrients[n.id] = v
    }
    if (nutrients[1008] == null) return setError('Enter the calories per serving.')
    setSaving(true)
    setError('')
    try {
      await onSave({ id: food?.id, name, brand, servingSize: size, servingUnit, nutrients })
    } catch {
      setError('Couldn’t save this food. Please try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor="cf-name">
          <Input id="cf-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Brand (optional)" htmlFor="cf-brand">
          <Input id="cf-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </Field>
        <Field label="Serving size" htmlFor="cf-size">
          <Input id="cf-size" type="number" min={0} step="any" value={servingSize} onChange={(e) => setServingSize(e.target.value)} />
        </Field>
        <Field label="Serving unit" htmlFor="cf-unit">
          <Select id="cf-unit" value={servingUnit} onChange={(e) => setServingUnit(e.target.value)}>
            {[...new Set([...SERVING_UNITS, servingUnit])].map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Nutrition per serving</legend>
        <p className="text-xs text-muted">Copy these from the nutrition label. Leave any you don’t know blank.</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {LABEL_NUTRIENTS.map((n) => (
            <label key={n.id} className="flex flex-col gap-1 text-xs text-muted">
              {n.label} ({n.unit})
              <Input
                type="number"
                min={0}
                step="any"
                className="h-9"
                value={values[n.id]}
                onChange={(e) => setValues((v) => ({ ...v, [n.id]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      </fieldset>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save food'}
        </Button>
      </div>
    </form>
  )
}

export function CustomFoodDialog({ open, food, onClose, onSave }: Props) {
  return (
    <Dialog open={open} onClose={onClose} title={food ? 'Edit custom food' : 'New custom food'} className="max-w-2xl">
      <FoodForm key={food?.id ?? 'new'} food={food} onClose={onClose} onSave={onSave} />
    </Dialog>
  )
}
