/**
 * Date Range with Availability Component
 * Date picker with integrated availability status display
 * Reusable for both admin and public booking contexts
 * Optimized with React.memo
 */

import React, { memo } from 'react';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DateRange } from '@/components/ui/date-range';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { AvailabilityStatus } from '@/types/booking-form.types';

export interface DateRangeWithAvailabilityProps {
    startDate: string;
    endDate: string;
    onDateChange: (startDate: string, endDate: string) => void;
    bookedDates?: string[];
    availabilityStatus?: AvailabilityStatus;
    availabilityError?: string | null;
    isLoading?: boolean;
    error?: string;
    minDate?: string;
    maxDate?: string;
    showNights?: boolean;
    adminMode?: boolean;
    label?: string;
}

const DateRangeWithAvailability = memo(function DateRangeWithAvailability({
    startDate,
    endDate,
    onDateChange,
    bookedDates = [],
    availabilityStatus,
    availabilityError,
    isLoading = false,
    error,
    minDate,
    maxDate,
    showNights = true,
    adminMode = false,
    label = 'Tanggal Check-in & Check-out *',
}: DateRangeWithAvailabilityProps) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <DateRange
                startDate={startDate}
                endDate={endDate}
                onDateChange={onDateChange}
                bookedDates={bookedDates}
                loading={isLoading}
                error={error}
                minDate={minDate || new Date().toISOString().split('T')[0]}
                maxDate={maxDate}
                showNights={showNights}
                adminMode={adminMode}
            />

            {/* Availability Status Indicators */}
            {availabilityStatus && (
                <div className="mt-2">
                    {availabilityStatus === 'checking' && (
                        <Alert>
                            <Loader2 className="animate-spin h-4 w-4" />
                            <AlertDescription>Checking availability...</AlertDescription>
                        </Alert>
                    )}
                    {availabilityStatus === 'available' && (
                        <Alert className="bg-green-50 border-green-200 text-green-800">
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>Property tersedia untuk tanggal ini</AlertDescription>
                        </Alert>
                    )}
                    {availabilityStatus === 'unavailable' && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                {availabilityError || 'Property tidak tersedia untuk tanggal ini'}
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            )}
        </div>
    );
});

export default DateRangeWithAvailability;
