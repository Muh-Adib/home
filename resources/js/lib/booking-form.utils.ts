/**
 * Utility Functions for Booking Form
 * Pure functions without side effects - reusable across admin & public
 */

import { Property } from '@/types';

/**
 * Calculate total number of guests
 */
export const calculateTotalGuests = (
    male: number,
    female: number,
    children: number,
    property?: Property | null
): number => {
    const maleCount = Number(male) || 0;
    const femaleCount = Number(female) || 0;
    const childrenCount = Number(children) || 0;

    let effectiveGuests = maleCount + femaleCount + childrenCount;

    // If property capacity is less than max, children count as half
    if (property && property.capacity < property.capacity_max) {
        effectiveGuests = maleCount + femaleCount + Math.floor(childrenCount / 2);
    }

    return effectiveGuests;
};

/**
 * Calculate number of extra beds needed
 */
export const calculateExtraBeds = (
    totalGuests: number,
    property?: Property | null
): number => {
    if (!property) return 0;
    return Math.max(0, totalGuests - property.capacity);
};

/**
 * Format currency in Indonesian Rupiah
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
};

/**
 * Format currency without symbol (just number)
 */
export const formatCurrencyNumber = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
    }).format(amount);
};

/**
 * Calculate nights between two dates
 */
export const calculateNights = (checkIn: string, checkOut: string): number => {
    if (!checkIn || !checkOut) return 0;

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
};

/**
 * Validate date range
 */
export const isValidDateRange = (checkIn: string, checkOut: string): boolean => {
    if (!checkIn || !checkOut) return false;

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    return start < end;
};

/**
 * Calculate total booking amount
 */
export const calculateTotalBookingAmount = (
    rateCalculation: { total_amount: number } | null,
    servicesTotal: number,
    manualOverride?: { enabled: boolean; amount: number }
): number => {
    if (manualOverride?.enabled) {
        return manualOverride.amount + servicesTotal;
    }

    const baseTotal = rateCalculation?.total_amount || 0;
    return baseTotal + servicesTotal;
};

/**
 * Calculate payment amount based on status and DP percentage
 */
export const calculatePaymentAmount = (
    totalAmount: number,
    paymentStatus: string,
    dpPercentage: number
): number => {
    if (paymentStatus === 'fully_paid') {
        return totalAmount;
    }

    if (paymentStatus === 'dp_received') {
        return (totalAmount * dpPercentage) / 100;
    }

    return 0;
};

/**
 * Prepare form data for submission
 */
export const prepareBookingSubmissionData = (
    data: any,
    totalGuests: number,
    selectedServices: any[],
    manualOverride: { enabled: boolean; amount: number; reason: string }
) => {
    return {
        ...data,
        guest_count: totalGuests,
        services: selectedServices,
        rate_override: manualOverride.enabled,
        override_amount: manualOverride.enabled ? manualOverride.amount : null,
        override_reason: manualOverride.enabled ? manualOverride.reason : null,
    };
};

/**
 * Generate default values for guest form
 */
export const getDefaultGuestFormValues = () => ({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    guest_country: 'Indonesia',
    guest_id_number: '',
    guest_gender: 'male',
    relationship_type: 'keluarga',
    special_requests: '',
    internal_notes: '',
});

/**
 * Generate default values for booking status
 */
export const getDefaultBookingStatusValues = (mode: 'create' | 'edit') => ({
    booking_status: mode === 'create' ? 'confirmed' : 'pending_verification',
    payment_status: mode === 'create' ? 'fully_paid' : 'dp_pending',
    dp_percentage: mode === 'create' ? 100 : 50,
    check_in_time: '15:00',
    source: 'direct',
});
