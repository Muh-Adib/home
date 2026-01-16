/**
 * Payment Form State Hook
 * Manages payment form visibility and data (Admin-only)
 * Optimized for performance with proper memoization
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PaymentFormData } from '@/types/booking-form.types';

interface UsePaymentFormProps {
    mode: 'create' | 'edit';
    bookingStatus: string;
    paymentStatus: string;
    dpPercentage: number;
    totalBookingAmount: number;
}

export function usePaymentForm({
    mode,
    bookingStatus,
    paymentStatus,
    dpPercentage,
    totalBookingAmount,
}: UsePaymentFormProps) {
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentProof, setPaymentProof] = useState<File | null>(null);

    // Memoize initial payment data to prevent recreation
    const initialPaymentData = useMemo<PaymentFormData>(() => ({
        payment_method_id: '',
        amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        reference_number: '',
        bank_name: '',
        account_number: '',
        account_name: '',
        payment_status: 'verified',
        verification_notes: '',
    }), []);

    const [paymentData, setPaymentData] = useState<PaymentFormData>(initialPaymentData);

    // Auto-show payment form based on booking status (Create mode only)
    useEffect(() => {
        if (mode !== 'create') return;

        const shouldShowPaymentForm = bookingStatus === 'confirmed' && paymentStatus !== 'dp_pending';
        setShowPaymentForm(shouldShowPaymentForm);

        // Auto-calculate payment amount
        if (shouldShowPaymentForm && totalBookingAmount > 0 && paymentData.amount === 0) {
            let calculatedAmount = 0;
            if (paymentStatus === 'fully_paid') {
                calculatedAmount = totalBookingAmount;
            } else if (paymentStatus === 'dp_received') {
                calculatedAmount = (totalBookingAmount * dpPercentage) / 100;
            }

            setPaymentData(prev => ({ ...prev, amount: calculatedAmount }));
        }
    }, [mode, bookingStatus, paymentStatus, dpPercentage, totalBookingAmount, paymentData.amount]);

    // Memoized callback to update payment data
    const updatePaymentData = useCallback((updates: Partial<PaymentFormData>) => {
        setPaymentData(prev => ({ ...prev, ...updates }));
    }, []);

    // Memoized callback to handle payment proof change
    const handlePaymentProofChange = useCallback((file: File | null) => {
        setPaymentProof(file);
    }, []);

    return {
        showPaymentForm,
        setShowPaymentForm,
        paymentData,
        updatePaymentData,
        paymentProof,
        setPaymentProof: handlePaymentProofChange,
    };
}
