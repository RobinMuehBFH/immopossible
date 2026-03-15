import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Wrench, Star, FolderOpen } from 'lucide-react'
import { CraftsmenList } from './craftsmen-list'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function CraftsmenPage() {
  const supabase = await createClient()

  // Fetch craftsmen
  const { data: craftsmen } = await supabase
    .from('craftsmen')
    .select('*')
    .order('company_name', { ascending: true })

  // Fetch craft groups with specializations
  const { data: craftGroups } = await supabase
    .from('craft_groups')
    .select(`
      *,
      specializations (*)
    `)
    .order('sort_order', { ascending: true })

  // Calculate average rating
  const ratedCraftsmen = craftsmen?.filter((c) => c.avg_rating) || []
  const avgRating = ratedCraftsmen.length > 0
    ? ratedCraftsmen.reduce((sum, c) => sum + (c.avg_rating || 0), 0) / ratedCraftsmen.length
    : 0

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#2D3748] dark:text-white">
            Handwerker
          </h2>
          <p className="text-[#A0AEC0]">Verwalten Sie Ihr Handwerker-Netzwerk</p>
        </div>
        <Link href="/dashboard/craftsmen/categories">
          <Button variant="outline" className="rounded-xl">
            <FolderOpen className="mr-2 h-4 w-4" />
            Kategorien verwalten
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="purity-gradient flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg">
                <Wrench className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                  Total Handwerker
                </p>
                <p className="text-2xl font-bold text-[#2D3748] dark:text-white">
                  {craftsmen?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success shadow-lg">
                <Wrench className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                  Aktiv
                </p>
                <p className="text-2xl font-bold text-success">
                  {craftsmen?.filter((c) => c.is_active).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ED8936]/10 text-[#ED8936] shadow-lg">
                <Star className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                  Ø Bewertung
                </p>
                <p className="text-2xl font-bold text-[#ED8936]">
                  {avgRating > 0 ? avgRating.toFixed(1) : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Craftsmen List with CRUD */}
      <CraftsmenList 
        initialCraftsmen={craftsmen || []} 
        craftGroups={craftGroups || []}
      />
    </div>
  )
}
