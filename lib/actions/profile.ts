'use server'

import { auth } from '@/lib/auth/config'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(formData: FormData): Promise<{ error: string | null }> {
  const session = await auth()
  if (!session?.supabaseAccessToken) {
    return { error: 'Not authenticated' }
  }

  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken)

  const full_name = (formData.get('full_name') as string)?.trim() || null
  const phone = (formData.get('phone') as string)?.trim() || null

  const { error } = await supabase
    .from('profiles')
    .update({ full_name, phone })
    .eq('id', session.user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/portal/profile')
  revalidatePath('/dashboard/profile')
  return { error: null }
}
