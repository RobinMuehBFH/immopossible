'use client'

import { Bell } from 'lucide-react'

export function DashboardHeader() {
  return (
    <header className="flex h-20 items-center justify-end bg-white px-6 dark:bg-[#1A202C]">
      <div className="flex items-center gap-4">
        <button className="relative rounded-xl p-2 text-[#A0AEC0] transition-colors hover:bg-[#F7FAFC] dark:hover:bg-[#2D3748]">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#4FD1C5]" />
        </button>
      </div>
    </header>
  )
}
