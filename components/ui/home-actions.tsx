'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckInModal } from './checkin-modal'
import { CheckoutList, type OpenAttendance } from './checkout-list'

export function HomeActions({ openAttendances }: { openAttendances: OpenAttendance[] }) {
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
      <div className="grid grid-cols-1 gap-3">
        <button onClick={() => setShowCheckin(true)}
          className="bg-evg-orange text-black font-bold py-5 rounded-xl text-lg flex items-center justify-center gap-2">
          + Registrar Entrada
        </button>
        <button onClick={() => setShowCheckout(true)}
          className="border border-zinc-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
          - Registrar Salida
        </button>
        <Link href="/payments?filter=PENDIENTE"
          className="border border-evg-orange text-evg-orange font-bold py-4 rounded-xl flex items-center justify-center gap-2">
          🔔 Pagos Pendientes
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
