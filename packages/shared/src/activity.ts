import { lbToKg } from './energy'

// MET values from the Compendium of Physical Activities.
export const EXERCISE_CATEGORIES = [
  {
    label: 'Cardio',
    exercises: [
      { name: 'Running (5 mph)', met: 8.3 },
      { name: 'Running (7.5 mph)', met: 11.0 },
      { name: 'Cycling (moderate)', met: 8.0 },
      { name: 'Cycling (vigorous)', met: 12.0 },
      { name: 'Swimming (moderate)', met: 6.0 },
      { name: 'Swimming (vigorous)', met: 9.8 },
      { name: 'Walking (3 mph)', met: 3.5 },
      { name: 'Walking (4 mph)', met: 5.0 },
      { name: 'Jump rope', met: 11.0 },
      { name: 'Rowing (moderate)', met: 7.0 },
      { name: 'Elliptical (moderate)', met: 5.0 },
      { name: 'Stair climbing', met: 9.0 },
      { name: 'Hiking', met: 6.0 },
      { name: 'Dancing', met: 5.0 },
    ],
  },
  {
    label: 'Strength',
    exercises: [
      { name: 'Weight training (light)', met: 3.5 },
      { name: 'Weight training (moderate)', met: 5.0 },
      { name: 'Weight training (vigorous)', met: 6.0 },
      { name: 'Bodyweight exercises', met: 4.0 },
      { name: 'CrossFit', met: 8.0 },
      { name: 'Powerlifting', met: 6.0 },
    ],
  },
  {
    label: 'Flexibility',
    exercises: [
      { name: 'Yoga (hatha)', met: 2.5 },
      { name: 'Yoga (vinyasa)', met: 4.0 },
      { name: 'Pilates', met: 3.0 },
      { name: 'Stretching', met: 2.3 },
      { name: 'Tai chi', met: 3.0 },
    ],
  },
  {
    label: 'Sports',
    exercises: [
      { name: 'Basketball', met: 8.0 },
      { name: 'Soccer', met: 10.0 },
      { name: 'Tennis', met: 7.3 },
      { name: 'Volleyball', met: 4.0 },
      { name: 'Baseball', met: 5.0 },
      { name: 'Golf', met: 4.8 },
      { name: 'Martial arts', met: 10.0 },
      { name: 'Racquetball', met: 7.0 },
    ],
  },
  {
    label: 'Other',
    exercises: [
      { name: 'Gardening', met: 3.5 },
      { name: 'Housework', met: 3.0 },
      { name: 'Manual labor', met: 5.0 },
    ],
  },
] as const

/** Used when we don't know the user's weight yet. */
export const DEFAULT_WEIGHT_KG = 70

/** kcal burned = MET × body weight (kg) × hours. */
export function caloriesFromMet(met: number, weightKg: number, minutes: number): number {
  return Math.round((met * weightKg * minutes) / 60)
}

/** Weight entries are stored in the unit the user logged them in. */
export function weightToKg(value: number, unit: string): number {
  return unit === 'lbs' || unit === 'lb' ? lbToKg(value) : value
}

export type Units = 'imperial' | 'metric'

export const BIOMETRICS = [
  { value: 'weight', label: 'Weight', unit: (u: Units) => (u === 'imperial' ? 'lbs' : 'kg') },
  { value: 'blood_pressure', label: 'Blood pressure', unit: () => 'mmHg' },
  { value: 'heart_rate', label: 'Heart rate', unit: () => 'bpm' },
  { value: 'body_fat', label: 'Body fat', unit: () => '%' },
  { value: 'bmi', label: 'BMI', unit: () => 'kg/m²' },
  { value: 'waist', label: 'Waist', unit: (u: Units) => (u === 'imperial' ? 'in' : 'cm') },
  { value: 'neck', label: 'Neck', unit: (u: Units) => (u === 'imperial' ? 'in' : 'cm') },
  { value: 'hips', label: 'Hips', unit: (u: Units) => (u === 'imperial' ? 'in' : 'cm') },
  { value: 'blood_glucose', label: 'Blood glucose', unit: () => 'mg/dL' },
  { value: 'sleep_duration', label: 'Sleep duration', unit: () => 'hours' },
  { value: 'steps', label: 'Steps', unit: () => 'steps' },
  { value: 'temperature', label: 'Temperature', unit: (u: Units) => (u === 'imperial' ? '°F' : '°C') },
] as const
export type BiometricType = (typeof BIOMETRICS)[number]['value']

// Water from food is recorded as grams of water (1 g ≈ 1 mL); a glass is 240 mL.
export const ML_PER_GLASS = 240
export const FL_OZ_PER_ML = 0.033814

export type WaterUnit = 'ml' | 'cups' | 'fl_oz'

export function mlTo(unit: WaterUnit | string, ml: number): number {
  if (unit === 'ml') return Math.round(ml)
  if (unit === 'cups') return Math.round((ml / ML_PER_GLASS) * 10) / 10
  return Math.round(ml * FL_OZ_PER_ML * 10) / 10
}

export function waterUnitLabel(unit: WaterUnit | string): string {
  return unit === 'ml' ? 'mL' : unit === 'cups' ? 'cups' : 'fl oz'
}
