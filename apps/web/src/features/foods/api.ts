import { foodKey, type AmountUnit, type FoodKind, type FoodRef, type NutrientMap, type ServingInfo } from '@vitalog/shared'
import { allPages } from '../../lib/pages'
import { supabase } from '../../lib/supabase'
import type { FoodResult } from '../diary/foodSearch'

export const foodsKey = (userId: string, ...rest: unknown[]) => ['foods', userId, ...rest] as const

export type FoodInfo = FoodRef & ServingInfo & { name: string; brand: string | null; verified?: boolean }

type FoodColumns = { name: string; brand: string | null; serving_size: number | null; serving_unit: string | null }
type Joined = {
  food_id: string | null
  custom_food_id: string | null
  foods: (FoodColumns & { is_verified?: boolean }) | null
  custom_foods: FoodColumns | null
}

const FOOD_COLUMNS = 'name, brand, serving_size, serving_unit'

/** The food a meal item, recipe ingredient or diary entry points at. */
function joinedFood(row: Joined): FoodInfo | null {
  const kind: FoodKind | null = row.food_id ? 'usda' : row.custom_food_id ? 'custom' : null
  const f = kind === 'usda' ? row.foods : row.custom_foods
  if (!kind || !f) return null
  return {
    kind,
    id: (kind === 'usda' ? row.food_id : row.custom_food_id)!,
    name: f.name,
    brand: f.brand,
    servingSize: f.serving_size,
    servingUnit: f.serving_unit,
    verified: row.foods?.is_verified,
  }
}

/** A food in the shape the diary's food search returns. */
export function asSearchResult(f: FoodInfo): FoodResult {
  return {
    id: f.id,
    name: f.name,
    brand: f.brand,
    servingSize: f.servingSize,
    servingUnit: f.servingUnit,
    kind: f.kind === 'custom' ? 'custom' : f.verified === false ? 'branded' : 'verified',
  }
}

/** Stored nutrient values for many foods at once, keyed by foodKey. */
export async function fetchStoredNutrients(foods: FoodRef[]): Promise<Map<string, NutrientMap>> {
  const usda = [...new Set(foods.filter((f) => f.kind === 'usda').map((f) => f.id))]
  const custom = [...new Set(foods.filter((f) => f.kind === 'custom').map((f) => f.id))]
  const [u, c] = await Promise.all([
    usda.length
      ? allPages((from, to) => supabase.from('food_nutrient_values').select('food_id, nutrient_id, value').in('food_id', usda).range(from, to))
      : Promise.resolve([]),
    custom.length
      ? allPages((from, to) =>
          supabase.from('custom_food_nutrient_values').select('custom_food_id, nutrient_id, value').in('custom_food_id', custom).range(from, to),
        )
      : Promise.resolve([]),
  ])
  const out = new Map<string, NutrientMap>()
  const put = (key: string, id: number, value: number) => out.set(key, { ...(out.get(key) ?? {}), [id]: value })
  for (const r of u) put(foodKey({ kind: 'usda', id: r.food_id }), r.nutrient_id, r.value)
  for (const r of c) put(foodKey({ kind: 'custom', id: r.custom_food_id }), r.nutrient_id, r.value)
  return out
}

// Custom foods

export type CustomFood = FoodInfo & { kind: 'custom'; nutrients: NutrientMap }

export async function listCustomFoods(userId: string): Promise<CustomFood[]> {
  const { data, error } = await supabase
    .from('custom_foods')
    .select('id, name, brand, serving_size, serving_unit, custom_food_nutrient_values (nutrient_id, value)')
    .eq('user_id', userId)
    .is('archived_at', null)
    .order('name')
  if (error) throw error
  return (data ?? []).map((f) => ({
    kind: 'custom',
    id: f.id,
    name: f.name,
    brand: f.brand,
    servingSize: f.serving_size,
    servingUnit: f.serving_unit,
    nutrients: Object.fromEntries((f.custom_food_nutrient_values ?? []).map((n) => [n.nutrient_id, n.value])),
  }))
}

