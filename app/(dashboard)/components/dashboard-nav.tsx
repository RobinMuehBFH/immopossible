'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useSidebarContext } from '../layout'
import {
  Building2,
  FileText,
  Bot,
  Wrench,
  X,
  Menu,
  LogOut,
  UserCircle,
} from 'lucide-react'
import { SignOutConfirmDialog } from '@/components/sign-out-confirm-dialog'

const mainNavItems = [
  { name: 'Reports', href: '/dashboard', icon: FileText },
  { name: 'Agent Runs', href: '/dashboard/agent-runs', icon: Bot },
  { name: 'Properties', href: '/dashboard/properties', icon: Building2 },
  { name: 'Craftsmen', href: '/dashboard/craftsmen', icon: Wrench },
]


interface DashboardNavProps {
  profile?: {
    full_name?: string | null
    email?: string | null
    role?: string | null
  } | null
}

export function DashboardNav({ profile }: DashboardNavProps) {
  const pathname = usePathname()
  const { isOpen, setIsOpen } = useSidebarContext()

  const initials =
    profile?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() ||
    profile?.email?.[0]?.toUpperCase() ||
    '?'

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-xl border border-[#E2E8F0] bg-white p-2.5 shadow-lg dark:border-[#4A5568] dark:bg-[#2D3748] lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5 text-[#2D3748] dark:text-[#E2E8F0]" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-[280px] bg-white dark:bg-[#1A202C]',
          'flex flex-col transition-transform duration-300 ease-in-out',
          'shadow-xl lg:translate-x-0 lg:shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Close button - mobile */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-4 rounded-lg p-1.5 hover:bg-[#F7FAFC] dark:hover:bg-[#4A5568] lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5 text-[#A0AEC0]" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-8">
          <div className="purity-gradient flex h-9 w-9 items-center justify-center rounded-2xl shadow-lg">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-sm font-bold tracking-wide text-[#2D3748] dark:text-[#E2E8F0]">
            IMMOPOSSIBLE
          </span>
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-border/60" />

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
          {mainNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all',
                  isActive
                    ? 'purity-gradient text-white shadow-lg shadow-primary/30'
                    : 'text-[#A0AEC0] hover:bg-[#F7FAFC] dark:hover:bg-[#2D3748]'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="mx-2 mb-4 p-4">
          <Link
            href="/dashboard/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-[#F7FAFC] dark:hover:bg-[#2D3748]"
          >
            <div className="purity-gradient flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-md">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#2D3748] dark:text-[#E2E8F0]">
                {profile?.full_name || 'User'}
              </p>
              <p className="truncate text-xs capitalize text-[#A0AEC0]">
                {profile?.role?.replace('_', ' ') || 'Manager'}
              </p>
            </div>
            <UserCircle className="h-4 w-4 text-[#A0AEC0]" />
          </Link>
          <SignOutConfirmDialog>
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 w-full justify-start gap-2 rounded-2xl text-[#A0AEC0] hover:text-[#E53E3E]"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </SignOutConfirmDialog>
        </div>
      </aside>
    </>
  )
}
