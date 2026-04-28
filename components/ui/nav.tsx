'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: '🏠', title: 'Inicio' },
  { href: '/players', label: '👤', title: 'Jugadores' },
  { href: '/attendance', label: '✅', title: 'Asistencia' },
  { href: '/payments', label: '💳', title: 'Pagos' },
  { href: '/analytics', label: '📊', title: 'Analytics' },
]

export function BottomNav() {
  const path = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 flex z-40">
      {links.map(l => {
        const isActive = l.href === '/' ? path === '/' : path === l.href || path.startsWith(l.href + '/')
        return (
          <Link key={l.href} href={l.href}
            className={`flex-1 flex flex-col items-center py-3 text-lg ${
              isActive ? 'text-evg-orange' : 'text-zinc-500'
            }`}>
            <span>{l.label}</span>
            <span className="text-xs">{l.title}</span>
          </Link>
        )
      })}
    </nav>
  )
}
