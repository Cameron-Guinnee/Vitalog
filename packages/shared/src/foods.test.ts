import type { NutrientMap } from './nutrients'
import { describe, expect, it } from 'vitest'
import { amountUnitLabel, nutrientsForAmount, servingOptionLabel, supports100g, totalNutrients } from './foods'

const usda = { kind: 'usda' as const, id: 'u', servingSize: 40, servingUnit: 'g' }
const label = { kind: 'custom' as const, id: 'c', servingSize: 1, servingUnit: 'cup' }
const grams = { kind: 'custom' as const, id: 'g', servingSize: 30, servingUnit: 'g' }

describe('nutrientsForAmount', () => {
  it('scales USDA foods from per 100 g', () => {
    expect(nutrientsForAmount(usda, { 1008: 400 }, 2, 'serving')).toEqual({ 1008: 320 })
    expect(nutrientsForAmount(usda, { 1008: 400 }, 1.5, '100g')).toEqual({ 1008: 600 })
  })

  it('multiplies custom foods per serving, as on the label', () => {
    expect(nutrientsForAmount(label, { 1008: 120 }, 2, 'serving')).toEqual({ 1008: 240 })
    expect(nutrientsForAmount(grams, { 1008: 120 }, 1, '100g')).toEqual({ 1008: 400 })
  })

  it('only offers 100 g when the serving is measured in grams', () => {
    expect(supports100g(label)).toBe(false)
    expect(supports100g(grams)).toBe(true)
    expect(supports100g({ ...usda, servingSize: null })).toBe(false)
  })

  it('labels amounts and servings', () => {
    expect(amountUnitLabel(label, 'serving')).toBe('cup')
    expect(amountUnitLabel(grams, 'serving')).toBe('serving')
    expect(amountUnitLabel(usda, '100g')).toBe('100 g')
    expect(servingOptionLabel(label)).toBe('serving (1 cup)')
    expect(servingOptionLabel({ ...usda, servingSize: null })).toBe('100 g')
  })

  it('totals a list of portions', () => {
    const stored = new Map<string, NutrientMap>([
      ['usda:u', { 1008: 400, 1003: 10 }],
      ['custom:c', { 1008: 120 }],
    ])
    expect(
      totalNutrients(
        [
          { food: usda, quantity: 1, unit: 'serving' },
          { food: label, quantity: 0.5, unit: 'serving' },
        ],
        stored,
      ),
    ).toEqual({ 1008: 220, 1003: 4 })
  })
})