export type CustomFoodInput = { id?: string; name: string; brand: string; servingSize: number; servingUnit: string; nutrients: NutrientMap }

export async function saveCustomFood(userId: string, f: CustomFoodInput): Promise<string> {
  const fields = { name: f.name.trim(), brand: f.brand.trim() || null, serving_size: f.servingSize, serving_unit: f.servingUnit }
  let id = f.id
  if (id) {
    const { error } = await supabase.from('custom_foods').update(fields).eq('id', id)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('custom_foods').insert({ user_id: userId, ...fields }).select('id').single()
    if (error) throw error
    id = data.id
  }

  const rows = Object.entries(f.nutrients).map(([nid, value]) => ({ custom_food_id: id!, nutrient_id: Number(nid), value }))
  try {
    if (rows.length) {
      const { error } = await supabase.from('custom_food_nutrient_values').upsert(rows, { onConflict: 'custom_food_id,nutrient_id' })
      if (error) throw error
    }
    if (f.id) {
      // Remove nutrients that were cleared in the form.
      let del = supabase.from('custom_food_nutrient_values').delete().eq('custom_food_id', id)
      if (rows.length) del = del.not('nutrient_id', 'in', `(${rows.map((r) => r.nutrient_id).join(',')})`)
      const { error } = await del
      if (error) throw error
    }
  } catch (err) {
    // A new food with no nutrients would log as zero calories, so don't keep it.
    if (!f.id) await supabase.from('custom_foods').delete().eq('id', id)
    throw err
  }
  return id
}

/** Hides a custom food from lists and search. Diary entries, meals and recipes that use it keep working. */
export async function archiveCustomFood(id: string) {
  const { error } = await supabase.from('custom_foods').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// Meals and recipes

export type Portion = { id?: string; food: FoodInfo; quantity: number; unit: AmountUnit }
export type Meal = { id: string; name: string; items: Portion[] }
export type Recipe = { id: string; name: string; servings: number; items: Portion[] }

const JOINED = `food_id, custom_food_id, foods (${FOOD_COLUMNS}, is_verified), custom_foods (${FOOD_COLUMNS})`

export async function listMeals(userId: string): Promise<Meal[]> {
  const { data, error } = await supabase
    .from('custom_meals')
    .select(`id, name, custom_meal_items (id, quantity, ${JOINED})`)
    .eq('user_id', userId)
    .order('name')
  if (error) throw error
  return (data ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    items: (m.custom_meal_items ?? []).flatMap((i) => {
      const food = joinedFood(i as Joined)
      return food ? [{ id: i.id, food, quantity: i.quantity, unit: 'serving' as const }] : []
    }),
  }))
}

export async function listRecipes(userId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select(`id, name, servings, recipe_ingredients (id, quantity, serving_unit, ${JOINED})`)
    .eq('user_id', userId)
    .is('archived_at', null)
    .order('name')
  if (error) throw error
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    servings: r.servings,
    items: (r.recipe_ingredients ?? []).flatMap((i) => {
      const food = joinedFood(i as Joined)
      return food ? [{ id: i.id, food, quantity: i.quantity, unit: i.serving_unit === '100 g' ? ('100g' as const) : ('serving' as const) }] : []
    }),
  }))
}

const foodColumns = (f: FoodRef) => ({ food_id: f.kind === 'usda' ? f.id : null, custom_food_id: f.kind === 'custom' ? f.id : null })

/**
 * Replaces a list's items: the new ones are saved before the old ones are removed,
 * so a failure part-way never leaves the list empty.
 */
async function replaceItems(insert: () => PromiseLike<{ error: unknown }>, remove: () => PromiseLike<{ error: unknown }> | null) {
  const inserted = await insert()
  if (inserted.error) throw inserted.error
  const removed = await remove()
  if (removed?.error) throw removed.error
}

export type MealInput = { id?: string; name: string; items: Portion[] }

