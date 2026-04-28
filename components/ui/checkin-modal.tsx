'use client'
import { useState, useTransition, useRef } from 'react'
import { checkIn } from '@/actions/attendance'

interface Player { id: string; firstName: string; lastName: string }

export function CheckInModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Player[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const abortRef = useRef<AbortController | null>(null)

  async function search(q: string) {
    setQuery(q)
    abortRef.current?.abort()
    if (!q) { setResults([]); return }
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const res = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
      setResults(await res.json())
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') setError(err.message)
    }
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-50" onClick={onClose}>
      <div className="glass-sheet" onClick={e => e.stopPropagation()}>
        {/* Drag pill */}
        <div className="w-10 h-1 rounded-full bg-zinc-700 mx-auto mb-5" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-varsity text-white text-2xl tracking-wide">Registrar Entrada</h2>
          <button onClick={onClose} className="text-zinc-500 p-1 active:text-zinc-300 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

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
              className="list-row w-full text-left disabled:opacity-50">
              <span className="text-white font-medium text-sm">{p.firstName} {p.lastName}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF8C00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
