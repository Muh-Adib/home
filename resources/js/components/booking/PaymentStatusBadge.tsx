import React from 'react';
import { Badge } from '@/components/UI/badge';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export type PaymentStatus =
    | 'unpaid'
    | 'dp_pending'
    | 'dp_paid'
    | 'partially_paid'
    | 'paid_off'
    | 'refunded'
    | 'expired';

interface PaymentStatusBadgeProps {
    status: PaymentStatus | string;
    className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
    unpaid: {
        label: 'Unpaid',
        className: 'bg-slate-100 text-slate-700 border-slate-200 shadow-sm',
    },
    dp_pending: {
        label: 'DP Pending',
        className: 'bg-amber-100 text-amber-700 border-amber-200 shadow-sm',
    },
    dp_paid: {
        label: 'DP Paid',
        className: 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm',
    },
    dp_received: {
        label: 'DP Received',
        className: 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm',
    },
    partially_paid: {
        label: 'Partially Paid',
        className: 'bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm',
    },
    paid_off: {
        label: 'Paid Off',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm',
    },
    fully_paid: {
        label: 'Fully Paid',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm',
    },
    refunded: {
        label: 'Refunded',
        className: 'bg-rose-100 text-rose-700 border-rose-200 shadow-sm',
    },
    overdue: {
        label: 'Overdue',
        className: 'bg-rose-100 text-rose-700 border-rose-200 shadow-sm',
    },
    expired: {
        label: 'Expired',
        className: 'bg-rose-100 text-rose-700 border-rose-200 shadow-sm',
    },
};

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status, className }) => {
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