export async function saveMeal(userId: string, m: MealInput, previousItemIds: string[]): Promise<string> {
  let id = m.id
  if (id) {
    const { error } = await supabase.from('custom_meals').update({ name: m.name.trim() }).eq('id', id)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('custom_meals').insert({ user_id: userId, name: m.name.trim() }).select('id').single()
    if (error) throw error
    id = data.id
  }
  await replaceItems(
    () => supabase.from('custom_meal_items').insert(m.items.map((i) => ({ custom_meal_id: id!, quantity: i.quantity, ...foodColumns(i.food) }))),
    () => (previousItemIds.length ? supabase.from('custom_meal_items').delete().in('id', previousItemIds) : null),
  )
  return id
}

export async function deleteMeal(id: string) {
  const { error } = await supabase.from('custom_meals').delete().eq('id', id)
  if (error) throw error
}

export type RecipeInput = { id?: string; name: string; servings: number; items: Portion[] }

export async function saveRecipe(userId: string, r: RecipeInput, previousItemIds: string[]): Promise<string> {
  const fields = { name: r.name.trim(), servings: r.servings }
  let id = r.id
  if (id) {
    const { error } = await supabase.from('recipes').update(fields).eq('id', id)
    if (error) throw error
  } else {
    const { data, error } = await supabase.from('recipes').insert({ user_id: userId, ...fields }).select('id').single()
    if (error) throw error
    id = data.id
  }
  await replaceItems(
    () =>
      supabase.from('recipe_ingredients').insert(
        r.items.map((i) => ({ recipe_id: id!, quantity: i.quantity, serving_unit: i.unit === '100g' ? '100 g' : 'serving', ...foodColumns(i.food) })),
      ),
    () => (previousItemIds.length ? supabase.from('recipe_ingredients').delete().in('id', previousItemIds) : null),
  )
  return id
}

/** Hides a recipe. Diary entries that logged it keep their name and nutrients. */
export async function archiveRecipe(id: string) {
  const { error } = await supabase.from('recipes').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// Frequently logged items

export type RepeatItem = {
  key: string
  kind: 'food' | 'recipe'
  food: FoodInfo | null
  recipeId: string | null
  name: string
  count: number
  lastLoggedAt: string
  lastQuantity: number
  lastUnit: AmountUnit
}

/** Foods and recipes logged between two timestamps, most often first. Archived ones are left out. */
export async function fetchRepeatItems(userId: string, since: string): Promise<RepeatItem[]> {
  const rows = await allPages((from, to) =>
    supabase
      .from('diary_entries')
      .select(
        `id, logged_at, quantity, serving_unit, recipe_id, food_id, custom_food_id, foods (${FOOD_COLUMNS}, is_verified), custom_foods (${FOOD_COLUMNS}, archived_at), recipes (name, archived_at)`,
      )
      .eq('user_id', userId)
      .gte('logged_at', since)
      .order('logged_at', { ascending: false })
      .order('id')
      .range(from, to),
  )
  const items = new Map<string, RepeatItem>()
  for (const r of rows) {
    if (r.custom_foods?.archived_at || r.recipes?.archived_at) continue
    const food = r.recipe_id ? null : joinedFood(r as Joined)
    const key = r.recipe_id ? `recipe:${r.recipe_id}` : food ? foodKey(food) : null
    const name = r.recipes?.name ?? food?.name
    if (!key || !name) continue
    const existing = items.get(key)
    if (existing) {
      existing.count++
      continue
    }
    // Rows are newest first, so the first one seen holds the last amount used.
    items.set(key, {
      key,
      kind: r.recipe_id ? 'recipe' : 'food',
      food,
      recipeId: r.recipe_id,
      name,
      count: 1,
      lastLoggedAt: r.logged_at,
      lastQuantity: r.quantity,
      lastUnit: r.serving_unit === '100 g' ? '100g' : 'serving',
    })
  }
  return [...items.values()].sort((a, b) => b.count - a.count || b.lastLoggedAt.localeCompare(a.lastLoggedAt))
}
