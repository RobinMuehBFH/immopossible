import { auth } from '@/lib/auth/config'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Building,
  User,
  Mail,
  Phone,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { ReportStatusOverride } from './status-override'
import { AgentRunsTrace } from './agent-runs-trace'
import { TriggerAgentButton } from './trigger-agent-button'

interface ReportDetailPageProps {
  params: Promise<{ id: string }>
}

const statusColors: Record<string, string> = {
  received: 'bg-info/10 text-info',
  triaging: 'bg-warning/10 text-warning',
  waiting_for_approval: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  booking_craftsman: 'bg-primary/10 text-primary',
  booked: 'bg-primary/10 text-primary',
  in_progress: 'bg-info/10 text-info',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted text-muted-foreground',
}

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-warning/10 text-warning',
  high: 'bg-warning/10 text-warning',
  critical: 'bg-destructive/10 text-destructive',
}

export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const { id } = await params
  const session = await auth()
  const supabase = createAuthenticatedSupabaseClient(session!.supabaseAccessToken!)

  // Fetch report with tenant and property
  const { data: report, error } = await supabase
    .from('damage_reports')
    .select(
      `
      *,
      tenant:profiles!damage_reports_tenant_id_fkey(
        id,
        full_name,
        email,
        phone
      ),
      property:properties!damage_reports_property_id_fkey(
        id,
        name,
        address,
        city,
        postal_code
      )
    `
    )
    .eq('id', id)
    .single()

  if (error || !report) {
    notFound()
  }

  // Fetch agent runs for this report
  const { data: agentRuns } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('damage_report_id', id)
    .order('started_at', { ascending: false })

  // Fetch booking if exists
  const { data: booking } = await supabase
    .from('bookings')
    .select(
      `
      id,
      scheduled_date,
      scheduled_time_start,
      scheduled_time_end,
      status,
      notes,
      craftsman:craftsmen!bookings_craftsman_id_fkey(
        id,
        company_name,
        contact_name,
        phone,
        email
      )
    `
    )
    .eq('damage_report_id', id)
    .single()

  // Fetch approval request if exists
  const { data: approvalRequest } = await supabase
    .from('approval_requests')
    .select('*')
    .eq('damage_report_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-[#A0AEC0] hover:text-[#2D3748] dark:hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Button>
        </Link>
      </div>

      {/* Report Header Card */}
      <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-[#2D3748] dark:text-white">
                  {report.title}
                </h1>
                <Badge
                  variant="secondary"
                  className={`rounded-lg px-3 py-1 text-xs font-bold ${statusColors[report.status] || ''}`}
                >
                  {report.status.replace(/_/g, ' ')}
                </Badge>
                {report.priority && (
                  <Badge
                    variant="secondary"
                    className={`rounded-lg px-3 py-1 text-xs font-bold ${priorityColors[report.priority] || ''}`}
                  >
                    {report.priority}
                  </Badge>
                )}
              </div>
              <p className="text-[#A0AEC0]">
                Submitted via {report.channel.replace('_', ' ')} on{' '}
                {new Date(report.created_at).toLocaleDateString('de-CH', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <TriggerAgentButton reportId={report.id} reportStatus={report.status} />
              <ReportStatusOverride reportId={report.id} currentStatus={report.status} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-[#2D3748] dark:text-white">
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[#2D3748] dark:text-[#E2E8F0] whitespace-pre-wrap">
                {report.description}
              </p>
              {report.location_in_property && (
                <div className="mt-4 flex items-center gap-2 text-[#A0AEC0]">
                  <MapPin className="h-4 w-4" />
                  <span>{report.location_in_property}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Images */}
          {report.image_urls && report.image_urls.length > 0 && (
            <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-[#2D3748] dark:text-white">
                  Images ({report.image_urls.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {report.image_urls.map((url: string, index: number) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square overflow-hidden rounded-xl"
                    >
                      <Image
                        src={url}
                        alt={`Image ${index + 1}`}
                        fill
                        className="object-cover hover:scale-105 transition-transform"
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Agent Runs Trace */}
          <AgentRunsTrace agentRuns={agentRuns || []} reportId={report.id} />

          {/* Approval Request */}
          {approvalRequest && (
            <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-[#2D3748] dark:text-white flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Approval Request
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[#A0AEC0]">Status</span>
                    <Badge
                      variant="secondary"
                      className={`rounded-lg px-3 py-1 text-xs font-bold ${
                        approvalRequest.status === 'approved'
                          ? 'bg-success/10 text-success'
                          : approvalRequest.status === 'rejected'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-warning/10 text-warning'
                      }`}
                    >
                      {approvalRequest.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#A0AEC0]">Estimated Cost</span>
                    <span className="font-bold text-[#2D3748] dark:text-white">
                      CHF {approvalRequest.estimated_cost_chf?.toLocaleString() || '—'}
                    </span>
                  </div>
                  {approvalRequest.requested_action && (
                    <div>
                      <span className="text-[#A0AEC0] text-sm">Requested Action</span>
                      <p className="text-[#2D3748] dark:text-[#E2E8F0] mt-1">
                        {approvalRequest.requested_action}
                      </p>
                    </div>
                  )}
                  {approvalRequest.decision_notes && (
                    <div>
                      <span className="text-[#A0AEC0] text-sm">Decision Notes</span>
                      <p className="text-[#2D3748] dark:text-[#E2E8F0] mt-1">
                        {approvalRequest.decision_notes}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tenant Info */}
          <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-[#2D3748] dark:text-white flex items-center gap-2">
                <User className="h-5 w-5" />
                Tenant
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.tenant ? (
                <div className="space-y-3">
                  <p className="font-bold text-[#2D3748] dark:text-white">
                    {report.tenant.full_name || '—'}
                  </p>
                  {report.tenant.email && (
                    <a
                      href={`mailto:${report.tenant.email}`}
                      className="flex items-center gap-2 text-[#A0AEC0] hover:text-[#4FD1C5]"
                    >
                      <Mail className="h-4 w-4" />
                      {report.tenant.email}
                    </a>
                  )}
                  {report.tenant.phone && (
                    <a
                      href={`tel:${report.tenant.phone}`}
                      className="flex items-center gap-2 text-[#A0AEC0] hover:text-[#4FD1C5]"
                    >
                      <Phone className="h-4 w-4" />
                      {report.tenant.phone}
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-[#A0AEC0]">Unknown tenant</p>
              )}
            </CardContent>
          </Card>

          {/* Property Info */}
          <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-[#2D3748] dark:text-white flex items-center gap-2">
                <Building className="h-5 w-5" />
                Property
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.property ? (
                <div className="space-y-2">
                  <p className="font-bold text-[#2D3748] dark:text-white">
                    {report.property.name}
                  </p>
                  <p className="text-[#A0AEC0]">
                    {report.property.address}
                    <br />
                    {report.property.postal_code} {report.property.city}
                  </p>
                </div>
              ) : (
                <p className="text-[#A0AEC0]">No property assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Booking Info */}
          <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-[#2D3748] dark:text-white flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Booking
              </CardTitle>
            </CardHeader>
            <CardContent>
              {booking ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[#A0AEC0]">Status</span>
                    <Badge
                      variant="secondary"
                      className={`rounded-lg px-3 py-1 text-xs font-bold ${
                        booking.status === 'completed'
                          ? 'bg-success/10 text-success'
                          : booking.status === 'cancelled'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {booking.status}
                    </Badge>
                  </div>
                  {booking.scheduled_date && (
                    <div>
                      <span className="text-[#A0AEC0] text-sm">Scheduled</span>
                      <p className="font-bold text-[#2D3748] dark:text-white">
                        {new Date(booking.scheduled_date).toLocaleDateString('de-CH', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                        {booking.scheduled_time_start && (
                          <span className="font-normal text-[#A0AEC0]">
                            {' '}at {booking.scheduled_time_start}
                            {booking.scheduled_time_end && ` - ${booking.scheduled_time_end}`}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  <div className="border-t border-[#E2E8F0] dark:border-[#4A5568] pt-4">
                    <span className="text-[#A0AEC0] text-sm">Craftsman</span>
                    <p className="font-bold text-[#2D3748] dark:text-white mt-1">
                      {booking.craftsman?.company_name || '—'}
                    </p>
                    {booking.craftsman?.contact_name && (
                      <p className="text-[#A0AEC0]">{booking.craftsman.contact_name}</p>
                    )}
                    {booking.craftsman?.phone && (
                      <a
                        href={`tel:${booking.craftsman.phone}`}
                        className="flex items-center gap-2 text-[#A0AEC0] hover:text-[#4FD1C5] mt-2"
                      >
                        <Phone className="h-4 w-4" />
                        {booking.craftsman.phone}
                      </a>
                    )}
                  </div>
                  {booking.notes && (
                    <div className="border-t border-[#E2E8F0] dark:border-[#4A5568] pt-4">
                      <span className="text-[#A0AEC0] text-sm">Notes</span>
                      <p className="text-[#2D3748] dark:text-[#E2E8F0] mt-1">
                        {booking.notes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Clock className="h-8 w-8 text-[#A0AEC0] mx-auto mb-2" />
                  <p className="text-[#A0AEC0]">No booking yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Damage Category */}
          {report.damage_category && (
            <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-[#2D3748] dark:text-white">
                  Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  variant="secondary"
                  className="rounded-lg px-3 py-1 text-sm font-bold bg-[#4FD1C5]/10 text-[#4FD1C5]"
                >
                  {report.damage_category.replace(/_/g, ' ')}
                </Badge>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
