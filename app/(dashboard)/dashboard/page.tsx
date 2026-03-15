import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { FileText, Bot, Building2, Wrench, TrendingUp, TrendingDown } from 'lucide-react'
import { DashboardCharts } from './dashboard-charts'
import { ReportsFilter } from './reports-filter'
import { PendingApprovals } from './pending-approvals'
import { Suspense } from 'react'
import type { ReportStatus, PriorityLevel } from '@/lib/types/database.types'

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

interface StatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'up' | 'down'
  icon: React.ReactNode
}

function StatCard({ title, value, change, changeType, icon }: StatCardProps) {
  return (
    <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">{title}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-2xl font-bold text-[#2D3748] dark:text-white">{value}</p>
              {change && (
                <span
                  className={`flex items-center text-xs font-bold ${
                    changeType === 'up' ? 'text-[#48BB78]' : 'text-[#E53E3E]'
                  }`}
                >
                  {changeType === 'up' ? (
                    <TrendingUp className="mr-0.5 h-3 w-3" />
                  ) : (
                    <TrendingDown className="mr-0.5 h-3 w-3" />
                  )}
                  {change}
                </span>
              )}
            </div>
          </div>
          <div className="purity-gradient flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface SearchParams {
  status?: string
  priority?: string
  property?: string
  from?: string
  to?: string
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // Build query with filters
  let query = supabase
    .from('damage_reports')
    .select(
      `
      *,
      tenant:profiles!damage_reports_tenant_id_fkey(full_name, email),
      property:properties!damage_reports_property_id_fkey(name, address)
    `
    )
    .order('created_at', { ascending: false })
    .limit(50)

  // Apply filters
  if (params.status) {
    query = query.eq('status', params.status as ReportStatus)
  }
  if (params.priority) {
    query = query.eq('priority', params.priority as PriorityLevel)
  }
  if (params.property) {
    query = query.eq('property_id', params.property)
  }
  if (params.from) {
    query = query.gte('created_at', params.from)
  }
  if (params.to) {
    // Add 1 day to include the entire end date
    const toDate = new Date(params.to)
    toDate.setDate(toDate.getDate() + 1)
    query = query.lt('created_at', toDate.toISOString().split('T')[0])
  }

  const { data: reports } = await query

  // Fetch pending approvals with full data for the approval UI
  const { data: pendingApprovals } = await supabase
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
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const { data: runningAgents } = await supabase
    .from('agent_runs')
    .select('id')
    .eq('status', 'running')

  const { data: properties } = await supabase.from('properties').select('id, name')

  const { data: craftsmen } = await supabase.from('craftsmen').select('id')

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#2D3748] dark:text-white">
          Reports Overview
        </h2>
        <p className="text-[#A0AEC0]">Manage damage reports from all properties</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Reports"
          value={reports?.length || 0}
          change="+12%"
          changeType="up"
          icon={<FileText className="h-6 w-6" />}
        />
        <StatCard
          title="Pending Approvals"
          value={pendingApprovals?.length || 0}
          icon={<Bot className="h-6 w-6" />}
        />
        <StatCard
          title="Properties"
          value={properties?.length || 0}
          change="+3"
          changeType="up"
          icon={<Building2 className="h-6 w-6" />}
        />
        <StatCard
          title="Active Craftsmen"
          value={craftsmen?.length || 0}
          icon={<Wrench className="h-6 w-6" />}
        />
      </div>

      {/* Pending Approvals */}
      {pendingApprovals && pendingApprovals.length > 0 && (
        <PendingApprovals initialApprovals={pendingApprovals} />
      )}

      {/* Filters */}
      <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
        <CardContent className="p-4">
          <Suspense
            fallback={
              <div className="h-10 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
            }
          >
            <ReportsFilter properties={properties || []} />
          </Suspense>
        </CardContent>
      </Card>

      {/* Charts */}
      <DashboardCharts
        stats={{
          reports: reports?.length || 0,
          properties: properties?.length || 0,
          craftsmen: craftsmen?.length || 0,
          agentRuns: runningAgents?.length || 0,
        }}
      />

      {/* Reports Table */}
      <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-[#2D3748] dark:text-white">
            {params.status || params.priority || params.property || params.from || params.to
              ? 'Filtered Reports'
              : 'Recent Reports'}
            {reports && reports.length > 0 && (
              <span className="ml-2 text-sm font-normal text-[#A0AEC0]">
                ({reports.length} {reports.length === 1 ? 'report' : 'reports'})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports && reports.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#E2E8F0] dark:border-[#4A5568]">
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                      Title
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                      Tenant
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                      Property
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                      Priority
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                      Created
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow
                      key={report.id}
                      className="border-b border-[#E2E8F0] dark:border-[#4A5568]"
                    >
                      <TableCell>
                        <Link
                          href={`/dashboard/reports/${report.id}`}
                          className="font-bold text-[#2D3748] hover:text-[#4FD1C5] dark:text-white dark:hover:text-[#4FD1C5]"
                        >
                          {report.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-[#A0AEC0]">
                        {report.tenant?.full_name || report.tenant?.email || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-[#A0AEC0]">
                        {report.property?.name || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`rounded-lg px-3 py-1 text-xs font-bold ${statusColors[report.status] || ''}`}
                        >
                          {report.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {report.priority ? (
                          <Badge
                            variant="secondary"
                            className={`rounded-lg px-3 py-1 text-xs font-bold ${priorityColors[report.priority] || ''}`}
                          >
                            {report.priority}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-[#A0AEC0]">
                        {new Date(report.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="purity-gradient mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg">
                <FileText className="h-8 w-8" />
              </div>
              <p className="font-bold text-[#2D3748] dark:text-white">No damage reports yet</p>
              <p className="mt-1 text-sm text-[#A0AEC0]">
                Reports will appear here when tenants submit them.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
