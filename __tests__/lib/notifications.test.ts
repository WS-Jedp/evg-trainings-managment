// Test that the notification type signature is correct
// (Resend is mocked — we test the function exists and is callable)

jest.mock('@react-email/render', () => ({
  render: jest.fn().mockResolvedValue('<html>mocked</html>'),
}))

const mockSend = jest.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null })

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}))

jest.mock('@/emails/reminder', () => ({
  ReminderEmail: () => '<html>reminder</html>',
}))

jest.mock('@/emails/overdue', () => ({
  OverdueEmail: () => '<html>overdue</html>',
}))

describe('sendNotification', () => {
  const player = {
    guardianEmail: 'guardian@test.com',
    guardianName: 'Ana García',
    firstName: 'Juan',
    lastName: 'Pérez',
  } as any

  beforeEach(() => {
    mockSend.mockClear()
    process.env.RESEND_FROM_EMAIL = 'noreply@evgtraining.com'
  })

  it('sends a reminder email to guardianEmail', async () => {
    const { sendNotification } = await import('@/lib/notifications')
    await sendNotification(player, 'reminder')

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'guardian@test.com',
        subject: 'Recordatorio de pago — EVG Training',
      })
    )
  })

  it('sends an overdue email to guardianEmail', async () => {
    const { sendNotification } = await import('@/lib/notifications')
    await sendNotification(player, 'overdue')

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'guardian@test.com',
        subject: 'Aviso de mora — EVG Training',
      })
    )
  })

  it('throws when Resend returns an error', async () => {
    mockSend.mockResolvedValueOnce({ data: null, error: { name: 'validation_error', message: 'Invalid email' } })
    const { sendNotification } = await import('@/lib/notifications')

    await expect(sendNotification(player, 'reminder')).rejects.toThrow('Resend error')
  })
})
