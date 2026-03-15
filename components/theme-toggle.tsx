'use client'

import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'
import { Moon, Sun } from 'lucide-react'

// Hydration-safe mounted check
const emptySubscribe = () => () => {}
const getSnapshot = () => true
const getServerSnapshot = () => false

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot)

  if (!mounted) {
    return (
      <div className="flex items-center justify-between rounded-2xl bg-[#F7FAFC] p-3 dark:bg-[#2D3748]">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5" />
          <span className="text-sm font-semibold text-[#A0AEC0]">Theme</span>
        </div>
        <div className="h-7 w-14 rounded-full bg-[#E2E8F0] dark:bg-[#4A5568]" />
      </div>
    )
  }

  const isDark = theme === 'dark'

  return (
    <div className="flex items-center justify-between rounded-2xl bg-[#F7FAFC] p-3 dark:bg-[#2D3748]">
      <div className="flex items-center gap-3">
        {isDark ? (
          <Moon className="h-5 w-5 text-[#4FD1C5]" />
        ) : (
          <Sun className="h-5 w-5 text-[#ED8936]" />
        )}
        <span className="text-sm font-semibold text-[#2D3748] dark:text-[#E2E8F0]">
          {isDark ? 'Dark' : 'Light'} Mode
        </span>
      </div>
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={`
          relative h-7 w-14 rounded-full transition-colors duration-300
          ${isDark ? 'bg-[#4FD1C5]' : 'bg-[#E2E8F0]'}
        `}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        <span
          className={`
            absolute top-1 h-5 w-5 rounded-full bg-white shadow-md
            transition-transform duration-300 ease-in-out
            ${isDark ? 'left-8' : 'left-1'}
          `}
        />
      </button>
    </div>
  )
}
