'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ReportStatus } from '@/lib/types/database.types';

const statusConfig: Record<
  ReportStatus,
  { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'outline' }
> = {
  received: { label: 'Received', variant: 'info' },
  triaging: { label: 'Triaging', variant: 'warning' },
  waiting_for_approval: { label: 'Awaiting Approval', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  booking_craftsman: { label: 'Booking Craftsman', variant: 'default' },
  booked: { label: 'Booked', variant: 'default' },
  in_progress: { label: 'In Progress', variant: 'info' },
  completed: { label: 'Completed', variant: 'secondary' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
};

interface StatusBadgeProps {
  status: ReportStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.label}
    </Badge>
  );
}
