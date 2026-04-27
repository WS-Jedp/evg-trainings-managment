import { prisma } from '@/lib/prisma'
import { startOfDayUTC } from '@/lib/dates'
import { HomeActions } from '@/components/ui/home-actions'

async function getInSessionPlayers() {
  const todayStart = startOfDayUTC(new Date())
  const todayEnd = new Date(todayStart)
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1)

  return prisma.attendance.findMany({
    where: { checkIn: { gte: todayStart, lt: todayEnd }, checkOut: null },
    include: { player: { select: { firstName: true, lastName: true } } },
    orderBy: { checkIn: 'asc' },
  })
}

export default async function HomePage() {
  const inSession = await getInSessionPlayers()

  return (
    <div className="p-4 space-y-6">
      <h1 className="font-varsity text-evg-orange text-3xl text-center pt-4">EVG</h1>

      <HomeActions openAttendances={inSession} />

      {/* Live session list */}
      <div>
        <p className="text-zinc-400 text-sm mb-2">En sesión ahora ({inSession.length})</p>
        <div className="space-y-2">
          {inSession.map(a => (
            <div key={a.id} className="bg-zinc-900 rounded-lg px-4 py-3 flex justify-between">
              <span>{a.player.firstName} {a.player.lastName}</span>
              <span className="text-zinc-400 text-sm">
                {new Date(a.checkIn).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          {inSession.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-4">No hay jugadores en sesión.</p>
          )}
        </div>
      </div>
    </div>
  )
}
