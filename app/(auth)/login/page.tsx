'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2 } from 'lucide-react'
import { toast } from 'sonner'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || searchParams.get('callbackUrl') || '/dashboard'
  const isRelogin = searchParams.get('relogin') === 'true'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      toast.error('Login failed. Please check your credentials.')
      setIsLoading(false)
    } else {
      router.push(redirectTo)
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Left panel - Branding */}
      <div className="hidden w-1/2 lg:flex lg:flex-col lg:items-center lg:justify-center"
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
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-lg"
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
                Welcome back
              </h2>
              <p className="mt-1 text-sm text-[#A0AEC0]">
                Sign in to your account to continue
              </p>
              {isRelogin && (
                <p className="mt-2 text-sm text-amber-600">
                  Please sign in again (security update).
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl border-[#E2E8F0] bg-transparent text-[#2D3748] placeholder:text-[#A0AEC0] focus-visible:ring-[#4FD1C5] dark:border-[#4A5568] dark:text-[#E2E8F0]"
                />
              </div>
              <Button
                type="submit"
                className="w-full rounded-xl bg-[#4FD1C5] font-bold text-white shadow-lg shadow-[#4FD1C5]/30 hover:bg-[#38B2AC]"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-[#A0AEC0]">
              Property manager?{' '}
              <Link href="/signup" className="font-semibold text-[#4FD1C5] hover:text-[#38B2AC]">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] dark:bg-[#1A202C]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4FD1C5] border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
