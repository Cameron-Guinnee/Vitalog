// Energy and body calculations shared by every Vitalog app.

export type Sex = 'male' | 'female'

export const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise', multiplier: 1.2 },
  { value: 'lightly_active', label: 'Lightly active', description: '1–3 days a week', multiplier: 1.375 },
  { value: 'moderately_active', label: 'Moderately active', description: '3–5 days a week', multiplier: 1.55 },
  { value: 'very_active', label: 'Very active', description: '6–7 days a week', multiplier: 1.725 },
  { value: 'extra_active', label: 'Extra active', description: 'Very hard exercise or a physical job', multiplier: 1.9 },
] as const
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number]['value']

export const WEIGHT_GOAL_TYPES = [
  { value: 'lose', label: 'Lose weight' },
  { value: 'maintain', label: 'Maintain weight' },
  { value: 'gain', label: 'Gain weight' },
] as const
export type WeightGoalType = (typeof WEIGHT_GOAL_TYPES)[number]['value']

/** Daily calorie adjustments; 500 kcal/day is roughly 1 lb a week. */
export const WEEKLY_GOALS = [
  { kcalPerDay: -250, label: 'Lose 0.5 lb a week' },
  { kcalPerDay: -500, label: 'Lose 1 lb a week' },
  { kcalPerDay: -750, label: 'Lose 1.5 lb a week' },
  { kcalPerDay: -1000, label: 'Lose 2 lb a week' },
  { kcalPerDay: 0, label: 'Maintain weight' },
  { kcalPerDay: 250, label: 'Gain 0.5 lb a week' },
  { kcalPerDay: 500, label: 'Gain 1 lb a week' },
] as const

export function weeklyGoalsFor(type: WeightGoalType) {
  return WEEKLY_GOALS.filter((g) =>
    type === 'lose' ? g.kcalPerDay < 0 : type === 'gain' ? g.kcalPerDay > 0 : g.kcalPerDay === 0,
  )
}

/** Weekly rate in lb/week as stored in profiles.weekly_rate. */
export function weeklyRateFromKcal(kcalPerDay: number): number {
  return kcalPerDay / 500
}

export const KG_PER_LB = 0.453592
export const CM_PER_IN = 2.54

export const lbToKg = (lb: number) => lb * KG_PER_LB
export const kgToLb = (kg: number) => kg / KG_PER_LB
export const feetInchesToCm = (feet: number, inches = 0) => (feet * 12 + inches) * CM_PER_IN

export function ageOn(dateOfBirth: string, today: Date = new Date()): number {
  const [y, m, d] = dateOfBirth.split('-').map(Number)
  if (!y || !m || !d) return 0
  let age = today.getFullYear() - y
  const monthDiff = today.getMonth() + 1 - m
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) age--
  return age
}

/** Basal metabolic rate (Mifflin–St Jeor), in kcal/day. */
export function bmr({ weightKg, heightCm, age, sex }: { weightKg: number; heightCm: number; age: number; sex: Sex }) {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161)
}

/** Total daily energy expenditure, in kcal/day, rounded. */
export function tdee(bmrKcal: number, activity: ActivityLevel): number {
  const level = ACTIVITY_LEVELS.find((l) => l.value === activity)
  return Math.round(bmrKcal * (level?.multiplier ?? 1.2))
}
