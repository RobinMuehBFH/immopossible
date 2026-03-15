import { auth } from '@/lib/auth/config'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { FolderOpen, Tags } from 'lucide-react'
import { CategoriesManager } from './categories-manager'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const session = await auth()
  const supabase = createAuthenticatedSupabaseClient(session!.supabaseAccessToken!)

  // Fetch craft groups with specializations
  const { data: craftGroups } = await supabase
    .from('craft_groups')
    .select(`
      *,
      specializations (*)
    `)
    .order('sort_order', { ascending: true })

  const totalGroups = craftGroups?.length || 0
  const totalSpecializations = craftGroups?.reduce(
    (sum, g) => sum + (g.specializations?.length || 0),
    0
  ) || 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#2D3748] dark:text-white">
          Handwerker-Kategorien
        </h2>
        <p className="text-[#A0AEC0]">Verwalten Sie Berufsgruppen und Spezialisierungen</p>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="purity-gradient flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg">
                <FolderOpen className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                  Berufsgruppen
                </p>
                <p className="text-2xl font-bold text-[#2D3748] dark:text-white">
                  {totalGroups}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#4299E1]/10 text-[#4299E1] shadow-lg">
                <Tags className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                  Spezialisierungen
                </p>
                <p className="text-2xl font-bold text-[#4299E1]">
                  {totalSpecializations}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Manager */}
      <CategoriesManager initialCraftGroups={craftGroups || []} />
    </div>
  )
}
