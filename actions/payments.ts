'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { calcSubscriptionEnd, formatPeriod } from '@/lib/dates'

export async function markAsPaid(playerId: string) {
  await requireAuth()

  const player = await prisma.player.findUnique({ where: { id: playerId } })
  if (!player) throw new Error('Player not found')

  // Guard: if already PAGADO, subscriptionEnd has already been advanced.
  // Calling markAsPaid again would silently advance it a second month.
  if (player.payStatus === 'PAGADO') return

  const period = formatPeriod(player.subscriptionEnd)
  const newSubscriptionEnd = calcSubscriptionEnd(player.subscriptionEnd)

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

  revalidatePath('/payments')
  revalidatePath(`/players/${playerId}`)
}
