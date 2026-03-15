'use client'

import { signOut } from 'next-auth/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface SignOutConfirmDialogProps {
  children: React.ReactNode
}

export function SignOutConfirmDialog({ children }: SignOutConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="rounded-2xl border-0 shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold text-[#2D3748] dark:text-white">
            Wirklich ausloggen?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-[#A0AEC0]">
            Sie werden von Ihrem Konto abgemeldet und zur Anmeldeseite weitergeleitet.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="rounded-xl bg-[#E53E3E] text-white hover:bg-[#C53030]"
          >
            Ausloggen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
