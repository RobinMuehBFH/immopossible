'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { ArrowLeft, Building2, FileText, MapPin, Camera } from 'lucide-react'
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
  const [selectedProperty, setSelectedProperty] = useState<string>(
    properties.length === 1 ? properties[0].id : ''
  )

  const handleUpload = async (files: File[]): Promise<string[]> => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))

    const result = await uploadImages(formData)
    if (result.error) {
      toast.error(`Bild-Upload fehlgeschlagen: ${result.error}`)
      return []
    }
    return result.urls
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedProperty) {
      toast.error('Bitte eine Liegenschaft auswählen')
      return
    }
    setIsSubmitting(true)

    try {
      const form = e.currentTarget
      const formData = new FormData(form)
      formData.set('image_urls', JSON.stringify(imageUrls))
      formData.set('property_id', selectedProperty)

      const result = await createDamageReport(formData)
      if (result?.error) {
        toast.error(result.error)
        setIsSubmitting(false)
      }
      // On success, the action redirects
    } catch {
      toast.error('Meldung konnte nicht übermittelt werden')
      setIsSubmitting(false)
    }
  }

  const selectedPropertyData = properties.find((p) => p.id === selectedProperty)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Link href="/portal">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Zurück
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schaden melden</h1>
          <p className="text-sm text-muted-foreground">
            Beschreiben Sie den Schaden — wir kümmern uns darum
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Left column: Main form (2/3 width) */}
          <div className="space-y-6 lg:col-span-2">

            {/* Damage Details */}
            <Card className="rounded-2xl border-0 shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <FileText className="h-4 w-4 text-[#4FD1C5]" />
                  Schadendetails
                </CardTitle>
                <CardDescription>Titel und genaue Beschreibung des Schadens</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Title + Location side by side */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                      Titel *
                    </Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="z. B. Tropfender Wasserhahn im Bad"
                      required
                      disabled={isSubmitting}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location_in_property" className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                      <MapPin className="h-3 w-3" /> Ort in der Liegenschaft
                    </Label>
                    <Input
                      id="location_in_property"
                      name="location_in_property"
                      placeholder="z. B. Badezimmer OG, Küche"
                      disabled={isSubmitting}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                    Beschreibung *
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Bitte beschreiben Sie den Schaden genau. Wann ist er aufgetreten? Wie schwerwiegend ist er?"
                    rows={5}
                    required
                    disabled={isSubmitting}
                    className="rounded-xl resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Photos */}
            <Card className="rounded-2xl border-0 shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <Camera className="h-4 w-4 text-[#4FD1C5]" />
                  Fotos <span className="text-[#A0AEC0] font-normal">(optional)</span>
                </CardTitle>
                <CardDescription>
                  Bis zu 5 Fotos helfen uns, den Schaden besser einzuschätzen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUpload
                  value={imageUrls}
                  onChange={setImageUrls}
                  onUpload={handleUpload}
                  maxFiles={5}
                  disabled={isSubmitting}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right column: Property + Submit (1/3 width) */}
          <div className="space-y-6">

            {/* Property */}
            <Card className="rounded-2xl border-0 shadow-xl">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-bold">
                  <Building2 className="h-4 w-4 text-[#4FD1C5]" />
                  Liegenschaft
                </CardTitle>
                <CardDescription>
                  {properties.length === 1
                    ? 'Ihrer zugewiesenen Liegenschaft'
                    : 'Wählen Sie die betroffene Liegenschaft'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {properties.length === 0 ? (
                  <p className="text-sm text-muted-foreground rounded-xl bg-muted p-3">
                    Ihrem Konto ist keine Liegenschaft zugewiesen. Bitte kontaktieren Sie Ihre Hausverwaltung.
                  </p>
                ) : properties.length === 1 ? (
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] p-3 dark:border-[#4A5568] dark:bg-[#2D3748]">
                    <p className="font-semibold text-sm text-[#2D3748] dark:text-white">
                      {properties[0].name}
                      {properties[0].unit_number && (
                        <span className="text-[#A0AEC0]"> · Unit {properties[0].unit_number}</span>
                      )}
                    </p>
                    <p className="text-xs text-[#A0AEC0] mt-0.5">{properties[0].address}</p>
                  </div>
                ) : (
                  <Select
                    value={selectedProperty}
                    onValueChange={(v) => setSelectedProperty(v || '')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Liegenschaft wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.name}
                          {property.unit_number && ` · Unit ${property.unit_number}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {selectedPropertyData && properties.length > 1 && (
                  <p className="text-xs text-[#A0AEC0]">{selectedPropertyData.address}</p>
                )}
              </CardContent>
            </Card>

            {/* Submit */}
            <Card className="rounded-2xl border-0 shadow-xl">
              <CardContent className="pt-6 space-y-3">
                <Button
                  type="submit"
                  disabled={isSubmitting || properties.length === 0}
                  className="w-full rounded-xl bg-[#4FD1C5] font-bold text-white hover:bg-[#38B2AC]"
                >
                  {isSubmitting ? 'Wird übermittelt…' : 'Meldung einreichen'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                  className="w-full rounded-xl text-[#A0AEC0]"
                >
                  Abbrechen
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
