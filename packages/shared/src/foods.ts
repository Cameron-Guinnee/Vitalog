import { gramsFor, round1, scaleNutrients, sumNutrients, type NutrientMap } from './nutrients'

/**
 * Where a food's nutrients come from. USDA foods store nutrients per 100 g and a
 * serving size in grams. Custom foods store nutrients per serving, as printed on a
 * nutrition label, and their serving can be in any unit.
 */
export type FoodKind = 'usda' | 'custom'
export type FoodRef = { kind: FoodKind; id: string }
export type ServingInfo = { kind: FoodKind; servingSize: number | null; servingUnit: string | null }
export type AmountUnit = 'serving' | '100g'

export const foodKey = (f: FoodRef) => `${f.kind}:${f.id}`

/** Whether an amount can be given in 100 g steps. Custom foods need a serving measured in grams. */
export function supports100g(food: ServingInfo): boolean {
  if (food.kind === 'usda') return !!food.servingSize
  return isGrams(food.servingUnit) && !!food.servingSize && food.servingSize > 0
}

const isGrams = (unit: string | null) => unit === 'g' || unit === 'grams' || unit === 'gram'

/** Nutrients in `quantity` of `unit` of a food, given its stored nutrient values. */
export function nutrientsForAmount(food: ServingInfo, stored: NutrientMap, quantity: number, unit: AmountUnit): NutrientMap {
  if (food.kind === 'usda') return scaleNutrients(stored, gramsFor(quantity, unit, food.servingSize))
  const servings = unit === '100g' && supports100g(food) ? (quantity * 100) / food.servingSize! : quantity
  const out: NutrientMap = {}
  for (const [id, v] of Object.entries(stored)) out[Number(id)] = v * servings
  return out
}

/** How an amount reads in the diary, such as "1 cup" or "2 × 100 g". */
export function amountUnitLabel(food: ServingInfo, unit: AmountUnit): string {
  if (unit === '100g' || (food.kind === 'usda' && !food.servingSize)) return '100 g'
  return food.servingUnit && food.servingUnit !== 'g' ? food.servingUnit : 'serving'
}

/**
 * The serving option's label in a unit picker, such as "serving (30 g)".
 * USDA foods keep the serving's weight in grams and its household measure, such as
 * "1 cup, sliced", as the unit, so they read "1 cup, sliced (110 g)".
 */
export function servingOptionLabel(food: ServingInfo): string {
  if (food.kind === 'usda' && !food.servingSize) return '100 g'
  if (!food.servingSize) return food.servingUnit ?? 'serving'
  if (food.kind === 'usda' && food.servingUnit && food.servingUnit !== 'g') return `${food.servingUnit} (${round1(food.servingSize)} g)`
  return `serving (${food.servingSize} ${food.servingUnit ?? 'g'})`
}

export type Portion = { food: ServingInfo & FoodRef; quantity: number; unit: AmountUnit }

/** Total nutrients for a list of portions, looking up each food's stored values by key. */
export function totalNutrients(portions: Portion[], stored: Map<string, NutrientMap>): NutrientMap {
  return sumNutrients(portions.map((p) => nutrientsForAmount(p.food, stored.get(foodKey(p.food)) ?? {}, p.quantity, p.unit)))
}

/** Scales every nutrient by a factor, such as servings of a recipe out of its total. */
export function multiplyNutrients(n: NutrientMap, factor: number): NutrientMap {
  const out: NutrientMap = {}
  for (const [id, v] of Object.entries(n)) out[Number(id)] = v * factor
  return out
}

/** An amount for display, such as "2 servings", "0.5 cup" or "1 × 100 g". */
export function amountText(quantity: number, unitLabel: string): string {
  // A unit that starts with its own amount, such as "100 g" or "1 cup", reads "2 × 1 cup".
  if (/^[\d./]/.test(unitLabel)) return `${quantity} × ${unitLabel}`
  return `${quantity} ${unitLabel === 'serving' && quantity !== 1 ? 'servings' : unitLabel}`
}
