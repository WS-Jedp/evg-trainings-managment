'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { calcSubscriptionEnd, formatPeriod } from '@/lib/dates'

export async function markAsPaid(playerId: string): Promise<{ error?: string }> {
  await requireAuth()

  const player = await prisma.player.findUnique({ where: { id: playerId } })
  if (!player) return { error: 'Jugador no encontrado.' }

  // Guard: if already PAGADO, subscriptionEnd has already been advanced.
  // Calling markAsPaid again would silently advance it a second month.
  if (player.payStatus === 'PAGADO') return { error: 'El jugador ya está al día.' }

  const period = formatPeriod(player.subscriptionEnd)
  const newSubscriptionEnd = calcSubscriptionEnd(player.subscriptionEnd)

  try {
    await prisma.$transaction([
      prisma.player.update({
        where: { id: playerId },
        data: {
          payStatus: 'PAGADO',
          subscriptionEnd: newSubscriptionEnd,
          lastReminderSentAt: null,
          lastOverdueSentAt: null,
        },
      }),
      prisma.paymentRecord.create({
        data: { playerId, period },
      }),
    ])
  } catch (err) {
    // P2002: unique constraint — concurrent request already recorded this payment
    if ((err as { code?: string })?.code === 'P2002') {
      return { error: 'El pago de este período ya fue registrado.' }
    }
    throw err
  }

  revalidatePath('/payments')
  revalidatePath(`/players/${playerId}`)
  return {}
}
