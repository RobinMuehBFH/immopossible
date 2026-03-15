'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ArrowUp, Building2, FileText, Wrench, Bot } from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'

const reportsData = [
  { name: 'Jan', value: 12 },
  { name: 'Feb', value: 19 },
  { name: 'Mar', value: 15 },
  { name: 'Apr', value: 25 },
  { name: 'May', value: 22 },
  { name: 'Jun', value: 30 },
  { name: 'Jul', value: 28 },
  { name: 'Aug', value: 35 },
  { name: 'Sep', value: 40 },
  { name: 'Oct', value: 32 },
  { name: 'Nov', value: 45 },
  { name: 'Dec', value: 50 },
]

const weeklyData = [
  { name: 'Mon', value: 4 },
  { name: 'Tue', value: 7 },
  { name: 'Wed', value: 5 },
  { name: 'Thu', value: 10 },
  { name: 'Fri', value: 8 },
  { name: 'Sat', value: 3 },
  { name: 'Sun', value: 2 },
]

interface DashboardChartsProps {
  stats: {
    reports: number
    properties: number
    craftsmen: number
    agentRuns: number
  }
}

export function DashboardCharts({ stats }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Reports Overview Chart */}
      <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-[#2D3748] dark:text-[#E2E8F0]">Reports Overview</h3>
          <p className="mb-4 flex items-center gap-1 text-sm text-[#A0AEC0]">
            <ArrowUp className="h-4 w-4 text-green-500" />
            <span className="font-bold text-green-500">+12%</span> more this year
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reportsData}>
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
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#A0AEC0', fontSize: 12 }} />
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

      {/* Weekly Activity Chart */}
      <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-[#2D3748] dark:text-[#E2E8F0]">Weekly Activity</h3>
          <p className="mb-4 flex items-center gap-1 text-sm text-[#A0AEC0]">
            <span className="text-green-500">(+23%)</span> than last week
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#A0AEC0', fontSize: 12 }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#A0AEC0', fontSize: 12 }} />
                <Bar dataKey="value" fill="#4FD1C5" radius={[8, 8, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stats below chart */}
          <div className="mt-6 grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="mb-1 flex items-center justify-center gap-1">
                <FileText className="h-4 w-4 text-[#4FD1C5]" />
                <span className="text-xs font-bold text-[#2D3748] dark:text-[#E2E8F0]">Reports</span>
              </div>
              <p className="text-lg font-bold text-[#2D3748] dark:text-[#E2E8F0]">{stats.reports}</p>
            </div>
            <div className="text-center">
              <div className="mb-1 flex items-center justify-center gap-1">
                <Building2 className="h-4 w-4 text-[#4FD1C5]" />
                <span className="text-xs font-bold text-[#2D3748] dark:text-[#E2E8F0]">
                  Properties
                </span>
              </div>
              <p className="text-lg font-bold text-[#2D3748] dark:text-[#E2E8F0]">
                {stats.properties}
              </p>
            </div>
            <div className="text-center">
              <div className="mb-1 flex items-center justify-center gap-1">
                <Wrench className="h-4 w-4 text-[#4FD1C5]" />
                <span className="text-xs font-bold text-[#2D3748] dark:text-[#E2E8F0]">
                  Craftsmen
                </span>
              </div>
              <p className="text-lg font-bold text-[#2D3748] dark:text-[#E2E8F0]">
                {stats.craftsmen}
              </p>
            </div>
            <div className="text-center">
              <div className="mb-1 flex items-center justify-center gap-1">
                <Bot className="h-4 w-4 text-[#4FD1C5]" />
                <span className="text-xs font-bold text-[#2D3748] dark:text-[#E2E8F0]">
                  Agent Runs
                </span>
              </div>
              <p className="text-lg font-bold text-[#2D3748] dark:text-[#E2E8F0]">
                {stats.agentRuns}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
