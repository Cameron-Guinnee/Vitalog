import { useQuery } from '@tanstack/react-query'
import { addDays, amountText, amountUnitLabel, dayRange, toDayKey } from '@vitalog/shared'
import { useState } from 'react'
import { useUserId } from '../../auth/AuthProvider'
import { Alert } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Segmented } from '../../features/dashboard/Card'
import { AddEntryDialogs } from '../../features/diary/AddEntryDialogs'
import type { FoodSelection } from '../../features/diary/FoodDialog'
import { asSearchResult, fetchRepeatItems, foodsKey, listRecipes, type RepeatItem } from '../../features/foods/api'
import { activeDiaryGroups, displaySettingsFrom } from '../../features/profile/displaySettings'
import { useProfile } from '../../features/profile/useProfile'

const RANGES = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
] as const

const lastLogged = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export function RepeatItems() {
  const userId = useUserId()
  const { data: profile } = useProfile(userId)
  const [range, setRange] = useState<number>(30)
  const today = toDayKey(new Date())
  const since = dayRange(addDays(today, -(range - 1))).start
  const items = useQuery({ queryKey: foodsKey(userId, 'repeat', since), queryFn: () => fetchRepeatItems(userId, since) })
  const recipes = useQuery({ queryKey: foodsKey(userId, 'recipes'), queryFn: () => listRecipes(userId) })
  const [logging, setLogging] = useState<FoodSelection | null>(null)

  function selectionFor(item: RepeatItem): FoodSelection | null {
    if (item.food) return { type: 'food', food: asSearchResult(item.food), quantity: item.lastQuantity, unit: item.lastUnit }
    const recipe = recipes.data?.find((r) => r.id === item.recipeId)
    return recipe ? { type: 'recipe', recipe, quantity: item.lastQuantity } : null
  }

  const settings = displaySettingsFrom(profile?.display_settings)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">What you log most, so you can add it again in a couple of clicks.</p>
        <Segmented label="Date range" value={range} options={RANGES} onChange={setRange} />
      </div>

      {items.isError ? (
        <Alert tone="error">Couldn’t load your foods. Refresh to try again.</Alert>
      ) : items.isPending ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : items.data.length === 0 ? (
        <p className="rounded-xl bg-surface py-10 text-center text-sm text-muted">Nothing logged in the last {range} days.</p>
      ) : (
        <section aria-label="Repeat items" className="rounded-xl bg-surface">
          <ul className="divide-y divide-border">
            {items.data.map((item) => {
              const selection = selectionFor(item)
              return (
                <li key={item.key} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-sm font-medium tabular-nums" aria-label={`Logged ${item.count} times`}>
                    {item.count}×
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm">{item.name}</span>
                    <span className="truncate text-xs text-muted">
                      {item.kind === 'recipe' ? 'Recipe · ' : item.food?.kind === 'custom' ? 'Custom food · ' : ''}
                      Last {lastLogged(item.lastLoggedAt)}, {amountText(item.lastQuantity, item.food ? amountUnitLabel(item.food, item.lastUnit) : 'serving')}
                    </span>
                  </div>
                  <Button variant="secondary" disabled={!selection} onClick={() => setLogging(selection)} aria-label={`Log ${item.name} again`}>
                    Log again
                  </Button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <AddEntryDialogs
        open={logging ? 'food' : null}
        onClose={() => setLogging(null)}
        userId={userId}
        day={today}
        groups={activeDiaryGroups(settings)}
        units={profile?.units_preference === 'metric' ? 'metric' : 'imperial'}
        initialFood={logging}
      />
    </div>
  )
}
