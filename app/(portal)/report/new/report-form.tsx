'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageUpload } from '@/components/image-upload'
import { createDamageReport, uploadImages } from '../actions'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Property {
  id: string
  name: string
  address: string
  unit_number?: string | null
}

interface ReportFormProps {
  properties: Property[]
}

export function ReportForm({ properties }: ReportFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [selectedProperty, setSelectedProperty] = useState<string>('')

  const handleUpload = async (files: File[]): Promise<string[]> => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))

    const result = await uploadImages(formData)
    if (result.error) {
      toast.error('Failed to upload images')
      return []
    }
    return result.urls
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const form = e.currentTarget
      const formData = new FormData(form)
      formData.set('image_urls', JSON.stringify(imageUrls))
      formData.set('property_id', selectedProperty)

      const result = await createDamageReport(formData)
      if (result?.error) {
        toast.error(result.error)
      }
      // On success, the action redirects
    } catch {
      toast.error('Failed to submit report')
      setIsSubmitting(false)
    }
  }

  const handlePropertyChange = (value: string | null) => {
    setSelectedProperty(value || '')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/portal">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Report Damage</h1>
          <p className="text-foreground-muted">
            Describe the issue and we&apos;ll take care of it
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Damage Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Property Selection */}
            {properties.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="property">Property</Label>
                <Select
                  value={selectedProperty}
                  onValueChange={handlePropertyChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                        {property.unit_number && ` - Unit ${property.unit_number}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Leaking faucet in bathroom"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Please describe the damage in detail. When did it start? How severe is it?"
                rows={5}
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location_in_property">
                Location in Property
              </Label>
              <Input
                id="location_in_property"
                name="location_in_property"
                placeholder="e.g., Master bathroom, Kitchen, Living room"
                disabled={isSubmitting}
              />
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label>Photos (optional)</Label>
              <p className="text-sm text-foreground-muted mb-2">
                Upload up to 5 photos of the damage to help us assess the situation
              </p>
              <ImageUpload
                value={imageUrls}
                onChange={setImageUrls}
                onUpload={handleUpload}
                maxFiles={5}
                disabled={isSubmitting}
              />
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
