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
  const playerEmail = formData.get('email') as string
  const weeklySessions = Number(formData.get('weeklySessions'))
  const subscriptionStartRaw = formData.get('subscriptionStart') as string

  if (weeklySessions !== 3 && weeklySessions !== 5) {
    throw new Error('weeklySessions must be 3 or 5')
  }

  const guardianName = (formData.get('guardianName') as string) ?? ''
  if (age < 18 && !guardianName) {
    throw new Error('guardianName is required for players under 18')
  }

  const guardianEmail = age >= 18 && !guardianEmailInput ? playerEmail : guardianEmailInput

  const subscriptionStart = new Date(subscriptionStartRaw)
  subscriptionStart.setUTCHours(0, 0, 0, 0)
  const subscriptionEnd = calcSubscriptionEnd(subscriptionStart)

  const photoUrl = (formData.get('photoUrl') as string) || null

  await prisma.player.create({
    data: {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      age,
      height: formData.get('height') ? Number(formData.get('height')) : null,
      photoUrl,
      eps: formData.get('eps') as string,
      phone: formData.get('phone') as string,
      email: playerEmail,
      guardianName: guardianName || null,
      guardianPhone: (formData.get('guardianPhone') as string) || null,
      guardianEmail,
      weeklySessions,
      subscriptionStart,
      subscriptionEnd,
    },
  })

  revalidatePath('/players')
  redirect('/players')
}

export async function updatePlayer(id: string, formData: FormData) {
  await requireAuth()

  const age = Number(formData.get('age'))
  const weeklySessions = Number(formData.get('weeklySessions'))
  if (weeklySessions !== 3 && weeklySessions !== 5) throw new Error('weeklySessions must be 3 or 5')

  const guardianEmailInput = (formData.get('guardianEmail') as string) ?? ''
  const playerEmail = formData.get('email') as string
  const guardianEmail = age >= 18 && !guardianEmailInput ? playerEmail : guardianEmailInput

  await prisma.player.update({
    where: { id },
    data: {
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      age,
      height: formData.get('height') ? Number(formData.get('height')) : null,
      eps: formData.get('eps') as string,
      phone: formData.get('phone') as string,
      email: playerEmail,
      guardianName: (formData.get('guardianName') as string) || null,
      guardianPhone: (formData.get('guardianPhone') as string) || null,
      guardianEmail,
      weeklySessions,
    },
  })

  revalidatePath('/players')
  revalidatePath(`/players/${id}`)
  redirect(`/players/${id}`)
}

export async function deletePlayer(id: string) {
  await requireAuth()
  await prisma.player.delete({ where: { id } })
  revalidatePath('/players')
  redirect('/players')
}
