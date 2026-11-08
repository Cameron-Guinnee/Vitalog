import { useQuery } from '@tanstack/react-query'
import { NUTRIENT, gramsFor, round1, scaleNutrients, type NutrientMap } from '@vitalog/shared'
import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Dialog } from '../../components/ui/dialog'
import { Field } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { cn } from '../../lib/utils'
import type { ActiveGroup } from '../profile/displaySettings'
import { fetchFoodNutrients, searchFoods, type FoodFilter, type FoodResult } from './foodSearch'

export type FoodToAdd = { food: FoodResult; group: ActiveGroup; quantity: number; servingUnit: string; nutrients: NutrientMap }

type Props = {
  open: boolean
  onClose: () => void
  userId: string
  groups: ActiveGroup[]
  defaultGroup: number
  onAdd: (food: FoodToAdd) => Promise<void>
}

const FILTERS: { value: FoodFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'verified', label: 'Verified' },
  { value: 'branded', label: 'Branded' },
  { value: 'custom', label: 'Custom' },
]

const KIND_STYLE = { custom: 'text-[#f0a500]', verified: 'text-success', branded: 'text-primary' }

function servingLabel(food: FoodResult) {
  if (!food.servingSize) return '100 g'
  return `serving (${food.servingSize} ${food.servingUnit ?? 'g'})`
}

function SelectedFood({ food, groups, defaultGroup, onAdd }: { food: FoodResult } & Pick<Props, 'groups' | 'defaultGroup' | 'onAdd'>) {
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState<'serving' | '100g'>('serving')
  const [group, setGroup] = useState(groups.some((g) => g.index === defaultGroup) ? defaultGroup : groups[0]!.index)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const per100g = useQuery({ queryKey: ['food-nutrients', food.kind, food.id], queryFn: () => fetchFoodNutrients(food) })

  const qty = Number(quantity)
  const valid = Number.isFinite(qty) && qty > 0
  const eaten = per100g.data && valid ? scaleNutrients(per100g.data, gramsFor(qty, unit, food.servingSize)) : null

  async function add(e: FormEvent) {
    e.preventDefault()
    if (!eaten) return setError('Enter an amount above zero.')
    setSaving(true)
    setError('')
    try {
      await onAdd({
        food,
        group: groups.find((g) => g.index === group)!,
        quantity: qty,
        // Record what the amount is measured in, so "2 × 100 g" isn't shown as 2 servings.
        servingUnit: unit === '100g' ? '100 g' : (food.servingUnit ?? 'serving'),
        nutrients: eaten,
      })
    } catch {
      setError('Couldn’t add this food. Please try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={add} className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <p className="font-medium">{food.name}</p>
      {per100g.isPending ? (
        <p className="text-sm text-muted">Loading nutrients…</p>
      ) : per100g.isError ? (
        <Alert tone="error">Couldn’t load this food’s nutrients.</Alert>
      ) : (
        <dl className="grid grid-cols-4 gap-2 text-center text-sm" aria-label="Nutrition for this amount">
          {[
            ['Calories', `${Math.round(eaten?.[NUTRIENT.energy] ?? 0)}`],
            ['Protein', `${round1(eaten?.[NUTRIENT.protein] ?? 0)} g`],
            ['Carbs', `${round1(eaten?.[NUTRIENT.carbs] ?? 0)} g`],
            ['Fat', `${round1(eaten?.[NUTRIENT.fat] ?? 0)} g`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-surface-raised p-2">
              <dt className="text-xs text-muted">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" htmlFor="food-qty">
          <Input id="food-qty" type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <Field label="Unit" htmlFor="food-unit">
          <Select id="food-unit" value={unit} onChange={(e) => setUnit(e.target.value as 'serving' | '100g')}>
            <option value="serving">{servingLabel(food)}</option>
            {food.servingSize && <option value="100g">100 g</option>}
          </Select>
        </Field>
      </div>
      <Field label="Diary group" htmlFor="food-group">
        <Select id="food-group" value={group} onChange={(e) => setGroup(Number(e.target.value))}>
          {groups.map((g) => (
            <option key={g.index} value={g.index}>
              {g.name}
            </option>
          ))}
        </Select>
      </Field>
      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" disabled={saving || !per100g.data}>
        {saving ? 'Adding…' : 'Add to diary'}
      </Button>
    </form>
  )
}

export function FoodDialog({ open, onClose, userId, groups, defaultGroup, onAdd }: Props) {
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [filter, setFilter] = useState<FoodFilter>('all')
  const [selected, setSelected] = useState<FoodResult | null>(null)

  const results = useQuery({
    queryKey: ['food-search', userId, submitted, filter],
    queryFn: () => searchFoods(userId, submitted, filter),
    enabled: submitted.trim().length > 0,
  })

  function close() {
    setText('')
    setSubmitted('')
    setSelected(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={close} title="Add food" className="max-w-2xl">
      <form
        role="search"
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          setSelected(null)
          setSubmitted(text)
        }}
      >
        <Input aria-label="Search foods" placeholder="Search foods…" value={text} onChange={(e) => setText(e.target.value)} />
        <Button type="submit">
          <Search size={16} /> Search
        </Button>
      </form>
      <div className="flex gap-2" role="group" aria-label="Filter results">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={cn('rounded-full border px-3 py-1 text-xs', filter === f.value ? 'border-primary text-primary' : 'border-border text-muted hover:text-foreground')}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
        {!submitted ? (
          <p className="p-4 text-sm text-muted">Search the USDA database and your custom foods.</p>
        ) : results.isPending ? (
          <p className="p-4 text-sm text-muted">Searching…</p>
        ) : results.isError ? (
          <p className="p-4 text-sm text-danger">Search failed. Please try again.</p>
        ) : results.data.length === 0 ? (
          <p className="p-4 text-sm text-muted">No foods match “{submitted}”.</p>
        ) : (
          <ul aria-label="Search results" className="divide-y divide-border">
            {results.data.map((f) => (
              <li key={`${f.kind}-${f.id}`}>
                <button
                  type="button"
                  aria-pressed={selected?.id === f.id}
                  onClick={() => setSelected(f)}
                  className={cn('flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-surface-raised', selected?.id === f.id && 'bg-primary/10')}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{f.name}</span>
                    {f.brand && <span className="truncate text-xs text-muted">{f.brand}</span>}
                  </span>
                  <span className={cn('shrink-0 text-xs capitalize', KIND_STYLE[f.kind])}>{f.kind}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <SelectedFood
          key={`${selected.kind}-${selected.id}`}
          food={selected}
          groups={groups}
          defaultGroup={defaultGroup}
          onAdd={async (food) => {
            await onAdd(food)
            close()
          }}
        />
      )}
    </Dialog>
  )
}
