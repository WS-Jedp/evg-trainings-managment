import { Html, Body, Text, Heading } from '@react-email/components'

interface Props {
  guardianName: string
  playerName: string
}

export function ReminderEmail({ guardianName, playerName }: Props) {
  return (
    <Html>
      <Body style={{ fontFamily: 'sans-serif', background: '#000', color: '#fff', padding: '24px' }}>
        <Heading style={{ color: '#FF8C00' }}>EVG Training 🏀</Heading>
        <Text>
          Hola {guardianName}, te saludamos de EVG Training 🏀. Te recordamos que el plan de
          entrenamiento de <strong>{playerName}</strong> vence el día de mañana. ¡Sigamos
          trabajando por su alto rendimiento!
        </Text>
      </Body>
    </Html>
  )
}
