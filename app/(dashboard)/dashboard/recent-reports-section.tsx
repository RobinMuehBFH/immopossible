import { auth } from '@/lib/auth/config'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { RecentReportsTable, type ReportRow } from './recent-reports-table'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export async function RecentReportsSection() {
  const session = await auth()
  const supabase = createAuthenticatedSupabaseClient(session!.supabaseAccessToken!)

  const [{ data: reports }, { data: properties }] = await Promise.all([
    supabase
      .from('damage_reports')
      .select(
        `id, title, status, priority, created_at, property_id,
         tenant:profiles!damage_reports_tenant_id_fkey(full_name, email),
         property:properties!damage_reports_property_id_fkey(name)`
      )
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('properties').select('id, name').order('name'),
  ])

  return (
    <RecentReportsTable
      reports={(reports as ReportRow[]) ?? []}
      properties={properties ?? []}
    />
  )
}

export function RecentReportsSkeleton() {
  return (
    <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
      <CardHeader className="pb-3">
        <div className="h-6 w-40 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="mt-4 flex gap-3">
          {[220, 170, 150, 170].map((w, i) => (
            <div
              key={i}
              style={{ width: w }}
              className="h-9 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800"
              style={{ opacity: 1 - i * 0.12 }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
