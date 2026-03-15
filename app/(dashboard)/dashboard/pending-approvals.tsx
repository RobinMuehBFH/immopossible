'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Loader2,
  ExternalLink,
  DollarSign,
  Building,
  User
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Link from 'next/link'

interface ApprovalRequest {
  id: string
  damage_report_id: string
  requested_action: string
  estimated_cost_chf: number | null
  status: string
  created_at: string
  damage_report?: {
    title: string
    description: string
    tenant?: {
      full_name: string | null
    } | null
    property?: {
      name: string
    } | null
  } | null
}

interface PendingApprovalsProps {
  initialApprovals: ApprovalRequest[]
}

export function PendingApprovals({ initialApprovals }: PendingApprovalsProps) {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(initialApprovals)
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null)
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('pending-approvals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'approval_requests',
          filter: 'status=eq.pending',
        },
        async (payload) => {
          // Fetch full data with relations
          const { data } = await supabase
            .from('approval_requests')
            .select(`
              *,
              damage_report:damage_reports!approval_requests_damage_report_id_fkey(
                title,
                description,
                tenant:profiles!damage_reports_tenant_id_fkey(full_name),
                property:properties!damage_reports_property_id_fkey(name)
              )
            `)
            .eq('id', (payload.new as { id: string }).id)
            .single()

          if (data) {
            setApprovals((prev) => [data as ApprovalRequest, ...prev])
            toast.info('New approval request', {
              description: `${(data as ApprovalRequest).damage_report?.title || 'New request'} needs approval`,
              action: {
                label: 'View',
                onClick: () => setSelectedApproval(data as ApprovalRequest),
              },
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'approval_requests',
        },
        (payload) => {
          const updated = payload.new as { id: string; status: string }
          if (updated.status !== 'pending') {
            setApprovals((prev) => prev.filter((a) => a.id !== updated.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    if (!selectedApproval) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/approvals/${selectedApproval.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, notes: notes || undefined }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process decision')
      }

      toast.success(
        decision === 'approved' ? 'Request approved' : 'Request rejected',
        {
          description: `The damage report has been ${decision}`,
        }
      )

      setApprovals((prev) => prev.filter((a) => a.id !== selectedApproval.id))
      setSelectedApproval(null)
      setNotes('')
      router.refresh()
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to process decision',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (approvals.length === 0) {
    return null
  }

  return (
    <>
      <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748] border-l-4 border-l-warning">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold text-[#2D3748] dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Pending Approvals
            <Badge variant="secondary" className="ml-2 rounded-lg bg-warning/10 text-warning">
              {approvals.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {approvals.map((approval) => (
            <div
              key={approval.id}
              className="rounded-xl border border-[#E2E8F0] dark:border-[#4A5568] p-4 hover:bg-[#F7FAFC] dark:hover:bg-[#1A202C] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[#2D3748] dark:text-white truncate">
                    {approval.damage_report?.title || 'Untitled Report'}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-[#A0AEC0]">
                    {approval.damage_report?.tenant?.full_name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {approval.damage_report.tenant.full_name}
                      </span>
                    )}
                    {approval.damage_report?.property?.name && (
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {approval.damage_report.property.name}
                      </span>
                    )}
                    {approval.estimated_cost_chf && (
                      <span className="flex items-center gap-1 font-bold text-warning">
                        <DollarSign className="h-3 w-3" />
                        CHF {approval.estimated_cost_chf.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#A0AEC0] mt-2 line-clamp-2">
                    {approval.requested_action}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedApproval(approval)}
                    className="rounded-xl"
                  >
                    Review
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={!!selectedApproval} onOpenChange={() => {
        setSelectedApproval(null)
        setNotes('')
      }}>
        <DialogContent className="rounded-2xl dark:bg-[#2D3748] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#2D3748] dark:text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Approval Required
            </DialogTitle>
            <DialogDescription className="text-[#A0AEC0]">
              Review the request and make a decision
            </DialogDescription>
          </DialogHeader>

          {selectedApproval && (
            <div className="space-y-4 py-4">
              {/* Report Info */}
              <div className="rounded-xl bg-[#F7FAFC] dark:bg-[#1A202C] p-4">
                <h4 className="font-bold text-[#2D3748] dark:text-white">
                  {selectedApproval.damage_report?.title || 'Untitled Report'}
                </h4>
                <p className="text-sm text-[#A0AEC0] mt-2 line-clamp-3">
                  {selectedApproval.damage_report?.description}
                </p>
                <Link
                  href={`/dashboard/reports/${selectedApproval.damage_report_id}`}
                  className="inline-flex items-center gap-1 text-sm text-[#4FD1C5] hover:underline mt-2"
                >
                  View full report
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              {/* Request Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[#A0AEC0]">Requested Action</span>
                </div>
                <p className="rounded-xl bg-[#F7FAFC] dark:bg-[#1A202C] p-3 text-sm text-[#2D3748] dark:text-[#E2E8F0]">
                  {selectedApproval.requested_action}
                </p>
                
                {selectedApproval.estimated_cost_chf && (
                  <div className="flex items-center justify-between rounded-xl bg-warning/10 p-3">
                    <span className="text-[#2D3748] dark:text-white font-medium">
                      Estimated Cost
                    </span>
                    <span className="text-xl font-bold text-warning">
                      CHF {selectedApproval.estimated_cost_chf.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-[#A0AEC0]">
                  Decision Notes (optional)
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  className="mt-2 rounded-xl border-[#E2E8F0] dark:border-[#4A5568] dark:bg-[#1A202C]"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedApproval(null)
                setNotes('')
              }}
              className="rounded-xl"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDecision('rejected')}
              disabled={isSubmitting}
              className="rounded-xl border-destructive text-destructive hover:bg-destructive hover:text-white"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Reject
            </Button>
            <Button
              onClick={() => handleDecision('approved')}
              disabled={isSubmitting}
              className="purity-gradient rounded-xl text-white"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
