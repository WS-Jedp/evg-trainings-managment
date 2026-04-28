import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { isoWeeksElapsed } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function StatCell({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="bg-zinc-800/60 rounded-xl px-3 py-3">
      <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1.5">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="font-varsity text-white text-2xl leading-none">
          {value ?? '—'}
        </span>
        {value !== null && <span className="text-zinc-500 text-xs">{unit}</span>}
      </div>
    </div>
  )
}

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      attendances: { orderBy: { checkIn: 'desc' } },
      paymentHistory: { orderBy: { paidAt: 'desc' } },
    },
  })
  if (!player) notFound()

  let photoSignedUrl: string | null = null
  if (player.photoUrl) {
    const supabase = await createClient()
    const { data } = await supabase.storage
      .from('players')
      .createSignedUrl(player.photoUrl, 3600)
    photoSignedUrl = data?.signedUrl ?? null
  }

  // --- Consistency ---
  const weeksActive = isoWeeksElapsed(player.subscriptionStart, new Date())
  const attendedWithCheckout = player.attendances.filter(a => a.checkOut !== null).length
  const expectedSessions = player.weeklySessions * weeksActive
  const consistency = weeksActive === 0
    ? null
    : Math.min(100, Math.round((attendedWithCheckout / expectedSessions) * 100))

  // --- Session stats ---
  const completedSessions = player.attendances.filter(a => a.checkOut !== null)
  const durations = completedSessions.map(a =>
    Math.round((a.checkOut!.getTime() - a.checkIn.getTime()) / 60000)
  )
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
    : null
  const longestSession = durations.length > 0 ? Math.max(...durations) : null

  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const daysFromMon = (now.getDay() + 6) % 7
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMon))

  const sessionsThisMonth = player.attendances.filter(a => a.checkIn >= monthStart).length
  const sessionsThisWeek  = player.attendances.filter(a => a.checkIn >= weekStart).length

  // --- Day-of-week frequency (0=Mon … 6=Sun) ---
  const dayFreq = [0, 0, 0, 0, 0, 0, 0]
  player.attendances.forEach(a => {
    dayFreq[(new Date(a.checkIn).getDay() + 6) % 7]++
  })
  const maxDayFreq = Math.max(...dayFreq, 1)

  // --- Peak check-in hour ---
  const hourCount: Record<number, number> = {}
  completedSessions.forEach(a => {
    const h = new Date(a.checkIn).getHours()
    hourCount[h] = (hourCount[h] || 0) + 1
  })
  const peakHourEntries = Object.entries(hourCount).sort((a, b) => b[1] - a[1])
  const peakHour = peakHourEntries.length > 0 ? Number(peakHourEntries[0][0]) : null

  // --- Consecutive-weeks streak (from current week, going back) ---
  let streak = 0
  let wStart = new Date(weekStart)
  for (let i = 0; i < 52; i++) {
    const wEnd = new Date(wStart.getTime() + 7 * 86400000)
    if (!player.attendances.some(a => a.checkIn >= wStart && a.checkIn < wEnd)) break
    streak++
    wStart = new Date(wStart.getTime() - 7 * 86400000)
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        {photoSignedUrl ? (
          <div className="relative shrink-0">
            <img src={photoSignedUrl} alt={player.firstName}
              className="w-20 h-20 rounded-2xl object-cover border border-white/10" />
            <div className="absolute inset-0 rounded-2xl ring-2 ring-evg-orange/30 pointer-events-none" />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center shrink-0">
            <span className="font-varsity text-2xl text-evg-orange">
              {player.firstName[0]}{player.lastName[0]}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-varsity text-white text-3xl leading-none">
            {player.firstName}<br />{player.lastName}
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {player.weeklySessions}x sem · {player.age} años
          </p>
        </div>
        <Link href={`/players/${id}/edit`}
          className="text-xs font-semibold border border-white/20 text-zinc-400 px-3 py-1.5 rounded-lg active:bg-white/5 transition-colors shrink-0">
          Editar
        </Link>
      </div>

      {/* Consistency */}
      <div className="card-padded">
        <p className="card-label">Consistencia</p>
        <div className="flex items-end gap-4">
          <p className="metric-number">
            {consistency === null ? 'N/A' : `${consistency}%`}
          </p>
          <div className="pb-1 flex-1">
            <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-1.5">
              <div
                className="bg-evg-orange h-1.5 rounded-full transition-all"
                style={{ width: `${consistency ?? 0}%` }}
              />
            </div>
            <p className="text-zinc-600 text-xs">{attendedWithCheckout} / {expectedSessions} sesiones</p>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="card-padded">
        <p className="card-label">Estadísticas</p>
        <div className="grid grid-cols-2 gap-2">
          <StatCell label="Promedio sesión" value={avgDuration} unit="min" />
          <StatCell label="Más larga" value={longestSession} unit="min" />
          <StatCell label="Este mes" value={sessionsThisMonth} unit="ses." />
          <StatCell label="Esta semana" value={sessionsThisWeek} unit="ses." />
        </div>
      </div>

      {/* Day-of-week frequency */}
      <div className="card-padded">
        <p className="card-label">Días habituales</p>
        <div className="flex gap-1.5">
          {DAY_LABELS.map((label, i) => {
            const count = dayFreq[i]
            const intensity = count / maxDayFreq
            const isBest = count > 0 && count === maxDayFreq
            return (
              <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                <span className={`text-[11px] font-bold ${isBest ? 'text-evg-orange' : 'text-zinc-500'}`}>
                  {label}
                </span>
                <div className="w-full bg-zinc-800 rounded-lg overflow-hidden flex flex-col justify-end" style={{ height: '56px' }}>
                  <div
                    className="w-full rounded-lg transition-all duration-300"
                    style={{
                      height: count > 0 ? `${Math.max(intensity * 100, 8)}%` : '0%',
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

      {/* Streak + Peak hour */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`card-padded ${streak >= 3 ? 'shadow-orange-glow-sm' : ''}`}>
          <p className="card-label">Racha</p>
          <div className="flex items-baseline gap-1">
            <span className="font-varsity text-white text-3xl leading-none">{streak}</span>
            <span className="text-zinc-500 text-xs">sem.</span>
          </div>
          <p className="text-zinc-600 text-xs mt-1">consecutivas</p>
        </div>
        {peakHour !== null ? (
          <div className="card-padded">
            <p className="card-label">Hora habitual</p>
            <div className="flex items-baseline gap-0.5">
              <span className="font-varsity text-white text-3xl leading-none">{peakHour}</span>
              <span className="text-zinc-500 text-xs">h</span>
            </div>
            <p className="text-zinc-600 text-xs mt-1">hora de entrada</p>
          </div>
        ) : (
          <div className="card-padded flex items-center justify-center">
            <p className="text-zinc-700 text-xs text-center">Sin datos de hora aún</p>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div>
        <h2 className="font-varsity text-white text-xl tracking-wide mb-3">Historial de Pagos</h2>
        <div className="space-y-2">
          {player.paymentHistory.map(p => (
            <div key={p.id} className="list-row">
              <span className="text-white text-sm font-medium">{p.period}</span>
              <span className="text-zinc-500 text-xs font-mono">
                {new Date(p.paidAt).toLocaleDateString('es-CO')}
              </span>
            </div>
          ))}
          {player.paymentHistory.length === 0 && (
            <p className="text-zinc-600 text-sm">Sin pagos registrados.</p>
          )}
        </div>
      </div>

      {/* Attendance History */}
      <div>
        <h2 className="font-varsity text-white text-xl tracking-wide mb-3">Historial de Asistencia</h2>
        <div className="space-y-2">
          {player.attendances.slice(0, 20).map(a => {
            const duration = a.checkOut
              ? Math.round((a.checkOut.getTime() - a.checkIn.getTime()) / 60000)
              : null
            return (
              <div key={a.id} className="bg-zinc-900 border border-white/[0.06] rounded-xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-white text-sm font-medium">
                    {new Date(a.checkIn).toLocaleDateString('es-CO')}
                  </p>
                  {duration !== null
                    ? <span className="text-zinc-500 text-xs font-mono">{duration} min</span>
                    : <span className="text-evg-orange text-[10px] font-bold bg-evg-orange/10 px-2 py-0.5 rounded-full uppercase tracking-wide">En sesión</span>
                  }
                </div>
                <p className="text-zinc-600 text-xs mt-1 font-mono">
                  {new Date(a.checkIn).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  {a.checkOut && ` → ${new Date(a.checkOut).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`}
                </p>
              </div>
            )
          })}
          {player.attendances.length === 0 && (
            <p className="text-zinc-600 text-sm">Sin asistencias registradas.</p>
          )}
          {player.attendances.length > 20 && (
            <p className="text-zinc-600 text-xs text-center pt-1">
              Mostrando 20 de {player.attendances.length} sesiones
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
