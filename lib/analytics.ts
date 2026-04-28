import { isoWeeksElapsed } from '@/lib/dates'

type AttendanceRow = { checkIn: Date; checkOut: Date | null }

// Days: 0=Mon,...,6=Sun. Hours: 6-22.
export function buildHeatmapData(attendances: AttendanceRow[]) {
  const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 6-22

  const matrix: number[][] = Array.from({ length: 7 }, () => Array(17).fill(0))

  for (const a of attendances) {
    if (!a.checkOut) continue
    const day = (a.checkIn.getUTCDay() + 6) % 7 // Mon=0
    const hour = a.checkIn.getUTCHours()
    const hIdx = hour - 6
    if (hIdx >= 0 && hIdx < 17) matrix[day][hIdx]++
  }

  return {
    hours: HOURS,
    rows: DAYS.map((day, dIdx) => ({
      day,
      values: HOURS.map((_, hIdx) => matrix[dIdx][hIdx]),
    })),
  }
}

export type PlayerWithCount = {
  firstName: string
  lastName: string
  weeklySessions: number
  subscriptionStart: Date
  _count: { attendances: number }
}

export function buildConsistencyData(players: PlayerWithCount[], today: Date) {
  return players.map(p => {
    const weeks = isoWeeksElapsed(p.subscriptionStart, today)
    const expected = p.weeklySessions * weeks
    const consistency =
      weeks === 0 || expected === 0
        ? null
        : Math.min(100, Math.round((p._count.attendances / expected) * 100))

    return {
      name: `${p.firstName} ${p.lastName}`,
      weeklySessions: p.weeklySessions,
      attended: p._count.attendances,
      expected,
      consistency,
    }
  })
}
