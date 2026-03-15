'use client'

import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, XCircle, Clock, Bot } from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DashboardChartsProps {
  reportsByMonth: { name: string; value: number }[]
  reportsByStatus: { name: string; value: number }[]
  agentStats: {
    completed: number
    failed: number
    running: number
    successRate: number | null
    avgDurationSec: number | null
  }
}

export function DashboardCharts({ reportsByMonth, reportsByStatus, agentStats }: DashboardChartsProps) {
  const total = agentStats.completed + agentStats.failed + agentStats.running

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Reports by Month */}
      <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-[#2D3748] dark:text-[#E2E8F0]">Reports by Month</h3>
          <p className="mb-4 text-sm text-[#A0AEC0]">New damage reports over the last 12 months</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reportsByMonth}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4FD1C5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4FD1C5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#A0AEC0', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#A0AEC0', fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}
                  labelStyle={{ color: '#2D3748', fontWeight: 700 }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#4FD1C5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Reports by Status + Agent Stats */}
      <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-[#2D3748] dark:text-[#E2E8F0]">Reports by Status</h3>
          <p className="mb-4 text-sm text-[#A0AEC0]">Distribution across all report statuses</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportsByStatus} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#A0AEC0', fontSize: 11 }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#A0AEC0', fontSize: 11 }}
                  width={110}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}
                  labelStyle={{ color: '#2D3748', fontWeight: 700 }}
                />
                <Bar dataKey="value" fill="#4FD1C5" radius={[0, 6, 6, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Agent Run Stats */}
          <div className="mt-4 border-t border-[#E2E8F0] pt-4 dark:border-[#4A5568]">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
              Agent Run Summary
            </p>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <div className="mb-1 flex items-center justify-center gap-1">
                  <Bot className="h-3.5 w-3.5 text-[#4FD1C5]" />
                </div>
                <p className="text-base font-bold text-[#2D3748] dark:text-[#E2E8F0]">{total}</p>
                <p className="text-xs text-[#A0AEC0]">Total</p>
              </div>
              <div className="text-center">
                <div className="mb-1 flex items-center justify-center">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#48BB78]" />
                </div>
                <p className="text-base font-bold text-[#2D3748] dark:text-[#E2E8F0]">
                  {agentStats.completed}
                </p>
                <p className="text-xs text-[#A0AEC0]">Done</p>
              </div>
              <div className="text-center">
                <div className="mb-1 flex items-center justify-center">
                  <XCircle className="h-3.5 w-3.5 text-[#E53E3E]" />
                </div>
                <p className="text-base font-bold text-[#2D3748] dark:text-[#E2E8F0]">
                  {agentStats.failed}
                </p>
                <p className="text-xs text-[#A0AEC0]">Failed</p>
              </div>
              <div className="text-center">
                <div className="mb-1 flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5 text-[#A0AEC0]" />
                </div>
                <p className="text-base font-bold text-[#2D3748] dark:text-[#E2E8F0]">
                  {agentStats.avgDurationSec !== null ? `${agentStats.avgDurationSec}s` : '—'}
                </p>
                <p className="text-xs text-[#A0AEC0]">Avg. Time</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
