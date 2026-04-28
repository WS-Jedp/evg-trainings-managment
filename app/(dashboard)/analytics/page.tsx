import { prisma } from '@/lib/prisma'
import { buildHeatmapData, buildConsistencyData, PlayerWithCount } from '@/lib/analytics'
import { WeeklyBarChart, PayStatusPie } from '@/components/ui/charts'
import { PayStatus } from '@prisma/client'

async function getData() {
  const now = new Date()

  // Last 8 weeks of attendances (all, for bar chart)
  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 86400000)
  const allAttendances = await prisma.attendance.findMany({
    where: { checkIn: { gte: eightWeeksAgo } },
    select: { checkIn: true, checkOut: true },
  })

  // Payment status counts this month
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const payStatusCounts = await prisma.player.groupBy({
    by: ['payStatus'],
    where: { subscriptionEnd: { gte: monthStart, lt: monthEnd } },
    _count: true,
  })

  // Consistency data
  const players = await prisma.player.findMany({
    select: {
      firstName: true, lastName: true,
      weeklySessions: true, subscriptionStart: true,
      _count: {
        select: {
          attendances: { where: { checkOut: { not: null } } },
        },
      },
    },
    orderBy: { firstName: 'asc' },
  })

  return { allAttendances, payStatusCounts, players, now }
}

function buildWeeklyData(attendances: { checkIn: Date }[], now: Date) {
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date(now.getTime() - (7 - i) * 7 * 86400000)
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000)
    const count = attendances.filter(a => a.checkIn >= weekStart && a.checkIn < weekEnd).length
    const label = `S${8 - i}`
    return { week: label, count }
  })
  return weeks
}

export default async function AnalyticsPage() {
  const { allAttendances, payStatusCounts, players, now } = await getData()

  const heatmap = buildHeatmapData(allAttendances)
  const weeklyData = buildWeeklyData(allAttendances, now)
  const pieData = (['PAGADO', 'PENDIENTE', 'VENCIDO'] as PayStatus[]).map(s => ({
    name: s,
    value: payStatusCounts.find(p => p.payStatus === s)?._count ?? 0,
  }))
  const consistencyData = buildConsistencyData(players as PlayerWithCount[], now)
    .sort((a, b) => {
      if (a.consistency === null && b.consistency === null) return 0
      if (a.consistency === null) return 1
      if (b.consistency === null) return -1
      return a.consistency - b.consistency
    })

  return (
    <div className="p-4 space-y-6">
      <h1 className="font-varsity text-evg-orange text-2xl">Analytics</h1>

      {/* Weekly attendance bar chart */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <p className="text-zinc-400 text-sm mb-3">Asistencias por semana (últimas 8)</p>
        <WeeklyBarChart data={weeklyData} />
      </div>

      {/* Payment status pie */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <p className="text-zinc-400 text-sm mb-3">Estado de pagos (mes actual)</p>
        <PayStatusPie data={pieData} />
      </div>

      {/* Heatmap (simplified table) */}
      <div className="bg-zinc-900 rounded-xl p-4 overflow-x-auto">
        <p className="text-zinc-400 text-sm mb-3">Mapa de calor de asistencia</p>
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="text-left pr-2 text-zinc-500">Día</th>
              {heatmap.hours.map(h => (
                <th key={h} className="text-zinc-600 px-1">{h}h</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmap.rows.map(row => (
              <tr key={row.day}>
                <td className="pr-2 text-zinc-400">{row.day}</td>
                {row.values.map((v, i) => (
                  <td key={i} className="px-1 text-center rounded"
                    style={{ background: v > 0 ? `rgba(255,140,0,${Math.min(v / 10, 1)})` : 'transparent' }}>
                    {v > 0 ? v : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Consistency table */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <p className="text-zinc-400 text-sm mb-3">Consistencia por jugador</p>
        <div className="space-y-2">
          {consistencyData.map((p, i) => (
            <div key={i} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-zinc-500 text-xs">{p.attended}/{p.expected} sesiones</p>
              </div>
              <span className="font-bold text-evg-orange">
                {p.consistency === null ? 'N/A' : `${p.consistency}%`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
