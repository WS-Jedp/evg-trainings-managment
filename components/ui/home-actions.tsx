'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckInModal } from './checkin-modal'
import { CheckoutList, type OpenAttendance } from './checkout-list'

export function HomeActions({ openAttendances, pendingCount = 0 }: { openAttendances: OpenAttendance[]; pendingCount?: number }) {
  const router = useRouter()
  const [showCheckin, setShowCheckin] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)

  function handleCheckinClose() {
    setShowCheckin(false)
    router.refresh()
  }

  function handleCheckoutDone() {
    setShowCheckout(false)
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <button onClick={() => setShowCheckin(true)} className="btn-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v8M8 12h8" />
          </svg>
          Registrar Entrada
        </button>
        <button onClick={() => setShowCheckout(true)} className="btn-secondary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8" />
          </svg>
          Registrar Salida
        </button>
        <Link href="/payments?filter=PENDIENTE" className="btn-tertiary relative">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          Pagos Pendientes
          {pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-evg-orange text-black text-[10px] font-black flex items-center justify-center px-1 leading-none">
              {pendingCount}
            </span>
          )}
        </Link>
      </div>

      {showCheckin && <CheckInModal onClose={handleCheckinClose} />}
      {showCheckout && (
        <CheckoutList
          attendances={openAttendances}
          onDone={handleCheckoutDone}
        />
      )}
    </>
  )
}
