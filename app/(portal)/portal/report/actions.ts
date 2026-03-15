'use server'

import { auth } from '@/lib/auth/config'
import { createAuthenticatedSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createDamageReport(formData: FormData) {
  const session = await auth()
  if (!session?.supabaseAccessToken) {
    return { error: 'Not authenticated' }
  }
  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken)
  const userId = session.user.id

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const locationInProperty = formData.get('location_in_property') as string
  const propertyId = formData.get('property_id') as string
  const imageUrlsJson = formData.get('image_urls') as string

  let imageUrls: string[] = []
  if (imageUrlsJson) {
    try {
      imageUrls = JSON.parse(imageUrlsJson)
    } catch {
      imageUrls = []
    }
  }

  const { data: report, error } = await supabase
    .from('damage_reports')
    .insert({
      tenant_id: userId,
      property_id: propertyId || null,
      title,
      description,
      location_in_property: locationInProperty || null,
      channel: 'web_form',
      status: 'received',
      image_urls: imageUrls,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating report:', error)
    return { error: error.message }
  }

  revalidatePath('/portal')
  redirect(`/portal/report/${report.id}`)
}

export async function uploadImages(formData: FormData): Promise<{
  urls: string[]
  error?: string
}> {
  const session = await auth()
  if (!session?.supabaseAccessToken) {
    return { urls: [], error: 'Not authenticated' }
  }
  const supabase = createAuthenticatedSupabaseClient(session.supabaseAccessToken)
  const userId = session.user.id

  const files = formData.getAll('files') as File[]
  const urls: string[] = []

  for (const file of files) {
    if (!file.size) continue

    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('damage-report-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { urls: [], error: uploadError.message }
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('damage-report-images').getPublicUrl(fileName)

    urls.push(publicUrl)
  }

  return { urls }
}
