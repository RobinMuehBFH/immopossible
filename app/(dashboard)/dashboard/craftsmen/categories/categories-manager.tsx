'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  ArrowLeft,
  Tags,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { CraftGroup, Specialization } from '@/lib/types/database.types'

type CraftGroupWithSpecs = CraftGroup & {
  specializations: Specialization[]
}

interface CategoriesManagerProps {
  initialCraftGroups: CraftGroupWithSpecs[]
}

export function CategoriesManager({ initialCraftGroups }: CategoriesManagerProps) {
  const router = useRouter()
  const supabase = createClient()

  const [craftGroups, setCraftGroups] = useState<CraftGroupWithSpecs[]>(initialCraftGroups)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  // Group dialog state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<CraftGroup | null>(null)
  const [groupForm, setGroupForm] = useState({ name: '', description: '' })

  // Spec dialog state
  const [specDialogOpen, setSpecDialogOpen] = useState(false)
  const [editingSpec, setEditingSpec] = useState<Specialization | null>(null)
  const [specForm, setSpecForm] = useState({ name: '', craft_group_id: '' })

  // Delete dialog state
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null)
  const [deleteSpecId, setDeleteSpecId] = useState<string | null>(null)

  // Toggle group expansion
  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Group CRUD
  const openGroupDialog = (group?: CraftGroup) => {
    if (group) {
      setEditingGroup(group)
      setGroupForm({ name: group.name, description: group.description || '' })
    } else {
      setEditingGroup(null)
      setGroupForm({ name: '', description: '' })
    }
    setGroupDialogOpen(true)
  }

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) return
    setLoading(true)

    try {
      if (editingGroup) {
        // Update
        const { error } = await supabase
          .from('craft_groups')
          .update({
            name: groupForm.name.trim(),
            description: groupForm.description.trim() || null,
          })
          .eq('id', editingGroup.id)

        if (error) throw error

        setCraftGroups((prev) =>
          prev.map((g) =>
            g.id === editingGroup.id
              ? { ...g, name: groupForm.name.trim(), description: groupForm.description.trim() || null }
              : g
          )
        )
      } else {
        // Create
        const maxSort = Math.max(...craftGroups.map((g) => g.sort_order || 0), 0)
        const { data, error } = await supabase
          .from('craft_groups')
          .insert({
            name: groupForm.name.trim(),
            description: groupForm.description.trim() || null,
            sort_order: maxSort + 1,
          })
          .select()
          .single()

        if (error) throw error
        if (data) {
          setCraftGroups((prev) => [...prev, { ...data, specializations: [] }])
        }
      }

      setGroupDialogOpen(false)
      router.refresh()
    } catch (err) {
      console.error('Error saving group:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!deleteGroupId) return
    setLoading(true)

    try {
      const { error } = await supabase.from('craft_groups').delete().eq('id', deleteGroupId)
      if (error) throw error

      setCraftGroups((prev) => prev.filter((g) => g.id !== deleteGroupId))
      setDeleteGroupId(null)
      router.refresh()
    } catch (err) {
      console.error('Error deleting group:', err)
    } finally {
      setLoading(false)
    }
  }

  // Spec CRUD
  const openSpecDialog = (groupId: string, spec?: Specialization) => {
    if (spec) {
      setEditingSpec(spec)
      setSpecForm({ name: spec.name, craft_group_id: spec.craft_group_id })
    } else {
      setEditingSpec(null)
      setSpecForm({ name: '', craft_group_id: groupId })
    }
    setSpecDialogOpen(true)
  }

  const handleSaveSpec = async () => {
    if (!specForm.name.trim() || !specForm.craft_group_id) return
    setLoading(true)

    try {
      if (editingSpec) {
        // Update
        const { error } = await supabase
          .from('specializations')
          .update({ name: specForm.name.trim() })
          .eq('id', editingSpec.id)

        if (error) throw error

        setCraftGroups((prev) =>
          prev.map((g) =>
            g.id === specForm.craft_group_id
              ? {
                  ...g,
                  specializations: g.specializations.map((s) =>
                    s.id === editingSpec.id ? { ...s, name: specForm.name.trim() } : s
                  ),
                }
              : g
          )
        )
      } else {
        // Create
        const { data, error } = await supabase
          .from('specializations')
          .insert({
            name: specForm.name.trim(),
            craft_group_id: specForm.craft_group_id,
          })
          .select()
          .single()

        if (error) throw error
        if (data) {
          setCraftGroups((prev) =>
            prev.map((g) =>
              g.id === specForm.craft_group_id
                ? { ...g, specializations: [...g.specializations, data] }
                : g
            )
          )
        }
      }

      setSpecDialogOpen(false)
      router.refresh()
    } catch (err) {
      console.error('Error saving specialization:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSpec = async () => {
    if (!deleteSpecId) return
    setLoading(true)

    try {
      const { error } = await supabase.from('specializations').delete().eq('id', deleteSpecId)
      if (error) throw error

      setCraftGroups((prev) =>
        prev.map((g) => ({
          ...g,
          specializations: g.specializations.filter((s) => s.id !== deleteSpecId),
        }))
      )
      setDeleteSpecId(null)
      router.refresh()
    } catch (err) {
      console.error('Error deleting specialization:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Back button and add group */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/craftsmen')}
          className="rounded-xl"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zu Handwerkern
        </Button>
        <Button onClick={() => openGroupDialog()} className="purity-gradient rounded-xl text-white">
          <Plus className="mr-2 h-4 w-4" />
          Neue Berufsgruppe
        </Button>
      </div>

      {/* Groups List */}
      <div className="space-y-3">
        {craftGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.id)
          return (
            <Card
              key={group.id}
              className="rounded-2xl border-0 shadow-lg dark:bg-[#2D3748] overflow-hidden"
            >
              <Collapsible open={isExpanded} onOpenChange={() => toggleGroup(group.id)}>
                <div className="flex items-center justify-between p-4 bg-white dark:bg-[#2D3748]">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-3 cursor-pointer flex-1">
                      <GripVertical className="h-4 w-4 text-[#A0AEC0] cursor-grab" />
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-[#A0AEC0]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[#A0AEC0]" />
                      )}
                      <div>
                        <h3 className="font-semibold text-[#2D3748] dark:text-white">
                          {group.name}
                        </h3>
                        <p className="text-xs text-[#A0AEC0]">
                          {group.specializations.length} Spezialisierung
                          {group.specializations.length !== 1 ? 'en' : ''}
                        </p>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openGroupDialog(group)}
                      className="h-8 w-8 rounded-lg hover:bg-[#F4F7FE] dark:hover:bg-[#4A5568]"
                    >
                      <Pencil className="h-4 w-4 text-[#A0AEC0]" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteGroupId(group.id)}
                      className="h-8 w-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                <CollapsibleContent>
                  <div className="border-t border-[#E2E8F0] dark:border-[#4A5568] bg-[#F7FAFC] dark:bg-[#1A202C] p-4">
                    {group.description && (
                      <p className="text-sm text-[#A0AEC0] mb-4">{group.description}</p>
                    )}
                    <div className="space-y-2">
                      {group.specializations.map((spec) => (
                        <div
                          key={spec.id}
                          className="flex items-center justify-between p-3 bg-white dark:bg-[#2D3748] rounded-xl"
                        >
                          <div className="flex items-center gap-2">
                            <Tags className="h-4 w-4 text-[#4299E1]" />
                            <span className="text-sm text-[#2D3748] dark:text-white">
                              {spec.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openSpecDialog(group.id, spec)}
                              className="h-7 w-7 rounded-lg hover:bg-[#F4F7FE] dark:hover:bg-[#4A5568]"
                            >
                              <Pencil className="h-3 w-3 text-[#A0AEC0]" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteSpecId(spec.id)}
                              className="h-7 w-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        onClick={() => openSpecDialog(group.id)}
                        className="w-full justify-start text-[#A0AEC0] hover:text-[#4299E1] rounded-xl"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Spezialisierung hinzufügen
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )
        })}

        {craftGroups.length === 0 && (
          <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F4F7FE] dark:bg-[#4A5568] mb-4">
                <Tags className="h-8 w-8 text-[#A0AEC0]" />
              </div>
              <h3 className="text-lg font-semibold text-[#2D3748] dark:text-white mb-2">
                Keine Berufsgruppen
              </h3>
              <p className="text-sm text-[#A0AEC0] mb-4">
                Erstellen Sie Berufsgruppen um Handwerker zu kategorisieren
              </p>
              <Button
                onClick={() => openGroupDialog()}
                className="purity-gradient rounded-xl text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Erste Berufsgruppe erstellen
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Group Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Berufsgruppe bearbeiten' : 'Neue Berufsgruppe'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Name *</Label>
              <Input
                id="groupName"
                value={groupForm.name}
                onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                placeholder="z.B. Sanitär"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupDescription">Beschreibung</Label>
              <Textarea
                id="groupDescription"
                value={groupForm.description}
                onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                placeholder="Optionale Beschreibung..."
                className="rounded-xl"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setGroupDialogOpen(false)}
              className="rounded-xl"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSaveGroup}
              disabled={loading || !groupForm.name.trim()}
              className="purity-gradient rounded-xl text-white"
            >
              {loading ? 'Speichern...' : 'Speichern'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Spec Dialog */}
      <Dialog open={specDialogOpen} onOpenChange={setSpecDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSpec ? 'Spezialisierung bearbeiten' : 'Neue Spezialisierung'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="specName">Name *</Label>
              <Input
                id="specName"
                value={specForm.name}
                onChange={(e) => setSpecForm({ ...specForm, name: e.target.value })}
                placeholder="z.B. Heizungsinstallation"
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setSpecDialogOpen(false)} className="rounded-xl">
              Abbrechen
            </Button>
            <Button
              onClick={handleSaveSpec}
              disabled={loading || !specForm.name.trim()}
              className="purity-gradient rounded-xl text-white"
            >
              {loading ? 'Speichern...' : 'Speichern'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Group Confirm */}
      <AlertDialog open={!!deleteGroupId} onOpenChange={() => setDeleteGroupId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Berufsgruppe löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Alle zugehörigen Spezialisierungen werden
              ebenfalls gelöscht.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-red-500 hover:bg-red-600 rounded-xl"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Spec Confirm */}
      <AlertDialog open={!!deleteSpecId} onOpenChange={() => setDeleteSpecId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Spezialisierung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSpec}
              className="bg-red-500 hover:bg-red-600 rounded-xl"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
