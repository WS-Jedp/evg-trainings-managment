import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { updatePlayer } from '@/actions/players'
import { PlayerForm } from '@/components/ui/player-form'

export default async function EditPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const player = await prisma.player.findUnique({ where: { id } })
  if (!player) notFound()

  const action = updatePlayer.bind(null, id)

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="page-title mb-6">Editar Jugador</h1>
      <PlayerForm
        action={action}
        showSubscriptionStart={false}
        defaultValues={{
          firstName: player.firstName,
          lastName: player.lastName,
          age: player.age,
          height: player.height ?? undefined,
          eps: player.eps,
          phone: player.phone,
          email: player.email,
          guardianName: player.guardianName ?? undefined,
          guardianPhone: player.guardianPhone ?? undefined,
          guardianEmail: player.guardianEmail,
          weeklySessions: player.weeklySessions,
        }}
      />
    </div>
  )
}
