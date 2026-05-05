import type { Player } from '@prisma/client'

// Email notifications disabled — will be enabled when Resend is configured
export async function sendNotification(
  _player: Pick<Player, 'guardianEmail' | 'guardianName' | 'firstName' | 'lastName'>,
  _type: 'reminder' | 'overdue'
): Promise<void> {
  console.log('[notifications] disabled — skipping email send')
}
