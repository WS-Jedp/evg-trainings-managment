import { createPlayer } from '@/actions/players'
import { PlayerForm } from '@/components/ui/player-form'

export default function NewPlayerPage() {
  return (
    <div className="p-4">
      <h1 className="font-varsity text-evg-orange text-2xl mb-6">Nuevo Jugador</h1>
      <PlayerForm action={createPlayer} showSubscriptionStart={true} />
    </div>
  )
}
