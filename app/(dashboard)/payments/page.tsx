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

  const statusClasses: Record<PayStatus, string> = {
    PAGADO:   'badge-paid',
    PENDIENTE: 'badge-pending',
    VENCIDO:  'badge-overdue',
  }

  const filterLabels: Record<string, string> = {
    '': 'Todos',
    PENDIENTE: 'Pendiente',
    VENCIDO: 'Vencido',
    PAGADO: 'Pagado',
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="page-title mb-5">Pagos</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {(['', 'PENDIENTE', 'VENCIDO', 'PAGADO'] as const).map(s => (
          <a key={s} href={s ? `/payments?filter=${s}` : '/payments'}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap uppercase tracking-wide transition-colors ${
              (filter ?? '') === s
                ? 'bg-evg-orange text-black shadow-orange-glow-sm'
                : 'bg-zinc-900 border border-white/[0.07] text-zinc-500'
            }`}>
            {filterLabels[s]}
          </a>
        ))}
      </div>

      <div className="space-y-2">
        {players.map(p => (
          <div key={p.id} className="list-row">
            <div>
              <p className="text-white font-semibold text-sm">{p.firstName} {p.lastName}</p>
              <p className="text-zinc-600 text-xs mt-0.5">
                Vence: {new Date(p.subscriptionEnd).toLocaleDateString('es-CO')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={statusClasses[p.payStatus]}>{p.payStatus}</span>
              {/* markAsPaid returns { error? } for programmatic use; cast to void for form action */}
              {p.payStatus !== 'PAGADO' && (
                <form action={markAsPaid.bind(null, p.id) as unknown as (formData: FormData) => void}>
                  <button type="submit"
                    className="text-[11px] bg-evg-orange text-black font-bold px-3 py-1.5 rounded-lg shadow-orange-glow-sm active:scale-95 transition-transform">
                    Pagado
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
        {players.length === 0 && (
          <p className="text-zinc-600 text-sm text-center py-10">Sin resultados.</p>
        )}
      </div>
    </div>
  )
}
