'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface ImageUploadProps {
  value: string[]
  onChange: (urls: string[]) => void
  onUpload: (files: File[]) => Promise<string[]>
  maxFiles?: number
  disabled?: boolean
}

export function ImageUpload({
  value,
  onChange,
  onUpload,
  maxFiles = 5,
  disabled = false,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previews, setPreviews] = useState<{ file: File; preview: string }[]>([])

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (disabled || isUploading) return

      const remainingSlots = maxFiles - value.length - previews.length
      const filesToUpload = acceptedFiles.slice(0, remainingSlots)

      if (filesToUpload.length === 0) return

      // Create previews immediately
      const newPreviews = filesToUpload.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }))
      setPreviews((prev) => [...prev, ...newPreviews])

      setIsUploading(true)
      try {
        const uploadedUrls = await onUpload(filesToUpload)
        onChange([...value, ...uploadedUrls])
        // Clear previews after successful upload
        setPreviews((prev) =>
          prev.filter((p) => !filesToUpload.includes(p.file))
        )
        // Revoke object URLs
        newPreviews.forEach((p) => URL.revokeObjectURL(p.preview))
      } catch (error) {
        console.error('Upload failed:', error)
        // Remove failed previews
        setPreviews((prev) =>
          prev.filter((p) => !filesToUpload.includes(p.file))
        )
        newPreviews.forEach((p) => URL.revokeObjectURL(p.preview))
      } finally {
        setIsUploading(false)
      }
    },
    [disabled, isUploading, maxFiles, value, previews.length, onUpload, onChange]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic'],
    },
    maxFiles: maxFiles - value.length,
    disabled: disabled || isUploading || value.length >= maxFiles,
  })

  const removeImage = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove))
  }

  const allImages = [
    ...value.map((url) => ({ type: 'uploaded' as const, url })),
    ...previews.map((p) => ({ type: 'preview' as const, url: p.preview })),
  ]

  return (
    <div className="space-y-4">
      {/* Image Grid */}
      {allImages.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {allImages.map((img, index) => (
            <div
              key={img.url}
              className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
            >
              <Image
                src={img.url}
                alt={`Upload ${index + 1}`}
                fill
                className="object-cover"
              />
              {img.type === 'preview' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
              {img.type === 'uploaded' && (
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dropzone */}
      {value.length < maxFiles && (
        <div
          {...getRootProps()}
          className={cn(
            'cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-border-strong',
            (disabled || isUploading) && 'cursor-not-allowed opacity-50'
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2">
            {isUploading ? (
              <>
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </>
            ) : (
              <>
                <div className="rounded-full bg-muted p-3">
                  {isDragActive ? (
                    <Upload className="h-6 w-6 text-primary" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {isDragActive ? 'Drop images here' : 'Click or drag images'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Up to {maxFiles - value.length} more image
                    {maxFiles - value.length !== 1 ? 's' : ''} (JPEG, PNG, WebP)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
