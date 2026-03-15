'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Bot, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TriggerAgentButtonProps {
  reportId: string
  reportStatus: string
}

export function TriggerAgentButton({ reportId, reportStatus }: TriggerAgentButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const blocked = ['in_progress', 'booked', 'completed', 'cancelled'].includes(reportStatus)

  async function handleTrigger() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/agent/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Unbekannter Fehler')
      } else {
        router.refresh()
      }
    } catch {
      setError('Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={handleTrigger}
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
      {error && (
        <p className="text-xs text-destructive max-w-xs text-right">{error}</p>
      )}
      {blocked && !loading && (
        <p className="text-xs text-[#A0AEC0]">Status: {reportStatus}</p>
      )}
    </div>
  )
}
