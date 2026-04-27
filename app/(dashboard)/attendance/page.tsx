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
    <div className="p-4">
      <h1 className="font-varsity text-evg-orange text-2xl mb-4">Asistencia Hoy</h1>
      <div className="space-y-2">
        {attendances.map(a => {
          const duration = a.checkOut
            ? Math.round((a.checkOut.getTime() - a.checkIn.getTime()) / 60000)
            : null
          return (
            <div key={a.id} className="bg-zinc-900 rounded-lg px-4 py-3">
              <p className="font-semibold">{a.player.firstName} {a.player.lastName}</p>
              <p className="text-zinc-400 text-sm">
                {new Date(a.checkIn).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                {' → '}
                {a.checkOut
                  ? `${new Date(a.checkOut).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} (${duration} min)`
                  : <span className="text-evg-orange">En sesión</span>
                }
              </p>
            </div>
          )
        })}
        {attendances.length === 0 && (
          <p className="text-zinc-500 text-center py-8">Sin asistencias hoy.</p>
        )}
      </div>
    </div>
  )
}
