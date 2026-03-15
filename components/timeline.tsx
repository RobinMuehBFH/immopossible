'use client'

import { cn } from '@/lib/utils'
import {
  Inbox,
  Brain,
  Clock,
  ThumbsUp,
  Wrench,
  CalendarCheck,
  Hammer,
  CheckCircle2,
} from 'lucide-react'

interface TimelineEvent {
  id: string
  status: string
  timestamp: string
  description?: string
}

interface TimelineProps {
  events: TimelineEvent[]
  currentStatus: string
}

const ORDERED_STEPS = [
  'received',
  'triaging',
  'waiting_for_approval',
  'approved',
  'booking_craftsman',
  'booked',
  'in_progress',
  'completed',
]

const statusConfig: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string; ring: string }
> = {
  received: {
    label: 'Meldung eingegangen',
    icon: Inbox,
    color: 'text-[#4FD1C5]',
    bg: 'bg-[#4FD1C5]',
    ring: 'ring-[#4FD1C5]/20',
  },
  triaging: {
    label: 'Wird analysiert',
    icon: Brain,
    color: 'text-[#667EEA]',
    bg: 'bg-[#667EEA]',
    ring: 'ring-[#667EEA]/20',
  },
  waiting_for_approval: {
    label: 'Wartet auf Genehmigung',
    icon: Clock,
    color: 'text-[#ED8936]',
    bg: 'bg-[#ED8936]',
    ring: 'ring-[#ED8936]/20',
  },
  approved: {
    label: 'Genehmigt',
    icon: ThumbsUp,
    color: 'text-[#48BB78]',
    bg: 'bg-[#48BB78]',
    ring: 'ring-[#48BB78]/20',
  },
  booking_craftsman: {
    label: 'Handwerker wird gebucht',
    icon: Wrench,
    color: 'text-[#4299E1]',
    bg: 'bg-[#4299E1]',
    ring: 'ring-[#4299E1]/20',
  },
  booked: {
    label: 'Handwerker gebucht',
    icon: CalendarCheck,
    color: 'text-[#4FD1C5]',
    bg: 'bg-[#4FD1C5]',
    ring: 'ring-[#4FD1C5]/20',
  },
  in_progress: {
    label: 'Reparatur läuft',
    icon: Hammer,
    color: 'text-[#4299E1]',
    bg: 'bg-[#4299E1]',
    ring: 'ring-[#4299E1]/20',
  },
  completed: {
    label: 'Reparatur abgeschlossen',
    icon: CheckCircle2,
    color: 'text-[#48BB78]',
    bg: 'bg-[#48BB78]',
    ring: 'ring-[#48BB78]/20',
  },
}

export function Timeline({ events, currentStatus }: TimelineProps) {
  const currentIndex = ORDERED_STEPS.indexOf(currentStatus)
  // Build a lookup for actual event timestamps
  const eventByStatus = Object.fromEntries(events.map((e) => [e.status, e]))

  return (
    <div className="space-y-0">
      {ORDERED_STEPS.map((step, idx) => {
        const config = statusConfig[step]
        const Icon = config.icon
        const isCompleted = idx <= currentIndex
        const isCurrent = idx === currentIndex
        const isLast = idx === ORDERED_STEPS.length - 1
        const event = eventByStatus[step]

        return (
          <div key={step} className="flex gap-3">
            {/* Icon + connector */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all',
                  isCompleted
                    ? cn(config.bg, 'shadow-sm', isCurrent && cn('ring-4', config.ring))
                    : 'bg-[#EDF2F7] dark:bg-[#2D3748]'
                )}
              >
                <Icon
                  className={cn(
                    'h-3.5 w-3.5',
                    isCompleted ? 'text-white' : 'text-[#CBD5E0] dark:text-[#4A5568]'
                  )}
                />
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'mt-1 w-0.5 flex-1',
                    idx < currentIndex ? 'bg-[#4FD1C5]/40' : 'bg-[#E2E8F0] dark:bg-[#4A5568]'
                  )}
                  style={{ minHeight: '20px' }}
                />
              )}
            </div>

            {/* Content */}
            <div className={cn('pb-4 min-w-0 flex-1', isLast && 'pb-0')}>
              <div className="flex items-start justify-between gap-2">
                <p
                  className={cn(
                    'text-sm leading-tight',
                    isCompleted
                      ? isCurrent
                        ? cn('font-bold', config.color)
                        : 'font-semibold text-[#4A5568] dark:text-[#CBD5E0]'
                      : 'font-medium text-[#CBD5E0] dark:text-[#4A5568]'
                  )}
                >
                  {config.label}
                  {isCurrent && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-[#4FD1C5]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#4FD1C5]">
                      Aktuell
                    </span>
                  )}
                </p>
                {event?.timestamp ? (
                  <time className="shrink-0 text-xs text-[#A0AEC0] mt-0.5">
                    {new Date(event.timestamp).toLocaleString('de-CH', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                ) : !isCompleted ? (
                  <span className="shrink-0 text-xs text-[#CBD5E0] dark:text-[#4A5568] mt-0.5">
                    Ausstehend
                  </span>
                ) : null}
              </div>
              {event?.description && (
                <p className="mt-0.5 text-xs text-[#A0AEC0] leading-relaxed">{event.description}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
