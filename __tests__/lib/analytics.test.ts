import { buildHeatmapData, buildConsistencyData } from '@/lib/analytics'

describe('buildHeatmapData', () => {
  it('excludes attendances without checkOut', () => {
    const attendances = [
      { checkIn: new Date('2026-04-21T10:00:00.000Z'), checkOut: new Date('2026-04-21T12:00:00.000Z') },
      { checkIn: new Date('2026-04-21T14:00:00.000Z'), checkOut: null },
    ]
    const data = buildHeatmapData(attendances)
    // Only 1 attendance counted (the one with checkOut)
    const total = data.reduce((sum, row) => sum + row.values.reduce((s: number, v: number) => s + v, 0), 0)
    expect(total).toBe(1)
  })
})

describe('buildConsistencyData', () => {
  it('caps consistency at 100', () => {
    const players = [{
      firstName: 'Juan', lastName: 'P',
      weeklySessions: 3,
      subscriptionStart: new Date('2026-04-06T00:00:00.000Z'), // 3 weeks ago
      _count: { attendances: 15 }, // more than expected
    }] as any
    const data = buildConsistencyData(players, new Date('2026-04-27T00:00:00.000Z'))
    expect(data[0].consistency).toBe(100)
  })

  it('returns null consistency for players in first week', () => {
    const players = [{
      firstName: 'Ana', lastName: 'G',
      weeklySessions: 3,
      subscriptionStart: new Date('2026-04-25T00:00:00.000Z'), // 2 days ago
      _count: { attendances: 0 },
    }] as any
    const data = buildConsistencyData(players, new Date('2026-04-27T00:00:00.000Z'))
    expect(data[0].consistency).toBeNull()
  })
})
