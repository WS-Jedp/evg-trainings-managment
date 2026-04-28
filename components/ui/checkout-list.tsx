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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-50" onClick={onDone}>
      <div className="glass-sheet" onClick={e => e.stopPropagation()}>
        {/* Drag pill */}
        <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-5" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-varsity text-white text-2xl tracking-wide">Registrar Salida</h2>
          <button onClick={onDone} className="text-zinc-500 p-1 active:text-zinc-300 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {attendances.map(a => (
            <button key={a.id} onClick={() => handleCheckOut(a.id)} disabled={isPending}
              className="list-row w-full text-left disabled:opacity-50">
              <div>
                <p className="text-white font-medium text-sm">{a.player.firstName} {a.player.lastName}</p>
                <p className="text-zinc-500 text-xs mt-0.5 font-mono">
                  Desde {new Date(a.checkIn).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <span className="text-evg-orange text-xs font-bold tracking-wide uppercase">Salida</span>
            </button>
          ))}
          {attendances.length === 0 && (
            <p className="text-zinc-600 text-sm text-center py-6">No hay jugadores en sesión.</p>
          )}
        </div>
      </div>
    </div>
  )
}
