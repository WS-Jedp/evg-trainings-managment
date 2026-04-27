import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendNotification } from '@/lib/notifications'
import { startOfDayUTC } from '@/lib/dates'
import { requireCronSecret } from '@/lib/auth'

export async function GET(req: NextRequest) {
  if (!requireCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const threeDaysAgoStart = startOfDayUTC(new Date(now.getTime() - 3 * 86400000))
  const todayStart = startOfDayUTC(now)

  // Only PENDIENTE players — VENCIDO players have already received the overdue notice
  const players = await prisma.player.findMany({
    where: {
      subscriptionEnd: { lt: threeDaysAgoStart },
      payStatus: { notIn: ['PAGADO', 'VENCIDO'] },
      OR: [
        { lastOverdueSentAt: null },
        { lastOverdueSentAt: { lt: todayStart } },
      ],
    },
    select: { id: true, guardianEmail: true, guardianName: true, firstName: true, lastName: true },
  })

  const results = await Promise.allSettled(
    players.map(async player => {
      // Update DB FIRST so the guard is set before email is sent.
      // If email fails, no duplicate will be sent on retry.
      // If DB fails, the error is captured by allSettled.
      await prisma.player.update({
        where: { id: player.id },
        data: {
          payStatus: 'VENCIDO',
          lastOverdueSentAt: now,
        },
      })
      await sendNotification(player, 'overdue')
    })
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  console.log(`[cron/overdue] sent=${sent} failed=${failed}`)
  return NextResponse.json({ sent, failed })
}
