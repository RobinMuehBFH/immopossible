'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Bot, Clock, CheckCircle, XCircle, Loader2, Zap, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { AgentRun } from '@/lib/types/database.types'
import { AgentRunDetail } from '@/components/agent-run-detail'
import type { AgentStep } from '@/components/agent-run-detail'

interface AgentRunWithReport extends AgentRun {
  damage_report?: {
    id: string
    title: string
    tenant?: { full_name: string | null } | null
    property?: { name: string } | null
  } | null
}

interface AgentRunsTableProps {
  initialRuns: AgentRunWithReport[]
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

export function AgentRunsTable({ initialRuns }: AgentRunsTableProps) {
  const [runs, setRuns] = useState<AgentRunWithReport[]>(initialRuns)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('all-agent-runs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_runs',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch full data with relations
            const { data } = await supabase
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
              .eq('id', (payload.new as { id: string }).id)
              .single()

            if (data) {
              setRuns((prev) => [data as AgentRunWithReport, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as AgentRun
            setRuns((prev) =>
              prev.map((run) =>
                run.id === updated.id ? { ...run, ...updated } : run
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const formatDuration = (ms: number | null | undefined) => {
    if (!ms) return '—'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const parseSteps = (steps: unknown): AgentStep[] => {
    if (!steps) return []
    if (Array.isArray(steps)) return steps as AgentStep[]
    return []
  }

  return (
    <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold text-[#2D3748] dark:text-white flex items-center gap-2">
          <Bot className="h-5 w-5" />
          All Agent Runs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {runs.length > 0 ? (
          <div className="space-y-2">
            {runs.map((run) => {
              const steps = parseSteps(run.steps_taken)
              const isExpanded = expandedRun === run.id

              return (
                <Collapsible
                  key={run.id}
                  open={isExpanded}
                  onOpenChange={() =>
                    setExpandedRun(isExpanded ? null : run.id)
                  }
                >
                  <div className="rounded-xl border border-[#E2E8F0] dark:border-[#4A5568] overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <button className="w-full p-4 flex items-center justify-between hover:bg-[#F7FAFC] dark:hover:bg-[#1A202C] transition-colors text-left">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {statusIcons[run.status]}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-[#2D3748] dark:text-white truncate">
                              {run.damage_report?.title || `Run #${run.id.slice(0, 8)}`}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-[#A0AEC0]">
                              <span>
                                {new Date(run.started_at).toLocaleString('de-CH')}
                              </span>
                              {run.damage_report?.property?.name && (
                                <span>• {run.damage_report.property.name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <Badge
                            variant="secondary"
                            className={`rounded-lg px-2 py-1 text-xs font-bold ${statusColors[run.status]}`}
                          >
                            {run.status.replace(/_/g, ' ')}
                          </Badge>
                          <div className="text-right hidden sm:block">
                            {run.tokens_used && (
                              <p className="text-xs text-[#A0AEC0] flex items-center gap-1 justify-end">
                                <Zap className="h-3 w-3" />
                                {run.tokens_used.toLocaleString()} tokens
                              </p>
                            )}
                            <p className="text-xs text-[#A0AEC0]">
                              {formatDuration(run.duration_ms)}
                            </p>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-[#A0AEC0]" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-[#A0AEC0]" />
                          )}
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-[#E2E8F0] dark:border-[#4A5568] p-4 space-y-4">
                        {run.damage_report && (
                          <Link
                            href={`/dashboard/reports/${run.damage_report.id}`}
                            className="inline-flex items-center gap-1 text-sm text-[#4FD1C5] hover:underline"
                          >
                            Schadensbericht anzeigen
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
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
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="purity-gradient mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg">
              <Bot className="h-8 w-8" />
            </div>
            <p className="font-bold text-[#2D3748] dark:text-white">
              No agent runs yet
            </p>
            <p className="mt-1 text-sm text-[#A0AEC0]">
              Agent runs will appear here when damage reports are processed
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
