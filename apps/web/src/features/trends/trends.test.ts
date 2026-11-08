import { NUTRIENT } from '@vitalog/shared'
import { describe, expect, it } from 'vitest'
import { averageNutrients, macroSplit } from './nutrition'
import { displayValue, historyRows, summarise } from './readings'
import { snapshotRows } from './snapshots'

describe('readings', () => {
  it('shows weights in the user’s units and other readings as logged', () => {
    expect(displayValue('weight', { value: 80, unit: 'kg' }, 'imperial')).toEqual({ value: 176.4, unit: 'lbs' })
    expect(displayValue('weight', { value: 176.4, unit: 'lbs' }, 'metric')).toEqual({ value: 80, unit: 'kg' })
    expect(displayValue('waist', { value: 32, unit: 'in' }, 'metric')).toEqual({ value: 32, unit: 'in' })
  })

  it('summarises a range', () => {
    expect(summarise([180, 178, 179])).toEqual({ average: 179, min: 178, max: 180, change: -1 })
    expect(summarise([])).toBeNull()
  })

  it('pairs blood pressure readings saved together, newest first', () => {
    const at = (h: number) => `2026-11-0${h}T12:00:00.000Z`
    const rows = historyRows(
      'blood_pressure',
      [
        { id: 's1', loggedAt: at(1), value: 120, unit: 'mmHg' },
        { id: 's2', loggedAt: at(3), value: 118, unit: 'mmHg', notes: 'after run' },
      ],
      [
        { id: 'd1', loggedAt: at(1), value: 80, unit: 'mmHg' },
        { id: 'd9', loggedAt: at(2), value: 75, unit: 'mmHg' },
      ],
      'imperial',
    )
    expect(rows.map((r) => [r.text, r.ids])).toEqual([
      ['118/– mmHg', ['s2']],
      ['–/75 mmHg', ['d9']],
      ['120/80 mmHg', ['s1', 'd1']],
    ])
    expect(rows[0]!.notes).toBe('after run')
  })
})

describe('nutrition report', () => {
  it('averages over logged days and splits calories by macro', () => {
    const avg = averageNutrients([
      { [NUTRIENT.energy]: 2000, [NUTRIENT.protein]: 100 },
      { [NUTRIENT.energy]: 1500, [NUTRIENT.protein]: 50, [NUTRIENT.fat]: 20 },
    ])
    expect(avg).toEqual({ [NUTRIENT.energy]: 1750, [NUTRIENT.protein]: 75, [NUTRIENT.fat]: 10 })
    expect(macroSplit({ [NUTRIENT.protein]: 100, [NUTRIENT.carbs]: 200, [NUTRIENT.fat]: 400 / 9 })).toEqual({ protein: 25, carbs: 50, fat: 25 })
    expect(macroSplit({})).toBeNull()
  })
})

describe('snapshots', () => {
  it('orders values, converts weight and shows the change since the previous snapshot', () => {
    const rows = snapshotRows(
      { heart_rate: { value: 60, unit: 'bpm' }, weight: { value: 80, unit: 'kg' } },
      { weight: { value: 180, unit: 'lbs' } },
      'imperial',
    )
    expect(rows).toEqual([
      { metric: 'weight', label: 'Weight', value: 176.4, unit: 'lbs', change: -3.6 },
      { metric: 'heart_rate', label: 'Heart rate', value: 60, unit: 'bpm', change: null },
    ])
  })
})
