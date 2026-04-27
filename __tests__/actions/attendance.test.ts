// Test the pure duplicate-check logic
describe('attendance duplicate check logic', () => {
  function isAlreadyCheckedIn(
    attendances: Array<{ checkIn: Date; checkOut: Date | null }>,
    todayStart: Date,
    todayEnd: Date
  ): boolean {
    return attendances.some(
      a => a.checkIn >= todayStart && a.checkIn < todayEnd && a.checkOut === null
    )
  }

  const todayStart = new Date('2026-04-26T00:00:00.000Z')
  const todayEnd = new Date('2026-04-27T00:00:00.000Z')

  it('returns true when player has open check-in today', () => {
    const attendances = [{ checkIn: new Date('2026-04-26T10:00:00.000Z'), checkOut: null }]
    expect(isAlreadyCheckedIn(attendances, todayStart, todayEnd)).toBe(true)
  })

  it('returns false when player has closed check-in today', () => {
    const attendances = [{
      checkIn: new Date('2026-04-26T10:00:00.000Z'),
      checkOut: new Date('2026-04-26T12:00:00.000Z'),
    }]
    expect(isAlreadyCheckedIn(attendances, todayStart, todayEnd)).toBe(false)
  })

  it('returns false when player has no attendance today', () => {
    const attendances = [{ checkIn: new Date('2026-04-25T10:00:00.000Z'), checkOut: null }]
    expect(isAlreadyCheckedIn(attendances, todayStart, todayEnd)).toBe(false)
  })
})
