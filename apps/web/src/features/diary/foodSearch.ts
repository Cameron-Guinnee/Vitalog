import type { NutrientMap } from '@vitalog/shared'
import { supabase } from '../../lib/supabase'

export type FoodFilter = 'all' | 'verified' | 'branded' | 'custom'

export type FoodResult = {
  id: string
  name: string
  brand: string | null
  servingSize: number | null
  servingUnit: string | null
  kind: 'verified' | 'branded' | 'custom'
}

export async function searchFoods(userId: string, query: string, filter: FoodFilter): Promise<FoodResult[]> {
  const q = query.trim()
  if (!q) return []

  const usda =
    filter === 'custom'
      ? null
      : (() => {
          let req = supabase
            .from('foods')
            .select('id, name, brand, is_verified, serving_size, serving_unit')
            .textSearch('name', q, { type: 'websearch' })
            .limit(50)
          if (filter === 'verified') req = req.eq('is_verified', true)
          if (filter === 'branded') req = req.eq('is_verified', false)
          return req
        })()

  // Escape LIKE wildcards so a search for "100%" doesn't match everything.
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
  const custom =
    filter === 'all' || filter === 'custom'
      ? supabase.from('custom_foods').select('id, name, brand, serving_size, serving_unit').eq('user_id', userId).ilike('name', pattern).limit(50)
      : null

  const [usdaRes, customRes] = await Promise.all([usda, custom])
  if (usdaRes?.error) throw usdaRes.error
  if (customRes?.error) throw customRes.error

  return [
    ...(customRes?.data ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      brand: f.brand,
      servingSize: f.serving_size,
      servingUnit: f.serving_unit,
      kind: 'custom' as const,
    })),
    ...(usdaRes?.data ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      brand: f.brand,
      servingSize: f.serving_size,
      servingUnit: f.serving_unit,
      kind: f.is_verified ? ('verified' as const) : ('branded' as const),
    })),
  ]
}

/** Per-100 g nutrient values for a food. */
export async function fetchFoodNutrients(food: Pick<FoodResult, 'id' | 'kind'>): Promise<NutrientMap> {
  const res =
    food.kind === 'custom'
      ? await supabase.from('custom_food_nutrient_values').select('nutrient_id, value').eq('custom_food_id', food.id)
      : await supabase.from('food_nutrient_values').select('nutrient_id, value').eq('food_id', food.id)
  if (res.error) throw res.error
  const map: NutrientMap = {}
  for (const n of res.data ?? []) map[n.nutrient_id] = n.value
  return map
}
