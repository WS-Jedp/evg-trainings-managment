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
  const tomorrowStart = startOfDayUTC(new Date(now.getTime() + 86400000))
  const dayAfterTomorrowStart = new Date(tomorrowStart)
  dayAfterTomorrowStart.setUTCDate(dayAfterTomorrowStart.getUTCDate() + 1)
  const todayStart = startOfDayUTC(now)

  const players = await prisma.player.findMany({
    where: {
      subscriptionEnd: { gte: tomorrowStart, lt: dayAfterTomorrowStart },
      payStatus: { not: 'PAGADO' },
      OR: [
        { lastReminderSentAt: null },
        { lastReminderSentAt: { lt: todayStart } },
      ],
    },
    select: { id: true, guardianEmail: true, guardianName: true, firstName: true, lastName: true },
  })

  const results = await Promise.allSettled(
    players.map(async player => {
      // Stamp FIRST — if email fails on retry the guard prevents duplicates.
      await prisma.player.update({
        where: { id: player.id },
        data: { lastReminderSentAt: now },
      })
      await sendNotification(player, 'reminder')
    })
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  console.log(`[cron/reminders] sent=${sent} failed=${failed}`)
  return NextResponse.json({ sent, failed })
}
