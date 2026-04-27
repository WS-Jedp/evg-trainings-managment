import { prisma } from '@/lib/prisma'
import { PayStatus } from '@prisma/client'
import { markAsPaid } from '@/actions/payments'

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter } = await searchParams
  const statusFilter = filter as PayStatus | undefined

  const players = await prisma.player.findMany({
    where: statusFilter ? { payStatus: statusFilter } : undefined,
    orderBy: { subscriptionEnd: 'asc' },
    select: {
      id: true, firstName: true, lastName: true,
      payStatus: true, subscriptionEnd: true,
    },
  })

  const statusColors: Record<PayStatus, string> = {
    PAGADO: 'bg-green-900 text-green-400',
    PENDIENTE: 'bg-yellow-900 text-yellow-400',
    VENCIDO: 'bg-red-900 text-red-400',
  }

  return (
    <div className="p-4">
      <h1 className="font-varsity text-evg-orange text-2xl mb-4">Pagos</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(['', 'PENDIENTE', 'VENCIDO', 'PAGADO'] as const).map(s => (
          <a key={s} href={s ? `/payments?filter=${s}` : '/payments'}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              (filter ?? '') === s ? 'bg-evg-orange text-black font-bold' : 'bg-zinc-800 text-zinc-400'
            }`}>
            {s || 'Todos'}
          </a>
        ))}
      </div>

      <div className="space-y-2">
        {players.map(p => (
          <div key={p.id}
            className="bg-zinc-900 rounded-lg px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold">{p.firstName} {p.lastName}</p>
              <p className="text-zinc-400 text-xs">
                Vence: {new Date(p.subscriptionEnd).toLocaleDateString('es-CO')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2 py-1 rounded ${statusColors[p.payStatus]}`}>
                {p.payStatus}
              </span>
              {p.payStatus !== 'PAGADO' && (
                {/* markAsPaid returns { error? } for programmatic use; cast to void for form action — Next.js ignores the return value at runtime */}
                <form action={markAsPaid.bind(null, p.id) as unknown as (formData: FormData) => void}>
                  <button type="submit"
                    className="text-xs bg-evg-orange text-black font-bold px-3 py-1 rounded-lg">
                    Pagado
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
        {players.length === 0 && (
          <p className="text-zinc-500 text-center py-8">Sin resultados.</p>
        )}
      </div>
    </div>
  )
}
