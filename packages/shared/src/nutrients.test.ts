import { describe, expect, it } from 'vitest'
import { NUTRIENT, gramsFor, macroGoals, scaleNutrients, sumNutrients } from './nutrients'

describe('nutrients', () => {
  it('scales per-100 g values to the grams eaten', () => {
    expect(scaleNutrients({ [NUTRIENT.energy]: 52, [NUTRIENT.carbs]: 14 }, 150)).toEqual({
      [NUTRIENT.energy]: 78,
      [NUTRIENT.carbs]: 21,
    })
  })

  it('works out grams from servings or 100 g units', () => {
    expect(gramsFor(2, 'serving', 30)).toBe(60)
    expect(gramsFor(2, 'serving', null)).toBe(200)
    expect(gramsFor(1.5, '100g', 30)).toBe(150)
  })

  it('sums nutrient maps', () => {
    expect(sumNutrients([{ 1: 2, 3: 4 }, { 1: 1 }])).toEqual({ 1: 3, 3: 4 })
  })

  it('splits the calorie goal into macro targets', () => {
    expect(macroGoals(2000)).toEqual({ protein: 150, carbs: 225, fat: 56 })
  })
})
