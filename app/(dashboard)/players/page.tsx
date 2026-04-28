import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const players = await prisma.player.findMany({
    where: q
      ? {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { lastName: 'asc' },
  })

  const statusClasses: Record<string, string> = {
    PAGADO:   'badge-paid',
    PENDIENTE: 'badge-pending',
    VENCIDO:  'badge-overdue',
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex justify-between items-center mb-5">
        <h1 className="page-title">Jugadores</h1>
        <Link href="/players/new"
          className="bg-evg-orange text-black font-bold px-4 py-2 rounded-xl text-sm shadow-orange-glow-sm active:scale-95 transition-transform">
          + Nuevo
        </Link>
      </div>

      <form className="mb-5">
        <input name="q" placeholder="Buscar jugador..." defaultValue={q ?? ''}
          className="input-field" />
      </form>

      <div className="space-y-2">
        {players.map(p => (
          <Link key={p.id} href={`/players/${p.id}`} className="list-row">
            <div>
              <p className="text-white font-semibold text-sm">{p.firstName} {p.lastName}</p>
              <p className="text-zinc-500 text-xs mt-0.5">{p.weeklySessions}x por semana</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={statusClasses[p.payStatus]}>{p.payStatus}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </Link>
        ))}
        {players.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-10">No se encontraron jugadores.</p>
        )}
      </div>
    </div>
  )
}
