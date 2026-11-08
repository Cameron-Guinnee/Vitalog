import { describe, expect, it } from 'vitest'
import { isPro } from './subscription'

describe('isPro', () => {
  it('is true only for the pro tier', () => {
    expect(isPro('pro')).toBe(true)
    expect(isPro('free')).toBe(false)
    expect(isPro(null)).toBe(false)
    expect(isPro(undefined)).toBe(false)
  })
})
