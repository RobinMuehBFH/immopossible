'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { SignOutConfirmDialog } from '@/components/sign-out-confirm-dialog'
import { useTheme } from 'next-themes'
import { createAuthenticatedBrowserClient } from '@/lib/supabase/client'
import { updateProfile } from '@/lib/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { LogOut, User, Mail, Phone, Shield, Sun, Moon, Calendar } from 'lucide-react'
import type { Profile } from '@/lib/types/database.types'

export default function DashboardProfilePage() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!session?.supabaseAccessToken) return
    const supabase = createAuthenticatedBrowserClient(session.supabaseAccessToken)
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile(data)
          setFullName(data.full_name ?? '')
          setPhone(data.phone ?? '')
        }
      })
  }, [session])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSaving(true)
    const formData = new FormData()
    formData.set('full_name', fullName)
    formData.set('phone', phone)
    const result = await updateProfile(formData)
    if (result.error) toast.error(result.error)
    else toast.success('Profile updated successfully.')
    setIsSaving(false)
  }

  const initials =
    profile?.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() ||
    profile?.email?.[0]?.toUpperCase() || '?'

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-CH', { year: 'numeric', month: 'long' })
    : null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#2D3748] dark:text-white">Profile</h2>
        <p className="text-[#A0AEC0]">Manage your account settings</p>
      </div>

      {/* Top row: Avatar card (left) + Personal Information (right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Avatar card — 1 col */}
        <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
          <CardContent className="flex flex-col items-center pt-8 pb-6 gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="purity-gradient text-2xl font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-lg font-bold text-[#2D3748] dark:text-white">
                {profile?.full_name || '—'}
              </p>
              <p className="text-sm text-[#A0AEC0]">{profile?.email}</p>
            </div>
            <div className="w-full space-y-2 pt-2 border-t border-[#E2E8F0] dark:border-[#4A5568]">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-[#A0AEC0]">
                  <Shield className="h-3.5 w-3.5" /> Role
                </span>
                <span className="font-semibold text-[#2D3748] dark:text-white capitalize">
                  {profile?.role?.replace('_', ' ') || '—'}
                </span>
              </div>
              {profile?.phone && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-[#A0AEC0]">
                    <Phone className="h-3.5 w-3.5" /> Phone
                  </span>
                  <span className="font-semibold text-[#2D3748] dark:text-white">{profile.phone}</span>
                </div>
              )}
              {memberSince && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-[#A0AEC0]">
                    <Calendar className="h-3.5 w-3.5" /> Member since
                  </span>
                  <span className="font-semibold text-[#2D3748] dark:text-white">{memberSince}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Personal Information — 2 cols */}
        <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748] lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2D3748] dark:text-white">
              Personal Information
            </CardTitle>
            <CardDescription className="text-[#A0AEC0]">
              Update your name and contact details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                    <User className="h-3.5 w-3.5" /> Full Name
                  </Label>
                  <Input
                    id="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="rounded-xl border-[#E2E8F0] dark:border-[#4A5568]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                    <Phone className="h-3.5 w-3.5" /> Phone
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+41 79 123 45 67"
                    className="rounded-xl border-[#E2E8F0] dark:border-[#4A5568]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                  <Mail className="h-3.5 w-3.5" /> Email
                </Label>
                <Input
                  id="email"
                  value={profile?.email ?? ''}
                  disabled
                  className="rounded-xl border-[#E2E8F0] opacity-60 dark:border-[#4A5568]"
                />
                <p className="text-xs text-[#A0AEC0]">Email cannot be changed here.</p>
              </div>
              <Button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-[#4FD1C5] font-bold text-white hover:bg-[#38B2AC] px-8"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Appearance (left) + Sign Out (right) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Appearance */}
        <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#2D3748] dark:text-white">
              Appearance
            </CardTitle>
            <CardDescription className="text-[#A0AEC0]">
              Choose your preferred theme.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-xl border border-[#E2E8F0] dark:border-[#4A5568] px-4 py-3">
              <div className="flex items-center gap-3">
                {theme === 'dark'
                  ? <Moon className="h-5 w-5 text-[#4FD1C5]" />
                  : <Sun className="h-5 w-5 text-[#4FD1C5]" />
                }
                <div>
                  <p className="text-sm font-semibold text-[#2D3748] dark:text-white">Dark Mode</p>
                  <p className="text-xs text-[#A0AEC0]">
                    {theme === 'dark' ? 'Using dark theme' : 'Using light theme'}
                  </p>
                </div>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#E53E3E]">Sign Out</CardTitle>
            <CardDescription className="text-[#A0AEC0]">
              Sign out of your account on this device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignOutConfirmDialog>
              <Button variant="destructive" className="w-full rounded-xl">
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </SignOutConfirmDialog>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
