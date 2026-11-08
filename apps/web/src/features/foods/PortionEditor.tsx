import { amountUnitLabel, foodKey, multiplyNutrients, servingOptionLabel, supports100g, type AmountUnit } from '@vitalog/shared'
import { X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useUserId } from '../../auth/AuthProvider'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Dialog } from '../../components/ui/dialog'
import { Field } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { asFood } from '../diary/foodSearch'
import type { FoodInfo, Portion } from './api'
import { FoodSearch } from './FoodSearch'
import { NutritionTiles, usePortionTotals } from './nutrition'

type Draft = { key: string; food: FoodInfo; quantity: string; unit: AmountUnit }

export type PortionListInput = { name: string; servings: number; items: Portion[] }

type Props = {
  open: boolean
  /** "meal" lists amounts in servings; "recipe" also takes 100 g amounts and a number of servings made. */
  kind: 'meal' | 'recipe'
  initial: { name: string; servings?: number; items: Portion[] } | null
  onClose: () => void
  onSave: (input: PortionListInput) => Promise<void>
}

let nextKey = 0

function Editor({ kind, initial, onClose, onSave }: Omit<Props, 'open'>) {
  const userId = useUserId()
  const noun = kind === 'meal' ? 'meal' : 'recipe'
  const [name, setName] = useState(initial?.name ?? '')
  const [servings, setServings] = useState(String(initial?.servings ?? 1))
  const [items, setItems] = useState<Draft[]>(() =>
    (initial?.items ?? []).map((i) => ({ key: String(nextKey++), food: i.food, quantity: String(i.quantity), unit: i.unit })),
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const valid = items.map((i) => ({ food: i.food, quantity: Number(i.quantity), unit: i.unit })).filter((i) => i.quantity > 0)
  const { totals } = usePortionTotals(valid)
  const madeServings = Number(servings) > 0 ? Number(servings) : 1
  const update = (key: string, patch: Partial<Draft>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError(`Enter a name for the ${noun}.`)
    if (!items.length) return setError(`Add at least one ${kind === 'meal' ? 'food' : 'ingredient'}.`)
    if (valid.length !== items.length) return setError('Every amount needs to be above zero.')
    if (kind === 'recipe' && !(Number.isInteger(Number(servings)) && Number(servings) > 0)) return setError('Enter how many servings the recipe makes, as a whole number.')
    setSaving(true)
    setError('')
    try {
      await onSave({ name, servings: madeServings, items: valid })
    } catch {
      setError(`Couldn’t save this ${noun}. Please try again.`)
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className={kind === 'recipe' ? 'grid gap-3 sm:grid-cols-[1fr_10rem]' : ''}>
        <Field label="Name" htmlFor="pl-name">
          <Input id="pl-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        {kind === 'recipe' && (
          <Field label="Servings it makes" htmlFor="pl-servings">
            <Input id="pl-servings" type="number" min={1} step={1} value={servings} onChange={(e) => setServings(e.target.value)} />
          </Field>
        )}
      </div>

      <section aria-label={kind === 'meal' ? 'Foods in this meal' : 'Ingredients'} className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{kind === 'meal' ? 'Foods' : 'Ingredients'}</h3>
        {items.length === 0 ? (
          <p className="text-sm text-muted">Search below to add {kind === 'meal' ? 'foods' : 'ingredients'}.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {items.map((i) => (
              <li key={i.key} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm">{i.food.name}</span>
                <Input
                  aria-label={`Amount of ${i.food.name}`}
                  type="number"
                  min={0}
                  step="any"
                  className="h-8 w-20"
                  value={i.quantity}
                  onChange={(e) => update(i.key, { quantity: e.target.value })}
                />
                {kind === 'recipe' && supports100g(i.food) ? (
                  <Select aria-label={`Unit for ${i.food.name}`} className="h-8 w-auto text-xs" value={i.unit} onChange={(e) => update(i.key, { unit: e.target.value as AmountUnit })}>
                    <option value="serving">{servingOptionLabel(i.food)}</option>
                    <option value="100g">100 g</option>
                  </Select>
                ) : (
                  <span className="text-xs text-muted">{amountUnitLabel(i.food, i.unit) === '100 g' ? '× 100 g' : servingOptionLabel(i.food)}</span>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${i.food.name}`}
                  onClick={() => setItems((list) => list.filter((x) => x.key !== i.key))}
                  className="rounded-md p-1 text-muted hover:bg-surface-raised hover:text-danger"
                >
                  <X size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {items.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted">{kind === 'recipe' ? `Per serving (of ${madeServings})` : 'Whole meal'}</p>
            <NutritionTiles nutrients={totals ? (kind === 'recipe' ? multiplyNutrients(totals, 1 / madeServings) : totals) : null} label={kind === 'recipe' ? 'Nutrition per serving' : 'Nutrition for the meal'} />
          </div>
        )}
      </section>

      <FoodSearch
        userId={userId}
        listClassName="max-h-48"
        onSelect={(f) => {
          const food = { ...asFood(f), name: f.name, brand: f.brand, verified: f.kind === 'verified' }
          setItems((list) => [...list, { key: String(nextKey++), food, quantity: '1', unit: 'serving' }])
        }}
      />

      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : `Save ${noun}`}
        </Button>
      </div>
    </form>
  )
}

export function PortionEditor({ open, kind, initial, onClose, onSave }: Props) {
  const title = `${initial ? 'Edit' : 'New'} ${kind === 'meal' ? 'meal' : 'recipe'}`
  return (
    <Dialog open={open} onClose={onClose} title={title} className="max-w-2xl">
      <Editor key={initial ? JSON.stringify(initial.items.map((i) => foodKey(i.food))) + initial.name : 'new'} kind={kind} initial={initial} onClose={onClose} onSave={onSave} />
    </Dialog>
  )
}
