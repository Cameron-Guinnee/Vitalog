import { NUTRIENT, dayRange, round1, sumNutrients, timestampForDay, weightToKg, type NutrientMap } from '@vitalog/shared'
import { supabase } from '../../lib/supabase'

export type FoodEntry = {
  type: 'food'
  id: string
  group: number
  name: string
  quantity: number
  servingUnit: string
  calories: number
  protein: number
  carbs: number
  fat: number
}
export type BiometricEntry = { type: 'biometric'; id: string; group: number; metric: string; value: number; unit: string; notes: string | null }
export type ExerciseEntry = {
  type: 'exercise'
  id: string
  group: number
  name: string
  minutes: number
  caloriesBurned: number | null
}
export type NoteEntry = { type: 'note'; id: string; group: number; content: string }
export type DiaryEntry = FoodEntry | BiometricEntry | ExerciseEntry | NoteEntry

export type DiaryDay = { entries: DiaryEntry[]; nutrients: NutrientMap; caloriesBurned: number }

export const diaryQueryKey = (userId: string, day: string) => ['diary', userId, day] as const

const TABLE_FOR: Record<DiaryEntry['type'], 'diary_entries' | 'biometrics' | 'exercise_log' | 'notes'> = {
  food: 'diary_entries',
  biometric: 'biometrics',
  exercise: 'exercise_log',
  note: 'notes',
}

/** Everything logged on one local day. RLS limits every query to the signed-in user. */
export async function fetchDiaryDay(userId: string, day: string): Promise<DiaryDay> {
  const { start, end } = dayRange(day)
  const [foods, biometrics, exercise, notes] = await Promise.all([
    supabase
      .from('diary_entries')
      .select('id, meal_group, quantity, serving_unit, foods (name), custom_foods (name), diary_nutrient_values (nutrient_id, value)')
      .eq('user_id', userId)
      .gte('logged_at', start)
      .lt('logged_at', end)
      .order('logged_at'),
    supabase
      .from('biometrics')
      .select('id, metric_type, value, unit, meal_group, notes')
      .eq('user_id', userId)
      .gte('logged_at', start)
      .lt('logged_at', end)
      .order('logged_at'),
    supabase
      .from('exercise_log')
      .select('id, exercise_name, duration_minutes, calories_burned, meal_group')
      .eq('user_id', userId)
      .gte('logged_at', start)
      .lt('logged_at', end)
      .order('logged_at'),
    supabase
      .from('notes')
      .select('id, content, meal_group')
      .eq('user_id', userId)
      .gte('created_at', start)
      .lt('created_at', end)
      .order('created_at'),
  ])
  for (const r of [foods, biometrics, exercise, notes]) if (r.error) throw r.error

  const perEntry: NutrientMap[] = []
  const entries: DiaryEntry[] = []

  for (const e of foods.data ?? []) {
    const n: NutrientMap = {}
    for (const v of e.diary_nutrient_values ?? []) n[v.nutrient_id] = v.value
    perEntry.push(n)
    entries.push({
      type: 'food',
      id: e.id,
      group: e.meal_group ?? 0,
      name: e.foods?.name ?? e.custom_foods?.name ?? 'Unknown food',
      quantity: e.quantity,
      servingUnit: e.serving_unit,
      calories: Math.round(n[NUTRIENT.energy] ?? 0),
      protein: round1(n[NUTRIENT.protein] ?? 0),
      carbs: round1(n[NUTRIENT.carbs] ?? 0),
      fat: round1(n[NUTRIENT.fat] ?? 0),
    })
  }
  for (const e of biometrics.data ?? [])
    entries.push({ type: 'biometric', id: e.id, group: e.meal_group ?? 0, metric: e.metric_type, value: e.value, unit: e.unit, notes: e.notes })
  for (const e of exercise.data ?? [])
    entries.push({
      type: 'exercise',
      id: e.id,
      group: e.meal_group ?? 0,
      name: e.exercise_name,
      minutes: e.duration_minutes,
      caloriesBurned: e.calories_burned,
    })
  for (const e of notes.data ?? []) entries.push({ type: 'note', id: e.id, group: e.meal_group ?? 0, content: e.content })

  const caloriesBurned = Math.round((exercise.data ?? []).reduce((sum, e) => sum + (e.calories_burned ?? 0), 0))
  return { entries, nutrients: sumNutrients(perEntry), caloriesBurned }
}

