import { auth } from '@/lib/auth/config'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { FileText, AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { DashboardCharts } from './dashboard-charts'
import { PendingApprovals } from './pending-approvals'
import { RecentReportsSection, RecentReportsSkeleton } from './recent-reports-section'
import { Suspense } from 'react'

function computeReportsByMonth(reports: { created_at: string }[]) {
  const now = new Date()
  const months: { key: string; name: string; value: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      name: d.toLocaleDateString('de-CH', { month: 'short' }),
      value: 0,
    })
  }
  for (const r of reports) {
    const d = new Date(r.created_at)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const month = months.find((m) => m.key === key)
    if (month) month.value++
  }
  return months.map(({ name, value }) => ({ name, value }))
}

function computeReportsByStatus(reports: { status: string }[]) {
  const counts: Record<string, number> = {}
  for (const r of reports) {
    counts[r.status] = (counts[r.status] || 0) + 1
  }
  return Object.entries(counts).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }))
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">{title}</p>
            <p className="mt-2 text-2xl font-bold text-[#2D3748] dark:text-white">{value}</p>
          </div>
          <div className="purity-gradient flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function DashboardPage() {
  const session = await auth()
  const supabase = createAuthenticatedSupabaseClient(session!.supabaseAccessToken!)

  const [{ data: pendingApprovals }, { data: allReports }, { data: agentRunData }] =
    await Promise.all([
      supabase
        .from('approval_requests')
        .select(
          `*,
         damage_report:damage_reports!approval_requests_damage_report_id_fkey(
           title, description,
           tenant:profiles!damage_reports_tenant_id_fkey(full_name),
           property:properties!damage_reports_property_id_fkey(name)
         )`
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase.from('damage_reports').select('status, created_at'),
      supabase.from('agent_runs').select('status, duration_ms'),
    ])

  const completedRuns = agentRunData?.filter((r) => r.status === 'completed') || []
  const failedRuns = agentRunData?.filter((r) => r.status === 'failed') || []
  const runningAgents = agentRunData?.filter((r) => r.status === 'running') || []
  const successRate =
    completedRuns.length + failedRuns.length > 0
      ? Math.round((completedRuns.length / (completedRuns.length + failedRuns.length)) * 100)
      : null
  const avgDurationMs =
    completedRuns.length > 0
      ? Math.round(
          completedRuns.reduce((sum, r) => sum + (r.duration_ms || 0), 0) / completedRuns.length
        )
      : null
  const avgDurationSec = avgDurationMs !== null ? Math.round(avgDurationMs / 1000) : null

  const openStatuses = [
    'received',
    'triaging',
    'waiting_for_approval',
    'approved',
    'booking_craftsman',
    'booked',
    'in_progress',
  ]
  const openReportsCount = allReports?.filter((r) => openStatuses.includes(r.status)).length || 0

  const reportsByMonth = computeReportsByMonth(allReports || [])
  const reportsByStatus = computeReportsByStatus(allReports || [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#2D3748] dark:text-white">
          Reports Overview
        </h2>
        <p className="text-[#A0AEC0]">Alle Schadensmeldungen auf einen Blick</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Offene Meldungen"
          value={openReportsCount}
          icon={<FileText className="h-6 w-6" />}
        />
        <StatCard
          title="Ausstehende Genehmigungen"
          value={pendingApprovals?.length || 0}
          icon={<AlertCircle className="h-6 w-6" />}
        />
        <StatCard
          title="Agent Erfolgsrate"
          value={successRate !== null ? `${successRate}%` : '—'}
          icon={<CheckCircle2 className="h-6 w-6" />}
        />
        <StatCard
          title="Ø Agent-Laufzeit"
          value={avgDurationSec !== null ? `${avgDurationSec}s` : '—'}
          icon={<Clock className="h-6 w-6" />}
        />
      </div>

      {/* Pending Approvals */}
      {pendingApprovals && pendingApprovals.length > 0 && (
        <PendingApprovals initialApprovals={pendingApprovals} />
      )}

      {/* Charts */}
      <DashboardCharts
        reportsByMonth={reportsByMonth}
        reportsByStatus={reportsByStatus}
        agentStats={{
          completed: completedRuns.length,
          failed: failedRuns.length,
          running: runningAgents.length,
          successRate,
          avgDurationSec,
        }}
      />

      {/* Recent Reports — streamed separately so charts appear immediately */}
      <Suspense fallback={<RecentReportsSkeleton />}>
        <RecentReportsSection />
      </Suspense>
    </div>
  )
}
