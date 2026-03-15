import { auth } from './config'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/types/next-auth'

/**
 * Requires an authenticated user.
 * Redirects to /login if not logged in.
 */
export async function requireAuth() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }
  return session
}

/**
 * Requires admin role.
 * Redirects to /dashboard if not authorized.
 */
export async function requireAdmin() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }
  if (session.user.role !== 'admin') {
    redirect('/dashboard?error=unauthorized')
  }
  return session
}

/**
 * Requires property_manager or admin role (dashboard access).
 * Redirects to /portal if role is tenant.
 */
export async function requireDashboardAccess() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }
  if (session.user.role === 'tenant') {
    redirect('/portal')
  }
  return session
}

/**
 * Returns the user role without redirecting (for conditional rendering).
 */
export async function getUserRole(): Promise<UserRole | null> {
  const session = await auth()
  return session?.user?.role || null
}

/**
 * Checks if the user is an admin (without redirect).
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth()
  return session?.user?.role === 'admin'
}
