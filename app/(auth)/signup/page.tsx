'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2 } from 'lucide-react'
import { registerUser } from './actions'
import { toast } from 'sonner'

export default function SignupPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [role, setRole] = useState('property_manager')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string

    const result = await registerUser(email, password, fullName, role)

    if (result.error) {
      toast.error(result.error)
      setIsLoading(false)
    } else {
      toast.success('Account created! You can now sign in.')
      router.push('/login')
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Left panel - Branding */}
      <div
        className="hidden w-1/2 lg:flex lg:flex-col lg:items-center lg:justify-center"
        style={{ background: 'linear-gradient(135deg, #4FD1C5 0%, #38B2AC 100%)' }}
      >
        <div className="flex flex-col items-center text-center px-12">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-xl">
            <Building2 className="h-10 w-10 text-[#4FD1C5]" />
          </div>
          <h1 className="mb-3 text-4xl font-bold tracking-wide text-white">
            IMMOPOSSIBLE
          </h1>
          <p className="text-lg font-medium text-white/90">
            Autonomous Property Management
          </p>
          <p className="mt-4 max-w-sm text-sm text-white/70">
            AI-powered damage report triage, craftsman dispatch, and property management — all in one platform.
          </p>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex w-full items-center justify-center bg-[#F8F9FA] px-6 dark:bg-[#1A202C] lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-lg"
              style={{ background: 'linear-gradient(135deg, #4FD1C5 0%, #38B2AC 100%)' }}
            >
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-wide text-[#2D3748] dark:text-[#E2E8F0]">
              IMMOPOSSIBLE
            </span>
          </div>

          <div className="rounded-2xl border-0 bg-white p-8 shadow-xl dark:bg-[#2D3748]">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#2D3748] dark:text-white">
                Create an account
              </h2>
              <p className="mt-1 text-sm text-[#A0AEC0]">
                Sign up as a property manager to get started
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="John Doe"
                  required
                  disabled={isLoading}
                  className="rounded-xl border-[#E2E8F0] bg-transparent text-[#2D3748] placeholder:text-[#A0AEC0] focus-visible:ring-[#4FD1C5] dark:border-[#4A5568] dark:text-[#E2E8F0]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
                  className="rounded-xl border-[#E2E8F0] bg-transparent text-[#2D3748] placeholder:text-[#A0AEC0] focus-visible:ring-[#4FD1C5] dark:border-[#4A5568] dark:text-[#E2E8F0]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  minLength={6}
                  required
                  disabled={isLoading}
                  className="rounded-xl border-[#E2E8F0] bg-transparent text-[#2D3748] placeholder:text-[#A0AEC0] focus-visible:ring-[#4FD1C5] dark:border-[#4A5568] dark:text-[#E2E8F0]"
                />
                <p className="text-xs text-[#A0AEC0]">
                  Must be at least 6 characters
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                  Role
                </Label>
                <Select value={role} onValueChange={(v) => v && setRole(v)} disabled={isLoading}>
                  <SelectTrigger className="rounded-xl border-[#E2E8F0] bg-transparent text-[#2D3748] focus:ring-[#4FD1C5] dark:border-[#4A5568] dark:text-[#E2E8F0]">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#E2E8F0] dark:border-[#4A5568] dark:bg-[#2D3748]">
                    <SelectItem value="property_manager">
                      Property Manager
                    </SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#A0AEC0]">
                  Tenants are added by property managers via invite
                </p>
              </div>
              <Button
                type="submit"
                className="w-full rounded-xl bg-[#4FD1C5] font-bold text-white shadow-lg shadow-[#4FD1C5]/30 hover:bg-[#38B2AC]"
                disabled={isLoading}
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-[#A0AEC0]">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-[#4FD1C5] hover:text-[#38B2AC]">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
