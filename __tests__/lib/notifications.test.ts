// Test that the notification type signature is correct
// (Resend is mocked — we test the function exists and is callable)

jest.mock('@react-email/render', () => ({
  render: jest.fn().mockResolvedValue('<html>mocked</html>'),
}))

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: 'mock-id' }),
    },
  })),
}))

jest.mock('@/emails/reminder', () => ({
  ReminderEmail: () => '<html>reminder</html>',
}))

jest.mock('@/emails/overdue', () => ({
  OverdueEmail: () => '<html>overdue</html>',
}))

describe('sendNotification', () => {
  it('can be imported and called', async () => {
    const { sendNotification } = await import('@/lib/notifications')
    const player = {
      guardianEmail: 'guardian@test.com',
      guardianName: 'Ana García',
      firstName: 'Juan',
      lastName: 'Pérez',
    } as any

    await expect(sendNotification(player, 'reminder')).resolves.not.toThrow()
    await expect(sendNotification(player, 'overdue')).resolves.not.toThrow()
  })
})
