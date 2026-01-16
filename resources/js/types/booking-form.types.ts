/**
 * Shared Types for Booking Form Components
 * Used across both Admin and Public booking contexts
 */

import { Property } from '@/types';

export interface RateCalculation {
    nights: number;
    base_amount: number;
    weekend_premium: number;
    seasonal_premium: number;
    extra_bed_amount: number;
    cleaning_fee: number;
    tax_amount: number;
    total_amount: number;
    extra_beds: number;
    formatted: {
        total_amount: string;
        per_night: string;
    };
}

export interface AvailabilityData {
    success: boolean;
    property?: {
        id: number;
        name: string;
        base_rate: number;
        capacity: number;
        capacity_max: number;
        cleaning_fee: number;
        extra_bed_rate: number;
        weekend_premium_percent: number;
    };
    date_range?: {
        start: string;
        end: string;
    };
    booked_dates: string[];
    booked_periods?: string[][];
    availability_data?: {
        rates: Record<string, any>;
    };
    seasonal_rates?: Record<string, any>;
    availability?: {
        available: boolean;
        booked_dates?: string[];
        booked_periods?: string[][];
    };
    rate_calculation?: any;
    error?: string;
}

export type AvailabilityStatus = 'checking' | 'available' | 'unavailable' | null;

export interface PaymentFormData {
    payment_method_id: string;
    amount: number;
    payment_date: string;
    reference_number: string;
    bank_name: string;
    account_number: string;
    account_name: string;
    payment_status: 'pending' | 'verified';
    verification_notes: string;
}

export interface PaymentMethod {
    id: number;
    name: string;
    type: string;
    bank_name?: string;
    account_number?: string;
    account_name?: string;
}

export interface GuestFormData {
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    guest_country: string;
    guest_id_number: string;
    guest_gender: string;
    relationship_type: string;
    special_requests: string;
    internal_notes: string;
}

export interface BookingStatusData {
    booking_status: string;
    payment_status: string;
    dp_percentage: number;
    check_in_time: string;
    source: string;
}

export interface PropertySelectorProps {
    properties: Property[];
    selectedPropertyId: string;
    onPropertyChange: (propertyId: string) => void;
    error?: string;
    disabled?: boolean;
    showDetails?: boolean;
}

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
}

export interface GuestInformationFormProps {
    values: Partial<GuestFormData>;
    onChange: (field: keyof GuestFormData, value: string) => void;
    errors?: Partial<Record<keyof GuestFormData, string>>;
    showInternalNotes?: boolean;
    fieldConfig?: {
        showIdNumber?: boolean;
        showGender?: boolean;
        showRelationshipType?: boolean;
    };
}

export interface BookingStatusSectionProps {
    bookingStatus: string;
    paymentStatus: string;
    dpPercentage: number;
    checkInTime: string;
    source: string;
    onBookingStatusChange: (status: string) => void;
    onPaymentStatusChange: (status: string) => void;
    onDpPercentageChange: (percentage: number) => void;
    onCheckInTimeChange: (time: string) => void;
    onSourceChange: (source: string) => void;
    errors?: Partial<Record<keyof BookingStatusData, string>>;
}

export interface PaymentFormSectionProps {
    mode?: 'full' | 'upload-only';
    paymentMethods?: PaymentMethod[];
    paymentData: PaymentFormData;
    onPaymentDataChange: (data: Partial<PaymentFormData>) => void;
    paymentProof?: File | null;
    onPaymentProofChange: (file: File | null) => void;
    totalAmount: number;
    errors?: Partial<Record<keyof PaymentFormData, string>>;
}

export interface BookingSummaryCardProps {
    totalGuests: number;
    extraBeds: number;
    servicesTotal?: number;
    rateCalculation: RateCalculation | null;
    manualOverride?: {
        enabled: boolean;
        amount: number;
    };
    compact?: boolean;
    className?: string;
}
