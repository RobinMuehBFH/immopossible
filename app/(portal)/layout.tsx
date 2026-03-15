import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { PortalHeader } from './components/portal-header'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  // Redirect non-tenants to dashboard
  if (session.user.role !== 'tenant') {
    redirect('/dashboard')
  }

  // Fetch full profile (avatar_url, phone, etc.) using authenticated client
  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken!)
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader profile={profile} />
      <main className="p-6">{children}</main>
    </div>
  )
}
