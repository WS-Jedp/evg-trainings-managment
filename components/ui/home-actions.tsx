'use client'
import { useState } from 'react'
import { CheckInModal } from './checkin-modal'
import { CheckoutList } from './checkout-list'
import Link from 'next/link'

export function HomeActions({ openAttendances }: { openAttendances: any[] }) {
  const [showCheckin, setShowCheckin] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)

  return (
    <>
      <div className="grid grid-cols-1 gap-3">
        <button onClick={() => setShowCheckin(true)}
          className="bg-evg-orange text-black font-bold py-5 rounded-xl text-lg flex items-center justify-center gap-2">
          ＋ Registrar Entrada
        </button>
        <button onClick={() => setShowCheckout(true)}
          className="border border-zinc-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
          － Registrar Salida
        </button>
        <Link href="/payments?filter=PENDIENTE"
          className="border border-evg-orange text-evg-orange font-bold py-4 rounded-xl flex items-center justify-center gap-2">
          🔔 Pagos Pendientes
        </Link>
      </div>

      {showCheckin && <CheckInModal onClose={() => setShowCheckin(false)} />}
      {showCheckout && (
        <CheckoutList
          attendances={openAttendances}
          onDone={() => setShowCheckout(false)}
        />
      )}
    </>
  )
}
