'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Building2, Plus, Edit2, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Property } from '@/lib/types/database.types'

interface PropertiesListProps {
  initialProperties: Property[]
}

interface PropertyFormData {
  name: string
  address: string
  city: string
  postal_code: string
  country: string
  erp_property_id: string
}

const emptyForm: PropertyFormData = {
  name: '',
  address: '',
  city: '',
  postal_code: '',
  country: 'CH',
  erp_property_id: '',
}

export function PropertiesList({ initialProperties }: PropertiesListProps) {
  const [properties, setProperties] = useState<Property[]>(initialProperties)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<PropertyFormData>(emptyForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleOpenCreate = () => {
    setEditingId(null)
    setFormData(emptyForm)
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (property: Property) => {
    setEditingId(property.id)
    setFormData({
      name: property.name,
      address: property.address,
      city: property.city,
      postal_code: property.postal_code,
      country: property.country,
      erp_property_id: property.erp_property_id || '',
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.address || !formData.city || !formData.postal_code) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    const supabase = createClient()

    try {
      if (editingId) {
        // Update
        const { data, error } = await supabase
          .from('properties')
          .update({
            name: formData.name,
            address: formData.address,
            city: formData.city,
            postal_code: formData.postal_code,
            country: formData.country,
            erp_property_id: formData.erp_property_id || null,
          })
          .eq('id', editingId)
          .select()
          .single()

        if (error) throw error

        setProperties((prev) =>
          prev.map((p) => (p.id === editingId ? data : p))
        )
        toast.success('Property updated successfully')
      } else {
        // Create
        const { data, error } = await supabase
          .from('properties')
          .insert({
            name: formData.name,
            address: formData.address,
            city: formData.city,
            postal_code: formData.postal_code,
            country: formData.country,
            erp_property_id: formData.erp_property_id || null,
          })
          .select()
          .single()

        if (error) throw error

        setProperties((prev) => [...prev, data])
        toast.success('Property created successfully')
      }

      setIsDialogOpen(false)
      setFormData(emptyForm)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save property')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return

    const supabase = createClient()

    try {
      const { error } = await supabase.from('properties').delete().eq('id', id)

      if (error) throw error

      setProperties((prev) => prev.filter((p) => p.id !== id))
      toast.success('Property deleted successfully')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete property')
    }
  }

  return (
    <>
      <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold text-[#2D3748] dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            All Properties
          </CardTitle>
          <Button
            onClick={handleOpenCreate}
            className="purity-gradient rounded-xl text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
        </CardHeader>
        <CardContent>
          {properties.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#E2E8F0] dark:border-[#4A5568]">
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                      Name
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                      Address
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                      City
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                      ERP ID
                    </TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((property) => (
                    <TableRow
                      key={property.id}
                      className="border-b border-[#E2E8F0] dark:border-[#4A5568]"
                    >
                      <TableCell className="font-bold text-[#2D3748] dark:text-white">
                        {property.name}
                      </TableCell>
                      <TableCell className="text-sm text-[#A0AEC0]">
                        {property.address}
                      </TableCell>
                      <TableCell className="text-sm text-[#A0AEC0]">
                        {property.postal_code} {property.city}
                      </TableCell>
                      <TableCell className="text-sm text-[#A0AEC0] font-mono">
                        {property.erp_property_id || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(property)}
                            className="text-[#A0AEC0] hover:text-[#4FD1C5]"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(property.id)}
                            className="text-[#A0AEC0] hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="purity-gradient mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg">
                <Building2 className="h-8 w-8" />
              </div>
              <p className="font-bold text-[#2D3748] dark:text-white">
                No properties yet
              </p>
              <p className="mt-1 text-sm text-[#A0AEC0]">
                Add your first property to get started
              </p>
              <Button
                onClick={handleOpenCreate}
                className="purity-gradient mt-4 rounded-xl text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl dark:bg-[#2D3748] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#2D3748] dark:text-white">
              {editingId ? 'Edit Property' : 'Add Property'}
            </DialogTitle>
            <DialogDescription className="text-[#A0AEC0]">
              {editingId
                ? 'Update the property details below'
                : 'Enter the property details below'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium text-[#A0AEC0]">
                Property Name *
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Bahnhofstrasse 10"
                className="mt-2 rounded-xl border-[#E2E8F0] dark:border-[#4A5568] dark:bg-[#1A202C]"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-[#A0AEC0]">Address *</Label>
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Street and number"
                className="mt-2 rounded-xl border-[#E2E8F0] dark:border-[#4A5568] dark:bg-[#1A202C]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-[#A0AEC0]">
                  Postal Code *
                </Label>
                <Input
                  value={formData.postal_code}
                  onChange={(e) =>
                    setFormData({ ...formData, postal_code: e.target.value })
                  }
                  placeholder="3011"
                  className="mt-2 rounded-xl border-[#E2E8F0] dark:border-[#4A5568] dark:bg-[#1A202C]"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-[#A0AEC0]">City *</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Bern"
                  className="mt-2 rounded-xl border-[#E2E8F0] dark:border-[#4A5568] dark:bg-[#1A202C]"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-[#A0AEC0]">
                ERP Property ID
              </Label>
              <Input
                value={formData.erp_property_id}
                onChange={(e) =>
                  setFormData({ ...formData, erp_property_id: e.target.value })
                }
                placeholder="ERP-PROP-001"
                className="mt-2 rounded-xl border-[#E2E8F0] dark:border-[#4A5568] dark:bg-[#1A202C]"
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
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="purity-gradient rounded-xl text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingId ? (
                'Update'
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
