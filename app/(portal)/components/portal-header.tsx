'use client'

import Link from 'next/link'
import { Profile } from '@/lib/types/database.types'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, User, Plus } from 'lucide-react'
import { SignOutConfirmDialog } from '@/components/sign-out-confirm-dialog'
import { Home } from 'lucide-react'

interface PortalHeaderProps {
  profile: Profile | null
}

export function PortalHeader({ profile }: PortalHeaderProps) {
  const initials =
    profile?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() ||
    profile?.email?.[0]?.toUpperCase() ||
    '?'

  return (
    <header className="flex h-20 items-center justify-between bg-white px-6 shadow-sm dark:bg-[#1A202C]">
      {/* Logo */}
      <Link href="/portal" className="flex items-center gap-3">
        <div className="purity-gradient flex h-9 w-9 items-center justify-center rounded-2xl shadow-lg">
          <Home className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="text-sm font-bold tracking-wide text-[#2D3748] dark:text-[#E2E8F0]">
            IMMOPOSSIBLE
          </span>
          <p className="text-xs text-[#A0AEC0] leading-none">Tenant Portal</p>
        </div>
      </Link>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <Link href="/portal/report/new">
          <Button
            size="sm"
            className="rounded-xl bg-[#4FD1C5] font-bold text-white hover:bg-[#38B2AC] gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Schaden melden</span>
          </Button>
        </Link>

        <Link href="/portal/profile">
          <Button variant="ghost" size="sm" className="flex items-center gap-2 rounded-xl hover:bg-[#F7FAFC]">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
              <AvatarFallback className="purity-gradient text-xs font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline text-sm font-semibold text-[#2D3748] dark:text-[#E2E8F0]">
              {profile?.full_name || profile?.email || 'Profil'}
            </span>
            <User className="h-4 w-4 text-[#A0AEC0] sm:hidden" />
          </Button>
        </Link>

        <SignOutConfirmDialog>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-[#A0AEC0] hover:text-[#E53E3E] hover:bg-[#FFF5F5]"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Sign out</span>
          </Button>
        </SignOutConfirmDialog>
      </div>
    </header>
  )
}
