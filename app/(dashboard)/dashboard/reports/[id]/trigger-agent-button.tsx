'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { Bot, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TriggerAgentButtonProps {
  reportId: string
  reportStatus: string
}

export function TriggerAgentButton({ reportId, reportStatus }: TriggerAgentButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const blocked = ['in_progress', 'booked', 'completed', 'cancelled'].includes(reportStatus)

  async function handleTrigger() {
    setLoading(true)
    try {
      const res = await fetch('/api/agent/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      })
      if (res.ok) {
        router.refresh()
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            disabled={loading || blocked}
            className="rounded-xl bg-[#4FD1C5] hover:bg-[#38B2AC] text-white font-bold"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Bot className="mr-2 h-4 w-4" />
            )}
            {loading ? 'Agent läuft…' : 'Agent starten'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="rounded-2xl border-0 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-[#2D3748] dark:text-white">
              Agent starten?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#A0AEC0]">
              Der Agent analysiert den Schadensbericht, sucht einen passenden Handwerker und erstellt
              automatisch eine Buchungsanfrage. Dieser Vorgang kann nicht manuell unterbrochen werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTrigger}
              className="rounded-xl bg-[#4FD1C5] text-white hover:bg-[#38B2AC]"
            >
              <Bot className="mr-2 h-4 w-4" />
              Agent starten
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {blocked && !loading && (
        <p className="text-xs text-[#A0AEC0]">Status: {reportStatus}</p>
      )}
    </div>
  )
}
