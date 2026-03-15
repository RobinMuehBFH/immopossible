'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { DashboardNav } from './components/dashboard-nav'
import { DashboardHeader } from './components/dashboard-header'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Profile } from '@/lib/types/database.types'
import { createAuthenticatedBrowserClient } from '@/lib/supabase/client'

// Sidebar context
interface SidebarContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function useSidebarContext() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebarContext must be used within a SidebarProvider')
  }
  return context
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.replace('/login')
      return
    }

    if (session.user.role === 'tenant') {
      router.replace('/portal')
      return
    }

    async function loadProfile() {
      if (!session?.supabaseAccessToken) return

      const supabase = createAuthenticatedBrowserClient(session.supabaseAccessToken)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      setProfile(profileData)
      setLoading(false)
    }

    loadProfile()
  }, [session, status, router])

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="purity-gradient h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    )
  }

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="min-h-screen bg-background">
        <DashboardNav profile={profile} />
        <div className="lg:ml-[280px]">
          <DashboardHeader />
          <main className="min-h-[calc(100vh-80px)] p-6">{children}</main>
        </div>
      </div>
    </SidebarContext.Provider>
  )
}
