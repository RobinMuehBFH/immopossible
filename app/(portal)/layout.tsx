import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PortalHeader } from './components/portal-header'

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Redirect non-tenants to dashboard
  if (profile?.role !== 'tenant') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader profile={profile} />
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  )
}
