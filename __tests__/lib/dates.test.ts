import { calcSubscriptionEnd, startOfDayUTC, isoWeeksElapsed, formatPeriod } from '@/lib/dates'

describe('calcSubscriptionEnd', () => {
  it('advances by one month', () => {
    const start = new Date('2026-03-15T00:00:00.000Z')
    const end = calcSubscriptionEnd(start)
    expect(end.toISOString()).toBe('2026-04-15T00:00:00.000Z')
  })

  it('clamps Jan 31 to Feb 28', () => {
    const start = new Date('2026-01-31T00:00:00.000Z')
    const end = calcSubscriptionEnd(start)
    expect(end.toISOString()).toBe('2026-02-28T00:00:00.000Z')
  })

  it('returns midnight UTC', () => {
    const start = new Date('2026-04-26T15:30:00.000Z')
    const end = calcSubscriptionEnd(start)
    expect(end.getUTCHours()).toBe(0)
    expect(end.getUTCMinutes()).toBe(0)
    expect(end.getUTCSeconds()).toBe(0)
    expect(end.getUTCMilliseconds()).toBe(0)
  })
})

describe('startOfDayUTC', () => {
  it('returns midnight UTC for a given date', () => {
    const d = new Date('2026-04-26T18:45:00.000Z')
    expect(startOfDayUTC(d).toISOString()).toBe('2026-04-26T00:00:00.000Z')
  })
})

describe('isoWeeksElapsed', () => {
  it('returns 0 for a date within the first week', () => {
    const start = new Date('2026-04-20T00:00:00.000Z') // Monday ISO week 16
    const today = new Date('2026-04-19T00:00:00.000Z') // Sunday ISO week 16
    expect(isoWeeksElapsed(start, today)).toBe(0)
  })

  it('returns 1 after one full ISO week', () => {
    const start = new Date('2026-04-20T00:00:00.000Z') // Monday ISO week 16
    const today = new Date('2026-04-27T00:00:00.000Z') // Monday ISO week 17
    expect(isoWeeksElapsed(start, today)).toBe(1)
  })
})

describe('formatPeriod', () => {
  it('returns YYYY-MM string', () => {
    expect(formatPeriod(new Date('2026-04-15T00:00:00.000Z'))).toBe('2026-04')
  })
})
