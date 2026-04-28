'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function IconHome({ active }: { active: boolean }) {
  const c = active ? '#FF8C00' : '#52525b'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

function IconPlayers({ active }: { active: boolean }) {
  const c = active ? '#FF8C00' : '#52525b'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
    </svg>
  )
}

function IconAttendance({ active }: { active: boolean }) {
  const c = active ? '#FF8C00' : '#52525b'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function IconPayments({ active }: { active: boolean }) {
  const c = active ? '#FF8C00' : '#52525b'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  )
}

function IconAnalytics({ active }: { active: boolean }) {
  const c = active ? '#FF8C00' : '#52525b'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7" width="4" height="14" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  )
}

const links = [
  { href: '/',           label: 'Inicio',     Icon: IconHome },
  { href: '/players',    label: 'Jugadores',  Icon: IconPlayers },
  { href: '/attendance', label: 'Asistencia', Icon: IconAttendance },
  { href: '/payments',   label: 'Pagos',      Icon: IconPayments },
  { href: '/analytics',  label: 'Analytics',  Icon: IconAnalytics },
]

export function BottomNav() {
  const path = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-white/[0.07] flex pb-safe">
      {links.map(({ href, label, Icon }) => {
        const isActive = href === '/' ? path === '/' : path === href || path.startsWith(href + '/')
        return (
          <Link key={href} href={href}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 relative">
            <Icon active={isActive} />
            <span className={`text-[10px] font-medium tracking-wide transition-colors ${isActive ? 'text-evg-orange' : 'text-zinc-600'}`}>
              {label}
            </span>
            {isActive && (
              <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-evg-orange glow-pulse" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
