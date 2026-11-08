import { useQuery } from '@tanstack/react-query'
import { amountUnitLabel, multiplyNutrients, nutrientsForAmount, servingOptionLabel, supports100g, type AmountUnit } from '@vitalog/shared'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Dialog } from '../../components/ui/dialog'
import { Field } from '../../components/ui/field'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { cn } from '../../lib/utils'
import { asSearchResult, fetchRepeatItems, foodsKey, listMeals, listRecipes, type Meal, type Recipe } from '../foods/api'
import { FoodSearch } from '../foods/FoodSearch'
import { NutritionTiles, kcal, usePortionTotals, useStoredNutrients } from '../foods/nutrition'
import type { ActiveGroup } from '../profile/displaySettings'
import type { NewFoodEntry } from './api'
import { asFood, type FoodResult } from './foodSearch'

/** What the dialog is about to log. Food and recipe selections can carry a starting amount. */
export type FoodSelection =
  | { type: 'food'; food: FoodResult; quantity?: number; unit?: AmountUnit }
  | { type: 'meal'; meal: Meal }
  | { type: 'recipe'; recipe: Recipe; quantity?: number }

export type FoodToLog = { group: ActiveGroup; entries: NewFoodEntry[] }

type Props = {
  open: boolean
  onClose: () => void
  userId: string
  groups: ActiveGroup[]
  defaultGroup: number
  onAdd: (food: FoodToLog) => Promise<void>
  /** Opens straight to this food, meal or recipe, such as "log again" from Repeat items. */
  initial?: FoodSelection | null
}

type Tab = 'search' | 'frequent' | 'meals' | 'recipes'
const TABS: { value: Tab; label: string }[] = [
  { value: 'search', label: 'Search' },
  { value: 'frequent', label: 'Frequent' },
  { value: 'meals', label: 'Meals' },
  { value: 'recipes', label: 'Recipes' },
]

const FREQUENT_DAYS = 30

function AmountForm({
  title,
  groups,
  defaultGroup,
  nutrients,
  loading,
  failed,
  children,
  onSubmit,
}: {
  title: ReactNode
  groups: ActiveGroup[]
  defaultGroup: number
  nutrients: ReturnType<typeof nutrientsForAmount> | null
  loading: boolean
  failed: boolean
  children: ReactNode
  onSubmit: (group: ActiveGroup) => Promise<void>
}) {
  const [group, setGroup] = useState(groups.some((g) => g.index === defaultGroup) ? defaultGroup : groups[0]!.index)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!nutrients) return setError('Enter an amount above zero.')
    setSaving(true)
    setError('')
    try {
      await onSubmit(groups.find((g) => g.index === group)!)
    } catch {
      setError('Couldn’t add this to your diary. Please try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="font-medium">{title}</div>
      {loading ? (
        <p className="text-sm text-muted">Loading nutrients…</p>
      ) : failed ? (
        <Alert tone="error">Couldn’t load the nutrients.</Alert>
      ) : (
        <NutritionTiles nutrients={nutrients} />
      )}
      {children}
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
      <Button type="submit" disabled={saving || loading || failed}>
        {saving ? 'Adding…' : 'Add to diary'}
      </Button>
    </form>
  )
}

const positive = (s: string) => {
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? n : null
}

