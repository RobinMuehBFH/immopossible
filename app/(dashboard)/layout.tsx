'use client'

import { DashboardNav } from './components/dashboard-nav'
import { DashboardHeader } from './components/dashboard-header'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Profile } from '@/lib/types/database.types'

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
  const [isOpen, setIsOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      const { createClient: createBrowserClient } = await import('@/lib/supabase/client')
      const supabase = createBrowserClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        window.location.href = '/login'
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // Only allow admin and property_manager roles
      if (profileData?.role === 'tenant') {
        window.location.href = '/portal'
        return
      }

      setProfile(profileData)
      setLoading(false)
    }

    loadUser()
  }, [])

  if (loading) {
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
          <DashboardHeader profile={profile} />
          <main className="min-h-[calc(100vh-80px)] p-6">{children}</main>
        </div>
      </div>
    </SidebarContext.Provider>
  )
}
