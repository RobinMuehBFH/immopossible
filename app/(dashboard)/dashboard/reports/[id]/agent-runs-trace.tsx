'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Bot,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AgentRun } from '@/lib/types/database.types'
import { AgentRunDetail } from '@/components/agent-run-detail'
import type { AgentStep } from '@/components/agent-run-detail'

interface AgentRunsTraceProps {
  agentRuns: AgentRun[]
  reportId: string
}

const statusIcons: Record<string, React.ReactNode> = {
  running: <Loader2 className="h-4 w-4 animate-spin text-[#4FD1C5]" />,
  waiting_for_human: <Clock className="h-4 w-4 text-warning" />,
  completed: <CheckCircle className="h-4 w-4 text-success" />,
  failed: <XCircle className="h-4 w-4 text-destructive" />,
}

const statusColors: Record<string, string> = {
  running: 'bg-[#4FD1C5]/10 text-[#4FD1C5]',
  waiting_for_human: 'bg-warning/10 text-warning',
  completed: 'bg-success/10 text-success',
  failed: 'bg-destructive/10 text-destructive',
}

function formatDuration(ms: number | null | undefined) {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function parseSteps(steps: unknown): AgentStep[] {
  if (!steps) return []
  if (Array.isArray(steps)) return steps as AgentStep[]
  return []
}

export function AgentRunsTrace({ agentRuns: initialRuns, reportId }: AgentRunsTraceProps) {
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>(initialRuns)
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`agent-runs-${reportId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_runs',
          filter: `damage_report_id=eq.${reportId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAgentRuns((prev) => [payload.new as AgentRun, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setAgentRuns((prev) =>
              prev.map((run) =>
                run.id === (payload.new as AgentRun).id ? (payload.new as AgentRun) : run
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [reportId])

  const toggleRun = (runId: string) => {
    setExpandedRuns((prev) => {
      const next = new Set(prev)
      if (next.has(runId)) next.delete(runId)
      else next.add(runId)
      return next
    })
  }

  if (agentRuns.length === 0) {
    return (
      <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold text-[#2D3748] dark:text-white flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Agent Runs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Bot className="h-12 w-12 text-[#A0AEC0] mx-auto mb-3" />
            <p className="text-[#A0AEC0]">Noch keine Agent Runs</p>
            <p className="text-sm text-[#A0AEC0] mt-1">
              Agent Runs erscheinen hier sobald der Bericht verarbeitet wird
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold text-[#2D3748] dark:text-white flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Agent Runs
          <Badge variant="secondary" className="ml-2 rounded-lg bg-[#A0AEC0]/10 text-[#A0AEC0]">
            {agentRuns.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {agentRuns.map((run) => {
          const steps = parseSteps(run.steps_taken)
          const isExpanded = expandedRuns.has(run.id)

          return (
            <Collapsible key={run.id} open={isExpanded} onOpenChange={() => toggleRun(run.id)}>
              <div className="rounded-xl border border-[#E2E8F0] dark:border-[#4A5568] overflow-hidden">
                <CollapsibleTrigger asChild>
                  <button className="w-full p-4 flex items-center justify-between hover:bg-[#F7FAFC] dark:hover:bg-[#1A202C] transition-colors">
                    <div className="flex items-center gap-3">
                      {statusIcons[run.status]}
                      <div className="text-left">
                        <p className="font-medium text-[#2D3748] dark:text-white">
                          Run #{run.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-[#A0AEC0]">
                          {new Date(run.started_at).toLocaleString('de-CH')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className={`rounded-lg px-2 py-1 text-xs font-bold ${statusColors[run.status]}`}
                      >
                        {run.status.replace(/_/g, ' ')}
                      </Badge>
                      {run.tokens_used && (
                        <span className="text-xs text-[#A0AEC0] flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {run.tokens_used.toLocaleString()}
                        </span>
                      )}
                      <span className="text-xs text-[#A0AEC0]">{formatDuration(run.duration_ms)}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-[#A0AEC0]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[#A0AEC0]" />
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t border-[#E2E8F0] dark:border-[#4A5568] p-4">
                    <AgentRunDetail
                      steps={steps}
                      outputSummary={run.output_summary}
                      errorMessage={run.error_message}
                    />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )
        })}
      </CardContent>
    </Card>
  )
}
