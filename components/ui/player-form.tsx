'use client'
import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { PayStatus } from '@prisma/client'

interface PlayerFormProps {
  action: (formData: FormData) => Promise<void>
  defaultValues?: {
    firstName?: string
    lastName?: string
    age?: number
    height?: number
    eps?: string
    phone?: string
    email?: string
    guardianName?: string
    guardianPhone?: string
    guardianEmail?: string
    weeklySessions?: number
    subscriptionStart?: string
    payStatus?: PayStatus
  }
  showSubscriptionStart?: boolean
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
    >
      {pending ? 'Guardando...' : 'Guardar Jugador'}
    </button>
  )
}


const STATUS_OPTIONS: { value: PayStatus; label: string; activeClass: string; dotClass: string }[] = [
  {
    value: 'PAGADO',
    label: 'Pagado',
    activeClass: 'bg-emerald-950 border-emerald-500 text-emerald-400',
    dotClass: 'bg-emerald-400',
  },
  {
    value: 'PENDIENTE',
    label: 'Pendiente',
    activeClass: 'bg-amber-950 border-amber-500 text-amber-400',
    dotClass: 'bg-amber-400',
  },
  {
    value: 'VENCIDO',
    label: 'Vencido',
    activeClass: 'bg-red-950 border-red-500 text-red-400',
    dotClass: 'bg-red-400',
  },
]

export function PlayerForm({ action, defaultValues = {}, showSubscriptionStart = true }: PlayerFormProps) {
  const [age, setAge] = useState(defaultValues.age ?? 18)
  const [payStatus, setPayStatus] = useState<PayStatus>(defaultValues.payStatus ?? 'PENDIENTE')

  return (
    <form action={action} className="space-y-4 max-w-lg">
      {/* Personal info */}
      <div className="grid grid-cols-2 gap-3">
        <input name="firstName" placeholder="Nombre" defaultValue={defaultValues.firstName}
          required className="input-field" />
        <input name="lastName" placeholder="Apellido" defaultValue={defaultValues.lastName}
          required className="input-field" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input name="age" type="number" placeholder="Edad" value={age} min={1} max={99}
          onChange={e => setAge(Number(e.target.value))} required className="input-field" />
        <input name="height" type="number" step="0.01" placeholder="Altura (m) — opcional"
          defaultValue={defaultValues.height} className="input-field" />
      </div>

      <input name="eps" placeholder="EPS" defaultValue={defaultValues.eps}
        required className="input-field" />
      <input name="phone" placeholder="Teléfono" defaultValue={defaultValues.phone}
        required className="input-field" />
      <input name="email" type="email" placeholder="Correo del jugador"
        defaultValue={defaultValues.email} required className="input-field" />

      {/* Guardian */}
      <div className="divider" />
      <p className="text-zinc-500 text-xs uppercase tracking-widest font-medium">
        Acudiente {age < 18 ? '(obligatorio)' : '(opcional)'}
      </p>

      <input name="guardianName" placeholder="Nombre del acudiente"
        defaultValue={defaultValues.guardianName} required={age < 18} className="input-field" />
      <input name="guardianPhone" placeholder="WhatsApp del acudiente"
        defaultValue={defaultValues.guardianPhone} className="input-field" />
      <input name="guardianEmail" type="email" placeholder="Correo del acudiente"
        defaultValue={defaultValues.guardianEmail} className="input-field" />

      {/* Sessions */}
      <div className="divider" />

      <select name="weeklySessions" defaultValue={defaultValues.weeklySessions ?? 3}
        required className="input-field">
        <option value="3">3 sesiones / semana</option>
        <option value="5">5 sesiones / semana</option>
      </select>

      {/* Subscription & Payment — shown on creation only */}
      {showSubscriptionStart && (
        <>
          <div className="divider" />
          <p className="text-zinc-500 text-xs uppercase tracking-widest font-medium">
            Suscripción y Pago
          </p>

          {/* Subscription start date */}
          <div>
            <label className="text-zinc-500 text-xs uppercase tracking-widest font-medium mb-2 block">
              Fecha de inscripción
            </label>
            <input
              name="subscriptionStart"
              type="date"
              defaultValue={defaultValues.subscriptionStart}
              required
              className="input-field"
            />
          </div>

          {/* Payment status toggle */}
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-medium mb-3">
              Estado del pago
            </p>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map(opt => {
                const isActive = payStatus === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPayStatus(opt.value)}
                    className={`relative flex flex-col items-center gap-2 py-3.5 px-2 rounded-2xl border transition-all duration-150
                      ${isActive
                        ? opt.activeClass
                        : 'bg-zinc-900 border-white/[0.07] text-zinc-500'
                      }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${isActive ? opt.dotClass : 'bg-zinc-700'}`} />
                    <span className="text-xs font-bold uppercase tracking-wide">{opt.label}</span>
                  </button>
                )
              })}
            </div>
            {/* Hidden input for form submission */}
            <input type="hidden" name="payStatus" value={payStatus} />
          </div>
        </>
      )}

      <SubmitButton />
    </form>
  )
}
