'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'received', label: 'Received' },
  { value: 'triaging', label: 'Triaging' },
  { value: 'waiting_for_approval', label: 'Waiting for Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'booking_craftsman', label: 'Booking Craftsman' },
  { value: 'booked', label: 'Booked' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

interface Property {
  id: string
  name: string
}

interface ReportsFilterProps {
  properties: Property[]
}

export function ReportsFilter({ properties }: ReportsFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== 'all') {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      return params.toString()
    },
    [searchParams]
  )

  const handleFilterChange = (name: string, value: string | null) => {
    const queryString = createQueryString(name, value || '')
    router.push(`/dashboard${queryString ? `?${queryString}` : ''}`)
  }

  const clearFilters = () => {
    router.push('/dashboard')
  }

  const hasFilters =
    searchParams.has('status') ||
    searchParams.has('priority') ||
    searchParams.has('property') ||
    searchParams.has('from') ||
    searchParams.has('to')

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Status Filter */}
      <Select
        value={searchParams.get('status') || 'all'}
        onValueChange={(value) => handleFilterChange('status', value)}
      >
        <SelectTrigger className="w-[180px] rounded-xl border-[#E2E8F0] bg-white text-sm dark:border-[#4A5568] dark:bg-[#2D3748]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority Filter */}
      <Select
        value={searchParams.get('priority') || 'all'}
        onValueChange={(value) => handleFilterChange('priority', value)}
      >
        <SelectTrigger className="w-[150px] rounded-xl border-[#E2E8F0] bg-white text-sm dark:border-[#4A5568] dark:bg-[#2D3748]">
          <SelectValue placeholder="All Priorities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          {PRIORITY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Property Filter */}
      <Select
        value={searchParams.get('property') || 'all'}
        onValueChange={(value) => handleFilterChange('property', value)}
      >
        <SelectTrigger className="w-[180px] rounded-xl border-[#E2E8F0] bg-white text-sm dark:border-[#4A5568] dark:bg-[#2D3748]">
          <SelectValue placeholder="All Properties" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Properties</SelectItem>
          {properties.map((property) => (
            <SelectItem key={property.id} value={property.id}>
              {property.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date From */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[#A0AEC0]">From:</span>
        <Input
          type="date"
          value={searchParams.get('from') || ''}
          onChange={(e) => handleFilterChange('from', e.target.value)}
          className="w-[140px] rounded-xl border-[#E2E8F0] bg-white text-sm dark:border-[#4A5568] dark:bg-[#2D3748]"
        />
      </div>

      {/* Date To */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[#A0AEC0]">To:</span>
        <Input
          type="date"
          value={searchParams.get('to') || ''}
          onChange={(e) => handleFilterChange('to', e.target.value)}
          className="w-[140px] rounded-xl border-[#E2E8F0] bg-white text-sm dark:border-[#4A5568] dark:bg-[#2D3748]"
        />
      </div>

      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-[#A0AEC0] hover:text-[#E53E3E]"
        >
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  )
}
