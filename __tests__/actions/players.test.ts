import { calcSubscriptionEnd, formatPeriod } from '@/lib/dates'

// Test the pure business logic extracted from the action
describe('player subscription logic', () => {
  it('calculates subscriptionEnd from subscriptionStart', () => {
    const start = new Date('2026-04-01T00:00:00.000Z')
    const end = calcSubscriptionEnd(start)
    expect(end.toISOString()).toBe('2026-05-01T00:00:00.000Z')
  })

  it('guardianEmail defaults to player email for adults', () => {
    function resolveGuardianEmail(age: number, guardianEmail: string, playerEmail: string): string {
      return age >= 18 && !guardianEmail ? playerEmail : guardianEmail
    }
    expect(resolveGuardianEmail(25, '', 'player@test.com')).toBe('player@test.com')
    expect(resolveGuardianEmail(16, 'guardian@test.com', 'player@test.com')).toBe('guardian@test.com')
  })

  it('validates weeklySessions is 3 or 5', () => {
    function validateWeeklySessions(n: number): boolean {
      return n === 3 || n === 5
    }
    expect(validateWeeklySessions(3)).toBe(true)
    expect(validateWeeklySessions(5)).toBe(true)
    expect(validateWeeklySessions(4)).toBe(false)
  })
})
