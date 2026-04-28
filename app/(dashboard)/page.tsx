import { prisma } from '@/lib/prisma'
import { startOfDayUTC } from '@/lib/dates'
import { HomeActions } from '@/components/ui/home-actions'

async function getData() {
  const todayStart = startOfDayUTC(new Date())
  const todayEnd = new Date(todayStart)
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1)

  const [inSession, todayAll, pendingCount] = await Promise.all([
    prisma.attendance.findMany({
      where: { checkIn: { gte: todayStart, lt: todayEnd }, checkOut: null },
      include: { player: { select: { firstName: true, lastName: true } } },
      orderBy: { checkIn: 'asc' },
    }),
    prisma.attendance.findMany({
      where: { checkIn: { gte: todayStart, lt: todayEnd } },
      select: { checkIn: true, checkOut: true },
    }),
    prisma.player.count({ where: { payStatus: { in: ['PENDIENTE', 'VENCIDO'] } } }),
  ])

  return { inSession, todayAll, pendingCount }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default async function HomePage() {
  const { inSession, todayAll, pendingCount } = await getData()

  // Today's stats
  const completedToday = todayAll.filter(a => a.checkOut !== null)
  const durations = completedToday.map(a =>
    Math.round((a.checkOut!.getTime() - a.checkIn.getTime()) / 60000)
  )
  const avgDurationToday = durations.length > 0
    ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
    : null
  const totalToday = todayAll.length

  // Date labels
  const now = new Date()
  const dayName  = capitalize(now.toLocaleDateString('es-CO', { weekday: 'long' }))
  const dateStr  = now.toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })

  return (
    <div className="pb-4 space-y-5">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden px-4 pt-8 pb-6">
        {/* Subtle orange glow behind logo */}
        <div
          className="absolute -top-10 -right-10 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,140,0,0.08) 0%, transparent 70%)' }}
        />

        <div className="flex items-center justify-between">
          {/* Date block */}
          <div>
            <p className="text-zinc-600 text-xs uppercase tracking-[0.2em] font-medium mb-1">Academia EVG</p>
            <h1
              className="font-varsity text-white leading-none"
              style={{ fontSize: 'clamp(2.2rem, 10vw, 3rem)' }}
            >
              {dayName}
            </h1>
            <p className="text-zinc-400 text-sm mt-1 capitalize">{dateStr}</p>
          </div>

          {/* Logo */}
          {/* mix-blend-mode: screen makes the dark logo bg transparent on black */}
          <img
            src="/evg_logo.jpg"
            alt="Team EVG"
            width={90}
            height={90}
            className="object-contain rounded-xl shrink-0"
            style={{ mixBlendMode: 'screen' }}
          />
        </div>

        {/* Orange accent line */}
        <div className="mt-5 h-px w-full bg-gradient-to-r from-evg-orange/60 via-evg-orange/20 to-transparent" />
      </div>

      {/* ── Stats del día ── */}
      <div className="px-4">
        <div className="card-padded">
          <p className="card-label">Resumen de hoy</p>
          <div className="grid grid-cols-2 gap-2">

            <div className="bg-zinc-800/60 rounded-xl px-3 py-3">
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1.5">Total asistencias</p>
              <div className="flex items-baseline gap-1">
                <span className="font-varsity text-white text-3xl leading-none">{totalToday}</span>
                <span className="text-zinc-500 text-xs">jugadores</span>
              </div>
            </div>

            <div className={`rounded-xl px-3 py-3 ${inSession.length > 0 ? 'bg-evg-orange/10 border border-evg-orange/25' : 'bg-zinc-800/60'}`}>
              <p className={`text-[10px] uppercase tracking-widest mb-1.5 ${inSession.length > 0 ? 'text-evg-orange/70' : 'text-zinc-500'}`}>
                En sesión ahora
              </p>
              <div className="flex items-center gap-2">
                {inSession.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-evg-orange animate-pulse shrink-0" />
                )}
                <div className="flex items-baseline gap-1">
                  <span className={`font-varsity text-3xl leading-none ${inSession.length > 0 ? 'text-evg-orange' : 'text-white'}`}>
                    {inSession.length}
                  </span>
                  <span className="text-zinc-500 text-xs">activos</span>
                </div>
              </div>
            </div>

            <div className="bg-zinc-800/60 rounded-xl px-3 py-3">
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1.5">Completadas</p>
              <div className="flex items-baseline gap-1">
                <span className="font-varsity text-white text-3xl leading-none">{completedToday.length}</span>
                <span className="text-zinc-500 text-xs">sesiones</span>
              </div>
            </div>

            <div className="bg-zinc-800/60 rounded-xl px-3 py-3">
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1.5">Duración prom.</p>
              <div className="flex items-baseline gap-1">
                <span className="font-varsity text-white text-3xl leading-none">
                  {avgDurationToday ?? '—'}
                </span>
                {avgDurationToday !== null && <span className="text-zinc-500 text-xs">min</span>}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="px-4">
        <HomeActions openAttendances={inSession} pendingCount={pendingCount} />
      </div>

      {/* ── Live session list ── */}
      <div className="px-4">
        <div className="card-padded">
          <p className="card-label">En sesión ahora</p>
          <div>
            {inSession.map((a, i) => (
              <div key={a.id} className={`flex items-center justify-between py-3 ${i < inSession.length - 1 ? 'border-b border-white/[0.05]' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-zinc-400">
                      {a.player.firstName[0]}{a.player.lastName[0]}
                    </span>
                  </div>
                  <span className="text-white text-sm font-medium">
                    {a.player.firstName} {a.player.lastName}
                  </span>
                </div>
                <span className="text-evg-orange text-xs font-mono font-bold">
                  {new Date(a.checkIn).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {inSession.length === 0 && (
              <p className="text-zinc-600 text-sm text-center py-6">Sin jugadores en sesión.</p>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
