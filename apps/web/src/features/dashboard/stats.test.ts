import { describe, expect, it } from 'vitest'
import { averageOfLogged, energyByDay, fastStats, formatElapsed, lastDays, matchesDayFilter, streaks, weightSeries } from './stats'

describe('lastDays', () => {
  it('lists days oldest first, ending today, across a month boundary', () => {
    expect(lastDays(3, '2026-11-01')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01'])
  })
})

describe('matchesDayFilter', () => {
  it('splits weekdays from weekends', () => {
    // 2026-11-07 is a Saturday, 2026-11-09 a Monday.
    expect(matchesDayFilter('2026-11-07', 'weekends')).toBe(true)
    expect(matchesDayFilter('2026-11-07', 'weekdays')).toBe(false)
    expect(matchesDayFilter('2026-11-09', 'weekdays')).toBe(true)
    expect(matchesDayFilter('2026-11-09', 'all')).toBe(true)
  })
})

describe('energyByDay', () => {
  it('turns macros into calories per day and fills empty days with zero', () => {
    const rows = energyByDay(
      ['2026-11-06', '2026-11-07'],
      [
        { day: '2026-11-07', protein: 10, fat: 10, carbs: 10, alcohol: 1, energy: 180 },
        { day: '2026-11-07', protein: 5, fat: 0, carbs: 0, alcohol: 0, energy: 20 },
        { day: '2026-10-01', protein: 99, fat: 0, carbs: 0, alcohol: 0, energy: 999 },
      ],
      [{ day: '2026-11-06', kcal: 250 }],
    )
    expect(rows).toEqual([
      { day: '2026-11-06', protein: 0, fat: 0, carbs: 0, alcohol: 0, consumed: 0, burned: 250 },
      { day: '2026-11-07', protein: 60, fat: 90, carbs: 40, alcohol: 7, consumed: 200, burned: 0 },
    ])
  })

  it('averages only the days with something logged', () => {
    expect(averageOfLogged([0, 1000, 2000, 0])).toBe(1500)
    expect(averageOfLogged([0, 0])).toBe(0)
  })
})

describe('streaks', () => {
  const days = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06', '2026-11-06']

  it('counts the run ending yesterday until today is over', () => {
    expect(streaks(days, '2026-11-07')).toEqual({ current: 2, longest: 3 })
  })

  it('includes today once it has an entry', () => {
    expect(streaks([...days, '2026-11-07'], '2026-11-07')).toEqual({ current: 3, longest: 3 })
  })

  it('resets after a missed day', () => {
    expect(streaks(days, '2026-11-08')).toEqual({ current: 0, longest: 3 })
    expect(streaks([], '2026-11-08')).toEqual({ current: 0, longest: 0 })
  })
})

describe('fastStats', () => {
  it('summarises finished fasts, averaging the latest seven', () => {
    const fast = (id: number, hours: number) => ({
      id: String(id),
      startedAt: '2026-11-01T00:00:00Z',
      endedAt: new Date(Date.parse('2026-11-01T00:00:00Z') + hours * 3_600_000).toISOString(),
      targetHours: 16,
    })
    const finished = [fast(1, 16), fast(2, 14), fast(3, 16), fast(4, 16), fast(5, 16), fast(6, 16), fast(7, 16), fast(8, 30)]
    expect(fastStats(finished)).toEqual({ count: 8, longestHours: 30, totalHours: 140, recentAverageHours: 15.7 })
    expect(fastStats([])).toEqual({ count: 0, longestHours: 0, totalHours: 0, recentAverageHours: 0 })
  })

  it('formats elapsed time past a day', () => {
    expect(formatElapsed(((25 * 60 + 2) * 60 + 3) * 1000)).toBe('25:02:03')
    expect(formatElapsed(-5)).toBe('00:00:00')
  })
})

describe('weightSeries', () => {
  it('converts every weigh-in to the user’s units and keeps the last one each day', () => {
    const at = (day: string, hour: number) => new Date(`${day}T${String(hour).padStart(2, '0')}:00:00`).toISOString()
    const points = weightSeries(
      [
        { loggedAt: at('2026-11-02', 9), value: 80, unit: 'kg' },
        { loggedAt: at('2026-11-01', 8), value: 180, unit: 'lbs' },
        { loggedAt: at('2026-11-01', 20), value: 181, unit: 'lbs' },
      ],
      'imperial',
    )
    expect(points).toEqual([
      { day: '2026-11-01', value: 181 },
      { day: '2026-11-02', value: 176.4 },
    ])
  })
})
