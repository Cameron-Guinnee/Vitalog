import { describe, expect, it } from 'vitest'
import { ageOn, bmr, feetInchesToCm, lbToKg, tdee, weeklyGoalsFor, weeklyRateFromKcal } from './energy'

describe('energy', () => {
  it('converts units', () => {
    expect(feetInchesToCm(5, 10)).toBeCloseTo(177.8)
    expect(lbToKg(180)).toBeCloseTo(81.65, 2)
  })

  it('computes age, counting the birthday itself', () => {
    expect(ageOn('2000-06-15', new Date(2026, 5, 14))).toBe(25)
    expect(ageOn('2000-06-15', new Date(2026, 5, 15))).toBe(26)
    expect(ageOn('not-a-date')).toBe(0)
  })

  it('matches the Mifflin–St Jeor formula', () => {
    // 80 kg, 180 cm, 30 years: 800 + 1125 - 150, then +5 (male) or -161 (female)
    expect(bmr({ weightKg: 80, heightCm: 180, age: 30, sex: 'male' })).toBe(1780)
    expect(bmr({ weightKg: 80, heightCm: 180, age: 30, sex: 'female' })).toBe(1614)
    expect(tdee(1780, 'moderately_active')).toBe(2759)
  })

  it('filters weekly goals by goal type', () => {
    expect(weeklyGoalsFor('lose').every((g) => g.kcalPerDay < 0)).toBe(true)
    expect(weeklyGoalsFor('gain').every((g) => g.kcalPerDay > 0)).toBe(true)
    expect(weeklyGoalsFor('maintain')).toHaveLength(1)
    expect(weeklyRateFromKcal(-500)).toBe(-1)
  })
})