function SelectedFood({ selection, ...rest }: { selection: Extract<FoodSelection, { type: 'food' }> } & FormProps) {
  const { food } = selection
  const info = asFood(food)
  const [quantity, setQuantity] = useState(String(selection.quantity ?? 1))
  const [unit, setUnit] = useState<AmountUnit>(selection.unit === '100g' && supports100g(info) ? '100g' : 'serving')
  const stored = useStoredNutrients([info])
  const qty = positive(quantity)
  const eaten = stored.data && qty ? nutrientsForAmount(info, stored.data.get(`${info.kind}:${info.id}`) ?? {}, qty, unit) : null

  return (
    <AmountForm
      {...rest}
      title={food.name}
      nutrients={eaten}
      loading={stored.isPending}
      failed={stored.isError}
      onSubmit={(group) =>
        rest.onAdd({
          group,
          // Record what the amount is measured in, so "2 × 100 g" isn't shown as 2 servings.
          entries: [{ item: info, quantity: qty!, servingUnit: amountUnitLabel(info, unit), nutrients: eaten! }],
        })
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" htmlFor="food-qty">
          <Input id="food-qty" type="number" min={0} step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <Field label="Unit" htmlFor="food-unit">
          <Select id="food-unit" value={unit} onChange={(e) => setUnit(e.target.value as AmountUnit)}>
            <option value="serving">{servingOptionLabel(info)}</option>
            {supports100g(info) && <option value="100g">100 g</option>}
          </Select>
        </Field>
      </div>
    </AmountForm>
  )
}

function SelectedMeal({ meal, ...rest }: { meal: Meal } & FormProps) {
  const [portions, setPortions] = useState('1')
  const { totals, stored, isError } = usePortionTotals(meal.items)
  const factor = positive(portions)
  const eaten = totals && factor ? multiplyNutrients(totals, factor) : null

  return (
    <AmountForm
      {...rest}
      title={
        <>
          {meal.name}
          <span className="block text-xs font-normal text-muted">
            {meal.items.length} {meal.items.length === 1 ? 'item' : 'items'}, each logged as its own diary entry
          </span>
        </>
      }
      nutrients={eaten}
      loading={!totals && !isError}
      failed={isError}
      onSubmit={(group) =>
        rest.onAdd({
          group,
          entries: meal.items.map((i) => ({
            item: i.food,
            quantity: i.quantity * factor!,
            servingUnit: amountUnitLabel(i.food, i.unit),
            nutrients: nutrientsForAmount(i.food, stored?.get(`${i.food.kind}:${i.food.id}`) ?? {}, i.quantity * factor!, i.unit),
          })),
        })
      }
    >
      <Field label="Portions" htmlFor="meal-portions" hint="1 logs the meal as saved; 0.5 logs half of every item.">
        <Input id="meal-portions" type="number" min={0} step="any" value={portions} onChange={(e) => setPortions(e.target.value)} />
      </Field>
    </AmountForm>
  )
}

function SelectedRecipe({ recipe, quantity, ...rest }: { recipe: Recipe; quantity?: number } & FormProps) {
  const [servings, setServings] = useState(String(quantity ?? 1))
  const { totals, isError } = usePortionTotals(recipe.items)
  const eatenServings = positive(servings)
  const eaten = totals && eatenServings ? multiplyNutrients(totals, eatenServings / recipe.servings) : null

  return (
    <AmountForm
      {...rest}
      title={
        <>
          {recipe.name}
          <span className="block text-xs font-normal text-muted">Makes {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}</span>
        </>
      }
      nutrients={eaten}
      loading={!totals && !isError}
      failed={isError}
      onSubmit={(group) =>
        rest.onAdd({ group, entries: [{ item: { kind: 'recipe', id: recipe.id }, quantity: eatenServings!, servingUnit: 'serving', nutrients: eaten! }] })
      }
    >
      <Field label="Servings eaten" htmlFor="recipe-servings">
        <Input id="recipe-servings" type="number" min={0} step="any" value={servings} onChange={(e) => setServings(e.target.value)} />
      </Field>
    </AmountForm>
  )
}

type FormProps = Pick<Props, 'groups' | 'defaultGroup' | 'onAdd'>

function PickList<T>({ items, label, empty, render, onPick, isSelected }: {
  items: T[] | undefined
  label: string
  empty: string
  render: (item: T) => { key: string; title: string; detail: string }
  onPick: (item: T) => void
  isSelected: (item: T) => boolean
}) {
  if (!items) return <p className="p-4 text-sm text-muted">Loading…</p>
  if (!items.length) return <p className="p-4 text-sm text-muted">{empty}</p>
  return (
    <ul aria-label={label} className="divide-y divide-border">
      {items.map((item) => {
        const r = render(item)
        return (
          <li key={r.key}>
            <button
              type="button"
              aria-pressed={isSelected(item)}
              onClick={() => onPick(item)}
              className={cn('flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-surface-raised', isSelected(item) && 'bg-primary/10')}
            >
              <span className="truncate">{r.title}</span>
              <span className="shrink-0 text-xs text-muted">{r.detail}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function MealRow({ meal }: { meal: Meal }) {
  const { totals } = usePortionTotals(meal.items)
  return <>{totals ? `${kcal(totals)} kcal` : ''}</>
}

const since = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export function FoodDialog({ open, onClose, userId, groups, defaultGroup, onAdd, initial }: Props) {
  const [tab, setTab] = useState<Tab>('search')
  const [selected, setSelected] = useState<FoodSelection | null>(null)
  const current = selected ?? initial ?? null

  const meals = useQuery({ queryKey: foodsKey(userId, 'meals'), queryFn: () => listMeals(userId), enabled: open && tab === 'meals' })
  const recipes = useQuery({ queryKey: foodsKey(userId, 'recipes'), queryFn: () => listRecipes(userId), enabled: open && (tab === 'recipes' || tab === 'frequent') })
  const frequent = useQuery({
    queryKey: foodsKey(userId, 'frequent'),
    queryFn: async () => (await fetchRepeatItems(userId, since(FREQUENT_DAYS))).slice(0, 20),
    enabled: open && tab === 'frequent',
  })

  function close() {
    setSelected(null)
    setTab('search')
    onClose()
  }

  // Frequent recipes are matched to the full recipe so its ingredients are known.
  const frequentItems = frequent.data?.flatMap((f): { key: string; title: string; count: number; selection: FoodSelection }[] => {
    if (f.food) return [{ key: f.key, title: f.name, count: f.count, selection: { type: 'food', food: asSearchResult(f.food), quantity: f.lastQuantity, unit: f.lastUnit } }]
    const recipe = recipes.data?.find((r) => r.id === f.recipeId)
    return recipe ? [{ key: f.key, title: f.name, count: f.count, selection: { type: 'recipe', recipe, quantity: f.lastQuantity } }] : []
  })
  const selectedKey = current ? (current.type === 'food' ? `${current.food.kind}:${current.food.id}` : `${current.type}:${current.type === 'meal' ? current.meal.id : current.recipe.id}`) : null
  const keyOf = (s: FoodSelection) => (s.type === 'food' ? `${s.food.kind}:${s.food.id}` : `${s.type}:${s.type === 'meal' ? s.meal.id : s.recipe.id}`)
  const formProps = {
    groups,
    defaultGroup,
    onAdd: async (food: FoodToLog) => {
      await onAdd(food)
      close()
    },
  }

  return (
    <Dialog open={open} onClose={close} title="Add food" className="max-w-2xl">
      {!initial && (
        <>
          <div role="tablist" aria-label="Add from" className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.value}
                role="tab"
                type="button"
                aria-selected={tab === t.value}
                onClick={() => setTab(t.value)}
                className={cn('rounded-lg px-3 py-1.5 text-sm', tab === t.value ? 'bg-primary/15 font-medium text-primary' : 'text-muted hover:bg-surface-raised hover:text-foreground')}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'search' ? (
            <FoodSearch userId={userId} selected={current?.type === 'food' ? current.food : null} onSelect={(food) => setSelected({ type: 'food', food })} />
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
              {tab === 'frequent' ? (
                frequent.isError ? (
                  <p className="p-4 text-sm text-danger">Couldn’t load your frequent foods.</p>
                ) : (
                  <PickList
                    items={frequentItems}
                    label="Frequent foods"
                    empty={`Foods you log will show here. Nothing logged in the last ${FREQUENT_DAYS} days yet.`}
                    render={(f) => ({ key: f.key, title: f.title, detail: `${f.count}×` })}
                    onPick={(f) => setSelected(f.selection)}
                    isSelected={(f) => keyOf(f.selection) === selectedKey}
                  />
                )
              ) : tab === 'meals' ? (
                meals.isError ? (
                  <p className="p-4 text-sm text-danger">Couldn’t load your meals.</p>
                ) : (
                  <ul aria-label="Meals" className="divide-y divide-border">
                    {meals.data?.length === 0 && <li className="p-4 text-sm text-muted">No meals yet. Create one under Foods, then Custom meals.</li>}
                    {!meals.data && <li className="p-4 text-sm text-muted">Loading…</li>}
                    {meals.data?.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          aria-pressed={selectedKey === `meal:${m.id}`}
                          onClick={() => setSelected({ type: 'meal', meal: m })}
                          className={cn('flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-surface-raised', selectedKey === `meal:${m.id}` && 'bg-primary/10')}
                        >
                          <span className="truncate">{m.name}</span>
                          <span className="shrink-0 text-xs text-muted">
                            <MealRow meal={m} />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : recipes.isError ? (
                <p className="p-4 text-sm text-danger">Couldn’t load your recipes.</p>
              ) : (
                <PickList
                  items={recipes.data}
                  label="Recipes"
                  empty="No recipes yet. Create one under Foods, then Custom recipes."
                  render={(r) => ({ key: r.id, title: r.name, detail: `${r.servings} ${r.servings === 1 ? 'serving' : 'servings'}` })}
                  onPick={(r) => setSelected({ type: 'recipe', recipe: r })}
                  isSelected={(r) => selectedKey === `recipe:${r.id}`}
                />
              )}
            </div>
          )}
        </>
      )}

      {current?.type === 'food' && <SelectedFood key={selectedKey} selection={current} {...formProps} />}
      {current?.type === 'meal' && <SelectedMeal key={selectedKey} meal={current.meal} {...formProps} />}
      {current?.type === 'recipe' && <SelectedRecipe key={selectedKey} recipe={current.recipe} quantity={current.quantity} {...formProps} />}
    </Dialog>
  )
}
