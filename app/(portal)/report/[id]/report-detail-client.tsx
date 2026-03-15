'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DamageReport } from '@/lib/types/database.types'
import { Timeline } from '@/components/timeline'
import { StatusBadge } from '@/components/ui/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin, Calendar, Building } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface Booking {
  id: string
  craftsman: {
    company_name: string
    contact_name: string | null
    phone: string | null
  }
  scheduled_date: string | null
  status: string
}

interface ReportDetailClientProps {
  initialReport: DamageReport & {
    property?: { name: string; address: string } | null
  }
  initialBooking: Booking | null
}

export function ReportDetailClient({
  initialReport,
  initialBooking,
}: ReportDetailClientProps) {
  const [report, setReport] = useState(initialReport)
  const [booking, setBooking] = useState(initialBooking)

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to report changes
    const reportChannel = supabase
      .channel(`report-${report.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'damage_reports',
          filter: `id=eq.${report.id}`,
        },
        (payload) => {
          setReport((prev) => ({ ...prev, ...payload.new }))
        }
      )
      .subscribe()

    // Subscribe to booking changes
    const bookingChannel = supabase
      .channel(`booking-${report.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `damage_report_id=eq.${report.id}`,
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            setBooking(null)
          } else {
            // Fetch full booking data with craftsman
            const { data } = await supabase
              .from('bookings')
              .select(
                `
                id,
                scheduled_date,
                status,
                craftsman:craftsmen!bookings_craftsman_id_fkey(
                  company_name,
                  contact_name,
                  phone
                )
              `
              )
              .eq('id', (payload.new as { id: string }).id)
              .single()

            if (data) {
              setBooking({
                id: data.id,
                scheduled_date: data.scheduled_date,
                status: data.status,
                craftsman: data.craftsman as Booking['craftsman'],
              })
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(reportChannel)
      supabase.removeChannel(bookingChannel)
    }
  }, [report.id])

  // Build timeline events from status history
  const timelineEvents = [
    {
      id: 'created',
      status: 'received',
      timestamp: report.created_at,
      description: 'Report submitted via ' + report.channel.replace('_', ' '),
    },
    // Add more events based on status changes - in a real app, 
    // you'd track these in a separate status_history table
    ...(report.status !== 'received'
      ? [
          {
            id: 'current',
            status: report.status,
            timestamp: report.updated_at,
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/portal">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {report.title}
              </h1>
              <p className="text-muted-foreground">
                Submitted on{' '}
                {new Date(report.created_at).toLocaleDateString('de-CH', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <StatusBadge status={report.status} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-foreground">
                {report.description}
              </p>
              {report.location_in_property && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{report.location_in_property}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Images */}
          {report.image_urls && report.image_urls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {report.image_urls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-square overflow-hidden rounded-lg"
                    >
                      <Image
                        src={url}
                        alt={`Damage photo ${index + 1}`}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Booking Info */}
          {booking && (
            <Card>
              <CardHeader>
                <CardTitle>Craftsman Booking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {booking.craftsman.company_name}
                    </span>
                  </div>
                  {booking.craftsman.contact_name && (
                    <p className="text-sm text-muted-foreground">
                      Contact: {booking.craftsman.contact_name}
                    </p>
                  )}
                  {booking.craftsman.phone && (
                    <p className="text-sm text-muted-foreground">
                      Phone: {booking.craftsman.phone}
                    </p>
                  )}
                  {booking.scheduled_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Scheduled for{' '}
                        {new Date(booking.scheduled_date).toLocaleDateString(
                          'de-CH',
                          {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          }
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Property */}
          {report.property && (
            <Card>
              <CardHeader>
                <CardTitle>Property</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{report.property.name}</p>
                <p className="text-sm text-muted-foreground">{report.property.address}</p>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline events={timelineEvents} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
