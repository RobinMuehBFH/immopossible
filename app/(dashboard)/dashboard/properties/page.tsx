import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Building2 } from 'lucide-react'
import { PropertiesList } from './properties-list'

export const dynamic = 'force-dynamic'

export default async function PropertiesPage() {
  const supabase = await createClient()

  const { data: properties } = await supabase
    .from('properties')
    .select('*')
    .order('name', { ascending: true })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#2D3748] dark:text-white">
          Properties
        </h2>
        <p className="text-[#A0AEC0]">Manage your property portfolio</p>
      </div>

      {/* Stats */}
      <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="purity-gradient flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                Total Properties
              </p>
              <p className="text-2xl font-bold text-[#2D3748] dark:text-white">
                {properties?.length || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Properties List with CRUD */}
      <PropertiesList initialProperties={properties || []} />
    </div>
  )
}
