import { NUTRIENT, round1, type NutrientMap } from '@vitalog/shared'

/** Average of each nutrient over the days that have food logged. */
export function averageNutrients(days: NutrientMap[]): NutrientMap {
  if (!days.length) return {}
  const totals: NutrientMap = {}
  for (const day of days) for (const [id, v] of Object.entries(day)) totals[Number(id)] = (totals[Number(id)] ?? 0) + v
  return Object.fromEntries(Object.entries(totals).map(([id, v]) => [id, round1(v / days.length)]))
}

/** Share of calories from protein, carbs and fat (4/4/9 kcal per gram), as whole percentages. */
export function macroSplit(n: NutrientMap): { protein: number; carbs: number; fat: number } | null {
  const protein = (n[NUTRIENT.protein] ?? 0) * 4
  const carbs = (n[NUTRIENT.carbs] ?? 0) * 4
  const fat = (n[NUTRIENT.fat] ?? 0) * 9
  const total = protein + carbs + fat
  if (!total) return null
  return { protein: Math.round((protein / total) * 100), carbs: Math.round((carbs / total) * 100), fat: Math.round((fat / total) * 100) }
}
