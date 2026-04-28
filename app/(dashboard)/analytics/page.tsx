import { prisma } from '@/lib/prisma'
import { buildHeatmapData, buildConsistencyData, PlayerWithCount } from '@/lib/analytics'
import { WeeklyBarChart, PayStatusPie } from '@/components/ui/charts'
import { PayStatus } from '@prisma/client'

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const DAY_NAMES  = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

async function getData() {
  const now = new Date()
  const eightWeeksAgo   = new Date(now.getTime() - 8 * 7 * 86400000)
  const monthStart      = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const daysFromMon     = (now.getDay() + 6) % 7
  const weekStart       = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMon))
  const lastWeekStart   = new Date(weekStart.getTime() - 7 * 86400000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000)
  const sevenDaysLater  = new Date(now.getTime() + 7 * 86400000)

  const [
    allAttendances,
    payStatusCounts,
    players,
    totalPlayers,
    activePlayers,
    atRiskPlayers,
    expiringPlayers,
  ] = await Promise.all([
    prisma.attendance.findMany({
      where: { checkIn: { gte: eightWeeksAgo } },
      select: { checkIn: true, checkOut: true },
    }),
    prisma.player.groupBy({ by: ['payStatus'], _count: true }),
    prisma.player.findMany({
      select: {
        firstName: true, lastName: true,
        weeklySessions: true, subscriptionStart: true,
        _count: { select: { attendances: { where: { checkOut: { not: null } } } } },
      },
      orderBy: { firstName: 'asc' },
    }),
    prisma.player.count(),
    prisma.player.count({ where: { subscriptionEnd: { gte: now } } }),
    // Players with active subscription but no attendance in the last 14 days
    prisma.player.findMany({
      where: {
        subscriptionEnd: { gte: now },
        payStatus: { not: 'VENCIDO' },
        attendances: { every: { checkIn: { lt: fourteenDaysAgo } } },
      },
      select: { firstName: true, lastName: true },
      orderBy: { firstName: 'asc' },
    }),
    // Players whose subscription expires in the next 7 days and haven't paid
    prisma.player.findMany({
      where: {
        subscriptionEnd: { gte: now, lte: sevenDaysLater },
        payStatus: { not: 'PAGADO' },
      },
      select: { firstName: true, lastName: true, subscriptionEnd: true, payStatus: true },
      orderBy: { subscriptionEnd: 'asc' },
    }),
  ])

  return {
    allAttendances, payStatusCounts, players, totalPlayers, activePlayers,
    atRiskPlayers, expiringPlayers,
    now, weekStart, lastWeekStart, monthStart,
  }
}

function buildWeeklyData(attendances: { checkIn: Date }[], now: Date) {
  return Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date(now.getTime() - (7 - i) * 7 * 86400000)
    const weekEnd   = new Date(weekStart.getTime() + 7 * 86400000)
    return {
      week: `S${8 - i}`,
      count: attendances.filter(a => a.checkIn >= weekStart && a.checkIn < weekEnd).length,
    }
  })
}

// ─── Inline UI helpers ────────────────────────────────────────────────────────

function KpiCard({ label, value, unit, sub }: { label: string; value: number | string; unit?: string; sub?: string }) {
  return (
    <div className="bg-zinc-800/60 rounded-xl px-3 py-3">
      <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1.5">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="font-varsity text-white text-2xl leading-none">{value}</span>
        {unit && <span className="text-zinc-500 text-xs">{unit}</span>}
      </div>
      {sub && <p className="text-zinc-600 text-[10px] mt-1">{sub}</p>}
    </div>
  )
}

