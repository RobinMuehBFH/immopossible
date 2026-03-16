'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import { FileText, Search, X } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'received', label: 'Eingegangen' },
  { value: 'triaging', label: 'In Prüfung' },
  { value: 'waiting_for_approval', label: 'Warte auf Genehmigung' },
  { value: 'approved', label: 'Genehmigt' },
  { value: 'rejected', label: 'Abgelehnt' },
  { value: 'booking_craftsman', label: 'Handwerker buchen' },
  { value: 'booked', label: 'Gebucht' },
  { value: 'in_progress', label: 'In Bearbeitung' },
  { value: 'completed', label: 'Abgeschlossen' },
  { value: 'cancelled', label: 'Storniert' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Niedrig' },
  { value: 'medium', label: 'Mittel' },
  { value: 'high', label: 'Hoch' },
  { value: 'urgent', label: 'Dringend' },
]

const statusColors: Record<string, string> = {
  received: 'bg-info/10 text-info',
  triaging: 'bg-warning/10 text-warning',
  waiting_for_approval: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  booking_craftsman: 'bg-primary/10 text-primary',
  booked: 'bg-primary/10 text-primary',
  in_progress: 'bg-info/10 text-info',
  completed: 'bg-muted text-muted-foreground',
  cancelled: 'bg-muted text-muted-foreground',
}

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-warning/10 text-warning',
  high: 'bg-warning/10 text-warning',
  urgent: 'bg-destructive/10 text-destructive',
}

const priorityLabels: Record<string, string> = {
  low: 'Niedrig',
  medium: 'Mittel',
  high: 'Hoch',
  urgent: 'Dringend',
}

export interface ReportRow {
  id: string
  title: string
  status: string
  priority: string | null
  created_at: string
  property_id: string | null
  tenant: { full_name: string | null; email: string | null } | null
  property: { name: string } | null
}

interface Property {
  id: string
  name: string
}

interface RecentReportsTableProps {
  reports: ReportRow[]
  properties: Property[]
}

export function RecentReportsTable({ reports, properties }: RecentReportsTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [propertyFilter, setPropertyFilter] = useState('all')

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false
      if (propertyFilter !== 'all' && r.property_id !== propertyFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          r.title.toLowerCase().includes(q) ||
          (r.tenant?.full_name?.toLowerCase() || '').includes(q) ||
          (r.tenant?.email?.toLowerCase() || '').includes(q) ||
          (r.property?.name?.toLowerCase() || '').includes(q)
        )
      }
      return true
    })
  }, [reports, search, statusFilter, priorityFilter, propertyFilter])

  const hasFilters =
    search || statusFilter !== 'all' || priorityFilter !== 'all' || propertyFilter !== 'all'

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setPropertyFilter('all')
  }

  return (
    <Card className="rounded-2xl border-0 shadow-xl dark:bg-[#2D3748]">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-[#2D3748] dark:text-white">
              Neueste Meldungen
              <span className="ml-2 text-sm font-normal text-[#A0AEC0]">
                ({filtered.length}{filtered.length !== reports.length ? ` von ${reports.length}` : ''})
              </span>
            </CardTitle>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A0AEC0]" />
              <Input
                placeholder="Suchen nach Titel, Mieter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-[220px] rounded-xl border-[#E2E8F0] bg-white pl-9 text-sm dark:border-[#4A5568] dark:bg-[#1A202C]"
              />
            </div>

            {/* Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[170px] rounded-xl border-[#E2E8F0] bg-white text-sm dark:border-[#4A5568] dark:bg-[#1A202C]">
                <SelectValue placeholder="Alle Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-9 w-[150px] rounded-xl border-[#E2E8F0] bg-white text-sm dark:border-[#4A5568] dark:bg-[#1A202C]">
                <SelectValue placeholder="Alle Prioritäten" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Prioritäten</SelectItem>
                {PRIORITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Property */}
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="h-9 w-[170px] rounded-xl border-[#E2E8F0] bg-white text-sm dark:border-[#4A5568] dark:bg-[#1A202C]">
                <SelectValue placeholder="Alle Liegenschaften" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Liegenschaften</SelectItem>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear */}
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 text-[#A0AEC0] hover:text-[#E53E3E]"
              >
                <X className="mr-1 h-4 w-4" />
                Zurücksetzen
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#E2E8F0] dark:border-[#4A5568]">
                  <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                    Titel
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                    Mieter
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                    Liegenschaft
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                    Priorität
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wide text-[#A0AEC0]">
                    Datum
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((report) => (
                  <TableRow
                    key={report.id}
                    className="border-b border-[#E2E8F0] dark:border-[#4A5568]"
                  >
                    <TableCell>
                      <Link
                        href={`/dashboard/reports/${report.id}`}
                        className="font-bold text-[#2D3748] hover:text-[#4FD1C5] dark:text-white dark:hover:text-[#4FD1C5]"
                      >
                        {report.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-[#A0AEC0]">
                      {report.tenant?.full_name || report.tenant?.email || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-[#A0AEC0]">
                      {report.property?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`rounded-lg px-3 py-1 text-xs font-bold ${statusColors[report.status] || ''}`}
                      >
                        {STATUS_OPTIONS.find((o) => o.value === report.status)?.label ??
                          report.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {report.priority ? (
                        <Badge
                          variant="secondary"
                          className={`rounded-lg px-3 py-1 text-xs font-bold ${priorityColors[report.priority] || ''}`}
                        >
                          {priorityLabels[report.priority] ?? report.priority}
                        </Badge>
                      ) : (
                        <span className="text-sm text-[#A0AEC0]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-[#A0AEC0]">
                      {new Date(report.created_at).toLocaleDateString('de-CH')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className="purity-gradient mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg">
              <FileText className="h-8 w-8" />
            </div>
            <p className="font-bold text-[#2D3748] dark:text-white">
              {hasFilters ? 'Keine Meldungen gefunden' : 'Noch keine Meldungen'}
            </p>
            <p className="mt-1 text-sm text-[#A0AEC0]">
              {hasFilters
                ? 'Versuche andere Filter.'
                : 'Meldungen erscheinen hier sobald Mieter sie einreichen.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
