'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Edit2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ReportStatus } from '@/lib/types/database.types'

const STATUS_OPTIONS: { value: ReportStatus; label: string }[] = [
  { value: 'received', label: 'Received' },
  { value: 'triaging', label: 'Triaging' },
  { value: 'waiting_for_approval', label: 'Waiting for Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'booking_craftsman', label: 'Booking Craftsman' },
  { value: 'booked', label: 'Booked' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

interface ReportStatusOverrideProps {
  reportId: string
  currentStatus: ReportStatus
}

export function ReportStatusOverride({
  reportId,
  currentStatus,
}: ReportStatusOverrideProps) {
  const [open, setOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus>(currentStatus)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = () => {
    if (selectedStatus === currentStatus) {
      setOpen(false)
      return
    }

    setError(null)
    startTransition(async () => {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('damage_reports')
        .update({ status: selectedStatus })
        .eq('id', reportId)

      if (updateError) {
        setError(updateError.message)
        return
      }

      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-xl px-3 border-[#E2E8F0] dark:border-[#4A5568]"
      >
        <Edit2 className="h-4 w-4" />
        Override Status
      </DialogTrigger>
      <DialogContent className="rounded-2xl dark:bg-[#2D3748]">
        <DialogHeader>
          <DialogTitle className="text-[#2D3748] dark:text-white">
            Override Report Status
          </DialogTitle>
          <DialogDescription className="text-[#A0AEC0]">
            Manually change the status of this report. This should only be used for
            edge cases where the automated flow needs correction.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <label className="text-sm font-medium text-[#A0AEC0]">New Status</label>
          <Select
            value={selectedStatus}
            onValueChange={(value) => setSelectedStatus(value as ReportStatus)}
          >
            <SelectTrigger className="mt-2 rounded-xl border-[#E2E8F0] dark:border-[#4A5568] dark:bg-[#1A202C]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                  {option.value === currentStatus && ' (current)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && (
            <p className="mt-2 text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || selectedStatus === currentStatus}
            className="purity-gradient rounded-xl text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Status'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