function TrendBadge({ pct }: { pct: number }) {
  const up = pct >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full
      ${up ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
      {up ? '↑' : '↓'} {Math.abs(pct)}%
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
  const {
    allAttendances, payStatusCounts, players, totalPlayers, activePlayers,
    atRiskPlayers, expiringPlayers,
    now, weekStart, lastWeekStart, monthStart,
  } = await getData()

  // Existing chart data
  const heatmap     = buildHeatmapData(allAttendances)
  const weeklyData  = buildWeeklyData(allAttendances, now)
  const pieData = (['PAGADO', 'PENDIENTE', 'VENCIDO'] as PayStatus[]).map(s => ({
    name: s,
    value: payStatusCounts.find(p => p.payStatus === s)?._count ?? 0,
  }))
  const consistencyData = buildConsistencyData(players as PlayerWithCount[], now)
    .sort((a, b) => {
      if (a.consistency === null && b.consistency === null) return 0
      if (a.consistency === null) return 1
      if (b.consistency === null) return -1
      return b.consistency - a.consistency // best first
    })

  // ── Session counts ──
  const sessionsThisWeek  = allAttendances.filter(a => a.checkIn >= weekStart).length
  const sessionsLastWeek  = allAttendances.filter(a => a.checkIn >= lastWeekStart && a.checkIn < weekStart).length
  const sessionsThisMonth = allAttendances.filter(a => a.checkIn >= monthStart).length
  const weekTrend = sessionsLastWeek > 0
    ? Math.round(((sessionsThisWeek - sessionsLastWeek) / sessionsLastWeek) * 100)
    : null

  // ── Group-wide day frequency ──
  const dayFreqGroup = [0, 0, 0, 0, 0, 0, 0]
  allAttendances.forEach(a => { dayFreqGroup[(new Date(a.checkIn).getDay() + 6) % 7]++ })
  const maxDayFreqGroup = Math.max(...dayFreqGroup, 1)
  const bussiestDayIdx  = dayFreqGroup.indexOf(Math.max(...dayFreqGroup))

  // ── Peak check-in hour (group-wide) ──
  const completedAll = allAttendances.filter(a => a.checkOut !== null)
  const hourCountGroup: Record<number, number> = {}
  completedAll.forEach(a => {
    const h = new Date(a.checkIn).getHours()
    hourCountGroup[h] = (hourCountGroup[h] || 0) + 1
  })
  const peakHourGroup = Object.entries(hourCountGroup).sort((a, b) => b[1] - a[1])[0]
    ? Number(Object.entries(hourCountGroup).sort((a, b) => b[1] - a[1])[0][0])
    : null

  // ── Average consistency ──
  const consistencyValues = consistencyData.filter(p => p.consistency !== null).map(p => p.consistency!)
  const avgConsistency = consistencyValues.length > 0
    ? Math.round(consistencyValues.reduce((s, c) => s + c, 0) / consistencyValues.length)
    : null

  // ── Top 3 most consistent ──
  const top3 = [...consistencyData]
    .filter(p => p.consistency !== null)
    .sort((a, b) => b.consistency! - a.consistency!)
    .slice(0, 3)

  // ── Average session duration (group, last 8 weeks) ──
  const durationsAll = completedAll.map(a => (a.checkOut!.getTime() - a.checkIn.getTime()) / 60000)
  const avgDurationGroup = durationsAll.length > 0
    ? Math.round(durationsAll.reduce((s, d) => s + d, 0) / durationsAll.length)
    : null

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h1 className="page-title">Analytics</h1>
        <span className="text-zinc-600 text-xs">
          {now.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
        </span>
      </div>

      {/* ── KPI Grid 2×2 ── */}
      <div className="card-padded">
        <p className="card-label">Resumen</p>
        <div className="grid grid-cols-2 gap-2">
          <KpiCard label="Total jugadores" value={totalPlayers} sub={`${activePlayers} activos`} />
          <KpiCard label="Ses. este mes"   value={sessionsThisMonth} unit="ses." />
          <KpiCard label="Promedio sesión" value={avgDurationGroup ?? '—'} unit={avgDurationGroup ? 'min' : ''} />
          <KpiCard label="Consistencia avg" value={avgConsistency ?? '—'} unit={avgConsistency ? '%' : ''} />
        </div>
      </div>

      {/* ── Tendencia semanal ── */}
      <div className="card-padded">
        <p className="card-label">Esta semana vs anterior</p>
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-varsity text-white leading-none" style={{ fontSize: 'clamp(2rem, 10vw, 3rem)' }}>
                {sessionsThisWeek}
              </span>
              <span className="text-zinc-500 text-sm">ses.</span>
            </div>
            <p className="text-zinc-600 text-xs mt-1">Semana anterior: {sessionsLastWeek}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {weekTrend !== null && <TrendBadge pct={weekTrend} />}
            <span className="text-zinc-600 text-[10px]">vs sem. anterior</span>
          </div>
        </div>
      </div>

      {/* ── Weekly bar chart ── */}
      <div className="card-padded">
        <p className="card-label">Asistencias por semana · últimas 8</p>
        <WeeklyBarChart data={weeklyData} />
      </div>

      {/* ── Alerts row ── */}
      {(atRiskPlayers.length > 0 || expiringPlayers.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {/* At risk */}
          <div className={`card-padded ${atRiskPlayers.length > 0 ? 'border-amber-800/40' : ''}`}>
            <p className="card-label">Sin asistir · 14d</p>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="font-varsity text-amber-400 text-2xl leading-none">{atRiskPlayers.length}</span>
              <span className="text-zinc-500 text-xs">jugadores</span>
            </div>
            <div className="space-y-1">
              {atRiskPlayers.slice(0, 3).map((p, i) => (
                <p key={i} className="text-zinc-400 text-[11px] truncate">{p.firstName} {p.lastName}</p>
              ))}
              {atRiskPlayers.length > 3 && (
                <p className="text-zinc-600 text-[10px]">+{atRiskPlayers.length - 3} más</p>
              )}
              {atRiskPlayers.length === 0 && (
                <p className="text-zinc-600 text-[10px]">Sin alertas</p>
              )}
            </div>
          </div>

          {/* Expiring */}
          <div className={`card-padded ${expiringPlayers.length > 0 ? 'border-red-800/40' : ''}`}>
            <p className="card-label">Vencen en 7d</p>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="font-varsity text-red-400 text-2xl leading-none">{expiringPlayers.length}</span>
              <span className="text-zinc-500 text-xs">jugadores</span>
            </div>
            <div className="space-y-1">
              {expiringPlayers.slice(0, 3).map((p, i) => (
                <div key={i}>
                  <p className="text-zinc-400 text-[11px] truncate">{p.firstName} {p.lastName}</p>
                  <p className="text-zinc-600 text-[10px] font-mono">
                    {new Date(p.subscriptionEnd).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              ))}
              {expiringPlayers.length > 3 && (
                <p className="text-zinc-600 text-[10px]">+{expiringPlayers.length - 3} más</p>
              )}
              {expiringPlayers.length === 0 && (
                <p className="text-zinc-600 text-[10px]">Sin vencimientos</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Top 3 consistentes ── */}
      {top3.length > 0 && (
        <div className="card-padded">
          <p className="card-label">Top consistencia</p>
          <div className="space-y-3">
            {top3.map((p, i) => {
              const medals = ['🥇', '🥈', '🥉']
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-lg leading-none w-6 shrink-0">{medals[i]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-white text-sm font-medium truncate">{p.name}</p>
                      <span className="font-varsity text-evg-orange text-xl leading-none ml-2 shrink-0">
                        {p.consistency}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-1">
                      <div className="bg-evg-orange h-1 rounded-full" style={{ width: `${p.consistency}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Días y hora pico ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card-padded">
          <p className="card-label">Día más activo</p>
          <p className="font-varsity text-white text-2xl leading-none">
            {dayFreqGroup.some(v => v > 0) ? DAY_NAMES[bussiestDayIdx] : '—'}
          </p>
          <p className="text-zinc-600 text-xs mt-1">
            {dayFreqGroup[bussiestDayIdx] > 0 ? `${dayFreqGroup[bussiestDayIdx]} ses. (8 sem.)` : 'Sin datos'}
          </p>
        </div>
        <div className="card-padded">
          <p className="card-label">Hora pico</p>
          <div className="flex items-baseline gap-0.5">
            <span className="font-varsity text-white text-2xl leading-none">
              {peakHourGroup !== null ? `${peakHourGroup}` : '—'}
            </span>
            {peakHourGroup !== null && <span className="text-zinc-500 text-xs">h</span>}
          </div>
          <p className="text-zinc-600 text-xs mt-1">hora de entrada</p>
        </div>
      </div>

      {/* ── Días de la semana (group bar chart) ── */}
      <div className="card-padded">
        <p className="card-label">Distribución por día · 8 semanas</p>
        <div className="flex gap-1.5">
          {DAY_LABELS.map((label, i) => {
            const count     = dayFreqGroup[i]
            const intensity = count / maxDayFreqGroup
            const isBest    = count > 0 && count === dayFreqGroup[bussiestDayIdx]
            return (
              <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                <span className={`text-[11px] font-bold ${isBest ? 'text-evg-orange' : 'text-zinc-500'}`}>
                  {label}
                </span>
                <div className="w-full bg-zinc-800 rounded-lg overflow-hidden flex flex-col justify-end" style={{ height: '48px' }}>
                  <div
                    className="w-full rounded-lg transition-all duration-300"
                    style={{
                      height: count > 0 ? `${Math.max(intensity * 100, 6)}%` : '0%',
                      background: isBest ? '#FF8C00' : `rgba(255,140,0,${0.2 + intensity * 0.5})`,
                    }}
                  />
                </div>
                <span className="text-[10px] text-zinc-600 font-mono">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Payment pie ── */}
      <div className="card-padded">
        <p className="card-label">Estado de pagos · todos los jugadores</p>
        <PayStatusPie data={pieData} />
      </div>

      {/* ── Heatmap ── */}
      <div className="card-padded overflow-x-auto">
        <p className="card-label">Mapa de calor · día × hora</p>
        <table className="text-xs w-full">
          <thead>
            <tr>
              <th className="text-left pr-2 text-zinc-600">Día</th>
              {heatmap.hours.map(h => (
                <th key={h} className="text-zinc-600 px-1">{h}h</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmap.rows.map(row => (
              <tr key={row.day}>
                <td className="pr-2 text-zinc-500 py-0.5">{row.day}</td>
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

      {/* ── Consistencia por jugador ── */}
      <div className="card-padded">
        <p className="card-label">Consistencia por jugador</p>
        <div>
          {consistencyData.map((p, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-white text-sm font-medium truncate">{p.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-zinc-800 rounded-full h-1">
                    <div
                      className="bg-evg-orange h-1 rounded-full"
                      style={{ width: `${p.consistency ?? 0}%` }}
                    />
                  </div>
                  <span className="text-zinc-600 text-[10px] whitespace-nowrap">{p.attended}/{p.expected}</span>
                </div>
              </div>
              <span className="font-varsity text-evg-orange text-2xl leading-none shrink-0">
                {p.consistency === null ? 'N/A' : `${p.consistency}%`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
