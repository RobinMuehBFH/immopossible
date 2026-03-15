import { auth } from '@/lib/auth/config'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { ReportForm } from './report-form'

export default async function NewReportPage() {
  const session = await auth()
  const supabase = createAuthenticatedSupabaseClient(session!.supabaseAccessToken!)
  const userId = session!.user.id

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
    .eq('tenant_id', userId)
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
