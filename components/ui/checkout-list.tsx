'use client'
import { useState, useTransition } from 'react'
import { checkOut } from '@/actions/attendance'

export interface OpenAttendance {
  id: string
  checkIn: Date
  player: { firstName: string; lastName: string }
}

export function CheckoutList({
  attendances,
  onDone,
}: {
  attendances: OpenAttendance[]
  onDone: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleCheckOut(id: string) {
    setError(null)
    startTransition(async () => {
      const result = await checkOut(id)
      if (result?.error) {
        setError(result.error)
      } else {
        onDone()
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={onDone}>
      <div className="bg-zinc-900 w-full rounded-t-2xl p-4" onClick={e => e.stopPropagation()}>
        <h2 className="font-varsity text-evg-orange text-xl mb-4">Registrar Salida</h2>
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {attendances.map(a => (
            <button key={a.id} onClick={() => handleCheckOut(a.id)} disabled={isPending}
              className="w-full text-left bg-zinc-800 rounded-lg px-4 py-3 hover:bg-zinc-700">
              {a.player.firstName} {a.player.lastName}
              <span className="text-zinc-400 text-xs ml-2">
                desde {new Date(a.checkIn).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </button>
          ))}
          {attendances.length === 0 && (
            <p className="text-zinc-500 text-center py-4">No hay jugadores en sesión.</p>
          )}
        </div>
      </div>
    </div>
  )
}
