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

  const statusColors: Record<string, string> = {
    PAGADO: 'bg-green-900 text-green-400',
    PENDIENTE: 'bg-yellow-900 text-yellow-400',
    VENCIDO: 'bg-red-900 text-red-400',
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="font-varsity text-evg-orange text-2xl">Jugadores</h1>
        <Link href="/players/new"
          className="bg-evg-orange text-black font-bold px-4 py-2 rounded-lg text-sm">
          + Nuevo Jugador
        </Link>
      </div>

      <form className="mb-4">
        <input name="q" placeholder="Buscar jugador..." defaultValue={q ?? ''}
          className="input-field" />
      </form>

      <div className="space-y-2">
        {players.map(p => (
          <Link key={p.id} href={`/players/${p.id}`}
            className="flex items-center justify-between bg-zinc-900 rounded-lg px-4 py-3">
            <div>
              <p className="font-semibold">{p.firstName} {p.lastName}</p>
              <p className="text-zinc-400 text-sm">{p.weeklySessions}x/semana</p>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded ${statusColors[p.payStatus]}`}>
              {p.payStatus}
            </span>
          </Link>
        ))}
        {players.length === 0 && (
          <p className="text-zinc-500 text-center py-8">No se encontraron jugadores.</p>
        )}
      </div>
    </div>
  )
}
