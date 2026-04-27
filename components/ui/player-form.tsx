'use client'
import { useState } from 'react'

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
  }
  showSubscriptionStart?: boolean
}

export function PlayerForm({ action, defaultValues = {}, showSubscriptionStart = true }: PlayerFormProps) {
  const [age, setAge] = useState(defaultValues.age ?? 18)

  return (
    <form action={action} className="space-y-4 max-w-lg">
      <div className="grid grid-cols-2 gap-4">
        <input name="firstName" placeholder="Nombre" defaultValue={defaultValues.firstName}
          required className="input-field" />
        <input name="lastName" placeholder="Apellido" defaultValue={defaultValues.lastName}
          required className="input-field" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <input name="age" type="number" placeholder="Edad" value={age}
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

      <hr className="border-zinc-800" />
      <p className="text-zinc-400 text-sm">Acudiente {age < 18 ? '(obligatorio)' : '(opcional)'}</p>

      <input name="guardianName" placeholder="Nombre del acudiente"
        defaultValue={defaultValues.guardianName} required={age < 18} className="input-field" />
      <input name="guardianPhone" placeholder="WhatsApp del acudiente"
        defaultValue={defaultValues.guardianPhone} className="input-field" />
      <input name="guardianEmail" type="email" placeholder="Correo del acudiente"
        defaultValue={defaultValues.guardianEmail} className="input-field" />

      <hr className="border-zinc-800" />

      <select name="weeklySessions" defaultValue={defaultValues.weeklySessions ?? 3}
        required className="input-field">
        <option value={3}>3 sesiones/semana</option>
        <option value={5}>5 sesiones/semana</option>
      </select>

      {showSubscriptionStart && (
        <div>
          <label className="text-zinc-400 text-sm mb-1 block">Fecha de inicio</label>
          <input name="subscriptionStart" type="date" defaultValue={defaultValues.subscriptionStart}
            required className="input-field" />
        </div>
      )}

      <button type="submit"
        className="w-full bg-evg-orange text-black font-bold py-3 rounded-lg">
        Guardar
      </button>
    </form>
  )
}
