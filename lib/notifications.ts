import { Resend } from 'resend'
import { render } from '@react-email/render'
import { ReminderEmail } from '@/emails/reminder'
import { OverdueEmail } from '@/emails/overdue'
import type { Player } from '@prisma/client'

if (!process.env.RESEND_API_KEY) {
  console.warn('[notifications] RESEND_API_KEY is not set — emails will fail at runtime')
}

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendNotification(
  player: Pick<Player, 'guardianEmail' | 'guardianName' | 'firstName' | 'lastName'>,
  type: 'reminder' | 'overdue'
): Promise<void> {
  const fromEmail = process.env.RESEND_FROM_EMAIL
  if (!fromEmail) throw new Error('RESEND_FROM_EMAIL env var is not set')

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

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: player.guardianEmail,
    subject,
    html,
  })

  if (error) {
    throw new Error(`Resend error [${error.name}]: ${error.message}`)
  }
}
