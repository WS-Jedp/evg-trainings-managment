import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { isoWeeksElapsed } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      attendances: { orderBy: { checkIn: 'desc' }, take: 50 },
      paymentHistory: { orderBy: { paidAt: 'desc' } },
    },
  })
  if (!player) notFound()

  // Signed URL for photo
  let photoSignedUrl: string | null = null
  if (player.photoUrl) {
    const supabase = await createClient()
    const { data } = await supabase.storage
      .from('players')
      .createSignedUrl(player.photoUrl, 3600)
    photoSignedUrl = data?.signedUrl ?? null
  }

  // Consistency metric
  const weeksActive = isoWeeksElapsed(player.subscriptionStart, new Date())
  const attendedWithCheckout = player.attendances.filter(a => a.checkOut !== null).length
  const expectedSessions = player.weeklySessions * weeksActive
  const consistency = weeksActive === 0
    ? null
    : Math.min(100, Math.round((attendedWithCheckout / expectedSessions) * 100))

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {photoSignedUrl && (
          <img src={photoSignedUrl} alt={player.firstName}
            className="w-16 h-16 rounded-full object-cover" />
        )}
        <div>
          <h1 className="font-varsity text-evg-orange text-2xl">
            {player.firstName} {player.lastName}
          </h1>
          <p className="text-zinc-400">{player.weeklySessions}x/semana · {player.age} años</p>
        </div>
        <Link href={`/players/${id}/edit`}
          className="ml-auto text-sm border border-zinc-700 px-3 py-1 rounded-lg">
          Editar
        </Link>
      </div>

      {/* Consistency */}
      <div className="bg-zinc-900 rounded-lg p-4">
        <p className="text-zinc-400 text-sm mb-1">Consistencia</p>
        <p className="text-3xl font-bold text-evg-orange">
          {consistency === null ? 'N/A' : `${consistency}%`}
        </p>
        <p className="text-zinc-500 text-xs mt-1">
          {attendedWithCheckout} sesiones / {expectedSessions} esperadas
        </p>
      </div>

      {/* Payment History */}
      <div>
        <h2 className="font-varsity text-lg mb-2">Historial de Pagos</h2>
        <div className="space-y-2">
          {player.paymentHistory.map(p => (
            <div key={p.id} className="bg-zinc-900 rounded-lg px-4 py-2 flex justify-between">
              <span>{p.period}</span>
              <span className="text-zinc-400 text-sm">
                {new Date(p.paidAt).toLocaleDateString('es-CO')}
              </span>
            </div>
          ))}
          {player.paymentHistory.length === 0 && (
            <p className="text-zinc-500 text-sm">Sin pagos registrados.</p>
          )}
        </div>
      </div>

      {/* Attendance History */}
      <div>
        <h2 className="font-varsity text-lg mb-2">Historial de Asistencia</h2>
        <div className="space-y-2">
          {player.attendances.map(a => {
            const duration = a.checkOut
              ? Math.round((a.checkOut.getTime() - a.checkIn.getTime()) / 60000)
              : null
            return (
              <div key={a.id} className="bg-zinc-900 rounded-lg px-4 py-2">
                <p className="text-sm">{new Date(a.checkIn).toLocaleDateString('es-CO')}</p>
                <p className="text-zinc-400 text-xs">
                  Entrada: {new Date(a.checkIn).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  {' · '}
                  {a.checkOut
                    ? `Salida: ${new Date(a.checkOut).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} · ${duration} min`
                    : '—'}
                </p>
              </div>
            )
          })}
          {player.attendances.length === 0 && (
            <p className="text-zinc-500 text-sm">Sin asistencias registradas.</p>
          )}
        </div>
      </div>
    </div>
  )
}
