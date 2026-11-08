import { describe, expect, it } from 'vitest'
import { addDays, dayLabel, dayRange, fromDayKey, timestampForDay, toDayKey } from './dates'

describe('dates', () => {
  it('round-trips day keys and crosses month ends', () => {
    expect(toDayKey(fromDayKey('2026-03-09'))).toBe('2026-03-09')
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('covers a whole local day', () => {
    const { start, end } = dayRange('2026-11-08')
    expect(new Date(end).getTime() - new Date(start).getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it('puts entries for past days on that day, not today', () => {
    const now = new Date(2026, 10, 8, 9, 30)
    expect(timestampForDay('2026-11-08', now)).toBe(now.toISOString())
    expect(toDayKey(new Date(timestampForDay('2026-11-05', now)))).toBe('2026-11-05')
  })

  it('labels nearby days', () => {
    const today = new Date(2026, 10, 8)
    expect(dayLabel('2026-11-08', today)).toBe('Today')
    expect(dayLabel('2026-11-07', today)).toBe('Yesterday')
    expect(dayLabel('2026-11-09', today)).toBe('Tomorrow')
    expect(dayLabel('2026-11-01', today)).toBe('Sun, Nov 1, 2026')
  })
})
