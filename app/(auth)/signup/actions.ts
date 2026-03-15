'use server'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

type UserRole = 'admin' | 'property_manager' | 'tenant'

export async function registerUser(
  email: string,
  password: string,
  fullName: string,
  role: string = 'property_manager'
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const validRole: UserRole =
    role === 'admin' || role === 'property_manager' || role === 'tenant'
      ? (role as UserRole)
      : 'property_manager'

  // Create user in Supabase Auth (email already confirmed)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: validRole,
    },
  })

  if (error) {
    return { success: false, error: error.message }
  }

  // Create profile in profiles table
  if (data.user?.id) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: data.user.id,
          email,
          full_name: fullName,
          role: validRole,
        },
        { onConflict: 'id' }
      )

    if (profileError) {
      console.error('Error creating profile:', profileError)
    }
  }

  return { success: true, error: null }
}
