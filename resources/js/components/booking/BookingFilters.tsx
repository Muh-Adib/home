import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { type Property } from '@/types';

interface BookingFiltersProps {
    filters: {
        search?: string;
        status?: string;
        payment_status?: string;
        property_id?: string;
        sort?: string;
        date_from?: string;
        date_to?: string;
    };
    properties: Property[];
    totalBookings: number;
    onFiltersChange: (filters: any) => void;
}

export default function BookingFilters({
    filters,
    properties,
    totalBookings,
    onFiltersChange
}: BookingFiltersProps) {

    const getActiveFiltersCount = () => {
        let count = 0;
        if (filters.status && filters.status !== 'all') count++;
        if (filters.payment_status && filters.payment_status !== 'all') count++;
        if (filters.property_id && filters.property_id !== 'all') count++;
        return count;
    };

    const handleClearAll = () => {
        onFiltersChange({
            search: '',
            status: 'all',
            payment_status: 'all',
            property_id: 'all',
            sort: 'latest',
            date_from: '',
            date_to: ''
        });
    };

    const activeCount = getActiveFiltersCount();

    return (
        <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <Select
                value={filters.status || 'all'}
                onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
            >
                <SelectTrigger className="h-9 w-[130px] text-sm">
                    <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending_verification">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="checked_in">Checked In</SelectItem>
                    <SelectItem value="checked_out">Checked Out</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
            </Select>

            {/* Payment Filter */}
            <Select
                value={filters.payment_status || 'all'}
                onValueChange={(value) => onFiltersChange({ ...filters, payment_status: value })}
            >
                <SelectTrigger className="h-9 w-[140px] text-sm">
                    <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="dp_pending">DP Pending</SelectItem>
                    <SelectItem value="dp_received">DP Paid</SelectItem>
                    <SelectItem value="fully_paid">Fully Paid</SelectItem>
                </SelectContent>
            </Select>

            {/* Property Filter */}
            <Select
                value={filters.property_id || 'all'}
                onValueChange={(value) => onFiltersChange({ ...filters, property_id: value })}
            >
                <SelectTrigger className="h-9 w-[160px] text-sm">
                    <SelectValue placeholder="Property" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id.toString()}>
                            {property.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Sort */}
            <Select
                value={filters.sort || 'latest'}
                onValueChange={(value) => onFiltersChange({ ...filters, sort: value })}
            >
                <SelectTrigger className="h-9 w-[120px] text-sm">
                    <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="latest">Latest</SelectItem>
                    <SelectItem value="check_in">Check-in</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                </SelectContent>
            </Select>

            {/* Clear All Button - only show if filters active */}
            {activeCount > 0 && (
                <>
                    <Badge variant="secondary" className="h-9 px-3">
                        {activeCount} filter{activeCount > 1 ? 's' : ''}
                    </Badge>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAll}
                        className="h-9 px-3 text-gray-600 hover:text-gray-900"
                    >
                        <X className="h-4 w-4 mr-1" />
                        Clear
                    </Button>
                </>
            )}

            {/* Results count */}
            <span className="text-sm text-gray-500 ml-auto">
                {totalBookings} result{totalBookings !== 1 ? 's' : ''}
            </span>
        </div>
    );
}