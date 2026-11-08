// USDA FoodData Central nutrient ids, as stored in the nutrients table.
export const NUTRIENT = {
  energy: 1008,
  protein: 1003,
  fat: 1004,
  carbs: 1005,
  water: 1051,
} as const

export type NutrientMap = Record<number, number>

export type NutrientInfo = { id: number; name: string; unit: string; dailyValue: number | null }

export const NUTRIENT_GROUPS: { label: string; nutrients: NutrientInfo[] }[] = [
  {
    label: 'General',
    nutrients: [
      { id: 1008, name: 'Energy', unit: 'kcal', dailyValue: 2000 },
      { id: 1018, name: 'Alcohol', unit: 'g', dailyValue: null },
      { id: 1057, name: 'Caffeine', unit: 'mg', dailyValue: null },
      { id: 1051, name: 'Water', unit: 'g', dailyValue: 3700 },
    ],
  },
  {
    label: 'Carbohydrates',
    nutrients: [
      { id: 1005, name: 'Carbs', unit: 'g', dailyValue: 275 },
      { id: 1079, name: 'Fiber', unit: 'g', dailyValue: 28 },
      { id: 1063, name: 'Sugars', unit: 'g', dailyValue: 50 },
      { id: 1235, name: 'Added sugars', unit: 'g', dailyValue: 50 },
    ],
  },
  {
    label: 'Lipids',
    nutrients: [
      { id: 1004, name: 'Fat', unit: 'g', dailyValue: 78 },
      { id: 1292, name: 'Monounsaturated fat', unit: 'g', dailyValue: null },
      { id: 1293, name: 'Polyunsaturated fat', unit: 'g', dailyValue: null },
      { id: 1299, name: 'Omega-3', unit: 'g', dailyValue: 1.6 },
      { id: 1278, name: 'ALA', unit: 'g', dailyValue: null },
      { id: 1279, name: 'EPA', unit: 'g', dailyValue: null },
      { id: 1280, name: 'DHA', unit: 'g', dailyValue: null },
      { id: 1300, name: 'Omega-6', unit: 'g', dailyValue: null },
      { id: 1316, name: 'LA', unit: 'g', dailyValue: null },
      { id: 1321, name: 'AA', unit: 'g', dailyValue: null },
      { id: 1258, name: 'Saturated fat', unit: 'g', dailyValue: 20 },
      { id: 1257, name: 'Trans fat', unit: 'g', dailyValue: null },
      { id: 1253, name: 'Cholesterol', unit: 'mg', dailyValue: 300 },
    ],
  },
  {
    label: 'Protein',
    nutrients: [
      { id: 1003, name: 'Protein', unit: 'g', dailyValue: 50 },
      ...(
        [
          [1210, 'Tryptophan'], [1211, 'Threonine'], [1212, 'Isoleucine'], [1213, 'Leucine'],
          [1214, 'Lysine'], [1215, 'Methionine'], [1216, 'Cystine'], [1217, 'Phenylalanine'],
          [1218, 'Tyrosine'], [1219, 'Valine'], [1220, 'Arginine'], [1221, 'Histidine'],
          [1222, 'Alanine'], [1223, 'Aspartic acid'], [1224, 'Glutamic acid'], [1225, 'Glycine'],
          [1226, 'Proline'], [1227, 'Serine'],
        ] as const
      ).map(([id, name]) => ({ id, name, unit: 'g', dailyValue: null })),
    ],
  },
  {
    label: 'Vitamins',
    nutrients: [
      { id: 1106, name: 'Vitamin A', unit: 'mcg', dailyValue: 900 },
      { id: 1162, name: 'Vitamin C', unit: 'mg', dailyValue: 90 },
      { id: 1110, name: 'Vitamin D', unit: 'mcg', dailyValue: 20 },
      { id: 1109, name: 'Vitamin E', unit: 'mg', dailyValue: 15 },
      { id: 1183, name: 'Vitamin K1', unit: 'mcg', dailyValue: 120 },
      { id: 1165, name: 'Vitamin B1', unit: 'mg', dailyValue: 1.2 },
      { id: 1166, name: 'Vitamin B2', unit: 'mg', dailyValue: 1.3 },
      { id: 1167, name: 'Vitamin B3 (niacin)', unit: 'mg', dailyValue: 16 },
      { id: 1170, name: 'Vitamin B5', unit: 'mg', dailyValue: 5 },
      { id: 1175, name: 'Vitamin B6', unit: 'mg', dailyValue: 1.7 },
      { id: 1176, name: 'Biotin', unit: 'mcg', dailyValue: 30 },
      { id: 1177, name: 'Folate', unit: 'mcg', dailyValue: 400 },
      { id: 1178, name: 'Vitamin B12', unit: 'mcg', dailyValue: 2.4 },
      { id: 1180, name: 'Choline', unit: 'mg', dailyValue: 550 },
    ],
  },
  {
    label: 'Minerals',
    nutrients: [
      { id: 1087, name: 'Calcium', unit: 'mg', dailyValue: 1300 },
      { id: 1098, name: 'Chromium', unit: 'mcg', dailyValue: 35 },
      { id: 1094, name: 'Copper', unit: 'mg', dailyValue: 0.9 },
      { id: 1088, name: 'Iron', unit: 'mg', dailyValue: 18 },
      { id: 1102, name: 'Iodine', unit: 'mcg', dailyValue: 150 },
      { id: 1089, name: 'Magnesium', unit: 'mg', dailyValue: 420 },
      { id: 1095, name: 'Manganese', unit: 'mg', dailyValue: 2.3 },
      { id: 1100, name: 'Molybdenum', unit: 'mcg', dailyValue: 45 },
      { id: 1090, name: 'Phosphorus', unit: 'mg', dailyValue: 1250 },
      { id: 1091, name: 'Potassium', unit: 'mg', dailyValue: 4700 },
      { id: 1096, name: 'Selenium', unit: 'mcg', dailyValue: 55 },
      { id: 1092, name: 'Sodium', unit: 'mg', dailyValue: 2300 },
      { id: 1093, name: 'Zinc', unit: 'mg', dailyValue: 11 },
    ],
  },
]

/** Food nutrient values are stored per 100 g; scale them to the amount eaten. */
export function scaleNutrients(per100g: NutrientMap, grams: number): NutrientMap {
  const out: NutrientMap = {}
  for (const [id, value] of Object.entries(per100g)) out[Number(id)] = (value * grams) / 100
  return out
}

/**
 * Grams eaten for a quantity of servings. `servingSize` is the food's serving in grams
 * (USDA foods without one are per 100 g); choosing the 100 g unit ignores it.
 */
export function gramsFor(quantity: number, unit: 'serving' | '100g', servingSize: number | null): number {
  return unit === '100g' ? quantity * 100 : quantity * (servingSize ?? 100)
}

export function sumNutrients(maps: NutrientMap[]): NutrientMap {
  const out: NutrientMap = {}
  for (const m of maps) for (const [id, v] of Object.entries(m)) out[Number(id)] = (out[Number(id)] ?? 0) + v
  return out
}

/** Default macro targets: 30 % protein, 45 % carbs, 25 % fat of the calorie goal. */
export function macroGoals(calorieGoal: number) {
  return {
    protein: Math.round((calorieGoal * 0.3) / 4),
    carbs: Math.round((calorieGoal * 0.45) / 4),
    fat: Math.round((calorieGoal * 0.25) / 9),
  }
}

export const round1 = (n: number) => Math.round(n * 10) / 10
