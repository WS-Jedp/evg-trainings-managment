import { Resend } from 'resend'
import { render } from '@react-email/render'
import { ReminderEmail } from '@/emails/reminder'
import { OverdueEmail } from '@/emails/overdue'
import type { Player } from '@prisma/client'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendNotification(
  player: Pick<Player, 'guardianEmail' | 'guardianName' | 'firstName' | 'lastName'>,
  type: 'reminder' | 'overdue'
): Promise<void> {
  const guardianName = player.guardianName ?? player.firstName
  const playerName = `${player.firstName} ${player.lastName}`

  const { subject, html } =
    type === 'reminder'
      ? {
          subject: `Recordatorio de pago — EVG Training`,
          html: await render(ReminderEmail({ guardianName, playerName })),
        }
      : {
          subject: `Aviso de mora — EVG Training`,
          html: await render(OverdueEmail({ guardianName, playerName })),
        }

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: player.guardianEmail,
    subject,
    html,
  })
}
