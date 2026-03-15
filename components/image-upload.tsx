'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

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

      // Show local previews immediately while uploading
      const newPreviews = filesToUpload.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }))
      setPreviews((prev) => [...prev, ...newPreviews])
      setIsUploading(true)

      try {
        const uploadedUrls = await onUpload(filesToUpload)
        // Always clear the preview placeholders
        setPreviews((prev) => prev.filter((p) => !filesToUpload.includes(p.file)))
        newPreviews.forEach((p) => URL.revokeObjectURL(p.preview))
        if (uploadedUrls.length > 0) {
          onChange([...value, ...uploadedUrls])
        }
      } catch (error) {
        console.error('Upload failed:', error)
        setPreviews((prev) => prev.filter((p) => !filesToUpload.includes(p.file)))
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
    <div className="space-y-3">
      {/* Image Grid */}
      {allImages.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {allImages.map((img, index) => (
            <div
              key={img.url}
              className="group relative aspect-square overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F7FAFC] dark:border-[#4A5568] dark:bg-[#2D3748]"
            >
              {/* Use plain <img> to support both blob: and https: URLs */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={`Upload ${index + 1}`}
                className="h-full w-full object-cover"
              />
              {img.type === 'preview' && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
              {img.type === 'uploaded' && (
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-[#E53E3E] p-1 text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dropzone */}
      {value.length + previews.length < maxFiles && (
        <div
          {...getRootProps()}
          className={cn(
            'cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all',
            isDragActive
              ? 'border-[#4FD1C5] bg-[#4FD1C5]/5'
              : 'border-[#E2E8F0] hover:border-[#4FD1C5]/60 dark:border-[#4A5568] dark:hover:border-[#4FD1C5]/60',
            (disabled || isUploading) && 'cursor-not-allowed opacity-50'
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            {isUploading ? (
              <>
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#4FD1C5] border-t-transparent" />
                <p className="text-sm font-medium text-[#A0AEC0]">Wird hochgeladen…</p>
              </>
            ) : (
              <>
                <div className={cn(
                  'rounded-2xl p-3',
                  isDragActive ? 'bg-[#4FD1C5]/10' : 'bg-[#F7FAFC] dark:bg-[#2D3748]'
                )}>
                  {isDragActive ? (
                    <Upload className="h-6 w-6 text-[#4FD1C5]" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-[#A0AEC0]" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#2D3748] dark:text-white">
                    {isDragActive ? 'Bilder loslassen' : 'Klicken oder Bilder hierher ziehen'}
                  </p>
                  <p className="mt-0.5 text-xs text-[#A0AEC0]">
                    Noch {maxFiles - value.length - previews.length} Bild
                    {maxFiles - value.length - previews.length !== 1 ? 'er' : ''} möglich (JPEG, PNG, WebP)
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
