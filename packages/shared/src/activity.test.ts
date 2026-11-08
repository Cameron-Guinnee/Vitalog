import { describe, expect, it } from 'vitest'
import { BIOMETRICS, caloriesFromMet, mlTo, weightToKg } from './activity'

describe('activity', () => {
  it('estimates calories from MET, weight and time', () => {
    // 8.3 MET × 80 kg × 0.5 h
    expect(caloriesFromMet(8.3, 80, 30)).toBe(332)
  })

  it('converts logged weights to kg', () => {
    expect(weightToKg(176, 'lbs')).toBeCloseTo(79.83, 2)
    expect(weightToKg(80, 'kg')).toBe(80)
  })

  it('uses the user’s units for body measurements', () => {
    const waist = BIOMETRICS.find((b) => b.value === 'waist')!
    expect(waist.unit('imperial')).toBe('in')
    expect(waist.unit('metric')).toBe('cm')
  })

  it('converts water amounts', () => {
    expect(mlTo('ml', 480.4)).toBe(480)
    expect(mlTo('cups', 480)).toBe(2)
    expect(mlTo('fl_oz', 240)).toBe(8.1)
  })
})
