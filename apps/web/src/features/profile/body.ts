import { ageOn, bmr, CM_PER_IN, feetInchesToCm, kgToLb, lbToKg, round1, tdee, type ActivityLevel, type Sex, type Units } from '@vitalog/shared'

/** The body fields shared by onboarding and Targets and profile, as typed into the form. */
export type BodyFields = {
  units: Units
  heightFt: string
  heightIn: string
  heightCm: string
  weight: string
}

export const num = (s: string) => (s.trim() === '' ? NaN : Number(s))

export function heightCmOf(f: Pick<BodyFields, 'units' | 'heightFt' | 'heightIn' | 'heightCm'>) {
  return f.units === 'imperial' ? feetInchesToCm(num(f.heightFt), num(f.heightIn) || 0) : num(f.heightCm)
}

export function weightKgOf(f: Pick<BodyFields, 'units' | 'weight'>) {
  return f.units === 'imperial' ? lbToKg(num(f.weight)) : num(f.weight)
}

/** Maintenance calories for the form so far, or 0 when something is missing. */
export function tdeeOf(f: BodyFields & { dateOfBirth: string; sex: Sex | ''; activity: ActivityLevel | '' }): number {
  const heightCm = heightCmOf(f)
  const weightKg = weightKgOf(f)
  const age = f.dateOfBirth ? ageOn(f.dateOfBirth) : 0
  if (!f.sex || !f.activity || !(heightCm > 0) || !(weightKg > 0) || !(age > 0)) return 0
  return tdee(bmr({ weightKg, heightCm, age, sex: f.sex }), f.activity)
}

/** A stored height as form fields in either unit, rounding to whole inches without showing 12 in. */
export function heightFields(cm: number | null | undefined): Pick<BodyFields, 'heightFt' | 'heightIn' | 'heightCm'> {
  if (!cm || !(cm > 0)) return { heightFt: '', heightIn: '', heightCm: '' }
  const inches = Math.round(cm / CM_PER_IN)
  return { heightFt: String(Math.floor(inches / 12)), heightIn: String(inches % 12), heightCm: String(round1(cm)) }
}

/** Converts a typed weight between units, leaving blanks and junk alone. */
export function convertWeight(value: string, from: Units, to: Units): string {
  const n = num(value)
  if (from === to || !(n > 0)) return value
  return String(round1(to === 'metric' ? lbToKg(n) : kgToLb(n)))
}
