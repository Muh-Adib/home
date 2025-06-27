import { useState, useEffect, useCallback } from 'react';
import { format, addDays } from 'date-fns';

interface UseAvailabilityOptions {
    propertySlug?: string;
    autoFetch?: boolean;
    dateRange?: {
        startDate?: string;
        endDate?: string;
    };
}

interface AvailabilityData {
    booked_dates: string[];
    success: boolean;
    message?: string;
}

export function useAvailability({
    propertySlug,
    autoFetch = true,
    dateRange
}: UseAvailabilityOptions = {}) {
    const [availabilityData, setAvailabilityData] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch availability data from API
    const fetchAvailability = useCallback(async (
        slug?: string,
        startDate?: string,
        endDate?: string
    ): Promise<AvailabilityData> => {
        const targetSlug = slug || propertySlug;
        if (!targetSlug) {
            return { booked_dates: [], success: false, message: 'No property slug provided' };
        }
        
        setLoading(true);
        setError(null);
        
        try {
            // Default date range: today to 90 days ahead
            const defaultStart = startDate || format(new Date(), 'yyyy-MM-dd');
            const defaultEnd = endDate || format(addDays(new Date(), 90), 'yyyy-MM-dd');
            
            // Get CSRF token for Laravel
            const csrfToken = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            const response = await fetch(
                `/api/properties/${targetSlug}/availability?check_in=${defaultStart}&check_out=${defaultEnd}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        ...(csrfToken && { 'X-CSRF-TOKEN': csrfToken }),
                    },
                    credentials: 'same-origin',
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const bookedDates = data.booked_dates || [];
                    setAvailabilityData(bookedDates);
                    return { booked_dates: bookedDates, success: true };
                } else {
                    console.warn('Availability API returned error:', data.message);
                    setAvailabilityData([]);
                    return { booked_dates: [], success: false, message: data.message };
                }
            } else if (response.status === 401) {
                console.warn('Availability API unauthorized, using fallback');
                setAvailabilityData([]);
                return { booked_dates: [], success: false, message: 'Unauthorized' };
            } else {
                console.warn('Availability API failed:', response.status);
                setAvailabilityData([]);
                return { booked_dates: [], success: false, message: `HTTP ${response.status}` };
            }
        } catch (error) {
            console.error('Error fetching availability:', error);
            setAvailabilityData([]);
            setError(error instanceof Error ? error.message : 'Unknown error');
            return { booked_dates: [], success: false, message: 'Network error' };
        } finally {
            setLoading(false);
        }
    }, [propertySlug]);

    // Auto-fetch when property slug changes
    useEffect(() => {
        if (autoFetch && propertySlug) {
            fetchAvailability(
                propertySlug,
                dateRange?.startDate,
                dateRange?.endDate
            );
        }
    }, [propertySlug, autoFetch, fetchAvailability, dateRange?.startDate, dateRange?.endDate]);

    // Check if specific date is booked
    const isDateBooked = useCallback((date: Date): boolean => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return availabilityData.includes(dateStr);
    }, [availabilityData]);

    // Check if date range contains booked dates (exclusive of start and end dates)
    const rangeContainsBookedDates = useCallback((from: Date, to: Date): boolean => {
        let currentDate = addDays(from, 1); // Start from day after check-in
        const endDate = new Date(to);
        
        while (currentDate < endDate) {
            if (isDateBooked(currentDate)) {
                return true;
            }
            currentDate = addDays(currentDate, 1);
        }
        return false;
    }, [isDateBooked]);

    // Manual refetch function
    const refetch = useCallback((startDate?: string, endDate?: string) => {
        return fetchAvailability(propertySlug, startDate, endDate);
    }, [fetchAvailability, propertySlug]);

    // Set availability data manually (for fallback or preset data)
    const setManualAvailabilityData = useCallback((data: string[]) => {
        setAvailabilityData(data);
    }, []);

    return {
        availabilityData,
        loading,
        error,
        fetchAvailability,
        refetch,
        isDateBooked,
        rangeContainsBookedDates,
        setManualAvailabilityData
    };
}

export default useAvailability; 