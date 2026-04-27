import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Call at the top of every Server Action.
 * Throws (redirects to /login) if no valid session.
 * Returns the authenticated user.
 */
export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')
  return user
}

/** Validate CRON_SECRET bearer token. Use only in API route handlers. */
export function requireCronSecret(req: Request): boolean {
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${process.env.CRON_SECRET}`
}
