/**
 * Booking Form State Hook
 * Manages form data and validation for admin booking form
 * Optimized with memoization to prevent unnecessary re-renders
 */

import { useMemo } from 'react';
import { useForm } from '@inertiajs/react';
import type { Booking } from '@/types';

interface BookingFormData {
    property_id: string;
    check_in_date: string;
    check_out_date: string;
    guest_male: number;
    guest_female: number;
    guest_children: number;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    guest_country: string;
    guest_id_number: string;
    guest_gender: string;
    relationship_type: string;
    special_requests: string;
    internal_notes: string;
    booking_status: string;
    payment_status: string;
    dp_percentage: number;
    check_in_time: string;
    source: string;
    // Payment fields
    payment_method_id: string | null;
    payment_amount: number | null;
    payment_date: string | null;
    reference_number: string | null;
    bank_name: string | null;
    account_number: string | null;
    account_name: string | null;
    payment_status_payment: 'pending' | 'verified' | null;
    verification_notes: string | null;
    // Rate override
    rate_override: boolean;
    override_amount: number | null;
    override_reason: string | null;
    // Services
    services: any[];
}

interface UseBookingFormStateProps {
    mode: 'create' | 'edit';
    initialData?: Partial<Booking>;
}

export function useBookingFormState({ mode, initialData }: UseBookingFormStateProps) {
    // Memoize default values to prevent recreation on every render
    const defaultValues = useMemo<BookingFormData>(() => ({
        property_id: initialData?.property_id?.toString() || '',
        check_in_date: initialData?.check_in ? new Date(initialData.check_in).toISOString().split('T')[0] : '',
        check_out_date: initialData?.check_out ? new Date(initialData.check_out).toISOString().split('T')[0] : '',
        guest_male: initialData?.guest_male ?? 1,
        guest_female: initialData?.guest_female ?? 1,
        guest_children: initialData?.guest_children ?? 0,
        guest_name: initialData?.guest_name || '',
        guest_email: initialData?.guest_email || '',
        guest_phone: initialData?.guest_phone || '',
        guest_country: initialData?.guest_country || 'Indonesia',
        guest_id_number: initialData?.guest_id_number || '',
        guest_gender: initialData?.guest_gender || 'male',
        relationship_type: initialData?.relationship_type || 'keluarga',
        special_requests: initialData?.special_requests || '',
        internal_notes: initialData?.internal_notes || '',
        booking_status: initialData?.booking_status || (mode === 'create' ? 'confirmed' : 'pending_verification'),
        payment_status: initialData?.payment_status || (mode === 'create' ? 'fully_paid' : 'dp_pending'),
        dp_percentage: initialData?.dp_percentage || (mode === 'create' ? 100 : 50),
        check_in_time: initialData?.check_in_time || '15:00',
        source: initialData?.source || 'direct',
        // Payment fields
        payment_method_id: null,
        payment_amount: null,
        payment_date: null,
        reference_number: null,
        bank_name: null,
        account_number: null,
        account_name: null,
        payment_status_payment: 'verified',
        verification_notes: null,
        // Rate override
        rate_override: false,
        override_amount: null,
        override_reason: null,
        // Services
        services: [],
    }), [mode, initialData]); // Only recreate when these change

    const form = useForm(defaultValues);

    // Memoize validation messages
    const validationMessages = useMemo(() => {
        const messages: string[] = [];
        if (!form.data.property_id) messages.push('Property harus dipilih');
        if (!form.data.check_in_date) messages.push('Check-in date harus diisi');
        if (!form.data.check_out_date) messages.push('Check-out date harus diisi');
        if (!form.data.guest_name.trim()) messages.push('Nama tamu utama harus diisi');
        if (!form.data.guest_email.trim()) messages.push('Email tamu harus diisi');
        if (!form.data.guest_phone.trim()) messages.push('Nomor telepon harus diisi');

        const totalGuests = (form.data.guest_male || 0) + (form.data.guest_female || 0) + (form.data.guest_children || 0);
        if (totalGuests === 0) messages.push('Minimal harus ada 1 tamu');

        return messages;
    }, [form.data]);

    // Memoize canSubmit flag
    const canSubmit = useMemo(() => {
        return !!(
            form.data.property_id &&
            form.data.check_in_date &&
            form.data.check_out_date &&
            form.data.guest_name.trim() &&
            form.data.guest_email.trim() &&
            form.data.guest_phone.trim() &&
            ((form.data.guest_male || 0) + (form.data.guest_female || 0) + (form.data.guest_children || 0)) > 0
        );
    }, [form.data]);

    return {
        ...form,
        validationMessages,
        canSubmit,
    };
}
