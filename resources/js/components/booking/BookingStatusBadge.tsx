import React from 'react';
import { Badge } from '@/components/ui/badge';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type BookingStatus =
    | 'pending_verification'
    | 'confirmed'
    | 'checked_in'
    | 'checked_out'
    | 'cancelled'
    | 'rejected'
    | 'completed';

interface BookingStatusBadgeProps {
    status: BookingStatus | string;
    className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
    pending_verification: {
        label: 'Awaiting Verification',
        className: 'bg-amber-100 text-amber-700 border-amber-200 shadow-sm',
    },
    confirmed: {
        label: 'Confirmed',
        className: 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm',
    },
    approved: {
        label: 'Approved',
        className: 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm',
    },
    checked_in: {
        label: 'Checked In',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm',
    },
    checked_out: {
        label: 'Checked Out',
        className: 'bg-slate-100 text-slate-700 border-slate-200 shadow-sm',
    },
    cancelled: {
        label: 'Cancelled',
        className: 'bg-rose-100 text-rose-700 border-rose-200 shadow-sm',
    },
    rejected: {
        label: 'Rejected',
        className: 'bg-rose-100 text-rose-700 border-rose-200 shadow-sm',
    },
    no_show: {
        label: 'No Show',
        className: 'bg-rose-100 text-rose-700 border-rose-200 shadow-sm',
    },
    completed: {
        label: 'Completed',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm',
    },
};

export const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({ status, className }) => {
    const config = statusConfig[status] || {
        label: status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        className: 'bg-slate-100 text-slate-700 border-slate-200',
    };

    return (
        <Badge
            variant="outline"
            className={cn('font-medium px-2.5 py-0.5 rounded-full capitalize', config.className, className)}
        >
            {config.label}
        </Badge>
    );
};
