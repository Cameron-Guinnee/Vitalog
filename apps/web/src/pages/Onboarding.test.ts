import { describe, expect, it } from 'vitest'
import { heightCmOf, validate } from './Onboarding'

const base = {
  displayName: 'Sam',
  dateOfBirth: '1990-01-15',
  sex: 'female' as const,
  units: 'imperial' as const,
  heightFt: '5',
  heightIn: '6',
  heightCm: '',
  weight: '150',
  activity: 'sedentary' as const,
  goalType: 'maintain' as const,
  weeklyKcal: '0',
  targetWeight: '',
  calorieGoal: '1800',
}

describe('onboarding validation', () => {
  it('lets maintain users finish without a target weight', () => {
    expect(validate(2, base)).toBeNull()
  })

  it('requires a weekly goal and target weight when losing', () => {
    expect(validate(2, { ...base, goalType: 'lose', weeklyKcal: '' })).toBe('Choose a weekly goal.')
    expect(validate(2, { ...base, goalType: 'lose', weeklyKcal: '-500' })).toBe('Enter your target weight.')
  })

  it('treats a missing inches field as zero', () => {
    expect(heightCmOf({ ...base, heightIn: '' })).toBeCloseTo(152.4)
  })

  it('rejects a birth date in the future', () => {
    expect(validate(0, { ...base, dateOfBirth: '2999-01-01' })).toBe('Enter a valid date of birth.')
  })
})
