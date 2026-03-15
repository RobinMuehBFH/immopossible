'use client'

import { Bell, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function DashboardHeader() {
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
      </div>
    </header>
  )
}
