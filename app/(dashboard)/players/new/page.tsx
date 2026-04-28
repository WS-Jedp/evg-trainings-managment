import { createPlayer } from '@/actions/players'
import { PlayerForm } from '@/components/ui/player-form'

export default function NewPlayerPage() {
  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="page-title mb-6">Nuevo Jugador</h1>
      <PlayerForm action={createPlayer} showSubscriptionStart={true} />
    </div>
  )
}