export type NewFoodEntry = {
  userId: string
  day: string
  food: { id: string; isCustom: boolean }
  group: number
  groupName: string
  quantity: number
  servingUnit: string
  nutrients: NutrientMap
}

export async function addFoodEntry(e: NewFoodEntry) {
  const { data: entry, error } = await supabase
    .from('diary_entries')
    .insert({
      user_id: e.userId,
      food_id: e.food.isCustom ? null : e.food.id,
      custom_food_id: e.food.isCustom ? e.food.id : null,
      meal_group: e.group,
      meal_type: e.groupName.toLowerCase(),
      quantity: e.quantity,
      serving_unit: e.servingUnit,
      logged_at: timestampForDay(e.day),
    })
    .select('id')
    .single()
  if (error) throw error

  const rows = Object.entries(e.nutrients).map(([id, value]) => ({ diary_entry_id: entry.id, nutrient_id: Number(id), value }))
  if (rows.length) {
    const { error: nutrientError } = await supabase.from('diary_nutrient_values').insert(rows)
    if (nutrientError) {
      // Don't leave an entry with no nutrients behind.
      await supabase.from('diary_entries').delete().eq('id', entry.id)
      throw nutrientError
    }
  }
}

export async function deleteDiaryEntry(entry: Pick<DiaryEntry, 'type' | 'id'>) {
  const { error } = await supabase.from(TABLE_FOR[entry.type]).delete().eq('id', entry.id)
  if (error) throw error
}

export type NoteInput = { userId: string; day: string; group: number; content: string }

export async function addNote(n: NoteInput) {
  const { error } = await supabase
    .from('notes')
    .insert({ user_id: n.userId, content: n.content, meal_group: n.group, created_at: timestampForDay(n.day) })
  if (error) throw error
}

export type ExerciseInput = {
  userId: string
  day: string
  group: number
  name: string
  category: string
  minutes: number
  caloriesBurned: number
  notes: string
}

export async function addExercise(e: ExerciseInput) {
  const { error } = await supabase.from('exercise_log').insert({
    user_id: e.userId,
    exercise_name: e.name,
    category: e.category,
    duration_minutes: e.minutes,
    calories_burned: e.caloriesBurned,
    logged_at: timestampForDay(e.day),
    meal_group: e.group,
    notes: e.notes || null,
  })
  if (error) throw error
}

export type BiometricInput = {
  userId: string
  day: string
  group: number
  notes: string
  /** One reading, or two for blood pressure (systolic and diastolic). */
  readings: { metric: string; value: number; unit: string }[]
}

export async function addBiometric(b: BiometricInput) {
  const loggedAt = timestampForDay(b.day)
  const { error } = await supabase.from('biometrics').insert(
    b.readings.map((r) => ({
      user_id: b.userId,
      metric_type: r.metric,
      value: r.value,
      unit: r.unit,
      logged_at: loggedAt,
      meal_group: b.group,
      notes: b.notes || null,
    })),
  )
  if (error) throw error
}

/** The most recent weigh-in, in kg, or null if the user hasn't logged one. */
export async function fetchLatestWeightKg(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('biometrics')
    .select('value, unit')
    .eq('user_id', userId)
    .eq('metric_type', 'weight')
    .order('logged_at', { ascending: false })
    .limit(1)
  if (error) throw error
  const latest = data?.[0]
  return latest ? weightToKg(latest.value, latest.unit) : null
}
