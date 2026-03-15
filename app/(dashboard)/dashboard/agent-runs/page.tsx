import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Bot } from 'lucide-react'
import { AgentRunsTable } from './agent-runs-table'

export const dynamic = 'force-dynamic'

export default async function AgentRunsPage() {
  const supabase = await createClient()

  const { data: agentRuns } = await supabase
    .from('agent_runs')
    .select(`
      *,
      damage_report:damage_reports!agent_runs_damage_report_id_fkey(
        id,
        title,
        tenant:profiles!damage_reports_tenant_id_fkey(full_name),
        property:properties!damage_reports_property_id_fkey(name)
      )
    `)
    .order('started_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#2D3748] dark:text-white">
          Agent Runs
        </h2>
        <p className="text-[#A0AEC0]">Monitor AI agent activity and performance</p>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="purity-gradient flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                  Total Runs
                </p>
                <p className="text-2xl font-bold text-[#2D3748] dark:text-white">
                  {agentRuns?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#4FD1C5]/10 text-[#4FD1C5] shadow-lg">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                  Running
                </p>
                <p className="text-2xl font-bold text-[#4FD1C5]">
                  {agentRuns?.filter((r) => r.status === 'running').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success shadow-lg">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                  Completed
                </p>
                <p className="text-2xl font-bold text-success">
                  {agentRuns?.filter((r) => r.status === 'completed').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive shadow-lg">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                  Failed
                </p>
                <p className="text-2xl font-bold text-destructive">
                  {agentRuns?.filter((r) => r.status === 'failed').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Runs Table */}
      <AgentRunsTable initialRuns={agentRuns || []} />
    </div>
  )
}
