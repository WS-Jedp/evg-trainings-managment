import { calcSubscriptionEnd, formatPeriod } from '@/lib/dates'

describe('payment state machine logic', () => {
  it('advances subscriptionEnd by one month on payment', () => {
    const currentEnd = new Date('2026-04-26T00:00:00.000Z')
    const newEnd = calcSubscriptionEnd(currentEnd)
    expect(newEnd.toISOString()).toBe('2026-05-26T00:00:00.000Z')
  })

  it('generates correct period string for PaymentRecord', () => {
    const date = new Date('2026-04-15T00:00:00.000Z')
    expect(formatPeriod(date)).toBe('2026-04')
  })

  it('clamps end-of-month correctly across payment cycles', () => {
    // Jan 31 → Feb 28 → Mar 28 (not Mar 31)
    const jan31 = new Date('2026-01-31T00:00:00.000Z')
    const feb28 = calcSubscriptionEnd(jan31)
    expect(feb28.toISOString()).toBe('2026-02-28T00:00:00.000Z')
    const mar28 = calcSubscriptionEnd(feb28)
    expect(mar28.toISOString()).toBe('2026-03-28T00:00:00.000Z')
  })
})
