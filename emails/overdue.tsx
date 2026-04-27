import { Html, Body, Text, Heading } from '@react-email/components'

interface Props {
  guardianName: string
  playerName: string
}

export function OverdueEmail({ guardianName, playerName }: Props) {
  return (
    <Html>
      <Body style={{ fontFamily: 'sans-serif', background: '#000', color: '#fff', padding: '24px' }}>
        <Heading style={{ color: '#FF8C00' }}>EVG Training 🏀</Heading>
        <Text>
          Hola {guardianName}, notamos que el pago de la suscripción de{' '}
          <strong>{playerName}</strong> en EVG Training presenta un retraso de al menos 3 días.
          Por favor, confímanos el pago para mantener su registro al día. ¡Gracias!
        </Text>
      </Body>
    </Html>
  )
}
