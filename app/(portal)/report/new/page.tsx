import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReportForm } from './report-form'

export default async function NewReportPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get tenant's properties
  const { data: tenantProperties } = await supabase
    .from('tenants_properties')
    .select(
      `
      property_id,
      unit_number,
      property:properties!tenants_properties_property_id_fkey(id, name, address)
    `
    )
    .eq('tenant_id', user.id)
    .eq('is_active', true)

  const properties =
    tenantProperties?.map((tp) => ({
      id: (tp.property as { id: string }).id,
      name: (tp.property as { name: string }).name,
      address: (tp.property as { address: string }).address,
      unit_number: tp.unit_number,
    })) || []

  return <ReportForm properties={properties} />
}
