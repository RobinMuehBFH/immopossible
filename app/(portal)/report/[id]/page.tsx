import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ReportDetailClient } from './report-detail-client'

interface ReportDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch report with property
  const { data: report, error } = await supabase
    .from('damage_reports')
    .select(
      `
      *,
      property:properties!damage_reports_property_id_fkey(name, address)
    `
    )
    .eq('id', id)
    .eq('tenant_id', user.id)
    .single()

  if (error || !report) {
    notFound()
  }

  // Fetch booking if exists
  const { data: booking } = await supabase
    .from('bookings')
    .select(
      `
      id,
      scheduled_date,
      status,
      craftsman:craftsmen!bookings_craftsman_id_fkey(
        company_name,
        contact_name,
        phone
      )
    `
    )
    .eq('damage_report_id', id)
    .single()

  const formattedBooking = booking
    ? {
        id: booking.id,
        scheduled_date: booking.scheduled_date,
        status: booking.status,
        craftsman: booking.craftsman as {
          company_name: string
          contact_name: string | null
          phone: string | null
        },
      }
    : null

  return (
    <ReportDetailClient initialReport={report} initialBooking={formattedBooking} />
  )
}
