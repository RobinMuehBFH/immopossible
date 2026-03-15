import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

/**
 * Creates a Supabase client with the service role key.
 * This client bypasses RLS and should ONLY be used server-side.
 *
 * Use cases:
 * - AI agent operations
 * - Webhook handlers (email/WhatsApp intake)
 * - Admin operations that need to bypass RLS
 *
 * NEVER expose this client or the service role key to the browser.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
    )
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Singleton admin client for agent tools.
 * Uses a Proxy so env vars are resolved lazily on first use.
 */
let _instance: ReturnType<typeof createAdminClient> | null = null

export const adminSupabase = new Proxy(
  {} as ReturnType<typeof createAdminClient>,
  {
    get(_target, prop) {
      if (!_instance) _instance = createAdminClient()
      return _instance[prop as keyof ReturnType<typeof createAdminClient>]
    },
  }
)
