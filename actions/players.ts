'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { calcSubscriptionEnd } from '@/lib/dates'

export async function createPlayer(formData: FormData) {
  await requireAuth()

  const age = Number(formData.get('age'))
  const guardianEmailInput = (formData.get('guardianEmail') as string) ?? ''
  const playerEmail = (formData.get('email') as string).trim()
  const weeklySessions = Number(formData.get('weeklySessions'))
  const subscriptionStartRaw = formData.get('subscriptionStart') as string

  if (weeklySessions !== 3 && weeklySessions !== 5) {
    throw new Error('weeklySessions must be 3 or 5')
  }

  const guardianName = (formData.get('guardianName') as string) ?? ''
  if (age < 18 && !guardianName) {
    throw new Error('guardianName is required for players under 18')
  }

  const guardianEmail = !guardianEmailInput ? playerEmail : guardianEmailInput

  const subscriptionStart = new Date(subscriptionStartRaw)
  subscriptionStart.setUTCHours(0, 0, 0, 0)
  const subscriptionEnd = calcSubscriptionEnd(subscriptionStart)

  const photoUrl = (formData.get('photoUrl') as string) || null

  try {
    await prisma.player.create({
      data: {
        firstName: (formData.get('firstName') as string).trim(),
        lastName: (formData.get('lastName') as string).trim(),
        age,
        height: formData.get('height') ? Number(formData.get('height')) : null,
        photoUrl,
        eps: (formData.get('eps') as string).trim(),
        phone: (formData.get('phone') as string).trim(),
        email: playerEmail,
        guardianName: guardianName || null,
        guardianPhone: (formData.get('guardianPhone') as string) || null,
        guardianEmail,
        weeklySessions,
        subscriptionStart,
        subscriptionEnd,
      },
    })
  } catch {
    throw new Error('Error al guardar el jugador. Verifica los datos e intenta de nuevo.')
  }

  revalidatePath('/players')
  redirect('/players')
}

export async function updatePlayer(id: string, formData: FormData) {
  await requireAuth()

  const age = Number(formData.get('age'))
  const weeklySessions = Number(formData.get('weeklySessions'))
  if (weeklySessions !== 3 && weeklySessions !== 5) throw new Error('weeklySessions must be 3 or 5')

  const guardianEmailInput = (formData.get('guardianEmail') as string) ?? ''
  const playerEmail = (formData.get('email') as string).trim()
  const guardianEmail = !guardianEmailInput ? playerEmail : guardianEmailInput

  try {
    await prisma.player.update({
      where: { id },
      data: {
        firstName: (formData.get('firstName') as string).trim(),
        lastName: (formData.get('lastName') as string).trim(),
        age,
        height: formData.get('height') ? Number(formData.get('height')) : null,
        eps: (formData.get('eps') as string).trim(),
        phone: (formData.get('phone') as string).trim(),
        email: playerEmail,
        guardianName: (formData.get('guardianName') as string) || null,
        guardianPhone: (formData.get('guardianPhone') as string) || null,
        guardianEmail,
        weeklySessions,
      },
    })
  } catch {
    throw new Error('Error al guardar el jugador. Verifica los datos e intenta de nuevo.')
  }

  revalidatePath('/players')
  revalidatePath(`/players/${id}`)
  redirect(`/players/${id}`)
}

export async function deletePlayer(id: string) {
  await requireAuth()
  try {
    await prisma.player.delete({ where: { id } })
  } catch {
    throw new Error('Error al eliminar el jugador. Intenta de nuevo.')
  }
  revalidatePath('/players')
  redirect('/players')
}
