/**
 * Admin Booking Availability Hook
 * Handles availability checking with support for excluding booking ID (edit mode)
 * Optimized with debouncing and proper cleanup
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiPost } from '@/lib/api';
import type { AvailabilityStatus } from '@/types/booking-form.types';

interface UseAdminBookingAvailabilityProps {
    mode: 'create' | 'edit';
    excludeBookingId?: number;
}

export function useAdminBookingAvailability({
    mode,
    excludeBookingId,
}: UseAdminBookingAvailabilityProps) {
    const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>(null);
    const [availabilityError, setAvailabilityError] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(false);

    // Use ref to track abort controller for cancelling in-flight requests
    const abortControllerRef = useRef<AbortController | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Memoized availability check function
    const checkAvailability = useCallback(async (
        propertyId: number,
        checkIn: string,
        checkOut: string,
        guestCount: number
    ) => {
        // Cancel previous request if still pending
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        setAvailabilityStatus('checking');
        setAvailabilityError(null);
        setIsChecking(true);

        try {
            let isAvailable = false;

            if (mode === 'edit' && excludeBookingId) {
                // For edit mode, use custom endpoint that supports excluding current booking
                const response = await fetch('/api/admin/booking-management/check-availability', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({
                        property_id: propertyId,
                        check_in: checkIn,
                        check_out: checkOut,
                        exclude_booking_id: excludeBookingId,
                    }),
                    signal, // Pass abort signal
                });

                if (!response.ok) throw new Error('Availability check failed');

                const data = await response.json();
                isAvailable = data.available;
            } else {
                // For create mode, use standard service
                const result = await apiPost<{ available: boolean }>('/api/admin/booking-management/check-availability', {
                    property_id: propertyId,
                    check_in: checkIn,
                    check_out: checkOut,
                    guest_count: guestCount,
                });

                isAvailable = result?.available || false;
            }

            // Check if request was aborted
            if (signal.aborted) return;

            setAvailabilityStatus(isAvailable ? 'available' : 'unavailable');

            if (!isAvailable) {
                setAvailabilityError('Property tidak tersedia untuk tanggal yang dipilih');
            }

            return isAvailable;
        } catch (error: any) {
            // Ignore abort errors
            if (error.name === 'AbortError') return;

            console.error('Error checking availability:', error);
            setAvailabilityStatus('unavailable');
            setAvailabilityError('Error checking availability');
            return false;
        } finally {
            setIsChecking(false);
        }
    }, [mode, excludeBookingId]);

    // Clear availability state
    const clearAvailability = useCallback(() => {
        setAvailabilityStatus(null);
        setAvailabilityError(null);
        setIsChecking(false);
    }, []);

    return {
        availabilityStatus,
        availabilityError,
        isChecking,
        checkAvailability,
        clearAvailability,
    };
}
