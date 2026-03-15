'use client'

import { Profile } from '@/lib/types/database.types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { signOut } from '@/app/(auth)/actions'

interface DashboardHeaderProps {
  profile: Profile | null
}

export function DashboardHeader({ profile }: DashboardHeaderProps) {
  const initials =
    profile?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || profile?.email?.[0]?.toUpperCase() || '?'

  return (
    <header className="flex h-20 items-center justify-between bg-white px-6 dark:bg-[#1A202C]">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A0AEC0]" />
          <Input
            placeholder="Search..."
            className="h-10 w-[280px] rounded-xl border-[#E2E8F0] bg-white pl-10 text-sm placeholder:text-[#A0AEC0] dark:border-[#4A5568] dark:bg-[#2D3748]"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative rounded-xl p-2 text-[#A0AEC0] transition-colors hover:bg-[#F7FAFC] dark:hover:bg-[#2D3748]">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#4FD1C5]" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger className="relative h-10 w-10 rounded-full hover:ring-2 hover:ring-[#4FD1C5]/30">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={profile?.avatar_url || undefined}
                alt={profile?.full_name || 'User'}
              />
              <AvatarFallback className="purity-gradient text-white font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 rounded-xl" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold text-[#2D3748] dark:text-white">
                  {profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-[#A0AEC0]">{profile?.email}</p>
                <p className="text-xs capitalize text-[#A0AEC0]">
                  {profile?.role?.replace('_', ' ')}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer text-[#E53E3E] focus:text-[#E53E3E] rounded-lg"
              onClick={() => signOut()}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
