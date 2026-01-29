/**
 * Date utilities for booking timeline
 */

/**
 * Get date range between two dates
 */
export function getDateRange(startDate: string | Date, endDate: string | Date): Date[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: Date[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
    }

    return dates;
}

/**
 * Calculate difference in days between two dates
 */
export function diffInDays(startDate: string | Date, endDate: string | Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format date to Indonesian locale
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...options
    });
}

/**
 * Format date to short format (DD/MM)
 */
export function formatDateShort(date: string | Date): string {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit'
    });
}

/**
 * Get day name in Indonesian
 */
export function getDayName(date: string | Date): string {
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('id-ID', { weekday: 'short' });
}

/**
 * Check if date is today
 */
export function isToday(date: string | Date): boolean {
    const today = new Date();
    const dateObj = new Date(date);
    return dateObj.toDateString() === today.toDateString();
}

/**
 * Check if date is weekend
 */
export function isWeekend(date: string | Date): boolean {
    const dateObj = new Date(date);
    const day = dateObj.getDay();
    return day === 0 || day === 6;
}

/**
 * Get date key for timeline (YYYY-MM-DD format)
 */
export function getDateKey(date: string | Date): string {
    const dateObj = new Date(date);
    return dateObj.toISOString().split('T')[0];
}

/**
 * Generate timeline dates (default 14 days from today)
 */
export function generateTimelineDates(days: number = 14, startFrom?: Date): Date[] {
    const start = startFrom || new Date();
    const dates: Date[] = [];

    for (let i = 0; i < days; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        dates.push(date);
    }

    return dates;
}

/**
 * Calculate position and width for booking item in timeline
 */
export function calculateBookingPosition(
    booking: { check_in: string; check_out: string },
    timelineDates: Date[],
    cellWidth: number = 60
): { left: number; width: number; visible: boolean; nights: number } {
    const checkIn = new Date(booking.check_in);
    const checkOut = new Date(booking.check_out);

    // Calculate nights (exclusive of check-out date)
    const nights = diffInDays(checkIn, checkOut);

    // Find start position in timeline
    const startIndex = timelineDates.findIndex(date =>
        date.toDateString() === checkIn.toDateString()
    );

    if (startIndex === -1) {
        return { left: 0, width: 0, visible: false, nights: 0 };
    }

    // Calculate width based on number of nights
    // Each night takes up one cell width
    const left = (startIndex * cellWidth) + (cellWidth / 2);
    const width = nights * cellWidth;

    // Check if booking is visible in timeline
    const timelineStart = timelineDates[0];
    const timelineEnd = timelineDates[timelineDates.length - 1];
    const visible = checkIn <= timelineEnd && checkOut >= timelineStart;

    return { left, width, visible, nights };
}

/**
 * Check if booking overlaps with date range
 */
export function isBookingInRange(
    booking: { check_in: string; check_out: string },
    startDate: Date,
    endDate: Date
): boolean {
    const bookingStart = new Date(booking.check_in);
    const bookingEnd = new Date(booking.check_out);

    return bookingStart <= endDate && bookingEnd >= startDate;
}

/**
 * Get booking status color
 */
export function getBookingStatusColor(status: string): string {
    switch (status) {
        case 'pending_verification':
            return 'bg-yellow-500 hover:bg-yellow-600';
        case 'confirmed':
            return 'bg-green-500 hover:bg-green-600';
        case 'checked_in':
            return 'bg-blue-500 hover:bg-blue-600';
        case 'checked_out':
            return 'bg-gray-500 hover:bg-gray-600';
        case 'cancelled':
            return 'bg-red-500 hover:bg-red-600';
        case 'no_show':
            return 'bg-red-700 hover:bg-red-800';
        default:
            return 'bg-gray-400 hover:bg-gray-500';
    }
}

/**
 * Get booking status text
 */
export function getBookingStatusText(status: string): string {
    switch (status) {
        case 'pending_verification':
            return 'Pending';
        case 'confirmed':
            return 'Confirmed';
        case 'checked_in':
            return 'Checked In';
        case 'checked_out':
            return 'Checked Out';
        case 'cancelled':
            return 'Cancelled';
        case 'no_show':
            return 'No Show';
        default:
            return 'Unknown';
    }
}

/**
 * Get default date range (Today to Today + N nights)
 */
export function getDefaultDateRange(nights: number = 1) {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + nights);

    return {
        startDate: today.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
    };
}

/**
 * Format date range for display
 */
export function formatDateRange(startDate: string, endDate: string, locale: string = 'id-ID') {
    if (!startDate || !endDate) return '';

    const start = new Date(startDate);
    const end = new Date(endDate);

    const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    };

    return `${start.toLocaleDateString(locale, options)} - ${end.toLocaleDateString(locale, options)}`;
}