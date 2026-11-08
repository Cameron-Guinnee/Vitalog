import { useQuery } from '@tanstack/react-query'
import { NUTRIENT, foodKey, round1, totalNutrients, type FoodRef, type NutrientMap } from '@vitalog/shared'
import { fetchStoredNutrients, type Portion } from './api'

/** Stored nutrient values for every food in a list, loaded together. */
export function useStoredNutrients(foods: FoodRef[]) {
  const keys = [...new Set(foods.map(foodKey))].sort()
  return useQuery({ queryKey: ['stored-nutrients', keys], queryFn: () => fetchStoredNutrients(foods), enabled: keys.length > 0 })
}

/** Total nutrients for a meal's or recipe's items, or null while they load. */
export function usePortionTotals(items: Portion[]): { totals: NutrientMap | null; stored: Map<string, NutrientMap> | undefined; isError: boolean } {
  const stored = useStoredNutrients(items.map((i) => i.food))
  if (!items.length) return { totals: {}, stored: new Map(), isError: false }
  return { totals: stored.data ? totalNutrients(items, stored.data) : null, stored: stored.data, isError: stored.isError }
}

/** Calories, protein, carbs and fat in a row of tiles. */
export function NutritionTiles({ nutrients, label = 'Nutrition for this amount' }: { nutrients: NutrientMap | null; label?: string }) {
  const n = nutrients ?? {}
  return (
    <dl className="grid grid-cols-4 gap-2 text-center text-sm" aria-label={label}>
      {[
        ['Calories', `${Math.round(n[NUTRIENT.energy] ?? 0)}`],
        ['Protein', `${round1(n[NUTRIENT.protein] ?? 0)} g`],
        ['Carbs', `${round1(n[NUTRIENT.carbs] ?? 0)} g`],
        ['Fat', `${round1(n[NUTRIENT.fat] ?? 0)} g`],
      ].map(([k, v]) => (
        <div key={k} className="rounded-lg bg-surface-raised p-2">
          <dt className="text-xs text-muted">{k}</dt>
          <dd className="font-medium">{nutrients ? v : '…'}</dd>
        </div>
      ))}
    </dl>
  )
}

export const kcal = (n: NutrientMap | null | undefined) => Math.round(n?.[NUTRIENT.energy] ?? 0)
