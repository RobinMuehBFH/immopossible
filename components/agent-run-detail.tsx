'use client'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { CheckCircle, ChevronDown, ChevronRight, XCircle } from 'lucide-react'
import { useState } from 'react'

export interface AgentStep {
  tool: string
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  timestamp?: string
  durationMs?: number
  error?: string
}

export const toolLabels: Record<string, string> = {
  classify_damage_report: 'Schadensbericht klassifizieren',
  find_craftsman: 'Handwerker suchen',
  estimate_cost: 'Kosten schätzen',
  request_human_approval: 'Manager-Genehmigung anfordern',
  book_craftsman: 'Handwerker buchen',
  send_notification: 'Benachrichtigung senden',
  update_report_status: 'Status aktualisieren',
  check_erp_mock: 'ERP-System prüfen',
}

function formatDuration(ms: number | null | undefined) {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

interface AgentRunDetailProps {
  steps: AgentStep[]
  outputSummary?: string | null
  errorMessage?: string | null
}

export function AgentRunDetail({ steps, outputSummary, errorMessage }: AgentRunDetailProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())

  const toggleStep = (index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  return (
    <div className="space-y-3">
      {outputSummary && (
        <div className="rounded-lg bg-success/5 p-3">
          <p className="text-sm font-medium text-success mb-1">Output Summary</p>
          <p className="text-sm text-[#2D3748] dark:text-[#E2E8F0]">{outputSummary}</p>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-lg bg-destructive/5 p-3">
          <p className="text-sm font-medium text-destructive mb-1">Error</p>
          <p className="text-sm text-[#2D3748] dark:text-[#E2E8F0]">{errorMessage}</p>
        </div>
      )}

      {steps.length > 0 && (
        <div>
          <p className="text-sm font-medium text-[#A0AEC0] mb-2">Schritte ({steps.length})</p>
          <div className="space-y-2">
            {steps.map((step, index) => {
              const isExpanded = expandedSteps.has(index)
              return (
                <Collapsible key={index} open={isExpanded} onOpenChange={() => toggleStep(index)}>
                  <div className="rounded-lg border border-[#E2E8F0] dark:border-[#4A5568]">
                    <CollapsibleTrigger asChild>
                      <button className="w-full p-3 flex items-center justify-between hover:bg-[#F7FAFC] dark:hover:bg-[#1A202C] transition-colors text-left">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4FD1C5]/10 text-xs font-bold text-[#4FD1C5]">
                            {index + 1}
                          </span>
                          <div>
                            <span className="text-sm font-semibold text-[#2D3748] dark:text-white">
                              {toolLabels[step.tool] ?? step.tool?.replace(/_/g, ' ')}
                            </span>
                            <span className="ml-2 font-mono text-xs text-[#A0AEC0]">
                              {step.tool}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {step.error ? (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ) : step.output ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : null}
                          {step.durationMs && (
                            <span className="text-xs text-[#A0AEC0]">
                              {formatDuration(step.durationMs)}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-[#A0AEC0]" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-[#A0AEC0]" />
                          )}
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-[#E2E8F0] dark:border-[#4A5568] p-3 space-y-3">
                        {step.input && Object.keys(step.input).length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-[#A0AEC0] mb-1">Input</p>
                            <pre className="text-xs bg-[#F7FAFC] dark:bg-[#1A202C] p-2 rounded-lg overflow-x-auto">
                              {JSON.stringify(step.input, null, 2)}
                            </pre>
                          </div>
                        )}
                        {step.output && Object.keys(step.output).length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-[#A0AEC0] mb-1">Output</p>
                            <pre className="text-xs bg-[#F7FAFC] dark:bg-[#1A202C] p-2 rounded-lg overflow-x-auto">
                              {JSON.stringify(step.output, null, 2)}
                            </pre>
                          </div>
                        )}
                        {step.error && (
                          <div>
                            <p className="text-xs font-medium text-destructive mb-1">Error</p>
                            <pre className="text-xs bg-destructive/5 p-2 rounded-lg overflow-x-auto text-destructive">
                              {step.error}
                            </pre>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              )
            })}
          </div>
        </div>
      )}

      {steps.length === 0 && !outputSummary && !errorMessage && (
        <p className="text-sm text-[#A0AEC0] text-center py-2">Keine Details verfügbar</p>
      )}
    </div>
  )
}
