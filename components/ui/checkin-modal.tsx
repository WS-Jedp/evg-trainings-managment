'use client'
import { useState, useTransition } from 'react'
import { checkIn } from '@/actions/attendance'

interface Player { id: string; firstName: string; lastName: string }

export function CheckInModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Player[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function search(q: string) {
    setQuery(q)
    if (!q) { setResults([]); return }
    const res = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`)
    setResults(await res.json())
  }

  async function handleCheckIn(playerId: string) {
    startTransition(async () => {
      const result = await checkIn(playerId)
      if (result.error) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={onClose}>
      <div className="bg-zinc-900 w-full rounded-t-2xl p-4" onClick={e => e.stopPropagation()}>
        <h2 className="font-varsity text-evg-orange text-xl mb-4">Registrar Entrada</h2>
        <input
          autoFocus
          value={query}
          onChange={e => search(e.target.value)}
          placeholder="Buscar jugador..."
          className="input-field mb-4"
        />
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {results.map(p => (
            <button key={p.id} onClick={() => handleCheckIn(p.id)} disabled={isPending}
              className="w-full text-left bg-zinc-800 rounded-lg px-4 py-3 hover:bg-zinc-700">
              {p.firstName} {p.lastName}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
