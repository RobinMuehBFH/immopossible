'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Wrench, Plus, Edit2, Trash2, Loader2, Phone, Mail, Star, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Craftsman, CraftGroup, Specialization } from '@/lib/types/database.types'

interface CraftsmenListProps {
  initialCraftsmen: Craftsman[]
  craftGroups: (CraftGroup & { specializations: Specialization[] })[]
}

interface CraftsmanFormData {
  company_name: string
  contact_name: string
  email: string
  phone: string
  specialization_ids: string[]
  hourly_rate_chf: string
  is_active: boolean
  notes: string
}

const emptyForm: CraftsmanFormData = {
  company_name: '',
  contact_name: '',
  email: '',
  phone: '',
  specialization_ids: [],
  hourly_rate_chf: '',
  is_active: true,
  notes: '',
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-[#A0AEC0]">—</span>
  
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3 w-3 ${
            star <= rating
              ? 'fill-[#ED8936] text-[#ED8936]'
              : 'text-[#E2E8F0] dark:text-[#4A5568]'
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-[#A0AEC0]">({rating.toFixed(1)})</span>
    </div>
  )
}

export function CraftsmenList({ initialCraftsmen, craftGroups }: CraftsmenListProps) {
  const [craftsmen, setCraftsmen] = useState<Craftsman[]>(initialCraftsmen)
  const [filteredCraftsmen, setFilteredCraftsmen] = useState<Craftsman[]>(initialCraftsmen)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<CraftsmanFormData>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterGroup, setFilterGroup] = useState<string>('all')
  const router = useRouter()

  // Create a flat map of specialization id -> name for display
  const specializationMap = new Map<string, { name: string; groupName: string }>()
  craftGroups.forEach((group) => {
    group.specializations.forEach((spec) => {
      specializationMap.set(spec.id, { name: spec.name, groupName: group.name })
    })
  })

  // Filter craftsmen when filter changes
  useEffect(() => {
    if (filterGroup === 'all') {
      setFilteredCraftsmen(craftsmen)
    } else {
      const group = craftGroups.find((g) => g.id === filterGroup)
      if (group) {
        const specIds = group.specializations.map((s) => s.id)
        setFilteredCraftsmen(
          craftsmen.filter((c) =>
            c.specialization_ids?.some((id) => specIds.includes(id))
          )
        )
      }
    }
  }, [filterGroup, craftsmen, craftGroups])

  const handleOpenCreate = () => {
    setEditingId(null)
    setFormData(emptyForm)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (craftsman: Craftsman) => {
    setEditingId(craftsman.id)
    setFormData({
      company_name: craftsman.company_name,
      contact_name: craftsman.contact_name || '',
      email: craftsman.email || '',
      phone: craftsman.phone || '',
      specialization_ids: craftsman.specialization_ids || [],
      hourly_rate_chf: craftsman.hourly_rate_chf?.toString() || '',
      is_active: craftsman.is_active,
      notes: craftsman.notes || '',
    })
    setIsDialogOpen(true)
  }

  const toggleSpecialization = (specId: string) => {
    setFormData((prev) => ({
      ...prev,
      specialization_ids: prev.specialization_ids.includes(specId)
        ? prev.specialization_ids.filter((id) => id !== specId)
        : [...prev.specialization_ids, specId],
    }))
  }

  const handleSubmit = async () => {
    if (!formData.company_name) {
      toast.error('Bitte Firmenname eingeben')
      return
    }

    setIsSubmitting(true)
    const supabase = createClient()

    try {
      const payload = {
        company_name: formData.company_name,
        contact_name: formData.contact_name || null,
        email: formData.email || null,
        phone: formData.phone || null,
        specialization_ids: formData.specialization_ids,
        hourly_rate_chf: formData.hourly_rate_chf
          ? parseFloat(formData.hourly_rate_chf)
          : null,
        is_active: formData.is_active,
        notes: formData.notes || null,
      }

      if (editingId) {
        const { data, error } = await supabase
          .from('craftsmen')
          .update(payload)
          .eq('id', editingId)
          .select()
          .single()

        if (error) throw error

        setCraftsmen((prev) =>
          prev.map((c) => (c.id === editingId ? data : c))
        )
        toast.success('Handwerker aktualisiert')
      } else {
        const { data, error } = await supabase
          .from('craftsmen')
          .insert(payload)
          .select()
          .single()

        if (error) throw error

        setCraftsmen((prev) => [...prev, data])
        toast.success('Handwerker erstellt')
      }

      setIsDialogOpen(false)
      setFormData(emptyForm)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Speichern')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Handwerker wirklich löschen?')) return

    const supabase = createClient()

    try {
      const { error } = await supabase.from('craftsmen').delete().eq('id', id)
      if (error) throw error

      setCraftsmen((prev) => prev.filter((c) => c.id !== id))
      toast.success('Handwerker gelöscht')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Löschen')
    }
  }

  const getSpecializationNames = (specIds: string[] | null) => {
    if (!specIds || specIds.length === 0) return []
    return specIds
      .map((id) => specializationMap.get(id))
      .filter(Boolean) as { name: string; groupName: string }[]
  }

  return (
    <>
      <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
        <CardHeader className="pb-4 flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-lg font-bold text-[#2D3748] dark:text-white flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Alle Handwerker
          </CardTitle>
          <div className="flex items-center gap-3">
            {/* Filter by Group */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#A0AEC0]" />
              <Select value={filterGroup} onValueChange={(v) => setFilterGroup(v || 'all')}>
                <SelectTrigger className="w-[180px] rounded-xl border-[#E2E8F0] dark:border-[#4A5568]">
                  <SelectValue placeholder="Alle Gruppen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Gruppen</SelectItem>
                  {craftGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleOpenCreate}
              className="purity-gradient rounded-xl text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Handwerker hinzufügen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCraftsmen.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#E2E8F0] dark:border-[#4A5568]">
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                      Firma
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                      Kontakt
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                      Spezialisierungen
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                      Bewertung
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                      Tarif
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0] text-right">
                      Aktionen
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCraftsmen.map((craftsman) => {
                    const specs = getSpecializationNames(craftsman.specialization_ids)
                    return (
                      <TableRow
                        key={craftsman.id}
                        className="border-b border-[#E2E8F0] dark:border-[#4A5568]"
                      >
                        <TableCell>
                          <p className="font-bold text-[#2D3748] dark:text-white">
                            {craftsman.company_name}
                          </p>
                          {craftsman.contact_name && (
                            <p className="text-xs text-[#A0AEC0]">
                              {craftsman.contact_name}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {craftsman.phone && (
                              <a
                                href={`tel:${craftsman.phone}`}
                                className="flex items-center gap-1 text-xs text-[#A0AEC0] hover:text-[#4FD1C5]"
                              >
                                <Phone className="h-3 w-3" />
                                {craftsman.phone}
                              </a>
                            )}
                            {craftsman.email && (
                              <a
                                href={`mailto:${craftsman.email}`}
                                className="flex items-center gap-1 text-xs text-[#A0AEC0] hover:text-[#4FD1C5]"
                              >
                                <Mail className="h-3 w-3" />
                                {craftsman.email}
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {specs.length > 0 ? (
                              specs.slice(0, 3).map((spec, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="rounded-lg px-2 py-0.5 text-xs bg-[#4FD1C5]/10 text-[#4FD1C5]"
                                  title={spec.groupName}
                                >
                                  {spec.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-[#A0AEC0]">—</span>
                            )}
                            {specs.length > 3 && (
                              <Badge
                                variant="secondary"
                                className="rounded-lg px-2 py-0.5 text-xs bg-[#A0AEC0]/10 text-[#A0AEC0]"
                              >
                                +{specs.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StarRating rating={craftsman.avg_rating} />
                          {craftsman.total_reviews > 0 && (
                            <p className="text-xs text-[#A0AEC0] mt-0.5">
                              {craftsman.total_reviews} Bewertungen
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-[#A0AEC0]">
                          {craftsman.hourly_rate_chf
                            ? `CHF ${craftsman.hourly_rate_chf}/h`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`rounded-lg px-2 py-1 text-xs font-bold ${
                              craftsman.is_active
                                ? 'bg-success/10 text-success'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {craftsman.is_active ? 'Aktiv' : 'Inaktiv'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(craftsman)}
                              className="text-[#A0AEC0] hover:text-[#4FD1C5]"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(craftsman.id)}
                              className="text-[#A0AEC0] hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="purity-gradient mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg">
                <Wrench className="h-8 w-8" />
              </div>
              <p className="font-bold text-[#2D3748] dark:text-white">
                {filterGroup !== 'all'
                  ? 'Keine Handwerker in dieser Kategorie'
                  : 'Noch keine Handwerker'}
              </p>
              <p className="mt-1 text-sm text-[#A0AEC0]">
                {filterGroup !== 'all'
                  ? 'Wählen Sie eine andere Kategorie oder fügen Sie neue Handwerker hinzu'
                  : 'Fügen Sie Ihren ersten Handwerker hinzu'}
              </p>
              <Button
                onClick={handleOpenCreate}
                className="purity-gradient mt-4 rounded-xl text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Handwerker hinzufügen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl dark:bg-[#2D3748] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#2D3748] dark:text-white">
              {editingId ? 'Handwerker bearbeiten' : 'Handwerker hinzufügen'}
            </DialogTitle>
            <DialogDescription className="text-[#A0AEC0]">
              {editingId
                ? 'Aktualisieren Sie die Handwerkerdaten'
                : 'Geben Sie die Handwerkerdaten ein'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium text-[#A0AEC0]">
                Firmenname *
              </Label>
              <Input
                value={formData.company_name}
                onChange={(e) =>
                  setFormData({ ...formData, company_name: e.target.value })
                }
                placeholder="z.B. Müller Sanitär AG"
                className="mt-2 rounded-xl border-[#E2E8F0] dark:border-[#4A5568] dark:bg-[#1A202C]"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-[#A0AEC0]">
                Kontaktperson
              </Label>
              <Input
                value={formData.contact_name}
                onChange={(e) =>
                  setFormData({ ...formData, contact_name: e.target.value })
                }
                placeholder="Hans Müller"
                className="mt-2 rounded-xl border-[#E2E8F0] dark:border-[#4A5568] dark:bg-[#1A202C]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-[#A0AEC0]">E-Mail</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="hans@mueller.ch"
                  className="mt-2 rounded-xl border-[#E2E8F0] dark:border-[#4A5568] dark:bg-[#1A202C]"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-[#A0AEC0]">Telefon</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+41 79 123 45 67"
                  className="mt-2 rounded-xl border-[#E2E8F0] dark:border-[#4A5568] dark:bg-[#1A202C]"
                />
              </div>
            </div>
            
            {/* Specializations grouped by craft_group */}
            <div>
              <Label className="text-sm font-medium text-[#A0AEC0]">
                Spezialisierungen
              </Label>
              <div className="mt-2 space-y-3 max-h-[200px] overflow-y-auto rounded-xl border border-[#E2E8F0] dark:border-[#4A5568] p-3">
                {craftGroups.map((group) => (
                  <div key={group.id}>
                    <p className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0] mb-2">
                      {group.name}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {group.specializations.map((spec) => (
                        <Badge
                          key={spec.id}
                          variant="secondary"
                          onClick={() => toggleSpecialization(spec.id)}
                          className={`cursor-pointer rounded-lg px-3 py-1 text-xs transition-colors ${
                            formData.specialization_ids.includes(spec.id)
                              ? 'bg-[#4FD1C5] text-white'
                              : 'bg-[#F7FAFC] dark:bg-[#1A202C] text-[#A0AEC0] hover:bg-[#4FD1C5]/10'
                          }`}
                        >
                          {spec.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-1 text-xs text-[#A0AEC0]">
                {formData.specialization_ids.length} ausgewählt
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-[#A0AEC0]">
                  Stundensatz (CHF)
                </Label>
                <Input
                  type="number"
                  value={formData.hourly_rate_chf}
                  onChange={(e) =>
                    setFormData({ ...formData, hourly_rate_chf: e.target.value })
                  }
                  placeholder="95"
                  className="mt-2 rounded-xl border-[#E2E8F0] dark:border-[#4A5568] dark:bg-[#1A202C]"
                />
              </div>
              <div className="flex items-end">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked: boolean) =>
                      setFormData({ ...formData, is_active: checked })
                    }
                  />
                  <Label className="text-sm font-medium text-[#A0AEC0]">
                    Aktiv
                  </Label>
                </div>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-[#A0AEC0]">Notizen</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Zusätzliche Notizen zum Handwerker..."
                className="mt-2 rounded-xl border-[#E2E8F0] dark:border-[#4A5568] dark:bg-[#1A202C]"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="rounded-xl"
              disabled={isSubmitting}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="purity-gradient rounded-xl text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Speichern...
                </>
              ) : editingId ? (
                'Aktualisieren'
              ) : (
                'Erstellen'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
