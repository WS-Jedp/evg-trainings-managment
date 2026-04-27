'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { startOfDayUTC } from '@/lib/dates'

export async function checkIn(playerId: string): Promise<{ error?: string }> {
  await requireAuth()

  const todayStart = startOfDayUTC(new Date())
  const todayEnd = new Date(todayStart)
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1)

  // Check for duplicate open check-in
  const existing = await prisma.attendance.findFirst({
    where: {
      playerId,
      checkIn: { gte: todayStart, lt: todayEnd },
      checkOut: null,
    },
  })

  if (existing) {
    return { error: 'Este jugador ya está en sesión.' }
  }

  await prisma.attendance.create({ data: { playerId } })
  revalidatePath('/')
  revalidatePath('/attendance')
  return {}
}

export async function checkOut(attendanceId: string): Promise<{ error?: string }> {
  await requireAuth()

  const record = await prisma.attendance.findUnique({ where: { id: attendanceId } })
  if (!record) return { error: 'Registro no encontrado.' }
  if (record.checkOut !== null) return { error: 'La salida ya fue registrada.' }

  await prisma.attendance.update({
    where: { id: attendanceId },
    data: { checkOut: new Date() },
  })

  revalidatePath('/')
  revalidatePath('/attendance')
  return {}
}
