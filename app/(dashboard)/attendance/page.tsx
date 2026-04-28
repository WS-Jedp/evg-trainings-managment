import { prisma } from '@/lib/prisma'
import { startOfDayUTC } from '@/lib/dates'

export default async function AttendancePage() {
  const todayStart = startOfDayUTC(new Date())
  const todayEnd = new Date(todayStart)
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1)

  const attendances = await prisma.attendance.findMany({
    where: { checkIn: { gte: todayStart, lt: todayEnd } },
    include: { player: { select: { firstName: true, lastName: true } } },
    orderBy: { checkIn: 'desc' },
  })

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-baseline justify-between mb-5">
        <h1 className="page-title">Asistencia</h1>
        <span className="text-zinc-500 text-xs">Hoy · {attendances.length}</span>
      </div>

      <div className="space-y-2">
        {attendances.map(a => {
          const isActive = !a.checkOut
          const duration = a.checkOut
            ? Math.round((a.checkOut.getTime() - a.checkIn.getTime()) / 60000)
            : null
          return (
            <div key={a.id} className={`bg-zinc-900 border rounded-xl px-4 py-3.5 ${isActive ? 'border-evg-orange/30' : 'border-white/[0.06]'}`}>
              <div className="flex items-center justify-between">
                <p className="text-white font-semibold text-sm">
                  {a.player.firstName} {a.player.lastName}
                </p>
                {isActive
                  ? <span className="text-[10px] font-bold text-evg-orange bg-evg-orange/10 border border-evg-orange/30 px-2 py-1 rounded-full uppercase tracking-wide">En sesión</span>
                  : <span className="text-zinc-500 text-xs font-mono">{duration} min</span>
                }
              </div>
              <p className="text-zinc-600 text-xs mt-1 font-mono">
                {new Date(a.checkIn).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                {a.checkOut && ` → ${new Date(a.checkOut).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`}
              </p>
            </div>
          )
        })}
        {attendances.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-10">Sin asistencias hoy.</p>
        )}
      </div>
    </div>
  )
}
