'use server'

import { signOut as nextAuthSignOut } from '@/lib/auth/config'

export async function signOut() {
  await nextAuthSignOut({ redirectTo: '/login' })
}
